// Text AI features: turns a sentence into numbers a classifier can learn from.
// Words are cut into pieces the model knows (WordPiece, the BERT vocabulary), each
// piece has a ready-made vector of numbers (static embeddings distilled from a
// sentence model: Model2Vec "potion"), and a sentence is the average of its pieces.
// Plain JavaScript, no TensorFlow.js and no GPU: it runs anywhere, instantly.

const MAX_WORD_CHARS = 100;
// Longer texts are cut here (like the original model).
export const MAX_TOKENS = 512;

const isWhitespace = (ch) => ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || /\p{Zs}/u.test(ch);
const isControl = (ch) => ch !== '\t' && ch !== '\n' && ch !== '\r' && /\p{C}/u.test(ch);
function isPunctuation(ch) {
  const c = ch.codePointAt(0);
  // All ASCII symbols count as punctuation (like BERT), plus Unicode punctuation.
  if ((c >= 33 && c <= 47) || (c >= 58 && c <= 64) || (c >= 91 && c <= 96) || (c >= 123 && c <= 126)) return true;
  return /\p{P}/u.test(ch);
}
function isChinese(c) {
  return (c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3400 && c <= 0x4dbf) || (c >= 0x20000 && c <= 0x2a6df)
    || (c >= 0x2a700 && c <= 0x2b73f) || (c >= 0x2b740 && c <= 0x2b81f) || (c >= 0x2b820 && c <= 0x2ceaf)
    || (c >= 0xf900 && c <= 0xfaff) || (c >= 0x2f800 && c <= 0x2fa1f);
}

/** Splits text into lower-case words and single punctuation marks (the BERT way). */
export function splitWords(text) {
  const words = [];
  let word = '';
  const flush = () => {
    if (word) words.push(word);
    word = '';
  };
  // Lower case without accents: "Café" → "cafe".
  const clean = String(text).normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase();
  for (const ch of clean) {
    const c = ch.codePointAt(0);
    if (c === 0 || c === 0xfffd || isControl(ch)) continue;
    if (isWhitespace(ch)) flush();
    else if (isPunctuation(ch) || isChinese(c)) {
      flush();
      words.push(ch);
    } else word += ch;
  }
  flush();
  return words;
}

/**
 * @param {string[]} vocab  the word pieces, in the order of the embedding rows
 * @returns {(text: string) => number[]} the rows of the pieces of a text (unknown words are left out)
 */
export function createTokenizer(vocab) {
  const ids = new Map(vocab.map((piece, i) => [piece, i]));
  return function tokenize(text) {
    const out = [];
    for (const word of splitWords(text)) {
      const chars = [...word];
      if (chars.length > MAX_WORD_CHARS) continue;
      // Longest piece first: "unkindly" → "unkind" + "##ly".
      const pieces = [];
      let start = 0;
      while (start < chars.length) {
        let end = chars.length;
        let found = -1;
        while (end > start) {
          const id = ids.get((start ? '##' : '') + chars.slice(start, end).join(''));
          if (id !== undefined) {
            found = id;
            break;
          }
          end--;
        }
        if (found < 0) break;
        pieces.push(found);
        start = end;
      }
      if (start === chars.length) out.push(...pieces); // else: a word the model doesn't know
      if (out.length >= MAX_TOKENS) break;
    }
    return out.length > MAX_TOKENS ? out.slice(0, MAX_TOKENS) : out;
  };
}

/**
 * The embedding table as stored in models/text-potion/embeddings.bin: one scale
 * (float32) per row, then the rows as signed bytes (value = byte × scale).
 * @param {ArrayBuffer} buffer
 */
export function parseEmbeddings(buffer, rows, dim) {
  if (buffer.byteLength !== rows * 4 + rows * dim) throw new Error('The text model file is damaged');
  return {
    rows,
    dim,
    scales: new Float32Array(buffer.slice(0, rows * 4)),
    data: new Int8Array(buffer, rows * 4, rows * dim),
  };
}

/** @returns {(ids: number[]) => Float32Array} the sentence vector (length 1; all zeros for no known words) */
export function createEmbedder({ dim, scales, data }) {
  return function embed(ids) {
    const v = new Float32Array(dim);
    for (const id of ids) {
      const s = scales[id];
      const at = id * dim;
      for (let d = 0; d < dim; d++) v[d] += data[at + d] * s;
    }
    let sum = 0;
    for (let d = 0; d < dim; d++) sum += v[d] * v[d];
    if (sum > 0) {
      const k = 1 / Math.sqrt(sum);
      for (let d = 0; d < dim; d++) v[d] *= k;
    }
    return v;
  };
}

/**
 * The kindness check: a small model trained on many labelled comments. It adds up
 * the sentence vector (weights w) and what it learned about each word piece
 * (pieces), and turns the sum into a chance from 0 to 1 that the text is unkind.
 * @param {{w: Float32Array, b: number, pieces: Float32Array|null}} head
 */
export function unkindChance(head, vector, ids) {
  if (!ids.length) return 0;
  let s = head.b;
  for (let d = 0; d < vector.length; d++) s += head.w[d] * vector[d];
  if (head.pieces) {
    let sum = 0;
    for (const id of ids) sum += head.pieces[id];
    s += sum / ids.length;
  }
  return 1 / (1 + Math.exp(-s));
}
