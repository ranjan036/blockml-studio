// Builds the Fundamental Robotics sessions (CODE AI Core Curriculum, sessions 42–51)
// into ../gui/static/lessons/robotics/<session>/ (published at /lessons/robotics/):
// a project, a fix-the-bug version and a lesson card each. Every project runs on the
// virtual board, or on an Arduino Uno over USB. Each card shows the Arduino C++ the
// project's blocks stand for, made by the same generator as Studio's "Show Arduino C++".
//
// Extension URLs point at the production site by default; set STARTER_BASE to test
// against a local build.
import fs from 'node:fs';
import path from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { Project, op, bool, v } from './sb3.mjs';
import { roboticsPage, roboticsIndexPage, teacherPage } from './lesson-pages.mjs';
import { saveAnswers } from './teacher-answers.mjs';
import { flag, forever, ifThen, ifElse, set, change, say, wait, whenKey, eq, lt, gt, and, join2, repeatUntil } from './blocks.mjs';
import { generate, blocksFromSb3 } from '../src/runtime/arduino/cpp.js';
import { BOARD_COSTUMES, boardSvg, arduinoSprite3 } from './arduino-sprite.mjs';

const BASE = process.env.STARTER_BASE || 'https://studio.blockml.codeai.ltd/extensions/';
const OUT = path.join('..', 'gui', 'static', 'lessons', 'robotics');

// ---- Arduino blocks -----------------------------------------------------------------
const menu = (name, value) => ({ menu: `blockmlArduino_menu_${name}`, field: name, value: String(value) });
const ard = {
  setup: (pin, part) => ({ op: 'blockmlArduino_setupPin', inputs: { PIN: menu('pins', pin), PART: menu('parts', part) } }),
  write: (pin, level) => ({ op: 'blockmlArduino_digitalWrite', inputs: { PIN: menu('pins', pin), LEVEL: menu('levels', level) } }),
  pwm: (pin, value) => ({ op: 'blockmlArduino_analogWrite', inputs: { PIN: menu('pwmPins', pin), VALUE: value } }),
  servo: (pin, angle) => ({ op: 'blockmlArduino_servo', inputs: { PIN: menu('pins', pin), ANGLE: angle } }),
  print: (text) => ({ op: 'blockmlArduino_print', inputs: { TEXT: text } }),
  digitalRead: (pin) => op('blockmlArduino_digitalRead', { PIN: menu('pins', pin) }),
  analogRead: (pin) => op('blockmlArduino_analogRead', { PIN: menu('analogPins', pin) }),
  distance: (trig, echo) => op('blockmlArduino_distance', { TRIG: menu('pins', trig), ECHO: menu('pins', echo) }),
};
const repeat = (times, ...body) => ({ op: 'control_repeat', inputs: { TIMES: times }, substack: body });

// ---- Pictures -----------------------------------------------------------------------
const BACKDROP = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#ecfdf5"/>' +
  '<g stroke="#ccfbf1" stroke-width="2">' + Array.from({ length: 12 }, (_, i) => `<path d="M${i * 40} 0 V360"/>`).join('') + Array.from({ length: 9 }, (_, i) => `<path d="M0 ${i * 40} H480"/>`).join('') + '</g></svg>';
// The board sprite (arduino-sprite.mjs): costumes "uno" and "uno L on" (pin 13's LED).

function project(scripts, { variables = [] } = {}) {
  const p = new Project();
  p.useExtension('blockmlArduino', BASE + 'arduino.js');
  for (const name of variables) p.variable(name);
  p.addStage([p.costume('grid', BACKDROP, [240, 180])]);
  p.addSprite('Arduino', BOARD_COSTUMES.map(([name, svg]) => p.costume(name, svg, [100, 70])), scripts, { y: 20 });
  for (const name of variables) p.showVariable(name);
  return p;
}

function write(slug, file, content) {
  const dir = path.join(OUT, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), typeof content === 'string' ? content : content.toSb3('BlockML Studio robotics builder'));
  console.log('robotics:', `${slug}/${file}`);
}

/** The C++ Studio shows for a project (the sprite's blocks). */
function cppFor(p) {
  const json = JSON.parse(strFromU8(unzipSync(p.toSb3())['project.json']));
  const sprite = json.targets.find((t) => !t.isStage);
  return generate(blocksFromSb3(sprite.blocks)).code;
}

const common = {
  first: 'Open the project. With no board connected, it runs on the <b>virtual board</b> (the Arduino panel): press the green flag and watch.',
  connect: 'Plug in the Arduino Uno and press <b>Connect Arduino board</b> (in the Arduino blocks). The first time on a board, press <b>Prepare board</b> when Studio asks: it installs the CODE AI program (about 3 seconds).',
  cpp: 'Press <b>Show Arduino C++</b>. Find each block in the code: what became <code>setup()</code>, what became <code>loop()</code>?',
};

const cards = [];

// ---- Robotics 1: LED Blinking (session 42) --------------------------------------------
{
  const blink = (pause) => [flag, ard.setup(8, 'LED'), forever(ard.write(8, 'HIGH'), wait(1), ard.write(8, 'LOW'), ...(pause ? [wait(1)] : []))];
  const p = project([blink(true)]);
  write('r1-led-blink', 'project.sb3', p);
  write('r1-led-blink', 'fix-the-bug.sb3', project([blink(false)]));
  cards.push({
    number: 1, session: 42, slug: 'r1-led-blink', kicker: 'Robotics 1 · Session 42', title: 'LED Blinking',
    objective: 'Your first real program controlling a physical LED.',
    about: 'Your first real program controlling a physical LED. The Arduino Uno is the robot\'s brain: every robot <b>senses</b>, <b>thinks</b> and <b>acts</b>, and today it acts by blinking a light.',
    learn: ['<code>pinMode()</code>: set up pin 8 as an output (the <b>set up pin</b> block)', '<code>digitalWrite()</code>: HIGH = on (5 V), LOW = off (0 V)', '<code>delay()</code>: the <b>wait</b> block, in milliseconds in C++ (1 second = 1000)', 'Digital output: only on or off', 'The Uno: USB, digital pins 0–13, analog pins A0–A5, 5V, GND; breadboard rows; LED long leg = +'],
    applied: 'Every blinking indicator light in real electronics, from routers to car dashboards.',
    realLife: 'The blinking light on a router or phone charger showing it\'s working.',
    funFact: 'Making an LED blink is such a classic first program for new hardware that it has its own nickname among engineers: “Blink.”',
    kit: ['Arduino Uno + USB cable', 'Breadboard', '1 LED', '1 × 220 Ω resistor', '2 jumper wires'],
    wiring: [['LED', 'long leg (+) → 220 Ω resistor →', 'pin 8'], ['LED', 'short leg (−)', 'GND']],
    say: 'Hook: show a robot toy. What does it sense? What does it decide? What does it do?',
    steps: [common.first, 'Change both waits to 0.2, then 2. What changes?', 'Unplug USB. Wire the LED and resistor (long leg to the resistor, short leg to GND).', common.connect, 'Green flag: the real LED blinks. Try the on-board LED too: change pin 8 to 13 (the “L” light).', common.cpp, 'Exit question: what happens if you take the waits out?'],
    cpp: cppFor(p),
    bug: {
      symptom: 'The LED never seems to turn off — it just stays on.',
      hints: ['Read the loop out loud, block by block, with the time each takes.', 'How long is the LED off before it is switched on again?'],
      answer: 'The <b>wait 1 seconds</b> after <b>digital write pin 8 to LOW</b> is missing, so the LED is off for only a few microseconds — too short to see. Add the wait back.',
    },
    challenges: ['Blink the SOS pattern: 3 short, 3 long, 3 short (use <b>repeat</b>).', 'Make a heartbeat: two quick blinks, then a long pause.', 'Blink pin 8 and the on-board LED (13) in turn.'],
    troubleshoot: ['No light: flip the LED (long leg to the resistor), check the resistor is in the same row, check the pin number.', '“The board is busy”: close the Arduino IDE\'s Serial Monitor.', 'Nothing in the port list: try another USB cable (some only charge).'],
  });
}

// ---- Robotics 2: Traffic Light System (session 43) ------------------------------------
{
  const light = (yellowOff) => [flag, ard.setup(10, 'red LED'), ard.setup(9, 'yellow LED'), ard.setup(8, 'green LED'),
    forever(
      ard.write(8, 'HIGH'), wait(5), ard.write(8, 'LOW'),
      ard.write(9, 'HIGH'), wait(1.5), ...(yellowOff ? [ard.write(9, 'LOW')] : []),
      ard.write(10, 'HIGH'), wait(5), ard.write(10, 'LOW'))];
  // A taste of analog: press F to fade the yellow LED (PWM pin 9).
  const fade = [whenKey('f'), set('brightness', 0), repeat(52, ard.pwm(9, v('brightness')), change('brightness', 5), wait(0.02)), ard.pwm(9, 0)];
  const p = project([light(true), fade], { variables: ['brightness'] });
  write('r2-traffic-light', 'project.sb3', p);
  write('r2-traffic-light', 'fix-the-bug.sb3', project([light(false), fade], { variables: ['brightness'] }));
  cards.push({
    number: 2, session: 43, slug: 'r2-traffic-light', kicker: 'Robotics 2 · Session 43', title: 'Traffic Light System',
    objective: 'Control 3 LEDs in the correct real-world sequence.',
    about: 'Control 3 LEDs in the correct real-world sequence. Plan the timing on paper first: robots just follow ordered instructions.',
    learn: ['Sequencing several outputs: order matters', 'Timing with <code>delay()</code>', 'Naming pins: <code>const int RED_LED = 10;</code> (the <b>set up pin</b> blocks do this)', 'Digital vs analog output: digital is on/off; PWM pins (~3, 5, 6, 9, 10, 11) can be in between with <code>analogWrite()</code>'],
    applied: 'Real traffic signals and pedestrian crossing systems.',
    realLife: 'The actual traffic lights you see every day at road junctions.',
    funFact: 'The world\'s first electric traffic light was installed in London in 1868 — and exploded from a gas leak just weeks later!',
    kit: ['Arduino Uno + USB cable', 'Breadboard', 'Red, yellow and green LEDs', '3 × 220 Ω resistors', 'Jumper wires'],
    wiring: [['Red LED', '+ → 220 Ω →', 'pin 10'], ['Yellow LED', '+ → 220 Ω →', 'pin 9'], ['Green LED', '+ → 220 Ω →', 'pin 8'], ['All LEDs', 'short legs (−)', 'GND']],
    say: 'Role play: students are cars, the teacher is the signal. Then draw the timing chart: who is ON when?',
    steps: [common.first, 'Check the order against your timing chart.', 'Wire the three LEDs (USB unplugged).', common.connect, 'Press <b>F</b>: the yellow LED fades in — that is analog output (PWM, <code>analogWrite</code>).', common.cpp],
    cpp: cppFor(p),
    bug: {
      symptom: 'Yellow and red are on together, and after the first round yellow never goes off.',
      hints: ['Every light that is switched on must be switched off. Count the HIGHs and LOWs for each pin.'],
      answer: '<b>digital write pin 9 to LOW</b> is missing after the yellow wait. Two lights on together usually means a missing LOW before the next HIGH.',
    },
    challenges: ['Add a pedestrian “wait” light (a fourth LED) that is on only when the cars have red.', 'Night mode: after the full cycle has run 3 times, blink yellow only.', 'Make the fade go up and back down (like breathing).'],
    troubleshoot: ['One LED never lights: swap it with a working one to test the LED, then check its pin.', 'Fade does nothing: the LED must be on a ~ pin (3, 5, 6, 9, 10, 11). Note: with a servo on the board, pins 9 and 10 can\'t fade.'],
  });
}

// ---- Robotics 3: Buzzer + Fire Alarm (session 44) -------------------------------------
{
  const alarm = (flameIs) => [flag, ard.setup(2, 'flame sensor'), ard.setup(8, 'buzzer'), ard.setup(9, 'red LED'),
    forever(ifElse(eq(ard.digitalRead(2), flameIs),
      [ard.write(8, 'HIGH'), ard.write(9, 'HIGH'), say('FIRE!')],
      [ard.write(8, 'LOW'), ard.write(9, 'LOW'), say('')]))];
  // Part 1 of the session: sound patterns. Press B for three short beeps.
  const beeps = [whenKey('b'), repeat(3, ard.write(8, 'HIGH'), wait(0.2), ard.write(8, 'LOW'), wait(0.2))];
  const p = project([alarm(0), beeps]);
  write('r3-fire-alarm', 'project.sb3', p);
  write('r3-fire-alarm', 'fix-the-bug.sb3', project([alarm(1), beeps]));
  cards.push({
    number: 3, session: 44, slug: 'r3-fire-alarm', kicker: 'Robotics 3 · Session 44', title: 'Buzzer + Fire Alarm',
    objective: 'Create sound patterns with a buzzer, then upgrade it to trigger automatically from a flame sensor.',
    about: 'Create sound patterns with a buzzer, then upgrade it to trigger automatically from a flame sensor: the robot\'s first <b>sense</b>. The sensor says, the Arduino decides, the buzzer and LED act.',
    learn: ['Active buzzer: sounds when its pin is HIGH', 'Buzzer output patterns with <b>repeat</b> and <b>wait</b>', '<code>digitalRead()</code>: the sensor\'s answer, 1 or 0', '<code>if / else</code>: input causing output', 'The flame module\'s screw sets how sensitive it is'],
    applied: 'Real smoke and fire alarms in homes and buildings.',
    realLife: 'The smoke detector in your home that beeps loudly when it senses smoke.',
    funFact: 'Modern smoke detectors can sense fire and alert an entire building faster than a person could run to check every room.',
    kit: ['Arduino Uno + USB cable', 'Breadboard', 'Active buzzer', 'Flame sensor module (with DO pin)', 'Red LED + 220 Ω resistor', 'Jumper wires', 'A candle or lighter — <b>teacher only</b>, at arm\'s length'],
    wiring: [['Flame sensor', 'VCC / GND', '5V / GND'], ['Flame sensor', 'DO', 'pin 2'], ['Buzzer', '+ (long leg)', 'pin 8'], ['Buzzer', '−', 'GND'], ['Red LED', '+ → 220 Ω →', 'pin 9']],
    say: 'How does a building “know” there is a fire?',
    steps: ['Part 1, sound patterns: press <b>B</b> for three beeps. Change the pattern (long-short-long?).', 'Part 2, the alarm: on the virtual board, click the flame sensor\'s button to show a flame. The buzzer and LED switch on.', 'Wire the sensor, buzzer and LED (USB unplugged).', common.connect, '<b>Check your module first</b>: watch the flame sensor\'s reading on the board panel with and without a flame. Most modules read <b>0 when they see a flame</b>; if yours reads 1, change the 0 in the if.', 'Teacher: hold a flame at arm\'s length. Turn the sensor\'s screw if it never (or always) triggers.', common.cpp, 'Reflect: why do false alarms matter?'],
    cpp: cppFor(p),
    bug: {
      symptom: 'The alarm rings all the time — and stops when there IS a flame.',
      hints: ['Watch the flame sensor\'s reading on the board panel. What does it say with no flame?', 'Which number does the if compare with?'],
      answer: 'The if checks <b>digital read pin 2 = 1</b>, but most flame modules give <b>0</b> when they see a flame (and 1 when they don\'t). Change 1 to 0 — or check your own module, since a few work the other way.',
    },
    challenges: ['Make the buzzer beep on and off (not one long sound) while there is a flame.', 'Count the alarms in a variable and print it to the Serial Monitor.', 'Add a “silence” button on another pin.'],
    troubleshoot: ['Always on or never on: turn the screw on the flame module slowly while watching its reading.', 'No sound: the buzzer must be an <b>active</b> buzzer (it has a sticker or a sealed bottom); a passive one only clicks.', 'Bright sunlight or a torch can trigger flame sensors (they see infrared).'],
  });
}

// ---- Robotics 4: Servo Motor Project (sessions 45–46) ---------------------------------
{
  const sweep = (back) => [flag, set('angle', 0), forever(
    repeat(180, ard.servo(9, v('angle')), change('angle', 1), wait(0.015)),
    repeat(180, ard.servo(9, v('angle')), change('angle', back), wait(0.015)))];
  // Session 46: a gate with three positions.
  const gate = [[whenKey('1'), ard.servo(9, 0), say('closed (0°)')], [whenKey('2'), ard.servo(9, 90), say('half (90°)')], [whenKey('3'), ard.servo(9, 180), say('open (180°)')]];
  const p = project([sweep(-1), ...gate], { variables: ['angle'] });
  write('r4-servo', 'project.sb3', p);
  write('r4-servo', 'fix-the-bug.sb3', project([sweep(1), ...gate], { variables: ['angle'] }));
  cards.push({
    number: 4, session: '45–46', slug: 'r4-servo', kicker: 'Robotics 4 · Sessions 45–46', title: 'Servo Motor Project',
    objective: 'Control precise motor movement between 0–180°, simulating a barrier gate or mini fan.',
    about: 'Control precise motor movement between 0–180°, simulating a barrier gate or mini fan. A servo turns to an exact angle and holds it: the joint of a robot arm, a gate, a steering wheel.',
    learn: ['Servo wires: brown/black = GND, red = 5V, orange/yellow = signal', 'The Servo library: <code>#include &lt;Servo.h&gt;</code>, <code>attach()</code>, <code>write(angle)</code>', 'Angles 0–180°', 'Loops to sweep smoothly (<code>for</code> in C++, <b>repeat</b> in blocks)', 'Why a servo is not an ordinary motor: it holds its position'],
    applied: 'Automatic gates, camera stabilizers, robotic arms.',
    realLife: 'Automatic parking-lot gates that lift when a ticket is scanned.',
    funFact: 'The same servo motor idea, at a much bigger scale, is used to control the wing flaps on real airplanes.',
    kit: ['Arduino Uno + USB cable', 'SG90 servo with an arm', 'Jumper wires', 'Protractor and paper (session 46)'],
    wiring: [['Servo', 'brown / black', 'GND'], ['Servo', 'red', '5V'], ['Servo', 'orange / yellow', 'pin 9']],
    say: 'Session 45: why can\'t an ordinary motor stop at exactly 90°? Session 46: build the gate.',
    steps: ['Session 45: open the project. The green flag sweeps the servo 0° → 180° → 0° on the virtual board.', 'Wire the servo (USB unplugged).', common.connect, 'Watch the real arm sweep. Change 0.015 to 0.005 and 0.05: faster or slower?', common.cpp + ' The C++ uses a <code>for</code> loop where the blocks use <b>repeat</b>.', 'Session 46: press 1, 2, 3 — a gate with three positions. Tape a paper boom to the arm; draw the angles with a protractor.', 'Design: a barrier gate (0° closed, 90° open) or a mini fan (sweeping back and forth).'],
    cpp: cppFor(p),
    bug: {
      symptom: 'The servo sweeps up to 180° once, then stops moving for ever.',
      hints: ['Show the <b>angle</b> variable on the stage and watch it.', 'What should the second repeat do to the angle?'],
      answer: 'The second repeat says <b>change angle by 1</b>, so the angle keeps growing past 180 (the servo can\'t go further). It should be <b>change angle by -1</b> to come back.',
    },
    challenges: ['Gate: 0° → wait 2 s → 90° → wait 2 s → 180° → wait 2 s.', 'Windscreen wiper: sweep fast between 30° and 150°.', 'A “clock hand” that moves 6° every second.'],
    troubleshoot: ['Jittery servo: check GND is shared and the USB port gives steady power (try a powered hub); several servos need an external 5 V supply.', 'It hums at 0° or 180°: some servos can\'t reach the very ends; use 5°–175°.', 'With a servo attached, pins 9 and 10 can\'t do PWM fades.'],
  });
}

// ---- Robotics 5: Ultrasonic Distance Sensor (session 47) -----------------------------
{
  const measure = (readInside) => [flag,
    ...(readInside ? [] : [set('distance', ard.distance(7, 6))]),
    forever(
      ...(readInside ? [set('distance', ard.distance(7, 6))] : []),
      ard.print(join2('Distance: ', join2(v('distance'), ' cm'))),
      say(v('distance')),
      wait(0.3))];
  const p = project([measure(true)], { variables: ['distance'] });
  write('r5-ultrasonic', 'project.sb3', p);
  write('r5-ultrasonic', 'fix-the-bug.sb3', project([measure(false)], { variables: ['distance'] }));
  cards.push({
    number: 5, session: 47, slug: 'r5-ultrasonic', kicker: 'Robotics 5 · Session 47', title: 'Ultrasonic Distance Sensor',
    objective: 'Your first true input project, measuring real-world distance using sound waves.',
    about: 'Your first true input project, measuring real-world distance using sound waves. The HC-SR04 sends a sound pulse and times its echo; the Arduino turns the time into centimetres.',
    learn: ['HC-SR04: Trig sends, Echo listens', 'distance (cm) = echo time (µs) × 0.034 ÷ 2 (sound goes there and back)', 'The Serial Monitor: <code>Serial.begin()</code>, <code>Serial.println()</code>', 'Variables, and <code>float</code> (decimals) vs <code>int</code>', 'Sensors can be wrong: soft or slanted things give bad readings'],
    applied: 'Reverse-parking sensors in cars, robot obstacle avoidance.',
    realLife: 'The beeping sensor in a car that gets faster as you get closer to a wall while reversing.',
    funFact: 'This sensor works exactly like how bats navigate in the dark — sending sound waves and timing how long they take to bounce back.',
    kit: ['Arduino Uno + USB cable', 'Breadboard', 'HC-SR04 ultrasonic sensor', 'Jumper wires', 'A ruler'],
    wiring: [['HC-SR04', 'VCC / GND', '5V / GND'], ['HC-SR04', 'Trig', 'pin 7'], ['HC-SR04', 'Echo', 'pin 6']],
    say: 'Clap in the corridor and listen for the echo: sound takes time to travel.',
    steps: [common.first + ' Move the distance slider; tick “nothing in front” to see what no echo gives (0).', 'Wire the sensor (USB unplugged).', common.connect, 'Watch the Serial Monitor on the board panel. Hold a book at 10, 20, 30 cm on a ruler: how close is the reading?', 'Try a soft sweater and a slanted book. What happens?', common.cpp + ' Find the formula inside <code>readDistanceCm</code>.', 'Exit: make an LED light when something is closer than 15 cm.'],
    cpp: cppFor(p),
    bug: {
      symptom: 'The distance never changes, however you move your hand.',
      hints: ['When does the program measure? Count how many times the distance block runs.'],
      answer: '<b>set distance to (distance in cm…)</b> is above the forever loop, so it measures once at the start. Move it inside the loop.',
    },
    challenges: ['Light the red LED when something is closer than 15 cm.', 'A parking beeper: the closer the object, the shorter the wait between beeps.', 'Measure your classroom\'s door width and compare with a tape measure.'],
    troubleshoot: ['Always 0: no echo came back — check Trig and Echo are not swapped, and that something is within ~2 m.', 'Jumpy numbers: point the sensor straight at a hard, flat object.', 'Below 2 cm the sensor cannot measure.'],
  });
}

// ---- Robotics 6: Automatic Parking Barrier (sessions 48–49) ---------------------------
{
  const barrier = (checkZero) => {
    const near = checkZero ? and(gt(v('distance'), 0), lt(v('distance'), 15)) : lt(v('distance'), 15);
    return [flag, ard.setup(8, 'buzzer'), ard.setup(10, 'red LED'), ard.setup(11, 'green LED'), ard.servo(9, 0),
      forever(
        set('distance', ard.distance(7, 6)),
        ifElse(near,
          [ard.write(8, 'HIGH'), wait(0.2), ard.write(8, 'LOW'), ard.write(10, 'LOW'), ard.write(11, 'HIGH'), ard.servo(9, 90), say('Welcome!'), wait(3)],
          [ard.write(11, 'LOW'), ard.write(10, 'HIGH'), ard.servo(9, 0), say('')]),
        wait(0.1))];
  };
  const p = project([barrier(true)], { variables: ['distance'] });
  write('r6-parking-barrier', 'project.sb3', p);
  write('r6-parking-barrier', 'fix-the-bug.sb3', project([barrier(false)], { variables: ['distance'] }));
  cards.push({
    number: 6, session: '48–49', slug: 'r6-parking-barrier', kicker: 'Robotics 6 · Sessions 48–49 · Flagship synthesis', title: 'Automatic Parking Barrier',
    objective: 'Your first true synthesis project, combining the distance sensor (input) and servo (output) together.',
    about: 'Your first true synthesis project, combining the distance sensor (input) and servo (output) together, with a buzzer and red/green lights. Sense → decide → act.',
    learn: ['Combining sensor input with conditional motor output', '<code>if / else</code> with a distance threshold, and <b>and</b> (<code>&amp;&amp;</code>)', 'Planning with a flowchart before coding', 'Debugging a big circuit one part at a time'],
    applied: 'Real automatic parking barriers and gates.',
    realLife: 'Parking garage gates that lift automatically when your car pulls up close enough.',
    funFact: 'You\'ve just built the same basic input-decision-output loop found at the heart of nearly every “smart” automatic machine in the real world.',
    kit: ['Arduino Uno + USB cable', 'Breadboard', 'HC-SR04', 'SG90 servo + a paper or ice-cream-stick boom', 'Active buzzer', 'Red and green LEDs + 2 × 220 Ω', 'Jumper wires', 'A toy car'],
    wiring: [['HC-SR04', 'Trig / Echo', 'pin 7 / pin 6'], ['Servo', 'signal (orange)', 'pin 9'], ['Buzzer', '+', 'pin 8'], ['Red LED', '+ → 220 Ω →', 'pin 10'], ['Green LED', '+ → 220 Ω →', 'pin 11'], ['Everything', 'GND / 5V', 'GND / 5V rails']],
    say: 'Session 48: draw the flowchart first — car near? yes → beep, green, open; no → red, close.',
    steps: ['Draw the flowchart on paper.', common.first + ' Slide the distance below 15 cm: beep, green light, gate opens.', 'Session 48: wire and test <b>one part at a time</b> (sensor, then servo, then lights and buzzer) — use the earlier projects to test each.', common.connect, 'Session 49: run the barrier with a toy car. Tune 15 cm for your car.', common.cpp + ' This is the biggest program so far: find the sensor, the decision and the actions.', 'Peer review: swap with another pair and try to “trick” their gate.'],
    cpp: cppFor(p),
    bug: {
      symptom: 'The gate opens when there is nothing in front of it at all.',
      hints: ['On the virtual board, tick “nothing in front”. What distance does the sensor give?', 'Is 0 less than 15?'],
      answer: 'With no echo the sensor gives 0, and 0 &lt; 15, so the gate opens. Check <b>distance &gt; 0 and distance &lt; 15</b>.',
    },
    challenges: ['Keep the gate open while the car is still in front; close only after it has gone.', 'Count the cars that pass and print the count.', 'Close the gate slowly (step the servo down a few degrees at a time).'],
    troubleshoot: ['Gate twitches: the servo and sensor share power — add a wait after the servo moves, or power the servo separately.', 'Opens at random: the sensor sees the boom or the table; tilt it up slightly.', 'Nothing works: test each part alone with the earlier projects.'],
  });
}

// ---- Robotics 7: Automatic Street Light (session 50) ---------------------------------
{
  const street = (darkIsLow) => [flag, ard.setup('A0', 'light sensor (LDR)'), ard.setup(8, 'LED'),
    forever(
      set('light', ard.analogRead('A0')),
      ard.print(v('light')),
      ifElse(darkIsLow ? lt(v('light'), 400) : gt(v('light'), 400), [ard.write(8, 'HIGH')], [ard.write(8, 'LOW')]),
      wait(0.2))];
  const p = project([street(true)], { variables: ['light'] });
  write('r7-street-light', 'project.sb3', p);
  write('r7-street-light', 'fix-the-bug.sb3', project([street(false)], { variables: ['light'] }));
  cards.push({
    number: 7, session: 50, slug: 'r7-street-light', kicker: 'Robotics 7 · Session 50', title: 'Automatic Street Light',
    objective: 'Use a light sensor to automatically switch a light on in darkness.',
    about: 'Use a light sensor to automatically switch a light on in darkness. The LDR is the first <b>analog</b> sensor: not just on/off, but how much.',
    learn: ['<code>analogRead()</code> gives 0–1023 (pin A0)', 'An LDR with a 10 kΩ resistor (a voltage divider)', 'A <b>threshold</b>: the number where the decision switches', 'Reading values on the Serial Monitor before choosing the threshold', 'Hysteresis: two thresholds so the lamp doesn\'t flicker'],
    applied: 'Real automatic streetlights and light-sensing night-lights.',
    realLife: 'Streetlights that automatically turn on at dusk without anyone flipping a switch.',
    funFact: 'Some modern smart streetlights detect exactly how much natural light is available and adjust their own brightness to save electricity.',
    kit: ['Arduino Uno + USB cable', 'Breadboard', 'LDR (light-dependent resistor)', '10 kΩ resistor', 'LED (white is best) + 220 Ω', 'Jumper wires', 'A torch'],
    wiring: [['LDR', 'one leg', '5V'], ['LDR', 'other leg → also 10 kΩ to GND', 'A0'], ['LED', '+ → 220 Ω →', 'pin 8']],
    say: 'Cover the sensor with your hand and watch the number fall.',
    steps: [common.first + ' Move the light slider: the lamp switches on when it is dark.', 'Wire the LDR, the 10 kΩ resistor and the LED (USB unplugged).', common.connect, 'Watch the Serial Monitor: room light, hand shadow, torch. Write the three numbers down.', 'Choose your threshold between “room” and “shadow” and change 400.', common.cpp, 'Class test: room light vs torch vs hand shadow.'],
    cpp: cppFor(p),
    bug: {
      symptom: 'The street light is on in the daytime and off at night.',
      hints: ['Cover the sensor: does the number go up or down?', 'Which way does the comparison point?'],
      answer: 'The if says <b>light &gt; 400</b>, but with the LDR on the 5V side, darkness gives a <b>low</b> number. It should be <b>light &lt; 400</b>. (If your LDR is wired the other way round, the opposite is right — always check the readings first.)',
    },
    challenges: ['Hysteresis: switch on below 350, off above 450, so the lamp never flickers (you need a variable that remembers on/off).', 'Make the lamp brighter the darker it gets (PWM pin 9: <b>analog write</b> with <b>light</b> ÷ 4).', 'Add a buzzer that beeps once when night falls.'],
    troubleshoot: ['Backwards: your LDR is on the other side of the divider — swap the comparison.', 'Number never changes: the LDR leg and the 10 kΩ must both be in the A0 row.', 'Flickers at dusk: that\'s why hysteresis exists (challenge 1).'],
  });
}

// ---- Session 51: Final Showcase ------------------------------------------------------
{
  const bin = [flag, ard.servo(9, 0), forever(
    set('distance', ard.distance(7, 6)),
    ifThen(and(gt(v('distance'), 0), lt(v('distance'), 20)), ard.servo(9, 100), say('Thank you!'), wait(3), ard.servo(9, 0), say('')),
    wait(0.15))];
  const p = project([bin], { variables: ['distance'] });
  write('s51-showcase', 'project.sb3', p);
  cards.push({
    number: 8, session: 51, slug: 's51-showcase', kicker: 'Session 51 · Final Showcase / Demo Day', title: 'Final Showcase',
    objective: 'Present your favourite coding/AI project alongside your robotics build.',
    about: 'Students present their favourite coding/AI project from Sessions 2–37 alongside their robotics build from Sessions 42–50. A public demonstration — not an exam. The example project is a <b>smart dustbin</b>: the lid opens when a hand comes close.',
    learn: ['Choosing parts and saying why (sense – think – act)', 'Drawing the circuit and a flowchart', 'Build, test, fix', 'Presenting: the problem, the solution, the demo, one thing that went wrong and how you fixed it'],
    applied: 'This is how real engineers prototype before making a product.',
    realLife: 'Ideas: smart dustbin lid (ultrasonic + servo), night lamp with alarm, school bell timer, rain-safe clothes cover, automatic plant-watering reminder.',
    funFact: 'Most real inventions fail several tests before they work. Debugging is the real skill.',
    kit: ['Any parts from sessions 42–50'],
    wiring: [['Smart dustbin: HC-SR04', 'Trig / Echo', 'pin 7 / pin 6'], ['Smart dustbin: servo (lid)', 'signal', 'pin 9']],
    steps: ['Teams pick a project idea (or the smart dustbin).', 'Draw the circuit and the flowchart.', 'Try it on the virtual board first, then build and test.', 'Show the Arduino C++ and point to the sensor, the decision and the action.', 'Rehearse a 2-minute demo, then present.'],
    cpp: cppFor(p),
    extraSections: '<section><h2>Rubric (4 items, no marks lost for trying)</h2><ul><li>It works (or you can show where it stops working).</li><li>Wired neatly.</li><li>You can explain sense → think → act.</li><li>Teamwork: both partners typed and wired.</li></ul></section>',
    challenges: ['Present one thing that went wrong and how you fixed it.', 'Add a second sensor or a second output to your build.'],
    troubleshoot: ['Test every part alone with its session\'s project before joining them.', 'Keep a working copy (File → Save to your computer) before big changes.'],
  });
}

for (const c of cards) write(c.slug, 'index.html', roboticsPage(c));

const kitNote = `<section><h2>Before you start</h2><ul>
<li><b>No board?</b> Every project runs on the virtual board in the Arduino panel — sliders and switches stand in for the sensors. Perfect for home practice.</li>
<li><b>With a board:</b> Arduino Uno (original or a CH340 clone) on USB, in Chrome or Edge on a computer. The first time, press <b>Prepare board</b> (3 seconds). Phones can't connect to a board.</li>
<li><b>Blocks → C++:</b> every program shows its Arduino C++ (<b>Show Arduino C++</b>), ready for the Arduino IDE.</li>
<li>Safety: unplug USB before changing wires; every LED gets a 220 Ω resistor; flames only with the teacher.</li></ul></section>`;
fs.writeFileSync(path.join(OUT, 'index.html'), roboticsIndexPage(cards, kitNote));

// Fix-the-bug answers: only on the teacher page (password), not on the lesson cards.
saveAnswers({ id: 'robotics', name: 'Fundamental Robotics (sessions 42–51)', order: 2 }, cards, (c) => `/lessons/robotics/${c.slug}/`);
fs.mkdirSync(path.join(OUT, '..', 'teacher'), { recursive: true });
fs.writeFileSync(path.join(OUT, '..', 'teacher', 'index.html'), teacherPage());
console.log('teacher page: lessons/teacher/index.html');

// The Arduino sprite for the editor's sprite library (and for adding it with the extension).
const SPRITES = path.join('..', 'gui', 'static', 'sprites');
fs.mkdirSync(SPRITES, { recursive: true });
fs.writeFileSync(path.join(SPRITES, 'arduino-uno.sprite3'), arduinoSprite3());
fs.writeFileSync(path.join(SPRITES, 'arduino-uno.svg'), boardSvg(true));
console.log('robotics: sprites/arduino-uno.sprite3');
console.log('robotics: index.html');
