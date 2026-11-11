// Uploads a program to an Arduino Uno's bootloader (STK500 v1, which Optiboot speaks),
// so Studio can install the CODE AI firmware without the Arduino IDE.
// `link` is a small serial port: { open(baud), close(), write(bytes), read(n, ms), setSignals(on), drain() }
// where setSignals sets DTR and RTS: going from off to on restarts an Uno (like avrdude).
// (Web Serial in the browser, node serialport in tests).

const OK = 0x10, INSYNC = 0x14, EOP = 0x20;
const PAGE = 128;

export function parseHex(text) {
  const bytes = [];
  let top = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith(':')) continue;
    const n = parseInt(line.substr(1, 2), 16);
    const addr = parseInt(line.substr(3, 4), 16);
    const type = parseInt(line.substr(7, 2), 16);
    if (type === 1) break;
    if (type !== 0) continue;
    for (let i = 0; i < n; i++) {
      bytes[addr + i] = parseInt(line.substr(9 + i * 2, 2), 16);
      top = Math.max(top, addr + i + 1);
    }
  }
  const out = new Uint8Array(Math.ceil(top / PAGE) * PAGE).fill(0xff);
  for (let i = 0; i < top; i++) if (bytes[i] !== undefined) out[i] = bytes[i];
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function command(link, bytes, answerLength = 0, ms = 1000) {
  await link.write(Uint8Array.from([...bytes, EOP]));
  const got = await link.read(answerLength + 2, ms);
  if (got.length < answerLength + 2 || got[0] !== INSYNC || got[got.length - 1] !== OK) {
    throw new Error('no answer from the bootloader');
  }
  return got.subarray(1, 1 + answerLength);
}

// Like avrdude: a few tries, each waiting long enough for slow USB chips (CH340 clones can
// answer 200 ms late); after the first answer, empty the line and check sync again.
async function sync(link) {
  for (let i = 0; i < 6; i++) {
    try {
      await command(link, [0x30], 0, 600);
      await link.drain?.();
      await command(link, [0x30], 0, 600);
      return true;
    } catch {
      await link.drain?.();
    }
  }
  return false;
}

/**
 * Installs `program` (bytes from parseHex). Tries the Uno's 115200 baud first, then the
 * 57600 of older boards. `progress(fraction, words)` is called as it goes.
 */
export async function upload(link, program, progress = () => {}) {
  let found = false;
  for (const baud of [115200, 57600]) {
    await link.open(baud);
    progress(0, 'Restarting the board…');
    await link.setSignals(false);
    await sleep(250);
    await link.setSignals(true);
    await sleep(50);
    await link.drain?.();
    if (await sync(link)) { found = true; break; }
    await link.close();
  }
  if (!found) {
    throw new Error('The board did not answer. Is it an Arduino Uno, and is the Arduino IDE (or another tab) using it?');
  }
  try {
    const sig = await command(link, [0x75], 3);
    if (sig[0] !== 0x1e || sig[1] !== 0x95 || sig[2] !== 0x0f) {
      throw new Error('This board is not an Arduino Uno (ATmega328P).');
    }
    await command(link, [0x50]); // enter programming mode
    const pages = program.length / PAGE;
    for (let p = 0; p < pages; p++) {
      const addr = (p * PAGE) >> 1; // word address
      await command(link, [0x55, addr & 0xff, addr >> 8]);
      await command(link, [0x64, 0, PAGE, 0x46, ...program.subarray(p * PAGE, (p + 1) * PAGE)], 0, 1000);
      progress((p + 1) / pages / 2, 'Installing…');
    }
    for (let p = 0; p < pages; p++) {
      const addr = (p * PAGE) >> 1;
      await command(link, [0x55, addr & 0xff, addr >> 8]);
      const back = await command(link, [0x74, 0, PAGE, 0x46], PAGE, 1000);
      const want = program.subarray(p * PAGE, (p + 1) * PAGE);
      for (let i = 0; i < PAGE; i++) {
        if (back[i] !== want[i]) throw new Error('The check after installing failed. Try again.');
      }
      progress(0.5 + (p + 1) / pages / 2, 'Checking…');
    }
    await command(link, [0x51]); // leave programming mode: the new program starts
  } finally {
    await link.close();
  }
}
