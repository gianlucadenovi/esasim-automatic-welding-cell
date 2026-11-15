# Welding robot model

One of the welding cell's four KUKA KR 210 robots with its swan-neck torch, and the car body frame on its sled, as one model for EsaSim's 3D view, placed where they are in the cell.

Wire the welding-cell-models dataset to Models and the Robot model output to a 3D view (and to the Welding cell block's Robot model input, so the welding starts after it); wire the Welding cell block's telemetry to the same view (channels joints, scene, event). The robot and the car frame on its sled are one model: the view moves them with the twelve angles of the joints channel (1-6: the sled and the car along the rail, across it and turned, then undone; 7-12: the robot), and draws the rails, the other pedestals and the car's seams (blue to weld, orange welded, grey for the other robots' seams) from the scene channel. Pick the same robot here and in the Welding cell block.

An [EsaSim](https://esacode.com/) blueprint block: it runs on a machine, in Python (`backend.py`, `def run(ctx)`).

| | |
|---|---|
| Block | `ws-welding-robot-model` · version 2 |
| Workspace | Gianluca De Novi's workspace |
| Author | Gianluca De Novi |
| Runs on | Any machine |

## Inputs

| Port | Type | Description |
|---|---|---|
| `models` Models | Files (glb) | The welding-cell-models dataset: kr210_weld.glb (the robot) and s15_frame.glb (the car frame); without them, boxes stand in Several connections. Optional. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `robot` Robot model | Files (gz) | kr210_<robot>.robot.json.gz (esasim.robot/1): wire it to a 3D view, with the Welding cell block's telemetry (channels joints, scene) |

## Settings

| Key | Type | Default | Description |
|---|---|---|---|
| `robot` Robot | select | `"front right"` | The same as the Welding cell block's setting 3D view: robot shown live |
| `triangles` Robot: triangles at most | number | `40000` |  |
| `car_triangles` Car frame: triangles at most | number | `40000` |  |

## Use it in EsaSim

In a workspace, open **Projects > Blocks > New block**, choose this kind of block, copy the ports and settings above and paste the code; or ask an AI assistant connected to EsaSim (MCP) to create it from this folder.
