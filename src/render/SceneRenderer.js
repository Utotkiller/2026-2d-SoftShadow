import { rgba } from '../math/color.js';
import { CenterColorField } from './CenterColorField.js';
import { SoftShadowRenderer } from './SoftShadowRenderer.js';

export class SceneRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: false });
    this.dpr = 1;
    this.width = 1;
    this.height = 1;
    this.centerColorField = new CenterColorField();
    this.shadowRenderer = new SoftShadowRenderer();
  }

  resize(width, height, scene) {
    this.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2.5));
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.centerColorField.rebuild(this.width, this.height, scene.centerField);
  }

  draw(scene, input) {
    const context = this.context;
    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    context.clearRect(0, 0, this.width, this.height);

    this.drawBase(context);
    this.centerColorField.draw(context, this.width, this.height);
    this.drawCharacterLight(context, scene);
    this.shadowRenderer.draw(context, scene);
    this.drawOccluders(context, scene);
    this.drawCharacter(context, scene, input);
    this.drawReadout(context, scene);
  }

  drawBase(context) {
    const gradient = context.createRadialGradient(
      this.width * 0.5,
      this.height * 0.5,
      20,
      this.width * 0.5,
      this.height * 0.5,
      Math.max(this.width, this.height) * 0.8
    );

    gradient.addColorStop(0, '#222536');
    gradient.addColorStop(0.45, '#151720');
    gradient.addColorStop(1, '#0e0f13');

    context.fillStyle = gradient;
    context.fillRect(0, 0, this.width, this.height);
  }

  drawCharacterLight(context, scene) {
    const light = scene.character.position;
    const radius = scene.characterLight.radius;
    const gradient = context.createRadialGradient(light.x, light.y, 0, light.x, light.y, radius);

    gradient.addColorStop(0, rgba(255, 245, 221, 0.64 * scene.characterLight.intensity));
    gradient.addColorStop(0.24, rgba(255, 228, 190, 0.26 * scene.characterLight.intensity));
    gradient.addColorStop(0.58, rgba(166, 190, 255, 0.08 * scene.characterLight.intensity));
    gradient.addColorStop(1, rgba(255, 255, 255, 0));

    context.save();
    context.globalCompositeOperation = 'lighter';
    context.fillStyle = gradient;
    context.fillRect(light.x - radius, light.y - radius, radius * 2, radius * 2);
    context.restore();
  }

  drawOccluders(context, scene) {
    for (const occluder of scene.occluders) {
      const left = occluder.left;
      const top = occluder.top;
      const size = occluder.size;
      const centerX = occluder.position.x;
      const centerY = occluder.position.y;

      context.save();
      context.shadowBlur = size * 0.38;
      context.shadowColor = 'rgba(255, 255, 255, 0.52)';
      context.fillStyle = 'rgba(255, 255, 255, 0.95)';
      context.fillRect(left, top, size, size);
      context.restore();

      const gradient = context.createRadialGradient(centerX, centerY, size * 0.10, centerX, centerY, size * 0.72);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.55, 'rgba(255, 255, 255, 0.94)');
      gradient.addColorStop(1, 'rgba(210, 214, 232, 0.76)');
      context.fillStyle = gradient;
      context.fillRect(left, top, size, size);

      context.strokeStyle = 'rgba(255, 255, 255, 0.32)';
      context.lineWidth = 1;
      context.strokeRect(left + 0.5, top + 0.5, size - 1, size - 1);
    }
  }

  drawCharacter(context, scene, input) {
    const character = scene.character;
    const radius = character.radius;

    context.save();
    context.translate(character.position.x, character.position.y);
    context.rotate(character.angle + Math.PI * 0.5);

    context.shadowBlur = 18;
    context.shadowColor = 'rgba(255, 232, 180, 0.42)';

    context.fillStyle = 'rgba(20, 23, 24, 0.96)';
    context.beginPath();
    context.ellipse(0, 0, radius * 0.82, radius * 1.08, 0, 0, Math.PI * 2);
    context.fill();

    context.shadowBlur = 0;
    context.strokeStyle = 'rgba(214, 218, 205, 0.88)';
    context.lineWidth = Math.max(2, radius * 0.16);
    context.beginPath();
    context.arc(0, 0, radius * 0.7, -Math.PI * 0.92, Math.PI * 0.24);
    context.stroke();

    context.fillStyle = 'rgba(88, 82, 67, 0.96)';
    context.beginPath();
    context.ellipse(-radius * 0.16, radius * 0.14, radius * 0.5, radius * 0.62, 0.26, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = 'rgba(12, 13, 15, 1)';
    context.lineWidth = Math.max(3, radius * 0.18);
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(radius * 0.1, -radius * 0.32);
    context.lineTo(radius * 0.25, -radius * 1.25);
    context.stroke();

    context.restore();

    if (input.pointerInside) {
      context.save();
      context.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(character.position.x, character.position.y);
      context.lineTo(input.pointer.x, input.pointer.y);
      context.stroke();
      context.restore();
    }
  }

  drawReadout(context, scene) {
    context.save();
    context.font = '12px ui-monospace, SFMono-Regular, Consolas, monospace';
    context.fillStyle = 'rgba(255, 255, 255, 0.65)';
    context.textBaseline = 'top';
    context.fillText(`softness ${scene.shadowSoftness.toFixed(1)} | radius ${Math.round(scene.characterLight.radius)} | debug ${scene.debug ? 'on' : 'off'}`, 16, 16);
    context.restore();
  }
}
