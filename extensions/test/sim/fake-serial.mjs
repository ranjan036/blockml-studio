// A fake Web Serial (navigator.serial) for browser tests: its one port is a simulated
// Arduino Uno (avr8js running real firmware) with a bootloader written in JS that speaks
// STK500 like Optiboot, so "Prepare board" can install the firmware into it.
// The board starts blank (no CODE AI firmware). window.__sim controls the parts:
//   __sim.cm (HC-SR04 on Trig 7 / Echo 6), __sim.flame(bool) (pin 2), __sim.light(0-1023) (A0),
//   __sim.uno (the running SimUno), __sim.flashes (how many times the board was programmed).
import { SimUno } from './uno.mjs';

const BLANK = new Uint8Array(0x8000).fill(0xff); // erased flash: the CPU does nothing useful

const sim = {
  cm: 50,
  lightLevel: 600,
  flash: BLANK.slice(),
  flashes: 0,
  uno: null,
  flame(on) { this.flameOn = on; this.uno?.setInput(2, !on); },
  light(v) { this.lightLevel = v; this.uno?.setAnalog(14, v); },
};
sim.flame = sim.flame.bind(sim);
sim.light = sim.light.bind(sim);
window.__sim = sim;

class FakePort extends EventTarget {
  constructor() {
    super();
    this.readable = null;
    this.writable = null;
    this.controller = null;
    this.timer = null;
    this.signals = true;
    this.boot = null; // bootloader state while it listens
  }

  getInfo() { return { usbVendorId: 0x1a86, usbProductId: 0x7523 }; }

  async open({ baudRate }) {
    if (this.readable) throw new Error('Failed to open serial port: already open');
    this.baud = baudRate;
    this.readable = new ReadableStream({ start: (c) => { this.controller = c; } });
    this.writable = new WritableStream({ write: (chunk) => this.receive(chunk) });
    this.restart(); // opening a port restarts an Uno (DTR)
    this.timer = setInterval(() => this.tick(), 5);
  }

  async close() {
    clearInterval(this.timer);
    try { this.controller.close(); } catch { /* already */ }
    this.readable = null;
    this.writable = null;
  }

  async setSignals({ dataTerminalReady }) {
    if (dataTerminalReady && !this.signals) this.restart();
    this.signals = dataTerminalReady;
  }

  emit(bytes) {
    try { this.controller.enqueue(Uint8Array.from(bytes)); } catch { /* closed */ }
  }

  // After a restart the bootloader listens for one second (at 115200 baud), then the program runs.
  restart() {
    sim.uno = null;
    this.boot = { until: performance.now() + 1000, buf: [], addr: 0 };
  }

  startProgram() {
    this.boot = null;
    const uno = new SimUno(sim.flash);
    uno.addUltrasonic(7, 6, () => sim.cm);
    uno.setInput(2, !sim.flameOn);
    uno.setAnalog(14, sim.lightLevel);
    sim.uno = uno;
    this.sent = 0;
  }

  receive(chunk) {
    if (this.boot) {
      if (this.baud === 115200) this.boot.buf.push(...chunk);
      this.bootloader();
      return;
    }
    if (sim.uno && this.baud === 115200) sim.uno.write(String.fromCharCode(...chunk));
  }

  bootloader() {
    const b = this.boot;
    const take = (n) => (b.buf.length >= n ? b.buf.splice(0, n) : null);
    for (;;) {
      if (!b.buf.length) return;
      const cmd = b.buf[0];
      const need = { 0x30: 2, 0x75: 2, 0x50: 2, 0x51: 2, 0x55: 4, 0x74: 5 }[cmd] ?? (cmd === 0x64 ? 5 + 128 : 1);
      const msg = take(need);
      if (!msg) return;
      b.until = performance.now() + 1000; // a command keeps the bootloader listening
      if (msg[msg.length - 1] !== 0x20) continue; // out of sync: ignore, like Optiboot
      if (cmd === 0x30 || cmd === 0x50) this.emit([0x14, 0x10]);
      else if (cmd === 0x75) this.emit([0x14, 0x1e, 0x95, 0x0f, 0x10]);
      else if (cmd === 0x55) { b.addr = (msg[1] | (msg[2] << 8)) * 2; this.emit([0x14, 0x10]); }
      else if (cmd === 0x64) { sim.flash.set(msg.slice(4, 4 + 128), b.addr); this.emit([0x14, 0x10]); }
      else if (cmd === 0x74) this.emit([0x14, ...sim.flash.subarray(b.addr, b.addr + 128), 0x10]);
      else if (cmd === 0x51) { sim.flashes++; this.emit([0x14, 0x10]); setTimeout(() => this.startProgram(), 20); return; }
    }
  }

  // Runs the simulated board in step with real time and passes on what it prints.
  tick() {
    if (this.boot) {
      if (performance.now() > this.boot.until) this.startProgram();
      return;
    }
    const uno = sim.uno;
    if (!uno) return;
    try { uno.run(5); } catch { sim.uno = null; return; } // a blank board's flash is not a program
    if (uno.serialOut.length > this.sent) {
      const text = uno.serialOut.slice(this.sent);
      this.sent = uno.serialOut.length;
      if (this.baud === 115200) this.emit(new TextEncoder().encode(text));
      if (uno.serialOut.length > 4096) { uno.serialOut = ''; this.sent = 0; }
    }
  }
}

const port = new FakePort();
const listeners = new EventTarget();
Object.defineProperty(navigator, 'serial', {
  value: {
    requestPort: async () => port,
    getPorts: async () => (sim.granted ? [port] : []),
    addEventListener: (...a) => listeners.addEventListener(...a),
    removeEventListener: (...a) => listeners.removeEventListener(...a),
  },
});
sim.port = port;
