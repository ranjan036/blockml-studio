// Downloads the text model the Text AI extension uses (Model2Vec "potion-base-8M",
// minishlab, MIT licence: static word-piece vectors distilled from a sentence model)
// and repacks it small for the browser: the vocabulary as a text file, and the
// vectors as one byte per number with one scale per row (30 MB -> 7.7 MB; sentence
// vectors stay within 0.0001 of the original).
// Run once when changing models: npm run fetch-text-model  (results are committed),
// then npm run train-kindness, because the kindness check is trained on these vectors.
import fs from 'node:fs';
import path from 'node:path';

const NAME = 'potion-base-8M';
const SOURCE = `https://huggingface.co/minishlab/${NAME}`;
const DIR = path.join('models', 'text-potion');

async function get(file) {
  const res = await fetch(`${SOURCE}/resolve/main/${file}`);
  if (!res.ok) throw new Error(`${file}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// The vocabulary, in the order of the embedding rows.
const tokenizer = JSON.parse((await get('tokenizer.json')).toString('utf8'));
if (tokenizer.model.type !== 'WordPiece' || tokenizer.normalizer.type !== 'BertNormalizer' || !tokenizer.normalizer.lowercase) {
  throw new Error('The tokenizer is not the lower-case BERT WordPiece that src/features/text.js implements');
}
const vocab = Object.entries(tokenizer.model.vocab).sort((a, b) => a[1] - b[1]).map(([piece]) => piece);
if (vocab.some((piece) => piece.includes('\n'))) throw new Error('A word piece contains a line break');

// model.safetensors: 8 bytes header length, a JSON header, then the numbers (float32).
const file = await get('model.safetensors');
const headerLength = Number(file.readBigUInt64LE(0));
const header = JSON.parse(file.subarray(8, 8 + headerLength).toString('utf8'));
const { dtype, shape: [rows, dim], data_offsets: [from, to] } = header.embeddings;
if (dtype !== 'F32' || rows !== vocab.length) throw new Error('Unexpected embedding table');
const numbers = new Float32Array(file.buffer.slice(file.byteOffset + 8 + headerLength + from, file.byteOffset + 8 + headerLength + to));

// One byte per number: each row is scaled so its largest number becomes 127.
const scales = new Float32Array(rows);
const bytes = new Int8Array(rows * dim);
for (let r = 0; r < rows; r++) {
  let max = 0;
  for (let d = 0; d < dim; d++) max = Math.max(max, Math.abs(numbers[r * dim + d]));
  scales[r] = max / 127 || 1;
  for (let d = 0; d < dim; d++) bytes[r * dim + d] = Math.round(numbers[r * dim + d] / scales[r]);
}

fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(DIR, 'vocab.txt'), vocab.join('\n'));
fs.writeFileSync(path.join(DIR, 'embeddings.bin'), Buffer.concat([Buffer.from(scales.buffer), Buffer.from(bytes.buffer)]));
// `files` is what an app needs to bundle (read by BlockML's app exporter). kindness.bin
// is written by scripts/train-kindness.mjs.
fs.writeFileSync(path.join(DIR, 'manifest.json'), JSON.stringify({
  name: NAME, source: SOURCE, license: 'MIT', rows, dim, files: ['vocab.txt', 'embeddings.bin', 'kindness.bin'],
}, null, 2));
console.log(`${NAME}: ${rows} word pieces x ${dim} numbers, ${((rows * 4 + rows * dim) / 1048576).toFixed(2)} MB`);
