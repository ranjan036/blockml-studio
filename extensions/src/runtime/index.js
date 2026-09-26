// BlockML Studio vision runtime (MIT). Shared by the Face and Hand & Pose
// extensions: loads TensorFlow.js once, owns the camera settings, runs each
// model in the background on the latest camera frame, and keeps the latest
// results so blocks can read them instantly (blocks never wait for the AI).
//
// Loaded by the extensions with import() from the same folder, so there is one
// copy of TensorFlow.js and one set of models no matter how many extensions use it.

// Only the parts of TensorFlow.js the models need. No WASM engine: S0 showed it
// starves the Scratch project, and every supported browser has WebGL.
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-converter';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-webgpu';
import * as faceLandmarks from '@tensorflow-models/face-landmarks-detection';
import * as handPose from '@tensorflow-models/hand-pose-detection';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { faceFeatures, facePoints } from '../features/face.js';

// Re-exported so the extension scripts use the same (tested) thresholds.
export { faceIs } from '../features/face.js';
import { handFeatures, HAND_POINT_NAMES } from '../features/hand.js';

// Models are served next to this file (see scripts/fetch-models.mjs), never from Google.
// (Built with plain strings on purpose: Vite rewrites `new URL(`./x/${y}`, import.meta.url)`
// into a build-time asset lookup, which turns these into "undefined".)
const HERE = import.meta.url.slice(0, import.meta.url.lastIndexOf('/') + 1);
const model = (name) => HERE + 'models/' + name + '/model.json';

const STAGE_W = 480;
const STAGE_H = 360;
// A model keeps running for this long after one of its blocks was last used.
const IDLE_AFTER_MS = 3000;
const SPEEDS = { fast: 0, normal: 33, 'battery saver': 100 };

const LOADERS = {
  face: () => faceLandmarks.createDetector(faceLandmarks.SupportedModels.MediaPipeFaceMesh, {
    runtime: 'tfjs', maxFaces: 4, refineLandmarks: false,
    detectorModelUrl: model('face-detector'), landmarkModelUrl: model('face-mesh'),
  }),
  hands: () => handPose.createDetector(handPose.SupportedModels.MediaPipeHands, {
    runtime: 'tfjs', modelType: 'lite', maxHands: 2,
    detectorModelUrl: model('hand-detector-lite'), landmarkModelUrl: model('hand-landmarks-lite'),
  }),
  pose: () => poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    modelUrl: model('movenet-lightning'),
  }),
};

// The camera frame is 480x360 like the stage; convert to stage coordinates (y up).
const toStage = (p) => ({ x: p.x - STAGE_W / 2, y: STAGE_H / 2 - p.y });
const swapSide = (name) => name.replace(/^left/, '\u0000').replace(/^right/, 'left').replace(/^\u0000/, 'right');

let backendPromise = null;
function initBackend() {
  if (!backendPromise) {
    backendPromise = (async () => {
      for (const name of ['webgpu', 'webgl']) {
        try {
          if (await tf.setBackend(name)) {
            await tf.ready();
            return name;
          }
        } catch (err) {
          console.warn(`BlockML Studio AI: the ${name} engine is not available`, err);
        }
      }
      throw new Error('This browser has no WebGPU or WebGL, so the AI blocks cannot run');
    })();
  }
  return backendPromise;
}

class Vision {
  constructor(runtime) {
    this.runtime = runtime;
    this.video = runtime.ioDevices.video;
    // 'auto' turns the camera on the first time an AI block needs it.
    this.cameraState = 'auto';
    this.ghost = 50;
    this.speed = 'normal';
    this.overlay = 'nothing';
    this.models = {};
    this.overlayCanvas = null;
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }

  entry(kind) {
    return (this.models[kind] ||= { status: 'off', detector: null, busy: false, lastRun: 0, lastWanted: 0, results: [] });
  }

  /** Blocks call this whenever they read results: loads the model and keeps it running. */
  want(kind) {
    const e = this.entry(kind);
    e.lastWanted = performance.now();
    if (e.status === 'off') this.load(kind);
    if (this.cameraState === 'auto') this.setCamera('on');
  }

  status(kind) {
    return this.entry(kind).status;
  }

  async load(kind) {
    const e = this.entry(kind);
    e.status = 'loading';
    try {
      await initBackend();
      e.detector = await LOADERS[kind]();
      e.status = 'ready';
    } catch (err) {
      console.error(`BlockML Studio AI: could not load the ${kind} model`, err);
      e.status = 'error';
    }
  }

  get mirrored() {
    return this.video.mirror !== false;
  }

  setCamera(state) {
    this.cameraState = state;
    if (state === 'off') {
      this.video.disableVideo();
      for (const e of Object.values(this.models)) e.results = [];
      return;
    }
    this.video.mirror = state !== 'on flipped';
    Promise.resolve(this.video.enableVideo()).catch((err) => console.warn('BlockML Studio AI: camera not available', err));
    this.video.setPreviewGhost(this.ghost);
  }

  setTransparency(value) {
    this.ghost = Math.max(0, Math.min(100, Number(value) || 0));
    this.video.setPreviewGhost(this.ghost);
  }

  setSpeed(speed) {
    if (speed in SPEEDS) this.speed = speed;
  }

  setOverlay(mode) {
    this.overlay = mode;
    if (mode === 'nothing' && this.overlayCanvas) {
      this.overlayCanvas.remove();
      this.overlayCanvas = null;
    }
  }

  faces() { return this.entry('face').results; }
  hands() { return this.entry('hands').results; }
  pose() { return this.entry('pose').results[0] || null; }

  frame(now) {
    requestAnimationFrame(this.frame);
    for (const [kind, e] of Object.entries(this.models)) {
      if (e.status !== 'ready' || e.busy) continue;
      if (now - e.lastWanted > IDLE_AFTER_MS) continue;
      if (now - e.lastRun < SPEEDS[this.speed]) continue;
      const canvas = this.video.videoReady
        ? this.video.getFrame({ format: 'canvas', dimensions: [STAGE_W, STAGE_H] })
        : null;
      if (!canvas) {
        e.results = [];
        continue;
      }
      e.busy = true;
      e.lastRun = now;
      this.detect(kind, e.detector, canvas)
        .then((results) => { e.results = results; })
        .catch((err) => { console.warn(`BlockML Studio AI: ${kind} detection failed`, err); })
        .finally(() => { e.busy = false; });
    }
    this.drawOverlay();
  }

  async detect(kind, detector, canvas) {
    const mirrored = this.mirrored;
    if (kind === 'face') {
      const faces = await detector.estimateFaces(canvas);
      return faces
        .map((f) => {
          const kp = f.keypoints.map(toStage);
          return { keypoints: kp, features: faceFeatures(kp, mirrored), points: facePoints(kp, mirrored) };
        })
        .sort((a, b) => a.features.x - b.features.x); // face 1 is the leftmost
    }
    if (kind === 'hands') {
      const hands = await detector.estimateHands(canvas);
      return hands
        .map((h) => {
          const kp = h.keypoints.map(toStage);
          const points = Object.fromEntries(HAND_POINT_NAMES.map((n, i) => [n, kp[i]]));
          // MediaPipe labels hands as if the image were mirrored (a selfie).
          let side = (h.handedness || '').toLowerCase();
          if (!mirrored) side = side === 'left' ? 'right' : side === 'right' ? 'left' : side;
          return { keypoints: kp, points, side, ...handFeatures(kp) };
        })
        .sort((a, b) => a.points.wrist.x - b.points.wrist.x); // hand 1 is the leftmost
    }
    if (kind === 'pose') {
      const poses = await detector.estimatePoses(canvas);
      return poses.map((p) => {
        const points = {};
        let total = 0;
        for (const k of p.keypoints) {
          // MoveNet names sides as seen in a normal photo; in a mirrored view, swap
          // them so "left wrist" means the person's own left wrist.
          const name = (mirrored ? swapSide(k.name) : k.name).replace('_', ' ');
          points[name] = { ...toStage(k), score: k.score };
          total += k.score;
        }
        return { points, visible: total / p.keypoints.length > 0.3 };
      });
    }
    return [];
  }

  // Draws what the AI sees on top of the stage, when a block turned it on.
  drawOverlay() {
    if (this.overlay === 'nothing') return;
    const stage = this.runtime.renderer && this.runtime.renderer.canvas;
    if (!stage || !stage.isConnected) return;
    if (!this.overlayCanvas) {
      this.overlayCanvas = document.createElement('canvas');
      Object.assign(this.overlayCanvas.style, { position: 'fixed', pointerEvents: 'none', zIndex: 10 });
      document.body.appendChild(this.overlayCanvas);
    }
    const c = this.overlayCanvas;
    const r = stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    Object.assign(c.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    if (c.width !== Math.round(r.width * dpr)) c.width = Math.round(r.width * dpr);
    if (c.height !== Math.round(r.height * dpr)) c.height = Math.round(r.height * dpr);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    const sx = c.width / STAGE_W;
    const px = (p) => [(p.x + STAGE_W / 2) * sx, (STAGE_H / 2 - p.y) * sx];
    const dot = (p, color, size = 3) => {
      const [x, y] = px(p);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size * dpr, 0, Math.PI * 2);
      ctx.fill();
    };
    ctx.lineWidth = 2 * dpr;

    for (const f of this.entry('face').results) {
      if (this.overlay === 'boxes') {
        const s = f.features.size;
        const [x, y] = px({ x: f.features.x - s / 2, y: f.features.y + s * 0.65 });
        ctx.strokeStyle = '#ec4899';
        ctx.strokeRect(x, y, s * sx, s * 1.3 * sx);
      } else {
        for (const p of Object.values(f.points)) dot(p, '#ec4899', 4);
      }
    }
    for (const h of this.entry('hands').results) {
      if (this.overlay === 'boxes') {
        const xs = h.keypoints.map((p) => p.x);
        const ys = h.keypoints.map((p) => p.y);
        const [x1, y1] = px({ x: Math.min(...xs), y: Math.max(...ys) });
        const [x2, y2] = px({ x: Math.max(...xs), y: Math.min(...ys) });
        ctx.strokeStyle = '#14b8a6';
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      } else {
        for (const p of h.keypoints) dot(p, '#14b8a6', 3);
      }
    }
    const body = this.entry('pose').results[0];
    if (body && body.visible) {
      for (const p of Object.values(body.points)) if (p.score > 0.3) dot(p, '#f59e0b', 4);
    }
  }
}

/** The one Vision for this Scratch runtime. */
export function getVision(runtime) {
  return (runtime.__blockmlVision ||= new Vision(runtime));
}
