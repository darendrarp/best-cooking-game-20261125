// Tiny sound effects, synthesised with the Web Audio API — no audio files, no network. Every
// call is guarded: in a headless browser or before the first gesture there is simply no sound.

let context = null;

function audio() {
  if (context) return context;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  } catch {
    return null;
  }
  return context;
}

/** Wake the audio graph on a user gesture (browsers start it suspended). */
export function unlockSound() {
  const ctx = audio();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function tone(freq, dur, type, gain, when = 0) {
  const ctx = audio();
  if (!ctx) return;
  try {
    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    amp.gain.setValueAtTime(gain, start);
    amp.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  } catch {
    // Sound is garnish: never let it break the game.
  }
}

export const sfx = {
  pickup() {
    tone(520, 0.09, 'sine', 0.12);
  },
  place() {
    tone(330, 0.08, 'triangle', 0.12);
  },
  chop() {
    tone(180, 0.07, 'square', 0.1);
    tone(90, 0.09, 'square', 0.08, 0.02);
  },
  cooked() {
    tone(660, 0.1, 'sine', 0.12);
    tone(880, 0.14, 'sine', 0.12, 0.09);
  },
  serve() {
    tone(523, 0.1, 'triangle', 0.14);
    tone(659, 0.1, 'triangle', 0.14, 0.09);
    tone(784, 0.18, 'triangle', 0.14, 0.18);
  },
  lost() {
    tone(220, 0.25, 'sawtooth', 0.07);
    tone(160, 0.3, 'sawtooth', 0.07, 0.12);
  },
  fail() {
    tone(140, 0.12, 'square', 0.08);
  },
  trash() {
    tone(300, 0.06, 'sine', 0.08);
    tone(200, 0.08, 'sine', 0.08, 0.05);
  },
  level() {
    tone(440, 0.1, 'triangle', 0.12);
    tone(587, 0.1, 'triangle', 0.12, 0.1);
    tone(880, 0.16, 'triangle', 0.12, 0.2);
  },
  tick() {
    tone(980, 0.05, 'sine', 0.08);
  },
  over() {
    tone(392, 0.15, 'triangle', 0.12);
    tone(523, 0.15, 'triangle', 0.12, 0.14);
    tone(659, 0.25, 'triangle', 0.12, 0.28);
  },
};
