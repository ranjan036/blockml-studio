// Web Serial for the Arduino blocks: a byte link (for installing the firmware) and the
// line-based client that talks to the CODE AI firmware (see firmware/codeai-board).

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A byte-level link over a Web Serial port, in the shape stk500.js expects. */
export function webLink(port) {
  let reader = null;
  let pump = null;
  let buf = [];
  let waiter = null;
  const wake = () => { if (waiter) { const w = waiter; waiter = null; w(); } };
  return {
    async open(baudRate) {
      await port.open({ baudRate });
      buf = [];
      reader = port.readable.getReader();
      pump = (async () => {
        try {
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            for (const b of value) buf.push(b);
            wake();
          }
        } catch { /* closed */ }
      })();
    },
    async close() {
      try { await reader?.cancel(); } catch { /* already gone */ }
      await pump;
      try { reader?.releaseLock(); } catch { /* ok */ }
      reader = null;
      try { await port.close(); } catch { /* ok */ }
    },
    async write(bytes) {
      const w = port.writable.getWriter();
      try { await w.write(bytes); } finally { w.releaseLock(); }
    },
    async read(n, ms) {
      const end = Date.now() + ms;
      while (buf.length < n && Date.now() < end) {
        await new Promise((r) => { waiter = r; setTimeout(wake, Math.max(1, end - Date.now())); });
      }
      return Uint8Array.from(buf.splice(0, n));
    },
    async drain() { await sleep(20); buf = []; },
    async setSignals(on) { await port.setSignals({ dataTerminalReady: on, requestToSend: on }); },
  };
}

/**
 * Talks to the CODE AI firmware: one line out, one line back, matched by number.
 * `onLine` sees every line from the board (for the Serial Monitor), `onClose` when the
 * cable is pulled or the port closes.
 */
export class BoardClient {
  constructor(port, { onClose } = {}) {
    this.port = port;
    this.onClose = onClose;
    this.pending = new Map();
    this.nextId = 1;
    this.text = '';
    this.lineWaiters = [];
    this.closed = false;
  }

  async open() {
    await this.port.open({ baudRate: 115200 }); // opening restarts an Uno
    const decoder = new TextDecoderStream();
    this.piped = this.port.readable.pipeTo(decoder.writable).catch(() => {});
    this.reader = decoder.readable.getReader();
    this.writer = this.port.writable.getWriter();
    this.pump = (async () => {
      try {
        for (;;) {
          const { value, done } = await this.reader.read();
          if (done) break;
          this.text += value;
          let nl;
          while ((nl = this.text.indexOf('\n')) >= 0) {
            const line = this.text.slice(0, nl).replace(/\r$/, '');
            this.text = this.text.slice(nl + 1);
            this.gotLine(line);
          }
        }
      } catch { /* cable pulled */ }
      this.shutDown();
    })();
  }

  gotLine(line) {
    for (const w of this.lineWaiters.splice(0)) w(line);
    const m = /^(\d+) (.*)$/.exec(line);
    if (!m) return;
    const p = this.pending.get(Number(m[1]));
    if (!p) return;
    this.pending.delete(Number(m[1]));
    clearTimeout(p.timer);
    p.resolve(m[2]);
  }

  /** Waits for the firmware to say it is ready, or asks it. True if it is ours. */
  async hello() {
    const ready = new Promise((resolve) => {
      const check = (line) => (/^CODEAI 1 ready/.test(line) ? resolve(true) : this.lineWaiters.push(check));
      this.lineWaiters.push(check);
      setTimeout(() => resolve(false), 3000);
    });
    if (await ready) return true;
    try {
      return (await this.send('V', 600)) === 'CODEAI 1';
    } catch {
      return false;
    }
  }

  /** Sends a command and resolves with the board's answer. */
  send(command, ms = 1000) {
    if (this.closed) return Promise.reject(new Error('board not connected'));
    const id = this.nextId;
    this.nextId = (this.nextId % 9999) + 1;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('the board did not answer'));
      }, ms);
      this.pending.set(id, { resolve, reject, timer });
      this.writer.write(new TextEncoder().encode(`${id} ${command}\n`)).catch((e) => {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(e);
      });
    });
  }

  get busy() { return this.pending.size; }

  shutDown() {
    if (this.closed) return;
    this.closed = true;
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new Error('board disconnected')); }
    this.pending.clear();
    this.onClose?.();
  }

  async close() {
    try { await this.reader?.cancel(); } catch { /* ok */ }
    await this.pump;
    await this.piped;
    try { this.writer?.releaseLock(); } catch { /* ok */ }
    try { await this.port.close(); } catch { /* ok */ }
    this.shutDown();
  }
}
