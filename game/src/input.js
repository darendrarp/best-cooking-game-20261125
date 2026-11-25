// Keyboard and pointer input. Held keys steer the chef in four directions; one-shot presses
// (interact, start/restart, pause) are queued as bit flags and taken once by the loop, so a
// press between two frames is never lost and never counted twice. Clicking also interacts.

export const ACTION_INTERACT = 1;
export const ACTION_CONFIRM = 2;
export const ACTION_PAUSE = 4;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const INTERACT = new Set(['KeyE', 'Space']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target) {
  const held = { left: false, right: false, up: false, down: false };
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) held.left = true;
    else if (RIGHT.has(event.code)) held.right = true;
    else if (UP.has(event.code)) held.up = true;
    else if (DOWN.has(event.code)) held.down = true;
    else if (INTERACT.has(event.code)) {
      if (!event.repeat) actions |= ACTION_INTERACT | ACTION_CONFIRM;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) held.left = false;
    else if (RIGHT.has(event.code)) held.right = false;
    else if (UP.has(event.code)) held.up = false;
    else if (DOWN.has(event.code)) held.down = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    held.left = false;
    held.right = false;
    held.up = false;
    held.down = false;
  });
  target.addEventListener('pointerdown', () => {
    actions |= ACTION_INTERACT | ACTION_CONFIRM;
  });

  return {
    /** Steering: each of x and y in -1..1. */
    move() {
      return {
        x: (held.right ? 1 : 0) - (held.left ? 1 : 0),
        y: (held.down ? 1 : 0) - (held.up ? 1 : 0),
      };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
