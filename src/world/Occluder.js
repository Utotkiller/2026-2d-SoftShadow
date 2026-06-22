import { Vec2, clamp } from '../math/Vec2.js';

export class RectangleOccluder {
  constructor(x, y, size, id) {
    this.position = new Vec2(x, y);
    this.velocity = new Vec2();
    this.size = size;
    this.id = id;
    this.mass = 1;
    this.restitution = 0.08;
  }

  get left() {
    return this.position.x - this.size * 0.5;
  }

  get right() {
    return this.position.x + this.size * 0.5;
  }

  get top() {
    return this.position.y - this.size * 0.5;
  }

  get bottom() {
    return this.position.y + this.size * 0.5;
  }

  contains(point) {
    return point.x >= this.left && point.x <= this.right && point.y >= this.top && point.y <= this.bottom;
  }

  corners() {
    return [
      new Vec2(this.left, this.top),
      new Vec2(this.right, this.top),
      new Vec2(this.right, this.bottom),
      new Vec2(this.left, this.bottom)
    ];
  }

  integrate(deltaSeconds) {
    this.position.add(Vec2.multiplyScalar(this.velocity, deltaSeconds));

    const damping = Math.exp(-7.5 * deltaSeconds);
    this.velocity.multiplyScalar(damping);

    if (this.velocity.lengthSquared() < 0.04) {
      this.velocity.set(0, 0);
    }
  }

  clampToBounds(width, height) {
    const half = this.size * 0.5;
    const beforeX = this.position.x;
    const beforeY = this.position.y;

    this.position.x = clamp(this.position.x, half, width - half);
    this.position.y = clamp(this.position.y, half, height - half);

    if (this.position.x !== beforeX) {
      this.velocity.x *= -this.restitution;
    }

    if (this.position.y !== beforeY) {
      this.velocity.y *= -this.restitution;
    }
  }
}
