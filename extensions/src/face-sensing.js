// BlockML Studio – Face Sensing (MIT), compatible with Scratch's Face Sensing
// extension: same extension ID, block opcodes, menus and menu values, so projects
// made on scratch.mit.edu (and in TurboWarp) that use Face Sensing work unchanged —
// offline, in the studio and in exported Android apps. Runs on BlockML Studio's
// shared vision runtime (the same face model as the Face extension).
//
// Behaviour follows Scratch/TurboWarp: face tilt is a Scratch direction (90 = upright,
// > 100 tilted right, < 80 tilted left); face size is the face's width in camera
// pixels; "top of head" is estimated above the point between the eyes.
(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('Face Sensing must be loaded by BlockML Studio');
  }

  const BASE = document.currentScript && document.currentScript.src
    ? new URL('.', document.currentScript.src).href
    : new URL('extensions/', location.href).href;
  const runtime = Scratch.vm.runtime;

  let vision = null;
  let visionPromise = null;
  function loadVision() {
    if (!visionPromise) {
      visionPromise = import(BASE + 'vision-runtime.js')
        .then((m) => (vision = m.getVision(runtime)))
        .catch((err) => {
          console.error('BlockML Studio: could not load the AI runtime', err);
          visionPromise = null;
          throw err;
        });
    }
    return visionPromise;
  }

  /** The face in Scratch's terms, or null when no face is seen. */
  function face() {
    if (!vision) {
      loadVision().catch(() => {});
      return null;
    }
    vision.want('face');
    const f = vision.faces()[0];
    if (!f) return null;
    const p = f.points; // person's own left/right, stage coordinates
    const at = (q) => [q.x, q.y];
    const leftEye = at(p['left eye']);
    const rightEye = at(p['right eye']);
    const betweenEyes = [(leftEye[0] + rightEye[0]) / 2, (leftEye[1] + rightEye[1]) / 2];
    const leftEar = at(p['left ear']);
    const rightEar = at(p['right ear']);
    const size = f.features.size;
    // Scratch direction: 90 is upright; our head tilt is positive towards the person's right.
    const tilt = Math.round(90 + f.features['head tilt']);
    // "Top of head": up from between the eyes (perpendicular to the ear-to-ear line).
    const across = [rightEar[0] - leftEar[0], rightEar[1] - leftEar[1]];
    const len = Math.hypot(across[0], across[1]) || 1;
    const up = [-across[1] / len, across[0] / len];
    const topOfHead = [betweenEyes[0] + up[0] * size * 0.35, betweenEyes[1] + up[1] * size * 0.35];
    return {
      parts: { 0: leftEye, 1: rightEye, 2: at(p['nose tip']), 3: at(p.mouth), 4: leftEar, 5: rightEar, 6: betweenEyes, 7: topOfHead },
      size,
      tilt,
    };
  }

  const part = (f, value) => f.parts[Scratch.Cast.toNumber(value)] || null;

  class FaceSensing {
    getInfo() {
      return {
        id: 'faceSensing',
        name: 'Face Sensing',
        blocks: [
          {
            opcode: 'goToPart',
            blockType: Scratch.BlockType.COMMAND,
            text: 'go to [PART]',
            arguments: { PART: { type: Scratch.ArgumentType.STRING, menu: 'part' } },
          },
          {
            opcode: 'pointInFaceTiltDirection',
            blockType: Scratch.BlockType.COMMAND,
            text: 'point in direction of face tilt',
          },
          {
            opcode: 'setSizeToFaceSize',
            blockType: Scratch.BlockType.COMMAND,
            text: 'set size to face size',
          },
          '---',
          {
            opcode: 'whenTilted',
            blockType: Scratch.BlockType.HAT,
            isEdgeActivated: true,
            text: 'when face tilts [DIRECTION]',
            arguments: { DIRECTION: { type: Scratch.ArgumentType.STRING, menu: 'direction' } },
          },
          {
            opcode: 'whenSpriteTouchesPart',
            blockType: Scratch.BlockType.HAT,
            isEdgeActivated: true,
            text: 'when this sprite touches a [PART]',
            arguments: { PART: { type: Scratch.ArgumentType.STRING, menu: 'part' } },
          },
          {
            opcode: 'whenFaceDetected',
            blockType: Scratch.BlockType.HAT,
            isEdgeActivated: true,
            text: 'when a face is detected',
          },
          '---',
          {
            opcode: 'faceIsDetected',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'a face is detected?',
            disableMonitor: true,
          },
          {
            opcode: 'faceTilt',
            blockType: Scratch.BlockType.REPORTER,
            text: 'face tilt',
          },
          {
            opcode: 'faceSize',
            blockType: Scratch.BlockType.REPORTER,
            text: 'face size',
          },
        ],
        menus: {
          // Values as in Scratch, so existing projects keep working.
          part: {
            acceptReporters: false,
            items: [
              { text: 'nose', value: '2' },
              { text: 'mouth', value: '3' },
              { text: 'left eye', value: '0' },
              { text: 'right eye', value: '1' },
              { text: 'between eyes', value: '6' },
              { text: 'left ear', value: '4' },
              { text: 'right ear', value: '5' },
              { text: 'top of head', value: '7' },
            ],
          },
          direction: {
            acceptReporters: false,
            items: [{ text: 'left', value: 'left' }, { text: 'right', value: 'right' }],
          },
        },
      };
    }

    goToPart({ PART }, util) {
      const f = face();
      const p = f && part(f, PART);
      if (p) util.target.setXY(p[0], p[1]);
    }

    pointInFaceTiltDirection(args, util) {
      const f = face();
      if (f) util.target.setDirection(f.tilt);
    }

    setSizeToFaceSize(args, util) {
      const f = face();
      if (f) util.target.setSize(f.size);
    }

    whenTilted({ DIRECTION }) {
      const f = face();
      if (!f) return false;
      if (DIRECTION === 'left') return f.tilt < 80;
      if (DIRECTION === 'right') return f.tilt > 100;
      return false;
    }

    whenSpriteTouchesPart({ PART }, util) {
      const f = face();
      const p = f && part(f, PART);
      if (!p) return false;
      const drawable = runtime.renderer && runtime.renderer._allDrawables[util.target.drawableID];
      if (!drawable) return false;
      drawable.updateCPURenderAttributes();
      return drawable.isTouching(p);
    }

    whenFaceDetected() {
      return !!face();
    }

    faceIsDetected() {
      return !!face();
    }

    faceTilt() {
      const f = face();
      return f ? f.tilt : 0;
    }

    faceSize() {
      const f = face();
      return f ? f.size : 0;
    }
  }

  Scratch.extensions.register(new FaceSensing());
})(Scratch);
