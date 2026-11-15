# Welding cell

Four KUKA KR 210 robots weld a car body frame on a sled: a laser seam camera with a learned network finds the car (±3 cm) and tracks every seam, without the robots touching the car or each other; lear

What to do: Learn to follow the seams trains the seam camera's network on simulated laser profiles (on an NVIDIA GPU when the machine has one, otherwise on the CPU, with Accelerator auto) and, every few minutes, welds a whole car with it; the network goes out as seam_tracker_<date>_<p95>um.pt (send it to a dataset wired back to Seam tracker so learning goes on from it). Run the production line (any machine) welds car after car with the newest network: the sled brings the car in (it stops within ±3 cm), the four robots read two reference points each with their laser line and find the car's position and turn, then weld their seams following the camera, and the car leaves for the next one. The robots must not touch the car nor each other: with the robot and car models wired to Models, every robot welds each seam with a torch lean that keeps its arm 15 mm and its torch 6 mm from the car wherever the sled stops (the lean found once is stored and checked again at the start), every move keeps clear of the car (over raised via poses when the straight way does not), and the torch stays off the sheet while it scans; every car is checked afterwards, and the least distances to the car and between robots and any moments of contact are in the results, the events and the learning scores. Seam camera off (or no network yet) welds the taught programme as it is, to compare. 3D: wire the Welding cell model block's output to a 3D view and to Robot model here, and this block's telemetry to the same view: the car frame on its sled and the four robots move there while the cars are welded, the arc glows at each wire, and the welds appear on the car as dark beads right behind each torch and stay on it until it leaves. Results: every weld (worst and mean distance from the real seam, in mm) and every car (where it really was and where the robots found it, cycle time, clearances).

An [EsaSim](https://esacode.com/) blueprint block: it runs on a machine, in Python (`backend.py`, `def run(ctx)`).

| | |
|---|---|
| Block | `ws-welding-cell` · version 11 |
| Workspace | Gianluca De Novi's workspace |
| Author | Gianluca De Novi |
| Runs on | Any machine, NVIDIA GPU |

## Inputs

| Port | Type | Description |
|---|---|---|
| `tracker` Seam tracker | Files (pt) | The weld-tracker dataset (seam_tracker_*.pt): the line uses the newest; learning goes on from it Several connections. Optional. |
| `models` Models | Files (glb) | The welding-cell-models dataset: kr210_weld.glb (the robot with its torch) and s15_frame.glb (the car frame): the robots' and the car's shapes for the collision checks, and the 3D scene output Several connections. Optional. |
| `robot` Robot model | Files (gz) | The Welding cell model block's output: its joint list, weld beads and arcs say what each joint of the joints channel is, and the block starts after it, so the cell is in the 3D view when the first car Several connections. Optional. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `tracker` Seam tracker | Files (pt) | Learn: seam_tracker_<date>_<p95>um.pt (the network and its scores) |
| `curve` Learning curve | Table (csv) | Learn: training.csv, every 15 s |
| `welds` Welds | Table (csv) | Line: welds.csv, one row per seam of every car |
| `cars` Cars | Table (csv) | Line: cars.csv, where each car really was and where the robots found it, cycle time, worst weld, closest the robots came to the car and to each other, moments of contact |
| `scene` 3D scene | 3D scene (json, glb) | welding_cell.scene.json (esasim.scene/1: the newest five cars, every robot part posed) and the robot parts and car frame as GLB, for a 3D view after the run |
| `metadata` Summary | Files (json) |  |

## Settings

| Key | Type | Default | Description |
|---|---|---|---|
| `mode` What to do | select | `"Learn to follow the seams"` |  |
| `accelerator` Accelerator | select | `"auto"` | auto: an NVIDIA GPU when the machine has one, otherwise the CPU (learning is several times slower there). The production line needs no GPU |
| `view_robot` 3D view: robot shown live | select | `"front right"` | Only for an older one-robot model without a joint list; the Welding cell model's list says which robots are shown |
| `minutes` Learning: minutes at most | number | `20` |  |
| `target_mm` Learning: stop at (mm, 95 % of readings) | number | `0.3` |  |
| `batch` Learning: profiles per step | number | `2048` |  |
| `lr` Learning rate | number | `0.002` |  |
| `replay_every` Learning: weld a car every (s) | number | `300` | Each car takes the machine about a minute and a half (the collision checks), and learning waits meanwhile |
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
