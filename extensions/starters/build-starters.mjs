// Builds the S2 starter projects into ../gui/static/starters/ (published at
// /starters/ on the studio site). Each shows the design rule: the AI blocks only
// report what the camera sees; the decisions are ordinary Scratch blocks.
//
// Extension URLs point at the production site by default, so saved projects work
// anywhere; set STARTER_BASE to test against a local build.
import fs from 'node:fs';
import path from 'node:path';
import { Project, op, bool, v } from './sb3.mjs';

const BASE = process.env.STARTER_BASE || 'https://studio.blockml.codeai.ltd/extensions/';
const OUT = path.join('..', 'gui', 'static', 'starters');
fs.mkdirSync(OUT, { recursive: true });

// ---- shared bits -------------------------------------------------------------

const WHITE = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#ffffff"/></svg>';
const flag = { op: 'event_whenflagclicked' };
const forever = (...body) => ({ op: 'control_forever', substack: body });
const ifThen = (condition, ...body) => ({ op: 'control_if', inputs: { CONDITION: condition }, substack: body });
const ifElse = (condition, yes, no) => ({ op: 'control_if_else', inputs: { CONDITION: condition }, substack: yes, substack2: no });
const set = (name, value) => ({ op: 'data_setvariableto', fields: { VARIABLE: name }, inputs: { VALUE: value } });
const change = (name, by) => ({ op: 'data_changevariableby', fields: { VARIABLE: name }, inputs: { VALUE: by } });
const say = (message) => ({ op: 'looks_say', inputs: { MESSAGE: message } });
const costume = (name) => ({ op: 'looks_switchcostumeto', inputs: { COSTUME: { menu: 'looks_costume', field: 'COSTUME', value: name } } });
const wait = (s) => ({ op: 'control_wait', inputs: { DURATION: s } });
const join = (a, b) => op('operator_join', { STRING1: a, STRING2: b });
const eq = (a, b) => bool('operator_equals', { OPERAND1: a, OPERAND2: b });
const gt = (a, b) => bool('operator_gt', { OPERAND1: a, OPERAND2: b });
const and = (a, b) => bool('operator_and', { OPERAND1: a, OPERAND2: b });
const or = (a, b) => bool('operator_or', { OPERAND1: a, OPERAND2: b });
const add = (a, b) => op('operator_add', { NUM1: a, NUM2: b });
const div = (a, b) => op('operator_divide', { NUM1: a, NUM2: b });
const mul = (a, b) => op('operator_multiply', { NUM1: a, NUM2: b });

const face = {
  camera: (state = 'on') => ({ op: 'blockmlFace_setCamera', fields: { STATE: state } }),
  transparency: (n) => ({ op: 'blockmlFace_setTransparency', inputs: { VALUE: n } }),
  count: () => op('blockmlFace_numberOfFaces'),
  value: (property, index = 1) => op('blockmlFace_faceValue', { INDEX: index }, { PROPERTY: property }),
  point: (axis, point, index = 1) => op('blockmlFace_pointValue', { INDEX: index }, { AXIS: axis, POINT: point }),
};
const hands = {
  camera: (state = 'on') => ({ op: 'blockmlHands_setCamera', fields: { STATE: state } }),
  transparency: (n) => ({ op: 'blockmlHands_setTransparency', inputs: { VALUE: n } }),
  count: () => op('blockmlHands_numberOfHands'),
  point: (axis, point, index = 1) => op('blockmlHands_handPoint', { INDEX: index }, { AXIS: axis, POINT: point }),
  fingersUp: (index = 1) => op('blockmlHands_fingersUp', { INDEX: index }),
  shows: (gesture, index = 1) => bool('blockmlHands_handIs', { INDEX: index }, { GESTURE: gesture }),
};

function write(name, project) {
  fs.writeFileSync(path.join(OUT, name), project.toSb3());
  console.log('starter:', name);
}

// Simple drawings (our own, so no Scratch mascots).
const smiley = (mouth, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
<circle cx="60" cy="60" r="56" fill="#fde047" stroke="#ca8a04" stroke-width="4"/>
<circle cx="42" cy="48" r="7" fill="#1f2937"/><circle cx="78" cy="48" r="7" fill="#1f2937"/>${mouth}${extra}</svg>`;

// ---- 1. Smile meter (Face): if/else, comparison, variable, join ---------------

{
  const p = new Project();
  p.useExtension('blockmlFace', BASE + 'face.js');
  p.variable('smile');
  p.addStage([p.costume('white', WHITE, [240, 180])]);
  p.addSprite('Smiley', [
    p.costume('neutral', smiley('<path d="M36 82 H84" stroke="#1f2937" stroke-width="6" stroke-linecap="round"/>'), [60, 60]),
    p.costume('happy', smiley('<path d="M34 74 Q60 104 86 74" fill="none" stroke="#1f2937" stroke-width="6" stroke-linecap="round"/>'), [60, 60]),
    p.costume('looking', smiley('<circle cx="60" cy="84" r="8" fill="none" stroke="#1f2937" stroke-width="5"/>'), [60, 60]),
  ], [[
    flag,
    face.camera('on'),
    face.transparency(20),
    forever(
      ifElse(eq(face.count(), 0),
        [costume('looking'), say('Where are you? Look at the camera!')],
        [
          set('smile', face.value('smile')),
          ifElse(gt(v('smile'), 50),
            [costume('happy'), say(join('Great smile! ', join(v('smile'), '%')))],
            [costume('neutral'), say(join('Smile please! ', join(v('smile'), '%')))]),
        ]),
    ),
  ]], { x: 150, y: -110 });
  write('smile-meter.sb3', p);
}

// ---- 2. Face filter (Face): coordinates, averages, rotation --------------------

{
  const p = new Project();
  p.useExtension('blockmlFace', BASE + 'face.js');
  p.addStage([p.costume('white', WHITE, [240, 180])]);
  const glasses = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="70" viewBox="0 0 200 70">
<path d="M8 20 H192" stroke="#111827" stroke-width="8"/>
<rect x="18" y="14" width="68" height="46" rx="20" fill="#111827"/><rect x="114" y="14" width="68" height="46" rx="20" fill="#111827"/>
<rect x="28" y="22" width="22" height="10" rx="5" fill="#6b7280"/><rect x="124" y="22" width="22" height="10" rx="5" fill="#6b7280"/></svg>`;
  p.addSprite('Glasses', [p.costume('sunglasses', glasses, [100, 35])], [[
    flag,
    face.camera('on'),
    face.transparency(0),
    forever(
      ifElse(gt(face.count(), 0),
        [
          { op: 'looks_show' },
          // Halfway between the two eyes.
          { op: 'motion_gotoxy', inputs: {
            X: div(add(face.point('x', 'left eye'), face.point('x', 'right eye')), 2),
            Y: div(add(face.point('y', 'left eye'), face.point('y', 'right eye')), 2),
          } },
          // Glasses as wide as the face: the costume is 200 wide, so size% = face size × 0.45.
          { op: 'looks_setsizeto', inputs: { SIZE: mul(face.value('size'), 0.45) } },
          { op: 'motion_pointindirection', inputs: { DIRECTION: add(90, face.value('head tilt')) } },
        ],
        [{ op: 'looks_hide' }]),
    ),
  ]]);
  write('face-filter.sb3', p);
}

// ---- 3. Rock–paper–scissors (Hand): variables, random, if/else chains, and/or ----

{
  const p = new Project();
  p.useExtension('blockmlHands', BASE + 'hands.js');
  ['you', 'computer', 'your score', 'robot score'].forEach((n) => p.variable(n, n.includes('score') ? 0 : ''));
  p.addStage([p.costume('white', WHITE, [240, 180])]);
  const card = (label, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="150" viewBox="0 0 140 150">
<rect x="4" y="4" width="132" height="142" rx="18" fill="#e0f2fe" stroke="#0369a1" stroke-width="4"/>${body}
<text x="70" y="136" font-family="Arial, sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="#0c4a6e">${label}</text></svg>`;
  const robotCostumes = [
    p.costume('thinking', card('thinking…', '<text x="70" y="88" font-family="Arial" font-size="64" text-anchor="middle" fill="#0369a1">?</text>'), [70, 75]),
    p.costume('rock', card('rock', '<circle cx="70" cy="62" r="38" fill="#78716c"/>'), [70, 75]),
    p.costume('paper', card('paper', '<rect x="34" y="22" width="72" height="84" fill="#ffffff" stroke="#475569" stroke-width="3"/>'), [70, 75]),
    p.costume('scissors', card('scissors', '<circle cx="48" cy="84" r="13" fill="none" stroke="#dc2626" stroke-width="6"/><circle cx="92" cy="84" r="13" fill="none" stroke="#dc2626" stroke-width="6"/><path d="M56 74 L96 24 M84 74 L44 24" stroke="#475569" stroke-width="6" stroke-linecap="round"/>'), [70, 75]),
  ];
  const beats = (a, b) => and(eq(v('you'), a), eq(v('computer'), b));
  p.addSprite('Robot', robotCostumes, [[
    flag,
    hands.camera('on'),
    hands.transparency(40),
    set('your score', 0),
    set('robot score', 0),
    forever(
      costume('thinking'),
      say('Get ready… show ✊ rock, ✋ paper or ✌️ scissors!'),
      wait(2),
      say('3'), wait(1), say('2'), wait(1), say('1'), wait(1),
      // What did you show? The AI only counts fingers; we decide what it means.
      // Check there is a hand first: with no hand, "fingers up" is 0, which would look like rock!
      set('you', 'nothing'),
      ifThen(gt(hands.count(), 0),
        ifThen(eq(hands.fingersUp(), 0), set('you', 'rock')),
        ifThen(eq(hands.fingersUp(), 5), set('you', 'paper')),
        ifThen(hands.shows('victory'), set('you', 'scissors'))),
      // The robot picks at random.
      set('computer', op('operator_random', { FROM: 1, TO: 3 })),
      ifThen(eq(v('computer'), 1), set('computer', 'rock')),
      ifThen(eq(v('computer'), 2), set('computer', 'paper')),
      ifThen(eq(v('computer'), 3), set('computer', 'scissors')),
      { op: 'looks_switchcostumeto', inputs: { COSTUME: { reporter: v('computer'), shadow: { menu: 'looks_costume', field: 'COSTUME', value: 'rock' } } } },
      // Who wins?
      ifElse(eq(v('you'), 'nothing'),
        [say("I couldn't see your hand. Try again!")],
        [ifElse(eq(v('you'), v('computer')),
          [say(join('Draw! We both chose ', v('you')))],
          [ifElse(or(or(beats('rock', 'scissors'), beats('paper', 'rock')), beats('scissors', 'paper')),
            [change('your score', 1), say(join('You win! ', join(v('you'), join(' beats ', v('computer')))))],
            [change('robot score', 1), say(join('I win! ', join(v('computer'), join(' beats ', v('you')))))]),
          ]),
        ]),
      wait(3),
    ),
  ]], { x: 120, y: 20 });
  write('rock-paper-scissors.sb3', p);
}

// ---- 4. Air drawing (Hand + Pen): coordinates, state ---------------------------

{
  const p = new Project();
  p.useExtension('blockmlHands', BASE + 'hands.js');
  p.useExtension('pen');
  p.addStage([p.costume('white', WHITE, [240, 180])]);
  const dot = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="10" fill="#ec4899" stroke="#ffffff" stroke-width="3"/></svg>';
  p.addSprite('Brush', [p.costume('dot', dot, [12, 12])], [[
    flag,
    hands.camera('on'),
    hands.transparency(50),
    { op: 'pen_clear' },
    { op: 'pen_setPenColorToColor', inputs: { COLOR: { color: '#ec4899' } } },
    { op: 'pen_setPenSizeTo', inputs: { SIZE: 6 } },
    forever(
      ifElse(gt(hands.count(), 0),
        [
          { op: 'motion_gotoxy', inputs: { X: hands.point('x', 'index fingertip'), Y: hands.point('y', 'index fingertip') } },
          // Point with one finger to draw; lift it to move without drawing.
          ifElse(hands.shows('pointing'), [{ op: 'pen_penDown' }], [{ op: 'pen_penUp' }]),
          // Open hand wipes the board.
          ifThen(hands.shows('open'), { op: 'pen_clear' }),
        ],
        [{ op: 'pen_penUp' }]),
    ),
  ]]);
  write('air-drawing.sb3', p);
}
