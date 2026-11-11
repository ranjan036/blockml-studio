// The Arduino blocks' runtime: sends each block to the real board when one is connected
// (Web Serial + the CODE AI firmware), or to the virtual board otherwise, and keeps the
// panel up to date. Built into arduino-runtime.js.
import { BoardModel, Panel } from './board.js';
import { BoardClient, webLink } from './serial.js';
import { parseHex, upload } from './stk500.js';
import { VirtualCar } from './car.js';
import { generate, pinNumber, isInputPart } from './cpp.js';

export { generate, pinNumber, parseHex };

// The CODE AI firmware this Studio needs (firmware/codeai-board: 2 added tone()).
const FIRMWARE_VERSION = 2;

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

  // The virtual car (a "Car" sprite driven by motors A and B), for home practice.
  const car = new VirtualCar(vm, model, {
    onCrash: (what) => { model.print(`CRASH! The car hit ${what}.`); panel.update(); },
  });
  panel.car = car;

  /** Adds the Car and a Wall sprite to the project (the "Add virtual car" button). */
  async function addCar() {
    const names = new Set(vm.runtime.targets.filter((t) => t.isOriginal).map((t) => t.getName()));
    const editing = vm.editingTarget;
    for (const [name, file] of [['Car', 'arduino-car.sprite3'], ['Wall', 'arduino-wall.sprite3']]) {
      if (names.has(name)) continue;
      const res = await fetch(new URL(`../sprites/${file}`, base).href);
      if (!res.ok) throw new Error(`Could not load the ${name} sprite`);
      await vm.addSprite(await res.arrayBuffer());
    }
    if (editing && editing.isOriginal) vm.setEditingTarget(editing.id);
    model.print('Virtual car added: motor A = left wheel, motor B = right wheel; its distance sensor looks ahead.');
    hiddenByUser = false;
    panel.show();
  }

  // The "Arduino" sprite's on-board LED (costume "uno L on") follows pin 13, like the real "L".
  function boardSpriteL(on) {
    for (const t of vm.runtime.targets) {
      if (!t.isOriginal || t.isStage || t.getName() !== 'Arduino') continue;
      const want = on ? 'uno L on' : 'uno';
      const now = t.getCostumes()[t.currentCostume];
      if (!now || (now.name !== 'uno' && now.name !== 'uno L on')) continue; // the student changed costumes: leave it
      const i = t.getCostumeIndexByName(want);
      if (i >= 0 && i !== t.currentCostume) t.setCostume(i);
    }
  }

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
    const version = await c.hello();
    return { c, version };
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
      const { c, version } = await openClient(p);
      if (version < FIRMWARE_VERSION) {
        await c.close();
        if (!quiet) {
          panel.setMode('problem', version
            ? 'This board has an older CODE AI program. Press "Prepare board" to update it (3 seconds).'
            : 'This board does not have the CODE AI program yet (or the Arduino IDE replaced it). Press "Prepare board" once.');
        }
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

  const modeFor = (part) => (part === 'input pull-up' ? 2 : isInputPart(part) ? 0 : 1);

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

  let startTime = performance.now();
  vm.runtime.on('PROJECT_START', () => { hiddenByUser = false; startTime = performance.now(); });
  vm.runtime.on('PROJECT_STOP_ALL', () => {
    model.reset(false);
    boardSpriteL(false);
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
    addCar: () => addCar().catch((e) => { model.print(String(e.message || e)); panel.update(); }),
    connected: real,
    setupPin(pin, part) {
      model.setup(pin, part);
      touch();
      return send(`P ${pin} ${modeFor(part)}`);
    },
    digitalWrite(pin, level) {
      model.write(pin, level);
      if (pin === 13) boardSpriteL(!!level);
      touch();
      return send(`D ${pin} ${level ? 1 : 0}`);
    },
    analogWrite(pin, value) {
      model.pwm(pin, value);
      if (pin === 13) boardSpriteL(model.outputs.get(pin).pwm > 0);
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
      if (!real()) {
        const cm = car.distance();
        if (cm !== null) { // measured by the virtual car
          model.sonars.set(`${trig},${echo}`, cm);
          model.sonarFromCar = true;
          return cm;
        }
        model.sonarFromCar = false;
        return model.distance(trig, echo);
      }
      const key = `${trig},${echo}`;
      if (!model.sonars.has(key)) model.sonars.set(key, 0);
      return ask(`U ${trig} ${echo}`, `u${key}`);
    },
    print(text) {
      model.print(text);
      touch();
    },
    /** Milliseconds since the green flag (like millis() since the board started). */
    millis: () => Math.floor(performance.now() - startTime),
    tone(pin, hz) {
      model.tone(pin, hz);
      touch();
      return send(`T ${pin} ${hz > 0 ? Math.round(hz) : 0}`);
    },
    setupMotor(name, en, in1, in2) {
      model.setupMotor(name, en, in1, in2);
      touch();
      for (const p of [en, in1, in2]) send(`P ${p} 1`);
      return undefined;
    },
    /** dir 1 forward, -1 backward, 0 stop; speed 0-255 on the driver's enable pin. */
    runMotor(name, dir, speed) {
      const m = model.motors.get(name);
      if (!m) {
        if (!model.serial.includes(`Set up motor ${name} first.`)) model.print(`Set up motor ${name} first.`);
        touch();
        return undefined;
      }
      const sp = dir ? Math.max(0, Math.min(255, Math.round(speed))) : 0;
      model.write(m.in1, dir > 0);
      model.write(m.in2, dir < 0);
      model.pwm(m.en, sp);
      touch();
      send(`D ${m.in1} ${dir > 0 ? 1 : 0}`);
      send(`D ${m.in2} ${dir < 0 ? 1 : 0}`);
      return send(`W ${m.en} ${sp}`);
    },
  };
}
