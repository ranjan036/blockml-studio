// Downloads the offline speech-recognition model (Vosk small English, Apache-2.0,
// alphacephei.com/vosk/models) and repacks it for the browser: vosk-browser wants a
// .tar.gz of the model folder (with directory entries), and hosts limit file sizes,
// so the archive is split into parts with a manifest the voice extension joins back.
// Run once when changing models: npm run fetch-voice-models  (results are committed)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { unzipSync } from 'fflate';

const MODELS = {
  'vosk-small-en': 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip',
};
const PART_SIZE = 10 * 1024 * 1024;

/** A minimal ustar archive: directory entries first, then files, paths under 100 chars. */
function tar(entries) {
  const blocks = [];
  const header = (name, size, isDir) => {
    const h = Buffer.alloc(512);
    const field = (value, offset, length) => h.write(value, offset, length, 'ascii');
    const octal = (n, length) => n.toString(8).padStart(length - 1, '0') + '\0';
    if (Buffer.byteLength(name) > 99) throw new Error(`path too long for ustar: ${name}`);
    field(name, 0, 100);
    field(octal(isDir ? 0o755 : 0o644, 8), 100, 8);
    field(octal(0, 8), 108, 8);
    field(octal(0, 8), 116, 8);
    field(octal(size, 12), 124, 12);
    field(octal(0, 12), 136, 12);
    field('        ', 148, 8); // checksum placeholder (spaces)
    field(isDir ? '5' : '0', 156, 1);
    field('ustar\0', 257, 6);
    field('00', 263, 2);
    let sum = 0;
    for (const b of h) sum += b;
    field(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8);
    return h;
  };
  for (const { name, data } of entries) {
    const isDir = name.endsWith('/');
    blocks.push(header(name, isDir ? 0 : data.length, isDir));
    if (!isDir) {
      blocks.push(Buffer.from(data));
      const pad = (512 - (data.length % 512)) % 512;
      if (pad) blocks.push(Buffer.alloc(pad));
    }
  }
  blocks.push(Buffer.alloc(1024)); // two empty blocks end the archive
  return Buffer.concat(blocks);
}

const only = process.argv.slice(2);
for (const [name, url] of Object.entries(MODELS)) {
  if (only.length && !only.includes(name)) continue;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${name}: ${res.status}`);
  const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
  // Directory entries for every folder, then the files, in a stable order.
  const dirs = new Set();
  for (const file of Object.keys(files)) {
    const parts = file.split('/');
    for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/') + '/');
  }
  const entries = [...dirs].sort().map((d) => ({ name: d }))
    .concat(Object.keys(files).filter((f) => !f.endsWith('/')).sort().map((f) => ({ name: f, data: files[f] })));
  const archive = zlib.gzipSync(tar(entries), { level: 9 });

  const dir = path.join('models', name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const parts = [];
  for (let offset = 0, i = 0; offset < archive.length; offset += PART_SIZE, i++) {
    const part = `model.tar.gz.${String(i).padStart(3, '0')}`;
    fs.writeFileSync(path.join(dir, part), archive.subarray(offset, offset + PART_SIZE));
    parts.push(part);
  }
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ source: url, license: 'Apache-2.0', size: archive.length, parts }, null, 2));
  console.log(`${name.padEnd(22)} ${(archive.length / 1048576).toFixed(2)} MB in ${parts.length} parts`);
}
