// Ember Court — synthesised sounds. WebAudio oscillators only: no audio
// files, no network. Every sound is built from short tones.

let ctx = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function audioContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'sine', gain = 0.12, when = 0, slideTo = null) {
  if (muted) return;
  const ac = audioContext();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp);
  amp.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function playClickSound() {
  tone(660, 0.07, 'triangle', 0.06);
}

export function playCardSound() {
  tone(520, 0.12, 'triangle', 0.1);
  tone(780, 0.16, 'sine', 0.09, 0.06);
}

export function playFuseSound() {
  tone(330, 0.25, 'sawtooth', 0.07, 0, 660);
  tone(660, 0.3, 'sine', 0.1, 0.12, 990);
  tone(990, 0.35, 'sine', 0.08, 0.24);
}

export function playDamageSound(big = false) {
  tone(big ? 180 : 220, 0.22, 'square', big ? 0.14 : 0.09, 0, 70);
  tone(90, 0.3, 'sine', 0.12, 0.02, 45);
}

export function playHealSound() {
  tone(523, 0.18, 'sine', 0.09);
  tone(659, 0.18, 'sine', 0.09, 0.09);
  tone(784, 0.28, 'sine', 0.09, 0.18);
}

export function playGuardSound() {
  tone(392, 0.15, 'triangle', 0.1);
  tone(294, 0.2, 'triangle', 0.08, 0.08);
}

export function playWinSound() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.4, 'sine', 0.11, i * 0.14));
}

export function playLoseSound() {
  [392, 330, 262, 196].forEach((f, i) => tone(f, 0.45, 'triangle', 0.1, i * 0.16));
}

export function playTurnSound() {
  tone(440, 0.1, 'sine', 0.07);
  tone(587, 0.12, 'sine', 0.07, 0.08);
}
