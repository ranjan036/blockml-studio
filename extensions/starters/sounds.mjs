// Small sound effects for the lesson games, made here from simple waves, so there
// are no third-party sound files (and no licences) in the projects. Each returns a
// 16-bit mono WAV file (22,050 samples per second) as bytes.
const RATE = 22050;

/** Builds a WAV file from a function giving the sample (-1…1) at time t (seconds). */
function wav(seconds, sample) {
  const n = Math.round(seconds * RATE);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    // A short fade in and out avoids clicks.
    const edge = Math.min(1, t / 0.005, (seconds - t) / 0.01);
    const s = Math.max(-1, Math.min(1, sample(t, t / seconds) * edge));
    buf.writeInt16LE(Math.round(s * 30000), 44 + i * 2);
  }
  return { bytes: new Uint8Array(buf), rate: RATE, sampleCount: n };
}

// Deterministic noise, so builds are identical every time.
let seed = 1;
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const tone = (f, t) => Math.sin(2 * Math.PI * f * t);
const square = (f, t) => (Math.sin(2 * Math.PI * f * t) >= 0 ? 0.6 : -0.6);
/** Phase-correct sweep from f0 to f1 over `seconds`. */
const sweep = (f0, f1, seconds) => (t) => Math.sin(2 * Math.PI * (f0 * t + ((f1 - f0) * t * t) / (2 * seconds)));
const NOTE = (n) => 440 * 2 ** ((n - 69) / 12); // MIDI note number to frequency

export const SOUNDS = {
  pop: () => { seed = 3; return wav(0.14, (t, p) => (noise() * 0.6 + tone(900 - 600 * p, t) * 0.5) * (1 - p) ** 2); },
  jump: () => { const s = sweep(300, 900, 0.22); return wav(0.22, (t, p) => s(t) * 0.7 * (1 - p)); },
  laser: () => { const s = sweep(1400, 300, 0.18); return wav(0.18, (t, p) => (s(t) >= 0 ? 0.5 : -0.5) * (1 - p)); },
  boom: () => { seed = 7; let low = 0; return wav(0.6, (t, p) => { low = low * 0.92 + noise() * 0.08; return low * 6 * (1 - p) ** 2; }); },
  catch: () => wav(0.22, (t, p) => (t < 0.09 ? tone(NOTE(76), t) : tone(NOTE(83), t)) * 0.6 * (1 - p)),
  thud: () => { const s = sweep(180, 60, 0.25); return wav(0.25, (t, p) => s(t) * 0.8 * (1 - p)); },
  crash: () => { seed = 11; return wav(0.5, (t, p) => (noise() * 0.7 + square(90, t) * 0.3) * (1 - p) ** 1.5); },
  win: () => wav(0.9, (t) => {
    const notes = [72, 76, 79, 84];
    const k = Math.min(3, Math.floor(t / 0.18));
    const local = t - k * 0.18;
    return tone(NOTE(notes[k]), t) * 0.5 * Math.exp(-local * (k === 3 ? 3 : 8));
  }),
  chime: () => wav(0.5, (t) => (tone(NOTE(84), t) * 0.4 + tone(NOTE(91), t) * 0.25) * Math.exp(-t * 6)),
  uhoh: () => wav(0.45, (t) => (t < 0.2 ? tone(NOTE(67), t) : tone(NOTE(62), t)) * 0.5 * Math.exp(-((t % 0.2) * 4))),
  // A steady engine hum, one second long, made to loop.
  engine: () => { seed = 13; return wav(1, (t) => square(55, t) * 0.35 + tone(110, t) * 0.25 + noise() * 0.05); },
  // A cheerful 4-second tune, made to loop as background music.
  music: () => {
    const melody = [72, 74, 76, 72, 76, 77, 79, 79, 77, 76, 74, 72, 74, 76, 74, 67];
    const bass = [48, 48, 53, 53, 55, 55, 48, 48];
    return wav(4, (t) => {
      const k = Math.floor(t / 0.25);
      const local = t - k * 0.25;
      const m = tone(NOTE(melody[k % 16]), t) * 0.35 * Math.exp(-local * 6);
      const b = tone(NOTE(bass[Math.floor(t / 0.5) % 8]), t) * 0.2;
      return m + b;
    });
  },
};
