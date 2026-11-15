# Welding cell

Four KUKA KR 210 robots weld a car body frame on a sled: a laser seam camera with a learned network finds the car (±3 cm) and tracks every seam; learn on the GPU (or the CPU), then run the line car af

What to do: Learn to follow the seams trains the seam camera's network on simulated laser profiles (on an NVIDIA GPU when the machine has one, otherwise on the CPU, with Accelerator auto) and, every couple of minutes, welds a whole car with it; the network goes out as seam_tracker_<date>_<p95>um.pt (send it to a dataset wired back to Seam tracker so learning goes on from it). Run the production line (any machine) welds car after car with the newest network: the sled brings the car in (it stops within ±3 cm), the four robots read two reference points each with their laser line and find the car's position and turn, then weld their seams following the camera, and the car leaves for the next one. Seam camera off (or no network yet) welds the taught programme as it is, to compare. Each robot works out by itself which way round to weld each seam, how to lean the torch and from which arm pose. 3D, live: wire this block's telemetry and the Welding robot model block's output to a 3D view (and that output also to Robot model here, so this block starts after it): one robot (3D view: robot shown live) and the car frame on its sled move with the twelve angles of the joints channel while the cars are welded, with the rails and the car's seams (blue to weld, orange welded) from the scene channel. 3D, replay: wire the welding-cell-models dataset (kr210_weld.glb, s15_frame.glb) to Models and the 3D scene output to another 3D view: when the block has finished, the newest five cars replay there with all four robots, the seams in yellow on the frame and a blue dot at each wire tip while it welds. Results: every weld (worst and mean distance from the real seam, in mm) and every car (where it really was and where the robots found it, cycle time).

An [EsaSim](https://esacode.com/) blueprint block: it runs on a machine, in Python (`backend.py`, `def run(ctx)`).

| | |
|---|---|
| Block | `ws-welding-cell` · version 6 |
| Workspace | Gianluca De Novi's workspace |
| Author | Gianluca De Novi |
| Runs on | Any machine, NVIDIA GPU |

## Inputs

| Port | Type | Description |
|---|---|---|
| `tracker` Seam tracker | Files (pt) | The weld-tracker dataset (seam_tracker_*.pt): the line uses the newest; learning goes on from it Several connections. Optional. |
| `models` Models | Files (glb) | The welding-cell-models dataset: kr210_weld.glb (the robot with its torch) and s15_frame.glb (the car frame). Without them, boxes stand in in the 3D view Several connections. Optional. |
| `robot` Robot model | Files (gz) | The Welding robot model block's output: the block starts after it, so the robot is already in the 3D view when the first car comes in Several connections. Optional. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `tracker` Seam tracker | Files (pt) | Learn: seam_tracker_<date>_<p95>um.pt (the network and its scores) |
| `curve` Learning curve | Table (csv) | Learn: training.csv, every 15 s |
| `welds` Welds | Table (csv) | Line: welds.csv, one row per seam of every car |
| `cars` Cars | Table (csv) | Line: cars.csv, where each car really was and where the robots found it, cycle time, worst weld |
| `scene` 3D scene | 3D scene (json, glb) | welding_cell.scene.json (esasim.scene/1: the newest five cars, every robot part posed) and the robot parts and car frame as GLB: wire it to a 3D view |
| `metadata` Summary | Files (json) |  |

## Settings

| Key | Type | Default | Description |
|---|---|---|---|
| `mode` What to do | select | `"Learn to follow the seams"` |  |
| `accelerator` Accelerator | select | `"auto"` | auto: an NVIDIA GPU when the machine has one, otherwise the CPU (learning is several times slower there). The production line needs no GPU |
| `view_robot` 3D view: robot shown live | select | `"front right"` | The robot whose joints go live to EsaSim's 3D view (the same as in the Welding robot model block) |
| `minutes` Learning: minutes at most | number | `20` |  |
| `target_mm` Learning: stop at (mm, 95 % of readings) | number | `0.3` |  |
| `batch` Learning: profiles per step | number | `2048` |  |
| `lr` Learning rate | number | `0.002` |  |
| `replay_every` Learning: weld a car every (s) | number | `120` |  |
| `from_scratch` Learning: start from scratch | bool | `false` |  |
| `tracker_file` Seam tracker file | text | `""` | Empty: the newest |
| `cars` Line: cars | number | `0` | 0: until the time limit |
| `max_minutes` Line: minutes at most | number | `30` |  |
| `weld_speed` Welding speed (mm/s) | number | `80` |  |
| `tolerance_mm` Weld tolerance (mm) | number | `1` | A seam passes when the wire never strays further than this from the real seam |
| `sled_error_mm` Sled stop accuracy (± mm) | number | `30` |  |
| `car_offset_mm` Car on the sled (± mm) | number | `8` |  |
| `car_turn_deg` Car turned on the sled (± deg) | number | `0.4` |  |
| `build_mm` Frame build variation (mm) | number | `1.2` | How far each car's seams wander from the drawing |
| `seam_camera` Seam camera | bool | `true` | Off: weld the taught programme as it is, to compare |
| `seed` Seed | number | `1` |  |

## Use it in EsaSim

In a workspace, open **Projects > Blocks > New block**, choose this kind of block, copy the ports and settings above and paste the code; or ask an AI assistant connected to EsaSim (MCP) to create it from this folder.
