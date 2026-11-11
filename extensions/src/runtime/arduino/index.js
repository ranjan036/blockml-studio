// The Arduino blocks' runtime: sends each block to the real board when one is connected
// (Web Serial + the CODE AI firmware), or to the virtual board otherwise, and keeps the
// panel up to date. Built into arduino-runtime.js.
import { BoardModel, Panel } from './board.js';
import { BoardClient, webLink } from './serial.js';
import { parseHex, upload } from './stk500.js';
import { generate, pinNumber } from './cpp.js';

export { generate, pinNumber, parseHex };

export function createArduino(vm, { base }) {
  const model = new BoardModel();
  let client = null;
  let port = null;
  let busy = false; // connecting or installing
  let hiddenByUser = false;
  const hasSerial = typeof navigator !== 'undefined' && 'serial' in navigator;

  const panel = new Panel(model, {
    connect: () => connect(),
    disconnect: () => disconnect('Disconnected. The virtual board is back.'),
    prepare: () => prepare(),
    showCode: () => showCode(),
    inputChanged: () => {},
  });
  const origHide = panel.hide.bind(panel);
  panel.hide = () => { hiddenByUser = true; origHide(); };

  const real = () => !!client && !client.closed;

  function touch() {
    if (!hiddenByUser && !panel.visible) panel.show();
    panel.update();
  }

  async function openClient(p) {
    const c = new BoardClient(p, {
      onClose: () => {
        if (client === c) {
          client = null;
          panel.setMode('virtual', 'The board was disconnected. Your blocks use the virtual board now.');
        }
      },
    });
    await c.open();
    const ours = await c.hello();
    return { c, ours };
  }

  async function connect(p = null, quiet = false) {
    if (busy) return;
    if (!hasSerial) {
      panel.show();
      panel.setMode('virtual', 'Connecting a board needs Chrome or Edge on a computer. The virtual board works here.');
      return;
    }
    busy = true;
    try {
      if (!p) p = await navigator.serial.requestPort();
      port = p;
      if (client) await client.close();
      client = null;
      if (!quiet) { panel.show(); panel.setMode('virtual', 'Connecting… the board restarts.'); }
      const { c, ours } = await openClient(p);
      if (!ours) {
        await c.close();
        if (!quiet) panel.setMode('problem', 'This board does not have the CODE AI program yet (or the Arduino IDE replaced it). Press "Prepare board" once.');
        return;
      }
      client = c;
      // The board just restarted: set up the pins the project already set up.
      for (const [pin, part] of model.parts) client.send(`P ${pin} ${modeFor(part)}`).catch(() => {});
      panel.setMode('real');
    } catch (err) {
      if (err && err.name === 'NotFoundError') { panel.setMode(real() ? 'real' : 'virtual'); return; } // chooser closed
      console.warn('BlockML Studio: could not connect to the board', err);
      if (!quiet) {
        panel.setMode('virtual', /already open|Failed to open/i.test(String(err && err.message))
          ? 'The board is busy: close the Arduino IDE\'s Serial Monitor (or another Studio tab) and try again.'
          : 'Could not connect to the board. Unplug it, plug it in again and press Connect board.');
      }
    } finally {
      busy = false;
    }
  }

  async function disconnect(message) {
    const c = client;
    client = null;
    if (c) await c.close();
    panel.setMode('virtual', message);
  }

  async function prepare() {
    if (busy) return;
    if (!hasSerial) return connect();
    let p = port;
    try {
      if (!p) p = await navigator.serial.requestPort();
    } catch { return; }
    busy = true;
    if (client) { const c = client; client = null; await c.close(); }
    const win = panel.progressWindow('Preparing the board');
    try {
      const res = await fetch(base + 'arduino/codeai-board.hex');
      if (!res.ok) throw new Error('Could not load the CODE AI program. Is the internet on (or Studio saved for offline use)?');
      const program = parseHex(await res.text());
      await upload(webLink(p), program, (f, words) => win.set(f, words));
      win.set(1, 'Done.');
      busy = false;
      await connect(p);
      win.done(real() ? 'The board is ready. Your blocks now run on it.' : 'Installed, but the board did not answer afterwards. Unplug it, plug it in again and press Connect board.', real());
    } catch (err) {
      console.warn('BlockML Studio: could not prepare the board', err);
      win.done(String((err && err.message) || err), false);
      panel.setMode('problem', 'The board is not ready yet. Check the USB cable and press "Prepare board" again.');
    } finally {
      busy = false;
    }
  }

  function showCode() {
    const targets = vm.runtime.targets.filter((t) => t.isOriginal);
    const uses = (t) => Object.values(t.blocks._blocks).some((b) => b.opcode.startsWith('blockmlArduino_'));
    const target = (vm.editingTarget && uses(vm.editingTarget)) ? vm.editingTarget : targets.find(uses) || vm.editingTarget;
    if (!target) return;
    const stage = vm.runtime.getTargetForStage();
    const variables = { ...(stage ? stage.variables : {}), ...target.variables };
    const { code, unsupported } = generate(target.blocks._blocks, { variables });
    panel.codeWindow(code, unsupported);
  }

  const modeFor = (part) => (part === 'input pull-up' ? 2 : ['flame sensor', 'button', 'input', 'light sensor (LDR)'].includes(part) ? 0 : 1);

  // Writes do not wait for the board unless many are waiting (so loops stay fast).
  function send(command) {
    if (!real()) return undefined;
    const p = client.send(command).catch((e) => console.warn('BlockML Studio: board', e.message));
    return client.busy > 8 ? p : undefined;
  }
  async function ask(command, key) {
    try {
      const v = await client.send(command);
      if (v.startsWith('err')) return 0;
      const n = Number(v);
      model.reads.set(key, n);
      panel.update();
      return n;
    } catch {
      return 0;
    }
  }

  vm.runtime.on('PROJECT_START', () => { hiddenByUser = false; });
  vm.runtime.on('PROJECT_STOP_ALL', () => {
    model.reset(false);
    send('Z');
    panel.update();
  });
  if (hasSerial) {
    navigator.serial.addEventListener('disconnect', (e) => {
      if (client && e.target === client.port) client.shutDown();
    });
    // A board this browser was allowed to use before: connect to it quietly.
    navigator.serial.getPorts().then((ports) => { if (ports.length === 1) connect(ports[0], true); }).catch(() => {});
  }

  return {
    model,
    panel,
    connect: () => connect(),
    showCode,
    showBoard() { hiddenByUser = false; panel.show(); },
    connected: real,
    setupPin(pin, part) {
      model.setup(pin, part);
      touch();
      return send(`P ${pin} ${modeFor(part)}`);
    },
    digitalWrite(pin, level) {
      model.write(pin, level);
      touch();
      return send(`D ${pin} ${level ? 1 : 0}`);
    },
    analogWrite(pin, value) {
      model.pwm(pin, value);
      touch();
      return send(`W ${pin} ${model.outputs.get(pin).pwm}`);
    },
    servo(pin, angle) {
      model.servo(pin, angle);
      touch();
      return send(`S ${pin} ${model.servos.get(pin)}`);
    },
    digitalRead(pin) {
      touch();
      if (!real()) return model.digitalRead(pin);
      if (!model.inputs.has(pin)) model.inputs.set(pin, 0);
      return ask(`R ${pin}`, `d${pin}`);
    },
    analogRead(pin) {
      touch();
      if (!real()) return model.analogRead(pin);
      if (!model.analog.has(pin)) model.analog.set(pin, 0);
      return ask(`A ${pin}`, `a${pin}`);
    },
    distance(trig, echo) {
      touch();
      if (!real()) return model.distance(trig, echo);
      const key = `${trig},${echo}`;
      if (!model.sonars.has(key)) model.sonars.set(key, 0);
      return ask(`U ${trig} ${echo}`, `u${key}`);
    },
    print(text) {
      model.print(text);
      touch();
    },
  };
}
