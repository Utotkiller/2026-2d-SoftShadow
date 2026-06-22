import { rgba } from '../math/color.js';
import { clamp } from '../math/Vec2.js';
import { SoftShadowRenderer } from './SoftShadowRenderer.js';

export class SceneRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: false });
    this.dpr = 1;
    this.width = 1;
    this.height = 1;
    this.shadowRenderer = new SoftShadowRenderer();
  }

  resize(width, height) {
    this.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2.5));
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  draw(scene) {
    const context = this.context;
    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    context.clearRect(0, 0, this.width, this.height);

    this.drawBase(context);
    this.drawCharacterLight(context, scene);
    this.drawOccluders(context, scene);
    this.shadowRenderer.draw(context, scene);
    this.drawCharacter(context, scene);
    this.drawReadout(context, scene);
  }

  drawBase(context) {
    context.fillStyle = '#06070a';
    context.fillRect(0, 0, this.width, this.height);
  }

  drawCharacterLight(context, scene) {
    const light = scene.character.position;
    const radius = scene.characterLight.radius;
    const gradient = context.createRadialGradient(light.x, light.y, 0, light.x, light.y, radius);

    gradient.addColorStop(0, rgba(255, 246, 218, 0.82 * scene.characterLight.intensity));
    gradient.addColorStop(0.22, rgba(255, 244, 220, 0.36 * scene.characterLight.intensity));
    gradient.addColorStop(0.64, rgba(255, 244, 220, 0.09 * scene.characterLight.intensity));
    gradient.addColorStop(1, rgba(255, 255, 255, 0));

    context.save();
    context.globalCompositeOperation = 'lighter';
    context.fillStyle = gradient;
    context.fillRect(light.x - radius, light.y - radius, radius * 2, radius * 2);
    context.restore();
  }

  drawOccluders(context, scene) {
    for (const box of scene.occluders) {
      const lightDistance = Math.hypot(box.position.x - scene.character.position.x, box.position.y - scene.character.position.y);
      const lightAmount = clamp(1 - lightDistance / scene.characterLight.radius, 0, 1);
      const shade = Math.round(54 + 190 * lightAmount * lightAmount);
      const edge = Math.round(82 + 150 * lightAmount);

      context.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
      context.fillRect(box.left, box.top, box.size, box.size);

      context.fillStyle = `rgba(255, 255, 255, ${0.08 + lightAmount * 0.20})`;
      context.fillRect(box.left + 3, box.top + 3, box.size - 6, box.size - 6);

      context.strokeStyle = `rgb(${edge}, ${edge}, ${edge})`;
      context.lineWidth = 1;
      context.strokeRect(box.left + 0.5, box.top + 0.5, box.size - 1, box.size - 1);
    }
  }

  drawCharacter(context, scene) {
    const character = scene.character;
    const radius = character.radius;

    context.save();
    context.translate(character.position.x, character.position.y);

    context.shadowBlur = 22;
    context.shadowColor = 'rgba(255, 239, 190, 0.55)';
    context.fillStyle = 'rgba(18, 21, 24, 1)';
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();

    context.shadowBlur = 0;
    context.strokeStyle = 'rgba(255, 250, 230, 0.92)';
    context.lineWidth = Math.max(2, radius * 0.16);
    context.beginPath();
    context.arc(0, 0, radius - context.lineWidth * 0.5, 0, Math.PI * 2);
    context.stroke();

    context.fillStyle = 'rgba(255, 238, 186, 0.22)';
    context.beginPath();
    context.arc(0, 0, radius * 0.48, 0, Math.PI * 2);
    context.fill();

    context.restore();
  }

  drawReadout(context, scene) {
    context.save();
    context.font = '12px ui-monospace, SFMono-Regular, Consolas, monospace';
    context.fillStyle = 'rgba(255, 255, 255, 0.72)';
    context.textBaseline = 'top';
    context.fillText(`softness ${scene.shadowSoftness.toFixed(1)} | radius ${Math.round(scene.characterLight.radius)} | boxes push | debug ${scene.debug ? 'on' : 'off'}`, 16, 16);
    context.restore();
  }
}
