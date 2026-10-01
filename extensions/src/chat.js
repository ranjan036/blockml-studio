// BlockML Studio – Chat AI extension (MIT).
// A ChatGPT-style chatbot that runs on this device: a small open model (Qwen2.5,
// Apache-2.0) on the graphics chip, downloaded once. Every question and every answer
// goes through BlockML Studio's safety check first, and answers are checked with the
// Text AI kindness check. Nothing typed leaves the device.
// Like a person, the chat AI can be confidently wrong: the blocks give its answer as
// text, and the student's code (and the student) decide what to believe.
(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('The Chat AI extension must be loaded by BlockML Studio');
  }

  const BASE = document.currentScript && document.currentScript.src
    ? new URL('.', document.currentScript.src).href
    : new URL('extensions/', location.href).href;
  const runtime = Scratch.vm.runtime;
  const MAX_TOKENS = 120;
  const MAX_QUESTION = 400;
  const MAX_ROLE = 600;
  const KEEP_MESSAGES = 6; // the last 3 questions and answers
  const RULES = 'You are talking with a child aged 8 to 14 in a coding class. Answer in 1 to 3 short, simple sentences. ' +
    'Never give instructions about weapons, bombs, explosives, fire-starting, drugs, alcohol, smoking, hurting people or animals, ' +
    'self-harm, or anything sexual or scary. If asked about any of these, say you can\'t help and suggest asking a teacher or a ' +
    'grown-up. Never ask for or repeat personal details. If you are not sure, say so.';
  const DEFAULT_ROLE = 'You are a friendly helper.';

  const state = { status: 'off', progress: 0, error: '', size: '' }; // off | loading | ready | error
  let lib = null; // chat-runtime.js
  let chat = null;
  let loading = null;
  let role = DEFAULT_ROLE;
  let history = [];
  let answer = '';
  let blocked = false;
  let size = null; // 'big' | 'small'; null = choose for this device

  function load() {
    if (!loading) {
      state.status = 'loading';
      state.progress = 0;
      loading = (async () => {
        lib = await import(BASE + 'chat-runtime.js');
        if (!(await lib.hasWebGPU())) throw new Error('Chat AI needs a browser with WebGPU, like a recent Chrome or Edge.');
        state.size = size || lib.defaultModel();
        chat = await lib.loadChat(state.size, (fraction) => {
          state.progress = Math.round(100 * fraction);
        });
        state.status = 'ready';
        state.progress = 100;
      })().catch((err) => {
        state.status = 'error';
        state.error = err.message || String(err);
        loading = null;
        console.error('BlockML Studio: could not start the chat AI', err);
        throw err;
      });
    }
    return loading;
  }

  // The Text AI kindness check, for answers (loaded on first answer).
  let kindness = null;
  async function unkindScore(text) {
    try {
      if (!kindness) kindness = (await import(BASE + 'text-runtime.js')).loadTextModel();
      return Math.round(100 * (await kindness).unkind(text));
    } catch {
      return 0; // the word check still runs
    }
  }

  async function ask(question) {
    question = String(question).replace(/\s+/g, ' ').trim().slice(0, MAX_QUESTION);
    if (!question) return;
    const before = lib ? lib : await import(BASE + 'chat-runtime.js');
    lib = before;
    const q = lib.checkQuestion(question);
    if (!q.ok) {
      answer = q.reply;
      blocked = true;
      return;
    }
    try {
      await load();
    } catch {
      answer = state.error;
      blocked = false;
      return;
    }
    const messages = [{ role: 'system', content: `${RULES}\n${role}` }, ...history, { role: 'user', content: question }];
    let reply;
    const started = performance.now();
    try {
      reply = await chat.reply(messages, MAX_TOKENS);
      state.replyMs = Math.round(performance.now() - started);
    } catch (err) {
      console.error('BlockML Studio: the chat AI failed', err);
      answer = 'Sorry, something went wrong. Please ask again.';
      blocked = false;
      return;
    }
    const checking = performance.now();
    const a = lib.checkAnswer(reply, await unkindScore(reply));
    state.checkMs = Math.round(performance.now() - checking);
    blocked = !a.ok;
    answer = a.ok ? reply : a.reply;
    // Blocked exchanges are not remembered, so they can't steer later answers.
    if (a.ok) history = [...history, { role: 'user', content: question }, { role: 'assistant', content: reply }].slice(-KEEP_MESSAGES);
  }

  runtime.on('PROJECT_STOP_ALL', () => {
    answer = '';
    blocked = false;
  });

  const ICON = 'data:image/svg+xml;base64,' + btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect x="2" y="2" width="36" height="36" rx="8" fill="#fee2e2"/>' +
    '<path d="M7 9 H25 A3 3 0 0 1 28 12 V20 A3 3 0 0 1 25 23 H15 L10 27 V23 H7 A3 3 0 0 1 4 20 V12 A3 3 0 0 1 7 9 Z" fill="#dc2626"/>' +
    '<path d="M16 17 H33 A3 3 0 0 1 36 20 V28 A3 3 0 0 1 33 31 H31 V35 L26 31 H16 A3 3 0 0 1 13 28 V20 A3 3 0 0 1 16 17 Z" fill="#fca5a5" stroke="#dc2626" stroke-width="1.5"/>' +
    '<circle cx="20" cy="24" r="1.6" fill="#7f1d1d"/><circle cx="25" cy="24" r="1.6" fill="#7f1d1d"/><circle cx="30" cy="24" r="1.6" fill="#7f1d1d"/></svg>');

  class ChatAI {
    getInfo() {
      return {
        id: 'blockmlChat',
        name: 'Chat AI',
        color1: '#ef4444',
        color2: '#dc2626',
        color3: '#b91c1c',
        menuIconURI: ICON,
        blocks: [
          {
            opcode: 'ask',
            blockType: Scratch.BlockType.COMMAND,
            text: 'ask chat AI [QUESTION] and wait',
            arguments: { QUESTION: { type: Scratch.ArgumentType.STRING, defaultValue: 'What is a robot?' } },
          },
          {
            opcode: 'answer',
            blockType: Scratch.BlockType.REPORTER,
            text: 'chat AI\'s answer',
          },
          {
            opcode: 'wasBlocked',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'answer was blocked by the safety check?',
          },
          '---',
          {
            opcode: 'setRole',
            blockType: Scratch.BlockType.COMMAND,
            text: 'set chat AI\'s role to [ROLE]',
            arguments: { ROLE: { type: Scratch.ArgumentType.STRING, defaultValue: 'You are Owl, a wise guide in my game.' } },
          },
          {
            opcode: 'forget',
            blockType: Scratch.BlockType.COMMAND,
            text: 'forget the conversation',
          },
          '---',
          {
            opcode: 'start',
            blockType: Scratch.BlockType.COMMAND,
            text: 'start the chat AI',
          },
          {
            opcode: 'isReady',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'chat AI is ready?',
          },
          {
            opcode: 'progress',
            blockType: Scratch.BlockType.REPORTER,
            text: 'chat AI download %',
          },
          {
            opcode: 'useModel',
            blockType: Scratch.BlockType.COMMAND,
            text: 'use the [SIZE] chat model',
            arguments: { SIZE: { type: Scratch.ArgumentType.STRING, menu: 'size', defaultValue: 'small' } },
          },
        ],
        menus: {
          size: { acceptReporters: false, items: ['small', 'big'] },
        },
      };
    }

    ask({ QUESTION }) {
      return ask(QUESTION);
    }

    answer() {
      return answer;
    }

    wasBlocked() {
      return blocked;
    }

    setRole({ ROLE }) {
      const r = String(ROLE).trim().slice(0, MAX_ROLE);
      role = r || DEFAULT_ROLE;
      history = [];
    }

    forget() {
      history = [];
      answer = '';
      blocked = false;
    }

    start() {
      // Starts the download without waiting, so a project can show progress.
      load().catch(() => {});
    }

    isReady() {
      return state.status === 'ready';
    }

    progress() {
      return state.progress;
    }

    async useModel({ SIZE }) {
      const want = SIZE === 'big' ? 'big' : 'small';
      if (want === (state.size || size)) return;
      size = want;
      if (chat || loading) {
        // Switch: stop the loaded model; the next question loads the other one.
        const old = loading;
        loading = null;
        state.status = 'off';
        state.size = '';
        try {
          await old;
        } catch {
          // it failed anyway
        }
        if (chat) await chat.unload();
        chat = null;
      }
    }
  }

  // For tests and the teacher: what the chat AI is doing.
  window.__blockmlChat = state;
  Scratch.extensions.register(new ChatAI());
})(Scratch);
