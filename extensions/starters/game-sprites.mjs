// Game sprites and backdrops for the editor's libraries ("Choose a Sprite", "Choose a
// Backdrop"), drawn with the same art as the lesson games so students can rebuild a game from
// scratch. Written into gui/static/sprites/ and gui/static/backdrops/ by build-lessons.mjs.
import { sprite3 } from './arduino-sprite.mjs';

// ---- Game 4: Dino Jump --------------------------------------------------------------
export const DESERT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
<rect width="480" height="360" fill="#fef3c7"/><circle cx="400" cy="70" r="34" fill="#fb923c"/>
<path d="M0 230 Q80 190 160 225 T320 215 T480 225 V360 H0 Z" fill="#fde68a"/>
<rect y="302" width="480" height="58" fill="#d6a45a"/><rect y="300" width="480" height="5" fill="#92400e"/>
<g fill="#b45309" opacity=".5"><circle cx="60" cy="330" r="3"/><circle cx="210" cy="340" r="2"/><circle cx="330" cy="325" r="3"/><circle cx="440" cy="345" r="2"/></g></svg>`;

const DINO_BODY = '<path d="M14 44 C8 44 4 38 2 30 C10 36 14 34 18 32 L20 20 C20 10 28 4 40 4 H56 C64 4 68 10 68 16 V24 C68 28 64 30 60 30 H46 V36 L54 38 V42 H46 V48 C46 58 40 62 34 62 H16 V60 C14 56 14 50 14 44 Z" fill="#16a34a" stroke="#14532d" stroke-width="3" stroke-linejoin="round"/>';
const DINO_EYE = (dead) => dead
  ? '<path d="M45 10 L51 16 M51 10 L45 16" stroke="#111827" stroke-width="2.5" stroke-linecap="round"/>'
  : '<circle cx="48" cy="13" r="4" fill="#ffffff"/><circle cx="49" cy="13" r="2" fill="#111827"/>';

/** The dino, legs at x = front and back (a running pose); dead = crossed-out eye. */
export const dinoSvg = (front, back, { dead = false } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" width="70" height="70" viewBox="0 0 70 70">
${DINO_BODY}
<path d="M${front} 61 V68 M${back} 61 V68" stroke="#14532d" stroke-width="6" stroke-linecap="round"/>
${DINO_EYE(dead)}</svg>`;

// Mid-air: both legs tucked back.
const DINO_JUMP = `<svg xmlns="http://www.w3.org/2000/svg" width="70" height="70" viewBox="0 0 70 70">
${DINO_BODY}
<path d="M24 61 L19 66 M34 61 L29 66" stroke="#14532d" stroke-width="6" stroke-linecap="round"/>
${DINO_EYE(false)}</svg>`;

export const CACTUS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="60" viewBox="0 0 36 60">
<path d="M14 58 V10 C14 2 22 2 22 10 V58 Z M14 34 H8 C4 34 2 30 2 26 V18 C2 14 8 14 8 18 V26 H14 M22 28 H28 V16 C28 12 34 12 34 16 V26 C34 32 30 34 26 34 H22" fill="#15803d" stroke="#14532d" stroke-width="2.5" stroke-linejoin="round"/></svg>`;

// A short, wide cactus; same 36x60 canvas and bottom edge, so swapping costumes keeps it on the ground.
const CACTUS_SMALL = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="60" viewBox="0 0 36 60">
<path d="M14 58 V30 C14 23 22 23 22 30 V58 Z M14 46 H9 C5 46 3 43 3 40 V36 C3 32 9 32 9 36 V40 H14 M22 42 H27 V36 C27 32 33 32 33 36 V40 C33 44 30 47 27 47 H22" fill="#15803d" stroke="#14532d" stroke-width="2.5" stroke-linejoin="round"/></svg>`;

export const DINO_COSTUMES = [['run 1', dinoSvg(25, 33)], ['run 2', dinoSvg(20, 38)], ['jump', DINO_JUMP], ['ouch', dinoSvg(25, 33, { dead: true })]];
export const CACTUS_COSTUMES = [['cactus', CACTUS_SVG], ['small cactus', CACTUS_SMALL]];

// Same places as in the Dino Jump game (the ground is at y = -95).
export const dinoSprite3 = () => sprite3('Dino', DINO_COSTUMES, [35, 35], { x: -160, y: -95, rotationStyle: "don't rotate" });
export const cactusSprite3 = () => sprite3('Cactus', CACTUS_COSTUMES, [18, 30], { x: 160, y: -95 });

// ---- Save the Minion: one sprite, two costumes ---------------------------------------
// Our own little yellow character (not the film's design). Both costumes share a 100x140
// canvas with the body in the same place, so switching costume doesn't make it jump.
const MINION_BODY = (face) => `<g stroke="#854d0e" stroke-width="2.5" stroke-linejoin="round">
<path d="M41 127 V136 M59 127 V136" stroke-width="5" stroke-linecap="round"/>
<rect x="33" y="80" width="34" height="50" rx="17" fill="#facc15"/>
<path d="M33.5 110 H66.5 V113 C66.5 122 59 130 50 130 C41 130 33.5 122 33.5 113 Z" fill="#22c55e" stroke="#166534"/>
<rect x="45" y="114" width="10" height="6" rx="1.5" fill="#bbf7d0" stroke="#166534" stroke-width="1.5"/>
<path d="M33.5 94 C33.5 78 66.5 78 66.5 94 Z" fill="#f97316" stroke="#9a3412"/>
<path d="M60 93 H72 C72 96 66 97 60 97 Z" fill="#f97316" stroke="#9a3412" stroke-width="2"/></g>
<circle cx="44" cy="101" r="4.5" fill="#fff" stroke="#854d0e" stroke-width="1.5"/><circle cx="56" cy="101" r="4.5" fill="#fff" stroke="#854d0e" stroke-width="1.5"/>
${face}`;

const MINION_FALLING = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140">
<g stroke="#94a3b8" stroke-width="3" stroke-linecap="round" opacity=".8"><path d="M30 46 V66 M50 38 V68 M70 46 V66 M40 56 V72 M60 56 V72"/></g>
<path d="M35 102 L20 82 M65 102 L80 82" stroke="#854d0e" stroke-width="5" stroke-linecap="round"/>
<path d="M35 102 L20 82 M65 102 L80 82" stroke="#facc15" stroke-width="2.5" stroke-linecap="round"/>
${MINION_BODY('<circle cx="44" cy="100" r="2" fill="#111827"/><circle cx="56" cy="100" r="2" fill="#111827"/><ellipse cx="50" cy="109.5" rx="3" ry="3.5" fill="#7f1d1d"/>')}</svg>`;

const MINION_PARACHUTE = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140">
<g stroke="#475569" stroke-width="1.5"><path d="M8 44 L36 88 M36 44 L37 88 M64 44 L63 88 M92 44 L64 88"/></g>
<path d="M4 44 C4 8 96 8 96 44 C90 38 82 38 78 44 C72 38 64 38 60 44 C54 38 46 38 40 44 C34 38 26 38 22 44 C16 38 8 38 4 44 Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M40 44 C38 26 44 14 50 12 C56 14 62 26 60 44 C54 38 46 38 40 44 Z" fill="#f8fafc" stroke="#7f1d1d" stroke-width="2" stroke-linejoin="round"/>
<path d="M35 100 L36 88 M65 100 L64 88" stroke="#854d0e" stroke-width="5" stroke-linecap="round"/>
<path d="M35 100 L36 88 M65 100 L64 88" stroke="#facc15" stroke-width="2.5" stroke-linecap="round"/>
${MINION_BODY('<circle cx="45" cy="102" r="2" fill="#111827"/><circle cx="57" cy="102" r="2" fill="#111827"/><path d="M45 108 Q50 113 55 108" fill="none" stroke="#7f1d1d" stroke-width="2" stroke-linecap="round"/>')}</svg>`;

export const MINION_COSTUMES = [['falling', MINION_FALLING], ['parachute', MINION_PARACHUTE]];
// Rotation centre = the middle of the body; starts high up with the whole parachute on stage.
export const minionSprite3 = () => sprite3('Minion', MINION_COSTUMES, [50, 105], { x: 0, y: 80, size: 80, rotationStyle: "don't rotate" });

/** Library files: [file name, contents]; sprites go to static/sprites/, backdrops to static/backdrops/. */
export const LIBRARY_SPRITES = [
  ['dino.sprite3', dinoSprite3()], ['dino.svg', dinoSvg(25, 33)],
  ['cactus.sprite3', cactusSprite3()], ['cactus.svg', CACTUS_SVG],
  ['minion.sprite3', minionSprite3()], ['minion.svg', MINION_PARACHUTE],
  ['minion-falling.svg', MINION_FALLING],
];
export const LIBRARY_BACKDROPS = [['dino-desert.svg', DESERT_SVG]];
