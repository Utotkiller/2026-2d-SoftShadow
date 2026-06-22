import { Vec2, clamp } from '../math/Vec2.js';
import { RectangleOccluder } from './Occluder.js';

const LAYOUT = [
  [-0.43, -0.27], [-0.36, -0.12], [-0.31, 0.10], [-0.25, 0.10], [-0.19, 0.10], [-0.26, 0.32],
  [-0.03, -0.27], [0.16, -0.36], [0.25, -0.18], [0.10, 0.08],
  [0.34, -0.30], [0.45, -0.15], [0.40, 0.06], [0.51, 0.22], [0.34, 0.33], [0.51, 0.47],
  [0.05, 0.31], [0.17, 0.26], [0.27, 0.37]
];

function circleBox(circle, radius, box) {
  const nearestX = clamp(circle.x, box.left, box.right);
  const nearestY = clamp(circle.y, box.top, box.bottom);
  const dx = circle.x - nearestX;
  const dy = circle.y - nearestY;
  const distanceSquared = dx * dx + dy * dy;

  if (distanceSquared > 1e-8 && distanceSquared < radius * radius) {
    const distance = Math.sqrt(distanceSquared);
    return { normal: new Vec2(dx / distance, dy / distance), depth: radius - distance };
  }

  if (!box.contains(circle)) return null;

  const left = circle.x - box.left;
  const right = box.right - circle.x;
  const top = circle.y - box.top;
  const bottom = box.bottom - circle.y;
  const minimum = Math.min(left, right, top, bottom);

  if (minimum === left) return { normal: new Vec2(-1, 0), depth: radius + left };
  if (minimum === right) return { normal: new Vec2(1, 0), depth: radius + right };
  if (minimum === top) return { normal: new Vec2(0, -1), depth: radius + top };
  return { normal: new Vec2(0, 1), depth: radius + bottom };
}

function boxBox(a, b) {
  const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  if (overlapX <= 0 || overlapY <= 0) return null;

  if (overlapX < overlapY) {
    return { normal: new Vec2(a.position.x < b.position.x ? -1 : 1, 0), depth: overlapX };
  }

  return { normal: new Vec2(0, a.position.y < b.position.y ? -1 : 1), depth: overlapY };
}

export class Scene {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.character = {
      position: new Vec2(width * 0.48, height * 0.52),
      radius: 20,
      angle: -Math.PI * 0.5,
      speed: 285
    };
    this.characterLight = { radius: 530, intensity: 1 };
    this.showRays = false;
    this.boxPhysicsEnabled = true;
    this.occluders = [];
    this.reset(width, height);
  }

  reset(width = this.width, height = this.height) {
    this.width = width;
    this.height = height;
    this.character.position.set(width * 0.48, height * 0.52);
    this.character.angle = -Math.PI * 0.5;

    const size = clamp(Math.min(width, height) * 0.075, 42, 68);
    this.character.radius = clamp(size * 0.36, 17, 26);
    this.characterLight.radius = clamp(Math.max(width, height) * 0.48, 300, 620);

    this.occluders = LAYOUT.map(([nx, ny], index) => {
      const x = width * 0.5 + nx * width;
      const y = height * 0.5 + ny * height;
      return new RectangleOccluder(x, y, size, `block-${index}`);
    });
  }

  resize(width, height) {
    this.reset(width, height);
  }

  update(deltaSeconds, input) {
    if (input.wasPressed('r')) this.reset(this.width, this.height);
    if (input.wasPressed('f')) this.showRays = !this.showRays;
    if (input.wasPressed('b')) {
      this.boxPhysicsEnabled = !this.boxPhysicsEnabled;
      if (!this.boxPhysicsEnabled) this.stopBoxes();
    }

    if (this.boxPhysicsEnabled) {
      for (const box of this.occluders) {
        box.integrate(deltaSeconds);
        box.clampToBounds(this.width, this.height);
      }
    } else {
      this.stopBoxes();
    }

    const movement = this.readMovement(deltaSeconds, input);
    this.character.position.add(movement);
    this.updateCharacterAngle(movement, input);
    this.solveWorld(movement, deltaSeconds);
  }

  readMovement(deltaSeconds, input) {
    const direction = new Vec2();

    if (input.isDown('w', 'arrowup')) direction.y -= 1;
    if (input.isDown('s', 'arrowdown')) direction.y += 1;
    if (input.isDown('a', 'arrowleft')) direction.x -= 1;
    if (input.isDown('d', 'arrowright')) direction.x += 1;

    if (direction.lengthSquared() > 0) {
      return direction.normalize().multiplyScalar(this.character.speed * deltaSeconds);
    }

    if (!input.pointerDown) return new Vec2();

    const toPointer = Vec2.subtract(input.pointer, this.character.position);
    const distance = toPointer.length();
    if (distance <= 1) return new Vec2();

    const maxStep = this.character.speed * 1.25 * deltaSeconds;
    return toPointer.normalize().multiplyScalar(Math.min(distance, maxStep));
  }

  updateCharacterAngle(movement, input) {
    if (movement.lengthSquared() > 0.0001) {
      this.character.angle = Math.atan2(movement.y, movement.x);
      return;
    }

    if (!input.pointerInside) return;

    const aim = Vec2.subtract(input.pointer, this.character.position);
    if (aim.lengthSquared() > 16) {
      this.character.angle = Math.atan2(aim.y, aim.x);
    }
  }

  solveWorld(movement, deltaSeconds) {
    const speed = movement.length() / Math.max(deltaSeconds, 1 / 120);

    for (let pass = 0; pass < 6; pass += 1) {
      this.solveCharacterBoxes(movement, speed);
      if (this.boxPhysicsEnabled) this.solveBoxes();
      this.clampWorldBounds();
    }
  }

  solveCharacterBoxes(movement, speed) {
    for (const box of this.occluders) {
      const hit = circleBox(this.character.position, this.character.radius, box);
      if (!hit) continue;

      const intoBox = Math.max(0, -(movement.x * hit.normal.x + movement.y * hit.normal.y));
      const boxShare = this.boxPhysicsEnabled && intoBox > 0 ? 0.82 : 0;
      const characterShare = 1 - boxShare;
      const depth = hit.depth + 0.05;

      this.character.position.add(Vec2.multiplyScalar(hit.normal, depth * characterShare));
      box.position.add(Vec2.multiplyScalar(hit.normal, -depth * boxShare));

      if (this.boxPhysicsEnabled && intoBox > 0) {
        box.velocity.add(Vec2.multiplyScalar(hit.normal, -speed * 0.34));
      }
    }
  }

  solveBoxes() {
    for (let pass = 0; pass < 3; pass += 1) {
      for (let i = 0; i < this.occluders.length; i += 1) {
        for (let j = i + 1; j < this.occluders.length; j += 1) {
          const a = this.occluders[i];
          const b = this.occluders[j];
          const hit = boxBox(a, b);
          if (!hit) continue;

          const correction = hit.depth * 0.5 + 0.04;
          a.position.add(Vec2.multiplyScalar(hit.normal, correction));
          b.position.add(Vec2.multiplyScalar(hit.normal, -correction));

          const relativeVelocity = Vec2.subtract(a.velocity, b.velocity);
          const closingSpeed = relativeVelocity.x * hit.normal.x + relativeVelocity.y * hit.normal.y;
          if (closingSpeed < 0) {
            const impulse = -closingSpeed * 0.22;
            a.velocity.add(Vec2.multiplyScalar(hit.normal, impulse));
            b.velocity.add(Vec2.multiplyScalar(hit.normal, -impulse));
          }
        }
      }
    }
  }

  clampWorldBounds() {
    this.character.position.x = clamp(this.character.position.x, this.character.radius, this.width - this.character.radius);
    this.character.position.y = clamp(this.character.position.y, this.character.radius, this.height - this.character.radius);

    for (const box of this.occluders) {
      box.clampToBounds(this.width, this.height);
    }
  }

  stopBoxes() {
    for (const box of this.occluders) {
      box.velocity.set(0, 0);
    }
  }
}
