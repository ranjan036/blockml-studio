// The Image Model's classifier: softmax regression (multinomial logistic
// regression) on MobileNet feature vectors, trained with plain gradient descent.
// A few thousand numbers per class; trains in well under a second.
//
// Training runs one epoch per step() so the trainer window can draw the loss
// and accuracy as it learns.

/** Scales a feature vector to length 1 (keeps training stable). */
export function normalize(v) {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  const k = 1 / Math.sqrt(sum || 1);
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] * k;
  return out;
}

function probabilities(W, b, x, out) {
  let max = -Infinity;
  for (let c = 0; c < W.length; c++) {
    let s = b[c];
    const w = W[c];
    for (let d = 0; d < x.length; d++) s += w[d] * x[d];
    out[c] = s;
    if (s > max) max = s;
  }
  let sum = 0;
  for (let c = 0; c < W.length; c++) {
    out[c] = Math.exp(out[c] - max);
    sum += out[c];
  }
  for (let c = 0; c < W.length; c++) out[c] /= sum;
  return out;
}

/**
 * @param {Float32Array[]} samples  normalized feature vectors
 * @param {number[]} labels  class index per sample
 * @param {number} numClasses
 */
export function createTrainer(samples, labels, numClasses, { epochs = 40, learningRate = 0.5, l2 = 1e-4, random = Math.random } = {}) {
  const dim = samples[0].length;
  const W = Array.from({ length: numClasses }, () => new Float32Array(dim));
  const b = new Float32Array(numClasses);
  const order = [...samples.keys()];
  const scores = new Float32Array(numClasses);
  let epoch = 0;

  return {
    epochs,
    get done() { return epoch >= epochs; },
    model: { W, b },
    /** Runs one epoch; returns {epoch, loss, accuracy}. */
    step() {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      let loss = 0;
      let correct = 0;
      for (const idx of order) {
        const x = samples[idx];
        const y = labels[idx];
        probabilities(W, b, x, scores);
        loss -= Math.log(Math.max(scores[y], 1e-9));
        let best = 0;
        for (let c = 1; c < numClasses; c++) if (scores[c] > scores[best]) best = c;
        if (best === y) correct++;
        for (let c = 0; c < numClasses; c++) {
          const g = scores[c] - (c === y ? 1 : 0);
          const w = W[c];
          for (let d = 0; d < dim; d++) w[d] -= learningRate * (g * x[d] + l2 * w[d]);
          b[c] -= learningRate * g;
        }
      }
      epoch++;
      return { epoch, loss: loss / order.length, accuracy: correct / order.length };
    },
  };
}

/** Probabilities (0..1) for each class. */
export function predict(model, x) {
  return probabilities(model.W, model.b, x, new Float32Array(model.b.length));
}

// Saved in the project as 1 byte per feature. Normalized MobileNet features are
// all >= 0 (they come after a ReLU) and at most 1, so 0..255 keeps plenty of detail.
export function encodeSample(v) {
  let s = '';
  for (let i = 0; i < v.length; i++) s += String.fromCharCode(Math.max(0, Math.min(255, Math.round(v[i] * 255))));
  return btoa(s);
}

export function decodeSample(b64) {
  const s = atob(b64);
  const v = new Float32Array(s.length);
  for (let i = 0; i < s.length; i++) v[i] = s.charCodeAt(i) / 255;
  return normalize(v);
}
