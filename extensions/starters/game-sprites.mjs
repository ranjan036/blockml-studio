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

/** Library files: [file name, contents]; sprites go to static/sprites/, backdrops to static/backdrops/. */
export const LIBRARY_SPRITES = [
  ['dino.sprite3', dinoSprite3()], ['dino.svg', dinoSvg(25, 33)],
  ['cactus.sprite3', cactusSprite3()], ['cactus.svg', CACTUS_SVG],
];
export const LIBRARY_BACKDROPS = [['dino-desert.svg', DESERT_SVG]];
