# Soft Shadow Lighting

A top-down 2D canvas renderer where the round character is the only light source. Square boxes collide with the character, can be pushed around, and cast soft shadows that darken the floor and other boxes behind them.

This project uses custom geometry and lightweight collision code. It does not use a rigid-body engine.

## Features

- Character-only light source
- No colored background light
- Round character body
- Circle-vs-box character collision
- Pushable square boxes
- Box-vs-box separation
- Rectangle occluders
- Umbra shadow body projected away from the character
- Layered penumbra fans for soft shadow edges
- Shadow occlusion checks so covered boxes do not keep casting impossible shadows
- Shadows render over world geometry so they can darken boxes behind other boxes
- Debug rays and shadow projection lines

## Controls

| Input | Action |
| --- | --- |
| WASD / Arrow keys | Move character light |
| Hold mouse | Move character toward pointer |
| D | Toggle debug rays |
| R | Reset layout |
| [ / ] | Decrease / increase shadow softness |
| - / = | Decrease / increase character light radius |

## Run

Use any static file server.

```bash
npm install
npm run dev
```

Or, without installing packages:

```bash
python -m http.server 5173
```

Then open `http://localhost:5173`.

## Architecture

```txt
src/
  core/
    App.js              requestAnimationFrame loop, resize, update/render order
    Input.js            keyboard and pointer state
  math/
    Vec2.js             vector math and clamping helpers
    color.js            RGB/RGBA utilities
  render/
    SceneRenderer.js    main canvas draw pipeline
    SoftShadowRenderer.js projected umbra + penumbra geometry and occlusion checks
  world/
    Occluder.js         pushable rectangle blocker state
    Scene.js            character, boxes, collision, controls
```

## Shadow model

Each rectangle is treated as an occluder. The renderer finds the rectangle's angular silhouette from the character light, then projects the two silhouette endpoints away from the light.

The hard center shadow is a projected quad:

```txt
A ---- B
|      |
A'--- B'
```

Softness is faked by drawing layered triangular penumbra fans on both sides of the projected shadow. Alpha falls off per layer.

The renderer also samples visibility from the character light to each box. If another box blocks those samples, the covered box is treated as unlit and does not cast a fake extra shadow. Shadows are drawn after the boxes, so the dark region can cover boxes and other scene elements like a real shadow mask.
