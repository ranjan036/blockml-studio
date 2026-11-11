// A simulated Arduino Uno for tests: avr8js runs the real compiled firmware, and small
// software parts stand in for the kit (LEDs, buzzer, servo, HC-SR04, flame sensor, LDR).
// No Node-only code, so the browser tests can bundle it too.
import {
  CPU, avrInstruction, AVRTimer, timer0Config, timer1Config, timer2Config,
  AVRUSART, usart0Config, AVRIOPort, portBConfig, portCConfig, portDConfig,
  AVRADC, adcConfig, AVRClock, clockConfig,
} from 'avr8js';

const FREQ = 16e6;

export function parseHex(text) {
  const bytes = new Uint8Array(0x8000);
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith(':')) continue;
    const n = parseInt(line.substr(1, 2), 16);
    const addr = parseInt(line.substr(3, 4), 16);
    const type = parseInt(line.substr(7, 2), 16);
    if (type !== 0) continue;
    for (let i = 0; i < n; i++) bytes[addr + i] = parseInt(line.substr(9 + i * 2, 2), 16);
  }
  return bytes;
}

export class SimUno {
  /** `code`: the program as Intel HEX text, or as bytes. */
  constructor(code) {
    const program = new Uint16Array(0x4000);
    new Uint8Array(program.buffer).set(typeof code === 'string' ? parseHex(code) : code.subarray(0, 0x8000));
    this.cpu = new CPU(program);
    this.timers = [timer0Config, timer1Config, timer2Config].map((c) => new AVRTimer(this.cpu, c));
    this.clock = new AVRClock(this.cpu, FREQ, clockConfig);
    this.usart = new AVRUSART(this.cpu, usart0Config, FREQ);
    this.ports = { B: new AVRIOPort(this.cpu, portBConfig), C: new AVRIOPort(this.cpu, portCConfig), D: new AVRIOPort(this.cpu, portDConfig) };
    this.adc = new AVRADC(this.cpu, adcConfig);

    this.serialOut = '';
    this.usart.onByteTransmit = (b) => { this.serialOut += String.fromCharCode(b); };
    this.rxQueue = [];
    this.usart.onRxComplete = () => this.feed();

    // Every change of every pin, with the time it happened (in microseconds).
    this.levels = new Array(20).fill(false);
    this.history = Array.from({ length: 20 }, () => []);
    this.pinListeners = [];
    for (let pin = 0; pin < 20; pin++) {
      const [port, bit] = this.where(pin);
      let last = false;
      port.addListener(() => {
        const high = port.pinState(bit) === 1; // PinState.High
        if (high === last) return;
        last = high;
        this.levels[pin] = high;
        this.history[pin].push({ t: this.micros(), high });
        for (const l of this.pinListeners) l(pin, high);
      });
    }
  }

  where(pin) {
    if (pin < 8) return [this.ports.D, pin];
    if (pin < 14) return [this.ports.B, pin - 8];
    return [this.ports.C, pin - 14];
  }

  micros() { return this.cpu.cycles / 16; }

  run(ms) {
    const end = this.cpu.cycles + ms * 16000;
    const cpu = this.cpu;
    while (cpu.cycles < end) { avrInstruction(cpu); cpu.tick(); }
  }

  // Serial into the board.
  write(text) {
    for (const c of text) this.rxQueue.push(c.charCodeAt(0));
    this.feed();
  }
  feed() {
    if (this.rxQueue.length && !this.usart.rxBusy) this.usart.writeByte(this.rxQueue.shift());
  }

  /** Sends one line and runs the board until it answers (or `ms` pass). */
  ask(text, ms = 200) {
    const start = this.serialOut.length;
    this.write(text + '\n');
    for (let t = 0; t < ms; t++) {
      this.run(1);
      const out = this.serialOut.slice(start);
      const nl = out.indexOf('\n');
      if (nl >= 0) {
        this.serialOut = this.serialOut.slice(0, start) + out.slice(nl + 1);
        return out.slice(0, nl).replace(/\r$/, '');
      }
    }
    return null;
  }

  // Parts of the kit.
  setInput(pin, high) {
    const [port, bit] = this.where(pin);
    port.setPin(bit, high);
  }

  /** An LDR or anything analog: `value` 0-1023 on A0-A5 (pin 14-19). */
  setAnalog(pin, value) {
    this.adc.channelValues[pin - 14] = (value / 1023) * 5;
  }

  /** An HC-SR04: after a Trig pulse, the Echo pin goes HIGH for the time sound takes. */
  addUltrasonic(trig, echo, getCm) {
    let rose = null;
    this.pinListeners.push((pin, high) => {
      if (pin !== trig) return;
      if (high) { rose = this.micros(); return; }
      if (rose === null || this.micros() - rose < 9) return;
      rose = null;
      const cm = getCm();
      if (!(cm > 0)) return; // nothing in front: no echo
      const us = (cm * 2) / 0.034;
      this.cpu.addClockEvent(() => {
        this.setInput(echo, true);
        this.cpu.addClockEvent(() => this.setInput(echo, false), Math.round(us * 16));
      }, 16 * 450); // the sensor sends its 8 pulses first (~450 µs)
    });
  }

  /** The width (µs) of the last complete HIGH pulse on a pin: a servo's angle. */
  lastPulse(pin) {
    const h = this.history[pin];
    for (let i = h.length - 1; i > 0; i--) {
      if (!h[i].high && h[i - 1].high) return h[i].t - h[i - 1].t;
    }
    return null;
  }
}
