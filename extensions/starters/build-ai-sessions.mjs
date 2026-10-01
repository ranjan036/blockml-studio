// Builds the projects and lesson cards for the pure-AI sessions (AI 1–20, sessions
// 18–37 of the CODE AI Core Curriculum) into ../gui/static/lessons/ai/<session>/
// (published at /lessons/ai/). Sessions already covered by a starter project link
// to it (/starters/); AI 19 and 20 are discussions.
//
// Extension URLs point at the production site by default; set STARTER_BASE to test
// against a local build.
import fs from 'node:fs';
import path from 'node:path';
import qrcode from 'qrcode-generator';
import { Project, op, bool, v } from './sb3.mjs';
import { aiSessionPage, aiIndexPage, printPage } from './lesson-pages.mjs';
import {
  flag, forever, ifThen, ifElse, waitUntil, set, change, say, sayFor, costume, goTo, random, eq, lt, gt, and, not, sub, add, join2,
  round, repeatUntil, wait, hide, show, timer, resetTimer, whenKey, broadcast, whenReceive, startSound, sounds, think, current,
  pointIn, addTo, insertAt, deleteOf, itemNumberOf, listContains, showList, hideList, letterOf, img, keyPressed, setSize,
} from './blocks.mjs';

const BASE = process.env.STARTER_BASE || 'https://studio.blockml.codeai.ltd/extensions/';
const OUT = path.join('..', 'gui', 'static', 'lessons', 'ai');
const STARTERS = '../../../starters/'; // from /lessons/ai/<session>/ to /starters/

const WHITE = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#ffffff"/></svg>';
const SKY = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#eef3fb"/><rect y="300" width="480" height="60" fill="#dce6f5"/></svg>';
/** A friendly robot in the CODE AI colours; `mouth` and `eyes` change its mood. */
const bot = (body = '#0b3d6d', mouth = 'smile', extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="110" height="120" viewBox="0 0 110 120">
<rect x="51" y="2" width="8" height="16" fill="#475569"/><circle cx="55" cy="6" r="6" fill="#ffcc00"/>
<rect x="10" y="18" width="90" height="74" rx="18" fill="${body}" stroke="#082c50" stroke-width="4"/>
<circle cx="38" cy="48" r="9" fill="#ffffff"/><circle cx="72" cy="48" r="9" fill="#ffffff"/><circle cx="39" cy="49" r="4" fill="#082c50"/><circle cx="73" cy="49" r="4" fill="#082c50"/>
${mouth === 'smile' ? '<path d="M38 70 Q55 82 72 70" fill="none" stroke="#ffcc00" stroke-width="5" stroke-linecap="round"/>'
    : mouth === 'sad' ? '<path d="M38 78 Q55 66 72 78" fill="none" stroke="#ffcc00" stroke-width="5" stroke-linecap="round"/>'
      : '<path d="M40 74 H70" stroke="#ffcc00" stroke-width="5" stroke-linecap="round"/>'}${extra}
<rect x="30" y="96" width="50" height="20" rx="6" fill="#ffcc00" stroke="#082c50" stroke-width="3"/></svg>`;

// ---- extension blocks used here (the extensions' own block ids) ------------------------
const ext = (id, file) => ({ id, url: BASE + file });
const LENS = ext('blockmlLens', 'lens.js');
const VOICE = ext('blockmlVoice', 'voice.js');
const SCAN = ext('blockmlScan', 'scan.js');
const WEATHER = ext('blockmlWeather', 'weather.js');
const TEXT = ext('blockmlText', 'text.js');
const CHAT = ext('blockmlChat', 'chat.js');
const OBJECTS = ext('blockmlObjects', 'objects.js');
const IMAGE = ext('blockmlImage', 'image.js');
const use = (p, ...exts) => exts.forEach((e) => p.useExtension(e.id, e.url));

const lens = {
  camera: (state = 'on') => ({ op: 'blockmlLens_setCamera', fields: { STATE: state } }),
  transparency: (n) => ({ op: 'blockmlLens_setTransparency', inputs: { VALUE: n } }),
  recognize: { op: 'blockmlLens_recognize' },
  thing: () => op('blockmlLens_thing'),
  confidence: () => op('blockmlLens_thingConfidence'),
  guess: (n, property = 'name') => op('blockmlLens_guess', { INDEX: n }, { PROPERTY: property }),
  read: { op: 'blockmlLens_readText' },
  text: () => op('blockmlLens_textRead'),
  words: () => op('blockmlLens_numberOfWords'),
};
const voice = {
  speak: (t) => ({ op: 'blockmlVoice_speak', inputs: { TEXT: t } }),
  speakAndWait: (t) => ({ op: 'blockmlVoice_speakAndWait', inputs: { TEXT: t } }),
  start: { op: 'blockmlVoice_startListening' },
  listenForAny: { op: 'blockmlVoice_listenForAny' },
  heard: () => op('blockmlVoice_whatIHeard'),
  heardWord: (w) => bool('blockmlVoice_heardWord', { WORD: w }),
  clear: { op: 'blockmlVoice_clearHeard' },
  ready: () => bool('blockmlVoice_isReady'),
};
const scan = {
  camera: (state = 'on') => ({ op: 'blockmlScan_setCamera', fields: { STATE: state } }),
  transparency: (n) => ({ op: 'blockmlScan_setTransparency', inputs: { VALUE: n } }),
  overlay: (mode = 'boxes') => ({ op: 'blockmlScan_setOverlay', fields: { MODE: mode } }),
  cardSeen: () => op('blockmlScan_cardSeen'),
  isCard: (name) => bool('blockmlScan_isCardSeen', { CARD: { menu: 'blockmlScan_menu_cards', field: 'cards', value: name } }),
  isCardReporter: (reporter) => bool('blockmlScan_isCardSeen', { CARD: { reporter, shadow: { menu: 'blockmlScan_menu_cards', field: 'cards', value: 'go' } } }),
  tags: () => op('blockmlScan_numberOfTags'),
  tag: (property, index = 1) => op('blockmlScan_tagValue', { INDEX: index }, { PROPERTY: property }),
  qrText: () => op('blockmlScan_qrText'),
  qrSeen: () => bool('blockmlScan_isQrSeen'),
};
const weather = {
  get: (place) => ({ op: 'blockmlWeather_getWeather', inputs: { PLACE: place } }),
  place: () => op('blockmlWeather_place'),
  now: (measure) => op('blockmlWeather_now', {}, { MEASURE: measure }),
  words: () => op('blockmlWeather_wordsNow'),
  ready: () => bool('blockmlWeather_hasWeather'),
  problem: () => op('blockmlWeather_problem'),
};
const textAI = {
  openTrainer: { op: 'blockmlText_openTrainer' },
  trained: () => bool('blockmlText_isTrained'),
  label: (t) => op('blockmlText_labelOf', { TEXT: t }),
  confidence: (t, cls) => op('blockmlText_confidenceOf', { TEXT: t, CLASS: { reporter: cls, shadow: { menu: 'blockmlText_menu_classes', field: 'classes', value: 'Happy' } } }),
  ready: () => bool('blockmlText_isReady'),
};
const chat = {
  ask: (q) => ({ op: 'blockmlChat_ask', inputs: { QUESTION: q } }),
  answer: () => op('blockmlChat_answer'),
  blocked: () => bool('blockmlChat_wasBlocked'),
  role: (r) => ({ op: 'blockmlChat_setRole', inputs: { ROLE: r } }),
  forget: { op: 'blockmlChat_forget' },
  start: { op: 'blockmlChat_start' },
  ready: () => bool('blockmlChat_isReady'),
  progress: () => op('blockmlChat_progress'),
};
const objects = {
  camera: (state = 'on') => ({ op: 'blockmlObjects_setCamera', fields: { STATE: state } }),
  transparency: (n) => ({ op: 'blockmlObjects_setTransparency', inputs: { VALUE: n } }),
  detect: { op: 'blockmlObjects_detect' },
  count: () => op('blockmlObjects_numberOfObjects'),
  value: (property, index = 1) => op('blockmlObjects_objectValue', { INDEX: index }, { PROPERTY: property }),
};
const ask = (q) => ({ op: 'sensing_askandwait', inputs: { QUESTION: q } });
const answer = () => op('sensing_answer');
const joinAll = (...parts) => parts.reduceRight((acc, part) => (acc === null ? part : join2(part, acc)), null);
const contains = (a, b) => bool('operator_contains', { STRING1: a, STRING2: b });
const listLength = (list) => op('data_lengthoflist', {}, { LIST: list });
const listItem = (list, index) => op('data_itemoflist', { INDEX: index }, { LIST: list });
const clearList = (list) => ({ op: 'data_deletealloflist', fields: { LIST: list } });
const repeat = (times, ...body) => ({ op: 'control_repeat', inputs: { TIMES: times }, substack: body });
const stopThis = { op: 'control_stop', fields: { STOP_OPTION: 'this script' }, mutation: { tagName: 'mutation', children: [], hasnext: 'false' } };
const penDown = { op: 'pen_penDown' };
const penClear = { op: 'pen_clear' };
const penColour = (c) => ({ op: 'pen_setPenColorToColor', inputs: { COLOR: { color: c } } });
const penSize = (n) => ({ op: 'pen_setPenSizeTo', inputs: { SIZE: n } });
/** Waits for the chat AI, showing the download %. */
const waitForChat = (who = 'my brain') => [chat.start, repeatUntil(chat.ready(), say(joinAll(`Loading ${who}… `, chat.progress(), '%'))), say('')];

function write(slug, file, content) {
  const dir = path.join(OUT, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), typeof content === 'string' ? content : content.toSb3('BlockML Studio AI session builder'));
  console.log('ai session:', `${slug}/${file}`);
}
const PROJECT = (label = '🤖 Open the project') => [{ file: 'project.sb3', label }];
const cards = [];
const card = (c) => {
  cards.push(c);
  write(c.slug, 'index.html', aiSessionPage(c));
};

// ---- AI 1: Object Detective (session 18) — starters ----------------------------------------
card({
  number: 1, session: 18, slug: 'ai01-object-detective', kicker: 'AI 1 · Session 18 · Level 1: Use', title: 'Object Detective',
  objective: 'I can build an app that finds and labels everyday objects with the camera, and test where it fails.',
  ai: ['object detection', 'labels and boxes', 'confidence', '80 everyday things (COCO)'],
  coding: ['repeat with a counter', 'lists', 'events vs. checking in a loop'],
  projects: [{ file: `${STARTERS}object-counter.sb3`, label: '🤖 Object counter' }, { file: `${STARTERS}classroom-helper.sb3`, label: 'Classroom helper' }],
  materials: ['Laptop with a webcam', 'A few everyday things: cup, book, bottle, phone, scissors'],
  say: '“This AI was trained on hundreds of thousands of photos where people drew boxes around 80 kinds of things. It finds those things and draws its own boxes.”',
  steps: [
    'Open <b>Object counter</b>, allow the camera, and show a cup, a book and a bottle. <code>show boxes on stage</code> draws what the AI sees.',
    'Find <code>repeat (number of objects)</code>: it visits every object found and puts its name in a list.',
    'Open <b>Classroom helper</b>: compare <code>when camera sees a person</code> (an event) with checking in a loop every half second.',
    'Add <code>set minimum confidence to (50) %</code> before the forever loop, then try 20 and 90: what appears and what disappears?',
  ],
  failTests: ['Show half an object, or an object from above.', 'Show something that is not one of the 80 (a pencil sharpener, a leaf).', 'Show a photo of a cup on a phone screen.'],
  misconceptions: [['The AI knows every object.', 'It only knows the 80 kinds it was trained on; anything else becomes the nearest guess or nothing.']],
  app: ['Save the project, then export at blockml.codeai.ltd → Export Scratch Games to App; the app asks for the camera.'],
  offline: ['After the first visit the object AI works without internet.'],
});

// ---- AI 2: Guess Who? (session 19) — what place is this? -----------------------------------
{
  const p = new Project();
  use(p, LENS);
  p.addStage([p.costume('sky', SKY, [240, 180])]);
  p.addSprite('Guesser', [p.costume('bot', bot(), [55, 60])], [
    [flag, lens.camera('on'), lens.transparency(20), set('AI right', 0), set('AI wrong', 0), clearList('my places'), say('Show me a photo of a famous place or thing, then press space.')],
    [
      whenKey('space'),
      think('Looking…'),
      lens.recognize,
      sayFor(joinAll('I think it is a ', lens.thing(), ' (', lens.confidence(), '%). Or maybe: ', lens.guess(2), '.'), 3),
      ask('What is it really?'),
      addTo('my places', joinAll(answer(), ' → AI said: ', lens.thing())),
      // A guess counts if the true name contains the AI's word ("Taj Mahal mosque" contains "mosque").
      ifElse(contains(answer(), lens.thing()),
        [change('AI right', 1), sayFor('Yes! I got it.', 2)],
        [change('AI wrong', 1), sayFor(joinAll('I only know 1,000 kinds of things, not names like "', answer(), '".'), 3)]),
      say('Press space for the next picture.'),
    ],
  ], { x: 120, y: -80 });
  p.showVariable('AI right', { x: 5, y: 5 });
  p.showVariable('AI wrong', { x: 5, y: 32 });
  p.showList('my places', { x: 5, y: 60, width: 220, height: 200 });
  write('ai02-what-place', 'project.sb3', p);
}
card({
  number: 2, session: 19, slug: 'ai02-what-place', kicker: 'AI 2 · Session 19 · Level 1: Use', title: 'Guess Who? Famous Places and Things',
  objective: 'I can use an AI that matches a picture against what it was trained on, and explain why it says "mosque" instead of "Taj Mahal".',
  ai: ['image recognition', 'trained categories (1,000 ImageNet things)', 'confidence', 'second guess'],
  coding: ['ask & answer', 'lists', 'contains', 'join'],
  projects: PROJECT(),
  materials: ['Laptop with a webcam', 'Photos of famous places and objects (printed, or on a phone or tablet): Taj Mahal, India Gate, a bridge, a lighthouse, a temple, a cricket bat, a guitar…'],
  say: '“This AI was trained on more than a million photos sorted into 1,000 kinds of things — like mosque, triumphal arch, suspension bridge, guitar. It matches your picture against those kinds. It was never taught names like Taj Mahal, or brand logos.”',
  steps: [
    'Open the project, allow the camera, show a photo of the Taj Mahal and press <b>space</b>. In our tests it said <i>mosque 94%</i>; India Gate gave <i>triumphal arch 90%</i>; the Eiffel Tower only <i>palace 19%</i>.',
    'Type what it really is. The list <i>my places</i> records each guess; <code>AI right</code> and <code>AI wrong</code> count them.',
    'Find <code>if (answer) contains (what the camera sees)</code>: when do we count the AI as right? Is that fair?',
    'Show a brand logo (a cereal box, a shoe). What does it say? Why can\'t it read brands?',
    'Discuss: real “guess the landmark” apps use AI trained on millions of photos of named places — and send your photo to their servers. Ours runs on the laptop.',
  ],
  failTests: ['A drawing of a place instead of a photo.', 'A famous place photographed at night.', 'A logo on its own.', 'The same picture, upside down.'],
  misconceptions: [
    ['The AI recognises famous places.', 'It only knows the 1,000 kinds of things it was trained on. It can say "mosque" but has never learned the name "Taj Mahal".'],
    ['A high confidence means it is right.', 'The Eiffel Tower got "palace" — a wrong answer can still come with a confidence.'],
  ],
  challenges: ['Make the Guesser speak its guess (Voice extension).', 'Train your own Image Model with three printed landmarks: now it knows their names. That is AI 9!'],
  app: ['Export at blockml.codeai.ltd → Export Scratch Games to App; the app asks for the camera.'],
  offline: ['The recognition AI works without internet after the first visit.'],
});

// ---- AI 3: Read My Writing (session 20) — read text aloud ----------------------------------
{
  const p = new Project();
  use(p, LENS, VOICE);
  p.addStage([p.costume('sky', SKY, [240, 180])]);
  p.addSprite('Reader', [p.costume('bot', bot('#16a34a'), [55, 60])], [
    [flag, lens.camera('on'), lens.transparency(15), say('Hold up some writing and press space. I will read it aloud.')],
    [
      whenKey('space'),
      think('Reading…'),
      lens.read,
      ifElse(gt(lens.words(), 0),
        [
          say(lens.text()),
          voice.speakAndWait(lens.text()),
          sayFor(joinAll('I read ', lens.words(), ' words. Confidence: ', op('blockmlLens_textConfidence'), '%'), 3),
        ],
        [sayFor('I can\'t see any words. Hold them closer, in good light.', 3)]),
      say('Press space to read again.'),
    ],
  ], { x: 120, y: -80 });
  write('ai03-read-my-writing', 'project.sb3', p);
}
card({
  number: 3, session: 20, slug: 'ai03-read-my-writing', kicker: 'AI 3 · Session 20 · Level 1: Use', title: 'Read My Writing',
  objective: 'I can use text recognition (OCR) to turn the pixels of written words into text a computer can use — and read it aloud.',
  ai: ['OCR: pixels to letters', 'confidence', 'text-to-speech'],
  coding: ['if / else', 'join', 'events'],
  projects: PROJECT(),
  materials: ['Laptop with a webcam', 'Printed text in large letters; a page of neat handwriting; a page of messy handwriting'],
  say: '“OCR is one of the oldest AI jobs: since the 1970s it has read printed books aloud to blind people. It looks at shapes of pixels and decides which letters they are.”',
  steps: [
    'Open the project and allow the camera. Hold up a printed sign (big letters) and press <b>space</b>: the robot reads it aloud.',
    'Try neat handwriting in capital letters, then joined-up handwriting. In our tests, handwriting-style fonts were read at 90–96% confidence; real children\'s handwriting is harder.',
    'Find <code>if (number of words read) &gt; 0</code>: what does the robot do when it reads nothing?',
    'Find <code>speak (text read) and wait</code>: OCR + text-to-speech is exactly what reading apps for blind people do.',
  ],
  failTests: ['Writing held at an angle, or upside down.', 'Pencil on lined paper.', 'Hindi or another script (this reader knows English only).', 'Words on a busy background (a cereal box).'],
  misconceptions: [['The AI understands what it reads.', 'It only turns shapes into letters. What the words mean is up to us.']],
  challenges: ['Count how many times the word "the" appears.', 'If the text contains "stop", make a sprite stop.'],
  app: ['Export at blockml.codeai.ltd → Export Scratch Games to App; the app uses the camera and the phone\'s own voice.'],
  offline: ['The text reader downloads once (about 6 MB) and then works without internet.'],
});

// ---- AI 4: Recognition Cards Adventure (session 21) — reaction game -----------------------
{
  const CARDS = ['go', 'stop', 'left', 'right', 'jump', 'apple', 'cat', 'star'];
  const p = new Project();
  use(p, SCAN);
  p.addStage([p.costume('sky', SKY, [240, 180])]);
  p.addSprite('Referee', [p.costume('bot', bot('#7c3aed'), [55, 60])], [[
    flag,
    scan.camera('on'),
    scan.transparency(30),
    scan.overlay('boxes'),
    clearList('cards'),
    ...CARDS.map((c) => addTo('cards', c)),
    set('score', 0),
    set('best time', 99),
    set('wanted', ''),
    set('last', ''),
    sayFor('Show me the card I ask for, as fast as you can! 10 rounds.', 2.5),
    repeat(10,
      // A random card, never the same one twice in a row.
      repeatUntil(not(eq(v('wanted'), v('last'))), set('wanted', listItem('cards', random(1, listLength('cards'))))),
      set('last', v('wanted')),
      say(joinAll('Show me: ', v('wanted'), '!')),
      resetTimer,
      // Wait for the right card, or 5 seconds.
      waitUntil(bool('operator_or', { OPERAND1: scan.isCardReporter(v('wanted')), OPERAND2: gt(timer(), 5) })),
      ifElse(lt(timer(), 5),
        [
          change('score', 1),
          set('my time', round(op('operator_multiply', { NUM1: timer(), NUM2: 10 }))),
          set('my time', op('operator_divide', { NUM1: v('my time'), NUM2: 10 })),
          ifThen(lt(v('my time'), v('best time')), set('best time', v('my time'))),
          startSound('catch'),
          sayFor(joinAll('Yes! ', v('my time'), ' seconds'), 1),
          say('Put it down!'),
          waitUntil(not(scan.isCardReporter(v('wanted')))),
        ],
        [startSound('thud'), sayFor('Too slow!', 1)]),
    ),
    sayFor(joinAll('Score ', v('score'), ' out of 10. Best time: ', v('best time'), ' s'), 5),
  ]], { x: 120, y: -80, sounds: sounds(p, 'catch', 'thud') });
  p.showVariable('score', { x: 5, y: 5 });
  p.showVariable('best time', { x: 5, y: 32 });
  write('ai04-card-reaction', 'project.sb3', p);
}
card({
  number: 4, session: 21, slug: 'ai04-card-reaction', kicker: 'AI 4 · Session 21 · Level 1: Use', title: 'Recognition Cards Adventure',
  objective: 'I can use a model trained on one exact set of cards to build a fast reaction game, and explain why it is so quick and so sure.',
  ai: ['recognition cards', 'a model trained on exactly these images', 'instant recognition'],
  coding: ['lists', 'random', 'timer', 'repeat 10', 'wait until', 'or'],
  projects: PROJECT('🎮 Open the game'),
  extraButtons: '<a class="btn light" href="../../printables/cards.html" target="_blank" rel="noopener">🖨 Print the cards</a>',
  materials: ['Laptop with a webcam', 'Printed recognition cards (button above): go, stop, left, right, jump, apple, cat, star'],
  say: '“These cards work almost instantly because the computer only needs to tell apart a few patterns it was built for in advance — unlike a photo AI that must handle anything.”',
  steps: [
    'Print the cards and spread them on the desk. Open the game and allow the camera.',
    'The robot picks a random card from the list <i>cards</i>. Show it as fast as you can: <code>wait until (card [wanted] seen?) or (timer &gt; 5)</code>.',
    'Find how the reaction time is rounded to one decimal: <code>round(timer × 10) / 10</code>.',
    'Play in pairs: who has the best time? Add more cards to the list (any card name from the sheet).',
  ],
  failTests: ['Cover a corner of the card.', 'Show the card tilted far back, or very far away.', 'Two cards at once: which one counts?'],
  misconceptions: [['The computer sees the picture of the cat.', 'It reads the black-and-white square; the picture is only for people.']],
  challenges: ['Show the opposite card ("left" when it says "right").', 'Make a cards-only maze game: go, left, right, stop.'],
  app: ['Export at blockml.codeai.ltd; print the cards for the phone camera too.'],
  offline: ['No internet needed at all: the cards are read by plain code on the laptop.'],
});

// ---- AI 5: QR Code Treasure Hunt (session 22) -----------------------------------------------
{
  const CLUES = ['treasure 1', 'treasure 2', 'treasure 3', 'treasure 4', 'treasure 5'];
  const p = new Project();
  use(p, SCAN);
  p.addStage([p.costume('sky', SKY, [240, 180])]);
  p.addSprite('Pirate', [p.costume('bot', bot('#b45309', 'smile', '<path d="M18 30 L92 30 L80 20 L30 20 Z" fill="#111827"/>'), [55, 60])], [[
    flag,
    scan.camera('on'),
    scan.transparency(25),
    clearList('found'),
    resetTimer,
    set('next', 1),
    sayFor('Find the 5 treasure codes in order! Show each one to the camera.', 3),
    repeatUntil(gt(v('next'), 5),
      say(joinAll('Find treasure ', v('next'), '!')),
      waitUntil(scan.qrSeen()),
      ifElse(eq(scan.qrText(), joinAll('treasure ', v('next'))),
        [startSound('win'), addTo('found', scan.qrText()), change('next', 1), sayFor('Yes! Next one…', 1.5)],
        [ifElse(listContains('found', scan.qrText()),
          [sayFor('You already found that one.', 1.5)],
          [sayFor(joinAll('That is "', scan.qrText(), '" — not the next treasure yet.'), 2)])]),
      waitUntil(not(scan.qrSeen()))),
    sayFor(joinAll('All treasure found in ', round(timer()), ' seconds!'), 5),
  ]], { x: 120, y: -80, sounds: sounds(p, 'win') });
  p.showList('found', { x: 5, y: 5, width: 150, height: 160 });
  write('ai05-qr-treasure-hunt', 'project.sb3', p);
  const qr = (t) => {
    const q = qrcode(0, 'M');
    q.addData(t);
    q.make();
    return q.createSvgTag({ cellSize: 4, margin: 4, scalable: true }).replace('<svg ', '<svg style="width:100%;height:auto;display:block" shape-rendering="crispEdges" ');
  };
  write('ai05-qr-treasure-hunt', 'clues.html', printPage('QR treasure hunt: the five treasures',
    'Print at 100% size, cut out, and hide the codes around the room. The game asks for them in order. For a new hunt, make codes that say treasure 1 to treasure 5 with any QR code maker, or change the check in the game.',
    `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6mm">${CLUES.map((c) => `<div style="border:2px dashed #b8c6dc;border-radius:12px;padding:5mm;text-align:center;break-inside:avoid"><div style="width:42mm;margin:0 auto">${qr(c)}</div><div style="font-weight:800;color:var(--ink);font-size:20px;margin-top:3mm">${c}</div></div>`).join('')}</div>`));
}
card({
  number: 5, session: 22, slug: 'ai05-qr-treasure-hunt', kicker: 'AI 5 · Session 22 · Level 1: Use', title: 'QR Code Treasure Hunt',
  objective: 'I can build a scavenger-hunt app that reads the information hidden in QR codes.',
  ai: ['QR codes store text', 'error correction', 'instant reading'],
  coding: ['variables as counters', 'repeat until', 'wait until', 'lists: add, contains', 'join'],
  projects: PROJECT('🗺 Open the treasure hunt'),
  extraButtons: '<a class="btn light" href="clues.html" target="_blank" rel="noopener">🖨 Print the treasure codes</a>',
  materials: ['Laptop with a webcam (or the app on a phone — best for walking around)', 'The five printed treasure codes, hidden around the room'],
  say: '“A QR code hides text in a pattern of squares. Part of each code repeats the information, so it still works when a corner is damaged.”',
  steps: [
    'Before class: print the codes and hide them. Open the project and allow the camera.',
    'Players find the treasures in order. <code>if (QR code text) = join "treasure " (next)</code> checks it is the right one.',
    'The list <i>found</i> remembers what was found: <code>if found contains (QR code text)</code> gives "you already found that one".',
    'Make your own hunt: create QR codes with clues ("Look under the blue chair") using any QR maker, and change the game to say each clue.',
  ],
  failTests: ['Cover a quarter of a code: does it still work? Half?', 'Show a code from far away.', 'Show a QR code from a product box.'],
  misconceptions: [['QR codes are AI.', 'Reading a QR code is exact maths, not guessing — compare with the photo AI of AI 2, which guesses.']],
  challenges: ['A time limit for each treasure.', 'Clues in the QR text itself: "treasure 2: look near the door".'],
  app: ['This is perfect as a phone app: export at blockml.codeai.ltd and walk around with the phone.'],
  offline: ['Works fully offline: QR codes are read by plain code on the device.'],
});

// ---- AI 6: AprilTag Robot Tracker (session 23) -----------------------------------------------
{
  const p = new Project();
  use(p, SCAN);
  p.useExtension('pen');
  const arrow = '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><path d="M30 4 L52 52 L30 40 L8 52 Z" fill="#ffcc00" stroke="#0b3d6d" stroke-width="4" stroke-linejoin="round"/></svg>';
  const garage = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#eef3fb"/><rect x="380" y="20" width="80" height="80" fill="#bbf7d0" stroke="#16a34a" stroke-width="4" stroke-dasharray="8 6"/><text x="420" y="66" font-family="Arial" font-size="14" text-anchor="middle" fill="#166534">PARK</text></svg>';
  p.addStage([p.costume('floor', garage, [240, 180])]);
  p.addSprite('Robot', [p.costume('arrow', arrow, [30, 30])], [
    [flag, scan.camera('on'), scan.transparency(40), scan.overlay('boxes'), penClear, penColour('#0b3d6d'), penSize(3), say('Hold up AprilTag 100 and move it around.')],
    [
      flag,
      forever(
        ifElse(gt(scan.tags(), 0),
          [
            say(''),
            // The robot copies the tag: same place, same direction. The pen draws its path.
            goTo(scan.tag('x'), scan.tag('y')),
            pointIn(scan.tag('direction')),
            penDown,
            set('tag number', scan.tag('number')),
            set('angle', scan.tag('direction')),
            ifThen(and(gt(scan.tag('x'), 140), gt(scan.tag('y'), 80)), sayFor('Parked!', 1)),
          ],
          [{ op: 'pen_penUp' }, say('Where is the tag?')]),
      ),
    ],
    [whenKey('c'), penClear],
  ], { x: 0, y: 0 });
  p.showVariable('tag number', { x: 5, y: 5 });
  p.showVariable('angle', { x: 5, y: 32 });
  write('ai06-apriltag-tracker', 'project.sb3', p);
}
card({
  number: 6, session: 23, slug: 'ai06-apriltag-tracker', kicker: 'AI 6 · Session 23 · Level 1: Use', title: 'AprilTag Robot Tracker',
  objective: 'I can use visual tags so a project knows exactly where something is and which way it faces.',
  ai: ['AprilTags', 'position (x, y)', 'angle (direction)', 'tracking'],
  coding: ['coordinates', 'direction', 'pen', 'forever', 'and'],
  projects: PROJECT(),
  extraButtons: '<a class="btn light" href="../../printables/tags.html" target="_blank" rel="noopener">🖨 Print AprilTags</a>',
  materials: ['Laptop with a webcam', 'Printed AprilTags (button above) — tag 100 is the "robot"'],
  say: '“Warehouse robots read tags like these on the floor and shelves. A tag tells the robot not just where it is, but the exact angle it is facing — like a super compass.”',
  steps: [
    'Open the project, allow the camera and hold up tag 100. The arrow copies it: <code>go to x: (x of tag 1) y: (y of tag 1)</code> and <code>point in direction (direction of tag 1)</code>.',
    'Turn the tag slowly: watch <code>angle</code> change. Move it: the pen draws the path. Press <b>c</b> to clear.',
    '"Park" the robot in the green box at the top right: <code>if x &gt; 140 and y &gt; 80</code>.',
    'Try tag 101: what does <code>tag number</code> show? Make tag 101 a second robot.',
  ],
  failTests: ['Tilt the tag far back.', 'Move it very fast.', 'Cover one corner.'],
  misconceptions: [['The camera sees a robot.', 'It only finds the black square and its four corners; from those it works out place and angle.']],
  challenges: ['Two tags: draw a line between them.', 'Follow a path painted on the stage: score when the robot stays on it.'],
  app: ['Export at blockml.codeai.ltd; the app asks for the camera.'],
  offline: ['Works fully offline.'],
});

// ---- AI 7: Weather Wizard (session 24) — starter ----------------------------------------------
card({
  number: 7, session: 24, slug: 'ai07-weather-wizard', kicker: 'AI 7 · Session 24 · Level 1: Use (data & computing)', title: 'Weather Wizard App',
  objective: 'I can build an app that pulls live weather data from the internet and uses it in conditional logic.',
  ai: ['live data from weather stations', 'forecasts', 'data in decisions'],
  coding: ['if / else', 'comparisons', 'variables', 'ask & answer'],
  projects: [{ file: `${STARTERS}weather-helper.sb3`, label: '⛅ Weather helper' }],
  materials: ['Laptop with internet'],
  say: '“Weather stations measure temperature, wind and rain every hour; forecast computers — trained on decades of weather — predict the next hours. Our app asks for that data and decides what advice to give.”',
  steps: [
    'Open <b>Weather helper</b>, type your city (try Guwahati, Delhi, London).',
    'Find <code>get the weather for (answer)</code>, then <code>temperature (°C) now</code> and <code>rain in the next 6 hours?</code>.',
    'The advice is our own rules: <code>if temperature &gt; 32 then say drink water</code>. Add a rule for wind.',
    'Use <code>temperature in (6) hours</code>: will it be warmer or colder this evening?',
  ],
  failTests: ['A city the list doesn\'t know (a small village): what happens?', 'Turn the Wi-Fi off and ask again.'],
  misconceptions: [['The app knows the future.', 'A forecast is a prediction from models and measurements; it can be wrong, especially days ahead.']],
  challenges: ['A farming frost warning: if the temperature in 6 hours is below 4, warn.', 'Compare two cities.'],
  app: ['Export at blockml.codeai.ltd; the app needs the internet to get the weather.'],
  offline: ['No internet: the weather blocks say so (<code>weather problem</code>). Discuss what the app would need.'],
});

// ---- AI 8: Ask Alexa → your own voice assistant (session 25) ------------------------------------
{
  const p = new Project();
  use(p, VOICE, WEATHER);
  p.variable('city', 'Delhi');
  p.addStage([p.costume('sky', SKY, [240, 180])]);
  const heard = (w) => voice.heardWord(w);
  const reply = (t) => [say(t), voice.speakAndWait(t)];
  p.addSprite('Sunny', [p.costume('bot', bot('#0891b2'), [55, 60])], [[
    flag,
    clearList('jokes'),
    addTo('jokes', 'Why did the computer go to the doctor? It had a virus!'),
    addTo('jokes', 'What do you call a robot that takes the long way? R2 Detour!'),
    addTo('jokes', 'Why was the math book sad? It had too many problems.'),
    voice.listenForAny,
    voice.start,
    say('Loading my ears…'),
    waitUntil(voice.ready()),
    ...reply('Hi! Say "Sunny" and then ask me the time, the date, the weather, a joke, or to start a timer.'),
    forever(
      waitUntil(heard('sunny')),
      // Just "Sunny"? Then wait for the question.
      ifThen(eq(voice.heard(), 'sunny'), ...reply('Yes?'), voice.clear, waitUntil(not(eq(voice.heard(), '')))),
      // A voice assistant = speech recognition + our own knowledge rules.
      ifElse(heard('time'),
        reply(joinAll('It is ', current('HOUR'), ' ', current('MINUTE'), '.')),
        [ifElse(heard('date'),
          reply(joinAll('Today is ', current('DATE'), ' ', current('MONTH'), ' ', current('YEAR'), '.')),
          [ifElse(heard('weather'),
            [weather.get(v('city')), ifElse(weather.ready(),
              reply(joinAll('In ', v('city'), ' it is ', weather.now('temperature (°C)'), ' degrees, ', weather.words(), '.')),
              reply('Sorry, I can\'t get the weather without the internet.'))],
            [ifElse(heard('joke'),
              reply(listItem('jokes', random(1, listLength('jokes')))),
              [ifElse(heard('timer'),
                [...reply('Timer started: 10 seconds.'), wait(10), startSound('win'), ...reply('Time is up!')],
                reply('Sorry, I don\'t know that yet. You can teach me: add an if block!'))])])])]),
      voice.clear,
      say('Say "Sunny" to ask me something.'),
    ),
  ]], { x: 120, y: -80, sounds: sounds(p, 'win') });
  p.showVariable('city', { x: 5, y: 5 });
  write('ai08-voice-assistant', 'project.sb3', p);
}
card({
  number: 8, session: 25, slug: 'ai08-voice-assistant', kicker: 'AI 8 · Session 25 · Level 1: Use', title: 'Build Your Own Voice Assistant',
  objective: 'I can explain how voice assistants combine speech recognition with a knowledge system — and build one that answers in its own voice.',
  ai: ['speech-to-text', 'wake word', 'text-to-speech', 'knowledge rules'],
  coding: ['if / else chains', 'lists', 'current date and time', 'join', 'wait until'],
  projects: PROJECT('🎙 Open Sunny'),
  materials: ['Laptop with a microphone and speakers', 'A quiet-ish room'],
  say: '“Alexa and Siri send your voice to big computers in the cloud. Sunny does everything on this laptop: it turns your voice into words, looks for words it knows, and answers with the computer\'s voice. Only the weather needs the internet.”',
  steps: [
    'Open Sunny and allow the microphone. Say “Sunny, what time is it?”, “Sunny, tell me a joke”, “Sunny, what\'s the weather?”.',
    'Find the wake word: <code>wait until I heard [sunny]?</code>. Why do real assistants need one?',
    'The <b>knowledge</b> is our if / else chain: time, date, weather, joke, timer. Add a new skill (“Sunny, flip a coin”).',
    'Change the <code>city</code> variable to your city. Add a joke to the list.',
  ],
  failTests: ['Ask in a noisy room, or from far away.', 'Say "Sunny" in the middle of a sentence.', 'Ask something it doesn\'t know: how does it answer?'],
  misconceptions: [['Voice assistants understand everything.', 'They recognise words, then follow rules and knowledge someone built — exactly like our if / else blocks, just much bigger.']],
  challenges: ['A "Sunny, what is (number) times (number)?" skill.', 'Use Chat AI for questions Sunny has no rule for.'],
  app: ['Export at blockml.codeai.ltd; the app asks for the microphone and speaks with the phone\'s voice.'],
  offline: ['Everything except the weather works offline after the first visit.'],
});

// ---- AI 9–11: starters ------------------------------------------------------------------------
card({
  number: 9, session: 26, slug: 'ai09-object-sorter', kicker: 'AI 9 · Session 26 · Level 2: Customize', title: 'My Own Object Sorter',
  objective: 'I can customize a general image AI for one specific job I choose, by giving it my own labelled examples.',
  ai: ['Example', 'Label', 'Train', 'Predict', 'confidence'],
  coding: ['if / else-if chains', 'thresholds'],
  projects: [{ file: `${STARTERS}fruit-sorter.sb3`, label: '🍎 Fruit sorter' }],
  materials: ['Laptop with a webcam', 'Three kinds of real things to sort (fruit, recycling: plastic / paper / metal, pencils / pens / erasers)'],
  say: '“The Image Model already knows how to look at pictures. We customize it: we show it examples of OUR three things and it learns to tell them apart.”',
  steps: [
    'Open <b>Fruit sorter</b>, click <code>open the trainer</code> and rename the classes for your own job (for example Plastic, Paper, Metal).',
    'Record 20+ photos per class from different angles, plus a class “Nothing”. Train and test live.',
    'Change the sorter\'s speech and baskets to your classes. Find <code>if (confidence of Apple) &gt; 80</code>: what happens at 40 and at 95?',
    'Save the project: the training goes inside it.',
  ],
  failTests: ['A thing that is in none of your classes.', 'Different light, a different background.', 'Only 3 photos per class vs. 30.'],
  misconceptions: [['It now understands recycling.', 'It learned to separate your examples; a new kind of bottle may fool it.']],
  app: ['Train and save in Studio, then export at blockml.codeai.ltd; the training is inside the project.'],
  offline: ['Training and sorting run on the laptop, no internet needed after the first visit.'],
});
card({
  number: 10, session: 27, slug: 'ai10-number-reader', kicker: 'AI 10 · Session 27 · Level 2: Customize', title: 'My Own Number Reader',
  objective: 'I can train an AI to recognise handwritten digits drawn in many different styles.',
  ai: ['pattern recognition', 'training data variety', 'Example', 'Label'],
  coding: ['pen', 'mouse', 'events (key pressed)'],
  projects: [{ file: `${STARTERS}digit-drawer.sb3`, label: '✏️ Digit drawer' }],
  materials: ['Laptop with a mouse (or a touch screen)'],
  say: '“Reading handwritten digits was one of the very first tests for machine learning. Everyone writes a 7 differently — the AI needs to see many styles.”',
  steps: [
    'Open <b>Digit drawer</b>. Draw a 0 with the mouse and press <b>0</b> to add it as an example; repeat 4 times each for 0, 1 and 2, in different sizes and places.',
    'Press <b>T</b> to train, draw a new digit and press <b>space</b>: what does it guess?',
    'Find <code>add [stage drawing] to class (0)</code>: the AI learns from what is drawn on the stage.',
    'Ask a friend to draw: does your AI read their style? Add their examples too.',
  ],
  failTests: ['A very small digit in a corner.', 'A 7 with a line through it.', 'A digit you never trained (5).'],
  misconceptions: [['It reads numbers like we do.', 'It compares the picture to the examples it has; a new style may confuse it.']],
  app: ['Export at blockml.codeai.ltd: drawing works with a finger on the phone.'],
  offline: ['No internet needed after the first visit.'],
});
card({
  number: 11, session: 28, slug: 'ai11-hand-signs', kicker: 'AI 11 · Session 28 · Level 2: Customize', title: 'My Own Hand Sign Classifier',
  objective: 'I can customize hand tracking to recognise brand-new signs that I define myself.',
  ai: ['hand key points', 'custom classes', 'confidence'],
  coding: ['events (key pressed)', 'if / else', 'variables'],
  projects: [{ file: `${STARTERS}hand-signs.sb3`, label: '✋ Hand signs' }],
  materials: ['Laptop with a webcam', 'Good light on your hand'],
  say: '“The hand AI finds 21 points on your hand. We teach it which arrangements of points are OUR signs — so a few examples are enough, and the background doesn\'t matter.”',
  steps: [
    'Open <b>Hand signs</b>. Make a sign and press <b>A</b> five times, moving your hand a little; then signs B and C.',
    'Press <b>T</b> to train: the helper says the sign it sees when it is more than 80% sure.',
    'Find <code>add hand (1) as an example of sign [A]</code>: only the 21 points are saved, never a picture.',
    'Make a mini sign language: thumbs-up = yes, flat hand = stop.',
  ],
  failTests: ['Use your other hand.', 'Two signs that look almost the same.', 'Hand very close to the camera.'],
  misconceptions: [['It knows sign language.', 'It only knows the few signs you taught it; real sign language is far harder.']],
  app: ['Export at blockml.codeai.ltd; the app asks for the camera.'],
  offline: ['No internet needed after the first visit.'],
});

// ---- AI 12: Mood Reader (session 29) -----------------------------------------------------------
{
  const p = new Project();
  use(p, TEXT);
  p.extensionStorage.blockmlText = { version: 1, features: '', classes: ['Happy', 'Sad', 'Neutral'].map((name) => ({ name, examples: [] })) };
  p.addStage([p.costume('sky', SKY, [240, 180])]);
  p.addSprite('Mood bot', [p.costume('Happy', bot('#16a34a', 'smile'), [55, 60]), p.costume('Sad', bot('#2563eb', 'sad'), [55, 60]), p.costume('Neutral', bot('#64748b', 'flat'), [55, 60])], [[
    flag,
    costume('Neutral'),
    ifThen(not(textAI.trained()),
      say('Teach me first: write examples of Happy, Sad and Neutral sentences.'),
      textAI.openTrainer,
      waitUntil(textAI.trained())),
    forever(
      ask('Type a sentence and I will guess its mood:'),
      set('mood', textAI.label(answer())),
      // The costumes have the same names as the classes, so the label picks the face.
      { op: 'looks_switchcostumeto', inputs: { COSTUME: { reporter: { variable: 'mood' }, shadow: { menu: 'looks_costume', field: 'COSTUME', value: 'Neutral' } } } },
      sayFor(joinAll(v('mood'), ' (', textAI.confidence(answer(), v('mood')), '% sure)'), 3),
    ),
  ]], { x: 0, y: -60 });
  p.showVariable('mood', { x: 5, y: 5 });
  write('ai12-mood-reader', 'project.sb3', p);
}
card({
  number: 12, session: 29, slug: 'ai12-mood-reader', kicker: 'AI 12 · Session 29 · Level 2: Customize', title: 'Mood Reader: Train Your Own Sentiment AI',
  objective: 'I can train my own AI to guess if a sentence sounds happy, sad or neutral, and find the sentences that fool it.',
  ai: ['sentiment analysis', 'Example', 'Label', 'Train', 'confidence'],
  coding: ['costumes named like classes', 'ask & answer', 'join'],
  projects: PROJECT('😊 Open the Mood Reader'),
  materials: ['Laptop'],
  say: '“Companies use sentiment AI to read thousands of reviews. It learns from examples of happy and unhappy sentences — so it can be fooled by sentences unlike its examples.”',
  steps: [
    'Open the project: the text trainer opens with <i>Happy</i>, <i>Sad</i> and <i>Neutral</i>. Write at least 8 different sentences for each (paste many lines at once). Train and test, then press Done.',
    'Type new sentences. The robot\'s face follows the label: the costumes are named exactly like the classes.',
    'Look at “The AI reads:” in the trainer: the AI only sees these word pieces, not the order of the words.',
    'Fail-test with the class: “I am not happy”, “Oh great, another Monday.” Then add examples to fix them and train again.',
  ],
  failTests: ['Negation: "I am not happy".', 'Sarcasm: "Oh great, another Monday."', 'Emoji only: "😭".', 'A Hindi sentence.'],
  misconceptions: [
    ['The AI understands feelings.', 'It matches word patterns with the examples you gave it. It ignores word order, so "not happy" looks happy.'],
    ['More of the same examples will fix it.', 'Different kinds of examples help more: add negative and sarcastic sentences.'],
  ],
  challenges: ['Add a fourth class: Angry.', 'Count happy and sad messages in two variables.'],
  app: ['Train in Studio and save, then export at blockml.codeai.ltd: the examples are inside the project.'],
  offline: ['The text AI downloads once (8 MB) and then works without internet.'],
});

// ---- AI 13: Ask ChatGPT Anything (session 30) — starter ----------------------------------------
card({
  number: 13, session: 30, slug: 'ai13-ask-the-chatbot', kicker: 'AI 13 · Session 30 · Level 1: Use', title: 'Ask a ChatGPT-Style Chatbot Anything',
  objective: 'I can build an app that gets answers from a chatbot, and explain that it predicts likely answers rather than looking up facts.',
  ai: ['large language model', 'predicting the next words', 'role (system prompt)', 'safety check'],
  coding: ['ask & answer', 'forever', 'if / else'],
  projects: [{ file: `${STARTERS}my-chatbot.sb3`, label: '💬 My chatbot' }],
  materials: ['Laptop with Chrome or Edge', 'Before class: open the project once on every laptop to download the chat AI (about 280 MB)'],
  say: '“ChatGPT-style AIs read huge amounts of text and learned which words usually come next. Ours is a small one that runs on this laptop — so it is less clever than ChatGPT, and nothing you type leaves the room.”',
  steps: [
    'Open <b>My chatbot</b>; the robot shows the download % the first time.',
    'Ask anything: facts, jokes, help with Scratch. Ask the same question twice: same answer?',
    'Change the <code>role</code> variable: “You are Robo, a robot who loves dinosaurs.”',
    'Try a question it should refuse. Find <code>answer was blocked by the safety check?</code>.',
  ],
  failTests: ['A sum with big numbers.', 'A question about your school or town.', 'A trick question: "What colour is the invisible bird?"'],
  misconceptions: [['If the chatbot says it, it is true.', 'It predicts likely words; it can be confidently wrong. Check important answers.']],
  app: ['Export at blockml.codeai.ltd; the app downloads the chat AI on the phone the first time (internet needed once).'],
  offline: ['After the first download the chatbot works offline. No WebGPU: the robot says so.'],
});

// ---- AI 14: Translator (session 31) --------------------------------------------------------------
{
  const p = new Project();
  use(p, CHAT);
  p.variable('language', 'French');
  p.addStage([p.costume('sky', SKY, [240, 180])]);
  p.addSprite('Translator', [p.costume('bot', bot('#7c3aed'), [55, 60])], [[
    flag,
    ...waitForChat(),
    forever(
      ask(joinAll('Type an English sentence to translate into ', v('language'), ' (or type: language):')),
      ifElse(eq(answer(), 'language'),
        [ask('Which language? (French, Spanish or German work best)'), set('language', answer())],
        [
          think('Translating…'),
          // Small chatbots follow an instruction best when it is part of the question itself.
          // Each question on its own: forget earlier questions, so they don't steer this answer.
          chat.forget,
          chat.ask(joinAll('Translate into ', v('language'), ': "', answer(), '"')),
          sayFor(chat.answer(), 5),
        ]),
    ),
  ]], { x: 0, y: -60 });
  p.showVariable('language', { x: 5, y: 5 });
  write('ai14-translator', 'project.sb3', p);
}
card({
  number: 14, session: 31, slug: 'ai14-translator', kicker: 'AI 14 · Session 31 · Level 1: Use (reused)', title: 'Chatbot Translator',
  objective: 'I can reuse a chatbot to translate sentences, build the instruction with join, and test which languages it knows well.',
  ai: ['translation by a language model', 'the prompt (instruction + text)', 'training data decides what it knows'],
  coding: ['join', 'variables', 'if / else'],
  projects: PROJECT('🌍 Open the Translator'),
  materials: ['Laptop with Chrome or Edge (chat AI downloaded before class)', 'Someone who speaks French, Spanish or German, if possible'],
  say: '“The chatbot learned languages from the text it was trained on. It is good at the languages it saw a lot of — and our small one saw very little Hindi.”',
  steps: [
    'Open the Translator and type “I like to play football with my friends.” In our tests: <i>J\'aime jouer à football avec mes amis.</i> — almost right: a French speaker says <i>au football</i>.',
    'Find <code>ask chat AI (join "Translate into " language ": " answer)</code>: the instruction and your text are joined into one question, called a <b>prompt</b>.',
    'Type <b>language</b> and choose Spanish, then German. Then Hindi: in our tests it gave nonsense or English back. Discuss why.',
    'Translate a sentence, then translate the answer back to English: did the meaning survive? In one of our tests “The cat is sleeping on the bed” became <i>El perro está durmiendo en la cama</i> — the dog! Always check.',
  ],
  failTests: ['Hindi or Assamese.', 'A joke or an idiom ("It\'s raining cats and dogs").', 'A long paragraph.'],
  misconceptions: [['The AI speaks every language.', 'It only knows the languages that were common in its training text. Big translation apps use much bigger models, online.']],
  challenges: ['Make the robot speak the translation (Voice extension).', 'A quiz: show an English word, the player guesses the French, the chatbot checks.'],
  app: ['Export at blockml.codeai.ltd (internet needed once to download the chat AI).'],
  offline: ['Works offline after the chat AI is downloaded.'],
});

// ---- AI 15: Emoji Storyteller (session 32) -------------------------------------------------------
{
  const p = new Project();
  use(p, CHAT);
  p.addStage([p.costume('sky', SKY, [240, 180])]);
  p.addSprite('Storyteller', [p.costume('bot', bot('#db2777'), [55, 60])], [[
    flag,
    clearList('emoji stories'),
    // The small chat AI mostly answers this in Chinese; the big one picks good emoji.
    { op: 'blockmlChat_useModel', fields: { SIZE: 'big' } },
    ...waitForChat(),
    forever(
      ask('Tell me a short story sentence and I will turn it into emoji:'),
      think('Choosing emoji…'),
      chat.forget,
      chat.ask(joinAll('Write only 3 emoji that tell this story. Do not write any words. Story: "', answer(), '"')),
      addTo('emoji stories', joinAll(chat.answer(), '  ', answer())),
      sayFor(chat.answer(), 4),
    ),
  ]], { x: 120, y: -80 });
  p.showList('emoji stories', { x: 5, y: 5, width: 300, height: 220 });
  write('ai15-emoji-storyteller', 'project.sb3', p);
}
card({
  number: 15, session: 32, slug: 'ai15-emoji-storyteller', kicker: 'AI 15 · Session 32 · Level 1: Use (reused, lighter)', title: 'Emoji Storyteller',
  objective: 'I can use a chatbot to create playful content, and explain that it predicts patterns rather than feeling creative.',
  ai: ['generative AI', 'prompt design', 'creativity as pattern prediction'],
  coding: ['join', 'lists'],
  projects: PROJECT('😀 Open the Storyteller'),
  materials: ['Laptop with Chrome or Edge', 'Before class: open the project once on every laptop to download the <b>big</b> chat AI (about 840 MB)'],
  say: '“The chatbot has seen many sentences next to emoji. It predicts which emoji usually go with words like beach or rain. Is that being creative?”',
  steps: [
    'Type “I went to the beach and ate ice cream.” In our tests: 😊🍦🏖️. “My dog chased a cat up a tree.” gave 🐶🐱🌳. The big chat AI takes a few seconds to answer.',
    'Find the prompt: <code>join "Write only 3 emoji that tell this story. Do not write any words. Story: " answer</code>. Change 3 to 5. Remove “Do not write any words.”: what happens? (In our tests, a shorter prompt gave answers like <i>🐶 chasing 🐱 up a 🌳</i>.)',
    'Find <code>use the [big] chat model</code> and change it to <b>small</b>: in our tests the small one mostly answered in Chinese! It learned from lots of Chinese text, and it is too small to follow this unusual instruction. Bigger models follow instructions better — but are slower.',
    'Every story goes into the list <i>emoji stories</i>. Play a guessing game: one student reads only the emoji, the class guesses the story.',
  ],
  failTests: ['A story with no obvious emoji ("My uncle fixed the computer").', 'A very long story.', 'The same story twice.'],
  misconceptions: [['The AI is being creative like a person.', 'It predicts likely emoji from patterns; it doesn\'t imagine or feel anything.']],
  challenges: ['The reverse: give emoji, the chatbot writes the story.', 'Speak the story aloud with the Voice extension.'],
  app: ['Export at blockml.codeai.ltd (internet once for the chat AI download).'],
  offline: ['Works offline after the chat AI is downloaded.'],
});

// ---- AI 16: Meet the Personalities (session 33) --------------------------------------------------
{
  const STYLES = [
    ['1', 'Normal', 'Answer clearly and simply: ', '#0b3d6d'],
    ['2', 'Sarcastic', 'Answer in a playful, gently sarcastic way (never mean): ', '#7c3aed'],
    ['3', 'Friend', 'Answer like a super cheerful best friend with lots of excitement: ', '#16a34a'],
    ['4', 'Pirate', 'Answer like a pirate (say "Arr" and "matey"): ', '#b45309'],
  ];
  const p = new Project();
  use(p, CHAT);
  p.addStage([p.costume('sky', SKY, [240, 180])]);
  p.addSprite('Persona', STYLES.map(([, name, , colour]) => p.costume(name, bot(colour, name === 'Sarcastic' ? 'flat' : 'smile'), [55, 60])), [
    [flag, set('personality', 'Normal'), set('style', STYLES[0][2]), costume('Normal'), ...waitForChat(), broadcast('chat')],
    ...STYLES.map(([key, name, style]) => [whenKey(key), set('personality', name), set('style', style), costume(name), sayFor(`Personality: ${name}`, 1)]),
    [
      whenReceive('chat'),
      forever(
        ask(joinAll('Ask the ', v('personality'), ' AI something (keys 1-4 change personality):')),
        think('…'),
        // Same AI, same question: only the instruction in front changes.
        chat.forget,
        chat.ask(join2(v('style'), answer())),
        sayFor(chat.answer(), 6),
      ),
    ],
  ], { x: 120, y: -80 });
  p.showVariable('personality', { x: 5, y: 5 });
  write('ai16-personalities', 'project.sb3', p);
}
card({
  number: 16, session: 33, slug: 'ai16-personalities', kicker: 'AI 16 · Session 33 · Level 1: Use + Reflect', title: 'Meet the Personalities',
  objective: 'I can show that an AI\'s "personality" is just an instruction layered on top of the same model, not a real character.',
  ai: ['personality = an instruction', 'same model, different style', 'trust and tone'],
  coding: ['events (keys 1–4)', 'variables', 'join', 'broadcast'],
  projects: PROJECT('🎭 Open the Personalities'),
  materials: ['Laptop with Chrome or Edge (chat AI downloaded before class)'],
  say: '“Companies decide how friendly their chatbot sounds. It is the same AI underneath — only the instruction changes. Let\'s prove it.”',
  steps: [
    'Ask “What is the capital of France?” as Normal (1), then Pirate (4): <i>Arr, matey! The capital of France is Paris.</i>',
    'Press 2 (Sarcastic) and 3 (Friend) and ask “Can you help me with my homework?”. Same facts, different tone.',
    'Find <code>ask chat AI (join (style) (answer))</code>: the personality is just text in front of your question.',
    'Write your own personality (key 5): a sports commentator, a grandmother, a robot from the future.',
    'Discuss: does a friendly chatbot make you trust it more? Should it?',
  ],
  failTests: ['Ask the Sarcastic AI something sad: is it still kind?', 'Ask each personality the same maths question: same answer?'],
  misconceptions: [['The AI has different personalities inside.', 'It is one model following different instructions; the facts it knows don\'t change.']],
  challenges: ['A personality that answers only in questions.', 'A "teacher" personality that gives hints instead of answers.'],
  app: ['Export at blockml.codeai.ltd (internet once for the chat AI download). Keys 1–4 become buttons.'],
  offline: ['Works offline after the chat AI is downloaded.'],
});

// ---- AI 17: Big Brain vs. Little Brain — Vision (session 34) -------------------------------------
{
  const p = new Project();
  use(p, OBJECTS, IMAGE);
  p.extensionStorage.blockmlImage = { version: 1, features: 'mobilenet_v2_100_224', classes: ['cup', 'book', 'Nothing'].map((name) => ({ name, samples: [] })) };
  p.addStage([p.costume('sky', SKY, [240, 180])]);
  p.addSprite('Big Brain', [p.costume('bot', bot('#0b3d6d'), [55, 60])], [
    [flag, objects.camera('on'), objects.transparency(40), set('big right', 0), say('I know 80 things already.')],
    [whenReceive('compare'), objects.detect, ifElse(gt(objects.count(), 0), [say(joinAll('Big Brain: ', objects.value('name')))], [say('Big Brain: nothing')])],
  ], { x: -130, y: -80 });
  p.addSprite('Little Brain', [p.costume('bot', bot('#16a34a'), [55, 60])], [
    [
      flag,
      set('little right', 0),
      ifThen(not(img.trained()), say('Train me on YOUR things first!'), img.openTrainer(), waitUntil(img.trained())),
      say('Show us something and press space. Then B or L to score who was right.'),
    ],
    [whenReceive('compare'), img.classify(), say(joinAll('Little Brain: ', img.label(), ' (', op('blockmlImage_confidenceOf', { CLASS: { reporter: img.label(), shadow: { menu: 'blockmlImage_menu_classes', field: 'classes', value: 'cup' } } }), '%)'))],
  ], { x: 130, y: -80 });
  p.addSprite('Referee', [p.costume('dot', '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"></svg>', [1, 1])], [
    [whenKey('space'), broadcast('compare')],
    [whenKey('b'), change('big right', 1)],
    [whenKey('l'), change('little right', 1)],
  ], { visible: false });
  p.showVariable('big right', { x: 5, y: 5 });
  p.showVariable('little right', { x: 380, y: 5 });
  write('ai17-big-little-vision', 'project.sb3', p);
}
card({
  number: 17, session: 34, slug: 'ai17-big-little-vision', kicker: 'AI 17 · Session 34 · Level 3: Compare & Reason (flagship)', title: 'Big Brain vs. Little Brain: Vision',
  objective: 'I can compare a big pre-trained model with my own small one and explain when each is the better tool.',
  ai: ['general vs. specialised AI', 'pre-trained vs. custom', 'testing fairly'],
  coding: ['broadcast to two sprites', 'events', 'variables as scores'],
  projects: PROJECT('🧠 Open Big vs. Little'),
  materials: ['Laptop with a webcam', 'A cup and a book (things Big Brain knows), plus things only you can teach: your own pencil case, a CODE AI card'],
  say: '“Big Brain was trained by experts on hundreds of thousands of photos of 80 everyday things. Little Brain is yours: trained in five minutes on just your things. Who wins?”',
  steps: [
    'Open the project. Train Little Brain on <i>cup</i>, <i>book</i> and <i>Nothing</i> (20 photos each), then press Done.',
    'Show a cup and press <b>space</b>: both brains answer at once (one <code>broadcast compare</code>, two sprites). Press <b>B</b> or <b>L</b> for each one that was right.',
    'Test 10 things each: the cup in different places, other cups, your pencil case (rename a class). Fill in the scores.',
    'Discuss: Big Brain knows 80 things but not YOUR pencil case. Little Brain knows your things but only those. Which would a school canteen use to spot its own trays?',
  ],
  failTests: ['A cup Little Brain has never seen.', 'The same cup in a different room.', 'Something neither knows.'],
  misconceptions: [['The big model is always better.', 'Big models are broad; small custom models can be better at one narrow job they were trained for.']],
  challenges: ['Add a third brain: Lens "what is this?" (1,000 things).', 'Score automatically when both agree.'],
  app: ['Train and save in Studio, then export at blockml.codeai.ltd.'],
  offline: ['Both brains run on the laptop, no internet needed after the first visit.'],
});

// ---- AI 18: Big Brain vs. Little Brain — Words (session 35) ---------------------------------------
{
  const p = new Project();
  use(p, TEXT, CHAT);
  p.extensionStorage.blockmlText = { version: 1, features: '', classes: ['Happy', 'Sad', 'Neutral'].map((name) => ({ name, examples: [] })) };
  p.addStage([p.costume('sky', SKY, [240, 180])]);
  p.addSprite('Big Brain', [p.costume('bot', bot('#0b3d6d'), [55, 60])], [
    [flag, set('big right', 0), ...waitForChat('Big Brain'), say('I am a chatbot.')],
    [
      whenReceive('compare'),
      think('…'),
      chat.forget,
      chat.ask(joinAll('Is this sentence happy, sad or neutral? Answer with one word: "', v('sentence'), '"')),
      say(joinAll('Big Brain: ', chat.answer())),
    ],
  ], { x: -130, y: -80 });
  p.addSprite('Little Brain', [p.costume('bot', bot('#16a34a'), [55, 60])], [
    [flag, set('little right', 0), ifThen(not(textAI.trained()), say('Train me first: Happy, Sad, Neutral sentences.'), textAI.openTrainer, waitUntil(textAI.trained())), say('I am your mood reader.')],
    [whenReceive('compare'), say(joinAll('Little Brain: ', textAI.label(v('sentence'))))],
  ], { x: 130, y: -80 });
  p.addSprite('Referee', [p.costume('dot', '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"></svg>', [1, 1])], [
    [flag, wait(1), forever(ask('Type a sentence for both brains (B or L scores the one that was right):'), set('sentence', answer()), broadcast('compare'), wait(4))],
    [whenKey('b'), change('big right', 1)],
    [whenKey('l'), change('little right', 1)],
  ], { visible: false });
  p.showVariable('big right', { x: 5, y: 5 });
  p.showVariable('little right', { x: 380, y: 5 });
  write('ai18-big-little-words', 'project.sb3', p);
}
card({
  number: 18, session: 35, slug: 'ai18-big-little-words', kicker: 'AI 18 · Session 35 · Level 3: Compare & Reason', title: 'Big Brain vs. Little Brain: Words',
  objective: 'I can compare a general chatbot with my own small sentiment classifier and decide which is better for one job.',
  ai: ['general vs. specialised', 'speed vs. breadth', 'sarcasm fools both'],
  coding: ['broadcast to two sprites', 'ask & answer', 'variables as scores'],
  projects: PROJECT('🧠 Open Big vs. Little'),
  materials: ['Laptop with Chrome or Edge (chat AI downloaded before class)', 'The Mood Reader examples from AI 12 (paste them into the trainer)'],
  say: '“Big Brain is a chatbot that can talk about anything. Little Brain is your Mood Reader that only knows happy, sad and neutral — but answers instantly. Who reads moods better?”',
  steps: [
    'Open the project and train Little Brain (paste your AI 12 sentences), then press Done.',
    'Type a sentence: both brains answer. Score with <b>B</b> and <b>L</b>.',
    'Try “Oh great, another Monday.” In our tests the chatbot said <i>Happy</i> once and <i>Neutral</i> another time, and a Little Brain trained on simple sentences said <i>Happy</i>: sarcasm fools both. What did yours say?',
    'Time them: who answers faster? Which would a company use to sort 10,000 reviews a day?',
  ],
  failTests: ['Sarcasm.', '"I am not sad."', 'A sentence about your class only you understand.'],
  misconceptions: [['The chatbot is smarter, so it is always better.', 'For one narrow job, a small trained model can be faster, cheaper and just as accurate.']],
  challenges: ['Add a third answer: the Text AI kindness check.', 'Ask the chatbot to explain WHY it chose a mood.'],
  app: ['Train and save in Studio, then export at blockml.codeai.ltd (internet once for the chat AI).'],
  offline: ['Works offline after the chat AI is downloaded.'],
});

// ---- AI 19 and 20: discussion sessions --------------------------------------------------------------
card({
  number: 19, session: 36, slug: 'ai19-vocabulary-checkpoint', kicker: 'AI 19 · Session 36 · Checkpoint', title: 'Vocabulary Deep-Dive Checkpoint',
  objective: 'I can explain the five core AI words — Example, Label, Train, Predict, Confidence — using projects I built.',
  ai: ['Example', 'Label', 'Train', 'Predict', 'Confidence'],
  projects: [],
  materials: ['Students\' own saved projects from Games 2, 5 and AI 9–12', 'AI Vocabulary Cards'],
  steps: [
    'In pairs, each student opens one project they built and explains it using all five words.',
    '“Where are the examples? Who gave the labels? When did it train? What does it predict? How sure was it?”',
    'Quick game: the teacher reads a sentence (“the AI was 72% sure it saw a cat”); students hold up the matching word card.',
    'Each student writes one sentence for each word about their own project.',
  ],
  offline: ['No computer needed: use printed screenshots of the projects.'],
});
card({
  number: 20, session: 37, slug: 'ai20-responsible-ai', kicker: 'AI 20 · Session 37 · Checkpoint', title: 'Responsible AI Reflection & Ethics Showcase',
  objective: 'I know when to double-check AI output, and I can explain one way an AI can be unfair or wrong.',
  ai: ['reliability', 'bias and fairness', 'privacy', 'double-checking'],
  projects: [],
  materials: ['Game 7 (the owl that was confidently wrong)', 'Game 8 (the kindness check and its fairness step)', 'AI 16 (personalities)'],
  steps: [
    '<b>Wrong answers</b> (Game 7, AI 13): when was an AI confidently wrong? What should you do? (Check, ask again differently, ask a person.)',
    '<b>Fairness</b> (Game 8): the kindness check had to be taught that “My friend is blind” is not unkind. Who chooses what an AI learns from?',
    '<b>Privacy</b>: our AIs ran on the laptop and nothing left the room. What do big apps do with your photos and voice?',
    '<b>Personality</b> (AI 16): does a friendly tone make an answer more true?',
    'Showcase: each group presents one “AI mistake” they found and how they would fix or guard against it.',
  ],
  offline: ['A discussion session; printed examples of the AI mistakes work well.'],
});

fs.writeFileSync(path.join(OUT, 'index.html'), aiIndexPage(cards));
console.log('ai sessions: index.html');
