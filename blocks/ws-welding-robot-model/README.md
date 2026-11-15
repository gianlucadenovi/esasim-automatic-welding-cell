# Welding robot model

One of the welding cell's four KUKA KR 210 robots, with its swan-neck torch, as a robot model for EsaSim's 3D view, placed where it stands in the cell.

Wire the welding-cell-models dataset to Models and the Robot model output to a 3D view; wire the Welding cell block's telemetry to the same view (channels joints, scene, event). The block finishes in seconds, so the view has the robot while the welding cell runs beside it: the robot moves with its joints (j1 to j6, j7 = the torch), and the rails, sled, car floor and every seam of the car (blue to weld, orange welded, grey for the other robots' seams) come on the scene channel. Pick the same robot here and in the Welding cell block.

An [EsaSim](https://esacode.com/) blueprint block: it runs on a machine, in Python (`backend.py`, `def run(ctx)`).

| | |
|---|---|
| Block | `ws-welding-robot-model` · version 1 |
| Workspace | Gianluca De Novi's workspace |
| Author | Gianluca De Novi |
| Runs on | Any machine |

## Inputs

| Port | Type | Description |
|---|---|---|
| `models` Models | Files (glb) | The welding-cell-models dataset (kr210_weld.glb is used); without it, boxes stand in Several connections. Optional. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `robot` Robot model | Files (gz) | kr210_<robot>.robot.json.gz (esasim.robot/1): wire it to a 3D view, with the Welding cell block's telemetry (channels joints, scene) |

## Settings

| Key | Type | Default | Description |
|---|---|---|---|
| `robot` Robot | select | `"front right"` | The same as the Welding cell block's setting 3D view: robot shown live |
| `triangles` Triangles at most | number | `40000` |  |

## Use it in EsaSim

In a workspace, open **Projects > Blocks > New block**, choose this kind of block, copy the ports and settings above and paste the code; or ask an AI assistant connected to EsaSim (MCP) to create it from this folder.
