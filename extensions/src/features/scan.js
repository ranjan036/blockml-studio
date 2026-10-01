// Codes & Cards: where a QR code or a printed tag is on the stage, and the names of
// BlockML Studio's recognition cards. Plain geometry, unit-tested.

// The recognition cards (printable at /lessons/printables/cards.html). Card n is
// AprilTag 36h11 number n, so a card is also a tag: "stop" is tag 1.
export const CARDS = [
  'go', 'stop', 'left', 'right', 'forward', 'back', 'turn around', 'jump',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'apple', 'banana', 'cat', 'dog', 'fish', 'bird', 'car', 'house', 'tree', 'sun', 'star', 'heart',
];
export const cardName = (tagId) => (tagId >= 0 && tagId < CARDS.length ? CARDS[tagId] : '');

/**
 * Where a code is on the stage, from its four corners in the camera image, in the
 * code's own order: top-left, top-right, bottom-right, bottom-left.
 * The image is the camera as the camera sees it (never mirrored, or codes can't be
 * read); `mirrored` says whether the stage shows it mirrored, like a mirror.
 * @returns {{x: number, y: number, size: number, direction: number}} stage x/y of the
 *   centre, size (average side length, in stage steps), and the Scratch direction the
 *   code's top points to (0 = up, 90 = right).
 */
export function placeOf(corners, { width, height, mirrored, stageWidth = 480 }) {
  const scale = stageWidth / width;
  const toStage = (p) => ({
    x: (mirrored ? width / 2 - p.x : p.x - width / 2) * scale,
    y: (height / 2 - p.y) * scale,
  });
  const [tl, tr, br, bl] = corners.map(toStage);
  const x = (tl.x + tr.x + br.x + bl.x) / 4;
  const y = (tl.y + tr.y + br.y + bl.y) / 4;
  const side = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const size = (side(tl, tr) + side(tr, br) + side(br, bl) + side(bl, tl)) / 4;
  // "Up" on the code: from the middle of its bottom edge to the middle of its top edge.
  const up = { x: (tl.x + tr.x - bl.x - br.x) / 2, y: (tl.y + tr.y - bl.y - br.y) / 2 };
  let direction = Math.round((Math.atan2(up.x, up.y) * 180) / Math.PI);
  if (direction <= -180) direction += 360; // Scratch directions run from -179 to 180
  return { x: Math.round(x), y: Math.round(y), size: Math.round(size), direction };
}
