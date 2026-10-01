// After `vite build`: adds the extension scripts and models to dist/, then
// copies dist/ into the editor's static files (gui/static/extensions/), which
// the editor build publishes at /extensions/.
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { patchedVosk } from './patch-vosk.mjs';

const DIST = 'dist';
for (const f of ['face.js', 'hands.js', 'image.js', 'objects.js', 'face-sensing.js', 'voice.js', 'text.js', 'scan.js', 'lens.js', 'chat.js', 'weather.js']) fs.copyFileSync(path.join('src', f), path.join(DIST, f));
// The offline speech recogniser the Voice extension loads (see patch-vosk.mjs).
fs.writeFileSync(path.join(DIST, 'vosk.js'), patchedVosk());
// The Text AI extension's runtime: plain JavaScript (no TensorFlow.js), one small module.
await build({ entryPoints: ['src/runtime/text.js'], bundle: true, format: 'esm', target: 'es2020', minify: true, legalComments: 'none', outfile: path.join(DIST, 'text-runtime.js') });
// Reading text (Lens): Tesseract.js, its worker, and its engine with and without SIMD.
fs.mkdirSync(path.join(DIST, 'ocr'), { recursive: true });
for (const f of ['tesseract.esm.min.js', 'worker.min.js']) fs.copyFileSync(path.join('node_modules', 'tesseract.js', 'dist', f), path.join(DIST, 'ocr', f));
for (const f of ['tesseract-core-simd-lstm.wasm.js', 'tesseract-core-lstm.wasm.js']) fs.copyFileSync(path.join('node_modules', 'tesseract.js-core', f), path.join(DIST, 'ocr', f));
// Chat AI: the small runtime, and the engine (WebLLM, ~6 MB) it loads on first use; and the
// Weather runtime. Minified here.
for (const [entry, out] of [['chat', 'chat-runtime.js'], ['chat-engine', 'chat-engine.js'], ['weather', 'weather-runtime.js']]) {
  await build({ entryPoints: [`src/runtime/${entry}.js`], bundle: true, format: 'esm', target: 'es2020', minify: true, legalComments: 'none', outfile: path.join(DIST, out) });
}
fs.cpSync('models', path.join(DIST, 'models'), { recursive: true });

const target = path.join('..', 'gui', 'static', 'extensions');
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(DIST, target, { recursive: true });

let bytes = 0;
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else bytes += fs.statSync(p).size; } };
walk(DIST);
console.log(`extensions: ${(bytes / 1048576).toFixed(1)} MB -> ${target}`);
