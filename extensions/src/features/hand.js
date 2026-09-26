// Turns the 21 hand keypoints of one hand into fingers-up counts and simple
// gestures. Plain geometry on stage coordinates (x right, y up), so it works
// with the hand at any angle and students can see how a gesture is "detected".

export const HAND_POINT_NAMES = [
  'wrist',
  'thumb_cmc', 'thumb_mcp', 'thumb_ip', 'thumb_tip',
  'index_finger_mcp', 'index_finger_pip', 'index_finger_dip', 'index_finger_tip',
  'middle_finger_mcp', 'middle_finger_pip', 'middle_finger_dip', 'middle_finger_tip',
  'ring_finger_mcp', 'ring_finger_pip', 'ring_finger_dip', 'ring_finger_tip',
  'pinky_finger_mcp', 'pinky_finger_pip', 'pinky_finger_dip', 'pinky_finger_tip',
];
const I = Object.fromEntries(HAND_POINT_NAMES.map((n, i) => [n, i]));

/** Menu names for points students can ask for. */
export const HAND_MENU_POINTS = {
  wrist: 'wrist',
  'thumb tip': 'thumb_tip',
  'index fingertip': 'index_finger_tip',
  'middle fingertip': 'middle_finger_tip',
  'ring fingertip': 'ring_finger_tip',
  'pinky tip': 'pinky_finger_tip',
};

export const GESTURES = ['open', 'fist', 'thumbs up', 'thumbs down', 'pointing', 'victory'];

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const cosAngle = (u, v) => (u.x * v.x + u.y * v.y) / ((Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y)) || 1);

// A finger is "up" when it is straight (its segments point the same way) and
// its tip is farther from the wrist than its middle joint.
function fingerUp(kp, name) {
  const mcp = kp[I[`${name}_mcp`]];
  const pip = kp[I[`${name}_pip`]];
  const tip = kp[I[`${name}_tip`]];
  const wrist = kp[I.wrist];
  const straight = cosAngle(sub(pip, mcp), sub(tip, pip)) > 0.6;
  return straight && dist(tip, wrist) > dist(pip, wrist) * 1.1;
}

// The thumb is "up" when it is straight and sticks out away from the palm.
function thumbUp(kp) {
  const mcp = kp[I.thumb_mcp];
  const ip = kp[I.thumb_ip];
  const tip = kp[I.thumb_tip];
  const palmWidth = dist(kp[I.index_finger_mcp], kp[I.pinky_finger_mcp]) || 1;
  const straight = cosAngle(sub(ip, mcp), sub(tip, ip)) > 0.5;
  // (a tucked-in thumb rests near the index knuckle; a raised one is well clear of it)
  return straight && dist(tip, kp[I.index_finger_mcp]) > palmWidth * 0.5;
}

/** @param {{x:number,y:number}[]} kp  21 keypoints in stage coordinates (y up) */
export function handFeatures(kp) {
  const fingers = {
    thumb: thumbUp(kp),
    index: fingerUp(kp, 'index_finger'),
    middle: fingerUp(kp, 'middle_finger'),
    ring: fingerUp(kp, 'ring_finger'),
    pinky: fingerUp(kp, 'pinky_finger'),
  };
  const up = Object.values(fingers).filter(Boolean).length;
  const four = fingers.index && fingers.middle && fingers.ring && fingers.pinky;
  const noneOfFour = !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky;
  const palmSize = dist(kp[I.wrist], kp[I.middle_finger_mcp]) || 1;
  // Thumb pointing clearly up / down relative to its base (stage y is up).
  const thumbRise = (kp[I.thumb_tip].y - kp[I.thumb_mcp].y) / palmSize;

  const gesture = four && fingers.thumb ? 'open'
    : noneOfFour && fingers.thumb && thumbRise > 0.5 ? 'thumbs up'
    : noneOfFour && fingers.thumb && thumbRise < -0.5 ? 'thumbs down'
    : noneOfFour ? 'fist'
    : fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky ? 'pointing'
    : fingers.index && fingers.middle && !fingers.ring && !fingers.pinky ? 'victory'
    : four ? 'open'
    : 'other';

  return { fingersUp: up, fingers, gesture };
}
