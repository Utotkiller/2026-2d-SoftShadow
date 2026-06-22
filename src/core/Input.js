import { Vec2 } from '../math/Vec2.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pointer = new Vec2();
    this.pointerDown = false;
    this.pointerInside = false;
    this.justPressed = new Set();

    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (!this.keys.has(key)) {
        this.justPressed.add(key);
      }
      this.keys.add(key);

      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        event.preventDefault();
      }
    });

    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
    });

    canvas.addEventListener('pointermove', (event) => this.updatePointer(event));
    canvas.addEventListener('pointerdown', (event) => {
      this.pointerDown = true;
      this.updatePointer(event);
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointerup', (event) => {
      this.pointerDown = false;
      this.updatePointer(event);
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    });
    canvas.addEventListener('pointerenter', () => {
      this.pointerInside = true;
    });
    canvas.addEventListener('pointerleave', () => {
      this.pointerInside = false;
      this.pointerDown = false;
    });
  }

  updatePointer(event) {
    const bounds = this.canvas.getBoundingClientRect();
    this.pointer.x = event.clientX - bounds.left;
    this.pointer.y = event.clientY - bounds.top;
    this.pointerInside = true;
  }

  isDown(...keys) {
    return keys.some((key) => this.keys.has(key.toLowerCase()));
  }

  wasPressed(key) {
    return this.justPressed.has(key.toLowerCase());
  }

  consumeFrameState() {
    this.justPressed.clear();
  }
}
