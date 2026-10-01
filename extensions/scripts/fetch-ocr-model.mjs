// Downloads the English text-reading model for the Lens extension (Tesseract
// "tessdata_fast" eng, Apache-2.0, github.com/tesseract-ocr/tessdata_fast) and stores
// it gzipped, the way Tesseract.js loads it (models/ocr-eng/eng.traineddata.gz).
// Run once when changing models: npm run fetch-ocr-model  (the result is committed)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const URL = 'https://github.com/tesseract-ocr/tessdata_fast/raw/main/eng.traineddata';
const res = await fetch(URL);
if (!res.ok) throw new Error(`eng.traineddata: ${res.status}`);
const data = Buffer.from(await res.arrayBuffer());
const dir = path.join('models', 'ocr-eng');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'eng.traineddata.gz'), zlib.gzipSync(data, { level: 9 }));
// The app exporter reads `files` to know what to copy into an app.
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ source: URL, license: 'Apache-2.0', files: ['eng.traineddata.gz'] }, null, 2));
console.log(`ocr-eng: ${(data.length / 1048576).toFixed(2)} MB, gzipped into ${dir}`);
