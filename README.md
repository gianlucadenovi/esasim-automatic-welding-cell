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
- Python packages, installed by the worker the first time: `torch`, `numpy`, `trimesh`.

## How to run it

1. Under **Compute**, check that a machine is available for this project.
2. Press **Run**, choose the machine, and follow the run on the flow's **View** page.
3. The files it made are under **Results**; they stay on the machine until you save or download them.

## What you get

- On the **View** page: *The cell, live* (1 · Learn to follow the seams), *Live: a car welded with the network as it learns* (1 · Learn to follow the seams), *Events and scores, live* (1 · Learn to follow the seams), *Learning curve* (1 · Learn to follow the seams), *Replay in 3D (the cars of the run, when it has finished)* (1 · Learn to follow the seams), *How well the seam camera reads* (1 · Learn to follow the seams), *By joint type* (1 · Learn to follow the seams), *Learning* (1 · Learn to follow the seams), *welding-cell-models (robot, car frame)* (2 · Production line), *Events and line numbers, live* (2 · Production line), *Car by car* (2 · Production line), *The welding cell in 3D (the newest five cars)* (2 · Production line).

## Data and licences

- the dataset **welding-cell-models** of the workspace, read by *welding-cell-models (robot, car frame)*

<!-- esasim: files of the project -->

---

An [EsaSim](https://esacode.com/) project of the workspace Gianluca De Novi's workspace (Manufacturing & logistics).

### Blueprints in this repository

- [1 · Learn to follow the seams](blueprints/1-learn-to-follow-the-seams.json) · 9 blocks · version 3
- [2 · Production line](blueprints/2-production-line.json) · 9 blocks

### Workspace blocks it uses

- [Welding cell](blocks/ws-welding-cell) · version 4
- [Welding cell 3D view](blocks/ws-welding-cell-3d-view) · version 2

Keys pasted in blocks (secret settings) are not saved here. Datasets, results and the team stay in EsaSim.
