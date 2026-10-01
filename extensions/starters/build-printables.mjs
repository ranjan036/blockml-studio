// Printable sheets for the Codes & Cards blocks, in ../gui/static/lessons/printables/:
// the recognition cards (card n is AprilTag 36h11 number n), numbered AprilTags and
// a few QR codes. The codes are drawn by the same libraries that read them.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import qrcode from 'qrcode-generator';
import { CARDS } from '../src/features/scan.js';
import { printPage } from './lesson-pages.mjs';

const require = createRequire(import.meta.url);
const { AR } = require('js-aruco2/src/aruco.js');
globalThis.AR = AR; // the dictionary file adds itself to a global AR
require('js-aruco2/src/dictionaries/apriltag_36h11.js');
const tags = new AR.Dictionary('APRILTAG_36h11');
const tagSvg = (id) => tags.generateSVG(id).replace('<svg ', '<svg style="width:100%;height:auto;display:block" shape-rendering="crispEdges" ');

const OUT = path.join('..', 'gui', 'static', 'lessons', 'printables');
fs.mkdirSync(OUT, { recursive: true });

const PICTURES = {
  go: '🟢', stop: '🛑', left: '⬅️', right: '➡️', forward: '⬆️', back: '⬇️', 'turn around': '🔄', jump: '🦘',
  apple: '🍎', banana: '🍌', cat: '🐱', dog: '🐶', fish: '🐟', bird: '🐦', car: '🚗', house: '🏠', tree: '🌳', sun: '☀️', star: '⭐', heart: '❤️',
};
const grid = (items, columns) => `<div style="display:grid;grid-template-columns:repeat(${columns},1fr);gap:6mm">${items.join('\n')}</div>`;
const cell = (code, caption, small = '') => `<div style="border:2px dashed #b8c6dc;border-radius:12px;padding:5mm;text-align:center;break-inside:avoid">
<div style="width:42mm;margin:0 auto">${code}</div>
<div style="font-weight:800;color:var(--ink);font-size:22px;margin-top:3mm">${caption}</div>${small ? `<div class="small">${small}</div>` : ''}</div>`;
const tip = 'Print on white paper at 100% size and keep the white edge around each code. Hold a card flat, facing the camera; it works from about 20 cm to 1 m.';

fs.writeFileSync(path.join(OUT, 'cards.html'), printPage('Recognition cards',
  `${tip} The camera reads the black square; the picture and the word are for people. Card names are what the <b>card</b> blocks use.`,
  grid(CARDS.map((name, id) => cell(tagSvg(id), `${PICTURES[name] || ''} ${name}`, `tag ${id}`)), 3)));

fs.writeFileSync(path.join(OUT, 'tags.html'), printPage('AprilTags',
  `${tip} These are AprilTags (family 36h11), the codes robots use to find their way. The <b>tag</b> blocks give each tag's number. Tags 0 to ${CARDS.length - 1} are also the recognition cards.`,
  grid(Array.from({ length: 12 }, (_, i) => cell(tagSvg(i + 100), `${i + 100}`)), 3)));

const qrSvg = (text) => {
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  return q.createSvgTag({ cellSize: 4, margin: 4, scalable: true }).replace('<svg ', '<svg style="width:100%;height:auto;display:block" shape-rendering="crispEdges" ');
};
const QR_TEXTS = ['hello', 'jump', 'go left', 'level 2', 'apple', 'CODE AI'];
fs.writeFileSync(path.join(OUT, 'qr.html'), printPage('QR codes',
  `${tip} The <b>QR code text</b> block gives the words hidden in the code. Make your own with any QR code maker.`,
  grid(QR_TEXTS.map((t) => cell(qrSvg(t), `“${t}”`)), 3)));
console.log('printables: cards.html, tags.html, qr.html');
