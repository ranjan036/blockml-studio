// Builds Intermediate Robotics (CODE AI Robotics Curriculum v2.1: the Bridge Module and
// 36 weekly sessions) into ../gui/static/lessons/advanced/ (published at /lessons/advanced/):
// a page per session from advanced/curriculum.json (made from the curriculum PDF by
// scripts/parse-curriculum.py), and a Studio starter project where one is written below.
// Teacher-only material (the Teacher Guide's reference code and notes) is encrypted into
// api/_teacher/advanced.enc when its source and the key are on this computer (see
// teacher-secret.mjs); otherwise the committed file is kept.
//
// Extension URLs point at the production site by default; set STARTER_BASE to test
// against a local build.
import fs from 'node:fs';
import path from 'node:path';
import { v } from './sb3.mjs';
import { advancedSessionPage, advancedIndexPage } from './lesson-pages.mjs';
import { flag, forever, ifThen, ifElse, set, change, wait, waitUntil, eq, lt, gt, and, or, not, sub, add, mul, div, join2, random, round, addTo } from './blocks.mjs';
import { op } from './sb3.mjs';
import { ard, repeat, define, defineFast, call, arg, arduinoProject, cppFor } from './arduino-blocks.mjs';
import { dataKey, saveSecret } from './teacher-secret.mjs';
import { carSprite3, wallSprite3 } from './arduino-sprite.mjs';

const BASE = process.env.STARTER_BASE || 'https://studio.blockml.codeai.ltd/extensions/';
const OUT = path.join('..', 'gui', 'static', 'lessons', 'advanced');
const TEACHER_GUIDE = process.env.TEACHER_GUIDE_JSON || 'C:/CODE AI/Robotics Curiculum advance/studio-teacher-guide.json';
const curriculum = JSON.parse(fs.readFileSync(new URL('./advanced/curriculum.json', import.meta.url), 'utf8'));

const join = (...parts) => parts.reduceRight((acc, p) => join2(p, acc));
// digital write pin to a variable (1 = HIGH, 0 = LOW)
const writeVar = (pin, name) => ({ op: 'blockmlArduino_digitalWrite', inputs: { PIN: { menu: 'blockmlArduino_menu_pins', field: 'pins', value: String(pin) }, LEVEL: { reporter: v(name), shadow: { menu: 'blockmlArduino_menu_levels', field: 'levels', value: 'HIGH' } } } });
const item = (list, index) => op('data_itemoflist', { INDEX: index }, { LIST: list });
const clear = (list) => ({ op: 'data_deletealloflist', fields: { LIST: list } });
const abs = (x) => op('operator_mathop', { NUM: x }, { OPERATOR: 'abs' });
const floor = (x) => op('operator_mathop', { NUM: x }, { OPERATOR: 'floor' });
// The five line-sensor readings A0-A4 into a list (an array in C++). In the rover these are
// My Blocks that "run without screen refresh", so the loop is as quick as a real Arduino's.
const readLineBody = [clear('readings'), set('i', 0), repeat(5, addTo('readings', ard.analogReadAt(v('i'))), change('i', 1))];
const readLine = readLineBody;
const readSensors = defineFast('read line sensors', [], ...readLineBody);
const lineTable = ard.print(join('A0 ', item('readings', 1), '  A1 ', item('readings', 2), '  A2 ', item('readings', 3), '  A3 ', item('readings', 4), '  A4 ', item('readings', 5)));
// Mars Rover wiring (Teacher Guide): motors ENA 11 IN1 10 IN2 9 (left, A), IN3 5 IN4 4 ENB 3 (right, B); HC-SR04 Trig 12 Echo 13.
const roverSetup = [ard.setupMotor('A', 11, 10, 9), ard.setupMotor('B', 3, 5, 4), ...[0, 1, 2, 3, 4].map((n) => ard.setup(`A${n}`, 'line sensor (IR)'))];
// A signed speed for each side, like the Teacher Guide's setMotors(left, right).
const setMotors = define('set motors left %s right %s', ['left', 'right'],
  ifElse(lt(arg('left'), 0), [ard.motor('A', 'backward', ard.constrain(abs(arg('left')), 0, 255))], [ard.motor('A', 'forward', ard.constrain(arg('left'), 0, 255))]),
  ifElse(lt(arg('right'), 0), [ard.motor('B', 'backward', ard.constrain(abs(arg('right')), 0, 255))], [ard.motor('B', 'forward', ard.constrain(arg('right'), 0, 255))]));
const drive = (l, r) => call('set motors left %s right %s', { left: l, right: r });
// The weighted line position: -2 (far right) … +2 (far left), from the readings.
const lineErrorBody = [set('weighted', 0), set('total', 0), set('i', 1),
  repeat(5, change('weighted', mul(item('readings', v('i')), item('weights', v('i')))), change('total', item('readings', v('i'))), change('i', 1)),
  ifElse(gt(v('total'), 0), [set('error', div(v('weighted'), v('total')))], [set('error', 0)])];
const lineError = lineErrorBody;
const findError = defineFast('find line error', [], ...lineErrorBody);
const weightsSetup = [clear('weights'), ...[-2, -1, 0, 1, 2].map((w) => addTo('weights', w))];
// The slow and fast beeps of Rescue Alert: the buzzer follows (millis / period) mod 2.
const beepEvery = (pin, ms) => [set('beep', op('operator_mod', { NUM1: floor(div(ard.millis(), ms)), NUM2: 2 })), writeVar(pin, 'beep')];

// "flip" a 0/1 variable
const toggle = (name) => set(name, sub(1, v(name)));

// ---- Starter projects: the "Observe" program for each session's "Code it" -------------
// (scripts, shown variables, hidden variables). Pins follow each session's circuit.
const STARTERS = {
  'bridge-1': [[[flag, ard.setup(8, 'red LED'), ard.setup(9, 'yellow LED'), ard.setup(10, 'green LED'),
    forever(ard.write(8, 'HIGH'), wait(3), ard.write(8, 'LOW'), ard.write(9, 'HIGH'), wait(1), ard.write(9, 'LOW'), ard.write(10, 'HIGH'), wait(3), ard.write(10, 'LOW'))]]],

  'bridge-2': [[[flag, ard.setup(8, 'red LED'), ard.setup(9, 'yellow LED'), ard.setup(10, 'green LED'), ard.setup(11, 'buzzer'),
    forever(ard.write(8, 'HIGH'), wait(3), ard.write(8, 'LOW'),
      ard.write(9, 'HIGH'), repeat(5, ard.write(11, 'HIGH'), wait(0.1), ard.write(11, 'LOW'), wait(0.1)), ard.write(9, 'LOW'),
      ard.write(10, 'HIGH'), wait(3), ard.write(10, 'LOW'))]]],

  'bridge-3': [[[flag, ard.setup(8, 'buzzer'), ard.servo(11, 0),
    forever(set('distance', ard.distance(9, 10)),
      ifThen(and(gt(v('distance'), 0), lt(v('distance'), 20)), ard.write(8, 'HIGH'), ard.servo(11, 90), wait(2), ard.servo(11, 0), ard.write(8, 'LOW')),
      wait(0.2))]], ['distance']],

  'week-01': [[[flag, ard.setup(8, 'LED'), forever(ard.write(8, 'HIGH'), wait(1), ard.write(8, 'LOW'), wait(1))]]],

  // Custom functions (My Blocks) and a for loop (repeat) for the pedestrian countdown.
  'week-02': [[
    [flag, ard.setup(8, 'red LED'), ard.setup(9, 'yellow LED'), ard.setup(10, 'green LED'), ard.setup(11, 'white LED'),
      forever(call('green light'), call('yellow light'), call('red light with countdown'))],
    define('green light', [], ard.write(10, 'HIGH'), wait(3), ard.write(10, 'LOW')),
    define('yellow light', [], ard.write(9, 'HIGH'), wait(1), ard.write(9, 'LOW')),
    define('red light with countdown', [], ard.write(8, 'HIGH'), wait(1),
      repeat(5, ard.write(11, 'HIGH'), wait(0.3), ard.write(11, 'LOW'), wait(0.3)), ard.write(8, 'LOW')),
  ]],

  'week-03': [[[flag, ard.setup(2, 'button'), ard.setup(8, 'LED'),
    forever(set('button', ard.digitalRead(2)), ard.print(join('button: ', v('button'))),
      ifElse(eq(v('button'), 1), [ard.write(8, 'HIGH')], [ard.write(8, 'LOW')]), wait(0.1))]], ['button']],

  // The random-light half of the reaction game; students add the timing with millis.
  'week-04': [[[flag, ard.setup(2, 'button'), ard.setup(8, 'LED'),
    forever(ard.print('Get ready...'), wait(random(2, 6)), ard.write(8, 'HIGH'),
      waitUntil(eq(ard.digitalRead(2), 1)), ard.print('Pressed! Now measure how long it took (millis).'),
      ard.write(8, 'LOW'), wait(1.5))]]],

  'week-05': [[[flag, ard.setup('A0', 'potentiometer'),
    forever(set('raw', ard.analogRead('A0')), set('mapped', ard.map(v('raw'), 0, 1023, 0, 100)),
      ard.print(join('raw ', v('raw'), '   mapped ', v('mapped'))), wait(0.2))]], ['raw', 'mapped']],

  'week-06': [[[flag, ard.setup('A0', 'soil moisture sensor'),
    forever(set('soil', ard.analogRead('A0')), ard.print(join('soil: ', v('soil'))), wait(0.5))]], ['soil']],

  // AgriBot: water only when dry, with a safety-limited burst and a cooldown.
  'week-07': [[[flag, ard.setup('A0', 'soil moisture sensor'), ard.setup(7, 'pump / relay'), ard.write(7, 'LOW'),
    forever(set('soil', ard.analogRead('A0')), ard.print(join('Soil reading: ', v('soil'))),
      ifThen(lt(v('soil'), 400), ard.print('Soil is dry - watering...'), ard.write(7, 'HIGH'), wait(5), ard.write(7, 'LOW'), wait(10)),
      wait(1))]], ['soil']],

  'week-08': [[[flag, ard.setup(2, 'tilt switch'), ard.setup(8, 'buzzer'),
    forever(ifElse(eq(ard.digitalRead(2), 1), [ard.write(8, 'HIGH')], [ard.write(8, 'LOW')]))]]],

  // A medicine reminder with millis(): the button still works while the reminder beeps.
  'week-09': [[[flag, ard.setup(8, 'buzzer'), ard.setup(9, 'LED'), ard.setup(2, 'button'),
    set('reminder', 0), set('beep', 0), set('lastReminder', ard.millis()), set('lastBeep', ard.millis()),
    forever(
      ifThen(and(eq(v('reminder'), 0), gt(sub(ard.millis(), v('lastReminder')), 10000)),
        set('reminder', 1), ard.write(9, 'HIGH'), ard.print('Time for your medicine!')),
      ifThen(and(eq(v('reminder'), 1), gt(sub(ard.millis(), v('lastBeep')), 300)), set('lastBeep', ard.millis()), toggle('beep'), writeVar(8, 'beep')),
      ifThen(and(eq(v('reminder'), 1), eq(ard.digitalRead(2), 1)),
        set('reminder', 0), ard.write(9, 'LOW'), ard.write(8, 'LOW'), set('lastReminder', ard.millis()), ard.print('Taken. Next reminder in 10 seconds.')))]],
  ['reminder'], ['beep', 'lastReminder', 'lastBeep']],

  // Health Guard: a latched fall alert (continuous) beats a reminder (slow beeps).
  'week-10': [[[flag, ard.setup(2, 'tilt switch'), ard.setup(8, 'buzzer'), ard.setup(9, 'LED'), ard.setup(3, 'button'),
    set('fall', 0), set('reminder', 0), set('beep', 0), set('lastReminder', ard.millis()), set('lastBeep', ard.millis()),
    forever(
      ifThen(eq(ard.digitalRead(2), 1), set('fall', 1)),
      ifThen(and(eq(v('reminder'), 0), gt(sub(ard.millis(), v('lastReminder')), 15000)), set('reminder', 1), ard.write(9, 'HIGH')),
      ifThen(gt(sub(ard.millis(), v('lastBeep')), 300), set('lastBeep', ard.millis()), toggle('beep')),
      ifElse(eq(v('fall'), 1), [ard.write(8, 'HIGH')], [ifElse(eq(v('reminder'), 1), [writeVar(8, 'beep')], [ard.write(8, 'LOW')])]),
      ifThen(eq(ard.digitalRead(3), 1),
        ifElse(eq(v('fall'), 1), [set('fall', 0)], [ifThen(eq(v('reminder'), 1), set('reminder', 0), ard.write(9, 'LOW'), set('lastReminder', ard.millis()))]),
        wait(0.3)))]],
  ['fall', 'reminder'], ['beep', 'lastReminder', 'lastBeep']],

  'week-11': [[[flag, ard.setup('A0', 'light sensor (LDR)'), ard.setup(8, 'LED'),
    forever(set('light', ard.analogRead('A0')), ard.print(v('light')),
      ifElse(lt(v('light'), 400), [ard.write(8, 'HIGH')], [ard.write(8, 'LOW')]), wait(0.2))]], ['light']],

  // One threshold: students add the hysteresis gap themselves (Week 12's challenge).
  'week-12': [[[flag, ard.setup('A1', 'thermistor'), ard.setup(9, 'LED'),
    forever(set('temp', ard.analogRead('A1')), ard.print(join('temp reading: ', v('temp'))),
      ifElse(gt(v('temp'), 550), [ard.write(9, 'HIGH')], [ard.write(9, 'LOW')]), wait(0.5))]], ['temp']],

  // Smart Home Hub: light from the LDR, fan with hysteresis (on above 550, off below 500).
  'week-13': [[[flag, ard.setup('A0', 'light sensor (LDR)'), ard.setup('A1', 'thermistor'), ard.setup(8, 'LED'), ard.setup(9, 'LED'), set('fanOn', 0),
    forever(set('light', ard.analogRead('A0')), set('temp', ard.analogRead('A1')),
      ifElse(lt(v('light'), 400), [ard.write(8, 'HIGH')], [ard.write(8, 'LOW')]),
      ifThen(and(eq(v('fanOn'), 0), gt(v('temp'), 550)), set('fanOn', 1)),
      ifThen(and(eq(v('fanOn'), 1), lt(v('temp'), 500)), set('fanOn', 0)),
      writeVar(9, 'fanOn'),
      ard.print(join('Light: ', v('light'), ' | Temp: ', v('temp'))), wait(0.5))]], ['light', 'temp', 'fanOn']],

  // ---- Project 5: Park Assist ----
  // Five readings, averaged (a running total; arrays come in Week 30).
  'week-14': [[[flag, ard.setup(8, 'buzzer'),
    forever(set('total', 0), repeat(5, change('total', ard.distance(9, 10)), wait(0.05)),
      set('average', div(v('total'), 5)), ard.print(join('Average of 5: ', v('average'), ' cm')), wait(0.3))]], ['average'], ['total']],

  'week-15': [[[flag, ard.setupMotor('A', 9, 5, 6),
    forever(ard.motor('A', 'forward', 200), wait(2), ard.motor('A', 'stop', 0), wait(1),
      ard.motor('A', 'backward', 200), wait(2), ard.motor('A', 'stop', 0), wait(1))]]],

  // Two motors on the chassis (left = A, right = B), the same forward / back test; the car drives on the stage.
  'week-16': [[[flag, ard.setupMotor('A', 11, 6, 7), ard.setupMotor('B', 3, 5, 4),
    forever(ard.motor('A', 'forward', 200), ard.motor('B', 'forward', 200), wait(2),
      ard.motor('A', 'stop', 0), ard.motor('B', 'stop', 0), wait(1),
      ard.motor('A', 'backward', 200), ard.motor('B', 'backward', 200), wait(2),
      ard.motor('A', 'stop', 0), ard.motor('B', 'stop', 0), wait(1))]], [], [], true],

  // Park Assist: drive until the wall is closer than the braking distance (0 = no echo: keep going).
  'week-17': [[
    [flag, ard.setupMotor('A', 11, 6, 7), ard.setupMotor('B', 3, 5, 4), set('brakeDistance', 15),
      forever(set('distance', ard.distance(9, 10)), ard.print(join('Distance: ', v('distance'))),
        ifElse(or(gt(v('distance'), v('brakeDistance')), not(gt(v('distance'), 0))), [call('drive forward at speed %s', { speed: 150 })], [call('stop motors')]),
        wait(0.1))],
    define('drive forward at speed %s', ['speed'], ard.motor('A', 'forward', arg('speed')), ard.motor('B', 'forward', arg('speed'))),
    define('stop motors', [], ard.motor('A', 'stop', 0), ard.motor('B', 'stop', 0)),
  ], ['distance'], ['brakeDistance'], true],

  // ---- Project 6: Sentinel ----
  'week-18': [[[flag, ard.setup(2, 'PIR motion sensor'), ard.setup(8, 'buzzer'), ard.setup(9, 'LED'),
    forever(ifElse(eq(ard.digitalRead(2), 1),
      [ard.write(8, 'HIGH'), ard.write(9, 'HIGH'), ard.print(join('Motion at ', ard.millis(), ' ms')), wait(1)],
      [ard.write(8, 'LOW'), ard.write(9, 'LOW')]))]]],

  // A state variable: the button arms and disarms; motion only matters when armed.
  'week-19': [[[flag, ard.setup(3, 'button'), ard.setup(2, 'PIR motion sensor'), ard.setup(8, 'buzzer'), ard.setup(9, 'LED'), set('armed', 0),
    forever(
      ifThen(eq(ard.digitalRead(3), 1), toggle('armed'), writeVar(9, 'armed'), ard.print(join('armed = ', v('armed'))), waitUntil(eq(ard.digitalRead(3), 0))),
      ifElse(and(eq(v('armed'), 1), eq(ard.digitalRead(2), 1)), [ard.write(8, 'HIGH')], [ard.write(8, 'LOW')]))]], ['armed']],

  // Sentinel: named functions, a 5-second arming delay, and an alarm light.
  'week-20': [[
    [flag, ard.setup(2, 'PIR motion sensor'), ard.setup(3, 'button'), ard.setup(8, 'green LED'), ard.setup(9, 'buzzer'), ard.setup(10, 'red LED'), set('armed', 0), set('armTime', 0),
      forever(ifThen(eq(ard.digitalRead(3), 1), call('arm system'), waitUntil(eq(ard.digitalRead(3), 0))), writeVar(8, 'armed'), call('check motion'))],
    define('arm system', [], toggle('armed'), set('armTime', ard.millis()),
      ifElse(eq(v('armed'), 1), [ard.print('Arming... (5 s to leave the room)')], [ard.print('Disarmed')])),
    define('check motion', [], ifElse(and(and(eq(v('armed'), 1), gt(sub(ard.millis(), v('armTime')), 5000)), eq(ard.digitalRead(2), 1)),
      [call('sound alarm')], [ard.write(9, 'LOW'), ard.write(10, 'LOW')])),
    define('sound alarm', [], ard.write(9, 'HIGH'), ard.write(10, 'HIGH'), ard.print('MOTION DETECTED - ALARM!')),
  ], ['armed'], ['armTime']],

  // ---- Project 7: Clean City ----
  'week-21': [[[flag,
    forever(ard.servo(9, 0), ard.print(join('closed · distance ', ard.distance(10, 11), ' cm')), wait(2),
      ard.servo(9, 90), ard.print('open'), wait(2))]]],

  'week-22': [[[flag, ard.setup('A0', 'gas sensor (MQ)'), ard.setup(8, 'LED'), ard.setup(9, 'buzzer'),
    forever(set('gas', ard.analogRead('A0')),
      ifElse(lt(ard.millis(), 20000), [ard.print(join('warming up... ', v('gas')))], [ard.print(join('gas: ', v('gas')))]),
      wait(0.5))]], ['gas']],

  // Clean City: the lid (millis, so it never blocks) and the air monitor run side by side.
  'week-23': [[[flag, ard.setup('A0', 'gas sensor (MQ)'), ard.setup(8, 'LED'), ard.setup(7, 'buzzer'), ard.servo(11, 0), set('lidOpen', 0), set('lidOpenedAt', 0),
    forever(set('distance', ard.distance(9, 10)),
      ifThen(and(and(gt(v('distance'), 0), lt(v('distance'), 15)), eq(v('lidOpen'), 0)), ard.servo(11, 90), set('lidOpen', 1), set('lidOpenedAt', ard.millis())),
      ifThen(and(eq(v('lidOpen'), 1), gt(sub(ard.millis(), v('lidOpenedAt')), 3000)), ard.servo(11, 0), set('lidOpen', 0)),
      set('gas', ard.analogRead('A0')),
      ifElse(gt(v('gas'), 400), [ard.write(8, 'HIGH'), ard.write(7, 'HIGH')], [ard.write(8, 'LOW'), ard.write(7, 'LOW')]),
      ard.print(join('Distance: ', v('distance'), ' | Gas: ', v('gas'))), wait(0.2))]], ['distance', 'gas', 'lidOpen'], ['lidOpenedAt']],

  // ---- Project 8: Guide Bot ----
  'week-24': [[[flag, ard.setup(9, 'vibration motor'),
    forever(set('level', 0), repeat(51, ard.pwm(9, v('level')), change('level', 5), wait(0.03)),
      repeat(51, change('level', -5), ard.pwm(9, v('level')), wait(0.03)), wait(0.5))]], ['level']],

  // Closer = stronger: map the distance (0-100 cm) to vibration (255-0).
  'week-25': [[[flag, ard.setup(9, 'vibration motor'),
    forever(set('distance', ard.distance(10, 11)),
      ifElse(and(gt(v('distance'), 0), lt(v('distance'), 100)), [set('intensity', ard.constrain(ard.map(v('distance'), 0, 100, 255, 0), 0, 255))], [set('intensity', 0)]),
      ard.pwm(9, v('intensity')), ard.print(join('Distance: ', v('distance'), ' | Vibration: ', v('intensity'))), wait(0.1))]], ['distance', 'intensity']],

  'week-26': [[[flag, ard.setup(11, 'vibration motor'),
    forever(set('distance', ard.distance(9, 10)),
      ifElse(and(gt(v('distance'), 0), lt(v('distance'), 100)), [set('intensity', ard.constrain(ard.map(v('distance'), 0, 100, 255, 0), 0, 255))], [set('intensity', 0)]),
      ard.pwm(11, v('intensity')), ard.print(join('Distance: ', v('distance'), ' | Vibration: ', v('intensity'))), wait(0.1))]], ['distance', 'intensity']],

  // ---- Project 9: Rescue Alert ----
  // Three probes at increasing heights, each through a 10 kΩ pull-down to an analog pin.
  'week-27': [[[flag, ard.setup('A0', 'water-level probe'), ard.setup('A1', 'water-level probe'), ard.setup('A2', 'water-level probe'),
    forever(ard.print(join('low ', ard.analogRead('A0'), '   middle ', ard.analogRead('A1'), '   high ', ard.analogRead('A2'))), wait(0.5))]]],

  // Escalating alerts: slow beeps for a warning, fast beeps for critical.
  'week-28': [[
    [flag, ard.setup(2, 'water probe (wet/dry)'), ard.setup(3, 'water probe (wet/dry)'), ard.setup('A1', 'gas sensor (MQ)'),
      ard.setup(8, 'buzzer'), ard.setup(9, 'yellow LED'), ard.setup(10, 'red LED'),
      forever(set('gas', ard.analogRead('A1')),
        ifElse(or(eq(ard.digitalRead(3), 1), gt(v('gas'), 500)), [call('sound critical')],
          [ifElse(or(eq(ard.digitalRead(2), 1), gt(v('gas'), 350)), [call('sound warning')], [call('all clear')])]),
        wait(0.05))],
    define('sound warning', [], ard.write(9, 'HIGH'), ard.write(10, 'LOW'), ...beepEvery(8, 500)),
    define('sound critical', [], ard.write(9, 'LOW'), ard.write(10, 'HIGH'), ...beepEvery(8, 150)),
    define('all clear', [], ard.write(9, 'LOW'), ard.write(10, 'LOW'), ard.write(8, 'LOW')),
  ], ['gas'], ['beep']],

  // Rescue Alert (Teacher Guide wiring): water probes 2 (low) and 3 (critical), gas A0.
  'week-29': [[
    [flag, ard.setup(2, 'water probe (wet/dry)'), ard.setup(3, 'water probe (wet/dry)'), ard.setup('A0', 'gas sensor (MQ)'),
      ard.setup(8, 'yellow LED'), ard.setup(9, 'red LED'), ard.setup(10, 'buzzer'),
      forever(set('waterRising', ard.digitalRead(2)), set('waterCritical', ard.digitalRead(3)), set('gas', ard.analogRead('A0')),
        ifElse(or(eq(v('waterCritical'), 1), gt(v('gas'), 500)), [call('sound critical')],
          [ifElse(or(eq(v('waterRising'), 1), gt(v('gas'), 350)), [call('sound warning')], [call('all clear')])]),
        ard.print(join('Water rising: ', v('waterRising'), ' | Critical: ', v('waterCritical'), ' | Gas: ', v('gas'))),
        wait(0.05))],
    define('sound warning', [], ard.write(8, 'HIGH'), ard.write(9, 'LOW'), ...beepEvery(10, 500)),
    define('sound critical', [], ard.write(8, 'LOW'), ard.write(9, 'HIGH'), ...beepEvery(10, 150)),
    define('all clear', [], ard.write(8, 'LOW'), ard.write(9, 'LOW'), ard.write(10, 'LOW')),
  ], ['gas'], ['waterRising', 'waterCritical', 'beep']],

  // ---- Project 10: Mars Rover ----
  // The five line sensors as a table (a list = an array). Drag the car across the line.
  'week-30': [[[flag, ...roverSetup, forever(...readLine, lineTable, wait(0.2))]], [], ['i'], { track: 'practice' }],

  // Line following (on/off steering) with an obstacle check first: avoiding a crater beats following.
  'week-31': [[
    [flag, ...roverSetup, forever(set('distance', ard.distance(12, 13)),
      ifElse(and(gt(v('distance'), 0), lt(v('distance'), 12)), [drive(120, -120), wait(0.3)],
        [ifElse(gt(ard.analogRead('A2'), 500), [drive(150, 150)],
          [ifElse(or(gt(ard.analogRead('A3'), 500), gt(ard.analogRead('A4'), 500)), [drive(40, 150)],
            [ifElse(or(gt(ard.analogRead('A1'), 500), gt(ard.analogRead('A0'), 500)), [drive(150, 40)], [drive(100, 100)])])])]))],
    setMotors,
  ], ['distance'], [], { track: 'practice', obstacle: { x: 40, y: 130 } }],

  // Proportional steering: the further off the line, the harder it turns (error × Kp).
  'week-32': [[
    [flag, ...roverSetup, ...weightsSetup, set('Kp', 60),
      forever(call('read line sensors'), call('find line error'), set('correction', round(mul(v('Kp'), v('error')))),
        drive(sub(150, v('correction')), add(150, v('correction'))), ard.print(join('error ', v('error'), '  correction ', v('correction'))))],
    setMotors, readSensors, findError,
  ], ['error', 'correction'], ['Kp', 'i', 'weighted', 'total'], { track: 'practice' }],

  // Mission Day: proportional line following, and craters avoided first, on the unseen track.
  'week-33': [[
    [flag, ...roverSetup, ...weightsSetup, set('Kp', 60),
      forever(set('distance', ard.distance(12, 13)),
        ifElse(and(gt(v('distance'), 0), lt(v('distance'), 12)), [drive(120, -120), wait(0.3)],
          [call('read line sensors'), call('find line error'), set('correction', round(mul(v('Kp'), v('error')))), drive(sub(150, v('correction')), add(150, v('correction')))]))],
    setMotors, readSensors, findError,
  ], ['distance', 'error'], ['Kp', 'i', 'weighted', 'total', 'correction'], { track: 'mission', obstacle: { x: 88, y: 109 } }],
};

// Notes for a session's page about how the Studio project differs from the real build.
const NOTES = {
  'week-16': 'On the stage: <b>Add virtual car</b> is already in this project — motor A is the left wheel, motor B the right. A real chassis drifts; the virtual one drives straight, so the drift experiment needs the real car.',
  'week-17': 'The virtual car brakes in front of the Wall sprite. Drag the wall closer or further while it drives; change <b>brakeDistance</b> and the speed.',
  'week-30': 'The five IR sensors sit on the virtual car\'s nose (A0 on the right … A4 on the left) and read the track drawn on the stage. Drag the car across the line and watch the table.',
  'week-31': 'The grey rock is an <b>Obstacle</b> sprite: the car\'s distance sensor sees it. Move it anywhere on the track.',
  'week-32': 'In the simulator <b>Kp = 60</b> drives the oval smoothly (try 25, the Teacher Guide\'s value for a real rover, and watch it miss the corner). On a real rover start near 25 and tune: that is this week\'s challenge.',
  'week-33': 'The stage has two backdrops: the <b>mission track</b> (the unseen terrain) and a grid. Teachers can draw a new track as a backdrop (a dark line about 10 px wide on a light floor) for a truly unseen Mission Day.',
};

function write(dir, file, content) {
  const d = path.join(OUT, dir);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, file), typeof content === 'string' ? content : content.toSb3('BlockML Studio Intermediate Robotics builder'));
}

// The virtual car's sprites, for the "Add virtual car" button.
const SPRITES = path.join('..', 'gui', 'static', 'sprites');
fs.mkdirSync(SPRITES, { recursive: true });
fs.writeFileSync(path.join(SPRITES, 'arduino-car.sprite3'), carSprite3());
fs.writeFileSync(path.join(SPRITES, 'arduino-wall.sprite3'), wallSprite3());

const sessions = curriculum.sessions;
const label = (s) => (s.project ? s.key : `Bridge ${s.number}`);
let starters = 0;
const unsupported = [];
sessions.forEach((s, i) => {
  const def = STARTERS[s.id];
  let starter = null;
  if (def) {
    const [scripts, shown = [], hidden = [], car = false] = def;
    const p = arduinoProject(BASE, scripts, { variables: shown, hidden, ...(typeof car === 'object' ? car : { car }) });
    write(s.id, 'project.sb3', p);
    const out = cppFor(p);
    if (out.unsupported.length) unsupported.push(`${s.id}: ${out.unsupported.join(', ')}`);
    starter = { cpp: out.code, note: NOTES[s.id] };
    starters++;
  }
  const project = curriculum.projects.find((p) => p.number === s.project) || null;
  const nav = { prev: sessions[i - 1] && { id: sessions[i - 1].id, label: label(sessions[i - 1]) }, next: sessions[i + 1] && { id: sessions[i + 1].id, label: label(sessions[i + 1]) } };
  write(s.id, 'index.html', advancedSessionPage(s, project, starter, nav));
});
fs.writeFileSync(path.join(OUT, 'index.html'), advancedIndexPage(curriculum, (id) => !!STARTERS[id]));
if (unsupported.length) throw new Error(`blocks with no Arduino version in: ${unsupported.join('; ')}`);
console.log(`advanced: ${sessions.length} session pages, ${starters} starter projects`);

// Teacher-only: the Teacher Guide's notes and reference code, encrypted.
const key = dataKey();
if (key && fs.existsSync(TEACHER_GUIDE)) {
  const guide = JSON.parse(fs.readFileSync(TEACHER_GUIDE, 'utf8'));
  const items = guide.projects.map((e) => ({
    slug: `project-${e.project}`,
    title: e.title,
    url: `/lessons/advanced/#project-${e.project}`,
    sections: e.sections.filter((x) => x.title !== 'Weeks Covered'),
    code: e.code,
  }));
  saveSecret('advanced', { name: 'Intermediate Robotics: Teacher Guide (reference code and notes)', order: 3, items }, key);
} else {
  console.log('advanced: teacher data not rebuilt (needs the Teacher Guide JSON and the data key on this computer); keeping the committed file');
}
