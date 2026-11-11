// Checks a real Arduino Uno on a serial port with nothing wired to it:
// installs the CODE AI firmware with Studio's own uploader (src/runtime/arduino/stk500.js),
// then talks to the firmware: version, the on-board LED (pin 13), a pull-up input, A0.
// Run: node scripts/board-test.mjs COM5
import fs from 'node:fs';
import { SerialPort } from 'serialport';
import { parseHex, upload } from '../src/runtime/arduino/stk500.js';

const path = process.argv[2];
if (!path) { console.error('usage: node scripts/board-test.mjs COM5'); process.exit(1); }

function nodeLink() {
  let port = null;
  let buf = [];
  let waiter = null;
  const wake = () => { if (waiter) { const w = waiter; waiter = null; w(); } };
  return {
    async open(baudRate) {
      port = new SerialPort({ path, baudRate, autoOpen: false });
      await new Promise((ok, no) => port.open((e) => (e ? no(e) : ok())));
      buf = [];
      port.on('data', (d) => { if (process.env.DEBUG) console.log('rx', Date.now() % 100000, [...d].map((b) => b.toString(16)).join(' ')); buf.push(...d); wake(); });
    },
    async close() {
      if (!port) return;
      await new Promise((ok) => port.close(() => ok()));
      port = null;
    },
    async write(bytes) {
      if (process.env.DEBUG) console.log('tx', Date.now() % 100000, [...bytes].slice(0, 4).map((b) => b.toString(16)).join(' '));
      await new Promise((ok, no) => port.write(Buffer.from(bytes), (e) => (e ? no(e) : port.drain(() => ok()))));
    },
    async read(n, ms) {
      const end = Date.now() + ms;
      while (buf.length < n && Date.now() < end) {
        await new Promise((r) => { waiter = r; setTimeout(wake, Math.max(1, end - Date.now())); });
      }
      return Uint8Array.from(buf.splice(0, n));
    },
    async drain() {
      await new Promise((r) => setTimeout(r, 20));
      buf = [];
    },
    async setSignals(on) {
      await new Promise((ok, no) => port.set({ dtr: on, rts: on }, (e) => (e ? no(e) : ok())));
    },
    text() { return Buffer.from(buf).toString('latin1'); },
    clear() { buf = []; },
  };
}

const hex = fs.readFileSync(new URL('../firmware/codeai-board.hex', import.meta.url), 'utf8');
const link = nodeLink();
let t = Date.now();
await upload(link, parseHex(hex), (f, words) => process.stdout.write(`\r${words} ${Math.round(f * 100)}%   `));
console.log(`\ninstalled and checked in ${((Date.now() - t) / 1000).toFixed(1)} s`);

await link.open(115200); // opening restarts the board
const waitFor = async (re, ms = 4000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const m = link.text().match(re);
    if (m) { link.clear(); return m; }
    await link.read(0, 50);
    await new Promise((r) => setTimeout(r, 30));
  }
  throw new Error(`timed out waiting for ${re}; got ${JSON.stringify(link.text())}`);
};
const ask = async (id, cmd) => {
  link.clear();
  t = performance.now();
  await link.write(new TextEncoder().encode(`${id} ${cmd}\n`));
  const m = await waitFor(new RegExp(`${id} ([^\\r\\n]*)\\r?\\n`), 1000);
  return [m[1], performance.now() - t];
};
await waitFor(/CODEAI 1 ready/);
console.log('firmware started');
const results = [];
results.push(['version', ...(await ask(1, 'V')), 'CODEAI 1']);
results.push(['LED 13 on', ...(await ask(2, 'D 13 1')), 'ok']);
await new Promise((r) => setTimeout(r, 1500));
results.push(['LED 13 off', ...(await ask(3, 'D 13 0')), 'ok']);
results.push(['pin 2 pull-up', ...(await ask(4, 'P 2 2')), 'ok']);
results.push(['read pin 2 (nothing wired: pull-up = 1)', ...(await ask(5, 'R 2')), '1']);
results.push(['read A0 (nothing wired: any number)', ...(await ask(6, 'A 14')), null]);
results.push(['distance, nothing wired (no echo = 0)', ...(await ask(7, 'U 7 6')), '0.0']);
results.push(['all off', ...(await ask(8, 'Z')), 'ok']);
let failed = 0;
for (const [name, got, ms, want] of results) {
  const pass = want === null ? /^\d+$/.test(got) : got === want;
  if (!pass) failed++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}: ${got}  (${ms.toFixed(1)} ms)`);
}
await link.close();
process.exit(failed ? 1 : 0);
