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
// AI Vocabulary Cards: the five words used from Game 2 onward (checked in AI 19), plus three
// extras for older classes. Eight cards fill one A4 page; print one page per pair.
const VOCAB = [
  ['Example', '📷', 'One piece of data we show the AI.', 'One photo of a good-apple card'],
  ['Label', '🏷️', 'The name of the group an example belongs to.', 'Good apple · Friend · Happy'],
  ['Train', '🏋️', 'The computer finds the patterns that separate the labels.', 'Press “Train model” and watch the accuracy rise'],
  ['Predict', '🔮', 'The AI’s answer for something new.', 'It says “Foe” for a ship it has never seen'],
  ['Confidence', '📊', 'How sure the AI is, from 0 to 100%.', 'Bad apple: 87% sure'],
  ['Threshold', '🚧', 'The number our code needs before it acts.', 'smile &gt; 50 · confidence &gt; 70', true],
  ['Pre-trained', '🎓', 'An AI that experts trained before we got it.', 'Object detection already knows 80 things', true],
  ['Bias', '⚖️', 'An unfair pattern an AI learned from unfair examples.', 'Flagging “My friend is blind” as unkind', true],
];
const vocabCard = ([word, icon, meaning, example, extra]) => `<div style="border:2px dashed #b8c6dc;border-radius:12px;overflow:hidden;break-inside:avoid;height:54mm;display:flex;flex-direction:column;-webkit-print-color-adjust:exact;print-color-adjust:exact">
<div style="background:${extra ? '#dce6f5' : 'var(--yellow)'};padding:3mm 5mm;display:flex;align-items:center;gap:4mm">
<span style="font-size:30px;line-height:1">${icon}</span>
<span style="font-weight:800;color:var(--ink);font-size:30px;line-height:1.1">${word}</span>
${extra ? '<span style="margin-left:auto;font-size:11px;font-weight:700;color:var(--muted)">EXTRA</span>' : ''}</div>
<div style="padding:4mm 5mm;display:flex;flex-direction:column;gap:3mm;flex:1">
<div style="font-size:17px;font-weight:700;color:#1a2233;line-height:1.3">${meaning}</div>
<div style="margin-top:auto;font-size:13px;color:var(--muted)"><b style="color:var(--navy)">Example:</b> ${example}</div>
</div></div>`;
fs.writeFileSync(path.join(OUT, 'vocabulary.html'), printPage('AI Vocabulary Cards',
  'Print one page per pair and cut along the dashed lines. The five yellow cards are the core words used from Game 2 onward and checked in AI 19; the three blue cards are extras for older classes. In the AI 19 warm-up the teacher reads a sentence and pairs hold up the matching card.',
  // One A4 sheet: the page's own padding gives the margin.
  `<style>@page { size: A4; margin: 0; }</style><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4mm">${VOCAB.map(vocabCard).join('\n')}</div>`));
console.log('printables: cards.html, tags.html, qr.html, vocabulary.html');
