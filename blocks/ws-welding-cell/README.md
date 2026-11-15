# Welding cell

Four KUKA KR 210 robots weld a car body frame on a sled: a laser seam camera with a learned network finds the car (±3 cm) and tracks every seam; learn on the GPU, then run the line car after car.

What to do: Learn to follow the seams (NVIDIA GPU) trains the seam camera's network on simulated laser profiles and, every couple of minutes, welds a whole car with it in the 3D view; the network goes out as seam_tracker_<date>_<p95>um.pt (send it to a dataset wired back to Seam tracker so learning goes on from it). Run the production line (any machine) welds car after car with the newest network: the sled brings the car in (it stops within ±3 cm), the four robots read two reference points each with their laser line and find the car's position and turn, then weld their seams following the camera, and the car leaves for the next one. Seam camera off (or no network yet) welds the taught programme as it is, to compare. Results: every weld (worst and mean distance from the real seam, in mm) and every car (where it really was and where the robots found it, cycle time).

An [EsaSim](https://esacode.com/) blueprint block: it runs on a machine, in Python (`backend.py`, `def run(ctx)`).

| | |
|---|---|
| Block | `ws-welding-cell` · version 1 |
| Workspace | Gianluca De Novi's workspace |
| Author | Gianluca De Novi |
| Runs on | Any machine, NVIDIA GPU |

## Inputs

| Port | Type | Description |
|---|---|---|
| `tracker` Seam tracker | Files (pt) | The weld-tracker dataset (seam_tracker_*.pt): the line uses the newest; learning goes on from it Several connections. Optional. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `tracker` Seam tracker | Files (pt) | Learn: seam_tracker_<date>_<p95>um.pt (the network and its scores) |
| `curve` Learning curve | Table (csv) | Learn: training.csv, every 15 s |
| `welds` Welds | Table (csv) | Line: welds.csv, one row per seam of every car |
| `cars` Cars | Table (csv) | Line: cars.csv, where each car really was and where the robots found it, cycle time, worst weld |
| `metadata` Summary | Files (json) |  |

## Settings

| Key | Type | Default | Description |
|---|---|---|---|
| `mode` What to do | select | `"Learn to follow the seams"` |  |
| `accelerator` Accelerator (learning) | select | `"auto"` |  |
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
