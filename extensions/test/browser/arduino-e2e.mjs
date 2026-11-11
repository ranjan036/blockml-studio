// End-to-end test of the Arduino blocks in the real editor (headless Chrome):
//  1. the parking barrier lesson on the virtual board (sliders → gate, lights);
//  2. "Connect board" with a blank board → "Prepare board" installs the firmware over a
//     fake Web Serial port into a simulated Uno (test/sim/fake-serial.mjs);
//  3. the same project on that "real" board: the simulated servo pulses and LED pins;
//  4. "Show Arduino C++".
// Needs a built editor in gui/build with the extensions and lessons copied in, built with
// STARTER_BASE=http://localhost:<port>/extensions/. Run: node test/browser/arduino-e2e.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { build } from 'esbuild';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const WebSocket = require('../../../gui/node_modules/ws');
const PORT = Number(process.env.PORT || 8177);
const ROOT = path.resolve('../gui/build');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = process.env.SHOTS || '.';

// ---- static server with clean URLs (like Vercel) ------------------------------------
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm', '.sb3': 'application/octet-stream', '.hex': 'text/plain', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(ROOT, p);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  else if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(PORT, r));

const fake = await build({ entryPoints: ['test/sim/fake-serial.mjs'], bundle: true, format: 'iife', write: false, target: 'es2020' });
const fakeSerial = fake.outputFiles[0].text;

// ---- Chrome over the DevTools protocol -----------------------------------------------
const profile = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'ard-e2e-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9333', `--user-data-dir=${profile}`, '--no-first-run', '--window-size=1400,900', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
let ws;
for (let i = 0; i < 50 && !ws; i++) {
  try {
    const list = await (await fetch('http://127.0.0.1:9333/json')).json();
    const page = list.find((t) => t.type === 'page');
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((ok, no) => { ws.once('open', ok); ws.once('error', no); });
  } catch { ws = null; await new Promise((r) => setTimeout(r, 200)); }
}
let id = 0;
const pending = new Map();
const logs = [];
ws.on('message', (data) => {
  const m = JSON.parse(data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.consoleAPICalled') logs.push(`${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description).join(' ')}`);
  if (m.method === 'Runtime.exceptionThrown') logs.push(`exception: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
});
const cdp = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id;
  pending.set(n, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
  ws.send(JSON.stringify({ id: n, method, params }));
});
const js = async (expression) => {
  const r = await cdp('Runtime.evaluate', { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(what, expression, ms = 15000) {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) {
    try { last = await js(expression); if (last) return last; } catch (e) { last = e.message; }
    await sleep(150);
  }
  throw new Error(`timed out: ${what} (last: ${JSON.stringify(last)})`);
}
async function shot(name) {
  const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, name), Buffer.from(data, 'base64'));
}

const results = [];
const check = (name, ok, detail = '') => { results.push([name, ok, detail]); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };

try {
  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: fakeSerial });
  // 0. A new project: the Arduino sprite is in the sprite library, and adding the Arduino
  //    extension adds it; pin 13 lights its "L".
  await cdp('Page.navigate', { url: `http://localhost:${PORT}/editor` });
  await until('editor ready', `return window.vm && vm.runtime.targets.length >= 2 && !!document.querySelector('[aria-label="Choose a Sprite"]')`, 40000);
  await sleep(1000);
  const sprites = `return vm.runtime.targets.filter(t => t.isOriginal && !t.isStage).map(t => t.getName()).join(',')`;
  const clickText = (sel, text) => `const e = [...document.querySelectorAll(${JSON.stringify(sel)})].find(x => x.innerText.trim() === ${JSON.stringify(text)}); if (!e) return false; e.click(); return true;`;
  await js(`document.querySelector('[aria-label="Choose a Sprite"]').click(); return true;`);
  await until('sprite library shows Arduino Uno', clickText('[class*="library-item_library-item_"]', 'Arduino Uno'), 15000);
  await until('Arduino sprite added from the library', `return ${sprites.replace('return ', '')}.split(',').includes('Arduino')`);
  const costumes = await js(`return vm.runtime.targets.find(t => t.getName() === 'Arduino').getCostumes().map(c => c.name).join(',')`);
  check('sprite library: "Arduino Uno" adds the Arduino sprite (costumes uno, uno L on)', costumes === 'uno,uno L on', costumes);
  await shot('arduino-sprite-library.png');
  // Delete it again and select the cat, then add the extension.
  await js(`const t = vm.runtime.targets.find(t => t.getName() === 'Arduino'); vm.deleteSprite(t.id); vm.setEditingTarget(vm.runtime.targets.find(t => !t.isStage).id); return true;`);
  await sleep(500);
  await js(`document.querySelector('[title="Add Extension"]').click(); return true;`);
  await until('extension library shows Arduino', `const e = [...document.querySelectorAll('[class*="library-item_library-item_"]')].find(x => x.innerText.includes('Robotics: LEDs')); if (!e) return false; e.click(); return true;`, 15000);
  await until('Arduino sprite added with the extension', `return vm.extensionManager.isExtensionLoaded('blockmlArduino') && ${sprites.replace('return ', '')}.split(',').includes('Arduino')`);
  const all = await js(sprites);
  check('adding the Arduino extension adds the Arduino sprite once', all === 'Sprite1,Arduino', all);
  check('the student keeps editing their own sprite', (await js('return vm.editingTarget.getName()')) === 'Sprite1');
  await js(`vm.runtime._primitives.blockmlArduino_digitalWrite({PIN: '13', LEVEL: 'HIGH'}); return true;`);
  await sleep(400);
  const lit = await js(`const t = vm.runtime.targets.find(t => t.getName() === 'Arduino'); return t.getCostumes()[t.currentCostume].name`);
  check('pin 13 HIGH lights the sprite L LED', lit === 'uno L on', lit);
  await shot('arduino-sprite-added.png');
  await js(`vm.runtime._primitives.blockmlArduino_digitalWrite({PIN: '13', LEVEL: 'LOW'}); return true;`);
  await sleep(300);
  check('pin 13 LOW turns it off', (await js(`const t = vm.runtime.targets.find(t => t.getName() === 'Arduino'); return t.getCostumes()[t.currentCostume].name`)) === 'uno');

  const project = `http://localhost:${PORT}/lessons/robotics/r6-parking-barrier/project.sb3`;
  await cdp('Page.navigate', { url: `http://localhost:${PORT}/editor?project_url=${encodeURIComponent(project)}` });
  await until('project loaded with the Arduino extension', `return window.vm && vm.extensionManager.isExtensionLoaded('blockmlArduino') && vm.runtime.targets.some(t => t.sprite && t.sprite.name === 'Arduino')`, 40000);
  await sleep(1500);

  // Panel helpers (the real DOM the student uses).
  const panelText = `return document.querySelector('.bml-ard') ? document.querySelector('.bml-ard').innerText : ''`;
  const card = (title) => `return [...document.querySelectorAll('.bml-ard-part')].map(e => e.innerText.replace(/\\n/g, ' | ')).find(t => t.includes(${JSON.stringify(title)})) || ''`;
  const setSlider = (title, value) => `const c = [...document.querySelectorAll('.bml-ard-part')].find(e => e.innerText.includes(${JSON.stringify(title)}));
    const r = c.querySelector('input[type=range]'); r.value = ${value}; r.dispatchEvent(new Event('input')); return true;`;

  // 1. Virtual board.
  await js('vm.greenFlag(); return true;');
  await until('panel shows the virtual board', `${panelText.replace('return ', 'const t = ')}; return /virtual arduino uno/i.test(t) && t.includes('distance')`);
  await until('far away: gate closed, red on', `const s=[...document.querySelectorAll('.bml-ard-part')].map(e=>e.innerText); return s.some(t=>t.includes('servo')&&t.includes('0°')) && s.some(t=>t.includes('red LED')&&t.includes('HIGH'))`);
  check('virtual: nothing near → gate at 0°, red LED HIGH', true);
  await js(setSlider('distance', 8));
  await until('car near → gate opens', `const s=[...document.querySelectorAll('.bml-ard-part')].map(e=>e.innerText); return s.some(t=>t.includes('servo')&&t.includes('90°')) && s.some(t=>t.includes('green LED')&&t.includes('HIGH'))`);
  check('virtual: car at 8 cm → gate at 90°, green LED HIGH', true);
  await shot('arduino-virtual.png');
  await js(setSlider('distance', 100));
  await until('car gone → gate closes', `const s=[...document.querySelectorAll('.bml-ard-part')].map(e=>e.innerText); return s.some(t=>t.includes('servo')&&t.includes('0°'))`, 8000);
  check('virtual: car gone → gate back to 0° after 3 s', true);
  await js('vm.stopAll(); return true;');

  // 2. Connect a blank board, prepare it.
  await js(`[...document.querySelectorAll('.bml-ard button')].find(b => b.textContent === 'Connect board').click(); return true;`);
  await until('blank board → asks to prepare', `${panelText.replace('return ', 'const t = ')}; return t.includes('Prepare board')`, 15000);
  check('blank board: Studio asks to "Prepare board"', true);
  await js(`[...document.querySelectorAll('.bml-ard button')].find(b => b.textContent === 'Prepare board').click(); return true;`);
  const prepared = await until('firmware installed and connected', `const m = document.querySelector('.bml-ard-modal'); return m && /ready|did not answer|failed|not/i.test(m.innerText) && m.innerText`, 60000);
  check('Prepare board installs the firmware and connects', /board is ready/.test(prepared), prepared.replace(/\s+/g, ' ').slice(0, 120));
  check('the simulated board was programmed once', (await js('return __sim.flashes')) === 1);
  await shot('arduino-prepared.png');
  await js(`document.querySelectorAll('.bml-ard-modal').forEach(m => m.remove()); return true;`);
  check('panel says the Uno is connected', /arduino uno \(usb\)/i.test(await js(panelText)));

  // 3. The project on the (simulated) real board.
  await js('__sim.cm = 100; vm.greenFlag(); return true;');
  await sleep(1500);
  const pulse = () => js('return __sim.uno.lastPulse(9)');
  const lv = (pin) => js(`return __sim.uno.levels[${pin}]`);
  let p0 = await pulse();
  check('board: nothing near → servo pulse ≈ 544 µs (0°)', Math.abs(p0 - 544) < 25, `${p0?.toFixed(0)} µs`);
  check('board: red LED pin 10 HIGH, green pin 11 LOW', (await lv(10)) === true && (await lv(11)) === false);
  await js('__sim.cm = 9; return true;');
  await sleep(1200);
  const p90 = await pulse();
  check('board: car at 9 cm → servo pulse ≈ 1472 µs (90°)', Math.abs(p90 - 1472) < 25, `${p90?.toFixed(0)} µs`);
  check('board: green LED pin 11 HIGH, red pin 10 LOW', (await lv(11)) === true && (await lv(10)) === false);
  const reading = await js(card('distance'));
  check('panel shows the real reading', /\d+(\.\d)? cm/.test(reading), reading);
  await shot('arduino-real.png');
  await js('__sim.cm = 0; return true;'); // nothing in front: no echo
  await sleep(4500);
  const pNone = await pulse();
  check('board: no echo (0) does not open the gate', Math.abs(pNone - 544) < 25, `${pNone?.toFixed(0)} µs`);
  await js('vm.stopAll(); return true;');
  await sleep(500);
  check('stop: every output LOW on the board', !(await lv(8)) && !(await lv(10)) && !(await lv(11)));

  // 4. Show Arduino C++.
  await js(`[...document.querySelectorAll('.bml-ard-head button')].find(b => b.textContent === 'C++').click(); return true;`);
  const code = await until('C++ window', `const m = document.querySelector('.bml-ard-modal pre'); return m && m.innerText`);
  check('Show Arduino C++: setup() and loop() with the servo and sensor', code.includes('servo9.write(90);') && code.includes('readDistanceCm(7, 6)') && code.includes('void loop()'));
  await shot('arduino-cpp.png');

  // 5. Every robotics lesson project on the virtual board (a fresh page: no board).
  const parts = `return [...document.querySelectorAll('.bml-ard-part')].map(e => e.innerText.replace(/\\s+/g, ' ')).join(' / ')`;
  const lessons = [
    ['r1-led-blink', 'Blink: pin 8 LED goes HIGH', [], '', /pin 8 · LED HIGH/],
    ['r2-traffic-light', 'Traffic light: green on first, red and yellow off', [], '', /pin 8 · green LED HIGH.*pin 9 · yellow LED LOW.*pin 10 · red LED LOW/],
    ['r3-fire-alarm', 'Fire alarm: clicking "no flame" → FLAME! sounds the buzzer', [`[...document.querySelectorAll('.bml-ard-switch')].find(b => b.textContent === 'no flame').click(); return true;`], '', /FLAME!.*BEEP.*red LED HIGH/],
    ['r4-servo', 'Servo: the angle sweeps', [], '', /servo [1-9]\d*°/],
    ['r5-ultrasonic', 'Ultrasonic: distance on the Serial Monitor', [], '', /Distance: 50 cm/],
    ['r7-street-light', 'Street light: dark (slider 100) → lamp HIGH', [`const r = [...document.querySelectorAll('.bml-ard-part')].find(e => e.innerText.includes('light sensor')).querySelector('input'); r.value = 100; r.dispatchEvent(new Event('input')); return true;`], '', /pin 8 · LED HIGH/],
    ['s51-showcase', 'Showcase dustbin: hand at 10 cm opens the lid to 100°', [`const r = [...document.querySelectorAll('.bml-ard-part')].find(e => e.innerText.includes('distance')).querySelector('input'); r.value = 10; r.dispatchEvent(new Event('input')); return true;`], '', /servo 100°/],
  ];
  for (const [slug, name, actions, , want] of lessons) {
    const url = `http://localhost:${PORT}/lessons/robotics/${slug}/project.sb3`;
    await cdp('Page.navigate', { url: `http://localhost:${PORT}/editor?project_url=${encodeURIComponent(url)}` });
    await until(`${slug} loaded`, `return window.vm && vm.extensionManager.isExtensionLoaded('blockmlArduino') && vm.runtime.targets.some(t => t.sprite && t.sprite.name === 'Arduino')`, 40000);
    await sleep(800);
    await js('vm.greenFlag(); return true;');
    await until(`${slug} panel`, `return document.querySelectorAll('.bml-ard-part').length > 0`);
    await sleep(400);
    for (const a of actions) await js(a);
    let seen = '';
    const end = Date.now() + 8000;
    while (Date.now() < end) {
      seen = (await js(parts)) + ' / ' + (await js(`return document.querySelector('.bml-ard-serial pre').innerText`));
      if (want.test(seen)) break;
      await sleep(150);
    }
    check(`lesson ${name}`, want.test(seen), want.test(seen) ? '' : seen.slice(0, 200));
    await js('vm.stopAll(); return true;');
  }
} catch (err) {
  check('test ran to the end', false, err.message);
  await shot('arduino-failure.png').catch(() => {});
} finally {
  const errors = logs.filter((l) => /exception|error/i.test(l) && !/favicon|DevTools|sw\.js|serviceWorker/i.test(l));
  if (errors.length) console.log('browser errors:\n  ' + errors.slice(0, 15).join('\n  '));
  ws.close();
  chrome.kill();
  server.close();
  const failed = results.filter((r) => !r[1]).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}
