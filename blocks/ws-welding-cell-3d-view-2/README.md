# Welding cell 3D view

The 3D view with the welding cell's hall, polished floor, cube-mapped car, glossy paint, glowing weld beads, welding sparks, smoke, arc light and crackle.

The project's 3D view (1.47) with the robot-cell additions. The view itself is the project asset views/robot_cell_viewer.js (too large for a block); this block loads it and passes everything through. Wire the robot model (or scene, 3D files) into Scene or 3D files and the live telemetry into Live; the settings are those of the 3D view.

An [EsaSim](https://esacode.com/) blueprint block: a view that draws in the browser, in JavaScript (`frontend.js`, `function render(ctx)`).

| | |
|---|---|
| Block | `ws-welding-cell-3d-view-2` · version 3 |
| Workspace | Gianluca De Novi's workspace |
| Author | Gianluca De Novi |

## Inputs

| Port | Type | Description |
|---|---|---|
| `scene` Scene or 3D files | Anything (json, gz, glb, gltf, obj, stl, ply) | A scene (esasim.scene/1 JSON), 3D models or a robot model (.robot.json.gz) Several connections. |
| `live` Live | Stream | Live telemetry: the robots' joints, the scene, events and numbers Several connections. Optional. |

## Settings

| Key | Type | Default | Description |
|---|---|---|---|
| `environment` Environment | select | `"outdoor"` |  |
| `quality` Quality | select | `"high"` |  |
| `floor` Show the floor | bool | `true` |  |
| `models` Models | select | `"side by side"` |  |
| `textures` Tissue textures | bool | `true` |  |
| `metaballs` Show the metaballs | bool | `false` |  |
| `grid` Show the grid | bool | `true` |  |
| `trails` Show trajectories | bool | `true` |  |
| `speed` Playback speed | number | `1` |  |
| `model_for` Model for | text | `""` |  |
| `live_channel` Live channel | text | `""` |  |
| `joints_channel` Robot: joints channel | text | `"joints"` |  |
| `ghost_channel` Robot: twin channel | text | `"twin"` |  |
| `scene_channel` Robot: objects channel | text | `"scene"` |  |
| `delay` Robot: behind real time (seconds) | number | `1.2` |  |
| `mouse_speed` 3D mouse speed | number | `1` |  |
| `mouse_mode` 3D mouse moves | select | `"The camera"` |  |
| `numbers` Numbers | text | `""` |  |
| `events_channel` Events channel | text | `"event"` |  |
| `controls` Controls | textarea | `""` |  |
| `control_channel` Controls: channel | text | `"control"` |  |
| `routes` Fleets: show the routes | bool | `true` |  |
| `heat` Fleets: show the heat map | bool | `false` |  |
| `camera` Camera | select | `"free"` |  |

## Use it in EsaSim

In a workspace, open **Projects > Blocks > New block**, choose this kind of block, copy the ports and settings above and paste the code; or ask an AI assistant connected to EsaSim (MCP) to create it from this folder.
