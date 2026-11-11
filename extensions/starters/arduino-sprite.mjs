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

/** The sprite as a .sprite3 file (what "Upload sprite" and vm.addSprite take). */
export function arduinoSprite3() {
  const files = {};
  const costumes = BOARD_COSTUMES.map(([name, svg]) => {
    const data = strToU8(svg);
    const assetId = createHash('md5').update(data).digest('hex');
    files[`${assetId}.svg`] = data;
    return { name, assetId, md5ext: `${assetId}.svg`, dataFormat: 'svg', bitmapResolution: 1, rotationCenterX: 100, rotationCenterY: 70 };
  });
  const sprite = {
    isStage: false, name: 'Arduino', variables: {}, lists: {}, broadcasts: {}, blocks: {}, comments: {},
    currentCostume: 0, costumes, sounds: [], volume: 100, visible: true, x: 130, y: 80, size: 70,
    direction: 90, draggable: false, rotationStyle: 'all around',
  };
  files['sprite.json'] = strToU8(JSON.stringify(sprite));
  return zipSync(files);
}
