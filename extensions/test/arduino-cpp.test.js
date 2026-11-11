// Blocks → Arduino C++: the code students see for the robotics programs.
import { describe, it, expect } from 'vitest';
import { generate as generateCode, pinNumber } from '../src/runtime/arduino/cpp.js';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

// With ARDUINO_CLI set, every generated program is also compiled for the Uno: it must be real C++.
let sketches = 0;
function generate(blocks, opts) {
  const out = generateCode(blocks, opts);
  if (process.env.ARDUINO_CLI) {
    const name = `check${++sketches}`;
    const dir = `firmware/build/cpp-check/${name}`;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(`${dir}/${name}.ino`, out.code);
    try {
      execFileSync(process.env.ARDUINO_CLI, ['compile', '-b', 'arduino:avr:uno', dir], { stdio: 'pipe' });
    } catch (e) {
      throw new Error(`does not compile:
${out.code}
${e.stderr}`);
    }
  }
  return out;
}

// A tiny block builder in the VM's shape: {id: {opcode, inputs, fields, next, topLevel, shadow}}.
function program(build) {
  const blocks = {};
  let n = 0;
  const id = () => `b${++n}`;
  const add = (b) => { const i = id(); blocks[i] = { inputs: {}, fields: {}, next: null, topLevel: false, shadow: false, ...b, id: i }; return i; };
  const num = (v) => add({ opcode: 'math_number', shadow: true, fields: { NUM: { value: String(v) } } });
  const txt = (v) => add({ opcode: 'text', shadow: true, fields: { TEXT: { value: String(v) } } });
  const menu = (name, v) => add({ opcode: `blockmlArduino_menu_${name}`, shadow: true, fields: { [name]: { value: String(v) } } });
  const inp = (blockId) => ({ block: blockId, shadow: blockId });
  const seq = (ids) => { for (let i = 0; i < ids.length - 1; i++) blocks[ids[i]].next = ids[i + 1]; return ids[0] || null; };
  const h = {
    setup: (pin, part) => add({ opcode: 'blockmlArduino_setupPin', inputs: { PIN: inp(menu('pins', pin)), PART: inp(menu('parts', part)) } }),
    write: (pin, level) => add({ opcode: 'blockmlArduino_digitalWrite', inputs: { PIN: inp(menu('pins', pin)), LEVEL: inp(menu('levels', level)) } }),
    pwm: (pin, value) => add({ opcode: 'blockmlArduino_analogWrite', inputs: { PIN: inp(menu('pwmPins', pin)), VALUE: inp(typeof value === 'string' ? value : num(value)) } }),
    servo: (pin, angle) => add({ opcode: 'blockmlArduino_servo', inputs: { PIN: inp(menu('pins', pin)), ANGLE: inp(typeof angle === 'string' ? angle : num(angle)) } }),
    dread: (pin) => add({ opcode: 'blockmlArduino_digitalRead', inputs: { PIN: inp(menu('pins', pin)) } }),
    aread: (pin) => add({ opcode: 'blockmlArduino_analogRead', inputs: { PIN: inp(menu('analogPins', pin)) } }),
    dist: (t, e) => add({ opcode: 'blockmlArduino_distance', inputs: { TRIG: inp(menu('pins', t)), ECHO: inp(menu('pins', e)) } }),
    print: (v) => add({ opcode: 'blockmlArduino_print', inputs: { TEXT: inp(typeof v === 'string' && v.startsWith('b') ? v : txt(v)) } }),
    wait: (s) => add({ opcode: 'control_wait', inputs: { DURATION: inp(num(s)) } }),
    forever: (body) => add({ opcode: 'control_forever', inputs: { SUBSTACK: { block: seq(body) } } }),
    repeat: (times, body) => add({ opcode: 'control_repeat', inputs: { TIMES: inp(num(times)), SUBSTACK: { block: seq(body) } } }),
    ifElse: (cond, a, b) => add({ opcode: 'control_if_else', inputs: { CONDITION: { block: cond }, SUBSTACK: { block: seq(a) }, SUBSTACK2: { block: seq(b) } } }),
    if: (cond, a) => add({ opcode: 'control_if', inputs: { CONDITION: { block: cond }, SUBSTACK: { block: seq(a) } } }),
    op: (opcode, a, b) => add({ opcode, inputs: { OPERAND1: { block: a, shadow: a }, OPERAND2: { block: b, shadow: b } } }),
    and: (a, b) => add({ opcode: 'operator_and', inputs: { OPERAND1: { block: a }, OPERAND2: { block: b } } }),
    num, txt,
    variable: (name) => add({ opcode: 'data_variable', fields: { VARIABLE: { id: 'v_' + name, value: name } } }),
    set: (name, v) => add({ opcode: 'data_setvariableto', fields: { VARIABLE: { id: 'v_' + name, value: name } }, inputs: { VALUE: { block: v, shadow: v } } }),
    change: (name, v) => add({ opcode: 'data_changevariableby', fields: { VARIABLE: { id: 'v_' + name, value: name } }, inputs: { VALUE: inp(num(v)) } }),
    move: () => add({ opcode: 'motion_movesteps', inputs: { STEPS: inp(num(10)) } }),
  };
  const body = build(h);
  const flag = add({ opcode: 'event_whenflagclicked', topLevel: true });
  blocks[flag].next = seq(body);
  return blocks;
}

const squash = (code) => code.replace(/\s+/g, ' ');

describe('blocks to Arduino C++', () => {
  it('pin names: A0 is 14', () => {
    expect(pinNumber('A0')).toBe(14);
    expect(pinNumber('a5')).toBe(19);
    expect(pinNumber('8')).toBe(8);
  });

  it('Robotics 1 Blink: set up before forever is setup(), forever is loop()', () => {
    const { code, unsupported } = generate(program((b) => [
      b.setup('8', 'LED'),
      b.forever([b.write('8', 'HIGH'), b.wait(1), b.write('8', 'LOW'), b.wait(1)]),
    ]));
    expect(unsupported).toEqual([]);
    expect(code).toContain('const int LED = 8;  // LED');
    expect(squash(code)).toContain('void setup() { pinMode(LED, OUTPUT); }');
    expect(squash(code)).toContain('void loop() { digitalWrite(LED, HIGH); delay(1000); digitalWrite(LED, LOW); delay(1000); }');
  });

  it('Robotics 2 traffic light: three named LEDs, and a pin with no set up gets pinMode added', () => {
    const { code } = generate(program((b) => [
      b.setup('10', 'red LED'), b.setup('9', 'yellow LED'), b.setup('8', 'green LED'),
      b.forever([b.write('8', 'HIGH'), b.wait(5), b.write('8', 'LOW'), b.write('9', 'HIGH'), b.wait(1.5), b.write('9', 'LOW'), b.write('12', 'HIGH')]),
    ]));
    expect(code).toContain('const int RED_LED = 10;');
    expect(code).toContain('const int GREEN_LED = 8;');
    expect(code).toContain('delay(1500);');
    expect(code).toContain('digitalWrite(YELLOW_LED, HIGH);');
    expect(code).toContain('pinMode(12, OUTPUT);  // added');
  });

  it('Robotics 3 fire alarm: digitalRead in if/else', () => {
    const { code } = generate(program((b) => [
      b.setup('2', 'flame sensor'), b.setup('8', 'buzzer'),
      b.forever([b.ifElse(b.op('operator_equals', b.dread('2'), b.num(0)), [b.write('8', 'HIGH')], [b.write('8', 'LOW')])]),
    ]));
    expect(code).toContain('pinMode(FLAME, INPUT);');
    expect(squash(code)).toContain('if (digitalRead(FLAME) == 0) { digitalWrite(BUZZER, HIGH); } else { digitalWrite(BUZZER, LOW); }');
  });

  it('Robotics 4 servo sweep: Servo library, attach, a for loop with a variable', () => {
    const { code } = generate(program((b) => [
      b.set('angle', b.num(0)),
      b.forever([b.repeat(180, [b.servo('9', b.variable('angle')), b.change('angle', 1), b.wait(0.015)]), b.set('angle', b.num(0))]),
    ]));
    expect(code).toContain('#include <Servo.h>');
    expect(code).toContain('Servo servo9;');
    expect(code).toContain('int angle = 0;');
    expect(squash(code)).toContain('servo9.attach(9);');
    expect(squash(code)).toContain('for (int i = 0; i < 180; i++) { servo9.write(angle); angle++; delay(15); }');
  });

  it('Robotics 5 distance on the Serial Monitor: a float, the HC-SR04 helper, Serial.begin', () => {
    const { code } = generate(program((b) => [
      b.forever([b.set('cm', b.dist('7', '6')), b.print(b.variable('cm')), b.wait(0.3)]),
    ]));
    expect(code).toContain('float cm = 0;');
    expect(code).toContain('float readDistanceCm(int trig, int echo)');
    expect(code).toContain('cm = readDistanceCm(7, 6);');
    expect(code).toContain('Serial.begin(9600);');
    expect(code).toContain('Serial.println(cm);');
  });

  it('Robotics 6 parking barrier: and, comparisons, servo', () => {
    const { code } = generate(program((b) => [
      b.servo('9', 0),
      b.forever([b.set('d', b.dist('7', '6')), b.ifElse(b.and(b.op('operator_gt', b.variable('d'), b.num(0)), b.op('operator_lt', b.variable('d'), b.num(15))), [b.servo('9', 90), b.wait(3)], [b.servo('9', 0)])]),
    ]));
    expect(squash(code)).toContain('if ((d > 0) && (d < 15)) { servo9.write(90); delay(3000); } else { servo9.write(0); }');
    expect(squash(code)).toContain('void setup() { servo9.attach(9); servo9.write(0); }');
  });

  it('Robotics 7 street light: analogRead on A0 with a threshold', () => {
    const { code } = generate(program((b) => [
      b.setup('A0', 'light sensor (LDR)'), b.setup('8', 'LED'),
      b.forever([b.set('light', b.aread('A0')), b.if(b.op('operator_lt', b.variable('light'), b.num(400)), [b.write('8', 'HIGH')])]),
    ]));
    expect(code).toContain('const int LDR = A0;');
    expect(code).toContain('light = analogRead(LDR);');
    expect(code).toContain('int light = 0;');
    expect(code).toContain('// LDR: light sensor (analog pins need no pinMode)');
  });

  it('PWM fade, a run-once program, and blocks with no Arduino version', () => {
    const { code, unsupported } = generate(program((b) => [b.pwm('9', 64), b.move()]));
    expect(code).toContain('analogWrite(9, 64);');
    expect(code).toContain('pinMode(9, OUTPUT);  // added');
    expect(code).toContain('nothing here: your blocks have no "forever"');
    expect(unsupported).toEqual(['motion_movesteps']);
  });
});

// The robotics lesson projects (built by starters/build-robotics.mjs): their C++ is
// generated from the saved project, and with ARDUINO_CLI set it must compile.
describe('robotics lesson projects', async () => {
  const { unzipSync, strFromU8 } = await import('fflate');
  const { blocksFromSb3 } = await import('../src/runtime/arduino/cpp.js');
  const dir = new URL('../../gui/static/lessons/robotics/', import.meta.url);
  const slugs = fs.existsSync(dir) ? fs.readdirSync(dir).filter((d) => /^(r\d|s51)/.test(d)) : [];
  it('are built', () => expect(slugs.length).toBe(8));
  for (const slug of slugs) {
    for (const file of ['project.sb3', 'fix-the-bug.sb3']) {
      const url = new URL(`${slug}/${file}`, dir);
      if (!fs.existsSync(url)) continue;
      it(`${slug}/${file} becomes Arduino C++ with no Studio-only blocks`, () => {
        const json = JSON.parse(strFromU8(unzipSync(fs.readFileSync(url))['project.json']));
        const sprite = json.targets.find((t) => !t.isStage);
        const { code, unsupported } = generate(blocksFromSb3(sprite.blocks));
        expect(unsupported).toEqual([]);
        expect(code).toContain('void setup()');
        expect(code).toMatch(/void loop\(\) \{\n  \S/); // the loop has code
      });
    }
  }
});
