// The game's rules and state, with no drawing and no browser in it: the chef, the stations
// (crates, grill, fryer, chop board, plating counter, serve window, trash), the orders, the
// coins and the shift clock. step() advances one fixed step and returns what happened as bit
// flags, so the caller can react (sound, announcements) without the world knowing about screens.
import {
  CHOPS_NEEDED,
  COMBO_BONUS,
  COMBO_EVERY,
  DELUXE_PATIENCE_BONUS,
  FLOOR,
  FRYER,
  GRILL,
  LEVELS,
  LEVEL_SECONDS,
  MAX_LEVEL,
  PLATES,
  PLATING_BLOCK,
  PLAYER,
  SHIFT_SECONDS,
  STATIONS,
  TIP_MAX_SHARE,
} from './config.js';
import { pickRecipe, plateMatchesRecipe, recipeOfPlate, RECIPES } from './recipes.js';

export const EVENT_PICKUP = 1;
export const EVENT_PLACE = 2;
export const EVENT_CHOP = 4;
export const EVENT_SERVE = 8;
export const EVENT_LOST = 16;
export const EVENT_LEVEL = 32;
export const EVENT_OVER = 64;
export const EVENT_BURN = 128;
export const EVENT_TRASH = 256;
export const EVENT_FAIL = 512;
export const EVENT_COOKED = 1024;

const MAX_PLATE_ITEMS = 5;

/** 'raw' | 'perfect' | 'burnt' for a grill or fryer slot at its cooked time. */
export function cookState(kind, t) {
  const spec = kind === 'grill' ? GRILL : FRYER;
  if (t >= spec.burnAt) return 'burnt';
  if (t >= spec.perfectAt) return 'perfect';
  return 'raw';
}

function stationCentre(station) {
  return { x: station.x + station.width / 2, y: station.y + station.height / 2 };
}

export function createWorld(random) {
  const state = {
    player: { x: PLAYER.startX, y: PLAYER.startY, facing: 1, carrying: null },
    grill: [null, null],
    fryer: [null, null],
    chop: { item: null, chops: 0 },
    plates: [{ contents: [] }, { contents: [] }],
    orders: [],
    coins: 0,
    served: 0,
    lost: 0,
    combo: 0,
    bestCombo: 0,
    elapsed: 0,
    level: 1,
    spawnTimer: 0,
    nextOrderId: 1,
    floats: [],
    banner: null,
    over: false,
  };

  function reset() {
    state.player.x = PLAYER.startX;
    state.player.y = PLAYER.startY;
    state.player.facing = 1;
    state.player.carrying = null;
    state.grill = [null, null];
    state.fryer = [null, null];
    state.chop = { item: null, chops: 0 };
    state.plates = [{ contents: [] }, { contents: [] }];
    state.orders = [];
    state.coins = 0;
    state.served = 0;
    state.lost = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.elapsed = 0;
    state.level = 1;
    state.spawnTimer = LEVELS[0].spawnEvery;
    state.nextOrderId = 1;
    state.floats = [];
    state.banner = null;
    state.over = false;
    spawnOrder();
    spawnOrder();
  }

  function levelSpec() {
    return LEVELS[Math.min(state.level, MAX_LEVEL) - 1];
  }

  function spawnOrder() {
    const recipe = pickRecipe(random);
    const patience = levelSpec().patience + (recipe.id === 'deluxe' ? DELUXE_PATIENCE_BONUS : 0);
    state.orders.push({
      id: state.nextOrderId,
      recipe,
      patience,
      timeLeft: patience,
      price: recipe.price,
    });
    state.nextOrderId += 1;
  }

  function float(x, y, text, color) {
    state.floats.push({ x, y, text, color, t: 0 });
    if (state.floats.length > 12) state.floats.shift();
  }

  function addCoins(amount, x, y) {
    state.coins += amount;
    float(x, y, `+$${amount}`, '#1f7a33');
  }

  /** The station nearest the chef within reach, or null. */
  function nearestStation() {
    let best = null;
    let bestDist = PLAYER.reach;
    for (const [id, station] of Object.entries(STATIONS)) {
      const centre = stationCentre(station);
      const dx = centre.x - state.player.x;
      const dy = centre.y - state.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        best = { id, ...station };
      }
    }
    return best;
  }

  /** True when adding `item` to `contents` still leaves a dish some recipe could become. */
  function fitsSomeRecipe(contents, item) {
    const next = [...contents, item];
    if (next.length > MAX_PLATE_ITEMS) return false;
    return Object.values(RECIPES).some((recipe) => {
      const left = [...next];
      for (const need of recipe.needs) {
        const at = left.indexOf(need);
        if (at !== -1) left.splice(at, 1);
      }
      return left.length === 0;
    });
  }

  function interactCrate(station) {
    if (state.player.carrying !== null) {
      float(state.player.x, state.player.y - 40, 'Hands full!', '#a33');
      return EVENT_FAIL;
    }
    state.player.carrying = { kind: 'item', item: station.item, cooked: 0 };
    return EVENT_PICKUP;
  }

  function takeCooked(slots, kind, rawItem, cookedItem, burntItem) {
    // Prefer a perfect one; otherwise the most cooked; never leave a burnt one behind by choice.
    let pick = -1;
    let pickScore = -1;
    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[i];
      if (!slot) continue;
      const s = cookState(kind, slot.t);
      const score = s === 'perfect' ? 100 + slot.t : s === 'burnt' ? 50 : slot.t;
      if (score > pickScore) {
        pickScore = score;
        pick = i;
      }
    }
    if (pick === -1) return EVENT_FAIL;
    const slot = slots[pick];
    slots[pick] = null;
    const s = cookState(kind, slot.t);
    const item = s === 'perfect' ? cookedItem : s === 'burnt' ? burntItem : rawItem;
    state.player.carrying = { kind: 'item', item, cooked: slot.t };
    return EVENT_PICKUP;
  }

  function interactCooker(kind) {
    const slots = kind === 'grill' ? state.grill : state.fryer;
    const rawItem = kind === 'grill' ? 'patty_raw' : 'potato';
    const cookedItem = kind === 'grill' ? 'patty' : 'fries';
    const burntItem = kind === 'grill' ? 'patty_burnt' : 'fries_burnt';
    const carrying = state.player.carrying;
    if (carrying && carrying.kind === 'item' && carrying.item === rawItem) {
      const free = slots.findIndex((slot) => slot === null);
      if (free === -1) {
        float(state.player.x, state.player.y - 40, 'No free slot!', '#a33');
        return EVENT_FAIL;
      }
      slots[free] = { item: rawItem, t: carrying.cooked || 0, announced: false, burnt: false };
      state.player.carrying = null;
      return EVENT_PLACE;
    }
    if (carrying === null) return takeCooked(slots, kind, rawItem, cookedItem, burntItem);
    float(state.player.x, state.player.y - 40, 'That does not cook here', '#a33');
    return EVENT_FAIL;
  }

  function interactChop() {
    const carrying = state.player.carrying;
    const chop = state.chop;
    if (chop.item === null) {
      if (carrying && carrying.kind === 'item' && (carrying.item === 'lettuce' || carrying.item === 'tomato')) {
        chop.item = carrying.item;
        chop.chops = 0;
        state.player.carrying = null;
        return EVENT_PLACE;
      }
      float(state.player.x, state.player.y - 40, 'Needs lettuce or tomato', '#a33');
      return EVENT_FAIL;
    }
    if (carrying !== null) {
      float(state.player.x, state.player.y - 40, 'Hands full!', '#a33');
      return EVENT_FAIL;
    }
    if (chop.chops < CHOPS_NEEDED) {
      chop.chops += 1;
      if (chop.chops === CHOPS_NEEDED) chop.item = `${chop.item}_chopped`;
      return EVENT_CHOP;
    }
    state.player.carrying = { kind: 'item', item: chop.item, cooked: 0 };
    chop.item = null;
    chop.chops = 0;
    return EVENT_PICKUP;
  }

  function interactPlating() {
    const carrying = state.player.carrying;
    if (carrying && carrying.kind === 'item') {
      if (carrying.item === 'patty_burnt' || carrying.item === 'fries_burnt') {
        float(state.player.x, state.player.y - 40, 'Burnt! Trash it.', '#a33');
        return EVENT_FAIL;
      }
      for (const plate of state.plates) {
        if (plate !== null && fitsSomeRecipe(plate.contents, carrying.item)) {
          plate.contents.push(carrying.item);
          state.player.carrying = null;
          return EVENT_PLACE;
        }
      }
      float(state.player.x, state.player.y - 40, 'No plate wants that', '#a33');
      return EVENT_FAIL;
    }
    if (carrying && carrying.kind === 'plate') {
      const free = state.plates.findIndex((plate) => plate === null);
      if (free === -1) return EVENT_FAIL;
      state.plates[free] = carrying.plate;
      state.player.carrying = null;
      return EVENT_PLACE;
    }
    // Empty hands: pick up the best plate — a finished dish first, else the fullest one.
    let pick = -1;
    let pickScore = -1;
    for (let i = 0; i < state.plates.length; i += 1) {
      const plate = state.plates[i];
      if (!plate || plate.contents.length === 0) continue;
      const score = recipeOfPlate(plate.contents) ? 100 + plate.contents.length : plate.contents.length;
      if (score > pickScore) {
        pickScore = score;
        pick = i;
      }
    }
    if (pick === -1) return EVENT_FAIL;
    state.player.carrying = { kind: 'plate', plate: state.plates[pick] };
    state.plates[pick] = null;
    return EVENT_PICKUP;
  }

  function interactServe() {
    const carrying = state.player.carrying;
    if (!carrying || carrying.kind !== 'plate') {
      float(state.player.x, state.player.y - 40, 'Bring a finished plate', '#a33');
      return EVENT_FAIL;
    }
    let match = null;
    for (const order of state.orders) {
      if (plateMatchesRecipe(carrying.plate.contents, order.recipe)) {
        if (!match || order.timeLeft < match.timeLeft) match = order;
      }
    }
    if (!match) {
      float(state.player.x, state.player.y - 40, 'No order wants this dish!', '#a33');
      return EVENT_FAIL;
    }
    const tip = Math.round(match.price * TIP_MAX_SHARE * (match.timeLeft / match.patience));
    const total = match.price + tip;
    state.orders = state.orders.filter((order) => order !== match);
    state.served += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    let bonus = 0;
    if (state.combo % COMBO_EVERY === 0) bonus = COMBO_BONUS;
    addCoins(total + bonus, 1200, 230);
    if (bonus > 0) float(1200, 260, `COMBO +$${bonus}!`, '#b8860b');
    carrying.plate.contents = [];
    const free = state.plates.findIndex((plate) => plate === null);
    if (free !== -1) state.plates[free] = carrying.plate;
    state.player.carrying = null;
    return EVENT_SERVE;
  }

  function interactTrash() {
    if (state.player.carrying === null) return EVENT_FAIL;
    state.player.carrying = null;
    return EVENT_TRASH;
  }

  /** Use the nearest station. Returns event flags. Nothing works after the shift ends. */
  function interact() {
    if (state.over) return 0;
    const station = nearestStation();
    if (!station) return 0;
    switch (station.kind) {
      case 'crate':
        return interactCrate(station);
      case 'grill':
        return interactCooker('grill');
      case 'fryer':
        return interactCooker('fryer');
      case 'chop':
        return interactChop();
      case 'plating':
        return interactPlating();
      case 'serve':
        return interactServe();
      case 'trash':
        return interactTrash();
      default:
        return 0;
    }
  }

  /** One line telling the player what E does right now, or null when nothing is in reach. */
  function actionHint() {
    const station = nearestStation();
    if (!station) return null;
    const carrying = state.player.carrying;
    const held = carrying ? (carrying.kind === 'plate' ? 'plate' : carrying.item) : null;
    switch (station.kind) {
      case 'crate':
        return carrying ? 'Hands full' : `E — Grab ${station.label.toLowerCase()}`;
      case 'grill':
      case 'fryer': {
        const slots = station.kind === 'grill' ? state.grill : state.fryer;
        const raw = station.kind === 'grill' ? 'patty_raw' : 'potato';
        if (held === raw) return `E — Cook it on the ${station.label.toLowerCase()}`;
        if (!carrying && slots.some((slot) => slot !== null)) {
          const s = slots.find((slot) => slot !== null);
          return `E — Take it (${cookState(station.kind, s.t)})`;
        }
        return `E — ${station.label}: ${slots.filter(Boolean).length}/${slots.length} cooking`;
      }
      case 'chop': {
        if (state.chop.item === null) return 'E — Place lettuce or tomato to chop';
        if (state.chop.chops < CHOPS_NEEDED) return `E — Chop! (${state.chop.chops}/${CHOPS_NEEDED})`;
        return 'E — Take the chopped veg';
      }
      case 'plating': {
        if (carrying && carrying.kind === 'item') return 'E — Add it to a plate';
        if (carrying && carrying.kind === 'plate') return 'E — Put the plate back';
        return 'E — Pick up a plate';
      }
      case 'serve':
        return carrying && carrying.kind === 'plate' ? 'E — Serve this dish!' : 'E — Serve: bring a finished plate';
      case 'trash':
        return carrying ? 'E — Throw it away' : 'E — Trash (nothing to throw)';
      default:
        return null;
    }
  }

  function movePlayer(dt, mx, my) {
    const length = Math.hypot(mx, my);
    if (length > 0) {
      const nx = mx / length;
      const ny = my / length;
      state.player.x += nx * PLAYER.speed * dt;
      state.player.y += ny * PLAYER.speed * dt;
      if (mx !== 0) state.player.facing = mx > 0 ? 1 : -1;
    }
    state.player.x = Math.min(FLOOR.x + FLOOR.width, Math.max(FLOOR.x, state.player.x));
    state.player.y = Math.min(FLOOR.y + FLOOR.height, Math.max(FLOOR.y, state.player.y));
    // Push out of the plating counter island.
    const p = state.player;
    const b = PLATING_BLOCK;
    const r = PLAYER.radius;
    if (p.x > b.x - r && p.x < b.x + b.width + r && p.y > b.y - r && p.y < b.y + b.height + r) {
      const pushLeft = p.x - (b.x - r);
      const pushRight = b.x + b.width + r - p.x;
      const pushUp = p.y - (b.y - r);
      const pushDown = b.y + b.height + r - p.y;
      const min = Math.min(pushLeft, pushRight, pushUp, pushDown);
      if (min === pushLeft) p.x = b.x - r;
      else if (min === pushRight) p.x = b.x + b.width + r;
      else if (min === pushUp) p.y = b.y - r;
      else p.y = b.y + b.height + r;
    }
  }

  // Times already advanced in step(); this only reports the crossings.
  function tickCooker(slots, kind, centres) {
    let events = 0;
    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[i];
      if (!slot) continue;
      if (!slot.announced && slot.t >= (kind === 'grill' ? GRILL.perfectAt : FRYER.perfectAt)) {
        slot.announced = true;
        float(centres[i].x, centres[i].y - 30, 'Perfect!', '#1f7a33');
        events |= EVENT_COOKED;
      }
      if (!slot.burnt && slot.t >= (kind === 'grill' ? GRILL.burnAt : FRYER.burnAt)) {
        slot.burnt = true;
        float(centres[i].x, centres[i].y - 30, 'Burnt!', '#a33');
        events |= EVENT_BURN;
      }
    }
    return events;
  }

  /**
   * One fixed step. `mx`/`my` steer the chef (-1..1 each). Cooking, orders, the shift clock
   * and the floating texts all advance here. Returns event flags.
   */
  function step(dt, mx, my) {
    let events = 0;
    if (state.over) return events;
    state.elapsed += dt;

    const level = Math.min(MAX_LEVEL, 1 + Math.floor(state.elapsed / LEVEL_SECONDS));
    if (level !== state.level) {
      state.level = level;
      state.banner = { text: level === 2 ? 'LUNCH RUSH! Orders speed up!' : 'DINNER RUSH! Faster still!', t: 0 };
      events |= EVENT_LEVEL;
    }

    movePlayer(dt, mx, my);

    for (const slot of state.grill) if (slot) slot.t += dt;
    for (const slot of state.fryer) if (slot) slot.t += dt;
    events |= tickCooker(state.grill, 'grill', [
      { x: 450, y: 157 },
      { x: 550, y: 157 },
    ]);
    events |= tickCooker(state.fryer, 'fryer', [
      { x: 685, y: 157 },
      { x: 755, y: 157 },
    ]);

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      if (state.orders.length < levelSpec().maxOrders) spawnOrder();
      state.spawnTimer += levelSpec().spawnEvery * (0.85 + random() * 0.3);
    }

    for (let i = state.orders.length - 1; i >= 0; i -= 1) {
      const order = state.orders[i];
      order.timeLeft -= dt;
      if (order.timeLeft <= 0) {
        state.orders.splice(i, 1);
        state.lost += 1;
        state.combo = 0;
        float(120, 60, `Lost: ${order.recipe.name}`, '#a33');
        events |= EVENT_LOST;
      }
    }

    for (let i = state.floats.length - 1; i >= 0; i -= 1) {
      const f = state.floats[i];
      f.t += dt;
      f.y -= 22 * dt;
      if (f.t > 1.4) state.floats.splice(i, 1);
    }
    if (state.banner) {
      state.banner.t += dt;
      if (state.banner.t > 2.5) state.banner = null;
    }

    if (state.elapsed >= SHIFT_SECONDS) {
      state.over = true;
      events |= EVENT_OVER;
    }
    return events;
  }

  reset();
  return {
    state,
    reset,
    step,
    interact,
    nearestStation,
    actionHint,
    stationCentre,
    levelSpec,
  };
}

/** Centres of the grill / fryer slots, for the renderer and the screenshot pilot. */
export const GRILL_SLOTS = [
  { x: 450, y: 157 },
  { x: 550, y: 157 },
];
export const FRYER_SLOTS = [
  { x: 685, y: 157 },
  { x: 755, y: 157 },
];
export const PLATE_CENTRES = PLATES;
