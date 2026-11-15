# Welding cell 3D view

The car factory welding cell live in 3D: rail and sled, the car body frame, four KUKA robots with torches and laser seam cameras, sparks, seams turning to welds, and the seam cameras' laser profiles.

Wire the Welding cell block's telemetry (through a Telemetry block, channels cell, event, sensor, line, train) to Live, and a dataset with kr210_weld.glb and the car frame (.glb) to Models; without models, simple stand-ins are drawn. Buttons: Cell, Top, Along the rail, the robots, and Follow torch 1 / 3 (the camera rides with the torch). The bottom row shows each robot's last laser profile: red dots the profile, the green ring where the network says the joint is, the white cross where it really is (mm across / in depth).

An [EsaSim](https://esacode.com/) blueprint block: a view that draws in the browser, in JavaScript (`frontend.js`, `function render(ctx)`).

| | |
|---|---|
| Block | `ws-welding-cell-3d-view` · version 1 |
| Workspace | Gianluca De Novi's workspace |
| Author | Gianluca De Novi |

## Inputs

| Port | Type | Description |
|---|---|---|
| `live` Live | Stream | The Welding cell block's telemetry |
| `models` Models | Files (glb) | kr210_weld.glb and the car frame Several connections. Optional. |

## Settings

| Key | Type | Default | Description |
|---|---|---|---|
| `quality` Quality | select | `"high"` |  |

## Use it in EsaSim

In a workspace, open **Projects > Blocks > New block**, choose this kind of block, copy the ports and settings above and paste the code; or ask an AI assistant connected to EsaSim (MCP) to create it from this folder.
