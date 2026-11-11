// The virtual car: a sprite named "Car" driven by the two motors (motor A = left wheel,
// motor B = right wheel), for Park Assist and the Mars Rover at home. 1 stage pixel = 1 cm.
// Its HC-SR04 looks straight ahead from the car's nose and measures to the nearest sprite
// named "Wall…" or "Obstacle…", or to the edge of the stage (the walls of the room).

const TOP_SPEED = 120; // px (cm) per second at speed 255
const STALL = 60; // below this PWM a real gear motor does not start
const TRACK = 44; // distance between the wheels at size 100%, px (all geometry scales with the sprite's size)
const NOSE = 30; // from the car's centre to the sensor at the front edge, px (at size 100%)
const MAX_RANGE = 400; // HC-SR04: no echo beyond ~4 m
const SENSOR_AHEAD = 36; // the IR line sensors, just in front of the nose, px
const SENSOR_GAP = 8; // between neighbouring line sensors, px

const rad = (deg) => (deg * Math.PI) / 180;

export class VirtualCar {
  constructor(vm, model, { onCrash } = {}) {
    this.vm = vm;
    this.model = model;
    this.onCrash = onCrash;
    this.crashedInto = null;
    this.last = 0;
    this.timer = setInterval(() => this.tick(), 1000 / 30);
  }

  car() {
    return this.vm.runtime.targets.find((t) => t.isOriginal && !t.isStage && t.getName() === 'Car') || null;
  }

  obstacles() {
    return this.vm.runtime.targets.filter((t) => !t.isStage && t.visible && /^(wall|obstacle)/i.test(t.getName()));
  }

  /** Wheel speed in px/s from a motor's state (direction × PWM; a motor stalls below STALL). */
  wheel(name) {
    const st = this.model.motorState(name);
    if (!st || !st.dir || st.speed < STALL) return 0;
    return st.dir * (st.speed / 255) * TOP_SPEED;
  }

  /** Left and right wheel speeds; null when the car is not set up with motors A and B. */
  wheels() {
    if (!this.model.motors.has('A') || !this.model.motors.has('B')) return null;
    return [this.wheel('A'), this.wheel('B')];
  }

  tick() {
    const now = performance.now();
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
    this.last = now;
    const car = this.car();
    const w = car && this.wheels();
    if (!car || !w || !dt || !this.vm.runtime.threads.length) return;
    const [vl, vr] = w;
    if (!vl && !vr) return;
    const v = (vl + vr) / 2;
    const k = car.size / 100;
    const turn = ((vr - vl) / (TRACK * k)) * (180 / Math.PI); // degrees per second, positive = to the left
    const dir = car.direction - turn * dt; // Scratch: 90 = right, clockwise
    const x = car.x + v * dt * Math.sin(rad(dir));
    const y = car.y + v * dt * Math.cos(rad(dir));
    const before = [car.x, car.y, car.direction];
    const wasTouching = this.touching(car); // already against a wall: it may back away
    car.setDirection(dir);
    car.setXY(x, y);
    const hit = wasTouching ? null : this.touching(car);
    if (hit) {
      car.setXY(before[0], before[1]); // it can't drive through
      car.setDirection(before[2]);
      if (this.crashedInto !== hit) {
        this.crashedInto = hit;
        this.onCrash?.(hit);
      }
    } else if (!wasTouching) {
      this.crashedInto = null;
    }
  }

  /** The obstacle (or "the edge") the car is touching, if any: Scratch's own pixel-accurate "touching". */
  touching(car) {
    if (car.isTouchingEdge()) return 'the edge of the stage';
    for (const o of this.obstacles()) if (car.isTouchingSprite(o.getName())) return o.getName();
    return null;
  }

  /** What the car's ultrasonic sensor measures, in cm (0 = no echo), or null without a car. */
  distance() {
    const car = this.car();
    if (!car) return null;
    const dx = Math.sin(rad(car.direction)), dy = Math.cos(rad(car.direction));
    const k = car.size / 100;
    const ox = car.x + NOSE * k * dx, oy = car.y + NOSE * k * dy;
    let best = Infinity;
    const box = (left, right, bottom, top) => {
      // Ray–rectangle (slab) intersection.
      let t0 = -Infinity, t1 = Infinity;
      for (const [o, d, lo, hi] of [[ox, dx, left, right], [oy, dy, bottom, top]]) {
        if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return; continue; }
        let a = (lo - o) / d, b = (hi - o) / d;
        if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      }
      if (t1 >= Math.max(t0, 0)) best = Math.min(best, Math.max(t0, 0));
    };
    for (const o of this.obstacles()) {
      const r = o.getBounds();
      if (r) box(r.left, r.right, r.bottom, r.top);
    }
    // The stage edges are the room's walls.
    for (const [t] of [[dx > 0 ? (240 - ox) / dx : Infinity], [dx < 0 ? (-240 - ox) / dx : Infinity], [dy > 0 ? (180 - oy) / dy : Infinity], [dy < 0 ? (-180 - oy) / dy : Infinity]]) {
      if (t >= 0) best = Math.min(best, t);
    }
    if (!(best <= MAX_RANGE)) return 0;
    return Math.max(2, Math.round(best * 10) / 10); // the HC-SR04 can't see closer than ~2 cm
  }

  /**
   * What an IR line sensor on the car's nose reads (0-1023, higher over a dark line, as the
   * rover code expects), or null without a car. `pins` are all the line-sensor pins: they sit
   * in a row across the nose, the lowest pin on the right (A0) and the highest on the left (A4),
   * matching the Teacher Guide's weights {-2,-1,0,1,2}.
   */
  line(pin, pins) {
    const car = this.car();
    const renderer = this.vm.renderer;
    if (!car || !renderer || !renderer.canvas) return null;
    const sorted = [...pins].sort((a, b) => a - b);
    const k = sorted.indexOf(pin);
    if (k < 0) return null;
    const dx = Math.sin(rad(car.direction)), dy = Math.cos(rad(car.direction));
    const size = car.size / 100;
    const left = (k - (sorted.length - 1) / 2) * SENSOR_GAP * size; // + = to the car's left
    const sx = car.x + SENSOR_AHEAD * size * dx - left * dy;
    const sy = car.y + SENSOR_AHEAD * size * dy + left * dx;
    const w = renderer.canvas.clientWidth, h = renderer.canvas.clientHeight;
    if (!w || !h) return null;
    let sum = 0, n = 0;
    try {
      const { data } = renderer.extractColor((sx / 480 + 0.5) * w, (0.5 - sy / 360) * h, 2);
      for (let i = 0; i < data.length; i += 4) { sum += (data[i] + data[i + 1] + data[i + 2]) / 3; n++; }
    } catch {
      return null;
    }
    const bright = n ? sum / n / 255 : 1;
    return Math.round(50 + (1 - bright) * 900); // white floor ≈ 50, black tape ≈ 950
  }

  status() {
    const car = this.car();
    if (!car) return null;
    const w = this.wheels();
    return { wheels: w, crashed: this.crashedInto };
  }
}
