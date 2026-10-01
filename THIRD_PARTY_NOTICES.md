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
- **jsQR** 1.4.0 — Apache-2.0, https://github.com/cozmo/jsQR. Bundled in
  `extensions/dist/vision-runtime.js` (Codes & Cards).
- **js-aruco2** 2.0.0 — MIT (Juan Mellado, Damiano Falcioni; includes Stack
  Blur by Mario Klingemann, MIT), https://github.com/damianofalcioni/js-aruco2.
  Only `cv.js`, `aruco.js` and the AprilTag 36h11 code list are bundled in
  `vision-runtime.js`; the code list is BSD-2-Clause, Copyright (C) 2013-2016
  The Regents of The University of Michigan (APRIL Robotics Lab).
- **Tesseract.js** 7.0.0 and **tesseract.js-core** 7.0.0 — Apache-2.0,
  https://github.com/naptha/tesseract.js. Served as `extensions/ocr/` (Lens).
- **WebLLM** (`@mlc-ai/web-llm`) 0.2.85 — Apache-2.0, https://github.com/mlc-ai/web-llm.
  Bundled as `extensions/chat-engine.js` (Chat AI). At run time it downloads the
  Qwen2.5 Instruct models (Apache-2.0, Alibaba Cloud) from huggingface.co/mlc-ai
  and their compiled code from github.com/mlc-ai/binary-mlc-llm-libs; neither is
  distributed by us.
- **GeoNames** city data (cities15000, admin1 codes) — CC BY 4.0, https://www.geonames.org/.
  Served as `extensions/models/weather-cities/cities.json` (Weather).
- **MET Norway** Locationforecast weather data — CC BY 4.0, https://api.met.no/. Fetched
  by `api/weather.js` and credited on the Weather blocks.
- **qrcode-generator** — MIT (Kazuhiko Arase). Used only when building, to draw
  the printable QR codes.
- **AI model weights** (`extensions/models/`) — Apache-2.0, except the text
  model (Model2Vec potion-base-8M, MIT); see `extensions/models/NOTICE.txt`.
- **Civil Comments** dataset (Jigsaw / Google) — CC0. Used only to train the
  Text AI kindness check (`extensions/scripts/train-kindness.mjs`); not
  distributed.
- The default sprite is TurboWarp's "dango", based on Twemoji — CC BY 4.0.

Scratch is a project of the Scratch Foundation, which does not endorse BlockML Studio.
