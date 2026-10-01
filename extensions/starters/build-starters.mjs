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

// ---- 5. Fruit sorter (Image Model): training data, if/else-if chains, thresholds ----

{
  const p = new Project();
  p.useExtension('blockmlImage', BASE + 'image.js');
  // Empty classes, ready to fill in the trainer (a starter can't ship photos of your fruit).
  p.extensionStorage.blockmlImage = {
    version: 1,
    features: 'mobilenet_v2_100_224',
    classes: ['Apple', 'Banana', 'Nothing'].map((name) => ({ name, samples: [] })),
  };
  const baskets = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
<rect width="480" height="360" fill="#f8fafc"/>
<g font-family="Arial, sans-serif" font-size="20" font-weight="bold" text-anchor="middle">
<path d="M20 250 H140 L125 330 H35 Z" fill="#fecaca" stroke="#b91c1c" stroke-width="4"/><text x="80" y="300" fill="#991b1b">Apples</text>
<path d="M340 250 H460 L445 330 H355 Z" fill="#fef08a" stroke="#a16207" stroke-width="4"/><text x="400" y="300" fill="#854d0e">Bananas</text>
</g></svg>`;
  p.addStage([p.costume('baskets', baskets, [240, 180])]);
  const fruitCard = `<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 90 90">
<rect x="3" y="3" width="84" height="84" rx="16" fill="#ffffff" stroke="#2563eb" stroke-width="4"/>
<text x="45" y="60" font-family="Arial" font-size="44" font-weight="bold" text-anchor="middle" fill="#2563eb">?</text></svg>`;
  const img = {
    camera: (state = 'on') => ({ op: 'blockmlImage_setCamera', fields: { STATE: state } }),
    transparency: (n) => ({ op: 'blockmlImage_setTransparency', inputs: { VALUE: n } }),
    trained: () => bool('blockmlImage_isTrained'),
    openTrainer: () => ({ op: 'blockmlImage_openTrainer' }),
    classify: () => ({ op: 'blockmlImage_classify' }),
    label: () => op('blockmlImage_imageLabel'),
    confidence: (name) => op('blockmlImage_confidenceOf', { CLASS: { menu: 'blockmlImage_menu_classes', field: 'classes', value: name } }),
  };
  const glide = (x, y) => ({ op: 'motion_glidesecstoxy', inputs: { SECS: 1, X: x, Y: y } });
  p.addSprite('Sorter', [p.costume('card', fruitCard, [45, 45])], [[
    flag,
    img.camera('on'),
    img.transparency(30),
    ifThen(bool('operator_not', { OPERAND: img.trained() }),
      { op: 'looks_sayforsecs', inputs: { MESSAGE: 'First, teach me! Take photos of an apple, a banana, and nothing.', SECS: 3 } },
      img.openTrainer()),
    forever(
      { op: 'motion_gotoxy', inputs: { X: 0, Y: 40 } },
      say('Show me a fruit…'),
      wait(1),
      img.classify(),
      // Only trust the model when it is sure: that's what the 80 is for.
      ifElse(gt(img.confidence('Apple'), 80),
        [say('An apple! Into the apple basket.'), glide(-160, -110)],
        [ifElse(gt(img.confidence('Banana'), 80),
          [say('A banana! Into the banana basket.'), glide(160, -110)],
          [say(join("I'm not sure… it looks like ", img.label()))])]),
      wait(1.5),
    ),
  ]], { x: 0, y: 40 });
  write('fruit-sorter.sb3', p);
}

// ---- Object Detection helpers ------------------------------------------------------

const objs = {
  camera: (state = 'on') => ({ op: 'blockmlObjects_setCamera', fields: { STATE: state } }),
  transparency: (n) => ({ op: 'blockmlObjects_setTransparency', inputs: { VALUE: n } }),
  overlay: (mode) => ({ op: 'blockmlObjects_setOverlay', fields: { MODE: mode } }),
  detect: () => ({ op: 'blockmlObjects_detect' }),
  count: () => op('blockmlObjects_numberOfObjects'),
  value: (property, index) => op('blockmlObjects_objectValue', { INDEX: index }, { PROPERTY: property }),
  menu: (name) => ({ menu: 'blockmlObjects_menu_objects', field: 'objects', value: name }),
};
objs.seen = (name) => op('blockmlObjects_numberSeen', { OBJECT: objs.menu(name) });
objs.detected = (name) => bool('blockmlObjects_isDetected', { OBJECT: objs.menu(name) });
const robot = (face) => `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="110" viewBox="0 0 100 110">
<rect x="46" y="2" width="8" height="16" fill="#475569"/><circle cx="50" cy="6" r="6" fill="#f97316"/>
<rect x="10" y="18" width="80" height="70" rx="16" fill="#e2e8f0" stroke="#475569" stroke-width="4"/>
<rect x="22" y="34" width="56" height="30" rx="10" fill="#0f172a"/>${face}
<rect x="30" y="92" width="40" height="14" rx="5" fill="#94a3b8"/></svg>`;

// ---- 6. Object counter (Object Detection): repeat loop with a counter, lists ------------

{
  const p = new Project();
  p.useExtension('blockmlObjects', BASE + 'objects.js');
  p.list('things I see');
  p.showList('things I see', { x: 5, y: 5, width: 190, height: 250 });
  p.addStage([p.costume('white', WHITE, [240, 180])]);
  const eyes = '<circle cx="38" cy="49" r="7" fill="#22d3ee"/><circle cx="62" cy="49" r="7" fill="#22d3ee"/>';
  p.addSprite('Counter', [p.costume('robot', robot(eyes), [50, 55])], [[
    flag,
    objs.camera('on'),
    objs.transparency(30),
    objs.overlay('boxes'),
    forever(
      objs.detect(),
      { op: 'data_deletealloflist', fields: { LIST: 'things I see' } },
      set('i', 1),
      // Go through every object the AI found, one at a time.
      { op: 'control_repeat', inputs: { TIMES: objs.count() }, substack: [
        { op: 'data_addtolist', fields: { LIST: 'things I see' }, inputs: {
          ITEM: join(objs.value('name', v('i')), join(' – ', join(objs.value('confidence', v('i')), '%'))),
        } },
        change('i', 1),
      ] },
      ifElse(eq(objs.count(), 0),
        [say("I don't see anything I know yet.")],
        [say(join('Objects I can see: ', join(objs.count(), join('. People: ', objs.seen('person')))))]),
      wait(1),
    ),
  ]], { x: 150, y: -100 });
  write('object-counter.sb3', p);
}

// ---- 7. Classroom helper (Object Detection): events vs. checking in a loop, timer -------

{
  const p = new Project();
  p.useExtension('blockmlObjects', BASE + 'objects.js');
  p.variable('empty seconds', 0);
  p.showVariable('empty seconds', { x: 5, y: 5 });
  p.addStage([p.costume('white', WHITE, [240, 180])]);
  const smile = '<path d="M36 52 Q50 64 64 52" fill="none" stroke="#22d3ee" stroke-width="5" stroke-linecap="round"/>';
  p.addSprite('Helper', [p.costume('robot', robot(smile), [50, 55])], [
    // 1) An EVENT: runs by itself whenever the AI starts seeing a person.
    [
      { op: 'blockmlObjects_whenSees', inputs: { OBJECT: objs.menu('person') } },
      { op: 'looks_sayforsecs', inputs: { MESSAGE: 'Hello! Welcome back to your desk.', SECS: 2 } },
    ],
    // 2) CHECKING IN A LOOP: we look every half second and keep count with the timer.
    [
      flag,
      objs.camera('on'),
      objs.transparency(30),
      { op: 'sensing_resettimer' },
      forever(
        objs.detect(),
        ifElse(objs.detected('person'),
          [{ op: 'sensing_resettimer' }, set('empty seconds', 0)],
          [
            set('empty seconds', op('operator_round', { NUM: op('sensing_timer') })),
            ifThen(gt(v('empty seconds'), 5), say(join('Nobody at the desk for ', join(v('empty seconds'), ' seconds.')))),
          ]),
        wait(0.5),
      ),
    ],
  ], { x: 150, y: -100 });
  write('classroom-helper.sb3', p);
}

// ---- 8. Card driver (Codes & Cards): if/else chains, direction, a variable as a menu ----
// Show the printed recognition cards to the camera: go, stop, left, right, turn around.
// A QR code makes the car say the words hidden in it.

{
  const p = new Project();
  p.useExtension('blockmlScan', BASE + 'scan.js');
  p.variable('card', '');
  p.showVariable('card', { x: 5, y: 5 });
  p.addStage([p.costume('white', WHITE, [240, 180])]);
  const scan = {
    camera: (state = 'on') => ({ op: 'blockmlScan_setCamera', fields: { STATE: state } }),
    transparency: (n) => ({ op: 'blockmlScan_setTransparency', inputs: { VALUE: n } }),
    cardSeen: () => op('blockmlScan_cardSeen'),
    qrSeen: () => bool('blockmlScan_isQrSeen'),
    qrText: () => op('blockmlScan_qrText'),
  };
  const car = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="90" viewBox="0 0 60 90">
<rect x="4" y="14" width="10" height="20" rx="3" fill="#1f2937"/><rect x="46" y="14" width="10" height="20" rx="3" fill="#1f2937"/>
<rect x="4" y="58" width="10" height="20" rx="3" fill="#1f2937"/><rect x="46" y="58" width="10" height="20" rx="3" fill="#1f2937"/>
<rect x="10" y="4" width="40" height="82" rx="14" fill="#0284c7" stroke="#075985" stroke-width="3"/>
<rect x="16" y="16" width="28" height="16" rx="4" fill="#bae6fd"/></svg>`;
  const is = (name) => eq(v('card'), name);
  const turn = (degrees) => ({ op: 'motion_turnright', inputs: { DEGREES: degrees } });
  p.addSprite('Car', [p.costume('car', car, [30, 45])], [[
    flag,
    scan.camera('on'),
    scan.transparency(60),
    { op: 'motion_gotoxy', inputs: { X: 0, Y: 0 } },
    { op: 'motion_pointindirection', inputs: { DIRECTION: 0 } },
    set('card', 'stop'),
    set('last seen', ''),
    forever(
      // The camera only tells us which card it sees; we decide what each card means.
      // A card counts once when it appears, so "left" turns once, not again every frame.
      set('seen', scan.cardSeen()),
      ifThen(and(bool('operator_not', { OPERAND: eq(v('seen'), '') }), bool('operator_not', { OPERAND: eq(v('seen'), v('last seen')) })),
        set('card', v('seen'))),
      set('last seen', v('seen')),
      ifElse(or(is('go'), is('forward')),
        [{ op: 'motion_movesteps', inputs: { STEPS: 3 } }, { op: 'motion_ifonedgebounce' }],
        [ifElse(is('left'),
          [turn(-90), set('card', 'go')],
          [ifElse(is('right'),
            [turn(90), set('card', 'go')],
            [ifThen(is('turn around'), turn(180), set('card', 'go'))])])]),
      ifElse(scan.qrSeen(), [say(scan.qrText())], [say('')]),
    ),
  ]], { x: 0, y: 0 });
  write('card-driver.sb3', p);
}

// ---- 9. Lens explorer (Lens): "what is this?" and reading signs, thresholds ----------
// Space: the robot guesses what the camera sees, but only says it when it is sure enough.
// R: it reads the printed words in front of the camera.

{
  const p = new Project();
  p.useExtension('blockmlLens', BASE + 'lens.js');
  p.variable('sure enough', 50);
  p.showVariable('sure enough', { x: 5, y: 5 });
  p.addStage([p.costume('white', WHITE, [240, 180])]);
  const lens = {
    camera: (state = 'on') => ({ op: 'blockmlLens_setCamera', fields: { STATE: state } }),
    transparency: (n) => ({ op: 'blockmlLens_setTransparency', inputs: { VALUE: n } }),
    recognize: () => ({ op: 'blockmlLens_recognize' }),
    thing: () => op('blockmlLens_thing'),
    confidence: () => op('blockmlLens_thingConfidence'),
    secondGuess: () => op('blockmlLens_guess', { INDEX: 2 }, { PROPERTY: 'name' }),
    read: () => ({ op: 'blockmlLens_readText' }),
    text: () => op('blockmlLens_textRead'),
    words: () => op('blockmlLens_numberOfWords'),
  };
  const sayFor = (message, secs) => ({ op: 'looks_sayforsecs', inputs: { MESSAGE: message, SECS: secs } });
  const whenKey = (key) => ({ op: 'event_whenkeypressed', fields: { KEY_OPTION: key } });
  const eyes = '<circle cx="38" cy="49" r="7" fill="#a5b4fc"/><circle cx="62" cy="49" r="7" fill="#a5b4fc"/>';
  const lensBot = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="110" viewBox="0 0 100 110">
<rect x="46" y="4" width="8" height="16" fill="#64748b"/><circle cx="50" cy="6" r="5" fill="#6366f1"/>
<rect x="12" y="20" width="76" height="62" rx="16" fill="#1e1b4b" stroke="#4338ca" stroke-width="4"/>${eyes}
<path d="M36 66 Q50 74 64 66" fill="none" stroke="#a5b4fc" stroke-width="4" stroke-linecap="round"/>
<rect x="28" y="84" width="44" height="22" rx="6" fill="#6366f1"/></svg>`;
  p.addSprite('Lens bot', [p.costume('robot', lensBot, [50, 55])], [
    [flag, lens.camera('on'), lens.transparency(20), say('Space: what is this? R: read the words.')],
    [
      whenKey('space'),
      say('Hmm…'),
      lens.recognize(),
      // The AI always guesses something; we decide when a guess is good enough to say.
      ifElse(gt(lens.confidence(), v('sure enough')),
        [sayFor(join('I think this is: ', join(lens.thing(), '!')), 3)],
        [sayFor(join('Not sure… maybe ', join(lens.thing(), join(' or ', join(lens.secondGuess(), '?')))), 3)]),
    ],
    [
      whenKey('r'),
      say('Reading…'),
      lens.read(),
      ifElse(gt(lens.words(), 0),
        [sayFor(join('It says: ', lens.text()), 4)],
        [sayFor('I can\'t see any words. Hold them closer.', 3)]),
    ],
  ], { x: 150, y: -100 });
  write('lens-explorer.sb3', p);
}

// ---- 10. Digit drawer (Image Model + Pen): teach the AI your own drawings (AI 10) ----
// Draw with the mouse. Keys 0, 1, 2 add the drawing to that class, T trains, space
// asks the AI, C clears. A clear stage between drawings matters: try without!

{
  const p = new Project();
  p.useExtension('pen');
  p.useExtension('blockmlImage', BASE + 'image.js');
  p.addStage([p.costume('white', WHITE, [240, 180])]);
  const whenKey = (key) => ({ op: 'event_whenkeypressed', fields: { KEY_OPTION: key } });
  const sayFor = (message, secs) => ({ op: 'looks_sayforsecs', inputs: { MESSAGE: message, SECS: secs } });
  const classMenu = (name) => ({ menu: 'blockmlImage_menu_classes', field: 'classes', value: name });
  const addDrawing = (name) => ({ op: 'blockmlImage_addExample', inputs: { CLASS: classMenu(name) }, fields: { SOURCE: 'stage drawing' } });
  const examples = (name) => op('blockmlImage_photosOf', { CLASS: classMenu(name) });
  const pencil = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="#1d4ed8" opacity=".5"/></svg>';
  const teach = (digit) => [whenKey(digit), { op: 'looks_hide' }, addDrawing(digit), { op: 'looks_show' }, { op: 'pen_clear' },
    say(join('Thanks! Drawings of ', join(digit, join(': ', examples(digit)))))];
  p.addSprite('Pencil', [p.costume('dot', pencil, [12, 12])], [
    [
      flag,
      { op: 'pen_clear' },
      { op: 'pen_setPenColorToColor', inputs: { COLOR: { color: '#1d4ed8' } } },
      { op: 'pen_setPenSizeTo', inputs: { SIZE: 14 } },
      say('Draw a 0, 1 or 2, then press that key. T = train, space = guess, C = clear.'),
      forever(
        { op: 'motion_goto', inputs: { TO: { menu: 'motion_goto_menu', field: 'TO', value: '_mouse_' } } },
        ifElse(bool('sensing_mousedown'), [{ op: 'pen_penDown' }], [{ op: 'pen_penUp' }]),
      ),
    ],
    teach('0'),
    teach('1'),
    teach('2'),
    [whenKey('t'), { op: 'blockmlImage_train' }, sayFor('Trained! Draw one and press space.', 2)],
    [
      whenKey('space'),
      { op: 'looks_hide' }, // the pencil is not part of the drawing
      { op: 'blockmlImage_classifyStage' },
      { op: 'looks_show' },
      say(join('I think that is a ', op('blockmlImage_imageLabel'))),
    ],
    [whenKey('c'), { op: 'pen_clear' }, say('')],
  ], { x: 0, y: 0 });
  write('digit-drawer.sb3', p);
}

// ---- 11. Hand signs (Hand & Pose): teach the AI your own signs from hand points (AI 11) ----
// Show a sign and press A, B or C to add it as an example; T trains. The AI learns
// from the 21 points of your hand, not from the picture.

{
  const p = new Project();
  p.useExtension('blockmlHands', BASE + 'hands.js');
  p.variable('sign', '');
  p.showVariable('sign', { x: 5, y: 5 });
  p.addStage([p.costume('white', WHITE, [240, 180])]);
  const whenKey = (key) => ({ op: 'event_whenkeypressed', fields: { KEY_OPTION: key } });
  const signMenu = (name) => ({ menu: 'blockmlHands_menu_signs', field: 'signs', value: name });
  const teach = (key) => [whenKey(key.toLowerCase()),
    { op: 'blockmlHands_addSign', inputs: { INDEX: 1, SIGN: signMenu(key) } },
    say(join(join('Examples of ', key), join(': ', op('blockmlHands_signExamples', { SIGN: signMenu(key) }))))];
  p.addSprite('Helper', [p.costume('robot', robot('<path d="M36 52 Q50 64 64 52" fill="none" stroke="#5eead4" stroke-width="5" stroke-linecap="round"/>'), [50, 55])], [
    [
      flag,
      hands.camera('on'),
      hands.transparency(20),
      { op: 'blockmlHands_setOverlay', fields: { MODE: 'points' } },
      say('Show a sign, press A, B or C (5 times each, moving a little). Then T.'),
    ],
    teach('A'),
    teach('B'),
    teach('C'),
    [
      whenKey('t'),
      { op: 'blockmlHands_trainSigns' },
      forever(
        set('sign', op('blockmlHands_signOf', { INDEX: 1 })),
        // Only believe it when it is sure.
        ifElse(gt(op('blockmlHands_signConfidence', { INDEX: 1, SIGN: { reporter: v('sign'), shadow: signMenu('A') } }), 80),
          [say(join('Sign ', v('sign')))],
          [say('?')]),
      ),
    ],
  ], { x: 150, y: -100 });
  write('hand-signs.sb3', p);
}

// ---- 12. My chatbot (Chat AI): a ChatGPT-style chatbot with your own role (AI 13–16) ----
// Change the role to make your own character. Every question and answer goes through
// BlockML Studio's safety check; the robot says when an answer was blocked.

{
  const p = new Project();
  p.useExtension('blockmlChat', BASE + 'chat.js');
  p.variable('role', 'You are Robo, a cheerful robot who loves science and explains things simply.');
  p.showVariable('role', { x: 5, y: 5 });
  p.addStage([p.costume('white', WHITE, [240, 180])]);
  const smile = '<path d="M36 52 Q50 64 64 52" fill="none" stroke="#fca5a5" stroke-width="5" stroke-linecap="round"/>';
  p.addSprite('Robo', [p.costume('robot', robot(smile), [50, 55])], [[
    flag,
    { op: 'blockmlChat_setRole', inputs: { ROLE: v('role') } },
    { op: 'blockmlChat_start' },
    { op: 'control_repeat_until', inputs: { CONDITION: bool('blockmlChat_isReady') }, substack: [say(join('Loading my brain… ', join(op('blockmlChat_progress'), '%')))] },
    forever(
      { op: 'sensing_askandwait', inputs: { QUESTION: 'Ask me anything (type "bye" to start again):' } },
      ifElse(eq(op('sensing_answer'), 'bye'),
        [{ op: 'blockmlChat_forget' }, say('Bye! Let\'s start a new chat.')],
        [
          say('Thinking…'),
          { op: 'blockmlChat_ask', inputs: { QUESTION: op('sensing_answer') } },
          ifElse(bool('blockmlChat_wasBlocked'),
            [say(join('[Safety check] ', op('blockmlChat_answer')))],
            [say(op('blockmlChat_answer'))]),
        ]),
    ),
  ]], { x: 0, y: -60 });
  write('my-chatbot.sb3', p);
}
