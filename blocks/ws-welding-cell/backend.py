# ── EsaSim block ──────────────────────────────────────────────────────
# Welding cell (ws-welding-cell) · version 1 · machine block, Python: def run(ctx)
# Four KUKA KR 210 robots weld a car body frame on a sled: a laser seam camera with a learned network finds the car (±3 cm) and tracks every seam; learn on the GPU, then run the line car after car.
# Workspace: Gianluca De Novi's workspace · Author: Gianluca De Novi
# Saved: 2026-11-14
#
# Inputs   ctx.inputs["id"] is a list of files: .path .name .size .read_text() .read_json()
#   tracker     Files (pt)                Seam tracker · several · optional · The weld-tracker dataset (seam_tracker_*.pt): the line uses the newest; learning goes on from it
# Outputs  ctx.output("id", "name.ext") is the path to write; ctx.write_json / ctx.write_text
#   tracker     Files (pt)                Seam tracker · Learn: seam_tracker_<date>_<p95>um.pt (the network and its scores)
#   curve       Table (csv)               Learning curve · Learn: training.csv, every 15 s
#   welds       Table (csv)               Welds · Line: welds.csv, one row per seam of every car
#   cars        Table (csv)               Cars · Line: cars.csv, where each car really was and where the robots found it, cycle time, worst weld
#   metadata    Files (json)              Summary
#   telemetry   Live telemetry            ctx.telemetry("channel", data) while it runs
# Settings ctx.params["key"]
#   mode        select    What to do = "Learn to follow the seams" of Learn to follow the seams | Run the production line
#   accelerator select    Accelerator (learning) = "auto" of auto | NVIDIA GPU | CPU
#   minutes     number    Learning: minutes at most = 20
#   target_mm   number    Learning: stop at (mm, 95 % of readings) = 0.3
#   batch       number    Learning: profiles per step = 2048
#   lr          number    Learning rate = 0.002
#   replay_every number    Learning: weld a car every (s) = 120
#   from_scratch bool      Learning: start from scratch = false
#   tracker_file text      Seam tracker file = ""
#   cars        number    Line: cars = 0
#   max_minutes number    Line: minutes at most = 30
#   weld_speed  number    Welding speed (mm/s) = 80
#   tolerance_mm number    Weld tolerance (mm) = 1
#   sled_error_mm number    Sled stop accuracy (± mm) = 30
#   car_offset_mm number    Car on the sled (± mm) = 8
#   car_turn_deg number    Car turned on the sled (± deg) = 0.4
#   build_mm    number    Frame build variation (mm) = 1.2
#   seam_camera bool      Seam camera = true
#   seed        number    Seed = 1
# Runs on  Any machine, NVIDIA GPU. Return a dict to fill the "result" output.
# Packages torch[cuda], numpy (installed by the worker with pip when missing)
# EsaSim rewrites these lines from the block's definition each time it is saved: change the definition, not them.
# ── end of EsaSim block header ────────────────────────────────────────

"""Automatic welding cell: a sled carries a car body frame (the S15 body-in-white) along a rail into a cell with four
KUKA KR 210 R2700 robots, one at each corner of the car. Each robot welds the seams of its quarter of the frame with an
arc-welding torch, guided by a laser seam camera mounted on the torch. The simulation is position based (kinematics,
no forces): the robots follow joint and Cartesian paths through their inverse kinematics.

What changes from car to car, as on a real line:
  * the sled stops within +-3 cm (along and across the rail) and +-3 mm in height;
  * the car sits on the sled up to +-8 mm off and turned by up to 0.4 deg (and 0.15 deg in pitch and roll);
  * every frame is built a little differently: each seam wanders up to about 1.2 mm from its drawing.
So the taught (nominal) programme misses the seams by up to ~5 cm. The robots see the real seams with their cameras:

  1. Localise: each robot puts its laser line across two reference points of its seams; the eight measurements give
     the car's position and orientation (least squares), and every programme is moved with it.
  2. Track: while welding, the camera looks 65 mm ahead of the wire; each laser profile tells where the seam really
     is, and the torch follows it when it gets there.

The seam camera's eyes are a small neural network (a 1D CNN) that reads a laser profile (160 depths across the seam)
and says where the joint is (across and in depth) and how sure it is. Learn to follow the seams trains it on the GPU
on millions of simulated profiles of the four joint types of this frame (lap, corner, flange edge, butt with a gap),
with noise, specular dropouts, weld spatter, holes and stray edges; every couple of minutes a whole car is welded in
the cell with the network as it is, replayed in the 3D view. Run the production line welds car after car with the
learned network.

Telemetry: cell (layout, frames for the 3D view, car summaries), sensor (laser profiles), event, train, line.
Outputs: the tracker (seam_tracker_<date>_<p95>mm.pt), the learning curve, a table of every weld and of every car.
"""
import csv
import datetime
import json
import math
import os
import pathlib
import queue
import threading
import time

import numpy as np

# ===================================================================================================== the cell
CAR_Z = 1.05            # car origin height when on the sled (frame bottom at 0.50 m = sled top)
SLED_TOP = 0.50
STOP_X, ENTRY_X, EXIT_X = 0.0, -10.0, 10.0
LOOKAHEAD = 0.065       # laser line ahead of the wire (m)
ROBOT_DEFS = [          # name, base x, y, z (pedestal), quarter
    ("front_right", 1.35, -2.00, 0.45, "front"), ("front_left", 1.35, 2.00, 0.45, "front"),
    ("rear_right", -1.40, -2.30, 0.40, "rear"), ("rear_left", -1.40, 2.30, 0.40, "rear")]
TYPES = ["lap", "corner", "flange", "butt"]

# seams of the right side of the frame, car frame (x forward, y left, z up; mm) and torch-side normals (x100)
SEAMS_JSON = r'''[["Front rail","front","flange",[[776,-807,246],[796,-807,244],[816,-807,243],[836,-808,241],[856,-808,240],[876,-808,238],[896,-808,236],[916,-808,235],[935,-808,233],[955,-808,231],[975,-808,229],[995,-808,228],[1015,-808,226],[1035,-808,224],[1055,-809,222],[1075,-809,220],[1095,-809,218],[1115,-809,216],[1135,-809,214],[1154,-809,212],[1174,-809,210],[1194,-809,208],[1214,-809,206],[1234,-809,204],[1254,-809,202],[1274,-809,199],[1294,-809,197],[1314,-809,195],[1333,-809,192],[1353,-809,190],[1373,-809,188],[1393,-809,185],[1413,-809,183],[1433,-809,180],[1452,-808,177],[1472,-808,175],[1492,-808,172],[1512,-808,169],[1532,-807,166],[1551,-807,163],[1571,-807,160],[1591,-806,157],[1611,-806,154],[1630,-806,151],[1650,-805,148],[1670,-805,144],[1690,-804,141],[1709,-804,138],[1729,-803,134],[1749,-803,131],[1768,-802,127],[1788,-801,123],[1808,-801,119],[1827,-800,115],[1847,-799,111],[1866,-798,107],[1886,-797,102],[1905,-796,98],[1924,-795,93],[1944,-793,88],[1963,-792,83],[1982,-790,78],[2002,-789,73]],[[25,-81,53],[22,-82,53],[18,-82,55],[14,-81,56],[9,-82,57],[6,-80,59],[4,-77,64],[3,-72,69],[3,-64,76],[4,-57,82],[6,-49,87],[7,-37,93],[8,-26,96],[8,-16,98],[9,-9,99],[9,-4,99],[10,1,100],[10,6,99],[10,9,99],[10,10,99],[10,11,99],[10,12,99],[9,14,99],[9,12,99],[9,8,99],[9,2,100],[9,-6,99],[9,-16,98],[9,-26,96],[8,-36,93],[8,-42,90],[8,-47,88],[9,-49,87],[10,-46,88],[11,-40,91],[11,-34,93],[12,-27,96],[13,-21,97],[13,-14,98],[14,-10,99],[14,-9,99],[14,-12,98],[15,-17,97],[16,-24,96],[16,-30,94],[17,-40,90],[17,-50,85],[17,-56,81],[17,-61,77],[17,-65,74],[17,-67,72],[18,-69,70],[19,-68,71],[20,-66,72],[21,-66,72],[22,-66,72],[22,-66,72],[22,-67,71],[21,-69,69],[20,-72,66],[18,-75,64],[16,-78,61],[15,-80,59]]],["Strut tower","front","corner",[[1269,-471,73],[1250,-478,72],[1232,-486,72],[1214,-494,72],[1197,-505,72],[1180,-516,72],[1165,-529,73],[1152,-544,74],[1140,-560,76],[1130,-577,78],[1122,-595,80],[1115,-614,83],[1110,-633,86],[1106,-652,90],[1104,-672,94],[1102,-691,98],[1101,-711,102],[1100,-730,107],[1099,-749,112]],[[-14,38,92],[-15,38,92],[-16,37,91],[-18,37,91],[-21,36,91],[-24,34,91],[-26,33,91],[-28,31,91],[-29,29,91],[-29,28,92],[-28,26,92],[-26,24,93],[-23,23,95],[-20,23,95],[-17,22,96],[-14,22,96],[-12,22,97],[-10,23,97],[-10,23,97]]],["A-pillar and roof rail (front)","front","lap",[[-526,-607,720],[-506,-607,720],[-486,-607,719],[-466,-607,719],[-446,-607,719],[-426,-607,718],[-406,-608,718],[-386,-608,717],[-366,-609,716],[-346,-609,716],[-326,-610,715],[-306,-610,713],[-286,-611,712],[-266,-612,711],[-246,-613,709],[-226,-614,708],[-207,-615,706],[-187,-616,704],[-167,-618,701],[-147,-619,699],[-127,-621,696],[-108,-623,693],[-88,-626,690],[-69,-628,686],[-49,-631,681],[-30,-634,677],[-11,-637,672],[8,-640,666],[27,-644,660],[45,-647,653],[64,-651,646],[82,-654,639],[100,-657,631]],[[-1,-35,94],[0,-36,93],[0,-37,93],[0,-38,93],[0,-39,92],[0,-40,92],[1,-40,92],[1,-41,91],[1,-41,91],[2,-41,91],[2,-42,91],[3,-42,91],[3,-43,90],[4,-43,90],[5,-44,90],[5,-44,89],[6,-45,89],[7,-45,89],[8,-46,89],[9,-46,88],[10,-46,88],[11,-46,88],[12,-45,88],[14,-45,88],[16,-44,89],[18,-42,89],[21,-40,89],[25,-37,90],[28,-33,90],[32,-29,90],[36,-25,90],[39,-20,90],[41,-17,90]]],["Roof rail (rear)","rear","lap",[[-1843,-747,360],[-1825,-744,368],[-1807,-742,376],[-1788,-739,384],[-1770,-737,391],[-1752,-734,399],[-1734,-732,407],[-1715,-729,415],[-1697,-727,423],[-1679,-724,430],[-1661,-722,438],[-1642,-719,446],[-1624,-717,453],[-1606,-714,461],[-1587,-712,468],[-1569,-709,476],[-1550,-706,483],[-1532,-704,491],[-1514,-701,498],[-1495,-698,506],[-1477,-696,513],[-1459,-693,521],[-1440,-690,528],[-1422,-688,535],[-1404,-685,543],[-1385,-682,550],[-1367,-680,557],[-1348,-677,565],[-1330,-674,572],[-1311,-671,579],[-1293,-669,586],[-1274,-666,593],[-1256,-663,599],[-1237,-660,606],[-1218,-657,613],[-1199,-654,619],[-1181,-652,625],[-1162,-649,631],[-1143,-646,637],[-1124,-644,643],[-1105,-641,648],[-1086,-639,653],[-1066,-637,658],[-1047,-634,663],[-1028,-632,667],[-1008,-630,672],[-989,-628,675],[-969,-626,679],[-949,-625,683],[-930,-623,686],[-910,-621,689],[-890,-620,692],[-871,-619,694],[-851,-617,697],[-831,-616,699],[-811,-615,701],[-791,-614,704],[-771,-613,706],[-751,-612,707],[-732,-611,709],[-712,-611,711],[-692,-610,712],[-672,-609,714],[-652,-609,715],[-632,-608,716],[-612,-607,717]],[[-27,-28,92],[-28,-27,92],[-30,-24,92],[-32,-21,92],[-34,-19,92],[-35,-17,92],[-36,-16,92],[-37,-16,92],[-37,-18,91],[-36,-20,91],[-36,-22,91],[-35,-24,91],[-35,-25,90],[-34,-27,90],[-34,-28,90],[-33,-28,90],[-33,-28,90],[-33,-28,90],[-32,-28,90],[-32,-28,90],[-32,-27,91],[-32,-27,91],[-32,-26,91],[-32,-26,91],[-32,-25,92],[-32,-24,92],[-32,-22,92],[-32,-22,92],[-31,-22,92],[-31,-21,93],[-31,-21,93],[-31,-22,93],[-30,-23,93],[-30,-25,92],[-29,-27,92],[-27,-29,92],[-26,-32,91],[-24,-35,90],[-22,-38,90],[-21,-40,89],[-19,-42,89],[-18,-43,89],[-17,-43,89],[-16,-43,89],[-15,-43,89],[-15,-42,89],[-14,-42,90],[-13,-41,90],[-13,-41,91],[-12,-40,91],[-11,-40,91],[-11,-39,91],[-10,-39,92],[-9,-39,92],[-8,-39,92],[-7,-39,92],[-7,-39,92],[-6,-40,92],[-6,-40,92],[-5,-40,92],[-5,-40,92],[-4,-39,92],[-4,-39,92],[-4,-39,92],[-3,-38,92],[-3,-38,92]]],["Quarter to deck","rear","corner",[[-815,-941,214],[-832,-935,223],[-849,-930,231],[-867,-925,239],[-886,-921,245],[-904,-917,251],[-923,-913,257],[-942,-910,261],[-962,-907,266],[-981,-905,269],[-1001,-902,273],[-1020,-900,276],[-1040,-897,279],[-1060,-895,282],[-1079,-893,285],[-1099,-891,287],[-1119,-890,289],[-1139,-888,291],[-1159,-886,293],[-1178,-884,295],[-1198,-882,297],[-1218,-880,299],[-1238,-878,301],[-1258,-876,303],[-1277,-874,305],[-1297,-871,306],[-1317,-869,308],[-1337,-866,310],[-1356,-864,312],[-1376,-861,314],[-1396,-858,316],[-1416,-855,318],[-1435,-852,320],[-1455,-849,321],[-1475,-846,323],[-1494,-842,325],[-1514,-838,327],[-1533,-834,329],[-1553,-830,330],[-1572,-826,332],[-1591,-821,334],[-1611,-816,336],[-1630,-812,337],[-1649,-807,339],[-1669,-802,341],[-1688,-797,342],[-1707,-792,344],[-1727,-787,346],[-1746,-782,347],[-1766,-778,349],[-1785,-773,350],[-1804,-768,351],[-1824,-764,352],[-1843,-759,353],[-1863,-755,353],[-1882,-750,354],[-1902,-746,354],[-1921,-742,354],[-1941,-739,353],[-1961,-736,352],[-1981,-733,352],[-2000,-730,351],[-2020,-727,349],[-2040,-725,348],[-2060,-723,347],[-2080,-721,345],[-2100,-720,344],[-2119,-718,342],[-2139,-717,340],[-2159,-716,338],[-2179,-715,337],[-2199,-714,335],[-2219,-714,333],[-2239,-713,331],[-2259,-712,329],[-2279,-712,327],[-2298,-711,325],[-2318,-710,323],[-2338,-709,320],[-2358,-708,318],[-2378,-707,316],[-2398,-706,314],[-2418,-705,312]],[[39,-81,45],[34,-82,46],[27,-83,49],[20,-84,51],[13,-84,52],[8,-84,53],[4,-85,53],[1,-85,53],[0,-85,53],[0,-85,53],[0,-85,52],[0,-85,52],[0,-85,52],[0,-85,52],[0,-85,52],[0,-85,52],[0,-85,53],[-1,-85,53],[-1,-85,53],[-1,-84,54],[-1,-84,54],[-1,-84,55],[-2,-83,55],[-2,-83,56],[-2,-82,57],[-3,-82,57],[-3,-82,57],[-3,-82,57],[-4,-82,58],[-4,-81,58],[-5,-81,58],[-5,-81,58],[-6,-81,59],[-7,-80,59],[-7,-80,60],[-7,-79,61],[-8,-78,61],[-8,-77,63],[-8,-76,64],[-9,-75,66],[-9,-74,67],[-9,-72,68],[-10,-71,69],[-10,-70,71],[-11,-69,72],[-11,-67,73],[-12,-66,74],[-13,-63,76],[-14,-61,78],[-14,-57,81],[-14,-53,84],[-14,-47,87],[-14,-41,90],[-13,-33,93],[-13,-26,96],[-12,-17,98],[-11,-9,99],[-10,-1,99],[-9,6,99],[-8,11,99],[-8,16,98],[-7,20,98],[-7,24,97],[-6,26,96],[-6,28,96],[-6,30,95],[-6,32,95],[-6,32,94],[-6,33,94],[-7,33,94],[-7,33,94],[-7,33,94],[-8,32,94],[-8,31,95],[-8,30,95],[-9,30,95],[-11,28,95],[-13,25,96],[-17,21,96],[-21,16,96],[-27,11,96],[-32,5,95],[-36,0,93]]],["Rear wheel arch","rear","flange",[[-1146,-1043,-227],[-1156,-1046,-210],[-1166,-1049,-193],[-1177,-1052,-176],[-1188,-1055,-160],[-1200,-1057,-144],[-1213,-1060,-129],[-1227,-1062,-115],[-1241,-1064,-100],[-1255,-1066,-87],[-1270,-1068,-74],[-1286,-1070,-61],[-1302,-1071,-49],[-1318,-1073,-38],[-1335,-1074,-27],[-1352,-1076,-17],[-1370,-1077,-8],[-1388,-1077,0],[-1407,-1078,7],[-1426,-1078,14],[-1445,-1079,19],[-1464,-1079,23],[-1484,-1079,26],[-1504,-1079,28],[-1524,-1078,29],[-1544,-1078,30],[-1564,-1077,29],[-1584,-1076,27],[-1604,-1075,25],[-1623,-1073,21],[-1643,-1072,17],[-1662,-1070,12],[-1681,-1068,5],[-1700,-1066,-2],[-1718,-1064,-9],[-1736,-1061,-18],[-1754,-1059,-27],[-1771,-1056,-36],[-1788,-1052,-46],[-1804,-1049,-57],[-1821,-1044,-68],[-1836,-1039,-79],[-1851,-1034,-91],[-1866,-1027,-103],[-1879,-1020,-116],[-1892,-1011,-129],[-1904,-1001,-141],[-1915,-990,-153]],[[-7,-100,-2],[-7,-100,-1],[-9,-100,1],[-10,-99,3],[-12,-99,4],[-14,-99,5],[-15,-99,5],[-17,-99,3],[-19,-98,1],[-20,-98,-1],[-20,-98,-3],[-20,-98,-4],[-19,-98,-5],[-18,-98,-7],[-16,-98,-7],[-15,-99,-8],[-13,-99,-9],[-11,-99,-8],[-9,-99,-9],[-8,-99,-10],[-6,-99,-9],[-5,-99,-9],[-4,-100,-8],[-3,-100,-8],[-2,-100,-8],[-1,-100,-7],[1,-100,-6],[2,-100,-6],[3,-100,-6],[5,-100,-7],[7,-99,-8],[9,-99,-7],[11,-99,-9],[13,-99,-9],[14,-99,-9],[16,-98,-9],[16,-98,-7],[17,-98,-6],[17,-98,-5],[17,-98,-3],[17,-98,-2],[18,-98,-1],[19,-98,-1],[20,-98,-2],[22,-98,-3],[23,-97,-5],[24,-97,-7],[25,-96,-9]]],["Tail corner","rear","lap",[[-1928,-969,-174],[-1948,-967,-171],[-1967,-965,-169],[-1987,-962,-166],[-2007,-960,-164],[-2027,-957,-162],[-2046,-954,-160],[-2066,-951,-158],[-2086,-948,-157],[-2105,-945,-155],[-2125,-941,-154],[-2145,-938,-152],[-2164,-935,-150],[-2184,-931,-147],[-2203,-928,-143],[-2222,-925,-139],[-2241,-922,-134],[-2260,-919,-127],[-2278,-915,-120],[-2296,-912,-112],[-2314,-909,-102],[-2330,-906,-92],[-2346,-903,-79],[-2359,-900,-65],[-2370,-897,-48],[-2378,-894,-30],[-2382,-891,-11],[-2383,-889,9],[-2383,-887,29],[-2381,-885,49],[-2377,-884,68],[-2373,-883,88],[-2367,-882,107],[-2361,-881,126],[-2355,-881,145],[-2349,-879,164],[-2343,-877,183],[-2339,-873,202],[-2337,-866,221],[-2338,-857,238],[-2342,-845,254],[-2349,-831,266],[-2358,-816,276],[-2368,-800,284],[-2379,-785,290],[-2390,-769,294],[-2402,-753,298],[-2414,-737,301],[-2426,-721,303],[-2438,-705,305]],[[-47,-88,1],[-45,-89,-2],[-41,-91,-8],[-37,-91,-16],[-33,-91,-24],[-29,-91,-31],[-25,-89,-38],[-22,-87,-44],[-21,-85,-49],[-19,-83,-52],[-19,-83,-53],[-18,-82,-54],[-18,-83,-53],[-19,-83,-52],[-19,-85,-49],[-19,-87,-46],[-20,-89,-41],[-21,-91,-36],[-23,-92,-31],[-27,-93,-24],[-32,-93,-18],[-39,-91,-12],[-47,-88,-7],[-56,-83,-2],[-65,-76,3],[-72,-69,6],[-76,-64,9],[-79,-60,12],[-80,-58,14],[-79,-58,16],[-78,-60,18],[-75,-63,21],[-72,-66,23],[-70,-68,24],[-68,-69,26],[-66,-70,28],[-65,-70,30],[-64,-70,32],[-63,-69,35],[-63,-67,39],[-62,-66,43],[-60,-64,48],[-59,-61,53],[-58,-58,57],[-58,-54,61],[-57,-51,64],[-57,-47,67],[-58,-43,70],[-58,-39,72],[-58,-36,73]]]]'''

# ===================================================================================================== kinematics
# KUKA KR 210 R2700, as rigged in kr210_weld.glb (all joints 0 = arm up, forearm level). Robot frame x forward, z up.
W = np.array([[0, 0, 1], [0, -1, 0], [0, -1, 0], [1, 0, 0], [0, -1, 0], [1, 0, 0]], float)
QP = np.array([[0, 0, 0], [0.349, 0, 0.678], [0.349, 0, 1.825], [0.70, 0, 1.784], [1.575, 0, 1.784], [1.79, 0, 1.784]])
TCP0 = np.array([2.21, 0, 1.784])
R0 = np.c_[[1, 0, 0], [0, 0, 1], [0, -1, 0]]           # tool x = torch axis, tool y = camera side (leads), z = x * y
LIM = np.radians([[-170, 170], [-75, 60], [-110, 140], [-350, 350], [-125, 125], [-350, 350]])
VMAX = np.radians([95, 90, 95, 170, 160, 210]) * 0.7    # joint speeds used for moves (70 % of the robot's)
HOME = np.radians([0, 15, 35, 0, -110, 0])


def _rot(w, th):
    K = np.array([[0, -w[2], w[1]], [w[2], 0, -w[0]], [-w[1], w[0], 0]])
    return np.eye(3) + math.sin(th) * K + (1 - math.cos(th)) * (K @ K)


def fk(q):
    R = np.eye(3); p = np.zeros(3); fr = []
    for i in range(6):
        Ri = _rot(W[i], q[i]); p = R @ (QP[i] - Ri @ QP[i]) + p; R = R @ Ri; fr.append((R.copy(), p.copy()))
    return R @ R0, R @ TCP0 + p, fr


def ik(Rg, pg, q0, iters=60, tol=(3e-4, 1.5e-3)):
    q = np.array(q0, float); ep = er = np.zeros(3)
    for _ in range(iters):
        Rt, pt, fr = fk(q)
        ep = pg - pt; Re = Rg @ Rt.T
        c = max(-1.0, min(1.0, (np.trace(Re) - 1) / 2)); ang = math.acos(c)
        er = np.zeros(3) if ang < 1e-9 else ang / (2 * math.sin(ang)) * np.array([Re[2, 1] - Re[1, 2], Re[0, 2] - Re[2, 0], Re[1, 0] - Re[0, 1]])
        if np.linalg.norm(ep) < tol[0] and np.linalg.norm(er) < tol[1]:
            return q, True
        J = np.zeros((6, 6))
        for i in range(6):
            Rp, pp = (np.eye(3), np.zeros(3)) if i == 0 else fr[i - 1]
            w = Rp @ W[i]; J[:3, i] = np.cross(w, pt - (Rp @ QP[i] + pp)); J[3:, i] = w
        e = np.r_[ep, er * 0.6]
        dq = J.T @ np.linalg.solve(J @ J.T + 4e-4 * np.eye(6), e)
        q = np.clip(q + np.clip(dq, -0.25, 0.25), LIM[:, 0], LIM[:, 1])
    return q, False


def rz(a):
    c, s = math.cos(a), math.sin(a); return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def rpy(roll, pitch, yaw):
    cr, sr, cp, sp = math.cos(roll), math.sin(roll), math.cos(pitch), math.sin(pitch)
    Rx = np.array([[1, 0, 0], [0, cr, -sr], [0, sr, cr]]); Ry = np.array([[cp, 0, sp], [0, 1, 0], [-sp, 0, cp]])
    return rz(yaw) @ Ry @ Rx


def tool_frame(n, t):
    x = -n / np.linalg.norm(n); y = t - (t @ x) * x; y /= np.linalg.norm(y); return np.c_[x, y, np.cross(x, y)]


# ===================================================================================================== seams and robots
def load_cell():
    raw = json.loads(SEAMS_JSON)
    robots = []
    for name, bx, by, bz, quarter in ROBOT_DEFS:
        side = 1 if by < 0 else -1                         # the stored seams are those of the right side (y < 0)
        base = np.array([bx, by, bz]); aim = np.array([math.copysign(1.0, bx), 0, 0])
        yaw = math.atan2(aim[1] - by, aim[0] - bx)
        seams = []
        for sname, q, jtype, pts, nrm in raw:
            if q != quarter:
                continue
            P = np.array(pts, float) / 1000.0; N = np.array(nrm, float) / 100.0
            if side < 0:
                P[:, 1] *= -1; N[:, 1] *= -1
            N /= np.linalg.norm(N, axis=1, keepdims=True)
            T = np.gradient(P, axis=0); T /= np.linalg.norm(T, axis=1, keepdims=True)
            s = np.r_[0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]
            seams.append(dict(name=sname, type=TYPES.index(jtype), P=P, N=N, T=T, s=s, length=float(s[-1])))
        Rb = rz(yaw)
        home = HOME.copy()
        best = None                                     # turn the folded arm away from the car's path
        for a1 in (-50, -30, 30, 50):
            home[0] = math.radians(a1); _, p, _ = fk(home); pw = Rb @ p + base
            if best is None or abs(pw[1]) > best[0]:
                best = (abs(pw[1]), a1)
        home[0] = math.radians(best[1])
        robots.append(dict(name=name, base=base, yaw=yaw, Rb=Rb, seams=seams, home=home, quarter=quarter))
    return robots


def layout_item(robots):
    seams = []
    for i, r in enumerate(robots):
        for k, sm in enumerate(r["seams"]):
            seams.append(dict(robot=i, index=k, name=sm["name"], type=TYPES[sm["type"]], length=round(sm["length"], 3),
                              pts=np.round(sm["P"], 4).tolist()))
    return dict(kind="layout", version=1, car_z=CAR_Z, sled_top=SLED_TOP, stop_x=STOP_X, entry_x=ENTRY_X, exit_x=EXIT_X,
                lookahead=LOOKAHEAD, robots=[dict(name=r["name"], base=r["base"].round(3).tolist(), yaw=round(r["yaw"], 5),
                                                  quarter=r["quarter"], home=np.degrees(r["home"]).round(2).tolist()) for r in robots],
                seams=seams, joints=dict(axes=W.tolist(), points=QP.tolist(), tcp=TCP0.tolist()))


# ===================================================================================================== laser profiles
NU = 160
U_MM = np.linspace(-60, 60, NU)
DEPTH_WIN = 50.0


def make_profiles(torch, B, jtype, ju, jh, gen, device):
    """B laser profiles (depth in mm across the line at U_MM, + = further from the camera) of joints of type jtype at
    (ju across, jh in depth), with tilt, noise, dropouts, spatter, holes and stray edges. Returns depths, valid mask."""
    f = lambda *s: torch.rand(*s, generator=gen, device=device)
    u = torch.tensor(U_MM, dtype=torch.float32, device=device)[None, :].expand(B, NU)
    du = u - ju[:, None]
    tilt = (f(B) - 0.5)[:, None] * 0.4
    side = torch.where(f(B) < 0.5, -1.0, 1.0)[:, None]
    d = jh[:, None] + tilt * du
    valid = torch.ones(B, NU, dtype=torch.bool, device=device)
    t = jtype[:, None]
    # lap joint: a step of one sheet thickness (0.7 to 2.5 mm), up or down
    step = (0.8 + 1.7 * f(B))[:, None] * torch.where(f(B) < 0.5, -1.0, 1.0)[:, None]
    lap = d + torch.where(side * du >= 0, step, torch.zeros_like(d))
    # corner (fillet): two faces meeting at the joint, the joint the deepest point
    k1 = (0.25 + 1.2 * f(B))[:, None]; k2 = (0.25 + 1.2 * f(B))[:, None]
    corner = jh[:, None] + 0.3 * tilt * du - k1 * torch.relu(-du) - k2 * torch.relu(du)
    # flange edge: the sheet ends at the joint; beyond it the floor far below, or nothing
    far = (15 + 45 * f(B))[:, None]
    flange = torch.where(side * du < 0, d, d + far)
    flange_missing = (side * du >= 0) & (f(B) < 0.5)[:, None]
    # butt joint with a gap (0.3 to 1.6 mm) and a small mismatch
    gap = (0.3 + 1.3 * f(B))[:, None]; mis = ((f(B) - 0.5) * 1.2)[:, None]
    butt = d + torch.where(side * du > 0, mis, torch.zeros_like(d))
    butt_missing = du.abs() < gap / 2
    d = torch.where(t == 0, lap, torch.where(t == 1, corner, torch.where(t == 2, flange, butt)))
    valid &= ~((t == 2) & flange_missing) & ~((t == 3) & butt_missing)
    # stray features: a hole (no return) and, on lap and butt joints, a weaker stray edge elsewhere
    away = lambda: (ju[:, None] + torch.where(f(B) < 0.5, -1.0, 1.0)[:, None] * (10 + 45 * f(B))[:, None])
    hc, hw = away(), (3 + 9 * f(B))[:, None]
    valid &= ~(((u - hc).abs() < hw / 2) & (f(B) < 0.4)[:, None])
    ec = away(); es = ((f(B) - 0.5) * 0.5)[:, None]
    d = d + torch.where(((t == 0) | (t == 3)) & (f(B) < 0.3)[:, None] & (u > ec), es, torch.zeros_like(d))
    # weld spatter near the joint: small bumps towards the camera
    sc = ju[:, None] + (f(B) - 0.5)[:, None] * 20; sw = (1 + 2 * f(B))[:, None]; sh = (0.3 + 1.7 * f(B))[:, None]
    d = d - torch.where((f(B) < 0.3)[:, None], sh * torch.exp(-((u - sc) / sw) ** 2), torch.zeros_like(d))
    # sensor noise, specular spikes, dropouts
    d = d + torch.randn(B, NU, generator=gen, device=device) * (0.03 + 0.17 * f(B))[:, None]
    spikes = f(B, NU) < 0.03
    d = torch.where(spikes, d + (f(B, NU) - 0.5) * 8, d)
    for _ in range(3):
        c0 = (f(B) * NU)[:, None]; ln = (2 + 6 * f(B))[:, None]
        idx = torch.arange(NU, device=device)[None, :]
        valid &= ~((idx >= c0) & (idx < c0 + ln) & (f(B) < 0.35)[:, None])
    valid &= d.abs() < DEPTH_WIN
    return torch.where(valid, d, torch.zeros_like(d)), valid


def build_net(torch):
    nn = torch.nn

    class SeamNet(nn.Module):
        """Laser profile (depths, valid, position across) + joint type -> joint across, in depth, and confidence."""
        def __init__(self):
            super().__init__()
            self.conv = nn.Sequential(nn.Conv1d(4, 48, 7, padding=3), nn.GELU(), nn.Conv1d(48, 64, 5, stride=2, padding=2), nn.GELU(),
                                      nn.Conv1d(64, 64, 5, stride=2, padding=2), nn.GELU(), nn.Conv1d(64, 96, 3, stride=2, padding=1), nn.GELU())
            self.head = nn.Sequential(nn.Linear(96 * 20 + 4, 256), nn.GELU(), nn.Linear(256, 128), nn.GELU(), nn.Linear(128, 4))

        def forward(self, depth, valid, jtype):
            u = torch.linspace(-1, 1, NU, device=depth.device)[None, :].expand_as(depth)
            vf = valid.float()
            dd = torch.diff(depth, dim=1, prepend=depth[:, :1]) * vf * torch.roll(vf, 1, 1)          # steps stand out here
            x = torch.stack([depth / 20.0, vf, u, dd.clamp(-5, 5)], 1)
            h = self.conv(x).flatten(1)
            oh = torch.nn.functional.one_hot(jtype.long(), 4).float()
            o = self.head(torch.cat([h, oh], 1))
            return o[:, 0] * 60.0, o[:, 1] * 40.0, o[:, 2].clamp(-4, 3), o[:, 3].clamp(-4, 3)   # mm, mm, log b (mm)

    return SeamNet()


def sample_joints(torch, B, gen, device):
    f = lambda *s: torch.rand(*s, generator=gen, device=device)
    near = f(B) < 0.5
    ju = torch.where(near, (f(B) - 0.5) * 8, (f(B) - 0.5) * 96)         # across: mostly within 4 mm, up to 48 mm
    jh = torch.where(near, (f(B) - 0.5) * 6, (f(B) - 0.5) * 50)         # in depth: up to 25 mm
    jtype = (f(B) * 4).long().clamp(max=3)
    return jtype, ju, jh


# ===================================================================================================== the cell, car by car
class Tracker:
    """The learned seam camera (or none: the nominal programme only)."""
    def __init__(self, net=None, torch=None):
        self.net, self.torch = net, torch
        self.gen = torch.Generator().manual_seed(7) if torch is not None else None

    def measure(self, jtype, u_true, h_true):
        """A laser profile of the real joint at (u_true, h_true) mm and what the network reads from it."""
        torch = self.torch
        if self.net is None or torch is None:
            return None
        if abs(u_true) > 55 or abs(h_true) > 40:
            return dict(ok=False)                     # the joint is outside the camera's field
        with torch.no_grad():
            d, v = make_profiles(torch, 1, torch.tensor([jtype]), torch.tensor([float(u_true)]), torch.tensor([float(h_true)]), self.gen, "cpu")
            pu, ph, bu, bh = self.net(d, v, torch.tensor([jtype]))
        b = float(torch.exp(torch.maximum(bu, bh))[0])
        return dict(ok=b < 1.0, u=float(pu[0]), h=float(ph[0]), b=b, depth=d[0].numpy(), valid=v[0].numpy())


class CarRun:
    """One car through the cell: in, localise, weld, out. Produces 20 Hz frames for the 3D view and the weld results."""
    DT = 0.05

    def __init__(self, robots, tracker, rng, opts, car_no):
        self.R, self.trk, self.rng, self.o, self.no = robots, tracker, rng, opts, car_no
        o = opts
        ex, ey = rng.uniform(-1, 1, 2) * o["sled_error"]; ez = rng.uniform(-1, 1) * 0.003
        dx, dy = rng.uniform(-1, 1, 2) * o["car_offset"]
        yaw = math.radians(rng.uniform(-1, 1) * o["car_yaw"]); pitch, roll = np.radians(rng.uniform(-1, 1, 2) * 0.15)
        self.err = dict(x=ex + dx, y=ey + dy, z=ez, yaw=yaw, pitch=pitch, roll=roll)
        self.Rc = rpy(roll, pitch, yaw)
        self.dp = np.array([ex + dx, ey + dy, ez])
        # this car's build: every seam wanders a little from its drawing (across and in depth)
        self.dev = []
        for r in robots:
            dl = []
            for sm in r["seams"]:
                s = sm["s"]; b = np.cross(sm["N"], sm["T"])
                off = np.zeros((len(s), 3))
                for axis in (b, sm["N"]):
                    for _ in range(2):
                        A = rng.uniform(0, 0.5) * o["build"] / 1.0; lam = rng.uniform(0.25, 1.2); ph = rng.uniform(0, 6.28)
                        off += (A * np.sin(2 * math.pi * s / lam + ph))[:, None] * axis
                dl.append(off)
            self.dev.append(dl)
        self.frames, self.sensor, self.events, self.welds, self.traces = [], [], [], [], []
        self.t = 0.0
        self.q = [r["home"].copy() for r in robots]
        self.state = [0] * 4; self.seam = [-1] * 4; self.prog = [0.0] * 4; self.werr = [0.0] * 4; self.laser = [0] * 4
        self.car_x = ENTRY_X
        self.est = (np.eye(3), np.array([STOP_X, 0, CAR_Z]))
        self._last_sensor = [-1.0] * 4

    # --- car pose
    def car_true(self):
        return self.Rc, np.array([self.car_x, 0, CAR_Z]) + self.dp

    def seam_true(self, i, k):
        Rc, pc = self.car_true(); sm = self.R[i]["seams"][k]
        return (sm["P"] + self.dev[i][k]) @ Rc.T + pc

    def seam_expected(self, i, k):
        Re, pe = self.est; sm = self.R[i]["seams"][k]
        return sm["P"] @ Re.T + pe, sm["N"] @ Re.T, sm["T"] @ Re.T

    # --- frames
    def emit(self, n=1):
        for _ in range(n):
            Rc, pc = self.car_true()
            yaw = math.atan2(Rc[1, 0], Rc[0, 0]); pitch = -math.asin(max(-1, min(1, Rc[2, 0]))); roll = math.atan2(Rc[2, 1], Rc[2, 2])
            f = [round(self.t, 2), round(pc[0], 4), round(pc[1], 4), round(pc[2], 4), round(yaw, 5), round(pitch, 5), round(roll, 5)]
            for q in self.q:
                f += [round(float(x), 2) for x in np.degrees(q)]
            f += list(self.state) + list(self.seam) + [round(p, 4) for p in self.prog] + [round(e, 2) for e in self.werr] + list(self.laser)
            self.frames.append(f); self.t += self.DT

    def event(self, text):
        self.events.append(dict(t=round(self.t, 2), text=text))

    # --- motions (all four robots step together; each robot has its own list of planned steps)
    def joint_path(self, q0, q1):
        d = np.abs(q1 - q0); T = max(0.6, float(np.max(d / VMAX)) * 1.5 + 0.3); n = max(2, int(T / self.DT))
        out = []
        for k in range(1, n + 1):
            s = k / n; s = s * s * s * (10 - 15 * s + 6 * s * s)
            out.append(q0 + (q1 - q0) * s)
        return out

    def solve(self, i, Rw, pw, q_seed, extra_seeds=True):
        r = self.R[i]; Rl = r["Rb"].T @ Rw; pl = r["Rb"].T @ (pw - r["base"])
        best = None
        seeds = [q_seed] + ([r["home"], np.radians([0, -20, 40, 0, 60, 0]), np.radians([0, -30, 60, 180, 80, 0]),
                             np.radians([30, -10, 30, 90, 60, 0]), np.radians([-30, -10, 30, -90, 60, 0])] if extra_seeds else [])
        for sd in seeds:
            q, ok = ik(Rl, pl, sd, iters=150 if extra_seeds else 40)
            if ok:
                cost = float(np.sum(np.abs(q - q_seed)))
                if best is None or cost < best[0]:
                    best = (cost, q)
                if not extra_seeds:
                    break
        return (best[1], True) if best else (q, False)

    # --- the sled
    def move_car(self, x0, x1, vmax=1.2, acc=0.8, text=None):
        if text:
            self.event(text)
        dist = abs(x1 - x0); ta = vmax / acc; da = 0.5 * acc * ta * ta
        T = 2 * ta + (dist - 2 * da) / vmax if dist > 2 * da else 2 * math.sqrt(dist / acc)
        n = max(1, int(T / self.DT))
        for k in range(1, n + 1):
            tt = k / n * T
            if dist > 2 * da:
                s = 0.5 * acc * tt * tt if tt < ta else (da + vmax * (tt - ta) if tt < T - ta else dist - 0.5 * acc * (T - tt) ** 2)
            else:
                th = T / 2; s = 0.5 * acc * tt * tt if tt < th else dist - 0.5 * acc * (T - tt) ** 2
            self.car_x = x0 + math.copysign(s, x1 - x0); self.emit()
        self.car_x = x1

    def run_parallel(self, plans):
        """plans[i]: a list of callables, each yielding per-step updates for robot i; robots run side by side."""
        gens = [self._chain(i, p) for i, p in enumerate(plans)]
        live = [True] * 4
        while any(live):
            for i, g in enumerate(gens):
                if live[i]:
                    try:
                        next(g)
                    except StopIteration:
                        live[i] = False; self.state[i] = 0; self.laser[i] = 0
            self.emit()

    def _chain(self, i, plan):
        for step in plan:
            yield from step()

    # --- one robot's actions (generators: one yield per frame)
    def go(self, i, q1, state=1):
        def g():
            self.state[i] = state
            for q in self.joint_path(self.q[i], q1):
                self.q[i] = q; yield
        return g

    def wait(self, i, seconds, state=0):
        def g():
            self.state[i] = state
            for _ in range(int(seconds / self.DT)):
                yield
        return g

    def refs(self, i):
        """Two reference points for robot i: where one of its seams runs most across the car, and where another runs
        most along it (so the readings pin the car down in every direction); each 6 cm or more inside its seam."""
        cands = []
        for k, sm in enumerate(self.R[i]["seams"]):
            ok = np.nonzero((sm["s"] > 0.06) & (sm["s"] < sm["length"] - 0.06))[0]
            for j in ok[::2]:
                cands.append((abs(sm["T"][j, 0]), k, int(j)))
        a = min(cands); b = max([c for c in cands if c[1] != a[1]] or cands)
        return [(a[1], a[2]), (b[1], b[2])]

    def scan(self, i, k, j, out):
        """Put the laser line across point j of seam k and read it."""
        def g():
            P, N, T = self.seam_expected(i, k)
            t = T[j]; F = tool_frame(N[j], t)
            target = P[j] - LOOKAHEAD * F[:, 1]
            q, ok = self.solve(i, F, target + 0.06 * N[j], self.q[i])
            for _ in self.go(i, q)():
                yield
            q2, ok2 = self.solve(i, F, target, q, extra_seeds=False)
            for _ in self.go(i, q2)():
                yield
            self.state[i] = 2; self.laser[i] = 1
            _, tcp, _ = fk(self.q[i]); r = self.R[i]; tcp = r["Rb"] @ tcp + r["base"]
            Fw = r["Rb"] @ fk(self.q[i])[0]
            station = tcp + LOOKAHEAD * Fw[:, 1]
            hit = self.crossing(self.seam_true(i, k), station, Fw[:, 1])
            m = None
            if hit is not None:
                du = (hit - station) @ Fw[:, 2] * 1000; dh = (hit - station) @ Fw[:, 0] * 1000
                m = self.trk.measure(self.R[i]["seams"][k]["type"], du, dh)
                if m is not None and m.get("ok"):
                    out.append(dict(robot=i, station=station, z=Fw[:, 2], x=Fw[:, 0], u=m["u"] / 1000, h=m["h"] / 1000, expected=P[j],
                                    true_u=du, true_h=dh))
                    self.sensor_item(i, k, m, du, dh, "scan")
            for _ in range(int(0.8 / self.DT)):
                yield
            self.laser[i] = 0
            q3, _ = self.solve(i, F, target + 0.12 * N[j], self.q[i], extra_seeds=False)
            for _ in self.go(i, q3)():
                yield
        return g

    @staticmethod
    def nearest(P, x):
        a = P[:-1]; ab = P[1:] - a; t = np.clip(((x - a) * ab).sum(1) / np.maximum(1e-12, (ab * ab).sum(1)), 0, 1)
        c = a + ab * t[:, None]; return c[np.argmin(((c - x) ** 2).sum(1))]

    @staticmethod
    def crossing(P, origin, normal):
        s = (P - origin) @ normal
        idx = np.nonzero(np.sign(s[:-1]) * np.sign(s[1:]) <= 0)[0]
        if not len(idx):
            return None
        best = None
        for j in idx:
            a, b = s[j], s[j + 1]; w = 0.0 if a == b else a / (a - b); p = P[j] + (P[j + 1] - P[j]) * w
            dd = np.linalg.norm(p - origin)
            if best is None or dd < best[0]:
                best = (dd, p)
        return best[1] if best[0] < 0.15 else None

    def sensor_item(self, i, k, m, du, dh, phase):
        if self.t - self._last_sensor[i] < 0.24:
            return
        self._last_sensor[i] = self.t
        self.sensor.append(dict(t=round(self.t, 2), robot=i, seam=k, phase=phase, depth=np.round(m["depth"], 2).tolist(),
                                valid=m["valid"].astype(int).tolist(), pred=[round(m["u"], 2), round(m["h"], 2)], true=[round(du, 2), round(dh, 2)],
                                b=round(m["b"], 3)))

    def weld(self, i, k):
        def g():
            r = self.R[i]; sm = r["seams"][k]
            P, N, T = self.seam_expected(i, k); S = sm["s"]; L = S[-1]
            true = self.seam_true(i, k)
            v = self.o["speed"] / 1000.0
            meas_s, meas_d = [], []                     # stations along the seam and the correction seen there
            def corr(s):
                if not meas_s:
                    return np.zeros(3)
                ms = np.array(meas_s); md = np.array(meas_d)
                if s <= ms[0]:
                    return md[0]
                if s >= ms[-1]:
                    return md[-1]
                j = np.searchsorted(ms, s); w = (s - ms[j - 1]) / max(1e-9, ms[j] - ms[j - 1])
                lo = max(0, j - 3); hi = min(len(ms), j + 3)          # a short running median against outliers
                base = md[j - 1] * (1 - w) + md[j] * w
                med = np.median(md[lo:hi], axis=0)
                return base if np.linalg.norm(base - med) < 0.0008 else med
            def at(s):
                j = min(len(S) - 2, max(0, np.searchsorted(S, s) - 1)); w = (s - S[j]) / max(1e-9, S[j + 1] - S[j])
                p = P[j] * (1 - w) + P[j + 1] * w; n = N[j] * (1 - w) + N[j + 1] * w; t = T[j] * (1 - w) + T[j + 1] * w
                return p, n / np.linalg.norm(n), t / np.linalg.norm(t)
            # approach above the start, then down to it
            p0, n0, t0 = at(0.0); F0 = tool_frame(n0, t0)
            q, ok = self.solve(i, F0, p0 + 0.10 * n0, self.q[i])
            for _ in self.go(i, q)():
                yield
            self.seam[i] = k; self.prog[i] = 0.0
            back = p0 - LOOKAHEAD * F0[:, 1]                         # first the laser line on the start point
            for a in np.linspace(0.10, 0.0, 8)[1:]:
                q, ok = self.solve(i, F0, back + a * n0, self.q[i], extra_seeds=False); self.q[i] = q; yield
            s = 0.0; s_at = 0.0; errs = []; cnt = dict(reads=0, misses=0); recent = []
            def read(s_at):
                """The camera, from where the torch is now: the laser line 65 mm ahead of the wire."""
                sa = s_at + LOOKAHEAD
                if self.trk.net is None or sa > L or sa < -0.001:
                    return
                Rt, tcp, _ = fk(self.q[i]); Fw = r["Rb"] @ Rt; tcp = r["Rb"] @ tcp + r["base"]
                station = tcp + LOOKAHEAD * Fw[:, 1]
                h2 = self.crossing(true, station, Fw[:, 1])
                if h2 is None:
                    return
                du = (h2 - station) @ Fw[:, 2] * 1000; dh = (h2 - station) @ Fw[:, 0] * 1000
                m = self.trk.measure(sm["type"], du, dh); cnt["reads"] += 1
                if m is None or not m.get("ok"):
                    cnt["misses"] += 1; return
                seen = station + m["u"] / 1000 * Fw[:, 2] + m["h"] / 1000 * Fw[:, 0]
                pe, ne, te = at(sa)
                dlt = seen - pe; dlt -= (dlt @ te) * te                 # only across and in depth
                # a seam does not jump: a reading far from the ones around it is spatter or a stray edge
                recent.append(dlt); win = np.array(recent[-7:]); med = np.median(win, axis=0)
                if len(win) >= 3 and np.linalg.norm(dlt - med) < 0.0025:
                    if meas_s and sa <= meas_s[-1]:
                        meas_d[-1] = (meas_d[-1] + dlt) / 2
                    else:
                        meas_s.append(sa); meas_d.append(dlt)
                else:
                    cnt["misses"] += 1
                self.sensor_item(i, k, m, du, dh, "track")
            # before the arc starts: read the start, then run up to it reading the seam ahead
            self.laser[i] = 1 if self.trk.net is not None else 0; self.state[i] = 2
            for _ in range(5):
                read(-LOOKAHEAD); yield
            for a in np.linspace(-LOOKAHEAD, 0.0, 9)[1:]:
                read(a); pa = p0 + a * F0[:, 1]
                q, ok = self.solve(i, F0, pa + corr(a), self.q[i], extra_seeds=False); self.q[i] = q; yield
            self.state[i] = 3
            while s <= L + 1e-9:
                read(s_at)
                # the torch: the drawing moved with the car, plus what the camera saw here
                p, n, t = at(s); F = tool_frame(n, t); c = corr(s)
                q, ok = self.solve(i, F, p + c, self.q[i], extra_seeds=False); self.q[i] = q; s_at = s
                if not ok:
                    cnt["ik"] = cnt.get("ik", 0) + 1
                Rt, tcp, _ = fk(q); Fw = r["Rb"] @ Rt; tcp = r["Rb"] @ tcp + r["base"]
                hit = self.nearest(true, tcp)                       # where the seam really is, nearest the wire
                e_lat = (hit - tcp) @ Fw[:, 2] * 1000; e_dep = (hit - tcp) @ Fw[:, 0] * 1000
                errs.append((s, e_lat, e_dep)); self.werr[i] = math.hypot(e_lat, e_dep)
                self.prog[i] = min(1.0, s / L); yield
                s += v * self.DT
            self.state[i] = 1; self.laser[i] = 0; self.prog[i] = 1.0
            e = np.array(errs) if errs else np.zeros((1, 3))
            self.traces.append((r["name"], sm["name"], e))
            mx = float(np.max(np.hypot(e[:, 1], e[:, 2])))
            self.welds.append(dict(car=self.no, robot=r["name"], seam=sm["name"], type=TYPES[sm["type"]], length_m=round(L, 3),
                                   mean_mm=round(float(np.mean(np.hypot(e[:, 1], e[:, 2]))), 3), max_mm=round(mx, 3),
                                   max_across_mm=round(float(np.max(np.abs(e[:, 1]))), 3), max_depth_mm=round(float(np.max(np.abs(e[:, 2]))), 3),
                                   ok=bool(mx <= self.o["tolerance"]), camera_reads=cnt["reads"], camera_misses=cnt["misses"], unreachable_steps=cnt.get("ik", 0), seconds=round(L / v, 1)))
            self.werr[i] = 0.0
            # lift off
            pE, nE, tE = at(L); FE = tool_frame(nE, tE)
            for a in np.linspace(0.0, 0.12, 8)[1:]:
                q, ok = self.solve(i, FE, pE + a * nE + corr(L), self.q[i], extra_seeds=False); self.q[i] = q; yield
            self.seam[i] = -1
        return g

    def localise(self, meas):
        """Car pose from the laser readings: each gives where the seam is across and in depth (2 equations)."""
        if len(meas) < 4:
            return False
        A, b = [], []
        c = np.array([STOP_X, 0, CAR_Z])
        for m in meas:
            r = m["expected"] - c
            for axis, val in ((m["z"], m["u"]), (m["x"], m["h"])):
                seen = m["station"] + m["u"] * m["z"] + m["h"] * m["x"]
                A.append(np.r_[axis, np.cross(r, axis)]); b.append(axis @ (seen - m["expected"]))
        A = np.array(A); b = np.array(b)
        xi = np.linalg.solve(A.T @ A + 1e-6 * np.eye(6), A.T @ b)
        dth = xi[3:]; ang = np.linalg.norm(dth)
        Rd = _rot(dth / ang, ang) if ang > 1e-12 else np.eye(3)
        self.est = (Rd, c + xi[:3])
        self.est_xi = xi
        return True

    def run(self):
        self.emit()
        self.move_car(ENTRY_X, STOP_X, text="Car %d comes in" % self.no)
        self.event("Sled stopped; car clamped"); [self.emit() for _ in range(int(1.0 / self.DT))]
        meas = []
        if self.trk.net is not None:
            self.event("Localising the car: each robot reads two reference points")
            plans = []
            for i, r in enumerate(self.R):
                plans.append([self.scan(i, k, j, meas) for k, j in self.refs(i)])
            self.run_parallel(plans)
            if self.localise(meas):
                Re, pe = self.est
                ex = (pe - np.array([STOP_X, 0, CAR_Z]))
                self.event("Car found %+.1f mm along, %+.1f mm across, %+.1f mm up, turned %+.2f deg (really %+.1f, %+.1f, %+.1f mm, %+.2f deg)"
                           % (ex[0] * 1000, ex[1] * 1000, ex[2] * 1000, math.degrees(math.atan2(Re[1, 0], Re[0, 0])),
                              self.dp[0] * 1000, self.dp[1] * 1000, self.dp[2] * 1000, math.degrees(self.err["yaw"])))
        else:
            self.event("No seam camera: welding the taught programme as it is")
        self.event("Welding")
        plans = []
        for i, r in enumerate(self.R):
            plans.append([self.weld(i, k) for k in range(len(r["seams"]))] + [self.go(i, r["home"])])
        self.run_parallel(plans)
        ok = sum(w["ok"] for w in self.welds); worst = max(w["max_mm"] for w in self.welds)
        self.event("Car %d welded: %d of %d seams within %.1f mm (worst %.2f mm)" % (self.no, ok, len(self.welds), self.o["tolerance"], worst))
        [self.emit() for _ in range(int(0.6 / self.DT))]
        self.move_car(STOP_X, EXIT_X, text="Car %d leaves" % self.no)
        Re, pe = self.est
        return dict(car=self.no, cycle_s=round(self.t, 1), seams=len(self.welds), seams_ok=ok, worst_mm=round(worst, 3),
                    mean_mm=round(float(np.mean([w["mean_mm"] for w in self.welds])), 3),
                    off_along_mm=round(self.dp[0] * 1000, 1), off_across_mm=round(self.dp[1] * 1000, 1), off_up_mm=round(self.dp[2] * 1000, 1),
                    turned_deg=round(math.degrees(self.err["yaw"]), 3),
                    found_along_mm=round((pe[0] - STOP_X) * 1000, 1), found_across_mm=round(pe[1] * 1000, 1), found_up_mm=round((pe[2] - CAR_Z) * 1000, 1),
                    found_turned_deg=round(math.degrees(math.atan2(Re[1, 0], Re[0, 0])), 3), camera="on" if self.trk.net is not None else "off")


# ===================================================================================================== streaming
class Streamer(threading.Thread):
    """Plays cars to the 3D view in real time: frames in half-second batches, sent a little ahead."""
    def __init__(self, ctx, layout, speed=1.0):
        super().__init__(daemon=True)
        self.ctx, self.layout, self.q, self.speed = ctx, layout, queue.Queue(maxsize=1), speed
        self.busy = False; self.stop = threading.Event(); self.played = 0; self.last_layout = 0

    def run(self):
        while not self.stop.is_set():
            try:
                item = self.q.get(timeout=0.5)
            except queue.Empty:
                self.maybe_layout(); continue
            self.busy = True
            try:
                self.play(*item)
            except Exception as e:
                self.ctx.log("[stream] %s" % e)
            self.busy = False; self.played += 1

    def maybe_layout(self, force=False):
        if force or time.time() - self.last_layout > 15:
            self.ctx.telemetry("cell", self.layout); self.last_layout = time.time()

    def play(self, run, label, on_done=None):
        ctx = self.ctx; fr = run.frames; ev = list(run.events); se = list(run.sensor)
        self.maybe_layout(force=True)
        w0 = time.time() + 1.0; per = int(0.5 / CarRun.DT)
        for k in range(0, len(fr), per):
            if self.stop.is_set():
                return
            batch = fr[k:k + per]; t_hi = batch[-1][0]
            ctx.telemetry("cell", dict(kind="frames", car=run.no, label=label, w0=w0, sent=time.time(), speed=self.speed, f=batch))
            while ev and ev[0]["t"] <= t_hi:
                e = ev.pop(0); ctx.telemetry("event", dict(text=e["text"], car=run.no))
            while se and se[0]["t"] <= t_hi:
                ctx.telemetry("sensor", dict(se.pop(0), car=run.no))
            wake = w0 + (t_hi - 0.5) / self.speed - 0.6
            while time.time() < wake and not self.stop.is_set():
                time.sleep(0.05)
            self.maybe_layout()
        while time.time() < w0 + fr[-1][0] / self.speed and not self.stop.is_set():
            time.sleep(0.1)
        if on_done:
            on_done(run)


# ===================================================================================================== learn
def learn(ctx, p, robots, layout):
    import torch
    dev = "cuda" if torch.cuda.is_available() and p.get("accelerator", "auto") != "CPU" else "cpu"
    if p.get("accelerator") == "NVIDIA GPU" and dev != "cuda":
        raise RuntimeError("NVIDIA GPU asked for, but PyTorch on this machine cannot use one.")
    torch.manual_seed(int(p.get("seed", 1)))
    net = build_net(torch).to(dev)
    start = newest_tracker(ctx, p)
    if start and not p.get("from_scratch"):
        ck = torch.load(start, map_location=dev, weights_only=False); net.load_state_dict(ck["state"])
        ctx.telemetry("event", dict(text="Going on from %s" % pathlib.Path(start).name)); ctx.log("[learn] from %s" % start)
    opt = torch.optim.AdamW(net.parameters(), lr=float(p.get("lr", 2e-3)), weight_decay=1e-4)
    minutes = float(p.get("minutes", 20)); target = float(p.get("target_mm", 0.3)); B = int(p.get("batch", 2048))
    lr0 = float(p.get("lr", 2e-3))
    gen = torch.Generator(device=dev).manual_seed(int(p.get("seed", 1)))
    vgen = torch.Generator(device=dev).manual_seed(12345)
    VB = 8192
    vt, vu, vh = sample_joints(torch, VB, vgen, dev); vd, vv = make_profiles(torch, VB, vt, vu, vh, vgen, dev)
    curve = []; t0 = time.time(); step = 0; last_eval = 0; last_replay = -1e9; best = None
    streamer = Streamer(ctx, layout); streamer.start()
    replay_every = float(p.get("replay_every", 120))
    rng = np.random.default_rng(int(p.get("seed", 1)))
    opts = car_opts(p)
    replay_box = {"busy": False, "result": None}
    ctx.telemetry("event", dict(text="Learning to read the seam camera on the %s" % ("GPU" if dev == "cuda" else "CPU")))

    def replay(state, n):
        try:
            cpu = build_net(torch); cpu.load_state_dict(state); cpu.eval()
            run = CarRun(robots, Tracker(cpu, torch), rng, opts, n); res = run.run()
            replay_box["result"] = res
            streamer.q.put((run, "learning: car %d" % n))
        except Exception as e:
            ctx.log("[replay] %r" % e)
        replay_box["busy"] = False

    cars = 0; last_car = None
    while True:
        el = (time.time() - t0) / 60
        net.train()
        jt, ju, jh = sample_joints(torch, B, gen, dev); d, v = make_profiles(torch, B, jt, ju, jh, gen, dev)
        pu, ph, bu, bh = net(d, v, jt)
        loss = ((pu - ju).abs() / bu.exp() + bu + (ph - jh).abs() / bh.exp() + bh).mean()
        frac = min(1.0, el / max(0.1, minutes))                 # learning rate: warm up, then a cosine over the time given
        for g_ in opt.param_groups:
            g_["lr"] = lr0 * min(1.0, (step + 1) / 300) * (0.05 + 0.95 * 0.5 * (1 + math.cos(math.pi * frac)))
        opt.zero_grad(set_to_none=True); loss.backward(); torch.nn.utils.clip_grad_norm_(net.parameters(), 1.0); opt.step()
        step += 1
        if time.time() - last_eval > 15 or step == 1:
            last_eval = time.time(); net.eval()
            with torch.no_grad():
                eu, eh, ebu, ebh = net(vd, vv, vt)
            err = torch.hypot(eu - vu, eh - vh); conf = torch.exp(torch.maximum(ebu, ebh)) < 1.0
            row = dict(minutes=round(el, 2), step=step, loss=round(float(loss), 4),
                       median_mm=round(float(err.median()), 3), p95_mm=round(float(err.quantile(0.95)), 3),
                       p95_confident_mm=round(float(err[conf].quantile(0.95)), 3) if conf.any() else None,
                       confident_pct=round(float(conf.float().mean()) * 100, 1),
                       profiles_seen=step * B)
            for k, nm in enumerate(TYPES):
                m = vt == k
                row["p95_" + nm + "_mm"] = round(float(err[m].quantile(0.95)), 3)
            if replay_box["result"] is not None:
                rr = replay_box["result"]; replay_box["result"] = None; last_car = rr; cars += 1
            if last_car:
                row.update(car_worst_mm=last_car["worst_mm"], car_mean_mm=last_car["mean_mm"], car_seams_ok=last_car["seams_ok"], cars=cars)
            curve.append(row); ctx.telemetry("train", row); ctx.progress(min(99, el / minutes * 100), "p95 %.2f mm" % row["p95_mm"])
            ctx.log("[learn] %.1f min step %d loss %.3f median %.3f p95 %.3f mm (confident %.1f%%: %s)" % (el, step, row["loss"], row["median_mm"], row["p95_mm"], row["confident_pct"], row["p95_confident_mm"]))
            if best is None or row["p95_confident_mm"] is not None and row["p95_confident_mm"] < best[0]:
                best = (row["p95_confident_mm"] or 99, {k: v.detach().cpu().clone() for k, v in net.state_dict().items()}, row)
            if row["p95_confident_mm"] is not None and row["p95_confident_mm"] <= target and el > 2:
                ctx.telemetry("event", dict(text="Target reached: 95 %% of readings within %.2f mm" % row["p95_confident_mm"])); break
            if el >= minutes or ctx_stop(ctx):
                break
            if not replay_box["busy"] and not streamer.busy and streamer.q.empty() and time.time() - last_replay > replay_every:
                replay_box["busy"] = True; last_replay = time.time()
                threading.Thread(target=replay, args=({k: v.detach().cpu().clone() for k, v in net.state_dict().items()}, cars + 1), daemon=True).start()
    state = best[1] if best else net.state_dict(); row = best[2] if best else curve[-1]
    name = "seam_tracker_%s_%04dum.pt" % (datetime.datetime.now().strftime("%Y%m%d_%H%M"), int(round((row["p95_confident_mm"] or row["p95_mm"]) * 1000)))
    torch.save(dict(state={k: v.cpu() for k, v in state.items()}, version=1, nu=NU, types=TYPES, metrics=row, made=time.time()), ctx.output("tracker", name))
    with open(ctx.output("curve", "training.csv"), "w", newline="") as fh:
        keys = sorted({k for r in curve for k in r}, key=lambda k: list(curve[-1].keys()).index(k) if k in curve[-1] else 99)
        w = csv.DictWriter(fh, fieldnames=keys); w.writeheader(); w.writerows(curve)
    ctx.telemetry("event", dict(text="Seam camera learned: %s (95 %% of readings within %.2f mm)" % (name, row["p95_confident_mm"] or row["p95_mm"])))
    # let a replay that is playing finish
    deadline = time.time() + 120
    while (streamer.busy or replay_box["busy"]) and time.time() < deadline:
        time.sleep(0.5)
    streamer.stop.set()
    ctx.write_json("metadata", "learning.json", dict(tracker=name, metrics=row, steps=step, minutes=round((time.time() - t0) / 60, 1), device=dev))
    return dict(tracker=name, p95_mm=row["p95_mm"])


def ctx_stop(ctx):
    try:
        for m in ctx.messages("control") or []:
            d = m.get("data", m) if isinstance(m, dict) else m
            if isinstance(d, dict) and str(d.get("button", d.get("action", ""))).lower().startswith("finish"):
                return True
    except Exception:
        pass
    return False


def newest_tracker(ctx, p):
    want = str(p.get("tracker_file") or "").strip()
    files = [f for f in (ctx.inputs.get("tracker") or []) if str(f.name).endswith(".pt")]
    if want:
        files = [f for f in files if f.name == want]
    if not files:
        return None
    return str(sorted(files, key=lambda f: f.name)[-1].path)


def car_opts(p):
    return dict(sled_error=float(p.get("sled_error_mm", 30)) / 1000, car_offset=float(p.get("car_offset_mm", 8)) / 1000,
                car_yaw=float(p.get("car_turn_deg", 0.4)), build=float(p.get("build_mm", 1.2)) / 1000,
                speed=float(p.get("weld_speed", 80)), tolerance=float(p.get("tolerance_mm", 1.0)))


# ===================================================================================================== produce
def produce(ctx, p, robots, layout):
    tracker = Tracker()
    if p.get("seam_camera", True):
        import torch
        path = newest_tracker(ctx, p)
        if path:
            ck = torch.load(path, map_location="cpu", weights_only=False); net = build_net(torch); net.load_state_dict(ck["state"]); net.eval()
            tracker = Tracker(net, torch)
            ctx.telemetry("event", dict(text="Seam camera: %s" % pathlib.Path(path).name)); ctx.log("[line] tracker %s" % path)
        else:
            ctx.telemetry("event", dict(text="No learned seam camera yet (run flow 1): welding the taught programme only"))
    else:
        ctx.telemetry("event", dict(text="Seam camera off: welding the taught programme only"))
    n_cars = int(p.get("cars", 0)); max_min = float(p.get("max_minutes", 30))
    rng = np.random.default_rng(int(p.get("seed", 1))); opts = car_opts(p)
    streamer = Streamer(ctx, layout); streamer.start()
    welds_f = open(ctx.output("welds", "welds.csv"), "w", newline=""); cars_f = open(ctx.output("cars", "cars.csv"), "w", newline="")
    ww = cw = None; stats = dict(cars=0, seams=0, ok=0, worst=0.0, cycle=[])
    t0 = time.time(); ahead = queue.Queue(maxsize=1)

    def producer():
        k = 0
        while (n_cars == 0 or k < n_cars) and (time.time() - t0) / 60 < max_min:
            k += 1; run = CarRun(robots, tracker, rng, opts, k); res = run.run(); ahead.put((run, res))
        ahead.put(None)
    threading.Thread(target=producer, daemon=True).start()
    while True:
        item = ahead.get()
        if item is None:
            break
        run, res = item
        done = threading.Event()
        streamer.q.put((run, "car %d" % run.no, lambda r: done.set()))
        done.wait()
        if ww is None:
            ww = csv.DictWriter(welds_f, fieldnames=list(run.welds[0].keys())); ww.writeheader()
            cw = csv.DictWriter(cars_f, fieldnames=list(res.keys())); cw.writeheader()
        ww.writerows(run.welds); cw.writerow(res); welds_f.flush(); cars_f.flush()
        stats["cars"] += 1; stats["seams"] += res["seams"]; stats["ok"] += res["seams_ok"]; stats["worst"] = max(stats["worst"], res["worst_mm"]); stats["cycle"].append(res["cycle_s"])
        line = dict(cars=stats["cars"], seams_ok_pct=round(100 * stats["ok"] / max(1, stats["seams"]), 1), worst_mm=res["worst_mm"],
                    mean_mm=res["mean_mm"], cycle_s=res["cycle_s"], cars_per_hour=round(3600 / float(np.mean(stats["cycle"])), 1),
                    off_across_mm=res["off_across_mm"], off_along_mm=res["off_along_mm"], found_across_mm=res["found_across_mm"], found_along_mm=res["found_along_mm"])
        ctx.telemetry("line", line); ctx.telemetry("cell", dict(kind="car", **res))
        ctx.progress(min(99, (stats["cars"] / n_cars * 100) if n_cars else (time.time() - t0) / 60 / max_min * 100), "%d cars" % stats["cars"])
        ctx.log("[line] car %d: %d/%d seams within %.1f mm, worst %.2f mm, cycle %.0f s" % (res["car"], res["seams_ok"], res["seams"], opts["tolerance"], res["worst_mm"], res["cycle_s"]))
        if ctx_stop(ctx):
            break
    streamer.stop.set(); welds_f.close(); cars_f.close()
    ctx.write_json("metadata", "line.json", dict(cars=stats["cars"], seams=stats["seams"], seams_ok=stats["ok"], worst_mm=stats["worst"],
                                                 mean_cycle_s=round(float(np.mean(stats["cycle"])), 1) if stats["cycle"] else None, options=opts))
    return dict(cars=stats["cars"], seams_ok_pct=round(100 * stats["ok"] / max(1, stats["seams"]), 1))


# ===================================================================================================== entry
def run(ctx):
    p = ctx.params
    robots = load_cell(); layout = layout_item(robots)
    ctx.telemetry("cell", layout)
    mode = str(p.get("mode") or "Learn to follow the seams")
    if mode.startswith("Learn"):
        return learn(ctx, p, robots, layout)
    return produce(ctx, p, robots, layout)
