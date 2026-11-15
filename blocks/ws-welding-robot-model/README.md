# Welding cell model

The welding cell for EsaSim's 3D view: the four KUKA KR 210 robots with their swan-neck torches and the car body frame on its sled, one model with each part in its own material.

Wire the welding-cell-models dataset to Models and the Robot model output to a 3D view and to the Welding cell block's Robot model input (so the welding starts after it); wire the Welding cell block's telemetry to the same view (channels joints, scene, event). The cell is one model: the view moves the sled and the car (joints 1-6) and every robot (its heading, axes A1-A6, then the same undone before the next robot) with the angles of the joints channel; the model's joint list tells the Welding cell block what each angle is. The car frame is satin silver; as the robots weld, dark weld beads appear on it right behind each torch and stay there until the car has left, and a glow at each wire shows the arc. Robot parts keep their glTF colours (orange castings, black motors, steel base, brass, nozzle and copper of the torch, the seam camera) and their sharp edges; the car frame's open panels show from both sides.

An [EsaSim](https://esacode.com/) blueprint block: it runs on a machine, in Python (`backend.py`, `def run(ctx)`).

| | |
|---|---|
| Block | `ws-welding-robot-model` · version 5 |
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
| `robot` Robot model | Files (gz) | welding_cell_all.robot.json.gz (esasim.robot/1 with its joint list, weld beads and arcs): wire it to a 3D view and to the Welding cell block's Robot model input |

## Settings

| Key | Type | Default | Description |
|---|---|---|---|
| `robot` Robots | select | `"all four"` |  |
| `triangles` Robot: triangles at most | number | `40000` |  |
| `car_triangles` Car frame: triangles at most | number | `0` | 0: the whole frame as it is in the GLB |

## Use it in EsaSim

In a workspace, open **Projects > Blocks > New block**, choose this kind of block, copy the ports and settings above and paste the code; or ask an AI assistant connected to EsaSim (MCP) to create it from this folder.
