// BlockML Studio – Voice extension (MIT).
// Speech-to-text runs offline in the browser (Vosk, a Kaldi speech recogniser built
// for WebAssembly, with a small English model served by BlockML Studio); text-to-
// speech uses the computer's own voices, or Android's in an exported app. Nothing
// the microphone hears leaves the device.
// Like the vision extensions, the AI only reports what it heard; what to do about
// it is ordinary Scratch code: if / else, variables, lists.
(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('The Voice extension must be loaded by BlockML Studio');
  }

  const BASE = document.currentScript && document.currentScript.src
    ? new URL('.', document.currentScript.src).href
    : new URL('extensions/', location.href).href;
  const runtime = Scratch.vm.runtime;
  const SAMPLE_RATE = 16000;
  const MODEL = 'models/vosk-small-en/';
  // A phrase counts for "when I hear" hats for this long after it was heard.
  const HAT_WINDOW_MS = 150;

  // ---- speech-to-text ---------------------------------------------------------

  const state = {
    status: 'off', // off | loading | ready | error
    error: '',
    listening: false,
    words: '', // words to listen for ('' = any words)
    heard: '', // the last phrase
    confidence: 0, // 0–100, average over its words
    heardAt: 0,
    muteUntil: 0, // ignore what we hear while we are speaking ourselves
  };
  let modelPromise = null;
  let recognizer = null;
  let audio = null; // { context, stream, node }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (window.Vosk) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load the voice AI'));
      document.head.appendChild(s);
    });
  }

  function loadModel() {
    if (!modelPromise) {
      state.status = 'loading';
      modelPromise = (async () => {
        await loadScript(BASE + 'vosk.js');
        // The model is stored in parts (hosts limit file sizes); join them into one archive.
        const manifest = await (await fetch(BASE + MODEL + 'manifest.json')).json();
        const parts = await Promise.all(manifest.parts.map(async (p) => {
          const r = await fetch(BASE + MODEL + p);
          if (!r.ok) throw new Error(`voice model part ${p}: ${r.status}`);
          return r.arrayBuffer();
        }));
        const url = URL.createObjectURL(new Blob(parts, { type: 'application/gzip' }));
        const model = await window.Vosk.createModel(url);
        state.status = 'ready';
        return model;
      })().catch((err) => {
        state.status = 'error';
        state.error = err.message || String(err);
        modelPromise = null;
        console.error('BlockML Studio: could not load the voice AI', err);
        throw err;
      });
    }
    return modelPromise;
  }

  function wordList() {
    return state.words.toLowerCase().split(/[\s,]+/).filter(Boolean);
  }

  async function makeRecognizer() {
    const model = await loadModel();
    if (recognizer) recognizer.remove();
    const words = wordList();
    // With a word list, anything else comes back as "[unk]": fewer choices, fewer mistakes.
    recognizer = words.length
      ? new model.KaldiRecognizer(SAMPLE_RATE, JSON.stringify([...words, '[unk]']))
      : new model.KaldiRecognizer(SAMPLE_RATE);
    recognizer.setWords(true);
    recognizer.on('result', (message) => {
      const r = message.result || {};
      const text = (r.text || '').replace(/\[unk\]/g, '').replace(/\s+/g, ' ').trim();
      if (!text || performance.now() < state.muteUntil) return;
      const confs = (r.result || []).filter((w) => w.word !== '[unk]').map((w) => w.conf);
      state.heard = text;
      state.confidence = confs.length ? Math.round((100 * confs.reduce((a, b) => a + b, 0)) / confs.length) : 0;
      state.heardAt = performance.now();
      runtime.requestRedraw();
    });
  }

  async function startListening() {
    if (state.listening) return;
    state.listening = true;
    try {
      await makeRecognizer();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      const context = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
      const node = context.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = (e) => {
        if (!state.listening || !recognizer) return;
        try {
          recognizer.acceptWaveform(e.inputBuffer);
        } catch (err) {
          // A dropped buffer is fine; keep listening.
        }
      };
      context.createMediaStreamSource(stream).connect(node);
      node.connect(context.destination);
      audio = { context, stream, node };
      if (!state.listening) stopListening(); // stopped while starting
    } catch (err) {
      state.listening = false;
      state.status = state.status === 'ready' ? 'ready' : 'error';
      state.error = err.name === 'NotAllowedError' ? 'The microphone is blocked.' : (err.message || String(err));
      console.error('BlockML Studio: could not start listening', err);
    }
  }

  function stopListening() {
    state.listening = false;
    if (audio) {
      audio.node.disconnect();
      audio.stream.getTracks().forEach((t) => t.stop());
      audio.context.close();
      audio = null;
    }
  }

  // Free the microphone when the project stops.
  runtime.on('PROJECT_STOP_ALL', () => {
    stopListening();
    state.heard = '';
    state.confidence = 0;
  });

  const wordsOf = (text) => String(text).toLowerCase().split(/[^\p{L}\p{N}']+/u).filter(Boolean);
  /** Whether the last phrase contains this word or phrase (whole words). */
  function heardWord(word) {
    const want = wordsOf(word);
    if (!want.length) return false;
    const got = wordsOf(state.heard);
    for (let i = 0; i + want.length <= got.length; i++) {
      if (want.every((w, j) => got[i + j] === w)) return true;
    }
    return false;
  }

  // ---- text-to-speech ---------------------------------------------------------

  function pickVoice() {
    const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    // Prefer an English voice that runs on this computer (no internet needed).
    return voices.find((v) => v.localService && /^en/i.test(v.lang))
      || voices.find((v) => v.localService)
      || voices.find((v) => /^en/i.test(v.lang))
      || null;
  }

  function speak(text) {
    text = String(text);
    if (!text.trim()) return Promise.resolve();
    // A rough length so we can ignore our own voice in the microphone.
    const estimate = 600 + text.length * 70;
    state.muteUntil = performance.now() + estimate;
    // Exported Android app: the app shell provides Android's offline voice.
    if (window.BlockMLAndroid && window.BlockMLAndroid.speak) {
      window.BlockMLAndroid.speak(text);
      return new Promise((resolve) => setTimeout(resolve, estimate));
    }
    if (!window.speechSynthesis) return Promise.resolve();
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      const voice = pickVoice();
      if (voice) u.voice = voice;
      u.lang = voice ? voice.lang : 'en-US';
      const done = () => {
        state.muteUntil = performance.now() + 300;
        resolve();
      };
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.speak(u);
      // Never hang a script if the browser never reports the end.
      setTimeout(done, estimate + 4000);
    });
  }

  // ---- blocks -----------------------------------------------------------------

  const ICON = 'data:image/svg+xml;base64,' + btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect x="2" y="2" width="36" height="36" rx="8" fill="#ede9fe"/>' +
    '<rect x="15" y="7" width="10" height="17" rx="5" fill="#7c3aed"/><path d="M11 19 Q11 29 20 29 Q29 29 29 19" fill="none" stroke="#7c3aed" stroke-width="2.5"/>' +
    '<path d="M20 29 V34 M14 34 H26" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round"/></svg>');

  class Voice {
    getInfo() {
      return {
        id: 'blockmlVoice',
        name: 'Voice',
        color1: '#8b5cf6',
        color2: '#7c3aed',
        color3: '#6d28d9',
        menuIconURI: ICON,
        blocks: [
          {
            opcode: 'whenHear',
            blockType: Scratch.BlockType.HAT,
            isEdgeActivated: true,
            text: 'when I hear [WORD]',
            arguments: { WORD: { type: Scratch.ArgumentType.STRING, defaultValue: 'hello' } },
          },
          '---',
          {
            opcode: 'startListening',
            blockType: Scratch.BlockType.COMMAND,
            text: 'start listening',
          },
          {
            opcode: 'stopListening',
            blockType: Scratch.BlockType.COMMAND,
            text: 'stop listening',
          },
          {
            opcode: 'listenFor',
            blockType: Scratch.BlockType.COMMAND,
            text: 'listen only for words [WORDS]',
            arguments: { WORDS: { type: Scratch.ArgumentType.STRING, defaultValue: 'up down left right stop' } },
          },
          {
            opcode: 'listenForAny',
            blockType: Scratch.BlockType.COMMAND,
            text: 'listen for any words',
          },
          {
            opcode: 'whatIHeard',
            blockType: Scratch.BlockType.REPORTER,
            text: 'what I heard',
          },
          {
            opcode: 'heardWord',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'I heard [WORD]?',
            arguments: { WORD: { type: Scratch.ArgumentType.STRING, defaultValue: 'up' } },
          },
          {
            opcode: 'confidence',
            blockType: Scratch.BlockType.REPORTER,
            text: 'confidence of what I heard',
          },
          {
            opcode: 'clearHeard',
            blockType: Scratch.BlockType.COMMAND,
            text: 'forget what I heard',
          },
          {
            opcode: 'isReady',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'voice AI is ready?',
          },
          '---',
          {
            opcode: 'speak',
            blockType: Scratch.BlockType.COMMAND,
            text: 'speak [TEXT]',
            arguments: { TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Hello!' } },
          },
          {
            opcode: 'speakAndWait',
            blockType: Scratch.BlockType.COMMAND,
            text: 'speak [TEXT] and wait',
            arguments: { TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Hello!' } },
          },
        ],
      };
    }

    whenHear({ WORD }) {
      if (!state.listening) startListening();
      // True for a moment after each phrase, so hearing "up" twice runs the hat twice.
      return performance.now() - state.heardAt < HAT_WINDOW_MS && heardWord(WORD);
    }

    startListening() {
      return startListening();
    }

    stopListening() {
      stopListening();
    }

    async listenFor({ WORDS }) {
      const words = String(WORDS).trim();
      if (words === state.words) return;
      state.words = words;
      if (state.listening) await makeRecognizer();
    }

    async listenForAny() {
      if (state.words === '') return;
      state.words = '';
      if (state.listening) await makeRecognizer();
    }

    whatIHeard() {
      if (!state.listening) startListening();
      return state.heard;
    }

    heardWord({ WORD }) {
      if (!state.listening) startListening();
      return heardWord(WORD);
    }

    confidence() {
      return state.confidence;
    }

    clearHeard() {
      state.heard = '';
      state.confidence = 0;
    }

    isReady() {
      if (state.status === 'off') loadModel().catch(() => {});
      return state.status === 'ready';
    }

    speak({ TEXT }) {
      speak(TEXT);
    }

    speakAndWait({ TEXT }) {
      return speak(TEXT);
    }
  }

  // For tests and the teacher: what the voice AI is doing.
  window.__blockmlVoice = state;
  Scratch.extensions.register(new Voice());
})(Scratch);
