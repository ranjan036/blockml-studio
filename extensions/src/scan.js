// BlockML Studio – Codes & Cards extension (MIT).
// The camera reads QR codes, AprilTags and BlockML Studio's printable recognition
// cards (go, stop, left, right, numbers, pictures…). No AI model to download: the
// codes are read by plain JavaScript (jsQR, js-aruco2) in the shared vision runtime.
// Like the AI extensions, the blocks only report what the camera sees; what to do
// about it is ordinary Scratch code.
(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('The Codes & Cards extension must be loaded by BlockML Studio');
  }

  const BASE = document.currentScript && document.currentScript.src
    ? new URL('.', document.currentScript.src).href
    : new URL('extensions/', location.href).href;
  const runtime = Scratch.vm.runtime;
  // The same list as src/features/scan.js (card n is tag n); printable at /lessons/printables/.
  const CARDS = [
    'go', 'stop', 'left', 'right', 'forward', 'back', 'turn around', 'jump',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'apple', 'banana', 'cat', 'dog', 'fish', 'bird', 'car', 'house', 'tree', 'sun', 'star', 'heart',
  ];

  let vision = null;
  let visionPromise = null;
  function loadVision() {
    if (!visionPromise) {
      visionPromise = import(BASE + 'vision-runtime.js')
        .then((m) => (vision = m.getVision(runtime)))
        .catch((err) => {
          console.error('BlockML Studio: could not load the camera runtime', err);
          visionPromise = null;
          throw err;
        });
    }
    return visionPromise;
  }

  /** Everything the camera reads right now (and keeps reading while blocks ask). */
  function codes() {
    if (!vision) {
      loadVision().catch(() => {});
      return [];
    }
    vision.want('scan');
    return vision.codes();
  }
  const tags = () => codes().filter((c) => c.kind === 'tag');
  const cards = () => tags().filter((c) => c.card !== '');
  const same = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  // When the same card or code is seen twice, use the biggest: the one nearest the camera.
  const biggest = (list) => list.reduce((best, c) => (!best || c.size > best.size ? c : best), null);
  const card = (name) => biggest(cards().filter((c) => same(c.card, name)));
  const qr = () => biggest(codes().filter((c) => c.kind === 'qr'));
  const value = (c, property) => (c ? c[property] : 0);

  const ICON = 'data:image/svg+xml;base64,' + btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect x="2" y="2" width="36" height="36" rx="8" fill="#e0f2fe"/>' +
    '<rect x="7" y="7" width="26" height="26" fill="#0369a1"/><rect x="10" y="10" width="7" height="7" fill="#fff"/><rect x="23" y="10" width="7" height="4" fill="#fff"/>' +
    '<rect x="14" y="20" width="4" height="10" fill="#fff"/><rect x="21" y="18" width="9" height="5" fill="#fff"/><rect x="24" y="26" width="6" height="4" fill="#fff"/></svg>');

  const CARD = (defaultValue = 'go') => ({ type: Scratch.ArgumentType.STRING, menu: 'cards', defaultValue });
  const PLACE = (defaultValue = 'x') => ({ type: Scratch.ArgumentType.STRING, menu: 'place', defaultValue });

  class CodesAndCards {
    getInfo() {
      return {
        id: 'blockmlScan',
        name: 'Codes & Cards',
        color1: '#0ea5e9',
        color2: '#0284c7',
        color3: '#0369a1',
        menuIconURI: ICON,
        blocks: [
          {
            opcode: 'whenCard',
            blockType: Scratch.BlockType.HAT,
            isEdgeActivated: true,
            text: 'when camera sees card [CARD]',
            arguments: { CARD: CARD() },
          },
          '---',
          {
            opcode: 'cardSeen',
            blockType: Scratch.BlockType.REPORTER,
            text: 'card seen',
          },
          {
            opcode: 'isCardSeen',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'card [CARD] seen?',
            arguments: { CARD: CARD('stop') },
          },
          {
            opcode: 'numberOfCards',
            blockType: Scratch.BlockType.REPORTER,
            text: 'number of cards seen',
          },
          {
            opcode: 'cardValue',
            blockType: Scratch.BlockType.REPORTER,
            text: '[PROPERTY] of card [CARD]',
            arguments: { PROPERTY: PLACE(), CARD: CARD() },
          },
          '---',
          {
            opcode: 'numberOfTags',
            blockType: Scratch.BlockType.REPORTER,
            text: 'number of tags seen',
          },
          {
            opcode: 'tagValue',
            blockType: Scratch.BlockType.REPORTER,
            text: '[PROPERTY] of tag [INDEX]',
            arguments: {
              PROPERTY: { type: Scratch.ArgumentType.STRING, menu: 'tagProperty', defaultValue: 'number' },
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: 'isTagSeen',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'tag number [ID] seen?',
            arguments: { ID: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } },
          },
          '---',
          {
            opcode: 'qrText',
            blockType: Scratch.BlockType.REPORTER,
            text: 'QR code text',
          },
          {
            opcode: 'isQrSeen',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'camera sees a QR code?',
          },
          {
            opcode: 'qrValue',
            blockType: Scratch.BlockType.REPORTER,
            text: '[PROPERTY] of QR code',
            arguments: { PROPERTY: PLACE() },
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
        ],
        menus: {
          // acceptReporters: students can put a variable or "card seen" in these.
          cards: { acceptReporters: true, items: CARDS },
          place: { acceptReporters: false, items: ['x', 'y', 'size', 'direction'] },
          tagProperty: { acceptReporters: false, items: ['number', 'x', 'y', 'size', 'direction'] },
          camera: { acceptReporters: false, items: ['on', 'off', 'on flipped'] },
          overlay: { acceptReporters: false, items: ['boxes', 'nothing'] },
        },
      };
    }

    whenCard({ CARD }) {
      return !!card(CARD);
    }

    cardSeen() {
      const c = biggest(cards());
      return c ? c.card : '';
    }

    isCardSeen({ CARD }) {
      return !!card(CARD);
    }

    numberOfCards() {
      return cards().length;
    }

    cardValue({ PROPERTY, CARD }) {
      return value(card(CARD), PROPERTY);
    }

    numberOfTags() {
      return tags().length;
    }

    tagValue({ PROPERTY, INDEX }) {
      // Tags are numbered from the left of the stage.
      const t = tags()[Math.round(Scratch.Cast.toNumber(INDEX)) - 1];
      if (!t) return PROPERTY === 'number' ? '' : 0;
      return PROPERTY === 'number' ? t.id : t[PROPERTY];
    }

    isTagSeen({ ID }) {
      const id = Scratch.Cast.toNumber(ID);
      return tags().some((t) => t.id === id);
    }

    qrText() {
      const c = qr();
      return c ? c.text : '';
    }

    isQrSeen() {
      return !!qr();
    }

    qrValue({ PROPERTY }) {
      return value(qr(), PROPERTY);
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
      if (MODE !== 'nothing') v.want('scan');
    }
  }

  Scratch.extensions.register(new CodesAndCards());
})(Scratch);
