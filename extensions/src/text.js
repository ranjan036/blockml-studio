// BlockML Studio – Text AI extension (MIT).
// Students train their own text classifier from example sentences in the trainer
// window (or with blocks), and check messages with a ready-made kindness check
// that learned from many labelled comments. Both run on this computer in plain
// JavaScript (a small text model served by BlockML Studio): nothing typed leaves
// the device. The example sentences are saved inside the project.
// Like the other AI extensions, the AI only reports (a label, a number, yes/no);
// what to do about it is ordinary Scratch code: if / else, comparisons, lists.
(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('The Text AI extension must be loaded by BlockML Studio');
  }

  const EXT = 'blockmlText';
  const BASE = document.currentScript && document.currentScript.src
    ? new URL('.', document.currentScript.src).href
    : new URL('extensions/', location.href).href;
  const runtime = Scratch.vm.runtime;
  const MAX_NAME = 30;
  const MAX_CLASSES = 10;
  const MAX_EXAMPLES = 500; // per class
  const MAX_EXAMPLE_LENGTH = 300;
  const EPOCHS = 60;
  const LEARNING_RATE = 2;
  const GOOD_EXAMPLE_COUNT = 8;
  // "seems unkind?" says yes from this score; students can pick their own with the number block.
  const UNKIND_FROM = 50;
  const COLORS = ['#2563eb', '#ec4899', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#dc2626', '#65a30d'];

  // ---- the text AI ------------------------------------------------------------------

  const state = { status: 'off', error: '' }; // off | loading | ready | error
  let lib = null; // text-runtime.js
  let ai = null; // { pieces(text), embed(text), unkind(text) }
  let loading = null;
  function load() {
    if (!loading) {
      state.status = 'loading';
      loading = import(BASE + 'text-runtime.js')
        .then((m) => {
          lib = m;
          return m.loadTextModel();
        })
        .then((model) => {
          ai = model;
          state.status = 'ready';
        })
        .catch((err) => {
          state.status = 'error';
          state.error = err.message || String(err);
          loading = null;
          console.error('BlockML Studio: could not load the text AI', err);
          throw err;
        });
    }
    return loading;
  }

  // ---- the student's model ----------------------------------------------------------

  /** @type {{name: string, examples: string[]}[]} */
  let classes = [];
  let model = null; // {W, b}
  let modelClasses = []; // class names the model was trained on, in order
  let dirty = false; // examples changed since the model was trained
  let lastText = null; // the latest classification, so a loop doesn't redo the same text
  let last = { label: '', confidences: {} };

  const defaultClasses = () => [{ name: 'Class 1', examples: [] }, { name: 'Class 2', examples: [] }];
  classes = defaultClasses();

  const cleanExample = (text) => String(text).replace(/\s+/g, ' ').trim().slice(0, MAX_EXAMPLE_LENGTH);
  const same = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  const findClass = (name) => classes.find((c) => same(c.name, name));
  const trainable = () => classes.filter((c) => c.examples.length > 0);
  const canTrain = () => trainable().length >= 2;

  /** Examples as numbers. Sentences with no word the AI knows are left out (listed in `unknown`). */
  function trainingData() {
    const used = trainable();
    const samples = [];
    const labels = [];
    const unknown = [];
    used.forEach((c, k) => c.examples.forEach((text) => {
      const v = ai.embed(text);
      if (v) {
        samples.push(v);
        labels.push(k);
      } else unknown.push(text);
    }));
    return { used, samples, labels, unknown };
  }

  function newTrainer() {
    const data = trainingData();
    if (new Set(data.labels).size < 2) return null;
    return { ...data, trainer: lib.createTrainer(data.samples, data.labels, data.used.length, { epochs: EPOCHS, learningRate: LEARNING_RATE }) };
  }

  function useModel(trained, used) {
    model = trained;
    modelClasses = used.map((c) => c.name);
    dirty = false;
    lastText = null;
  }

  /** Trains in one go (when a project is opened, and for the "train" block). */
  function trainNow() {
    const t = canTrain() ? newTrainer() : null;
    if (!t) return false;
    while (!t.trainer.done) t.trainer.step();
    useModel(t.trainer.model, t.used);
    return true;
  }

  function classify(text) {
    text = String(text);
    if (text === lastText) return last;
    lastText = text;
    const v = model ? ai.embed(text) : null;
    if (!v) return (last = { label: '', confidences: {} }); // not trained, or no word the AI knows
    const p = lib.predict(model, v);
    const confidences = {};
    let best = 0;
    modelClasses.forEach((name, i) => {
      confidences[name] = Math.round(p[i] * 100);
      if (p[i] > p[best]) best = i;
    });
    return (last = { label: modelClasses[best], confidences });
  }

  function saveToProject() {
    runtime.extensionStorage[EXT] = {
      version: 1,
      features: ai ? ai.name : '',
      classes: classes.map((c) => ({ name: c.name, examples: [...c.examples] })),
    };
    runtime.emitProjectChanged();
  }

  let projectLoading = null;
  function loadFromProject() {
    model = null;
    modelClasses = [];
    dirty = false;
    lastText = null;
    const data = runtime.extensionStorage[EXT];
    if (!data || !Array.isArray(data.classes) || !data.classes.length) {
      classes = defaultClasses();
      refreshBlocks();
      return Promise.resolve();
    }
    classes = data.classes.slice(0, MAX_CLASSES).map((c) => ({
      name: String(c.name).slice(0, MAX_NAME),
      examples: (c.examples || []).slice(0, MAX_EXAMPLES).map(cleanExample).filter(Boolean),
    }));
    refreshBlocks();
    if (!canTrain()) return Promise.resolve();
    // Train again from the saved sentences (a moment, once the text AI is loaded).
    const mine = (projectLoading = load()
      .then(() => { trainNow(); })
      .catch(() => {})
      .then(() => { if (projectLoading === mine) projectLoading = null; }));
    return mine;
  }

  /** Projects only keep the examples of extensions whose blocks they use. */
  const usedInProject = () => runtime.targets.some((target) => Object.values(target.blocks._blocks).some((b) => String(b.opcode).startsWith(EXT + '_')));

  function refreshBlocks() {
    try {
      Scratch.vm.extensionManager.refreshBlocks(EXT);
    } catch {
      // Older VMs: menus still update when opened.
    }
  }

  runtime.on('PROJECT_LOADED', () => { loadFromProject(); });
  if (runtime.extensionStorage[EXT]) loadFromProject();

  /** Runs fn once the text AI (and a just-opened project's model) is ready; at once if it already is. */
  function withAI(fn, fallback) {
    if (ai && !projectLoading) return fn();
    return load().then(() => projectLoading).then(fn, () => fallback);
  }

  // ---- the trainer window -----------------------------------------------------------

  const CSS = `
.bml-tx-backdrop{position:fixed;inset:0;z-index:600;background:rgba(15,23,42,.55);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 12px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
.bml-tx{color-scheme:light;background:#fff;color:#0f172a;border-radius:12px;width:100%;max-width:980px;box-shadow:0 20px 50px rgba(0,0,0,.3)}
.bml-tx-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid #e2e8f0}
.bml-tx-head h2{margin:0;font-size:18px}
.bml-tx-body{padding:16px 18px}
.bml-tx button{font:inherit;font-size:14px;padding:8px 14px;border-radius:8px;border:1px solid #059669;background:#059669;color:#fff;cursor:pointer}
.bml-tx button.secondary{background:#fff;color:#047857}
.bml-tx button.quiet{background:none;border-color:transparent;color:#64748b;padding:6px 8px}
.bml-tx button:disabled{opacity:.45;cursor:default}
.bml-tx input{font:inherit;font-size:15px;padding:7px 9px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#0f172a;min-width:0}
.bml-tx-tip{font-size:13px;color:#475569;line-height:1.5;margin:0 0 12px}
.bml-tx-classes{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}
.bml-tx-class{border:1px solid #e2e8f0;border-top:6px solid var(--c);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:8px}
.bml-tx-row{display:flex;align-items:center;gap:6px}
.bml-tx-row input{flex:1}
.bml-tx-row input.name{font-weight:600}
.bml-tx-count{font-size:13px;color:#475569}
.bml-tx-examples{list-style:none;margin:0;padding:0;max-height:168px;overflow:auto;display:flex;flex-direction:column;gap:4px}
.bml-tx-examples li{display:flex;align-items:center;gap:4px;font-size:14px;background:#f8fafc;border-radius:6px;padding:2px 2px 2px 8px}
.bml-tx-examples li span{flex:1;overflow-wrap:anywhere}
.bml-tx-examples li button{padding:2px 7px}
.bml-tx-foot{padding:12px 18px 18px;border-top:1px solid #e2e8f0;display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:start}
@media (max-width:760px){.bml-tx-foot{grid-template-columns:1fr}}
.bml-tx-status{font-size:14px;color:#334155;margin:8px 0 0;line-height:1.5;max-width:360px}
.bml-tx-chart{width:360px;max-width:100%;height:120px;display:block;margin-top:8px;border:1px solid #e2e8f0;border-radius:8px}
.bml-tx-test{width:100%;box-sizing:border-box}
.bml-tx-reads{font-size:13px;color:#475569;margin:8px 0;min-height:24px;line-height:2}
.bml-tx-reads b{font-weight:500;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:5px;padding:1px 5px;margin-right:3px;color:#065f46;white-space:nowrap}
.bml-tx-bars{display:flex;flex-direction:column;gap:6px}
.bml-tx-bar{display:grid;grid-template-columns:120px 1fr 44px;gap:8px;align-items:center;font-size:14px}
.bml-tx-bar .track{height:14px;background:#f1f5f9;border-radius:7px;overflow:hidden}
.bml-tx-bar .fill{height:100%;background:var(--c);transition:width .15s}
.bml-tx-bar .name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
.bml-tx h3{margin:0 0 8px;font-size:14px;color:#334155}
`;

  function el(tag, props = {}, ...children) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'style') {
        // (setProperty, because Object.assign ignores custom properties like --c)
        for (const [prop, value] of Object.entries(v)) e.style.setProperty(prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`), value);
      }
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k in e) e[k] = v;
      else e.setAttribute(k, v);
    }
    for (const c of children) if (c != null) e.append(c);
    return e;
  }

  function uniqueName(name, except) {
    let base = (name || '').trim().slice(0, MAX_NAME) || `Class ${classes.length + 1}`;
    let candidate = base;
    for (let n = 2; classes.some((c) => c !== except && c.name.toLowerCase() === candidate.toLowerCase()); n++) {
      candidate = `${base} ${n}`;
    }
    return candidate;
  }

  /** Adds a sentence to a class unless it is empty, already there, or the class is full. */
  function addExample(c, text) {
    text = cleanExample(text);
    if (!text || c.examples.length >= MAX_EXAMPLES || c.examples.some((e) => same(e, text))) return false;
    c.examples.push(text);
    dirty = true;
    return true;
  }

  let trainerOpen = null;

  function openTrainer() {
    if (trainerOpen) return trainerOpen;
    trainerOpen = new Promise((resolve) => {
      if (!document.getElementById('bml-text-trainer-style')) {
        document.head.append(el('style', { id: 'bml-text-trainer-style', textContent: CSS }));
      }
      let running = true;

      const classList = el('div', { className: 'bml-tx-classes' });
      const status = el('p', { className: 'bml-tx-status' });
      const chart = el('canvas', { className: 'bml-tx-chart', width: 720, height: 240 });
      const bars = el('div', { className: 'bml-tx-bars' });
      const reads = el('p', { className: 'bml-tx-reads' });
      const testInput = el('input', { className: 'bml-tx-test', placeholder: 'Type a sentence to test…', maxLength: MAX_EXAMPLE_LENGTH, 'aria-label': 'Sentence to test' });
      testInput.addEventListener('input', () => test());
      const trainBtn = el('button', { type: 'button', textContent: 'Train model', onclick: () => train() });
      const doneBtn = el('button', { type: 'button', className: 'secondary', textContent: 'Done', onclick: () => close() });

      const dialog = el('div', { className: 'bml-tx', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Train your text model' },
        el('div', { className: 'bml-tx-head' }, el('h2', { textContent: 'Train your text model' }), doneBtn),
        el('div', { className: 'bml-tx-body' },
          el('p', { className: 'bml-tx-tip', innerHTML:
            '<b>How:</b> name each class (for example <i>Happy</i>, <i>Sad</i>). Type example sentences for each class and press <b>Enter</b> ' +
            '(or paste many lines at once). Give at least ' + GOOD_EXAMPLE_COUNT + ' different examples per class, then press <b>Train model</b>.' }),
          classList,
          el('p', {}, el('button', { type: 'button', className: 'secondary', textContent: '+ Add a class', onclick: () => {
            if (classes.length >= MAX_CLASSES) return;
            classes.push({ name: uniqueName(''), examples: [] });
            changed();
          } }))),
        el('div', { className: 'bml-tx-foot' },
          el('div', {}, trainBtn, status, chart),
          el('div', {}, el('h3', { textContent: 'Test it: what does the model think?' }), testInput, reads, bars)));
      const backdrop = el('div', { className: 'bml-tx-backdrop' }, dialog);
      document.body.append(backdrop);

      const onKey = (e) => { if (e.key === 'Escape') close(); };
      window.addEventListener('keydown', onKey);

      function renderClasses(focusClass) {
        classList.replaceChildren(...classes.map((c, i) => {
          const color = COLORS[i % COLORS.length];
          const name = el('input', { className: 'name', value: c.name, maxLength: MAX_NAME, 'aria-label': `Name of class ${i + 1}` });
          name.addEventListener('change', () => {
            c.name = uniqueName(name.value, c);
            name.value = c.name;
            changed();
          });
          const entry = el('input', { placeholder: 'Type an example, press Enter', maxLength: MAX_EXAMPLE_LENGTH, 'aria-label': `New example for ${c.name}` });
          const add = () => {
            if (addExample(c, entry.value)) renderClasses(c);
            else entry.value = '';
          };
          entry.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          });
          // Pasting several lines adds one example per line.
          entry.addEventListener('paste', (e) => {
            const lines = (e.clipboardData ? e.clipboardData.getData('text') : '').split(/\r?\n/).filter((l) => l.trim());
            if (lines.length < 2) return;
            e.preventDefault();
            lines.forEach((l) => addExample(c, l));
            renderClasses(c);
          });
          const n = c.examples.length;
          const card = el('div', { className: 'bml-tx-class', style: { '--c': color } },
            el('div', { className: 'bml-tx-row' },
              name,
              el('button', { type: 'button', className: 'quiet', textContent: '✕', title: 'Delete this class', 'aria-label': `Delete ${c.name}`,
                disabled: classes.length <= 1, onclick: () => {
                  classes.splice(classes.indexOf(c), 1);
                  changed();
                } })),
            el('div', { className: 'bml-tx-row' }, entry, el('button', { type: 'button', textContent: 'Add', onclick: add })),
            el('span', { className: 'bml-tx-count', textContent: `${n} example${n === 1 ? '' : 's'}` }),
            // Newest first, so a new example is always in view.
            el('ul', { className: 'bml-tx-examples' }, ...c.examples.map((text, at) => el('li', {},
              el('span', { textContent: text }),
              el('button', { type: 'button', className: 'quiet', textContent: '✕', 'aria-label': `Remove “${text}”`, onclick: () => {
                c.examples.splice(at, 1);
                changed();
              } }))).reverse()));
          if (c === focusClass) setTimeout(() => entry.focus(), 0);
          return card;
        }));
        updateStatus();
      }

      function updateStatus(text) {
        trainBtn.disabled = !canTrain() || !ai;
        if (text) {
          status.textContent = text;
          return;
        }
        const counts = classes.map((c) => c.examples.length);
        if (!ai) status.textContent = state.status === 'error' ? 'The text AI could not load. Check the internet connection and open the trainer again.' : 'Loading the text AI…';
        else if (!canTrain()) status.textContent = 'Add examples to at least 2 classes to train.';
        else if (counts.some((n) => n > 0 && n < GOOD_EXAMPLE_COUNT)) status.textContent = `Ready to train. Tip: ${GOOD_EXAMPLE_COUNT}+ examples per class gives better results.`;
        else if (dirty || !model) status.textContent = 'Ready to train.';
        else status.textContent = 'Model trained. Try it on the right, or add more examples and train again.';
      }

      function changed() {
        dirty = true;
        renderClasses();
      }

      function drawChart(history) {
        const ctx = chart.getContext('2d');
        const W = chart.width;
        const H = chart.height;
        ctx.clearRect(0, 0, W, H);
        ctx.font = '22px system-ui, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('loss', 12, 28);
        ctx.fillStyle = '#16a34a';
        ctx.fillText('accuracy', 80, 28);
        if (!history.length) return;
        const maxLoss = Math.max(...history.map((h) => h.loss), 0.01);
        const x = (i) => 10 + (i / Math.max(EPOCHS - 1, 1)) * (W - 20);
        const line = (color, y) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = 4;
          ctx.beginPath();
          history.forEach((h, i) => (i ? ctx.lineTo(x(i), y(h)) : ctx.moveTo(x(i), y(h))));
          ctx.stroke();
        };
        line('#94a3b8', (h) => H - 10 - (h.loss / maxLoss) * (H - 50));
        line('#16a34a', (h) => H - 10 - h.accuracy * (H - 50));
      }

      async function train() {
        if (!canTrain() || !ai) return;
        const t = newTrainer();
        if (!t) {
          updateStatus('The AI does not know any word in some classes. Use ordinary English words.');
          return;
        }
        trainBtn.disabled = true;
        const history = [];
        while (!t.trainer.done && running) {
          const h = t.trainer.step();
          history.push(h);
          drawChart(history);
          updateStatus(`Training… epoch ${h.epoch} of ${EPOCHS} · loss ${h.loss.toFixed(3)} · accuracy ${Math.round(h.accuracy * 100)}%`);
          await new Promise((r) => requestAnimationFrame(r)); // one epoch per frame, so you can watch it learn
        }
        if (!running) return;
        useModel(t.trainer.model, t.used);
        const final = history[history.length - 1];
        const skipped = t.unknown.length ? ` (${t.unknown.length} left out: no word the AI knows)` : '';
        const tip = usedInProject() ? '' : ' Use a Text AI block in your code before you save: only then are the examples kept in the project.';
        updateStatus(`Trained on ${t.samples.length} examples${skipped} in ${EPOCHS} epochs. Accuracy on these examples: ${Math.round(final.accuracy * 100)}%. Try it →${tip}`);
        saveToProject();
        test();
      }

      function test() {
        const text = testInput.value;
        if (!ai || !text.trim()) {
          reads.textContent = '';
          bars.replaceChildren();
          return;
        }
        // What the AI actually reads: the word pieces it knows. Anything else is invisible to it.
        const pieces = ai.pieces(text);
        reads.replaceChildren('The AI reads: ', ...(pieces.length ? pieces.map((p) => el('b', { textContent: p })) : ['nothing — it knows no word here']));
        if (!model) {
          bars.replaceChildren();
          return;
        }
        const result = classify(text);
        bars.replaceChildren(...modelClasses.map((name, i) => {
          const pct = result.confidences[name] || 0;
          return el('div', { className: 'bml-tx-bar', style: { '--c': COLORS[classes.findIndex((c) => c.name === name) % COLORS.length] || COLORS[i] } },
            el('span', { className: 'name', textContent: name, title: name }),
            el('span', { className: 'track' }, el('span', { className: 'fill', style: { width: `${pct}%`, display: 'block' } })),
            el('span', { textContent: `${pct}%` }));
        }));
      }

      function close() {
        running = false;
        window.removeEventListener('keydown', onKey);
        backdrop.remove();
        // Keep the examples in the project even if the student didn't train.
        saveToProject();
        if (dirty && ai && canTrain()) trainNow();
        refreshBlocks();
        trainerOpen = null;
        resolve();
      }

      renderClasses();
      drawChart([]);
      doneBtn.focus();
      load().then(() => projectLoading).then(() => { if (running) updateStatus(); }, () => { if (running) updateStatus(); });
    });
    return trainerOpen;
  }

  // ---- blocks -----------------------------------------------------------------------

  const ICON = 'data:image/svg+xml;base64,' + btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect x="2" y="2" width="36" height="36" rx="8" fill="#d1fae5"/>' +
    '<path d="M8 10 H32 A3 3 0 0 1 35 13 V25 A3 3 0 0 1 32 28 H19 L12 34 V28 H8 A3 3 0 0 1 5 25 V13 A3 3 0 0 1 8 10 Z" fill="#059669"/>' +
    '<path d="M11 16 H29 M11 21 H23" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/></svg>');

  const firstClass = () => (classes[0] && classes[0].name) || 'Class 1';
  const confidence = (result, name) => {
    const key = Object.keys(result.confidences).find((k) => same(k, name));
    return key ? result.confidences[key] : 0;
  };
  const unkindScore = (text) => (String(text).trim() ? Math.round(100 * ai.unkind(text)) : 0);
  const TEXT = (defaultValue) => ({ type: Scratch.ArgumentType.STRING, defaultValue });
  const CLASS = () => ({ type: Scratch.ArgumentType.STRING, menu: 'classes', defaultValue: firstClass() });

  class TextAI {
    getInfo() {
      return {
        id: EXT,
        name: 'Text AI',
        color1: '#10b981',
        color2: '#059669',
        color3: '#047857',
        menuIconURI: ICON,
        blocks: [
          {
            opcode: 'openTrainer',
            blockType: Scratch.BlockType.COMMAND,
            text: 'open the text trainer',
          },
          '---',
          {
            opcode: 'labelOf',
            blockType: Scratch.BlockType.REPORTER,
            text: 'label of text [TEXT]',
            arguments: { TEXT: TEXT('I love this game') },
          },
          {
            opcode: 'confidenceOf',
            blockType: Scratch.BlockType.REPORTER,
            text: 'confidence that [TEXT] is [CLASS]',
            arguments: { TEXT: TEXT('I love this game'), CLASS: CLASS() },
          },
          {
            opcode: 'textIs',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'text [TEXT] is [CLASS]?',
            arguments: { TEXT: TEXT('I love this game'), CLASS: CLASS() },
          },
          {
            opcode: 'examplesOf',
            blockType: Scratch.BlockType.REPORTER,
            text: 'number of examples of [CLASS]',
            arguments: { CLASS: CLASS() },
          },
          {
            opcode: 'isTrained',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'text model is trained?',
          },
          '---',
          {
            opcode: 'addExample',
            blockType: Scratch.BlockType.COMMAND,
            text: 'add example [TEXT] to [CLASS]',
            arguments: { TEXT: TEXT('What a great day'), CLASS: CLASS() },
          },
          {
            opcode: 'train',
            blockType: Scratch.BlockType.COMMAND,
            text: 'train the text model',
          },
          '---',
          {
            opcode: 'unkindScore',
            blockType: Scratch.BlockType.REPORTER,
            text: 'unkind score of [TEXT]',
            arguments: { TEXT: TEXT('You are my friend') },
          },
          {
            opcode: 'seemsUnkind',
            blockType: Scratch.BlockType.BOOLEAN,
            text: '[TEXT] seems unkind?',
            arguments: { TEXT: TEXT('You are my friend') },
          },
          {
            opcode: 'piecesOf',
            blockType: Scratch.BlockType.REPORTER,
            text: 'what the AI reads in [TEXT]',
            arguments: { TEXT: TEXT('Unbelievable!') },
          },
          {
            opcode: 'isReady',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'text AI is ready?',
          },
        ],
        menus: {
          classes: { acceptReporters: true, items: 'classMenu' },
        },
      };
    }

    classMenu() {
      const names = classes.map((c) => c.name);
      return names.length ? names : ['Class 1'];
    }

    openTrainer() {
      return openTrainer();
    }

    labelOf({ TEXT }) {
      return withAI(() => classify(TEXT).label, '');
    }

    confidenceOf({ TEXT, CLASS }) {
      return withAI(() => confidence(classify(TEXT), CLASS), 0);
    }

    textIs({ TEXT, CLASS }) {
      return withAI(() => {
        const { label } = classify(TEXT);
        return label !== '' && same(label, CLASS);
      }, false);
    }

    examplesOf({ CLASS }) {
      const c = findClass(CLASS);
      return c ? c.examples.length : 0;
    }

    isTrained() {
      return withAI(() => !!model, false);
    }

    addExample({ TEXT, CLASS }) {
      let c = findClass(CLASS);
      if (!c) {
        const name = String(CLASS).trim().slice(0, MAX_NAME);
        if (!name || classes.length >= MAX_CLASSES) return;
        // Replace an unused starting class ("Class 1") rather than keeping it around empty.
        const spare = classes.find((k) => !k.examples.length && /^Class \d+$/.test(k.name));
        if (spare) spare.name = name;
        else classes.push({ name, examples: [] });
        c = findClass(name);
        refreshBlocks();
      }
      if (addExample(c, TEXT)) saveToProject();
    }

    train() {
      return withAI(() => {
        if (dirty || !model) trainNow();
      });
    }

    unkindScore({ TEXT }) {
      return withAI(() => unkindScore(TEXT), 0);
    }

    seemsUnkind({ TEXT }) {
      return withAI(() => unkindScore(TEXT) >= UNKIND_FROM, false);
    }

    piecesOf({ TEXT }) {
      return withAI(() => ai.pieces(TEXT).join(' '), '');
    }

    isReady() {
      if (state.status === 'off') load().catch(() => {});
      return state.status === 'ready' && !projectLoading;
    }
  }

  // For tests and the teacher: what the text AI is doing.
  window.__blockmlText = state;
  Scratch.extensions.register(new TextAI());
})(Scratch);
