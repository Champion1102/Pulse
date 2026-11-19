import { useSyncExternalStore } from 'react';

// Tiny synthesized sound kit (WebAudio, no assets). Opt-out via the sound toggle.
const KEY = 'pulse:sound';
const listeners = new Set<() => void>();
let ctx: AudioContext | null = null;

export function soundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSound(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
  if (on) sfx.pop();
}

export function useSound(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    soundOn,
    () => true,
  );
  return [on, setSound];
}

function audio(): AudioContext | null {
  if (!soundOn()) return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, { at = 0, dur = 0.12, type = 'sine' as OscillatorType, gain = 0.08, glide = 0 } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (glide) osc.frequency.exponentialRampToValueAtTime(freq * glide, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  tap: () => tone(660, { dur: 0.05, gain: 0.04, type: 'triangle' }),
  pop: () => tone(520, { dur: 0.14, gain: 0.07, glide: 1.8 }),
  tick: () => tone(1200, { dur: 0.04, gain: 0.035, type: 'square' }),
  start: () => [523, 659, 784].forEach((f, i) => tone(f, { at: i * 0.07, dur: 0.18, gain: 0.06 })),
  reveal: () => [392, 523].forEach((f, i) => tone(f, { at: i * 0.09, dur: 0.22, gain: 0.07, type: 'triangle' })),
  correct: () => [659, 880, 1175].forEach((f, i) => tone(f, { at: i * 0.075, dur: 0.2, gain: 0.07 })),
  wrong: () => tone(220, { dur: 0.32, gain: 0.07, type: 'sawtooth', glide: 0.6 }),
  fanfare: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, { at: i * 0.11, dur: 0.26, gain: 0.07, type: 'triangle' })),
};
