// BlockML Studio – Lens extension (MIT).
// "What is this?" — the camera image is recognised as one of 1,000 everyday things
// (MobileNet trained on ImageNet, the same model the Image Model learns from) — and
// "read text" — printed English words in the camera image (Tesseract.js). Both run on
// this computer; nothing is sent anywhere. The blocks report guesses with a
// confidence; what to believe is up to the student's code.
(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('The Lens extension must be loaded by BlockML Studio');
  }

  const BASE = document.currentScript && document.currentScript.src
    ? new URL('.', document.currentScript.src).href
    : new URL('extensions/', location.href).href;
  const runtime = Scratch.vm.runtime;
  const GUESSES = 5;

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

  let guesses = []; // [{name, confidence}], best first, from the last "recognise"
  let read = { text: '', confidence: 0 }; // from the last "read text"

  runtime.on('PROJECT_STOP_ALL', () => {
    guesses = [];
    read = { text: '', confidence: 0 };
  });

  const words = () => read.text.split(' ').filter(Boolean);

  const ICON = 'data:image/svg+xml;base64,' + btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect x="2" y="2" width="36" height="36" rx="8" fill="#e0e7ff"/>' +
    '<circle cx="17" cy="17" r="10" fill="#fff" stroke="#4338ca" stroke-width="3"/><path d="M24.5 24.5 L33 33" stroke="#4338ca" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M12 15 H22 M12 19 H19" stroke="#4338ca" stroke-width="2" stroke-linecap="round"/></svg>');

  class Lens {
    getInfo() {
      return {
        id: 'blockmlLens',
        name: 'Lens',
        color1: '#6366f1',
        color2: '#4f46e5',
        color3: '#4338ca',
        menuIconURI: ICON,
        blocks: [
          {
            opcode: 'recognize',
            blockType: Scratch.BlockType.COMMAND,
            text: 'recognise what the camera sees',
          },
          {
            opcode: 'thing',
            blockType: Scratch.BlockType.REPORTER,
            text: 'what the camera sees',
          },
          {
            opcode: 'thingConfidence',
            blockType: Scratch.BlockType.REPORTER,
            text: 'confidence of what the camera sees',
          },
          {
            opcode: 'guess',
            blockType: Scratch.BlockType.REPORTER,
            text: '[PROPERTY] of guess [INDEX]',
            arguments: {
              PROPERTY: { type: Scratch.ArgumentType.STRING, menu: 'guessProperty', defaultValue: 'name' },
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 },
            },
          },
          '---',
          {
            opcode: 'readText',
            blockType: Scratch.BlockType.COMMAND,
            text: 'read text in camera image',
          },
          {
            opcode: 'textRead',
            blockType: Scratch.BlockType.REPORTER,
            text: 'text read',
          },
          {
            opcode: 'numberOfWords',
            blockType: Scratch.BlockType.REPORTER,
            text: 'number of words read',
          },
          {
            opcode: 'word',
            blockType: Scratch.BlockType.REPORTER,
            text: 'word [INDEX] of text read',
            arguments: { INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 } },
          },
          {
            opcode: 'textConfidence',
            blockType: Scratch.BlockType.REPORTER,
            text: 'confidence of text read',
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
        ],
        menus: {
          guessProperty: { acceptReporters: false, items: ['name', 'confidence'] },
          camera: { acceptReporters: false, items: ['on', 'off', 'on flipped'] },
        },
      };
    }

    async recognize() {
      try {
        guesses = await (await loadVision()).recognizeNow(GUESSES);
      } catch (err) {
        console.error('BlockML Studio: could not recognise the camera image', err);
        guesses = [];
      }
    }

    thing() {
      return guesses[0] ? guesses[0].name : '';
    }

    thingConfidence() {
      return guesses[0] ? guesses[0].confidence : 0;
    }

    guess({ PROPERTY, INDEX }) {
      const g = guesses[Math.round(Scratch.Cast.toNumber(INDEX)) - 1];
      if (!g) return PROPERTY === 'name' ? '' : 0;
      return PROPERTY === 'name' ? g.name : g.confidence;
    }

    async readText() {
      try {
        read = await (await loadVision()).readTextNow();
      } catch (err) {
        console.error('BlockML Studio: could not read the text', err);
        read = { text: '', confidence: 0 };
      }
    }

    textRead() {
      return read.text;
    }

    numberOfWords() {
      return words().length;
    }

    word({ INDEX }) {
      return words()[Math.round(Scratch.Cast.toNumber(INDEX)) - 1] || '';
    }

    textConfidence() {
      return read.confidence;
    }

    async setCamera({ STATE }) {
      (await loadVision()).setCamera(STATE);
    }

    async setTransparency({ VALUE }) {
      (await loadVision()).setTransparency(Scratch.Cast.toNumber(VALUE));
    }
  }

  Scratch.extensions.register(new Lens());
})(Scratch);
