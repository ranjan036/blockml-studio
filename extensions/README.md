# BlockML Studio AI extensions

MIT-licensed extensions for BlockML Studio. All AI runs in the student's
browser with TensorFlow.js; camera images never leave the computer, and the
models are served by the studio site itself.

| Extension | Blocks |
|---|---|
| **Face** (`src/face.js`, id `blockmlFace`) | when a face appears · number of faces · [x/y/size/smile/mouth open/head tilt/left eye open/right eye open] of face (n) · face (n) is [smiling/mouth open/eyes closed/tilted left/tilted right]? · [x/y] of [nose tip/eyes/mouth/ears/forehead/chin] of face (n) · face AI is ready? |
| **Hand & Pose** (`src/hands.js`, id `blockmlHands`) | when a hand shows [gesture] · number of hands · [x/y] of [wrist/fingertips] of hand (n) · fingers up on hand (n) · hand (n) shows [open/fist/thumbs up/thumbs down/pointing/victory]? · gesture of hand (n) · which hand is hand (n) · [x/y] of [17 body points] of body · body is visible? · hand AI is ready? |
| Both | turn camera [on/off/on flipped] · set camera transparency to (n) % · show [points/boxes/nothing] on stage · set AI speed to [normal/fast/battery saver] |

Design rule: the AI blocks are the **senses** (numbers, names, yes/no); the
**decisions** are Scratch's own if/else, comparisons, loops and variables.
Faces and hands are numbered from the left of the stage. Left/right always
mean the person's own left/right (the camera is mirrored by default).

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
  (Apache-2.0; see `models/NOTICE.txt`).
- `starters/` — builds the starter projects (`/starters/*.sb3` on the site).

## Build and test

```
npm ci
npm test          # geometry unit tests
npm run build     # -> dist/, copied into ../gui/static/extensions and ../gui/static/starters
```

`STARTER_BASE=http://localhost:3111/extensions/ node starters/build-starters.mjs`
builds starters that load the extensions from a local server.
