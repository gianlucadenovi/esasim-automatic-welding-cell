# ── EsaSim block ──────────────────────────────────────────────────────
# Welding cell model (ws-welding-robot-model) · version 12 · machine block, Python: def run(ctx)
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
The cell around them: one red I-beam rail standing on plates bolted to the floor every 1.5 m; the sled, a thick deck on
two carriages clamped to the beam; the robots' bases, black steel blocks square to the rail on floor plates held by
four big bolts (the robot's own base, with its own plates, stands on the block).
Each part carries its material: colour, metalness and roughness (steel and copper metallic, castings painted). For a
view that can: the car frame mirrors the cell ("envmap": "cube"), each arc glows and throws sparks and smoke
("fx": "arc"), the orange paint has a clear coat ("clearcoat"), and the cell stands in a hall with walls, a roof and
rows of lamps over a polished concrete floor ("hall").
Finishes in seconds, so the view has the model while the welding cell runs beside it.
"""
import gzip
import json
import math
import re

import numpy as np

CELL_A_X, CELL_B_X = -5.5, 5.5          # m along the rail: the MIG cell (entry side) and the spot welding cell (exit side)
LAYOUT = [("front right", 1.35, -2.00, 0.45, 1.0), ("front left", 1.35, 2.00, 0.45, 1.0),     # in a cell: name, base x, y, z, aim x
          ("rear right", -1.40, -2.30, 0.40, -1.0), ("rear left", -1.40, 2.30, 0.40, -1.0)]
ROBOTS = [(n, x + CELL_A_X, y, z, a + CELL_A_X) for n, x, y, z, a in LAYOUT]                    # the MIG robots (seam welding)
SPOT_ROBOTS = [("spot " + n, x + CELL_B_X, y, z, a + CELL_B_X) for n, x, y, z, a in LAYOUT]     # the spot welding robots
SPOT_DROP = {"torch_tip", "torch_nozzle", "torch_body", "torch_brass", "torch_clamp", "camera_lens", "camera_body"}
MARK_MAT = ("#3b3733", 0.55, 0.45)      # a spot weld: a dark, heat-tinted dimple on both sides of the sheet
SPOTS_JSON = r'''{"spot front right":[[0.651,-0.88,0.2376,-0.0549,-0.7404,0.6699],[0.721,-0.9522,0.114,-0.037,-0.9975,0.0601],[0.7256,-0.9656,-0.0266,0.1172,-0.993,0.0166],[0.7212,-0.9628,-0.1401,0.1061,-0.9923,-0.0641],[0.7144,-0.9589,-0.2248,-0.162,-0.9819,-0.0976],[1.6817,-1.0231,-0.0376,0.1458,-0.9859,-0.0818]],"spot front left":[[0.651,0.88,0.2376,-0.0549,0.7404,0.6699],[0.721,0.9522,0.114,-0.037,0.9975,0.0601],[0.7256,0.9656,-0.0266,0.1172,0.993,0.0166],[0.7212,0.9628,-0.1401,0.1061,0.9923,-0.0641],[0.7144,0.9589,-0.2248,-0.162,0.9819,-0.0976],[1.6817,1.0231,-0.0376,0.1458,0.9859,-0.0818]],"spot rear right":[[-1.2316,-0.7949,0.3966,-0.6209,-0.782,-0.0543],[-0.7072,-0.9583,0.1695,-0.0063,-0.9785,0.2059],[-0.6966,-0.9528,0.1857,-0.009,-0.9445,0.3284],[-0.6947,-0.9643,0.1437,0.0229,-0.9759,0.2171],[-2.0073,-0.9592,-0.1403,-0.171,-0.982,-0.0802],[-2.3189,-0.9062,-0.0935,-0.2034,-0.9779,-0.0487]],"spot rear left":[[-1.2316,0.7949,0.3966,-0.6209,0.782,-0.0543],[-0.7072,0.9583,0.1695,-0.0063,0.9785,0.2059],[-0.6966,0.9528,0.1857,-0.009,0.9445,0.3284],[-0.6947,0.9643,0.1437,0.0229,0.9759,0.2171],[-2.0073,0.9592,-0.1403,-0.171,0.982,-0.0802],[-2.3189,0.9062,-0.0935,-0.2034,0.9779,-0.0487]]}'''   # the spot welds, car frame (m): {robot: [[x, y, z, nx, ny, nz] (sheet normal toward the robot), ...]}, in welding order
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


CAR_MAT = ("#c4c7cb", 1.0, 0.32)       # satin silver steel (reflects the cell through the cube map of a view that has one)
DOOR_W, DOOR_HT = 3.6, 3.2              # the roll-up doors in the end walls (the car comes in at x = -13 and leaves at 13)
HALL = {"x": [-13.0, 13.0], "y": [-7.5, 7.5], "height": 8.0,   # the hall around the cell (walls, roof, lamps: drawn by the view)
        "doors": [{"x": -13.0, "y": 0.0, "w": DOOR_W, "h": DOOR_HT}, {"x": 13.0, "y": 0.0, "w": DOOR_W, "h": DOOR_HT}],
        "apron": 9.0, "logo": "EsaSim"}
RAIL_MAT = ("#b3141c", 0.65, 0.2)      # the rail: a red I-beam, glossy
SLED_MAT = ("#2b2f36", 0.6, 0.4)
BASE_MAT = ("#1b1c1f", 0.35, 0.55)     # the robots' bases: black painted steel
BOLT_MAT = ("#8a8f96", 0.95, 0.28)
PLATE_MAT = ("#3a3d42", 0.8, 0.45)
BEAD_MAT = ("#3a332d", 0.3, 0.7)       # a weld bead: dark, heat-tinted steel
GRID_MAT = ("#858b92", 0.9, 0.38)      # the floor grating under the car: galvanised steel
CAB_MAT = ("#c9ccc8", 0.2, 0.5)        # the control cabinets: light grey (RAL 7035) sheet steel
CAB_DOOR = ("#bfc3bf", 0.2, 0.45)
CAB_DARK = ("#1c1e21", 0.3, 0.6)       # plinth, handle, panel frame
CABLE_MAT = ("#121314", 0.0, 0.5)      # black cable jacket
PLUG_MAT = ("#b4b9bf", 0.95, 0.22)     # the metal connectors
STRIPE_MAT = ("#f2c200", 0.0, 0.6)     # yellow floor marking
DOOR_MAT = ("#8b939c", 0.75, 0.38)     # the doors' steel slats
FRAME_MAT = ("#2e3136", 0.6, 0.45)     # door guides and housing
LAMP_GREEN, LAMP_AMBER, SCREEN = ("#39ff6e", 0.0, 0.3), ("#ffb020", 0.0, 0.3), ("#4fa8ff", 0.0, 0.3)   # (drawn glowing)
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


def cat(parts):
    """Several (vertices, faces) as one."""
    v, f, n = [], [], 0
    for pv, pf in parts:
        v.append(np.asarray(pv, float)); f.append(np.asarray(pf, int) + n); n += len(pv)
    return np.vstack(v), np.vstack(f)


def cyl_mesh(r, z0, h, x, y, sections=6):
    """A vertical prism (a hexagonal bolt head with sections=6) of radius r from z0 up h, at (x, y)."""
    a = np.linspace(0, 2 * math.pi, sections, endpoint=False) + math.pi / sections
    ring = np.c_[x + r * np.cos(a), y + r * np.sin(a)]
    v = np.vstack([np.c_[ring, np.full(sections, z0)], np.c_[ring, np.full(sections, z0 + h)], [[x, y, z0], [x, y, z0 + h]]])
    f = []
    for k in range(sections):
        k2 = (k + 1) % sections
        f += [[k, k2, sections + k2], [k, sections + k2, sections + k], [2 * sections, k2, k], [2 * sections + 1, sections + k, sections + k2]]
    return v, np.array(f)


def rail_mesh():
    """The rail: one I-beam along the cell (top at 0.32 m), standing on plates bolted to the floor every 1.5 m."""
    L = 42.0; P = 0.02                                            # the beam runs out through both doors; it stands on plates 20 mm thick
    parts = [box_mesh([0, 0, P + 0.0125], [L, 0.22, 0.025]), box_mesh([0, 0, (P + 0.025 + 0.295) / 2], [L, 0.02, 0.295 - P - 0.025]),
             box_mesh([0, 0, 0.3075], [L, 0.22, 0.025])]
    plates, bolts = [], []
    for x in np.arange(-20, 20.01, 1.5):                          # a plate every 1.5 m, bolted to the floor on both sides of the beam
        plates.append(box_mesh([x, 0, P / 2], [0.6, 0.9, P]))
        for dx in (-0.22, 0.22):
            for dy in (-0.36, 0.36):
                bolts += [cyl_mesh(0.03, P, 0.005, x + dx, dy, 20), cyl_mesh(0.022, P + 0.005, 0.016, x + dx, dy, 6), cyl_mesh(0.011, P + 0.021, 0.012, x + dx, dy, 10)]
    return cat(parts), cat(plates), cat(bolts)


def sled_mesh():
    """The sled: a thick deck (top at 0.50 m, where the car frame stands) on two carriages that clamp the beam's top
    flange from both sides."""
    parts = [box_mesh([0, 0, 0.435], [4.4, 1.25, 0.13])]
    for x in (-1.4, 1.4):
        parts += [box_mesh([x, 0, 0.345], [0.62, 0.34, 0.05]),                       # on the top flange
                  box_mesh([x, 0.13, 0.305], [0.62, 0.04, 0.09]), box_mesh([x, -0.13, 0.305], [0.62, 0.04, 0.09]),   # beside it
                  box_mesh([x, 0.0925, 0.285], [0.62, 0.035, 0.02]), box_mesh([x, -0.0925, 0.285], [0.62, 0.035, 0.02])]   # under it
    return cat(parts)


def base_mesh(bx, by, bz):
    """A robot's base: a black steel block up to the robot's foot, square to the rail, on a floor plate held down by
    four big bolts."""
    top = bz - 0.004                                              # (just under the robot's own base: no two faces in one plane)
    block = box_mesh([bx, by, (top + 0.03) / 2], [0.9, 0.9, top - 0.03])
    plate = box_mesh([bx, by, 0.015], [1.3, 1.3, 0.03])
    bolts = []
    for dx in (-0.52, 0.52):
        for dy in (-0.52, 0.52):
            bolts += [cyl_mesh(0.06, 0.03, 0.008, bx + dx, by + dy, 24), cyl_mesh(0.042, 0.038, 0.032, bx + dx, by + dy, 6)]   # washer, hex nut
            bolts.append(cyl_mesh(0.022, 0.07, 0.02, bx + dx, by + dy, 12))                                                    # the stud
    return block, plate, cat(bolts)


def cyl_axis(p0, p1, r, n=16, caps=True):
    """A cylinder of radius r from p0 to p1 (any direction)."""
    p0 = np.asarray(p0, float); p1 = np.asarray(p1, float); a = p1 - p0; L = np.linalg.norm(a); a = a / L
    u = np.cross(a, [0, 0, 1] if abs(a[2]) < 0.9 else [1, 0, 0]); u /= np.linalg.norm(u); w = np.cross(a, u)
    ang = np.linspace(0, 2 * math.pi, n, endpoint=False)
    ring = np.cos(ang)[:, None] * u + np.sin(ang)[:, None] * w
    v = np.vstack([p0 + r * ring, p1 + r * ring, [p0, p1]]); f = []
    for k in range(n):
        k2 = (k + 1) % n
        f += [[k, k2, n + k2], [k, n + k2, n + k]]
        if caps:
            f += [[2 * n, k2, k], [2 * n + 1, n + k, n + k2]]
    return v, np.array(f)


def tube_mesh(P, r, n=10):
    """A tube of radius r along the polyline P (a cable), with frames carried along it (no twist)."""
    P = np.asarray(P, float); T = np.gradient(P, axis=0); T /= np.linalg.norm(T, axis=1)[:, None]
    u = np.cross(T[0], [0, 0, 1] if abs(T[0][2]) < 0.9 else [1, 0, 0]); u /= np.linalg.norm(u)
    ang = np.linspace(0, 2 * math.pi, n, endpoint=False); V = []
    for i in range(len(P)):
        if i:
            u = u - T[i] * (u @ T[i]); u /= np.linalg.norm(u)
        w = np.cross(T[i], u)
        V.append(P[i] + r * (np.cos(ang)[:, None] * u + np.sin(ang)[:, None] * w))
    V = np.vstack(V); f = []
    for i in range(len(P) - 1):
        for k in range(n):
            a, b = i * n + k, i * n + (k + 1) % n
            f += [[a, b, b + n], [a, b + n, a + n]]
    return V, np.array(f)


def spline(pts, m=12):
    """A Catmull-Rom curve through pts, m samples per span."""
    pts = np.asarray(pts, float); Q = np.vstack([2 * pts[0] - pts[1], pts, 2 * pts[-1] - pts[-2]]); out = []
    for i in range(1, len(Q) - 2):
        p0, p1, p2, p3 = Q[i - 1], Q[i], Q[i + 1], Q[i + 2]
        for s in np.linspace(0, 1, m, endpoint=False):
            out.append(0.5 * (2 * p1 + (p2 - p0) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s * s + (3 * p1 - p0 - 3 * p2 + p3) * s ** 3))
    out.append(pts[-1])
    return np.array(out)


def grid_mesh(xc=0.0):
    """The floor grating under the car where it stops: two fields beside the rail, bearing bars along the rail every
    33 mm, cross bars every 100 mm, in a frame."""
    out = []
    for sy in (-1, 1):
        y0, y1 = 0.5 * sy, 1.3 * sy; ylo, yhi = min(y0, y1), max(y0, y1); x0, x1 = xc - 3.2, xc + 3.2
        for y in np.arange(ylo + 0.02, yhi - 0.01, 0.033):
            out.append(box_mesh([xc, y, 0.015], [x1 - x0, 0.004, 0.03]))
        for x in np.arange(x0 + 0.05, x1 - 0.02, 0.1):
            out.append(box_mesh([x, (ylo + yhi) / 2, 0.022], [0.006, yhi - ylo, 0.016]))
        out += [box_mesh([xc, ylo + 0.01, 0.016], [x1 - x0, 0.02, 0.032]), box_mesh([xc, yhi - 0.01, 0.016], [x1 - x0, 0.02, 0.032]),
                box_mesh([x0 + 0.01, (ylo + yhi) / 2, 0.016], [0.02, yhi - ylo, 0.032]), box_mesh([x1 - 0.01, (ylo + yhi) / 2, 0.016], [0.02, yhi - ylo, 0.032])]
    return cat(out)


def cabinet_spot(bx, by, x0=0.0):
    """Where a robot's control cabinet stands: beside it, away from the rail and from the middle of its cell (at x0)."""
    return bx + math.copysign(1.25, bx - x0), by + math.copysign(1.3, by)


def cabinet_meshes(cx, cy):
    """An industrial control cabinet (the robot's controller and the cell's PLC): a 0.8 x 0.5 x 2.0 m steel enclosure
    on a plinth, its door toward the rail, with a handle, an operator panel and signal lamps."""
    s = -math.copysign(1, cy); W, D, H = 0.8, 0.5, 2.0; fy = cy + s * D / 2          # s: toward the rail; fy: the front
    body = [box_mesh([cx, cy, 0.1 + H / 2], [W, D, H]), box_mesh([cx, cy, 0.1 + H + 0.02], [W + 0.04, D + 0.04, 0.04])]
    door = [box_mesh([cx, fy + s * 0.008, 0.1 + H / 2], [W - 0.04, 0.016, H - 0.08])]
    dark = [box_mesh([cx, cy, 0.05], [W, D, 0.1]), box_mesh([cx + 0.3, fy + s * 0.03, 1.1], [0.03, 0.03, 0.26]),
            box_mesh([cx - 0.08, fy + s * 0.02, 1.45], [0.36, 0.012, 0.28])]
    screen = [box_mesh([cx - 0.08, fy + s * 0.027, 1.47], [0.28, 0.004, 0.18])]
    green = [cyl_axis([cx - 0.2, fy + s * 0.016, 1.78], [cx - 0.2, fy + s * 0.04, 1.78], 0.022)]
    amber = [cyl_axis([cx - 0.1, fy + s * 0.016, 1.78], [cx - 0.1, fy + s * 0.04, 1.78], 0.022)]
    return cat(body), cat(door), cat(dark), cat(screen), cat(green), cat(amber), (cx, fy, s)


def plug_meshes(face, out):
    """A round industrial connector plugged into a socket on a face: flange, metal body, knurled nut, rubber boot.
    Returns (metal, rubber, the point where the cable leaves it)."""
    face = np.asarray(face, float); out = np.asarray(out, float)
    u = np.cross(out, [0, 0, 1]); u = u / np.linalg.norm(u) if np.linalg.norm(u) > 1e-6 else np.array([1.0, 0, 0]); w = np.cross(out, u)
    fl = np.array([face + 0.045 * (a * u + b * w) for a in (-1, 1) for b in (-1, 1)])
    flv = np.vstack([fl, fl + 0.008 * out]); flf = np.array([[0, 1, 3], [0, 3, 2], [4, 7, 5], [4, 6, 7], [0, 4, 5], [0, 5, 1], [2, 3, 7], [2, 7, 6], [0, 2, 6], [0, 6, 4], [1, 5, 7], [1, 7, 3]])
    metal = cat([(flv, flf), cyl_axis(face, face + 0.075 * out, 0.03, 16), cyl_axis(face + 0.03 * out, face + 0.05 * out, 0.035, 12)])
    rubber = cyl_axis(face + 0.075 * out, face + 0.12 * out, 0.022, 12)
    return metal, rubber, face + 0.12 * out


def cable_meshes(bx, by, cx, cy):
    """The two cables from a robot's cabinet to its base (power, thick; signals, thin), on the floor, each plugged in at
    both ends with a metal connector."""
    sy = math.copysign(1, cy); sx = math.copysign(1, cx - bx)
    metal, rubber, cables = [], [], []
    for off, r in ((-0.09, 0.019), (0.09, 0.012)):
        fb = np.array([bx + sx * 0.18 + off, by + sy * 0.45, 0.24]); ob = np.array([0, sy, 0.0])           # on the base's outer face
        fc = np.array([cx - sx * 0.18 + off, cy - sy * 0.25, 0.3]); oc = np.array([0, -sy, 0.0])            # on the cabinet's front
        m1, r1, a = plug_meshes(fb, ob); m2, r2, b = plug_meshes(fc, oc)
        metal += [m1, m2]; rubber += [r1, r2]
        pts = [a, a + ob * 0.08 + [0, 0, -0.04], [a[0], a[1] + sy * 0.32, r + 0.002],
               [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, r + 0.002], [b[0], b[1] - sy * 0.12, r + 0.002], b + oc * 0.05 + [0, 0, -0.08], b]
        C = spline(pts, 14); C[:, 2] = np.maximum(C[:, 2], r + 0.001)
        cables.append(tube_mesh(C, r, 10))
    return cat(metal), cat(rubber + cables)


def door_meshes(xw, inward):
    """A roll-up door in the end wall at x = xw: the slatted panel (with windows, a notch for the rail and a rubber seal),
    and fixed: the guides it runs up in, the housing above them and the frame of the opening."""
    xp = xw + inward * 0.1; W, H = DOOR_W, DOOR_HT
    slats, glass = [], []
    for z in np.arange(0.36, H - 0.05, 0.2):
        if abs(z - 2.16) < 0.01:                                  # a row of windows
            for y in np.linspace(-W / 2 + 0.45, W / 2 - 0.45, 4):
                glass.append(box_mesh([xp, y, z + 0.1], [0.045, 0.55, 0.14]))
            for y0, y1 in zip([-W / 2] + [y + 0.275 for y in np.linspace(-W / 2 + 0.45, W / 2 - 0.45, 4)],
                              [y - 0.275 for y in np.linspace(-W / 2 + 0.45, W / 2 - 0.45, 4)] + [W / 2]):
                slats.append(box_mesh([xp, (y0 + y1) / 2, z + 0.1], [0.04, y1 - y0, 0.18]))
        else:
            slats.append(box_mesh([xp, 0, z + 0.1], [0.04, W, 0.18]))
        slats.append(box_mesh([xp, 0, z + 0.2], [0.05, W, 0.02]))
    for sy in (-1, 1):                                            # the bottom slats, with a notch where the rail passes
        slats.append(box_mesh([xp, sy * (W / 2 + 0.22) / 2, 0.21], [0.04, W / 2 - 0.22, 0.3]))
    seal = [box_mesh([xp, sy * (W / 2 + 0.22) / 2, 0.03], [0.06, W / 2 - 0.22, 0.06]) for sy in (-1, 1)]
    panel = cat(slats + seal); 
    frame = [box_mesh([xp, sy * (W / 2 + 0.06), 3.25], [0.14, 0.12, 6.5]) for sy in (-1, 1)]
    frame += [box_mesh([xp + inward * 0.1, 0, 6.65], [0.4, W + 0.4, 0.4])]
    frame += [box_mesh([xw, sy * (W / 2 + 0.05), H / 2], [0.24, 0.1, H]) for sy in (-1, 1)] + [box_mesh([xw, 0, H + 0.05], [0.24, W + 0.2, 0.1])]
    bump = [box_mesh([xw + inward * 0.25, sy * (W / 2 + 0.3), 0.5], [0.16, 0.16, 1.0]) for sy in (-1, 1)]   # yellow bollards
    return panel, cat(glass), cat(frame), cat(bump)


def stripe_meshes(x0, x1, y0, y1, w=0.12, h=0.004):
    """The yellow line on the floor around the cell (the robots, their cabinets and the car's place)."""
    return cat([box_mesh([(x0 + x1) / 2, y0, h / 2], [x1 - x0 + w, w, h]), box_mesh([(x0 + x1) / 2, y1, h / 2], [x1 - x0 + w, w, h]),
                box_mesh([x0, (y0 + y1) / 2, h / 2], [w, y1 - y0, h]), box_mesh([x1, (y0 + y1) / 2, h / 2], [w, y1 - y0, h])])


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
        rgb = tuple(int(x) for x in c[:3])
        if rgb[0] > 220 and 60 < rgb[1] < 150 and rgb[2] < 60:          # the KUKA orange: glossy paint under a clear coat
            return ("#%02x%02x%02x" % rgb, 0.0, 0.3, 0.7)
        return ("#%02x%02x%02x" % rgb, round(float(met), 2), round(float(rough), 2))
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


# ---- the spot welding gun: a servo C-gun on the flange (robot frame, zero angles; the flange face at x = 1.79 on the
# A6 axis, z = 1.784). Built from turned parts, swept castings and rounded boxes; every mesh has its vertices split at
# sharp edges so the viewer's smooth normals keep flat faces flat and round faces round.
GUN_K = np.array([2.24, 0.0, 1.784])                       # contact point (the TCP) at zero angles
GUN_R0 = np.c_[[0, 0, -1.0], [0, -1.0, 0], [-1.0, 0, 0]]  # tool axes (columns) at zero angles
GUN_OPEN = 0.07                                            # m: how far the moving electrode backs off to open
GUN_FLANGE = np.array([1.79, 0.0, 1.784])                  # the flange face on the A6 axis
GUN_MAT = {"steel": ("#3b3f45", 0.7, 0.38), "cast": ("#b9bdc3", 0.75, 0.34), "alu": ("#d9dce0", 0.9, 0.24),
           "motor": ("#18191b", 0.35, 0.42), "transformer": ("#2c3440", 0.45, 0.4), "copper": ("#c27a45", 0.95, 0.24),
           "cap": ("#a85f32", 0.9, 0.3), "chrome": ("#e8eaec", 1.0, 0.1), "hose_blue": ("#1f6fd1", 0.0, 0.42, 0.5),
           "hose_red": ("#c3302b", 0.0, 0.42, 0.5), "cable": ("#121314", 0.0, 0.55), "label": ("#e8b21a", 0.2, 0.45),
           "insul": ("#26282b", 0.05, 0.6), "brass": ("#c9a24a", 1.0, 0.33), "paper": ("#f2f2ee", 0.0, 0.7),
           "hose_green": ("#3fae73", 0.0, 0.4, 0.5), "wire_green": ("#2f8f4e", 0.0, 0.45), "wire_red": ("#b8241f", 0.0, 0.45)}


def _g(u, y, h):
    """Gun coordinates (u along the flange axis from the flange face, y, h up from the axis) to the robot frame."""
    return GUN_FLANGE + np.array([u, y, h], float)


def _frame(a):
    a = np.asarray(a, float); a = a / np.linalg.norm(a)
    t = np.array([0, 0, 1.0]) if abs(a[2]) < 0.9 else np.array([1.0, 0, 0])
    b1 = np.cross(a, t); b1 /= np.linalg.norm(b1); b2 = np.cross(a, b1)
    return a, b1, b2


def g_lathe(p0, axis, prof, n=40, phase=0.0):
    """A turned part: prof [(t along the axis, radius), ...] from p0 (radius 0 at an end closes it)."""
    a, b1, b2 = _frame(axis); p0 = np.asarray(p0, float)
    ang = np.linspace(0, 2 * math.pi, n, endpoint=False) + phase; ring = np.cos(ang)[:, None] * b1 + np.sin(ang)[:, None] * b2
    V, F, rows = [], [], []
    for t, r in prof:
        if r < 1e-7:
            rows.append([len(V)]); V.append(p0 + t * a)
        else:
            rows.append(list(range(len(V), len(V) + n))); V.extend(p0 + t * a + r * ring)
    for r0, r1 in zip(rows[:-1], rows[1:]):
        for k in range(n):
            k2 = (k + 1) % n
            if len(r0) == 1 and len(r1) > 1:
                F.append([r0[0], r1[k2], r1[k]])
            elif len(r1) == 1 and len(r0) > 1:
                F.append([r0[k], r0[k2], r1[0]])
            elif len(r0) > 1:
                F += [[r0[k], r0[k2], r1[k2]], [r0[k], r1[k2], r1[k]]]
    return np.array(V), np.array(F)


def g_rrect(w, d, r, m=6):
    """A rounded rectangle (w x d, corner radius r), counter-clockwise."""
    r = min(r, w / 2 - 1e-4, d / 2 - 1e-4); P = []
    for cx, cy, a0 in ((w / 2 - r, d / 2 - r, 0), (-w / 2 + r, d / 2 - r, 90), (-w / 2 + r, -d / 2 + r, 180), (w / 2 - r, -d / 2 + r, 270)):
        for k in range(m + 1):
            a = math.radians(a0 + 90 * k / m); P.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return np.array(P)


def g_sweep(path, sec, up=(0, 0, 1), caps=True):
    """A tube: the 2D section sec (x along 'side', y along the path's normal toward up) carried along path."""
    path = np.asarray(path, float); n = len(path); T = np.gradient(path, axis=0); T /= np.linalg.norm(T, axis=1)[:, None]
    up = np.asarray(up, float); V, F = [], []; m = len(sec)
    s = np.cross(T[0], up); s = s / np.linalg.norm(s) if np.linalg.norm(s) > 1e-6 else _frame(T[0])[1]
    for i in range(n):
        if i:
            s = s - T[i] * (s @ T[i]); s /= np.linalg.norm(s)        # parallel transport
        nn = np.cross(s, T[i])
        V.extend(path[i] + sec[:, 0:1] * s + sec[:, 1:2] * nn)
    for i in range(n - 1):
        for k in range(m):
            k2 = (k + 1) % m; a, b, c, d = i * m + k, i * m + k2, (i + 1) * m + k2, (i + 1) * m + k
            F += [[a, b, c], [a, c, d]]
    if caps:
        for i, flip in ((0, True), (n - 1, False)):
            ci = len(V); V.append(path[i])
            for k in range(m):
                k2 = (k + 1) % m; tri = [ci, i * m + k, i * m + k2]
                F.append(tri[::-1] if flip else tri)
    V = np.array(V); F = np.array(F)
    return V, F


def g_curve(pts, n=24):
    """A smooth curve through pts (Catmull-Rom), about n points per span."""
    P = np.asarray(pts, float); P = np.vstack([2 * P[0] - P[1], P, 2 * P[-1] - P[-2]]); out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for t in np.linspace(0, 1, n, endpoint=False):
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(P[-2]); return np.array(out)


def g_rbox(c, size, r, k=4):
    """A box with rounded edges and corners (radius r), centred at c."""
    h = np.array(size, float) / 2; r = min(r, *(h - 1e-4)); hi = h - r
    def coords(hh, ii):
        cur = [-hh + (hh - ii) * (1 - math.cos(math.pi / 2 * j / k)) for j in range(k + 1)]
        return np.array(cur + [-c_ for c_ in cur[::-1]])
    V, F = [], []
    for ax in range(3):
        o1, o2 = [a for a in range(3) if a != ax]
        A, B = coords(h[o1], hi[o1]), coords(h[o2], hi[o2])
        for sgn in (-1, 1):
            base = len(V)
            for a in A:
                for b in B:
                    p = np.zeros(3); p[ax] = sgn * h[ax]; p[o1] = a; p[o2] = b; V.append(p)
            nb = len(B)
            for i in range(len(A) - 1):
                for j in range(nb - 1):
                    q = [base + i * nb + j, base + (i + 1) * nb + j, base + (i + 1) * nb + j + 1, base + i * nb + j + 1]
                    tri = [[q[0], q[1], q[2]], [q[0], q[2], q[3]]]
                    if (sgn > 0) != ((ax == 1)):
                        tri = [t[::-1] for t in tri]
                    F += tri
    V = np.array(V); inner = np.clip(V, -hi, hi); off = V - inner; ln = np.linalg.norm(off, axis=1)
    V = inner + np.where(ln[:, None] > 1e-9, off / np.maximum(ln, 1e-9)[:, None] * r, 0)
    key = np.round(V, 7); u, inv = np.unique(key, axis=0, return_inverse=True); inv = inv.ravel()
    F = inv[np.array(F)]; F = F[(F[:, 0] != F[:, 1]) & (F[:, 1] != F[:, 2]) & (F[:, 0] != F[:, 2])]
    return u + np.asarray(c, float), F


def g_orient(v, f, R, t):
    return np.asarray(v) @ np.asarray(R).T + t, f


def g_split(v, f, angle=34.0, orient=True):
    """Split vertices where faces meet at more than angle degrees, so smooth vertex normals keep the edges sharp
    (and turn the faces outward first)."""
    v = np.asarray(v, float); f = np.asarray(f, int)
    vol = np.einsum("ij,ij->i", v[f[:, 0]] - v.mean(0), np.cross(v[f[:, 1]] - v.mean(0), v[f[:, 2]] - v.mean(0))).sum()
    if orient and vol < 0:
        f = f[:, ::-1]
    fn = np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]]); ln = np.linalg.norm(fn, axis=1); ok = ln > 1e-14
    fn[ok] /= ln[ok][:, None]
    nf = len(f); corner = np.arange(nf * 3).reshape(nf, 3); parent = np.arange(nf * 3)
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x
    edges = {}
    for fi in range(nf):
        for k in range(3):
            a, b = f[fi, k], f[fi, (k + 1) % 3]; key = (a, b) if a < b else (b, a)
            edges.setdefault(key, []).append((fi, k, (k + 1) % 3))
    cos_t = math.cos(math.radians(angle))
    for (a, b), lst in edges.items():
        for i in range(len(lst)):
            for j in range(i + 1, len(lst)):
                f1, k1a, k1b = lst[i]; f2, k2a, k2b = lst[j]
                if fn[f1] @ fn[f2] < cos_t:
                    continue
                for vert in (a, b):
                    c1 = corner[f1, k1a] if f[f1, k1a] == vert else corner[f1, k1b]
                    c2 = corner[f2, k2a] if f[f2, k2a] == vert else corner[f2, k2b]
                    r1, r2 = find(c1), find(c2)
                    if r1 != r2:
                        parent[r1] = r2
    roots = np.array([find(c) for c in range(nf * 3)])
    u, inv = np.unique(roots, return_inverse=True)
    return v[f.ravel()[u]], inv.reshape(nf, 3)


def g_fillet(poly, rad, m=6):
    """A polygon (counter-clockwise, 2D) with its corners rounded (rad: one radius, or one per corner)."""
    P = np.asarray(poly, float); n = len(P); rad = [rad] * n if np.isscalar(rad) else rad; out = []
    for i in range(n):
        a, b, c = P[i - 1], P[i], P[(i + 1) % n]
        d1 = (a - b) / np.linalg.norm(a - b); d2 = (c - b) / np.linalg.norm(c - b)
        ang = math.acos(max(-1.0, min(1.0, d1 @ d2))); r = rad[i]
        if r <= 0 or ang > math.pi - 1e-3:
            out.append(b); continue
        t = r / math.tan(ang / 2); t = min(t, 0.45 * np.linalg.norm(a - b), 0.45 * np.linalg.norm(c - b)); r = t * math.tan(ang / 2)
        p1, p2 = b + d1 * t, b + d2 * t; bis = d1 + d2; bis /= np.linalg.norm(bis); cen = b + bis * (r / math.sin(ang / 2))
        a1 = math.atan2(*(p1 - cen)[::-1]); a2 = math.atan2(*(p2 - cen)[::-1]); da = (a2 - a1 + math.pi) % (2 * math.pi) - math.pi
        for k in range(m + 1):
            out.append(cen + r * np.array([math.cos(a1 + da * k / m), math.sin(a1 + da * k / m)]))
    return np.array(out)


def g_earcut(P):
    """Triangles of a simple counter-clockwise polygon (ear clipping)."""
    idx = list(range(len(P))); T = []
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    guard = 0
    while len(idx) > 3 and guard < 20000:
        guard += 1; n = len(idx)
        for k in range(n):
            i0, i1, i2 = idx[k - 1], idx[k], idx[(k + 1) % n]
            a, b, c = P[i0], P[i1], P[i2]
            if cross(a, b, c) <= 1e-12:
                continue
            if any(cross(a, b, P[j]) >= 0 and cross(b, c, P[j]) >= 0 and cross(c, a, P[j]) >= 0 for j in idx if j not in (i0, i1, i2)):
                continue
            T.append([i0, i1, i2]); idx.pop(k); break
        else:
            break
    if len(idx) == 3:
        T.append(idx)
    return np.array(T)


def g_slab(poly, y0, y1, bevel, to3):
    """A plate: the polygon (2D, counter-clockwise) between y0 and y1, its edges bevelled; to3(p2d, y) -> 3D."""
    P = np.asarray(poly, float); n = len(P)
    nrm = np.zeros_like(P)
    for i in range(n):
        e1 = P[i] - P[i - 1]; e2 = P[(i + 1) % n] - P[i]
        n1 = np.array([e1[1], -e1[0]]) / np.linalg.norm(e1); n2 = np.array([e2[1], -e2[0]]) / np.linalg.norm(e2)
        v = n1 + n2; nrm[i] = v / max(np.linalg.norm(v), 1e-9)
    inner = P - nrm * bevel
    rings = [(inner, y0), (P, y0 + bevel), (P, y1 - bevel), (inner, y1)]
    V = []; F = []
    for pts, y in rings:
        V.extend(to3(p, y) for p in pts)
    for r in range(3):
        for k in range(n):
            k2 = (k + 1) % n; a, b, c, d = r * n + k, r * n + k2, (r + 1) * n + k2, (r + 1) * n + k
            F += [[a, b, c], [a, c, d]]
    tri = g_earcut(inner)
    F += [[t[0], t[2], t[1]] for t in tri] + [[3 * n + t[0], 3 * n + t[1], 3 * n + t[2]] for t in tri]
    return np.array(V), np.array(F)


def gun_geometry():
    """The gun as [(group, material, vertices, faces)], group "fixed" or "moving" (the moving electrode's slide: it
    backs off by up to GUN_OPEN along -x); robot frame at zero angles, the gun closed. An X-type servo gun: a machined
    aluminium body on the flange, the two electrode arms hanging from it (long brass holders, copper shanks bent toward
    each other, the caps meeting at the contact point), the servo actuator on one side of the body, the transformer on
    the other."""
    X = np.array([1.0, 0, 0]); Z = [0, 0, 1]; out = []
    def add(grp, mat, vf):
        out.append((grp, mat, np.asarray(vf[0], float), np.asarray(vf[1], int)))
    L = lambda u, prof, n=40, y=0.0, h=0.0, ph=0.0: g_lathe(_g(u, y, h), X, prof, n, ph)
    Lz = lambda u, y, h, prof, n=24, ph=0.0: g_lathe(_g(u, y, h), Z, prof, n, ph)
    Ly = lambda u, y, h, sgn, prof, n=24, ph=0.0: g_lathe(_g(u, y, h), [0, sgn, 0], prof, n, ph)
    circ = lambda r, n=16: np.c_[r * np.cos(np.linspace(0, 2 * math.pi, n, endpoint=False)), r * np.sin(np.linspace(0, 2 * math.pi, n, endpoint=False))]
    hexb = lambda r=0.0075: [(0, 0), (0, r), (0.006, r), (0.007, r * 0.8), (0.007, 0)]
    to3 = lambda p, y: _g(p[0], y, p[1])
    TB = 0.04                                                                  # half the body's thickness
    B = 0.34                                                                   # the body's underside, above the contact point
    # -- the tool changer on the flange: a turned adapter with its bolt circle
    add("fixed", "steel", L(0.0, [(0, 0), (0, 0.098), (0.004, 0.1), (0.022, 0.1), (0.026, 0.095), (0.032, 0.095), (0.032, 0)], 48))
    for k in range(8):
        a = 2 * math.pi * (k + 0.5) / 8
        add("fixed", "chrome", L(0.032, hexb(), 6, 0.08 * math.cos(a), 0.08 * math.sin(a), math.pi / 6))
    # -- the body: a machined aluminium plate, its raised pads, the bracket and gussets on the flange
    body = g_fillet([(0.05, -0.095), (0.17, -0.095), (0.27, B), (0.61, B), (0.655, B + 0.06), (0.61, B + 0.13), (0.05, B + 0.13)],
                    [0.02, 0.06, 0.05, 0.03, 0.04, 0.05, 0.03])
    add("fixed", "alu", g_slab(body, -TB, TB, 0.005, to3))
    pad = g_fillet([(0.29, B + 0.025), (0.6, B + 0.025), (0.622, B + 0.06), (0.595, B + 0.105), (0.29, B + 0.105)], 0.02)
    for sy in (-1, 1):
        add("fixed", "alu", g_slab(pad, sy * TB - 0.002 if sy > 0 else -TB - 0.006, sy * TB + 0.006 if sy > 0 else -TB + 0.002, 0.002, to3))
    add("fixed", "steel", g_rbox(_g(0.041, 0, 0.0), [0.018, 0.2, 0.2], 0.008))
    for sy in (-1, 1):
        gus = g_fillet([(0.05, -0.09), (0.12, -0.09), (0.05, 0.09)], 0.006)
        add("fixed", "steel", g_slab(gus, sy * TB if sy > 0 else -TB - 0.012, sy * TB + 0.012 if sy > 0 else -TB, 0.002, to3))
    bolts = [(0.07, B + 0.105), (0.13, B + 0.105), (0.2, B + 0.105), (0.07, 0.3), (0.07, 0.06), (0.11, -0.07), (0.12, 0.2),
             (0.32, B + 0.035), (0.4, B + 0.035), (0.56, B + 0.035), (0.6, B + 0.1), (0.5, B + 0.11), (0.62, B + 0.07)]
    holes = [(0.27, B + 0.09), (0.33, B + 0.115), (0.12, 0.25), (0.16, 0.13), (0.45, B + 0.05), (0.2, 0.3)]
    for sy in (-1, 1):
        for u, h in bolts:
            add("fixed", "chrome", Ly(u, sy * TB, h, sy, hexb(0.0085), 6, math.pi / 6))
        for u, h in holes:
            add("fixed", "insul", Ly(u, sy * (TB + 0.0004), h, sy, [(0, 0), (0, 0.0065), (0.0006, 0.0065), (0.0006, 0)], 20))
        for k in range(10):
            a = 2 * math.pi * k / 10
            add("fixed", "insul", Ly(0.12 + 0.03 * math.cos(a), sy * (TB + 0.0004), 0.12 + 0.03 * math.sin(a), sy, [(0, 0), (0, 0.004), (0.0006, 0.004), (0.0006, 0)], 14))
        add("fixed", "label", g_rbox(_g(0.53, sy * (TB + 0.0026), B + 0.07), [0.05, 0.0012, 0.03], 0.0005))
    add("fixed", "paper", g_rbox(_g(0.4, -(TB + 0.0026), B + 0.085), [0.07, 0.0012, 0.022], 0.0005))      # the barcode label
    add("fixed", "insul", g_rbox(_g(0.4, -(TB + 0.0032), B + 0.085), [0.05, 0.0012, 0.012], 0.0003))
    # -- the guide under the body the moving arm runs on, the fixed arm's seat
    add("fixed", "steel", g_rbox(_g(0.36, 0, B - 0.012), [0.2, 0.05, 0.026], 0.006))
    add("fixed", "steel", g_rbox(_g(0.535, 0, B - 0.018), [0.07, 0.09, 0.04], 0.008))
    # -- the arms: long brass holders, the copper shanks bent toward each other, the caps
    HT, HB, SH = B - 0.05, 0.15, 0.155                                         # holder top, holder bottom, where the copper starts
    def arm(grp, uh, sgn):
        """An arm hanging at u = uh, its shank bending toward the contact point (sgn: +1 from the robot side)."""
        add(grp, "brass", g_rbox(_g(uh, 0, (HT + HB) / 2), [0.05, 0.062, HT - HB], 0.008))
        add(grp, "brass", g_rbox(_g(uh, 0, HT + 0.012), [0.064, 0.074, 0.03], 0.008))
        add(grp, "brass", g_lathe(_g(uh, 0, HB + 0.004), [0, 0, -1], [(0, 0), (0, 0.022), (0.012, 0.02), (0.016, 0.0165), (0.016, 0)], 28))
        for du in (-0.013, 0.013):
            for h in np.linspace(HB + 0.03, HT - 0.03, 3):
                add(grp, "chrome", Ly(uh + du, 0.031, h, 1, hexb(0.006), 6, math.pi / 6))
                add(grp, "chrome", Ly(uh + du, -0.031, h, -1, hexb(0.006), 6, math.pi / 6))
        tip = GUN_K[0] - GUN_FLANGE[0] - sgn * 0.0135
        sh = g_curve([_g(uh, 0, SH - 0.02), _g(uh, 0, 0.07), _g(uh + sgn * 0.012, 0, 0.014), _g(tip - sgn * 0.02, 0, 0.0)], 16)
        add(grp, "copper", g_sweep(sh, circ(0.0135, 28)))
        add(grp, "copper", g_lathe(_g(tip - sgn * 0.021, 0, 0), [sgn, 0, 0], [(0, 0), (0, 0.0135), (0.009, 0.0135), (0.012, 0.011), (0.012, 0)], 28))
        add(grp, "cap", g_lathe(_g(tip - sgn * 0.009, 0, 0), [sgn, 0, 0], [(0, 0), (0, 0.0105), (0.005, 0.0105), (0.0085, 0.0085), (0.0098, 0.006), (0.0105, 0.003), (0.0108, 0)], 28))
        for sy in (-1, 1):                                                     # the cooling hose fittings
            add(grp, "chrome", Ly(uh + sgn * 0.012, sy * 0.031, HB + 0.02, sy, [(0, 0), (0, 0.006), (0.012, 0.006), (0.014, 0.0045), (0.014, 0)], 6, math.pi / 6))
    UM, UF = 0.37, 0.535
    arm("moving", UM, 1)
    add("moving", "steel", g_rbox(_g(UM, 0, B - 0.012), [0.07, 0.07, 0.034], 0.007))           # the carriage
    arm("fixed", UF, -1)
    # -- the servo actuator on the body's side driving the carriage: motor, cylinder, rod, the rod's linkage
    YA = -(TB + 0.048); HA = B + 0.065
    add("fixed", "motor", g_rbox(_g(0.13, YA, HA), [0.11, 0.09, 0.09], 0.014))
    for k in range(4):
        add("fixed", "motor", g_rbox(_g(0.095 + k * 0.022, YA, HA), [0.006, 0.098, 0.098], 0.014))
    add("fixed", "steel", L(0.185, [(0, 0), (0, 0.047), (0.014, 0.047), (0.014, 0)], 36, YA, HA))
    add("fixed", "alu", L(0.199, [(0, 0), (0, 0.04), (0.11, 0.04), (0.114, 0.036), (0.114, 0)], 36, YA, HA))
    add("fixed", "steel", g_rbox(_g(0.3, (YA - TB) / 2, HA), [0.03, abs(YA + TB) + 0.04, 0.07], 0.006))
    add("moving", "chrome", L(0.313, [(0, 0), (0, 0.014), (0.06, 0.014), (0.06, 0)], 24, YA, HA))
    add("moving", "steel", g_rbox(_g(0.36, YA, HA), [0.03, 0.04, 0.05], 0.006))
    add("moving", "steel", g_rbox(_g(UM, YA, (HA + B - 0.012) / 2), [0.03, 0.03, HA - B + 0.042], 0.006))
    add("moving", "steel", g_rbox(_g(UM, (YA - 0.035) / 2, B - 0.012), [0.03, abs(YA) - 0.03, 0.026], 0.006))
    # -- the transformer on the body's other side, its cables down to the tool changer, the cooling hoses
    YT = TB + 0.045
    add("fixed", "transformer", g_rbox(_g(0.17, YT, B + 0.06), [0.24, 0.09, 0.11], 0.012))
    for k in range(7):
        add("fixed", "transformer", g_rbox(_g(0.075 + k * 0.032, YT + 0.047, B + 0.06), [0.008, 0.012, 0.09], 0.003))
    add("fixed", "label", g_rbox(_g(0.17, YT - 0.02, B + 0.1155), [0.07, 0.035, 0.0012], 0.0005))
    for k, (col, dz) in enumerate((("wire_green", -0.03), ("cable", -0.01), ("wire_red", 0.01), ("cable", 0.03))):
        p = g_curve([_g(0.06, YT, B + 0.06 + dz), _g(0.035, YT + 0.005, B + 0.04 + dz), _g(0.03, YT, 0.2 + dz * 0.5), _g(0.045, TB + 0.03, 0.1 + dz * 0.3)], 12)
        add("fixed", col, g_sweep(p, circ(0.0075, 12)))
    add("fixed", "steel", g_rbox(_g(0.06, TB + 0.03, 0.09), [0.035, 0.05, 0.06], 0.008))        # their connector at the bracket
    for sy, grp, uh, sg in ((1, "moving", UM, 1), (-1, "moving", UM, 1), (1, "fixed", UF, -1), (-1, "fixed", UF, -1)):
        u0 = uh + sg * 0.012; ut = uh - sg * 0.03; h0 = HB + 0.02
        if grp == "moving":                                                    # (to the carriage: it moves with it)
            p = g_curve([_g(u0, sy * 0.045, h0), _g(u0, sy * 0.062, h0 + 0.06), _g(uh - 0.02, sy * 0.05, B - 0.03), _g(uh - 0.02, sy * 0.036, B - 0.016)], 12)
        else:
            p = g_curve([_g(u0, sy * 0.045, h0), _g(u0 + sg * 0.004, sy * 0.062, h0 + 0.08), _g(ut, sy * 0.06, B - 0.02), _g(ut, sy * 0.054, B + 0.04)], 12)
        add(grp, "hose_green", g_sweep(p, circ(0.0055, 12)))
    for sy in (-1, 1):
        add("fixed", "brass", Ly(UF + 0.03, sy * (TB + 0.006), B + 0.05, sy, [(0, 0), (0, 0.008), (0.012, 0.008), (0.014, 0.006), (0.014, 0)], 6, math.pi / 6))
    return out


def gun_parts():
    """{"fixed": {material: (v, f)}, "moving": {material: (v, f)}}, each split at its sharp edges."""
    acc = {"fixed": {}, "moving": {}}
    for grp, mat, v, f in gun_geometry():
        acc[grp].setdefault(mat, []).append((v, f))
    res = {}
    for grp, d in acc.items():
        res[grp] = {}
        for mat, lst in d.items():
            V, F, n = [], [], 0
            for v, f in lst:
                v2, f2 = g_split(v, f); V.append(v2); F.append(f2 + n); n += len(v2)
            res[grp][mat] = (np.vstack(V), np.vstack(F))
    return res


def robot_parts(ctx, path, budget, drop=()):
    """{link: [(colour, vertices in the robot frame, faces), ...]} from the rigged GLB (without the nodes in drop)."""
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
        if node in DROP_NODES or node in drop:
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
    spots_on = which == "all four"                          # the whole line: the spot welding cell and a second car too
    spot_parts = (robot_parts(ctx, rf[0].path, int(p.get("triangles", 40000)), SPOT_DROP) if rf else parts) if spots_on else {}
    every = robots + (SPOT_ROBOTS if spots_on else [])
    chains = ["car", "car2", "car3"] if spots_on else ["car"]       # (three sleds take turns on the line)
    SPOTS = json.loads(SPOTS_JSON)
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
    sled = sled_mesh()

    links = [{}]; joints = []; layout = []                 # link 0: nothing (every part rides on a joint)
    state = {"o": np.zeros(3)}                             # world position of the current frame's origin (at zero angles)
    def pack(v, f, mat):
        mat = mat if isinstance(mat, tuple) else (mat, 0.1, 0.55)
        out = {"v": np.round(np.asarray(v, float).ravel(), 4).tolist(), "f": np.asarray(f, int).ravel().tolist(),
               "color": mat[0], "metalness": mat[1], "roughness": mat[2]}
        if len(mat) > 3:
            out["clearcoat"] = mat[3]
        return out
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
        if mesh is not None and role.startswith("static:") and " gun " not in role and len(mesh[1]) < 300000:
            mesh = g_split(mesh[0], mesh[1], orient=False)    # (flat faces flat, edges sharp: each face's own normals at its edges)
        links.append(pack(mesh[0], mesh[1], mat) if mesh is not None else {})
        if mesh is not None and role in ("car:yaw", "car2:yaw", "car3:yaw"):
            links[-1]["envmap"] = "cube"                   # metal: a view with a cube map shows the cell in it
        if mesh is not None and role.endswith(("lamps", "screens")):
            links[-1]["emissive"] = True; links[-1]["shadow"] = False
        if mesh is not None and role.startswith("arc:"):
            links[-1]["fx"] = "arc"; links[-1]["emissive"] = True; links[-1]["shadow"] = False
    # the sled and the car
    O = [np.array([0.0, FAR, 0.0]), np.array([FAR, 0.0, 0.0]), np.zeros(3)]
    for ch in chains:                                       # each car on its sled (two on the line: one in each cell)
        joint(O[0], [0, 0, 1], ch + ":x", (sled[0] - O[0], sled[1]), SLED_MAT)
        joint(O[1], [0, 0, 1], ch + ":y")
        joint(O[2], [0, 0, 1], ch + ":yaw", (car[0] - O[2], car[1]), car_mat)      # satin silver
        joint(O[2], [0, 0, 1], ch + ":-yaw"); joint(O[1], [0, 0, 1], ch + ":-y"); joint(O[0], [0, 0, 1], ch + ":-x")
    for ri, (name, bx, by, bz, aim) in enumerate(every):
        parts_r = spot_parts if name.startswith("spot ") else parts
        base = np.array([bx, by, bz]); yaw = math.atan2(-by, aim - bx)
        c, s = math.cos(yaw), math.sin(yaw); Rb = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
        # the heading: a turn about the vertical through the base (always the robot's yaw)
        bparts = parts_r.get("base", [])
        first = bparts[0] if bparts else (("#2a2c30", 0.1, 0.5), *box_mesh([0, 0, 0.1], [0.6, 0.6, 0.2]))
        joint(base, [0, 0, 1], "%s:yaw" % name, (first[1], first[2]), first[0])
        for col, v, f in bparts[1:]:
            joint(base, [0, 0, 1], "fixed", (v, f), col)
        for i in range(6):
            o = base + Rb @ QP[i]
            L = LINKS[i + 1]; lp = parts_r.get(L, [])
            if lp:
                joint(o, W[i], "%s:A%d" % (name, i + 1), (lp[0][1] - QP[i], lp[0][2]), lp[0][0], Rb)
                for col, v, f in lp[1:]:
                    joint(o, [1, 0, 0], "fixed", (v - QP[i], f), col, Rb)
            else:
                joint(o, W[i], "%s:A%d" % (name, i + 1), None, None, Rb)
        if ri < len(every) - 1:                                                              # undo it for the next robot
            for i in reversed(range(6)):
                joint(base + Rb @ QP[i], W[i], "%s:-A%d" % (name, i + 1), None, None, Rb)
            joint(base, [0, 0, 1], "%s:-yaw" % name, None, None, Rb)
    # the fixed cell: the rail and the robots' bases (fixed joints on the root: nothing moves them)
    rail, plates, rbolts = rail_mesh()
    static = [("static:rail", rail, RAIL_MAT), ("static:rail plates", plates, PLATE_MAT), ("static:rail bolts", rbolts, BOLT_MAT)]
    for name, bx, by, bz, aim in every:
        blk, plate, bolts = base_mesh(bx, by, bz)
        static += [("static:%s base" % name, blk, BASE_MAT), ("static:%s plate" % name, plate, PLATE_MAT), ("static:%s bolts" % name, bolts, BOLT_MAT)]
    # the floor grating under the car, the yellow line around the cell, the control cabinets and their cables
    cells = [CELL_A_X] + ([CELL_B_X] if spots_on else [])
    static += [("static:grating", cat([grid_mesh(x0) for x0 in cells]), GRID_MAT),
               ("static:floor line", cat([stripe_meshes(x0 - 3.7, x0 + 3.7, -4.4, 4.4) for x0 in cells]), STRIPE_MAT)]
    cab = {k: [] for k in ("body", "door", "dark", "screen", "green", "amber", "metal", "cable")}
    for name, bx, by, bz, aim in every:
        cx, cy = cabinet_spot(bx, by, CELL_B_X if name.startswith("spot ") else CELL_A_X)
        body, door, dark, screen, green, amber, _ = cabinet_meshes(cx, cy)
        metal, cable = cable_meshes(bx, by, cx, cy)
        for k, m in zip(("body", "door", "dark", "screen", "green", "amber", "metal", "cable"), (body, door, dark, screen, green, amber, metal, cable)):
            cab[k].append(m)
    static += [("static:cabinets", cat(cab["body"]), CAB_MAT), ("static:cabinet doors", cat(cab["door"]), CAB_DOOR),
               ("static:cabinet fittings", cat(cab["dark"]), CAB_DARK), ("static:cabinet screens", cat(cab["screen"]), SCREEN),
               ("static:cabinet lamps", cat(cab["green"]), LAMP_GREEN), ("static:cabinet amber lamps", cat(cab["amber"]), LAMP_AMBER),
               ("static:connectors", cat(cab["metal"]), PLUG_MAT), ("static:cables", cat(cab["cable"]), CABLE_MAT)]
    # the doors: fixed guides, housing and frame; the panels rise on their own joints (door:in, door:out: metres up),
    # moved by the Welding cell block before the car comes in and before it leaves
    doors = []
    for jn, xw, inward in (("door:in", HALL["x"][0], 1), ("door:out", HALL["x"][1], -1)):
        panel, glass, frame, bump = door_meshes(xw, inward)
        static += [("static:%s frame" % jn, frame, FRAME_MAT), ("static:%s bollards" % jn, bump, STRIPE_MAT)]
        doors.append((jn, panel, glass))
    for jn, mesh, mat in static:
        joint(np.zeros(3), [0, 0, 1], jn, mesh, mat, parent="base", kind="fixed")
    for jn, panel, glass in doors:
        joint(np.zeros(3), [0, 0, 1], jn, panel, DOOR_MAT, parent="base", kind="prismatic")
        joint(np.zeros(3), [0, 0, 1], "static:%s windows" % jn, glass, ("#20262d", 0.6, 0.15), parent=jn, kind="fixed")   # (rising with it)
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
        for ci, ch in enumerate(chains):                      # (each car has its own: bead: on car, bead2: on car2, ...)
            for name, *_ in robots:
                for sname, P, N in robot_seams(name):
                    P = pressed(P)
                    s_ = np.r_[0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]
                    for a in range(0, len(P) - 1, SEG):
                        b = min(len(P) - 1, a + SEG)
                        v, f = bead_mesh(trimesh, P[a:b + 1], N[a:b + 1])
                        jn = "%s:%s:%s:%d" % ("bead" if ci == 0 else "bead%d" % (ci + 1), name, sname.lower(), a // SEG)
                        joint(np.zeros(3), [0, 0, 1], jn, (v + [0, 0, CAR_Z - HIDE], f), BEAD_MAT, parent=ch + ":yaw", kind="prismatic")
                        beads.append({"joint": jn, "robot": name, "seam": sname, "s0": round(float(s_[a]), 4), "s1": round(float(s_[b]), 4), "chain": ci})
    # the spot welds: a mark on both sides of the sheet at every spot, riding on each car (mark: on car, mark2: on car2),
    # held under the floor like the beads until the gun has welded it
    marks = []
    if spots_on:
        for ci, ch in enumerate(chains):
            for name, *_ in SPOT_ROBOTS:
                for k, s in enumerate(SPOTS.get(name, [])):
                    pt = np.array(s[:3], float); n = np.array(s[3:6], float); n /= np.linalg.norm(n)
                    v, f = cat([cyl_axis(pt + n * 0.0009, pt + n * 0.0016, 0.0058, 20), cyl_axis(pt - n * 0.0009, pt - n * 0.0016, 0.0058, 20)])
                    jn = "%s:%s:%d" % ("mark" if ci == 0 else "mark%d" % (ci + 1), name, k)
                    joint(np.zeros(3), [0, 0, 1], jn, (v + [0, 0, CAR_Z - HIDE], f), MARK_MAT, parent=ch + ":yaw", kind="prismatic")
                    marks.append({"joint": jn, "robot": name, "k": k, "chain": ci})
    # the spot guns: the C-frame fixed on the flange (each material on its own fixed joint), the moving electrode on its
    # own joint (gun:<robot>, metres open, backing off along the robot's -x at zero angles)
    for name, *_ in (SPOT_ROBOTS if spots_on else []):
        gp = gun_parts()
        for k_, (mt, (v, f)) in enumerate(gp["fixed"].items()):
            joint(np.zeros(3), [1, 0, 0], "static:%s gun %s" % (name, mt), (v - QP[5], f), GUN_MAT[mt], parent="%s:A6" % name, kind="fixed")
        mv = list(gp["moving"].items())
        joint(np.zeros(3), [-1, 0, 0], "gun:%s" % name, (mv[0][1][0] - QP[5], mv[0][1][1]), GUN_MAT[mv[0][0]], parent="%s:A6" % name, kind="prismatic")
        for mt, (v, f) in mv[1:]:
            joint(np.zeros(3), [1, 0, 0], "static:%s gun moving %s" % (name, mt), (v - QP[5], f), GUN_MAT[mt], parent="gun:%s" % name, kind="fixed")
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
        dg = GUN_K - QP[5]; Lg = float(np.linalg.norm(dg))                      # the spot guns' flash, at the electrodes
        for name, *_ in (SPOT_ROBOTS if spots_on else []):
            jn = "arc:%s" % name
            joint(np.zeros(3), (dg / Lg).tolist(), jn, (np.asarray(sp.vertices) * 0.8, np.asarray(sp.faces)), ARC_MAT, parent="%s:A6" % name, kind="prismatic")
            arcs[name] = {"joint": jn, "on": round(Lg, 4)}
    model = {"format": "esasim.robot/1", "robot": "Welding cell: %s KUKA KR 210 R2700 and the car frame" % ("four" if len(robots) == 4 else "one"),
             "units": "m", "scale": 1, "far": FAR, "robots": [r[0] for r in robots], "joints_layout": layout, "beads": beads, "arcs": arcs, "hide": HIDE,
             "spot_robots": [r[0] for r in SPOT_ROBOTS] if spots_on else [], "marks": marks if spots_on else [], "chains": chains,
             "cells": {"mig": CELL_A_X, "spot": CELL_B_X if spots_on else None}, "gun_open": GUN_OPEN,
             "hall": HALL, "joints": joints, "links": links}
    name = "welding_cell_%s.robot.json.gz" % ("all" if len(robots) == 4 else robots[0][0].replace(" ", "_"))
    with open(ctx.output("robot", name), "wb") as fh:
        fh.write(gzip.compress(json.dumps(model, separators=(",", ":")).encode(), 6))
    ctx.log("[model] %d joints, %d links" % (len(joints), len(links)))
    return {"robots": [r[0] for r in robots], "file": name, "joints": len(joints), "triangles": sum(len(l.get("f", [])) // 3 for l in links)}
