# BlockML Studio AI extensions

MIT-licensed extensions for BlockML Studio. All AI runs in the student's
browser (TensorFlow.js for vision, Vosk for speech, plain JavaScript for
text); camera images, sound and typed text never leave the computer, and the
models are served by the studio site itself.

| Extension | Blocks |
|---|---|
| **Face** (`src/face.js`, id `blockmlFace`) | when a face appears · number of faces · [x/y/size/smile/mouth open/head tilt/left eye open/right eye open] of face (n) · face (n) is [smiling/mouth open/eyes closed/tilted left/tilted right]? · [x/y] of [nose tip/eyes/mouth/ears/forehead/chin] of face (n) · face AI is ready? |
| **Hand & Pose** (`src/hands.js`, id `blockmlHands`) | when a hand shows [gesture] · number of hands · [x/y] of [wrist/fingertips] of hand (n) · fingers up on hand (n) · hand (n) shows [open/fist/thumbs up/thumbs down/pointing/victory]? · gesture of hand (n) · which hand is hand (n) · [x/y] of [17 body points] of body · body is visible? · hand AI is ready? |
| **Image Model** (`src/image.js`, id `blockmlImage`) | open the trainer · when camera sees [class] with confidence > (80) · classify camera image · image label · confidence of [class] · label is [class]? · number of photos of [class] · image model is trained? |
| **Object Detection** (`src/objects.js`, id `blockmlObjects`) | when camera sees a [object] · detect objects · number of objects · [name/x/y/size/confidence] of object (n) · number of [object] seen · [object] detected? · set minimum confidence to (50) % · object AI is ready? — 80 COCO objects |
| **Voice** (`src/voice.js`, id `blockmlVoice`) | when I hear [word] · start / stop listening · listen only for words (up down …) · listen for any words · what I heard · I heard [word]? · confidence of what I heard · forget what I heard · voice AI is ready? · speak [text] (and wait) — offline speech-to-text (Vosk, `vosk.js` + `models/vosk-small-en/`, fetched with `npm run fetch-voice-models`) and the computer's own voices |
| **Text AI** (`src/text.js`, id `blockmlText`) | open the text trainer · label of text [ ] · confidence that [ ] is [class] · text [ ] is [class]? · number of examples of [class] · text model is trained? · add example [ ] to [class] · train the text model · unkind score of [ ] · [ ] seems unkind? · what the AI reads in [ ] · text AI is ready? — a trainable text classifier and a ready-made kindness check (`text-runtime.js` + `models/text-potion/`, 7.8 MB, no camera or microphone) |
| All vision | turn camera [on/off/on flipped] · set camera transparency to (n) % · show [points/boxes/nothing] on stage · set AI speed to [normal/fast/battery saver] |

Design rule: the AI blocks are the **senses** (numbers, names, yes/no); the
**decisions** are Scratch's own if/else, comparisons, loops and variables.
Faces and hands are numbered from the left of the stage. Left/right always
mean the person's own left/right (the camera is mirrored by default).

### Image Model

**open the trainer** opens a window where students name classes, hold a record
button to take webcam photos, press **Train model** (40 epochs, drawn live as
loss and accuracy), and test the model live. The block waits until the window
is closed. MobileNet v2 turns each photo into 1,280 numbers; a softmax
classifier (`src/features/classifier.js`) learns from them in well under a
second. Only those numbers are saved in the project (TurboWarp's
`extensionStorage`, 1 byte per number), never the photos; opening a project
retrains the model from them. Thumbnails exist only while the window is open.

### Text AI

Sentences become numbers in plain JavaScript (`src/features/text.js`): words
are cut into the word pieces of the BERT vocabulary, each piece has a ready-made
vector of 256 numbers (Model2Vec **potion-base-8M**, MIT; stored as one byte
per number), and a sentence is the average of its pieces. No TensorFlow.js and
no GPU, so it is instant and works in any browser or WebView. Our tokenizer
gives exactly the same pieces as the original library (checked on 3,000 real
comments).

**open the text trainer** opens a window where students name classes, type (or
paste) example sentences, press **Train model** (60 epochs of the same softmax
classifier as the Image Model) and test sentences live; "The AI reads: …"
shows the word pieces, which is all the AI sees. The example sentences are
saved in the project (`extensionStorage`; TurboWarp only keeps this when the
project uses a Text AI block) and the model is trained again when the project
opens. `add example [ ] to [class]` and `train the text model` do the same from
code, e.g. from a list. About 8 examples per class work well for moods and
topics. Limits worth teaching: word order is ignored, so "I am not happy" is
"happy"; and nonsense is still cut into pieces and gets some label.

The **kindness check** (`unkind score of [ ]`, 0–100; `seems unkind?` is
score ≥ 50) is a small model on the same vectors plus one learned weight per
word piece (`models/text-potion/kindness.bin`, 116 KB), trained by
`scripts/train-kindness.mjs` on Civil Comments (CC0, ~900,000 public comments
rated by people) plus the hand-written sentences in
`scripts/kindness-phrases.mjs`: how children are unkind (leaving someone out,
put-downs), and that saying who someone is (a religion, a colour, a
disability) is not unkind. Models trained on online comments alone flag words
like "Muslim" or "gay" by themselves; ours is trained and then adjusted so that
none of those words is flagged on its own, and the script reports it on
sentences it never trained on. It still makes mistakes in both directions
(sarcasm and spelling tricks are missed; "I hate Mondays" is a false alarm):
that is the lesson of Game 8, and the reason the block gives a number and the
student's code decides.

## How it works

- `src/face.js`, `src/hands.js` — the extensions (TurboWarp "unsandboxed"
  format). BlockML Studio trusts its own `/extensions/` folder.
- `src/runtime/index.js` → `vision-runtime.js` — shared by both extensions:
  TensorFlow.js (WebGPU, else WebGL), the camera settings, and one background
  loop per model on the latest camera frame. Blocks read cached results and
  never wait. A model runs only while its blocks were used in the last 3 s.
- `src/features/` — the geometry that turns keypoints into block values
  (smile, eyes, fingers up, gestures). Unit-tested in `test/`. **Tuning
  constants** (e.g. what counts as a full smile) are at the top of
  `src/features/face.js`.
- `models/` — the TF.js models, downloaded once by `npm run fetch-models`
  (Apache-2.0; see `models/NOTICE.txt`). `npm run fetch-text-model` repacks the
  text model and `npm run train-kindness` trains the kindness check on it
  (downloads ~235 MB of comments into `.cache/`, about 10 minutes); both
  results are committed.
- `src/text.js`, `src/runtime/text.js` → `text-runtime.js` (bundled by
  esbuild in `scripts/assemble.mjs`), `src/features/text.js` — Text AI.
- `starters/` — builds the starter projects (`/starters/*.sb3` on the site).

## Build and test

```
npm ci
npm test          # unit tests (geometry, classifier, text)
npm run build     # -> dist/, copied into ../gui/static/extensions and ../gui/static/starters
```

`STARTER_BASE=http://localhost:3111/extensions/ node starters/build-starters.mjs`
builds starters that load the extensions from a local server.
