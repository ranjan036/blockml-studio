// Downloads the TF.js models the extensions use, so BlockML Studio serves them
// itself (no requests to Google at run time). All are Apache-2.0 (Kaggle model
// pages: MediaPipe face_detection, face_landmarks_detection, handpose_3d; Google movenet).
// Run once when changing models: npm run fetch-models  (results are committed)
import fs from 'node:fs';
import path from 'node:path';

const MODELS = {
  'face-detector': 'https://tfhub.dev/mediapipe/tfjs-model/face_detection/short/1',
  'face-mesh': 'https://tfhub.dev/mediapipe/tfjs-model/face_landmarks_detection/face_mesh/1',
  'hand-detector-lite': 'https://tfhub.dev/mediapipe/tfjs-model/handpose_3d/detector/lite/1',
  'hand-landmarks-lite': 'https://tfhub.dev/mediapipe/tfjs-model/handpose_3d/landmark/lite/1',
  'movenet-lightning': 'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4',
  // Image Model features (MobileNet v2, width 1.0, 224x224) — Apache-2.0
  'mobilenet-v2': 'https://tfhub.dev/google/imagenet/mobilenet_v2_100_224/classification/2',
  // Object Detection: COCO-SSD lite (80 everyday objects) — Apache-2.0 (tfjs-models).
  // Hosted as a plain folder on Google Cloud Storage, not on TF Hub.
  'coco-ssd-lite': { plain: 'https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/' },
};

const only = process.argv.slice(2);
for (const [name, base] of Object.entries(MODELS)) {
  if (only.length && !only.includes(name)) continue;
  const dir = path.join('models', name);
  fs.mkdirSync(dir, { recursive: true });
  // TF Hub serves TF.js models as model.json + weight shards next to it; plain folders
  // (Google Cloud Storage) just hold the files.
  const plain = typeof base === 'object' ? base.plain : null;
  const res = await fetch(plain ? `${plain}model.json` : `${base}/model.json?tfjs-format=file`);
  if (!res.ok) throw new Error(`${name}: model.json ${res.status}`);
  const modelJson = await res.json();
  fs.writeFileSync(path.join(dir, 'model.json'), JSON.stringify(modelJson));
  let bytes = 0;
  for (const group of modelJson.weightsManifest) {
    for (const file of group.paths) {
      // Like TF.js: ask TF Hub for each shard and follow its (signed, one-time) redirect.
      const w = await fetch(plain ? plain + file : `${base}/${file}?tfjs-format=file`);
      if (!w.ok) throw new Error(`${name}: ${file} ${w.status}`);
      const buf = Buffer.from(await w.arrayBuffer());
      fs.writeFileSync(path.join(dir, file), buf);
      bytes += buf.length;
    }
  }
  console.log(`${name.padEnd(22)} ${(bytes / 1048576).toFixed(2)} MB`);
}
