// BlockML Studio – Image Model extension (MIT).
// Students train their own image classifier from webcam photos in the trainer
// window, then use it with Scratch's own if/else, comparisons and loops.
// Only the photos' MobileNet features (numbers) are saved in the project, never
// the photos. Runs unsandboxed (trusted by BlockML Studio) and uses the shared
// vision runtime in the same folder.
(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('The Image Model extension must be loaded by BlockML Studio');
  }

  const EXT = 'blockmlImage';
  const BASE = document.currentScript && document.currentScript.src
    ? new URL('.', document.currentScript.src).href
    : new URL('extensions/', location.href).href;
  const runtime = Scratch.vm.runtime;
  const MAX_NAME = 30;
  const EPOCHS = 40;
  const GOOD_PHOTO_COUNT = 10;
  const COLORS = ['#2563eb', '#ec4899', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#dc2626', '#65a30d'];

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

  // ---- the model ------------------------------------------------------------------

  /** @type {{name: string, samples: Float32Array[], thumbs?: string[]}[]} */
  let classes = [];
  let model = null; // {W, b}
  let modelClasses = []; // class names the model was trained on, in order
  let last = { label: '', confidences: {} }; // result of the latest classification

  const defaultClasses = () => [{ name: 'Class 1', samples: [] }, { name: 'Class 2', samples: [] }];
  classes = defaultClasses();

  const trainable = () => classes.filter((c) => c.samples.length > 0);
  const canTrain = () => trainable().length >= 2;

  function trainingData() {
    const used = trainable();
    const samples = [];
    const labels = [];
    used.forEach((c, k) => c.samples.forEach((s) => { samples.push(s); labels.push(k); }));
    return { used, samples, labels };
  }

  /** Trains in one go (used when a project is opened). */
  function trainNow() {
    const { used, samples, labels } = trainingData();
    const trainer = lib.createTrainer(samples, labels, used.length, { epochs: EPOCHS });
    while (!trainer.done) trainer.step();
    model = trainer.model;
    modelClasses = used.map((c) => c.name);
  }

  function classify(features) {
    const p = lib.predict(model, features);
    const confidences = {};
    let best = 0;
    modelClasses.forEach((name, i) => {
      confidences[name] = Math.round(p[i] * 100);
      if (p[i] > p[best]) best = i;
    });
    last = { label: modelClasses[best], confidences };
    return last;
  }

  function saveToProject() {
    runtime.extensionStorage[EXT] = {
      version: 1,
      features: 'mobilenet_v2_100_224',
      classes: classes.map((c) => ({ name: c.name, samples: c.samples.map((s) => lib.encodeSample(s)) })),
    };
    runtime.emitProjectChanged();
  }

  async function loadFromProject() {
    model = null;
    modelClasses = [];
    last = { label: '', confidences: {} };
    const data = runtime.extensionStorage[EXT];
    if (!data || !Array.isArray(data.classes) || !data.classes.length) {
      classes = defaultClasses();
      refreshBlocks();
      return;
    }
    await loadVision();
    classes = data.classes.map((c) => ({
      name: String(c.name).slice(0, MAX_NAME),
      samples: (c.samples || []).map((s) => lib.decodeSample(s)),
    }));
    if (canTrain()) trainNow(); // under a second, from the saved features
    refreshBlocks();
  }

  function refreshBlocks() {
    try {
      Scratch.vm.extensionManager.refreshBlocks(EXT);
    } catch {
      // Older VMs: menus still update when opened.
    }
  }

  runtime.on('PROJECT_LOADED', () => {
    loadFromProject().catch((err) => console.error('BlockML Studio: could not load the image model', err));
  });
  if (runtime.extensionStorage[EXT]) loadFromProject().catch(() => {});

  // ---- the trainer window ---------------------------------------------------------

  const CSS = `
.bml-tr-backdrop{position:fixed;inset:0;z-index:600;background:rgba(15,23,42,.55);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 12px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
.bml-tr{color-scheme:light;background:#fff;color:#0f172a;border-radius:12px;width:100%;max-width:980px;box-shadow:0 20px 50px rgba(0,0,0,.3)}
.bml-tr-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid #e2e8f0}
.bml-tr-head h2{margin:0;font-size:18px}
.bml-tr-body{display:grid;grid-template-columns:340px 1fr;gap:18px;padding:16px 18px}
@media (max-width:760px){.bml-tr-body{grid-template-columns:1fr}}
.bml-tr button{font:inherit;font-size:14px;padding:8px 14px;border-radius:8px;border:1px solid #2563eb;background:#2563eb;color:#fff;cursor:pointer}
.bml-tr button.secondary{background:#fff;color:#2563eb}
.bml-tr button.quiet{background:none;border-color:transparent;color:#64748b;padding:6px 8px}
.bml-tr button:disabled{opacity:.45;cursor:default}
.bml-tr-cam{width:320px;max-width:100%;aspect-ratio:4/3;background:#0f172a;border-radius:10px;display:block}
.bml-tr-tip{font-size:13px;color:#475569;line-height:1.5;margin:10px 0 0}
.bml-tr-classes{display:flex;flex-direction:column;gap:10px}
.bml-tr-class{border:1px solid #e2e8f0;border-left:6px solid var(--c);border-radius:10px;padding:10px 12px}
.bml-tr-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.bml-tr-row input{flex:1;min-width:120px;font:inherit;font-size:15px;font-weight:600;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#0f172a}
.bml-tr-count{font-size:13px;color:#475569;min-width:80px}
.bml-tr-record.recording{background:#dc2626;border-color:#dc2626}
.bml-tr-thumbs{display:flex;gap:4px;margin-top:8px;min-height:36px}
.bml-tr-thumbs img{width:48px;height:36px;object-fit:cover;border-radius:4px}
.bml-tr-foot{padding:12px 18px 18px;border-top:1px solid #e2e8f0;display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:start}
@media (max-width:760px){.bml-tr-foot{grid-template-columns:1fr}}
.bml-tr-status{font-size:14px;color:#334155;margin:8px 0 0;line-height:1.5}
.bml-tr-chart{width:360px;max-width:100%;height:120px;display:block;margin-top:8px;border:1px solid #e2e8f0;border-radius:8px}
.bml-tr-bars{display:flex;flex-direction:column;gap:6px}
.bml-tr-bar{display:grid;grid-template-columns:120px 1fr 44px;gap:8px;align-items:center;font-size:14px}
.bml-tr-bar .track{height:14px;background:#f1f5f9;border-radius:7px;overflow:hidden}
.bml-tr-bar .fill{height:100%;background:var(--c);transition:width .15s}
.bml-tr-bar .name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
.bml-tr h3{margin:0 0 8px;font-size:14px;color:#334155}
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

  let trainerOpen = null;

  function openTrainer() {
    if (trainerOpen) return trainerOpen;
    trainerOpen = new Promise((resolve) => {
      if (!document.getElementById('bml-trainer-style')) {
        document.head.append(el('style', { id: 'bml-trainer-style', textContent: CSS }));
      }
      let running = true;
      let capturing = null; // class being recorded
      let testing = false;
      let dirty = false; // photos changed since the model was trained

      const cam = el('canvas', { className: 'bml-tr-cam', width: 320, height: 240 });
      const classList = el('div', { className: 'bml-tr-classes' });
      const status = el('p', { className: 'bml-tr-status' });
      const chart = el('canvas', { className: 'bml-tr-chart', width: 720, height: 240 });
      const bars = el('div', { className: 'bml-tr-bars' });
      const trainBtn = el('button', { type: 'button', textContent: 'Train model', onclick: () => train() });
      const doneBtn = el('button', { type: 'button', className: 'secondary', textContent: 'Done', onclick: () => close() });

      const dialog = el('div', { className: 'bml-tr', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Train your image model' },
        el('div', { className: 'bml-tr-head' }, el('h2', { textContent: 'Train your image model' }), doneBtn),
        el('div', { className: 'bml-tr-body' },
          el('div', {},
            cam,
            el('p', { className: 'bml-tr-tip', innerHTML:
              '<b>How:</b> name each class (for example <i>Apple</i>, <i>Banana</i>, <i>Nothing</i>). ' +
              'Show the thing to the camera and <b>hold</b> its record button. Take at least ' + GOOD_PHOTO_COUNT +
              ' photos per class from different angles, then press <b>Train model</b>.' })),
          el('div', {},
            classList,
            el('p', {}, el('button', { type: 'button', className: 'secondary', textContent: '+ Add a class', onclick: () => {
              classes.push({ name: uniqueName(''), samples: [] });
              changed();
            } })))),
        el('div', { className: 'bml-tr-foot' },
          el('div', {}, trainBtn, status, chart),
          el('div', {}, el('h3', { textContent: 'Test it: what does the model see now?' }), bars)));
      const backdrop = el('div', { className: 'bml-tr-backdrop' }, dialog);
      document.body.append(backdrop);
      doneBtn.focus();

      const onKey = (e) => { if (e.key === 'Escape') close(); };
      window.addEventListener('keydown', onKey);

      function renderClasses() {
        classList.replaceChildren(...classes.map((c, i) => {
          const color = COLORS[i % COLORS.length];
          const count = el('span', { className: 'bml-tr-count', textContent: `${c.samples.length} photo${c.samples.length === 1 ? '' : 's'}` });
          const thumbs = el('div', { className: 'bml-tr-thumbs' }, ...(c.thumbs || []).map((src) => el('img', { src, alt: '' })));
          const record = el('button', { type: 'button', className: 'bml-tr-record', textContent: '● Hold to record' });
          const start = (e) => {
            e.preventDefault();
            capturing = c;
            record.classList.add('recording');
            captureLoop(c, count, thumbs);
          };
          const stop = () => {
            if (capturing === c) capturing = null;
            record.classList.remove('recording');
          };
          record.addEventListener('pointerdown', start);
          record.addEventListener('pointerup', stop);
          record.addEventListener('pointerleave', stop);
          record.addEventListener('pointercancel', stop);
          // Keyboard: each press of Enter/Space takes one photo.
          record.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              takePhoto(c, count, thumbs);
            }
          });
          const name = el('input', { value: c.name, maxLength: MAX_NAME, 'aria-label': `Name of class ${i + 1}` });
          name.addEventListener('change', () => {
            c.name = uniqueName(name.value, c);
            name.value = c.name;
            changed();
          });
          return el('div', { className: 'bml-tr-class', style: { '--c': color } },
            el('div', { className: 'bml-tr-row' },
              name, count, record,
              el('button', { type: 'button', className: 'quiet', textContent: 'Clear', title: 'Remove all photos of this class', onclick: () => {
                c.samples = [];
                c.thumbs = [];
                changed();
              } }),
              el('button', { type: 'button', className: 'quiet', textContent: '✕', title: 'Delete this class', 'aria-label': `Delete ${c.name}`,
                disabled: classes.length <= 1, onclick: () => {
                  classes.splice(classes.indexOf(c), 1);
                  changed();
                } })),
            thumbs);
        }));
        updateStatus();
      }

      function updateStatus(text) {
        trainBtn.disabled = !canTrain();
        if (text) {
          status.textContent = text;
          return;
        }
        const counts = classes.map((c) => c.samples.length);
        if (!canTrain()) status.textContent = 'Add photos to at least 2 classes to train.';
        else if (counts.some((n) => n > 0 && n < GOOD_PHOTO_COUNT)) status.textContent = `Ready to train. Tip: ${GOOD_PHOTO_COUNT}+ photos per class gives better results.`;
        else if (dirty || !model) status.textContent = 'Ready to train.';
        else status.textContent = 'Model trained. Try it on the right, or add more photos and train again.';
      }

      function changed() {
        dirty = true;
        renderClasses();
      }

      async function takePhoto(c, countEl, thumbsEl) {
        if (!vision.frameCanvas()) await vision.embedNow(); // starts the camera and the model
        const frame = vision.frameCanvas();
        if (!frame || !running) return;
        // One snapshot is both learned from and shown, so the thumbnail is exactly what the
        // model saw. (A new canvas each time: quick key presses can overlap.)
        const snapshot = el('canvas', { width: 480, height: 360 });
        snapshot.getContext('2d').drawImage(frame, 0, 0);
        const small = el('canvas', { width: 64, height: 48 });
        small.getContext('2d').drawImage(snapshot, 0, 0, 64, 48);
        const features = await vision.embedCanvas(snapshot);
        if (!running) return;
        c.samples.push(features);
        c.thumbs = [small.toDataURL('image/jpeg', 0.7), ...(c.thumbs || [])].slice(0, 8);
        thumbsEl.replaceChildren(...c.thumbs.map((src) => el('img', { src, alt: '' })));
        countEl.textContent = `${c.samples.length} photo${c.samples.length === 1 ? '' : 's'}`;
        dirty = true;
        updateStatus();
      }

      async function captureLoop(c, countEl, thumbsEl) {
        while (running && capturing === c) {
          await takePhoto(c, countEl, thumbsEl);
          await new Promise((r) => setTimeout(r, 120));
        }
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
        if (!canTrain()) return;
        trainBtn.disabled = true;
        testing = false;
        const { used, samples, labels } = trainingData();
        const trainer = lib.createTrainer(samples, labels, used.length, { epochs: EPOCHS });
        const history = [];
        while (!trainer.done && running) {
          const h = trainer.step();
          history.push(h);
          drawChart(history);
          updateStatus(`Training… epoch ${h.epoch} of ${EPOCHS} · loss ${h.loss.toFixed(3)} · accuracy ${Math.round(h.accuracy * 100)}%`);
          await new Promise((r) => requestAnimationFrame(r)); // one epoch per frame, so you can watch it learn
        }
        if (!running) return;
        model = trainer.model;
        modelClasses = used.map((c) => c.name);
        dirty = false;
        const final = history[history.length - 1];
        updateStatus(`Trained on ${samples.length} photos in ${EPOCHS} epochs. Accuracy on these photos: ${Math.round(final.accuracy * 100)}%. Try it →`);
        saveToProject();
        testing = true;
        testLoop();
      }

      async function testLoop() {
        while (running && testing && model) {
          const features = await vision.embedNow();
          if (!features || !running || !testing) break;
          const result = classify(features);
          bars.replaceChildren(...modelClasses.map((name, i) => {
            const pct = result.confidences[name];
            return el('div', { className: 'bml-tr-bar', style: { '--c': COLORS[classes.findIndex((c) => c.name === name) % COLORS.length] || COLORS[i] } },
              el('span', { className: 'name', textContent: name, title: name }),
              el('span', { className: 'track' }, el('span', { className: 'fill', style: { width: `${pct}%`, display: 'block' } })),
              el('span', { textContent: `${pct}%` }));
          }));
          await new Promise((r) => setTimeout(r, 150));
        }
      }

      function drawCamera() {
        if (!running) return;
        const frame = vision.frameCanvas();
        const ctx = cam.getContext('2d');
        if (frame) ctx.drawImage(frame, 0, 0, cam.width, cam.height);
        else {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, cam.width, cam.height);
          ctx.fillStyle = '#e2e8f0';
          ctx.font = '16px system-ui, sans-serif';
          ctx.fillText('Starting the camera…', 90, 125);
        }
        requestAnimationFrame(drawCamera);
      }

      function close() {
        running = false;
        capturing = null;
        testing = false;
        window.removeEventListener('keydown', onKey);
        backdrop.remove();
        // Keep the photos' features in the project even if the student didn't train.
        saveToProject();
        if (dirty && canTrain()) trainNow();
        refreshBlocks();
        trainerOpen = null;
        resolve();
      }

      renderClasses();
      drawChart([]);
      if (model) {
        testing = true;
        testLoop();
      }
      vision.embedNow().catch(() => updateStatus('The camera or the AI could not start. Check that the browser may use the camera.'));
      drawCamera();
    });
    return trainerOpen;
  }

  // ---- blocks ---------------------------------------------------------------------

  const ICON = 'data:image/svg+xml;base64,' + btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect x="3" y="7" width="34" height="26" rx="5" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/>' +
    '<circle cx="15" cy="17" r="4" fill="#f59e0b"/><path d="M5 31 L16 21 L23 27 L28 23 L35 31 Z" fill="#16a34a"/>' +
    '<path d="M30 3 L32 8 L37 10 L32 12 L30 17 L28 12 L23 10 L28 8 Z" fill="#facc15" stroke="#ca8a04"/></svg>');

  const firstClass = () => (classes[0] && classes[0].name) || 'Class 1';
  const same = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  const findClass = (name) => classes.find((c) => same(c.name, name));
  const confidence = (name) => {
    const key = Object.keys(last.confidences).find((k) => same(k, name));
    return key ? last.confidences[key] : 0;
  };

  class ImageModel {
    getInfo() {
      return {
        id: EXT,
        name: 'Image Model',
        color1: '#3b82f6',
        color2: '#2563eb',
        color3: '#1d4ed8',
        menuIconURI: ICON,
        blocks: [
          {
            opcode: 'openTrainer',
            blockType: Scratch.BlockType.COMMAND,
            text: 'open the trainer',
          },
          '---',
          {
            opcode: 'whenSees',
            blockType: Scratch.BlockType.HAT,
            isEdgeActivated: true,
            text: 'when camera sees [CLASS] with confidence > [CONFIDENCE]',
            arguments: {
              CLASS: { type: Scratch.ArgumentType.STRING, menu: 'classes', defaultValue: firstClass() },
              CONFIDENCE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 80 },
            },
          },
          {
            opcode: 'classify',
            blockType: Scratch.BlockType.COMMAND,
            text: 'classify camera image',
          },
          {
            opcode: 'imageLabel',
            blockType: Scratch.BlockType.REPORTER,
            text: 'image label',
          },
          {
            opcode: 'confidenceOf',
            blockType: Scratch.BlockType.REPORTER,
            text: 'confidence of [CLASS]',
            arguments: { CLASS: { type: Scratch.ArgumentType.STRING, menu: 'classes', defaultValue: firstClass() } },
          },
          {
            opcode: 'labelIs',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'label is [CLASS]?',
            arguments: { CLASS: { type: Scratch.ArgumentType.STRING, menu: 'classes', defaultValue: firstClass() } },
          },
          {
            opcode: 'photosOf',
            blockType: Scratch.BlockType.REPORTER,
            text: 'number of photos of [CLASS]',
            arguments: { CLASS: { type: Scratch.ArgumentType.STRING, menu: 'classes', defaultValue: firstClass() } },
          },
          {
            opcode: 'isTrained',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'image model is trained?',
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
          classes: { acceptReporters: true, items: 'classMenu' },
          camera: { acceptReporters: false, items: ['on', 'off', 'on flipped'] },
        },
      };
    }

    classMenu() {
      const names = classes.map((c) => c.name);
      return names.length ? names : ['Class 1'];
    }

    async openTrainer() {
      await loadVision();
      await openTrainer();
    }

    whenSees({ CLASS, CONFIDENCE }) {
      if (!vision) {
        loadVision().catch(() => {});
        return false;
      }
      if (!model) return false;
      vision.want('image');
      const features = vision.latestImage();
      if (!features) return false;
      classify(features);
      return confidence(CLASS) > Scratch.Cast.toNumber(CONFIDENCE);
    }

    async classify() {
      const v = await loadVision();
      if (!model) {
        last = { label: '', confidences: {} };
        return;
      }
      const features = await v.embedNow();
      if (features) classify(features);
    }

    imageLabel() {
      return last.label;
    }

    confidenceOf({ CLASS }) {
      return confidence(CLASS);
    }

    labelIs({ CLASS }) {
      return last.label !== '' && same(last.label, CLASS);
    }

    photosOf({ CLASS }) {
      const c = findClass(CLASS);
      return c ? c.samples.length : 0;
    }

    isTrained() {
      return !!model;
    }

    async setCamera({ STATE }) {
      (await loadVision()).setCamera(STATE);
    }

    async setTransparency({ VALUE }) {
      (await loadVision()).setTransparency(Scratch.Cast.toNumber(VALUE));
    }
  }

  Scratch.extensions.register(new ImageModel());
})(Scratch);
