import { App } from './core/App.js';

const canvas = document.querySelector('#scene');

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Canvas element #scene was not found.');
}

const app = new App(canvas);
app.start();
