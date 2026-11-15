# ── EsaSim block ──────────────────────────────────────────────────────
# Welding robot model (ws-welding-robot-model) · version 1 · machine block, Python: def run(ctx)
# One of the welding cell's four KUKA KR 210 robots, with its swan-neck torch, as a robot model for EsaSim's 3D view, placed where it stands in the cell.
# Workspace: Gianluca De Novi's workspace · Author: Gianluca De Novi
# Saved: 2026-11-15
#
# Inputs   ctx.inputs["id"] is a list of files: .path .name .size .read_text() .read_json()
#   models      Files (glb)               Models · several · optional · The welding-cell-models dataset (kr210_weld.glb is used); without it, boxes stand in
# Outputs  ctx.output("id", "name.ext") is the path to write; ctx.write_json / ctx.write_text
#   robot       Files (gz)                Robot model · kr210_<robot>.robot.json.gz (esasim.robot/1): wire it to a 3D view, with the Welding cell block's telemetry (channels joints, scene)
#   telemetry   Live telemetry            ctx.telemetry("channel", data) while it runs
# Settings ctx.params["key"]
#   robot       select    Robot = "front right" of front right | front left | rear right | rear left
#   triangles   number    Triangles at most = 40000
# Runs on  Any machine. Return a dict to fill the "result" output.
# Packages numpy, trimesh (installed by the worker with pip when missing)
# EsaSim rewrites these lines from the block's definition each time it is saved: change the definition, not them.
# ── end of EsaSim block header ────────────────────────────────────────

"""Welding robot model: one of the welding cell's four KUKA KR 210 R2700 robots as an esasim.robot/1 model for EsaSim's
3D view, placed where it stands in the cell (world frame: x along the rail, y left, z up, metres).

From kr210_weld.glb (the rigged robot with its swan-neck MIG torch, wire feeder and seam camera) the robot is cut into
its links (base, A1 to A6) and the torch, each in its joint's frame, simplified to keep the file small. The base also
carries the robot's pedestal. Without the GLB, boxes stand in. The 3D view poses the model live from the Welding cell
block's joints channel (j1..j6 in degrees, j7 = 0: the torch) and draws the car, the sled and the seams from its scene
channel. Finishes in seconds, so the view has the model while the welding cell runs beside it.
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
COLORS = {"base": "#2a2c30", "a1": "#f26a0c", "a2": "#f26a0c", "a3": "#f26a0c", "a4": "#f26a0c", "a5": "#f26a0c", "a6": "#2f3238", "torch": "#26292e"}
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
    # esasim.robot/1: link 0 is the base (in the world frame: the robot stands at its place in the cell); joint i turns
    # link i+1 about its axis, its origin given in the frame of the joint before
    c, s = math.cos(yaw), math.sin(yaw); Rb = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]]); base = np.array([bx, by, bz])
    def pack(v, f, color):
        return {"v": np.round(np.asarray(v, float).ravel(), 4).tolist(), "f": np.asarray(f, int).ravel().tolist(), "color": color}
    links = [pack(parts["base"][0] @ Rb.T + base, parts["base"][1], COLORS["base"])]
    joints = []
    for i in range(6):
        org = (base + Rb @ QP[0]) if i == 0 else (QP[i] - QP[i - 1])
        joints.append({"name": "A%d" % (i + 1), "xyz": np.round(org, 5).tolist(), "rpy": [0, 0, round(yaw, 6)] if i == 0 else [0, 0, 0],
                       "axis": W[i].tolist()})
        L = LINKS[i + 1]; v, f = parts.get(L, box_mesh(*BOXES[L]))
        links.append(pack(v - QP[i], f, COLORS[L]))
    # the torch: on a fixed joint at the flange (j7 always 0)
    joints.append({"name": "torch", "xyz": [0, 0, 0], "rpy": [0, 0, 0], "axis": [1, 0, 0]})
    v, f = parts.get("torch", box_mesh(*BOXES["torch"]))
    links.append(pack(v - QP[5], f, COLORS["torch"]))
    model = {"format": "esasim.robot/1", "robot": "KUKA KR 210 R2700 · %s (welding cell)" % which, "units": "m", "scale": 1,
             "joints": joints, "links": links}
    name = "kr210_%s.robot.json.gz" % which.replace(" ", "_")
    with open(ctx.output("robot", name), "wb") as fh:
        fh.write(gzip.compress(json.dumps(model, separators=(",", ":")).encode(), 6))
    return {"robot": which, "file": name, "triangles": sum(len(l["f"]) // 3 for l in links)}
