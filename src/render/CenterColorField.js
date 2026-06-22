import { clamp } from '../math/Vec2.js';
import { hsvToRgb } from '../math/color.js';

export class CenterColorField {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d', { alpha: true });
    this.width = 0;
    this.height = 0;
  }

  rebuild(width, height, field) {
    const scale = 0.42;
    const bufferWidth = Math.max(1, Math.floor(width * scale));
    const bufferHeight = Math.max(1, Math.floor(height * scale));

    this.width = width;
    this.height = height;
    this.canvas.width = bufferWidth;
    this.canvas.height = bufferHeight;

    const image = this.context.createImageData(bufferWidth, bufferHeight);
    const data = image.data;
    const centerX = field.center.x * scale;
    const centerY = field.center.y * scale;
    const radius = field.radius * scale;

    for (let y = 0; y < bufferHeight; y += 1) {
      for (let x = 0; x < bufferWidth; x += 1) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const radial = clamp(1 - distance / radius, 0, 1);
        const softened = radial * radial * (3 - 2 * radial);
        const angle = Math.atan2(dy, dx);
        const hue = ((angle / (Math.PI * 2)) * 360 + field.hueOffset + 360) % 360;
        const rgb = hsvToRgb(hue, 0.68, 1.0);
        const index = (y * bufferWidth + x) * 4;

        data[index] = rgb.r;
        data[index + 1] = rgb.g;
        data[index + 2] = rgb.b;
        data[index + 3] = Math.round(255 * softened * 0.82 * field.brightness);
      }
    }

    this.context.putImageData(image, 0, 0);
  }

  draw(context, width, height) {
    context.save();
    context.globalCompositeOperation = 'lighter';
    context.imageSmoothingEnabled = true;
    context.drawImage(this.canvas, 0, 0, width, height);
    context.restore();
  }
}
