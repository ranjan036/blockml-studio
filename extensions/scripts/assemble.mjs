// After `vite build`: adds the extension scripts and models to dist/, then
// copies dist/ into the editor's static files (gui/static/extensions/), which
// the editor build publishes at /extensions/.
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
for (const f of ['face.js', 'hands.js']) fs.copyFileSync(path.join('src', f), path.join(DIST, f));
fs.cpSync('models', path.join(DIST, 'models'), { recursive: true });

const target = path.join('..', 'gui', 'static', 'extensions');
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(DIST, target, { recursive: true });

let bytes = 0;
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else bytes += fs.statSync(p).size; } };
walk(DIST);
console.log(`extensions: ${(bytes / 1048576).toFixed(1)} MB -> ${target}`);
