// Everything the eye sees, drawn on one canvas: the kitchen, the order board, the chef, the
// food, the timer and the screens. The playfield is a fixed 1280x720 logical area scaled to the
// window, so a screenshot is the same frame whatever the window is.
import { FIELD, FONT, PALETTE, PLATES, SHIFT_SECONDS, STATIONS, STAR_COINS } from './config.js';
import { cookState, FRYER_SLOTS, GRILL_SLOTS } from './world.js';
import { recipeOfPlate } from './recipes.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;

const BOARD_H = 104;

function roundRect(d, x, y, w, h, r) {
  d.beginPath();
  d.moveTo(x + r, y);
  d.arcTo(x + w, y, x + w, y + h, r);
  d.arcTo(x + w, y + h, x, y + h, r);
  d.arcTo(x, y + h, x, y, r);
  d.arcTo(x, y, x + w, y, r);
  d.closePath();
}

/** One ingredient, drawn as a small vector picture centred on (x, y), about `size` wide. */
export function drawIngredient(d, item, x, y, size) {
  const s = size / 32;
  d.save();
  d.translate(x, y);
  d.scale(s, s);
  switch (item) {
    case 'bun':
      d.fillStyle = '#e0a458';
      d.beginPath();
      d.ellipse(0, 2, 14, 9, 0, Math.PI, 0);
      d.fill();
      d.fillStyle = '#c98d4b';
      d.fillRect(-14, 2, 28, 5);
      d.fillStyle = '#fff3d6';
      for (const [dx, dy] of [[-7, -4], [0, -7], [7, -4], [-3, -2], [4, -2]]) {
        d.beginPath();
        d.ellipse(dx, dy, 1.8, 1.2, 0, 0, Math.PI * 2);
        d.fill();
      }
      break;
    case 'patty_raw':
      d.fillStyle = '#d98a8a';
      d.beginPath();
      d.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
      d.fill();
      d.fillStyle = '#c97373';
      d.beginPath();
      d.ellipse(-4, -1, 5, 3, 0, 0, Math.PI * 2);
      d.fill();
      break;
    case 'patty':
      d.fillStyle = '#7a4a21';
      d.beginPath();
      d.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
      d.fill();
      d.strokeStyle = '#5d3413';
      d.lineWidth = 2;
      for (const dx of [-7, 0, 7]) {
        d.beginPath();
        d.moveTo(dx - 3, -5);
        d.lineTo(dx + 3, 5);
        d.stroke();
      }
      break;
    case 'patty_burnt':
      d.fillStyle = '#22201e';
      d.beginPath();
      d.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
      d.fill();
      d.strokeStyle = '#55504a';
      d.lineWidth = 1.5;
      d.beginPath();
      d.moveTo(-8, -2);
      d.lineTo(8, 2);
      d.stroke();
      break;
    case 'lettuce':
      d.fillStyle = '#58b368';
      for (const [dx, dy, r] of [[-7, 2, 8], [0, -4, 9], [7, 2, 8]]) {
        d.beginPath();
        d.arc(dx, dy, r, 0, Math.PI * 2);
        d.fill();
      }
      d.fillStyle = '#7ed08a';
      d.beginPath();
      d.arc(0, -1, 6, 0, Math.PI * 2);
      d.fill();
      break;
    case 'lettuce_chopped':
      d.fillStyle = '#58b368';
      for (const [dx, dy, rot] of [[-8, 0, 0.4], [0, -3, -0.3], [8, 1, 0.2], [-2, 4, 0.8]]) {
        d.save();
        d.translate(dx, dy);
        d.rotate(rot);
        d.fillRect(-5, -2, 10, 4);
        d.restore();
      }
      break;
    case 'tomato':
      d.fillStyle = '#e2483d';
      d.beginPath();
      d.arc(0, 1, 11, 0, Math.PI * 2);
      d.fill();
      d.fillStyle = '#3f9d4e';
      d.beginPath();
      d.moveTo(0, -10);
      d.lineTo(-5, -5);
      d.lineTo(0, -7);
      d.lineTo(5, -5);
      d.closePath();
      d.fill();
      d.fillStyle = 'rgba(255,255,255,0.45)';
      d.beginPath();
      d.arc(-4, -3, 3, 0, Math.PI * 2);
      d.fill();
      break;
    case 'tomato_chopped':
      d.fillStyle = '#e2483d';
      for (const [dx, rot] of [[-6, -0.5], [6, 0.5]]) {
        d.save();
        d.translate(dx, 0);
        d.rotate(rot);
        d.beginPath();
        d.moveTo(0, -8);
        d.arc(0, 0, 8, -Math.PI / 2, Math.PI / 2);
        d.closePath();
        d.fill();
        d.restore();
      }
      break;
    case 'cheese':
      d.fillStyle = '#f7c948';
      d.beginPath();
      d.moveTo(-11, 7);
      d.lineTo(11, 7);
      d.lineTo(11, -7);
      d.closePath();
      d.fill();
      d.fillStyle = '#e8a91c';
      d.beginPath();
      d.arc(2, 2, 2, 0, Math.PI * 2);
      d.arc(7, -2, 1.6, 0, Math.PI * 2);
      d.fill();
      break;
    case 'potato':
      d.fillStyle = '#b98a52';
      d.beginPath();
      d.ellipse(0, 0, 12, 8, 0.3, 0, Math.PI * 2);
      d.fill();
      d.fillStyle = '#8f6534';
      for (const [dx, dy] of [[-5, -2], [3, 1], [6, -3]]) {
        d.beginPath();
        d.arc(dx, dy, 1.4, 0, Math.PI * 2);
        d.fill();
      }
      break;
    case 'fries':
      d.fillStyle = '#d64541';
      d.beginPath();
      d.moveTo(-10, -2);
      d.lineTo(10, -2);
      d.lineTo(7, 10);
      d.lineTo(-7, 10);
      d.closePath();
      d.fill();
      d.strokeStyle = '#f7c948';
      d.lineWidth = 3;
      d.lineCap = 'round';
      for (const [dx, h] of [[-7, 12], [-2, 16], [3, 14], [8, 11]]) {
        d.beginPath();
        d.moveTo(dx, -2);
        d.lineTo(dx, -h);
        d.stroke();
      }
      break;
    case 'fries_burnt':
      d.fillStyle = '#4a4a4a';
      d.beginPath();
      d.moveTo(-10, -2);
      d.lineTo(10, -2);
      d.lineTo(7, 10);
      d.lineTo(-7, 10);
      d.closePath();
      d.fill();
      d.strokeStyle = '#22201e';
      d.lineWidth = 3;
      d.lineCap = 'round';
      for (const [dx, h] of [[-7, 12], [-2, 16], [3, 14], [8, 11]]) {
        d.beginPath();
        d.moveTo(dx, -2);
        d.lineTo(dx, -h);
        d.stroke();
      }
      break;
    default:
      d.fillStyle = '#888';
      d.beginPath();
      d.arc(0, 0, 10, 0, Math.PI * 2);
      d.fill();
  }
  d.restore();
}

export function createRenderer(canvas) {
  const d = canvas.getContext('2d');
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    scale = Math.min(w / FIELD.width, h / FIELD.height);
    offsetX = (w - FIELD.width * scale) / 2;
    offsetY = (h - FIELD.height * scale) / 2;
    d.setTransform(ratio * scale, 0, 0, ratio * scale, ratio * offsetX, ratio * offsetY);
  }

  window.addEventListener('resize', resize);
  resize();

  function text(str, x, y, font, fill, align = 'left') {
    d.font = font;
    d.fillStyle = fill;
    d.textAlign = align;
    d.textBaseline = 'alphabetic';
    d.fillText(str, x, y);
  }

  function drawFloor() {
    const tile = 64;
    for (let y = BOARD_H; y < FIELD.height; y += tile) {
      for (let x = 0; x < FIELD.width; x += tile) {
        const even = ((x / tile) | 0) % 2 === ((y / tile) | 0) % 2;
        d.fillStyle = even ? PALETTE.floorA : PALETTE.floorB;
        d.fillRect(x, y, tile, tile);
      }
    }
    d.fillStyle = PALETTE.wall;
    d.fillRect(0, BOARD_H - 6, FIELD.width, 6);
  }

  function drawCrate(station) {
    const { x, y, width, height } = station;
    d.fillStyle = PALETTE.wallDark;
    roundRect(d, x + 2, y + 3, width, height, 8);
    d.fill();
    d.fillStyle = PALETTE.counter;
    roundRect(d, x, y, width, height, 8);
    d.fill();
    d.strokeStyle = PALETTE.wallDark;
    d.lineWidth = 2;
    d.beginPath();
    d.moveTo(x + 6, y + height / 2);
    d.lineTo(x + width - 6, y + height / 2);
    d.stroke();
    drawIngredient(d, station.item, x + width / 2, y + 26, 34);
    text(station.label, x + width / 2, y + height - 8, `700 13px ${FONT}`, PALETTE.textLight, 'center');
  }

  function cookBar(x, y, width, t, kind) {
    const spec = kind === 'grill' ? { perfectAt: 4, burnAt: 8 } : { perfectAt: 3, burnAt: 7 };
    const barH = 8;
    d.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(d, x, y, width, barH, 4);
    d.fill();
    const greenX = x + (spec.perfectAt / spec.burnAt) * width;
    const greenW = ((spec.burnAt - spec.perfectAt) / spec.burnAt) * width;
    d.fillStyle = PALETTE.green;
    d.fillRect(greenX, y, greenW, barH);
    const marker = x + Math.min(t / spec.burnAt, 1) * width;
    d.fillStyle = '#fff';
    d.fillRect(marker - 1.5, y - 2, 3, barH + 4);
  }

  function drawGrill(state) {
    const st = STATIONS.grill;
    d.fillStyle = '#22262c';
    roundRect(d, st.x + 2, st.y + 3, st.width, st.height, 10);
    d.fill();
    d.fillStyle = PALETTE.grill;
    roundRect(d, st.x, st.y, st.width, st.height, 10);
    d.fill();
    text('GRILL', st.x + st.width / 2, st.y + 16, `700 12px ${FONT}`, '#cfd6dd', 'center');
    for (let i = 0; i < state.grill.length; i += 1) {
      const slot = state.grill[i];
      const c = GRILL_SLOTS[i];
      d.fillStyle = '#14171b';
      d.beginPath();
      d.ellipse(c.x, c.y + 8, 34, 18, 0, 0, Math.PI * 2);
      d.fill();
      if (slot) {
        const s = cookState('grill', slot.t);
        if (s === 'perfect') {
          d.strokeStyle = PALETTE.green;
          d.lineWidth = 3;
          d.beginPath();
          d.ellipse(c.x, c.y + 8, 38, 21, 0, 0, Math.PI * 2);
          d.stroke();
        }
        if (s === 'burnt') {
          d.fillStyle = PALETTE.smoke;
          for (let k = 0; k < 3; k += 1) {
            const rise = ((state.elapsed * 22 + k * 14 + i * 30) % 42);
            d.beginPath();
            d.arc(c.x - 8 + k * 8, c.y - 6 - rise, 7, 0, Math.PI * 2);
            d.fill();
          }
        }
        drawIngredient(d, s === 'burnt' ? 'patty_burnt' : s === 'perfect' ? 'patty' : 'patty_raw', c.x, c.y + 8, 34);
        cookBar(c.x - 30, c.y + 30, 60, slot.t, 'grill');
      }
    }
  }

  function drawFryer(state) {
    const st = STATIONS.fryer;
    d.fillStyle = '#241c10';
    roundRect(d, st.x + 2, st.y + 3, st.width, st.height, 10);
    d.fill();
    d.fillStyle = PALETTE.fryer;
    roundRect(d, st.x, st.y, st.width, st.height, 10);
    d.fill();
    text('FRYER', st.x + st.width / 2, st.y + 16, `700 12px ${FONT}`, '#e8d9b0', 'center');
    for (let i = 0; i < state.fryer.length; i += 1) {
      const slot = state.fryer[i];
      const c = FRYER_SLOTS[i];
      d.fillStyle = '#c98d2e';
      d.beginPath();
      d.ellipse(c.x, c.y + 8, 30, 16, 0, 0, Math.PI * 2);
      d.fill();
      if (slot) {
        const s = cookState('fryer', slot.t);
        if (s === 'perfect') {
          d.strokeStyle = PALETTE.green;
          d.lineWidth = 3;
          d.beginPath();
          d.ellipse(c.x, c.y + 8, 34, 19, 0, 0, Math.PI * 2);
          d.stroke();
        }
        d.fillStyle = 'rgba(255,255,255,0.5)';
        for (let k = 0; k < 3; k += 1) {
          const bx = c.x - 14 + ((k * 11 + Math.floor(state.elapsed * 7)) % 28);
          d.beginPath();
          d.arc(bx, c.y + 4 + ((k * 5) % 8), 2.5, 0, Math.PI * 2);
          d.fill();
        }
        drawIngredient(d, s === 'burnt' ? 'fries_burnt' : s === 'perfect' ? 'fries' : 'potato', c.x, c.y + 2, 30);
        cookBar(c.x - 26, c.y + 30, 52, slot.t, 'fryer');
      }
    }
  }

  function drawChop(state) {
    const st = STATIONS.chop;
    d.fillStyle = '#8a5a33';
    roundRect(d, st.x + 2, st.y + 3, st.width, st.height, 10);
    d.fill();
    d.fillStyle = '#e8c07a';
    roundRect(d, st.x, st.y, st.width, st.height, 10);
    d.fill();
    text('CHOP BOARD', st.x + st.width / 2, st.y + 16, `700 12px ${FONT}`, PALETTE.text, 'center');
    const chop = state.chop;
    if (chop.item) {
      drawIngredient(d, chop.item, st.x + st.width / 2, st.y + 44, 36);
      if (chop.chops < 3) {
        text(`CHOP ${chop.chops}/3`, st.x + st.width / 2, st.y + st.height - 6, `700 12px ${FONT}`, PALETTE.red, 'center');
      } else {
        text('READY!', st.x + st.width / 2, st.y + st.height - 6, `700 12px ${FONT}`, PALETTE.green, 'center');
      }
    } else {
      text('lettuce · tomato', st.x + st.width / 2, st.y + 48, `12px ${FONT}`, PALETTE.muted, 'center');
    }
  }

  function drawPlate(x, y, contents) {
    d.fillStyle = 'rgba(0,0,0,0.18)';
    d.beginPath();
    d.ellipse(x, y + 24, 52, 10, 0, 0, Math.PI * 2);
    d.fill();
    d.fillStyle = PALETTE.plate;
    d.beginPath();
    d.ellipse(x, y + 16, 52, 20, 0, 0, Math.PI * 2);
    d.fill();
    d.strokeStyle = '#c9d4dc';
    d.lineWidth = 2;
    d.beginPath();
    d.ellipse(x, y + 16, 52, 20, 0, 0, Math.PI * 2);
    d.stroke();
    d.fillStyle = '#eef3f6';
    d.beginPath();
    d.ellipse(x, y + 15, 40, 14, 0, 0, Math.PI * 2);
    d.fill();
    // Contents as a little stack: bun at the bottom, the rest layered above it.
    const order = ['bun', 'patty', 'patty_raw', 'lettuce_chopped', 'tomato_chopped', 'cheese', 'fries', 'lettuce', 'tomato'];
    const sorted = [...contents].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    sorted.forEach((item, i) => {
      drawIngredient(d, item, x, y + 12 - i * 7, 30);
    });
  }

  function drawPlating(state) {
    const st = STATIONS.plating;
    d.fillStyle = PALETTE.wallDark;
    roundRect(d, st.x + 2, st.y + 3, st.width, st.height, 10);
    d.fill();
    d.fillStyle = PALETTE.counterTop;
    roundRect(d, st.x, st.y, st.width, st.height, 10);
    d.fill();
    text('PLATING', st.x + st.width / 2, st.y + 15, `700 12px ${FONT}`, PALETTE.text, 'center');
    for (let i = 0; i < PLATES.length; i += 1) {
      const plate = state.plates[i];
      const c = PLATES[i];
      if (plate) {
        drawPlate(c.x, c.y, plate.contents);
        const recipe = recipeOfPlate(plate.contents);
        if (recipe) {
          text(`${recipe.name} ✓`, c.x, c.y + 48, `700 12px ${FONT}`, PALETTE.green, 'center');
        } else if (plate.contents.length > 0) {
          text(`${plate.contents.length} item${plate.contents.length > 1 ? 's' : ''}…`, c.x, c.y + 48, `12px ${FONT}`, PALETTE.muted, 'center');
        }
      } else {
        d.strokeStyle = 'rgba(0,0,0,0.25)';
        d.setLineDash([4, 4]);
        d.beginPath();
        d.ellipse(c.x, c.y + 16, 52, 20, 0, 0, Math.PI * 2);
        d.stroke();
        d.setLineDash([]);
      }
    }
  }

  function drawServe(state) {
    const st = STATIONS.serve;
    const carrying = state.player.carrying;
    const ready = carrying && carrying.kind === 'plate' && recipeOfPlate(carrying.plate.contents);
    d.fillStyle = ready ? PALETTE.green : PALETTE.wallDark;
    roundRect(d, st.x - 2, st.y - 2, st.width + 4, st.height + 4, 12);
    d.fill();
    d.fillStyle = '#2b1a0e';
    roundRect(d, st.x, st.y, st.width, st.height, 10);
    d.fill();
    d.fillStyle = '#f7e8c9';
    d.beginPath();
    d.arc(st.x + st.width / 2, st.y + 52, 34, Math.PI, 0);
    d.fill();
    d.fillRect(st.x + st.width / 2 - 34, st.y + 52, 68, 34);
    d.fillStyle = '#5d3413';
    d.fillRect(st.x + st.width / 2 - 34, st.y + 86, 68, 8);
    text('SERVE', st.x + st.width / 2, st.y + 128, `700 16px ${FONT}`, PALETTE.textLight, 'center');
    text(ready ? 'DISH READY!' : 'window', st.x + st.width / 2, st.y + 148, `700 12px ${FONT}`, ready ? '#8fe388' : PALETTE.muted, 'center');
  }

  function drawTrash(state) {
    const st = STATIONS.trash;
    d.fillStyle = '#565d66';
    roundRect(d, st.x + 16, st.y + 12, st.width - 32, st.height - 24, 8);
    d.fill();
    d.fillStyle = '#767e88';
    roundRect(d, st.x + 10, st.y + 6, st.width - 20, 14, 7);
    d.fill();
    text('TRASH', st.x + st.width / 2, st.y + st.height - 4, `700 12px ${FONT}`, PALETTE.text, 'center');
  }

  function drawChef(state) {
    const p = state.player;
    d.fillStyle = 'rgba(0,0,0,0.2)';
    d.beginPath();
    d.ellipse(p.x, p.y + 22, 24, 8, 0, 0, Math.PI * 2);
    d.fill();
    // Body: white apron over a red shirt.
    d.fillStyle = '#d64541';
    roundRect(d, p.x - 16, p.y - 2, 32, 26, 10);
    d.fill();
    d.fillStyle = '#fdfdfd';
    roundRect(d, p.x - 11, p.y + 2, 22, 22, 6);
    d.fill();
    // Head.
    d.fillStyle = '#f2c79b';
    d.beginPath();
    d.arc(p.x, p.y - 14, 14, 0, Math.PI * 2);
    d.fill();
    // Eyes look where the chef faces.
    d.fillStyle = '#2b1a0e';
    d.beginPath();
    d.arc(p.x - 5 + p.facing * 2, p.y - 15, 1.8, 0, Math.PI * 2);
    d.arc(p.x + 5 + p.facing * 2, p.y - 15, 1.8, 0, Math.PI * 2);
    d.fill();
    // Chef hat.
    d.fillStyle = '#ffffff';
    d.beginPath();
    d.arc(p.x - 8, p.y - 26, 7, 0, Math.PI * 2);
    d.arc(p.x, p.y - 30, 8, 0, Math.PI * 2);
    d.arc(p.x + 8, p.y - 26, 7, 0, Math.PI * 2);
    d.fill();
    d.fillRect(p.x - 13, p.y - 27, 26, 6);
    // Carried item, held high on a tray.
    const carrying = p.carrying;
    if (carrying) {
      d.strokeStyle = '#8a5a33';
      d.lineWidth = 3;
      d.beginPath();
      d.moveTo(p.x - 14, p.y - 40);
      d.lineTo(p.x + 14, p.y - 40);
      d.stroke();
      if (carrying.kind === 'plate') {
        drawPlate(p.x, p.y - 62, carrying.plate.contents);
      } else {
        drawIngredient(d, carrying.item, p.x, p.y - 52, 30);
      }
    }
  }

  function drawOrders(state) {
    d.fillStyle = PALETTE.board;
    d.fillRect(0, 0, FIELD.width, BOARD_H);
    d.fillStyle = PALETTE.boardEdge;
    d.fillRect(0, BOARD_H - 4, FIELD.width, 4);
    text('ORDERS', 16, 22, `700 13px ${FONT}`, PALETTE.gold);
    const tickets = state.orders.slice(0, 4);
    tickets.forEach((order, i) => {
      const x = 16 + i * 222;
      const y = 28;
      const w = 212;
      const h = 66;
      d.fillStyle = '#fdf6e3';
      roundRect(d, x, y, w, h, 6);
      d.fill();
      d.strokeStyle = order.timeLeft < 12 ? PALETTE.red : '#c9b896';
      d.lineWidth = order.timeLeft < 12 ? 3 : 1.5;
      d.stroke();
      text(order.recipe.name, x + 10, y + 20, `700 15px ${FONT}`, PALETTE.text);
      text(`$${order.price}`, x + w - 10, y + 20, `700 15px ${FONT}`, PALETTE.green, 'right');
      order.recipe.needs.forEach((need, j) => {
        drawIngredient(d, need, x + 22 + j * 30, y + 40, 24);
      });
      // Patience bar.
      const frac = Math.max(0, order.timeLeft / order.patience);
      const barW = w - 20;
      d.fillStyle = '#e0d3b3';
      d.fillRect(x + 10, y + h - 12, barW, 6);
      d.fillStyle = frac > 0.5 ? PALETTE.green : frac > 0.25 ? '#e8a91c' : PALETTE.red;
      d.fillRect(x + 10, y + h - 12, barW * frac, 6);
    });
    if (tickets.length === 0) {
      text('No orders yet — the lunch crowd is coming…', 120, 66, `14px ${FONT}`, '#c9b896');
    }
  }

  function drawHud(state) {
    const remain = Math.max(0, SHIFT_SECONDS - state.elapsed);
    const mm = Math.floor(remain / 60);
    const ss = Math.floor(remain % 60);
    const low = remain < 30;
    const pulse = low ? 1 + 0.08 * Math.sin(state.elapsed * 8) : 1;
    d.save();
    d.translate(1150, 44);
    d.scale(pulse, pulse);
    text(`${mm}:${String(ss).padStart(2, '0')}`, 0, 0, `700 34px ${FONT}`, low ? '#ff6b66' : PALETTE.textLight, 'center');
    d.restore();
    text('SHIFT', 1150, 62, `700 11px ${FONT}`, PALETTE.muted, 'center');
    // Coins.
    d.fillStyle = PALETTE.gold;
    d.beginPath();
    d.arc(1010, 36, 13, 0, Math.PI * 2);
    d.fill();
    d.strokeStyle = '#b8860b';
    d.lineWidth = 2;
    d.stroke();
    text('$', 1010, 41, `700 15px ${FONT}`, '#7a5c00', 'center');
    text(String(state.coins), 1032, 42, `700 24px ${FONT}`, PALETTE.textLight);
    text(`served ${state.served} · lost ${state.lost}`, 1032, 62, `12px ${FONT}`, '#c9b896');
    if (state.combo >= 2) {
      text(`COMBO x${state.combo}`, 1150, 88, `700 14px ${FONT}`, '#ff9a3d', 'center');
    }
    text(`LV ${state.level}`, 960, 42, `700 16px ${FONT}`, PALETTE.blue, 'center');
  }

  function drawFloats(state) {
    for (const f of state.floats) {
      d.globalAlpha = Math.max(0, 1 - f.t / 1.4);
      text(f.text, f.x, f.y, `700 20px ${FONT}`, f.color, 'center');
    }
    d.globalAlpha = 1;
  }

  function drawPrompt(hint, state) {
    if (!hint) return;
    const p = state.player;
    d.font = `700 14px ${FONT}`;
    const w = d.measureText(hint).width + 20;
    const x = Math.min(Math.max(p.x - w / 2, 8), FIELD.width - w - 8);
    const y = p.y - 78;
    d.fillStyle = 'rgba(43, 26, 14, 0.88)';
    roundRect(d, x, y, w, 26, 13);
    d.fill();
    text(hint, x + w / 2, y + 18, `700 14px ${FONT}`, '#fff', 'center');
  }

  function drawBanner(state) {
    if (!state.banner) return;
    const alpha = state.banner.t > 2 ? Math.max(0, 1 - (state.banner.t - 2) / 0.5) : 1;
    d.globalAlpha = alpha;
    text(state.banner.text, FIELD.width / 2, 150, `700 34px ${FONT}`, PALETTE.red, 'center');
    d.globalAlpha = 1;
  }

  function drawHintBar() {
    d.fillStyle = 'rgba(43, 26, 14, 0.75)';
    d.fillRect(0, FIELD.height - 26, FIELD.width, 26);
    text(
      'WASD / arrows — move   ·   E / Space / click — interact   ·   P — pause   ·   Cook patties to the green zone, chop veg, plate it, serve it!',
      FIELD.width / 2,
      FIELD.height - 8,
      `13px ${FONT}`,
      '#f7e8c9',
      'center',
    );
  }

  function drawKitchen(state, hint) {
    drawFloor();
    for (const station of Object.values(STATIONS)) {
      if (station.kind === 'crate') drawCrate(station);
    }
    drawGrill(state);
    drawFryer(state);
    drawChop(state);
    drawPlating(state);
    drawServe(state);
    drawTrash(state);
    drawChef(state);
    drawOrders(state);
    drawHud(state);
    drawFloats(state);
    drawBanner(state);
    drawPrompt(hint, state);
    drawHintBar();
  }

  function panel(x, y, w, h) {
    d.fillStyle = 'rgba(43, 26, 14, 0.92)';
    roundRect(d, x, y, w, h, 16);
    d.fill();
    d.strokeStyle = PALETTE.gold;
    d.lineWidth = 2;
    d.stroke();
  }

  function drawTitle(state, best) {
    drawKitchen(state, null);
    d.fillStyle = 'rgba(20, 12, 6, 0.55)';
    d.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(290, 120, 700, 470);
    text('SIZZLE & SERVE', 640, 190, `700 56px ${FONT}`, PALETTE.gold, 'center');
    text('A tiny kitchen rush — cook it, plate it, serve it before patience runs out.', 640, 226, `16px ${FONT}`, '#f7e8c9', 'center');
    const lines = [
      ['1', 'Grab ingredients from the crates on the left.'],
      ['2', 'Grill patties & fry potatoes to the GREEN zone — burnt food goes in the trash.'],
      ['3', 'Chop lettuce & tomato on the board (3 chops each).'],
      ['4', 'Build the dish on a plate, carry it to the SERVE window.'],
      ['5', 'Fast serves earn tips; 3 in a row earns a combo bonus.'],
    ];
    lines.forEach(([n, line], i) => {
      const y = 280 + i * 34;
      d.fillStyle = PALETTE.gold;
      d.beginPath();
      d.arc(330, y - 6, 13, 0, Math.PI * 2);
      d.fill();
      text(n, 330, y - 1, `700 14px ${FONT}`, '#2b1a0e', 'center');
      text(line, 356, y, `15px ${FONT}`, '#fdf6e3');
    });
    text('WASD / arrows move · E / Space / click interact · P pause', 640, 470, `700 15px ${FONT}`, '#8fe388', 'center');
    const blink = Math.floor(Date.now() / 700) % 2 === 0;
    if (blink) text('PRESS SPACE OR CLICK TO START', 640, 520, `700 22px ${FONT}`, '#fff', 'center');
    if (best > 0) text(`Best shift: $${best}`, 640, 556, `15px ${FONT}`, PALETTE.muted, 'center');
  }

  function drawOver(state, best) {
    drawKitchen(state, null);
    d.fillStyle = 'rgba(20, 12, 6, 0.6)';
    d.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(340, 110, 600, 490);
    text("SHIFT'S DONE!", 640, 172, `700 44px ${FONT}`, PALETTE.gold, 'center');
    const stars = STAR_COINS.filter((c) => state.coins >= c).length;
    for (let i = 0; i < 3; i += 1) {
      const x = 565 + i * 75;
      const y = 232;
      d.font = '52px sans-serif';
      d.textAlign = 'center';
      d.fillStyle = i < stars ? PALETTE.gold : 'rgba(255,255,255,0.18)';
      d.fillText('★', x, y);
    }
    const rows = [
      ['Coins earned', `$${state.coins}`],
      ['Orders served', String(state.served)],
      ['Orders lost', String(state.lost)],
      ['Best combo', `x${state.bestCombo}`],
      ['Best shift ever', `$${Math.max(best, state.coins)}`],
    ];
    rows.forEach(([label, value], i) => {
      const y = 300 + i * 40;
      text(label, 420, y, `18px ${FONT}`, '#f7e8c9');
      text(value, 860, y, `700 20px ${FONT}`, '#fff', 'right');
    });
    const blink = Math.floor(Date.now() / 700) % 2 === 0;
    if (blink) text('PRESS SPACE TO COOK AGAIN', 640, 540, `700 20px ${FONT}`, '#8fe388', 'center');
  }

  function drawPaused(state) {
    drawKitchen(state, null);
    d.fillStyle = 'rgba(20, 12, 6, 0.55)';
    d.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(440, 260, 400, 180);
    text('PAUSED', 640, 330, `700 40px ${FONT}`, '#fff', 'center');
    text('P or Space to keep cooking', 640, 380, `16px ${FONT}`, '#f7e8c9', 'center');
  }

  function draw(state, screen, best, hint) {
    const ratio = window.devicePixelRatio || 1;
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.fillStyle = '#14100b';
    d.fillRect(0, 0, canvas.width, canvas.height);
    d.setTransform(ratio * scale, 0, 0, ratio * scale, ratio * offsetX, ratio * offsetY);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_OVER) drawOver(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused(state);
    else drawKitchen(state, hint);
  }

  return { draw, resize };
}
