# ── EsaSim block ──────────────────────────────────────────────────────
# Welding cell model (ws-welding-robot-model) · version 6 · machine block, Python: def run(ctx)
# The welding cell for EsaSim's 3D view: the four KUKA KR 210 robots with their swan-neck torches and the car body frame on its sled, one model with each part in its own material.
# Workspace: Gianluca De Novi's workspace · Author: Gianluca De Novi
# Saved: 2026-11-15
#
# Inputs   ctx.inputs["id"] is a list of files: .path .name .size .read_text() .read_json()
#   models      Files (glb)               Models · several · optional · The welding-cell-models dataset: kr210_weld.glb (the robot) and s15_frame.glb (the car frame); without them, boxes stand in
# Outputs  ctx.output("id", "name.ext") is the path to write; ctx.write_json / ctx.write_text
#   robot       Files (gz)                Robot model · welding_cell_all.robot.json.gz (esasim.robot/1 with its joint list, weld beads and arcs): wire it to a 3D view and to the Welding cell block's Robot model input
#   telemetry   Live telemetry            ctx.telemetry("channel", data) while it runs
# Settings ctx.params["key"]
#   robot       select    Robots = "all four" of all four | front right | front left | rear right | rear left
#   triangles   number    Robot: triangles at most = 40000
#   car_triangles number    Car frame: triangles at most = 0
# Runs on  Any machine. Return a dict to fill the "result" output.
# Packages numpy, trimesh, fast-simplification, scipy, rtree (installed by the worker with pip when missing)
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

From kr210_weld.glb (the rigged robot with its swan-neck MIG torch and seam camera) the robot is cut into its links
and colours (without the black cover box on top of the forearm and its lettering, the wire feeder or the hose), simplified to keep the file small, its vertices split at sharp edges so the castings keep
their edges. The car frame is s15_frame.glb (any other .glb of the dataset), whole, in satin silver; its open sheet-metal panels
get a back copy so they show from both sides. Without the GLBs, boxes stand in.
Welds: every seam is cut into pieces of dark weld bead (about 4 cm each) riding on the car, each on a straight joint
that keeps it under the floor until the Welding cell block lifts it onto the car as the torch passes, so the welds
appear behind the torch in step with it and stay on the car as it leaves. A glow at each wire (on a straight joint in
the wrist) shows the arc while the robot welds. "beads" and "arcs" list these joints for the Welding cell block.
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


CAR_MAT = ("#b0b5bc", 1.0, 0.42)       # satin silver: the colour reads as satin silver where the view takes colours only
BEAD_MAT = ("#3a332d", 0.3, 0.7)       # a weld bead: dark, heat-tinted steel
ARC_MAT = ("#fff1b8", 0.0, 0.2)        # the arc's glow at the wire
HIDE = 5.0                             # m: weld beads wait this far below the car (under the floor) until they are welded
SEG = 2                                # seam intervals (about 2 cm each) per bead segment
TCP = np.array([1.79 + 0.5403, 0.1306, 1.784])
ROBOT_QUARTER = {"front right": "front", "front left": "front", "rear right": "rear", "rear left": "rear"}
SEAMS_JSON = r'''[["Front rail","front","flange",[[776,-807,246],[796,-806,245],[816,-806,243],[836,-807,242],[856,-807,240],[876,-807,238],[896,-808,237],[916,-808,236],[935,-808,234],[955,-808,233],[975,-808,231],[995,-808,229],[1015,-808,227],[1035,-808,226],[1055,-808,224],[1075,-808,222],[1095,-808,221],[1115,-808,219],[1135,-808,217],[1155,-808,215],[1174,-808,213],[1194,-808,212],[1214,-808,210],[1234,-808,208],[1254,-808,206],[1274,-808,204],[1294,-808,202],[1314,-808,200],[1334,-808,198],[1354,-808,196],[1374,-808,194],[1394,-808,192],[1414,-807,189],[1433,-807,187],[1453,-807,185],[1473,-806,182],[1493,-806,180],[1513,-803,177],[1532,-799,169],[1552,-799,164],[1571,-799,161],[1591,-799,158],[1611,-799,155],[1630,-798,152],[1650,-798,148],[1670,-798,145],[1690,-797,142],[1709,-797,138],[1729,-796,135],[1749,-796,132],[1768,-796,128],[1788,-795,124],[1808,-795,122],[1828,-797,120],[1848,-797,116],[1867,-797,111],[1887,-796,106],[1906,-795,101],[1925,-794,96],[1944,-793,90],[1963,-791,85],[1983,-790,79],[2002,-789,73]],[[25,-81,53],[22,-82,53],[18,-82,55],[14,-81,56],[9,-82,57],[6,-80,59],[4,-77,64],[3,-72,69],[3,-64,76],[4,-57,82],[6,-49,87],[7,-37,93],[8,-26,96],[8,-16,98],[9,-9,99],[9,-4,99],[10,1,100],[10,6,99],[10,9,99],[10,10,99],[10,11,99],[10,12,99],[9,14,99],[9,12,99],[9,8,99],[9,2,100],[9,-6,99],[9,-16,98],[9,-26,96],[8,-36,93],[8,-42,90],[8,-47,88],[9,-49,87],[10,-46,88],[11,-40,91],[11,-34,93],[12,-27,96],[13,-21,97],[13,-14,98],[14,-10,99],[14,-9,99],[14,-12,98],[15,-17,97],[16,-24,96],[16,-30,94],[17,-40,90],[17,-50,85],[17,-56,81],[17,-61,77],[17,-65,74],[17,-67,72],[18,-69,70],[19,-68,71],[20,-66,72],[21,-66,72],[22,-66,72],[22,-66,72],[22,-67,71],[21,-69,69],[20,-72,66],[18,-75,64],[16,-78,61],[15,-80,59]]],["Strut tower","front","corner",[[1269,-471,73],[1249,-474,75],[1229,-478,75],[1209,-485,75],[1191,-495,75],[1174,-508,76],[1158,-520,77],[1143,-535,79],[1130,-553,81],[1120,-572,83],[1112,-591,85],[1105,-611,88],[1102,-631,90],[1100,-651,93],[1099,-671,97],[1100,-691,100],[1100,-710,104],[1100,-730,109],[1099,-749,113]],[[-14,38,92],[-15,38,92],[-16,37,91],[-18,37,91],[-21,36,91],[-24,34,91],[-26,33,91],[-28,31,91],[-29,29,91],[-29,28,92],[-28,26,92],[-26,24,93],[-23,23,95],[-20,23,95],[-17,22,96],[-14,22,96],[-12,22,97],[-10,23,97],[-10,23,97]]],["A-pillar and roof rail (front)","front","lap",[[101,-656,633],[84,-655,643],[65,-652,650],[46,-649,656],[27,-645,663],[9,-642,669],[-10,-638,674],[-30,-635,679],[-49,-632,684],[-68,-630,688],[-88,-627,693],[-107,-625,696],[-127,-623,699],[-147,-621,702],[-167,-619,705],[-187,-618,707],[-206,-617,710],[-226,-615,711],[-246,-614,713],[-266,-613,714],[-286,-612,715],[-306,-612,716],[-326,-611,717],[-346,-610,718],[-366,-610,718],[-386,-609,719],[-406,-608,719],[-426,-608,719],[-446,-607,720],[-466,-607,720],[-486,-607,720],[-506,-607,720],[-526,-607,720]],[[41,-17,90],[39,-20,90],[36,-25,90],[32,-29,90],[28,-33,90],[25,-37,90],[21,-40,89],[18,-42,89],[16,-44,89],[14,-45,88],[12,-45,88],[11,-46,88],[10,-46,88],[9,-46,88],[8,-46,89],[7,-45,89],[6,-45,89],[5,-44,89],[5,-44,90],[4,-43,90],[3,-43,90],[3,-42,91],[2,-42,91],[2,-41,91],[1,-41,91],[1,-41,91],[1,-40,92],[0,-40,92],[0,-39,92],[0,-38,93],[0,-37,93],[0,-36,93],[-1,-35,94]]],["Roof rail (rear)","rear","lap",[[-1843,-747,360],[-1825,-744,368],[-1807,-742,376],[-1789,-740,385],[-1771,-737,393],[-1753,-735,401],[-1734,-733,409],[-1716,-730,417],[-1698,-728,425],[-1680,-725,433],[-1662,-723,441],[-1643,-721,449],[-1625,-718,457],[-1607,-716,464],[-1588,-713,472],[-1570,-711,479],[-1552,-708,487],[-1533,-706,495],[-1515,-703,502],[-1497,-700,509],[-1478,-697,517],[-1460,-695,524],[-1441,-692,531],[-1423,-689,538],[-1405,-686,545],[-1386,-684,553],[-1367,-681,560],[-1349,-678,567],[-1330,-675,574],[-1312,-672,581],[-1293,-669,587],[-1275,-667,594],[-1256,-664,601],[-1237,-661,608],[-1218,-658,614],[-1200,-655,621],[-1181,-653,627],[-1162,-650,633],[-1143,-647,639],[-1124,-645,644],[-1105,-642,650],[-1086,-640,655],[-1067,-638,660],[-1047,-635,664],[-1028,-633,669],[-1009,-631,673],[-989,-629,677],[-969,-627,681],[-950,-626,685],[-930,-624,688],[-910,-622,691],[-891,-621,694],[-871,-620,697],[-851,-619,699],[-831,-617,702],[-811,-616,704],[-791,-615,706],[-771,-614,708],[-751,-613,709],[-732,-612,711],[-712,-611,712],[-692,-611,713],[-672,-610,715],[-652,-609,716],[-632,-608,717],[-612,-607,718]],[[-27,-28,92],[-28,-27,92],[-30,-24,92],[-32,-21,92],[-34,-19,92],[-35,-17,92],[-36,-16,92],[-37,-16,92],[-37,-18,91],[-36,-20,91],[-36,-22,91],[-35,-24,91],[-35,-25,90],[-34,-27,90],[-34,-28,90],[-33,-28,90],[-33,-28,90],[-33,-28,90],[-32,-28,90],[-32,-28,90],[-32,-27,91],[-32,-27,91],[-32,-26,91],[-32,-26,91],[-32,-25,92],[-32,-24,92],[-32,-22,92],[-32,-22,92],[-31,-22,92],[-31,-21,93],[-31,-21,93],[-31,-22,93],[-30,-23,93],[-30,-25,92],[-29,-27,92],[-27,-29,92],[-26,-32,91],[-24,-35,90],[-22,-38,90],[-21,-40,89],[-19,-42,89],[-18,-43,89],[-17,-43,89],[-16,-43,89],[-15,-43,89],[-15,-42,89],[-14,-42,90],[-13,-41,90],[-13,-41,91],[-12,-40,91],[-11,-40,91],[-11,-39,91],[-10,-39,92],[-9,-39,92],[-8,-39,92],[-7,-39,92],[-7,-39,92],[-6,-40,92],[-6,-40,92],[-5,-40,92],[-5,-40,92],[-4,-39,92],[-4,-39,92],[-4,-39,92],[-3,-38,92],[-3,-38,92]]],["Quarter to deck","rear","corner",[[-815,-940,214],[-832,-935,222],[-849,-930,231],[-867,-926,239],[-886,-922,246],[-904,-916,250],[-923,-912,255],[-942,-911,262],[-962,-908,266],[-981,-905,270],[-1001,-903,273],[-1020,-900,276],[-1040,-897,279],[-1060,-895,282],[-1079,-893,285],[-1099,-891,287],[-1119,-890,289],[-1139,-888,291],[-1159,-887,293],[-1178,-885,296],[-1198,-884,298],[-1218,-882,300],[-1238,-880,302],[-1258,-878,304],[-1277,-877,306],[-1297,-875,308],[-1317,-872,310],[-1337,-870,312],[-1357,-868,314],[-1376,-866,316],[-1396,-863,319],[-1416,-860,321],[-1436,-857,323],[-1455,-855,325],[-1475,-852,327],[-1495,-848,329],[-1515,-845,332],[-1534,-841,333],[-1554,-837,335],[-1573,-834,338],[-1592,-829,340],[-1612,-825,342],[-1631,-821,344],[-1651,-816,346],[-1670,-811,348],[-1690,-806,350],[-1709,-801,352],[-1729,-795,354],[-1748,-790,355],[-1767,-784,355],[-1787,-779,356],[-1806,-773,356],[-1824,-766,355],[-1844,-760,355],[-1863,-755,354],[-1882,-751,355],[-1902,-746,355],[-1921,-743,355],[-1941,-739,354],[-1961,-736,353],[-1981,-733,352],[-2000,-730,351],[-2020,-728,350],[-2040,-725,349],[-2060,-723,348],[-2080,-721,346],[-2100,-719,344],[-2119,-718,342],[-2139,-717,340],[-2159,-716,338],[-2179,-715,337],[-2199,-714,335],[-2219,-713,333],[-2239,-713,331],[-2259,-712,330],[-2279,-711,328],[-2298,-711,326],[-2318,-710,324],[-2338,-709,322],[-2358,-708,319],[-2378,-707,317],[-2398,-706,314],[-2418,-705,313]],[[39,-81,45],[34,-82,46],[27,-83,49],[20,-84,51],[13,-84,52],[8,-84,53],[4,-85,53],[1,-85,53],[0,-85,53],[0,-85,53],[0,-85,52],[0,-85,52],[0,-85,52],[0,-85,52],[0,-85,52],[0,-85,52],[0,-85,53],[-1,-85,53],[-1,-85,53],[-1,-84,54],[-1,-84,54],[-1,-84,55],[-2,-83,55],[-2,-83,56],[-2,-82,57],[-3,-82,57],[-3,-82,57],[-3,-82,57],[-4,-82,58],[-4,-81,58],[-5,-81,58],[-5,-81,58],[-6,-81,59],[-7,-80,59],[-7,-80,60],[-7,-79,61],[-8,-78,61],[-8,-77,63],[-8,-76,64],[-9,-75,66],[-9,-74,67],[-9,-72,68],[-10,-71,69],[-10,-70,71],[-11,-69,72],[-11,-67,73],[-12,-66,74],[-13,-63,76],[-14,-61,78],[-14,-57,81],[-14,-53,84],[-14,-47,87],[-14,-41,90],[-13,-33,93],[-13,-26,96],[-12,-17,98],[-11,-9,99],[-10,-1,99],[-9,6,99],[-8,11,99],[-8,16,98],[-7,20,98],[-7,24,97],[-6,26,96],[-6,28,96],[-6,30,95],[-6,32,95],[-6,32,94],[-6,33,94],[-7,33,94],[-7,33,94],[-7,33,94],[-8,32,94],[-8,31,95],[-8,30,95],[-9,30,95],[-11,28,95],[-13,25,96],[-17,21,96],[-21,16,96],[-27,11,96],[-32,5,95],[-36,0,93]]],["Rear wheel arch","rear","flange",[[-1915,-990,-153],[-1906,-1001,-139],[-1896,-1010,-126],[-1885,-1019,-111],[-1875,-1027,-96],[-1862,-1033,-81],[-1849,-1039,-67],[-1835,-1044,-53],[-1819,-1048,-40],[-1803,-1052,-26],[-1786,-1056,-13],[-1768,-1059,-2],[-1749,-1061,8],[-1730,-1064,18],[-1710,-1066,25],[-1690,-1068,33],[-1669,-1070,39],[-1648,-1072,43],[-1628,-1073,47],[-1608,-1075,51],[-1587,-1076,53],[-1566,-1077,56],[-1544,-1078,56],[-1523,-1078,55],[-1501,-1079,54],[-1481,-1079,51],[-1460,-1079,48],[-1439,-1079,45],[-1419,-1078,39],[-1399,-1078,34],[-1378,-1077,27],[-1359,-1077,19],[-1339,-1076,11],[-1320,-1074,0],[-1301,-1073,-11],[-1282,-1071,-24],[-1266,-1070,-38],[-1250,-1068,-52],[-1235,-1066,-68],[-1221,-1064,-85],[-1207,-1062,-102],[-1197,-1060,-120],[-1187,-1057,-137],[-1177,-1055,-155],[-1169,-1052,-173],[-1162,-1049,-191],[-1154,-1046,-209],[-1146,-1043,-227]],[[25,-96,-9],[24,-97,-7],[23,-97,-5],[22,-98,-3],[20,-98,-2],[19,-98,-1],[18,-98,-1],[17,-98,-2],[17,-98,-3],[17,-98,-5],[17,-98,-6],[16,-98,-7],[16,-98,-9],[14,-99,-9],[13,-99,-9],[11,-99,-9],[9,-99,-7],[7,-99,-8],[5,-100,-7],[3,-100,-6],[2,-100,-6],[1,-100,-6],[-1,-100,-7],[-2,-100,-8],[-3,-100,-8],[-4,-100,-8],[-5,-99,-9],[-6,-99,-9],[-8,-99,-10],[-9,-99,-9],[-11,-99,-8],[-13,-99,-9],[-15,-99,-8],[-16,-98,-7],[-18,-98,-7],[-19,-98,-5],[-20,-98,-4],[-20,-98,-3],[-20,-98,-1],[-19,-98,1],[-17,-99,3],[-15,-99,5],[-14,-99,5],[-12,-99,4],[-10,-99,3],[-9,-100,1],[-7,-100,-1],[-7,-100,-2]]],["Tail corner","rear","lap",[[-2438,-705,305],[-2426,-721,303],[-2414,-737,301],[-2402,-753,298],[-2390,-769,294],[-2379,-785,290],[-2368,-800,284],[-2358,-816,276],[-2349,-831,266],[-2342,-845,254],[-2338,-857,238],[-2337,-866,221],[-2339,-873,202],[-2343,-877,183],[-2349,-879,164],[-2355,-881,145],[-2361,-881,126],[-2367,-882,107],[-2373,-883,88],[-2377,-884,68],[-2381,-885,49],[-2383,-887,29],[-2383,-889,9],[-2382,-891,-11],[-2378,-894,-30],[-2370,-897,-48],[-2359,-900,-65],[-2346,-903,-79],[-2330,-906,-92],[-2314,-909,-102],[-2296,-912,-112],[-2278,-915,-120],[-2260,-919,-127],[-2241,-922,-134],[-2222,-925,-139],[-2203,-928,-143],[-2184,-931,-147],[-2164,-935,-150],[-2145,-938,-152],[-2125,-941,-154],[-2105,-945,-155],[-2086,-948,-157],[-2066,-951,-158],[-2046,-954,-160],[-2027,-957,-162],[-2007,-960,-164],[-1987,-962,-166],[-1967,-965,-169],[-1948,-967,-171],[-1928,-969,-174]],[[-58,-36,73],[-58,-39,72],[-58,-43,70],[-57,-47,67],[-57,-51,64],[-58,-54,61],[-58,-58,57],[-59,-61,53],[-60,-64,48],[-62,-66,43],[-63,-67,39],[-63,-69,35],[-64,-70,32],[-65,-70,30],[-66,-70,28],[-68,-69,26],[-70,-68,24],[-72,-66,23],[-75,-63,21],[-78,-60,18],[-79,-58,16],[-80,-58,14],[-79,-60,12],[-76,-64,9],[-72,-69,6],[-65,-76,3],[-56,-83,-2],[-47,-88,-7],[-39,-91,-12],[-32,-93,-18],[-27,-93,-24],[-23,-92,-31],[-21,-91,-36],[-20,-89,-41],[-19,-87,-46],[-19,-85,-49],[-19,-83,-52],[-18,-83,-53],[-18,-82,-54],[-19,-83,-53],[-19,-83,-52],[-21,-85,-49],[-22,-87,-44],[-25,-89,-38],[-29,-91,-31],[-33,-91,-24],[-37,-91,-16],[-41,-91,-8],[-45,-89,-2],[-47,-88,1]]]]'''


def robot_seams(name):
    """The seams a robot welds, as the Welding cell block has them (car frame, metres): [(seam name, P, N)]."""
    out = []
    for sname, q, jtype, pts, nrm in json.loads(SEAMS_JSON):
        if q != ROBOT_QUARTER[name]:
            continue
        P = np.array(pts, float) / 1000.0; N = np.array(nrm, float) / 100.0
        if "left" in name:
            P[:, 1] *= -1; N[:, 1] *= -1
        out.append((sname, P, N / np.linalg.norm(N, axis=1, keepdims=True)))
    return out


def bead_mesh(trimesh, P, N):
    """A weld bead along points P (a little proud of the sheet, on the torch side N)."""
    Q = P + 0.0025 * N; ms = []
    for a, b in zip(Q[:-1], Q[1:]):
        if np.linalg.norm(b - a) > 1e-5:
            ms.append(trimesh.creation.cylinder(radius=0.0045, segment=[a, b], sections=8))
    for q in Q:
        sp = trimesh.creation.icosphere(subdivisions=1, radius=0.0047); sp.apply_translation(q); ms.append(sp)
    m = trimesh.util.concatenate(ms)
    return np.asarray(m.vertices), np.asarray(m.faces)


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


DROP_NODES = {"wire_feeder", "hose"}      # the wire feeder (box and spool) and the hose along the forearm: not wanted
COVER_Y = 1.98                            # m (GLB, y up): what is on top of the forearm above this is the cover box


def without_cover(trimesh, m):
    """The forearm without the black cover box on top of it and its KUKA lettering (every piece of mesh whose
    middle lies above COVER_Y)."""
    lab = trimesh.graph.connected_component_labels(m.face_adjacency, node_count=len(m.faces))
    top = np.zeros(len(m.faces), bool); cy = m.triangles_center[:, 1]
    for l in np.unique(lab):
        sel = lab == l
        if cy[sel].mean() > COVER_Y:
            top |= sel
    if top.any():
        m = m.copy(); m.update_faces(~top); m.remove_unreferenced_vertices()
    return m


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
        if node in DROP_NODES:
            continue
        T, gname = g[node]; m = sc.geometry[gname].copy(); m.apply_transform(T)
        if link == "a3":
            m = without_cover(trimesh, m)
            if not len(m.faces):
                continue
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
        car_mat = CAR_MAT                    # satin silver (the GLB has a mirror finish)
        m = trimesh.util.concatenate(ms); m.merge_vertices()
        n_t = int(p.get("car_triangles", 0) or 0)
        if n_t:
            m = simplify(trimesh, m, n_t)
        m = crisp(trimesh, m)
        # the frame is open sheet metal (a double-sided material in the GLB): a back copy of every panel, with its own
        # vertices, so each panel shows from both sides (the view draws one side of a face only)
        back = m.copy(); back.invert()
        v = np.vstack([m.vertices, back.vertices]); f = np.vstack([m.faces, np.asarray(back.faces) + len(m.vertices)])
        car = (v @ C + [0, 0, CAR_Z], f)
        ctx.log("[model] car frame from %s: %d triangles (both sides), %s" % (cf[0].name, len(f), car_mat))
    else:
        car = box_mesh([-0.05, 0, CAR_Z + 0.1], [4.85, 1.9, 1.3]); car_mat = CAR_MAT
    sled = box_mesh([0, 0, 0.44], [4.4, 1.25, 0.12])

    links = [{}]; joints = []; layout = []                 # link 0: nothing (every part rides on a joint)
    state = {"o": np.zeros(3)}                             # world position of the current frame's origin (at zero angles)
    def pack(v, f, mat):
        mat = mat if isinstance(mat, tuple) else (mat, 0.1, 0.55)
        return {"v": np.round(np.asarray(v, float).ravel(), 4).tolist(), "f": np.asarray(f, int).ravel().tolist(),
                "color": mat[0], "metalness": mat[1], "roughness": mat[2]}
    def joint(origin_world, axis, role, mesh=None, mat=None, frame_rot=np.eye(3), rpy=(0, 0, 0), parent=None, kind=None):
        """A joint at origin_world (given in world coordinates at zero angles; the chain's frames stay world-aligned,
        except inside a robot, where they are the robot's frame: frame_rot maps it to world)."""
        xyz = frame_rot.T @ (np.asarray(origin_world, float) - state["o"]) if parent is None else np.asarray(origin_world, float)   # with a parent: from its origin
        j = {"name": role, "xyz": np.round(xyz, 6).tolist(), "rpy": list(rpy), "axis": list(map(float, axis))}
        if parent is not None:
            j["parent"] = parent
        if kind:
            j["type"] = kind
        joints.append(j); layout.append(role)
        if parent is None:
            state["o"] = np.asarray(origin_world, float)
        links.append(pack(mesh[0], mesh[1], mat) if mesh is not None else {})
    # the sled and the car
    O = [np.array([0.0, FAR, 0.0]), np.array([FAR, 0.0, 0.0]), np.zeros(3)]
    joint(O[0], [0, 0, 1], "car:x", (sled[0] - O[0], sled[1]), ("#2b2f36", 0.5, 0.45))
    joint(O[1], [0, 0, 1], "car:y")
    joint(O[2], [0, 0, 1], "car:yaw", (car[0] - O[2], car[1]), car_mat)      # satin silver
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
    # the weld beads: short pieces of each seam, riding on the car (parent: the car's turn), each on a straight joint that
    # holds it HIDE m below its place (under the floor) until the Welding cell block lifts it there as the torch passes
    beads = []
    if cf:
        import trimesh
        surf = None
        try:
            cm = trimesh.Trimesh(car[0][: len(car[0]) // 2] - [0, 0, CAR_Z], car[1][: len(car[1]) // 2], process=False)   # the car's front faces
            surf = trimesh.proximity.ProximityQuery(cm)
        except Exception as e:
            ctx.log("[model] beads not pressed onto the car: %r" % e)
        def pressed(P):
            """The seam's points moved onto the sheet (a smooth correction along it): the bead lies on the car."""
            if surf is None:
                return P
            c, _, _ = surf.on_surface(P); o = c - P
            for _ in range(6):
                o[1:-1] = 0.25 * o[:-2] + 0.5 * o[1:-1] + 0.25 * o[2:]
            return P + o
        for name, *_ in robots:
            for sname, P, N in robot_seams(name):
                P = pressed(P)
                s_ = np.r_[0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]
                for a in range(0, len(P) - 1, SEG):
                    b = min(len(P) - 1, a + SEG)
                    v, f = bead_mesh(trimesh, P[a:b + 1], N[a:b + 1])
                    jn = "bead:%s:%s:%d" % (name, sname.lower(), a // SEG)
                    joint(np.zeros(3), [0, 0, 1], jn, (v + [0, 0, CAR_Z - HIDE], f), BEAD_MAT, parent="car:yaw", kind="prismatic")
                    beads.append({"joint": jn, "robot": name, "seam": sname, "s0": round(float(s_[a]), 4), "s1": round(float(s_[b]), 4)})
    # the arc: a glow at each wire, held inside the wrist until the robot welds
    arcs = {}
    if cf:
        import trimesh
        d = TCP - QP[5]; L = float(np.linalg.norm(d))
        sp = trimesh.creation.icosphere(subdivisions=2, radius=0.022)
        for name, *_ in robots:
            jn = "arc:%s" % name
            joint(np.zeros(3), (d / L).tolist(), jn, (np.asarray(sp.vertices), np.asarray(sp.faces)), ARC_MAT, parent="%s:A6" % name, kind="prismatic")
            arcs[name] = {"joint": jn, "on": round(L, 4)}
    model = {"format": "esasim.robot/1", "robot": "Welding cell: %s KUKA KR 210 R2700 and the car frame" % ("four" if len(robots) == 4 else "one"),
             "units": "m", "scale": 1, "far": FAR, "robots": [r[0] for r in robots], "joints_layout": layout, "beads": beads, "arcs": arcs, "hide": HIDE, "joints": joints, "links": links}
    name = "welding_cell_%s.robot.json.gz" % ("all" if len(robots) == 4 else robots[0][0].replace(" ", "_"))
    with open(ctx.output("robot", name), "wb") as fh:
        fh.write(gzip.compress(json.dumps(model, separators=(",", ":")).encode(), 6))
    ctx.log("[model] %d joints, %d links" % (len(joints), len(links)))
    return {"robots": [r[0] for r in robots], "file": name, "joints": len(joints), "triangles": sum(len(l.get("f", [])) // 3 for l in links)}
