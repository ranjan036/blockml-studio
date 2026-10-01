// Builds the syllabus game projects (CODE AI Core Curriculum) into
// ../gui/static/lessons/<game>/ (published at /lessons/ on the studio site).
// Each game has a basic version (coding only), an AI version, and a
// "fix the bug" version with one planted mistake for students to find.
//
// Extension URLs point at the production site by default, so saved projects work
// anywhere; set STARTER_BASE to test against a local build.
import fs from 'node:fs';
import path from 'node:path';
import { Project, op, bool, v } from './sb3.mjs';
import { lessonPage, indexPage, cardsPage, phrasesPage } from './lesson-pages.mjs';

const BASE = process.env.STARTER_BASE || 'https://studio.blockml.codeai.ltd/extensions/';
const OUT = path.join('..', 'gui', 'static', 'lessons');

// ---- blocks, written to read almost like Scratch -----------------------------

const flag = { op: 'event_whenflagclicked' };
const forever = (...body) => ({ op: 'control_forever', substack: body });
const ifThen = (condition, ...body) => ({ op: 'control_if', inputs: { CONDITION: condition }, substack: body });
const ifElse = (condition, yes, no) => ({ op: 'control_if_else', inputs: { CONDITION: condition }, substack: yes, substack2: no });
const waitUntil = (condition) => ({ op: 'control_wait_until', inputs: { CONDITION: condition } });
const stopAll = { op: 'control_stop', fields: { STOP_OPTION: 'all' }, mutation: { tagName: 'mutation', children: [], hasnext: 'false' } };
const set = (name, value) => ({ op: 'data_setvariableto', fields: { VARIABLE: name }, inputs: { VALUE: value } });
const change = (name, by) => ({ op: 'data_changevariableby', fields: { VARIABLE: name }, inputs: { VALUE: by } });
const say = (message) => ({ op: 'looks_say', inputs: { MESSAGE: message } });
const sayFor = (message, secs) => ({ op: 'looks_sayforsecs', inputs: { MESSAGE: message, SECS: secs } });
const costume = (name) => ({ op: 'looks_switchcostumeto', inputs: { COSTUME: { menu: 'looks_costume', field: 'COSTUME', value: name } } });
const costumeFrom = (variable, fallback) => ({ op: 'looks_switchcostumeto', inputs: { COSTUME: { reporter: v(variable), shadow: { menu: 'looks_costume', field: 'COSTUME', value: fallback } } } });
const goTo = (x, y) => ({ op: 'motion_gotoxy', inputs: { X: x, Y: y } });
const changeX = (dx) => ({ op: 'motion_changexby', inputs: { DX: dx } });
const changeY = (dy) => ({ op: 'motion_changeyby', inputs: { DY: dy } });
const yPosition = () => op('motion_yposition');
const random = (from, to) => op('operator_random', { FROM: from, TO: to });
const keyPressed = (key) => bool('sensing_keypressed', { KEY_OPTION: { menu: 'sensing_keyoptions', field: 'KEY_OPTION', value: key } });
const touching = (sprite) => bool('sensing_touchingobject', { TOUCHINGOBJECTMENU: { menu: 'sensing_touchingobjectmenu', field: 'TOUCHINGOBJECTMENU', value: sprite } });
const eq = (a, b) => bool('operator_equals', { OPERAND1: a, OPERAND2: b });
const lt = (a, b) => bool('operator_lt', { OPERAND1: a, OPERAND2: b });
const gt = (a, b) => bool('operator_gt', { OPERAND1: a, OPERAND2: b });
const and = (a, b) => bool('operator_and', { OPERAND1: a, OPERAND2: b });
const not = (a) => bool('operator_not', { OPERAND: a });
const sub = (a, b) => op('operator_subtract', { NUM1: a, NUM2: b });
const add = (a, b) => op('operator_add', { NUM1: a, NUM2: b });
const mul = (a, b) => op('operator_multiply', { NUM1: a, NUM2: b });
const div = (a, b) => op('operator_divide', { NUM1: a, NUM2: b });
const or = (a, b) => bool('operator_or', { OPERAND1: a, OPERAND2: b });
const join2 = (a, b) => op('operator_join', { STRING1: a, STRING2: b });
const round = (a) => op('operator_round', { NUM: a });
const repeatUntil = (condition, ...body) => ({ op: 'control_repeat_until', inputs: { CONDITION: condition }, substack: body });
const wait = (s) => ({ op: 'control_wait', inputs: { DURATION: s } });
const hide = { op: 'looks_hide' };
const show = { op: 'looks_show' };
const setX = (x) => ({ op: 'motion_setx', inputs: { X: x } });
const setY = (y) => ({ op: 'motion_sety', inputs: { Y: y } });
const xPosition = () => op('motion_xposition');
const goToSprite = (sprite) => ({ op: 'motion_goto', inputs: { TO: { menu: 'motion_goto_menu', field: 'TO', value: sprite } } });
const colorEffect = (value) => ({ op: 'looks_seteffectto', fields: { EFFECT: 'COLOR' }, inputs: { VALUE: value } });
const front = { op: 'looks_gotofrontback', fields: { FRONT_BACK: 'front' } };
const timer = () => op('sensing_timer');
const resetTimer = { op: 'sensing_resettimer' };
const cloneOf = (sprite = '_myself_') => ({ op: 'control_create_clone_of', inputs: { CLONE_OPTION: { menu: 'control_create_clone_of_menu', field: 'CLONE_OPTION', value: sprite } } });
const whenClone = { op: 'control_start_as_clone' };
const deleteClone = { op: 'control_delete_this_clone' };
const whenClicked = { op: 'event_whenthisspriteclicked' };
const whenKey = (key) => ({ op: 'event_whenkeypressed', fields: { KEY_OPTION: key } });
const broadcast = (message) => ({ op: 'event_broadcast', inputs: { BROADCAST_INPUT: { broadcast: message } } });
const whenReceive = (message) => ({ op: 'event_whenbroadcastreceived', fields: { BROADCAST_OPTION: message } });

const face = {
  camera: (state = 'on') => ({ op: 'blockmlFace_setCamera', fields: { STATE: state } }),
  transparency: (n) => ({ op: 'blockmlFace_setTransparency', inputs: { VALUE: n } }),
  count: () => op('blockmlFace_numberOfFaces'),
  value: (property, index = 1) => op('blockmlFace_faceValue', { INDEX: index }, { PROPERTY: property }),
  point: (axis, point, index = 1) => op('blockmlFace_pointValue', { INDEX: index }, { AXIS: axis, POINT: point }),
};
const pose = {
  camera: (state = 'on') => ({ op: 'blockmlHands_setCamera', fields: { STATE: state } }),
  transparency: (n) => ({ op: 'blockmlHands_setTransparency', inputs: { VALUE: n } }),
  point: (axis, point) => op('blockmlHands_bodyPoint', {}, { AXIS: axis, POINT: point }),
  visible: () => bool('blockmlHands_bodyVisible'),
};

const img = {
  camera: (state = 'on') => ({ op: 'blockmlImage_setCamera', fields: { STATE: state } }),
  transparency: (n) => ({ op: 'blockmlImage_setTransparency', inputs: { VALUE: n } }),
  trained: () => bool('blockmlImage_isTrained'),
  openTrainer: () => ({ op: 'blockmlImage_openTrainer' }),
  classify: () => ({ op: 'blockmlImage_classify' }),
  label: () => op('blockmlImage_imageLabel'),
  confidence: (name) => op('blockmlImage_confidenceOf', { CLASS: { menu: 'blockmlImage_menu_classes', field: 'classes', value: name } }),
};

const text = {
  ready: () => bool('blockmlText_isReady'),
  unkindScore: (message) => op('blockmlText_unkindScore', { TEXT: message }),
};

function write(game, file, project) {
  const dir = path.join(OUT, game);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), typeof project === 'string' ? project : project.toSb3('BlockML Studio lesson builder'));
  console.log('lesson:', `${game}/${file}`);
}

const cards = []; // for the index, in syllabus order

// ---- Game 2: Catch the Apple, Train Your Own Sorter (sessions 4–5) ------------
// Basic: variables, scoring, random spawn positions.
// AI (Level 2, Customize): the basket's lid is opened by the student's own image
// classifier: show a "good apple" card and it opens, a "bad apple" card and it
// closes. Good apples caught in an open basket score; bad apples that bounce off
// a closed lid score too (sorted!). A badly trained model loses the game.
{
  const game = 'game2-catch-the-apple';
  const orchard = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bae6fd"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient></defs>
<rect width="480" height="360" fill="url(#sky)"/>
<circle cx="410" cy="55" r="30" fill="#fde047"/>
<g fill="#15803d"><circle cx="60" cy="150" r="55"/><circle cx="110" cy="120" r="45"/><circle cx="400" cy="160" r="60"/><circle cx="350" cy="130" r="40"/></g>
<g fill="#92400e"><rect x="75" y="170" width="22" height="120"/><rect x="385" y="190" width="24" height="100"/></g>
<g fill="#dc2626"><circle cx="45" cy="140" r="7"/><circle cx="95" cy="110" r="7"/><circle cx="120" cy="150" r="7"/><circle cx="380" cy="150" r="7"/><circle cx="420" cy="175" r="7"/></g>
<rect y="285" width="480" height="75" fill="#65a30d"/><rect y="285" width="480" height="8" fill="#4d7c0f"/></svg>`;
  const basket = (lid) => `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80">
<path d="M8 28 H112 L100 76 H20 Z" fill="#b45309" stroke="#78350f" stroke-width="4" stroke-linejoin="round"/>
<path d="M22 40 H98 M26 54 H94 M30 66 H90" stroke="#78350f" stroke-width="3"/>
${lid === 'open'
    ? '<path d="M10 26 L2 4" stroke="#78350f" stroke-width="6" stroke-linecap="round"/><path d="M110 26 L118 4" stroke="#78350f" stroke-width="6" stroke-linecap="round"/>'
    : '<rect x="4" y="16" width="112" height="14" rx="6" fill="#57534e" stroke="#292524" stroke-width="3"/><circle cx="60" cy="14" r="5" fill="#292524"/>'}</svg>`;
  const apple = (good) => `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="54" viewBox="0 0 50 54">
<path d="M25 12 C18 4 2 8 4 26 C6 44 16 52 25 48 C34 52 44 44 46 26 C48 8 32 4 25 12 Z" fill="${good ? '#dc2626' : '#8b5e34'}" stroke="${good ? '#7f1d1d' : '#422006'}" stroke-width="3"/>
<path d="M25 12 V3" stroke="#422006" stroke-width="3" stroke-linecap="round"/>
<path d="M26 7 C32 1 40 3 41 6 C36 10 30 10 26 7 Z" fill="#16a34a"/>
${good ? '<ellipse cx="15" cy="22" rx="4" ry="7" fill="#fca5a5"/>' : '<circle cx="17" cy="26" r="5" fill="#422006"/><circle cx="32" cy="34" r="4" fill="#422006"/><circle cx="28" cy="20" r="3" fill="#422006"/>'}</svg>`;

  // One apple falling: basic game logic, shared by all three versions.
  // groundY: where the apple counts as missed (the fix-the-bug version gets it wrong).
  const basicApple = (groundY) => [[
    flag,
    set('score', 0),
    set('lives', 3),
    set('speed', 4),
    goTo(random(-210, 210), 170),
    forever(
      changeY(sub(0, v('speed'))),
      ifThen(touching('Basket'),
        change('score', 1),
        change('speed', 0.3), // a little faster after every catch
        goTo(random(-210, 210), 170)),
      ifThen(lt(yPosition(), groundY),
        change('lives', -1),
        goTo(random(-210, 210), 170)),
      ifThen(eq(v('lives'), 0),
        sayFor('Game over!', 2),
        stopAll),
    ),
  ]];
  const basketKeys = [
    flag,
    goTo(0, -130),
    forever(
      ifThen(keyPressed('right arrow'), changeX(10)),
      ifThen(keyPressed('left arrow'), changeX(-10)),
    ),
  ];

  const basicProject = (groundY) => {
    const p = new Project();
    p.addStage([p.costume('orchard', orchard, [240, 180])]);
    p.addSprite('Basket', [p.costume('open', basket('open'), [60, 40])], [basketKeys], { x: 0, y: -130 });
    p.addSprite('Apple', [p.costume('good', apple(true), [25, 27])], basicApple(groundY), { x: 0, y: 170 });
    p.showVariable('score', { x: 5, y: 5 });
    p.showVariable('lives', { x: 5, y: 32 });
    return p;
  };
  write(game, 'basic.sb3', basicProject(-150));
  // Planted bug: the stage bottom is y = -180, and Scratch keeps sprites on the
  // stage, so the apple can never go below -250: lives never go down.
  write(game, 'fix-the-bug.sb3', basicProject(-250));

  // AI version.
  const p = new Project();
  p.useExtension('blockmlImage', BASE + 'image.js');
  // Empty classes, ready to fill in the trainer with photos of real apples or printed apple cards.
  p.extensionStorage.blockmlImage = {
    version: 1,
    features: 'mobilenet_v2_100_224',
    classes: ['Good apple', 'Bad apple', 'Nothing'].map((name) => ({ name, samples: [] })),
  };
  p.addStage([p.costume('orchard', orchard, [240, 180])]);
  p.addSprite('Basket', [
    p.costume('closed', basket('closed'), [60, 40]),
    p.costume('open', basket('open'), [60, 40]),
  ], [
    basketKeys,
    [
      flag,
      set('lid', 'closed'),
      img.camera('on'),
      img.transparency(75),
      // The model must be trained before the game can use it.
      ifThen(not(img.trained()),
        say('Train me first: good apples, bad apples, and nothing.'),
        img.openTrainer(),
        waitUntil(img.trained())),
      say(''),
      forever(
        img.classify(),
        // Only open when the AI is sure it sees a good apple.
        ifElse(and(eq(img.label(), 'Good apple'), gt(img.confidence('Good apple'), 70)),
          [set('lid', 'open')],
          [set('lid', 'closed')]),
        costumeFrom('lid', 'closed'),
      ),
    ],
  ], { x: 0, y: -130 });

  const respawn = [
    goTo(random(-210, 210), 170),
    // One apple in three is bad.
    ifElse(eq(random(1, 3), 1), [set('apple', 'bad')], [set('apple', 'good')]),
    costumeFrom('apple', 'good'),
  ];
  p.addSprite('Apple', [
    p.costume('good', apple(true), [25, 27]),
    p.costume('bad', apple(false), [25, 27]),
  ], [[
    flag,
    set('score', 0),
    set('lives', 3),
    set('speed', 3),
    ...respawn,
    forever(
      changeY(sub(0, v('speed'))),
      ifThen(touching('Basket'),
        ifElse(eq(v('lid'), 'open'),
          [ifElse(eq(v('apple'), 'good'),
            [change('score', 1), sayFor('Yum!', 0.5)],
            [change('lives', -1), sayFor('Yuck! A bad apple got in.', 1)])],
          [ifElse(eq(v('apple'), 'bad'),
            [change('score', 1), sayFor('Sorted! Bad apple kept out.', 0.5)],
            [sayFor('Oh no, the lid was shut!', 1)])]),
        change('speed', 0.2),
        ...respawn),
      ifThen(lt(yPosition(), -150),
        // Letting a bad apple fall is fine; losing a good one costs a life.
        ifThen(eq(v('apple'), 'good'), change('lives', -1)),
        ...respawn),
      ifThen(eq(v('lives'), 0),
        sayFor('Game over!', 2),
        stopAll),
    ),
  ]], { x: 0, y: 170 });
  p.showVariable('score', { x: 5, y: 5 });
  p.showVariable('lives', { x: 5, y: 32 });
  p.showVariable('lid', { x: 5, y: 59 });
  write(game, 'ai.sb3', p);

  // Printable cards to train the sorter with (real apples work too).
  const turned = (svg, deg, scale = 1) => svg.replace('<path', `<g transform="rotate(${deg} 25 27) translate(25 27) scale(${scale}) translate(-25 -27)"><path`).replace(/<\/svg>$/, '</g></svg>');
  write(game, 'cards.html', cardsPage('Apple cards: good and bad', [
    ...[[0, 1], [-20, 0.8], [25, 0.9]].map(([d, s]) => ['Good apple', turned(apple(true), d, s)]),
    ...[[0, 1], [15, 0.85], [-25, 0.9]].map(([d, s]) => ['Bad apple', turned(apple(false), d, s)]),
  ]));

  const card = {
    slug: game,
    number: 2,
    kicker: 'Game 2 · Sessions 4–5 · AI Level 2: Customize (flagship)',
    title: 'Catch the Apple, Train Your Own Sorter',
    objective: "I can give an AI examples with labels so it learns to sort things the way I want — and I can test it to see when it works and when it doesn't.",
    coding: ['variables', 'scoring', 'random positions', 'if', 'coordinates', 'and', 'comparing text'],
    ai: ['Example', 'Label', 'Train', 'Predict', 'confidence', 'image classifier'],
    extraButtons: '<a class="btn light" href="cards.html" target="_blank" rel="noopener">🖨 Print apple cards</a>',
    materials: [
      'Laptop with a webcam (one per pair is fine)',
      'Printed apple cards (button above), or real good and bruised apples',
      'AI Vocabulary Card: Example, Label, Train, Predict',
    ],
    sessions: [
      {
        title: 'Session 4: build the base game',
        steps: [
          'Open <b>Basic game</b> and press the green flag: arrow keys move the basket.',
          'Find <code>set score to 0</code> and <code>set lives to 3</code>: these are <b>variables</b>, the game\'s memory.',
          'Find <code>go to x: (pick random -210 to 210) y: 170</code>: a <b>random position</b>, so every apple starts somewhere new.',
          'Read the <code>if touching Basket</code> and <code>if y position &lt; -150</code> blocks: what happens to score and lives?',
          'Change the numbers: start faster, more lives, a smaller basket. Test after each change.',
        ],
      },
      {
        title: 'Session 5: train your own apple sorter',
        say: '“The AI has never seen apples. We will show it <b>examples</b>, give each a <b>label</b>, and it will <b>train</b> itself to <b>predict</b> the label of apples it has never seen.”',
        steps: [
          'Open <b>AI version</b> and press the green flag: the trainer opens with three classes, <i>Good apple</i>, <i>Bad apple</i> and <i>Nothing</i>.',
          'Hold a good apple card up and <b>hold</b> its record button: 20+ photos, moving the card around. Then bad apples. Then <i>Nothing</i>: just you and the room.',
          'Press <b>Train model</b> and watch accuracy rise. Test live, then press <b>Done</b>.',
          'Play in pairs: one steers with the arrow keys, one shows the camera the card that matches the falling apple. Good apple card → the lid opens.',
          'Read the Basket\'s code: <code>if label = Good apple and confidence of Good apple &gt; 70</code>. Try 50 and 95: what changes?',
          'Save the project (File → Save to your computer): the trained model is saved inside it.',
        ],
      },
    ],
    failTests: [
      'Train with only 3 near-identical photos per class, then with 20 varied ones. Which sorts better?',
      'Dim the lights or stand in front of a window.',
      'Cover half the card with your hand. Show a red ball or a red phone case.',
      'Show the bad apple card very close, then far away.',
      'Ask: “Could it sort good and bad bananas? What would you have to do?”',
    ],
    misconceptions: [
      ['The AI understands what an apple is.', "It matches patterns of pixels and colours; it has no idea what an apple is. A red ball can fool it."],
      ['More examples always means a better result.', 'Variety matters more than quantity: different angles, distances and light.'],
      ['If it makes a mistake, it\'s broken.', 'Every AI model has an error rate. Ask: what would you change to help it improve?'],
      ['Once trained, it works perfectly forever.', 'New lighting, backgrounds and angles can confuse it: that is what the fail-tests show.'],
    ],
    bug: {
      symptom: 'In <b>Fix the bug</b>, apples that fall to the ground just sit there, and you never lose a life.',
      hints: ['Where is the bottom of the stage? Move the mouse to the bottom edge and read its y.', 'Which block checks if the apple reached the ground?'],
      answer: 'The ground check is <code>if y position &lt; -250</code>, but the stage only goes down to y = −180, and Scratch keeps sprites on the stage, so it is never true. Change −250 to −150.',
    },
    challenges: [
      'Add a golden apple worth 5 points.',
      'Keep a high score variable that survives a restart.',
      'Add a fourth class, “Rotten apple”, that costs two lives if it gets in.',
      'Make the lid need 90% confidence: is the game harder or fairer?',
    ],
    app: [
      'Train and test the AI version in BlockML Studio, then <b>save</b> it: the trained model goes into the .sb3 file.',
      'Open blockml.codeai.ltd → <b>Export Scratch Games to App</b>, add the saved file, and make the app.',
      'On the phone, the arrow keys become on-screen buttons and the app asks to use the camera the first time.',
      'An untrained model opens the trainer in the app too, but that training is lost when the app closes: train in Studio first.',
    ],
    offline: [
      'No camera: play the basic game (arrow keys only).',
      'Unplugged card sort: students sort printed apple cards into “good” and “bad” piles and say why. That is labelling, the same thing the AI learns from.',
      'Everything runs on the laptop: after the first visit, the AI needs no internet.',
    ],
  };
  write(game, 'index.html', lessonPage(card));
  cards.push(card);
}

// ---- Game 3: Balloon Pop, Smile to Pop (sessions 6–7) -------------------------
// Basic: cloning, timers, scoring, and "for this sprite only" variables (each
// clone its own speed). AI (Level 1, Use): a pin follows your nose and a smile
// pops the balloon it touches — hands-free.
{
  const game = 'game3-balloon-pop';
  const sky = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient></defs>
<rect width="480" height="360" fill="url(#s)"/>
<g fill="#ffffff" opacity=".9"><ellipse cx="90" cy="70" rx="46" ry="18"/><ellipse cx="120" cy="60" rx="30" ry="18"/><ellipse cx="360" cy="110" rx="52" ry="18"/><ellipse cx="395" cy="98" rx="30" ry="16"/></g>
<rect y="320" width="480" height="40" fill="#86efac"/></svg>`;
  const balloon = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="90" viewBox="0 0 60 90">
<path d="M30 60 C30 70 26 76 30 88" fill="none" stroke="#475569" stroke-width="2"/>
<ellipse cx="30" cy="30" rx="26" ry="30" fill="#ef4444" stroke="#991b1b" stroke-width="3"/>
<path d="M26 60 L34 60 L30 66 Z" fill="#991b1b"/><ellipse cx="20" cy="18" rx="6" ry="9" fill="#fecaca"/></svg>`;
  const pin = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
<circle cx="22" cy="22" r="18" fill="none" stroke="#0b3d6d" stroke-width="4"/><circle cx="22" cy="22" r="4" fill="#ffcc00" stroke="#0b3d6d" stroke-width="2"/>
<path d="M22 0 V10 M22 34 V44 M0 22 H10 M34 22 H44" stroke="#0b3d6d" stroke-width="4"/></svg>`;
  const banner = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="90" viewBox="0 0 300 90">
<rect x="3" y="3" width="294" height="84" rx="20" fill="#0b3d6d" stroke="#ffcc00" stroke-width="5"/>
<text x="150" y="58" font-family="Arial, sans-serif" font-size="36" font-weight="bold" text-anchor="middle" fill="#ffcc00">Time's up!</text></svg>`;

  // withSmile: pop by smiling at the pin instead of clicking. localSpeed: false plants the bug.
  const project = ({ withSmile = false, localSpeed = true } = {}) => {
    const p = new Project();
    if (withSmile) p.useExtension('blockmlFace', BASE + 'face.js');
    p.addStage([p.costume('sky', sky, [240, 180])], [[
      flag,
      resetTimer,
      set('score', 0),
      repeatUntil(gt(timer(), 30),
        set('time left', round(sub(30, timer())))),
      set('time left', 0),
      broadcast("time's up"),
    ]]);
    const popped = [change('score', 1), deleteClone];
    const balloonScripts = [
      [
        flag,
        hide,
        // A new balloon every half second or so, until the time is up.
        repeatUntil(gt(timer(), 30),
          cloneOf(),
          wait(random(0.4, 1))),
      ],
      [
        whenClone,
        // Every clone gets its own speed ("for this sprite only").
        set('speed', random(2, 5)),
        goTo(random(-210, 210), -160),
        colorEffect(random(0, 200)),
        show,
        repeatUntil(gt(yPosition(), 160),
          changeY(v('speed')),
          ...(withSmile
            ? [ifThen(and(touching('Pin'), gt(face.value('smile'), 50)), ...popped)]
            : [])),
        deleteClone,
      ],
      [whenReceive("time's up"), deleteClone],
    ];
    if (!withSmile) balloonScripts.push([whenClicked, ...popped]);
    p.addSprite('Balloon', [p.costume('balloon', balloon, [30, 45])], balloonScripts,
      { x: 0, y: -160, visible: false, variables: localSpeed ? ['speed'] : [] });
    if (withSmile) {
      p.addSprite('Pin', [p.costume('pin', pin, [22, 22])], [[
        flag,
        face.camera('on'),
        face.transparency(60),
        front,
        forever(
          // Follow the nose; hide when no face is seen.
          ifElse(gt(face.count(), 0),
            [show, goTo(face.point('x', 'nose tip'), face.point('y', 'nose tip'))],
            [hide])),
      ]]);
    }
    p.addSprite('Banner', [p.costume('banner', banner, [150, 45])], [
      [flag, hide],
      [whenReceive("time's up"), front, show, sayFor(join2('Score: ', v('score')), 3), { op: 'control_stop', fields: { STOP_OPTION: 'all' }, mutation: { tagName: 'mutation', children: [], hasnext: 'false' } }],
    ], { visible: false });
    p.showVariable('score', { x: 5, y: 5 });
    p.showVariable('time left', { x: 5, y: 32 });
    return p;
  };
  write(game, 'basic.sb3', project());
  write(game, 'ai.sb3', project({ withSmile: true }));
  // Planted bug: speed is shared by all balloons, so each new balloon changes every balloon's speed.
  write(game, 'fix-the-bug.sb3', project({ localSpeed: false }));

  const card = {
    slug: game,
    number: 3,
    kicker: 'Game 3 · Sessions 6–7 · AI Level 1: Use',
    title: 'Balloon Pop, Smile to Pop',
    objective: 'I can use cloning and timers, and use a real AI model (face detection) to control gameplay hands-free.',
    coding: ['clones', 'timer', 'scoring', 'repeat until', '"for this sprite only" variables', 'broadcast'],
    ai: ['face detection', 'facial landmark points', 'threshold'],
    materials: ['Laptop with a webcam', 'Good light on your face (face the window, not your back to it)'],
    sessions: [
      {
        title: 'Session 6: build the balloons',
        steps: [
          'Open <b>Basic game</b>, press the green flag and click balloons to pop them. You have 30 seconds.',
          'Find <code>create clone of myself</code>: one Balloon sprite makes many copies (<b>clones</b>).',
          'Find <code>when I start as a clone</code>: every clone runs this script on its own.',
          'Click the <b>speed</b> variable: it is <b>for this sprite only</b>, so each clone has its own speed. Why does that matter?',
          'Find the <b>timer</b> on the Stage and the <code>broadcast time\'s up</code> message: which sprites listen to it?',
        ],
      },
      {
        title: 'Session 7: smile to pop',
        say: '“This AI has seen thousands of faces, so it learned where eyes, a nose and a mouth are — dozens of <b>landmark points</b>. From the shape of the mouth points, it works out a smile.”',
        steps: [
          'Open <b>AI version</b>. The pin follows your <b>nose</b>: <code>go to x: (x of nose tip of face 1) y: (y of nose tip of face 1)</code>.',
          'Move your head to put the pin on a balloon, then smile to pop it.',
          'Find <code>smile of face 1 &gt; 50</code>. Try 20 and 90: what happens?',
          'Add <code>show points on stage</code> from the Face blocks to see the landmark points the AI tracks.',
        ],
      },
    ],
    failTests: [
      'Dim the lights, or sit with a bright window behind you.',
      'Cover your mouth with your hand. Half-smile. Open your mouth wide without smiling.',
      'Turn your head to the side, or move far from the camera.',
      'Put a photo of a smiling face in front of the camera: does it count?',
    ],
    misconceptions: [
      ['The AI sees me the way I see myself.', 'It only tracks landmark points (dots on eyes, nose, mouth) and does geometry on them.'],
      ['The AI knows I am happy.', 'It measures the shape of your mouth. A fake smile scores the same as a real one.'],
      ['It should work the same in any lighting.', 'Light and angle change the picture — that is what the fail-tests show.'],
    ],
    bug: {
      symptom: 'In <b>Fix the bug</b>, all the balloons suddenly speed up or slow down together whenever a new balloon appears.',
      hints: ['Every clone sets <code>speed</code> when it starts. Which balloons does that change?', 'Right-click the speed variable → rename… look at the “for all sprites / for this sprite only” choice.'],
      answer: '<code>speed</code> was made <b>for all sprites</b>, so there is only one speed shared by every balloon; each new clone overwrites it. Delete it and make a new variable <code>speed</code> <b>for this sprite only</b> — then every clone keeps its own.',
    },
    challenges: [
      'Make a golden balloon (rare) worth 5 points.',
      'Balloons get faster as time runs out.',
      'AI version: pop only with a big smile (> 80) for double points.',
      'Use <code>mouth open</code> instead of smile: pop by saying “Oh!”.',
    ],
    app: [
      'Save your project, then open blockml.codeai.ltd → <b>Export Scratch Games to App</b> and add it.',
      'Basic game: tap balloons to pop them. AI version: the app asks to use the front camera.',
    ],
    offline: [
      'No camera: play the basic game (click or tap to pop).',
      'Everything runs on the laptop: after the first visit, face detection needs no internet.',
    ],
  };
  write(game, 'index.html', lessonPage(card));
  cards.push(card);
}

// ---- Game 4: Dino Jump, Jump When You Jump (sessions 8–9) ---------------------
// Basic: gravity simulation (a y-speed variable), conditions, "and", "repeat
// until". AI (Level 1, Use): pose detection — the dino jumps when your nose
// rises above where it was when you stood still.
{
  const game = 'game4-dino-jump';
  const GROUND = -95;
  const desert = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
<rect width="480" height="360" fill="#fef3c7"/><circle cx="400" cy="70" r="34" fill="#fb923c"/>
<path d="M0 230 Q80 190 160 225 T320 215 T480 225 V360 H0 Z" fill="#fde68a"/>
<rect y="302" width="480" height="58" fill="#d6a45a"/><rect y="300" width="480" height="5" fill="#92400e"/>
<g fill="#b45309" opacity=".5"><circle cx="60" cy="330" r="3"/><circle cx="210" cy="340" r="2"/><circle cx="330" cy="325" r="3"/><circle cx="440" cy="345" r="2"/></g></svg>`;
  const dino = `<svg xmlns="http://www.w3.org/2000/svg" width="70" height="70" viewBox="0 0 70 70">
<path d="M14 44 C8 44 4 38 2 30 C10 36 14 34 18 32 L20 20 C20 10 28 4 40 4 H56 C64 4 68 10 68 16 V24 C68 28 64 30 60 30 H46 V36 L54 38 V42 H46 V48 C46 58 40 62 34 62 V68 H28 V62 H22 V68 H16 V60 C14 56 14 50 14 44 Z" fill="#16a34a" stroke="#14532d" stroke-width="3" stroke-linejoin="round"/>
<circle cx="48" cy="13" r="4" fill="#ffffff"/><circle cx="49" cy="13" r="2" fill="#111827"/></svg>`;
  const cactus = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="60" viewBox="0 0 36 60">
<path d="M14 58 V10 C14 2 22 2 22 10 V58 Z M14 34 H8 C4 34 2 30 2 26 V18 C2 14 8 14 8 18 V26 H14 M22 28 H28 V16 C28 12 34 12 34 16 V26 C34 32 30 34 26 34 H22" fill="#15803d" stroke="#14532d" stroke-width="2.5" stroke-linejoin="round"/></svg>`;

  // withPose: jump for real. onGroundCheck: false plants the bug (jumping in mid-air).
  const project = ({ withPose = false, onGroundCheck = true } = {}) => {
    const p = new Project();
    if (withPose) p.useExtension('blockmlHands', BASE + 'hands.js');
    p.addStage([p.costume('desert', desert, [240, 180])]);
    const onGround = eq(yPosition(), GROUND);
    let jumpPressed = keyPressed('space');
    if (withPose) {
      // Your nose is higher than when you stood still: you jumped!
      jumpPressed = or(keyPressed('space'), and(pose.visible(), gt(pose.point('y', 'nose'), add(v('standing'), 35))));
    }
    const dinoScripts = [[
      flag,
      goTo(-160, GROUND),
      set('y speed', 0),
      ...(withPose ? [
        pose.camera('on'),
        pose.transparency(60),
        say('Stand still so I can see you…'),
        waitUntil(pose.visible()),
        wait(2),
        set('standing', pose.point('y', 'nose')),
        sayFor('Now jump!', 1),
      ] : []),
      broadcast('go'),
      forever(
        // Jump only from the ground: that's what the "and" is for.
        ifThen(onGroundCheck ? and(jumpPressed, onGround) : jumpPressed, set('y speed', 16)),
        // Gravity: pull the speed down a little every frame, then move by it.
        change('y speed', -1.2),
        changeY(v('y speed')),
        ifThen(lt(yPosition(), GROUND), setY(GROUND), set('y speed', 0)),
      ),
    ]];
    if (withPose) {
      dinoScripts.push([whenKey('c'), sayFor('Stand still…', 1.5), set('standing', pose.point('y', 'nose')), sayFor('Ready!', 0.5)]);
    }
    p.addSprite('Dino', [p.costume('dino', dino, [35, 35])], dinoScripts, { x: -160, y: GROUND, rotationStyle: "don't rotate" });
    p.addSprite('Cactus', [p.costume('cactus', cactus, [18, 30])], [[flag, goTo(230, GROUND), set('score', 0), set('speed', 6)], [
      // The cactus starts when the dino is ready (in the AI version, after calibrating).
      whenReceive('go'),
      forever(
        goTo(230, GROUND),
        // Slide left until off the left side (Scratch keeps sprites on stage, so -225, not -260).
        repeatUntil(lt(xPosition(), -225),
          changeX(sub(0, v('speed'))),
          ifThen(touching('Dino'), sayFor('Ouch! Game over', 2), stopAll)),
        change('score', 1),
        change('speed', 0.4)),
    ]], { x: 230, y: GROUND });
    p.showVariable('score', { x: 5, y: 5 });
    return p;
  };
  write(game, 'basic.sb3', project());
  write(game, 'ai.sb3', project({ withPose: true }));
  write(game, 'fix-the-bug.sb3', project({ onGroundCheck: false }));

  const card = {
    slug: game,
    number: 4,
    kicker: 'Game 4 · Sessions 8–9 · AI Level 1: Use',
    title: 'Dino Jump, Jump When You Jump',
    objective: 'I can use gravity and conditions, and use pose detection to control my character with my own body.',
    coding: ['gravity (a speed variable)', 'if', 'and / or', 'repeat until', 'coordinates'],
    ai: ['pose detection', 'key points on the body', 'calibration'],
    materials: ['Laptop with a webcam', 'Clear, safe space to jump; the whole upper body in the camera'],
    sessions: [
      {
        title: 'Session 8: gravity and jumping',
        steps: [
          'Open <b>Basic game</b>: press space to jump over the cacti.',
          'Find <code>y speed</code>. Every frame: <code>change y speed by -1.2</code> (gravity pulls), then <code>change y by (y speed)</code> (move). That is how real falling works: speed changes, and speed changes position.',
          'Find <code>if &lt;key space pressed&gt; and &lt;y position = -95&gt;</code>: why do we need the <b>and</b>?',
          'Find <code>repeat until x position &lt; -225</code> in the Cactus: a loop that stops by itself.',
          'Change the jump (16) and gravity (-1.2): make it a moon jump, then a heavy jump.',
        ],
      },
      {
        title: 'Session 9: jump when you jump',
        say: '“This AI has watched many people move, so it finds 17 <b>key points</b> on a body: nose, shoulders, elbows, wrists, hips, knees, ankles. It does not see you like a photo — just those dots.”',
        steps: [
          'Open <b>AI version</b>, step back so your upper body is in view, and stand still: the game remembers your nose height (<code>standing</code>).',
          'Jump! When <code>y of nose of body &gt; standing + 35</code>, the dino jumps too.',
          'Press <b>c</b> to re-measure (calibrate) if you moved closer or further.',
          'Change 35 to 15 and to 80: what goes wrong each time?',
        ],
      },
    ],
    failTests: [
      'Small hop versus big jump. Squat and stand up. Stand on tiptoe.',
      'Move sideways, or walk closer to the camera: does it think you jumped?',
      'Only your head in the frame. Two people in the frame.',
    ],
    misconceptions: [
      ['It tracks my exact body like a photo.', 'It tracks 17 key points only. Everything else is our own code comparing numbers.'],
      ['Every jump should register the same.', 'Jump size and where you stand change the numbers — that is why we calibrate.'],
      ['The AI decides when to jump.', 'The AI only reports where your nose is. Our "if" decides what counts as a jump.'],
    ],
    bug: {
      symptom: 'In <b>Fix the bug</b>, holding space makes the dino fly up and away.',
      hints: ['When should jumping be allowed?', 'Compare the jump "if" with the one in the basic game.'],
      answer: 'The jump check is only <code>if key space pressed</code>, so the dino can jump again in mid-air every frame. It needs <code>and &lt;y position = -95&gt;</code>: jump only when standing on the ground.',
    },
    challenges: [
      'Add a flying bird that you must NOT jump over (duck with the down arrow).',
      'Show the best score of the day in a second variable.',
      'AI version: a double-high jump when both wrists are above your nose.',
    ],
    app: [
      'Save, then open blockml.codeai.ltd → <b>Export Scratch Games to App</b> and add the project.',
      'Space becomes an on-screen button. The AI version asks for the camera; prop the phone up far enough to see your body.',
    ],
    offline: [
      'No camera: play the basic game (space or the up arrow).',
      'Everything runs on the laptop: after the first visit, pose detection needs no internet.',
    ],
  };
  write(game, 'index.html', lessonPage(card));
  cards.push(card);
}

// ---- Game 5: Space Shooter, Friend or Foe (sessions 10–11) --------------------
// Basic: multiple sprites, bullets (clones), lives, broadcast. AI (Level 2,
// Customize, flagship #2): the student's own Friend / Foe / Nothing classifier
// unlocks the weapons only when it sees a foe card, and lets friends dock.
{
  const game = 'game5-space-shooter';
  const space = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
<rect width="480" height="360" fill="#0f172a"/>
<g fill="#ffffff">${Array.from({ length: 70 }, (_, i) => `<circle cx="${(i * 97) % 480}" cy="${(i * 59) % 360}" r="${i % 5 === 0 ? 1.8 : 1}" opacity="${0.4 + (i % 4) * 0.15}"/>`).join('')}</g>
<circle cx="410" cy="60" r="26" fill="#6366f1" opacity=".7"/><ellipse cx="410" cy="60" rx="40" ry="8" fill="none" stroke="#a5b4fc" stroke-width="3" opacity=".7"/></svg>`;
  const player = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
<path d="M30 2 L42 30 L58 44 L58 52 L38 46 L34 56 H26 L22 46 L2 52 L2 44 L18 30 Z" fill="#e2e8f0" stroke="#475569" stroke-width="3" stroke-linejoin="round"/>
<circle cx="30" cy="24" r="6" fill="#38bdf8"/><path d="M26 56 L30 62 L34 56" fill="#fb923c"/></svg>`;
  const bullet = '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="20" viewBox="0 0 8 20"><rect x="1" y="1" width="6" height="18" rx="3" fill="#fde047"/></svg>';
  // Friend: rounded green ship with a white star. Foe: spiky red ship with a skull-like face.
  const friend = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="50" viewBox="0 0 60 50">
<ellipse cx="30" cy="28" rx="28" ry="14" fill="#22c55e" stroke="#14532d" stroke-width="3"/><ellipse cx="30" cy="20" rx="12" ry="10" fill="#bbf7d0" stroke="#14532d" stroke-width="3"/>
<path d="M30 12 L32 17 L37 17 L33 20 L35 25 L30 22 L25 25 L27 20 L23 17 L28 17 Z" fill="#ffffff"/></svg>`;
  const foe = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="50" viewBox="0 0 60 50">
<path d="M2 10 L18 18 L30 4 L42 18 L58 10 L50 30 L58 46 L30 38 L2 46 L10 30 Z" fill="#dc2626" stroke="#450a0a" stroke-width="3" stroke-linejoin="round"/>
<circle cx="23" cy="26" r="4" fill="#fde047"/><circle cx="37" cy="26" r="4" fill="#fde047"/></svg>`;
  const mystery = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="50" viewBox="0 0 60 50">
<ellipse cx="30" cy="28" rx="28" ry="14" fill="#dc2626" stroke="#450a0a" stroke-width="3"/><ellipse cx="30" cy="20" rx="12" ry="10" fill="#fecaca" stroke="#450a0a" stroke-width="3"/>
<circle cx="25" cy="20" r="3" fill="#fde047"/><circle cx="35" cy="20" r="3" fill="#fde047"/></svg>`;
  const gameOverSign = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="90" viewBox="0 0 300 90">
<rect x="3" y="3" width="294" height="84" rx="20" fill="#0b3d6d" stroke="#ffcc00" stroke-width="5"/>
<text x="150" y="58" font-family="Arial, sans-serif" font-size="36" font-weight="bold" text-anchor="middle" fill="#ffcc00">Game over</text></svg>`;

  // withAI: weapons and docking follow the classifier. gameOverMessage: the one the sign listens for (the bug renames it).
  const project = ({ withAI = false, gameOverMessage = 'game over' } = {}) => {
    const p = new Project();
    if (withAI) {
      p.useExtension('blockmlImage', BASE + 'image.js');
      p.extensionStorage.blockmlImage = {
        version: 1,
        features: 'mobilenet_v2_100_224',
        classes: ['Friend', 'Foe', 'Nothing'].map((name) => ({ name, samples: [] })),
      };
    }
    p.addStage([p.costume('space', space, [240, 180])]);
    const fire = cloneOf('Bullet');
    const shipScripts = [
      [
        flag,
        goTo(0, -140),
        set('lives', 3),
        set('score', 0),
        forever(
          ifThen(keyPressed('right arrow'), changeX(8)),
          ifThen(keyPressed('left arrow'), changeX(-8)),
          ifThen(lt(v('lives'), 1), broadcast('game over'))),
      ],
      [whenKey('space'), withAI
        ? ifElse(eq(v('mode'), 'Foe'), [fire], [sayFor('Weapons locked: show me a foe!', 0.8)])
        : fire],
    ];
    if (withAI) {
      shipScripts.push([
        flag,
        set('mode', 'Nothing'),
        img.camera('on'),
        img.transparency(80),
        ifThen(not(img.trained()),
          say('Train me first: Friend, Foe and Nothing cards.'),
          img.openTrainer(),
          waitUntil(img.trained())),
        say(''),
        forever(
          img.classify(),
          // Trust the AI only when it is sure; otherwise stay safe.
          ifElse(and(eq(img.label(), 'Foe'), gt(img.confidence('Foe'), 70)),
            [set('mode', 'Foe')],
            [ifElse(and(eq(img.label(), 'Friend'), gt(img.confidence('Friend'), 70)),
              [set('mode', 'Friend')],
              [set('mode', 'Nothing')])])),
      ]);
    }
    p.addSprite('Ship', [p.costume('ship', player, [30, 30])], shipScripts, { x: 0, y: -140, rotationStyle: "don't rotate" });
    p.addSprite('Bullet', [p.costume('bullet', bullet, [4, 10])], [
      [flag, hide],
      [whenClone, goToSprite('Ship'), show,
        repeatUntil(or(gt(yPosition(), 165), touching('Visitor')), changeY(12)),
        wait(0.05), // stay a moment, so the visitor it hit notices
        deleteClone],
    ], { visible: false });
    const docked = withAI
      ? ifElse(eq(v('mode'), 'Friend'), [change('score', 2)], [sayFor('Let me dock! Show me a friend card.', 0.5)])
      : change('score', 2);
    p.addSprite('Visitor', [p.costume('foe', foe, [30, 25]), p.costume('friend', friend, [30, 25])], [
      [flag, hide, forever(wait(random(1, 2)), cloneOf())],
      [
        whenClone,
        // Each visitor is its own kind: one in three is a friend.
        ifElse(eq(random(1, 3), 1), [set('kind', 'friend')], [set('kind', 'foe')]),
        costumeFrom('kind', 'foe'),
        goTo(random(-200, 200), 165),
        show,
        repeatUntil(lt(yPosition(), -160),
          changeY(-2.5),
          ifThen(touching('Bullet'),
            ifElse(eq(v('kind'), 'foe'), [change('score', 1)], [change('lives', -1)]),
            deleteClone),
          ifThen(touching('Ship'),
            ifElse(eq(v('kind'), 'foe'), [change('lives', -1)], [docked]),
            deleteClone)),
        deleteClone,
      ],
      [whenReceive('game over'), deleteClone],
    ], { visible: false, variables: ['kind'] });
    p.addSprite('Sign', [p.costume('game over', gameOverSign, [150, 45])], [
      [flag, hide],
      [whenReceive(gameOverMessage), front, show, stopAll],
    ], { visible: false });
    p.showVariable('score', { x: 5, y: 5 });
    p.showVariable('lives', { x: 5, y: 32 });
    if (withAI) p.showVariable('mode', { x: 5, y: 59 });
    return p;
  };
  write(game, 'basic.sb3', project());
  write(game, 'ai.sb3', project({ withAI: true }));
  // Planted bug: the sign waits for "gameover" but the ship broadcasts "game over".
  write(game, 'fix-the-bug.sb3', project({ gameOverMessage: 'gameover' }));
  write(game, 'cards.html', cardsPage('Friend or Foe cards', [
    ['Friend', friend], ['Friend', friend.replace('#22c55e', '#4ade80')], ['Friend', friend.replace('rx="28"', 'rx="24"')],
    ['Foe', foe], ['Foe', foe.replace('#dc2626', '#b91c1c')], ['Foe', foe.replace('r="4"', 'r="5"')],
    ['Mystery ship (fail-test)', mystery],
  ]));

  const card = {
    slug: game,
    number: 5,
    kicker: 'Game 5 · Sessions 10–11 · AI Level 2: Customize (flagship #2)',
    title: 'Space Shooter, Friend or Foe',
    objective: 'I can customize an AI model to sort friend vs. foe ships — a harder version of what I did in Game 2.',
    coding: ['multiple sprites', 'bullets (clones)', 'lives', 'broadcast', '"for this sprite only" variables', 'if / else chains'],
    ai: ['multi-class classifier', 'Example', 'Label', 'Train', 'Predict', 'confidence'],
    extraButtons: '<a class="btn light" href="cards.html" target="_blank" rel="noopener">🖨 Print ship cards</a>',
    materials: ['Laptop with a webcam', 'Printed Friend / Foe cards (button above), including the mystery ship', 'AI Vocabulary Card — reinforce, don\'t reteach'],
    sessions: [
      {
        title: 'Session 10: build the shooter',
        steps: [
          'Open <b>Basic game</b>: arrow keys move, space fires. Shoot red foes; let green friends reach you to dock (+2).',
          'Four sprites work together: Ship, Bullet, Visitor, Sign. Find how each talks to the others.',
          'Find <code>broadcast game over</code>: the Ship sends a message; Visitor and Sign <b>receive</b> it.',
          'Each Visitor clone has its own <code>kind</code> (for this sprite only) — friend or foe.',
          'Read the Visitor\'s <code>if / else</code> blocks: what happens for each kind when hit by a bullet, and when reaching the ship?',
        ],
      },
      {
        title: 'Session 11: train a harder classifier',
        say: '“Same idea as the apple sorter — examples, labels, train, predict — but now three classes. The harder the difference between classes, the clearer and more varied our examples must be.”',
        steps: [
          'Open <b>AI version</b>: the trainer opens with <i>Friend</i>, <i>Foe</i> and <i>Nothing</i>. Record 20+ photos of each card, moving it around; <i>Nothing</i> is the room with no card.',
          'Train, test, press Done. Now space only fires when the AI says <b>Foe</b> with more than 70% confidence, and friends only dock when it says <b>Friend</b>.',
          'Play in pairs: one flies, one shows the matching card for what is coming.',
          'Fail-test: show the <b>mystery ship</b> card. What does the model say, and how sure is it? Why?',
          'Save the project: the trained model goes inside it.',
        ],
      },
    ],
    failTests: [
      'Show the mystery ship (red like a foe, round like a friend).',
      'Train Friend with only 3 photos and Foe with 30: which class wins when unsure?',
      'Show the card upside down, very small, or half covered.',
      'Compare with Game 2: which classifier is more confident, and why?',
    ],
    misconceptions: [
      ['Since I did this before, it will work exactly the same.', 'More classes is harder: the AI needs clearer, more varied examples of each.'],
      ['If two classes look similar, it\'s the AI\'s fault.', 'It\'s a design problem: what makes two ships easy or hard to tell apart?'],
      ['The AI knows which ships are enemies.', 'It only knows what we labelled. Swap the labels and it would fire at friends.'],
    ],
    bug: {
      symptom: 'In <b>Fix the bug</b>, when lives reach 0 the game never ends: no “Game over” sign, and new ships keep vanishing.',
      hints: ['Who sends the game-over message, and who is waiting for it?', 'Compare the message names character by character.'],
      answer: 'The Ship broadcasts <code>game over</code> but the Sign waits for <code>gameover</code> (no space) — a different message, so the Sign never hears it. Pick <code>game over</code> in the Sign\'s <code>when I receive</code> block.',
    },
    challenges: [
      'Add a third kind of visitor: an asteroid you must dodge (a fourth class to train).',
      'Show a shield around the ship while the AI says Friend.',
      'Make foes speed up every 10 points.',
    ],
    app: [
      'Train and test in BlockML Studio, save, then export at blockml.codeai.ltd → <b>Export Scratch Games to App</b>.',
      'Arrows and space become on-screen buttons; the AI version asks for the camera.',
      'Print the cards for the phone too — show them to the phone\'s front camera.',
    ],
    offline: [
      'No camera: play the basic game with keys.',
      'Unplugged: sort printed ship cards into friend / foe piles and discuss the mystery ship.',
    ],
  };
  write(game, 'index.html', lessonPage(card));
  cards.push(card);
}

// ---- Game 6: Car Racing, Lean to Steer (sessions 12–13) -----------------------
// Basic: scrolling (lane lines that wrap around), speed control. AI (Level 1,
// Use, continuous): steer by leaning — the car turns by how much your
// shoulders tilt, every frame, instead of a single trigger like Dino Jump.
{
  const game = 'game6-car-racing';
  const road = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
<rect width="480" height="360" fill="#4ade80"/><rect x="60" width="360" height="360" fill="#475569"/>
<rect x="60" width="10" height="360" fill="#f8fafc"/><rect x="410" width="10" height="360" fill="#f8fafc"/>
<g fill="#166534">${[20, 90, 160, 230, 300].map((y) => `<circle cx="28" cy="${y}" r="16"/><circle cx="452" cy="${y + 35}" r="16"/>`).join('')}</g></svg>`;
  const line = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="40" viewBox="0 0 10 40"><rect width="10" height="40" rx="3" fill="#fde047"/></svg>';
  const car = (body, stripe) => `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="76" viewBox="0 0 44 76">
<rect x="2" y="8" width="8" height="16" rx="3" fill="#111827"/><rect x="34" y="8" width="8" height="16" rx="3" fill="#111827"/>
<rect x="2" y="52" width="8" height="16" rx="3" fill="#111827"/><rect x="34" y="52" width="8" height="16" rx="3" fill="#111827"/>
<rect x="6" y="2" width="32" height="72" rx="12" fill="${body}" stroke="#111827" stroke-width="3"/>
<rect x="11" y="16" width="22" height="14" rx="4" fill="#bae6fd"/><rect x="19" y="36" width="6" height="34" fill="${stripe}"/></svg>`;
  const LANE_X = [-60, 60];

  // withLean: steer by leaning. loop: how long the road pattern is (5 lines x 72 = 360; the bug uses 300).
  const project = ({ withLean = false, loop = 360 } = {}) => {
    const p = new Project();
    if (withLean) p.useExtension('blockmlHands', BASE + 'hands.js');
    p.addStage([p.costume('road', road, [240, 180])]);
    // Lane lines: 2 columns x 5 clones. Each line's height comes from how far the car
    // has driven: y = ((start - distance) mod 360) - 180, so lines leaving the bottom
    // come back at the top, and nothing drifts.
    p.addSprite('Line', [p.costume('line', line, [5, 20])], [
      [
        flag,
        hide,
        // Five lines per lane, 72 apart (5 x 72 = 360, the stage height).
        ...LANE_X.flatMap((x) => [
          set('start', 0),
          goTo(x, 0),
          { op: 'control_repeat', inputs: { TIMES: 5 }, substack: [cloneOf(), change('start', 72)] },
        ]),
      ],
      [
        whenClone,
        show,
        forever(setY(sub(op('operator_mod', { NUM1: sub(v('start'), v('distance')), NUM2: loop }), 180))),
      ],
    ], { visible: false, variables: ['start'] });
    const steering = withLean
      ? [ifThen(pose.visible(),
        // Lean left: your left shoulder drops below your right one, so lean is negative: the car moves left.
        set('lean', sub(pose.point('y', 'left shoulder'), pose.point('y', 'right shoulder'))),
        // Dead zone: shoulders are never exactly level, so ignore small leans.
        ifThen(gt(op('operator_mathop', { NUM: v('lean') }, { OPERATOR: 'abs' }), 8), changeX(div(v('lean'), 3))))]
      : [ifThen(keyPressed('right arrow'), changeX(6)), ifThen(keyPressed('left arrow'), changeX(-6))];
    p.addSprite('Car', [p.costume('car', car('#ef4444', '#ffffff'), [22, 38])], [[
      flag,
      goTo(0, -120),
      set('speed', 5),
      set('distance', 0),
      set('score', 0),
      set('lives', 3),
      ...(withLean ? [
        pose.camera('on'),
        pose.transparency(65),
        say('Sit back so I can see both shoulders…'),
        waitUntil(pose.visible()),
        sayFor('Lean to steer!', 1),
      ] : []),
      broadcast('go'),
      forever(
        change('distance', v('speed')),
        ...steering,
        // Speed control: up/down arrows, kept between 2 and 14.
        ifThen(keyPressed('up arrow'), change('speed', 0.2)),
        ifThen(keyPressed('down arrow'), change('speed', -0.2)),
        ifThen(gt(v('speed'), 14), set('speed', 14)),
        ifThen(lt(v('speed'), 2), set('speed', 2)),
        // Stay on the road.
        ifThen(gt(xPosition(), 150), setX(150)),
        ifThen(lt(xPosition(), -150), setX(-150)),
        ifThen(lt(v('lives'), 1), sayFor('Crash! Game over', 2), stopAll)),
    ]], { x: 0, y: -120, rotationStyle: "don't rotate" });
    p.addSprite('Traffic', [p.costume('blue', car('#3b82f6', '#1e3a8a'), [22, 38]), p.costume('yellow', car('#facc15', '#854d0e'), [22, 38])], [
      [flag, hide],
      // Traffic starts when the car is ready (in the AI version, once it can see you).
      [whenReceive('go'), forever(wait(random(1.2, 2.5)), cloneOf())],
      [
        whenClone,
        goTo(random(-140, 140), 160),
        { op: 'looks_switchcostumeto', inputs: { COSTUME: { reporter: random(1, 2), shadow: { menu: 'looks_costume', field: 'COSTUME', value: 'blue' } } } },
        show,
        // Traffic drives more slowly than you, so it comes towards you at (your speed - 2).
        repeatUntil(lt(yPosition(), -165),
          changeY(sub(2, v('speed'))),
          ifThen(touching('Car'), change('lives', -1), deleteClone)),
        change('score', 1),
        deleteClone,
      ],
    ], { visible: false });
    p.showVariable('score', { x: 5, y: 5 });
    p.showVariable('lives', { x: 5, y: 32 });
    p.showVariable('speed', { x: 5, y: 59 });
    return p;
  };
  write(game, 'basic.sb3', project());
  write(game, 'ai.sb3', project({ withLean: true }));
  // Planted bug: the road pattern repeats every 300 instead of 360, so lines bunch up and gaps appear.
  write(game, 'fix-the-bug.sb3', project({ loop: 300 }));

  const card = {
    slug: game,
    number: 6,
    kicker: 'Game 6 · Sessions 12–13 · AI Level 1: Use (reused, continuous)',
    title: 'Car Racing, Lean to Steer',
    objective: 'I can use scrolling backgrounds and speed control, and reuse pose detection continuously instead of as a single trigger.',
    coding: ['scrolling', 'speed control', 'clones', 'mod', 'abs', 'limits (keep between 2 and 14)', 'broadcast', 'maths with sensor values'],
    ai: ['pose detection (reused from Dino Jump)', 'continuous tracking vs. single trigger'],
    materials: ['Laptop with a webcam', 'Sit or stand with both shoulders in view'],
    sessions: [
      {
        title: 'Session 12: scrolling and speed',
        steps: [
          'Open <b>Basic game</b>: ←/→ steer, ↑/↓ change speed. Avoid the traffic.',
          'The road doesn\'t move — the yellow <b>lane lines</b> do. The Car adds <code>speed</code> to <code>distance</code> every frame, and each line sets <code>y to ((start − distance) mod 360) − 180</code>. <b>mod</b> is the remainder after dividing, so it counts 0…359 and starts again: lines leaving the bottom come back at the top. That is <b>scrolling</b>.',
          'Find the <b>speed</b> limits: <code>if speed &gt; 14 then set speed to 14</code>. Why do games need limits?',
          'Traffic moves by <code>2 - speed</code>: when you go faster, they come at you faster. Try it.',
        ],
      },
      {
        title: 'Session 13: lean to steer',
        say: '“Same body-tracking AI as Dino Jump — but now we read it <b>every frame</b> and use the number directly, instead of waiting for one jump.”',
        steps: [
          'Open <b>AI version</b> and lean left and right: the car follows.',
          'Find <code>set lean to (y of left shoulder − y of right shoulder)</code> and <code>change x by (lean / 3)</code>. A small lean gives a small number, a big lean a big one: that is <b>continuous</b> control. Tick the <code>lean</code> variable to watch it.',
          'Find the <b>dead zone</b>: <code>if abs(lean) &gt; 8</code>. Shoulders are never exactly level, so without it the car creeps sideways. Try 0 and 20.',
          'Change the 3 to 1 and to 10: which feels best?',
          'Compare with Dino Jump: which kind of control (trigger or continuous) is harder to make feel good? Why?',
        ],
      },
    ],
    failTests: [
      'Lean only your head. Raise one shoulder without leaning.',
      'Sit far back, or with only one shoulder in view.',
      'Two people in view.',
    ],
    misconceptions: [
      ['Continuous tracking works exactly like the single jump trigger.', 'Every frame\'s number moves the car, so jitter and delay are felt all the time.'],
      ['The car steers because the AI understands leaning.', 'The AI gives two shoulder heights; our subtraction turns them into steering.'],
    ],
    bug: {
      symptom: 'In <b>Fix the bug</b>, the lane lines slowly bunch together and gaps appear in the road.',
      hints: ['How far apart are the lines, and how many are in a column?', 'Look at the number after <b>mod</b> in the Line\'s script.'],
      answer: 'Five lines 72 apart make a pattern 360 long, and the stage is 360 tall, so the line position must use <code>mod 360</code>. The bug uses <code>mod 300</code>, so lines come back too early, bunch together and leave gaps. Change 300 to 360.',
    },
    challenges: [
      'Add a fuel counter that drops with speed; a fuel can refills it.',
      'Make the traffic change lanes.',
      'AI version: lean forward (nose lower) to speed up.',
    ],
    app: [
      'Save, then export at blockml.codeai.ltd → <b>Export Scratch Games to App</b>.',
      'Arrows become an on-screen D-pad. The AI version asks for the camera; prop the phone so your shoulders are in view.',
    ],
    offline: [
      'No camera: play the basic game with the arrow keys.',
      'Everything runs on the laptop: after the first visit, pose detection needs no internet.',
    ],
  };
  write(game, 'index.html', lessonPage(card));
  cards.push(card);
}

// ---- Game 1: Maze Runner (sessions 2–3) ----------------------------------------
// Basic: sprites, costumes, events, loops, motion, coordinates, collision (touching
// a colour). The AI half — voice control — needs the Voice extension (roadmap S7).
{
  const game = 'game1-maze-runner';
  const WALL = '#1e40af';
  const wallRects = [
    [0, 0, 480, 12], [0, 348, 480, 12], [0, 0, 12, 360], [468, 0, 12, 360], // border
    [104, 0, 16, 270], [224, 90, 16, 270], [344, 0, 16, 270], // the three maze walls
  ];
  const maze = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
<rect width="480" height="360" fill="#ecfccb"/>
${wallRects.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${WALL}"/>`).join('')}
<text x="30" y="335" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#3f6212">START</text></svg>`;
  const runner = (legs) => `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="36" viewBox="0 0 30 36">
<circle cx="15" cy="8" r="7" fill="#fbbf24" stroke="#78350f" stroke-width="2"/>
<rect x="9" y="15" width="12" height="11" rx="3" fill="#f97316" stroke="#7c2d12" stroke-width="2"/>
${legs ? '<path d="M12 26 L7 34 M18 26 L23 34" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/>' : '<path d="M13 26 L13 34 M17 26 L17 34" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/>'}</svg>`;
  const star = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
<path d="M20 2 L25 15 L38 15 L27 23 L31 37 L20 29 L9 37 L13 23 L2 15 L15 15 Z" fill="#facc15" stroke="#a16207" stroke-width="2.5" stroke-linejoin="round"/></svg>`;

  // bounceRight: how far to step back after walking right into a wall (-4 is right; the bug uses +4).
  // withVoice: the runner also walks the way you say ("up", "down", "left", "right") until "stop".
  const project = ({ bounceRight = -4, withVoice = false } = {}) => {
    const p = new Project();
    if (withVoice) p.useExtension('blockmlVoice', BASE + 'voice.js');
    p.addStage([p.costume('maze', maze, [240, 180])]);
    const hitWall = () => bool('sensing_touchingcolor', { COLOR: { color: WALL } });
    const go = (key) => (withVoice ? or(keyPressed(key), eq(v('command'), key.replace(' arrow', ''))) : keyPressed(key));
    const step = (key, move, back, direction) => ifThen(go(key),
      ...(direction ? [{ op: 'motion_pointindirection', inputs: { DIRECTION: direction } }] : []),
      move,
      // Walked into a wall? Step back.
      ifThen(hitWall(), back),
      { op: 'looks_nextcostume' });
    p.addSprite('Runner', [p.costume('step 1', runner(true), [15, 18]), p.costume('step 2', runner(false), [15, 18])], [[
      flag,
      goTo(-190, -130),
      { op: 'motion_pointindirection', inputs: { DIRECTION: 90 } },
      resetTimer,
      forever(
        step('right arrow', changeX(4), changeX(bounceRight), 90),
        step('left arrow', changeX(-4), changeX(4), -90),
        step('up arrow', changeY(4), changeY(-4)),
        step('down arrow', changeY(-4), changeY(4)),
        ifThen(touching('Goal'),
          ...(withVoice ? [{ op: 'blockmlVoice_speak', inputs: { TEXT: join2('You made it in ', join2(round(timer()), ' seconds!')) } }] : []),
          sayFor(join2('You made it in ', join2(round(timer()), ' seconds!')), 3),
          stopAll)),
    ], ...(withVoice ? [[
      flag,
      set('command', 'stop'),
      // Only five words to choose from: the AI makes far fewer mistakes than with any word.
      { op: 'blockmlVoice_listenFor', inputs: { WORDS: 'up down left right stop' } },
      { op: 'blockmlVoice_startListening' },
      say('Loading the voice AI…'),
      waitUntil(bool('blockmlVoice_isReady')),
      sayFor('Say up, down, left, right or stop!', 2),
      forever(
        // The AI tells us what it heard; we decide what it means.
        ...['up', 'down', 'left', 'right', 'stop'].map((w) => ifThen(bool('blockmlVoice_heardWord', { WORD: w }), set('command', w))),
        { op: 'blockmlVoice_clearHeard' }),
    ]] : [])], { x: -190, y: -130, rotationStyle: 'left-right' });
    p.addSprite('Goal', [p.costume('star', star, [20, 20])], [[
      flag,
      goTo(180, 130),
      // A loop that never ends: the star keeps spinning, and the clock keeps counting.
      forever({ op: 'motion_turnright', inputs: { DEGREES: 5 } }, set('time', round(timer()))),
    ]], { x: 180, y: 130 });
    p.showVariable('time', { x: 380, y: 5 });
    if (withVoice) p.showVariable('command', { x: 5, y: 5 });
    return p;
  };
  write(game, 'basic.sb3', project());
  write(game, 'ai.sb3', project({ withVoice: true }));
  write(game, 'fix-the-bug.sb3', project({ bounceRight: 4 }));

  const card = {
    number: 1,
    slug: game,
    kicker: 'Game 1 · Sessions 2–3 · AI Level 1: Use',
    title: 'Maze Runner, Voice-Controlled',
    objective: 'I can use motion and collision detection, and use a real AI model (speech-to-text) to control my game.',
    coding: ['sprites', 'costumes', 'events', 'forever loop', 'motion', 'coordinates', 'collision (touching colour)', 'timer', 'or'],
    ai: ['speech-to-text', 'a word list (grammar)', 'text-to-speech'],
    materials: ['Laptop with a microphone (the built-in one is fine)', 'A quiet-ish room — then a noisy one, for the fail-test'],
    sessions: [
      {
        title: 'Session 2: build the maze',
        steps: [
          'Open <b>Basic game</b>: arrow keys walk the runner to the star. The clock shows your time.',
          '<b>Sprites and costumes</b>: the Runner has two costumes; <code>next costume</code> on every step makes it walk.',
          '<b>Events</b>: <code>when green flag clicked</code> starts everything.',
          '<b>Loops</b>: <code>forever</code> keeps checking the keys; the star\'s forever loop spins it.',
          '<b>Coordinates</b>: the runner starts at <code>x: -190 y: -130</code>. Move the mouse over the stage: where is (0, 0)?',
          '<b>Collision</b>: <code>if touching colour (blue)</code> → step back. Why do we step back the same amount we moved?',
        ],
      },
      {
        title: 'Session 3: voice control (AI)',
        say: '“This AI has listened to millions of voices before — that\'s how it learned to turn speech into text.”',
        steps: [
          'Open <b>AI version</b> and allow the microphone. The first time, the voice AI (40 MB) takes a moment to load; after that it works without internet.',
          'Say <b>“right”</b>: the runner keeps walking right until a wall or until you say <b>“stop”</b>. The <code>command</code> variable shows what it understood.',
          'Find <code>listen only for words (up down left right stop)</code>. With only five words to choose from, the AI makes far fewer mistakes. Try <code>listen for any words</code> instead and watch <code>what I heard</code>: what goes wrong?',
          'Find <code>if &lt;I heard [up]?&gt; then set command to up</code>: the AI only turns sound into words; our code decides what the words mean.',
          'Reach the star: the game <b>speaks</b> your time (text-to-speech, the opposite direction).',
        ],
      },
    ],
    failTests: [
      'Mumble. Whisper. Shout. Say “up” with music or classroom noise in the background.',
      'Say a word that isn\'t on the list (“jump”), or a word that sounds close (“cup”, “rice”).',
      'Everyone says a different command at once.',
      'Make the walls thinner: can the runner squeeze through? Why?',
    ],
    misconceptions: [
      ['The computer understands what I\'m saying.', 'It turns sounds into the most likely words using patterns it learned; it doesn\'t know what “up” means — our code does.'],
      ['If it doesn\'t understand me, it\'s broken.', 'Noise and unclear speech are normal limits of speech AI, not a fault.'],
      ['The computer knows where the walls are.', 'It only checks if the runner touches that exact colour. Paint a different colour and it walks right through.'],
      ['"forever" and "repeat" are the same.', 'forever never stops; repeat runs a set number of times. Predict, then test.'],
      ['Costumes and sprites are the same thing.', 'A sprite is the character; costumes are its different looks.'],
    ],
    bug: {
      symptom: 'In <b>Fix the bug</b>, the runner walks straight through walls — but only when going right.',
      hints: ['Compare the four arrow-key blocks. Which one is different?', 'After moving right by 4 and touching a wall, which way should it step back?'],
      answer: 'The right-arrow block steps back with <code>change x by 4</code> — further into the wall. It should be <code>change x by -4</code>, the opposite of the move.',
    },
    challenges: [
      'Add a key and a door: the door only opens when you have the key (a variable).',
      'Add a monster that patrols a corridor with <code>glide</code>.',
      'Make a best-time variable.',
    ],
    app: [
      'Save, then open blockml.codeai.ltd → <b>Export Scratch Games to App</b> and add the project.',
      'The arrow keys become an on-screen D-pad. The AI version asks for the microphone and speaks with the phone\'s own voice.',
    ],
    offline: [
      'Everything runs on the laptop: after the first visit, the voice AI needs no internet.',
      'No microphone: play the basic game with the arrow keys (the AI version\'s keys work too).',
    ],
  };
  write(game, 'index.html', lessonPage(card));
  cards.push(card);
}

// ---- Game 7: Platform Adventure (sessions 14–15) --------------------------------
// Basic: advanced collision (step out of platforms), level design (backdrops), My
// Blocks with and without inputs, and a rule-based Guide (ask & answer) that sets
// up the AI half: a chat-AI guide (roadmap S10) that can be confidently wrong.
{
  const game = 'game7-platform-adventure';
  const GREEN = '#16a34a';
  const LAVA = '#dc2626';
  const level = (platforms, lava) => `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
<rect width="480" height="360" fill="#e0f2fe"/>
<g fill="#ffffff" opacity=".85"><ellipse cx="300" cy="60" rx="50" ry="16"/><ellipse cx="330" cy="50" rx="30" ry="14"/></g>
${lava.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${LAVA}"/>`).join('')}
${platforms.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${GREEN}"/>`).join('')}</svg>`;
  const level1 = level([[0, 300, 180, 60], [260, 300, 220, 60], [300, 240, 80, 14], [390, 180, 90, 14]], [[180, 330, 80, 30]]);
  const level2 = level([[0, 300, 120, 60], [150, 250, 80, 14], [270, 200, 80, 14], [390, 150, 90, 14]], [[120, 330, 360, 30]]);
  const hero = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">
<rect x="2" y="2" width="20" height="28" rx="6" fill="#7c3aed" stroke="#3b0764" stroke-width="2.5"/>
<circle cx="9" cy="11" r="3" fill="#ffffff"/><circle cx="16" cy="11" r="3" fill="#ffffff"/><circle cx="10" cy="11" r="1.5" fill="#111827"/><circle cx="17" cy="11" r="1.5" fill="#111827"/></svg>`;
  const star = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 40 40">
<path d="M20 2 L25 15 L38 15 L27 23 L31 37 L20 29 L9 37 L13 23 L2 15 L15 15 Z" fill="#facc15" stroke="#a16207" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
  const owl = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="60" viewBox="0 0 56 60">
<ellipse cx="28" cy="34" rx="22" ry="24" fill="#a16207" stroke="#422006" stroke-width="3"/><ellipse cx="28" cy="42" rx="13" ry="14" fill="#fde68a"/>
<circle cx="19" cy="24" r="8" fill="#ffffff" stroke="#422006" stroke-width="2"/><circle cx="37" cy="24" r="8" fill="#ffffff" stroke="#422006" stroke-width="2"/>
<circle cx="19" cy="24" r="3.5" fill="#111827"/><circle cx="37" cy="24" r="3.5" fill="#111827"/><path d="M25 30 L28 36 L31 30 Z" fill="#f97316"/>
<path d="M10 12 L16 18 M46 12 L40 18" stroke="#422006" stroke-width="3" stroke-linecap="round"/></svg>`;

  const call = (proccode, args) => ({ op: 'procedures_call', proccode, args });
  const arg = (name) => op('argument_reporter_string_number', {}, { VALUE: name });
  const touchColour = (c) => bool('sensing_touchingcolor', { COLOR: { color: c } });
  const backdropNumber = () => op('looks_backdropnumbername', {}, { NUMBER_NAME: 'number' });
  const backdrop = (name) => ({ op: 'looks_switchbackdropto', inputs: { BACKDROP: { menu: 'looks_backdrops', field: 'BACKDROP', value: name } } });

  // startAfterNextLevel: false plants the bug (level 2 starts with the hero still on the star).
  const project = ({ startAfterNextLevel = true } = {}) => {
    const p = new Project();
    p.addStage([p.costume('level 1', level1, [240, 180]), p.costume('level 2', level2, [240, 180])]);
    p.addSprite('Hero', [p.costume('hero', hero, [12, 16])], [
      [{ op: 'procedures_definition', proccode: 'start level' },
        goTo(-200, 0),
        set('y speed', 0),
        broadcast('level started')],
      // A My Block with an input: walk (steps), stopping at walls.
      [{ op: 'procedures_definition', proccode: 'walk %s', args: ['steps'] },
        changeX(arg('steps')),
        ifThen(touchColour(GREEN), changeX(sub(0, arg('steps'))))],
      // Jump only when standing on a platform: peek 2 steps down.
      [{ op: 'procedures_definition', proccode: 'jump' },
        changeY(-2),
        ifThen(touchColour(GREEN), set('y speed', 12)),
        changeY(2)],
      [
        flag,
        set('lives', 3),
        backdrop('level 1'),
        call('start level'),
        forever(
          ifThen(keyPressed('right arrow'), call('walk %s', { steps: 5 })),
          ifThen(keyPressed('left arrow'), call('walk %s', { steps: -5 })),
          ifThen(keyPressed('up arrow'), call('jump')),
          // Gravity, then advanced collision: if we moved into a platform, step back out of it.
          change('y speed', -1),
          changeY(v('y speed')),
          ifThen(touchColour(GREEN),
            ifElse(lt(v('y speed'), 0),
              [repeatUntil(not(touchColour(GREEN)), changeY(1))], // landed: stand on top
              [repeatUntil(not(touchColour(GREEN)), changeY(-1))]), // bumped a ceiling
            set('y speed', 0)),
          ifThen(or(touchColour(LAVA), lt(yPosition(), -170)),
            change('lives', -1),
            call('start level')),
          ifThen(touching('Star'),
            ifElse(eq(backdropNumber(), 2),
              [sayFor('You win!', 3), stopAll],
              [backdrop('next backdrop'), ...(startAfterNextLevel ? [call('start level')] : [])])),
          ifThen(lt(v('lives'), 1), sayFor('Game over', 2), stopAll)),
      ],
    ], { x: -200, y: 0, rotationStyle: "don't rotate" });
    p.addSprite('Star', [p.costume('star', star, [18, 18])], [
      // Each level puts the star somewhere else.
      [whenReceive('level started'),
        ifElse(eq(backdropNumber(), 1), [goTo(195, 25)], [goTo(195, 55)])],
    ], { x: 195, y: 25 });
    p.addSprite('Guide', [p.costume('owl', owl, [28, 30])], [
      [flag, goTo(-190, 120), say('Click me to ask a question!')],
      // A rule-based guide: it only knows the words we taught it.
      [
        whenClicked,
        say(''),
        { op: 'sensing_askandwait', inputs: { QUESTION: 'What do you want to know?' } },
        set('question', op('sensing_answer')),
        ifElse(bool('operator_contains', { STRING1: v('question'), STRING2: 'jump' }),
          [sayFor('Press the up arrow to jump.', 3)],
          [ifElse(bool('operator_contains', { STRING1: v('question'), STRING2: 'lava' }),
            [sayFor("Red lava sends you back to the start. Don't touch it!", 3)],
            [ifElse(bool('operator_contains', { STRING1: v('question'), STRING2: 'win' }),
              [sayFor('Reach the star on level 2 to win.', 3)],
              [sayFor('Hmm, I only know about jumping, lava and winning.', 3)])])]),
      ],
    ], { x: -190, y: 120 });
    p.showVariable('lives', { x: 380, y: 5 });
    return p;
  };
  write(game, 'basic.sb3', project());
  write(game, 'fix-the-bug.sb3', project({ startAfterNextLevel: false }));

  const card = {
    number: 7,
    slug: game,
    kicker: 'Game 7 · Sessions 14–15 · AI Level 1: Use + reliability lesson',
    title: 'Platform Adventure, Ask the Guide',
    objective: 'I can design levels with advanced collision, and I understand that an AI can confidently give a wrong answer — and know what to do when that happens.',
    aiPending: 'coming with the Chat AI extension',
    coding: ['My Blocks (functions)', 'inputs (parameters)', 'advanced collision', 'level design (backdrops)', 'broadcast', 'ask & answer', 'if / else chains'],
    ai: ['chat AI guesses likely answers (chat extension, coming soon)', 'rule-based vs. AI'],
    materials: ['Laptop'],
    sessions: [
      {
        title: 'Session 14: levels and collision',
        steps: [
          'Open <b>Basic game</b>: ←/→ walk, ↑ jumps. Reach the star; avoid the red lava. Level 2 is harder.',
          '<b>My Blocks</b>: find <code>define start level</code>, <code>define jump</code> and <code>define walk (steps)</code>. A My Block is a name for a group of blocks you use again and again. <code>walk (5)</code> and <code>walk (-5)</code> reuse the same blocks with a different <b>input</b>.',
          '<b>Advanced collision</b>: after falling into a platform, <code>repeat until not touching green: change y by 1</code> lifts the hero out, pixel by pixel, until it stands on top.',
          '<b>Level design</b>: levels are backdrops. Paint a level 3 (keep the exact green and red!) and add it to <code>start level</code> and the Star\'s script.',
        ],
      },
      {
        title: 'Session 15: ask the guide',
        say: '“Our owl is a <b>rule-based</b> guide: it only knows the three words we taught it. A chat AI guesses the most likely answer from patterns it has seen — it can answer anything, but it doesn\'t truly know facts, and it can be confidently wrong.”',
        steps: [
          'Click the owl and ask “how do I jump?”, “what is lava?”, then “what is the capital of France?”. What happens?',
          'Add a new rule: if the question contains “level”, say how many levels there are.',
          'Discuss: what would be better and worse about an AI guide that answers <i>anything</i>? (The chat-AI version comes with BlockML Studio\'s Chat AI extension.)',
          '<b>The wrong-answer moment</b> (guided, do not skip): the teacher plays the AI guide and answers two prepared questions confidently and wrongly. Ask: “What should you do when an AI gives you a wrong answer?”',
        ],
      },
    ],
    failTests: [
      'Ask the owl a question with a typo: “how do I jmup?”',
      'Ask “can I win without jumping?” — which rule answers, and is it right?',
      'Make a gap in a platform too wide to jump: is the level still possible?',
    ],
    misconceptions: [
      ['The guide understands my question.', 'It only checks if certain words are inside it. A chat AI is better at guessing, but it doesn\'t understand either.'],
      ['If the AI said it, it must be true.', 'Chat AI guesses from patterns; always check important answers.'],
      ['My Blocks are just for tidiness.', 'They let you change one place and fix it everywhere, and give a name to an idea.'],
    ],
    bug: {
      symptom: 'In <b>Fix the bug</b>, when you reach the star, level 2 flashes and you win at once.',
      hints: ['What happens right after <code>switch backdrop to next backdrop</code>?', 'Where is the hero when level 2 begins?'],
      answer: 'After switching to level 2, the hero is still touching the star, so on the next frame it wins. <code>start level</code> must be called after <code>switch backdrop to next backdrop</code> to send the hero back to the start.',
    },
    challenges: [
      'Add a level 3 with a moving platform (a sprite that glides back and forth).',
      'Add coins (clones) and a My Block <code>collect coin</code>.',
      'Teach the owl five more rules. How many would it need to answer everything?',
    ],
    app: [
      'Save, then export at blockml.codeai.ltd → <b>Export Scratch Games to App</b>.',
      'The arrows become an on-screen D-pad; tap the owl to ask it (the phone keyboard opens).',
    ],
    offline: [
      'The basic game needs no internet.',
      'If the AI guide is unavailable, the teacher role-plays the guide with the prepared wrong answers — the point is the discussion.',
    ],
  };
  write(game, 'index.html', lessonPage(card));
  cards.push(card);
}

// ---- Game 8: Kindness Checker (sessions 16–17) -----------------------------------
// Basic: string handling (contains, join, length), conditionals, lists and a loop
// with a counter; the word-list checker already shows false alarms and misses.
// AI (Level 1, Use + reflect): the Text AI extension's kindness check gives every
// message an unkind score, and the student's limit decides. The robot says what the
// AI thinks and what the word list found, and keeps a list of the messages they
// disagreed on: the AI is better, and still wrong in both directions.
{
  const game = 'game8-kindness-checker';
  const UNKIND = ['stupid', 'idiot', 'dumb', 'ugly', 'hate', 'shut up', 'kill', 'loser'];
  const KIND = ['thank', 'please', 'sorry', 'well done', 'great', 'awesome', 'kind', 'friend'];
  const room = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
<rect width="480" height="360" fill="#f5f3ff"/><rect y="270" width="480" height="90" fill="#ddd6fe"/>
<g fill="#c4b5fd" opacity=".6"><circle cx="60" cy="60" r="24"/><circle cx="420" cy="90" r="30"/><circle cx="380" cy="30" r="14"/></g>
<text x="240" y="44" font-family="Arial, sans-serif" font-size="26" font-weight="bold" text-anchor="middle" fill="#5b21b6">Kindness Checker</text></svg>`;
  const robot = (mouth, cheeks = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="160" viewBox="0 0 140 160">
<rect x="66" y="4" width="8" height="20" fill="#64748b"/><circle cx="70" cy="6" r="6" fill="#f59e0b"/>
<rect x="15" y="24" width="110" height="90" rx="22" fill="#e2e8f0" stroke="#334155" stroke-width="4"/>
<circle cx="48" cy="62" r="12" fill="#1e293b"/><circle cx="92" cy="62" r="12" fill="#1e293b"/><circle cx="52" cy="58" r="4" fill="#fff"/><circle cx="96" cy="58" r="4" fill="#fff"/>
${mouth}${cheeks}<rect x="35" y="118" width="70" height="38" rx="10" fill="#8b5cf6" stroke="#334155" stroke-width="4"/></svg>`;
  const happy = robot('<path d="M44 88 Q70 108 96 88" fill="none" stroke="#1e293b" stroke-width="5" stroke-linecap="round"/>', '<circle cx="32" cy="84" r="7" fill="#fda4af"/><circle cx="108" cy="84" r="7" fill="#fda4af"/>');
  const worried = robot('<path d="M46 98 Q70 82 94 98" fill="none" stroke="#1e293b" stroke-width="5" stroke-linecap="round"/>');
  const neutral = robot('<path d="M48 92 H92" stroke="#1e293b" stroke-width="5" stroke-linecap="round"/>');

  const contains = (a, b) => bool('operator_contains', { STRING1: a, STRING2: b });
  const item = (list, index) => op('data_itemoflist', { INDEX: index }, { LIST: list });
  const length = (list) => op('data_lengthoflist', {}, { LIST: list });
  // Look through a list for a word inside the message; the word found goes in `into`.
  const search = (list, into, startAt) => [
    set(into, ''),
    set('i', startAt),
    { op: 'control_repeat', inputs: { TIMES: length(list) }, substack: [
      ifThen(contains(v('message'), item(list, v('i'))), set(into, item(list, v('i')))),
      change('i', 1),
    ] },
  ];

  // startAt: the first list position to check (1 is right; the bug starts at 0 and misses the last word).
  const project = ({ startAt = 1 } = {}) => {
    const p = new Project();
    p.addStage([p.costume('room', room, [240, 180])]);
    p.addSprite('Robot', [p.costume('neutral', neutral, [70, 80]), p.costume('happy', happy, [70, 80]), p.costume('worried', worried, [70, 80])], [[
      flag,
      costume('neutral'),
      set('kindness points', 0),
      { op: 'data_deletealloflist', fields: { LIST: 'unkind words' } },
      ...UNKIND.map((w) => ({ op: 'data_addtolist', inputs: { ITEM: w }, fields: { LIST: 'unkind words' } })),
      { op: 'data_deletealloflist', fields: { LIST: 'kind words' } },
      ...KIND.map((w) => ({ op: 'data_addtolist', inputs: { ITEM: w }, fields: { LIST: 'kind words' } })),
      forever(
        { op: 'sensing_askandwait', inputs: { QUESTION: 'Type a message, and I will check if it is kind:' } },
        set('message', op('sensing_answer')),
        ...search('unkind words', 'unkind word', startAt),
        ifElse(bool('operator_not', { OPERAND: eq(v('unkind word'), '') }),
          [costume('worried'), sayFor(join2('That might hurt someone. I found: ', v('unkind word')), 3)],
          [
            ...search('kind words', 'kind word', startAt),
            ifElse(bool('operator_not', { OPERAND: eq(v('kind word'), '') }),
              [costume('happy'), change('kindness points', 1), sayFor(join2("That's kind! I found: ", v('kind word')), 3)],
              [costume('neutral'), sayFor(join2('Looks OK to me. It has ', join2(op('operator_length', { STRING: v('message') }), ' letters.')), 3)]),
          ]),
      ),
    ]], { x: 0, y: -30 });
    p.showList('unkind words', { x: 5, y: 60, width: 110, height: 200 });
    p.showVariable('kindness points', { x: 5, y: 5 });
    return p;
  };
  // The AI version: the kindness check scores the message too, and disagreements are collected.
  const aiProject = () => {
    const p = new Project();
    p.useExtension('blockmlText', BASE + 'text.js');
    p.addStage([p.costume('room', room, [240, 180])]);
    const aiWorried = () => gt(v('AI score'), v('limit'));
    const listFound = () => not(eq(v('unkind word'), ''));
    const remember = { op: 'data_addtolist', inputs: { ITEM: v('message') }, fields: { LIST: 'they disagreed' } };
    p.addSprite('Robot', [p.costume('neutral', neutral, [70, 80]), p.costume('happy', happy, [70, 80]), p.costume('worried', worried, [70, 80])], [[
      flag,
      costume('neutral'),
      // Above this unkind score (0 to 100) the robot is worried. Change it and test again!
      set('limit', 50),
      set('AI score', 0),
      { op: 'data_deletealloflist', fields: { LIST: 'they disagreed' } },
      { op: 'data_deletealloflist', fields: { LIST: 'unkind words' } },
      ...UNKIND.map((w) => ({ op: 'data_addtolist', inputs: { ITEM: w }, fields: { LIST: 'unkind words' } })),
      say('Loading the text AI…'),
      waitUntil(text.ready()),
      say(''),
      forever(
        { op: 'sensing_askandwait', inputs: { QUESTION: 'Type a message. The AI and my word list will both check it:' } },
        set('message', op('sensing_answer')),
        // 1. The AI gives a number; our limit decides.
        set('AI score', text.unkindScore(v('message'))),
        ifElse(aiWorried(),
          [costume('worried'), sayFor(join2('The AI thinks that might hurt someone. Unkind score: ', v('AI score')), 3)],
          [costume('happy'), sayFor(join2('The AI thinks that is fine. Unkind score: ', v('AI score')), 3)]),
        // 2. The word list from the basic game.
        ...search('unkind words', 'unkind word', 1),
        // 3. Do they agree? Keep the messages they disagree on.
        ifThen(and(aiWorried(), not(listFound())),
          sayFor('My word list found nothing. Who is right?', 3), remember),
        ifThen(and(not(aiWorried()), listFound()),
          sayFor(join2(join2('But my word list found: ', v('unkind word')), '. Who is right?'), 3), remember),
      ),
    ]], { x: -130, y: -30 });
    p.showVariable('AI score', { x: 5, y: 5 });
    p.showVariable('limit', { x: 5, y: 32 });
    p.showList('they disagreed', { x: 300, y: 62, width: 175, height: 200 });
    return p;
  };
  write(game, 'basic.sb3', project());
  write(game, 'ai.sb3', aiProject());
  write(game, 'fix-the-bug.sb3', project({ startAt: 0 }));
  write(game, 'phrases.html', phrasesPage('Kindness Checker: test phrases',
    'Type each message into the word checker (the basic game) and into the AI version. Write what each one says, what a person would think, and why they differ. Some are made to trick them.',
    [
      ['Thank you for helping me!', ''], ['You are an idiot.', ''], ['Well done on your project.', ''],
      ['I hate Mondays.', 'Unkind to whom?'], ['That was a stupid mistake — I made it!', 'About yourself'],
      ['You\'re killing it at football!', 'A compliment'], ['Nobody wants to play with you.', 'No "bad" word'],
      ['Great job… NOT.', 'Sarcasm'], ['You are a l0ser.', 'A spelling trick'], ['Go away.', ''],
      ['My friend is blind.', 'Says who someone is'], ['The villain in the film is ugly.', 'Unkind to whom?'],
      ['This homework is killing me.', 'A saying'],
    ], ['Word list says', 'AI score', 'A person thinks', 'Why?']));

  const card = {
    number: 8,
    slug: game,
    kicker: 'Game 8 · Sessions 16–17 · AI Level 1: Use + reflect',
    title: 'Kindness Checker',
    objective: 'I can use string handling and conditionals, and test an AI moderation tool to understand fairness and responsible use.',
    coding: ['ask & answer', 'strings: contains, join, length', 'lists', 'loop with a counter', 'if / else', 'and / not'],
    ai: ['moderation AI (the kindness check)', 'a score and a limit', 'false alarms and misses', 'fairness: an AI learns what its examples show'],
    extraButtons: '<a class="btn light" href="phrases.html" target="_blank" rel="noopener">🖨 Print test phrases</a>',
    materials: ['Laptop', 'Printed test phrases (button above), including tricky ones'],
    sessions: [
      {
        title: 'Session 16: build the word checker',
        steps: [
          'Open <b>Basic game</b> and type messages: kind ones, unkind ones.',
          '<b>Lists</b>: find the <i>unkind words</i> list on the stage and the <code>add … to unkind words</code> blocks.',
          '<b>Loop with a counter</b>: <code>set i to 1</code>, then <code>repeat (length of unkind words)</code>: check <code>item i</code>, then <code>change i by 1</code>. That visits every word in the list, one by one.',
          '<b>Strings</b>: <code>message contains (item i of unkind words)</code> looks for the word anywhere in the message. <code>join</code> builds the robot\'s reply; <code>length of</code> counts the letters.',
          'Add two words to each list and test them.',
          'Print the <b>test phrases</b> and type each one. Fill in the “Word list says” column. Can more words fix the mistakes? Try, and discuss why a list of words can never be enough.',
        ],
      },
      {
        title: 'Session 17: meet the AI, and test it',
        say: '“A moderation AI learned to flag unkind language by studying examples: ours studied 900,000 real comments that people had marked as fine or hurtful. It is better than a word list, and it can still be wrong in both directions: flagging kind messages, and missing unkind ones.”',
        steps: [
          'Open <b>AI version</b>. The first time, the text AI (8 MB) takes a moment to load; after that it works without internet. Nothing you type leaves the laptop.',
          'Type the printed phrases again and write the <b>AI score</b> (0 to 100) for each. Find <code>unkind score of (message)</code>: the AI only gives a number. Our code decides: <code>if AI score &gt; limit</code>.',
          'Look at the list <i>they disagreed</i>. “Nobody wants to play with you.” and “Go away.” have no word from the list, but the AI is worried: it learned from whole sentences. “This homework is killing me.” has a word from the list, but the AI says it is fine.',
          'Now find where the AI is wrong. <b>False alarms</b>: “You\'re killing it at football!”, “I hate Mondays.” <b>Misses</b>: “Great job… NOT.”, “You are a l0ser.”',
          '<b>The limit</b>: change <code>set limit to 50</code> to 30, then to 80, and test again. A low limit catches more unkind messages and raises more false alarms; a high limit does the opposite. Which limit would you choose for a class chat, and why?',
          '<b>Fairness</b> (guided, do not skip): type “My friend is blind.” and “My grandmother is a Muslim.” Saying who someone is, is not unkind, and the score should stay under the limit. Many moderation AIs got this wrong: in their examples such words appeared mostly in attacks, so they learned to flag the words. Ours was given extra examples to teach it better. Ask: “Who decides what examples an AI learns from?”',
        ],
      },
    ],
    failTests: [
      'Sarcasm: “Great job… NOT.”',
      'Spelling tricks: “l0ser”, “st*pid”, “I D I O T”. Which ones still get through?',
      'Kind messages with a “bad” word: “I hate it when you\'re sad.”',
      'Unkind messages without one: “You can\'t come to my party.”',
      'Find one kind message the AI flags and one unkind message it misses that are not on the sheet.',
    ],
    misconceptions: [
      ['If it flags a message, it\'s definitely unkind (or the reverse).', 'Both directions can be wrong: false alarms and misses, as the test phrases show.'],
      ['More words in the list will fix it.', 'Meaning depends on the whole sentence, not single words. That is why people build AI for it — which also makes mistakes.'],
      ['The AI understands the message.', 'It adds up numbers for the pieces of words it reads. A joke, or “NOT” at the end, is invisible to it.'],
      ['A score of 90 means it is 90% true.', 'The score is a guess from the examples the AI saw. People set the limit and make the decision.'],
      ['AI is neutral.', 'An AI learns whatever its examples show, including unfair patterns. People have to check for that and fix it.'],
    ],
    bug: {
      symptom: 'In <b>Fix the bug</b>, “you are a loser” is not caught, but “you are an idiot” is.',
      hints: ['Where is “loser” in the list?', 'Which item does the loop check first? What is item 0 of a list?'],
      answer: 'The counter starts at <code>set i to 0</code>. There is no item 0, and the loop runs as many times as there are words, so it checks items 0 to 7 — and never item 8, “loser”. Start at 1.',
    },
    challenges: [
      'Count how many unkind words a message has, not just the first one.',
      'Keep a list of every message that was flagged (a log for the teacher).',
      'Ignore capital letters — Scratch\'s "contains" already does. Test it.',
      '<b>Train your own AI</b>: click <code>open the text trainer</code>, make the classes <i>Kind</i> and <i>Unkind</i> from your class\'s own examples, and use <code>text (message) is (Unkind)?</code> in the game. Does your AI beat the ready-made one on the printed phrases?',
    ],
    app: [
      'Save, then export at blockml.codeai.ltd → <b>Export Scratch Games to App</b>.',
      'In the app, the phone keyboard opens when the robot asks. The AI version works too: the text AI is packed into the app (about 8 MB) and needs no internet and no permission.',
    ],
    offline: [
      'Everything runs on the laptop: the word checker needs no internet, and the text AI needs none after the first visit.',
      '“Be the AI” with the printed phrases works without any computer.',
    ],
  };
  write(game, 'index.html', lessonPage(card));
  cards.push(card);
}

fs.writeFileSync(path.join(OUT, 'index.html'), indexPage(cards));
console.log('lesson: index.html');
