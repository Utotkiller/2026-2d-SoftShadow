# Soft Shadow Lighting

A top-down 2D canvas renderer where the round character is the only light source. Square boxes collide with the character, can be pushed when box pushing is enabled, and block light using ray visibility.

This project uses custom geometry and lightweight collision code. It does not use a rigid-body engine.

## Features

- Character-only light source
- No colored background light
- No shadow softness control
- No light radius control
- Round character body
- Circle-vs-box character collision
- Toggleable box pushing
- Box-vs-box separation while pushing is enabled
- Rectangle occluders
- Raycast visibility polygon instead of stacked shadow triangles
- No accumulating shadow overlap from repeated triangle wedges
- Optional light-ray visualization on `F`
- Square black HUD using `rgb(0, 0, 0)`

## Controls

| Input | Action |
| --- | --- |
| WASD / Arrow keys | Move character light |
| Hold mouse | Move character toward pointer |
| F | Toggle light rays |
| B | Toggle box pushing |
| R | Reset layout |

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
    SoftShadowRenderer.js raycast visibility polygon and light rays
  world/
    Occluder.js         pushable rectangle blocker state
    Scene.js            character, boxes, collision, controls
```

## Shadow model

The renderer casts rays from the character light to box corners, screen bounds, and evenly sampled radial angles. Every ray stops at the nearest blocking segment. The sorted hit points form a visibility polygon.

The character light is drawn only inside that visibility polygon. This means boxes physically block light, and the renderer does not stack independent shadow triangles on top of each other.
