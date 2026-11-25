// The screenshot scenes behind ?shot=start|play|serve|end. Each one plays the real rules
// forward from a fresh world — a scripted chef that grabs, cooks, chops, plates and serves — so
// every frame is what a real game looks like, and the same seed always gives the same frame.
// The play scene is staged to show the whole game at once: a finished dish on a plate, a second
// dish mid-assembly, a patty on the grill, fries in the fryer, orders on the board, the timer.
//
// Every helper here is defensive: each loop is bounded, each step is verified, and a failed
// sub-task is abandoned rather than retried forever, so staging always terminates.
import { STEP } from './config.js';
import { PLAYER, PLATING_BLOCK } from './config.js';
import { cookState } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Where the chef stands to use each station (all within reach, nearest to that station). */
const SPOTS = {
  buns: { x: 150, y: 156 },
  patty: { x: 150, y: 240 },
  lettuce: { x: 150, y: 324 },
  tomato: { x: 150, y: 408 },
  cheese: { x: 150, y: 492 },
  potato: { x: 150, y: 576 },
  grill: { x: 500, y: 240 },
  fryer: { x: 720, y: 240 },
  chop: { x: 920, y: 240 },
  plating: { x: 640, y: 472 },
  serve: { x: 1108, y: 320 },
  trash: { x: 1108, y: 515 },
};

const ARRIVE = 12;
const MAX_WALK_SECONDS = 15;

function legCrossesBlock(x1, y1, x2, y2) {
  const b = PLATING_BLOCK;
  const r = PLAYER.radius + 4;
  for (let t = 0; t <= 1; t += 0.05) {
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (x > b.x - r && x < b.x + b.width + r && y > b.y - r && y < b.y + b.height + r) return true;
  }
  return false;
}

/** Step the world with steering until the chef is within ARRIVE of (x, y), or the cap hits. */
function walkTo(world, x, y) {
  let guard = 0;
  const cap = MAX_WALK_SECONDS / STEP;
  while (guard < cap && !world.state.over) {
    const p = world.state.player;
    const dx = x - p.x;
    const dy = y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= ARRIVE) return true;
    const slow = dist < 40 ? dist / 40 : 1;
    world.step(STEP, (dx / dist) * slow, (dy / dist) * slow);
    guard += 1;
  }
  return false;
}

/** Walk to a spot, detouring around the plating counter when the straight line crosses it. */
function goto(world, spot, depth = 0) {
  const p = world.state.player;
  if (world.state.over) return;
  if (!legCrossesBlock(p.x, p.y, spot.x, spot.y)) {
    walkTo(world, spot.x, spot.y);
    return;
  }
  if (depth > 4) {
    // Should not happen: the corners route around the block. Walk straight and let the
    // push-out slide the chef around the edge rather than recursing forever.
    walkTo(world, spot.x, spot.y);
    return;
  }
  const left = Math.abs(p.x - 430) + Math.abs(spot.x - 430) < Math.abs(p.x - 850) + Math.abs(spot.x - 850);
  const sx = left ? 430 : 850;
  if (p.y < 320) {
    walkTo(world, sx, 240);
    walkTo(world, sx, 470);
  } else {
    walkTo(world, sx, 470);
    walkTo(world, sx, 240);
  }
  // Re-check the final leg: it can still cross from a corner, so detour again if it must.
  goto(world, spot, depth + 1);
}

/** One interaction plus a breath of game time for the state to settle. */
function act(world, settleSeconds = 0.12) {
  const events = world.interact();
  const steps = Math.ceil(settleSeconds / STEP);
  for (let i = 0; i < steps && !world.state.over; i += 1) world.step(STEP, 0, 0);
  return events;
}

function wait(world, seconds) {
  const steps = Math.ceil(seconds / STEP);
  for (let i = 0; i < steps && !world.state.over; i += 1) world.step(STEP, 0, 0);
}

/** Step until `cond` is true or `maxSeconds` pass. Returns whether the condition held. */
function waitUntil(world, cond, maxSeconds) {
  let spent = 0;
  while (spent < maxSeconds && !world.state.over) {
    if (cond()) return true;
    world.step(STEP, 0, 0);
    spent += STEP;
  }
  return cond();
}

const CRATE_OF = {
  bun: 'buns',
  patty_raw: 'patty',
  lettuce: 'lettuce',
  tomato: 'tomato',
  cheese: 'cheese',
  potato: 'potato',
};

/**
 * Free the chef's hands: a plate is served if some order wants it, else put back; an
 * ingredient goes on a plate, back on its cooker, or in the trash. Never loops forever.
 */
function ensureHandsEmpty(world) {
  const carrying = world.state.player.carrying;
  if (!carrying) return true;
  if (carrying.kind === 'plate') {
    goto(world, SPOTS.serve);
    const before = world.state.served;
    act(world, 0.3);
    if (world.state.served > before) return true;
    goto(world, SPOTS.plating);
    act(world);
    if (!world.state.player.carrying) return true;
  } else {
    goto(world, SPOTS.plating);
    act(world);
    if (!world.state.player.carrying) return true;
    if (carrying.item === 'patty_raw') {
      goto(world, SPOTS.grill);
      act(world);
      if (!world.state.player.carrying) return true;
    }
    if (carrying.item === 'potato') {
      goto(world, SPOTS.fryer);
      act(world);
      if (!world.state.player.carrying) return true;
    }
  }
  goto(world, SPOTS.trash);
  act(world);
  return world.state.player.carrying === null;
}

/** Grab an ingredient from its crate and add it to a plate. Returns success. */
function grabToPlate(world, item) {
  ensureHandsEmpty(world);
  goto(world, SPOTS[CRATE_OF[item]]);
  act(world);
  if (!world.state.player.carrying) return false;
  goto(world, SPOTS.plating);
  act(world);
  return world.state.player.carrying === null;
}

/** Chop a vegetable (3 chops) and add it to a plate. Returns success. */
function chopToPlate(world, veg) {
  ensureHandsEmpty(world);
  const chop = world.state.chop;
  if (chop.item && chop.item !== veg && chop.item !== `${veg}_chopped`) {
    // Finish whatever is on the board first, so nothing is wasted.
    goto(world, SPOTS.chop);
    let tries = 0;
    while (world.state.chop.item && world.state.chop.chops < 3 && tries < 6 && !world.state.over) {
      act(world);
      tries += 1;
    }
    act(world);
    goto(world, SPOTS.plating);
    act(world);
    ensureHandsEmpty(world);
  }
  if (!world.state.chop.item) {
    goto(world, SPOTS[CRATE_OF[veg]]);
    act(world);
    if (!world.state.player.carrying) return false;
    goto(world, SPOTS.chop);
    act(world);
    if (!world.state.chop.item) {
      ensureHandsEmpty(world);
      return false;
    }
  }
  let tries = 0;
  while (world.state.chop.item && world.state.chop.chops < 3 && tries < 6 && !world.state.over) {
    act(world);
    tries += 1;
  }
  if (!world.state.chop.item || world.state.chop.chops < 3) return false;
  act(world); // take the chopped veg
  if (!world.state.player.carrying) return false;
  goto(world, SPOTS.plating);
  act(world);
  return world.state.player.carrying === null;
}

/** Free a cooker slot if both are busy, taking the most cooked item to a plate or the trash. */
function freeCookerSlot(world, kind) {
  const slots = kind === 'grill' ? world.state.grill : world.state.fryer;
  if (slots.some((slot) => slot === null)) return true;
  ensureHandsEmpty(world);
  goto(world, kind === 'grill' ? SPOTS.grill : SPOTS.fryer);
  act(world);
  ensureHandsEmpty(world);
  return slots.some((slot) => slot === null);
}

/** Put a raw patty on the grill (starting from the crate). Returns success. */
function startGrill(world) {
  ensureHandsEmpty(world);
  if (!freeCookerSlot(world, 'grill')) return false;
  goto(world, SPOTS.patty);
  act(world);
  if (!world.state.player.carrying) return false;
  goto(world, SPOTS.grill);
  act(world);
  return world.state.player.carrying === null;
}

/** Put a potato in the fryer (starting from the crate). Returns success. */
function startFryer(world) {
  ensureHandsEmpty(world);
  if (!freeCookerSlot(world, 'fryer')) return false;
  goto(world, SPOTS.potato);
  act(world);
  if (!world.state.player.carrying) return false;
  goto(world, SPOTS.fryer);
  act(world);
  return world.state.player.carrying === null;
}

/** Take a cooked item off the grill/fryer and add it to a plate; burns go in the trash. */
function collectToPlate(world, kind) {
  ensureHandsEmpty(world);
  goto(world, kind === 'grill' ? SPOTS.grill : SPOTS.fryer);
  act(world);
  const carrying = world.state.player.carrying;
  if (!carrying) return false;
  if (carrying.item === 'patty_burnt' || carrying.item === 'fries_burnt') {
    goto(world, SPOTS.trash);
    act(world);
    return false;
  }
  goto(world, SPOTS.plating);
  act(world);
  if (world.state.player.carrying) {
    ensureHandsEmpty(world);
    return false;
  }
  return true;
}

/** Wait for a grill/fryer slot to be perfect, then collect it; recover once from a burn. */
function collectWhenPerfect(world, kind, retries = 1) {
  const slots = kind === 'grill' ? world.state.grill : world.state.fryer;
  const ok = waitUntil(
    world,
    () => slots.some((slot) => slot && cookState(kind, slot.t) === 'perfect'),
    kind === 'grill' ? 7.5 : 6.5,
  );
  if (!ok) {
    // It burnt (or never started): clear the slot and, once, cook a fresh one.
    if (retries <= 0) return false;
    ensureHandsEmpty(world);
    goto(world, kind === 'grill' ? SPOTS.grill : SPOTS.fryer);
    act(world);
    ensureHandsEmpty(world);
    if (kind === 'grill') startGrill(world);
    else startFryer(world);
    return collectWhenPerfect(world, kind, retries - 1);
  }
  return collectToPlate(world, kind);
}

/** Pick up the best plate and serve it; if no order wants it, put it back and move on. */
function servePlate(world) {
  ensureHandsEmpty(world);
  goto(world, SPOTS.plating);
  act(world);
  if (!world.state.player.carrying) return false;
  goto(world, SPOTS.serve);
  const before = world.state.served;
  act(world, 0.3);
  if (world.state.served > before) return true;
  goto(world, SPOTS.plating);
  act(world);
  ensureHandsEmpty(world);
  return false;
}

/** Cook one order end to end: slow prep first, then the grill, then the quick grabs. */
function cookOrder(world, order) {
  const needs = order.recipe.needs;
  const startedAt = world.state.elapsed;
  if (needs.includes('lettuce_chopped')) chopToPlate(world, 'lettuce');
  if (needs.includes('tomato_chopped')) chopToPlate(world, 'tomato');
  if (needs.includes('patty')) startGrill(world);
  if (needs.includes('fries')) startFryer(world);
  if (needs.includes('bun')) grabToPlate(world, 'bun');
  if (needs.includes('cheese')) grabToPlate(world, 'cheese');
  if (needs.includes('patty')) collectWhenPerfect(world, 'grill');
  if (needs.includes('fries')) collectWhenPerfect(world, 'fryer');
  servePlate(world);
  return world.state.elapsed - startedAt;
}

/** The greedy shift: keep cooking the oldest order until the shift ends. */
function runGreedyShift(world) {
  let guard = 0;
  while (!world.state.over && guard < 40) {
    const order = [...world.state.orders].sort((a, b) => a.timeLeft - b.timeLeft)[0];
    if (!order) {
      wait(world, 1);
      guard += 1;
      continue;
    }
    const spent = cookOrder(world, order);
    if (spent > 75) ensureHandsEmpty(world);
    guard += 1;
  }
  while (!world.state.over) wait(world, 1);
}

/** The cover frame: a finished dish, a dish mid-assembly, grill and fryer busy, chef at work. */
function stagePlay(world) {
  // A Deluxe Burger, finished, left on the counter — the plate ready to serve.
  chopToPlate(world, 'lettuce');
  startGrill(world);
  grabToPlate(world, 'bun');
  collectWhenPerfect(world, 'grill');
  chopToPlate(world, 'tomato');
  grabToPlate(world, 'cheese');
  // A second dish started on the other plate: a bun waiting for its fillings.
  grabToPlate(world, 'bun');
  // The next round of cooking is already on.
  startGrill(world);
  startFryer(world);
  // The chef grabs lettuce for the second dish and turns back toward the board.
  goto(world, SPOTS.lettuce);
  act(world);
  goto(world, { x: 640, y: 520 });
  // Let the orders breathe a moment so the board shows three tickets.
  wait(world, 1.5);
}

/** Cook the oldest order, serve it, and freeze the frame on the coins flying in. */
function stageServe(world) {
  const order = world.state.orders[0];
  if (order) cookOrder(world, order);
  wait(world, 0.7);
}

/**
 * Set `world` to the named scene (start, play, serve or end) and return the screen to draw
 * over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    stagePlay(world);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'serve') {
    stageServe(world);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'end') {
    runGreedyShift(world);
    return { screen: SCREEN_OVER, best: world.state.coins };
  }
  for (let i = 0; i < 5 / STEP; i += 1) world.step(STEP, 0, 0);
  return { screen: SCREEN_TITLE, best: 0 };
}
