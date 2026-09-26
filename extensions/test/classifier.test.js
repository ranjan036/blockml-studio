import { describe, it, expect } from 'vitest';
import { createTrainer, predict, normalize, encodeSample, decodeSample } from '../src/features/classifier.js';

// Deterministic pseudo-random numbers so tests don't flake.
function rng(seed = 1) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

// Three clusters of non-negative 64-D "features", like ReLU outputs.
function dataset(perClass = 20, seed = 7) {
  const r = rng(seed);
  const centers = [0, 1, 2].map(() => Array.from({ length: 64 }, () => r()));
  const samples = [];
  const labels = [];
  centers.forEach((c, k) => {
    for (let i = 0; i < perClass; i++) {
      samples.push(normalize(c.map((x) => Math.max(0, x + (r() - 0.5) * 0.4))));
      labels.push(k);
    }
  });
  return { samples, labels, centers };
}

describe('classifier', () => {
  it('learns separable classes and reports falling loss', () => {
    const { samples, labels, centers } = dataset();
    const t = createTrainer(samples, labels, 3, { epochs: 30, random: rng(3) });
    const history = [];
    while (!t.done) history.push(t.step());
    expect(history).toHaveLength(30);
    expect(history.at(-1).accuracy).toBe(1);
    expect(history.at(-1).loss).toBeLessThan(history[0].loss);
    for (let k = 0; k < 3; k++) {
      const p = predict(t.model, normalize(centers[k]));
      expect(p.indexOf(Math.max(...p))).toBe(k);
      expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    }
  });

  it('saves features compactly and loads them back', () => {
    const { samples } = dataset(1);
    const encoded = encodeSample(samples[0]);
    expect(atob(encoded).length).toBe(64); // one byte per feature
    const back = decodeSample(encoded);
    let dot = 0;
    for (let i = 0; i < 64; i++) dot += back[i] * samples[0][i];
    expect(dot).toBeGreaterThan(0.999); // same direction after rounding
  });

  it('a model trained on saved (decoded) features still works', () => {
    const { samples, labels, centers } = dataset();
    const restored = samples.map((s) => decodeSample(encodeSample(s)));
    const t = createTrainer(restored, labels, 3, { epochs: 30, random: rng(5) });
    while (!t.done) t.step();
    const p = predict(t.model, normalize(centers[2]));
    expect(p.indexOf(Math.max(...p))).toBe(2);
  });
});
