// Every tuning number, colour and layout rect in one place. The kitchen is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One shift lasts this long; the level rises every LEVEL_SECONDS. */
export const SHIFT_SECONDS = 180;
export const LEVEL_SECONDS = 60;
export const MAX_LEVEL = 3;

/** Seconds a raw patty needs on the grill before it is perfect, and when it burns. */
export const GRILL = { perfectAt: 4, burnAt: 8, slots: 2 };
/** Seconds a potato needs in the fryer before it is perfect, and when it burns. */
export const FRYER = { perfectAt: 3, burnAt: 7, slots: 2 };
/** Chops (E presses) to turn a whole vegetable into a chopped one. */
export const CHOPS_NEEDED = 3;

export const PLAYER = {
  radius: 22,
  speed: 350,
  /** How close the chef must be to a station's centre to use it. */
  reach: 118,
  startX: 640,
  startY: 600,
};

/** The floor the chef walks on (inside the walls and the side counters). */
export const FLOOR = { x: 128, y: 108, width: 992, height: 576 };
/** The plating counter is an island the chef walks around, not through. */
export const PLATING_BLOCK = { x: 460, y: 320, width: 360, height: 100 };

/** Order spawn cadence and patience per level (index 0 = level 1). */
export const LEVELS = [
  { spawnEvery: 14, patience: 62, maxOrders: 3 },
  { spawnEvery: 11, patience: 52, maxOrders: 3 },
  { spawnEvery: 9, patience: 44, maxOrders: 4 },
];
/** Extra patience for the biggest dish, so it stays fair to build. */
export const DELUXE_PATIENCE_BONUS = 12;
/** Tip: up to this share of the price for serving with patience to spare. */
export const TIP_MAX_SHARE = 0.5;
/** Bonus coins every COMBO_EVERY consecutive serves without losing an order. */
export const COMBO_EVERY = 3;
export const COMBO_BONUS = 3;

/** Coins needed for 1, 2 and 3 stars at the end of a shift. */
export const STAR_COINS = [45, 85, 130];

export const PALETTE = {
  floorA: '#f3e3c2',
  floorB: '#ecd9ae',
  wall: '#8a5a33',
  wallDark: '#6e4525',
  board: '#3b2a1a',
  boardEdge: '#241608',
  counter: '#c98d4b',
  counterTop: '#e8b06a',
  steel: '#9aa3ad',
  steelDark: '#6d757f',
  grill: '#3a3f47',
  fryer: '#4a3b28',
  board2: '#d9a066',
  plate: '#ffffff',
  text: '#2b1a0e',
  textLight: '#fdf6e3',
  muted: '#7a5c3e',
  red: '#d64541',
  green: '#3f9d4e',
  gold: '#f2c94c',
  blue: '#4f8fd0',
  smoke: 'rgba(120, 120, 120, 0.35)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best shift total is kept between visits (this browser only). */
export const BEST_KEY = 'sizzle-and-serve.best';

/** Station rectangles, in field coordinates. */
export const STATIONS = {
  buns: { kind: 'crate', item: 'bun', label: 'BUNS', x: 10, y: 118, width: 108, height: 76 },
  patty: { kind: 'crate', item: 'patty_raw', label: 'PATTY', x: 10, y: 202, width: 108, height: 76 },
  lettuce: { kind: 'crate', item: 'lettuce', label: 'LETTUCE', x: 10, y: 286, width: 108, height: 76 },
  tomato: { kind: 'crate', item: 'tomato', label: 'TOMATO', x: 10, y: 370, width: 108, height: 76 },
  cheese: { kind: 'crate', item: 'cheese', label: 'CHEESE', x: 10, y: 454, width: 108, height: 76 },
  potato: { kind: 'crate', item: 'potato', label: 'POTATO', x: 10, y: 538, width: 108, height: 76 },
  grill: { kind: 'grill', label: 'GRILL', x: 400, y: 118, width: 200, height: 78 },
  fryer: { kind: 'fryer', label: 'FRYER', x: 640, y: 118, width: 160, height: 78 },
  chop: { kind: 'chop', label: 'CHOP BOARD', x: 840, y: 118, width: 160, height: 78 },
  plating: { kind: 'plating', label: 'PLATING', x: 460, y: 320, width: 360, height: 100 },
  serve: { kind: 'serve', label: 'SERVE', x: 1130, y: 240, width: 140, height: 160 },
  trash: { kind: 'trash', label: 'TRASH', x: 1140, y: 470, width: 120, height: 90 },
};

/** Plate slots on the plating counter (centres). */
export const PLATES = [
  { x: 560, y: 370 },
  { x: 720, y: 370 },
];
