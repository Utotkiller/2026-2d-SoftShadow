# Soft Shadow Lighting

This is a small 2D lighting demo where the player is the only light source.

Move the round character around the map and the boxes will block the light. The shadows are not drawn as random dark triangles anymore. The renderer casts rays from the character, finds what those rays hit first, and builds a visible light shape from that. Anything behind a box stays dark.

The boxes can also be pushed. Press `B` to turn box pushing on or off.

## What it does

- The character is the only light.
- The background stays black.
- Boxes block the light.
- The character is round and collides with boxes.
- Boxes can be pushed when box pushing is enabled.
- Light rays can be shown with `F`.
- The UI is plain black with square corners.
- The old overlapping triangle-shadow look has been replaced with a raycast visibility polygon.

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrow keys | Move the character |
| Hold mouse | Move toward the mouse pointer |
| F | Toggle light rays |
| B | Toggle box pushing |
| R | Reset the scene |

## Running it

Install the packages once:

```bash
npm install
```

Start the local server:

```bash
npm run dev
```

Open the local URL that Vite prints, usually:

```txt
http://localhost:5173
```

You can also run it without npm scripts by serving the folder directly:

```bash
python -m http.server 5173
```

## How the lighting works

The light starts at the character position. Each frame, the renderer builds a list of wall and box edges, then casts rays outward. Each ray stops at the closest edge it hits.

Those hit points are sorted by angle and connected into one visibility polygon. The character light is drawn only inside that polygon, so boxes naturally cut holes out of the light.

This avoids stacking separate shadow triangles on top of each other. It is simpler, cleaner, and closer to how real line-of-sight lighting behaves in a top-down 2D scene.

## Project layout

```txt
src/
  core/
    App.js
    Input.js
  math/
    Vec2.js
    color.js
  render/
    SceneRenderer.js
    SoftShadowRenderer.js
  world/
    Occluder.js
    Scene.js
```

## Notes

This is not using a physics engine. The character and boxes use simple custom collision code because the project is focused on lighting, shadows, and readable geometry.
