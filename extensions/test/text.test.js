import { describe, it, expect } from 'vitest';
import { splitWords, createTokenizer, createEmbedder, parseEmbeddings, unkindChance, MAX_TOKENS } from '../src/features/text.js';

// A toy vocabulary: row 0 is "you", row 1 "are", …
const VOCAB = ['you', 'are', 'kind', 'un', '##kind', '##ly', '!', "'", 're', 'cafe', '好'];
const tokenize = createTokenizer(VOCAB);
const pieces = (text) => tokenize(text).map((id) => VOCAB[id]);

describe('splitWords', () => {
  it('lower-cases, drops accents and separates punctuation', () => {
    expect(splitWords("You're  KIND!\n")).toEqual(['you', "'", 're', 'kind', '!']);
    expect(splitWords('Café')).toEqual(['cafe']);
    expect(splitWords('a$b')).toEqual(['a', '$', 'b']);
    expect(splitWords('你好')).toEqual(['你', '好']);
    expect(splitWords('a\u0000b‍c')).toEqual(['abc']);
  });
});

describe('tokenizer', () => {
  it('cuts words into the longest pieces it knows', () => {
    expect(pieces('You are unkindly!')).toEqual(['you', 'are', 'un', '##kind', '##ly', '!']);
    expect(pieces("You're kind")).toEqual(['you', "'", 're', 'kind']);
  });

  it('leaves out words it does not know at all', () => {
    expect(pieces('you are zzz kind')).toEqual(['you', 'are', 'kind']);
    expect(pieces('unkindzzz')).toEqual([]); // the end has no piece, so the whole word is unknown
    expect(pieces('')).toEqual([]);
    expect(pieces('x'.repeat(200))).toEqual([]);
  });

  it('cuts very long texts', () => {
    expect(tokenize('you '.repeat(MAX_TOKENS + 50))).toHaveLength(MAX_TOKENS);
  });
});

describe('embeddings', () => {
  // 3 rows of 2 numbers: scales first (float32), then the rows as signed bytes.
  const buffer = new ArrayBuffer(3 * 4 + 3 * 2);
  new Float32Array(buffer, 0, 3).set([0.5, 1, 2]);
  new Int8Array(buffer, 12).set([2, 0, 0, 4, -1, -1]);
  const table = parseEmbeddings(buffer, 3, 2);
  const embed = createEmbedder(table);

  it('reads the table and rejects a damaged one', () => {
    expect(table.dim).toBe(2);
    expect(Array.from(table.scales)).toEqual([0.5, 1, 2]);
    expect(() => parseEmbeddings(buffer.slice(1), 3, 2)).toThrow();
  });

  it('adds up the rows and scales the result to length 1', () => {
    expect(Array.from(embed([0]))).toEqual([1, 0]);
    const v = embed([0, 1]); // (1, 0) + (0, 4)
    expect(v[0]).toBeCloseTo(1 / Math.sqrt(17));
    expect(v[1]).toBeCloseTo(4 / Math.sqrt(17));
    expect(Array.from(embed([]))).toEqual([0, 0]);
  });

  it('the kindness check turns a vector and its pieces into a chance', () => {
    const head = { b: 0, w: new Float32Array([2, 0]), pieces: new Float32Array([1, -3, 0]) };
    expect(unkindChance(head, embed([0]), [0])).toBeCloseTo(1 / (1 + Math.exp(-3)));
    expect(unkindChance(head, embed([1]), [1])).toBeCloseTo(1 / (1 + Math.exp(3)));
    expect(unkindChance(head, embed([]), [])).toBe(0);
  });
});
