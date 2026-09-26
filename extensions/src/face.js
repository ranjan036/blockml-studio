// BlockML Studio – Face extension (MIT).
// The AI finds faces in the camera image; students write the decisions with
// Scratch's own if/else, comparisons, loops and variables.
// Runs unsandboxed (trusted by BlockML Studio) and uses the shared vision
// runtime in the same folder.
(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('The Face extension must be loaded by BlockML Studio');
  }

  const BASE = document.currentScript && document.currentScript.src
    ? new URL('.', document.currentScript.src).href
    : new URL('extensions/', location.href).href;
  const runtime = Scratch.vm.runtime;

  let vision = null;
  let lib = null; // the runtime module (for shared helpers like faceIs)
  let visionPromise = null;
  function loadVision() {
    if (!visionPromise) {
      visionPromise = import(BASE + 'vision-runtime.js')
        .then((m) => {
          lib = m;
          return (vision = m.getVision(runtime));
        })
        .catch((err) => {
          console.error('BlockML Studio: could not load the AI runtime', err);
          visionPromise = null;
          throw err;
        });
    }
    return visionPromise;
  }
  // Blocks never wait: until the AI is ready, they report "no faces".
  function faces() {
    if (!vision) {
      loadVision().catch(() => {});
      return [];
    }
    vision.want('face');
    return vision.faces();
  }
  const nth = (index) => faces()[Math.round(Scratch.Cast.toNumber(index)) - 1];

  const ICON = 'data:image/svg+xml;base64,' + btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#fde68a" stroke="#be185d" stroke-width="2"/>' +
    '<circle cx="14" cy="16" r="2.5" fill="#1f2937"/><circle cx="26" cy="16" r="2.5" fill="#1f2937"/>' +
    '<path d="M12 25 Q20 32 28 25" fill="none" stroke="#1f2937" stroke-width="2.5" stroke-linecap="round"/></svg>');

  class Face {
    getInfo() {
      return {
        id: 'blockmlFace',
        name: 'Face',
        color1: '#ec4899',
        color2: '#db2777',
        color3: '#be185d',
        menuIconURI: ICON,
        blocks: [
          {
            opcode: 'whenFaceAppears',
            blockType: Scratch.BlockType.HAT,
            isEdgeActivated: true,
            text: 'when a face appears',
          },
          '---',
          {
            opcode: 'numberOfFaces',
            blockType: Scratch.BlockType.REPORTER,
            text: 'number of faces',
          },
          {
            opcode: 'faceValue',
            blockType: Scratch.BlockType.REPORTER,
            text: '[PROPERTY] of face [INDEX]',
            arguments: {
              PROPERTY: { type: Scratch.ArgumentType.STRING, menu: 'property', defaultValue: 'smile' },
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: 'faceIs',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'face [INDEX] is [STATE]?',
            arguments: {
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              STATE: { type: Scratch.ArgumentType.STRING, menu: 'state', defaultValue: 'smiling' },
            },
          },
          {
            opcode: 'pointValue',
            blockType: Scratch.BlockType.REPORTER,
            text: '[AXIS] of [POINT] of face [INDEX]',
            arguments: {
              AXIS: { type: Scratch.ArgumentType.STRING, menu: 'axis', defaultValue: 'x' },
              POINT: { type: Scratch.ArgumentType.STRING, menu: 'point', defaultValue: 'nose tip' },
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: 'isReady',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'face AI is ready?',
          },
          '---',
          {
            opcode: 'setCamera',
            blockType: Scratch.BlockType.COMMAND,
            text: 'turn camera [STATE]',
            arguments: { STATE: { type: Scratch.ArgumentType.STRING, menu: 'camera', defaultValue: 'on' } },
          },
          {
            opcode: 'setTransparency',
            blockType: Scratch.BlockType.COMMAND,
            text: 'set camera transparency to [VALUE] %',
            arguments: { VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 } },
          },
          {
            opcode: 'setOverlay',
            blockType: Scratch.BlockType.COMMAND,
            text: 'show [MODE] on stage',
            arguments: { MODE: { type: Scratch.ArgumentType.STRING, menu: 'overlay', defaultValue: 'points' } },
          },
          {
            opcode: 'setSpeed',
            blockType: Scratch.BlockType.COMMAND,
            text: 'set AI speed to [SPEED]',
            arguments: { SPEED: { type: Scratch.ArgumentType.STRING, menu: 'speed', defaultValue: 'normal' } },
          },
        ],
        menus: {
          property: {
            acceptReporters: false,
            items: ['x', 'y', 'size', 'smile', 'mouth open', 'head tilt', 'left eye open', 'right eye open'],
          },
          state: {
            acceptReporters: false,
            items: ['smiling', 'mouth open', 'eyes closed', 'tilted left', 'tilted right'],
          },
          point: {
            acceptReporters: false,
            items: ['nose tip', 'left eye', 'right eye', 'mouth', 'left ear', 'right ear', 'forehead', 'chin'],
          },
          axis: { acceptReporters: false, items: ['x', 'y'] },
          camera: { acceptReporters: false, items: ['on', 'off', 'on flipped'] },
          overlay: { acceptReporters: false, items: ['points', 'boxes', 'nothing'] },
          speed: { acceptReporters: false, items: ['normal', 'fast', 'battery saver'] },
        },
      };
    }

    whenFaceAppears() {
      return faces().length > 0;
    }

    numberOfFaces() {
      return faces().length;
    }

    faceValue({ PROPERTY, INDEX }) {
      const f = nth(INDEX);
      return f ? f.features[PROPERTY] ?? 0 : 0;
    }

    faceIs({ INDEX, STATE }) {
      const f = nth(INDEX);
      return !!f && lib.faceIs(f.features, STATE);
    }

    pointValue({ AXIS, POINT, INDEX }) {
      const f = nth(INDEX);
      const p = f && f.points[POINT];
      return p ? Math.round(AXIS === 'y' ? p.y : p.x) : 0;
    }

    isReady() {
      faces();
      return !!vision && vision.status('face') === 'ready';
    }

    async setCamera({ STATE }) {
      (await loadVision()).setCamera(STATE);
    }

    async setTransparency({ VALUE }) {
      (await loadVision()).setTransparency(Scratch.Cast.toNumber(VALUE));
    }

    async setOverlay({ MODE }) {
      const v = await loadVision();
      v.setOverlay(MODE);
      if (MODE !== 'nothing') v.want('face');
    }

    async setSpeed({ SPEED }) {
      (await loadVision()).setSpeed(SPEED);
    }
  }

  Scratch.extensions.register(new Face());
})(Scratch);
