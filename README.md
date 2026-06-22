# Soft Shadow Lighting

A top-down 2D canvas renderer where the character is the moving light source. White square blockers cast layered soft shadow wedges, while a static center-map chromatic field creates the circular red/green/blue ambient look.

This is intentionally not a collision or rigid-body project. The core is light geometry, shadow projection, and visual rendering.

## Features

- Character-driven light source
- Static center chromatic field using angle-based hue mapping
- Rectangle occluders
- Umbra shadow body projected away from the character
- Layered penumbra fans for soft shadow edges
- Glowing white blockers
- Simple top-down character rendering
- Debug rays and shadow projection lines
- No build-time runtime dependency beyond a static file server

## Controls

| Input | Action |
| --- | --- |
| WASD / Arrow keys | Move character light |
| Hold mouse | Pull character light toward pointer |
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
    color.js            HSV/RGB utilities
  render/
    CenterColorField.js angle-based radial color field
    SceneRenderer.js    main canvas draw pipeline
    SoftShadowRenderer.js projected umbra + penumbra geometry
  world/
    Occluder.js         rectangle blocker geometry
    Scene.js            character, lights, blocker layout, controls
```

## Shadow model

Each rectangle is treated as an occluder. The renderer finds the rectangle's angular silhouette from the character light, then projects the two silhouette endpoints away from the light.

The hard center shadow is a projected quad:

```txt
A ---- B
|      |
A'--- B'
```

Softness is faked by drawing layered triangular penumbra fans on both sides of the projected shadow. Alpha falls off per layer, which creates the transparent wedge effect without requiring a blur pass.
