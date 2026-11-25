// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between four screens: title, play, paused and shift over.
//
// ?seed=N fixes the order pattern. ?shot=start|play|serve|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, SHIFT_SECONDS, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld,
  EVENT_BURN,
  EVENT_CHOP,
  EVENT_COOKED,
  EVENT_FAIL,
  EVENT_LEVEL,
  EVENT_LOST,
  EVENT_OVER,
  EVENT_PICKUP,
  EVENT_PLACE,
  EVENT_SERVE,
  EVENT_TRASH,
} from './world.js';
import { ACTION_CONFIRM, ACTION_INTERACT, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import { sfx, unlockSound } from './sound.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function playEvents(events) {
  if (events & EVENT_PICKUP) sfx.pickup();
  if (events & EVENT_PLACE) sfx.place();
  if (events & EVENT_CHOP) sfx.chop();
  if (events & EVENT_COOKED) sfx.cooked();
  if (events & EVENT_SERVE) sfx.serve();
  if (events & EVENT_LOST) sfx.lost();
  if (events & EVENT_BURN) sfx.fail();
  if (events & EVENT_TRASH) sfx.trash();
  if (events & EVENT_FAIL) sfx.fail();
  if (events & EVENT_LEVEL) sfx.level();
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, null);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let lastTickSecond = -1;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    unlockSound();
    world.reset();
    accumulator = 0;
    lastTickSecond = -1;
    screen = SCREEN_PLAY;
    announce('Playing. Serve the orders before their patience runs out.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.coins > best) {
      best = world.state.coins;
      saveBest(best);
    }
    sfx.over();
    announce(`Shift over. You earned $${world.state.coins} and served ${world.state.served} orders.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & (ACTION_INTERACT | ACTION_CONFIRM)) unlockSound();
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) startGame();
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    if (actions & ACTION_INTERACT) {
      const events = world.interact();
      playEvents(events);
    }
  }

  function step() {
    const move = input.move();
    const events = world.step(STEP, move.x, move.y);
    playEvents(events);
    if (events & EVENT_OVER) endGame();
    const remain = SHIFT_SECONDS - world.state.elapsed;
    const whole = Math.ceil(remain);
    if (remain <= 10 && remain > 0 && whole !== lastTickSecond) {
      lastTickSecond = whole;
      sfx.tick();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    const hint = screen === SCREEN_PLAY ? world.actionHint() : null;
    renderer.draw(world.state, screen, best, hint);
  }

  // Leaving the tab pauses a running game rather than letting orders expire unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sizzle and Serve. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
