# Welding cell 3D view

The 3D view with the welding cell's hall, polished floor, cube-mapped car, glossy paint and welding sparks, smoke and arc light.

An [EsaSim](https://esacode.com/) blueprint block: a view that draws in the browser, in JavaScript (`frontend.js`, `function render(ctx)`).

| | |
|---|---|
| Block | `ws-welding-cell-3d-view-2` · version 2 |
| Workspace | Gianluca De Novi's workspace |
| Author | Gianluca De Novi |

## Inputs

| Port | Type | Description |
|---|---|---|
| `scene` Scene or 3D files | Anything (json, gz, glb, gltf, obj, stl, ply) | A scene (esasim.scene/1 JSON), 3D models, a robot model (.robot.json.gz) and/or live telemetry Several connections. |

## Use it in EsaSim

In a workspace, open **Projects > Blocks > New block**, choose this kind of block, copy the ports and settings above and paste the code; or ask an AI assistant connected to EsaSim (MCP) to create it from this folder.
