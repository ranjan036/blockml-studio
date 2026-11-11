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
import { flag, forever, ifThen, ifElse, set, change, wait, waitUntil, eq, lt, gt, and, or, not, sub, div, join2, random } from './blocks.mjs';
import { ard, repeat, define, call, arg, arduinoProject, cppFor } from './arduino-blocks.mjs';
import { dataKey, saveSecret } from './teacher-secret.mjs';
import { carSprite3, wallSprite3 } from './arduino-sprite.mjs';

const BASE = process.env.STARTER_BASE || 'https://studio.blockml.codeai.ltd/extensions/';
const OUT = path.join('..', 'gui', 'static', 'lessons', 'advanced');
const TEACHER_GUIDE = process.env.TEACHER_GUIDE_JSON || 'C:/CODE AI/Robotics Curiculum advance/studio-teacher-guide.json';
const curriculum = JSON.parse(fs.readFileSync(new URL('./advanced/curriculum.json', import.meta.url), 'utf8'));

const join = (...parts) => parts.reduceRight((acc, p) => join2(p, acc));
// digital write pin to a variable (1 = HIGH, 0 = LOW)
const writeVar = (pin, name) => ({ op: 'blockmlArduino_digitalWrite', inputs: { PIN: { menu: 'blockmlArduino_menu_pins', field: 'pins', value: String(pin) }, LEVEL: { reporter: v(name), shadow: { menu: 'blockmlArduino_menu_levels', field: 'levels', value: 'HIGH' } } } });
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
    const p = arduinoProject(BASE, scripts, { variables: shown, hidden, car });
    write(s.id, 'project.sb3', p);
    const out = cppFor(p);
    if (out.unsupported.length) unsupported.push(`${s.id}: ${out.unsupported.join(', ')}`);
    starter = { cpp: out.code };
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
