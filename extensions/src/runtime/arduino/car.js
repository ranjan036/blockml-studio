// The virtual car: a sprite named "Car" driven by the two motors (motor A = left wheel,
// motor B = right wheel), for Park Assist and the Mars Rover at home. 1 stage pixel = 1 cm.
// Its HC-SR04 looks straight ahead from the car's nose and measures to the nearest sprite
// named "Wall…" or "Obstacle…", or to the edge of the stage (the walls of the room).

const TOP_SPEED = 120; // px (cm) per second at speed 255
const STALL = 60; // below this PWM a real gear motor does not start
const TRACK = 44; // distance between the wheels, px
const NOSE = 26; // from the car's centre to the sensor, px
const MAX_RANGE = 400; // HC-SR04: no echo beyond ~4 m

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
    const turn = ((vr - vl) / TRACK) * (180 / Math.PI); // degrees per second, positive = to the left
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

  /** The obstacle (or "the edge") the car is touching, if any. */
  touching(car) {
    const b = car.getBounds();
    if (!b) return null;
    if (b.left < -240 || b.right > 240 || b.bottom < -180 || b.top > 180) return 'the edge of the stage';
    for (const o of this.obstacles()) {
      const r = o.getBounds();
      if (r && b.left < r.right && b.right > r.left && b.bottom < r.top && b.top > r.bottom) return o.getName();
    }
    return null;
  }

  /** What the car's ultrasonic sensor measures, in cm (0 = no echo), or null without a car. */
  distance() {
    const car = this.car();
    if (!car) return null;
    const dx = Math.sin(rad(car.direction)), dy = Math.cos(rad(car.direction));
    const ox = car.x + NOSE * dx, oy = car.y + NOSE * dy;
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

  status() {
    const car = this.car();
    if (!car) return null;
    const w = this.wheels();
    return { wheels: w, crashed: this.crashedInto };
  }
}
