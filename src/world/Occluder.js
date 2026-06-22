import { Vec2 } from '../math/Vec2.js';

export class RectangleOccluder {
  constructor(x, y, size, id) {
    this.position = new Vec2(x, y);
    this.size = size;
    this.id = id;
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
}
