// A small softmax (multinomial logistic regression) classifier, trained with
// plain JavaScript gradient descent. The Image Model trains this on MobileNet
// feature vectors: a few hundred parameters per class, seconds to train.
// No TensorFlow.js needed, so training works the same on every backend.

// samples: arrays of equal length, ideally L2-normalized (see normalize()).
export function trainSoftmax(samples, labels, numClasses, { epochs = 50, learningRate = 0.1, l2 = 1e-4, onEpoch } = {}) {
  const dim = samples[0].length;
  const W = Array.from({ length: numClasses }, () => new Float32Array(dim));
  const b = new Float32Array(numClasses);
  const n = samples.length;
  const order = [...Array(n).keys()];
  const scores = new Float32Array(numClasses);

  for (let epoch = 0; epoch < epochs; epoch++) {
    // Shuffle each epoch (Fisher–Yates).
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    let loss = 0;
    let correct = 0;
    for (const idx of order) {
      const x = samples[idx];
      const y = labels[idx];
      probabilities(W, b, x, scores);
      loss -= Math.log(Math.max(scores[y], 1e-9));
      if (argmax(scores) === y) correct++;
      for (let c = 0; c < numClasses; c++) {
        const g = scores[c] - (c === y ? 1 : 0);
        const w = W[c];
        for (let d = 0; d < dim; d++) w[d] -= learningRate * (g * x[d] + l2 * w[d]);
        b[c] -= learningRate * g;
      }
    }
    if (onEpoch) onEpoch({ epoch: epoch + 1, loss: loss / n, accuracy: correct / n });
  }
  return { W, b };
}

export function predict(model, x) {
  const scores = new Float32Array(model.b.length);
  probabilities(model.W, model.b, x, scores);
  return scores;
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
}

function argmax(a) {
  let best = 0;
  for (let i = 1; i < a.length; i++) if (a[i] > a[best]) best = i;
  return best;
}

/** Scales a feature vector to length 1, which keeps training stable. */
export function normalize(v) {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  const k = 1 / Math.sqrt(sum || 1);
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] * k;
  return out;
}
