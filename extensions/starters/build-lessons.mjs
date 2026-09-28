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
import { lessonPage, indexPage, cardsPage } from './lesson-pages.mjs';

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

const img = {
  camera: (state = 'on') => ({ op: 'blockmlImage_setCamera', fields: { STATE: state } }),
  transparency: (n) => ({ op: 'blockmlImage_setTransparency', inputs: { VALUE: n } }),
  trained: () => bool('blockmlImage_isTrained'),
  openTrainer: () => ({ op: 'blockmlImage_openTrainer' }),
  classify: () => ({ op: 'blockmlImage_classify' }),
  label: () => op('blockmlImage_imageLabel'),
  confidence: (name) => op('blockmlImage_confidenceOf', { CLASS: { menu: 'blockmlImage_menu_classes', field: 'classes', value: name } }),
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

fs.writeFileSync(path.join(OUT, 'index.html'), indexPage(cards));
console.log('lesson: index.html');
