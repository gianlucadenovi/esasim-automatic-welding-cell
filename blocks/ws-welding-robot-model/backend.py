# ── EsaSim block ──────────────────────────────────────────────────────
# Welding cell model (ws-welding-robot-model) · version 3 · machine block, Python: def run(ctx)
# The welding cell for EsaSim's 3D view: the four KUKA KR 210 robots with their swan-neck torches and the car body frame on its sled, one model with each part in its own material.
# Workspace: Gianluca De Novi's workspace · Author: Gianluca De Novi
# Saved: 2026-11-15
#
# Inputs   ctx.inputs["id"] is a list of files: .path .name .size .read_text() .read_json()
#   models      Files (glb)               Models · several · optional · The welding-cell-models dataset: kr210_weld.glb (the robot) and s15_frame.glb (the car frame); without them, boxes stand in
# Outputs  ctx.output("id", "name.ext") is the path to write; ctx.write_json / ctx.write_text
#   robot       Files (gz)                Robot model · welding_cell_all.robot.json.gz (esasim.robot/1 with its joint list): wire it to a 3D view and to the Welding cell block's Robot model input
#   telemetry   Live telemetry            ctx.telemetry("channel", data) while it runs
# Settings ctx.params["key"]
#   robot       select    Robots = "all four" of all four | front right | front left | rear right | rear left
#   triangles   number    Robot: triangles at most = 40000
#   car_triangles number    Car frame: triangles at most = 40000
# Runs on  Any machine. Return a dict to fill the "result" output.
# Packages numpy, trimesh, fast-simplification (installed by the worker with pip when missing)
# EsaSim rewrites these lines from the block's definition each time it is saved: change the definition, not them.
# ── end of EsaSim block header ────────────────────────────────────────

"""Welding cell model: the welding cell's four KUKA KR 210 R2700 robots (or one of them), with the car body frame on its
sled, as one esasim.robot/1 model for EsaSim's 3D view, each part where it is in the cell (world frame: x along the
rail, y left, z up, metres).

EsaSim's 3D view poses one chain of joints. The cell is laid out along it:
  * joints 1-6 carry the sled and the car: a turn about an axis 1 km away is, over a few metres, a straight move
    (5 cm off at the ends of the rail, nothing in the cell), so joint 1 slides the sled and the car along the rail,
    joint 2 moves the car across it, joint 3 turns it (yaw); joints 4-6 undo these three;
  * then each robot: a fixed turn to its heading, its six axes A1-A6, and (but for the last robot) the same undone,
    so the next robot stands on the floor again. Parts of another colour ride on fixed joints (always 0) at the same
    place, so every part keeps its own colour: orange castings, black motors, the steel base, the brass, nozzle and
    copper tip of the torch, the seam camera.
The Welding cell block sends every angle on its joints channel (j1, j2, ... in degrees) and the joint list here
("joints_layout") says what each one is. EsaSim's 3D view must read more than 12 joints for the whole cell.

From kr210_weld.glb (the rigged robot with its swan-neck MIG torch, wire feeder and seam camera) the robot is cut
into its links and colours, simplified to keep the file small, its vertices split at sharp edges so the castings keep
their edges. The car frame is s15_frame.glb (any other .glb of the dataset). Without the GLBs, boxes stand in.
Each part carries its glTF material: colour, metalness and roughness (steel and copper metallic, castings painted).
Finishes in seconds, so the view has the model while the welding cell runs beside it.
"""
import gzip
import json
import math
import re

import numpy as np

ROBOTS = [("front right", 1.35, -2.00, 0.45, 1.0), ("front left", 1.35, 2.00, 0.45, 1.0),
          ("rear right", -1.40, -2.30, 0.40, -1.0), ("rear left", -1.40, 2.30, 0.40, -1.0)]
W = np.array([[0, 0, 1], [0, -1, 0], [0, -1, 0], [1, 0, 0], [0, -1, 0], [1, 0, 0]], float)
QP = np.array([[0, 0, 0], [0.349, 0, 0.678], [0.349, 0, 1.825], [0.70, 0, 1.784], [1.575, 0, 1.784], [1.79, 0, 1.784]])
LINKS = ["base", "a1", "a2", "a3", "a4", "a5", "a6"]
FAR = 1000.0                                # m: the axis of the "straight" moves (vertex positions stay well within float precision)
CAR_Z = 1.05
C = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]])        # robot frame (z up) -> the GLBs' (y up)
BOXES = {"base": ([0, 0.06, 0.17], [1.0, 1.1, 0.4], "#2a2c30"), "a1": ([0.02, 0.0, 0.55], [1.09, 0.52, 0.68], "#f26a0c"),
         "a2": ([0.35, -0.21, 1.23], [0.53, 0.44, 1.5], "#f26a0c"), "a3": ([0.63, 0.03, 1.9], [1.44, 0.69, 0.65], "#f26a0c"),
         "a4": ([1.18, -0.01, 1.82], [0.92, 0.22, 0.27], "#f26a0c"), "a5": ([1.6, 0.02, 1.78], [0.34, 0.33, 0.24], "#f26a0c"),
         "a6": ([2.1, 0.06, 1.75], [0.6, 0.2, 0.2], "#2f3238")}


def box_mesh(c, s):
    c = np.array(c, float); h = np.array(s, float) / 2
    v = np.array([[x, y, z] for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)], float) * h + c
    f = [[0, 1, 3], [0, 3, 2], [4, 6, 7], [4, 7, 5], [0, 4, 5], [0, 5, 1], [2, 3, 7], [2, 7, 6], [0, 2, 6], [0, 6, 4], [1, 5, 7], [1, 7, 3]]
    return v, np.array(f)


def crisp(trimesh, m):
    """Vertices split where faces meet at more than 35 deg: the view shades the castings smoothly and keeps their
    edges sharp (with the vertices shared everywhere, the robot looked like soft blobs)."""
    try:
        return trimesh.graph.smooth_shade(m, angle=math.radians(35))
    except Exception:
        return m


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


def colour(m):
    """The part's material: (colour, metalness, roughness) from its glTF PBR material."""
    try:
        mt = m.visual.material; c = mt.baseColorFactor
        met = mt.metallicFactor if mt.metallicFactor is not None else 0.1
        rough = mt.roughnessFactor if mt.roughnessFactor is not None else 0.5
        return ("#%02x%02x%02x" % tuple(int(x) for x in c[:3]), round(float(met), 2), round(float(rough), 2))
    except Exception:
        return ("#9aa1aa", 0.1, 0.5)


def robot_parts(ctx, path, budget):
    """{link: [(colour, vertices in the robot frame, faces), ...]} from the rigged GLB."""
    import trimesh
    sc = trimesh.load(path, force="scene"); g = sc.graph; par = g.transforms.parents
    groups = {}
    for node in g.nodes_geometry:
        n = node; link = None
        while n is not None:
            if n in LINKS:
                link = n; break
            n = par.get(n)
        if link is None:
            continue
        T, gname = g[node]; m = sc.geometry[gname].copy(); m.apply_transform(T)
        groups.setdefault(link, {}).setdefault(colour(m), []).append(m)
    total = sum(len(m.faces) for d in groups.values() for ms in d.values() for m in ms)
    out = {}
    for link, d in groups.items():
        for col, ms in d.items():
            m = trimesh.util.concatenate(ms)
            m = crisp(trimesh, simplify(trimesh, m, max(60, int(budget * len(m.faces) / max(1, total)))))
            out.setdefault(link, []).append((col, np.asarray(m.vertices) @ C, np.asarray(m.faces)))
        out[link].sort(key=lambda x: -len(x[2]))                       # the biggest part first
    return out


def run(ctx):
    p = ctx.params
    which = str(p.get("robot") or "all four")
    robots = ROBOTS if which == "all four" else [r for r in ROBOTS if r[0] == which] or ROBOTS[:1]
    models = list(ctx.inputs.get("models") or [])
    rf = [f for f in models if re.search(r"kr210|robot|kuka|arm", f.name, re.I) and f.name.lower().endswith(".glb")]
    cf = [f for f in models if f.name.lower().endswith(".glb") and f not in rf]
    if rf:
        parts = robot_parts(ctx, rf[0].path, int(p.get("triangles", 40000)))
        ctx.log("[model] robot from %s: %d parts, %d triangles" % (rf[0].name, sum(len(v) for v in parts.values()), sum(len(x[2]) for v in parts.values() for x in v)))
    else:
        parts = {L: [((c, 0.1, 0.5), *box_mesh(o, s))] for L, (o, s, c) in BOXES.items()}
        ctx.log("[model] no kr210_weld.glb wired in: boxes stand in")
    if cf:
        import trimesh
        sc = trimesh.load(cf[0].path, force="scene"); Ry = trimesh.transformations.rotation_matrix(-math.pi / 2, [0, 1, 0]); ms = []
        for node in sc.graph.nodes_geometry:
            T, gname = sc.graph[node]; m = sc.geometry[gname].copy(); m.apply_transform(Ry @ T); ms.append(m)     # front from -Z to +X
        m = crisp(trimesh, simplify(trimesh, trimesh.util.concatenate(ms), int(p.get("car_triangles", 40000))))
        car = (np.asarray(m.vertices) @ C + [0, 0, CAR_Z], np.asarray(m.faces))
        ctx.log("[model] car frame from %s: %d triangles" % (cf[0].name, len(car[1])))
    else:
        car = box_mesh([-0.05, 0, CAR_Z + 0.1], [4.85, 1.9, 1.3])
    sled = box_mesh([0, 0, 0.44], [4.4, 1.25, 0.12])

    links = [{}]; joints = []; layout = []                 # link 0: nothing (every part rides on a joint)
    state = {"o": np.zeros(3)}                             # world position of the current frame's origin (at zero angles)
    def pack(v, f, mat):
        mat = mat if isinstance(mat, tuple) else (mat, 0.1, 0.55)
        return {"v": np.round(np.asarray(v, float).ravel(), 4).tolist(), "f": np.asarray(f, int).ravel().tolist(),
                "color": mat[0], "metalness": mat[1], "roughness": mat[2]}
    def joint(origin_world, axis, role, mesh=None, mat=None, frame_rot=np.eye(3), rpy=(0, 0, 0)):
        """A joint at origin_world (given in world coordinates at zero angles; the chain's frames stay world-aligned,
        except inside a robot, where they are the robot's frame: frame_rot maps it to world)."""
        xyz = frame_rot.T @ (np.asarray(origin_world, float) - state["o"])
        joints.append({"name": role, "xyz": np.round(xyz, 6).tolist(), "rpy": list(rpy), "axis": list(map(float, axis))}); layout.append(role)
        state["o"] = np.asarray(origin_world, float)
        links.append(pack(mesh[0], mesh[1], mat) if mesh is not None else {})
    # the sled and the car
    O = [np.array([0.0, FAR, 0.0]), np.array([FAR, 0.0, 0.0]), np.zeros(3)]
    joint(O[0], [0, 0, 1], "car:x", (sled[0] - O[0], sled[1]), ("#2b2f36", 0.5, 0.45))
    joint(O[1], [0, 0, 1], "car:y")
    joint(O[2], [0, 0, 1], "car:yaw", (car[0] - O[2], car[1]), ("#c3c8cf", 0.75, 0.32))      # bare steel
    joint(O[2], [0, 0, 1], "car:-yaw"); joint(O[1], [0, 0, 1], "car:-y"); joint(O[0], [0, 0, 1], "car:-x")
    for ri, (name, bx, by, bz, aim) in enumerate(robots):
        base = np.array([bx, by, bz]); yaw = math.atan2(-by, aim - bx)
        c, s = math.cos(yaw), math.sin(yaw); Rb = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
        pv, pf = box_mesh([0, 0, -bz / 2], [0.9, 0.9, bz])                                   # the pedestal
        # the heading: a turn about the vertical through the base (always the robot's yaw)
        bparts = parts.get("base", [])
        first = bparts[0] if bparts else (("#2a2c30", 0.1, 0.5), np.zeros((0, 3)), np.zeros((0, 3), int))
        v0 = np.vstack([first[1], pv]); f0 = np.vstack([first[2], pf + len(first[1])]) if len(first[2]) else pf
        joint(base, [0, 0, 1], "%s:yaw" % name, (v0, f0), first[0])
        for col, v, f in bparts[1:]:
            joint(base, [0, 0, 1], "fixed", (v, f), col)
        for i in range(6):
            o = base + Rb @ QP[i]
            L = LINKS[i + 1]; lp = parts.get(L, [])
            if lp:
                joint(o, W[i], "%s:A%d" % (name, i + 1), (lp[0][1] - QP[i], lp[0][2]), lp[0][0], Rb)
                for col, v, f in lp[1:]:
                    joint(o, [1, 0, 0], "fixed", (v - QP[i], f), col, Rb)
            else:
                joint(o, W[i], "%s:A%d" % (name, i + 1), None, None, Rb)
        if ri < len(robots) - 1:                                                             # undo it for the next robot
            for i in reversed(range(6)):
                joint(base + Rb @ QP[i], W[i], "%s:-A%d" % (name, i + 1), None, None, Rb)
            joint(base, [0, 0, 1], "%s:-yaw" % name, None, None, Rb)
    model = {"format": "esasim.robot/1", "robot": "Welding cell: %s KUKA KR 210 R2700 and the car frame" % ("four" if len(robots) == 4 else "one"),
             "units": "m", "scale": 1, "far": FAR, "robots": [r[0] for r in robots], "joints_layout": layout, "joints": joints, "links": links}
    name = "welding_cell_%s.robot.json.gz" % ("all" if len(robots) == 4 else robots[0][0].replace(" ", "_"))
    with open(ctx.output("robot", name), "wb") as fh:
        fh.write(gzip.compress(json.dumps(model, separators=(",", ":")).encode(), 6))
    ctx.log("[model] %d joints, %d links" % (len(joints), len(links)))
    return {"robots": [r[0] for r in robots], "file": name, "joints": len(joints), "triangles": sum(len(l.get("f", [])) // 3 for l in links)}
