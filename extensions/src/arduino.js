// BlockML Studio – Arduino extension (MIT).
// Blocks for the Fundamental Robotics sessions (42–50): LEDs, traffic lights, buzzer and
// flame sensor, servo, HC-SR04 distance, LDR. The blocks are named like the Arduino C++
// they stand for (digital write, analog read…), and "Show Arduino C++" shows that code.
// With an Arduino Uno on USB (Chrome or Edge, Web Serial) the blocks drive the real board
// through the CODE AI firmware; without one they drive a virtual board for home practice.
(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('The Arduino extension must be loaded by BlockML Studio');
  }

  const BASE = document.currentScript && document.currentScript.src
    ? new URL('.', document.currentScript.src).href
    : new URL('extensions/', location.href).href;

  const vm = Scratch.vm;
  let lib = null;
  let board = null;
  const ready = (async () => {
    lib = await import(BASE + 'arduino-runtime.js');
    board = lib.createArduino(vm, { base: BASE });
    return board;
  })();
  ready.catch((e) => console.error('BlockML Studio: the Arduino blocks could not start', e));

  const PINS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
  const PWM_PINS = ['3', '5', '6', '9', '10', '11'];
  const ANALOG_PINS = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
  // Keep in step with PARTS in runtime/arduino/cpp.js.
  const PARTS = ['LED', 'red LED', 'yellow LED', 'green LED', 'white LED', 'buzzer', 'vibration motor', 'pump / relay', 'output',
    'button', 'flame sensor', 'PIR motion sensor', 'tilt switch', 'input', 'input pull-up',
    'light sensor (LDR)', 'potentiometer', 'soil moisture sensor', 'thermistor', 'gas sensor (MQ)', 'water-level probe', 'line sensor (IR)'];

  /** "8", 8, "A0" → pin number 2–19, or null (pins 0 and 1 are the USB cable's). */
  function pin(value) {
    const s = String(value).trim().toUpperCase();
    const a = /^A([0-5])$/.exec(s);
    const n = a ? 14 + Number(a[1]) : Math.round(Scratch.Cast.toNumber(s));
    return n >= 2 && n <= 19 ? n : null;
  }
  const analogPin = (value) => {
    const s = String(value).trim().toUpperCase();
    if (/^[0-5]$/.test(s)) return 14 + Number(s); // analog read pin 0 = A0, as in C++
    const n = pin(s);
    return n !== null && n >= 14 ? n : null;
  };
  const level = (value) => {
    const s = String(value).trim().toUpperCase();
    if (s === 'HIGH' || s === 'ON') return 1;
    if (s === 'LOW' || s === 'OFF') return 0;
    return Scratch.Cast.toNumber(value) ? 1 : 0;
  };
  const withBoard = async (fn) => fn(board || (await ready));

  const ICON = 'data:image/svg+xml;base64,' + btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect x="2" y="2" width="36" height="36" rx="8" fill="#ccfbf1"/>' +
    '<rect x="7" y="10" width="26" height="20" rx="3" fill="#0e7490"/>' +
    '<g fill="#fde68a">' + [0, 1, 2, 3, 4, 5].map((i) => `<rect x="${10 + i * 3.6}" y="11.5" width="2" height="2.4" rx=".4"/>`).join('') + '</g>' +
    '<rect x="16" y="17" width="9" height="7" rx="1" fill="#0f172a"/><circle cx="11" cy="25" r="2.2" fill="#f87171"/></svg>');

  const PIN = (d) => ({ type: Scratch.ArgumentType.STRING, menu: 'pins', defaultValue: d });

  class Arduino {
    getInfo() {
      return {
        id: 'blockmlArduino',
        name: 'Arduino',
        color1: '#0f766e',
        color2: '#0d6b63',
        color3: '#115e59',
        menuIconURI: ICON,
        blocks: [
          { blockType: Scratch.BlockType.BUTTON, text: 'Connect Arduino board', func: 'connectButton' },
          { blockType: Scratch.BlockType.BUTTON, text: 'Show board', func: 'boardButton' },
          { blockType: Scratch.BlockType.BUTTON, text: 'Show Arduino C++', func: 'codeButton' },
          { blockType: Scratch.BlockType.BUTTON, text: 'Add virtual car', func: 'carButton' },
          { blockType: Scratch.BlockType.LABEL, text: 'Outputs (pinMode, digitalWrite…)' },
          {
            opcode: 'setupPin',
            blockType: Scratch.BlockType.COMMAND,
            text: 'set up pin [PIN] as [PART]',
            arguments: { PIN: PIN('8'), PART: { type: Scratch.ArgumentType.STRING, menu: 'parts', defaultValue: 'LED' } },
          },
          {
            opcode: 'digitalWrite',
            blockType: Scratch.BlockType.COMMAND,
            text: 'digital write pin [PIN] to [LEVEL]',
            arguments: { PIN: PIN('8'), LEVEL: { type: Scratch.ArgumentType.STRING, menu: 'levels', defaultValue: 'HIGH' } },
          },
          {
            opcode: 'analogWrite',
            blockType: Scratch.BlockType.COMMAND,
            text: 'analog write (PWM) pin [PIN] value [VALUE]',
            arguments: { PIN: { type: Scratch.ArgumentType.STRING, menu: 'pwmPins', defaultValue: '9' }, VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 128 } },
          },
          {
            opcode: 'servo',
            blockType: Scratch.BlockType.COMMAND,
            text: 'servo on pin [PIN] to [ANGLE] degrees',
            arguments: { PIN: PIN('9'), ANGLE: { type: Scratch.ArgumentType.ANGLE, defaultValue: 90 } },
          },
          {
            opcode: 'playTone',
            blockType: Scratch.BlockType.COMMAND,
            text: 'play tone [HZ] Hz on pin [PIN]',
            arguments: { HZ: { type: Scratch.ArgumentType.NUMBER, defaultValue: 440 }, PIN: PIN('8') },
          },
          {
            opcode: 'stopTone',
            blockType: Scratch.BlockType.COMMAND,
            text: 'stop tone on pin [PIN]',
            arguments: { PIN: PIN('8') },
          },
          { blockType: Scratch.BlockType.LABEL, text: 'Motors (L298N / L293D driver)' },
          {
            opcode: 'setupMotor',
            blockType: Scratch.BlockType.COMMAND,
            text: 'set up motor [MOTOR] : speed pin [EN] direction pins [IN1] [IN2]',
            arguments: {
              MOTOR: { type: Scratch.ArgumentType.STRING, menu: 'motors', defaultValue: 'A' },
              EN: { type: Scratch.ArgumentType.STRING, menu: 'pwmPins', defaultValue: '9' },
              IN1: PIN('5'),
              IN2: PIN('6'),
            },
          },
          {
            opcode: 'runMotor',
            blockType: Scratch.BlockType.COMMAND,
            text: 'motor [MOTOR] [DIR] at speed [SPEED]',
            arguments: {
              MOTOR: { type: Scratch.ArgumentType.STRING, menu: 'motors', defaultValue: 'A' },
              DIR: { type: Scratch.ArgumentType.STRING, menu: 'directions', defaultValue: 'forward' },
              SPEED: { type: Scratch.ArgumentType.NUMBER, defaultValue: 200 },
            },
          },
          { blockType: Scratch.BlockType.LABEL, text: 'Inputs (sensors)' },
          {
            opcode: 'digitalRead',
            blockType: Scratch.BlockType.REPORTER,
            text: 'digital read pin [PIN]',
            arguments: { PIN: PIN('2') },
          },
          {
            opcode: 'analogRead',
            blockType: Scratch.BlockType.REPORTER,
            text: 'analog read pin [PIN]',
            arguments: { PIN: { type: Scratch.ArgumentType.STRING, menu: 'analogPins', defaultValue: 'A0' } },
          },
          {
            opcode: 'distance',
            blockType: Scratch.BlockType.REPORTER,
            text: 'distance in cm: Trig [TRIG] Echo [ECHO]',
            arguments: { TRIG: PIN('7'), ECHO: PIN('6') },
          },
          { blockType: Scratch.BlockType.LABEL, text: 'Time and numbers' },
          {
            opcode: 'millis',
            blockType: Scratch.BlockType.REPORTER,
            text: 'millis (ms since start)',
          },
          {
            opcode: 'map',
            blockType: Scratch.BlockType.REPORTER,
            text: 'map [VALUE] from [FROMLOW] – [FROMHIGH] to [TOLOW] – [TOHIGH]',
            arguments: {
              VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 512 },
              FROMLOW: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              FROMHIGH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1023 },
              TOLOW: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              TOHIGH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 255 },
            },
          },
          { blockType: Scratch.BlockType.LABEL, text: 'Serial Monitor' },
          {
            opcode: 'print',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Serial print [TEXT]',
            arguments: { TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Hello, robot!' } },
          },
          {
            opcode: 'connected',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'real board connected?',
          },
        ],
        menus: {
          pins: { acceptReporters: true, items: PINS },
          pwmPins: { acceptReporters: true, items: PWM_PINS },
          analogPins: { acceptReporters: true, items: ANALOG_PINS },
          levels: { acceptReporters: true, items: ['HIGH', 'LOW'] },
          parts: { acceptReporters: true, items: PARTS },
          motors: { acceptReporters: false, items: ['A', 'B'] },
          directions: { acceptReporters: true, items: ['forward', 'backward', 'stop'] },
        },
      };
    }

    connectButton() { withBoard((b) => b.connect()); }
    boardButton() { withBoard((b) => b.showBoard()); }
    codeButton() { withBoard((b) => b.showCode()); }
    carButton() { withBoard((b) => b.addCar()); }

    setupPin({ PIN, PART }) {
      const p = pin(PIN);
      if (p === null) return undefined;
      return withBoard((b) => b.setupPin(p, String(PART)));
    }

    digitalWrite({ PIN, LEVEL }) {
      const p = pin(PIN);
      if (p === null) return undefined;
      return withBoard((b) => b.digitalWrite(p, level(LEVEL)));
    }

    analogWrite({ PIN, VALUE }) {
      const p = pin(PIN);
      if (p === null) return undefined;
      return withBoard((b) => b.analogWrite(p, Scratch.Cast.toNumber(VALUE)));
    }

    servo({ PIN, ANGLE }) {
      const p = pin(PIN);
      if (p === null) return undefined;
      return withBoard((b) => b.servo(p, Scratch.Cast.toNumber(ANGLE)));
    }

    digitalRead({ PIN }) {
      const p = pin(PIN);
      if (p === null) return 0;
      if (board && !board.connected()) return board.digitalRead(p); // virtual board: no waiting
      return withBoard((b) => b.digitalRead(p));
    }

    analogRead({ PIN }) {
      const p = analogPin(PIN);
      if (p === null) return 0;
      if (board && !board.connected()) return board.analogRead(p);
      return withBoard((b) => b.analogRead(p));
    }

    distance({ TRIG, ECHO }) {
      const t = pin(TRIG), e = pin(ECHO);
      if (t === null || e === null) return 0;
      if (board && !board.connected()) return board.distance(t, e);
      return withBoard((b) => b.distance(t, e));
    }

    playTone({ HZ, PIN }) {
      const p = pin(PIN);
      if (p === null) return undefined;
      return withBoard((b) => b.tone(p, Scratch.Cast.toNumber(HZ)));
    }

    stopTone({ PIN }) {
      const p = pin(PIN);
      if (p === null) return undefined;
      return withBoard((b) => b.tone(p, 0));
    }

    setupMotor({ MOTOR, EN, IN1, IN2 }) {
      const en = pin(EN), a = pin(IN1), c = pin(IN2);
      if (en === null || a === null || c === null) return undefined;
      return withBoard((b) => b.setupMotor(String(MOTOR) === 'B' ? 'B' : 'A', en, a, c));
    }

    runMotor({ MOTOR, DIR, SPEED }) {
      const dir = String(DIR).toLowerCase();
      const d = dir.startsWith('f') ? 1 : dir.startsWith('b') ? -1 : 0;
      return withBoard((b) => b.runMotor(String(MOTOR) === 'B' ? 'B' : 'A', d, Scratch.Cast.toNumber(SPEED)));
    }

    millis() {
      return board ? board.millis() : 0;
    }

    map({ VALUE, FROMLOW, FROMHIGH, TOLOW, TOHIGH }) {
      // Arduino's map(): whole numbers, the fraction cut off (not rounded).
      const n = Scratch.Cast.toNumber;
      const x = Math.trunc(n(VALUE)), a = Math.trunc(n(FROMLOW)), b = Math.trunc(n(FROMHIGH));
      const c = Math.trunc(n(TOLOW)), d = Math.trunc(n(TOHIGH));
      if (a === b) return c;
      return Math.trunc(((x - a) * (d - c)) / (b - a)) + c;
    }

    print({ TEXT }) {
      if (board) return board.print(TEXT);
      return withBoard((b) => b.print(TEXT));
    }

    connected() {
      return !!board && board.connected();
    }
  }

  Scratch.extensions.register(new Arduino());
})(Scratch);
