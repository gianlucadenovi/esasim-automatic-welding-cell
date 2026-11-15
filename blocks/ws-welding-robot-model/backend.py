# ── EsaSim block ──────────────────────────────────────────────────────
# Welding robot model (ws-welding-robot-model) · version 2 · machine block, Python: def run(ctx)
# One of the welding cell's four KUKA KR 210 robots with its swan-neck torch, and the car body frame on its sled, as one model for EsaSim's 3D view, placed where they are in the cell.
# Workspace: Gianluca De Novi's workspace · Author: Gianluca De Novi
# Saved: 2026-11-15
#
# Inputs   ctx.inputs["id"] is a list of files: .path .name .size .read_text() .read_json()
#   models      Files (glb)               Models · several · optional · The welding-cell-models dataset: kr210_weld.glb (the robot) and s15_frame.glb (the car frame); without them, boxes stand in
# Outputs  ctx.output("id", "name.ext") is the path to write; ctx.write_json / ctx.write_text
#   robot       Files (gz)                Robot model · kr210_<robot>.robot.json.gz (esasim.robot/1): wire it to a 3D view, with the Welding cell block's telemetry (channels joints, scene)
#   telemetry   Live telemetry            ctx.telemetry("channel", data) while it runs
# Settings ctx.params["key"]
#   robot       select    Robot = "front right" of front right | front left | rear right | rear left
#   triangles   number    Robot: triangles at most = 40000
#   car_triangles number    Car frame: triangles at most = 40000
# Runs on  Any machine. Return a dict to fill the "result" output.
# Packages numpy, trimesh, fast-simplification (installed by the worker with pip when missing)
# EsaSim rewrites these lines from the block's definition each time it is saved: change the definition, not them.
# ── end of EsaSim block header ────────────────────────────────────────

"""Welding robot model: one of the welding cell's four KUKA KR 210 R2700 robots, with the car body frame on its sled, as
an esasim.robot/1 model for EsaSim's 3D view, placed where they are in the cell (world frame: x along the rail, y left,
z up, metres).

EsaSim's 3D view moves one chain of up to 12 joints. The first six carry the sled and the car: a turn about an axis
1 km away is, over a few metres, a straight move (5 cm off at the ends of the rail, nothing in the cell), so joint 1
slides the sled and the car along the rail, joint 2 moves the car across it, joint 3 turns it (yaw); joints 4 to 6 undo
these three, so that the robot (joints 7 to 12) stands still on the floor. The Welding cell block sends all twelve
angles on its joints channel.

From kr210_weld.glb (the rigged robot with its swan-neck MIG torch, wire feeder and seam camera) the robot is cut into
its links (base, A1 to A6) and the torch, each in its joint's frame, simplified to keep the file small. The base also
carries the robot's pedestal. The car frame is s15_frame.glb (any other .glb of the dataset). Without the GLBs, boxes
stand in. The seams come on the Welding cell block's scene channel. Finishes in seconds, so the view has the model
while the welding cell runs beside it.
"""
import gzip
import json
import math
import re

import numpy as np

ROBOTS = {"front right": (1.35, -2.00, 0.45, 1.0), "front left": (1.35, 2.00, 0.45, 1.0),
          "rear right": (-1.40, -2.30, 0.40, -1.0), "rear left": (-1.40, 2.30, 0.40, -1.0)}
W = np.array([[0, 0, 1], [0, -1, 0], [0, -1, 0], [1, 0, 0], [0, -1, 0], [1, 0, 0]], float)
QP = np.array([[0, 0, 0], [0.349, 0, 0.678], [0.349, 0, 1.825], [0.70, 0, 1.784], [1.575, 0, 1.784], [1.79, 0, 1.784]])
LINKS = ["base", "a1", "a2", "a3", "a4", "a5", "a6"]
TORCH = re.compile(r"torch|camera|wire_feeder|hose", re.I)
FAR = 1000.0                                       # m: the axis of the "straight" moves (vertex positions stay well within float precision)
CAR_Z = 1.05
COLORS = {"car": "#c3c8cf", "sled": "#2b2f36", "base": "#2a2c30", "a1": "#f26a0c", "a2": "#f26a0c", "a3": "#f26a0c", "a4": "#f26a0c", "a5": "#f26a0c", "a6": "#2f3238"}
# stand-in boxes, robot frame (x forward, z up): centre, size
BOXES = {"base": ([0, 0.06, 0.17], [1.0, 1.1, 0.4]), "a1": ([0.02, 0.0, 0.55], [1.09, 0.52, 0.68]), "a2": ([0.35, -0.21, 1.23], [0.53, 0.44, 1.5]),
         "a3": ([0.63, 0.03, 1.9], [1.44, 0.69, 0.65]), "a4": ([1.18, -0.01, 1.82], [0.92, 0.22, 0.27]), "a5": ([1.6, 0.02, 1.78], [0.34, 0.33, 0.24]),
         "a6": ([1.84, 0.0, 1.784], [0.12, 0.2, 0.2]), "torch": ([2.1, 0.06, 1.75], [0.55, 0.06, 0.12])}


def box_mesh(c, s):
    c = np.array(c, float); h = np.array(s, float) / 2
    v = np.array([[x, y, z] for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)], float) * h + c
    f = [[0, 1, 3], [0, 3, 2], [4, 6, 7], [4, 7, 5], [0, 4, 5], [0, 5, 1], [2, 3, 7], [2, 7, 6], [0, 2, 6], [0, 6, 4], [1, 5, 7], [1, 7, 3]]
    return v, np.array(f)


def simplify(trimesh, m, target):
    if len(m.faces) <= target:
        return m
    try:
        return m.simplify_quadric_decimation(face_count=target)
    except Exception:
        try:
            return m.simplify_quadric_decimation(percent=1 - target / len(m.faces))
        except Exception:
            return m


def run(ctx):
    p = ctx.params
    which = str(p.get("robot") or "front right")
    bx, by, bz, aim = ROBOTS.get(which, ROBOTS["front right"])
    yaw = math.atan2(-by, aim - bx)
    budget = int(p.get("triangles", 40000))
    parts = {}                                      # link -> (vertices in the robot frame, faces)
    files = [f for f in (ctx.inputs.get("models") or []) if re.search(r"kr210|robot|kuka|arm", f.name, re.I) and f.name.lower().endswith(".glb")]
    if files:
        import trimesh
        sc = trimesh.load(files[0].path, force="scene"); g = sc.graph; par = g.transforms.parents
        C = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]])        # robot frame (z up) -> the GLB's (y up)
        groups = {}
        for node in g.nodes_geometry:
            n = node; link = None; torch = False
            while n is not None:
                if TORCH.search(n) or n == "tcp":
                    torch = True
                if n in LINKS:
                    link = n; break
                n = par.get(n)
            if link is None:
                continue
            key = "torch" if (torch and link in ("a3", "a4", "a6")) else link
            if key == "torch" and link in ("a3", "a4"):
                key = link                                           # the wire feeder and the hose stay on their links
            T, gname = g[node]; m = sc.geometry[gname].copy(); m.apply_transform(T)
            groups.setdefault(key, []).append(m)
        total = sum(len(m.faces) for ms in groups.values() for m in ms)
        for key, ms in groups.items():
            m = trimesh.util.concatenate(ms)
            share = max(300, int(budget * len(m.faces) / max(1, total)))
            m = simplify(trimesh, m, share)
            parts[key] = (np.asarray(m.vertices) @ C, np.asarray(m.faces))      # v_robot = C^T v_glb
        ctx.log("[model] %s from %s: %s triangles" % (which, files[0].name, sum(len(f) for _, f in parts.values())))
    else:
        for key, (c, s) in BOXES.items():
            parts[key] = box_mesh(c, s)
        ctx.log("[model] no kr210_weld.glb wired in: boxes stand in")
    # the pedestal under the base
    pv, pf = box_mesh([0, 0, -bz / 2], [0.9, 0.9, bz])
    if "base" in parts:
        v, f = parts["base"]; parts["base"] = (np.vstack([v, pv]), np.vstack([f, pf + len(v)]))
    else:
        parts["base"] = (pv, pf)
    # the car frame (front from the GLB's -Z to +X, as in the cell) and the sled
    cars = [f for f in (ctx.inputs.get("models") or []) if f.name.lower().endswith(".glb") and f not in files]
    if cars:
        import trimesh
        sc = trimesh.load(cars[0].path, force="scene"); Ry = trimesh.transformations.rotation_matrix(-math.pi / 2, [0, 1, 0]); ms = []
        for node in sc.graph.nodes_geometry:
            T, gname = sc.graph[node]; m = sc.geometry[gname].copy(); m.apply_transform(Ry @ T); ms.append(m)
        m = simplify(trimesh, trimesh.util.concatenate(ms), int(p.get("car_triangles", 40000)))
        C = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]])
        car = (np.asarray(m.vertices) @ C + [0, 0, CAR_Z], np.asarray(m.faces))
        ctx.log("[model] car frame from %s: %d triangles" % (cars[0].name, len(car[1])))
    else:
        car = box_mesh([-0.05, 0, CAR_Z + 0.1], [4.85, 1.9, 1.3])
    sled = box_mesh([0, 0, 0.44], [4.4, 1.25, 0.12])
    # esasim.robot/1: link 0 is the robot's base (world frame); joint i turns link i+1 about its axis, its origin given
    # in the frame of the joint before. Joints 1-6: the sled and the car (see above), then the robot.
    c, s = math.cos(yaw), math.sin(yaw); Rb = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]]); base = np.array([bx, by, bz])
    def pack(v, f, color):
        return {"v": np.round(np.asarray(v, float).ravel(), 4).tolist(), "f": np.asarray(f, int).ravel().tolist(), "color": color}
    links = [pack(parts["base"][0] @ Rb.T + base, parts["base"][1], COLORS["base"])]
    joints = []
    O = [np.array([0.0, FAR, 0.0]), np.array([FAR, 0.0, 0.0]), np.zeros(3), np.zeros(3), np.array([FAR, 0.0, 0.0]), np.array([0.0, FAR, 0.0])]
    names = ["along the rail", "across", "car turned", "(undo)", "(undo)", "(undo)"]
    prev = np.zeros(3)
    for k in range(6):
        joints.append({"name": names[k], "xyz": (O[k] - prev).tolist(), "rpy": [0, 0, 0], "axis": [0, 0, 1]})
        if k == 0:
            links.append(pack(sled[0] - O[k], sled[1], COLORS["sled"]))
        elif k == 2:
            links.append(pack(car[0] - O[k], car[1], COLORS["car"]))
        else:
            links.append({})                                              # nothing rides on these joints
        prev = O[k]
    for i in range(6):
        org = (base + Rb @ QP[0] - prev) if i == 0 else (QP[i] - QP[i - 1])
        joints.append({"name": "A%d" % (i + 1), "xyz": np.round(org, 5).tolist(), "rpy": [0, 0, round(yaw, 6)] if i == 0 else [0, 0, 0],
                       "axis": W[i].tolist()})
        L = LINKS[i + 1]; v, f = parts.get(L, box_mesh(*BOXES[L]))
        if L == "a6":                                                   # the torch rides on A6
            tv, tf = parts.get("torch", box_mesh(*BOXES["torch"])); v, f = np.vstack([v, tv]), np.vstack([f, tf + len(v)])
        links.append(pack(v - QP[i], f, COLORS[L]))
    model = {"format": "esasim.robot/1", "robot": "KUKA KR 210 R2700 · %s, and the car frame" % which, "units": "m", "scale": 1,
             "far": FAR, "joints": joints, "links": links}
    name = "kr210_%s.robot.json.gz" % which.replace(" ", "_")
    with open(ctx.output("robot", name), "wb") as fh:
        fh.write(gzip.compress(json.dumps(model, separators=(",", ":")).encode(), 6))
    return {"robot": which, "file": name, "triangles": sum(len(l.get("f", [])) // 3 for l in links)}
