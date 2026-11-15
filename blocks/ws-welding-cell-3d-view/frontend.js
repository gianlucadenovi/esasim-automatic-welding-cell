// ── EsaSim block ──────────────────────────────────────────────────────
// Welding cell 3D view (ws-welding-cell-3d-view) · version 2 · view, JavaScript: function render(ctx)
// The car factory welding cell live in 3D while a run goes on: rail and sled, the car body frame, four KUKA robots with swan-neck torches and laser seam cameras, sparks, seams turning to welds, and the
// Workspace: Gianluca De Novi's workspace · Author: Gianluca De Novi
// Saved: 2026-11-15
//
// Inputs   ctx.input("id") gives { files, stream }; ctx.rows("id"), ctx.json("id"), ctx.text("id")
//   live        Stream                    Live · The Welding cell block's telemetry
//   models      Files (glb)               Models · several · optional · kr210_weld.glb and the car frame
// Settings ctx.params.key
//   quality     select    Quality = "high" of high | balanced | fast
// EsaSim rewrites these lines from the block's definition each time it is saved: change the definition, not them.
// ── end of EsaSim block header ────────────────────────────────────────

/* Welding cell 3D view: the car factory hall, the rail and its sled, the car body frame and the four KUKA KR 210 robots
 * with their swan-neck MIG torches and laser seam cameras, played live from the Welding cell block's telemetry
 * (channel cell: layout and 20 Hz frames; sensor: laser profiles; event: what happens). Models: kr210_weld.glb and the
 * car frame (any other .glb) from the models input; without them, simple stand-ins are drawn. Sparks, the arc light,
 * the laser lines, the seams (blue: to weld, orange then dark: welded), and the seam camera's profiles at the bottom. */
function render(ctx) {
  var THREE = ctx.THREE, A = THREE.addons, el = ctx.el, P = ctx.params || {};
  var quality = P.quality || 'high';
  if (window.__weldStop) { try { window.__weldStop(); } catch (e) { } window.__weldStop = null; }
  el.innerHTML = ''; el.style.position = 'relative'; el.style.background = '#0d1117'; el.style.overflow = 'hidden';

  var renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: quality !== 'fast', powerPreference: 'high-performance' }); }
  catch (e) { el.innerHTML = '<div style="padding:20px;color:#9aa3b2;font:13px system-ui">3D graphics are not available in this browser.</div>'; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = quality !== 'fast'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // the view fills its panel: the canvas sits on top (it must not size the panel itself), and a panel with no height of
  // its own gets the full height of its slot (at least 480 px)
  el.appendChild(renderer.domElement); renderer.domElement.style.cssText = 'display:block;position:absolute;left:0;top:0';
  if (el.clientHeight < 240) { el.style.height = '100%'; el.style.minHeight = '480px'; }

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1f27);
  scene.fog = new THREE.Fog(0x1a1f27, 30, 75);
  var camera = new THREE.PerspectiveCamera(42, 1, 0.03, 300);
  camera.position.set(7.5, 5.2, 8.5);
  var controls = new A.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.1, 0); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.495; controls.update();
  try { var pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new A.RoomEnvironment(), 0.04).texture; } catch (e) { }

  var composer = null, bloom = null;
  if (quality !== 'fast' && A.EffectComposer) {
    try {
      composer = new A.EffectComposer(renderer); composer.addPass(new A.RenderPass(scene, camera));
      bloom = new A.UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.35, 0.86); composer.addPass(bloom);
      composer.addPass(new A.OutputPass());
    } catch (e) { composer = null; }
  }

  // ---------------------------------------------------------------------------------------------- coordinates
  // simulation: x along the rail, y left, z up (metres) -> three.js: X = x, Y = z, Z = -y
  function v3(p) { return new THREE.Vector3(p[0], p[2], -p[1]); }
  function mat(c, o) { return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.1 }, o || {})); }
  function box(w, h, d, m, x, y, z, parent) { var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; (parent || scene).add(b); return b; }
  function cyl(r, h, m, x, y, z, parent, seg) { var c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 24), m); c.position.set(x, y, z); c.castShadow = c.receiveShadow = true; (parent || scene).add(c); return c; }

  // ---------------------------------------------------------------------------------------------- the hall
  var hemi = new THREE.HemisphereLight(0xdfe8ff, 0x30302c, 0.55); scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(6, 14, 8); sun.castShadow = renderer.shadowMap.enabled;
  sun.shadow.mapSize.set(quality === 'high' ? 2048 : 1024, quality === 'high' ? 2048 : 1024);
  sun.shadow.camera.left = -9; sun.shadow.camera.right = 9; sun.shadow.camera.top = 9; sun.shadow.camera.bottom = -9; sun.shadow.camera.far = 40; sun.shadow.bias = -0.0004;
  scene.add(sun);
  // floor: sealed concrete with painted walkways and the cell's hatched safety zone
  (function () {
    var c = document.createElement('canvas'); c.width = c.height = 1024; var g = c.getContext('2d');
    g.fillStyle = '#5d6168'; g.fillRect(0, 0, 1024, 1024);
    for (var i = 0; i < 9000; i++) { var s = Math.random() * 2.2; g.fillStyle = 'rgba(' + (Math.random() < .5 ? '255,255,255' : '0,0,0') + ',' + (Math.random() * 0.05) + ')'; g.fillRect(Math.random() * 1024, Math.random() * 1024, s, s); }
    g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 2; for (var k = 0; k <= 1024; k += 128) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 1024); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(1024, k); g.stroke(); }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat(0xffffff, { map: t, roughness: 0.82 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  })();
  var yellow = mat(0xf2c200, { roughness: 0.5 }), black = mat(0x16181b, { roughness: 0.7 });
  function stripe(x0, z0, x1, z1, w, m) { var L = Math.hypot(x1 - x0, z1 - z0); var s = new THREE.Mesh(new THREE.PlaneGeometry(L, w), m || mat(0xf2c200, { roughness: 0.6 })); s.rotation.x = -Math.PI / 2; s.rotation.z = -Math.atan2(z1 - z0, x1 - x0); s.position.set((x0 + x1) / 2, 0.003, (z0 + z1) / 2); s.receiveShadow = true; scene.add(s); }
  // walkways along the hall
  stripe(-30, 5.4, 30, 5.4, 0.1); stripe(-30, -5.4, 30, -5.4, 0.1); stripe(-30, 7.4, 30, 7.4, 0.1); stripe(-30, -7.4, 30, -7.4, 0.1);
  // hall: columns, beams, roof lights, far walls
  var steel = mat(0x8a9099, { metalness: 0.6, roughness: 0.45 }), blue = mat(0x2b4f86, { metalness: 0.3, roughness: 0.5 });
  for (var cx = -24; cx <= 24; cx += 12) { [-10, 10].forEach(function (cz) { box(0.45, 9, 0.45, blue, cx, 4.5, cz); box(0.9, 0.12, 0.9, black, cx, 0.06, cz); }); box(0.35, 0.7, 20.5, blue, cx, 8.6, 0); }
  [-10, 10].forEach(function (cz) { box(50, 0.5, 0.3, blue, 0, 8.6, cz); });
  for (var lx = -21; lx <= 21; lx += 6) { for (var lz = -6; lz <= 6; lz += 4) { var lamp = box(1.6, 0.08, 0.35, mat(0xffffff, { emissive: 0xfff5e0, emissiveIntensity: 1.6 }), lx, 8.1, lz); lamp.castShadow = false; } }
  var wallM = mat(0x2c323b, { roughness: 0.95 });
  box(60, 9, 0.2, wallM, 0, 4.5, -14); box(60, 9, 0.2, wallM, 0, 4.5, 14);
  box(60, 0.2, 28, mat(0x262b33, { roughness: 1 }), 0, 9.2, 0).receiveShadow = false;
  // the cell's fence: posts and mesh panels, open where the rail goes through, with a gate on each side
  var meshTex = (function () { var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d'); g.clearRect(0, 0, 64, 64); g.strokeStyle = 'rgba(40,44,48,0.95)'; g.lineWidth = 3; for (var k = 0; k <= 64; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 64); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(64, k); g.stroke(); } var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  function panel(x0, z0, x1, z1) {
    var L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
    var tex = meshTex.clone(); tex.needsUpdate = true; tex.repeat.set(L * 6, 2.2 * 6);
    var m = new THREE.Mesh(new THREE.PlaneGeometry(L, 2.2), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.3, roughness: 0.6 }));
    m.position.set((x0 + x1) / 2, 1.25, (z0 + z1) / 2); m.rotation.y = -ang; scene.add(m);
    var bar = box(L, 0.05, 0.05, yellow, (x0 + x1) / 2, 2.35, (z0 + z1) / 2); bar.rotation.y = -ang;
    var bar2 = box(L, 0.05, 0.05, yellow, (x0 + x1) / 2, 0.15, (z0 + z1) / 2); bar2.rotation.y = -ang;
  }
  var FX = 4.6, FZ = 4.2;
  [[-FX, -FZ, FX, -FZ], [-FX, FZ, FX, FZ], [-FX, -FZ, -FX, -1.2], [-FX, 1.2, -FX, FZ], [FX, -FZ, FX, -1.2], [FX, 1.2, FX, FZ]].forEach(function (s) { panel(s[0], s[1], s[2], s[3]); });
  [[-FX, -FZ], [FX, -FZ], [-FX, FZ], [FX, FZ], [-FX, -1.2], [-FX, 1.2], [FX, -1.2], [FX, 1.2], [0, -FZ], [0, FZ]].forEach(function (p) { box(0.08, 2.4, 0.08, yellow, p[0], 1.2, p[1]); });
  // light curtains at the openings and a beacon
  [-FX, FX].forEach(function (x) { [-1.2, 1.2].forEach(function (z) { box(0.07, 1.8, 0.07, black, x, 0.9, z); }); });
  var beaconOn = mat(0x22ff66, { emissive: 0x22ff66, emissiveIntensity: 2.0 }); var beacon = cyl(0.07, 0.18, beaconOn, FX, 2.55, -FZ);
  // control cabinet and operator panel
  box(1.2, 2.0, 0.5, mat(0xd8dadc, { roughness: 0.5 }), -FX - 1.2, 1.0, -FZ - 0.6); box(0.5, 1.2, 0.35, mat(0xd8dadc), FX + 0.8, 0.6, -FZ - 0.5);
  // the rail: two steel rails on sleepers, through the hall
  var railM = mat(0xb4bac2, { metalness: 0.85, roughness: 0.3 }), sleeperM = mat(0x3b4048, { roughness: 0.8 });
  [-0.55, 0.55].forEach(function (z) { box(30, 0.08, 0.12, railM, 0, 0.24, z); box(30, 0.2, 0.16, sleeperM, 0, 0.1, z); });
  for (var sx = -15; sx <= 15; sx += 1.2) { box(0.14, 0.06, 1.5, sleeperM, sx, 0.03, 0); }
  stripe(-15, 0.95, 15, 0.95, 0.06, mat(0xf2c200)); stripe(-15, -0.95, 15, -0.95, 0.06, mat(0xf2c200));

  // ---------------------------------------------------------------------------------------------- the sled and the car
  var carRoot = new THREE.Group(); scene.add(carRoot);           // follows the car's true pose
  var sled = new THREE.Group(); scene.add(sled);                 // follows the rail
  (function () {
    var dark = mat(0x2a2e34, { metalness: 0.5, roughness: 0.45 });
    box(4.4, 0.12, 1.25, dark, 0, 0.34, 0, sled);
    [-1.9, 1.9].forEach(function (x) { [-0.55, 0.55].forEach(function (z) { box(0.32, 0.1, 0.2, mat(0x111316), x, 0.25, z, sled); }); });
    // locating towers with pins
    [[-1.5, 0.45], [-1.5, -0.45], [1.5, 0.45], [1.5, -0.45]].forEach(function (p) { box(0.16, 0.12, 0.16, mat(0x5b6066, { metalness: 0.5 }), p[0], 0.46, p[1], sled); cyl(0.02, 0.06, railM, p[0], 0.53, p[1], sled, 12); });
    [-2.15, 2.15].forEach(function (x) { box(0.08, 0.12, 1.25, yellow, x, 0.34, 0, sled); });
  })();
  var carModel = null, carStandIn = null;
  function standInCar() {
    var g = new THREE.Group(), m = mat(0xc8ccd2, { metalness: 0.7, roughness: 0.3, transparent: true, opacity: 0.35 });
    var b = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.2, 1.9), m); b.position.set(0, 0.1, 0); g.add(b);
    var e = new THREE.LineSegments(new THREE.EdgesGeometry(b.geometry), new THREE.LineBasicMaterial({ color: 0xdfe6ee })); e.position.copy(b.position); g.add(e);
    return g;
  }
  carStandIn = standInCar(); carRoot.add(carStandIn);
  var seamGroup = new THREE.Group(); carRoot.add(seamGroup);

  // ---------------------------------------------------------------------------------------------- robots
  var AX = { a1: new THREE.Vector3(0, 1, 0), a2: new THREE.Vector3(0, 0, 1), a3: new THREE.Vector3(0, 0, 1), a4: new THREE.Vector3(1, 0, 0), a5: new THREE.Vector3(0, 0, 1), a6: new THREE.Vector3(1, 0, 0) };
  var JN = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
  var robotTemplate = null, robots = [];
  function seg(rad, a, b, m, parent) {           // a cylinder from a to b in parent's frame
    var L = a.distanceTo(b), c = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, L, 14), m);
    c.position.copy(a).add(b).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); parent.add(c); return c;
  }
  function standInRobot() {
    // the same joint tree as kr210_weld.glb, drawn with simple shapes (pivots in metres, arm along +X, Y up)
    var piv = { a1: [0, 0, 0], a2: [0.349, 0.678, 0], a3: [0.349, 1.825, 0], a4: [0.70, 1.784, 0], a5: [1.575, 1.784, 0], a6: [1.79, 1.784, 0] };
    var or = mat(0xf26a0c, { roughness: 0.4 }), bk = mat(0x202022, { roughness: 0.6 });
    var root = new THREE.Group(); var base = new THREE.Group(); base.name = 'base'; root.add(base);
    cyl(0.42, 0.25, bk, 0, 0.125, 0, base);
    var parent = base, prev = [0, 0, 0];
    JN.forEach(function (n) { var g = new THREE.Group(); g.name = n; g.position.set(piv[n][0] - prev[0], piv[n][1] - prev[1], piv[n][2] - prev[2]); parent.add(g); parent = g; prev = piv[n]; });
    var a1 = root.getObjectByName('a1'), a2 = root.getObjectByName('a2'), a3 = root.getObjectByName('a3'), a4 = root.getObjectByName('a4'), a5 = root.getObjectByName('a5'), a6 = root.getObjectByName('a6');
    box(0.7, 0.45, 0.7, or, 0.12, 0.45, 0, a1);
    box(0.28, 1.25, 0.32, or, 0, 0.57, 0, a2);
    box(0.95, 0.3, 0.3, or, 0.35, -0.04, 0, a3); box(0.5, 0.45, 0.5, or, -0.15, 0, 0, a3);
    box(0.85, 0.2, 0.2, or, 0.43, 0, 0, a4);
    cyl(0.12, 0.26, or, 0, 0, 0, a5).rotation.x = Math.PI / 2;
    cyl(0.07, 0.04, bk, 0.02, 0, 0, a6).rotation.z = Math.PI / 2;
    // the swan-neck MIG torch: straight barrel, a 45 deg neck, the nozzle; the wire tip 0.54 m out, 0.13 m below the axis
    var NE = new THREE.Vector3(0.4449, 0, -0.0351), TIP = new THREE.Vector3(0.5403, 0, -0.1306), D = TIP.clone().sub(NE).normalize();
    seg(0.022, new THREE.Vector3(0.05, 0, 0), new THREE.Vector3(0.36, 0, 0), bk, a6); seg(0.019, new THREE.Vector3(0.36, 0, 0), NE, bk, a6);
    seg(0.016, NE, TIP.clone().addScaledVector(D, -0.02), mat(0xc8cace, { metalness: 1, roughness: 0.25 }), a6);
    box(0.10, 0.07, 0.05, mat(0x30343a), 0.34, 0.09, 0, a6);
    var tcp = new THREE.Group(); tcp.name = 'tcp'; tcp.position.copy(TIP);
    var bz = new THREE.Vector3().crossVectors(D, new THREE.Vector3(0, 1, 0)); tcp.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(D, new THREE.Vector3(0, 1, 0), bz)); a6.add(tcp);
    return root;
  }
  function makeRobot(i, def) {
    var g = new THREE.Group();
    g.position.copy(v3(def.base)); g.rotation.y = def.yaw;
    var pedM = mat(0x464b52, { metalness: 0.4, roughness: 0.5 });
    var ped = cyl(0.5, def.base[2], pedM, def.base[0], def.base[2] / 2, -def.base[1]); ped.material = pedM;
    box(1.3, 0.04, 1.3, yellow, def.base[0], 0.02, -def.base[1]);
    var body = (robotTemplate || standInRobot()).clone(true); g.add(body); scene.add(g);
    body.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    var r = { g: g, body: body, ped: ped, j: {}, tcp: body.getObjectByName('tcp'), a6: body.getObjectByName('a6') };
    JN.forEach(function (n) { r.j[n] = body.getObjectByName(n); if (r.j[n]) r.j[n].userData.rest = r.j[n].quaternion.clone(); });
    // the arc: a light at the wire, a glowing tip, sparks
    r.arc = new THREE.PointLight(0x9fd0ff, 0, 3.5, 2); scene.add(r.arc);
    r.tip = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); r.tip.visible = false; scene.add(r.tip);
    r.sparks = makeSparks(); scene.add(r.sparks.points);
    // the laser line and its fan
    r.laser = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xff2a2a })); r.laser.visible = false; scene.add(r.laser);
    var fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9), 3));
    r.fan = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })); r.fan.visible = false; scene.add(r.fan);
    return r;
  }
  function makeSparks() {
    var N = 260, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), life = new Float32Array(N);
    var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffc070, size: 0.018, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false;
    for (var i = 0; i < N; i++) { pos[i * 3 + 1] = -100; life[i] = 0; }
    return { points: pts, pos: pos, vel: vel, life: life, N: N, next: 0 };
  }
  function stepSparks(s, on, at, dt, normal) {
    var k;
    if (on) {
      for (k = 0; k < 9; k++) {
        var i = s.next; s.next = (s.next + 1) % s.N; s.life[i] = 0.25 + Math.random() * 0.45;
        s.pos[i * 3] = at.x; s.pos[i * 3 + 1] = at.y; s.pos[i * 3 + 2] = at.z;
        var sp = 1.2 + Math.random() * 2.8, th = Math.random() * Math.PI * 2, up = Math.random();
        s.vel[i * 3] = Math.cos(th) * sp * 0.8 + normal.x * up * 2; s.vel[i * 3 + 1] = Math.random() * 1.6 + normal.y * up * 2; s.vel[i * 3 + 2] = Math.sin(th) * sp * 0.8 + normal.z * up * 2;
      }
    }
    for (k = 0; k < s.N; k++) {
      if (s.life[k] <= 0) continue;
      s.life[k] -= dt; s.vel[k * 3 + 1] -= 9.8 * dt;
      s.pos[k * 3] += s.vel[k * 3] * dt; s.pos[k * 3 + 1] += s.vel[k * 3 + 1] * dt; s.pos[k * 3 + 2] += s.vel[k * 3 + 2] * dt;
      if (s.pos[k * 3 + 1] < 0.01) { s.pos[k * 3 + 1] = 0.01; s.vel[k * 3 + 1] *= -0.3; s.vel[k * 3] *= 0.5; s.vel[k * 3 + 2] *= 0.5; }
      if (s.life[k] <= 0) s.pos[k * 3 + 1] = -100;
    }
    s.points.geometry.attributes.position.needsUpdate = true;
  }

  // ---------------------------------------------------------------------------------------------- models
  var models = { robotId: null, carId: null };
  function parseGlb(f) {
    return ctx.files.buffer(f).then(function (buf) {
      return new Promise(function (res, rej) {
        var gl = new A.GLTFLoader();
        gl.register(function (parser) { parser.textureLoader = new THREE.TextureLoader(); return { name: 'esasim_images' }; });
        gl.parse(buf, '', function (g) { res(g.scene); }, rej);
      });
    });
  }
  function loadModels() {
    var files = [];
    ctx.ports().forEach(function (p) { var x = ctx.input(p); if (x && x.files) files = files.concat(x.files); });
    var glbs = files.filter(function (f) { return /\.glb$/i.test(f.name); });
    var rf = glbs.filter(function (f) { return /kr210|robot|kuka/i.test(f.name); })[0];
    var cf = glbs.filter(function (f) { return f !== rf; })[0];
    if (rf && models.robotId !== rf.id) {
      models.robotId = rf.id;
      parseGlb(rf).then(function (sc) { robotTemplate = sc; rebuildRobots(); }).catch(function (e) { ctx.status('Could not read ' + rf.name + ': ' + e.message); });
    }
    if (cf && models.carId !== cf.id) {
      models.carId = cf.id;
      parseGlb(cf).then(function (sc) {
        if (carModel) carRoot.remove(carModel);
        carModel = new THREE.Group(); sc.rotation.y = -Math.PI / 2; carModel.add(sc);   // model: Y up, front at -Z
        sc.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) { o.material.side = THREE.DoubleSide; o.material.envMapIntensity = 1.4; } } });
        carRoot.add(carModel); if (carStandIn) { carRoot.remove(carStandIn); carStandIn = null; }
      }).catch(function (e) { ctx.status('Could not read ' + cf.name + ': ' + e.message); });
    }
  }

  // ---------------------------------------------------------------------------------------------- telemetry
  var L = null, seamLines = [], seen = {}, seenQ = [];
  var cars = {}, carOrder = [], skew = null, curCar = null, lastSensor = [null, null, null, null], events = [], lineStats = null, trainStats = null, carSummary = null;
  function key(it) { var d = it.data || {}; return it.channel + '|' + (it.t || '') + '|' + (d.kind || '') + '|' + (d.car || '') + '|' + (d.f ? d.f[0][0] : '') + '|' + (d.text || '') + '|' + (d.robot != null ? d.robot + ':' + d.t : ''); }
  function feed() {
    var stream = [];
    ctx.ports().forEach(function (p) { var x = ctx.input(p); if (x && x.stream) stream = stream.concat(x.stream); });
    stream.forEach(function (it) {
      if (!it || !it.data) return;
      var k = key(it); if (seen[k]) return; seen[k] = 1; seenQ.push(k); if (seenQ.length > 6000) seenQ.splice(0, 1000).forEach(function (q) { delete seen[q]; });
      var d = it.data, ch = it.channel;
      if (ch === 'cell' && d.kind === 'layout') { if (!L || JSON.stringify(L.robots) !== JSON.stringify(d.robots) || L.seams.length !== d.seams.length) { L = d; buildLayout(); } }
      else if (ch === 'cell' && d.kind === 'frames') {
        var now = Date.now() / 1000, sk = now - d.sent; skew = skew == null ? sk : Math.min(skew + 0.002, sk);   // browser minus machine clock
        var c = cars[d.car]; if (!c) { c = cars[d.car] = { no: d.car, label: d.label, w0: d.w0, speed: d.speed || 1, f: [] }; carOrder.push(d.car); if (carOrder.length > 4) delete cars[carOrder.shift()]; }
        c.w0 = d.w0; c.label = d.label; Array.prototype.push.apply(c.f, d.f);
      }
      else if (ch === 'cell' && d.kind === 'car') { carSummary = d; }
      else if (ch === 'sensor') { if (d.robot != null) lastSensor[d.robot] = d; }
      else if (ch === 'event' && d.text) { events.push({ text: d.text, at: Date.now() }); if (events.length > 7) events.shift(); }
      else if (ch === 'line') { lineStats = d; }
      else if (ch === 'train') { trainStats = d; }
    });
  }
  function buildLayout() {
    robots.forEach(function (r) { scene.remove(r.g); scene.remove(r.ped); scene.remove(r.arc); scene.remove(r.tip); scene.remove(r.sparks.points); scene.remove(r.laser); scene.remove(r.fan); });
    robots = L.robots.map(function (def, i) { var r = makeRobot(i, def); r.def = def; return r; });
    setPose(null);
    while (seamGroup.children.length) seamGroup.remove(seamGroup.children[0]);
    seamLines = L.seams.map(function (s) {
      var pts = s.pts.map(function (p) { return new THREE.Vector3(p[0], p[2], -p[1]); });
      var geo = new THREE.BufferGeometry().setFromPoints(pts);
      var col = new Float32Array(pts.length * 3); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      var line = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true, linewidth: 2 }));
      var tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(8, pts.length * 2), 0.0045, 6, false), new THREE.MeshStandardMaterial({ color: 0xff8a2a, emissive: 0xff5a10, emissiveIntensity: 2.2, roughness: 0.4, metalness: 0.3 }));
      tube.geometry.setDrawRange(0, 0);
      seamGroup.add(line); seamGroup.add(tube);
      return { s: s, line: line, tube: tube, done: 0, at: {}, n: pts.length, segs: Math.max(8, pts.length * 2) };
    });
    resetSeams();
  }
  function rebuildRobots() { if (L) buildLayout(); }
  function resetSeams() { seamLines.forEach(function (sl) { sl.done = 0; sl.cool = 0; paintSeam(sl); }); }
  function paintSeam(sl) {
    var col = sl.line.geometry.attributes.color.array, n = sl.n, d = sl.done;
    for (var i = 0; i < n; i++) { var w = i / Math.max(1, n - 1) <= d; col[i * 3] = w ? 0.45 : 0.25; col[i * 3 + 1] = w ? 0.32 : 0.65; col[i * 3 + 2] = w ? 0.2 : 1.0; }
    sl.line.geometry.attributes.color.needsUpdate = true;
    var idx = sl.tube.geometry.index ? sl.tube.geometry.index.count : 0;
    sl.tube.geometry.setDrawRange(0, Math.floor(idx * d / 6) * 6);
  }

  // ---------------------------------------------------------------------------------------------- playback
  function frameAt(c, t) {
    var f = c.f; if (!f.length) return null;
    if (t <= f[0][0]) return f[0];
    if (t >= f[f.length - 1][0]) return f[f.length - 1];
    var lo = 0, hi = f.length - 1; while (hi - lo > 1) { var m = (lo + hi) >> 1; if (f[m][0] <= t) lo = m; else hi = m; }
    var a = f[lo], b = f[hi], w = (t - a[0]) / Math.max(1e-6, b[0] - a[0]), out = a.slice();
    for (var i = 1; i < 31; i++) out[i] = a[i] + (b[i] - a[i]) * w;
    for (i = 39; i < 43; i++) out[i] = a[i] + (b[i] - a[i]) * w;
    return out;
  }
  function pickCar() {
    if (skew == null) return null;
    var nowM = Date.now() / 1000 - skew - 0.35, best = null;
    carOrder.forEach(function (n) { var c = cars[n]; if (c && c.f.length && nowM >= c.w0 - 0.2) { if (!best || c.w0 > best.w0) best = c; } });
    if (!best) return null;
    return { c: best, t: Math.max(0, (nowM - best.w0) * best.speed) };
  }
  var tmpQ = new THREE.Quaternion();
  function setPose(fr) {
    if (!L) return;
    if (fr) {
      carRoot.position.set(fr[1], fr[3], -fr[2]); carRoot.rotation.set(fr[6], fr[4], -fr[5], 'YZX');
      sled.position.set(fr[1], 0, 0);
    } else { carRoot.position.set(L.entry_x, L.car_z, 0); sled.position.set(L.entry_x, 0, 0); }
    sled.position.y = L.sled_top - 0.40;
    robots.forEach(function (r, i) {
      var q = fr ? fr.slice(7 + i * 6, 13 + i * 6) : L.robots[i].home;
      JN.forEach(function (n, k) { var j = r.j[n]; if (!j) return; tmpQ.setFromAxisAngle(AX[n], q[k] * Math.PI / 180); j.quaternion.copy(j.userData.rest || new THREE.Quaternion()).multiply(tmpQ); });
    });
  }
  var V = new THREE.Vector3(), V2 = new THREE.Vector3(), MX = new THREE.Vector3(), MY = new THREE.Vector3(), MZ = new THREE.Vector3();
  function effects(fr, dt) {
    robots.forEach(function (r, i) {
      var st = fr ? fr[31 + i] : 0, laser = fr ? fr[47 + i] : 0, welding = st === 3;
      if (!r.tcp) return;
      r.g.updateMatrixWorld(true);
      r.tcp.getWorldPosition(V);
      r.tcp.matrixWorld.extractBasis(MX, MY, MZ); MX.normalize(); MY.normalize(); MZ.normalize();   // the torch's own frame: x along the nozzle, y ahead (camera side)
      r.tip.position.copy(V); r.tip.visible = welding;
      r.arc.position.copy(V).addScaledVector(MX, -0.03); r.arc.intensity = welding ? 6 + Math.random() * 10 : 0;
      stepSparks(r.sparks, welding && quality !== 'fast', V, dt, V2.copy(MX).multiplyScalar(-1));
      r.laser.visible = r.fan.visible = !!laser;
      if (laser) {
        var la = (L && L.lookahead) || 0.065, c = V.clone().addScaledVector(MY, la);
        var p0 = c.clone().addScaledVector(MZ, -0.055), p1 = c.clone().addScaledVector(MZ, 0.055);
        r.laser.geometry.setFromPoints([p0, p1]);
        var lens = V.clone().addScaledVector(MX, -0.12).addScaledVector(MY, 0.085);
        var a = r.fan.geometry.attributes.position.array; [lens, p0, p1].forEach(function (p, k) { a[k * 3] = p.x; a[k * 3 + 1] = p.y; a[k * 3 + 2] = p.z; }); r.fan.geometry.attributes.position.needsUpdate = true;
      }
    });
    // the seams of this car: welded up to where each robot got
    if (fr && L) {
      robots.forEach(function (r, i) {
        var k = fr[35 + i], p = fr[39 + i];
        if (k >= 0) { var sl = seamLines.filter(function (x) { return x.s.robot === i && x.s.index === k; })[0]; if (sl && p > sl.done) { sl.done = Math.min(1, p); paintSeam(sl); } }
      });
    }
  }

  // ---------------------------------------------------------------------------------------------- overlay
  var css = 'position:absolute;font:12px/1.35 Inter,system-ui,sans-serif;color:#e6ebf2;pointer-events:none;';
  var hud = document.createElement('div'); hud.style.cssText = css + 'left:10px;top:10px;background:rgba(13,17,23,0.72);border:1px solid #2c3440;border-radius:8px;padding:8px 10px;min-width:250px'; el.appendChild(hud);
  var evBox = document.createElement('div'); evBox.style.cssText = css + 'right:10px;top:10px;max-width:42%;text-align:right'; el.appendChild(evBox);
  var camBar = document.createElement('div'); camBar.style.cssText = 'position:absolute;left:10px;bottom:118px;display:flex;gap:6px;flex-wrap:wrap'; el.appendChild(camBar);
  var sensBox = document.createElement('div'); sensBox.style.cssText = 'position:absolute;left:10px;right:10px;bottom:8px;display:flex;gap:8px;pointer-events:none'; el.appendChild(sensBox);
  var sens = [0, 1, 2, 3].map(function (i) {
    var w = document.createElement('div'); w.style.cssText = 'flex:1;min-width:0;background:rgba(13,17,23,0.78);border:1px solid #2c3440;border-radius:8px;padding:4px 6px;font:11px Inter,system-ui,sans-serif;color:#c9d2de';
    var t = document.createElement('div'); t.style.cssText = 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis'; var c = document.createElement('canvas'); c.width = 300; c.height = 72; c.style.cssText = 'width:100%;height:72px;display:block';
    w.appendChild(t); w.appendChild(c); sensBox.appendChild(w); return { t: t, c: c };
  });
  var VIEWS = { 'Cell': [[7.5, 5.2, 8.5], [0, 1.1, 0]], 'Top': [[0.01, 13, 0.01], [0, 0, 0]], 'Along the rail': [[-9.5, 2.6, 0.01], [0, 1.2, 0]], 'Front right robot': [[3.8, 3.0, 4.6], [1.2, 1.3, 1.0]], 'Rear left robot': [[-4.2, 3.0, -4.8], [-1.3, 1.4, -1.0]] };
  var follow = -1, camGoal = null;
  Object.keys(VIEWS).concat(['Follow torch 1', 'Follow torch 3']).forEach(function (name) {
    var b = document.createElement('button'); b.textContent = name;
    b.style.cssText = 'font:11px Inter,system-ui,sans-serif;background:rgba(22,27,34,0.85);color:#d8dee9;border:1px solid #3a4452;border-radius:6px;padding:4px 8px;cursor:pointer';
    b.onclick = function () { if (/^Follow/.test(name)) { follow = name === 'Follow torch 1' ? 0 : 2; } else { follow = -1; camGoal = VIEWS[name]; } };
    camBar.appendChild(b);
  });
  var STATE = ['Waiting', 'Moving', 'Reading the seam', 'Welding'];
  function drawHud(fr, pc) {
    var h = '';
    if (!L) h = '<b>Welding cell</b><br><span style="color:#9aa3b2">Waiting for the Welding cell block: press Run.</span>';
    else {
      h += '<div style="font-weight:700;font-size:13px">' + (pc ? (pc.c.label || ('Car ' + pc.c.no)) : 'Welding cell') + (fr ? ' · ' + fr[0].toFixed(1) + ' s' : '') + '</div>';
      robots.forEach(function (r, i) {
        var st = fr ? fr[31 + i] : 0, k = fr ? fr[35 + i] : -1, p = fr ? fr[39 + i] : 0, e = fr ? fr[43 + i] : 0;
        var sm = k >= 0 ? L.seams.filter(function (s) { return s.robot === i && s.index === k; })[0] : null;
        var col = st === 3 ? (e <= 1 ? '#5be37d' : '#ff6b5b') : '#9aa3b2';
        h += '<div style="margin-top:4px"><span style="display:inline-block;width:86px;color:#9fb3c8">' + L.robots[i].name.replace('_', ' ') + '</span>' +
          '<span style="color:' + col + '">' + STATE[st] + '</span>' + (sm ? ' · ' + sm.name : '') +
          (st === 3 ? ' · <b>' + e.toFixed(2) + ' mm</b>' : '') + '</div>' +
          (sm ? '<div style="height:3px;background:#2c3440;border-radius:2px;margin:2px 0 0 86px"><div style="height:3px;width:' + Math.round(p * 100) + '%;background:#ff8a2a;border-radius:2px"></div></div>' : '');
      });
      if (lineStats) h += '<div style="margin-top:6px;color:#c9d2de">Cars ' + lineStats.cars + ' · seams within tolerance ' + lineStats.seams_ok_pct + ' % · ' + lineStats.cars_per_hour + ' cars/h</div>';
      if (trainStats) h += '<div style="margin-top:6px;color:#c9d2de">Learning: ' + trainStats.minutes + ' min · 95 % of readings within ' + (trainStats.p95_confident_mm != null ? trainStats.p95_confident_mm : trainStats.p95_mm) + ' mm</div>';
      if (carSummary) h += '<div style="color:#9aa3b2">Last car: ' + carSummary.seams_ok + '/' + carSummary.seams + ' seams OK, worst ' + carSummary.worst_mm + ' mm, cycle ' + carSummary.cycle_s + ' s</div>';
    }
    hud.innerHTML = h;
    var now = Date.now();
    evBox.innerHTML = events.map(function (e) { var a = Math.max(0.25, 1 - (now - e.at) / 40000); return '<div style="background:rgba(13,17,23,0.7);border-radius:6px;padding:3px 8px;margin-bottom:4px;opacity:' + a.toFixed(2) + '">' + e.text.replace(/</g, '&lt;') + '</div>'; }).join('');
  }
  function drawSensors() {
    sens.forEach(function (S, i) {
      var d = lastSensor[i], g = S.c.getContext('2d'), W = S.c.width, H = S.c.height;
      g.fillStyle = '#0b0f14'; g.fillRect(0, 0, W, H);
      var name = L && L.robots[i] ? L.robots[i].name.replace('_', ' ') : 'robot ' + (i + 1);
      if (!d) { S.t.textContent = name + ' · seam camera'; return; }
      var sm = L ? L.seams.filter(function (s) { return s.robot === i && s.index === d.seam; })[0] : null;
      S.t.innerHTML = '<b>' + name + '</b> · ' + (sm ? sm.name + ' (' + sm.type + ')' : '') + ' · read ' + d.pred[0].toFixed(2) + ' / ' + d.pred[1].toFixed(2) + ' mm, really ' + d.true[0].toFixed(2) + ' / ' + d.true[1].toFixed(2);
      var n = d.depth.length, lo = 1e9, hi = -1e9, k;
      for (k = 0; k < n; k++) if (d.valid[k]) { lo = Math.min(lo, d.depth[k]); hi = Math.max(hi, d.depth[k]); }
      if (lo > hi) return; var pad = Math.max(1.5, (hi - lo) * 0.15); lo -= pad; hi += pad;
      var X = function (u) { return (u + 60) / 120 * W; }, Y = function (z) { return (z - lo) / (hi - lo) * (H - 6) + 3; };
      g.strokeStyle = '#1f2a36'; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke();
      g.fillStyle = '#ff4040';
      for (k = 0; k < n; k++) { if (!d.valid[k]) continue; var u = -60 + 120 * k / (n - 1); g.fillRect(X(u) - 1, Y(d.depth[k]) - 1, 2.2, 2.2); }
      g.strokeStyle = '#5be37d'; g.lineWidth = 1.5; g.beginPath(); g.arc(X(d.pred[0]), Y(d.pred[1]), 5, 0, 6.3); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X(d.true[0]) - 4, Y(d.true[1])); g.lineTo(X(d.true[0]) + 4, Y(d.true[1])); g.moveTo(X(d.true[0]), Y(d.true[1]) - 4); g.lineTo(X(d.true[0]), Y(d.true[1]) + 4); g.stroke();
    });
  }

  // ---------------------------------------------------------------------------------------------- loop
  var clock = new THREE.Clock(), alive = true, lastHud = 0;
  window.__weldStop = function () { alive = false; try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) { } };
  function resize() {
    var w = Math.max(10, el.clientWidth), h = Math.max(10, el.clientHeight);
    renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
    if (composer) composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  function tick() {
    if (!alive) return;
    requestAnimationFrame(tick);
    var dt = Math.min(0.05, clock.getDelta());
    var pc = pickCar(), fr = null;
    if (pc) {
      if (curCar !== pc.c.no) { curCar = pc.c.no; resetSeams(); }
      fr = frameAt(pc.c, pc.t);
    }
    setPose(fr); effects(fr, dt);
    beacon.material.emissive.setHex(fr && fr.slice(31, 35).some(function (s) { return s === 3; }) ? 0xff8a1a : 0x22ff66);
    if (camGoal) { camera.position.lerp(V.set(camGoal[0][0], camGoal[0][1], camGoal[0][2]), 0.08); controls.target.lerp(V2.set(camGoal[1][0], camGoal[1][1], camGoal[1][2]), 0.08); if (camera.position.distanceTo(V) < 0.02) camGoal = null; }
    if (follow >= 0 && robots[follow] && robots[follow].tcp) {
      robots[follow].tcp.getWorldPosition(V); var base = robots[follow].g.position;
      var off = V2.copy(V).sub(base).setY(0).normalize().multiplyScalar(-0.9);
      controls.target.lerp(V, 0.12); camera.position.lerp(V.clone().add(off).add(new THREE.Vector3(0, 0.55, 0)), 0.06);
    }
    controls.update();
    if (composer) composer.render(); else renderer.render(scene, camera);
    var now = performance.now(); if (now - lastHud > 120) { lastHud = now; drawHud(fr, pc); drawSensors(); }
  }
  ctx.on('resize', resize);
  try { new ResizeObserver(function () { resize(); }).observe(el); } catch (e) { }
  ctx.on('update', function () { loadModels(); feed(); });
  window.addEventListener('pagehide', function () { if (window.__weldStop) window.__weldStop(); });
  resize(); loadModels(); feed(); tick();
}
