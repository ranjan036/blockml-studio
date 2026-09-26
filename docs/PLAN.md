# BlockML Studio — Scratch editor with AI blocks (Vision first) — Plan

*Status: S0 and S1 complete. The editor is live at https://studio.blockml.codeai.ltd (§10). Next: S2.*

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
