# BlockML Studio — Scratch editor with AI blocks (Vision first) — Plan

*Status: S0, S1 complete; S2 (Face, Hand & Pose, §11), S3 (Image Model, §12) and S4 (Object Detection, §13) built and tested with test cameras, awaiting a real-camera classroom check. Live at https://studio.blockml.codeai.ltd.*

## 1. Goal

A free, open-source, PictoBlox-style editor for CODE AI students: **every
standard Scratch block**, plus **AI block categories** whose models run
entirely on the student's laptop. That means no per-use cost and no camera
images leaving the device. The AI blocks are designed so that using them
**requires real coding**: decisions, comparisons, loops, variables and lists.

Decisions already made:

| Decision | Choice |
|---|---|
| Base | TurboWarp editor (fork), all Scratch blocks kept |
| License | Open source; the editor is **GPL-3.0** (inherited from TurboWarp's GUI) |
| Where | A **separate site**, `studio.blockml.codeai.ltd`, linked from BlockML |
| First AI area | **Vision AI**. Voice AI and the rest get their own plan later |
| Hardware | CODE AI laptops: Intel Core i5, 8 GB RAM, 512 GB SSD, Chrome |
| Cost to students | Free; no accounts; projects saved as `.sb3` files on the laptop |

## 2. What students see

The Scratch editor they know (stage, sprites, costumes, sounds), branded
**BlockML Studio**, with all standard categories: Motion, Looks, Sound,
Events, **Control**, Sensing, **Operators**, **Variables, Lists**, My Blocks.
The standard extensions (Pen, Music, Video Sensing, Text to Speech, Translate)
also stay. Existing Scratch 3 projects open unchanged.

Added under **Extensions** (the "+" button), each with its own colour and
category like any Scratch extension:

| Extension | What it does |
|---|---|
| **Image Model** | Students train their own image classifier from webcam photos |
| **Object Detection** | Finds 80 everyday objects (person, cup, phone, book…) |
| **Face** | Finds faces, where they are, smile, mouth open, head tilt |
| **Hand & Pose** | Hand keypoints, fingers up, simple gestures; body keypoints |

Header extras: **Export to Android app** (reuses the existing exporter, see
milestone S6), links to starter projects, and a link back to BlockML (the
data-science ML tool).

## 3. Design rule for AI blocks: the AI is the senses, the student writes the brain

Most AI blocks are **reporters** (a number or a name) or **booleans**
(yes/no). Nothing happens until the student combines them with Scratch's own
Control, Operators, Variables and Lists blocks. Each extension also has **one
or two beginner hat blocks** (`when camera sees …`), so a first lesson works
in minutes. Later lessons deliberately replace them with `forever` + `if`.

Scratch block shapes below: **hat** (starts a script), **command** (does
something), **reporter** (round, a value), **boolean** (hexagon, yes/no).

### 3.1 Image Model (train your own)

| Block | Shape | Teaches |
|---|---|---|
| `open the trainer` | command | Opens the training window (below) |
| `classify camera image` | command | That a model must be *run*: an explicit step |
| `(image label)` | reporter | The result as a value, stored in variables |
| `(confidence of [class ▼])` | reporter, 0–100 | **Thresholds**: `if confidence > 80` |
| `<label is [class ▼]?>` | boolean | **if / else** |
| `when camera sees [class ▼] with confidence > (80)` | hat (beginner) | Events |
| `(number of photos of [class ▼])` | reporter | Training data size |

**Trainer window.** The student adds classes ("Apple", "Banana", "Nothing"),
then holds a button to capture webcam photos for each. **Train** shows
*epochs*, *loss* and *accuracy* live, so students see the model learning. They
can then test live before closing the window. This connects directly to
BlockML's ML lessons: training data, epochs, overfitting, the "nothing" class.

How it works: a frozen MobileNet turns each photo into a feature vector (an
*embedding*), and we train a small softmax classifier on those vectors in
plain JavaScript (a few hundred parameters per class, trains in seconds).
**The trained model and the embeddings, not the photos, are saved inside the
`.sb3`**, so a project carries its model and can be retrained after adding
photos. Photos are kept only while the trainer is open.

### 3.2 Object Detection

| Block | Shape | Teaches |
|---|---|---|
| `detect objects` | command | Running a model |
| `(number of objects)` | reporter | **Loops**: `repeat (number of objects)` |
| `(name of object (i))`, `(x of object (i))`, `(y of object (i))`, `(size of object (i))` | reporters | Indexing with a counter variable |
| `(confidence of object (i))` | reporter | Thresholds, filtering |
| `(number of [person ▼] seen)` | reporter | Counting |
| `<[cup ▼] detected?>` | boolean | Decisions |
| `when camera sees a [person ▼]` | hat (beginner) | Events |

Object positions are in stage coordinates (−240…240, −180…180), so sprites can
`go to x: (x of object 1) y: (y of object 1)`.

### 3.3 Face

| Block | Shape | Teaches |
|---|---|---|
| `(number of faces)` | reporter | Loops over faces |
| `(x / y / size of face (i))` | reporters | Coordinates |
| `(smile amount of face (i))`, `(mouth open amount …)`, `(head tilt …)` | reporters, 0–100 or degrees | Comparisons, thresholds, **variables** ("smile timer") |
| `<face (i) is smiling?>` | boolean | Decisions |
| `(x / y of [nose tip ▼] of face (i))` | reporter | Face filters: sprite glasses on the eyes |
| `when a face appears` | hat (beginner) | Events |

Smile/mouth values are computed from face keypoints with simple geometry
(documented, so advanced students can see how the "AI feature" is made from
numbers).

### 3.4 Hand & Pose

| Block | Shape | Teaches |
|---|---|---|
| `(number of hands)` | reporter | Loops |
| `(x / y of [index fingertip ▼] of hand (i))` | reporter | Coordinates, Pen drawing |
| `(fingers up on hand (i))` | reporter, 0–5 | Numbers → decisions (rock/paper/scissors) |
| `<hand (i) is [open ▼ / fist / thumbs up / pointing / victory]?>` | boolean | if / else-if chains |
| `(x / y of [left wrist ▼] of body)` | reporter | Movement games |
| `when hand shows [thumbs up ▼]` | hat (beginner) | Events |

### 3.5 Shared blocks (in each vision extension)

- `turn camera [on ▼ / off / on flipped]`, `set camera transparency to (50)`:
  the same camera and stage video layer as Scratch's Video Sensing.
- `show [boxes ▼ / keypoints / nothing] on stage`: optional overlay, for
  seeing what the model sees.
- `set detection speed to [normal ▼ / fast / battery saver]`.

### 3.6 Starter projects and lesson cards (teacher pack)

Each comes as a ready `.sb3` plus a one-page lesson card (goal, blocks,
concept, challenge). Several have a **"fix the bug"** version with a wrong
threshold or a loop that miscounts.

| # | Project | AI | Coding concepts |
|---|---|---|---|
| 1 | Smile meter | Face | if/else, comparisons |
| 2 | Face filter (glasses follow your eyes) | Face | coordinates, forever loop |
| 3 | Fruit sorter | Image Model | training data, if/else-if chains, confidence thresholds |
| 4 | Rock–paper–scissors vs computer | Hand | random numbers, variables, a My Block for the winner |
| 5 | Air drawing | Hand | Pen, coordinates, state (pen up/down by gesture) |
| 6 | Object counter | Object Detection | repeat loop with counter, lists |
| 7 | Classroom helper ("Is anyone at the desk?") | Object Detection | events vs polling, timers |
| 8 | Exercise counter (squats) | Pose | state machine with variables |

## 4. Architecture

```
 studio.blockml.codeai.ltd  (static site on Vercel, GPL-3.0 repo)
 ┌──────────────────────────────────────────────────────────────┐
 │ BlockML Studio = fork of TurboWarp scratch-gui (rebranded)    │
 │   + TurboWarp scratch-vm (unmodified npm dependency)          │
 │   + our AI extensions (separate package, MIT)                 │
 │        ├─ vision runtime: shared camera frame, one inference  │
 │        │   loop per enabled model, results cached per frame   │
 │        ├─ TensorFlow.js models (lazy-loaded, cached)          │
 │        └─ trainer window (Image Model)                        │
 │   + Export to Android app (from BlockML's src/export/apk, MIT)│
 └──────────────────────────────────────────────────────────────┘
      model files: served from the studio site itself (no third-party hosts)
```

- **Fork only the GUI.** TurboWarp's `scratch-gui` (GPL-3.0) is forked for
  branding, the extension library entries, the trainer window and the
  Android export button. `scratch-vm` (MPL-2.0) stays an unmodified
  dependency. Our extensions are loaded as trusted extensions through the
  GUI's security manager, which our fork controls.
- **Extensions are a separate MIT package** so they could also be used in
  plain TurboWarp. Projects store the extension's URL, as TurboWarp does for
  custom extensions.
- **Blocks never wait for AI.** A background loop runs each *enabled* model
  on the latest camera frame (e.g. 15–30 times a second, only while a script
  uses it) and caches the results; reporters read the cache instantly. This
  keeps Scratch at 30 fps and makes values consistent within a frame.
- **Lazy loading.** A model is downloaded only when its extension is added
  and first used, then cached by the browser (HTTP cache + service worker),
  so the second class period starts instantly and works offline.
- **Keep up with TurboWarp**: rebase the fork on TurboWarp's `develop`
  branch periodically (a documented, scripted process).
- **Branding.** Remove TurboWarp's name and logo from the UI; credit TurboWarp
  and the Scratch Foundation (not endorsed) in About. The GPL source link is
  in the About page and footer.

### 4.1 Models

| Extension | Model (all TensorFlow.js, Apache-2.0) | Approx. download |
|---|---|---|
| Image Model | MobileNet (feature vectors) + our softmax head | ~5–15 MB (variant chosen in S0) |
| Object Detection | COCO-SSD (80 classes) | ~5–25 MB (lite vs. full, chosen in S0) |
| Face | Face Landmarks Detection (face mesh, TF.js runtime) | ~3–10 MB |
| Hand & Pose | Hand Pose Detection (TF.js runtime); MoveNet for pose | ~5–15 MB |

**Why not MediaPipe Tasks?** It's excellent and Apache-2.0, but its privacy
notice says the Tasks APIs "send metrics about the performance and
utilization of the APIs … to Google" (not the images), with no documented
opt-out, and the app must get users' informed consent. For a children's
platform that promises nothing leaves the laptop, we use TensorFlow.js
runtimes. **S0 verifies this by recording all network traffic** while every
model runs. The exact sizes and variants above are chosen in S0 by
measurement.

### 4.2 Privacy (children)

- Camera frames are processed in the page and never sent anywhere; no
  analytics or tracking on the studio site.
- Trained models are saved as numbers (embeddings and weights), not photos.
- Projects live only as files on the laptop (no accounts, no cloud storage).
- The studio's privacy note says this in plain words for parents and teachers.

## 5. Milestones

| # | Milestone | Exit criterion |
|---|---|---|
| S0 | **Benchmark + decisions** | A test page opened once on a CODE AI laptop measures load time, frames/second and memory for each candidate model (alone, and two together while a Scratch project runs), and records all network requests. Chooses model variants. DNS for the subdomain arranged. |
| S1 | **Studio editor live** | TurboWarp GUI fork rebranded as BlockML Studio, deployed at the studio subdomain from a public GPL-3.0 repo; opens/saves existing `.sb3` projects; all standard blocks and extensions work; linked from BlockML. |
| S2 | **Vision runtime + Face + Hand & Pose** | Shared camera, per-frame result cache, the blocks in §3.3–3.4 and §3.5, overlay; starter projects 1, 2, 4, 5 work on a CODE AI laptop at target speed. |
| S3 | **Image Model + trainer** | Trainer window (classes, capture, train with live epochs/loss/accuracy, live test); blocks in §3.1; model saved inside the `.sb3` and restored on open; starter project 3. |
| S4 | **Object Detection** | Blocks in §3.2; starter projects 6, 7. |
| S5 | **Teacher pack** | All 8 starter projects + lesson cards + "fix the bug" versions; teacher guide for the studio; privacy note. |
| S6 | **Android export for AI projects** | "Export to Android app" in the studio; the app shell gains camera permission (asked when a game first uses the camera) and bundles the AI extension code + models the project uses; tested on a phone. (The current exporter rejects custom extensions; this milestone adds an allow-list for our own.) |

Targets for S2–S4, to confirm in S0: each vision model at **≥ 15 inferences
per second** on the CODE AI laptop while a Scratch project runs at 30 fps,
and total page memory comfortably inside 8 GB with two vision extensions in
use.

After S6: a separate plan for **Voice AI** (train your own sounds, offline
speech-to-text in English and Hindi, text-to-speech), then face recognition,
text AI, and BlockML's data-science ML as blocks.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Laptop graphics drivers make TF.js's WebGL backend slow | S0 measures WebGL vs WASM backends; pick per model; "battery saver" speed setting |
| TurboWarp GUI fork drifts from upstream | Keep changes small and isolated; scripted rebase; pin versions |
| Model accuracy disappoints (lighting, Indian classroom settings) | Choose variants in S0 with real classroom tests; lessons teach *why* AI fails (a good lesson in itself) |
| Big downloads on school Wi-Fi | Lazy loading + service-worker cache; a teacher "pre-load all models" button |
| Webcam permission confusion | Clear first-use prompt and help text; camera shared across extensions |
| Students' faces in projects | Only numbers are stored; no photos in `.sb3`; guidance in lesson cards |

## 7. Decisions (2026-09-25)

1. Subdomain `studio.blockml.codeai.ltd`: approved. Still needed before S1
   goes live: a CNAME record to Vercel from whoever manages codeai.ltd's DNS.
2. Code lives in a new public GitHub repo, `blockml-studio`.
3. Lesson cards: English only.
4. S0 benchmark: a CODE AI laptop opens the benchmark link and sends back
   the results file.

## 8. S0 results — first laptop run (2026-09-25)

**Laptop:** CODE AI laptop, Chrome 153, 8 CPU threads, Intel Iris Xe
graphics; WebGL, WASM and **WebGPU** all available. Full test (30 runs per
model), results file received 2026-09-25.

| Model | Best engine | Speed | Download |
|---|---|---|---|
| MobileNet v2 1.0 (Image Model features) | WebGPU | 60/s | 13 MB |
| MobileNet v2 0.5 | WebGPU | 64/s | 8 MB |
| COCO-SSD lite (Object Detection) | WebGL | 27/s (WebGPU 16/s) | 18 MB |
| COCO-SSD full | WebGL | 17/s | 65 MB |
| Hands lite | WebGPU | 30/s (WebGL only 9/s) | 2 MB |
| Hands full | WebGPU | 20/s | 3.5 MB |
| MoveNet Lightning (pose) | WebGL / WebGPU | 58–60/s | 0.6 MB |
| Face mesh | — | **invalid, see below** | 1.6 MB |

- Face + Hand together next to a simulated 30 fps project: 10.5 AI frames/s
  on WebGPU with the project steady at 30 ticks/s (worst pause 44 ms); WASM
  starves the project (9 ticks/s), so WASM is fallback only.
- Image Model: 90 webcam photos → features in 3.0 s; 50 epochs of the
  softmax head in **0.21 s**.
- Memory: under 300 MB in every test.
- **Network:** only the benchmark's own site and `storage.googleapis.com`
  (model file downloads) — no telemetry. From S1 the models are self-hosted,
  so the studio will contact only its own site.
- **Bug found:** the face model found no face in any run. Cause: the face
  and hand models read the input size from the `<video>` element's
  `width`/`height` attributes, which are 0 unless set. Reproduced with a
  photo fed as the camera and fixed (the benchmark now sets them). **The
  studio must set them too** on the camera video it passes to models. Face
  timings (and possibly hand timings on WASM/WebGPU) must be re-measured.

**Provisional choices** (confirmed after the re-run): WebGPU as the default
engine with WebGL fallback; MobileNet v2 1.0; COCO-SSD lite; Hands lite;
MoveNet Lightning. When two vision extensions run at once, each gets about
10 updates/second (acceptable for games); a single extension runs at 20–60/s.

## 9. S0 results — re-run with the fix, and decisions (2026-09-25)

Same CODE AI laptop (Iris Xe), full test, every model now finds its target
in every run (face 30/30, hands 30/30 on all engines).

| Model | WebGL | WASM | **WebGPU** | Choice |
|---|---|---|---|---|
| MobileNet v2 1.0 (Image Model) | 47/s | 18/s | **57/s** | ✅ |
| MobileNet v2 0.5 | 40/s | 36/s | 63/s | — (1.0 is fast enough and more accurate) |
| COCO-SSD lite (Object Detection) | 28/s | 7/s | **17/s** | ✅ |
| COCO-SSD full | 18/s | 3/s | 12/s | — (too slow, 65 MB) |
| Face mesh | 25/s | 25/s | **22/s** | ✅ |
| Hands lite | 12/s | 12/s | **31/s** | ✅ |
| Hands full | 9/s | 6/s | 14/s | — |
| MoveNet Lightning (pose) | 42/s | 15/s | **44/s** | ✅ |

- Face + Hand together, both finding their target, next to a 30 fps project:
  **8.6 AI frames/s on WebGPU**, project steady (30.3 ticks/s, worst pause
  56 ms). WebGL 6.4/s. WASM starves the project (4 ticks/s, 0.9 s pauses).
- Image Model training: 90 photos → features in 3.0 s, 50 epochs in 0.38 s.
- Network: unchanged — only the page's own site and model downloads.
- Run-to-run variation is noticeable (WASM was ~2× slower than in the first
  run; WebGPU stayed consistent), another reason to prefer WebGPU.

**Decisions**

1. **Engine: WebGPU**, falling back to WebGL, then WASM (with an on-screen
   "this computer is slow for AI" note). One engine for all models: WebGPU
   wins decisively for Hands (31/s vs 12/s) and Image Model, and is
   acceptable for Object Detection (17/s).
2. **Models:** MobileNet v2 1.0, COCO-SSD lite, Face mesh (no iris
   refinement), Hands lite, MoveNet SinglePose Lightning. Total download if a
   student uses all of them: about 36 MB, cached after the first time.
3. **Speed targets revised:** one vision extension ≥ 15 updates/s (met by all
   five on WebGPU); **two at once ≈ 8–9 updates/s each** today. In S2 we try
   running the two models concurrently instead of one after the other, and a
   smaller camera input, to raise that; lesson projects use one vision
   extension at a time.
4. **Camera video:** set the `<video>` element's `width`/`height` attributes
   to the stream's size before passing it to any model (§8 bug).

**S0 status:** complete, except DNS for `studio.blockml.codeai.ltd`, which is
needed only when S1 goes live.

## 10. S1 progress (2026-09-25)

TurboWarp `scratch-gui` imported into `gui/` with `git subtree` (TurboWarp
commit `25c11c6`), rebranded, and stripped of TurboWarp's online services.
Every change is listed in `gui/BLOCKML.md` and marked `blockml:` in the code.

Checked in headless Chrome against the production build:
- Loads the default project; opens a real `.sb3` via `?project_url=`; runs it.
- Extension library: all standard Scratch extensions + TurboWarp's Custom
  Reporters and its own blocks; no gallery, no Face Sensing, no Custom Extension.
- Network: loading the editor contacts only our own site; the sprite library
  loads pictures from `cdn.assets.scratch.mit.edu` (as every Scratch-based
  editor does). Privacy page updated to say exactly this.
- Bug found and fixed while testing: disabling project-by-ID loading also
  blocked the built-in default project (ID `0`); ID `0` is now loaded
  directly from memory.

**To go live:** import the repo into Vercel with Root Directory `gui`
(`gui/vercel.json` has the build settings), add the domain
`studio.blockml.codeai.ltd`, and add the DNS record Vercel shows.

**Deployed (2026-09-25):** Vercel project `blockml-studio` (team
`ranjan036s-projects`), auto-deploys `main`. Live at
https://blockml-studio.vercel.app — `/` redirects to `/editor.html`.
Checked live: default project loads, all block categories, service worker
registers, and the editor contacts only its own site.

Deployment notes:
- The project was imported with the repo root as Root Directory, so a root
  `vercel.json` builds `gui/` (`gui/vercel.json` is the same config for a
  project whose Root Directory is `gui`).
- `/` must be a **redirect**, not a rewrite: Vercel serves existing files
  before rewrites, and `build/index.html` (TurboWarp's player homepage) exists.
- A second, duplicate Vercel project (`blockml-studio-q46o`) was also created
  on import; its builds fail. To be deleted in the Vercel dashboard.

**Live on the real domain (2026-09-26):** `studio.blockml.codeai.ltd` added
to the Vercel project; GoDaddy CNAME `studio.blockml` →
`4bac9b909927b934.vercel-dns-017.com`; certificate issued by Vercel within
minutes. The duplicate project `blockml-studio-q46o` was deleted.

Still open from the S1 exit criterion: a link to the studio from BlockML
(blockml.codeai.ltd) — a small change in the BlockML repo.

## 11. S2 — Face and Hand & Pose (2026-09-26)

**Built** (`extensions/`, MIT; see `extensions/README.md`):
- Shared vision runtime (`vision-runtime.js`, 2.5 MB / 435 KB gzip):
  TF.js core + converter + WebGL + WebGPU (WASM dropped: S0 showed it starves
  the project, and every target browser has WebGL). One background loop per
  model on Scratch's own camera frame (480×360, same mirroring as the stage),
  so AI coordinates are stage coordinates. A model runs only while its blocks
  were used in the last 3 s; blocks read cached results and never wait.
  Camera turns on automatically the first time an AI block needs it.
- Models self-hosted at `/extensions/models/` (Apache-2.0, 9.8 MB total,
  loaded only when used): face detector + face mesh, hand detector + landmarks
  (lite), MoveNet Lightning.
- **Face** and **Hand & Pose** extensions; blocks as in §3.3–3.5 with these
  changes: face properties and points are dropdowns on one reporter each
  (`[smile ▼] of face (1)`, `[x ▼] of [nose tip ▼] of face (1)`); added
  `gesture of hand (n)`, `which hand is hand (n)`, `thumbs down`, and
  `face/hand AI is ready?`. Body pose lives in Hand & Pose.
- Library: both at the top with an **AI** filter; the studio trusts only its
  own `/extensions/` (TurboWarp's extension site now asks first).
- Starter projects (generated by `extensions/starters/`, served at
  `/starters/`): smile-meter, face-filter, rock-paper-scissors, air-drawing.

**Left/right:** always the person's own. MediaPipe hand labels already assume
a mirrored image; face-mesh and MoveNet labels follow a normal photo, so the
runtime swaps them when the camera is mirrored (unit-tested).

**Tested** in headless Chrome with a public-domain portrait as the camera:
extensions load from the library without a prompt; models ready in ~3 s from
our own site (no other hosts); face found with smile 63 → "smiling", level
head, eyes open; body pose shoulders on the correct sides. Starters:
smile-meter says "Great smile! 63%"; face-filter puts the sunglasses on the
eyes at the right size/angle; rock-paper-scissors and air-drawing run.
Bug found and fixed: with no hand in view, "fingers up" is 0, so
rock-paper-scissors read "rock" — the project now checks the number of hands
first (a useful lesson in itself). 9 geometry unit tests.

**Not yet verified:** hands (no test image with a hand; logic unit-tested,
model loads and runs), speed on the CODE AI laptop with a real webcam, and the
smile/eye/gesture thresholds with real students — the constants are at the top
of `extensions/src/features/face.js` and `hand.js`.

## 12. S3 — Image Model (2026-09-26)

**Built** (`extensions/src/image.js`, `src/features/classifier.js`):
- Blocks as planned in §3.1, plus `image model is trained?` and the camera
  blocks. The class menu lists the student's own class names (and accepts
  variables).
- **Trainer window**: live camera; one row per class (name, photo count, last
  8 thumbnails, *Hold to record* — about 8 photos/second — or Enter/Space for
  one photo, Clear, Delete); *+ Add a class*; *Train model* runs 40 epochs, one
  per frame, with a live loss/accuracy chart; then live confidence bars.
  `open the trainer` waits until the window is closed.
- **Model**: MobileNet v2 (1.0, 224; self-hosted, Apache-2.0, 13.3 MB, loaded
  only when the Image Model is used) → 1,280 features → softmax classifier in
  plain JS. Saved in the project via TurboWarp's `extensionStorage`: class
  names + features at 1 byte each (~1.7 KB of text per photo), **never
  photos**. Opening a project retrains from the saved features.
- Starter **fruit-sorter.sb3**: comes with empty Apple/Banana/Nothing classes;
  if untrained it asks for photos and opens the trainer, then sorts with an
  if/else-if chain on `confidence of … > 80`.

**Tested** in headless Chrome with a fake camera alternating a portrait and a
blue/yellow scene every 1.5 s: the starter's classes appear in the trainer;
70 photos recorded (36/34); trained to 100% on them; live test bars match the
camera 12/12; classify matches the camera 29/29 at 100% confidence; after
save + reopen the model comes back and classifies again; only our own site is
contacted. 12 unit tests (classifier learns, loss falls, saved features still
train a working model).

**Bugs found and fixed:** the trainer's text boxes inherited the editor's dark
theme (now always light); the thumbnail was captured a moment after the photo
the model learned from, so it could show the wrong scene — one snapshot is now
both learned and shown.

**Not yet verified:** real objects on a real webcam (how many photos students
need, lighting), and *Hold to record* with a real mouse (the keyboard path was
tested).

## 13. S4 — Object Detection (2026-09-26)

**Built** (`extensions/src/objects.js`): COCO-SSD lite (self-hosted,
Apache-2.0, 17.2 MB, loaded only when used), 80 object kinds ("person" first,
the rest A–Z in menus; menus accept reporters). Blocks as in §3.2, with the
object's properties as one dropdown reporter (`[name ▼] of object (1)`,
including confidence), plus **`set minimum confidence to (50) %`** — objects
count, and are drawn, only at or above it (the runtime keeps guesses down to
20%), so students can see the threshold trade-off themselves. `detect objects`
runs the model once; the `when camera sees a [object]` hat detects in the
background. Overlay: labelled boxes.

Starters: **object-counter.sb3** (a `repeat (number of objects)` loop with a
counter fills a list shown on the stage) and **classroom-helper.sb3** (an
event script — *when camera sees a person* → hello — next to a polling loop
that uses the timer to count how long the desk has been empty).

**Tested** with a NASA public-domain photo of an astronaut holding a laptop
as the camera: person found at 77%; object-counter lists "person – 77%" and
says "Objects I can see: 1. People: 1"; with the minimum lowered to 15% it
also lists a (wrong) "cell phone – 20%" — a ready-made lesson on thresholds.
The laptops were not recognised at any confidence (rugged laptops held like
tablets are an unusual view for this small model); classroom desks with
ordinary laptops, cups and books are what it was trained on.

**Not yet verified:** real classroom objects on a real webcam; the
classroom-helper's "desk empty" path (needs a camera where the person leaves).

## 14. S6 — AI games as Android apps (2026-09-27)

BlockML's "Make an app" exporter takes AI projects: it adds the vision runtime,
the extension files and only the models the project uses, and uses a template
app that may ask for the camera. File → "Make an Android app…" hands the
current project to blockml.codeai.ltd.

Scratch's own **Face Sensing** is now ours too (`extensions/src/face-sensing.js`,
same ID, blocks and menu values), so Scratch/TurboWarp projects that use it open
in the studio and run in apps without the internet. Projects pointing at
TurboWarp's Face Sensing URL load ours (`rewriteExtensionURL` in the security
manager). Tested with a student's Scratch face game in the studio and in an app.

**Not yet verified:** an AI app on a real phone (camera prompt, speed).

## 15. Syllabus alignment and roadmap v2 (2026-09-28)

The CODE AI Foundation syllabus (Core Curriculum v3.0, 51 sessions, written
for PictoBlox) was compared with this plan. Full findings were discussed with
the founder; the decisions below replace the "After S6" paragraph in §5.

### 15.1 Rules (decided by the founder)

1. **Free only.** Every block, game and app uses free options, even when
   slower or less accurate. No paid AI services, no per-use cost.
2. **Heavy use is expected.** Students use the tools at home too, for as long
   as they are CODE AI students. Hosting must not charge by traffic.
3. **Every AI game must work in the Scratch-games-to-app exporter** (BlockML's
   "Export Scratch Games to App"). A block that can't run inside the Android
   app needs a stated reason (Arduino only, see 15.3).
4. **S5 is re-scoped to the syllabus games** (below), not the 8 starters in §3.6.

### 15.2 What the syllabus needs, and whether it's built

Ready today: Games 2–6 (Image Model, Face, Pose), AI 1, AI 9, AI 17; AI 19–20
are discussions. Partly: AI 10 (digits via camera, not a stage drawing),
AI 11 (hand signs via Image Model, not trained on hand points). Missing:
voice (Game 1, AI 8), text AI (Game 8, AI 12, AI 18), chat AI (Game 7,
AI 13–16, AI 18 — the syllabus names ChatGPT in AI 13–16 and 18), QR /
AprilTag / cards (AI 4–6), OCR and "what is this?" (AI 2–3), web data (AI 7),
Arduino (sessions 42–50). Reword: AI 2 without celebrity recognition; AI 8
"build your own voice assistant" instead of Alexa; ChatGPT → "a
ChatGPT-style chatbot".

Coding concepts the syllabus never names, to be added inside existing games
(no new sessions): lists (Game 8 word list), My Blocks (Game 7), broadcast
(Game 5), and/or/not and `repeat until` (Game 4), "for this sprite only"
variables with clones (Game 3), pen (AI 10), debugging ("fix the bug"
versions in every game).

### 15.3 Free, app-compatible choice per feature

| Feature | Sessions | Laptop | Android app |
|---|---|---|---|
| Speech-to-text | Game 1, AI 8 | Vosk (on-device, ~40 MB per language) | same, bundled; microphone permission |
| Text-to-speech | AI 8 and many apps | browser's local voices | Android's own offline voice, via the app shell |
| Text classifier trainer, kindness check | Game 8, AI 12, AI 18 | small on-device text model + our trainer | same, bundled |
| QR, AprilTag, recognition cards | AI 4–6 | JS/WASM decoders on the shared camera | same, bundled |
| OCR (printed), "what is this?" (ImageNet) | AI 2–3 | Tesseract.js; MobileNet we already host | same, bundled |
| Train on stage drawing / hand points | AI 10–11 | extends Image Model / Hand runtime | same |
| Chat AI | Game 7, AI 13–16, AI 18 | small open model on the laptop (~250–400 MB, WebGPU with CPU fallback) | model downloaded once on first use; **benchmark first** |
| Weather | AI 7 | a weather API free for commercial use (MET Norway, to confirm) or a saved dataset | same; internet permission |
| Arduino | 42–50 | Web Serial + Firmata in Chrome | not possible (no USB in phone apps) — exporter says so |

Not used (cost or terms): OpenAI / ChatGPT API (paid; under-13 data needs
approved zero data retention), Google Gemini API (terms forbid apps likely
used by under-18s), Open-Meteo (paid for commercial use), Chrome's built-in
speech recognition (sends audio to Google; not in Android WebView).

### 15.4 Hosting and offline

- Vercel's free Hobby plan is for non-commercial use only; Pro is $20/month
  per member with 1 TB traffic. **Plan: move model files (and probably both
  sites) to Cloudflare Pages** (free, commercial use allowed, no bandwidth
  charge; 25 MiB per file, so large models are sharded). DNS stays at GoDaddy.
- Real offline caching: the inherited service worker is a no-op today, so
  models rely on the browser's HTTP cache. Add a model cache (Cache Storage)
  and a teacher "pre-load all models" button, as §4 promised.
- One Android app template that declares camera and microphone and asks at
  first use, instead of a template per permission.

### 15.5 Roadmap v2

| # | Milestone | Unlocks |
|---|---|---|
| S5 | Teacher pack for the syllabus games (Games 2–6 complete, basic halves of 1, 7, 8), with the coding-concept additions and "fix the bug" versions | Sessions 2–13 |
| S5b | Hosting on Cloudflare Pages, model cache + pre-load button, one app template | heavy home use, offline centres |
| S7 | Voice: offline speech-to-text + text-to-speech (laptop and app) | Game 1, AI 8 |
| S8 | Text AI: trainable text classifier, kindness check | Game 8, AI 12, AI 18 (part) |
| S9 | Vision+: QR, AprilTag, cards (done, §15.9), OCR, "what is this?", drawing and hand-sign trainers | AI 2–6, 10, 11 |
| S10 | Chat AI (after a laptop + phone benchmark) and weather | Game 7, AI 7, AI 13–16, AI 18 |
| S11 | Arduino (Web Serial + Firmata) | Robotics 42–50 |

Every milestone's exit criterion includes: works offline after first use,
and an AI game using it exports and runs as an Android app.

### 15.6 S5 progress (2026-09-28)

Lessons at `/lessons/` (built by `extensions/starters/build-lessons.mjs`):
All eight syllabus games have basic and fix-the-bug projects and a printable
lesson card; Games 2–6 also have their AI versions (1, 7 and 8 wait for the
Voice, Chat and Text AI extensions). Games 2 and 5 have printable training
cards; Game 8 has printable test phrases. My Blocks (with inputs) are in
Game 7, lists in Game 8.

| Game | AI version | Planted bug |
|---|---|---|
| 2 Catch the Apple | own classifier opens the basket lid for good apples | ground check below the stage |
| 3 Balloon Pop | pin on your nose, smile to pop | speed shared by all clones |
| 4 Dino Jump | nose rises above the calibrated standing height | jump allowed in mid-air |
| 5 Space Shooter | Friend/Foe/Nothing classifier unlocks weapons and docking | broadcast name mismatch |
| 6 Car Racing | lean (shoulder tilt, with a dead zone) steers continuously | `mod 300` instead of `mod 360` |
| 1 Maze Runner (basic only) | voice control — waits for S7 Voice | wall bounce-back has the wrong sign going right |
| 7 Platform Adventure (basic only) | chat-AI guide — waits for S10; a rule-based owl guide (ask & answer) is in the basic game | `start level` not called after the next backdrop |
| 8 Kindness Checker | the kindness check scores each message; the student's limit decides; messages where the AI and the word list disagree are collected (S8) | list counter starts at 0, so the last word is never checked |

Tested in the studio (every rule and bug) and as one Android app with all
eight basic/AI projects (24 MB; right on-screen controls; face, pose and image
models load in the app). Not yet: real webcam/children in class. Lesson: Scratch
keeps sprites on the stage, so "off-screen" checks must use limits the sprite
can reach (Game 2's planted bug is exactly this); scrolling is computed from
distance with `mod` rather than moving sprites off-stage.


### 15.7 S7 Voice (2026-09-28)

`extensions/src/voice.js` (id `blockmlVoice`): offline speech-to-text with Vosk
(vosk-browser 0.0.8, WebAssembly; model `vosk-model-small-en-us-0.15`, 40 MB,
Apache-2.0, packed by `scripts/fetch-voice-models.mjs` as a `.tar.gz` split into
10 MB parts + `manifest.json`), and text-to-speech with the computer's own
voices (Android: the app shell's `BlockMLAndroid.speak`, Android TextToSpeech).
Blocks follow the design rule: `when I hear [ ]`, `what I heard`, `I heard [ ]?`,
`confidence of what I heard`, `listen only for words ( )` (a grammar: far fewer
mistakes — itself a lesson), `speak [ ]`. The game's own voice is ignored while
it speaks.

- vosk-browser stops loading when its IndexedDB cache can't be written (private
  windows, some WebViews); `scripts/patch-vosk.mjs` makes that a warning. Model
  archives need directory entries or Vosk can't find the files.
- Android: the AI template now declares camera and microphone (+
  MODIFY_AUDIO_SETTINGS); the shell grants either to our own pages after
  Android's prompt; a `<queries>` entry lets Android 11+ find the TTS engine.
  The exporter bundles voice.js, vosk.js and the model parts (a voice app is
  ~43 MB).
- Game 1 now has its AI version: say up/down/left/right to walk, stop to stop;
  the game speaks your time.
- Tested with a synthetic voice as a fake microphone (Windows SAPI → WAV): every
  command recognised with a word list, and free speech exactly, in the studio
  and in an exported app's player. **Not yet: a real phone** (microphone prompt,
  WebView audio capture, Android's voice) **and real children's voices in a
  classroom.** Hindi (Vosk small Hindi, 42 MB) can be added the same way.


### 15.8 S8 Text AI (2026-09-30)

`extensions/src/text.js` (id `blockmlText`): a trainable text classifier and a
ready-made kindness check, both in plain JavaScript on one small text model.

- **Model choice.** Static word-piece vectors (Model2Vec potion-base-8M, MIT,
  29,528 pieces × 256 numbers, repacked to 7.7 MB) instead of a neural sentence
  encoder (Universal Sentence Encoder + the TF.js toxicity model would be
  ~55 MB and needs the GPU, which is unreliable for text models on phones).
  No TensorFlow.js, no GPU, nothing to warm up: the first answer comes ~0.2 s
  after the files load, in any browser or WebView. Our tokenizer matches the
  reference library exactly on 3,000 real comments; the smaller file changes
  sentence vectors by less than 0.0001.
- **Trainer.** The Image Model's softmax classifier on sentence vectors. With 8
  examples per class it got 12 of 14 unseen mood sentences and 8 of 8 unseen
  "lights / music / weather" commands right. Known limits, useful as fail-tests:
  it ignores word order ("I am not happy" is Happy), and short function-word
  differences (question or statement?) need many more examples.
- **Kindness check.** Sentence vector + one weight per word piece, trained on
  Civil Comments (CC0, ~900,000 rated comments) plus ~1,600 hand-written
  sentences (`scripts/kindness-phrases.mjs`). On 97,000 unseen comments: AUC
  0.92; at a score of 50 it catches about 6 in 10 unkind comments and about
  half of what it flags is unkind (the 50 point is placed where that balance
  is best). On hand-written sentences it never trained on: 41 of 51 unkind and
  99 of 102 fine ones right.
- **Fairness.** Trained on the comments alone, the check scored "I am gay" 95
  and "She is a black girl" 80: the known bias of moderation models, and not
  acceptable for children. The added sentences and a final adjustment bring
  every identity word, alone or in an ordinary sentence, under 50 (e.g. "My
  friend is blind" 8), while "I really hate …" sentences stay flagged. This is
  also a lesson step in Game 8 ("Who decides what examples an AI learns from?").
- **Blocks** follow the design rule: `label of text [ ]`, `confidence that [ ]
  is [class]`, `text [ ] is [class]?`, `unkind score of [ ]`, `[ ] seems
  unkind?`, `what the AI reads in [ ]`, plus `open the text trainer`, `add
  example [ ] to [class]` and `train the text model` (teach it from a list).
- **Game 8** has its AI version: the robot reports the AI's score against the
  student's `limit`, then the word list's answer, and collects the messages
  they disagree on. The printed phrase sheet has a column for each.
- **Apps.** The exporter bundles text.js, text-runtime.js and the model (an app
  grows by ~8 MB). Text AI needs no permission, so a text-only game uses the
  plain app template.
- Tested in the studio (trainer window, every block, save and reopen, Game 8
  with all printed phrases) and as an exported app in phone emulation. **Not
  yet: a real phone, and real children's sentences in a classroom** (spelling
  mistakes, Hinglish: the model is English-only).
- Still open for AI 12 and AI 18: their session projects (a sentiment trainer
  starter, and the final project) are not built; the blocks they need are.

### 15.9 S9, part 1: Codes & Cards (2026-10-01)

`extensions/src/scan.js` (id `blockmlScan`): QR codes, AprilTags and printable
recognition cards, for AI 4–6 and later the robotics sessions.

- **No AI model**: jsQR and js-aruco2 (pure JavaScript, Apache-2.0 / MIT) run in
  the shared vision runtime (+70 KB gzipped), so it works offline at once and an
  app grows by ~0.1 MB. Codes are read from the unmirrored 640×480 picture, ~7
  times a second (~50 ms a pass).
- **Cards** are AprilTag 36h11 tags 0–29 with names and pictures (go, stop,
  left, right, forward, back, turn around, jump, 0–9, apple … heart), printable
  at `/lessons/printables/cards.html`, with `tags.html` (tags 100–111) and
  `qr.html`. Cards are tags, which is a teaching point: the picture is for
  people, the square is for the computer.
- Blocks follow the design rule: names, numbers, places and yes/no; one hat
  (`when camera sees card`). Places are as the stage shows them (mirrored
  camera), and `direction` is the Scratch direction the code's top points to,
  so `point in direction (direction of card …)` turns a sprite with the card.
- Starter `card-driver.sb3`: cards drive a car; a QR code makes it talk.
- Tested with a rendered scene as the fake webcam (a turned "stop" card, tag 104,
  a QR code): every block right in the studio and in an exported app (1.3 MB,
  camera permission). No false tags in 120 random-squares images. **Not yet:
  printed cards in front of a real webcam, and a phone.**
- Next in S9: OCR and "what is this?" (AI 2–3), then the drawing and hand-sign
  trainers (AI 10–11).
