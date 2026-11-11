// Arduino blocks for the lesson builders (build-robotics.mjs, build-advanced.mjs), written
// like the blocks.mjs helpers, plus the robotics project shape (the Arduino sprite on a grid)
// and the C++ Studio's "Show Arduino C++" makes from a project.
import { unzipSync, strFromU8 } from 'fflate';
import { Project, op } from './sb3.mjs';
import { BOARD_COSTUMES, CAR_COSTUMES, WALL_COSTUMES, TRACKS, TRACK_START, OBSTACLE_SVG } from './arduino-sprite.mjs';
import { generate, blocksFromSb3 } from '../src/runtime/arduino/cpp.js';

const menu = (name, value) => ({ menu: `blockmlArduino_menu_${name}`, field: name, value: String(value) });

export const ard = {
  setup: (pin, part) => ({ op: 'blockmlArduino_setupPin', inputs: { PIN: menu('pins', pin), PART: menu('parts', part) } }),
  write: (pin, level) => ({ op: 'blockmlArduino_digitalWrite', inputs: { PIN: menu('pins', pin), LEVEL: menu('levels', level) } }),
  pwm: (pin, value) => ({ op: 'blockmlArduino_analogWrite', inputs: { PIN: menu('pwmPins', pin), VALUE: value } }),
  servo: (pin, angle) => ({ op: 'blockmlArduino_servo', inputs: { PIN: menu('pins', pin), ANGLE: angle } }),
  tone: (pin, hz) => ({ op: 'blockmlArduino_playTone', inputs: { HZ: hz, PIN: menu('pins', pin) } }),
  noTone: (pin) => ({ op: 'blockmlArduino_stopTone', inputs: { PIN: menu('pins', pin) } }),
  setupMotor: (motor, en, in1, in2) => ({ op: 'blockmlArduino_setupMotor', fields: { MOTOR: motor }, inputs: { EN: menu('pwmPins', en), IN1: menu('pins', in1), IN2: menu('pins', in2) } }),
  motor: (motor, dir, speed) => ({ op: 'blockmlArduino_runMotor', fields: { MOTOR: motor }, inputs: { DIR: menu('directions', dir), SPEED: speed } }),
  print: (text) => ({ op: 'blockmlArduino_print', inputs: { TEXT: text } }),
  digitalRead: (pin) => op('blockmlArduino_digitalRead', { PIN: menu('pins', pin) }),
  analogRead: (pin) => op('blockmlArduino_analogRead', { PIN: menu('analogPins', pin) }),
  // analog read pin (a reporter), e.g. a loop counter 0-4 for A0-A4
  analogReadAt: (reporter) => op('blockmlArduino_analogRead', { PIN: { reporter, shadow: menu('analogPins', 'A0') } }),
  constrain: (value, low, high) => op('blockmlArduino_constrain', { VALUE: value, LOW: low, HIGH: high }),
  distance: (trig, echo) => op('blockmlArduino_distance', { TRIG: menu('pins', trig), ECHO: menu('pins', echo) }),
  millis: () => op('blockmlArduino_millis'),
  map: (value, a, b, c, d) => op('blockmlArduino_map', { VALUE: value, FROMLOW: a, FROMHIGH: b, TOLOW: c, TOHIGH: d }),
};
export const repeat = (times, ...body) => ({ op: 'control_repeat', inputs: { TIMES: times }, substack: body });

// My Blocks: define('blink %s times', ['times'], ...body) and call('blink %s times', { times: 3 }).
export const define = (proccode, args, ...body) => [{ op: 'procedures_definition', proccode, args }, ...body];
// A My Block with "Run without screen refresh" ticked: its loops don't wait for the next frame.
export const defineFast = (proccode, args, ...body) => [{ op: 'procedures_definition', proccode, args, warp: true }, ...body];
export const call = (proccode, args = {}) => ({ op: 'procedures_call', proccode, args });
export const arg = (name) => ({ op: 'argument_reporter_string_number', fields: { VALUE: name } });

const BACKDROP = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#ecfdf5"/>' +
  '<g stroke="#ccfbf1" stroke-width="2">' + Array.from({ length: 12 }, (_, i) => `<path d="M${i * 40} 0 V360"/>`).join('') + Array.from({ length: 9 }, (_, i) => `<path d="M0 ${i * 40} H480"/>`).join('') + '</g></svg>';

/** A robotics project: the Arduino sprite (scripts on it) on a grid; variables shown on the stage. */
export function arduinoProject(base, scripts, { variables = [], hidden = [], car = false, track = null, obstacle = null } = {}) {
  const p = new Project();
  p.useExtension('blockmlArduino', base + 'arduino.js');
  for (const name of [...variables, ...hidden]) p.variable(name);
  p.addStage(track ? [p.costume(`${track} track`, TRACKS[track], [240, 180]), p.costume('grid', BACKDROP, [240, 180])] : [p.costume('grid', BACKDROP, [240, 180])]);
  p.addSprite('Arduino', BOARD_COSTUMES.map(([name, svg]) => p.costume(name, svg, [100, 70])), scripts, car || track ? { x: 190, y: 145, size: 40 } : { y: 20 });
  if (car || track) {
    // The virtual car (motor A = left wheel, motor B = right wheel); a wall to park against, or
    // a track for the rover (and maybe an obstacle on it).
    const start = track ? TRACK_START[track] : { x: -170, y: 0 };
    const reset = [{ op: 'event_whenflagclicked' }, { op: 'motion_gotoxy', inputs: { X: start.x, Y: start.y } }, { op: 'motion_pointindirection', inputs: { DIRECTION: 90 } }];
    // Size 50%: a 32 × 24 cm car, about a real school rover (1 stage pixel = 1 cm).
    p.addSprite('Car', CAR_COSTUMES.map(([name, svg]) => p.costume(name, svg, [32, 24])), [reset], { x: start.x, y: start.y, size: 50 });
    if (!track) p.addSprite('Wall', WALL_COSTUMES.map(([name, svg]) => p.costume(name, svg, [12, 100])), [], { x: 200, y: -40 });
    if (obstacle) p.addSprite('Obstacle', [p.costume('rock', OBSTACLE_SVG, [22, 22])], [], obstacle);
  }
  variables.forEach((name, i) => p.showVariable(name, { x: 5, y: 5 + i * 28 }));
  return p;
}

/** The C++ Studio shows for a project (the Arduino sprite's blocks). */
export function cppFor(p) {
  const json = JSON.parse(strFromU8(unzipSync(p.toSb3())['project.json']));
  const sprite = json.targets.find((t) => !t.isStage);
  return generate(blocksFromSb3(sprite.blocks));
}
