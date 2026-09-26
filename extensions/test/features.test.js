import { describe, it, expect } from 'vitest';
import { handFeatures, HAND_POINT_NAMES } from '../src/features/hand.js';
import { faceFeatures, faceIs, facePoints, FACE_POINTS } from '../src/features/face.js';

// Builds a hand pointing "up" (fingers towards +y) from a wrist at (0, 0).
// `pose` says which fingers are straight; a bent finger curls back to the palm.
function makeHand(pose, { rotate = 0 } = {}) {
  const kp = HAND_POINT_NAMES.map(() => ({ x: 0, y: 0 }));
  const set = (name, x, y) => { kp[HAND_POINT_NAMES.indexOf(name)] = { x, y }; };
  set('wrist', 0, 0);
  const fingers = { index: -30, middle: -10, ring: 10, pinky: 30 };
  for (const [f, x] of Object.entries(fingers)) {
    const n = f === 'pinky' ? 'pinky_finger' : `${f}_finger`;
    set(`${n}_mcp`, x, 60);
    if (pose[f]) {
      set(`${n}_pip`, x, 90); set(`${n}_dip`, x, 110); set(`${n}_tip`, x, 130);
    } else {
      set(`${n}_pip`, x, 80); set(`${n}_dip`, x, 65); set(`${n}_tip`, x, 55); // curled down
    }
  }
  set('thumb_cmc', -25, 15);
  if (pose.thumb === 'side') {
    set('thumb_mcp', -45, 30); set('thumb_ip', -65, 40); set('thumb_tip', -85, 50);
  } else if (pose.thumb === 'up') {
    set('thumb_mcp', -35, 40); set('thumb_ip', -38, 70); set('thumb_tip', -40, 100);
  } else if (pose.thumb === 'down') {
    set('thumb_mcp', -35, 10); set('thumb_ip', -38, -20); set('thumb_tip', -40, -50);
  } else {
    set('thumb_mcp', -35, 35); set('thumb_ip', -25, 50); set('thumb_tip', -15, 58); // tucked in
  }
  if (!rotate) return kp;
  const c = Math.cos(rotate), s = Math.sin(rotate);
  return kp.map(({ x, y }) => ({ x: x * c - y * s, y: x * s + y * c }));
}

describe('handFeatures', () => {
  it('open hand: 5 fingers up', () => {
    const f = handFeatures(makeHand({ index: 1, middle: 1, ring: 1, pinky: 1, thumb: 'side' }));
    expect(f.fingersUp).toBe(5);
    expect(f.gesture).toBe('open');
  });

  it('fist: 0 fingers up', () => {
    const f = handFeatures(makeHand({}));
    expect(f.fingersUp).toBe(0);
    expect(f.gesture).toBe('fist');
  });

  it('pointing and victory', () => {
    expect(handFeatures(makeHand({ index: 1 })).gesture).toBe('pointing');
    const v = handFeatures(makeHand({ index: 1, middle: 1 }));
    expect(v.gesture).toBe('victory');
    expect(v.fingersUp).toBe(2);
  });

  it('thumbs up and thumbs down', () => {
    // A thumbs-up hand is a fist turned sideways with the thumb up; model it as
    // a fist whose thumb points to +y.
    expect(handFeatures(makeHand({ thumb: 'up' })).gesture).toBe('thumbs up');
    expect(handFeatures(makeHand({ thumb: 'down' })).gesture).toBe('thumbs down');
  });

  it('works when the hand is tilted', () => {
    const f = handFeatures(makeHand({ index: 1, middle: 1, ring: 1, pinky: 1, thumb: 'side' }, { rotate: 0.6 }));
    expect(f.fingersUp).toBe(5);
    expect(handFeatures(makeHand({ index: 1 }, { rotate: -0.6 })).gesture).toBe('pointing');
  });
});

// A simple front-facing face: eyes level, closed relaxed mouth.
function makeFace({ mouthWidth = 36, lipGap = 0, eyeHeight = 6, tiltDeg = 0 } = {}) {
  const kp = Array.from({ length: 468 }, () => ({ x: 0, y: 0 }));
  const P = FACE_POINTS;
  const put = (i, x, y) => { kp[i] = { x, y }; };
  put(P.faceRight, -50, 0); put(P.faceLeft, 50, 0);
  put(P.forehead, 0, 70); put(P.chin, 0, -60); put(P.noseTip, 0, 10);
  put(P.mouthRight, -mouthWidth / 2, -30); put(P.mouthLeft, mouthWidth / 2, -30);
  put(P.upperLip, 0, -30 + lipGap / 2); put(P.lowerLip, 0, -30 - lipGap / 2);
  // Like the model: its "right eye" (index 33) is on the image's left, as in a normal photo.
  put(P.rightEyeOuter, -35, 25); put(P.rightEyeInner, -15, 25);
  put(P.rightEyeTop, -25, 25 + eyeHeight / 2); put(P.rightEyeBottom, -25, 25 - eyeHeight / 2);
  put(P.leftEyeInner, 15, 25); put(P.leftEyeOuter, 35, 25);
  put(P.leftEyeTop, 25, 25 + eyeHeight / 2); put(P.leftEyeBottom, 25, 25 - eyeHeight / 2);
  if (!tiltDeg) return kp;
  const t = (-tiltDeg * Math.PI) / 180; // positive tilt = towards the person's right (screen-right goes down)
  const c = Math.cos(t), s = Math.sin(t);
  return kp.map(({ x, y }) => ({ x: x * c - y * s, y: x * s + y * c }));
}

describe('faceFeatures', () => {
  it('relaxed face: no smile, mouth closed, eyes open, level', () => {
    const f = faceFeatures(makeFace());
    expect(f.smile).toBe(0);
    expect(f['mouth open']).toBe(0);
    expect(f['left eye open']).toBeGreaterThan(50);
    expect(f['head tilt']).toBe(0);
    expect(f.size).toBe(100);
    expect(faceIs(f, 'smiling')).toBe(false);
  });

  it('big smile, open mouth, closed eyes', () => {
    const f = faceFeatures(makeFace({ mouthWidth: 50, lipGap: 12, eyeHeight: 1 }));
    expect(f.smile).toBeGreaterThanOrEqual(90);
    expect(faceIs(f, 'smiling')).toBe(true);
    expect(f['mouth open']).toBeGreaterThanOrEqual(70);
    expect(faceIs(f, 'eyes closed')).toBe(true);
  });

  it("left/right are the person's own: swapped in the mirrored view", () => {
    // Model's right eye is at x=-25 (image left). Mirrored, that is the person's left eye.
    expect(facePoints(makeFace(), true)['left eye'].x).toBe(-25);
    expect(facePoints(makeFace(), false)['left eye'].x).toBe(25);
    expect(facePoints(makeFace(), true)['left ear'].x).toBe(-50);
    const oneEyeShut = makeFace();
    oneEyeShut[FACE_POINTS.rightEyeTop] = { x: -25, y: 25.5 }; oneEyeShut[FACE_POINTS.rightEyeBottom] = { x: -25, y: 24.5 };
    const f = faceFeatures(oneEyeShut, true);
    expect(f['left eye open']).toBe(0); // the model's right eye = the person's left, when mirrored
    expect(f['right eye open']).toBeGreaterThan(50);
  });

  it('head tilt sign follows the person (mirrored view)', () => {
    expect(faceFeatures(makeFace({ tiltDeg: 20 }))['head tilt']).toBe(20);
    expect(faceIs(faceFeatures(makeFace({ tiltDeg: -20 })), 'tilted left')).toBe(true);
  });
});
