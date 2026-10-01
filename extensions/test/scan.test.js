import { describe, it, expect } from 'vitest';
import { placeOf, cardName, CARDS } from '../src/features/scan.js';

// A 100-pixel square in a 640x480 camera image, centred at (420, 140): right of and
// above the middle. Corners in the code's own order: top-left, top-right, bottom-right, bottom-left.
const square = (turn) => {
  const c = [[-50, -50], [50, -50], [50, 50], [-50, 50]]; // image coordinates: y down
  const a = (turn * Math.PI) / 180; // turned clockwise on the image
  return c.map(([x, y]) => ({ x: 420 + x * Math.cos(a) - y * Math.sin(a), y: 140 + x * Math.sin(a) + y * Math.cos(a) }));
};
const camera = { width: 640, height: 480, mirrored: false };

describe('placeOf', () => {
  it('gives the centre in stage coordinates and the size in stage steps', () => {
    // 640 camera pixels = 480 stage steps.
    expect(placeOf(square(0), camera)).toEqual({ x: 75, y: 75, size: 75, direction: 0 });
  });

  it('gives the direction the code\'s top points to, like a Scratch direction', () => {
    expect(placeOf(square(90), camera).direction).toBe(90);
    expect(placeOf(square(-90), camera).direction).toBe(-90);
    expect(placeOf(square(180), camera).direction).toBe(180);
    expect(placeOf(square(30), camera).direction).toBe(30);
  });

  it('mirrors the place and the direction when the stage shows the camera mirrored', () => {
    expect(placeOf(square(30), { ...camera, mirrored: true })).toEqual({ x: -75, y: 75, size: 75, direction: -30 });
  });
});

describe('cards', () => {
  it('card n is tag n; other tags have no card name', () => {
    expect(cardName(0)).toBe('go');
    expect(cardName(1)).toBe('stop');
    expect(cardName(CARDS.length)).toBe('');
    expect(cardName(-1)).toBe('');
    expect(new Set(CARDS).size).toBe(CARDS.length);
  });
});
