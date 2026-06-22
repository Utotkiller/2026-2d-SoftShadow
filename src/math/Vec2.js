export class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  clone() {
    return new Vec2(this.x, this.y);
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  copy(other) {
    this.x = other.x;
    this.y = other.y;
    return this;
  }

  add(other) {
    this.x += other.x;
    this.y += other.y;
    return this;
  }

  subtract(other) {
    this.x -= other.x;
    this.y -= other.y;
    return this;
  }

  multiplyScalar(value) {
    this.x *= value;
    this.y *= value;
    return this;
  }

  lengthSquared() {
    return this.x * this.x + this.y * this.y;
  }

  length() {
    return Math.sqrt(this.lengthSquared());
  }

  normalize() {
    const length = this.length();
    if (length <= 1e-7) {
      this.x = 0;
      this.y = 0;
      return this;
    }

    this.x /= length;
    this.y /= length;
    return this;
  }

  static add(a, b) {
    return new Vec2(a.x + b.x, a.y + b.y);
  }

  static subtract(a, b) {
    return new Vec2(a.x - b.x, a.y - b.y);
  }

  static multiplyScalar(vector, value) {
    return new Vec2(vector.x * value, vector.y * value);
  }

  static distance(a, b) {
    return Math.sqrt(Vec2.distanceSquared(a, b));
  }

  static distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  static fromAngle(angle, length = 1) {
    return new Vec2(Math.cos(angle) * length, Math.sin(angle) * length);
  }

  static lerp(a, b, alpha) {
    return new Vec2(a.x + (b.x - a.x) * alpha, a.y + (b.y - a.y) * alpha);
  }
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeAngle(angle) {
  const tau = Math.PI * 2;
  return ((angle % tau) + tau) % tau;
}

export function shortestAngleDifference(a, b) {
  const tau = Math.PI * 2;
  let difference = normalizeAngle(b) - normalizeAngle(a);
  if (difference > Math.PI) difference -= tau;
  if (difference < -Math.PI) difference += tau;
  return difference;
}
