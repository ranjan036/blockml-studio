// The CODE AI board firmware, running in a simulated Uno (avr8js) with software parts.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import { SimUno } from './sim/uno.mjs';

const HEX = fs.readFileSync(new URL('../firmware/codeai-board.hex', import.meta.url), 'utf8');

function boot() {
  const uno = new SimUno(HEX);
  uno.run(30);
  return uno;
}

describe('CODE AI board firmware', () => {
  let uno;
  beforeAll(() => { uno = boot(); });

  it('says hello when it starts, and which firmware it is', () => {
    expect(uno.serialOut).toContain('CODEAI 1 ready');
    uno.serialOut = '';
    expect(uno.ask('1 V')).toBe('1 CODEAI 1');
  });

  it('turns an LED on and off (Robotics 1: Blink)', () => {
    expect(uno.ask('2 P 8 1')).toBe('2 ok');
    expect(uno.ask('3 D 8 1')).toBe('3 ok');
    expect(uno.levels[8]).toBe(true);
    expect(uno.ask('4 D 8 0')).toBe('4 ok');
    expect(uno.levels[8]).toBe(false);
  });

  it('runs a traffic light on three pins (Robotics 2)', () => {
    for (const [id, pin] of [[5, 10], [6, 9], [7, 8]]) uno.ask(`${id} D ${pin} 0`);
    uno.ask('8 D 8 1');
    expect([uno.levels[10], uno.levels[9], uno.levels[8]]).toEqual([false, false, true]);
    uno.ask('9 D 8 0');
    uno.ask('10 D 9 1');
    expect([uno.levels[10], uno.levels[9], uno.levels[8]]).toEqual([false, true, false]);
    uno.ask('11 D 9 0');
  });

  it('fades with PWM: the duty cycle follows the value (analogWrite)', () => {
    expect(uno.ask('12 W 9 64')).toBe('12 ok');
    const start = uno.history[9].length;
    uno.run(20);
    const h = uno.history[9].slice(start);
    let high = 0, total = 0;
    for (let i = 1; i < h.length; i++) {
      const d = h[i].t - h[i - 1].t;
      total += d;
      if (h[i - 1].high) high += d;
    }
    expect(high / total).toBeGreaterThan(0.2);
    expect(high / total).toBeLessThan(0.3);
    uno.ask('13 W 9 0');
  });

  it('reads a flame sensor with digitalRead (Robotics 3)', () => {
    uno.setInput(2, true);
    expect(uno.ask('14 R 2')).toBe('14 1');
    uno.setInput(2, false); // most flame modules: LOW = flame seen
    expect(uno.ask('15 R 2')).toBe('15 0');
  });

  it('moves a servo to 0, 90 and 180 degrees (Robotics 4)', () => {
    for (const [angle, us] of [[0, 544], [90, 1472], [180, 2400]]) {
      uno.history[9] = [];
      expect(uno.ask(`16 S 9 ${angle}`)).toBe('16 ok');
      uno.run(70); // the first pulse comes ~50 ms after the servo is attached
      expect(Math.abs(uno.lastPulse(9) - us)).toBeLessThan(20);
    }
  });

  it('measures distance with an HC-SR04 (Robotics 5)', () => {
    let cm = 25;
    uno.addUltrasonic(7, 6, () => cm);
    const d = Number(uno.ask('17 U 7 6').split(' ')[1]);
    expect(Math.abs(d - 25)).toBeLessThan(0.5);
    cm = 8;
    expect(Math.abs(Number(uno.ask('18 U 7 6').split(' ')[1]) - 8)).toBeLessThan(0.5);
    cm = 0; // nothing in front
    expect(uno.ask('19 U 7 6', 300)).toBe('19 0.0');
  });

  it('reads an LDR on A0 with analogRead (Robotics 7)', () => {
    uno.setAnalog(14, 300);
    expect(Math.abs(Number(uno.ask('20 A 14').split(' ')[1]) - 300)).toBeLessThanOrEqual(2);
    uno.setAnalog(14, 900);
    expect(Math.abs(Number(uno.ask('21 A 14').split(' ')[1]) - 900)).toBeLessThanOrEqual(2);
  });

  it('turns every output off when the project stops', () => {
    uno.ask('22 D 8 1');
    uno.ask('23 D 10 1');
    expect(uno.ask('24 Z')).toBe('24 ok');
    expect(uno.levels[8] || uno.levels[10]).toBe(false);
  });

  it('refuses the USB pins and unknown commands', () => {
    expect(uno.ask('25 D 1 1')).toBe('25 err pin');
    expect(uno.ask('26 A 3')).toBe('26 err pin');
    expect(uno.ask('27 Q 3')).toBe('27 err command');
  });
});
