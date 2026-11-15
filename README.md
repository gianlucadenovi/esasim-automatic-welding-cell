<div align="center">

<!-- Banner: upload a picture named banner.png under Data › Readme pictures; it shows here. -->

# Automatic welding cell

**Four KUKA KR 210 robots weld a car body frame brought in on a sled: laser seam cameras with a learned network find the car (±3 cm) and follow every seam.**

Learn on the GPU, then run the line car after car, live in 3D.

![type](https://img.shields.io/badge/type-Manufacturing%20%26%20logistics-blue) ![language](https://img.shields.io/badge/language-Python-3776AB) ![runs on](https://img.shields.io/badge/runs%20on-CPU%20%7C%20NVIDIA-6f42c1) [![made with](https://img.shields.io/badge/made%20with-EsaSim-0b7285)](https://esacode.com/)

<!-- More badges: ![licence](https://img.shields.io/badge/licence-MIT-green) — label, value and colour, written in the address. -->

</div>

## Flows

- **1 · Learn to follow the seams**: The seam cameras' network learns on the GPU to find the joint in laser profiles; every two minutes a whole car is welded with it, live in 3D. The network goes to the weld-tracker dataset.
- **2 · Production line**: Car after car: the sled brings the frame in, the four robots find it with their laser cameras, weld their quarter of it following the seams, and the car slides out for the next one.

## What you need

- A machine with the EsaSim worker (Project > Compute); it runs on any machine, faster with: NVIDIA GPU.
- Data it reads: the dataset **welding-cell-models** of the workspace, read by *welding-cell-models (robot, car frame)*.
- Python packages, installed by the worker the first time: `numpy`, `trimesh`, `fast-simplification`, `scipy`, `rtree`, `torch`.

## How to run it

1. Under **Compute**, check that a machine is available for this project.
2. Press **Run**, choose the machine, and follow the run on the flow's **View** page.
3. The files it made are under **Results**; they stay on the machine until you save or download them.

## What you get

- On the **View** page: *welding-cell-models (robot, car frame)* (2 · Production line), *The cell's joints and seams, live* (2 · Production line), *Live: the four robots welding a car with the network as it learns* (1 · Learn to follow the seams), *Learning curve* (1 · Learn to follow the seams), *How well the seam camera reads* (1 · Learn to follow the seams), *By joint type* (1 · Learn to follow the seams), *Learning* (1 · Learn to follow the seams), *Live: the four robots, car after car* (2 · Production line), *Car by car* (2 · Production line), *Weld accuracy, car by car* (2 · Production line), *Finding the car* (2 · Production line), *The line* (2 · Production line).

## Data and licences

- the dataset **welding-cell-models** of the workspace, read by *welding-cell-models (robot, car frame)*

<!-- esasim: files of the project -->

---

An [EsaSim](https://esacode.com/) project of the workspace Gianluca De Novi's workspace (Manufacturing & logistics).

### Blueprints in this repository

- [1 · Learn to follow the seams](blueprints/1-learn-to-follow-the-seams.json) · 9 blocks · version 7
- [2 · Production line](blueprints/2-production-line.json) · 10 blocks · version 2

### Workspace blocks it uses

- [Welding cell model](blocks/ws-welding-robot-model) · version 11
- [Welding cell](blocks/ws-welding-cell) · version 12
- [Welding cell 3D view](blocks/ws-welding-cell-3d-view-2) · version 3

### Assets

The files the project's views draw with (3D models, textures, sounds), in [assets/](assets/):

- [textures/esacode-logo.png](assets/textures/esacode-logo.png) · 25 KB
- [textures/esacode_logo_white.png](assets/textures/esacode_logo_white.png) · 11 KB
- [textures/smoke_puff.jpg](assets/textures/smoke_puff.jpg) · 2.2 KB
- [views/robot_cell_viewer.js](assets/views/robot_cell_viewer.js) · 911 KB

### Files the blueprints make

Kept with the project (listed in [esasim-files.json](esasim-files.json)), so it runs without making them again:

- **weld-tracker** · 5 files, 9.8 MB · made by 1 · Learn to follow the seams: Welding cell: learn to follow the seams · in [files/weld-tracker.zip](files/weld-tracker.zip)

The data the blueprints read (welding-cell-models) stays in EsaSim.

Keys pasted in blocks (secret settings) are not saved here, nor are the team and the results of runs.
