// The Arduino panel: one floating window that shows the board (virtual or real), its
// parts, the sensors (sliders and switches on the virtual board, live readings on the real
// one), the Serial Monitor, and the buttons to connect, prepare the board and see the C++.
import { isInputPart } from './cpp.js';

const LED_COLORS = { 'LED': '#ef4444', 'red LED': '#ef4444', 'yellow LED': '#facc15', 'green LED': '#22c55e', 'white LED': '#f8fafc', 'output': '#f97316' };
const pinLabel = (n) => (n >= 14 ? `A${n - 14}` : `pin ${n}`);

/** What the board's pins are doing. The virtual board is this model; the real one mirrors it. */
export class BoardModel {
  constructor() { this.reset(true); }

  reset(all = false) {
    if (all) {
      this.parts = new Map(); // pin → part name from "set up pin"
      this.outputs = new Map(); // pin → {level, pwm}
      this.servos = new Map(); // pin → angle
      this.inputs = new Map(); // pin → 0/1 (virtual switches)
      this.analog = new Map(); // pin → 0-1023
      this.sonars = new Map(); // "trig,echo" → cm (0 = nothing in front)
      this.reads = new Map(); // what the real board said last: key → value
      this.serial = [];
    } else {
      for (const o of this.outputs.values()) { o.level = 0; o.pwm = 0; }
    }
  }

  setup(pin, part) {
    this.parts.set(pin, part);
    if (isInputPart(part)) {
      this.outputs.delete(pin);
      if (part === 'light sensor (LDR)') { if (!this.analog.has(pin)) this.analog.set(pin, 600); }
      else if (!this.inputs.has(pin)) this.inputs.set(pin, part === 'flame sensor' || part === 'input pull-up' ? 1 : 0);
    } else {
      this.inputs.delete(pin);
      if (!this.outputs.has(pin)) this.outputs.set(pin, { level: 0, pwm: 0 });
    }
  }

  write(pin, level) {
    this.servos.delete(pin);
    this.outputs.set(pin, { level: level ? 1 : 0, pwm: level ? 255 : 0 });
  }

  pwm(pin, value) {
    this.servos.delete(pin);
    const v = Math.max(0, Math.min(255, Math.round(value)));
    this.outputs.set(pin, { level: v > 0 ? 1 : 0, pwm: v });
  }

  servo(pin, angle) {
    this.outputs.delete(pin);
    this.servos.set(pin, Math.max(0, Math.min(180, Math.round(angle))));
  }

  digitalRead(pin) {
    if (!this.inputs.has(pin)) this.inputs.set(pin, this.parts.get(pin) === 'input pull-up' ? 1 : 0);
    return this.inputs.get(pin);
  }

  analogRead(pin) {
    if (!this.analog.has(pin)) this.analog.set(pin, 600);
    return this.analog.get(pin);
  }

  distance(trig, echo) {
    const key = `${trig},${echo}`;
    if (!this.sonars.has(key)) this.sonars.set(key, 50);
    return this.sonars.get(key);
  }

  print(text) {
    this.serial.push(String(text));
    if (this.serial.length > 200) this.serial.splice(0, this.serial.length - 200);
  }
}

const CSS = `
.bml-ard{position:fixed;right:16px;bottom:16px;width:340px;max-width:calc(100vw - 32px);max-height:calc(100vh - 32px);display:flex;flex-direction:column;z-index:500;background:#fff;border:2px solid #0f766e;border-radius:12px;box-shadow:0 10px 30px rgba(15,23,42,.3);font:13px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif;color:#0f172a}
.bml-ard *{box-sizing:border-box}
.bml-ard-head{display:flex;align-items:center;gap:6px;padding:6px 8px;background:#0f766e;color:#fff;border-radius:9px 9px 0 0;cursor:move;user-select:none;touch-action:none}
.bml-ard-title{font-weight:700;flex:1}
.bml-ard-head button{background:rgba(255,255,255,.18);color:#fff;border:0;border-radius:6px;padding:3px 8px;font:inherit;cursor:pointer}
.bml-ard-head button:hover{background:rgba(255,255,255,.3)}
.bml-ard-body{overflow:auto;padding:8px;display:flex;flex-direction:column;gap:8px}
.bml-ard.min .bml-ard-body{display:none}
.bml-ard-status{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:6px 8px;border-radius:8px;background:#f1f5f9}
.bml-ard-dot{width:10px;height:10px;border-radius:50%;background:#94a3b8;flex:none}
.bml-ard-status.real .bml-ard-dot{background:#22c55e}
.bml-ard-status.problem{background:#fef3c7}
.bml-ard-status.problem .bml-ard-dot{background:#f59e0b}
.bml-ard-status span{flex:1;min-width:150px}
.bml-ard button.act,.bml-ard-modal button.act{background:#0f766e;color:#fff;border:0;border-radius:6px;padding:4px 10px;font:inherit;font-weight:600;cursor:pointer}
.bml-ard button.act.light,.bml-ard-modal button.act.light{background:#e2e8f0;color:#0f172a}
.bml-ard button.act:disabled,.bml-ard-modal button.act:disabled{opacity:.5;cursor:default}
.bml-ard-board{background:#0e7490;border-radius:10px;padding:8px;color:#e0f2fe}
.bml-ard-board h4{margin:0 0 6px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#a5f3fc;display:flex;justify-content:space-between}
.bml-ard-parts{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:6px}
.bml-ard-part{background:#164e63;border-radius:8px;padding:6px;display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;min-height:86px}
.bml-ard-part.wide{grid-column:1/-1;flex-direction:row;text-align:left;min-height:0}
.bml-ard-part .name{font-size:11px;color:#cffafe}
.bml-ard-part .val{font-size:12px;font-weight:700;color:#fff}
.bml-ard-led{width:28px;height:28px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:#334155;transition:box-shadow .05s}
.bml-ard-part input[type=range]{width:100%}
.bml-ard-part.wide input[type=range]{flex:1}
.bml-ard-part.wide .name{min-width:90px}
.bml-ard-part label{display:flex;align-items:center;gap:4px;font-size:11px;color:#cffafe}
.bml-ard-switch{border:0;border-radius:6px;padding:3px 8px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;background:#e2e8f0;color:#0f172a}
.bml-ard-switch.on{background:#f97316;color:#fff}
.bml-ard-empty{font-size:12px;color:#a5f3fc;padding:4px}
.bml-ard-serial{border:1px solid #cbd5e1;border-radius:8px;overflow:hidden}
.bml-ard-serial h4{margin:0;padding:4px 8px;background:#f1f5f9;font-size:12px;display:flex;justify-content:space-between;align-items:center}
.bml-ard-serial pre{margin:0;padding:6px 8px;height:90px;overflow:auto;font:12px/1.35 ui-monospace,Consolas,monospace;background:#0f172a;color:#d1fae5;white-space:pre-wrap}
.bml-ard-modal{position:fixed;inset:0;z-index:610;background:rgba(15,23,42,.55);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 12px;font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif}
.bml-ard-card{background:#fff;border-radius:12px;max-width:760px;width:100%;padding:16px;display:flex;flex-direction:column;gap:10px;color:#0f172a}
.bml-ard-card h3{margin:0;font-size:18px}
.bml-ard-card pre{margin:0;max-height:60vh;overflow:auto;background:#0f172a;color:#e2e8f0;border-radius:8px;padding:12px;font:13px/1.45 ui-monospace,Consolas,monospace;white-space:pre}
.bml-ard-card .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.bml-ard-card p{margin:0;color:#334155}
.bml-ard-bar{height:10px;background:#e2e8f0;border-radius:5px;overflow:hidden}
.bml-ard-bar div{height:100%;background:#0f766e;width:0}
.c-com{color:#94a3b8}.c-key{color:#f9a8d4}.c-num{color:#fcd34d}.c-str{color:#86efac}.c-fn{color:#7dd3fc}
`;

function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v);
  }
  for (const kid of kids) if (kid != null) e.append(kid);
  return e;
}

/** Colours C++ for the code window (comments, keywords, numbers, strings, functions). */
export function highlight(code) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return code.split('\n').map((line) => {
    const i = line.indexOf('//');
    const body = i >= 0 ? line.slice(0, i) : line;
    const comment = i >= 0 ? `<span class="c-com">${esc(line.slice(i))}</span>` : '';
    const parts = body.split(/("[^"]*")/);
    const html = parts.map((p, n) => {
      if (n % 2) return `<span class="c-str">${esc(p)}</span>`;
      return esc(p)
        .replace(/\b(void|int|float|long|const|String|bool|true|false|if|else|for|while|return|HIGH|LOW|OUTPUT|INPUT|INPUT_PULLUP)\b/g, '<span class="c-key">$1</span>')
        .replace(/\b(\d+\.?\d*)\b/g, '<span class="c-num">$1</span>')
        .replace(/\b([a-zA-Z_]\w*)(?=\()/g, '<span class="c-fn">$1</span>')
        .replace(/(#include)/g, '<span class="c-key">$1</span>');
    }).join('');
    return html + comment;
  }).join('\n');
}

export class Panel {
  constructor(model, actions) {
    this.model = model;
    this.actions = actions; // {connect, disconnect, prepare, showCode, inputChanged}
    this.mode = 'virtual'; // 'virtual' | 'real' | 'problem'
    this.message = '';
    this.root = null;
    this.muted = false;
    this.audio = null;
    this.osc = null;
    this.dirty = false;
  }

  ensure() {
    if (this.root) return;
    if (!document.getElementById('bml-ard-css')) document.head.append(el('style', { id: 'bml-ard-css', text: CSS }));
    this.statusText = el('span');
    this.statusButtons = el('div', { class: 'row', style: 'display:flex;gap:6px' });
    this.status = el('div', { class: 'bml-ard-status' }, el('div', { class: 'bml-ard-dot' }), this.statusText, this.statusButtons);
    this.parts = el('div', { class: 'bml-ard-parts' });
    this.muteBtn = el('button', { class: 'bml-ard-switch', style: 'padding:1px 6px;font-size:10px', title: 'Sound of the virtual buzzer', onclick: () => { this.muted = !this.muted; this.render(); } });
    this.boardTitle = el('span');
    this.board = el('div', { class: 'bml-ard-board' }, el('h4', {}, this.boardTitle, this.muteBtn), this.parts);
    this.serial = el('pre');
    const serialBox = el('div', { class: 'bml-ard-serial' },
      el('h4', {}, el('span', { text: 'Serial Monitor' }), el('button', { class: 'act light', style: 'padding:1px 8px;font-size:11px', text: 'Clear', onclick: () => { this.model.serial = []; this.render(); } })),
      this.serial);
    const head = el('div', { class: 'bml-ard-head' },
      el('div', { class: 'bml-ard-title', text: 'Arduino' }),
      el('button', { text: 'C++', title: 'Show the Arduino C++ for these blocks', onclick: () => this.actions.showCode() }),
      el('button', { text: '–', title: 'Make smaller', onclick: () => this.root.classList.toggle('min') }),
      el('button', { text: '×', title: 'Hide (an Arduino block shows it again)', onclick: () => this.hide() }));
    this.root = el('div', { class: 'bml-ard' }, head, el('div', { class: 'bml-ard-body' }, this.status, this.board, serialBox));
    this.drag(head);
    document.body.append(this.root);
    this.render();
  }

  drag(handle) {
    let sx = 0, sy = 0, ox = 0, oy = 0, on = false;
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      const r = this.root.getBoundingClientRect();
      on = true; sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', (e) => {
      if (!on) return;
      const x = Math.max(0, Math.min(window.innerWidth - 80, ox + e.clientX - sx));
      const y = Math.max(0, Math.min(window.innerHeight - 40, oy + e.clientY - sy));
      Object.assign(this.root.style, { left: `${x}px`, top: `${y}px`, right: 'auto', bottom: 'auto' });
    });
    handle.addEventListener('pointerup', () => { on = false; });
  }

  show() { this.ensure(); this.root.style.display = ''; this.render(); }
  hide() { if (this.root) this.root.style.display = 'none'; this.sound(false); }
  get visible() { return !!this.root && this.root.style.display !== 'none'; }

  setMode(mode, message = '') {
    this.mode = mode;
    this.message = message;
    this.render();
  }

  /** Redraw soon (many blocks can change the board in one frame). */
  update() {
    if (!this.root || this.dirty) return;
    this.dirty = true;
    requestAnimationFrame(() => { this.dirty = false; this.render(); });
  }

  render() {
    if (!this.root) return;
    const m = this.model;
    const real = this.mode === 'real';
    this.status.className = `bml-ard-status ${this.mode}`;
    this.statusButtons.replaceChildren();
    if (real) {
      this.statusText.textContent = this.message || 'Arduino Uno connected by USB.';
      this.statusButtons.append(el('button', { class: 'act light', text: 'Disconnect', onclick: () => this.actions.disconnect() }));
    } else if (this.mode === 'problem') {
      this.statusText.textContent = this.message;
      this.statusButtons.append(el('button', { class: 'act', text: 'Prepare board', onclick: () => this.actions.prepare() }));
    } else {
      this.statusText.textContent = this.message || 'Virtual board: no Arduino connected. Try your program here.';
      this.statusButtons.append(el('button', { class: 'act', text: 'Connect board', onclick: () => this.actions.connect() }));
    }
    this.boardTitle.textContent = real ? 'Arduino Uno (USB)' : 'Virtual Arduino Uno';
    this.muteBtn.style.display = real ? 'none' : '';
    this.muteBtn.textContent = this.muted ? 'sound off' : 'sound on';
    this.muteBtn.className = 'bml-ard-switch' + (this.muted ? '' : ' on');

    const cards = [];
    const pins = new Set([...m.parts.keys(), ...m.outputs.keys(), ...m.servos.keys(), ...m.inputs.keys(), ...m.analog.keys()]);
    let buzzing = false;
    for (const pin of [...pins].sort((a, b) => a - b)) {
      const part = m.parts.get(pin);
      if (m.servos.has(pin)) { cards.push(this.servoCard(pin, m.servos.get(pin))); continue; }
      if (m.analog.has(pin) || part === 'light sensor (LDR)') { cards.push(this.analogCard(pin, part)); continue; }
      if (m.inputs.has(pin) || (part && isInputPart(part))) { cards.push(this.inputCard(pin, part)); continue; }
      const o = m.outputs.get(pin) || { level: 0, pwm: 0 };
      if (part === 'buzzer') { if (o.level) buzzing = true; cards.push(this.buzzerCard(pin, o)); continue; }
      cards.push(this.ledCard(pin, part || (pin === 13 ? 'LED' : 'output'), o));
    }
    for (const [key, cm] of m.sonars) cards.push(this.sonarCard(key, cm));
    if (!cards.length) cards.push(el('div', { class: 'bml-ard-empty', text: 'Parts appear here when your blocks use a pin.' }));
    this.parts.replaceChildren(...cards);
    this.sound(buzzing && !real && !this.muted && this.visible);

    const atBottom = this.serial.scrollTop + this.serial.clientHeight >= this.serial.scrollHeight - 4;
    this.serial.textContent = m.serial.join('\n');
    if (atBottom) this.serial.scrollTop = this.serial.scrollHeight;
  }

  ledCard(pin, part, o) {
    const color = LED_COLORS[part] || '#ef4444';
    const bright = o.pwm / 255;
    const led = el('div', { class: 'bml-ard-led' });
    if (bright > 0) {
      led.style.background = color;
      led.style.opacity = String(0.35 + 0.65 * bright);
      led.style.boxShadow = `0 0 ${6 + 14 * bright}px ${color}`;
    }
    const val = o.pwm > 0 && o.pwm < 255 ? `PWM ${o.pwm}` : o.level ? 'HIGH' : 'LOW';
    return el('div', { class: 'bml-ard-part' }, el('div', { class: 'name', text: `${pinLabel(pin)} · ${part}` }), led, el('div', { class: 'val', text: val }));
  }

  buzzerCard(pin, o) {
    const svg = `<svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="#1e293b" stroke="#94a3b8" stroke-width="2"/><circle cx="15" cy="15" r="3" fill="#94a3b8"/>${o.level ? '<path d="M3 5 Q0 15 3 25 M27 5 Q30 15 27 25" stroke="#fbbf24" stroke-width="2" fill="none"/>' : ''}</svg>`;
    const icon = el('div');
    icon.innerHTML = svg;
    return el('div', { class: 'bml-ard-part' }, el('div', { class: 'name', text: `${pinLabel(pin)} · buzzer` }), icon, el('div', { class: 'val', text: o.level ? 'BEEP' : 'quiet' }));
  }

  servoCard(pin, angle) {
    const a = (angle * Math.PI) / 180;
    const x = 30 + 22 * Math.cos(Math.PI - a), y = 32 - 22 * Math.sin(Math.PI - a);
    const icon = el('div');
    icon.innerHTML = `<svg width="60" height="38" viewBox="0 0 60 38"><path d="M8 32 A22 22 0 0 1 52 32" fill="none" stroke="#67e8f9" stroke-dasharray="2 3"/><rect x="22" y="28" width="16" height="9" rx="2" fill="#1d4ed8"/><line x1="30" y1="32" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="30" cy="32" r="3" fill="#0f172a"/></svg>`;
    return el('div', { class: 'bml-ard-part' }, el('div', { class: 'name', text: `${pinLabel(pin)} · servo` }), icon, el('div', { class: 'val', text: `${angle}°` }));
  }

  inputCard(pin, part = 'input') {
    const m = this.model;
    const name = el('div', { class: 'name', text: `${pinLabel(pin)} · ${part}` });
    if (this.mode === 'real') {
      const v = m.reads.get(`d${pin}`);
      return el('div', { class: 'bml-ard-part' }, name, el('div', { class: 'val', text: v === undefined ? '–' : v ? 'HIGH (1)' : 'LOW (0)' }));
    }
    const level = m.inputs.get(pin) ?? 0;
    let label, on;
    if (part === 'flame sensor') { on = level === 0; label = on ? 'FLAME!' : 'no flame'; } // most modules: LOW = flame
    else if (part === 'input pull-up') { on = level === 0; label = on ? 'pressed' : 'not pressed'; }
    else if (part === 'button') { on = level === 1; label = on ? 'pressed' : 'not pressed'; }
    else { on = level === 1; label = on ? 'HIGH' : 'LOW'; }
    const btn = el('button', {
      class: 'bml-ard-switch' + (on ? ' on' : ''), text: label, title: 'Click to change what the sensor says',
      onclick: () => { m.inputs.set(pin, level ? 0 : 1); this.actions.inputChanged?.(); this.render(); },
    });
    return el('div', { class: 'bml-ard-part' }, name, btn, el('div', { class: 'val', text: `reads ${level}` }));
  }

  analogCard(pin, part) {
    const m = this.model;
    const title = part === 'light sensor (LDR)' ? `${pinLabel(pin)} · light sensor` : `${pinLabel(pin)} · analog`;
    if (this.mode === 'real') {
      const v = m.reads.get(`a${pin}`);
      return el('div', { class: 'bml-ard-part wide' }, el('div', { class: 'name', text: title }), el('div', { class: 'val', text: v === undefined ? '–' : String(v) }));
    }
    const v = m.analogRead(pin);
    const out = el('div', { class: 'val', style: 'min-width:36px;text-align:right', text: String(v) });
    const range = el('input', { type: 'range', min: '0', max: '1023', value: String(v), title: part === 'light sensor (LDR)' ? 'dark ← → bright' : '0 – 1023' });
    range.addEventListener('input', () => { m.analog.set(pin, Number(range.value)); out.textContent = range.value; this.actions.inputChanged?.(); });
    return el('div', { class: 'bml-ard-part wide' }, el('div', { class: 'name', text: part === 'light sensor (LDR)' ? `${title} (dark ↔ bright)` : title }), range, out);
  }

  sonarCard(key, cm) {
    const m = this.model;
    const [trig, echo] = key.split(',').map(Number);
    const title = `distance · Trig ${trig} Echo ${echo}`;
    if (this.mode === 'real') {
      const v = m.reads.get(`u${key}`);
      return el('div', { class: 'bml-ard-part wide' }, el('div', { class: 'name', text: title }), el('div', { class: 'val', text: v === undefined ? '–' : `${v} cm` }));
    }
    const none = cm === 0;
    const out = el('div', { class: 'val', style: 'min-width:50px;text-align:right', text: none ? '0 (none)' : `${cm} cm` });
    const range = el('input', { type: 'range', min: '2', max: '200', value: String(none ? 200 : cm), title: 'How far the object is' });
    if (none) range.disabled = true;
    range.addEventListener('input', () => { m.sonars.set(key, Number(range.value)); out.textContent = `${range.value} cm`; this.actions.inputChanged?.(); });
    const box = el('input', { type: 'checkbox' });
    box.checked = none;
    box.addEventListener('change', () => { m.sonars.set(key, box.checked ? 0 : Number(range.value) || 50); this.actions.inputChanged?.(); this.render(); });
    return el('div', { class: 'bml-ard-part wide', style: 'flex-wrap:wrap' },
      el('div', { class: 'name', text: title }), range, out, el('label', {}, box, 'nothing in front (no echo)'));
  }

  sound(on) {
    if (!on) { if (this.osc) { this.osc.stop(); this.osc = null; } return; }
    if (this.osc) return;
    try {
      this.audio ||= new AudioContext();
      const osc = this.audio.createOscillator();
      const gain = this.audio.createGain();
      osc.type = 'square';
      osc.frequency.value = 2300; // about what an active buzzer plays
      gain.gain.value = 0.04;
      osc.connect(gain).connect(this.audio.destination);
      osc.start();
      this.osc = osc;
    } catch { /* no sound */ }
  }

  // Windows.
  modal(...content) {
    this.ensure();
    const card = el('div', { class: 'bml-ard-card' }, ...content);
    const back = el('div', { class: 'bml-ard-modal', onclick: (e) => { if (e.target === back) back.remove(); } }, card);
    document.body.append(back);
    return back;
  }

  codeWindow(code, unsupported) {
    const pre = el('pre');
    pre.innerHTML = highlight(code);
    const copied = el('span', { style: 'color:#0f766e;font-weight:600' });
    let back;
    const copy = async () => {
      try { await navigator.clipboard.writeText(code); copied.textContent = 'Copied!'; } catch { copied.textContent = 'Select the code and press Ctrl+C.'; }
    };
    const download = () => {
      const a = el('a', { href: URL.createObjectURL(new Blob([code], { type: 'text/plain' })), download: 'my_robot.ino' });
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    back = this.modal(
      el('div', { class: 'row', style: 'justify-content:space-between' }, el('h3', { text: 'Your blocks in Arduino C++' }), el('button', { class: 'act light', text: 'Close', onclick: () => back.remove() })),
      el('p', { text: 'This is the same program written the way the Arduino IDE needs it. "when green flag clicked" blocks before "forever" are setup(); the inside of "forever" is loop().' }),
      unsupported.length ? el('p', { style: 'color:#b45309', text: `Some blocks only work in Studio, not on an Arduino (shown as comments): ${unsupported.map((o) => o.replace(/^[a-z]+_/, '')).join(', ')}.` }) : null,
      pre,
      el('div', { class: 'row' }, el('button', { class: 'act', text: 'Copy', onclick: copy }), el('button', { class: 'act light', text: 'Download .ino', onclick: download }), copied),
      el('p', { style: 'font-size:13px', text: 'To run it without Studio: paste it into the Arduino IDE, choose Arduino Uno and press Upload. That replaces the CODE AI program on the board, so press "Prepare board" in Studio before using blocks again.' }));
  }

  progressWindow(title) {
    const bar = el('div');
    const words = el('p', { text: 'Starting…' });
    const back = this.modal(el('h3', { text: title }), words, el('div', { class: 'bml-ard-bar' }, bar));
    return {
      set(f, w) { bar.style.width = `${Math.round(f * 100)}%`; if (w) words.textContent = w; },
      done(text, ok) {
        words.textContent = text;
        words.style.color = ok ? '#0f766e' : '#b91c1c';
        back.querySelector('.bml-ard-card').append(el('div', { class: 'row' }, el('button', { class: 'act', text: 'OK', onclick: () => back.remove() })));
      },
    };
  }
}
