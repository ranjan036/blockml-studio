// Trains the Text AI extension's kindness check and writes models/text-potion/kindness.bin.
//
// Data: Civil Comments (Jigsaw / Google, CC0): ~900,000 public comments, each scored by
// several people for how toxic it is, plus the hand-written classroom sentences in
// kindness-phrases.mjs (see there for why). Only the numbers the model learned are
// published, never the comments.
//
// Model: the chance that a text is unkind = sigmoid(b + w · sentence vector + the
// average of one learned weight per word piece). Trained with Adagrad.
//
// Run: npm run train-kindness   (downloads ~235 MB into .cache/ the first time;
// about 10 minutes). The result is committed, so this is only needed when the text
// model or the phrases change.
import fs from 'node:fs';
import path from 'node:path';
import { asyncBufferFromFile, parquetMetadataAsync, parquetReadObjects } from 'hyparquet';
import { compressors } from 'hyparquet-compressors';
import { createTokenizer, createEmbedder, parseEmbeddings, unkindChance } from '../src/features/text.js';
import { TRAIN, CHECK, WHO } from './kindness-phrases.mjs';

const DIR = path.join('models', 'text-potion');
const CACHE = '.cache';
const DATA = 'https://huggingface.co/api/datasets/google/civil_comments/parquet/default/';
const EPOCHS = 3;
// Each hand-written sentence is shown this many times per epoch (there are ~1,500 of
// them among 900,000 comments).
const PHRASE_REPEATS = Number(process.env.PHRASE_REPEATS || 20);
const RATE = 0.1;
const PIECE_RATE = 0.5;

const manifest = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
const vocab = fs.readFileSync(path.join(DIR, 'vocab.txt'), 'utf8').split(/\r?\n/);
const table = fs.readFileSync(path.join(DIR, 'embeddings.bin'));
const embed = createEmbedder(parseEmbeddings(table.buffer.slice(table.byteOffset, table.byteOffset + table.byteLength), manifest.rows, manifest.dim));
const tokenize = createTokenizer(vocab);
const { rows, dim } = manifest;

/** A split of Civil Comments as word-piece rows per comment and its toxicity (0..1). */
async function comments(split) {
  fs.mkdirSync(CACHE, { recursive: true });
  const file = path.join(CACHE, `civil-comments-${split.replace('/', '-')}.parquet`);
  if (!fs.existsSync(file)) {
    console.log(`downloading ${split}…`);
    const res = await fetch(`${DATA}${split}.parquet`);
    if (!res.ok) throw new Error(`${split}: ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  const buffer = await asyncBufferFromFile(file);
  const n = Number((await parquetMetadataAsync(buffer)).num_rows);
  const ids = [];
  const y = new Float32Array(n);
  for (let at = 0; at < n; at += 50000) {
    const part = await parquetReadObjects({ file: buffer, compressors, columns: ['text', 'toxicity'], rowStart: at, rowEnd: Math.min(n, at + 50000) });
    part.forEach((r, i) => {
      ids.push(Uint16Array.from(tokenize(r.text)));
      y[at + i] = r.toxicity;
    });
    process.stdout.write(`\rreading ${split}: ${at + part.length} of ${n}`);
  }
  console.log();
  return { ids, y };
}

const train = await comments('train/0');
const validation = await comments('validation/0');
const test = await comments('test/0');

// The hand-written sentences, repeated.
const phrases = [...TRAIN.unkind.map((t) => [t, 1]), ...TRAIN.fine.map((t) => [t, 0])];
const n0 = train.ids.length;
const ids = [...train.ids];
const y = new Float32Array(n0 + phrases.length * PHRASE_REPEATS);
y.set(train.y);
for (let r = 0; r < PHRASE_REPEATS; r++) {
  for (const [text, label] of phrases) {
    y[ids.length] = label;
    ids.push(Uint16Array.from(tokenize(text)));
  }
}
console.log(`training on ${n0} comments + ${phrases.length} sentences x ${PHRASE_REPEATS}`);

const head = { b: -2.5, w: new Float32Array(dim), pieces: new Float32Array(rows) };
const chance = (pieceIds) => unkindChance(head, embed(pieceIds), pieceIds);
// Adagrad: each number gets smaller steps the more it has already moved.
const seenW = new Float32Array(dim).fill(1e-6);
const seenPieces = new Float32Array(rows).fill(1e-6);
let seenB = 1e-6;
let seed = 12345;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const order = Uint32Array.from(ids, (_, i) => i);

for (let epoch = 1; epoch <= EPOCHS; epoch++) {
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  let loss = 0;
  for (const i of order) {
    const pieceIds = ids[i];
    if (!pieceIds.length) continue;
    const v = embed(pieceIds);
    const p = unkindChance(head, v, pieceIds);
    loss -= y[i] * Math.log(Math.max(p, 1e-9)) + (1 - y[i]) * Math.log(Math.max(1 - p, 1e-9));
    const g = p - y[i];
    for (let d = 0; d < dim; d++) {
      const gd = g * v[d];
      seenW[d] += gd * gd;
      head.w[d] -= RATE * gd / Math.sqrt(seenW[d]);
    }
    seenB += g * g;
    head.b -= RATE * g / Math.sqrt(seenB);
    const gp = g / pieceIds.length;
    for (const id of pieceIds) {
      seenPieces[id] += gp * gp;
      head.pieces[id] -= PIECE_RATE * gp / Math.sqrt(seenPieces[id]);
    }
  }
  console.log(`epoch ${epoch} of ${EPOCHS}: loss ${(loss / order.length).toFixed(4)}`);
}

// ---- where "50" is --------------------------------------------------------------------
// Few comments are toxic, so the raw chances are cautious: most unkind comments score
// under 50%. Move the zero point so that 50 is where the check does best on the
// validation comments (the highest F1: the balance of false alarms and misses).
function measure(set, threshold) {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  set.scores.forEach((s, i) => {
    const unkind = set.y[i] >= 0.5;
    if (s >= threshold) unkind ? tp++ : fp++;
    else if (unkind) fn++;
  });
  const precision = tp / (tp + fp || 1);
  const recall = tp / (tp + fn || 1);
  return { precision, recall, f1: (2 * precision * recall) / (precision + recall || 1) };
}
const score = (set) => { set.scores = Float32Array.from(set.ids, (pieceIds) => chance(pieceIds)); };
score(validation);
let best = { f1: 0, threshold: 0.5 };
for (let t = 0.05; t < 0.95; t += 0.01) {
  const m = measure(validation, t);
  if (m.f1 > best.f1) best = { ...m, threshold: t };
}
head.b -= Math.log(best.threshold / (1 - best.threshold));
console.log(`50 is placed at the raw chance ${best.threshold.toFixed(2)}`);

// ---- fairness: who someone is must not count against them ---------------------------------
// In the comments, words like "Muslim", "black" or "gay" appear mostly in arguments, so
// the model learned to distrust the words themselves. The extra sentences fix that for
// whole sentences; here the words' own weights are lowered until none of them, typed on
// its own, scores above 25. Unkind sentences about a group are still caught by their
// other words ("hate", "stupid").
const FAIR_BELOW = 0.25;
const SMALL_WORDS = new Set(['a', 'an', 'in', 'not', 'people', '-', '##s']);
const ownPieces = (term) => [...new Set(tokenize(term))].filter((id) => !SMALL_WORDS.has(vocab[id]));
const lowered = new Set();
for (let round = 0; round < 500; round++) {
  const over = WHO.filter((term) => chance(tokenize(term)) > FAIR_BELOW);
  if (!over.length) break;
  for (const term of over) {
    for (const id of ownPieces(term)) {
      head.pieces[id] -= 0.1;
      lowered.add(vocab[id]);
    }
  }
}
console.log(`fairness: lowered the weight of ${lowered.size} word pieces (${[...lowered].join(' ')})`);

// ---- how good is it? ------------------------------------------------------------------
score(test);
function auc({ scores, y: labels }) {
  const sorted = [...scores.keys()].sort((a, b) => scores[a] - scores[b]);
  let positives = 0;
  let rankSum = 0;
  sorted.forEach((i, rank) => {
    if (labels[i] >= 0.5) {
      positives++;
      rankSum += rank + 1;
    }
  });
  return (rankSum - (positives * (positives + 1)) / 2) / (positives * (sorted.length - positives));
}
const m = measure(test, 0.5);
console.log(`test comments: AUC ${auc(test).toFixed(3)}; at 50: catches ${(100 * m.recall).toFixed(0)}% of the unkind ones, and ${(100 * m.precision).toFixed(0)}% of what it flags is unkind`);

const scoreOf = (text) => Math.round(100 * chance(tokenize(text)));
for (const [kind, texts] of Object.entries(CHECK)) {
  const wrong = texts.filter((t) => (scoreOf(t) >= 50) !== (kind === 'unkind'));
  console.log(`sentences never trained on, ${kind}: ${texts.length - wrong.length} of ${texts.length} right`);
  for (const t of wrong) console.log(`   ${String(scoreOf(t)).padStart(3)}  ${t}`);
}
const flagged = WHO.filter((t) => scoreOf(t) >= 50);
console.log(`words for who someone is, flagged on their own: ${flagged.length ? flagged.map((t) => `${t} ${scoreOf(t)}`).join(', ') : 'none'}`);
if (process.argv.includes('--all')) for (const texts of Object.values(CHECK)) for (const t of texts) console.log(String(scoreOf(t)).padStart(3), t);

// kindness.bin: the bias, the weights of the sentence vector, then one weight per word piece (float32).
if (!process.argv.includes('--dry-run')) {
  const out = new Float32Array(1 + dim + rows);
  out[0] = head.b;
  out.set(head.w, 1);
  out.set(head.pieces, 1 + dim);
  fs.writeFileSync(path.join(DIR, 'kindness.bin'), Buffer.from(out.buffer));
  console.log(`wrote kindness.bin (${(out.byteLength / 1024).toFixed(0)} KB)`);
}
