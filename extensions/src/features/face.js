// Turns the 468 face-mesh keypoints of one face into the numbers the Face
// blocks report. Everything here is simple geometry on stage coordinates
// (x right, y up), so students can see how an "AI feature" is made from numbers.
//
// Keypoint indices are MediaPipe Face Mesh's, named as in a normal photo (the
// person's left eye is on the right of the image). The camera is mirrored by
// default, so there the model's "left" is the person's right: the functions below
// swap them, and every "left"/"right" a block reports is the person's own.

export const FACE_POINTS = {
  noseTip: 1,
  forehead: 10,
  chin: 152,
  upperLip: 13,
  lowerLip: 14,
  mouthRight: 61, // person's right corner
  mouthLeft: 291,
  faceRight: 234, // right edge of the face (near the right ear)
  faceLeft: 454,
  rightEyeOuter: 33,
  rightEyeInner: 133,
  rightEyeTop: 159,
  rightEyeBottom: 145,
  leftEyeOuter: 263,
  leftEyeInner: 362,
  leftEyeTop: 386,
  leftEyeBottom: 374,
};

// Tuning constants: raw ratio → 0..100. Adjust after classroom testing.
const SMILE_NEUTRAL = 0.36; // mouth width / face width with a relaxed mouth
const SMILE_FULL = 0.48; // …with a big smile
const MOUTH_OPEN_FULL = 0.12; // lip gap / face height when wide open
const EYE_CLOSED = 0.1; // eye height / eye width when closed
const EYE_OPEN = 0.3; // …when wide open

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const clamp100 = (v) => Math.max(0, Math.min(100, Math.round(v)));
const scale = (value, low, high) => clamp100(((value - low) / (high - low)) * 100);

/** Named points blocks can ask for, each an {x, y} in stage coordinates. */
export function facePoints(kp, mirrored = true) {
  const P = FACE_POINTS;
  const modelLeftEye = mid(kp[P.leftEyeOuter], kp[P.leftEyeInner]);
  const modelRightEye = mid(kp[P.rightEyeOuter], kp[P.rightEyeInner]);
  return {
    'nose tip': kp[P.noseTip],
    'left eye': mirrored ? modelRightEye : modelLeftEye,
    'right eye': mirrored ? modelLeftEye : modelRightEye,
    mouth: mid(kp[P.upperLip], kp[P.lowerLip]),
    'left ear': mirrored ? kp[P.faceRight] : kp[P.faceLeft],
    'right ear': mirrored ? kp[P.faceLeft] : kp[P.faceRight],
    forehead: kp[P.forehead],
    chin: kp[P.chin],
  };
}

/**
 * @param {{x:number,y:number}[]} kp  468 keypoints in stage coordinates (y up)
 * @param {boolean} mirrored  camera image is mirrored (the default)
 */
export function faceFeatures(kp, mirrored = true) {
  const P = FACE_POINTS;
  const faceWidth = dist(kp[P.faceLeft], kp[P.faceRight]) || 1;
  const faceHeight = dist(kp[P.forehead], kp[P.chin]) || 1;
  const center = mid(kp[P.faceLeft], kp[P.faceRight]);

  const smile = scale(dist(kp[P.mouthLeft], kp[P.mouthRight]) / faceWidth, SMILE_NEUTRAL, SMILE_FULL);
  const mouthOpen = scale(dist(kp[P.upperLip], kp[P.lowerLip]) / faceHeight, 0, MOUTH_OPEN_FULL);
  const eyeOpen = (top, bottom, a, b) => scale(dist(kp[top], kp[bottom]) / (dist(kp[a], kp[b]) || 1), EYE_CLOSED, EYE_OPEN);
  const modelLeftEyeOpen = eyeOpen(P.leftEyeTop, P.leftEyeBottom, P.leftEyeOuter, P.leftEyeInner);
  const modelRightEyeOpen = eyeOpen(P.rightEyeTop, P.rightEyeBottom, P.rightEyeOuter, P.rightEyeInner);
  const leftEyeOpen = mirrored ? modelRightEyeOpen : modelLeftEyeOpen;
  const rightEyeOpen = mirrored ? modelLeftEyeOpen : modelRightEyeOpen;

  // Head tilt: angle of the line between the outer eye corners, measured from the
  // left side of the screen to the right. Positive = the head tilts towards the
  // person's right shoulder (in the mirrored view).
  const [a, b] = [kp[P.rightEyeOuter], kp[P.leftEyeOuter]].sort((p, q) => p.x - q.x);
  let tilt = -(Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  if (!mirrored) tilt = -tilt;

  return {
    x: Math.round(center.x),
    y: Math.round(center.y),
    size: Math.round(faceWidth),
    smile,
    'mouth open': mouthOpen,
    'head tilt': Math.round(tilt) || 0, // (avoid -0)
    'left eye open': leftEyeOpen,
    'right eye open': rightEyeOpen,
  };
}

export function faceIs(features, state) {
  switch (state) {
    case 'smiling': return features.smile >= 50;
    case 'mouth open': return features['mouth open'] >= 40;
    case 'eyes closed': return features['left eye open'] < 30 && features['right eye open'] < 30;
    case 'tilted left': return features['head tilt'] <= -15;
    case 'tilted right': return features['head tilt'] >= 15;
    default: return false;
  }
}
