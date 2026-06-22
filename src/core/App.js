import { Input } from './Input.js';
import { Scene } from '../world/Scene.js';
import { SceneRenderer } from '../render/SceneRenderer.js';

export class App {
  constructor(canvas) {
    this.canvas = canvas;
    this.input = new Input(canvas);
    this.scene = new Scene(window.innerWidth, window.innerHeight);
    this.renderer = new SceneRenderer(canvas);
    this.lastTime = performance.now();
    this.accumulatedResize = true;

    window.addEventListener('resize', () => {
      this.accumulatedResize = true;
    });
  }

  start() {
    this.resizeIfNeeded();
    requestAnimationFrame((time) => this.frame(time));
  }

  frame(time) {
    const deltaSeconds = Math.min(0.05, Math.max(0, (time - this.lastTime) / 1000));
    this.lastTime = time;

    this.resizeIfNeeded();
    this.scene.update(deltaSeconds, this.input);
    this.renderer.draw(this.scene, this.input);
    this.input.consumeFrameState();

    requestAnimationFrame((nextTime) => this.frame(nextTime));
  }

  resizeIfNeeded() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (!this.accumulatedResize && width === this.scene.width && height === this.scene.height) {
      return;
    }

    this.accumulatedResize = false;
    this.scene.resize(width, height);
    this.renderer.resize(width, height, this.scene);
  }
}
