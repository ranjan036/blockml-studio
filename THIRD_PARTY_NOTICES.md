# Third-party notices

- **TurboWarp scratch-gui** (in `gui/`) — GPL-3.0. BlockML Studio's editor is a
  modified copy; see `gui/BLOCKML.md` for the changes and `gui/LICENSE`.
  Includes Scratch (BSD-3-Clause, see `gui/README.md`) and TurboWarp's
  dependencies with their own licenses.
- **TensorFlow.js** (`@tensorflow/tfjs-core`, `-converter`, `-backend-webgl`,
  `-backend-webgpu`) and **TensorFlow.js models** (`@tensorflow-models/face-landmarks-detection`,
  `hand-pose-detection`, `pose-detection`) — Apache-2.0. Bundled in
  `extensions/dist/vision-runtime.js`.
- **vosk-browser** 0.0.8 (Vosk / Kaldi speech recognition compiled to
  WebAssembly) — Apache-2.0, https://github.com/ccoreilly/vosk-browser. Served as
  `extensions/vosk.js` with one change: a failed IndexedDB cache sync no longer
  stops the model from loading (see `extensions/scripts/patch-vosk.mjs`).
- **AI model weights** (`extensions/models/`) — Apache-2.0, except the text
  model (Model2Vec potion-base-8M, MIT); see `extensions/models/NOTICE.txt`.
- **Civil Comments** dataset (Jigsaw / Google) — CC0. Used only to train the
  Text AI kindness check (`extensions/scripts/train-kindness.mjs`); not
  distributed.
- The default sprite is TurboWarp's "dango", based on Twemoji — CC BY 4.0.

Scratch is a project of the Scratch Foundation, which does not endorse BlockML Studio.
