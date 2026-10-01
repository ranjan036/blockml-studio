// BlockML Studio – Hand & Pose extension (MIT).
// The AI finds hands (21 points each) and the body (17 points); students decide
// what happens with Scratch's own if/else, comparisons, loops and variables.
// Students can also teach it their own hand signs (AI 11): each example is the 21
// hand points, so a few examples per sign are enough. Only those numbers are saved
// in the project, never camera images.
// Runs unsandboxed (trusted by BlockML Studio) and uses the shared vision
// runtime in the same folder.
(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('The Hand & Pose extension must be loaded by BlockML Studio');
  }

  const BASE = document.currentScript && document.currentScript.src
    ? new URL('.', document.currentScript.src).href
    : new URL('extensions/', location.href).href;
  const runtime = Scratch.vm.runtime;
  const EXT = 'blockmlHands';
  const MAX_SIGNS = 10;
  const MAX_EXAMPLES = 300; // per sign
  const MAX_NAME = 30;
  const EPOCHS = 60;

  const HAND_POINTS = {
    wrist: 'wrist',
    'thumb tip': 'thumb_tip',
    'index fingertip': 'index_finger_tip',
    'middle fingertip': 'middle_finger_tip',
    'ring fingertip': 'ring_finger_tip',
    'pinky tip': 'pinky_finger_tip',
  };
  const BODY_POINTS = [
    'nose', 'left eye', 'right eye', 'left ear', 'right ear',
    'left shoulder', 'right shoulder', 'left elbow', 'right elbow', 'left wrist', 'right wrist',
    'left hip', 'right hip', 'left knee', 'right knee', 'left ankle', 'right ankle',
  ];
  const GESTURES = ['open', 'fist', 'thumbs up', 'thumbs down', 'pointing', 'victory'];

  let vision = null;
  let lib = null;
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
  // Blocks never wait: until the AI is ready, they report "no hands" / "no body".
  function hands() {
    if (!vision) {
      loadVision().catch(() => {});
      return [];
    }
    vision.want('hands');
    return vision.hands();
  }
  function body() {
    if (!vision) {
      loadVision().catch(() => {});
      return null;
    }
    vision.want('pose');
    return vision.pose();
  }
  const nth = (index) => hands()[Math.round(Scratch.Cast.toNumber(index)) - 1];

  // ---- the student's hand signs ---------------------------------------------------

  /** @type {{name: string, samples: Float32Array[]}[]} */
  let signs = [];
  let model = null;
  let modelSigns = [];
  let dirty = false;
  const same = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  const findSign = (name) => signs.find((s) => same(s.name, name));
  const trainable = () => signs.filter((s) => s.samples.length > 0);

  function trainNow() {
    const used = trainable();
    if (used.length < 2) return false;
    const samples = [];
    const labels = [];
    used.forEach((s, k) => s.samples.forEach((x) => { samples.push(x); labels.push(k); }));
    const trainer = lib.createTrainer(samples, labels, used.length, { epochs: EPOCHS, learningRate: 2 });
    while (!trainer.done) trainer.step();
    model = trainer.model;
    modelSigns = used.map((s) => s.name);
    dirty = false;
    return true;
  }

  /** {name: confidence 0–100} for a hand, or null if there is no hand or no model. */
  function signOf(hand) {
    if (!hand || !model || !lib) return null;
    const p = lib.predict(model, lib.handSignFeatures(hand.keypoints, hand.side));
    return Object.fromEntries(modelSigns.map((name, i) => [name, Math.round(p[i] * 100)]));
  }
  function bestSign(hand) {
    const c = signOf(hand);
    if (!c) return '';
    return Object.keys(c).reduce((a, b) => (c[b] > c[a] ? b : a));
  }

  function saveToProject() {
    runtime.extensionStorage[EXT] = {
      version: 1,
      signs: signs.map((s) => ({ name: s.name, samples: s.samples.map((x) => Array.from(x, (n) => Math.round(n * 1000) / 1000)) })),
    };
    runtime.emitProjectChanged();
  }

  function refreshBlocks() {
    try {
      Scratch.vm.extensionManager.refreshBlocks(EXT);
    } catch {
      // Older VMs: menus still update when opened.
    }
  }

  function loadFromProject() {
    model = null;
    modelSigns = [];
    dirty = false;
    const data = runtime.extensionStorage[EXT];
    signs = data && Array.isArray(data.signs)
      ? data.signs.slice(0, MAX_SIGNS).map((s) => ({
        name: String(s.name).slice(0, MAX_NAME),
        samples: (s.samples || []).slice(0, MAX_EXAMPLES).map((x) => Float32Array.from(x)),
      }))
      : [];
    refreshBlocks();
    if (trainable().length >= 2) loadVision().then(() => trainNow()).catch(() => {});
  }
  runtime.on('PROJECT_LOADED', loadFromProject);
  if (runtime.extensionStorage[EXT]) loadFromProject();

  const ICON = 'data:image/svg+xml;base64,' + btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect x="2" y="2" width="36" height="36" rx="8" fill="#ccfbf1" stroke="#0f766e" stroke-width="2"/>' +
    '<path d="M13 30 V17 M17 30 V10 M21 30 V9 M25 30 V11 M29 30 V16 L32 21" stroke="#0f766e" stroke-width="3" stroke-linecap="round" fill="none"/>' +
    '<rect x="11" y="24" width="20" height="9" rx="4" fill="#0f766e"/></svg>');

  const firstSign = () => (signs[0] && signs[0].name) || 'A';

  class HandPose {
    getInfo() {
      return {
        id: 'blockmlHands',
        name: 'Hand & Pose',
        color1: '#14b8a6',
        color2: '#0d9488',
        color3: '#0f766e',
        menuIconURI: ICON,
        blocks: [
          {
            opcode: 'whenGesture',
            blockType: Scratch.BlockType.HAT,
            isEdgeActivated: true,
            text: 'when a hand shows [GESTURE]',
            arguments: { GESTURE: { type: Scratch.ArgumentType.STRING, menu: 'gesture', defaultValue: 'thumbs up' } },
          },
          '---',
          {
            opcode: 'numberOfHands',
            blockType: Scratch.BlockType.REPORTER,
            text: 'number of hands',
          },
          {
            opcode: 'handPoint',
            blockType: Scratch.BlockType.REPORTER,
            text: '[AXIS] of [POINT] of hand [INDEX]',
            arguments: {
              AXIS: { type: Scratch.ArgumentType.STRING, menu: 'axis', defaultValue: 'x' },
              POINT: { type: Scratch.ArgumentType.STRING, menu: 'handPoint', defaultValue: 'index fingertip' },
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: 'fingersUp',
            blockType: Scratch.BlockType.REPORTER,
            text: 'fingers up on hand [INDEX]',
            arguments: { INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },
          {
            opcode: 'handIs',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'hand [INDEX] shows [GESTURE]?',
            arguments: {
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              GESTURE: { type: Scratch.ArgumentType.STRING, menu: 'gesture', defaultValue: 'open' },
            },
          },
          {
            opcode: 'gestureOf',
            blockType: Scratch.BlockType.REPORTER,
            text: 'gesture of hand [INDEX]',
            arguments: { INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },
          {
            opcode: 'whichHand',
            blockType: Scratch.BlockType.REPORTER,
            text: 'which hand is hand [INDEX]',
            arguments: { INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },
          '---',
          {
            opcode: 'addSign',
            blockType: Scratch.BlockType.COMMAND,
            text: 'add hand [INDEX] as an example of sign [SIGN]',
            arguments: {
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              SIGN: { type: Scratch.ArgumentType.STRING, menu: 'signs', defaultValue: firstSign() },
            },
          },
          {
            opcode: 'trainSigns',
            blockType: Scratch.BlockType.COMMAND,
            text: 'train hand signs',
          },
          {
            opcode: 'signOf',
            blockType: Scratch.BlockType.REPORTER,
            text: 'hand sign of hand [INDEX]',
            arguments: { INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },
          {
            opcode: 'signConfidence',
            blockType: Scratch.BlockType.REPORTER,
            text: 'confidence that hand [INDEX] shows sign [SIGN]',
            arguments: {
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              SIGN: { type: Scratch.ArgumentType.STRING, menu: 'signs', defaultValue: firstSign() },
            },
          },
          {
            opcode: 'signExamples',
            blockType: Scratch.BlockType.REPORTER,
            text: 'number of examples of sign [SIGN]',
            arguments: { SIGN: { type: Scratch.ArgumentType.STRING, menu: 'signs', defaultValue: firstSign() } },
          },
          {
            opcode: 'forgetSigns',
            blockType: Scratch.BlockType.COMMAND,
            text: 'forget all hand signs',
          },
          '---',
          {
            opcode: 'bodyPoint',
            blockType: Scratch.BlockType.REPORTER,
            text: '[AXIS] of [POINT] of body',
            arguments: {
              AXIS: { type: Scratch.ArgumentType.STRING, menu: 'axis', defaultValue: 'y' },
              POINT: { type: Scratch.ArgumentType.STRING, menu: 'bodyPoint', defaultValue: 'nose' },
            },
          },
          {
            opcode: 'bodyVisible',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'body is visible?',
          },
          {
            opcode: 'isReady',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'hand AI is ready?',
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
          gesture: { acceptReporters: false, items: GESTURES },
          signs: { acceptReporters: true, items: 'signMenu' },
          handPoint: { acceptReporters: false, items: Object.keys(HAND_POINTS) },
          bodyPoint: { acceptReporters: false, items: BODY_POINTS },
          axis: { acceptReporters: false, items: ['x', 'y'] },
          camera: { acceptReporters: false, items: ['on', 'off', 'on flipped'] },
          overlay: { acceptReporters: false, items: ['points', 'boxes', 'nothing'] },
          speed: { acceptReporters: false, items: ['normal', 'fast', 'battery saver'] },
        },
      };
    }

    signMenu() {
      return signs.length ? signs.map((s) => s.name) : ['A'];
    }

    async addSign({ INDEX, SIGN }) {
      await loadVision();
      const hand = nth(INDEX);
      const name = String(SIGN).trim().slice(0, MAX_NAME);
      if (!hand || !name) return;
      let s = findSign(name);
      if (!s) {
        if (signs.length >= MAX_SIGNS) return;
        signs.push((s = { name, samples: [] }));
        refreshBlocks();
      }
      if (s.samples.length >= MAX_EXAMPLES) return;
      s.samples.push(lib.handSignFeatures(hand.keypoints, hand.side));
      dirty = true;
      saveToProject();
    }

    async trainSigns() {
      await loadVision();
      if (dirty || !model) trainNow();
    }

    signOf({ INDEX }) {
      return bestSign(nth(INDEX));
    }

    signConfidence({ INDEX, SIGN }) {
      const c = signOf(nth(INDEX));
      if (!c) return 0;
      const key = Object.keys(c).find((k) => same(k, SIGN));
      return key ? c[key] : 0;
    }

    signExamples({ SIGN }) {
      const s = findSign(SIGN);
      return s ? s.samples.length : 0;
    }

    forgetSigns() {
      signs = [];
      model = null;
      modelSigns = [];
      dirty = false;
      saveToProject();
      refreshBlocks();
    }

    whenGesture({ GESTURE }) {
      return hands().some((h) => h.gesture === GESTURE);
    }

    numberOfHands() {
      return hands().length;
    }

    handPoint({ AXIS, POINT, INDEX }) {
      const h = nth(INDEX);
      const p = h && h.points[HAND_POINTS[POINT]];
      return p ? Math.round(AXIS === 'y' ? p.y : p.x) : 0;
    }

    fingersUp({ INDEX }) {
      const h = nth(INDEX);
      return h ? h.fingersUp : 0;
    }

    handIs({ INDEX, GESTURE }) {
      const h = nth(INDEX);
      return !!h && h.gesture === GESTURE;
    }

    gestureOf({ INDEX }) {
      const h = nth(INDEX);
      return h ? h.gesture : '';
    }

    whichHand({ INDEX }) {
      const h = nth(INDEX);
      return h ? h.side : '';
    }

    bodyPoint({ AXIS, POINT }) {
      const b = body();
      const p = b && b.visible && b.points[POINT];
      return p ? Math.round(AXIS === 'y' ? p.y : p.x) : 0;
    }

    bodyVisible() {
      const b = body();
      return !!b && b.visible;
    }

    isReady() {
      hands();
      return !!vision && vision.status('hands') === 'ready';
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
      if (MODE !== 'nothing') v.want('hands');
    }

    async setSpeed({ SPEED }) {
      (await loadVision()).setSpeed(SPEED);
    }
  }

  Scratch.extensions.register(new HandPose());
})(Scratch);
