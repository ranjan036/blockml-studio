// BlockML Studio – Object Detection extension (MIT).
// The AI finds everyday objects in the camera image (80 kinds, from the COCO
// dataset); students count them, loop over them and decide what to do with
// Scratch's own loops, lists, if/else and variables.
// Runs unsandboxed (trusted by BlockML Studio) and uses the shared vision
// runtime in the same folder.
(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('The Object Detection extension must be loaded by BlockML Studio');
  }

  const BASE = document.currentScript && document.currentScript.src
    ? new URL('.', document.currentScript.src).href
    : new URL('extensions/', location.href).href;
  const runtime = Scratch.vm.runtime;

  // The 80 objects COCO-SSD knows, as it names them: "person" first, the rest A–Z.
  const OBJECTS = ['person', ...[
    'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light', 'fire hydrant',
    'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra',
    'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
    'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket', 'bottle', 'wine glass',
    'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot',
    'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv',
    'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
    'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush',
  ].sort()];

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
  // The results of the latest detection (from "detect objects", or from the
  // background loop while a "when camera sees" hat is in the project).
  function objects() {
    if (!vision) {
      loadVision().catch(() => {});
      return [];
    }
    return vision.objects(); // only those at or above the minimum confidence
  }
  const same = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  const nth = (index) => objects()[Math.round(Scratch.Cast.toNumber(index)) - 1];
  const countOf = (name) => objects().filter((o) => same(o.name, name)).length;

  const ICON = 'data:image/svg+xml;base64,' + btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect x="2" y="2" width="36" height="36" rx="8" fill="#ffedd5"/>' +
    '<rect x="6" y="11" width="15" height="19" fill="none" stroke="#ea580c" stroke-width="2.5"/><rect x="23" y="16" width="12" height="14" fill="none" stroke="#ea580c" stroke-width="2.5"/>' +
    '<rect x="6" y="6" width="11" height="5" fill="#ea580c"/><rect x="23" y="11" width="9" height="5" fill="#ea580c"/></svg>');

  class ObjectDetection {
    getInfo() {
      return {
        id: 'blockmlObjects',
        name: 'Object Detection',
        color1: '#f97316',
        color2: '#ea580c',
        color3: '#c2410c',
        menuIconURI: ICON,
        blocks: [
          {
            opcode: 'whenSees',
            blockType: Scratch.BlockType.HAT,
            isEdgeActivated: true,
            text: 'when camera sees a [OBJECT]',
            arguments: { OBJECT: { type: Scratch.ArgumentType.STRING, menu: 'objects', defaultValue: 'person' } },
          },
          '---',
          {
            opcode: 'detect',
            blockType: Scratch.BlockType.COMMAND,
            text: 'detect objects',
          },
          {
            opcode: 'numberOfObjects',
            blockType: Scratch.BlockType.REPORTER,
            text: 'number of objects',
          },
          {
            opcode: 'objectValue',
            blockType: Scratch.BlockType.REPORTER,
            text: '[PROPERTY] of object [INDEX]',
            arguments: {
              PROPERTY: { type: Scratch.ArgumentType.STRING, menu: 'property', defaultValue: 'name' },
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: 'numberSeen',
            blockType: Scratch.BlockType.REPORTER,
            text: 'number of [OBJECT] seen',
            arguments: { OBJECT: { type: Scratch.ArgumentType.STRING, menu: 'objects', defaultValue: 'person' } },
          },
          {
            opcode: 'isDetected',
            blockType: Scratch.BlockType.BOOLEAN,
            text: '[OBJECT] detected?',
            arguments: { OBJECT: { type: Scratch.ArgumentType.STRING, menu: 'objects', defaultValue: 'cup' } },
          },
          {
            opcode: 'setMinConfidence',
            blockType: Scratch.BlockType.COMMAND,
            text: 'set minimum confidence to [VALUE] %',
            arguments: { VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 } },
          },
          {
            opcode: 'isReady',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'object AI is ready?',
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
            arguments: { MODE: { type: Scratch.ArgumentType.STRING, menu: 'overlay', defaultValue: 'boxes' } },
          },
          {
            opcode: 'setSpeed',
            blockType: Scratch.BlockType.COMMAND,
            text: 'set AI speed to [SPEED]',
            arguments: { SPEED: { type: Scratch.ArgumentType.STRING, menu: 'speed', defaultValue: 'normal' } },
          },
        ],
        menus: {
          // acceptReporters: students can put a variable or "name of object" in these.
          objects: { acceptReporters: true, items: OBJECTS },
          property: { acceptReporters: false, items: ['name', 'x', 'y', 'size', 'confidence'] },
          camera: { acceptReporters: false, items: ['on', 'off', 'on flipped'] },
          overlay: { acceptReporters: false, items: ['boxes', 'nothing'] },
          speed: { acceptReporters: false, items: ['normal', 'fast', 'battery saver'] },
        },
      };
    }

    whenSees({ OBJECT }) {
      if (!vision) {
        loadVision().catch(() => {});
        return false;
      }
      vision.want('objects'); // keeps detecting in the background while the hat is used
      return countOf(OBJECT) > 0;
    }

    async detect() {
      await (await loadVision()).runNow('objects');
    }

    numberOfObjects() {
      return objects().length;
    }

    objectValue({ PROPERTY, INDEX }) {
      const o = nth(INDEX);
      if (!o) return PROPERTY === 'name' ? '' : 0;
      return PROPERTY === 'size' ? o.width : o[PROPERTY];
    }

    numberSeen({ OBJECT }) {
      return countOf(OBJECT);
    }

    isDetected({ OBJECT }) {
      return countOf(OBJECT) > 0;
    }

    async setMinConfidence({ VALUE }) {
      (await loadVision()).objectThreshold = Math.max(0, Math.min(100, Scratch.Cast.toNumber(VALUE)));
    }

    isReady() {
      if (!vision) {
        loadVision().catch(() => {});
        return false;
      }
      if (vision.status('objects') === 'off') vision.ready('objects').catch(() => {}); // load, but don't start detecting
      return vision.status('objects') === 'ready';
    }

    async setCamera({ STATE }) {
      (await loadVision()).setCamera(STATE);
    }

    async setTransparency({ VALUE }) {
      (await loadVision()).setTransparency(Scratch.Cast.toNumber(VALUE));
    }

    async setOverlay({ MODE }) {
      const v = await loadVision();
      v.setOverlay(MODE === 'boxes' ? 'boxes' : 'nothing');
      if (MODE !== 'nothing') v.want('objects');
    }

    async setSpeed({ SPEED }) {
      (await loadVision()).setSpeed(SPEED);
    }
  }

  Scratch.extensions.register(new ObjectDetection());
})(Scratch);
