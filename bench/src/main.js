// S0 benchmark for BlockML Studio (see blockml docs/07_BLOCKML_STUDIO_PLAN.md).
// Loads each candidate vision model on each TensorFlow.js backend, measures
// load time, inference speed and memory on live camera frames, runs two models
// together next to simulated Scratch work, times Image Model training, and
// reports every network request the page made.

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgpu';
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';
import wasmPlain from '@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm?url';
import wasmSimd from '@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-simd.wasm?url';
import wasmThreaded from '@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-threaded-simd.wasm?url';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as faceLandmarks from '@tensorflow-models/face-landmarks-detection';
import * as handPose from '@tensorflow-models/hand-pose-detection';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { trainSoftmax, normalize } from './softmax.js';

setWasmPaths({
  'tfjs-backend-wasm.wasm': wasmPlain,
  'tfjs-backend-wasm-simd.wasm': wasmSimd,
  'tfjs-backend-wasm-threaded-simd.wasm': wasmThreaded,
});

// ?quick shortens every test (for checking the page itself, not for real results).
const QUICK = new URLSearchParams(location.search).has('quick');
const RUNS = QUICK ? 5 : 30;
const WARMUP = QUICK ? 1 : 3;
const COMBINED_SECONDS = QUICK ? 3 : 10;
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const video = $('video');

// name, what the plan uses it for, whether the tester should show a hand, loader, one inference
const MODELS = [
  {
    id: 'mobilenet-v2-1.0', use: 'Image Model (features)',
    load: () => mobilenet.load({ version: 2, alpha: 1.0 }),
    run: async (m) => { const t = m.infer(video, true); await t.data(); t.dispose(); return 1; },
  },
  {
    id: 'mobilenet-v2-0.5', use: 'Image Model (features, smaller)',
    load: () => mobilenet.load({ version: 2, alpha: 0.5 }),
    run: async (m) => { const t = m.infer(video, true); await t.data(); t.dispose(); return 1; },
  },
  {
    id: 'coco-ssd-lite', use: 'Object Detection (smaller)',
    load: () => cocoSsd.load({ base: 'lite_mobilenet_v2' }),
    run: async (m) => (await m.detect(video, 20, 0.5)).length,
  },
  {
    id: 'coco-ssd-full', use: 'Object Detection (larger)',
    load: () => cocoSsd.load({ base: 'mobilenet_v2' }),
    run: async (m) => (await m.detect(video, 20, 0.5)).length,
  },
  {
    id: 'face-mesh', use: 'Face',
    load: () => faceLandmarks.createDetector(faceLandmarks.SupportedModels.MediaPipeFaceMesh, { runtime: 'tfjs', refineLandmarks: false, maxFaces: 2 }),
    run: async (m) => (await m.estimateFaces(video)).length,
    dispose: (m) => m.dispose(),
  },
  {
    id: 'hands-lite', use: 'Hand (smaller)', hand: true,
    load: () => handPose.createDetector(handPose.SupportedModels.MediaPipeHands, { runtime: 'tfjs', modelType: 'lite', maxHands: 2 }),
    run: async (m) => (await m.estimateHands(video)).length,
    dispose: (m) => m.dispose(),
  },
  {
    id: 'hands-full', use: 'Hand (larger)', hand: true,
    load: () => handPose.createDetector(handPose.SupportedModels.MediaPipeHands, { runtime: 'tfjs', modelType: 'full', maxHands: 2 }),
    run: async (m) => (await m.estimateHands(video)).length,
    dispose: (m) => m.dispose(),
  },
  {
    id: 'movenet-lightning', use: 'Body pose',
    load: () => poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }),
    run: async (m) => (await m.estimatePoses(video)).length,
    dispose: (m) => m.dispose(),
  },
];

function prompt(text) { $('prompt').textContent = text; }
function step(text) { $('step').textContent = text; }
function progress(done, total) { $('progress').value = done / total; }

function median(a) { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }
function p90(a) { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length * 0.9)]; }
function round(x) { return Math.round(x * 10) / 10; }

function memory() {
  const m = tf.memory();
  return {
    jsHeapMB: performance.memory ? round(performance.memory.usedJSHeapSize / 1048576) : null,
    tfTensorMB: round(m.numBytes / 1048576),
    gpuMB: m.numBytesInGPU !== undefined ? round(m.numBytesInGPU / 1048576) : null,
  };
}

function systemInfo() {
  let renderer = null;
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  } catch { /* no WebGL */ }
  return {
    userAgent: navigator.userAgent,
    cpuThreads: navigator.hardwareConcurrency,
    deviceMemoryGB: navigator.deviceMemory ?? null,
    screen: `${screen.width}x${screen.height}@${devicePixelRatio}`,
    webglRenderer: renderer,
    webgpu: !!navigator.gpu,
    crossOriginIsolated: self.crossOriginIsolated,
    time: new Date().toISOString(),
  };
}

async function useBackend(name) {
  try {
    const ok = await tf.setBackend(name);
    await tf.ready();
    return ok && tf.getBackend() === name;
  } catch {
    return false;
  }
}

async function benchModel(spec, backend) {
  const result = { model: spec.id, use: spec.use, backend };
  const netBefore = window.__net.length;
  try {
    const t0 = performance.now();
    const model = await spec.load();
    result.loadMs = Math.round(performance.now() - t0);
    result.downloadMB = round(window.__net.slice(netBefore).reduce((n, r) => n + (r.bytes || 0), 0) / 1048576);
    for (let i = 0; i < WARMUP; i++) await spec.run(model);
    const times = [];
    let found = 0;
    for (let i = 0; i < RUNS; i++) {
      const s = performance.now();
      found += (await spec.run(model)) > 0 ? 1 : 0;
      times.push(performance.now() - s);
      await new Promise(requestAnimationFrame);
    }
    result.medianMs = round(median(times));
    result.p90Ms = round(p90(times));
    result.perSecond = round(1000 / median(times));
    result.detectedInRuns = `${found}/${RUNS}`;
    result.memory = memory();
    if (spec.dispose) spec.dispose(model); else if (model.dispose) model.dispose();
  } catch (err) {
    result.error = String(err && err.message || err).slice(0, 300);
  }
  return result;
}

// Two models together + a simulated Scratch project (a 30 fps tick doing ~6 ms of work).
async function benchCombined(backend, face, hand) {
  const faceModel = await face.load();
  const handModel = await hand.load();
  let running = true;
  let aiFrames = 0;
  const aiLoop = (async () => {
    while (running) {
      await face.run(faceModel);
      await hand.run(handModel);
      aiFrames++;
      await new Promise(requestAnimationFrame);
    }
  })();
  const gaps = [];
  let last = performance.now();
  const tick = setInterval(() => {
    const now = performance.now();
    gaps.push(now - last);
    last = now;
    const until = now + 6;
    let x = 0;
    while (performance.now() < until) x += Math.sqrt(x + 1); // stand-in for Scratch's work
  }, 1000 / 30);
  await sleep(COMBINED_SECONDS * 1000);
  running = false;
  clearInterval(tick);
  await aiLoop;
  const mem = memory();
  face.dispose(faceModel);
  hand.dispose(handModel);
  return {
    backend,
    models: `${face.id} + ${hand.id}`,
    aiFramesPerSecond: round(aiFrames / COMBINED_SECONDS),
    scratchTicksPerSecond: round(gaps.length / COMBINED_SECONDS),
    scratchWorstGapMs: Math.round(Math.max(...gaps)),
    memory: mem,
  };
}

async function benchTraining(backend) {
  const model = await mobilenet.load({ version: 2, alpha: 1.0 });
  const samples = [];
  const labels = [];
  const t0 = performance.now();
  for (let i = 0; i < 90; i++) {
    const t = model.infer(video, true);
    samples.push(normalize(await t.data()));
    t.dispose();
    labels.push(i % 3);
    await new Promise(requestAnimationFrame);
  }
  const captureMs = Math.round(performance.now() - t0);
  const t1 = performance.now();
  trainSoftmax(samples, labels, 3, { epochs: 50 });
  const trainMs = Math.round(performance.now() - t1);
  if (model.dispose) model.dispose();
  return { backend, photos: 90, featureSize: samples[0].length, captureMs, epochs: 50, trainMs };
}

function networkSummary() {
  const byHost = {};
  for (const r of window.__net) {
    let host;
    try { host = new URL(r.url, location.href).host; } catch { host = r.url; }
    const h = (byHost[host] ||= { requests: 0, MB: 0, methods: new Set(), via: new Set() });
    h.requests++;
    h.MB += (r.bytes || 0) / 1048576;
    h.methods.add(r.method);
    h.via.add(r.via);
  }
  // Script/wasm/image loads that bypass fetch/XHR show up in Resource Timing.
  const resources = performance.getEntriesByType('resource').map((e) => {
    let host; try { host = new URL(e.name).host; } catch { host = e.name; }
    return { host, type: e.initiatorType };
  });
  for (const r of resources) {
    const h = (byHost[r.host] ||= { requests: 0, MB: 0, methods: new Set(), via: new Set() });
    h.via.add('resource:' + r.type);
  }
  return Object.entries(byHost).map(([host, h]) => ({
    host, requests: h.requests, MB: round(h.MB), methods: [...h.methods].join(','), via: [...h.via].join(','),
  }));
}

async function run() {
  $('start').disabled = true;
  $('start-error').textContent = '';
  let stream;
  try {
    stream = new URLSearchParams(location.search).has('testvideo') ? await testStream()
      : await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
  } catch (err) {
    $('start').disabled = false;
    $('start-error').textContent = 'The camera could not be opened: ' + err.message + '. Allow camera access and try again.';
    return;
  }
  video.srcObject = stream;
  await video.play();
  // The face and hand models size their input from the element's width/height
  // attributes, which are 0 on a <video> unless set; the face model then finds
  // nothing. (CSS still controls how big the preview looks.)
  video.width = video.videoWidth;
  video.height = video.videoHeight;
  $('start-card').classList.add('hidden');
  $('run-card').classList.remove('hidden');

  const results = { quick: QUICK, system: systemInfo(), backends: {}, models: [], combined: [], training: null };
  const backends = ['webgl', 'wasm', 'webgpu'];
  const available = [];
  for (const b of backends) {
    results.backends[b] = await useBackend(b);
    if (results.backends[b]) available.push(b);
  }

  const total = available.length * MODELS.length + available.length + 1;
  let done = 0;
  for (const backend of available) {
    await useBackend(backend);
    for (const spec of MODELS) {
      prompt(spec.hand ? '✋ Hold up one hand now' : '🙂 Look at the camera');
      step(`Testing ${spec.use} on ${backend.toUpperCase()} (${done + 1} of ${total})…`);
      results.models.push(await benchModel(spec, backend));
      progress(++done, total);
    }
  }

  const face = MODELS.find((m) => m.id === 'face-mesh');
  const hand = MODELS.find((m) => m.id === 'hands-lite');
  for (const backend of available) {
    await useBackend(backend);
    prompt('✋ Hold up one hand and look at the camera');
    step(`Face + Hand together with a running project on ${backend.toUpperCase()} (${COMBINED_SECONDS} s)…`);
    try {
      results.combined.push(await benchCombined(backend, face, hand));
    } catch (err) {
      results.combined.push({ backend, error: String(err.message || err) });
    }
    progress(++done, total);
  }

  const best = pickBest(results.models, 'mobilenet-v2-1.0') || available[0];
  await useBackend(best);
  prompt('🙂 Look at the camera');
  step('Timing Image Model training…');
  try {
    results.training = await benchTraining(best);
  } catch (err) {
    results.training = { backend: best, error: String(err.message || err) };
  }
  progress(++done, total);

  stream.getTracks().forEach((t) => t.stop());
  results.network = networkSummary();
  results.networkRequests = window.__net.map((r) => ({ ...r, url: r.url.split('?')[0] }));
  showResults(results);
}

function pickBest(models, id) {
  const rows = models.filter((r) => r.model === id && r.medianMs);
  rows.sort((a, b) => a.medianMs - b.medianMs);
  return rows[0] && rows[0].backend;
}

function showResults(results) {
  $('run-card').classList.add('hidden');
  $('result-card').classList.remove('hidden');
  const json = JSON.stringify(results, null, 2);
  const name = `blockml-studio-benchmark-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`;
  $('download').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = name;
    a.click();
  };
  $('copy').onclick = async () => {
    await navigator.clipboard.writeText(json);
    $('copied').textContent = 'Copied!';
  };

  const cls = (perSecond) => (perSecond >= 15 ? 'ok' : perSecond >= 8 ? 'warn' : 'bad');
  const rows = results.models.map((r) => `<tr><td>${r.use}</td><td>${r.backend}</td>${
    r.error ? `<td colspan="4" class="bad">${r.error}</td>`
      : `<td class="${cls(r.perSecond)}">${r.perSecond}/s</td><td>${r.medianMs} ms</td><td>${(r.loadMs / 1000).toFixed(1)} s</td><td>${r.detectedInRuns}</td>`}</tr>`).join('');
  const comb = results.combined.map((c) => c.error ? `<tr><td>${c.backend}</td><td colspan="3" class="bad">${c.error}</td></tr>`
    : `<tr><td>${c.backend}</td><td class="${cls(c.aiFramesPerSecond)}">${c.aiFramesPerSecond}/s</td><td>${c.scratchTicksPerSecond}/s</td><td>${c.scratchWorstGapMs} ms</td></tr>`).join('');
  const net = results.network.map((n) => `<tr><td>${n.host}</td><td>${n.requests}</td><td>${n.MB} MB</td><td>${n.methods}</td></tr>`).join('');
  $('summary').innerHTML = `
    <h3>This laptop</h3>
    <p>${results.system.cpuThreads} CPU threads · ${results.system.deviceMemoryGB ?? '?'} GB+ RAM · ${results.system.webglRenderer ?? 'unknown graphics'} · WebGPU: ${results.system.webgpu ? 'yes' : 'no'}</p>
    <h3>Each model</h3>
    <table><tr><th>Model</th><th>Engine</th><th>Speed</th><th>Per run</th><th>Load</th><th>Found</th></tr>${rows}</table>
    <h3>Face + Hand together, with a project running</h3>
    <table><tr><th>Engine</th><th>AI speed</th><th>Project ticks</th><th>Worst pause</th></tr>${comb}</table>
    <h3>Image Model training</h3>
    <p>${results.training.error ? `<span class="bad">${results.training.error}</span>`
      : `${results.training.photos} photos captured in ${(results.training.captureMs / 1000).toFixed(1)} s; 50 epochs trained in ${results.training.trainMs} ms (${results.training.backend}).`}</p>
    <h3>Network requests made by this page</h3>
    <table><tr><th>Server</th><th>Requests</th><th>Downloaded</th><th>Methods</th></tr>${net}</table>`;
}

// Local debugging only: ?testvideo feeds debug/face.jpg (not in the repo) as the camera.
async function testStream() {
  const img = new Image();
  img.src = 'debug/face.jpg';
  await img.decode();
  const c = document.createElement('canvas');
  c.width = 640; c.height = 480;
  const ctx = c.getContext('2d');
  const draw = () => { ctx.fillStyle = '#888'; ctx.fillRect(0, 0, 640, 480); ctx.drawImage(img, 200, 0, 384, 480); requestAnimationFrame(draw); };
  draw();
  return c.captureStream(30);
}

$('start').onclick = run;
