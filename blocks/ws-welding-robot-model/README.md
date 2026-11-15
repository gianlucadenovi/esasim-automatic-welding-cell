# Welding cell model

The welding cell for EsaSim's 3D view: the four KUKA KR 210 robots with their swan-neck torches and the car body frame on its sled, one model with each part in its own material.

Wire the welding-cell-models dataset to Models and the Robot model output to a 3D view and to the Welding cell block's Robot model input (so the welding starts after it); wire the Welding cell block's telemetry to the same view (channels joints, scene, event). The cell is one model: the view moves the sled and the car (joints 1-6) and every robot (its heading, axes A1-A6, then the same undone before the next robot) with the angles of the joints channel; the model's joint list tells the Welding cell block what each angle is. Parts keep their glTF materials (orange castings, black motors, steel base, brass, nozzle and copper of the torch, the seam camera), and their sharp edges.

An [EsaSim](https://esacode.com/) blueprint block: it runs on a machine, in Python (`backend.py`, `def run(ctx)`).

| | |
|---|---|
| Block | `ws-welding-robot-model` · version 3 |
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
| `robot` Robot model | Files (gz) | welding_cell_all.robot.json.gz (esasim.robot/1 with its joint list): wire it to a 3D view and to the Welding cell block's Robot model input |

## Settings

| Key | Type | Default | Description |
|---|---|---|---|
| `robot` Robots | select | `"all four"` | All four needs a 3D view that reads more than 12 joints |
| `triangles` Robot: triangles at most | number | `40000` |  |
| `car_triangles` Car frame: triangles at most | number | `40000` |  |

## Use it in EsaSim

In a workspace, open **Projects > Blocks > New block**, choose this kind of block, copy the ports and settings above and paste the code; or ask an AI assistant connected to EsaSim (MCP) to create it from this folder.
