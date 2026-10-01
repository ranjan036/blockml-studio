// BlockML Studio text runtime (MIT). Used by the Text AI extension: loads the
// text model (word-piece vectors + the kindness check) from the same folder and
// turns sentences into numbers. Plain JavaScript: no TensorFlow.js, no GPU, and
// nothing typed ever leaves the device.
import { createTokenizer, createEmbedder, parseEmbeddings, unkindChance } from '../features/text.js';

export { createTrainer, predict } from '../features/classifier.js';

const HERE = import.meta.url.slice(0, import.meta.url.lastIndexOf('/') + 1);
const MODEL = HERE + 'models/text-potion/';

async function get(file) {
  const res = await fetch(MODEL + file);
  if (!res.ok) throw new Error(`text model file ${file}: ${res.status}`);
  return res;
}

let modelPromise = null;
/**
 * Loads the text model once. Resolves with:
 *   pieces(text)  → the word pieces the AI reads (unknown words are left out)
 *   embed(text)   → the sentence as numbers (length 1), or null if it knows no word in it
 *   unkind(text)  → the kindness check's chance (0..1) that the text is unkind
 */
export function loadTextModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const manifest = await (await get('manifest.json')).json();
      const [vocabText, embeddings, kindness] = await Promise.all([
        get('vocab.txt').then((r) => r.text()),
        get('embeddings.bin').then((r) => r.arrayBuffer()),
        get('kindness.bin').then((r) => r.arrayBuffer()),
      ]);
      const vocab = vocabText.split(/\r?\n/);
      if (vocab.length !== manifest.rows) throw new Error('The text model files do not match');
      const table = parseEmbeddings(embeddings, manifest.rows, manifest.dim);
      const tokenize = createTokenizer(vocab);
      const embedIds = createEmbedder(table);
      // kindness.bin: the bias, the weights of the sentence vector, then one weight per word piece.
      const k = new Float32Array(kindness);
      if (k.length !== 1 + manifest.dim + manifest.rows) throw new Error('The kindness model file is damaged');
      const head = { b: k[0], w: k.subarray(1, 1 + manifest.dim), pieces: k.subarray(1 + manifest.dim) };
      return {
        name: manifest.name,
        pieces: (text) => tokenize(text).map((id) => vocab[id]),
        embed(text) {
          const ids = tokenize(text);
          return ids.length ? embedIds(ids) : null;
        },
        unkind(text) {
          const ids = tokenize(text);
          return unkindChance(head, embedIds(ids), ids);
        },
      };
    })().catch((err) => {
      modelPromise = null; // allow a retry
      throw err;
    });
  }
  return modelPromise;
}
