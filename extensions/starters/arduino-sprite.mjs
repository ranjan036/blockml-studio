// The "Arduino" sprite: an Uno board with two costumes, "uno" and "uno L on" (the
// on-board LED on pin 13, which the Arduino blocks light up). Used by the robotics lesson
// projects, and written as gui/static/sprites/arduino-uno.sprite3 (+ .svg thumbnail) for the
// editor's sprite library and for adding the sprite with the Arduino extension.
import { createHash } from 'node:crypto';
import { zipSync, strToU8 } from 'fflate';

export const boardSvg = (lOn = false) => '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="140" viewBox="0 0 200 140">' +
  '<rect x="4" y="4" width="192" height="132" rx="12" fill="#0e7490" stroke="#164e63" stroke-width="4"/>' +
  '<rect x="-2" y="40" width="34" height="30" rx="4" fill="#cbd5e1" stroke="#64748b" stroke-width="3"/>' +
  '<g fill="#fde68a">' + Array.from({ length: 14 }, (_, i) => `<rect x="${44 + i * 10.5}" y="10" width="7" height="9" rx="1.5"/>`).join('') +
  Array.from({ length: 6 }, (_, i) => `<rect x="${110 + i * 12}" y="121" width="8" height="9" rx="1.5"/>`).join('') + '</g>' +
  '<rect x="78" y="56" width="62" height="38" rx="4" fill="#0f172a"/>' +
  '<text x="109" y="80" font-family="Arial" font-size="13" font-weight="bold" fill="#e0f2fe" text-anchor="middle">UNO</text>' +
  (lOn ? '<circle cx="168" cy="40" r="11" fill="#fbbf24" opacity="0.45"/><circle cx="168" cy="40" r="6" fill="#fde047"/>' : '<circle cx="168" cy="40" r="5" fill="#78716c"/>') +
  '<text x="168" y="60" font-family="Arial" font-size="9" fill="#cffafe" text-anchor="middle">L</text></svg>';

export const BOARD_COSTUMES = [['uno', boardSvg(false)], ['uno L on', boardSvg(true)]];

/** A sprite as a .sprite3 file (what "Upload sprite" and vm.addSprite take). */
export function sprite3(name, costumeList, center, { x = 0, y = 0, size = 100, direction = 90, draggable = false, scripts = {} } = {}) {
  const files = {};
  const costumes = costumeList.map(([cname, svg]) => {
    const data = strToU8(svg);
    const assetId = createHash('md5').update(data).digest('hex');
    files[`${assetId}.svg`] = data;
    return { name: cname, assetId, md5ext: `${assetId}.svg`, dataFormat: 'svg', bitmapResolution: 1, rotationCenterX: center[0], rotationCenterY: center[1] };
  });
  const sprite = {
    isStage: false, name, variables: {}, lists: {}, broadcasts: {}, blocks: scripts, comments: {},
    currentCostume: 0, costumes, sounds: [], volume: 100, visible: true, x, y, size,
    direction, draggable, rotationStyle: 'all around',
  };
  files['sprite.json'] = strToU8(JSON.stringify(sprite));
  return zipSync(files);
}

export const arduinoSprite3 = () => sprite3('Arduino', BOARD_COSTUMES, [100, 70], { x: 130, y: 80, size: 70 });

// The virtual car, seen from above, facing right (direction 90): two wheels, a caster, and the
// HC-SR04's two "eyes" on its nose. Motor A drives the left wheel, motor B the right one.
export const CAR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48" viewBox="0 0 64 48">' +
  '<rect x="12" y="1" width="20" height="9" rx="3" fill="#1f2937"/><rect x="12" y="38" width="20" height="9" rx="3" fill="#1f2937"/>' +
  '<rect x="4" y="9" width="50" height="30" rx="8" fill="#0e7490" stroke="#164e63" stroke-width="3"/>' +
  '<text x="15" y="17" font-family="Arial" font-size="7" fill="#cffafe">L A</text><text x="15" y="36" font-family="Arial" font-size="7" fill="#cffafe">R B</text>' +
  '<rect x="18" y="18" width="16" height="12" rx="2" fill="#0f172a"/>' +
  '<rect x="52" y="14" width="10" height="20" rx="2" fill="#1e3a8a"/><circle cx="58" cy="19" r="3.5" fill="#cbd5e1"/><circle cx="58" cy="29" r="3.5" fill="#cbd5e1"/></svg>';
export const WALL_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="200" viewBox="0 0 24 200">' +
  '<rect width="24" height="200" fill="#b45309"/>' + Array.from({ length: 10 }, (_, i) => `<path d="M0 ${i * 20} H24 M${i % 2 ? 12 : 0} ${i * 20} V${i * 20 + 20}" stroke="#fde68a" stroke-width="1.5"/>`).join('') + '</svg>';

// The car's own script: back to the start (left, facing the wall) when the green flag is clicked.
const CAR_RESET = {
  carflag: { opcode: 'event_whenflagclicked', next: 'cargo', parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true, x: 20, y: 20 },
  cargo: { opcode: 'motion_gotoxy', next: 'carpoint', parent: 'carflag', inputs: { X: [1, [4, '-170']], Y: [1, [4, '0']] }, fields: {}, shadow: false, topLevel: false },
  carpoint: { opcode: 'motion_pointindirection', next: null, parent: 'cargo', inputs: { DIRECTION: [1, [8, '90']] }, fields: {}, shadow: false, topLevel: false },
};
export const CAR_COSTUMES = [['car', CAR_SVG]];
export const WALL_COSTUMES = [['wall', WALL_SVG]];
export const carSprite3 = () => sprite3('Car', CAR_COSTUMES, [32, 24], { x: -170, y: 0, size: 50, draggable: true, scripts: CAR_RESET });
export const wallSprite3 = () => sprite3('Wall', WALL_COSTUMES, [12, 100], { x: 200, y: 0, draggable: true });

// Mars Rover tracks: a black tape line on a light floor, drawn as stage backdrops, which the
// virtual car's IR line sensors read. "practice" is an oval; "mission" is the unseen Mission
// Day terrain with bends (teachers can draw their own backdrop the same way).
function missionPath() {
  const pts = [];
  for (let i = 0; i < 180; i++) {
    const t = (i / 180) * 2 * Math.PI;
    const r = 1 + 0.18 * Math.sin(3 * t);
    pts.push(`${(240 + 175 * r * Math.cos(t)).toFixed(1)} ${(175 + 120 * r * Math.sin(t)).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}
const floor = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#f8f5ec"/>${body}</svg>`;
export const TRACKS = {
  practice: floor('<rect x="50" y="50" width="380" height="260" rx="90" fill="none" stroke="#111" stroke-width="10"/>'),
  // A smooth three-lobed loop (r = 1 + 0.18·sin 3θ): bends in both directions, no straight to rely on.
  mission: floor(`<path d="${missionPath()}" fill="none" stroke="#111" stroke-width="10" stroke-linejoin="round"/>`),
};
// Where the car starts on each track (on the bottom straight, facing right).
export const TRACK_START = { practice: { x: -60, y: -130 }, mission: { x: 0, y: -93 } };
// A crater/rock for the rover to avoid (its name starts with "Obstacle", so the sensor sees it).
export const OBSTACLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="20" fill="#78716c" stroke="#44403c" stroke-width="3"/><circle cx="15" cy="16" r="4" fill="#a8a29e"/><circle cx="28" cy="27" r="6" fill="#57534e"/></svg>';
