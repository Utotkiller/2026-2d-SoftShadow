import { Vec2, clamp } from '../math/Vec2.js';
import { RectangleOccluder } from './Occluder.js';

const LAYOUT = [
  [-0.43, -0.27], [-0.36, -0.12], [-0.31, 0.10], [-0.25, 0.10], [-0.19, 0.10], [-0.26, 0.32],
  [-0.03, -0.27], [0.16, -0.36], [0.25, -0.18], [0.10, 0.08],
  [0.34, -0.30], [0.45, -0.15], [0.40, 0.06], [0.51, 0.22], [0.34, 0.33], [0.51, 0.47],
  [0.05, 0.31], [0.17, 0.26], [0.27, 0.37]
];

export class Scene {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.character = {
      position: new Vec2(width * 0.48, height * 0.52),
      radius: 18,
      angle: -Math.PI * 0.5,
      speed: 255
    };
    this.characterLight = {
      radius: 420,
      intensity: 1
    };
    this.centerField = {
      center: new Vec2(width * 0.5, height * 0.5),
      radius: Math.max(width, height) * 0.78,
      hueOffset: 150,
      brightness: 1
    };
    this.shadowSoftness = 1.0;
    this.debug = false;
    this.occluders = [];
    this.reset(width, height);
  }

  reset(width = this.width, height = this.height) {
    this.width = width;
    this.height = height;
    this.character.position.set(width * 0.48, height * 0.52);
    this.centerField.center.set(width * 0.5, height * 0.5);
    this.centerField.radius = Math.max(width, height) * 0.78;

    const size = clamp(Math.min(width, height) * 0.075, 42, 68);
    this.character.radius = Math.max(15, size * 0.32);
    this.characterLight.radius = clamp(Math.max(width, height) * 0.52, 300, 620);

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
    const direction = new Vec2();

    if (input.isDown('w', 'arrowup')) direction.y -= 1;
    if (input.isDown('s', 'arrowdown')) direction.y += 1;
    if (input.isDown('a', 'arrowleft')) direction.x -= 1;
    if (input.isDown('d', 'arrowright')) direction.x += 1;

    if (direction.lengthSquared() > 0) {
      direction.normalize().multiplyScalar(this.character.speed * deltaSeconds);
      this.character.position.add(direction);
    }

    if (input.pointerDown) {
      const pull = Vec2.lerp(this.character.position, input.pointer, 1 - Math.exp(-14 * deltaSeconds));
      this.character.position.copy(pull);
    }

    if (input.pointerInside) {
      const aim = Vec2.subtract(input.pointer, this.character.position);
      if (aim.lengthSquared() > 16) {
        this.character.angle = Math.atan2(aim.y, aim.x);
      }
    }

    this.character.position.x = clamp(this.character.position.x, 24, this.width - 24);
    this.character.position.y = clamp(this.character.position.y, 24, this.height - 24);

    if (input.wasPressed('r')) this.reset(this.width, this.height);
    if (input.wasPressed('d')) this.debug = !this.debug;
    if (input.wasPressed('[')) this.shadowSoftness = clamp(this.shadowSoftness - 0.1, 0.2, 2.2);
    if (input.wasPressed(']')) this.shadowSoftness = clamp(this.shadowSoftness + 0.1, 0.2, 2.2);
    if (input.wasPressed('-')) this.characterLight.radius = clamp(this.characterLight.radius - 30, 180, 780);
    if (input.wasPressed('=')) this.characterLight.radius = clamp(this.characterLight.radius + 30, 180, 780);
  }
}
