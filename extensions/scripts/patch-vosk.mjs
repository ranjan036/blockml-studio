// vosk-browser 0.0.8 (Apache-2.0) with one change, made at build time: it caches the
// unpacked model in IndexedDB, and when that fails (private windows, some Android
// WebViews, storage full) it stops loading altogether. The cache is only an
// optimisation, so a failed sync is logged as a warning and loading continues.
// The worker is embedded in the bundle as base64, so it is decoded, patched and
// re-encoded. Fails loudly if the upstream code changes.
import fs from 'node:fs';

const SOURCE = new URL('../node_modules/vosk-browser/dist/vosk.js', import.meta.url);
const PATCHES = [
  ['return this.Vosk.syncFilesystem(true);', 'return this.Vosk.syncFilesystem(true).catch((e) => this.logger.warn(String(e)));'],
  ['return this.Vosk.syncFilesystem(false);', 'return this.Vosk.syncFilesystem(false).catch((e) => this.logger.warn(String(e)));'],
];
const HEADER = '/* vosk-browser 0.0.8 (Apache-2.0, github.com/ccoreilly/vosk-browser), patched by BlockML Studio:\n' +
  '   a failed IndexedDB cache sync no longer stops the model from loading. */\n';

export function patchedVosk() {
  const source = fs.readFileSync(SOURCE, 'utf8');
  const match = source.match(/createBase64WorkerFactory\('([A-Za-z0-9+/=]+)'/);
  if (!match) throw new Error('vosk-browser: embedded worker not found');
  let worker = Buffer.from(match[1], 'base64').toString('utf8');
  for (const [from, to] of PATCHES) {
    if (worker.split(from).length !== 2) throw new Error(`vosk-browser: expected exactly one "${from}"`);
    worker = worker.replace(from, to);
  }
  const encoded = Buffer.from(worker, 'utf8').toString('base64');
  return HEADER + source.slice(0, match.index + match[0].length - match[1].length - 1) + encoded + source.slice(match.index + match[0].length - 1);
}
