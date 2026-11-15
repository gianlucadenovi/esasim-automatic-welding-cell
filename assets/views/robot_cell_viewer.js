// ── EsaSim block ──────────────────────────────────────────────────────
// 3D view (viewer-3d) · version 1.47 · view, JavaScript: function render(ctx)
// A realistic 3D scene: live positions, a robot posed by its joints, a fleet of robots on a grid world or a rocket launch and landing while a run goes on, then replays; numbers, events and controls on top.
// Publisher: EsaSim (esacode, LLC)
//
// Inputs   ctx.input("id") gives { files, stream }; ctx.rows("id"), ctx.json("id"), ctx.text("id")
//   scene       Anything (json, gz, glb, gltf, obj, stl, ply) Scene or 3D files · several · A scene (esasim.scene/1 JSON), 3D models and point clouds, a robot model (.robot.json.gz) and/or live telemetry; a soft-body model (esasim.softbody/1, from Soft body model) with the anatomy of the same case; or a rocket flight (esasim.rocket/1)
// Settings ctx.params.key
//   environment select    Environment = "outdoor" of outdoor | studio | night
//   quality     select    Quality = "high" of high | balanced | fast
//   floor       bool      Show the floor = true
//   models      select    Models = "side by side" of side by side | one at a time
//   textures    bool      Tissue textures = true
//   metaballs   bool      Show the metaballs = false
//   grid        bool      Show the grid = true
//   trails      bool      Show trajectories = true
//   speed       number    Playback speed = 1
//   model_for   text      Model for = ""
//   live_channel text      Live channel = ""
//   joints_channel text      Robot: joints channel = "joints"
//   ghost_channel text      Robot: twin channel = "twin"
//   scene_channel text      Robot: objects channel = "scene"
//   delay       number    Robot: behind real time (seconds) = 1.2
//   mouse_speed number    3D mouse speed = 1
//   mouse_mode  select    3D mouse moves = "The camera" of The camera | Move the scene | The model
//   numbers     text      Numbers = ""
//   events_channel text      Events channel = "event"
//   controls    textarea  Controls = ""
//   control_channel text      Controls: channel = "control"
//   routes      bool      Fleets: show the routes = true
//   heat        bool      Fleets: show the heat map = false
//   camera      select    Camera = "free" of free | onboard: interstage | onboard: engines | onboard: grid fin | second stage…
// EsaSim rewrites these lines from the block's definition each time it is saved: change the definition, not them.
// ── end of EsaSim block header ────────────────────────────────────────
function render(ctx) {
var THREE = ctx.THREE, A = THREE.addons, P = ctx.params;
var quality = P.quality || 'high', dark = ctx.theme === 'dark';
var el = ctx.el;
if (window.__v3dStop) { try { window.__v3dStop(); } catch (e) { } window.__v3dStop = null; }
el.innerHTML = '';
el.style.background = '#0b0e14';
var rocketish = /booster|rocket/i.test((ctx.sources || []).map(function (s) { return s.block + ' ' + s.name; }).join(' ')) || (/onboard|stage|ship|tracking/i.test(String(P.camera || '')) && !/^car:/.test(String(P.camera || '')));
var renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: quality !== 'fast', powerPreference: 'high-performance', preserveDrawingBuffer: false, logarithmicDepthBuffer: rocketish }); }
catch (e) {
var tries = (window.__v3dTries = (window.__v3dTries || 0) + 1);
var msg = tries < 4 ? 'Starting the 3D view…'
: '3D graphics are switched off in this browser: its graphics process stopped. Close every window of the browser and open it again (chrome://gpu shows the reason).';
el.innerHTML = '<div style="display:flex;height:100%;align-items:center;justify-content:center;text-align:center;padding:0 24px;color:#9aa3b2;font:13px/1.5 Inter,system-ui,sans-serif">' + msg + '</div>';
if (tries < 4) setTimeout(function () { render(ctx); }, 900 * tries);
else ctx.status(msg);
return;
}
window.__v3dTries = 0;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : quality === 'balanced' ? 1.5 : 1));
var texCap = quality === 'high' ? 0 : 512;
if (texCap && renderer.capabilities.maxTextureSize > texCap) {
renderer.capabilities.maxTextureSize = texCap;
if (!console.__v3dQuiet) { var cw = console.warn; console.warn = function (m) { if (typeof m === 'string' && m.indexOf('Texture has been resized') >= 0) return; return cw.apply(console, arguments); }; console.__v3dQuiet = true; }
}
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = P.environment === 'night' ? 0.8 : 1.0;
renderer.shadowMap.enabled = quality !== 'fast';
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
el.appendChild(renderer.domElement);
renderer.domElement.style.display = 'block';
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, 1, 0.05, 4000);
camera.position.set(14, 8, 16);
var controls = new A.OrbitControls(camera, renderer.domElement);
el.__view3d = { camera: camera, controls: controls, scene: scene, THREE: THREE };
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxPolarAngle = Math.PI * 0.495; controls.target.set(0, 2, 0);
var css2d = new A.CSS2DRenderer();
css2d.domElement.style.cssText = 'position:absolute;inset:0;pointer-events:none';
el.appendChild(css2d.domElement);
var composer = null, gtao = null;
var pmrem = new THREE.PMREMGenerator(renderer);
var envRoom = pmrem.fromScene(new A.RoomEnvironment(), 0.04).texture;
var sun = new THREE.DirectionalLight(0xffffff, 3.0);
sun.castShadow = renderer.shadowMap.enabled;
sun.shadow.mapSize.set(quality === 'high' ? 4096 : 2048, quality === 'high' ? 4096 : 2048);
sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
scene.add(sun, sun.target);
var hemi = new THREE.HemisphereLight(0xdcecff, 0x7a6a55, 0.6);
scene.add(hemi);
var sky = null;
function setEnvironment(kind) {
if (sky) { scene.remove(sky); sky = null; }
if (kind === 'studio') {
renderer.toneMappingExposure = 1.0;
scene.background = new THREE.Color(dark ? 0x161a22 : 0xdfe3ea);
scene.environment = envRoom; scene.fog = new THREE.Fog(scene.background, 60, 240);
sun.intensity = 2.2; sun.color.set(0xffffff); hemi.intensity = 0.4;
} else if (kind === 'night') {
scene.background = new THREE.Color(0x05070d);
scene.environment = envRoom; scene.environmentIntensity = 0.15; scene.fog = new THREE.FogExp2(0x05070d, 0.012);
sun.intensity = 0.6; sun.color.set(0x9db4ff); hemi.intensity = 0.08;
} else {
sky = new A.Sky(); sky.scale.setScalar(9000); sky.frustumCulled = false;
var u = sky.material.uniforms;
u.turbidity.value = 4; u.rayleigh.value = 1.4; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.82;
var sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 38), THREE.MathUtils.degToRad(135));
u.sunPosition.value.copy(sunDir);
scene.add(sky);
var envScene = new THREE.Scene(); var sky2 = new A.Sky(); sky2.scale.setScalar(3000);
Object.keys(u).forEach(function (k) { if (sky2.material.uniforms[k] && u[k].value && u[k].value.clone) sky2.material.uniforms[k].value.copy(u[k].value); else if (sky2.material.uniforms[k]) sky2.material.uniforms[k].value = u[k].value; });
envScene.add(sky2);
scene.environment = pmrem.fromScene(envScene).texture; scene.environmentIntensity = 0.9;
scene.background = null; scene.fog = new THREE.Fog(0xb9cde3, 150, 1100);
renderer.toneMappingExposure = 0.62;
sun.intensity = 2.6; sun.color.set(0xfff1dc); hemi.intensity = 0.3;
sun.userData.dir = sunDir;
}
}
setEnvironment(P.environment || 'outdoor');
function concrete(size, light, seed) {
var c = document.createElement('canvas'); c.width = c.height = size;
var g = c.getContext('2d'), s = seed || 7;
function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
var base = light ? 196 : 158;
g.fillStyle = 'rgb(' + base + ',' + (base - 2) + ',' + (base - 6) + ')'; g.fillRect(0, 0, size, size);
for (var sx = 0; sx < 2; sx++) for (var sy = 0; sy < 2; sy++) { var d = (rnd() - 0.5) * 14; g.fillStyle = 'rgba(' + (d > 0 ? '255,255,255' : '0,0,0') + ',' + Math.abs(d) / 255 * 2.2 + ')'; g.fillRect(sx * size / 2, sy * size / 2, size / 2, size / 2); }
for (var k = 0; k < 14; k++) {
var x = rnd() * size, y = rnd() * size, r = size * (0.04 + rnd() * 0.12), gr = g.createRadialGradient(x, y, 0, x, y, r);
gr.addColorStop(0, 'rgba(40,36,30,' + (0.05 + rnd() * 0.06) + ')'); gr.addColorStop(1, 'rgba(40,36,30,0)');
g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
}
var img = g.getImageData(0, 0, size, size);
for (var i = 0; i < img.data.length; i += 4) { var n = (rnd() - 0.5) * 18; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
g.putImageData(img, 0, 0);
g.strokeStyle = 'rgba(30,30,30,0.55)'; g.lineWidth = Math.max(1, size / 512);
[0, size / 2, size].forEach(function (p) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, size); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(size, p); g.stroke(); });
var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
return t;
}
function roughnessNoise(size, seed) {
var c = document.createElement('canvas'); c.width = c.height = size;
var g = c.getContext('2d'), img = g.createImageData(size, size), s = seed || 3;
function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
for (var i = 0; i < size * size; i++) { var v = 215 + (rnd() - 0.5) * 50; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
g.putImageData(img, 0, 0);
var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
var groundTex = concrete(quality === 'fast' ? 512 : 1024, P.environment === 'studio', 11); groundTex.colorSpace = THREE.SRGBColorSpace; groundTex.repeat.set(150, 150);
var roughTex = roughnessNoise(256, 5); roughTex.repeat.set(400, 400);
var ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ map: groundTex, roughnessMap: roughTex, roughness: 0.95, metalness: 0.0, color: 0xf6efe4 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.visible = P.floor !== false;
scene.add(ground);
var grid = new THREE.GridHelper(200, 200, 0x6b7380, 0x6b7380);
grid.material.transparent = true; grid.material.opacity = 0.16; grid.position.y = 0.004; grid.visible = P.grid !== false && P.floor !== false;
var grid10 = new THREE.GridHelper(200, 20, 0x8a93a3, 0x8a93a3);
grid10.material.transparent = true; grid10.material.opacity = 0.3; grid10.position.y = 0.005; grid10.visible = P.grid !== false && P.floor !== false;
scene.add(grid, grid10);
function std(color, rough, metal, extra) { return new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: rough, metalness: metal }, extra || {})); }
function shadow(o) { o.traverse(function (m) { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }
function makePad(e) {
var g = new THREE.Group(), r = e.radius || 1, h = e.height || 0.08;
var deck = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.02, h, 64), std(e.color || 0xe8ecf2, 0.55, 0.15));
deck.position.y = h / 2; g.add(deck);
var c = document.createElement('canvas'); c.width = c.height = 512; var x = c.getContext('2d');
x.fillStyle = '#2b2f36'; x.beginPath(); x.arc(256, 256, 250, 0, 7); x.fill();
x.strokeStyle = '#f5c400'; x.lineWidth = 22; x.beginPath(); x.arc(256, 256, 200, 0, 7); x.stroke();
x.fillStyle = '#ffffff'; x.font = 'bold 300px Inter, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e.decal || 'H', 256, 270);
var tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
var top = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96, 64), std(0xffffff, 0.6, 0.0, { map: tex }));
top.rotation.x = -Math.PI / 2; top.position.y = h + 0.002; g.add(top);
for (var i = 0; i < 12; i++) {
var a = i / 12 * Math.PI * 2;
var l = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), std(0x111111, 0.3, 0, { emissive: i % 2 ? 0x2bff88 : 0x46a6ff, emissiveIntensity: P.environment === 'night' ? 6 : 1.6 }));
l.position.set(Math.cos(a) * r * 0.99, h + 0.02, Math.sin(a) * r * 0.99); g.add(l);
}
var cart = new THREE.Mesh(new THREE.BoxGeometry(r * 1.6, 0.25, r * 1.2), std(0x3a4150, 0.7, 0.3));
cart.position.y = -0.13; g.add(cart);
g.position.y = 0.26;
var holder = new THREE.Group(); holder.add(g);
[-1, 1].forEach(function (sx) { [-1, 1].forEach(function (sz) {
var wh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 24), std(0x15171c, 0.9, 0)); wh.rotation.x = Math.PI / 2; wh.position.set(sx * r * 0.6, 0.16, sz * r * 0.62); holder.add(wh); holder.userData.wheels = (holder.userData.wheels || []).concat(wh);
}); });
return shadow(holder);
}
function makeQuad(e) {
var s = e.size || 0.5, g = new THREE.Group(), body = new THREE.Group();
var shell = std(e.color || 0x20242c, 0.35, 0.4), carbon = std(0x15171b, 0.5, 0.3), metal = std(0xb9bec7, 0.25, 0.9);
var core = new THREE.Mesh(new THREE.BoxGeometry(s * 0.42, s * 0.12, s * 0.28), shell); core.position.y = s * 0.1; body.add(core);
var canopy = new THREE.Mesh(new THREE.SphereGeometry(s * 0.14, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), std(0x0f1a2b, 0.08, 0.2, { envMapIntensity: 1.5 }));
canopy.scale.set(1.3, 0.6, 1); canopy.position.set(s * 0.06, s * 0.16, 0); body.add(canopy);
var gimbal = new THREE.Mesh(new THREE.SphereGeometry(s * 0.05, 16, 12), metal); gimbal.position.set(s * 0.2, s * 0.02, 0); body.add(gimbal);
var props = [];
[[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (q, i) {
var ax = q[0] * s * 0.48, az = q[1] * s * 0.48;
var len = Math.hypot(ax, az);
var arm = new THREE.Mesh(new THREE.BoxGeometry(len, s * 0.035, s * 0.05), carbon);
arm.position.set(ax / 2, s * 0.12, az / 2); arm.rotation.y = -Math.atan2(az, ax); body.add(arm);
var motor = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.05, s * 0.055, s * 0.07, 20), metal); motor.position.set(ax, s * 0.15, az); body.add(motor);
var prop = new THREE.Group(); prop.position.set(ax, s * 0.195, az);
var blade = new THREE.Mesh(new THREE.BoxGeometry(s * 0.46, s * 0.006, s * 0.045), std(0x0c0d10, 0.4, 0.1, { transparent: true, opacity: 0.85 }));
prop.add(blade);
var disc = new THREE.Mesh(new THREE.CircleGeometry(s * 0.23, 32), new THREE.MeshBasicMaterial({ color: 0x9aa3b2, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }));
disc.rotation.x = -Math.PI / 2; prop.add(disc);
prop.userData.dir = i % 3 === 0 ? 1 : -1; props.push(prop); body.add(prop);
var led = new THREE.Mesh(new THREE.SphereGeometry(s * 0.018, 10, 8), std(0x000000, 0.4, 0, { emissive: q[0] > 0 ? 0x22ff66 : 0xff2a2a, emissiveIntensity: 4 }));
led.position.set(ax, s * 0.1, az); body.add(led);
});
[-1, 1].forEach(function (sz) {
var skid = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.012, s * 0.012, s * 0.5, 10), carbon); skid.rotation.z = Math.PI / 2; skid.position.set(0, -s * 0.02, sz * s * 0.13); body.add(skid);
[-1, 1].forEach(function (sx) { var leg = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.01, s * 0.01, s * 0.12, 8), carbon); leg.position.set(sx * s * 0.12, s * 0.035, sz * s * 0.12); body.add(leg); });
});
g.add(body); g.userData.body = body; g.userData.props = props;
shadow(g);
var tag = document.createElement('div');
tag.textContent = e.label || e.id || 'drone';
tag.style.cssText = 'font:600 11px Inter,sans-serif;color:#fff;background:rgba(47,74,224,.85);padding:1px 6px;border-radius:9px;transform:translateY(-18px);white-space:nowrap';
var lbl = new A.CSS2DObject(tag); lbl.position.set(0, s * 0.45, 0); g.add(lbl);
return g;
}
function makeShape(e) {
var color = e.color || 0x9aa3b2, mat = std(color, e.roughness != null ? e.roughness : 0.6, e.metalness != null ? e.metalness : 0.1), m;
if (e.shape === 'quadrotor' || e.shape === 'drone') return makeQuad(e);
if (e.shape === 'pad' || (e.shape === 'cylinder' && e.decal !== undefined)) return makePad(Object.assign({ radius: 1, height: 0.08, decal: 'H' }, e));
if (e.shape === 'arrow') {
var ag = new THREE.Group(), shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 16), mat), head = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 20), mat);
shaft.rotation.z = -Math.PI / 2; shaft.position.x = 0.4; head.rotation.z = -Math.PI / 2; head.position.x = 0.95; ag.add(shaft); ag.add(head); return shadow(ag);
}
if (e.shape === 'sphere') m = new THREE.Mesh(new THREE.SphereGeometry(e.radius || 0.5, 32, 20), mat);
else if (e.shape === 'cylinder') m = new THREE.Mesh(new THREE.CylinderGeometry(e.radius || 0.5, e.radius || 0.5, e.height || 1, 40), mat);
else { var sz = e.size || [1, 1, 1]; if (!Array.isArray(sz)) sz = [sz, sz, sz]; m = new THREE.Mesh(new THREE.BoxGeometry(sz[0], sz[2] != null ? sz[2] : sz[1], sz[1]), mat); }
var g = new THREE.Group(); g.add(m); return shadow(g);
}
var upZ = true;
function v3(x, y, z) { return upZ ? new THREE.Vector3(x, z, -y) : new THREE.Vector3(x, y, z); }
function q4(x, y, z, w) { return (upZ ? new THREE.Quaternion(x, z, -y, w) : new THREE.Quaternion(x, y, z, w)).normalize(); }
var entities = {}, runs = [], current = 0, playing = true, t = 0, duration = 0, speed = +P.speed || 1, follow = false;
var trailGroup = new THREE.Group(); scene.add(trailGroup);
var windN = quality === 'fast' ? 80 : 220, windPos = new Float32Array(windN * 6), windGeo = new THREE.BufferGeometry();
windGeo.setAttribute('position', new THREE.BufferAttribute(windPos, 3));
var windLines = new THREE.LineSegments(windGeo, new THREE.LineBasicMaterial({ color: 0xf2f7ff, transparent: true, opacity: 0.16, depthWrite: false }));
scene.add(windLines);
var windSeeds = [];
for (var wi = 0; wi < windN; wi++) windSeeds.push([Math.random() * 36 - 18, Math.random() * 12 + 0.6, Math.random() * 24 - 12]);
var windSpeed = 0, windCenter = new THREE.Vector3();
function stepWind(dt) {
var len = Math.min(2.2, 0.1 + windSpeed * 0.14);
for (var i = 0; i < windN; i++) {
var s = windSeeds[i];
s[0] += windSpeed * dt; if (s[0] > 18) s[0] -= 36;
var x = windCenter.x + s[0], y = s[1], z = windCenter.z + s[2];
windPos[i * 6] = x; windPos[i * 6 + 1] = y; windPos[i * 6 + 2] = z;
windPos[i * 6 + 3] = x - len; windPos[i * 6 + 4] = y; windPos[i * 6 + 5] = z;
}
windGeo.attributes.position.needsUpdate = true;
windLines.visible = windSpeed > 0.2;
}
var ui = document.createElement('div');
ui.style.cssText = 'position:absolute;inset:0;pointer-events:none;font:12px/1.4 Inter,-apple-system,Segoe UI,sans-serif;color:#e8ecf2';
ui.innerHTML = '<style>.hud:has(.ttl:empty),.wind:has(.ws:empty){display:none!important}</style><div class="hud" style="position:absolute;left:12px;top:12px;background:rgba(10,14,22,.62);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:8px 10px;min-width:200px">'
+ '<div class="ttl" style="font-weight:650;font-size:12.5px;margin-bottom:3px"></div><div class="rows" style="display:grid;grid-template-columns:auto auto;gap:1px 12px;font-variant-numeric:tabular-nums"></div></div>'
+ '<div class="wind" style="position:absolute;right:12px;top:52px;background:rgba(10,14,22,.62);border-radius:10px;padding:6px 10px;display:flex;align-items:center;gap:8px"><svg width="30" height="16" viewBox="0 0 30 16"><path d="M2 8h22M18 3l6 5-6 5" stroke="#9fd0ff" stroke-width="2" fill="none" stroke-linecap="round"/></svg><span class="ws"></span></div>'
+ '<div class="bar" style="position:absolute;left:12px;right:12px;bottom:12px;display:flex;gap:8px;align-items:center;background:rgba(10,14,22,.7);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:7px 10px;pointer-events:auto">'
+ '<button class="play" title="Play / pause (Space)" style="all:unset;cursor:pointer;width:26px;text-align:center;font-size:15px">⏸</button>'
+ '<input class="tl" type="range" min="0" max="1000" value="0" style="flex:1;accent-color:#7b8cff">'
+ '<span class="tm" style="font:12px ui-monospace,monospace;min-width:92px;text-align:right"></span>'
+ '<select class="sp" title="Speed" style="background:#1b2029;color:#e8ecf2;border:1px solid #2a303b;border-radius:6px;font-size:12px"><option>0.25</option><option>0.5</option><option selected>1</option><option>2</option><option>4</option></select>'
+ '<select class="run" title="Run" style="background:#1b2029;color:#e8ecf2;border:1px solid #2a303b;border-radius:6px;font-size:12px;max-width:240px"></select>'
+ '<button class="cam" title="Chase camera: ride behind the drone" style="all:unset;cursor:pointer;padding:2px 8px;border:1px solid #2a303b;border-radius:6px">Follow</button>'
+ '<button class="fit" title="Fit the view" style="all:unset;cursor:pointer;padding:2px 8px;border:1px solid #2a303b;border-radius:6px">Fit</button></div>';
el.appendChild(ui);
var $ = function (s) { return ui.querySelector(s); };
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
var hudTitle = $('.ttl'), hudRows = $('.rows'), tl = $('.tl'), tm = $('.tm'), playBtn = $('.play'), runSel = $('.run'), spSel = $('.sp'), barEl = $('.bar');
spSel.value = String(speed); if (spSel.value !== String(speed)) { var o = document.createElement('option'); o.textContent = speed; spSel.appendChild(o); spSel.value = String(speed); }
playBtn.onclick = function () { playing = !playing; playBtn.textContent = playing ? '⏸' : '▶'; };
tl.oninput = function () { t = duration * tl.value / 1000; playing = false; playBtn.textContent = '▶'; };
spSel.onchange = function () { speed = +spSel.value; };
runSel.onchange = function () { current = +runSel.value; t = 0; flown = false; playing = true; playBtn.textContent = '⏸'; buildTrails(); fitView(); if (follow !== 'chase') setCam('frame'); };
function setCam(mode) { follow = mode; if (mode) { flying = false; controls.enableDamping = true; } $('.cam').style.background = mode === 'chase' ? '#2f4ae0' : ''; }
$('.cam').onclick = function () { flown = false; setCam(follow === 'chase' ? 'frame' : 'chase'); };
$('.fit').onclick = function () { flying = false; flown = false; controls.enableDamping = true; setCam(false); fitView(); };
controls.addEventListener('start', function () { flying = false; controls.enableDamping = true; if (follow === 'frame') setCam(false); });
window.addEventListener('keydown', function (e) { if (e.key === ' ') { e.preventDefault(); playBtn.onclick(); } });
function clearEntities() { Object.keys(entities).forEach(function (k) { scene.remove(entities[k]); }); entities = {}; if (typeof partsClear === 'function') partsClear(); if (typeof softStop === 'function') softStop(); }
function fieldIndex(run) { var idx = {}; (run.fields || []).forEach(function (f, i) { idx[f] = i; }); return idx; }
function loadScene(sc) {
upZ = (sc.up || 'z') === 'z';
clearEntities();
(sc.entities || []).forEach(function (e) {
var o = makeShape(e); o.userData.def = e;
if (+e.scale > 0 && +e.scale !== 1) o.scale.multiplyScalar(+e.scale);
if (Array.isArray(e.position) && e.position.length >= 3) o.position.copy(v3(+e.position[0] || 0, +e.position[1] || 0, +e.position[2] || 0));
if (Array.isArray(e.q) && e.q.length === 4) o.quaternion.copy(q4(e.q[0], e.q[1], e.q[2], e.q[3]));
entities[e.id] = o; scene.add(o);
});
runs = (sc.runs || []).filter(function (r) { return Array.isArray(r.frames) && r.frames.length; });
runSel.innerHTML = runs.map(function (r, i) { return '<option value="' + i + '">' + (r.success === true ? '✓ ' : r.success === false ? '✗ ' : '') + esc(r.label || 'Run ' + (i + 1)) + '</option>'; }).join('');
runSel.style.display = runs.length > 1 ? '' : 'none';
current = Math.min(current, Math.max(0, runs.length - 1)); t = 0;
if (sc.environment && sc.environment.preset && !P.environment) setEnvironment(sc.environment.preset);
hudTitle.textContent = sc.title || 'Scene';
barEl.style.display = runs.length ? 'flex' : 'none';
buildTrails(); if (!flown) { fitView(); if (runs.length && follow === false) setCam('frame'); } ctx.status(runs.length || Object.keys(entities).length ? '' : 'The scene is empty.');
}
function buildTrails() {
while (trailGroup.children.length) { var c = trailGroup.children.pop(); c.geometry.dispose(); c.material.dispose(); }
if (P.trails === false) return;
runs.forEach(function (r, ri) {
var idx = fieldIndex(r), active = ri === current;
Object.keys(entities).forEach(function (id) {
if (idx[id + '.x'] == null) return;
var pts = r.frames.map(function (f) { return v3(f[idx[id + '.x']], f[idx[id + '.y']] || 0, f[idx[id + '.z']] || 0); });
var geo = new THREE.BufferGeometry().setFromPoints(pts);
var isPad = (entities[id].userData.def || {}).decal !== undefined;
var col = isPad ? 0xf5c400 : r.success === false ? 0xff5a5a : r.success === true ? 0x3ddc84 : 0x7b8cff;
var line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: active ? (isPad ? 0.6 : 0.95) : 0.18, depthWrite: false }));
line.position.y = isPad ? 0.02 : 0;
trailGroup.add(line);
});
});
}
function frameAt(run, time) {
var F = run.frames, lo = 0, hi = F.length - 1;
if (time <= F[0][0]) return F[0];
if (time >= F[hi][0]) return F[hi];
while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (F[mid][0] <= time) lo = mid; else hi = mid; }
var a = F[lo], b = F[hi], k = (time - a[0]) / Math.max(1e-9, b[0] - a[0]);
return a.map(function (v, i) { return v + (b[i] - v) * k; });
}
var prevVel = {}, prevPos = {};
function applyRun(dt) {
var run = runs[current]; if (!run) return;
var idx = fieldIndex(run), f = frameAt(run, t), g = 9.81;
duration = run.frames[run.frames.length - 1][0] - run.frames[0][0];
Object.keys(entities).forEach(function (id) {
if (idx[id + '.x'] == null) return;
var o = entities[id], p = v3(f[idx[id + '.x']], f[idx[id + '.y']] || 0, f[idx[id + '.z']] || 0);
var hasQ = idx[id + '.qw'] != null;
if (hasQ) o.quaternion.copy(q4(f[idx[id + '.qx']] || 0, f[idx[id + '.qy']] || 0, f[idx[id + '.qz']] || 0, f[idx[id + '.qw']]));
if (dt > 0 && prevPos[id] && !hasQ) {
var v = p.clone().sub(prevPos[id]).divideScalar(dt);
var acc = prevVel[id] ? v.clone().sub(prevVel[id]).divideScalar(dt) : new THREE.Vector3();
if (o.userData.body) {
var tx = Math.atan2(acc.x, g), tz = Math.atan2(acc.z, g);
o.userData.body.rotation.z += (-Math.max(-0.5, Math.min(0.5, tx)) - o.userData.body.rotation.z) * 0.15;
o.userData.body.rotation.x += (Math.max(-0.5, Math.min(0.5, tz)) - o.userData.body.rotation.x) * 0.15;
}
if (o.userData.wheels) o.userData.wheels.forEach(function (w) { w.rotation.y -= v.x * dt / 0.16; });
prevVel[id] = v;
}
prevPos[id] = p.clone();
o.position.copy(p);
});
var wind = idx.wind != null ? f[idx.wind] : (run.info && run.info.wind_mps) || 0;
windSpeed = Math.abs(wind);
$('.ws').textContent = 'wind ' + wind.toFixed(1) + ' m/s';
$('.wind').style.display = idx.wind != null || (run.info && run.info.wind_mps != null) ? '' : 'none';
var rows = [['time', (f[0] - run.frames[0][0]).toFixed(2) + ' s']];
var d = entities.drone, pad = entities.pad;
if (d) rows.push(['altitude', Math.max(0, upZ ? f[idx['drone.z']] : f[idx['drone.y']]).toFixed(2) + ' m']);
if (d && pad) rows.push(['to the pad', Math.hypot(d.position.x - pad.position.x, d.position.z - pad.position.z).toFixed(2) + ' m']);
var atEnd = t >= duration - 1e-6;
if (atEnd && run.success != null) rows.push(['outcome', run.success ? '<b style="color:#3ddc84">landed</b>' : '<b style="color:#ff6b6b">missed</b>']);
Object.keys(run.info || {}).slice(0, 4).forEach(function (k) { if (k !== 'scenario') rows.push([esc(k.replace(/_/g, ' ')), esc(run.info[k])]); });
hudRows.innerHTML = rows.map(function (r) { return '<span style="opacity:.65">' + r[0] + '</span><span>' + r[1] + '</span>'; }).join('');
hudTitle.textContent = run.label || 'Run';
tm.textContent = (f[0] - run.frames[0][0]).toFixed(2) + ' / ' + duration.toFixed(2) + ' s';
if (document.activeElement !== tl) tl.value = String(Math.round(1000 * (duration ? (t / duration) : 0)));
windCenter.copy(d ? d.position : new THREE.Vector3());
}
function parseFile(f) {
return ctx.files.buffer(f).then(function (buf) {
var ext = ctx.files.ext(f), obj = null;
if (ext === 'glb' || ext === 'gltf') return new Promise(function (res, rej) {
var gl = new A.GLTFLoader();
gl.register(function (parser) { parser.textureLoader = new THREE.TextureLoader(); return { name: 'esasim_images' }; });
gl.parse(buf, '', function (g) { res(g.scene); }, rej);
});
if (ext === 'obj') obj = new A.OBJLoader().parse(new TextDecoder().decode(buf));
else if (ext === 'stl') obj = new THREE.Mesh(new A.STLLoader().parse(buf), std(0xb8bec8, 0.4, 0.6));
else if (ext === 'ply') {
var geo = new A.PLYLoader().parse(buf), col = !!geo.attributes.color;
if (geo.index) { if (!geo.attributes.normal) geo.computeVertexNormals(); obj = new THREE.Mesh(geo, std(0xb8bec8, 0.6, 0.1, { vertexColors: col })); }
else { geo.computeBoundingSphere(); var r = geo.boundingSphere ? geo.boundingSphere.radius : 1; obj = new THREE.Points(geo, new THREE.PointsMaterial({ size: Math.max(0.004, r / 400), sizeAttenuation: true, vertexColors: col, color: col ? 0xffffff : 0x3d6bff })); }
}
if (obj) obj.traverse(function (o) { if (o.isMesh && o.material && !o.material.isMeshStandardMaterial && !o.material.isMeshPhysicalMaterial) o.material = std(0xb8bec8, 0.55, 0.2); });
return obj;
});
}
var FILES = { all: [], sel: (ctx.state || {}).model || '', root: null, seq: 0 };
var mdlSel = document.createElement('select');
mdlSel.title = 'The model shown';
mdlSel.style.cssText = 'display:none;margin:2px 0 4px;max-width:260px;background:#1b2029;color:#e8ecf2;border:1px solid #2a303b;border-radius:6px;font:inherit;font-size:12px;pointer-events:auto';
$('.hud').insertBefore(mdlSel, $('.rows'));
mdlSel.addEventListener('change', function () { FILES.sel = mdlSel.value; keepView(true); loadFiles(FILES.all); });
function shortName(n) { return String(n).replace(/\.(glb|gltf|obj|stl|ply)$/i, '').replace(/_anatomy$/i, ''); }
function loadFiles(list) {
clearEntities(); runs = []; runSel.style.display = 'none'; barEl.style.display = 'none';
ctx.status(list.length ? 'Loading the 3D model…' : '');
FILES.all = list;
var one = P.models === 'one at a time' && list.length > 1;
if (one) {
mdlSel.innerHTML = list.map(function (f) { return '<option value="' + esc(f.name) + '">' + esc(shortName(f.name)) + '</option>'; }).join('');
var pick = list.filter(function (f) { return f.name === FILES.sel; })[0] || list[0];
FILES.sel = pick.name; mdlSel.value = pick.name; list = [pick];
}
mdlSel.style.display = one ? '' : 'none';
hudTitle.textContent = one ? 'Model ' + (FILES.all.indexOf(list[0]) + 1) + ' of ' + FILES.all.length : list.map(function (f) { return f.name; }).join(', ');
if (!list.length) return;
var root = new THREE.Group(), seq = ++FILES.seq, floorOn = P.floor !== false;
FILES.root = root; entities.files = root; scene.add(root);
Promise.all(list.map(function (f) {
return parseFile(f).then(function (o) { if (o) o.userData.file = f.name; return o; }).catch(function (e) { ctx.status('Could not open ' + f.name + ': ' + e.message); return null; });
})).then(function (objs) {
if (seq !== FILES.seq) return;
if (objs.some(function (o) { return o; })) ctx.status('');
var x = 0;
objs.forEach(function (obj) {
if (!obj) return;
shadow(obj);
var b = new THREE.Box3().setFromObject(obj), c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
var w = new THREE.Group(); obj.position.sub(c); w.add(obj);
w.position.set(x + sz.x / 2, floorOn ? sz.y / 2 : 0, 0); x += sz.x + Math.max(0.2, sz.x * 0.25);   // on the ground, side by side
root.add(w);
wetLook(obj);
partsAdd(obj, obj.userData.file || '');
});
var rb = new THREE.Box3().setFromObject(root), cc = rb.getCenter(new THREE.Vector3());
root.children.forEach(function (w) { w.position.sub(cc); });
root.position.copy(cc);
if (!floorOn) { root.position.set(0, 0, 0); }
root.updateMatrixWorld(true);
fitBox(new THREE.Box3().setFromObject(root), 0.3);
var shown = objs.filter(function (o) { return o; })[0], soft = shown && (FILES.soft || []).filter(function (sf) { return shortName(sf.name).replace(/[._-]?softbody(\.json)?$/i, '') === shortName(shown.userData.file || ''); })[0];
if (!soft && shown && (FILES.soft || []).length === 1 && objs.length === 1) soft = FILES.soft[0];
if (soft) ctx.files.json(soft).then(function (m) { if (seq === FILES.seq) softStart(m, shown); }).catch(function (e) { ctx.status('Could not read ' + soft.name + ': ' + e.message); });
});
}
function attachModels(list) {
var used = {};
Object.keys(entities).forEach(function (id) { var d = entities[id].userData.def || {}; if (d.model) list.forEach(function (f) { if (f.name === d.model) used[f.name] = id; }); });
var target = String(P.model_for || '').trim();
if (target && entities[target]) { var free = list.filter(function (f) { return !used[f.name]; })[0]; if (free && Object.keys(used).map(function (k) { return used[k]; }).indexOf(target) < 0) used[free.name] = target; }
var sceneBox = new THREE.Box3(); Object.keys(entities).forEach(function (k) { sceneBox.expandByObject(entities[k]); });
var x = sceneBox.isEmpty() ? 0 : sceneBox.max.x + 2;
list.forEach(function (f) {
parseFile(f).then(function (obj) {
if (!obj) return;
shadow(obj);
var id = used[f.name], b = new THREE.Box3().setFromObject(obj), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
if (id && entities[id]) {
var ent = entities[id], d = ent.userData.def || {}, want = d.model_size != null ? +d.model_size : (+d.size || (d.radius ? d.radius * 2 : 0)), k = want ? want / Math.max(1e-6, Math.max(s.x, s.z)) : 1;
obj.position.sub(c.multiplyScalar(k)); obj.scale.multiplyScalar(k);
while (ent.children.length) ent.remove(ent.children[0]);
ent.userData.props = [];
var body = new THREE.Group(); body.add(obj); ent.add(body);
if (ent.userData.body) ent.userData.body = body;
return;
}
obj.position.y -= b.min.y; obj.position.x += x - b.min.x; x += (b.max.x - b.min.x) + 1;
entities['file' + Object.keys(entities).length] = obj; scene.add(obj);
}).catch(function (e) { ctx.status('Could not open ' + f.name + ': ' + e.message); });
});
}
var LIVE = { samples: [], seen: {}, ct: null, ep: 0, built: false, trails: {}, lastTrail: 0, models: null };
function isPos(v) { return Array.isArray(v) && v.length >= 3 && typeof v[0] === 'number' && typeof v[1] === 'number' && typeof v[2] === 'number'; }
function poseItems(stream) {
var want = String(P.live_channel || '').trim();
return stream.filter(function (it) {
if (!it || !it.data || typeof it.data !== 'object' || Array.isArray(it.data)) return false;
if (want && it.channel !== want) return false;
return Object.keys(it.data).some(function (k) { return isPos(it.data[k]); });
});
}
function feedLive(items) {
items.forEach(function (it) {
var key = (it.node || '') + '|' + it.t + '|' + it.channel;
if (LIVE.seen[key]) return; LIVE.seen[key] = 1;
var d = it.data, st = typeof d.t === 'number' ? d.t : it.t, prev = LIVE.samples[LIVE.samples.length - 1];
var ep = prev ? prev.ep : 0;
if (prev && st < prev.t - 1e-6) ep++;
var pos = {}, info = {};
Object.keys(d).forEach(function (k) { if (isPos(d[k])) pos[k] = d[k]; else if (k !== 't' && (typeof d[k] === 'number' || typeof d[k] === 'string')) info[k] = d[k]; });
LIVE.samples.push({ t: st, ep: ep, pos: pos, info: info, up: d.up });
});
if (LIVE.samples.length > 20000) LIVE.samples = LIVE.samples.slice(-15000);
}
function liveShape(id) {
if (/drone|quad|uav|copter/i.test(id)) return { id: id, shape: 'quadrotor', size: 0.55, color: '#20242c' };
if (/pad|platform|dock/i.test(id)) return { id: id, shape: 'cylinder', radius: 1, height: 0.08, color: '#e8ecf2', decal: 'H' };
return { id: id, shape: 'sphere', radius: 0.3, color: '#7b8cff' };
}
function startLive(meshes) {
if (LIVE.built) return;
clearEntities(); runs = []; runSel.style.display = 'none';
while (trailGroup.children.length) { var c = trailGroup.children.pop(); c.geometry.dispose(); c.material.dispose(); }
LIVE.built = true; LIVE.trails = {}; LIVE.models = meshes && meshes.length ? meshes : null;
if (!flown) setCam('frame');
}
function liveBuildEntities(sample) {
var added = false;
Object.keys(sample.pos).forEach(function (id) {
if (entities[id]) return;
var e = liveShape(id), o = makeShape(e); o.userData.def = e; entities[id] = o; scene.add(o); added = true;
});
if (added && LIVE.models) attachModels(LIVE.models);
if (added) {
var box = new THREE.Box3();
Object.keys(sample.pos).forEach(function (id) { var q = sample.pos[id]; box.expandByPoint(v3(q[0], q[1], q[2])); });
box.expandByScalar(3); fitBox(box, 4);
}
return added;
}
function stepLive(dt) {
var S = LIVE.samples; if (!S.length) return;
var last = S[S.length - 1];
if (LIVE.ct == null) { LIVE.ep = S[0].ep; LIVE.ct = S[0].t; }
if (last.ep !== LIVE.ep && (LIVE.ct >= epEnd(LIVE.ep) || last.ep > LIVE.ep + 1)) { LIVE.ep = last.ep; LIVE.ct = epStart(LIVE.ep); resetTrails(); }
if (playing) LIVE.ct += dt * speed;
var end = epEnd(LIVE.ep);
if (end - LIVE.ct > 4) LIVE.ct = end - 1.5;
if (LIVE.ct > end) LIVE.ct = end;
var a = null, b = null;
for (var i = S.length - 1; i >= 0; i--) { var x = S[i]; if (x.ep !== LIVE.ep) continue; if (x.t <= LIVE.ct) { a = x; break; } b = x; }
if (!a) a = b; if (!b) b = a; if (!a) return;
if (a.up) upZ = a.up !== 'y';
liveBuildEntities(a);
var k = b.t > a.t ? (LIVE.ct - a.t) / (b.t - a.t) : 0;
Object.keys(a.pos).forEach(function (id) {
var pa = a.pos[id], pb = b.pos[id] || pa, o = entities[id]; if (!o) return;
var p = v3(pa[0] + (pb[0] - pa[0]) * k, pa[1] + (pb[1] - pa[1]) * k, pa[2] + (pb[2] - pa[2]) * k);
if (dt > 0 && prevPos[id]) {
var v = p.clone().sub(prevPos[id]).divideScalar(Math.max(dt, 1e-3));
var acc = prevVel[id] ? v.clone().sub(prevVel[id]).divideScalar(Math.max(dt, 1e-3)) : new THREE.Vector3();
if (o.userData.body) {
var tx = Math.atan2(acc.x, 9.81), tz = Math.atan2(acc.z, 9.81);
o.userData.body.rotation.z += (-Math.max(-0.5, Math.min(0.5, tx)) - o.userData.body.rotation.z) * 0.1;
o.userData.body.rotation.x += (Math.max(-0.5, Math.min(0.5, tz)) - o.userData.body.rotation.x) * 0.1;
}
prevVel[id] = v;
}
prevPos[id] = p.clone();
o.position.copy(p);
});
if (P.trails !== false && performance.now() - LIVE.lastTrail > 150) {
LIVE.lastTrail = performance.now();
Object.keys(entities).forEach(function (id) {
if ((entities[id].userData.def || {}).decal !== undefined) return;
var pts = S.filter(function (x) { return x.ep === LIVE.ep && x.t <= LIVE.ct && x.pos[id]; }).slice(-1500).map(function (x) { return v3(x.pos[id][0], x.pos[id][1], x.pos[id][2]); });
if (pts.length < 2) return;
var line = LIVE.trails[id];
if (!line) { line = LIVE.trails[id] = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x7b8cff, transparent: true, opacity: 0.9 })); trailGroup.add(line); }
line.geometry.dispose(); line.geometry = new THREE.BufferGeometry().setFromPoints(pts);
});
}
var info = a.info, rows = [['time', (LIVE.ct - epStart(LIVE.ep)).toFixed(2) + ' s']], d = entities.drone, pad = entities.pad;
if (d) rows.push(['altitude', Math.max(0, d.position.y).toFixed(2) + ' m']);
if (d && pad) rows.push(['to the pad', Math.hypot(d.position.x - pad.position.x, d.position.z - pad.position.z).toFixed(2) + ' m']);
Object.keys(info).filter(function (k) { return k !== 'label' && k !== 'up' && k !== 'wind'; }).slice(0, 4).forEach(function (k) { rows.push([esc(k.replace(/_/g, ' ')), esc(typeof info[k] === 'number' ? +info[k].toFixed(3) : info[k])]); });
hudRows.innerHTML = rows.map(function (r) { return '<span style="opacity:.65">' + r[0] + '</span><span>' + r[1] + '</span>'; }).join('');
hudTitle.innerHTML = '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#ff4d5e;margin-right:6px;vertical-align:1px"></span>Live' + (info.label ? ': ' + esc(info.label) : '');
var wind = typeof info.wind === 'number' ? info.wind : null;
windSpeed = wind == null ? 0 : Math.abs(wind);
$('.wind').style.display = wind == null ? 'none' : '';
if (wind != null) $('.ws').textContent = 'wind ' + wind.toFixed(1) + ' m/s';
tm.textContent = 'live · ' + (LIVE.ct - epStart(LIVE.ep)).toFixed(1) + ' s';
windCenter.copy(d ? d.position : new THREE.Vector3());
}
function epStart(ep) { for (var i = 0; i < LIVE.samples.length; i++) if (LIVE.samples[i].ep === ep) return LIVE.samples[i].t; return 0; }
function epEnd(ep) { for (var i = LIVE.samples.length - 1; i >= 0; i--) if (LIVE.samples[i].ep === ep) return LIVE.samples[i].t; return 0; }
function resetTrails() { Object.keys(LIVE.trails).forEach(function (id) { trailGroup.remove(LIVE.trails[id]); LIVE.trails[id].geometry.dispose(); }); LIVE.trails = {}; prevPos = {}; prevVel = {}; }
function stopLive() {
if (!LIVE.built) return;
resetTrails(); LIVE.built = false; LIVE.ct = null;
}
var ROBOT = { units: {}, order: [], feed: {}, seen: {}, world: null, sceneKey: '', objects: null, images: {}, imageUrl: {}, check: null, fitted: false };
var JCH = String(P.joints_channel || 'joints').trim(), GCH = String(P.ghost_channel || 'twin').trim(), SCH = String(P.scene_channel || 'scene').trim();
var LAG = Math.max(0.2, +P.delay || 1.2);
function isRobotFile(f) { return /\.robot\.json(\.gz)?$/i.test(f.name); }
function lc(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
function jointsOf(d) {
if (!d || typeof d !== 'object') return null;
var q = null, named = null;
var list = Array.isArray(d.q) ? d.q : Array.isArray(d.joints) ? d.joints : null;
if (list) q = list.map(function (v) { return typeof v === 'number' && isFinite(v) ? v : null; });
else {
Object.keys(d).forEach(function (k) {
var m = /^j(\d+)$/.exec(k); if (!m || typeof d[k] !== 'number' || !isFinite(d[k])) return;
var n = +m[1]; if (n < 1) return;
q = q || []; while (q.length < n) q.push(null); q[n - 1] = d[k];
});
}
var nm = d.joints && typeof d.joints === 'object' && !Array.isArray(d.joints) ? d.joints : d.named && typeof d.named === 'object' ? d.named : null;
if (nm) Object.keys(nm).forEach(function (k) { if (typeof nm[k] === 'number' && isFinite(nm[k])) { named = named || {}; named[lc(k)] = nm[k]; } });
if (!q && !named) return null;
return { q: q, named: named, robot: lc(d.robot), rad: lc(d.units) === 'rad' ? true : lc(d.units) === 'deg' ? false : null };
}
function robotItems(stream) {
return stream.filter(function (it) {
if (!it || !it.data || typeof it.data !== 'object') return false;
if (it.channel === JCH || it.channel === GCH) return !!jointsOf(it.data);
return it.channel === SCH && Array.isArray(it.data.objects);
});
}
function worldGroup() {
if (!ROBOT.world) { ROBOT.world = new THREE.Group(); ROBOT.world.rotation.x = -Math.PI / 2; scene.add(ROBOT.world); } // z up → y up
return ROBOT.world;
}
function unitScale(u) { return u === 'm' ? 1 : u === 'cm' ? 0.01 : 0.001; }
function units() { return ROBOT.order.map(function (k) { return ROBOT.units[k]; }); }
function firstUnit() { return ROBOT.units[ROBOT.order[0]] || null; }
function anyArm() { return units().some(function (U) { return !!U.arm; }); }
function parentOf(model, i, byName) {
var p = model.joints[i].parent;
if (p == null) return i - 1;
if (typeof p === 'number') return p >= 0 && p < i ? p : -1;
var k = lc(p); if (k === '' || k === 'base' || k === 'world') return -1;
var j = byName[k]; return j != null && j !== i ? j : -1;
}
function buildRobot(model, ghost) {
var mat = function (i, l) {
if (ghost) return new THREE.MeshStandardMaterial({ color: 0x4d8dff, transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.6 });
var c = l && l.color ? l.color : (i === 0 ? 0x8e959f : 0xf0f1f3);
if (l && l.emissive) return new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
var rough = l && l.roughness != null ? +l.roughness : 0.42, metal = l && l.metalness != null ? +l.metalness : 0.06;
if (l && +l.clearcoat > 0) return new THREE.MeshPhysicalMaterial({ color: c, roughness: rough, metalness: metal, clearcoat: +l.clearcoat, clearcoatRoughness: 0.06 });
return std(c, rough, metal);
};
var fxMeshes = [], cubeMeshes = [];
var root = new THREE.Group(), joints = [], k = model.scale || 1, J = model.joints || [], byName = {};
J.forEach(function (j, i) { if (j && j.name != null) byName[lc(j.name)] = i; });
function link(i, holder) {
var l = (model.links || [])[i]; if (!l || !l.v || !l.f) return;
var g = new THREE.BufferGeometry(), pos = new Float32Array(l.v.length);
for (var n = 0; n < l.v.length; n++) pos[n] = l.v[n] * k;
g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(l.f); g.computeVertexNormals();
var m = new THREE.Mesh(g, mat(i, l)); m.castShadow = !ghost && !l.emissive && l.shadow !== false; m.receiveShadow = !ghost; holder.add(m);
if (!ghost && J[i - 1] && lc(J[i - 1].name || '') === 'static:floor line' && m.material.isMeshStandardMaterial) { m.material = m.material.clone(); rfxWornPaint(m.material); m.castShadow = false; }
if (!ghost && J[i - 1] && /beams$/.test(lc(J[i - 1].name || ''))) rfxBeamLines(m);
var fx_ = l.fx || (J[i - 1] && /^(bead\d*|mark\d*):/i.test(J[i - 1].name || '') ? 'bead' : null);
if (!ghost && fx_) { m.userData.fx = fx_; fxMeshes.push(m); if (fx_ === 'bead') m.castShadow = false; }
if (!ghost && l.envmap === 'cube') cubeMeshes.push(m);
}
link(0, root);
J.forEach(function (j, i) {
var pi = parentOf(model, i, byName), parent = pi < 0 ? root : joints[pi];
var o = new THREE.Group(), xyz = j.xyz || [0, 0, 0], rpy = j.rpy || [0, 0, 0];
o.position.set(xyz[0], xyz[1], xyz[2]); o.rotation.set(rpy[0], rpy[1], rpy[2], 'ZYX');
parent.add(o);
var r = new THREE.Group(); r.userData.axis = new THREE.Vector3().fromArray(j.axis || [0, 0, 1]).normalize();
r.userData.type = lc(j.type || 'revolute'); o.add(r); joints.push(r);
link(i + 1, r);
});
var tool = model.tool != null ? (typeof model.tool === 'number' ? model.tool : byName[lc(model.tool)]) : J.length - 1;
root.userData = { joints: joints, flange: joints[tool] || joints[joints.length - 1] || root, names: byName, rad: lc(model.angle_units) === 'rad', fx: fxMeshes, cube: cubeMeshes };
root.scale.setScalar(unitScale(model.units));
return root;
}
function vecOf(s, r) {
if (!s) return null;
if (!s.named) return s.q;
if (s.vr === r) return s.v;
var q = (s.q || []).slice(), names = r.userData.names;
Object.keys(s.named).forEach(function (k) { var i = names[k]; if (i != null) { while (q.length <= i) q.push(null); q[i] = s.named[k]; } });
s.vr = r; s.v = q; return q;
}
function poseRobot(r, s) {
if (!r || !s) return;
var q = vecOf(s, r), rad = s.rad != null ? s.rad : r.userData.rad;
if (!q) return;
r.userData.joints.forEach(function (j, i) {
var v = q[i]; if (v == null) return;
var t = j.userData.type;
if (t === 'fixed') return;
if (t === 'prismatic' || t === 'slide' || t === 'linear') { j.position.copy(j.userData.axis).multiplyScalar(v); return; }
j.quaternion.setFromAxisAngle(j.userData.axis, rad ? v : v * Math.PI / 180);
});
}
function setTool(r, def, ghost) {
if (!r) return;
var fl = r.userData.flange; if (r.userData.tool) { fl.remove(r.userData.tool); r.userData.tool = null; }
if (!def) return;
var len = +def.length || 0, rad = +def.radius || 5; if (len <= 0) return;
var m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 0.7, len, 20), ghost ? new THREE.MeshStandardMaterial({ color: 0x4d8dff, transparent: true, opacity: 0.3, depthWrite: false })
: std(def.color || 0x1d2330, 0.5, 0.1));
m.rotation.x = Math.PI / 2; m.position.z = len / 2; m.castShadow = !ghost; fl.add(m); r.userData.tool = m;
}
var RFX = { sparks: null, smoke: null, glowTex: null, smokeTex: null, arcs: {}, cube: null, hall: null, hallKey: '', hallEnv: null, glow: null, t: 0 };
function rfxTex(inner, outer, soft) {
var c = document.createElement('canvas'); c.width = c.height = 128; var x = c.getContext('2d');
var g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
g.addColorStop(0, inner); g.addColorStop(soft, outer); g.addColorStop(1, 'rgba(0,0,0,0)');
x.fillStyle = g; x.fillRect(0, 0, 128, 128);
var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function rfxSparks() {
if (RFX.sparks) return RFX.sparks;
var N = quality === 'fast' ? 3000 : 12000;
var g = new THREE.BufferGeometry(), pos = new Float32Array(N * 6), col = new Float32Array(N * 6);
g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
g.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
var m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
m.frustumCulled = false; m.renderOrder = 5; scene.add(m);
RFX.sparks = { mesh: m, N: N, p: new Float32Array(N * 3), v: new Float32Array(N * 3), age: new Float32Array(N), life: new Float32Array(N), next: 0 };
return RFX.sparks;
}
function rfxEmitSpark(S, o) {
var k = S.next; S.next = (S.next + 1) % S.N;
var u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u), sp = 1.2 + Math.random() * Math.random() * 4.5;
S.p[3 * k] = o.x; S.p[3 * k + 1] = o.y; S.p[3 * k + 2] = o.z;
S.v[3 * k] = r * Math.cos(a) * sp; S.v[3 * k + 1] = (u * 0.8 + 0.25) * sp; S.v[3 * k + 2] = r * Math.sin(a) * sp;
S.age[k] = 0; S.life[k] = 0.45 + Math.random() * 1.3;
}
function rfxStepSparks(S, dt) {
var P = S.mesh.geometry.attributes.position.array, C = S.mesh.geometry.attributes.color.array;
for (var k = 0; k < S.N; k++) {
var i3 = 3 * k, i6 = 6 * k;
if (S.life[k] <= 0 || S.age[k] >= S.life[k]) { S.life[k] = 0; for (var z = 0; z < 6; z++) { P[i6 + z] = 0; C[i6 + z] = 0; } continue; }
S.age[k] += dt;
var drag = Math.max(0, 1 - 0.6 * dt);
S.v[i3] *= drag; S.v[i3 + 2] *= drag; S.v[i3 + 1] = S.v[i3 + 1] * drag - 9.81 * dt;
S.p[i3] += S.v[i3] * dt; S.p[i3 + 1] += S.v[i3 + 1] * dt; S.p[i3 + 2] += S.v[i3 + 2] * dt;
if (S.p[i3 + 1] < 0.004) { S.p[i3 + 1] = 0.004; S.v[i3 + 1] = Math.abs(S.v[i3 + 1]) * 0.25; S.v[i3] *= 0.55; S.v[i3 + 2] *= 0.55; }
var t = S.age[k] / S.life[k], f = Math.pow(1 - t, 1.6), tail = 0.018 + 0.01 * Math.random();
var cr = 1, cg = t < 0.15 ? 0.95 : t < 0.5 ? 0.78 - 0.5 * (t - 0.15) : 0.6 - 0.6 * (t - 0.5), cb = t < 0.12 ? 1.0 - 4 * t : Math.max(0, 0.45 - t);
P[i6] = S.p[i3]; P[i6 + 1] = S.p[i3 + 1]; P[i6 + 2] = S.p[i3 + 2];
P[i6 + 3] = S.p[i3] - S.v[i3] * tail; P[i6 + 4] = S.p[i3 + 1] - S.v[i3 + 1] * tail; P[i6 + 5] = S.p[i3 + 2] - S.v[i3 + 2] * tail;
C[i6] = cr * f * 1.6; C[i6 + 1] = Math.max(0, cg) * f * 1.6; C[i6 + 2] = cb * f * 1.6;
C[i6 + 3] = cr * f * 0.25; C[i6 + 4] = Math.max(0, cg) * f * 0.2; C[i6 + 5] = cb * f * 0.15;
}
S.mesh.geometry.attributes.position.needsUpdate = true; S.mesh.geometry.attributes.color.needsUpdate = true;
}
function rfxSmoke() {
if (RFX.smoke) return RFX.smoke;
RFX.smokeTex = RFX.smokeTex || rfxTex('rgba(255,255,255,0.9)', 'rgba(235,238,242,0.35)', 0.45);
if (!RFX.smokeAsk) { RFX.smokeAsk = true; fromProject(['smoke_puff.jpg'], 'buffer', function (buf) { var u = URL.createObjectURL(new Blob([buf], { type: 'image/jpeg' })); new THREE.TextureLoader().load(u, function (tx) { RFX.smokeImg = tx; if (RFX.smoke) RFX.smoke.list.forEach(function (p) { p.s.material.map = tx; p.s.material.alphaMap = tx; p.s.material.needsUpdate = true; }); }); }, function () { }); }
var list = [];
for (var k = 0; k < (quality === 'fast' ? 60 : 160); k++) {
var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: RFX.smokeImg || RFX.smokeTex, alphaMap: RFX.smokeImg || null, color: 0xf2f4f6, transparent: true, opacity: 0, depthWrite: false }));
s.visible = false; s.renderOrder = 4; scene.add(s); list.push({ s: s, age: 0, life: 0, v: new THREE.Vector3(), spin: 0 });
}
RFX.smoke = { list: list, next: 0 }; return RFX.smoke;
}
function rfxEmitSmoke(M, o) {
var p = M.list[M.next]; M.next = (M.next + 1) % M.list.length;
p.s.position.copy(o); p.age = 0; p.life = 1.4 + Math.random() * 1.2; p.s.visible = true;
p.v.set((Math.random() - 0.5) * 0.18, 0.18 + Math.random() * 0.22, (Math.random() - 0.5) * 0.18); p.spin = (Math.random() - 0.5) * 0.8;
}
function rfxStepSmoke(M, dt) {
M.list.forEach(function (p) {
if (!p.s.visible) return;
p.age += dt; var t = p.age / p.life;
if (t >= 1) { p.s.visible = false; p.s.material.opacity = 0; return; }
p.s.position.addScaledVector(p.v, dt); p.v.multiplyScalar(Math.max(0, 1 - 0.5 * dt));
var sc = 0.06 + 0.75 * Math.sqrt(t); p.s.scale.set(sc, sc, 1); p.s.material.rotation += p.spin * dt;
p.s.material.opacity = (RFX.smokeImg ? 0.55 : 0.3) * Math.min(1, t * 6) * Math.pow(1 - t, 1.4);
});
}
function rfxArc(key) {
var A_ = RFX.arcs[key]; if (A_) return A_;
RFX.glowTex = RFX.glowTex || rfxTex('rgba(255,255,255,1)', 'rgba(120,170,255,0.55)', 0.25);
var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: RFX.glowTex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
glow.renderOrder = 6; glow.visible = false; scene.add(glow);
var light = new THREE.PointLight(0x8fb6ff, 0, 3, 2); light.castShadow = false; scene.add(light);
A_ = RFX.arcs[key] = { glow: glow, light: light, sparkAcc: 0, smokeAcc: 0, burst: 0 };
return A_;
}
// weld beads: hidden until their joint has lifted them onto the car (the torch has passed), then glowing red, cooling to dark grey
var RFXC = new THREE.Color();
function rfxBead(m, H) {
var u = m.userData, first = !u.seen; u.seen = true;
var up = m.parent ? m.parent.position.length() : 0;
if (up < H - 0.01) { m.visible = false; u.bt = null; return; }
m.visible = true;
if (u.c0 == null) { u.c0 = m.material.color.clone(); if (!m.material.emissive) return; }
if (u.bt == null) u.bt = first || RFX.t < 3 ? -1e9 : RFX.t;
var h = Math.exp(-(RFX.t - u.bt) / 2.2);
if (h < 0.01) { if (u.hot) { u.hot = false; m.material.color.copy(u.c0); m.material.emissive.setRGB(0, 0, 0); m.material.emissiveIntensity = 1; } return; }
u.hot = true;
m.material.emissive.setRGB(1, 0.06 + 0.3 * h * h, 0.02 * h); m.material.emissiveIntensity = 3.2 * Math.pow(h, 1.5);
m.material.color.copy(u.c0).lerp(RFXC.setRGB(0.35, 0.04, 0.02), Math.min(1, 1.4 * h));
}
// the arc's sound: a crackle (short clicks of filtered noise, the bacon-frying of a MIG arc) over a hiss, louder near the camera
function rfxCrackle(A_, p, lvl, dt) {
var A = AUD.ctx; if (!A || !AUD.nodes || !AUD.on || document.hidden) return;
var d = camera.position.distanceTo(p), near = 1 / (1 + d * d / 6);
RFX.loud += near;
if (!A_.wasOn) { A_.wasOn = true; audBurst({ f: 1400, type: 'bandpass', Q: 0.6, a: 0.002, d: 0.22, g: 0.9 * near }); audBurst({ f: 260, type: 'lowpass', a: 0.002, d: 0.08, g: 0.6 * near, brown: true }); }
A_.crackAcc = (A_.crackAcc || 0) + dt * (16 + 26 * lvl);
var n = 0; while (A_.crackAcc >= 1 && n < 6) { A_.crackAcc -= 1; n++;
audBurst({ f: 1600 + Math.random() * 5200, type: 'bandpass', Q: 0.7 + Math.random() * 2.2, a: 0.0008, d: 0.006 + Math.random() * Math.random() * 0.06, g: (0.12 + 0.75 * Math.random() * Math.random()) * near, at: Math.random() * dt }); }
if (Math.random() < dt * 3) audBurst({ f: 380, type: 'lowpass', a: 0.001, d: 0.05, g: 0.35 * near, brown: true });
}
function rfxHiss() {
var A = AUD.ctx; if (!A || !AUD.nodes) return;
if (!RFX.hiss) { var s0 = A.createBufferSource(); s0.buffer = AUD.nodes.white; s0.loop = true; var fl = A.createBiquadFilter(); fl.type = 'highpass'; fl.frequency.value = 2200; var g = A.createGain(); g.gain.value = 0; s0.connect(fl); fl.connect(g); g.connect(AUD.nodes.master); s0.start(); RFX.hiss = g; }
var v = AUD.on && !document.hidden ? 0.05 * Math.min(1.6, RFX.loud) : 0;
RFX.hiss.gain.setTargetAtTime(v, A.currentTime, 0.06);
}
// motor sounds: the sled's electric drive on the rail (a gentle hum and whine that follow its speed) and, for every
// axis of every robot, a faint servo whine while it turns (lower for the big axes, higher for the wrist); all fade with
// the camera's distance
var RFXV2 = new THREE.Vector3(), RFXV3 = new THREE.Vector3();
function rfxMotors(dt) {
var A = AUD.ctx; if (!A || !AUD.nodes || !(dt > 0)) return;
var U0 = firstUnit(); if (!U0 || !U0.arm) return;
var ud = U0.arm.userData, on = AUD.on && !document.hidden, now = A.currentTime;
if (!RFX.mot) {
var M = RFX.mot = { rail: null, servos: [], carPrev: null, carV: 0 };
var rg = A.createGain(); rg.gain.value = 0; rg.connect(AUD.nodes.master);
var o1 = A.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 45; var l1 = A.createBiquadFilter(); l1.type = 'lowpass'; l1.frequency.value = 320; l1.Q.value = 0.8; o1.connect(l1); l1.connect(rg); o1.start();
var o2 = A.createOscillator(); o2.type = 'sine'; o2.frequency.value = 700; var g2 = A.createGain(); g2.gain.value = 0; o2.connect(g2); g2.connect(AUD.nodes.master); o2.start();
var nz = A.createBufferSource(); nz.buffer = AUD.nodes.brown; nz.loop = true; var l3 = A.createBiquadFilter(); l3.type = 'lowpass'; l3.frequency.value = 220; var g3 = A.createGain(); g3.gain.value = 0; nz.connect(l3); l3.connect(g3); g3.connect(AUD.nodes.master); nz.start();
M.rail = { g: rg, o1: o1, o2: o2, g2: g2, g3: g3 };
var names = ud.names || {}, base = [150, 175, 210, 380, 460, 540];
(U0.model && U0.model.robots || []).forEach(function (rb) {
for (var k = 1; k <= 6; k++) {
var idx = names[(rb + ':a' + k).toLowerCase()]; if (idx == null || !ud.joints[idx]) continue;
var o = A.createOscillator(); o.type = 'triangle'; o.frequency.value = base[k - 1];
var bp = A.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = base[k - 1] * 2; bp.Q.value = 3;
var g = A.createGain(); g.gain.value = 0; o.connect(bp); bp.connect(g); g.connect(AUD.nodes.master); o.start();
M.servos.push({ j: ud.joints[idx], q: ud.joints[idx].quaternion.clone(), w: 0, f0: base[k - 1], o: o, bp: bp, g: g });
}
});
}
var M = RFX.mot;
// the sled: the speed of the car's middle
var cars = ud.cube || [], car = cars[0];
if (car) {
M.carPrevs = M.carPrevs || []; var v = 0, vp = new THREE.Vector3();          // the fastest of the sleds (they move together)
cars.forEach(function (cm, ci) {
if (!cm.geometry.boundingSphere) cm.geometry.computeBoundingSphere();
cm.localToWorld(vp.copy(cm.geometry.boundingSphere.center));
var vi = M.carPrevs[ci] ? vp.distanceTo(M.carPrevs[ci]) / dt : 0; if (!M.carPrevs[ci]) M.carPrevs[ci] = new THREE.Vector3();
M.carPrevs[ci].copy(vp);
if (vi > 6) vi = 0;                                                   // a car put round to the start: not a move
if (vi > v) { v = vi; RFXV2.copy(vp); }
});
if (v === 0) car.localToWorld(RFXV2.copy(car.geometry.boundingSphere.center));
M.carV += (v - M.carV) * Math.min(1, dt * 5);
var lv = Math.min(1, M.carV / 0.5), d = camera.position.distanceTo(RFXV2), near = 1 / (1 + d * d / 40), R = M.rail;
R.g.gain.setTargetAtTime(on ? 0.07 * lv * near : 0, now, 0.08);
R.o1.frequency.setTargetAtTime(38 + 60 * lv, now, 0.1);
R.o2.frequency.setTargetAtTime(520 + 1100 * lv, now, 0.1);
R.g2.gain.setTargetAtTime(on ? 0.006 * lv * near : 0, now, 0.08);
R.g3.gain.setTargetAtTime(on ? 0.09 * lv * near : 0, now, 0.08);
}
// the doors: a roll-up door's gear motor (a soft low hum with a faint gear whine), the curtain rolling on its drum (a
// low rumble that swells gently), the chain ticking over its sprocket; a contactor click when it starts, a muffled
// thud and a short rattle of the slats when it stops. Quiet, and fading with the camera's distance.
if (!M.doors) {
M.doors = [];
['door:in', 'door:out'].forEach(function (dn) {
var ix = (ud.names || {})[dn]; if (ix == null || !ud.joints[ix]) return;
var g = A.createGain(); g.gain.value = 0; g.connect(AUD.nodes.master);
var h1 = A.createOscillator(); h1.type = 'sine'; h1.frequency.value = 50;
var h2 = A.createOscillator(); h2.type = 'triangle'; h2.frequency.value = 100;
var hl = A.createBiquadFilter(); hl.type = 'lowpass'; hl.frequency.value = 170; hl.Q.value = 0.5;
var hg = A.createGain(); hg.gain.value = 0.32; h1.connect(hl); h2.connect(hl); hl.connect(hg); hg.connect(g); h1.start(); h2.start();
var wh = A.createOscillator(); wh.type = 'sine'; wh.frequency.value = 230; var wg = A.createGain(); wg.gain.value = 0.025; wh.connect(wg); wg.connect(g); wh.start();
var rs = A.createBufferSource(); rs.buffer = AUD.nodes.brown; rs.loop = true;
var rl = A.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 340; rl.Q.value = 0.4;
var rg = A.createGain(); rg.gain.value = 0.5; var lfo = A.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 3.2;
var lg = A.createGain(); lg.gain.value = 0.14; lfo.connect(lg); lg.connect(rg.gain); lfo.start();
rs.connect(rl); rl.connect(rg); rg.connect(g); rs.start();
M.doors.push({ j: ud.joints[ix], prev: null, v: 0, moving: false, g: g, lfo: lfo, wh: wh, tick: 0 });
});
}
M.doors.forEach(function (D) {
var h = D.j.position.length(), v = D.prev == null ? 0 : Math.abs(h - D.prev) / dt; D.prev = h;
if (v > 5) v = 0;                                                     // a jump, not a move
D.v += (v - D.v) * Math.min(1, dt * 6);
var mv = D.v > 0.05, lv = Math.min(1, D.v / 0.75); D.j.getWorldPosition(RFXV3);
var d = camera.position.distanceTo(RFXV3), near = 1 / (1 + d * d / 120);
D.g.gain.setTargetAtTime(on && mv ? 0.1 * near : 0, now, mv ? 0.25 : 0.12);
D.lfo.frequency.setTargetAtTime(2.4 + 1.6 * lv, now, 0.2);
D.wh.frequency.setTargetAtTime(180 + 70 * lv, now, 0.2);
if (on && mv) {                                                       // the chain over the sprocket
D.tick += dt * (7 + 5 * lv);
while (D.tick >= 1) { D.tick -= 1; audBurst({ f: 1800 + Math.random() * 900, type: 'bandpass', Q: 2.5, a: 0.0006, d: 0.012, g: (0.05 + 0.04 * Math.random()) * near, at: Math.random() * dt }); }
}
if (!D.moving && mv && on) audBurst({ f: 1300, type: 'bandpass', Q: 1.2, a: 0.0008, d: 0.03, g: 0.18 * near });
if (D.moving && !mv && on) {
audBurst({ f: 110, type: 'lowpass', a: 0.004, d: 0.32, g: 0.45 * near, brown: true });
for (var k = 0; k < 5; k++) audBurst({ f: 500 + Math.random() * 500, type: 'bandpass', Q: 1.4, a: 0.001, d: 0.025, g: 0.08 * near * (1 - k / 6), at: 0.03 + k * 0.035 + Math.random() * 0.02 });
}
D.moving = mv;
});
// the servos: each axis's turning speed
M.servos.forEach(function (s) {
var w = s.j.quaternion.angleTo(s.q) / dt; s.q.copy(s.j.quaternion);
if (w > 12) w = 0;                                                    // a jump (the view opening, a new pose): not a move
s.w += (w - s.w) * Math.min(1, dt * 8);
var lv = Math.min(1, s.w / 1.0);
s.j.getWorldPosition(RFXV3);
var d = camera.position.distanceTo(RFXV3), near = 1 / (1 + d * d / 10);
s.g.gain.setTargetAtTime(on && lv > 0.01 ? 0.02 * Math.sqrt(lv) * near : 0, now, 0.05);
s.o.frequency.setTargetAtTime(s.f0 * (1 + 1.6 * lv), now, 0.05);
s.bp.frequency.setTargetAtTime(s.f0 * 2 * (1 + 1.6 * lv), now, 0.05);
});
}
var RFXV = new THREE.Vector3(), RENDER_HEAL = 0;
// the yellow floor marking, worn: scuffed through to the floor where the traffic goes, tyre and boot marks across
// it, chips and grit; all from where it is on the floor (no texture needed)
function rfxWornPaint(mt) {
mt.onBeforeCompile = function (sh) {
sh.vertexShader = 'varying vec3 vWpw;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vWpw = (modelMatrix * vec4(transformed, 1.0)).xyz;');
sh.fragmentShader = 'varying vec3 vWpw;\n'
+ 'float wpH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n'
+ 'float wpN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(wpH(i), wpH(i + vec2(1, 0)), f.x), mix(wpH(i + vec2(0, 1)), wpH(i + vec2(1, 1)), f.x), f.y); }\n'
+ 'float wpF(vec2 p) { float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a * wpN(p); p *= 2.07; a *= 0.5; } return s; }\n'
+ sh.fragmentShader.replace('#include <color_fragment>', [
'#include <color_fragment>',
'  vec2 wq = vWpw.xz;',
'  float wear = smoothstep(0.52, 0.78, wpF(wq * 1.6) + 0.22 * wpF(wq * 14.0));',          // patches scuffed down to the floor
'  float chip = step(0.93, wpN(wq * 55.0)) * step(0.5, wpF(wq * 3.0));',                     // chips
'  float tyre = smoothstep(0.62, 0.9, wpN(vec2(wq.x * 0.35, wq.y * 22.0))) * 0.55;',          // dark streaks along the aisle
'  float boot = smoothstep(0.72, 0.95, wpN(wq * 7.0)) * 0.35;',                               // smudges
'  float grit = step(0.975, wpH(floor(wq * 140.0)));',
'  vec3 floorC = vec3(0.13, 0.14, 0.15);',
'  diffuseColor.rgb = mix(diffuseColor.rgb, floorC, clamp(0.85 * wear + chip, 0.0, 1.0));',
'  diffuseColor.rgb *= (1.0 - tyre) * (1.0 - boot) * (1.0 - 0.6 * grit) * (0.9 + 0.2 * wpN(wq * 30.0));'
].join('\n')).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = clamp(roughnessFactor + 0.25 * wear, 0.0, 1.0);');
};
mt.customProgramCacheKey = function () { return 'weld-worn-paint'; };
mt.needsUpdate = true;
}
// the light curtains' beams: drawn as lines (a pixel wide at any distance: a thin cylinder far off breaks into dots);
// each beam is one piece of the mesh, its length along the longest side of its box
function rfxBeamLines(m) {
var P = m.geometry.attributes.position, I = m.geometry.index, n = P.count, par = new Int32Array(n), key = {}, id = new Int32Array(n);
for (var i = 0; i < n; i++) { var k = Math.round(P.getX(i) * 1e4) + ',' + Math.round(P.getY(i) * 1e4) + ',' + Math.round(P.getZ(i) * 1e4); id[i] = key[k] != null ? key[k] : (key[k] = i); par[i] = i; }
var find = function (x) { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
var join = function (a, b) { a = find(id[a]); b = find(id[b]); if (a !== b) par[a] = b; };
for (var t = 0; t < I.count; t += 3) { join(I.getX(t), I.getX(t + 1)); join(I.getX(t + 1), I.getX(t + 2)); }
var box = {};
for (var i = 0; i < n; i++) { var r = find(id[i]), b = box[r] || (box[r] = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9]), x = P.getX(i), y = P.getY(i), z = P.getZ(i);
b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.min(b[2], z); b[3] = Math.max(b[3], x); b[4] = Math.max(b[4], y); b[5] = Math.max(b[5], z); }
var pts = [];
Object.keys(box).forEach(function (r) { var b = box[r], c = [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2], e = [b[3] - b[0], b[4] - b[1], b[5] - b[2]];
var ax = e[0] >= e[1] && e[0] >= e[2] ? 0 : e[1] >= e[2] ? 1 : 2, p0 = c.slice(), p1 = c.slice(); p0[ax] = b[ax]; p1[ax] = b[ax + 3]; pts.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2]); });
var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
var ln = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xff3b2f, transparent: true, opacity: 0.55, toneMapped: false, depthWrite: false }));
ln.renderOrder = 2; m.parent.add(ln); ln.position.copy(m.position); ln.quaternion.copy(m.quaternion); m.visible = false;
}
// the robots' dress packs: a black corrugated conduit from the base through the clamps on the links to the torch or
// the gun (the model's "dress"), redrawn every frame through where the clamps are, sagging between them
var DRV = new THREE.Vector3(), DRV2 = new THREE.Vector3(), DRV3 = new THREE.Vector3();
function rfxDress() {
var cur = units().map(function (U) { return U.arm && U.arm.userData; });
RFX.dressAll = (RFX.dressAll || []).filter(function (e) { if (cur.indexOf(e.ud) >= 0) return true; scene.remove(e.mesh); e.mesh.geometry.dispose(); return false; });   // (a robot gone: its cables too)
units().forEach(function (U) {
var ud = U.arm && U.arm.userData, D = U.model && U.model.dress; if (!ud || !D || !D.length) return;
if (!ud.dress) {
ud.dress = [];
var dm = new THREE.MeshStandardMaterial({ color: D[0].color || 0x141516, roughness: 0.6, metalness: 0.05 });
D.forEach(function (c) {
var an = c.anchors.map(function (a) { var ix = (ud.names || {})[lc(a[0])]; return ix == null ? null : { g: ud.joints[ix], p: new THREE.Vector3().fromArray(a[1]) }; });
if (an.some(function (a) { return !a || !a.g; })) return;
var NR = 480, M = 12, pos = new Float32Array(NR * M * 3), nrm = new Float32Array(NR * M * 3), idx = [];
for (var r = 0; r < NR - 1; r++) for (var k = 0; k < M; k++) { var a0 = r * M + k, b0 = r * M + (k + 1) % M, c0 = a0 + M, d0 = b0 + M; idx.push(a0, c0, b0, b0, c0, d0); }
var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setIndex(idx);
var mesh = new THREE.Mesh(g, dm); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; scene.add(mesh); RFX.dressAll.push({ ud: ud, mesh: mesh });
var keep = (c.keep || []).map(function (k) { var ix = (ud.names || {})[lc(k[0])]; return ix == null || !ud.joints[ix] ? null : { g: ud.joints[ix], a: new THREE.Vector3().fromArray(k[1]), b: new THREE.Vector3().fromArray(k[2]), r: +k[3] }; }).filter(Boolean);
ud.dress.push({ an: an, keep: keep, slack: c.slack || [], R: +c.radius || 0.02, mesh: mesh, NR: NR, M: M, ctrl: [] });
});
}
ud.dress.forEach(function (C) {
C.mesh.visible = U.arm.visible !== false;
if (!C.mesh.visible) return;
var W = C.an.map(function (a) { a.g.updateWorldMatrix(true, false); return a.g.localToWorld(DRV.copy(a.p)).clone(); }), ctrl = [W[0]];
for (var i = 1; i < W.length; i++) { var mid = W[i - 1].clone().add(W[i]).multiplyScalar(0.5); mid.y -= (+C.slack[i - 1] || 0); ctrl.push(mid, W[i]); }
var cv = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal'), L = cv.getLength();
var N = Math.max(40, Math.min(C.NR, Math.round(L / 0.011))), P = cv.getSpacedPoints(N - 1), M = C.M;
if (C.keep.length) {                                                   // kept clear of the arm: pushed out of its capsules
var KA = C.keep.map(function (k) { k.g.updateWorldMatrix(true, false); return [k.g.localToWorld(DRV.copy(k.a)).clone(), k.g.localToWorld(DRV.copy(k.b)).clone(), k.r + C.R + 0.012]; });
var push = function () {
for (var i = 3; i < N - 3; i++) for (var q = 0; q < KA.length; q++) {
var A = KA[q][0], B = KA[q][1], need = KA[q][2];
DRV2.subVectors(B, A); var t = Math.max(0, Math.min(1, DRV3.subVectors(P[i], A).dot(DRV2) / DRV2.lengthSq()));
DRV3.copy(A).addScaledVector(DRV2, t); var dd = P[i].distanceTo(DRV3);
if (dd < need) { if (dd < 1e-6) continue; P[i].sub(DRV3).multiplyScalar(need / dd).add(DRV3); }
}
};
for (var it = 0; it < 4; it++) {
push();
var Q = P.map(function (p) { return p.clone(); });
for (var i = 1; i < N - 1; i++) P[i].copy(Q[i]).multiplyScalar(0.5).addScaledVector(Q[i - 1], 0.25).addScaledVector(Q[i + 1], 0.25);
}
push();
}
var pos = C.mesh.geometry.attributes.position.array, nrm = C.mesh.geometry.attributes.normal.array;
var T = new THREE.Vector3(), n = new THREE.Vector3(), b = new THREE.Vector3();
for (var r = 0; r < N; r++) {
T.copy(P[Math.min(N - 1, r + 1)]).sub(P[Math.max(0, r - 1)]).normalize();
if (r === 0) { n.set(0, 1, 0); if (Math.abs(n.dot(T)) > 0.9) n.set(1, 0, 0); }
n.addScaledVector(T, -n.dot(T)).normalize(); b.crossVectors(T, n);
var rr = C.R * (1 + 0.075 * (r % 2 ? 1 : -1));                       // the conduit's corrugation
for (var k = 0; k < M; k++) {
var a = 2 * Math.PI * k / M, ca = Math.cos(a), sa = Math.sin(a), o = 3 * (r * M + k);
var nx = n.x * ca + b.x * sa, ny = n.y * ca + b.y * sa, nz = n.z * ca + b.z * sa;
pos[o] = P[r].x + rr * nx; pos[o + 1] = P[r].y + rr * ny; pos[o + 2] = P[r].z + rr * nz;
nrm[o] = nx; nrm[o + 1] = ny; nrm[o + 2] = nz;
}
}
C.mesh.geometry.setDrawRange(0, (N - 1) * M * 6);
C.mesh.geometry.attributes.position.needsUpdate = true; C.mesh.geometry.attributes.normal.needsUpdate = true;
});
});
}
function rfxStep(dt) {
rfxDress();
RFX.t += dt; RFX.loud = 0;
var live = {}, anyArc = false;
units().forEach(function (U) {
if (!U.arm || !U.arm.userData.fx) return;
var BH = (U.model && +U.model.hide) || 5;
U.arm.userData.fx.forEach(function (m, n) {
if (m.userData.fx === 'bead') { rfxBead(m, BH); return; }
var key = U.id + '#' + n, A_ = rfxArc(key); live[key] = 1;
var on = m.parent && m.parent.position.lengthSq() > 0.0025;
m.visible = on;
A_.glow.visible = on; if (!on) { A_.light.intensity = 0; A_.wasOn = false; return; }
anyArc = true;
m.getWorldPosition(RFXV);
if (Math.random() < dt * 6) A_.burst = 0.6 + Math.random() * 0.8;
A_.burst = Math.max(0, A_.burst - dt * 5);
var lvl = 0.35 + 0.65 * Math.random() * Math.random() + A_.burst;
A_.light.position.copy(RFXV); A_.light.intensity = 0.35 + 0.8 * lvl; rfxCrackle(A_, RFXV, lvl, dt);
A_.glow.position.copy(RFXV); var gs = 0.015 + 0.024 * lvl; A_.glow.scale.set(gs, gs, 1);
A_.glow.material.color.setRGB(0.75 + 0.25 * Math.random(), 0.85 + 0.15 * Math.random(), 1);
var S = rfxSparks(); A_.sparkAcc += dt * (400 + 900 * lvl);
while (A_.sparkAcc >= 1) { rfxEmitSpark(S, RFXV); A_.sparkAcc -= 1; }
var M = rfxSmoke(); A_.smokeAcc += dt * 9;
while (A_.smokeAcc >= 1) { rfxEmitSmoke(M, RFXV); A_.smokeAcc -= 1; }
});
});
Object.keys(RFX.arcs).forEach(function (k) { if (!live[k]) { RFX.arcs[k].glow.visible = false; RFX.arcs[k].light.intensity = 0; } });
rfxHiss(); rfxMotors(dt);
if (RFX.sparks) rfxStepSparks(RFX.sparks, dt);
if (RFX.smoke) rfxStepSmoke(RFX.smoke, dt);
rfxHall(); rfxCube(anyArc);
}
function rfxCube(busy) {
if (busy && RFX.cubeOk) return;
if (RFX.cube && RFX.cube.face === 5) RFX.cubeOk = true;
if (quality === 'fast') return;
var meshes = []; units().forEach(function (U) { if (U.arm && U.arm.userData.cube) meshes = meshes.concat(U.arm.userData.cube); });
if (!meshes.length) return;
var K = RFX.cube;
if (!K) {
var rt = new THREE.WebGLCubeRenderTarget(quality === 'high' ? 256 : 128, { type: THREE.HalfFloatType, generateMipmaps: false, minFilter: THREE.LinearFilter });
K = RFX.cube = { rt: rt, cam: new THREE.CubeCamera(0.05, 400, rt), face: 0, box: new THREE.Box3() };
scene.add(K.cam);
}
meshes.forEach(function (m) { if (m.material.envMap !== K.rt.texture) { m.material.envMap = K.rt.texture; m.material.envMapIntensity = 1.0; m.material.needsUpdate = true; } });
if (K.face === 0) {
K.box.makeEmpty(); var nd_ = 1e9; meshes.forEach(function (m) { var b_ = new THREE.Box3().setFromObject(m), d_ = b_.getCenter(RFXV).distanceTo(camera.position); if (d_ < nd_) { nd_ = d_; K.box.copy(b_); } });   // (two cars on the line: the one nearer the camera)
K.box.getCenter(K.cam.position); K.cam.updateMatrixWorld(true);
if (K.cam.coordinateSystem !== renderer.coordinateSystem) { K.cam.coordinateSystem = renderer.coordinateSystem; K.cam.updateCoordinateSystem(); }
}
var vis = meshes.map(function (m) { return m.visible; }), sa = renderer.shadowMap.autoUpdate, prt = renderer.getRenderTarget(), pf = renderer.getActiveCubeFace(), pm = renderer.getActiveMipmapLevel();
meshes.forEach(function (m) { m.visible = false; }); renderer.shadowMap.autoUpdate = false;
var al = Object.keys(RFX.arcs).map(function (k) { var a_ = RFX.arcs[k], v = [a_.light.intensity, a_.glow.visible]; a_.light.intensity = 0; a_.glow.visible = false; return v; });
var hid = []; [RFX.sparks && RFX.sparks.mesh].concat(RFX.smoke ? RFX.smoke.list.map(function (p) { return p.s; }) : []).concat(units().reduce(function (a, U) { return a.concat(U.arm && U.arm.userData.fx ? U.arm.userData.fx.filter(function (m) { return m.userData.fx === 'arc'; }) : []); }, [])).forEach(function (o) { if (o && o.visible) { o.visible = false; hid.push(o); } });
try { renderer.setRenderTarget(K.rt, K.face, 0); renderer.render(scene, K.cam.children[K.face]); } catch (e) { }
renderer.setRenderTarget(prt, pf, pm); renderer.shadowMap.autoUpdate = sa; meshes.forEach(function (m, n) { m.visible = vis[n]; });
Object.keys(RFX.arcs).forEach(function (k, n) { RFX.arcs[k].light.intensity = al[n][0]; RFX.arcs[k].glow.visible = al[n][1]; });
hid.forEach(function (o) { o.visible = true; });
if (++K.face === 6) { K.face = 0; K.rt.texture.needsPMREMUpdate = true; }
}
// the sign on the hall's long walls: the esacode logo and the name (the model's hall.logo), lit a little from behind
function rfxSign(hall, H, xc, zN, zS) {
var name = H.logo || 'EsaSim';
var c = document.createElement('canvas'); c.width = 2048; c.height = 512; var g = c.getContext('2d');
var tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
function paint(img) {
g.clearRect(0, 0, 2048, 512); g.font = '700 300px "Segoe UI", "Helvetica Neue", Arial, sans-serif'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff';
var tw = g.measureText(name).width, iw = img ? 440 : 0, gap = img ? 60 : 0, x = (2048 - iw - gap - tw) / 2;
if (img) g.drawImage(img, x, 36, 440, 440);
g.fillText(name, x + iw + gap, 270); tx.needsUpdate = true;
}
paint(null);
fromProject(['esacode_logo_white.png'], 'buffer', function (buf) { var im = new Image(); im.onload = function () { paint(im); }; im.src = URL.createObjectURL(new Blob([buf], { type: 'image/png' })); }, function () { });
var mat = new THREE.MeshStandardMaterial({ map: tx, transparent: true, roughness: 0.55, metalness: 0.1, emissive: 0xffffff, emissiveMap: tx, emissiveIntensity: 0.35, depthWrite: false });
[[zN + 0.03, 0], [zS - 0.03, Math.PI]].forEach(function (p) { var s = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.2), mat); s.position.set(xc, 2.6, p[0]); s.rotation.y = p[1]; hall.add(s); });
}
function rfxHall() {
var U0 = firstUnit(), H = U0 && U0.model && U0.model.hall;
if (!H || !H.x || !H.y) { if (RFX.hall) { RFX.hall.visible = false; ground.visible = true; } return; }
var key = JSON.stringify(H);
if (RFX.hallKey !== key) {
if (RFX.hall) scene.remove(RFX.hall);
RFX.hallKey = key;
var x0 = +H.x[0], x1 = +H.x[1], zN = -(+H.y[1]), zS = -(+H.y[0]), Hh = +H.height || HALL_H, xc = (x0 + x1) / 2, zc = (zN + zS) / 2, LX = x1 - x0, BD = zS - zN;
var T = hallTextures(), hall = RFX.hall = new THREE.Group(); hall.name = 'robot-hall';
var wallMat = new THREE.MeshStandardMaterial({ map: T.wall, roughness: 0.82, metalness: 0.15, emissiveMap: T.wall, emissive: 0x4a4f57, emissiveIntensity: 0.55 });   // (one-sided: from outside, the hall is open to look into)
[[xc, zN, 0, LX, 'n'], [xc, zS, Math.PI, LX, 's'], [x0, zc, Math.PI / 2, BD, 'w'], [x1, zc, -Math.PI / 2, BD, 'e']].forEach(function (w) {   // each faces the hall
var ds = (H.doors || []).filter(function (d) { return w[4] === 'w' ? Math.abs(d.x - x0) < 0.3 : w[4] === 'e' ? Math.abs(d.x - x1) < 0.3 : w[4] === 'n' ? Math.abs(d.y - (+H.y[1])) < 0.3 : Math.abs(d.y - (+H.y[0])) < 0.3; })
.map(function (d) { var c = w[4] === 'w' ? +d.y : w[4] === 'e' ? -d.y : w[4] === 'n' ? +d.x : -d.x; return [c - d.w / 2, c + d.w / 2, +d.h]; }).sort(function (a, b) { return a[0] - b[0]; });
var sh = new THREE.Shape(); sh.moveTo(-w[3] / 2, 0); ds.forEach(function (d) { sh.lineTo(d[0], 0); sh.lineTo(d[0], d[2]); sh.lineTo(d[1], d[2]); sh.lineTo(d[1], 0); }); sh.lineTo(w[3] / 2, 0); sh.lineTo(w[3] / 2, Hh); sh.lineTo(-w[3] / 2, Hh); sh.closePath();
var m = new THREE.Mesh(new THREE.ShapeGeometry(sh), wallMat); m.receiveShadow = true; m.position.set(w[0], 0, w[1]); m.rotation.y = w[2]; hall.add(m);
});
(H.doors || []).forEach(function (d) {                         // outside each door: a concrete apron the rail runs out on
var out = d.x < xc ? -1 : 1, A = +H.apron || 8, wd = Math.max(8, d.w + 4);
var ap = new THREE.Mesh(new THREE.PlaneGeometry(A, wd), new THREE.MeshStandardMaterial({ color: 0x46494d, roughness: 0.95, metalness: 0 })); ap.rotation.x = -Math.PI / 2; ap.position.set(+d.x + out * A / 2, -0.002, -d.y); ap.receiveShadow = true; hall.add(ap);
});
rfxSign(hall, H, xc, zN, zS);
var rg = new THREE.PlaneGeometry(LX, BD); rg.rotateX(Math.PI / 2);                                 // the roof, seen from below only
var rt = T.roof.clone(); rt.needsUpdate = true; rt.repeat.set(LX / 12, BD / 12);
var roof = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: rt, roughness: 0.9, metalness: 0.2 })); roof.position.set(xc, Hh, zc); hall.add(roof);
var lg = new THREE.PlaneGeometry(0.32, 2.6), hg = new THREE.PlaneGeometry(3.4, 5.6), at = [], M = new THREE.Matrix4();
lg.rotateX(Math.PI / 2); hg.rotateX(Math.PI / 2);
for (var x = x0 + 3; x <= x1 - 2.5; x += 5) for (var z = zN + 2.5; z <= zS - 2; z += 4.5) at.push([x, z]);
var lm = new THREE.MeshBasicMaterial({ toneMapped: false }); lm.color.setRGB(2.6, 2.45, 2.2);
var lamp = new THREE.InstancedMesh(lg, lm, at.length), halo = new THREE.InstancedMesh(hg, new THREE.MeshBasicMaterial({ map: T.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), at.length);
at.forEach(function (p, i) { lamp.setMatrixAt(i, M.makeTranslation(p[0], Hh - 0.3, p[1])); halo.setMatrixAt(i, M.makeTranslation(p[0], Hh - 0.02, p[1])); });
lamp.frustumCulled = halo.frustumCulled = false; hall.add(lamp, halo);
var WT = hmWhTex(), ft = WT.whFloor.clone(); ft.userData = WT.whFloor.userData; ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(LX / 6, BD / 6); ft.needsUpdate = true;   // the Spot warehouse's floor: blue-grey epoxy, 6 m between saw cuts, scuffs that blur its reflection
var fm = hmPbr(new THREE.MeshStandardMaterial({ map: ft, color: new THREE.Color(1, 1, 1).multiplyScalar(+H.floor_light || 1.4), roughness: +H.floor_roughness || 0.42, metalness: 0, envMapIntensity: 0.45 }));   // (a little lighter than the warehouse's)
var fl = new THREE.Mesh(new THREE.PlaneGeometry(LX, BD), fm); fl.rotation.x = -Math.PI / 2; fl.position.set(xc, 0, zc); fl.receiveShadow = true; hall.add(fl);
scene.add(hall);
var es = new THREE.Scene(); es.background = new THREE.Color(0x232a33);
var eb = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5, 5.2) });
at.forEach(function (p) { var b = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 2.6), eb); b.position.set(p[0], Hh - 0.3, p[1]); es.add(b); });
var efl = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ color: 0x55585c })); efl.rotation.x = -Math.PI / 2; es.add(efl);
[[xc, zN, 0, LX], [xc, zS, Math.PI, LX], [x0, zc, Math.PI / 2, BD], [x1, zc, -Math.PI / 2, BD]].forEach(function (w) { var m = new THREE.Mesh(new THREE.PlaneGeometry(w[3], Hh), new THREE.MeshBasicMaterial({ color: 0x3a434e, side: THREE.DoubleSide })); m.position.set(w[0], Hh / 2, w[1]); m.rotation.y = w[2]; es.add(m); });
if (RFX.hallEnv) RFX.hallEnv.dispose();
RFX.hallEnv = pmrem.fromScene(es, 0.02);
if (quality === 'high' && !RFX.glow && !composer) {
var msaa = new THREE.WebGLRenderTarget(256, 256, { type: THREE.HalfFloatType, samples: Math.min(8, renderer.capabilities.maxSamples || 4) });   // (antialiased: the bloom pass would lose it)
composer = new A.EffectComposer(renderer, msaa); composer.addPass(new A.RenderPass(scene, camera));
composer.addPass(cleanPass()); RFX.glow = new A.UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.35, 1.3); composer.addPass(RFX.glow); composer.addPass(new A.OutputPass());
resize();
}
}
RFX.hall.visible = true; ground.visible = false; grid.visible = false; grid10.visible = false;
if (scene.environment !== RFX.hallEnv.texture) {
if (sky) { scene.remove(sky); sky = null; }
scene.background = new THREE.Color(0x0c1016); scene.fog = new THREE.Fog(0x0c1016, 60, 140);
scene.environment = RFX.hallEnv.texture; renderer.toneMappingExposure = 0.95;
hemi.intensity = 0.5; hemi.color.set(0xe6eeff); hemi.groundColor.set(0x3a3328); sun.intensity = 2.1; sun.color.set(0xfff4e6);
}
scene.environmentIntensity = 0.8;
}
function placeUnit(U) {
if (!U.holder) return;
var o = ROBOT.objects && (ROBOT.objects.objects || []).filter(function (x) { return x.kind === 'robot' && (lc(x.robot || x.id) === U.id || lc(x.robot || x.id) === lc(U.name)); })[0];
var su = ROBOT.objects ? unitScale(ROBOT.objects.units) : 0.001, mu = unitScale(U.model && U.model.units);
var pos = o && o.pos ? o.pos.map(function (v) { return v * su; }) : U.model && U.model.base && U.model.base.xyz ? U.model.base.xyz.map(function (v) { return v * mu; }) : [ROBOT.order.indexOf(U.id) * 0.8, 0, 0];
var rpy = o && o.rpy ? o.rpy : U.model && U.model.base && U.model.base.rpy ? U.model.base.rpy : [0, 0, 0];
U.holder.position.set(pos[0] || 0, pos[1] || 0, pos[2] || 0); U.holder.rotation.set(rpy[0] || 0, rpy[1] || 0, rpy[2] || 0, 'ZYX');
}
function toolFor(U, sc) {
var t = (sc && sc.objects || []).filter(function (o) { return o.kind === 'tool' && (o.robot == null || lc(o.robot) === U.id || lc(o.robot) === lc(U.name)); });
return t.filter(function (o) { return o.robot != null; })[0] || (U === firstUnit() ? t[0] : null) || null;
}
function loadRobot(f) {
var key = f.name + '#' + f.id, stem = lc(f.name.replace(/\.robot\.json(\.gz)?$/i, ''));
var have = units().filter(function (U) { return U.key === key || U.file === stem; })[0];
if (have && (have.key === key || have.busy)) return;
var U = have || { id: stem, file: stem, key: '', model: null, arm: null, ghost: null, holder: null, td: null, name: stem, busy: false };
if (!have) { ROBOT.units[U.id] = U; ROBOT.order.push(U.id); }
U.busy = true;
ctx.files.buffer(f).then(function (buf) {
if (/\.gz$/i.test(f.name)) return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
return new TextDecoder().decode(buf);
}).then(function (text) {
var model = JSON.parse(text);
if (!model || !Array.isArray(model.joints)) throw new Error('not an esasim.robot/1 model');
var w = worldGroup();
if (!U.holder) { U.holder = new THREE.Group(); w.add(U.holder); }
if (U.arm) U.holder.remove(U.arm); if (U.ghost) { U.holder.remove(U.ghost); U.ghost = null; }
U.model = model; U.key = key; U.name = model.robot || f.name.replace(/\.robot\.json(\.gz)?$/i, '');
U.arm = buildRobot(model, false); U.holder.add(U.arm);
placeUnit(U);
if (ROBOT.objects) setTool(U.arm, toolFor(U, ROBOT.objects), false);
var F = feedFor(U); poseRobot(U.arm, F && F.samples.length ? F.samples[F.samples.length - 1] : null);
ROBOT.fitted = false;
ctx.status('');
}).catch(function (e) { ctx.status('Could not load the robot\'s 3D model (' + f.name + '): ' + e.message); })
.then(function () { U.busy = false; });
}
function setObjects(sc) {
var key = JSON.stringify(sc); if (key === ROBOT.sceneKey) return; ROBOT.sceneKey = key; ROBOT.objects = sc;
var w = worldGroup(), u = unitScale(sc.units);
if (ROBOT.objGroup) { w.remove(ROBOT.objGroup); ROBOT.objGroup.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); }
var g = ROBOT.objGroup = new THREE.Group(); g.scale.setScalar(u); w.add(g);
w.position.y = -(+sc.floor || 0) * u;
ROBOT.images = {};
(sc.objects || []).forEach(function (o) {
var col = o.color || 0x9aa3b2, m = null;
if (o.kind === 'box' && o.center && o.size) {
m = new THREE.Mesh(new THREE.BoxGeometry(o.size[0], o.size[1], o.size[2]), std(col, o.roughness != null ? o.roughness : 0.8, 0.05));
m.position.set(o.center[0], o.center[1], o.center[2]); m.castShadow = o.shadow !== false; m.receiveShadow = true;
} else if (o.kind === 'quad' && o.corners && o.corners.length === 4) {
var c = o.corners, geo = new THREE.BufferGeometry(), lift = +o.lift || 0.3;
var v = [c[3], c[2], c[1], c[0]].map(function (p) { return [p[0], p[1], (p[2] || 0) + lift]; });
geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([].concat(v[0], v[1], v[2], v[3])), 3));
geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
geo.setIndex([0, 1, 2, 0, 2, 3]); geo.computeVertexNormals();
m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: o.image_channel ? 0xffffff : col, roughness: 0.9, side: THREE.DoubleSide }));
m.receiveShadow = true;
if (o.image_channel) { ROBOT.images[o.image_channel] = m; ROBOT.imageUrl[o.image_channel] = ''; }
} else if (o.kind === 'camera' && o.pos && o.forward) {
m = new THREE.Group();
var f = new THREE.Vector3().fromArray(o.forward).normalize(), up = new THREE.Vector3().fromArray(o.up || [0, 0, 1]).normalize();
var right = new THREE.Vector3().crossVectors(f, up).normalize(), d = +o.frustum || 120, h = Math.tan((o.hfov || 70) * Math.PI / 360) * d, vv = h / (o.aspect || 1.78);
var p0 = new THREE.Vector3().fromArray(o.pos), pts = [], seg = [];
[[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(function (s) { pts.push(p0.clone().addScaledVector(f, d).addScaledVector(right, s[0] * h).addScaledVector(up, s[1] * vv)); });
pts.forEach(function (q, i) { seg.push(p0, q, q, pts[(i + 1) % 4]); });
m.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), new THREE.LineBasicMaterial({ color: 0x2e7dff })));
var body = new THREE.Mesh(new THREE.BoxGeometry(90, 30, 30), std(0x222831, 0.5, 0.2)); body.position.copy(p0); body.lookAt(p0.clone().add(f)); body.castShadow = true; m.add(body);
if (o.stand_to != null) {
var len = p0.z - (+o.stand_to);
if (len > 20) { var pole = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, len, 12), std(0x5a6270, 0.4, 0.4)); pole.rotation.x = Math.PI / 2; pole.position.set(p0.x + 40, p0.y, +o.stand_to + len / 2); pole.castShadow = true; m.add(pole); }
}
}
if (m) { m.userData.nofit = o.fit === false; g.add(m); }
});
units().forEach(function (U) { placeUnit(U); setTool(U.arm, toolFor(U, sc), false); setTool(U.ghost, toolFor(U, sc), true); });
ROBOT.fitted = false;
}
function setImage(channel, url) {
var mesh = ROBOT.images[channel]; if (!mesh || ROBOT.imageUrl[channel] === url) return;
ROBOT.imageUrl[channel] = url;
var img = new Image();
img.onload = function () {
if (ROBOT.imageUrl[channel] !== url) return;
var t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true;
if (mesh.material.map) mesh.material.map.dispose();
mesh.material.map = t; mesh.material.needsUpdate = true;
};
img.src = url;
}
function feedRobot(stream) {
var newest = {};
stream.forEach(function (it) {
if (!it || !it.data || typeof it.data !== 'object') return;
var d = it.data;
if (typeof d.image === 'string' && ROBOT.images[it.channel] !== undefined) { if (!newest[it.channel] || it.t >= newest[it.channel].t) newest[it.channel] = it; return; }
var key = (it.node || '') + '|' + it.channel + '|' + it.t + '|' + (it.seq || '');
if (ROBOT.seen[key]) return;
if (it.channel === JCH || it.channel === GCH) {
var s = jointsOf(d); if (!s) return; ROBOT.seen[key] = 1;
s.t = it.t;
var F = ROBOT.feed[s.robot] = ROBOT.feed[s.robot] || { samples: [], ghostSamples: [] };
(it.channel === JCH ? F.samples : F.ghostSamples).push(s);
} else if (it.channel === SCH && Array.isArray(d.objects)) { ROBOT.seen[key] = 1; if (!ROBOT.objT || it.t >= ROBOT.objT) { ROBOT.objT = it.t; setObjects(d); } }
else if (/_check$/.test(it.channel)) { ROBOT.seen[key] = 1; ROBOT.check = d; }
});
Object.keys(ROBOT.feed).forEach(function (k) { var F = ROBOT.feed[k]; [F.samples, F.ghostSamples].forEach(function (L) { L.sort(function (a, b) { return a.t - b.t; }); if (L.length > 8000) L.splice(0, L.length - 6000); }); });
Object.keys(newest).forEach(function (ch) { setImage(ch, newest[ch].data.image); });
stream.forEach(function (it) { if (it && it.data && typeof it.data.image === 'string' && ROBOT.images[it.channel] && !ROBOT.imageUrl[it.channel]) setImage(it.channel, it.data.image); });
units().forEach(function (U) {
var F = feedFor(U);
if (F && F.ghostSamples.length && !U.ghost && U.model) { U.ghost = buildRobot(U.model, true); U.holder.add(U.ghost); if (ROBOT.objects) setTool(U.ghost, toolFor(U, ROBOT.objects), true); }
});
}
function feedFor(U) {
var F = ROBOT.feed[U.id] || ROBOT.feed[lc(U.name)];
if (F || U !== firstUnit()) return F || null;
if (ROBOT.feed['']) return ROBOT.feed[''];
var known = {}; units().forEach(function (V) { known[V.id] = 1; known[lc(V.name)] = 1; });
var other = Object.keys(ROBOT.feed).filter(function (k) { return !known[k]; })[0];
return other != null ? ROBOT.feed[other] : null;
}
// the car's joints (car:..., a turn about an axis "far" metres away for the moves along and across the rail): when the
// car jumps more than 1.5 m from one sample to the next (the next car put at the start, outside behind a closed door),
// they go there at once instead of sliding the whole rail
function rfxCarJumps(r, qa, qb) {
var ud = r.userData; if (ud.carJ === undefined) {
ud.carJ = []; var nm = ud.names || {}, far = +(ud.far || 0) || 1000;
Object.keys(nm).forEach(function (k) { var m = /^(car\d*):x$/.exec(k); if (!m) return;
var re = new RegExp('^' + m[1] + ':'); ud.carJ.push({ x: nm[k], far: far, all: Object.keys(nm).filter(function (kk) { return re.test(kk); }).map(function (kk) { return nm[kk]; }) }); });
}
var out = null;
ud.carJ.forEach(function (C) {
if (qa[C.x] == null || qb[C.x] == null) return;
if (Math.abs(qb[C.x] - qa[C.x]) * (ud.rad ? 1 : Math.PI / 180) * C.far < 1.5) return;
out = out || {}; C.all.forEach(function (i) { out[i] = true; });
});
return out;
}
function sampleAt(L, t, r) {
if (!L.length) return null;
if (t <= L[0].t) return L[0];
for (var i = L.length - 1; i >= 0; i--) if (L[i].t <= t) {
var a = L[i], b = L[i + 1]; if (!b || b.t - a.t > 2) return a;
var k = (t - a.t) / (b.t - a.t), qa = vecOf(a, r) || [], qb = vecOf(b, r) || [], n = Math.max(qa.length, qb.length), q = new Array(n);
var snap = rfxCarJumps(r, qa, qb);                                 // a car put back at the start: no slide along the rail
for (var j = 0; j < n; j++) { var x = qa[j], y = qb[j]; q[j] = x == null ? (y == null ? null : y) : y == null ? x : (snap && snap[j]) ? (k < 0.5 ? x : y) : x + (y - x) * k; }
return { q: q, named: null, rad: a.rad };
}
return L[0];
}
function stepRobot(dt) {
if (!ROBOT.fitted && anyArm() && !flown) { ROBOT.fitted = true; fitView(); }
if (anyArm() && ROBOT.lit !== (ROBOT.sceneKey || '-') + ROBOT.order.length) { ROBOT.lit = (ROBOT.sceneKey || '-') + ROBOT.order.length; robotLight(); }
var rows = [], newestAll = 0, tdShow = null, U0 = firstUnit();
units().forEach(function (U) {
var F = feedFor(U), S = F ? F.samples : [];
if (!S.length) return;
var newest = S[S.length - 1].t; newestAll = Math.max(newestAll, newest);
if (U.td == null) U.td = Math.max(S[0].t, newest - LAG);
if (playing) U.td += dt * speed;
if (newest - U.td > 4) U.td = newest - LAG;
if (U.td > newest) U.td = newest;
for (var i = S.length - 1; i > 0; i--) if (S[i - 1].t <= U.td) { if (S[i].t - S[i - 1].t > 2 && U.td < S[i].t) U.td = S[i].t; break; }
if (U.arm) {
var s = sampleAt(S, U.td, U.arm);
poseRobot(U.arm, s);
if (U.ghost) poseRobot(U.ghost, sampleAt(F.ghostSamples, U.td, U.ghost));
var q = vecOf(s, U.arm) || [], shown = q.slice(0, 16).map(function (v) { return v == null ? '·' : v.toFixed(1); }).join('  ') + (q.length > 16 ? '  … (' + q.length + ')' : '');
if (rows.length < 6) rows.push([ROBOT.order.length > 1 ? esc(U.name) : 'joints', shown]);
}
if (tdShow == null || U === U0) tdShow = U.td;
});
if (!newestAll) { hudTitle.textContent = U0 ? U0.name : 'Robot'; hudRows.innerHTML = '<span style="opacity:.65">joints</span><span>waiting…</span>'; return; }
var c = ROBOT.check;
if (c) Object.keys(c).slice(0, 4).forEach(function (k) { rows.push([esc(k.replace(/_/g, ' ')), esc(c[k])]); });
hudRows.innerHTML = rows.map(function (r) { return '<span style="opacity:.65">' + r[0] + '</span><span>' + r[1] + '</span>'; }).join('');
var ghost = units().some(function (U) { return !!U.ghost; });
hudTitle.innerHTML = '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:' + (newestAll > Date.now() / 1000 - 10 ? '#ff4d5e' : '#7b8494') + ';margin-right:6px;vertical-align:1px"></span>'
+ esc(ROBOT.order.length > 1 ? ROBOT.order.length + ' robots' : (U0 && U0.name) || 'Robot') + (ghost ? ' · twin in blue' : '');
if (tdShow != null) tm.textContent = 'live · ' + new Date(tdShow * 1000).toLocaleTimeString();
}
function robotLight() {
var dark = ctx.theme === 'dark', env = P.environment || 'outdoor';
ground.material.color.set(env === 'night' ? 0x2a2e35 : dark ? 0x5a5f68 : 0x80858d); ground.material.needsUpdate = true;
grid.material.opacity = 0.1; grid10.material.opacity = 0.22;
if (env === 'studio') { scene.environmentIntensity = 0.7; sun.intensity = 2.8; hemi.intensity = 0.3; sun.userData.dir = new THREE.Vector3(-0.45, 1.0, 0.55); }
sun.shadow.bias = -0.0001; sun.shadow.normalBias = 0.0025;
var b = robotBox();
if (b.isEmpty()) return;
b.expandByScalar(0.35);
fitShadow(b.getCenter(new THREE.Vector3()), Math.max(0.8, b.getSize(new THREE.Vector3()).length() / 2));
}
function robotBox() {
var b = new THREE.Box3(); if (!ROBOT.world) return b;
ROBOT.world.updateMatrixWorld(true);
units().forEach(function (U) { if (U.arm) b.expandByObject(U.arm); });
if (ROBOT.objGroup) ROBOT.objGroup.children.forEach(function (o) { if (!o.userData.nofit) b.expandByObject(o); });
return b;
}
function fitBox(box, minR) {
if (box.isEmpty()) return;
var c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3()), r = Math.max(minR || 2, s.length() / 2);
controls.target.copy(c);
camera.position.copy(c).add(new THREE.Vector3(r * 0.95, r * 0.42, r * 1.25));
camera.near = Math.max(0.02, r / 500); camera.far = Math.max(20000, r * 80); camera.updateProjectionMatrix();
fitShadow(c, r);
}
function fitView() {
if (mode === 'rocket') { RK.camReset = true; return; }
if (mode === 'car') { CR.shot = null; return; }
if (mode === 'village') { VG.shot = null; return; }
if (mode === 'humanoid') { HM.shot = null; return; }
if (mode === 'fleet') return fleetFit();
if (mode === 'files' && FILES.root) { FILES.root.quaternion.identity(); FILES.root.updateMatrixWorld(true); }
if (mode === 'robot') { var rb = robotBox(); if (!rb.isEmpty()) {
fitBox(rb.expandByScalar(0.3), 0.8);
var rc = rb.getCenter(new THREE.Vector3()), rr = rb.getSize(new THREE.Vector3()).length() / 2, fv = Math.min(camera.fov, camera.fov * camera.aspect) * Math.PI / 360;
var dir = camera.position.clone().sub(rc).normalize(), want = rr / Math.sin(Math.max(0.1, fv));
if (camera.position.distanceTo(rc) < want) camera.position.copy(rc).addScaledVector(dir, want);
return; } }
var box = new THREE.Box3(), run = runs[current];
if (run) {
var idx = fieldIndex(run);
run.frames.forEach(function (f) { Object.keys(entities).forEach(function (id) { if (idx[id + '.x'] != null) box.expandByPoint(v3(f[idx[id + '.x']], f[idx[id + '.y']] || 0, f[idx[id + '.z']] || 0)); }); });
box.expandByScalar(1.5);
return fitBox(box);
}
trailGroup.children.forEach(function (l) { box.expandByObject(l); });
Object.keys(entities).forEach(function (k) { box.expandByObject(entities[k]); });
if (box.isEmpty()) box.set(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(5, 5, 5));
fitBox(box, trailGroup.children.length ? 2 : 0.3);
}
function fitShadow(c, r) {
var dir = (sun.userData.dir || new THREE.Vector3(0.5, 0.8, 0.4)).clone().normalize();
sun.position.copy(c).add(dir.multiplyScalar(r < 1.5 ? r * 6 + 3 : r * 4 + 20)); sun.target.position.copy(c);
var sc = sun.shadow.camera, e = Math.max(r < 1.5 ? 1 : 8, r * 1.4);
sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e; sc.near = r < 1.5 ? 0.05 : 0.5; sc.far = r * 10 + 80; sc.updateProjectionMatrix();
}
var mode = null, shownKey = '', userMode = null;
var IDLE = { g: null, on: false, logo: null, want: false };
function projectAsset(names) { return ctx.assets && ctx.assets.find ? ctx.assets.find(names) : null; }
function fromProject(names, as, ok, none) {
var a = projectAsset(names); if (!a) { none(); return; }
(as === 'json' ? ctx.assets.json(a) : as === 'url' ? ctx.assets.url(a) : ctx.assets.buffer(a)).then(ok, function (e) { ctx.status('The project\'s asset ' + a.name + ' could not be read (' + (e && e.message || e) + '): the view\'s own copy is used'); none(); });
}
var ESALOGO = { img: undefined, wait: [] };
function esaLogo(cb) {
if (ESALOGO.img !== undefined) return cb(ESALOGO.img);
ESALOGO.wait.push(cb); if (ESALOGO.wait.length > 1) return;
var done = function (img) { ESALOGO.img = img; var w = ESALOGO.wait; ESALOGO.wait = []; w.forEach(function (f) { f(img); }); };
var use = function () {
var L = window.ESACODE_LOGO; if (!L || !(L.svg || L.png)) return done(null);
var img = new Image(); img.onload = function () { done(img); }; img.onerror = function () { done(null); };
img.src = L.png || ('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(L.svg));
};
fromProject(['esacode-logo.png', 'esacode-logo.svg', 'logo.png'], 'url', function (u) { window.ESACODE_LOGO = { png: u }; use(); }, function () {
if (window.ESACODE_LOGO) return use();
var sc = document.createElement('script'); sc.src = 'models/esacode-logo.js?v=1'; sc.onload = use; sc.onerror = function () { done(null); }; document.head.appendChild(sc);
});
}
function esaHexagon(x, cx, cy, r) {
x.save(); x.translate(cx, cy); x.lineJoin = 'round';
x.beginPath(); for (var i = 0; i < 6; i++) { var a = Math.PI / 6 + i * Math.PI / 3; x[i ? 'lineTo' : 'moveTo'](r * Math.cos(a), r * Math.sin(a)); } x.closePath();
x.fillStyle = '#2f4ae0'; x.fill(); x.lineWidth = r * 0.08; x.strokeStyle = '#ffffff'; x.stroke(); x.restore();
}
function idleBuild() {
var g = IDLE.g = new THREE.Group(); g.name = 'idle';
[[1, 0, 0, 0xe0453a], [0, 0, -1, 0x2fa84f], [0, 1, 0, 0x2f6bf0]].forEach(function (a) {
var dir = new THREE.Vector3(a[0], a[1], a[2]), L = 1.1, m = std(a[3], 0.5, 0.1, { emissive: a[3], emissiveIntensity: 0.25 });
var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, L, 12), m), tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 16), m);
var q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
shaft.quaternion.copy(q); tip.quaternion.copy(q);
shaft.position.copy(dir.clone().multiplyScalar(L / 2)); tip.position.copy(dir.clone().multiplyScalar(L + 0.06));
g.add(shaft, tip);
});
var em = IDLE.logo = new THREE.Group(); em.position.y = 0.006; em.rotation.y = Math.atan2(2.4, 3.9); g.add(em);
var face = function (tex) {
while (em.children.length) em.remove(em.children[0]);
var asp = tex.image && tex.image.width ? tex.image.height / tex.image.width : 1, w = 1.6, h = w * asp;
var mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.04, roughness: 0.5, metalness: 0.05, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.12, polygonOffset: true, polygonOffsetFactor: -2 });
var f = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); f.rotation.x = -Math.PI / 2; f.receiveShadow = true;
em.add(f);
};
var fromCanvas = function (draw, w, h) {
var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'));
var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};
var draw = function (img) {
if (!img) return face(fromCanvas(function (x) { esaHexagon(x, 256, 256, 230); }, 512, 512));
var W = 1024, H = Math.max(1, Math.round(W * (img.naturalHeight || img.height || 1) / (img.naturalWidth || img.width || 1)));
face(fromCanvas(function (x) { x.drawImage(img, 0, 0, W, H); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#1f2836'; x.fillRect(0, 0, W, H); }, W, H));
};
draw(null);
esaLogo(function (img) { if (img) draw(img); });
scene.add(g);
}
function idleShow(on) {
if (on === IDLE.on) return;
IDLE.on = on;
if (on && !IDLE.g) idleBuild();
if (IDLE.g) IDLE.g.visible = on;
if (on) {
if (!flown) { controls.target.set(0, 0.25, 0); camera.position.set(2.4, 3.3, 3.9); controls.update(); }
}
}
function load() { IDLE.want = false; load0(); idleShow(!!IDLE.want); }
function load0() {
var ports = ctx.ports(), files = [], stream = [];
ports.forEach(function (p) { var x = ctx.input(p); files = files.concat(x.files); stream = stream.concat(x.stream); });
feedOverlays(stream);
if (hmItems(stream).length || mode === 'humanoid') {
if (mode !== 'humanoid') enterHumanoid();
hmFeed(stream);
return;
}
if (vgItems(stream).length || mode === 'village') {
if (mode !== 'village') enterVillage();
vgFeed(stream);
ctx.status(vgStatus());
return;
}
if (carItems(stream).length || mode === 'car') {
if (mode !== 'car') enterCar();
carFeed(stream);
var carFile = files.filter(function (f) { return /\.(glb|gltf)$/i.test(f.name); })[0];
if (!carFile) crBuiltin();
if (carFile && CR.modelId !== carFile.id) { CR.modelId = carFile.id; parseFile(carFile).then(function (obj) { if (obj) { CR.custom = obj; if (CR.car) crUseModel(CR.car, obj); } }).catch(function (e) { ctx.status('Could not read the car model ' + carFile.name + ': ' + e.message); }); }
ctx.status(carStatus());
return;
}
if (rocketItems(stream).length || mode === 'rocket' || (rocketish && !stream.length && !files.length)) {
if (mode !== 'rocket') enterRocket();
rocketFeed(stream);
ctx.status(rocketStatus());
return;
}
if (fleetItems(stream) || mode === 'fleet') {
if (mode !== 'fleet') enterFleet();
fleetModels(files);
fleetFeed(stream);
if (!FLEET.lay) ctx.status(liveRun() ? 'The warehouse is starting…' : 'Waiting for the warehouse…');
else ctx.status('');
return;
}
var robots = files.filter(isRobotFile), rItems = robotItems(stream);
if (!robots.length && rItems.length && ctx.assets && ctx.assets.list) robots = ctx.assets.list().filter(isRobotFile);
var softFiles = files.filter(function (f) { return /softbody\.json$/i.test(f.name); });
FILES.soft = softFiles;
var sceneFile = files.filter(function (f) { return /\.json$/i.test(f.name) && !isRobotFile(f) && !/softbody\.json$/i.test(f.name); })[0];
var meshes = files.filter(function (f) { return /\.(glb|gltf|obj|stl|ply)$/i.test(f.name); });
if (robots.length || rItems.length) {
if (mode !== 'robot') {
stopLive(); clearEntities(); runs = []; runSel.style.display = 'none'; showLiveBar(true); modeBtn.style.display = 'none';
$('.cam').style.display = 'none'; mode = 'robot'; shownKey = 'robot';
}
feedRobot(stream);
robots.forEach(loadRobot);
if (!robots.length) ctx.status(ctx.sample ? 'The robot appears here when the flow runs: the 3D model comes from a block such as xArm 6 model, wired to this view.'
: 'Waiting for the robot\'s 3D model: wire the Robot model output of a block such as xArm 6 model to this view, and run the flow.');
else if (!anyArm()) ctx.status('Loading the robot\'s 3D model…');
return;
}
var poses = poseItems(stream);
if (poses.length) feedLive(poses);
var hasLive = LIVE.samples.length > 0, hasScene = !!sceneFile;
var fresh = poses.length && (Date.now() / 1000 - (+poses[poses.length - 1].t || 0)) < 30;
var want = userMode === 'live' && hasLive ? 'live' : userMode === 'replay' && hasScene ? 'replay'
: hasScene && !(fresh && !liveDone()) ? 'replay' : hasLive ? 'live' : meshes.length ? 'files' : null;
LIVE.pendingReplay = want === 'live' && hasScene && !userMode;
modeBtn.style.display = hasLive && hasScene ? '' : 'none';
modeBtn.textContent = want === 'live' ? 'Replay' : 'Live';
modeBtn.title = want === 'live' ? 'Show the recorded runs' : 'Show the live landing';
var key = want + '|' + (sceneFile ? sceneFile.id : '') + '|' + meshes.map(function (f) { return f.id; }).join(',') + '|' + softFiles.map(function (f) { return f.id; }).join(',');
if (want === 'live') {
if (mode !== 'live') { startLive(meshes); showLiveBar(true); }
mode = 'live'; shownKey = key; ctx.status(''); return;
}
if (key === shownKey) return;
stopLive(); showLiveBar(false); mode = want; shownKey = key;
if (want === 'replay') return ctx.files.json(sceneFile).then(function (sc) {
if (sc && sc.runs && !sc.entities) sc = Object.assign({ entities: [{ id: 'pad', shape: 'cylinder', radius: 1, height: 0.08, decal: 'H' }, { id: 'drone', shape: 'quadrotor', size: 0.55 }] }, sc);
loadScene(sc || {});
if (meshes.length) attachModels(meshes);
}).catch(function (e) { shownKey = ''; ctx.status('Could not read the scene: ' + e.message); });
if (want === 'files') return loadFiles(meshes);
var fleetSrc = (ctx.sources || []).filter(function (s) { return /fleet|warehouse/i.test(s.block + ' ' + s.name) && s.port === 'telemetry'; })[0];
if (fleetSrc && !stream.length) { barEl.style.display = 'none'; return ctx.status('The fleet appears here when the blueprint runs: ' + fleetSrc.name + ' streams the world and its robots, and the bar below it changes the run while it goes on.'); }
var robotSrc = (ctx.sources || []).filter(function (s) { return (s.formats || []).indexOf('gz') >= 0 || /robot|xarm|\barm\b/i.test(s.block + ' ' + s.name); })[0];
if (robotSrc && !stream.length) { robotLight(); tl.style.display = 'none'; barEl.style.display = 'none'; }
if (robotSrc && !stream.length) return ctx.status('The robot appears here when the blueprint runs: its 3D model comes from ' + robotSrc.name + ', its pose from the blocks that drive it.');
if (!stream.length) { IDLE.want = true; barEl.style.display = 'none'; ctx.status(''); return; }
ctx.status('Waiting for positions: a stream item such as {"drone": [x, y, z]}, or a scene.');
}
function liveDone() { var S = LIVE.samples; return !S.length || (LIVE.ct != null && LIVE.ep === S[S.length - 1].ep && LIVE.ct >= S[S.length - 1].t - 0.05); }
function showLiveBar(on) {
tl.style.display = on ? 'none' : ''; runSel.style.display = on ? 'none' : runSel.style.display;
if (on) { barEl.style.display = 'flex'; tm.style.minWidth = '110px'; }
}
var modeBtn = document.createElement('button');
modeBtn.style.cssText = 'all:unset;cursor:pointer;padding:2px 8px;border:1px solid #2a303b;border-radius:6px;display:none';
barEl.insertBefore(modeBtn, $('.cam'));
modeBtn.onclick = function () { userMode = mode === 'live' ? 'replay' : 'live'; load(); };
var OVL = { last: {}, numbers: [], ctls: [], pick: null, toasts: [] };
var ovl = document.createElement('div');
ovl.innerHTML = '<style>.v3n{display:flex;gap:8px;flex-wrap:wrap}.v3n div{background:rgba(10,14,22,.62);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:6px 11px;min-width:96px}'
+ '.v3n span{display:block;font-size:10.5px;opacity:.62;text-transform:uppercase;letter-spacing:.5px}.v3n b{display:block;font-size:20px;font-weight:650;font-variant-numeric:tabular-nums}'
+ '.v3e{display:flex;flex-direction:column;gap:6px}.v3e div{background:rgba(10,14,22,.66);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:6px 9px}.v3e em{font-style:normal;opacity:.55;margin-right:6px}'
+ '.v3c{display:none;flex-wrap:wrap;gap:6px 12px;align-items:center;background:rgba(10,14,22,.7);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:6px 10px;pointer-events:auto}'
+ '.v3c label{display:flex;align-items:center;gap:6px;opacity:.95}.v3c label>span{opacity:.7}.v3c output{min-width:34px;font-variant-numeric:tabular-nums;font-weight:600}'
+ '.v3c input[type=range]{width:110px;accent-color:#7b8cff}.v3c select,.v3c input[type=text]{background:#1b2029;color:#e8ecf2;border:1px solid #2a303b;border-radius:6px;font-size:12px;padding:2px 4px}'
+ '.v3c button,.v3t button{all:unset;cursor:pointer;padding:2px 8px;border:1px solid #2a303b;border-radius:6px}.v3c button.on,.v3t button.on{background:#2f4ae0;border-color:#4a63f0}'
+ '.v3c button.pk.on{background:#dc2626;border-color:#f87171}.v3c .v3d{display:grid;grid-template-columns:repeat(3,28px);gap:3px}.v3c .v3d button{padding:2px 0;text-align:center;font-size:13px;line-height:18px}.v3c :disabled{opacity:.4;cursor:default}.v3l{display:flex;gap:10px;font-size:11px;background:rgba(10,14,22,.6);border-radius:9px;padding:4px 9px}.v3l i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px}'
+ '.v3k{background:rgba(10,14,22,.72);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:7px 11px;min-width:210px;line-height:1.45}.v3k b{font-size:13px}.v3k .k{opacity:.6;margin-right:6px}'
+ '.v3k .bar{height:5px;border-radius:3px;background:rgba(255,255,255,.12);margin:3px 0 2px;overflow:hidden}.v3k .bar i{display:block;height:100%}.v3k .d{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px}</style>'
+ '<div class="v3n" style="position:absolute;top:12px;left:240px;right:330px"></div>'
+ '<div class="v3e" style="position:absolute;right:12px;top:48px;width:290px;pointer-events:none"></div>'
+ '<div style="position:absolute;left:12px;right:12px;bottom:56px;display:flex;flex-direction:column;align-items:flex-start;gap:6px"><div class="v3k" style="display:none"></div><div class="v3l" style="display:none"></div><div class="v3c"></div></div>';
ovl.style.cssText = 'position:absolute;inset:0;pointer-events:none';
ui.appendChild(ovl);
var cardEl = ovl.querySelector('.v3k'), numEl = ovl.querySelector('.v3n'), evEl = ovl.querySelector('.v3e'), ctlEl = ovl.querySelector('.v3c'), legEl = ovl.querySelector('.v3l');
var HMLOG = { on: false, btn: null }; try { HMLOG.on = localStorage.getItem('v3d.hlog') === '1'; } catch (e) { }
var CTL_CH = String(P.control_channel || 'control').trim() || 'control', EV_CH = String(P.events_channel || 'event').trim();
function label(n) { n = String(n).replace(/_/g, ' '); return n.charAt(0).toUpperCase() + n.slice(1); }
function fmtNum(v, f) {
if (v == null || v === '') return '–';
if (typeof v === 'boolean') return v ? 'yes' : 'no';
if (typeof v !== 'number') return String(v);
if (f === 'time') { var s = Math.max(0, Math.round(v)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return (h ? h + ':' + ('0' + m).slice(-2) : m) + ':' + ('0' + s % 60).slice(-2); }
if (f === '%') return Math.round(v * 100) + '%';
return v.toLocaleString(undefined, { maximumFractionDigits: Math.abs(v) < 10 && v % 1 ? 2 : 0 });
}
function parseNumbers(text) {
return String(text || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
var m = /^([\w.-]+?)(?:\.([\w-]+))?(?:=([^:]*))?(?::(\S+))?$/.exec(s); if (!m) return null;
return { ch: m[2] ? m[1] : '', field: m[2] || m[1], label: (m[3] || '').trim() || label(m[2] || m[1]), fmt: m[4] || '' };
}).filter(Boolean);
}
OVL.numbers = parseNumbers(P.numbers);
function newest(field, ch) {
var best = null;
Object.keys(OVL.last).forEach(function (c) { if (ch && c !== ch) return; var it = OVL.last[c]; if (it.data && typeof it.data === 'object' && field in it.data && (!best || it.t > best.t)) best = it; });
return best ? best.data[field] : undefined;
}
function liveRun() { return !!(ctx.run && ctx.run.active); }
function sendCtl(name, value) {
if (ctx.sample || !liveRun()) { toast('The run has ended: run the blueprint to send ' + label(name) + '.'); return; }
ctx.send(CTL_CH, { control: name, value: value }).catch(function (e) { toast('Not sent: ' + e.message); });
if (mode === 'car' && /^(start|go|launch)$/i.test(String(name))) crStartPressed();
if (mode === 'village' && /^(start|go|launch)$/i.test(String(name))) vgStartPressed();
}
function toast(text) { OVL.toasts.push({ text: text, at: Date.now() }); drawEvents(); }
function buildControls(text) {
ctlEl.innerHTML = ''; OVL.ctls = []; OVL.pick = null;
String(text || '').split(/\r?\n/).forEach(function (line) {
var parts = line.trim().split(/\s+/); if (!parts[0]) return;
var kind = parts[0].toLowerCase(), c = { kind: kind, name: parts[1] || kind, touched: 0 };
if (kind === 'button') {
c.name = parts.slice(1).join(' ') || 'Go';
c.el = document.createElement('button'); c.el.textContent = c.name;
c.el.onclick = function () { if (mode === 'humanoid' && /^push$/i.test(c.name)) { hmPushTool(c); return; } sendCtl(c.name, true); };   // (a humanoid robot: Push is a hand to push it with)
} else if (kind === 'slider') {
var lo = +parts[2] || 0, hi = parts[3] != null ? +parts[3] : 100, v0 = parts[4] != null ? +parts[4] : lo, st = parts[5] != null ? +parts[5] : ((hi - lo) <= 10 ? 'any' : 1);
c.el = document.createElement('label'); c.el.innerHTML = '<span>' + esc(label(c.name)) + '</span><input type="range"><output></output>';
c.input = c.el.querySelector('input'); c.out = c.el.querySelector('output');
c.input.min = lo; c.input.max = hi; c.input.step = st; c.input.value = v0; c.out.textContent = fmtNum(v0);
c.input.oninput = function () { c.out.textContent = fmtNum(+c.input.value); c.touched = Date.now(); };
c.input.onchange = function () { c.touched = Date.now(); c.out.textContent = fmtNum(+c.input.value); sendCtl(c.name, +c.input.value); };
} else if (kind === 'select') {
c.el = document.createElement('label'); c.el.innerHTML = '<span>' + esc(label(c.name)) + '</span><select></select>';
c.input = c.el.querySelector('select');
parts.slice(2).join(' ').split(',').map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (o) { var op = document.createElement('option'); op.textContent = o; c.input.appendChild(op); });
c.input.onchange = function () { c.touched = Date.now(); var v = c.input.value; sendCtl(c.name, isNaN(+v) ? v : +v); };
} else if (kind === 'switch' || kind === 'toggle') {
c.el = document.createElement('button'); c.el.textContent = label(c.name);
c.el.onclick = function () { c.on = !c.on; c.touched = Date.now(); c.el.classList.toggle('on', c.on); sendCtl(c.name, c.on); };
} else if (kind === 'text') {
c.el = document.createElement('label'); c.el.innerHTML = '<span>' + esc(label(c.name)) + '</span><input type="text" placeholder="Enter to send">';
c.input = c.el.querySelector('input');
c.input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && c.input.value.trim()) { sendCtl(c.name, c.input.value); c.input.value = ''; } });
} else if (kind === 'drive') {
c.name = parts[1] || 'drive';
c.el = document.createElement('div'); c.el.className = 'v3d';
c.el.title = 'Drive: W A S D or the arrows (A D, ← → turn), Q E step aside, Space stops. Click the view first for the keyboard.';
var D = c.drv = { keys: {}, btn: { x: 0, y: 0, turn: 0 }, sent: '', at: 0, el: {} };
[['turn', 1, '⟲', 'Turn left (A, ←)'], ['x', 1, '▲', 'Forward (W, ↑)'], ['turn', -1, '⟳', 'Turn right (D, →)'], ['y', 1, '◀', 'Step left (Q)'], ['stop', 0, '■', 'Stop (Space)'], ['y', -1, '▶', 'Step right (E)'], [null], ['x', -1, '▼', 'Back (S, ↓)'], [null]].forEach(function (k) {
if (!k[0]) { c.el.appendChild(document.createElement('span')); return; }
var b = document.createElement('button'); b.textContent = k[2]; b.title = k[3]; b.dataset.k = k[0] + k[1]; c.el.appendChild(b); D.el[k[0] + k[1]] = b;
var on = function (e) { e.preventDefault(); if (k[0] === 'stop') { D.btn = { x: 0, y: 0, turn: 0 }; D.keys = {}; } else D.btn[k[0]] = k[1]; drvSend(c, true); };
var off = function () { if (k[0] !== 'stop' && D.btn[k[0]] === k[1]) { D.btn[k[0]] = 0; drvSend(c, true); } };
b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
});
var KM = { w: ['x', 1], arrowup: ['x', 1], s: ['x', -1], arrowdown: ['x', -1], a: ['turn', 1], arrowleft: ['turn', 1], d: ['turn', -1], arrowright: ['turn', -1], q: ['y', 1], e: ['y', -1] };
window.addEventListener('keydown', function (e) {
var t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
var k = String(e.key || '').toLowerCase();
if (k === ' ') { e.preventDefault(); D.keys = {}; D.btn = { x: 0, y: 0, turn: 0 }; drvSend(c, true); return; }
if (!KM[k]) return; e.preventDefault(); if (D.keys[k]) return; D.keys[k] = KM[k]; drvSend(c, true);
});
window.addEventListener('keyup', function (e) { var k = String(e.key || '').toLowerCase(); if (D.keys[k]) { delete D.keys[k]; drvSend(c, true); } });
window.addEventListener('blur', function () { if (Object.keys(D.keys).length) { D.keys = {}; drvSend(c, true); } });
setInterval(function () { if (renderer.domElement.isConnected) drvSend(c, false); }, 400);
} else if (kind === 'pick') {
c.el = document.createElement('button'); c.el.className = 'pk'; c.el.textContent = label(c.name);
c.el.title = 'Then click the floor: sends ' + c.name + ' with the place clicked';
c.el.onclick = function () { OVL.pick = OVL.pick === c ? null : c; OVL.ctls.forEach(function (k) { if (k.kind === 'pick') k.el.classList.toggle('on', OVL.pick === k); }); renderer.domElement.style.cursor = OVL.pick ? 'crosshair' : ''; if (!OVL.pick) FLEET.hover.visible = false; };
} else return;
ctlEl.appendChild(c.el); OVL.ctls.push(c);
});
ctlEl.style.display = OVL.ctls.length ? 'flex' : 'none';
}
function drvSend(c, changed) {
var D = c.drv, v = { x: D.btn.x, y: D.btn.y, turn: D.btn.turn };
Object.keys(D.keys).forEach(function (k) { var m = D.keys[k]; v[m[0]] += m[1]; });
['x', 'y', 'turn'].forEach(function (a) { v[a] = Math.max(-1, Math.min(1, v[a])); });
Object.keys(D.el).forEach(function (k) { var a = k.replace(/-?1$|0$/, ''), dir = +k.slice(a.length); D.el[k].classList.toggle('on', a !== 'stop' && v[a] === dir && dir !== 0); });
var key = v.x + ',' + v.y + ',' + v.turn, moving = v.x || v.y || v.turn;
if (typeof HM !== 'undefined') HM.myDrive = v;
if (!changed && (!moving || Date.now() - D.at < 380)) return;
if (changed && key === D.sent) return;
D.sent = key; D.at = Date.now();
if (ctx.sample || !liveRun()) { if (changed && moving && Date.now() - (D.told || 0) > 5000) { D.told = Date.now(); toast('The run has ended: run the blueprint to drive the robot.'); } return; }
ctx.send(CTL_CH, { control: c.name, value: v }).catch(function () {});
}
var ctlText = String(P.controls || '').trim();
buildControls(ctlText);
function syncControls() {
var on = liveRun() || ctx.sample;
OVL.ctls.forEach(function (c) {
if (c.input) c.input.disabled = !on; else c.el.disabled = !on;
if (Date.now() - c.touched < 4000) return;
var v = newest(c.name);
if (v === undefined) return;
if (c.kind === 'slider') { c.input.value = v; c.out.textContent = fmtNum(+v); }
else if (c.kind === 'select') c.input.value = String(v);
else if (c.kind === 'switch' || c.kind === 'toggle') { c.on = !!v; c.el.classList.toggle('on', c.on); }
});
}
function drawNumbers() {
var list = OVL.numbers.length ? OVL.numbers : (mode === 'fleet' ? FLEET.numbers : []);
var html = list.map(function (n) { var v = newestAt(n); return v === undefined ? '' : '<div><span>' + esc(n.label) + '</span><b>' + esc(fmtNum(v, n.fmt)) + '</b></div>'; }).join('');
numEl.style.left = hudTitle.textContent ? '240px' : '12px';
if (numEl.innerHTML !== html) numEl.innerHTML = html;
}
function newestAt(n) {
if (mode === 'fleet' && !FLEET.isLive() && FLEET.kpis.length) { var k = FLEET.atTime(FLEET.kpis, FLEET.clock); return k && n.field in k ? k[n.field] : undefined; }
return newest(n.field, n.ch);
}
var evShown = '';
function drawEvents() {
var now = Date.now(), list = (EV_CH ? (mode === 'fleet' ? FLEET.eventsUntil() : OVL.events || []) : []).slice(-4);
if (mode === 'humanoid' && typeof HM !== 'undefined' && HM && HM.wh && HMLOG && !HMLOG.on) list = [];
var html = list.map(function (e) { return '<div>' + (e.t != null && mode === 'fleet' ? '<em>' + fmtNum(e.t, 'time') + '</em>' : '') + esc(e.text) + '</div>'; }).join('')
+ OVL.toasts.filter(function (t) { return now - t.at < 5000; }).map(function (t) { return '<div style="border-color:rgba(248,113,113,.5)">' + esc(t.text) + '</div>'; }).join('');
if (html !== evShown) { evShown = html; evEl.innerHTML = html; }
}
function feedOverlays(stream) {
var evs = [];
stream.forEach(function (it) {
if (!it || !it.channel) return;
var o = OVL.last[it.channel]; if (!o || it.t >= o.t) OVL.last[it.channel] = it;
if (it.channel === EV_CH && it.data && it.data.text) evs.push(it.data);
});
OVL.events = evs;
}
var FLEET = { lay: null, sig: '', W: 0, H: 0, frames: [], kpis: [], layouts: [], heats: [], events: [], lastT: {}, kpi: null,
clock: null, robots: [], world: new THREE.Group(), dyn: new THREE.Group(), routes: P.routes !== false, heat: !!P.heat,
stocks: [], uses: [], shelf: false, outKeys: {}, S: 0,
cine: false, follow: -1, models: {}, modelKey: '', runId: null, lastIdx: -1, glow: null };
scene.add(FLEET.world, FLEET.dyn);
FLEET.numbers = parseNumbers('kpi.orders_h=Orders / hour, kpi.lines_h=Lines / hour, kpi.stored_h=Stored / hour, kpi.avg_order_s=Average order:time, kpi.react_s=Reaction (s), kpi.putaway_s=Putaway:time, kpi.utilization=Robots busy:%, kpi.backlog=Orders waiting, kpi.inbound_waiting=Deliveries waiting, kpi.stock_pct=Shelves full (%), kpi.on_floor=Robots, kpi.charging=Charging, kpi.battery=Average battery, kpi.backend=Simulated on');
var F_COLORS = [0xcbd5e1, 0x22d3ee, 0xfbbf24, 0x34d399, 0xa78bfa, 0xfb923c, 0xfb923c, 0x000000, 0xe11d48, 0x818cf8, 0x818cf8, 0x2dd4bf, 0x2dd4bf], F_WAIT = 0xef4444;
var F_NAMES = ['Idle, going to its dock', 'Going to a pick face', 'Picking', 'Taking the tote to a station', 'Unloading at the station', 'Going to charge', 'Charging', 'Parked away', 'Stopped by a fault',
'Going to a receiving station', 'Loading deliveries', 'Taking packages to a shelf', 'Storing a package'];
var F_MOVING = { 1: 1, 3: 1, 5: 1, 9: 1, 11: 1 };
var F_ITEMS = [0xc8a165, 0x6b8fbf, 0xd9d4c7, 0xb98f55, 0x8fb573, 0xc0645a];
function fK(fr) { return fr.k || 3; }
function fCell(fr, r) { return fr.v[fK(fr) * r]; }
function fHS(fr, r) { return fr.v[fK(fr) * r + 1]; }
function fTgt(fr, r) { return fr.v[fK(fr) * r + 2]; }
function fMode(fr, r) { var m = fr.v[fK(fr) * r + 1] >> 2; return fK(fr) < 4 && m === 5 ? 7 : m; }
function fBat(fr, r) { return fK(fr) >= 4 ? fr.v[fK(fr) * r + 3] & 127 : -1; }
function fItems(fr, r) { if (fK(fr) >= 4) return fr.v[fK(fr) * r + 3] >> 7; var m = fMode(fr, r); return m === 3 || m === 4 ? 2 : 0; }
function fSlot(fr, r) { return fK(fr) >= 5 ? fr.v[fK(fr) * r + 4] : 65535; }
FLEET.isLive = function () { return liveRun(); };
FLEET.atTime = function (list, tt) { var lo = 0, hi = list.length - 1, b = -1; while (lo <= hi) { var m = (lo + hi) >> 1; if (list[m].t <= tt + 1e-6) { b = m; lo = m + 1; } else hi = m - 1; } return b < 0 ? null : list[b]; };
FLEET.eventsUntil = function () { var c = FLEET.clock; return FLEET.events.filter(function (e) { return c == null || e.t <= c + 0.01; }); };
function fx(x) { return x + 0.5 - FLEET.W / 2; }
function stationNorth(st) { return st[1] > FLEET.H / 2; }
function fz(y) { return -(y + 0.5 - FLEET.H / 2); }
function fkind(x, y) { var L = FLEET.lay; return !L || x < 0 || y < 0 || x >= FLEET.W || y >= FLEET.H ? '.' : L.kinds[y * FLEET.W + x]; }
function fleetItems(stream) { return stream.some(function (it) { var d = it && it.data; return d && (d.format === 'esasim.warehouse/1' || (Array.isArray(d.f) && d.off != null && d.n != null)); }); }
function decode16(b64) { var s = atob(b64), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new Uint16Array(u.buffer); }
function fleetReset() {
FLEET.frames = []; FLEET.kpis = []; FLEET.layouts = []; FLEET.heats = []; FLEET.events = []; FLEET.lastT = {}; FLEET.kpi = null;
FLEET.stocks = []; FLEET.uses = []; FLEET.useShown = null; FLEET.outKeys = {}; (FLEET.convOut || []).forEach(function (c) { c.list = []; });
FLEET.sig = ''; FLEET.clock = null; FLEET.lastIdx = -1; FLEET.heatShown = null;
FLEET.incAll = {}; FLEET.incSeen = 0; if (FLEET.incGroup) { FLEET.incGroup.clear(); FLEET.incObjs = {}; }
}
function fleetFeed(stream) {
var rid = ctx.run && ctx.run.id;
if (rid != null && FLEET.runId != null && rid !== FLEET.runId) fleetReset();
FLEET.runId = rid;
stream.forEach(function (it) {
var d = it.data; if (!d || typeof d !== 'object') return;
var key = it.channel + '|' + (it.node || '');
if (FLEET.lastT[key] != null && it.t <= FLEET.lastT[key]) return;
FLEET.lastT[key] = it.t;
if (Array.isArray(d.f) && d.off != null) {
for (var k = 0; k < d.f.length; k++) {
var tt = d.t + k * d.dt, fr = FLEET.frames;
if (fr.length && tt <= fr[fr.length - 1].t + 1e-6) continue;
fr.push({ t: tt, v: decode16(d.f[k]), n: d.n, off: d.off, k: d.k || 3 });
}
} else if (d.format === 'esasim.warehouse/1') FLEET.layouts.push(d);
else if (it.channel === 'stock' && typeof d.v === 'string') {
var sr = atob(d.v), raw = new Uint8Array(sr.length); for (var q = 0; q < sr.length; q++) raw[q] = sr.charCodeAt(q);
FLEET.stocks.push({ t: +d.t || 0, raw: raw, inq: d.inq || [] });
if (d.use) FLEET.uses.push({ t: +d.t || 0, v: decode16(d.use) });
}
else if (it.channel === 'kpi' || d.orders_h != null) { FLEET.kpis.push(d); FLEET.kpi = d; }
else if (it.channel === 'heat' && d.v) FLEET.heats.push(d);
else if (it.channel === EV_CH && d.text) FLEET.events.push(d);
});
var Ln = FLEET.layouts[FLEET.layouts.length - 1];
if (Ln) {
var sig = Ln.w + 'x' + Ln.h + Ln.kinds;
if (sig !== FLEET.sig) { FLEET.sig = sig; FLEET.lay = Ln; FLEET.W = Ln.w; FLEET.H = Ln.h; FLEET.fields = {}; fleetBuild(); }
}
}
function fleetModels(files) {
var key = files.map(function (f) { return f.id; }).join(',');
if (key === FLEET.modelKey) return; FLEET.modelKey = key;
files.filter(function (f) { return /\.glb$/i.test(f.name); }).forEach(function (f) {
var k = f.name.replace(/\.glb$/i, '');
if (FLEET.models[k] !== undefined) return;
FLEET.models[k] = null;
parseFile(f).then(function (o) { FLEET.models[k] = o; clearTimeout(FLEET.rb); FLEET.rb = setTimeout(fleetBuild, 40); })
.catch(function (e) { ctx.status('Could not open ' + f.name + ': ' + e.message); });
});
}
function fleetLight() {
ground.visible = false; grid.visible = false; grid10.visible = false;
if (sky) { scene.remove(sky); sky = null; }
scene.background = new THREE.Color(0x0c1016); scene.fog = new THREE.Fog(0x0c1016, 70, 150);
scene.environment = envRoom; scene.environmentIntensity = 0.42;
renderer.toneMappingExposure = 0.92; hemi.intensity = 0.5; hemi.color.set(0xe6eeff); hemi.groundColor.set(0x3a3328);
sun.intensity = 2.1; sun.color.set(0xfff4e6); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03;
if (quality === 'high' && !FLEET.glow) {
composer = new A.EffectComposer(renderer); composer.addPass(new A.RenderPass(scene, camera));
composer.addPass(cleanPass()); FLEET.glow = new A.UnrealBloomPass(new THREE.Vector2(256, 256), 0.75, 0.35, 1.25); composer.addPass(FLEET.glow); composer.addPass(new A.OutputPass());
resize();
}
}
function fleetUnlight() {
ground.visible = true; grid.visible = P.grid !== false; grid10.visible = P.grid !== false;
if (FLEET.glow) { composer = null; FLEET.glow = null; }
FLEET.world.visible = FLEET.dyn.visible = false; fleetBtns.style.display = 'none'; legEl.style.display = 'none'; cardEl.style.display = 'none'; FLEET.cardShown = '';
setEnvironment(P.environment || 'outdoor');
}
function instanced(model, mats, skip) {
var g = new THREE.Group(); if (!model || !mats.length) return g;
model.updateMatrixWorld(true);
model.traverse(function (m) {
if (!m.isMesh || (skip && skip(m))) return;
var im = new THREE.InstancedMesh(m.geometry, m.material, mats.length), tmp = new THREE.Matrix4();
mats.forEach(function (M, i) { tmp.multiplyMatrices(M, m.matrixWorld); im.setMatrixAt(i, tmp); });
im.castShadow = true; im.receiveShadow = true; im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); g.add(im);
});
return g;
}
function placed(model, x, y, z, yaw, s) { var o = model.clone(true); o.position.set(x, y || 0, z); o.rotation.y = yaw || 0; if (s) o.scale.setScalar(s); return shadow(o); }
function floorTexture() {
var L = FLEET.lay, W = FLEET.W, H = FLEET.H, M = 8, ppm = quality === 'fast' ? 32 : 56;
var cw = (W + 2 * M) * ppm, ch = (H + 2 * M) * ppm;
if (cw > 4096 || ch > 4096) { ppm = Math.floor(ppm * Math.min(4096 / cw, 4096 / ch)); cw = (W + 2 * M) * ppm; ch = (H + 2 * M) * ppm; }
var c = document.createElement('canvas'); c.width = cw; c.height = ch;
var g = c.getContext('2d'), s = 7;
function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
g.fillStyle = '#5d6269'; g.fillRect(0, 0, cw, ch);
for (var i = 0; i < cw * ch / 900; i++) { var v = 80 + rnd() * 40 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v + 4) + ',' + (0.05 + rnd() * 0.07) + ')'; g.beginPath(); g.arc(rnd() * cw, rnd() * ch, 2 + rnd() * 26, 0, 6.283); g.fill(); }
g.strokeStyle = 'rgba(40,44,50,.35)'; g.lineWidth = Math.max(1, ppm / 28);
for (var sx = 0; sx <= W + 2 * M; sx += 6) { g.beginPath(); g.moveTo(sx * ppm, 0); g.lineTo(sx * ppm, ch); g.stroke(); }
for (var sy = 0; sy <= H + 2 * M; sy += 6) { g.beginPath(); g.moveTo(0, sy * ppm); g.lineTo(cw, sy * ppm); g.stroke(); }
function px(x) { return (x + M) * ppm; }
function py(y) { return (H - y + M) * ppm; }
function cell(x, y, fill) { g.fillStyle = fill; g.fillRect(px(x), py(y + 1), ppm, ppm); }
for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
var k = fkind(x, y);
if ('hcaqsx'.indexOf(k) >= 0) cell(x, y, k === 'h' ? 'rgba(58,64,72,.55)' : 'rgba(70,76,84,.4)');
if (k === 'q' || k === 's' || k === 'x') cell(x, y, 'rgba(56,189,248,.10)');
if (k === 'd') cell(x, y, 'rgba(52,211,153,.16)');
if (k === 'i') cell(x, y, 'rgba(167,139,250,.22)');
}
g.strokeStyle = '#e8c547'; g.lineWidth = Math.max(2, ppm * 0.06);
(L.racks || []).forEach(function (r) { g.strokeRect(px(r[0]) + ppm * 0.03, py(r[1] + r[2]) + ppm * 0.03, ppm * 0.94, r[2] * ppm - ppm * 0.06); });
g.lineWidth = Math.max(2, ppm * 0.05);
if (L.store) [[4, 5], [L.store[1], L.store[1] + 1]].forEach(function (pair) {
var y0 = pair[0];
g.strokeStyle = '#e8c547';
g.beginPath(); g.moveTo(px(1), py(y0)); g.lineTo(px(W - 1), py(y0)); g.stroke();
g.beginPath(); g.moveTo(px(1), py(y0 + 2)); g.lineTo(px(W - 1), py(y0 + 2)); g.stroke();
g.strokeStyle = 'rgba(255,255,255,.75)'; g.setLineDash([ppm * 0.6, ppm * 0.5]);
g.beginPath(); g.moveTo(px(1), py(y0 + 1)); g.lineTo(px(W - 1), py(y0 + 1)); g.stroke(); g.setLineDash([]);
});
var DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
g.fillStyle = 'rgba(255,255,255,.55)';
for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
k = fkind(x, y); var mv = parseInt(L.moves[y * W + x], 16);
if (!(k === 'h' || k === 'a' || k === 'c')) continue;
var dirs = []; for (var d = 0; d < 4; d++) if (mv & (1 << d)) { var nk = fkind(x + DX[d], y + DY[d]); if (nk === k || (k === 'a' && nk === 'c') || (k === 'c' && nk === 'a')) dirs.push(d); }
if (dirs.length !== 1 || (k === 'h' && x % 3) || (k === 'a' && y % 2)) continue;
d = dirs[0];
g.save(); g.translate(px(x) + ppm / 2, py(y + 1) + ppm / 2); g.rotate(-Math.atan2(DY[d], DX[d]));
g.beginPath(); g.moveTo(ppm * 0.22, 0); g.lineTo(-ppm * 0.12, -ppm * 0.16); g.lineTo(-ppm * 0.04, 0); g.lineTo(-ppm * 0.12, ppm * 0.16); g.closePath(); g.fill(); g.restore();
}
(L.stations || []).forEach(function (st, i) {
var x0 = st[0] - 0.5, north = stationNorth(st), y0 = north ? st[1] + 1.4 : 0;
g.save(); g.beginPath(); g.rect(px(x0), py(y0 + 0.6), 3 * ppm, 0.6 * ppm); g.clip();
g.fillStyle = '#1f2328'; g.fillRect(px(x0), py(y0 + 0.6), 3 * ppm, 0.6 * ppm);
g.strokeStyle = '#f5c518'; g.lineWidth = ppm * 0.12;
for (var hx = -2; hx < 5; hx += 0.35) { g.beginPath(); g.moveTo(px(x0 + hx), py(y0)); g.lineTo(px(x0 + hx + 0.6), py(y0 + 0.6)); g.stroke(); }
g.restore();
g.strokeStyle = 'rgba(56,189,248,.9)'; g.lineWidth = ppm * 0.05; g.strokeRect(px(st[0]) + ppm * 0.06, py(st[1] + 1) + ppm * 0.06, ppm * 0.88, ppm * 0.88);
g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '700 ' + Math.round(ppm * 0.55) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
var ly = north ? st[1] + 1 : st[1] - 1, inb = (L.infeeds || []).length;
if (inb) g.font = '700 ' + Math.round(ppm * 0.4) + 'px system-ui,sans-serif';
g.fillText((inb ? 'OUT ' : '') + (i + 1), px(st[0] + 1) + ppm * 0.5, py(ly + 1) + ppm * 0.52);
});
(L.infeeds || []).forEach(function (st, i) {
var north = (L.infeed_sides || [])[i] ? L.infeed_sides[i] === 'N' : stationNorth(st), ly = north ? st[1] + 1 : st[1] - 1;
g.strokeStyle = 'rgba(167,139,250,.95)'; g.lineWidth = ppm * 0.06; g.strokeRect(px(st[0]) + ppm * 0.06, py(st[1] + 1) + ppm * 0.06, ppm * 0.88, ppm * 0.88);
g.fillStyle = 'rgba(196,181,253,.92)'; g.font = '700 ' + Math.round(ppm * 0.4) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
g.fillText('IN ' + (i + 1), px(st[0] + 1) + ppm * 0.5, py(ly + 1) + ppm * 0.52);
});
(L.docks || []).forEach(function (dk) {
var x = dk[0], y = dk[1], bx = px(x) + ppm * 0.5, by = py(y + 1) + ppm * 0.5, u = ppm * 0.12;
g.strokeStyle = 'rgba(52,211,153,.8)'; g.lineWidth = ppm * 0.04; g.strokeRect(px(x) + ppm * 0.12, py(y + 1) + ppm * 0.12, ppm * 0.76, ppm * 0.76);
g.fillStyle = 'rgba(52,211,153,.75)'; g.beginPath();
g.moveTo(bx + u * 0.3, by - u * 1.4); g.lineTo(bx - u * 0.8, by + u * 0.2); g.lineTo(bx, by + u * 0.2); g.lineTo(bx - u * 0.3, by + u * 1.4); g.lineTo(bx + u * 0.8, by - u * 0.2); g.lineTo(bx, by - u * 0.2); g.closePath(); g.fill();
});
var tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
return { tex: tex, w: W + 2 * M, h: H + 2 * M };
}
var F_HALL = null, HALL_H = 8;
function hallTextures() {
if (F_HALL) return F_HALL;
var c = document.createElement('canvas'); c.width = 512; c.height = 1024; var g = c.getContext('2d'), ppm = 128, s = 11, x, i;
function Y(m) { return (HALL_H - m) * ppm; }
function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
g.fillStyle = '#343c47'; g.fillRect(0, 0, 512, 1024);
for (x = 0; x < 512; x += 32) { g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x, 0, 10, 1024); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x + 22, 0, 4, 1024); }
g.fillStyle = 'rgba(0,0,0,.35)'; [3.0, 5.4].forEach(function (m) { g.fillRect(0, Y(m), 512, 3); });
var gr = g.createLinearGradient(0, Y(7.2), 0, Y(6.3)); gr.addColorStop(0, '#9fb3c6'); gr.addColorStop(1, '#617384');
g.fillStyle = gr; g.fillRect(0, Y(7.2), 512, 0.9 * ppm);
g.fillStyle = '#222830'; for (x = 0; x <= 512; x += 128) g.fillRect(x - 4, Y(7.2), 8, 0.9 * ppm); g.fillRect(0, Y(7.2) - 4, 512, 8); g.fillRect(0, Y(6.3) - 4, 512, 8);
g.fillStyle = '#4a4f57'; g.fillRect(0, Y(1.0), 512, ppm);
for (i = 0; i < 900; i++) { var v = 60 + rnd() * 50 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',.14)'; g.fillRect(rnd() * 512, Y(1.0) + rnd() * ppm, 2 + rnd() * 6, 2 + rnd() * 6); }
g.fillStyle = '#e8c547'; g.fillRect(0, Y(1.16), 512, 0.14 * ppm);
var wall = new THREE.CanvasTexture(c); wall.colorSpace = THREE.SRGBColorSpace; wall.wrapS = THREE.RepeatWrapping; wall.repeat.set(1 / 4, 1 / HALL_H); wall.anisotropy = 8;
var r = document.createElement('canvas'); r.width = r.height = 512; var h = r.getContext('2d');
h.fillStyle = '#2a3038'; h.fillRect(0, 0, 512, 512);
for (x = 0; x < 512; x += 12) { h.fillStyle = 'rgba(255,255,255,.035)'; h.fillRect(x, 0, 5, 512); }
h.fillStyle = '#3b434e'; for (x = 0; x < 512; x += 64) h.fillRect(0, x, 512, 6);
h.fillStyle = '#48515e'; h.fillRect(0, 0, 18, 512); h.fillRect(247, 0, 18, 512);
var roof = new THREE.CanvasTexture(r); roof.colorSpace = THREE.SRGBColorSpace; roof.wrapS = roof.wrapT = THREE.RepeatWrapping; roof.anisotropy = 8;
var q = document.createElement('canvas'); q.width = q.height = 128; var k = q.getContext('2d'), rg = k.createRadialGradient(64, 64, 2, 64, 64, 64);
rg.addColorStop(0, 'rgba(255,244,222,.5)'); rg.addColorStop(0.35, 'rgba(255,240,214,.14)'); rg.addColorStop(1, 'rgba(255,240,214,0)'); k.fillStyle = rg; k.fillRect(0, 0, 128, 128);
var glow = new THREE.CanvasTexture(q); glow.colorSpace = THREE.SRGBColorSpace;
return (F_HALL = { wall: wall, roof: roof, glow: glow });
}
function fleetHall(holes) {
var W = FLEET.W, H = FLEET.H, T = hallTextures(), XW = W / 2 + 7, zN = -(H / 2 + 5), zS = H / 2 + 3, zc = (zN + zS) / 2, BD = zS - zN, Hh = HALL_H, hall = new THREE.Group();
var wallMat = new THREE.MeshStandardMaterial({ map: T.wall, roughness: 0.82, metalness: 0.15, emissiveMap: T.wall, emissive: 0x4a4f57, emissiveIntensity: 0.55 }), trim = std(0xe8c547, 0.6, 0), dark = new THREE.MeshBasicMaterial({ color: 0x07090c });
[['N', 0, zN, 0, 2 * XW, function (x) { return x; }], ['S', 0, zS, Math.PI, 2 * XW, function (x) { return -x; }],
['W', -XW, zc, Math.PI / 2, BD, function (x, z) { return zc - z; }], ['E', XW, zc, -Math.PI / 2, BD, function (x, z) { return z - zc; }]].forEach(function (w) {
var len = w[4], sh = new THREE.Shape(), grp = new THREE.Group();
sh.moveTo(-len / 2, 0); sh.lineTo(len / 2, 0); sh.lineTo(len / 2, Hh); sh.lineTo(-len / 2, Hh); sh.closePath();
holes.forEach(function (o) {
if (o.wall !== w[0]) return;
var lx = w[5](o.x, o.z), a = lx - o.w / 2, b = lx + o.w / 2, hp = new THREE.Path();
hp.moveTo(a, o.y0); hp.lineTo(b, o.y0); hp.lineTo(b, o.y1); hp.lineTo(a, o.y1); hp.closePath(); sh.holes.push(hp);
[[a - 0.06, (o.y0 + o.y1) / 2, 0.12, o.y1 - o.y0 + 0.24], [b + 0.06, (o.y0 + o.y1) / 2, 0.12, o.y1 - o.y0 + 0.24], [lx, o.y1 + 0.06, o.w + 0.24, 0.12]].forEach(function (p) {
var f = new THREE.Mesh(new THREE.PlaneGeometry(p[2], p[3]), trim); f.position.set(p[0], p[1], 0.02); grp.add(f);
});
var back = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.y1 - o.y0), dark); back.position.set(lx, (o.y0 + o.y1) / 2, -1.2); grp.add(back); // outside: dark
});
var m = new THREE.Mesh(new THREE.ShapeGeometry(sh), wallMat); m.receiveShadow = true; grp.add(m);
grp.position.set(w[1], 0, w[2]); grp.rotation.y = w[3]; hall.add(grp);
});
var rg = new THREE.PlaneGeometry(2 * XW, BD); rg.rotateX(Math.PI / 2); // the roof, seen from below only
var rt = T.roof.clone(); rt.needsUpdate = true; rt.repeat.set(2 * XW / 12, BD / 12);
var roof = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: rt, roughness: 0.9, metalness: 0.2 })); roof.position.set(0, Hh, zc); hall.add(roof);
var lg = new THREE.PlaneGeometry(0.32, 2.6), hg = new THREE.PlaneGeometry(3.4, 5.6), at = [];
lg.rotateX(Math.PI / 2); hg.rotateX(Math.PI / 2);
for (var x = -XW + 4; x <= XW - 3; x += 6) for (var z = zN + 4; z <= zS - 3; z += 7) at.push([x, z]);
var lm = new THREE.MeshBasicMaterial({ toneMapped: false }); lm.color.setRGB(2.6, 2.45, 2.2);
var lamp = new THREE.InstancedMesh(lg, lm, at.length), halo = new THREE.InstancedMesh(hg, new THREE.MeshBasicMaterial({ map: T.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), at.length), M = new THREE.Matrix4();
at.forEach(function (p, i) { lamp.setMatrixAt(i, M.makeTranslation(p[0], Hh - 0.3, p[1])); halo.setMatrixAt(i, M.makeTranslation(p[0], Hh - 0.02, p[1])); });
lamp.frustumCulled = halo.frustumCulled = false; hall.add(lamp, halo);
FLEET.hallBox = { XW: XW, zN: zN, zS: zS, zc: zc, BD: BD };
return hall;
}
function convParts() {
if (FLEET.convP) return FLEET.convP;
var rg = new THREE.CylinderGeometry(0.028, 0.028, 0.64, 10); rg.rotateZ(Math.PI / 2);
return (FLEET.convP = { rail: new THREE.BoxGeometry(0.05, 0.11, 1), leg: new THREE.BoxGeometry(0.05, 1, 0.05), roller: rg,
mRail: std(0x9ca3af, 0.4, 0.7), mLeg: std(0x4b5563, 0.6, 0.5), mRoller: std(0xcbd5e1, 0.3, 0.85), box: new THREE.BoxGeometry(1, 1, 1) });
}
function conveyor(group, rollers, x, z0, z1, h) {
var P = convParts(), len = Math.abs(z1 - z0), dir = z1 > z0 ? 1 : -1, d;
[-0.35, 0.35].forEach(function (sx) { var rail = new THREE.Mesh(P.rail, P.mRail); rail.scale.z = len; rail.position.set(x + sx, h - 0.02, (z0 + z1) / 2); group.add(shadow(rail)); });
for (d = 0.3; d < len; d += 1.6) [-0.33, 0.33].forEach(function (sx) { var leg = new THREE.Mesh(P.leg, P.mLeg); leg.scale.y = h - 0.06; leg.position.set(x + sx, (h - 0.06) / 2, z0 + dir * d); group.add(shadow(leg)); });
for (d = 0.08; d < len - 0.04; d += 0.16) rollers.push(new THREE.Matrix4().makeTranslation(x, h - 0.03, z0 + dir * d));
return { x: x, z0: z0, dir: dir, len: len, h: h };
}
var F_BOXC = [0xc8a165, 0xb98f55, 0xd2b48c, 0xa77b4f, 0xc4a77d, 0xbf9a6a, 0xd9d4c7, 0xb08d5f, 0x9c7650, 0xcfb58a];
var F_CLS = [0, 0xf472b6, 0xa3e635, 0x94a3b8], F_BOXM = {};
function boxMat(hex) { return F_BOXM[hex] || (F_BOXM[hex] = std(hex, 0.85, 0)); }
function slotHash(s) { var h = Math.imul(s + 1, 2654435761) >>> 0; h ^= h >>> 13; h = Math.imul(h, 1274126177) >>> 0; return (h ^ (h >>> 16)) >>> 0; }
function rackLevels(L) {
var n = Math.max(1, +L.levels || 3), model = !!FLEET.models.rack_d && n <= 4, ys = [];
for (var lv = 0; lv < n; lv++) ys.push(model ? [0.13, 0.785, 1.435, 2.0][lv] : 0.18 + 0.66 * lv);
return { y: ys, model: model };
}
function fleetSlots(lev) {
var L = FLEET.lay, H = FLEET.H, bay = +L.bay || 2, pos = [], dim = [], info = [], bands = [], S = 0;
FLEET.S = 0; FLEET.stockMesh = FLEET.useMesh = null;
if (!L.faces || !L.slots) return;
L.faces.forEach(function (f, fi) {
var x = f[0], y = f[1];
[-1, 1].forEach(function (side, si) {
if (!(f[2] & (1 << si))) return;
bands.push([fx(x) + side * 0.36, fz(y - (bay >> 1) + (bay - 1) / 2), fi]);
for (var l = 0; l < lev.y.length; l++) for (var p = 0; p < bay; p++) {
var yy = y - (bay >> 1) + p;
if (yy < 0 || yy >= H || fkind(x + side, yy) !== 'r') continue;
var hs = slotHash(S), bd = 0.32 + (hs & 15) / 15 * 0.14, bh = 0.2 + ((hs >> 4) & 15) / 15 * 0.14, bw = 0.3 + ((hs >> 8) & 15) / 15 * 0.18;
pos.push(fx(x + side) - side * (0.42 - bd / 2 - 0.04), lev.y[l] + bh / 2 + 0.004, fz(yy) + (((hs >> 12) & 15) / 15 - 0.5) * 0.3);
dim.push(bd, bh, bw); info.push([fi, side, l, yy, x]); S++;
}
});
});
var im = new THREE.InstancedMesh(convParts().box, new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 }), Math.max(1, S)), Z = new THREE.Matrix4().makeScale(0, 0, 0), c = new THREE.Color();
FLEET.slotColor = new Int32Array(S);
for (var s = 0; s < S; s++) { FLEET.slotColor[s] = F_BOXC[slotHash(s * 7 + 3) % F_BOXC.length]; im.setMatrixAt(s, Z); im.setColorAt(s, c.setHex(FLEET.slotColor[s])); }
im.castShadow = im.receiveShadow = true; im.frustumCulled = false; FLEET.world.add(im);
FLEET.stockMesh = im; FLEET.S = S; FLEET.slotP = pos; FLEET.slotD = dim; FLEET.slotInfo = info;
FLEET.stockShown = new Uint8Array(S); FLEET.stockWant = new Uint8Array(S); FLEET.hidMark = new Uint8Array(S); FLEET.stockLook = -1;
var bg = new THREE.PlaneGeometry(1, 1); bg.rotateX(-Math.PI / 2); // how often each pick face was used: a band on the aisle floor beside it
var um = new THREE.InstancedMesh(bg, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }), Math.max(1, bands.length)), M = new THREE.Matrix4();
bands.forEach(function (b, i) { um.setMatrixAt(i, M.makeScale(0.22, 1, bay * 0.94).setPosition(b[0], 0.013, b[1])); um.setColorAt(i, c.setHex(0x334155)); });
um.renderOrder = 2; um.frustumCulled = false; um.visible = FLEET.shelf; FLEET.world.add(um);
FLEET.useMesh = um; FLEET.useFace = bands.map(function (b) { return b[2]; }); FLEET.useShown = null;
}
function fleetBuild() {
var L = FLEET.lay, MD = FLEET.models; if (!L || mode !== 'fleet') return;
var W = FLEET.W, H = FLEET.H, world = FLEET.world, i, stock = !!(L.faces && L.slots);
world.clear(); FLEET.stationLights = [];
var sideOf = function (list, sides, k) { var sd = (sides || [])[k]; return sd ? sd === 'N' : stationNorth(list[k]); };
var northUsed = (L.stations || []).some(function (st, k) { return sideOf(L.stations, L.station_sides, k); }) || (L.infeeds || []).some(function (st, k) { return sideOf(L.infeeds, L.infeed_sides, k); });
var zN = -(H / 2 + 5), zS = H / 2 + 3, XW = W / 2 + 7, holes = [], rollers = [], P = convParts();
var ft = floorTexture(), fw = 2 * XW, fd = zS - zN;
ft.tex.repeat.set(fw / ft.w, fd / ft.h); ft.tex.offset.set((ft.w / 2 - XW) / ft.w, (ft.h / 2 - zS) / ft.h);
var floor = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd), new THREE.MeshPhysicalMaterial({ map: ft.tex, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35 }));
floor.rotation.x = -Math.PI / 2; floor.position.z = (zN + zS) / 2; floor.receiveShadow = true; world.add(floor);
var lev = rackLevels(L), rackMats = [[], []], frameOnly = stock ? function (m) { return /_\d+$/.test(m.name || ''); } : null;
(L.racks || []).forEach(function (r, k) {
var units = Math.max(1, Math.round(r[2] / 4)), uLen = r[2] / units;
for (var u = 0; u < units; u++) {
var M = new THREE.Matrix4().compose(new THREE.Vector3(fx(r[0]), 0, fz(r[1] + (u + 0.5) * uLen - 0.5)),
new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2 + (r[3] === 2 ? Math.PI : 0)), new THREE.Vector3(uLen / 4 * 0.995, 1, 1));
rackMats[((k + u) * 7 + ((k + u) >> 2)) % 3 === 0 ? 1 : 0].push(M);
}
});
if (MD.rack_d && (!stock || lev.model)) { world.add(instanced(MD.rack_d, rackMats[0], frameOnly)); world.add(instanced(MD.rack_e || MD.rack_d, rackMats[1], frameOnly)); }
else {
var frame = std(0xe0b52c, 0.5, 0.4), shelfM = std(0x8b6b45, 0.8, 0), box = std(0xc9a46a, 0.85, 0), post = new THREE.BoxGeometry(0.06, 1, 0.06);
(L.racks || []).forEach(function (r) {
var X = fx(r[0]), Z = fz(r[1] + r[2] / 2 - 0.5), Ln = r[2] * 0.98, hs = stock ? lev.y.concat([lev.y[lev.y.length - 1] + 0.66]) : [0.2, 0.95, 1.7, 2.45];
hs.forEach(function (h) { var s = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.05, Ln), shelfM); s.position.set(X, h - 0.025, Z); world.add(shadow(s)); if (!stock && h < 2) { var b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, Ln * 0.8), box); b.position.set(X, h + 0.23, Z); world.add(shadow(b)); } });
if (stock) for (var q = 0; q < r[2] + 2; q += 2) [-0.4, 0.4].forEach(function (dx) { var p = new THREE.Mesh(post, frame), top = hs[hs.length - 1]; p.scale.y = top; p.position.set(X + dx, top / 2, fz(r[1] - 0.5 + Math.min(q, r[2]))); world.add(shadow(p)); });
});
}
if (MD.rack_f && !northUsed) {
var span = 18.05, n = Math.ceil((W + 4) / span), mats = [];
for (i = 0; i < n; i++) mats.push(new THREE.Matrix4().compose(new THREE.Vector3(-((n - 1) * span) / 2 + i * span, 0, -(H / 2 + 3.4)), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), new THREE.Vector3(1, 1, 1)));
world.add(instanced(MD.rack_f, mats));
}
var gx = -(W / 2 + 3.6);
[['goods_a', gx, -H / 2 + 6, 0], ['goods_c', gx, -H / 2 + 9, 0.1], ['goods_d', gx + 0.4, -H / 2 + 12.5, Math.PI / 2], ['goods_a', gx, 2, Math.PI],
['goods_c', gx, 5.5, -0.05], ['pallet_jack', gx + 2.0, 8, -Math.PI / 2], ['goods_d', gx + 0.4, H / 2 - 1, 0], ['bin', gx + 0.5, -H / 2 + 2.2, 0.3]].forEach(function (p) {
if (MD[p[0]]) world.add(placed(MD[p[0]], p[1], 0, p[2], p[3]));
});
FLEET.deskTop = MD.desk ? new THREE.Box3().setFromObject(MD.desk).max.y : 0.9;
FLEET.stationAt = {}; FLEET.infeedAt = {}; FLEET.convIn = []; FLEET.convOut = []; FLEET.outKeys = {};
function tower(X, Z) {
var t = new THREE.Group(), pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 10), std(0x9ca3af, 0.4, 0.8)); pole.position.y = 0.8; t.add(pole);
var lamps = [0xef4444, 0xfbbf24, 0x22c55e].map(function (c, k) {
var m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 16), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.15, roughness: 0.3 }));
m.position.y = 1.65 + k * 0.13; t.add(m); return m;
});
t.position.set(X, 0, Z); world.add(shadow(t)); return lamps;
}
(L.stations || []).forEach(function (st, si) {
var north = sideOf(L.stations, L.station_sides, si), sg = north ? -1 : 1, X = fx(st[0]) + 0.5, Z = fz(st[1] - sg) + 0.15 * sg;
FLEET.stationAt[st[1] * W + st[0]] = { X: X, Z: Z, sg: sg, si: si };
if (MD.desk) world.add(placed(MD.desk, X, 0, Z + 0.2 * sg, Math.PI / 2 + (north ? Math.PI : 0)));
else { var dsk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.8), std(0x6b7280, 0.6, 0)); dsk.position.set(X, 0.45, Z + 0.2 * sg); world.add(shadow(dsk)); }
var lamps = tower(X + 1.05, Z + 0.35 * sg);
var q = {}; ((L.queues || [])[si] || [[st[0], 2], [st[0], 3]]).forEach(function (c) { q[c[1] * W + c[0]] = 1; });
FLEET.stationLights.push({ cell: st[1] * W + st[0], x: st[0], lamps: lamps, queue: q });
if (stock) {
var z0 = Z + 0.2 * sg + 0.45 * sg, zw = north ? zN : zS, cv = conveyor(world, rollers, X, z0, zw + 1.6 * sg, Math.max(0.6, FLEET.deskTop - 0.1));
cv.list = []; FLEET.convOut[si] = cv; holes.push({ wall: north ? 'N' : 'S', x: X, z: zw, w: 1.3, y0: 0.2, y1: cv.h + 0.75 });
}
});
(L.infeeds || []).forEach(function (st, j) {
var north = sideOf(L.infeeds, L.infeed_sides, j), sg = north ? -1 : 1, X = fx(st[0]), zw = north ? zN : zS;
var cv = conveyor(world, rollers, X, fz(st[1]) + 0.5 * sg, zw + 1.6 * sg, 0.62), qd = {};
cv.boxes = []; cv.n = null; cv.shift = 0;
for (var k = 0; k < Math.floor((cv.len - 0.3) / 0.6) && k < 16; k++) { var b = new THREE.Mesh(P.box, boxMat(F_BOXC[0])); b.scale.set(0.42, 0.3, 0.4); b.visible = false; world.add(shadow(b)); cv.boxes.push(b); }
FLEET.convIn[j] = cv; FLEET.infeedAt[st[1] * W + st[0]] = j;
holes.push({ wall: north ? 'N' : 'S', x: X, z: zw, w: 1.3, y0: 0.2, y1: 1.45 });
((L.infeed_queues || [])[j] || []).forEach(function (c) { qd[c[1] * W + c[0]] = 1; });
FLEET.stationLights.push({ cell: st[1] * W + st[0], x: st[0], lamps: tower(X + 0.75, fz(st[1]) + 0.9 * sg), queue: qd });
});
if (rollers.length) { var rm = new THREE.InstancedMesh(P.roller, P.mRoller, rollers.length); rollers.forEach(function (M, k) { rm.setMatrixAt(k, M); }); rm.castShadow = rm.receiveShadow = true; rm.computeBoundingSphere(); world.add(rm); }
var chg = new THREE.BoxGeometry(0.5, 0.34, 0.1), chgMat = std(0x1f2937, 0.5, 0.3), led = new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x34d399, emissiveIntensity: 3.5 }), ledG = new THREE.BoxGeometry(0.2, 0.04, 0.02);
(L.docks || []).forEach(function (dk) {
var bk = (dk[2] + 2) % 4, DX = [1, 0, -1, 0], DY = [0, 1, 0, -1], X = fx(dk[0]) + DX[bk] * 0.47, Z = fz(dk[1]) - DY[bk] * 0.47;
var b = new THREE.Mesh(chg, chgMat); b.position.set(X, 0.17, Z); b.rotation.y = bk % 2 === 0 ? Math.PI / 2 : 0; world.add(shadow(b));
var l = new THREE.Mesh(ledG, led); l.position.set(X - DX[bk] * 0.055, 0.28, Z + DY[bk] * 0.055); l.rotation.y = b.rotation.y; world.add(l);
});
world.add(fleetHall(holes));
fleetSlots(lev);
var sb = typeof fleetBtns !== 'undefined' && fleetBtns && fleetBtns.querySelector('[data-f=shelf]'); if (sb) sb.style.display = FLEET.S ? '' : 'none';
var R = Math.max(W, H) * 0.75 + 6;
sun.position.set(R * 0.55, R * 1.25, R * 0.75); sun.target.position.set(0, 0, 0);
var sc = sun.shadow.camera; sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 1; sc.far = R * 4; sc.updateProjectionMatrix();
if (MD.amr) FLEET.robots.forEach(function (Rb) { if (Rb.real) return; Rb.g.remove(Rb.body); Rb.body = shadow(MD.amr.clone(true)); Rb.g.add(Rb.body); Rb.real = true; });
FLEET.blockedSig = ''; fleetBlocked(); FLEET.fields = {}; FLEET.lastIdx = -1; fleetLegend();
if (!flown) fleetFit();
}
function fleetFit() {
var d = Math.max(FLEET.W, FLEET.H) || 30;
controls.target.set(0, 0, d * 0.04); camera.position.set(d * 0.42, d * 0.78, d * 0.95);
camera.near = 0.1; camera.far = 2000; camera.updateProjectionMatrix();
}
function fleetBlocked() {
var L = FLEET.lay, list = (L && L.blocked) || [], sig = JSON.stringify(list) + (FLEET.models.pallet_jack ? 'm' : '');
if (sig === FLEET.blockedSig) return; FLEET.blockedSig = sig;
if (FLEET.blk) FLEET.world.remove(FLEET.blk);
var grp = FLEET.blk = new THREE.Group(); FLEET.world.add(grp);
var cone = new THREE.ConeGeometry(0.11, 0.42, 20), coneMat = std(0xf97316, 0.55, 0), band = std(0xffffff, 0.4, 0), cross = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.45, depthWrite: false });
list.forEach(function (c) {
var X = fx(c[0]), Z = fz(c[1]);
var q = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.96), cross); q.rotation.x = -Math.PI / 2; q.position.set(X, 0.012, Z); grp.add(q);
if (FLEET.models.pallet_jack) grp.add(placed(FLEET.models.pallet_jack, X, 0, Z, Math.PI / 2 + 0.25, 0.85));
else { var p = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.8), std(0xc9a46a, 0.8, 0)); p.position.set(X, 0.45, Z); grp.add(shadow(p)); }
[[-0.32, 0.36], [0.32, -0.36]].forEach(function (o) {
var g = new THREE.Group(), k = new THREE.Mesh(cone, coneMat); k.position.y = 0.21; g.add(k);
var b = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.07, 20), band); b.position.y = 0.24; g.add(b);
g.position.set(X + o[0], 0, Z + o[1]); grp.add(shadow(g));
});
});
FLEET.fields = {};
}
var F_LED = null, F_TOTE = null, F_BLOB = null, F_BAT = {};
function batteryMat(pct, charging) {
var lv = Math.max(0, Math.min(20, Math.round(pct / 5))), key = lv + (charging ? 'c' : '');
if (F_BAT[key]) return F_BAT[key];
var c = document.createElement('canvas'); c.width = 160; c.height = 80; var g = c.getContext('2d');
function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); }
var col = charging ? '#4ade80' : lv * 5 < 20 ? '#ef4444' : lv * 5 < 40 ? '#f59e0b' : '#22c55e';
rr(6, 10, 132, 60, 12); g.fillStyle = 'rgba(10,14,22,.82)'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#e5e7eb'; g.stroke();
rr(140, 28, 12, 24, 4); g.fillStyle = '#e5e7eb'; g.fill();
var w = 116 * lv / 20; if (w > 0) { rr(14, 18, Math.max(8, w), 44, 7); g.fillStyle = col; g.fill(); }
if (charging) { g.fillStyle = '#fefce8'; g.strokeStyle = 'rgba(10,14,22,.9)'; g.lineWidth = 4; g.beginPath(); g.moveTo(80, 14); g.lineTo(56, 44); g.lineTo(74, 44); g.lineTo(64, 68); g.lineTo(92, 34); g.lineTo(74, 34); g.lineTo(84, 14); g.closePath(); g.stroke(); g.fill(); }
var tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
return (F_BAT[key] = new THREE.SpriteMaterial({ map: tex, depthTest: false, toneMapped: false, transparent: true }));
}
function fleetRobot() {
if (!F_LED) {
var shape = new THREE.Shape(), w = 0.462, d = 0.302, r = 0.06, hole = new THREE.Path(), wi = w - 0.02, di = d - 0.02;
[[shape, w, d], [hole, wi, di]].forEach(function (s) { var p = s[0], a = s[1], b = s[2]; p.moveTo(-a + r, -b); p.lineTo(a - r, -b); p.quadraticCurveTo(a, -b, a, -b + r); p.lineTo(a, b - r); p.quadraticCurveTo(a, b, a - r, b); p.lineTo(-a + r, b); p.quadraticCurveTo(-a, b, -a, b - r); p.lineTo(-a, -b + r); p.quadraticCurveTo(-a, -b, -a + r, -b); });
shape.holes.push(hole);
F_LED = new THREE.ExtrudeGeometry(shape, { depth: 0.022, bevelEnabled: false, curveSegments: 6 }); F_LED.rotateX(-Math.PI / 2);
var tote = new THREE.Group(), blue = std(0x1d4ed8, 0.45, 0, { emissive: 0x0b1f5c, emissiveIntensity: 0.2 }), tw = 0.6, td = 0.4, th = 0.22, wl = 0.02;
[[tw, th, wl, 0, td / 2 - wl / 2], [tw, th, wl, 0, -td / 2 + wl / 2], [wl, th, td, tw / 2 - wl / 2, 0], [wl, th, td, -tw / 2 + wl / 2, 0]].forEach(function (p) { var m = new THREE.Mesh(new THREE.BoxGeometry(p[0], p[1], p[2]), blue); m.position.set(p[3], th / 2, p[4]); tote.add(m); });
var bottom = new THREE.Mesh(new THREE.BoxGeometry(tw, wl, td), blue); bottom.position.y = wl / 2; tote.add(bottom);
F_TOTE = shadow(tote);
F_TOTE.itemGeo = [new THREE.BoxGeometry(0.2, 0.14, 0.16), new THREE.BoxGeometry(0.16, 0.11, 0.2), new THREE.BoxGeometry(0.18, 0.16, 0.14)];
F_TOTE.itemMat = F_ITEMS.map(function (c) { return std(c, 0.85, 0); });
F_TOTE.slots = [[-0.16, -0.07, 0.1], [0.15, 0.06, -0.2], [0.0, 0.0, 0.3]];
F_TOTE.ring = new THREE.RingGeometry(0.56, 0.63, 48, 1, Math.PI / 2, -Math.PI * 2); F_TOTE.ring.rotateX(-Math.PI / 2);
F_TOTE.ringBack = new THREE.RingGeometry(0.56, 0.63, 48, 1); F_TOTE.ringBack.rotateX(-Math.PI / 2);
var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 4, 32, 32, 32);
gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
F_BLOB = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
}
var g = new THREE.Group(), MD = FLEET.models, body;
if (MD.amr) body = MD.amr.clone(true);
else { body = new THREE.Group(); var bb = new THREE.Mesh(new THREE.BoxGeometry(0.89, 0.24, 0.58), std(0xdfe3e8, 0.4, 0)); bb.position.y = 0.17; body.add(bb); var sk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.59), std(0x16181c, 0.6, 0)); sk.position.y = 0.06; body.add(sk); }
g.add(shadow(body));
var ledMat = new THREE.MeshStandardMaterial({ color: 0x0b0f14, emissive: 0x22d3ee, emissiveIntensity: 5, roughness: 0.4 });
var led = new THREE.Mesh(F_LED, ledMat); led.position.y = 0.205; g.add(led);
var tote = F_TOTE.clone(true); tote.position.y = 0.335; tote.visible = false; g.add(tote);
var n = FLEET.robots.length, items = F_TOTE.slots.map(function (s, k) {
var m = shadow(new THREE.Mesh(F_TOTE.itemGeo[k], F_TOTE.itemMat[(n * 3 + k) % F_ITEMS.length]));
m.position.set(s[0], 0.02 + F_TOTE.itemGeo[k].parameters.height / 2, s[1]); m.rotation.y = s[2]; m.visible = false; tote.add(m); return m;
});
var fly = shadow(new THREE.Mesh(F_TOTE.itemGeo[0], F_TOTE.itemMat[n % F_ITEMS.length])); fly.visible = false; FLEET.dyn.add(fly);
var blob = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.85), F_BLOB); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.006; blob.renderOrder = 1; g.add(blob);
var ringBack = new THREE.Mesh(F_TOTE.ringBack, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, depthWrite: false }));
var ring = new THREE.Mesh(F_TOTE.ring.clone(), new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide }));
ringBack.position.y = ring.position.y = 0.012; ringBack.renderOrder = ring.renderOrder = 3; ringBack.visible = ring.visible = false; g.add(ringBack, ring);
var bat = new THREE.Sprite(batteryMat(100, false)); bat.renderOrder = 7; bat.visible = false; FLEET.dyn.add(bat);
g.visible = false; FLEET.dyn.add(g);
return { g: g, body: body, real: !!MD.amr, ledMat: ledMat, tote: tote, items: items, fly: fly, ring: ring, ringBack: ringBack, bat: bat, mode: -1, changed: 0 };
}
function fleetField(t) {
var D0 = FLEET.fields[t]; if (D0) return D0;
var L = FLEET.lay, W = FLEET.W, H = FLEET.H, D = new Int32Array(W * H).fill(1 << 29), DX = [1, 0, -1, 0], DY = [0, 1, 0, -1], blocked = {};
(L.closed || L.blocked || []).forEach(function (b) { blocked[b[1] * W + b[0]] = 1; });
D[t] = 0; var q = [t], h = 0;
while (h < q.length) {
var c = q[h++], x = c % W, y = (c / W) | 0;
for (var d = 0; d < 4; d++) { var px = x - DX[d], py = y - DY[d]; if (px < 0 || py < 0 || px >= W || py >= H) continue; var p = py * W + px; if (D[p] <= D[c] + 1 || blocked[c]) continue; if (parseInt(L.moves[p], 16) & (1 << d)) { D[p] = D[c] + 1; q.push(p); } }
}
return (FLEET.fields[t] = D);
}
function fleetRoute(from, to) {
var D = fleetField(to), out = [from], c = from, W = FLEET.W, L = FLEET.lay, DX = [1, 0, -1, 0], DY = [0, 1, 0, -1], n = 0;
while (c !== to && n++ < 200) {
var x = c % W, y = (c / W) | 0, m = parseInt(L.moves[c], 16), best = -1, bd = D[c];
for (var d = 0; d < 4; d++) if (m & (1 << d)) { var nc = (y + DY[d]) * W + x + DX[d]; if (D[nc] < bd) { bd = D[nc]; best = nc; } }
if (best < 0) break; out.push(best); c = best;
}
return out;
}
FLEET.routeMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
FLEET.routeMesh.renderOrder = 2; FLEET.routeMesh.frustumCulled = false; FLEET.dyn.add(FLEET.routeMesh);
FLEET.rings = []; FLEET.ringGeo = new THREE.RingGeometry(0.24, 0.32, 32); FLEET.ringGeo.rotateX(-Math.PI / 2);
function fleetRoutes(fr) {
var pos = [], col = [], idx = [], tmp = new THREE.Color(), W = FLEET.W, n = 0;
FLEET.rings.forEach(function (r) { r.visible = false; });
if (FLEET.routes) for (var r = 0; r < fr.n; r++) {
var cell = fCell(fr, r), tc = fTgt(fr, r), md = fMode(fr, r);
if (cell >= fr.off || tc >= fr.off || cell === tc || !F_MOVING[md]) continue;
var path = fleetRoute(cell, tc); if (path.length < 2) continue;
tmp.setHex(F_COLORS[md]);
for (var i = 0; i < path.length - 1; i++) {
var a = path[i], b = path[i + 1], ax = fx(a % W), az = fz((a / W) | 0), bx = fx(b % W), bz = fz((b / W) | 0);
var dx = bx - ax, dz = bz - az, Ln = Math.hypot(dx, dz) || 1, nx = -dz / Ln * 0.035, nz = dx / Ln * 0.035, y = 0.014 + r * 0.0002;
var a0 = 0.75 * (1 - i / path.length) + 0.12, a1 = 0.75 * (1 - (i + 1) / path.length) + 0.12, base = pos.length / 3;
pos.push(ax + nx, y, az + nz, ax - nx, y, az - nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz);
col.push(tmp.r, tmp.g, tmp.b, a0, tmp.r, tmp.g, tmp.b, a0, tmp.r, tmp.g, tmp.b, a1, tmp.r, tmp.g, tmp.b, a1);
idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
}
var ring = FLEET.rings[n] || (FLEET.rings[n] = (function () { var m = new THREE.Mesh(FLEET.ringGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, depthWrite: false })); m.renderOrder = 3; FLEET.dyn.add(m); return m; })());
ring.material.color.setHex(F_COLORS[md]); ring.position.set(fx(tc % W), 0.016, fz((tc / W) | 0)); ring.visible = true; n++;
}
var geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); geo.setIndex(idx);
FLEET.routeMesh.geometry.dispose(); FLEET.routeMesh.geometry = geo;
}
var HEAT_STOPS = [[0, [37, 99, 235]], [0.4, [250, 204, 21]], [0.7, [249, 115, 22]], [1, [220, 38, 38]]];
function heatRGB(v) {
v = Math.max(0, Math.min(1, v));
for (var i = 1; i < HEAT_STOPS.length; i++) if (v <= HEAT_STOPS[i][0]) { var a = HEAT_STOPS[i - 1], b = HEAT_STOPS[i], u = (v - a[0]) / (b[0] - a[0]); return [0, 1, 2].map(function (k) { return Math.round(a[1][k] + (b[1][k] - a[1][k]) * u); }); }
return HEAT_STOPS[HEAT_STOPS.length - 1][1];
}
function fleetHeat(item) {
var W = FLEET.W, H = FLEET.H; if (!item || item.w !== W) return;
if (!FLEET.heatData || FLEET.heatData.length !== W * H * 4) {
FLEET.heatData = new Uint8Array(W * H * 4);
FLEET.heatTex = new THREE.DataTexture(FLEET.heatData, W, H, THREE.RGBAFormat); FLEET.heatTex.magFilter = FLEET.heatTex.minFilter = THREE.LinearFilter;
if (FLEET.heatMesh) FLEET.dyn.remove(FLEET.heatMesh);
FLEET.heatMesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: FLEET.heatTex, transparent: true, depthWrite: false }));
FLEET.heatMesh.rotation.x = -Math.PI / 2; FLEET.heatMesh.position.y = 0.011; FLEET.heatMesh.renderOrder = 1; FLEET.dyn.add(FLEET.heatMesh);
}
var raw = atob(item.v), D = FLEET.heatData;
for (var c = 0; c < W * H && c < raw.length; c++) {
var v = Math.sqrt(raw.charCodeAt(c) / 255), o = ((H - 1 - ((c / W) | 0)) * W + c % W) * 4;
var hc = heatRGB(v); D[o] = hc[0]; D[o + 1] = hc[1]; D[o + 2] = hc[2]; D[o + 3] = v < 0.04 ? 0 : Math.round(70 + 150 * v);
}
FLEET.heatTex.needsUpdate = true; FLEET.heatMesh.visible = FLEET.heat;
}
function fleetClock(dt) {
var fr = FLEET.frames; if (!fr.length) return;
var first = fr[0].t, last = fr[fr.length - 1].t;
if (liveRun()) {
var k = FLEET.kpi || {}, spd = k.paused ? 0 : (+k.speed || 1), lag = Math.max(2, (+P.delay || 1.2) + 1) * Math.max(spd, 0.5);
if (FLEET.clock == null || FLEET.clock < first) FLEET.clock = Math.max(first, last - lag);
var behind = last - FLEET.clock; if (behind > lag * 6 + 10) FLEET.clock = last - lag;
var rate = behind > lag * 1.8 ? 1.7 : behind > lag * 1.2 ? 1.15 : behind < lag * 0.4 ? 0.55 : behind < lag * 0.8 ? 0.88 : 1;
FLEET.clock = Math.min(last, FLEET.clock + dt * spd * rate);
} else {
if (FLEET.clock == null) FLEET.clock = first;
if (playing) { FLEET.clock += dt * speed * 4; if (FLEET.clock > last) FLEET.clock = first; }
FLEET.clock = Math.max(first, Math.min(last, FLEET.clock));
}
}
function frameIndex(tt) { var fr = FLEET.frames, lo = 0, hi = fr.length - 1, b = 0; while (lo <= hi) { var m = (lo + hi) >> 1; if (fr[m].t <= tt) { b = m; lo = m + 1; } else hi = m - 1; } return b; }
function easeIn(u) { return u * u * (2 - u); }
function sstep(u) { return u * u * (3 - 2 * u); }
FLEET.pickPool = []; FLEET.pickGeo = new THREE.BoxGeometry(0.05, 0.08, 0.6);
function modeStart(i, r) {
var fr = FLEET.frames, f0 = fr[i], md = fMode(f0, r), c = fCell(f0, r), it = fItems(f0, r), j = i;
while (j > 0 && i - j < 2000) { var p = fr[j - 1]; if (fMode(p, r) !== md || fCell(p, r) !== c || fItems(p, r) !== it) break; j--; }
return i - j >= 2000 || (j === 0 && fr[0].t > 0.001) ? -1 : fr[j].t;
}
function fleetCard() {
var R = FLEET.robots[FLEET.follow], html = '';
if (R && R.g.visible && R.mode >= 0) {
var col = '#' + ('00000' + (R.waiting ? F_WAIT : F_COLORS[R.mode]).toString(16)).slice(-6), dur = modeDur(R.mode);
html = '<b>Robot ' + (FLEET.follow + 1) + '</b><div><span class="d" style="background:' + col + '"></span>' + (R.waiting ? 'Waiting for the way to clear' : F_NAMES[R.mode]) + '</div>';
if (R.prog >= 0) html += '<div class="bar"><i style="width:' + Math.round(100 * R.prog) + '%;background:' + col + '"></i></div><div><span class="k">' + ({ 2: 'Pick', 4: 'Unload', 10: 'Load', 12: 'Store' }[R.mode] || '') + '</span>' + Math.floor(R.prog * dur) + ' s of ' + Math.round(dur) + ' s</div>';
var si_ = R.slot_ != null && R.slot_ < FLEET.S && FLEET.slotInfo ? FLEET.slotInfo[R.slot_] : null;
if (si_) html += '<div><span class="k">' + (R.mode === 11 || R.mode === 12 ? 'Store at' : 'Pick from') + '</span>aisle ' + si_[4] + ', ' + si_[3] + ' m, level ' + (si_[2] + 1) + '</div>';
html += '<div><span class="k">Tote</span>' + (R.nItems ? R.nItems + (R.nItems === 1 ? (R.mode >= 9 ? ' package' : ' item') : (R.mode >= 9 ? ' packages' : ' items')) : 'empty') + '</div>';
if (R.bat_ >= 0) html += '<div><span class="k">Battery</span>' + R.bat_ + '%' + (R.mode === 6 ? ', charging' : R.mode === 5 ? ', going to charge' : '') + '</div><div class="bar"><i style="width:' + R.bat_ + '%;background:' + (R.bat_ < 20 ? '#ef4444' : R.bat_ < 40 ? '#f59e0b' : '#22c55e') + '"></i></div>';
html += '<div style="opacity:.5;font-size:11px">Esc to stop following</div>';
}
if (html !== FLEET.cardShown) { FLEET.cardShown = html; cardEl.innerHTML = html; cardEl.style.display = html ? 'block' : 'none'; }
}
FLEET.incGroup = new THREE.Group(); FLEET.dyn.add(FLEET.incGroup); FLEET.incObjs = {}; FLEET.incAll = {}; FLEET.incSeen = 0;
var INC = null;
function incParts() {
if (INC) return INC;
INC = { base: new THREE.CylinderGeometry(0.07, 0.08, 0.05, 16), dome: new THREE.SphereGeometry(0.065, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
beam: new THREE.BoxGeometry(0.02, 0.05, 0.13), cone: new THREE.ConeGeometry(0.11, 0.42, 20), puddle: new THREE.CircleGeometry(0.4, 32),
box: new THREE.BoxGeometry(0.3, 0.2, 0.24), body: new THREE.CapsuleGeometry(0.15, 0.62, 4, 12), head: new THREE.SphereGeometry(0.11, 16, 12),
hat: new THREE.SphereGeometry(0.125, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), legs: new THREE.CylinderGeometry(0.06, 0.06, 0.62, 10) };
INC.puddle.rotateX(-Math.PI / 2);
INC.mDark = std(0x1f2937, 0.5, 0.3); INC.mAmber = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 3, transparent: true, opacity: 0.9 });
INC.mBeam = new THREE.MeshBasicMaterial({ color: 0xfff1c2, toneMapped: false }); INC.mCone = std(0xf97316, 0.55, 0);
INC.mSpill = new THREE.MeshPhysicalMaterial({ color: 0x3b2a1a, roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.85, depthWrite: false });
INC.mBox = std(0xc8a165, 0.85, 0); INC.mVest = std(0xf97316, 0.6, 0, { emissive: 0x7c2d12, emissiveIntensity: 0.3 }); INC.mSkin = std(0xd6a77a, 0.7, 0);
INC.mHat = std(0xfacc15, 0.4, 0); INC.mPants = std(0x1e3a5f, 0.8, 0);
return INC;
}
function incBeacon() {
var P = incParts(), g = new THREE.Group(), b = new THREE.Mesh(P.base, P.mDark), d = new THREE.Mesh(P.dome, P.mAmber), r = new THREE.Group(), beam = new THREE.Mesh(P.beam, P.mBeam);
d.position.y = 0.025; beam.position.set(0, 0.05, 0.03); r.add(beam); g.add(b, d, r); g.userData.spin = r; return g;
}
function incPerson() {
var P = incParts(), g = new THREE.Group(), body = new THREE.Mesh(P.body, P.mVest), head = new THREE.Mesh(P.head, P.mSkin), hat = new THREE.Mesh(P.hat, P.mHat);
var l1 = new THREE.Mesh(P.legs, P.mPants), l2 = new THREE.Mesh(P.legs, P.mPants);
l1.position.set(-0.07, 0.31, 0); l2.position.set(0.07, 0.31, 0); body.position.y = 0.98; head.position.y = 1.45; hat.position.y = 1.5;
var top = new THREE.Group(); top.add(body, head, hat); top.position.y = 0; g.add(l1, l2, top); g.userData.top = top;
g.traverse(function (o) { if (o.isMesh) o.castShadow = true; }); return g;
}
function incLabel(o, text) {
if (o.text === text) return; o.text = text;
var c = o.canvas || (o.canvas = document.createElement('canvas')); c.width = 360; c.height = 72; var g = c.getContext('2d');
g.clearRect(0, 0, 360, 72); g.font = '600 30px system-ui,sans-serif'; var w = Math.min(352, g.measureText(text).width + 40);
g.fillStyle = 'rgba(120,53,15,.92)'; g.beginPath(); g.roundRect ? g.roundRect((360 - w) / 2, 6, w, 60, 14) : g.rect((360 - w) / 2, 6, w, 60); g.fill();
g.strokeStyle = '#f59e0b'; g.lineWidth = 3; g.stroke(); g.fillStyle = '#fff7ed'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 180, 37);
if (!o.tex) { o.tex = new THREE.CanvasTexture(c); o.tex.colorSpace = THREE.SRGBColorSpace; o.label.material = new THREE.SpriteMaterial({ map: o.tex, depthTest: false, toneMapped: false, transparent: true }); }
o.tex.needsUpdate = true;
}
function incBuild(inc) {
var P = incParts(), g = new THREE.Group(), o = { g: g, inc: inc };
if (inc.kind !== 'fault') {
var pud = new THREE.Mesh(P.puddle, P.mSpill); pud.scale.set(1, 1, 0.7); pud.position.y = 0.013; pud.renderOrder = 2; g.add(pud);
var b1 = new THREE.Mesh(P.box, P.mBox); b1.position.set(0.12, 0.1, -0.08); b1.rotation.set(0.2, 0.7, 0.12); g.add(b1);
var b2 = new THREE.Mesh(P.box, P.mBox); b2.scale.setScalar(0.7); b2.position.set(-0.16, 0.07, 0.14); b2.rotation.set(-0.15, -0.4, 1.3); g.add(b2);
[[-0.38, 0.38], [0.38, -0.38]].forEach(function (q) { var k = new THREE.Mesh(P.cone, P.mCone); k.position.set(q[0], 0.21, q[1]); g.add(k); });
o.beacon = incBeacon(); o.beacon.position.set(-0.38, 0.42, 0.38); g.add(o.beacon);
} else { o.beacon = incBeacon(); o.beacon.position.y = 0.62; g.add(o.beacon); }
g.traverse(function (m) { if (m.isMesh && m.material !== P.mSpill) m.castShadow = true; });
o.person = incPerson(); o.person.visible = false; FLEET.incGroup.add(o.person);
o.label = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false })); o.label.renderOrder = 8; FLEET.incGroup.add(o.label);
FLEET.incGroup.add(g); return o;
}
function fleetIncidents(now) {
var L = FLEET.layouts;
for (; FLEET.incSeen < L.length; FLEET.incSeen++) (L[FLEET.incSeen].incidents || []).forEach(function (i) { FLEET.incAll[i.id] = i; });
var clock = FLEET.clock, W = FLEET.W, seen = {};
Object.keys(FLEET.incAll).forEach(function (id) {
var inc = FLEET.incAll[id]; if (!(clock >= inc.since && clock < inc.until)) return;
seen[id] = 1;
var o = FLEET.incObjs[id] || (FLEET.incObjs[id] = incBuild(inc)), x = inc.cell[0], y = inc.cell[1], R = inc.robot ? FLEET.robots[inc.robot - 1] : null;
var P = new THREE.Vector3(fx(x), 0, fz(y));
if (R && R.g.visible) P.copy(R.g.position);
o.g.visible = true; o.g.position.copy(P);
o.beacon.userData.spin.rotation.y = now * 0.009;
var helped = clock >= inc.help_at, along = fkind(x, y) === 'a';
o.person.visible = helped;
if (helped) {
o.person.position.set(P.x + (along ? 0 : 0.75), 0, P.z + (along ? 0.75 : 0));
o.person.lookAt(P.x, 0, P.z); o.person.userData.top.rotation.x = 0.25 + 0.2 * Math.sin(now * 0.004);
}
var left = helped ? inc.until - clock : inc.help_at - clock, what = inc.kind === 'fault' ? (helped ? 'Repair' : 'Fault · technician in') : (helped ? 'Cleaning' : 'Spill · help in');
incLabel(o, what + ' ' + fmtNum(Math.max(0, left), 'time') + (helped ? ' left' : ''));
var ds = Math.max(1, Math.min(3.5, camera.position.distanceTo(P) / 16));
o.label.position.set(P.x, 1.9 + 0.25 * ds, P.z); o.label.scale.set(1.5 * ds, 0.3 * ds, 1); o.label.visible = true;
});
Object.keys(FLEET.incObjs).forEach(function (id) { if (!seen[id]) { var o = FLEET.incObjs[id]; o.g.visible = o.person.visible = o.label.visible = false; } });
}
function hideExtras(R) { R.bat.visible = false; R.fly.visible = false; }
var V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), V4 = new THREE.Vector3();
function modeDur(md) { var L = FLEET.lay || {}, pk = +L.pick_s || 10; return md === 2 ? pk : md === 4 ? +L.station_s || 15 : md === 10 ? +L.load_s || 6 : md === 12 ? +L.put_s || pk : 0; }
function halfTurn(a) { a = a % Math.PI; if (a > Math.PI / 2) a -= Math.PI; if (a < -Math.PI / 2) a += Math.PI; return a; } // a box looks the same turned half round
function flyDims(R, a, b, e) { if (!b) { R.fly.scale.set(a[0], a[1], a[2]); return; } R.fly.scale.set(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e); }
function slotDims(s) { var D = FLEET.slotD; return [D[3 * s], D[3 * s + 1], D[3 * s + 2]]; }
function itemDims(k) { var p = F_TOTE.itemGeo[k].parameters; return [p.width, p.height, p.depth]; }
function slotPos(s, v) { var P = FLEET.slotP; return v.set(P[3 * s], P[3 * s + 1], P[3 * s + 2]); }
function stockAt(tt) { var L = FLEET.stocks, lo = 0, hi = L.length - 1, b = -1; while (lo <= hi) { var m = (lo + hi) >> 1; if (L[m].t <= tt + 1e-6) { b = m; lo = m + 1; } else hi = m - 1; } return b; }
function bits2(raw, s) { return (raw[s >> 2] >> ((s & 3) << 1)) & 3; }
var SM = new THREE.Matrix4(), SC = new THREE.Color();
function fleetStock(i, hid) {
var S = FLEET.S, want = FLEET.stockWant, k = stockAt(FLEET.clock), sn = FLEET.stocks[k], fr = FLEET.frames, s, nIn = (FLEET.convIn || []).length, inq = [];
for (var j = 0; j < nIn; j++) inq.push(sn ? +sn.inq[j] || 0 : 0);
if (S) { if (sn) for (s = 0; s < S; s++) want[s] = bits2(sn.raw, s); else want.fill(0); }
if (sn) {
var nx = FLEET.stocks[k + 1], a = frameIndex(sn.t);
for (var q = a + 1; q <= i && q < fr.length && q - a < 800; q++) {
var A = fr[q - 1], B = fr[q]; if (B.t <= sn.t + 1e-6 || fK(A) < 5 || fK(B) < 5) continue;
for (var r = 0; r < A.n && r < B.n; r++) {
var ma = fMode(A, r);
if (ma === 10) { if (fItems(B, r) > fItems(A, r)) { var jj = FLEET.infeedAt ? FLEET.infeedAt[fCell(A, r)] : null; if (jj != null) inq[jj]--; } continue; }
if ((ma !== 2 && ma !== 12) || !S) continue;
var sa = fSlot(A, r); if (sa >= S || fSlot(B, r) === sa) continue;
want[sa] = ma === 2 ? 0 : (nx ? bits2(nx.raw, sa) : 0) || 2;
}
}
}
FLEET.inqNow = inq;
if (!S) return;
var mark = FLEET.hidMark; hid.forEach(function (x) { if (x < S) mark[x] = 1; });
var look = FLEET.shelf ? 1 : 0, recolor = look !== FLEET.stockLook, im = FLEET.stockMesh, shown = FLEET.stockShown, P = FLEET.slotP, D = FLEET.slotD, mch = false, cch = false;
FLEET.stockLook = look;
for (s = 0; s < S; s++) {
var v = mark[s] ? 0 : want[s];
if (v !== shown[s]) { if (v) SM.makeScale(D[3 * s], D[3 * s + 1], D[3 * s + 2]).setPosition(P[3 * s], P[3 * s + 1], P[3 * s + 2]); else SM.makeScale(0, 0, 0); im.setMatrixAt(s, SM); mch = true; }
if (v && (v !== shown[s] || recolor)) { im.setColorAt(s, SC.setHex(look ? F_CLS[v] : FLEET.slotColor[s])); cch = true; }
shown[s] = v;
}
hid.forEach(function (x) { if (x < S) mark[x] = 0; });
if (mch) im.instanceMatrix.needsUpdate = true;
if (cch && im.instanceColor) im.instanceColor.needsUpdate = true;
if (FLEET.useMesh) { FLEET.useMesh.visible = FLEET.shelf; var u = FLEET.shelf ? FLEET.atTime(FLEET.uses, FLEET.clock) : null; if (u && u !== FLEET.useShown) { FLEET.useShown = u; fleetUse(u.v); } }
}
function fleetUse(v) {
var um = FLEET.useMesh, top = 0; FLEET.useFace.forEach(function (f) { top = Math.max(top, v[f] || 0); });
FLEET.useFace.forEach(function (f, i) { var h = heatRGB(top ? Math.sqrt((v[f] || 0) / top) : 0); um.setColorAt(i, SC.setStyle('rgb(' + h.join(',') + ')')); });
if (um.instanceColor) um.instanceColor.needsUpdate = true;
}
function fleetConv(dt, loadingAt) {
var P = convParts(), clock = FLEET.clock, used = 0, pool = FLEET.outPool || (FLEET.outPool = []);
(FLEET.convIn || []).forEach(function (cv, j) {
var n = Math.max(0, Math.round((FLEET.inqNow || [])[j] || 0));
if (cv.n != null && n < cv.n) cv.shift = Math.min(1.8, cv.shift + (cv.n - n) * 0.6);
cv.n = n; cv.shift = Math.max(0, cv.shift - dt * 1.1);
var skip = loadingAt[j] ? 1 : 0;
cv.boxes.forEach(function (b, k) { var idx = k + skip, off = 0.35 + idx * 0.6 + cv.shift; b.visible = idx < n && off < cv.len - 0.25; if (b.visible) b.position.set(cv.x, cv.h + b.scale.y / 2, cv.z0 + cv.dir * off); });
});
if (FLEET.outN > 4000) { FLEET.outKeys = {}; FLEET.outN = 0; }
(FLEET.convOut || []).forEach(function (cv) {
cv.list = cv.list.filter(function (e) { if (e.t > clock + 0.01) { delete FLEET.outKeys[e.key]; return false; } return (clock - e.t - 1) * 0.5 < cv.len + 0.9; });
cv.list.forEach(function (e) {
var s = (clock - e.t - 1) * 0.5, m = pool[used] || (pool[used] = (function () { var o = shadow(new THREE.Mesh(P.box, e.mat)); FLEET.dyn.add(o); return o; })());
used++; m.material = e.mat; m.scale.set(0.26, 0.18, 0.22); m.visible = true;
if (s <= 0) m.position.set(e.from[0], FLEET.deskTop + 0.09, e.from[1]);
else if (s < 0.6) { var u = sstep(s / 0.6); m.position.set(e.from[0] + (cv.x - e.from[0]) * u, FLEET.deskTop + 0.09 + (cv.h + 0.09 - FLEET.deskTop - 0.09) * u, e.from[1] + (cv.z0 - e.from[1]) * u); }
else m.position.set(cv.x, cv.h + 0.09, cv.z0 + cv.dir * (s - 0.6));
});
});
for (var k = used; k < pool.length; k++) pool[k].visible = false;
}
function arc(R, from, to, e, lift) { R.fly.position.copy(from).lerp(to, e); R.fly.position.y += Math.sin(Math.PI * e) * lift; R.fly.visible = true; }
function fleetStep(dt) {
fleetClock(dt);
var fr = FLEET.frames; if (!FLEET.lay || !fr.length || FLEET.clock == null) return;
var now = performance.now(), i = frameIndex(FLEET.clock), f0 = fr[i], f1 = fr[Math.min(i + 1, fr.length - 1)], fp = fr[Math.max(0, i - 1)], f2 = fr[Math.min(i + 2, fr.length - 1)];
var u = f1 === f0 ? 0 : Math.max(0, Math.min(1, (FLEET.clock - f0.t) / (f1.t - f0.t))), off = f0.off, W = FLEET.W, busy = {}, picks = 0;
var pickS = modeDur(2), stationS = modeDur(4), full = fK(f0) >= 4, S = FLEET.S, hid = [], loadingAt = {};
while (FLEET.robots.length < f0.n) FLEET.robots.push(fleetRobot());
FLEET.robots.forEach(function (R, r) {
if (r >= f0.n) { R.g.visible = false; hideExtras(R); return; }
var c0 = fCell(f0, r), c1 = fCell(f1, r), s0 = fHS(f0, r), s1 = fHS(f1, r);
if (c0 >= off && c1 >= off) { R.g.visible = false; R.mode = -1; hideExtras(R); return; }
var a = c0 >= off ? c1 : c0, b = c1 >= off ? c0 : c1, e = u;
if (a !== b) { var mb = fp !== f0 && fCell(fp, r) !== c0, ma = f2 !== f1 && fCell(f2, r) !== c1; e = mb && ma ? u : mb ? 1 - easeIn(1 - u) : ma ? easeIn(u) : sstep(u); }
R.g.visible = true;
R.g.position.set(fx(a % W) + (fx(b % W) - fx(a % W)) * e, 0, fz((a / W) | 0) + (fz((b / W) | 0) - fz((a / W) | 0)) * e);
var h0 = s0 & 3, h1 = s1 & 3, y0 = h0 * Math.PI / 2, dy = h1 * Math.PI / 2 - y0;
if (dy > Math.PI) dy -= 2 * Math.PI; if (dy < -Math.PI) dy += 2 * Math.PI;
R.g.rotation.y = y0 + dy * sstep(u);
R.g.scale.setScalar(c0 >= off ? 0.2 + 0.8 * u : c1 >= off ? 1 - 0.8 * u : 1);
R.g.updateMatrixWorld(true);
var md = fMode(f0, r), still = fCell(fp, r) === c0 && (fHS(fp, r) & 3) === h0;
var waiting = F_MOVING[md] && c0 === c1 && h0 === h1 && still && c0 !== fTgt(f0, r);
if (md !== R.mode || Math.abs(i - R.lastI) > 1 || fItems(f0, r) !== R.nItems) { R.prev = R.mode; R.mode = md; R.nItems = fItems(f0, r); R.mStart = modeStart(i, r); }
R.lastI = i;
var dur = modeDur(md), prog = dur && R.mStart >= 0 ? Math.max(0, Math.min(1, (FLEET.clock - R.mStart) / dur)) : -1;
R.prog = prog; R.bat_ = fBat(f0, r); R.waiting = waiting; R.slot_ = fSlot(f0, r);
R.ledMat.emissive.setHex(waiting ? F_WAIT : F_COLORS[md]);
R.ledMat.emissiveIntensity = waiting ? 3.2 + 1.6 * Math.sin(now * 0.012) : md === 2 || md === 4 || md === 10 || md === 12 ? 2.4 + 0.8 * Math.sin(now * 0.008) : md === 6 ? 0.8 + 3 * (0.5 + 0.5 * Math.sin(now * 0.0025)) : md === 8 ? (Math.sin(now * 0.02) > 0 ? 5 : 0.3) : md === 0 ? 1.2 : 3;
var n = fItems(f0, r), shown = n, sl5 = R.slot_, hasSlot = sl5 < S; R.fly.visible = false; R.fly.scale.set(1, 1, 1);
R.tote.visible = full ? md !== 7 : md >= 2 && md <= 4;
var rotT;
if (md === 2 && prog >= 0 && hasSlot) {
var ts = Math.min(n, 2), sd = 0; slotPos(sl5, V1); sd = Math.sign(V1.x - R.g.position.x) || 1; hid.push(sl5);
R.fly.geometry = convParts().box; R.fly.material = boxMat(FLEET.slotColor[sl5]); R.items[ts].getWorldPosition(V2); rotT = halfTurn(R.g.rotation.y + R.items[ts].rotation.y);
if (prog < 0.3) { R.fly.position.copy(V1); R.fly.position.x -= sd * 0.3 * sstep(prog / 0.3); R.fly.visible = true; flyDims(R, slotDims(sl5), null, 0); R.fly.rotation.y = 0; }
else if (prog < 0.8) { var e2 = sstep((prog - 0.3) / 0.5); V1.x -= sd * 0.3; arc(R, V1, V2, e2, 0.35); flyDims(R, slotDims(sl5), itemDims(ts), e2); R.fly.rotation.y = rotT * e2; }
else { R.fly.position.copy(V2); R.fly.visible = true; flyDims(R, itemDims(ts), null, 0); R.fly.rotation.y = rotT; R.items[ts].material = R.fly.material; }
} else if (md === 12 && prog >= 0 && hasSlot && n > 0) {
var ps = Math.min(n - 1, 2); slotPos(sl5, V2); var sd2 = Math.sign(V2.x - R.g.position.x) || 1;
R.items[ps].getWorldPosition(V1); shown = n - 1; hid.push(sl5); rotT = halfTurn(R.g.rotation.y + R.items[ps].rotation.y);
R.fly.geometry = convParts().box; R.fly.material = R.items[ps].material; V4.copy(V2); V4.x -= sd2 * 0.32;
if (prog < 0.12) { R.fly.position.copy(V1); R.fly.position.y += 0.25 * sstep(prog / 0.12); R.fly.visible = true; flyDims(R, itemDims(ps), null, 0); R.fly.rotation.y = rotT; }
else if (prog < 0.62) { var e3 = sstep((prog - 0.12) / 0.5); V1.y += 0.25; arc(R, V1, V4, e3, 0.3); flyDims(R, itemDims(ps), slotDims(sl5), e3); R.fly.rotation.y = rotT * (1 - e3); }
else { R.fly.position.copy(V4).lerp(V2, sstep(Math.min(1, (prog - 0.62) / 0.28))); R.fly.visible = true; flyDims(R, slotDims(sl5), null, 0); R.fly.rotation.y = 0; FLEET.slotColor[sl5] = R.fly.material.color.getHex(); }
} else if (md === 10 && prog >= 0 && FLEET.infeedAt && FLEET.infeedAt[c0] != null && FLEET.convIn[FLEET.infeedAt[c0]]) {
var jq = FLEET.infeedAt[c0], cv = FLEET.convIn[jq], ls = Math.min(n, 2), bx = [0.42, 0.3, 0.4];
loadingAt[jq] = 1; V1.set(cv.x, cv.h + 0.15, cv.z0 + cv.dir * (0.35 + cv.shift)); R.items[ls].getWorldPosition(V2); rotT = halfTurn(R.g.rotation.y + R.items[ls].rotation.y);
R.fly.geometry = convParts().box; R.fly.material = cv.boxes[0] ? cv.boxes[0].material : boxMat(F_BOXC[0]);
if (prog < 0.25) { R.fly.position.copy(V1); R.fly.position.z -= cv.dir * (0.35 + cv.shift) * sstep(prog / 0.25); R.fly.visible = true; flyDims(R, bx, null, 0); R.fly.rotation.y = 0; }
else if (prog < 0.8) { var e4 = sstep((prog - 0.25) / 0.55); V1.z = cv.z0; arc(R, V1, V2, e4, 0.3); flyDims(R, bx, itemDims(ls), e4); R.fly.rotation.y = rotT * e4; }
else { R.fly.position.copy(V2); R.fly.visible = true; flyDims(R, itemDims(ls), null, 0); R.fly.rotation.y = rotT; R.items[ls].material = R.fly.material; }
} else if (md === 2 && prog >= 0) {
var slot = Math.min(n, 2), x = c0 % W, y = (c0 / W) | 0, side = fkind(x + 1, y) === 'r' && (fkind(x - 1, y) !== 'r' || ((x * 7 + y * 3 + r) & 1)) ? 1 : -1;
var shelfY = 0.75 + ((y * 5 + r) % 3) * 0.75;
R.fly.geometry = R.items[slot].geometry; R.fly.material = R.items[slot].material;
V1.set(fx(x) + side * 0.62, shelfY + 0.1, fz(y)); R.items[slot].getWorldPosition(V2);
if (prog < 0.3) { arc(R, V1, V1, 0, 0); R.fly.position.x -= side * 0.3 * sstep(prog / 0.3); }
else if (prog < 0.8) { V1.x -= side * 0.3; arc(R, V1, V2, sstep((prog - 0.3) / 0.5), 0.35); }
else { R.fly.position.copy(V2); R.fly.visible = true; }
R.fly.rotation.y = R.g.rotation.y + R.items[slot].rotation.y;
} else if (md === 4 && prog >= 0 && n > 0) {
var per = 1 / n, j = Math.min(n - 1, Math.floor(prog / per)), q = (prog - j * per) / per, sl = Math.min(2, n - 1 - j), sa = (FLEET.stationAt || {})[c0] || { X: fx(c0 % W) + 0.5, Z: fz(0) + 0.15, sg: 1 };
shown = n - 1 - j;
R.fly.geometry = R.items[sl].geometry; R.fly.material = R.items[sl].material;
R.items[sl].getWorldPosition(V1); V2.set(sa.X - 0.25 + 0.22 * (j % 3), FLEET.deskTop + 0.08, sa.Z - 0.07 * sa.sg);
if (q < 0.15) { R.fly.position.copy(V1); R.fly.position.y += 0.25 * sstep(q / 0.15); R.fly.visible = true; }
else if (q < 0.65) { V1.y += 0.25; arc(R, V1, V2, sstep((q - 0.15) / 0.5), 0.3); }
else if (q < 0.95) { R.fly.position.copy(V2); R.fly.visible = true; }
R.fly.rotation.y = 0;
var sa4 = (FLEET.stationAt || {})[c0], co = sa4 && FLEET.convOut ? FLEET.convOut[sa4.si] : null;
if (co && R.mStart >= 0) for (var jj = 0; jj < n; jj++) {
var tp = R.mStart + stationS * (jj + 0.95) / n, key = r + ':' + R.mStart.toFixed(2) + ':' + jj; if (tp > FLEET.clock) break;
if (!FLEET.outKeys[key]) { FLEET.outKeys[key] = 1; FLEET.outN = (FLEET.outN || 0) + 1; co.list.push({ t: tp, key: key, mat: R.items[Math.min(2, n - 1 - jj)].material, from: [sa.X - 0.25 + 0.22 * (jj % 3), sa.Z - 0.07 * sa.sg] }); }
}
}
R.items.forEach(function (m, k) { m.visible = k < Math.min(3, shown); });
var ringOn = prog >= 0 || (md === 6 && R.bat_ >= 0);
R.ring.visible = R.ringBack.visible = ringOn;
if (ringOn) {
var pr = md === 6 ? R.bat_ / 100 : prog;
R.ring.geometry.setDrawRange(0, 6 * Math.round(48 * pr)); R.ring.material.color.setHex(F_COLORS[md]);
}
var bat = R.bat_, showBat = bat >= 0 && (FLEET.labels || r === FLEET.follow || md === 5 || md === 6 || bat < 20);
R.bat.visible = showBat;
if (showBat) {
var bs = Math.max(1, Math.min(3.5, camera.position.distanceTo(R.g.position) / 16)) * (md === 6 ? 1.15 : 1); // readable from afar too
R.bat.position.set(R.g.position.x, (0.9 + 0.22 * bs) * R.g.scale.x, R.g.position.z); R.bat.scale.set(0.56 * bs, 0.28 * bs, 1);
R.bat.material = batteryMat(bat, md === 6);
}
if (md === 4 || md === 10) busy[c0] = 1;
if ((md === 2 || md === 12) && hasSlot) {
var lm = FLEET.pickPool[picks] || (FLEET.pickPool[picks] = (function () { var o = new THREE.Mesh(FLEET.pickGeo, new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x4ade80, emissiveIntensity: 3 })); FLEET.dyn.add(o); return o; })());
picks++; slotPos(sl5, V4); var sd3 = Math.sign(V4.x - R.g.position.x) || 1, D_ = FLEET.slotD;
lm.position.set(V4.x - sd3 * (D_[3 * sl5] / 2 + 0.06), V4.y - D_[3 * sl5 + 1] / 2 + 0.02, V4.z); lm.scale.set(1, 0.6, 0.8);
lm.material.emissive.setHex(md === 2 ? 0x4ade80 : 0x2dd4bf); lm.visible = prog < (md === 2 ? 0.3 : 0.9); lm.material.emissiveIntensity = 4.5 + Math.sin(now * 0.01) * 1.5;
} else if (md === 2) {
var m = FLEET.pickPool[picks] || (FLEET.pickPool[picks] = (function () { var o = new THREE.Mesh(FLEET.pickGeo, new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x4ade80, emissiveIntensity: 3 })); FLEET.dyn.add(o); return o; })());
picks++;
var px_ = c0 % W, py_ = (c0 / W) | 0, sd = fkind(px_ + 1, py_) === 'r' && (fkind(px_ - 1, py_) !== 'r' || ((px_ * 7 + py_ * 3 + r) & 1)) ? 1 : -1;
m.position.set(fx(px_) + sd * 0.5, 0.75 + ((py_ * 5 + r) % 3) * 0.75, fz(py_)); m.scale.set(1, 1, 1); m.material.emissive.setHex(0x4ade80); m.visible = prog < 0.8; m.material.emissiveIntensity = 4.5 + Math.sin(now * 0.01) * 1.5;
}
});
for (var q = picks; q < FLEET.pickPool.length; q++) FLEET.pickPool[q].visible = false;
fleetStock(i, hid); fleetConv(dt, loadingAt);
(FLEET.stationLights || []).forEach(function (s) {
var on = !!busy[s.cell], queue = 0;
for (var r = 0; r < f0.n; r++) { var c = fCell(f0, r); if (c < off && s.queue[c]) queue++; }
s.lamps[2].material.emissiveIntensity = on ? 5 : 0.15; s.lamps[1].material.emissiveIntensity = !on && queue ? 4 : 0.15;
});
fleetCard();
if (i !== FLEET.lastIdx) { FLEET.lastIdx = i; fleetRoutes(f0); }
var hItem = FLEET.atTime(FLEET.heats, FLEET.clock);
if (hItem && hItem !== FLEET.heatShown) { FLEET.heatShown = hItem; fleetHeat(hItem); }
var Lt = FLEET.atTime(FLEET.layouts.filter(function (l) { return l.t != null; }), FLEET.clock);
if (Lt && JSON.stringify([Lt.blocked, Lt.closed]) !== JSON.stringify([FLEET.lay.blocked, FLEET.lay.closed])) { FLEET.lay = Object.assign({}, FLEET.lay, { blocked: Lt.blocked, closed: Lt.closed }); fleetBlocked(); FLEET.fields = {}; FLEET.lastIdx = -1; }
fleetIncidents(now);
if (FLEET.cine) {
var tg = controls.target, offv = camera.position.clone().sub(tg), rad = Math.hypot(offv.x, offv.z), ht = offv.y, dd = Math.max(FLEET.W, FLEET.H);
if (FLEET.orbit == null) FLEET.orbit = Math.atan2(offv.z, offv.x);
FLEET.orbit += dt * 0.045; rad += (dd * 0.95 - rad) * 0.01; ht += (dd * 0.55 + Math.sin(now * 0.00017) * 3 - ht) * 0.01;
tg.lerp(new THREE.Vector3(0, 0, 0), 0.01); camera.position.set(tg.x + Math.cos(FLEET.orbit) * rad, ht, tg.z + Math.sin(FLEET.orbit) * rad);
} else FLEET.orbit = null;
var fo = FLEET.robots[FLEET.follow];
if (fo && fo.g.visible) { var stp = fo.g.position.clone().sub(controls.target).multiplyScalar(0.08); controls.target.add(stp); camera.position.add(stp); if (camera.position.distanceTo(controls.target) > 9) camera.position.lerp(controls.target, 0.02); }
var a0 = fr[0].t, z0 = fr[fr.length - 1].t;
spSel.style.display = liveRun() ? 'none' : '';
if (liveRun()) { tl.style.display = 'none'; playBtn.style.display = 'none'; tm.textContent = 'live · ' + fmtNum(FLEET.clock, 'time'); }
else { tl.style.display = ''; playBtn.style.display = ''; tl.value = Math.round(1000 * (FLEET.clock - a0) / Math.max(1e-6, z0 - a0)); tm.textContent = fmtNum(FLEET.clock - a0, 'time') + ' / ' + fmtNum(z0 - a0, 'time'); }
}
var fleetBtns = document.createElement('span'); fleetBtns.className = 'v3t'; fleetBtns.style.cssText = 'display:none;gap:6px';
fleetBtns.innerHTML = '<button data-f="routes" title="Draw the route each robot plans">Routes</button><button data-f="heat" title="Colour where robots wait">Heat map</button><button data-f="labels" title="Show the battery of every robot">Batteries</button><button data-f="shelf" title="Colour each pick face by how often it was used, and the packages by class (A: ordered most)" style="display:none">Shelf use</button><button data-f="cine" title="A slow orbit round the hall">Cinematic</button>';
barEl.insertBefore(fleetBtns, $('.fit'));
function fleetMarks() { fleetBtns.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', !!FLEET[b.dataset.f]); }); if (typeof fleetLegend === 'function' && legEl) fleetLegend(); }
fleetBtns.querySelectorAll('button').forEach(function (b) {
b.onclick = function () { var k = b.dataset.f; FLEET[k] = !FLEET[k]; if (k === 'heat' && FLEET.heatMesh) FLEET.heatMesh.visible = FLEET.heat; if (k === 'shelf') FLEET.useShown = null; if (k === 'routes') FLEET.lastIdx = -1; if (k === 'cine') FLEET.follow = -1; fleetMarks(); keepView(true); };
});
fleetMarks();
function fleetLegend() {
var inb = FLEET.lay && (FLEET.lay.infeeds || []).length, hex = function (c) { return '#' + ('00000' + c.toString(16)).slice(-6); };
var grad = function (a, b) { return '<span style="display:flex;align-items:center;gap:5px;margin-left:6px">' + a + '<i style="width:70px;height:8px;border-radius:4px;margin:0;background:linear-gradient(90deg,' + HEAT_STOPS.map(function (s) { return 'rgb(' + s[1].join(',') + ') ' + Math.round(s[0] * 100) + '%'; }).join(',') + ')"></i>' + b + '</span>'; };
legEl.innerHTML = [[0x22d3ee, 'to a pick face'], [0xfbbf24, 'picking'], [0x34d399, 'tote to a station'], [0xa78bfa, 'unloading']].concat(inb ? [[0x818cf8, 'receiving'], [0x2dd4bf, 'storing']] : [])
.concat([[0xfb923c, 'charging'], [0xef4444, 'waiting'], [0xe11d48, 'fault']]).map(function (c) { return '<span><i style="background:' + hex(c[0]) + '"></i>' + c[1] + '</span>'; }).join('')
+ (FLEET.heat ? grad('waiting: little', 'a lot') : '')
+ (FLEET.shelf && FLEET.S ? grad('shelf use: little', 'a lot') + [1, 2, 3].map(function (c) { return '<span><i style="background:' + hex(F_CLS[c]) + ';border-radius:2px"></i>' + 'ABC'[c - 1] + '</span>'; }).join('') : '');
}
fleetLegend();
tl.addEventListener('input', function () { if (mode !== 'fleet' || !FLEET.frames.length) return; var a0 = FLEET.frames[0].t, z0 = FLEET.frames[FLEET.frames.length - 1].t; FLEET.clock = a0 + (z0 - a0) * tl.value / 1000; });
function enterFleet() {
stopLive(); clearEntities(); runs = []; runSel.style.display = 'none'; modeBtn.style.display = 'none'; $('.cam').style.display = 'none';
barEl.style.display = 'flex'; fleetBtns.style.display = 'inline-flex'; legEl.style.display = 'flex';
mode = 'fleet'; shownKey = 'fleet'; FLEET.world.visible = FLEET.dyn.visible = true; fleetLight(); ctx.status('');
}
var fRay = new THREE.Raycaster(), fMouse = new THREE.Vector2(), fPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), fDown = null;
FLEET.hover = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.98), new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.45, depthWrite: false }));
FLEET.hover.rotation.x = -Math.PI / 2; FLEET.hover.position.y = 0.02; FLEET.hover.visible = false; FLEET.hover.renderOrder = 4; scene.add(FLEET.hover);
var tipEl = document.createElement('div');
tipEl.style.cssText = 'position:absolute;display:none;background:rgba(10,14,22,.85);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:4px 8px;pointer-events:none;white-space:nowrap;transform:translate(12px,12px)';
ui.appendChild(tipEl);
function floorAt(ev) {
var rc = renderer.domElement.getBoundingClientRect();
fMouse.set(((ev.clientX - rc.left) / rc.width) * 2 - 1, -((ev.clientY - rc.top) / rc.height) * 2 + 1);
fRay.setFromCamera(fMouse, camera);
var p = fRay.ray.intersectPlane(fPlane, new THREE.Vector3()); if (!p) return null;
if (mode === 'fleet' && FLEET.lay) { var x = Math.floor(p.x + FLEET.W / 2), y = Math.floor(-p.z + FLEET.H / 2); return x >= 0 && y >= 0 && x < FLEET.W && y < FLEET.H ? { cell: [x, y], p: p } : null; }
return { cell: null, p: p };
}
function robotAt(f) {
if (!f || mode !== 'fleet') return -1; var best = -1, bd = 0.6;
FLEET.robots.forEach(function (R, i) { if (!R.g.visible) return; var d = Math.hypot(R.g.position.x - f.p.x, R.g.position.z - f.p.z); if (d < bd) { bd = d; best = i; } });
return best;
}
renderer.domElement.addEventListener('pointerdown', function (ev) { fDown = { x: ev.clientX, y: ev.clientY }; });
renderer.domElement.addEventListener('pointermove', function (ev) {
var f = floorAt(ev), rc = el.getBoundingClientRect();
if (OVL.pick) {
FLEET.hover.visible = !!f;
if (f) { var ok = !f.cell || 'ac'.indexOf(fkind(f.cell[0], f.cell[1])) >= 0; FLEET.hover.position.set(f.cell ? fx(f.cell[0]) : f.p.x, 0.02, f.cell ? fz(f.cell[1]) : f.p.z); FLEET.hover.material.color.setHex(ok ? 0xef4444 : 0x64748b); }
tipEl.style.display = 'none'; return;
}
var r = robotAt(f);
if (r >= 0 && FLEET.robots[r].mode >= 0) {
tipEl.style.display = 'block'; tipEl.style.left = (ev.clientX - rc.left) + 'px'; tipEl.style.top = (ev.clientY - rc.top) + 'px';
var Rr = FLEET.robots[r];
tipEl.textContent = 'Robot ' + (r + 1) + ' · ' + (Rr.waiting ? 'Waiting for the way to clear' : F_NAMES[Rr.mode]) + (Rr.bat_ >= 0 ? ' · battery ' + Rr.bat_ + '%' : '') + (Rr.nItems ? ' · ' + Rr.nItems + ' in the tote' : '') + ' · click to follow';
} else tipEl.style.display = 'none';
});
renderer.domElement.addEventListener('pointerup', function (ev) {
if (!fDown || Math.hypot(ev.clientX - fDown.x, ev.clientY - fDown.y) > 5) return;
var f = floorAt(ev);
if (OVL.pick) { if (f) sendCtl(OVL.pick.name, f.cell || [+f.p.x.toFixed(3), +(-f.p.z).toFixed(3)]); return; }
var r = robotAt(f);
if (r >= 0) { FLEET.follow = r; FLEET.cine = false; fleetMarks(); toast('Following robot ' + (r + 1) + ': drag the view or press Esc to stop.'); }
});
window.addEventListener('keydown', function (e) { if (e.key === 'Escape') { FLEET.follow = -1; OVL.pick = null; OVL.ctls.forEach(function (k) { if (k.kind === 'pick') k.el.classList.remove('on'); }); FLEET.hover.visible = false; renderer.domElement.style.cursor = ''; } });
controls.addEventListener('start', function () { FLEET.follow = -1; if (FLEET.cine) { FLEET.cine = false; fleetMarks(); } });
setInterval(function () { if (!renderer.domElement.isConnected) return; syncControls(); drawNumbers(); drawEvents(); }, 250);
var PARTS = { list: [], files: 0, plane: new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), axis: 'off', pos: 0.5, flip: false, open: {} };
var partsEl = document.createElement('div');
partsEl.style.cssText = 'position:absolute;left:12px;top:64px;width:236px;max-height:calc(100% - 140px);display:none;flex-direction:column;background:rgba(10,14,22,.72);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.08);border-radius:10px;pointer-events:auto;overflow:hidden';
partsEl.innerHTML = '<style>.pt-b{all:unset;cursor:pointer;padding:1px 7px;border:1px solid #2a303b;border-radius:6px;font-size:11.5px}.pt-b:hover{border-color:#7b8cff}'
+ '.pt-l{overflow:auto;padding:2px 6px 8px}.pt-g{display:flex;align-items:center;gap:6px;padding:4px 2px;font-weight:650;cursor:pointer}.pt-r{display:flex;align-items:center;gap:6px;padding:2px 2px 2px 18px;cursor:pointer;border-radius:5px}'
+ '.pt-r:hover,.pt-g:hover{background:rgba(255,255,255,.06)}.pt-r.sel{background:rgba(123,140,255,.25)}.pt-d{width:9px;height:9px;border-radius:50%;flex:none}.pt-n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pt-c{color:#8a93a3;font-weight:400}'
+ '.pt-l input[type=checkbox]{margin:0;accent-color:#7b8cff}</style>'
+ '<div style="display:flex;align-items:center;gap:6px;padding:8px 10px 6px"><b class="pt-t" style="flex:1">Parts</b><button class="pt-b pt-all" title="Show every part">All</button><button class="pt-b pt-none" title="Hide every part">None</button><button class="pt-b pt-min" title="Fold the list into a button">–</button></div>'
+ '<div class="pt-body" style="display:flex;flex-direction:column;min-height:0"><div style="padding:0 10px 6px"><input class="pt-q" type="search" placeholder="Find a part" style="width:100%;box-sizing:border-box;background:#1b2029;color:#e8ecf2;border:1px solid #2a303b;border-radius:6px;padding:3px 7px;font:inherit"></div>'
+ '<div style="display:flex;gap:6px;align-items:center;padding:0 10px 6px"><select class="pt-ax" title="Cut through the models" style="background:#1b2029;color:#e8ecf2;border:1px solid #2a303b;border-radius:6px;font:inherit;font-size:11.5px"><option value="off">No cut</option><option value="y">Cut across</option><option value="z">Front to back</option><option value="x">Side to side</option></select>'
+ '<input class="pt-pos" type="range" min="0" max="1000" value="500" disabled style="flex:1;min-width:0;accent-color:#7b8cff"><button class="pt-b pt-flip" title="Keep the other side">⇄</button></div>'
+ '<div class="pt-l"></div></div>';
ui.appendChild(partsEl);
var ptList = partsEl.querySelector('.pt-l');
var partsPill = document.createElement('button');
partsPill.title = 'Show the list of parts';
partsPill.style.cssText = 'all:unset;position:absolute;left:12px;top:64px;display:none;cursor:pointer;pointer-events:auto;padding:4px 10px;border:1px solid rgba(255,255,255,.12);border-radius:8px;background:rgba(10,14,22,.72);backdrop-filter:blur(6px);font-weight:650;font-size:12px';
ui.appendChild(partsPill);
PARTS.min = !!(ctx.state || {}).partsMin;
partsPill.onclick = function () { PARTS.min = false; partsDraw(); keepView(true); };
function partsClear() { if (!PARTS) return; PARTS.list = []; PARTS.files = 0; partsEl.style.display = 'none'; partsPill.style.display = 'none'; partsCut('off'); }
function partsAdd(obj, file) {
PARTS.files++;
obj.traverse(function (o) {
if (!o.isMesh || !o.name) return;
var g = o.parent && o.parent !== obj && !o.parent.isScene && o.parent.name ? o.parent.name : '';
var m = Array.isArray(o.material) ? o.material[0] : o.material;
PARTS.list.push({ name: o.name, group: g, file: file, mesh: o, color: m && m.color ? '#' + m.color.getHexString() : '#9aa4b2' });
});
partsDraw();
}
var WET = { 'organs': [0.42, 0.7, 0.12], 'vessels': [0.38, 0.75, 0.1], 'heart': [0.42, 0.7, 0.12], 'lungs and airways': [0.5, 0.55, 0.18], 'muscles': [0.5, 0.45, 0.2], 'skeleton': [0.62, 0.2, 0.35] }, headLight = null;
var TEX = { on: P.textures !== false, mats: [] };
var TISSUE_KINDS = [
[1, ['liver'], 0.0003, null], [2, ['spleen'], 0.0003, null], [3, ['kidney', 'gallbladder', 'bladder'], 0.0002, null],
[4, ['stomach', 'bowel', 'colon', 'duodenum', 'esophagus', 'rectum'], 0.0022, [0.98, 0.84, 0.76]],
[6, ['heart', 'atrial', 'myocard'], 0.0018, [0.94, 0.86, 0.64]], [7, ['lung'], 0.0006, [0.3, 0.3, 0.34]],
[8, ['aorta', 'artery', 'arteries', 'vein', 'vena', 'trunk', 'portal', 'trachea', 'bronch'], 0.00025, null],
[5, ['gluteus', 'iliopsoas', 'autochthon', 'psoas', 'muscle'], 0.0005, [0.95, 0.86, 0.66]],
[10, ['pancreas', 'adrenal', 'thyroid', 'prostate', 'gland'], 0.0007, [0.93, 0.82, 0.55]]
];
function tissueOf(name, group) {
var n = String(name || '').toLowerCase();
if (group === 'skeleton') return [9, 0.00035, [0.8, 0.66, 0.4]];
for (var i = 0; i < TISSUE_KINDS.length; i++) if (TISSUE_KINDS[i][1].some(function (w) { return n.indexOf(w) >= 0; })) return [TISSUE_KINDS[i][0], TISSUE_KINDS[i][2], TISSUE_KINDS[i][3]];
if (group === 'muscles') return [5, 0.0005, [0.95, 0.86, 0.66]];
if (group === 'vessels') return [8, 0.00025, null];
return [11, 0.0003, null];
}
var TISSUE_GLSL = [
'varying vec3 vEsP; varying vec2 vEsC;',
'uniform float esOn; uniform float esKind; uniform float esBumpH; uniform vec3 esSecond;',
'float esH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }',
'float esNoise(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);',
'  return mix(mix(mix(esH(i), esH(i + vec3(1,0,0)), f.x), mix(esH(i + vec3(0,1,0)), esH(i + vec3(1,1,0)), f.x), f.y),',
'             mix(mix(esH(i + vec3(0,0,1)), esH(i + vec3(1,0,1)), f.x), mix(esH(i + vec3(0,1,1)), esH(i + vec3(1,1,1)), f.x), f.y), f.z); }',
'float esFbm(vec3 p) { float a = 0.5, t = 0.0; for (int i = 0; i < 4; i++) { t += a * esNoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return t / 0.9375; }',
'vec2 esCell(vec3 p) { vec3 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;',
'  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {',
'    vec3 g = vec3(float(x), float(y), float(z)), o = vec3(esH(i + g), esH(i + g + 11.3), esH(i + g + 27.1)), r = g + o - f; float d = dot(r, r);',
'    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }',
'  return vec2(sqrt(d1), sqrt(d2)); }',
'float esFade(float px, float f) { return 1.0 - smoothstep(0.2, 0.7, px * f); }',
'vec4 esTissue(vec3 p, float k, float px, vec2 cv) {',
'  float h = 0.0, c = 1.0, r = 1.0, m = 0.0, lo = esFbm(p * 30.0);',
'  if (k < 1.5) { float a = esFade(px, 260.0); vec2 w = esCell(p * 260.0 + lo * 0.8); float e = w.y - w.x, sep = 1.0 - smoothstep(0.0, 0.2, e);',
'    h = a * (0.45 * smoothstep(0.0, 0.45, e) + 0.55 * esFbm(p * 800.0) * esFade(px, 800.0)); c = 0.86 + 0.2 * lo + a * (0.05 * sep - 0.06 * smoothstep(0.35, 0.0, w.x)); r = 1.0 - 0.1 * a * sep; }',
'  else if (k < 2.5) { float a = esFade(px, 500.0), g = esFbm(p * 500.0); h = a * g; c = 0.86 + 0.2 * lo + 0.08 * a * (g - 0.5); }',
'  else if (k < 3.5) { float a = esFade(px, 250.0); h = a * esFbm(p * 250.0); c = 0.9 + 0.16 * lo; }',
'  else if (k < 4.5) { float a = esFade(px, 45.0), q = 1.0 - abs(2.0 * esNoise(p * 45.0 + lo * 2.5) - 1.0), q2 = 1.0 - abs(2.0 * esNoise(p * 120.0 + lo * 3.0) - 1.0); q = q * q * q; q2 = q2 * q2 * esFade(px, 120.0);',
'    h = a * (0.6 * q + 0.25 * q2 + 0.15 * esFbm(p * 400.0) * esFade(px, 400.0)); c = 0.84 + 0.2 * lo + 0.08 * a * q; m = 0.4 * a * q; r = 1.0 - 0.15 * a * q; }',
'  else if (k < 5.5) { float a = esFade(px, 600.0), f = esFbm(vec3(p.x * 600.0, p.y * 16.0, p.z * 600.0)), b = esNoise(vec3(p.x * 110.0, p.y * 5.0, p.z * 110.0));',
'    h = a * (0.7 * f + 0.3 * b); c = 0.8 + 0.12 * lo + 0.2 * mix(0.5, f, a) + 0.06 * b; m = 0.45 * smoothstep(0.74, 0.86, b); r = 0.9 + 0.2 * a * f; }',
'  else if (k < 6.5) { float a = esFade(px, 45.0), q = 1.0 - abs(2.0 * esNoise(p * 45.0 + lo * 2.5) - 1.0), q2 = 1.0 - abs(2.0 * esNoise(p * 120.0 + lo * 3.0) - 1.0); q = q * q * q; q2 = q2 * q2 * esFade(px, 120.0);',
'    float fat = smoothstep(0.58, 0.74, esFbm(p * 14.0 + vec3(3.7, 1.3, 8.1))), lob = smoothstep(0.0, 0.55, esCell(p * 220.0).x) * esFade(px, 220.0);',
'    h = mix(a * (0.6 * q + 0.25 * q2 + 0.15 * esFbm(p * 400.0) * esFade(px, 400.0)), 0.3 + 0.7 * lob, fat); c = mix((0.84 + 0.2 * lo + 0.08 * a * q) * 0.7, 0.9 + 0.1 * lob, fat); m = 0.85 * fat; r = mix(1.0 - 0.15 * a * q, 0.8, fat); }',
'  else if (k < 7.5) { float a = esFade(px, 600.0); vec2 w = esCell(p * 600.0); h = a * smoothstep(0.0, 0.6, w.x);',
'    c = 0.88 + 0.16 * lo + 0.06 * h; m = 0.7 * smoothstep(0.6, 0.76, esFbm(p * 50.0)); r = 1.1; }',
'  else if (k < 8.5) { float a = esFade(px, 350.0), n = esNoise(vec3(p.x * 350.0, p.y * 25.0, p.z * 350.0)); h = 0.4 * a * n; c = 0.94 + 0.06 * lo + 0.08 * a * n; }',
'  else if (k < 9.5) { float a = esFade(px, 500.0), cav = clamp(cv.x, 0.0, 1.0), cx = clamp(cv.y, 0.0, 1.0);',
'    float dirt = smoothstep(0.12, 0.8, clamp(max(cav, 0.75 * cx) + (esFbm(p * 60.0) - 0.5) * 0.4, 0.0, 1.0));',
'    h = 0.5 + 0.5 * a * esFbm(p * 500.0); c = 0.93 + 0.1 * esFbm(p * 40.0) - 0.3 * dirt; m = 0.8 * dirt; r = 1.0 + 0.25 * dirt; }',
'  else if (k < 10.5) { float a = esFade(px, 110.0); vec2 w = esCell(p * 110.0 + lo); float e = w.y - w.x, sep = a * (1.0 - smoothstep(0.0, 0.12, e));',
'    h = a * (0.8 * smoothstep(0.0, 0.35, e) + 0.2 * esFbm(p * 600.0)); c = 0.88 + 0.16 * lo - 0.1 * sep; m = 0.35 * sep; }',
'  else { float a = esFade(px, 250.0); h = 0.6 * a * esFbm(p * 250.0); c = 0.9 + 0.16 * lo; }',
'  return vec4(h, c, r, m); }',
'vec3 esBump(vec3 sp, vec3 n, float h, float fd) { vec3 sx = dFdx(sp), sy = dFdy(sp), r1 = cross(sy, n), r2 = cross(n, sx);',
'  float det = dot(sx, r1) * fd; vec2 dh = vec2(dFdx(h), dFdy(h)); vec3 g = sign(det) * (dh.x * r1 + dh.y * r2);',
'  return normalize(abs(det) * n - g); }'
].join('\n');
function tissueShader(mat, mesh) {
var t = tissueOf(mesh.name, mesh.parent && mesh.parent.name), g = mesh.geometry;
if (!g.attributes.esRest) g.setAttribute('esRest', new THREE.BufferAttribute(g.attributes.position.array.slice(), 3));
if (!g.attributes.esCurv) g.setAttribute('esCurv', new THREE.BufferAttribute(t[0] === 9 ? surfaceShape(g) : new Float32Array(2 * g.attributes.position.count), 2));
mat.userData.es = { esOn: TEX.uOn || (TEX.uOn = { value: TEX.on ? 1 : 0 }), esKind: { value: t[0] }, esBumpH: { value: t[1] }, esSecond: { value: new THREE.Color().fromArray(t[2] || [1, 1, 1]) } };
mat.onBeforeCompile = function (sh) {
var u = mat.userData.es; for (var k in u) sh.uniforms[k] = u[k];
sh.vertexShader = 'attribute vec3 esRest;\nattribute vec2 esCurv;\nvarying vec3 vEsP;\nvarying vec2 vEsC;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvEsP = esRest; vEsC = esCurv;');
sh.fragmentShader = TISSUE_GLSL + '\n' + sh.fragmentShader
.replace('#include <color_fragment>', '#include <color_fragment>\nvec4 esT = vec4(0.0, 1.0, 1.0, 0.0);\nif (esOn * esKind > 0.5) { float esPx = length(fwidth(vEsP)); esT = esTissue(vEsP, esKind, esPx, vEsC); diffuseColor.rgb = mix(diffuseColor.rgb, esSecond, clamp(esT.w, 0.0, 1.0)) * esT.y; }')
.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor * esT.z, 0.04, 1.0);')
.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nif (esOn * esKind > 0.5) normal = esBump(-vViewPosition, normal, esT.x * esBumpH, faceDirection);');
};
mat.customProgramCacheKey = function () { return 'esasim-tissue'; };
TEX.mats.push(mat);
}
function surfaceShape(g) {
var pos = g.attributes.position, nrm = g.attributes.normal, n = pos.count, out = new Float32Array(2 * n);
if (!nrm) { g.computeVertexNormals(); nrm = g.attributes.normal; }
var ix = g.index ? g.index.array : null, nt = ix ? ix.length / 3 : n / 3, el = 0, ne = 0;
for (var t = 0; t < nt; t += Math.max(1, Math.floor(nt / 2000))) {
var i0 = ix ? ix[3 * t] : 3 * t, i1 = ix ? ix[3 * t + 1] : 3 * t + 1;
el += Math.hypot(pos.getX(i0) - pos.getX(i1), pos.getY(i0) - pos.getY(i1), pos.getZ(i0) - pos.getZ(i1)); ne++;
}
var R = Math.max(0.005, 2.2 * (ne ? el / ne : 0)), cell = R, grid = new Map(), M = 8192, K = 4096;
var cellOf = function (x) { return Math.floor(x / cell); };
for (var i = 0; i < n; i++) {
var key = ((cellOf(pos.getX(i)) + K) * M + cellOf(pos.getY(i)) + K) * M + cellOf(pos.getZ(i)) + K, l = grid.get(key);
if (!l) grid.set(key, l = []); l.push(i);
}
var raw = new Float32Array(2 * n);
for (var v = 0; v < n; v++) {
var px = pos.getX(v), py = pos.getY(v), pz = pos.getZ(v), nx = nrm.getX(v), ny = nrm.getY(v), nz = nrm.getZ(v);
var cx = cellOf(px), cy = cellOf(py), cz = cellOf(pz), sx = 0, sy = 0, sz = 0, mx = 0, my = 0, mz = 0, c = 0;
for (var a = -1; a <= 1; a++) for (var b = -1; b <= 1; b++) for (var d = -1; d <= 1; d++) {
var l2 = grid.get(((cx + a + K) * M + cy + b + K) * M + cz + d + K); if (!l2) continue;
for (var q = 0; q < l2.length; q++) {
var u = l2[q], dx = pos.getX(u) - px, dy = pos.getY(u) - py, dz = pos.getZ(u) - pz;
if (dx * dx + dy * dy + dz * dz > R * R) continue;
sx += dx; sy += dy; sz += dz; mx += nrm.getX(u); my += nrm.getY(u); mz += nrm.getZ(u); c++;
}
}
if (c < 2) continue;
raw[2 * v] = (sx * nx + sy * ny + sz * nz) / c / R;                                  // hollow (>0) or bulging (<0)
raw[2 * v + 1] = 1 - Math.sqrt(mx * mx + my * my + mz * mz) / c;                       // folded: 0 flat … 1 every way
}
var f = [], h = [];
for (var w = 0; w < n; w++) { f.push(raw[2 * w + 1]); h.push(raw[2 * w]); }
f.sort(function (x, y) { return x - y; }); h.sort(function (x, y) { return x - y; });
var fm = f[Math.floor(0.5 * n)] || 0, fx = f[Math.floor(0.97 * n)] || 1, hm = h[Math.floor(0.5 * n)] || 0, hx = h[Math.floor(0.97 * n)] || 1;
for (var z = 0; z < n; z++) {
out[2 * z] = Math.max(0, (raw[2 * z] - hm) / Math.max(1e-4, hx - hm));           // 0 usual … 1 the most hollow places
out[2 * z + 1] = Math.max(0, (raw[2 * z + 1] - fm) / Math.max(1e-4, fx - fm));   // 0 usual … 1 the most folded places
}
return out;
}
function texturesOn(on) { TEX.on = !!on; if (TEX.uOn) TEX.uOn.value = TEX.on ? 1 : 0; }
function wetLook(obj) {
var any = false;
obj.traverse(function (o) {
if (!o.isMesh || !o.parent || !WET[o.parent.name] || !o.material || o.material.isMeshPhysicalMaterial) return;
var m = o.material, w = WET[o.parent.name];
o.material = new THREE.MeshPhysicalMaterial({ color: m.color, roughness: w[0], metalness: 0, clearcoat: w[1], clearcoatRoughness: w[2], specularIntensity: 0.8,
transparent: m.transparent, opacity: m.opacity, side: m.side, depthWrite: m.depthWrite, name: m.name });
tissueShader(o.material, o);
any = true;
});
if (any) {
scene.environmentIntensity = Math.max(scene.environmentIntensity || 0, 0.35);
if (!headLight) { headLight = new THREE.DirectionalLight(0xffffff, 0.75); headLight.position.set(0.4, 0.6, 1); camera.add(headLight); if (!camera.parent) scene.add(camera); }
lookUi();
}
}
var lookEl = null;
function lookUi() {
if (lookEl) return;
lookEl = document.createElement('div');
lookEl.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;padding:0 10px 6px;font-size:11.5px';
lookEl.innerHTML = '<label style="display:flex;gap:5px;align-items:center"><input class="lk-tex" type="checkbox"' + (TEX.on ? ' checked' : '') + ' style="margin:0;accent-color:#7b8cff">Tissue textures</label>'
+ '<label class="lk-balls-l" style="display:none;gap:5px;align-items:center" title="The spheres of the soft-body model, moving with the tissue"><input class="lk-balls" type="checkbox"' + (BALLS.on ? ' checked' : '') + ' style="margin:0;accent-color:#7b8cff">Metaballs</label>';
var body = partsEl.querySelector('.pt-body'); body.insertBefore(lookEl, body.firstChild);
lookEl.querySelector('.lk-tex').addEventListener('change', function () { texturesOn(this.checked); });
lookEl.querySelector('.lk-balls').addEventListener('change', function () { ballsShow(this.checked); });
}
function partKey(p) { return (PARTS.files > 1 ? p.file.replace(/\.(glb|gltf)$/i, '').replace(/_anatomy$/, '') + ' · ' : '') + (p.group || 'parts'); }
function nice(n) { return String(n).replace(/_/g, ' '); }
function partsDraw() {
if (PARTS.list.length < 2) { partsEl.style.display = 'none'; partsPill.style.display = 'none'; return; }
var hud = $('.hud'), top = (hud && hud.offsetHeight ? hud.offsetTop + hud.offsetHeight : 12) + 8 + 'px';
partsEl.style.top = partsPill.style.top = top;
partsEl.style.maxHeight = 'calc(100% - ' + (parseInt(top, 10) + 76) + 'px)';
partsEl.style.display = PARTS.min ? 'none' : 'flex';
partsPill.style.display = PARTS.min ? 'block' : 'none';
partsPill.textContent = '☰ Parts · ' + PARTS.list.filter(function (p) { return p.mesh.visible; }).length + ' of ' + PARTS.list.length;
var q = partsEl.querySelector('.pt-q').value.trim().toLowerCase(), groups = {}, order = [];
PARTS.list.forEach(function (p, i) { var k = partKey(p); if (!groups[k]) { groups[k] = []; order.push(k); } if (!q || p.name.toLowerCase().indexOf(q) >= 0 || nice(p.name).toLowerCase().indexOf(q) >= 0) groups[k].push(i); });
partsEl.querySelector('.pt-t').textContent = 'Parts · ' + PARTS.list.filter(function (p) { return p.mesh.visible; }).length + ' of ' + PARTS.list.length;
var h = [];
order.forEach(function (k) {
var ids = groups[k]; if (!ids.length) return;
var on = ids.filter(function (i) { return PARTS.list[i].mesh.visible; }).length, open = q || PARTS.open[k];
h.push('<div class="pt-g" data-g="' + esc(k) + '"><input type="checkbox" data-gc="' + esc(k) + '"' + (on === ids.length ? ' checked' : '') + (on && on < ids.length ? ' data-mixed="1"' : '') + '><span class="pt-n">' + (open ? '▾ ' : '▸ ') + esc(nice(k)) + ' <span class="pt-c">' + on + '/' + ids.length + '</span></span></div>');
if (open) ids.forEach(function (i) { var p = PARTS.list[i]; h.push('<div class="pt-r' + (PARTS.sel === i ? ' sel' : '') + '" data-i="' + i + '"><input type="checkbox" data-pc="' + i + '"' + (p.mesh.visible ? ' checked' : '') + '><span class="pt-d" style="background:' + p.color + '"></span><span class="pt-n" title="' + esc(nice(p.name)) + '">' + esc(nice(p.name)) + '</span></div>'); });
});
ptList.innerHTML = h.join('');
ptList.querySelectorAll('[data-mixed]').forEach(function (c) { c.indeterminate = true; });
}
function partsShow(ids, on) { ids.forEach(function (i) { PARTS.list[i].mesh.visible = on; }); partsDraw(); }
function partFlash(i) {
var p = PARTS.list[i]; if (!p) return; PARTS.sel = i; partsDraw();
var ms = Array.isArray(p.mesh.material) ? p.mesh.material : [p.mesh.material];
ms.forEach(function (m) { if (!m.emissive) return; var was = m.emissive.getHex(); m.emissive.setHex(0x6070ff); setTimeout(function () { m.emissive.setHex(was); }, 900); });
}
partsEl.addEventListener('click', function (e) {
var t = e.target;
if (t.matches('[data-gc]')) { var k = t.getAttribute('data-gc'); partsShow(PARTS.list.map(function (p, i) { return partKey(p) === k ? i : -1; }).filter(function (i) { return i >= 0; }), t.checked); return; }
if (t.matches('[data-pc]')) { partsShow([+t.getAttribute('data-pc')], t.checked); return; }
var g = t.closest('.pt-g'); if (g) { var gk = g.getAttribute('data-g'); PARTS.open[gk] = !PARTS.open[gk]; partsDraw(); return; }
var r = t.closest('.pt-r'); if (r) { partFlash(+r.getAttribute('data-i')); return; }
if (t.closest('.pt-all')) partsShow(PARTS.list.map(function (_, i) { return i; }), true);
if (t.closest('.pt-none')) partsShow(PARTS.list.map(function (_, i) { return i; }), false);
if (t.closest('.pt-min')) { PARTS.min = true; partsDraw(); keepView(true); }
if (t.closest('.pt-flip')) { PARTS.flip = !PARTS.flip; partsCut(PARTS.axis); }
});
partsEl.querySelector('.pt-q').addEventListener('input', partsDraw);
partsEl.addEventListener('keydown', function (e) { e.stopPropagation(); });
partsEl.querySelector('.pt-ax').addEventListener('change', function () { partsCut(this.value); });
partsEl.querySelector('.pt-pos').addEventListener('input', function () { PARTS.pos = +this.value / 1000; partsCut(PARTS.axis); });
function partsCut(axis) {
PARTS.axis = axis; partsEl.querySelector('.pt-pos').disabled = axis === 'off'; partsEl.querySelector('.pt-ax').value = axis;
renderer.localClippingEnabled = axis !== 'off';
var box = new THREE.Box3();
PARTS.list.forEach(function (p) { box.expandByObject(p.mesh); });
if (axis !== 'off' && !box.isEmpty()) {
var n = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0), lo = box.min[axis], hi = box.max[axis], at = lo + (hi - lo) * PARTS.pos;
if (!PARTS.flip) n.negate();
PARTS.plane.normal.copy(n); PARTS.plane.constant = PARTS.flip ? -at : at;
}
PARTS.list.forEach(function (p) {
(Array.isArray(p.mesh.material) ? p.mesh.material : [p.mesh.material]).forEach(function (m) {
m.clippingPlanes = axis === 'off' ? null : [PARTS.plane];
if (m.userData.side0 == null) m.userData.side0 = m.side;
m.side = axis === 'off' ? m.userData.side0 : THREE.DoubleSide;
m.needsUpdate = true;
});
});
}
var ptRay = new THREE.Raycaster(), ptMouse = new THREE.Vector2(), ptDown = null;
function partAt(ev) {
if (mode !== 'files' || !PARTS.list.length) return -1;
var rc = renderer.domElement.getBoundingClientRect();
ptMouse.set(((ev.clientX - rc.left) / rc.width) * 2 - 1, -((ev.clientY - rc.top) / rc.height) * 2 + 1);
ptRay.setFromCamera(ptMouse, camera);
var ms = PARTS.list.filter(function (p) { return p.mesh.visible; }).map(function (p) { return p.mesh; });
var hits = ptRay.intersectObjects(ms, false);
for (var h = 0; h < hits.length; h++) {
if (PARTS.axis !== 'off' && PARTS.plane.distanceToPoint(hits[h].point) < 0) continue;
for (var i = 0; i < PARTS.list.length; i++) if (PARTS.list[i].mesh === hits[h].object && PARTS.list[i].name !== 'skin') return i;
}
return -1;
}
renderer.domElement.addEventListener('pointermove', function (ev) {
if (mode !== 'files' || !PARTS.list.length) return;
var i = partAt(ev), rc = el.getBoundingClientRect();
if (i < 0) { tipEl.style.display = 'none'; return; }
var p = PARTS.list[i];
tipEl.style.display = 'block'; tipEl.style.left = (ev.clientX - rc.left) + 'px'; tipEl.style.top = (ev.clientY - rc.top) + 'px';
tipEl.textContent = nice(p.name) + (p.group ? ' · ' + nice(p.group) : '') + (PARTS.files > 1 ? ' · ' + p.file : '');
});
renderer.domElement.addEventListener('pointerdown', function (ev) { ptDown = { x: ev.clientX, y: ev.clientY }; });
renderer.domElement.addEventListener('pointerup', function (ev) {
if (!ptDown || Math.hypot(ev.clientX - ptDown.x, ev.clientY - ptDown.y) > 5 || mode !== 'files') return;
var i = partAt(ev); if (i < 0) return;
var k = partKey(PARTS.list[i]); PARTS.open[k] = true; partFlash(i);
var row = ptList.querySelector('[data-i="' + i + '"]'); if (row) row.scrollIntoView({ block: 'nearest' });
});
var SOFT = null, SOFT_DT = 1 / 400, SOFT_BUDGET = 9;   // steps of 2.5 ms; at most 9 ms of each frame (a large case runs in slow motion, the view stays smooth)
function softStop() {
if (!SOFT) return;
SOFT.binds.forEach(function (b) { b.mesh.geometry.attributes.position.array.set(b.base); b.mesh.geometry.attributes.position.needsUpdate = true; });
ballsDrop();
SOFT = null; if (softEl) softEl.style.display = 'none';
if (lookEl) lookEl.querySelector('.lk-balls-l').style.display = 'none';
}
var BALLS = { on: P.metaballs === true, meshes: [], of: null, faded: [] };
function ballsMake(S) {
var geo = new THREE.IcosahedronGeometry(1, 2), byName = {}, col = new THREE.Color();
S.obj.traverse(function (o) { if (o.isMesh && o.name) byName[o.name] = o; });
S.binds.forEach(function (bd) { byName[bd.mesh.name] = bd.mesh; });
BALLS.of = new Array(S.n);
[false, true].forEach(function (skin) {
var ids = [];
S.m.bodies.forEach(function (b) { if ((b.name === 'skin') === skin) for (var k = 0; k < b.spheres.length; k++) ids.push(b.first + k); });
if (!ids.length) return;
var mat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0, transparent: true, opacity: skin ? 0.16 : 0.9, depthWrite: !skin });
var im = new THREE.InstancedMesh(geo, mat, ids.length);
im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; im.renderOrder = skin ? 6 : 1; im.name = 'metaballs';
ids.forEach(function (i, j) {
var b = S.m.bodies[S.body[i]], mesh = byName[b.name], m = mesh && (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material);
BALLS.of[i] = mesh || null;
if (b.name === 'skin') col.set(0xe8b89a); else if (b.virtual) col.set(0xb5524a); else if (b.fixed) col.set(0xeae2cf);
im.setColorAt(j, col);
});
im.userData.ids = ids;
scene.add(im); BALLS.meshes.push(im);
});
}
function ballsUpdate(S) {
if (!BALLS.on || !BALLS.meshes.length) return;
var sc = S.obj.matrixWorld.getMaxScaleOnAxis(), x = S.x;
BALLS.meshes.forEach(function (im) {
var a = im.instanceMatrix.array, ids = im.userData.ids;
for (var j = 0; j < ids.length; j++) {
var i = ids[j], ms = BALLS.of[i], r = ms && !ms.visible ? 0 : S.r[i] * sc, o = 16 * j;
a[o] = r; a[o + 1] = 0; a[o + 2] = 0; a[o + 3] = 0; a[o + 4] = 0; a[o + 5] = r; a[o + 6] = 0; a[o + 7] = 0;
a[o + 8] = 0; a[o + 9] = 0; a[o + 10] = r; a[o + 11] = 0; a[o + 12] = x[3 * i]; a[o + 13] = x[3 * i + 1]; a[o + 14] = x[3 * i + 2]; a[o + 15] = 1;
}
im.instanceMatrix.needsUpdate = true;
});
}
function ballsFade(on) {
if (on && SOFT) {
SOFT.obj.traverse(function (o) {
if (!o.isMesh || o.name === 'skin' || !o.material || Array.isArray(o.material) || o.material.userData.esFade) return;
var m = o.material; m.userData.esFade = { t: m.transparent, o: m.opacity, d: m.depthWrite };
m.transparent = true; m.opacity = 0.22; m.depthWrite = false; m.needsUpdate = true; BALLS.faded.push(m);
});
} else {
BALLS.faded.forEach(function (m) { var f = m.userData.esFade; m.transparent = f.t; m.opacity = f.o; m.depthWrite = f.d; delete m.userData.esFade; m.needsUpdate = true; });
BALLS.faded = [];
}
}
function ballsShow(on) {
BALLS.on = !!on;
if (BALLS.on && SOFT && !BALLS.meshes.length) ballsMake(SOFT);
BALLS.meshes.forEach(function (im) { im.visible = BALLS.on; });
ballsFade(BALLS.on);
if (SOFT) ballsUpdate(SOFT);
}
function ballsDrop() {
ballsFade(false);
BALLS.meshes.forEach(function (im) { scene.remove(im); im.dispose(); im.material.dispose(); });
if (BALLS.meshes.length) BALLS.meshes[0].geometry.dispose();
BALLS.meshes = [];
}
function softStart(m, obj) {
softStop();
if (!m || m.format !== 'esasim.softbody/1' || !Array.isArray(m.bodies)) return ctx.status('Not a soft-body model (esasim.softbody/1).');
var bodies = m.bodies, n = 0;
bodies.forEach(function (b) { n += b.spheres.length; });
var x = new Float32Array(3 * n), v = new Float32Array(3 * n), x0 = new Float32Array(3 * n), r = new Float32Array(n), im = new Float32Array(n), mass = new Float32Array(n), bodyOf = new Int32Array(n);
var T = m.tissues || {}, LE = m.link_E || {}, kinds = m.kinds || [];
bodies.forEach(function (b, bi) {
var t = T[b.tissue] || { density: 1050 }, fixedSet = {}, r3 = 0;
(b.fixed_spheres || []).forEach(function (k) { fixedSet[k] = 1; });
b.spheres.forEach(function (sp) { r3 += sp[3] * sp[3] * sp[3]; });
b.spheres.forEach(function (sp, k) {
var i = b.first + k;
x[3 * i] = x0[3 * i] = sp[0]; x[3 * i + 1] = x0[3 * i + 1] = sp[1]; x[3 * i + 2] = x0[3 * i + 2] = sp[2];
r[i] = sp[3]; bodyOf[i] = bi;
mass[i] = b.mass_kg > 0 && r3 > 0 ? b.mass_kg * sp[3] * sp[3] * sp[3] / r3 : 0.6 * (t.density || 1050) * 4.18879 * sp[3] * sp[3] * sp[3];
im[i] = b.fixed || fixedSet[k] ? 0 : 1 / Math.max(1e-6, mass[i]);
});
});
var L = m.links || [], nl = L.length, la = new Int32Array(nl), lb = new Int32Array(nl), rest = new Float32Array(nl), E = new Float32Array(nl), kk = new Float32Array(nl), cc = new Float32Array(nl), linked = {};
L.forEach(function (l, j) {
var a = l[0], b = l[1], kind = kinds[l[3]] || 'body', bt = T[bodies[bodyOf[a]].tissue] || {}, e;
if (kind === 'body') e = bt.E || 5000; else if (kind === 'cross') e = 0.5 * (bt.E || 5000); else e = LE[kind] || 2000;
la[j] = a; lb[j] = b; rest[j] = l[2]; E[j] = e; linked[a < b ? a * n + b : b * n + a] = 1;
});
SOFT = { m: m, obj: obj, n: n, x: x, v: v, x0: x0, r: r, im: im, mass: mass, body: bodyOf, la: la, lb: lb, rest: rest, E: E, k: kk, c: cc, linked: linked,
binds: [], on: true, gravity: 1, softness: 1, scanG: true, acc: 0, steps: 0, grab: null, rate: 0, rateT: performance.now(), rmax: 0,
ksup: 9.81 / 0.025, damp: 0.45, dragTurn: true, placed: false, pairs: new Int32Array(0), lim: new Float32Array(0) };
for (var i = 0; i < n; i++) if (im[i] > 0 && r[i] > SOFT.rmax) SOFT.rmax = r[i];
softStiffness();
SOFT.near = {};
softPairs(function (a, b, d, rr) { if (d < rr) SOFT.near[a < b ? a * n + b : b * n + a] = d; });
softBind(obj);
softUi();
}
function softStiffness() {
var S = SOFT, dt = SOFT_DT;
for (var j = 0; j < S.la.length; j++) {
var a = S.la[j], b = S.lb[j], rm = Math.min(S.r[a], S.r[b]), A = Math.PI * rm * rm, len = Math.max(0.004, S.rest[j]);
var k = S.E[j] / S.softness * A / len;
var ma = S.im[a] ? S.mass[a] : 1e9, mb = S.im[b] ? S.mass[b] : 1e9, mr = Math.min(ma, mb);
S.k[j] = k; S.c[j] = 2 * S.damp * Math.sqrt(k * mr);
}
var ks = new Float32Array(S.n), cs = new Float32Array(S.n);
for (var j2 = 0; j2 < S.la.length; j2++) { ks[S.la[j2]] += S.k[j2]; ks[S.lb[j2]] += S.k[j2]; cs[S.la[j2]] += S.c[j2]; cs[S.lb[j2]] += S.c[j2]; }
for (var j3 = 0; j3 < S.la.length; j3++) {
var p = S.la[j3], q = S.lb[j3], f = 1, g = 1;
[p, q].forEach(function (i) { if (!S.im[i]) return; f = Math.min(f, 0.6 * S.mass[i] / (dt * dt) / Math.max(1e-9, ks[i])); g = Math.min(g, 0.9 * S.mass[i] / dt / Math.max(1e-9, cs[i])); });
S.k[j3] *= f; S.c[j3] *= g;
}
}
function softPairs(fn) {
var S = SOFT, n = S.n, x = S.x, cell = Math.max(0.02, 2 * S.rmax), grid = {}, key = function (a, b, c) { return a + ',' + b + ',' + c; };
for (var i = 0; i < n; i++) { var k = key(Math.floor(x[3 * i] / cell), Math.floor(x[3 * i + 1] / cell), Math.floor(x[3 * i + 2] / cell)); (grid[k] = grid[k] || []).push(i); }
for (var i2 = 0; i2 < n; i2++) {
if (!S.im[i2]) continue;
var gx = Math.floor(x[3 * i2] / cell), gy = Math.floor(x[3 * i2 + 1] / cell), gz = Math.floor(x[3 * i2 + 2] / cell);
for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) for (var dz = -1; dz <= 1; dz++) {
var c = grid[key(gx + dx, gy + dy, gz + dz)]; if (!c) continue;
for (var q = 0; q < c.length; q++) {
var j = c[q]; if (S.body[j] === S.body[i2] || (S.im[j] && j <= i2)) continue;
var ex = x[3 * j] - x[3 * i2], ey = x[3 * j + 1] - x[3 * i2 + 1], ez = x[3 * j + 2] - x[3 * i2 + 2], d = Math.sqrt(ex * ex + ey * ey + ez * ez), rr = S.r[i2] + S.r[j];
if (d < rr) fn(i2, j, d, rr, ex, ey, ez);
}
}
}
}
function softBind(obj) {
var S = SOFT, m = S.m, byName = {};
m.bodies.forEach(function (b, bi) { if (!b.fixed) byName[b.name] = bi; });
obj.updateMatrixWorld(true);
var inv = new THREE.Matrix4().copy(obj.matrixWorld).invert(), M = new THREE.Matrix4(), p = new THREE.Vector3();
var meshes = [];
obj.traverse(function (o) { if (o.isMesh && byName[o.name] != null) meshes.push(o); });
if (m.skin && m.skin.mesh && m.skin.mesh.positions) {
var g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(m.skin.mesh.positions, 3));
g.setIndex(m.skin.mesh.faces); g.computeVertexNormals();
var skinMat = new THREE.MeshStandardMaterial({ color: 0xd9a888, roughness: 0.85, metalness: 0, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
skinMat.onBeforeCompile = function (sh) {
sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', '#include <opaque_fragment>\n{ vec3 esV = normalize( vViewPosition ), esN = normalize( normal ); float facing = abs( dot( esN, esV ) ); float rim = 1.0 - facing; gl_FragColor.a *= mix( 0.25, 2.2, rim * rim );\n'
+ 'vec3 esH = normalize( normalize( vec3( 0.4, 0.6, 1.0 ) ) + esV ); float esNH = max( dot( esN, esH ), 0.0 );\n'
+ 'float esS = 0.42 * pow( esNH, 9.0 ) + 0.55 * pow( esNH, 80.0 );\n'
+ 'gl_FragColor.rgb += vec3( esS ); gl_FragColor.a = clamp( max( gl_FragColor.a, esS * 0.9 ), 0.0, 1.0 ); }');
};
skinMat.customProgramCacheKey = function () { return 'esasim-skin-gloss'; };
var skin = new THREE.Mesh(g, skinMat);
skin.name = 'skin'; skin.renderOrder = 5;
var grp = new THREE.Group(); grp.name = 'skin'; grp.add(skin); obj.add(grp);
PARTS.list.push({ name: 'skin', group: 'skin', file: obj.userData.file || '', mesh: skin, color: '#e8b89a' }); partsDraw();
meshes.push(skin); byName.skin = m.skin.body;
}
meshes.forEach(function (mesh) {
var bi = byName[mesh.name], b = m.bodies[bi], geo = mesh.geometry, pos = geo.attributes.position, nv = pos.count;
M.multiplyMatrices(inv, mesh.matrixWorld);
var base = new Float32Array(3 * nv);
for (var i = 0; i < nv; i++) { p.fromBufferAttribute(pos, i).applyMatrix4(M); base[3 * i] = p.x; base[3 * i + 1] = p.y; base[3 * i + 2] = p.z; }
var g2 = geo.clone(); g2.setAttribute('position', new THREE.Float32BufferAttribute(base.slice(), 3)); g2.deleteAttribute('normal'); g2.computeVertexNormals();
g2.setAttribute('esRest', new THREE.Float32BufferAttribute(base.slice(), 3));
mesh.geometry = g2; mesh.position.set(0, 0, 0); mesh.quaternion.identity(); mesh.scale.set(1, 1, 1);
if (mesh.parent !== obj) { var pm = new THREE.Matrix4().multiplyMatrices(inv, mesh.parent.matrixWorld).invert(); mesh.applyMatrix4(pm); }
var first = b.first, ns = b.spheres.length, idx = new Int32Array(4 * nv), w = new Float32Array(4 * nv);
for (var vtx = 0; vtx < nv; vtx++) {
var bx = base[3 * vtx], by = base[3 * vtx + 1], bz = base[3 * vtx + 2], best = [-1, -1, -1, -1], bw = [0, 0, 0, 0], near = -1, nd = 1e9;
for (var s2 = 0; s2 < ns; s2++) {
var i3 = first + s2, ex = S.x0[3 * i3] - bx, ey = S.x0[3 * i3 + 1] - by, ez = S.x0[3 * i3 + 2] - bz, d = Math.sqrt(ex * ex + ey * ey + ez * ez), R = S.r[i3] * 1.8;
if (d - S.r[i3] < nd) { nd = d - S.r[i3]; near = i3; }
if (d >= R) continue;
var q = 1 - (d * d) / (R * R), wt = q * q * q;                                            // a metaball field: smooth, zero at its edge
for (var z = 0; z < 4; z++) if (wt > bw[z]) { for (var y = 3; y > z; y--) { bw[y] = bw[y - 1]; best[y] = best[y - 1]; } bw[z] = wt; best[z] = i3; break; }
}
if (best[0] < 0) { best[0] = near; bw[0] = 1; }
var sum = bw[0] + bw[1] + bw[2] + bw[3];
for (var z2 = 0; z2 < 4; z2++) { idx[4 * vtx + z2] = best[z2] < 0 ? best[0] : best[z2]; w[4 * vtx + z2] = bw[z2] / sum; }
}
var phi0 = new Float32Array(nv);
for (var v2 = 0; v2 < nv; v2++) {
var ph = 0;
for (var z3 = 0; z3 < 4; z3++) {
if (!w[4 * v2 + z3]) continue;
var c3 = idx[4 * v2 + z3], R3 = S.r[c3] * 1.8, ax = base[3 * v2] - S.x0[3 * c3], ay = base[3 * v2 + 1] - S.x0[3 * c3 + 1], az = base[3 * v2 + 2] - S.x0[3 * c3 + 2], s3 = (ax * ax + ay * ay + az * az) / (R3 * R3);
if (s3 < 1) ph += (1 - s3) * (1 - s3) * (1 - s3);
}
phi0[v2] = ph;
}
S.binds.push({ mesh: mesh, base: base, idx: idx, w: w, nv: nv, phi0: phi0 });
});
}
var gW = new THREE.Vector3(), gScan = new THREE.Vector3(), qW = new THREE.Quaternion(), MW = new THREE.Matrix4(), MI = new THREE.Matrix4();
function softPlace(S, toRest) {
var e = MW.copy(S.obj.matrixWorld).elements, x0 = S.x0, x = S.x, t = S.tgt || (S.tgt = new Float32Array(3 * S.n)), dtF = S.lastDt || 0.016, tv = S.tv || (S.tv = new Float32Array(3 * S.n));
var tp = S.tp || (S.tp = new Float32Array(3 * S.n));
tp.set(t);
for (var i = 0; i < S.n; i++) {
var a = x0[3 * i], b = x0[3 * i + 1], c = x0[3 * i + 2];
var X = e[0] * a + e[4] * b + e[8] * c + e[12], Y = e[1] * a + e[5] * b + e[9] * c + e[13], Z = e[2] * a + e[6] * b + e[10] * c + e[14];
if (toRest) { tv[3 * i] = tv[3 * i + 1] = tv[3 * i + 2] = 0; } else { tv[3 * i] = (X - t[3 * i]) / dtF; tv[3 * i + 1] = (Y - t[3 * i + 1]) / dtF; tv[3 * i + 2] = (Z - t[3 * i + 2]) / dtF; }
t[3 * i] = X; t[3 * i + 1] = Y; t[3 * i + 2] = Z;
if (toRest) { x[3 * i] = X; x[3 * i + 1] = Y; x[3 * i + 2] = Z; tp[3 * i] = X; tp[3 * i + 1] = Y; tp[3 * i + 2] = Z; }
}
if (toRest) S.v.fill(0);
}
function softNeighbours(S) {
var n = S.n, x = S.x, cell = Math.max(0.02, 2 * S.rmax), grid = new Map(), out = [], lim = [];
var key = function (a, b, c) { return (a + 512) * 1048576 + (b + 512) * 1024 + (c + 512); };
for (var i = 0; i < n; i++) { var k = key(Math.floor(x[3 * i] / cell), Math.floor(x[3 * i + 1] / cell), Math.floor(x[3 * i + 2] / cell)); var l = grid.get(k); if (l) l.push(i); else grid.set(k, [i]); }
for (var i2 = 0; i2 < n; i2++) {
if (!S.im[i2]) continue;
var gx = Math.floor(x[3 * i2] / cell), gy = Math.floor(x[3 * i2 + 1] / cell), gz = Math.floor(x[3 * i2 + 2] / cell);
for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) for (var dz = -1; dz <= 1; dz++) {
var c = grid.get(key(gx + dx, gy + dy, gz + dz)); if (!c) continue;
for (var q = 0; q < c.length; q++) {
var j = c[q]; if (S.body[j] === S.body[i2] || (S.im[j] && (j <= i2 || S.linked[i2 * n + j]))) continue;
var ex = x[3 * j] - x[3 * i2], ey = x[3 * j + 1] - x[3 * i2 + 1], ez = x[3 * j + 2] - x[3 * i2 + 2];
var rr = S.r[i2] + S.r[j] + 0.01;
if (ex * ex + ey * ey + ez * ez < rr * rr) { out.push(i2, j); var d0 = S.near[i2 < j ? i2 * n + j : j * n + i2]; lim.push(d0 ? Math.min(0.85 * (S.r[i2] + S.r[j]), 0.92 * d0) : 0.85 * (S.r[i2] + S.r[j])); }
}
}
}
S.pairs = new Int32Array(out); S.lim = new Float32Array(lim);
}
function softStep(dt) {
var S = SOFT; if (!S) return;
S.lastDt = Math.max(1e-3, dt);
if (!S.placed) { softPlace(S, true); S.placed = true; softNeighbours(S); }
softPlace(S, false);
if (!S.on) { for (var i5 = 0; i5 < S.n; i5++) if (!S.im[i5]) { S.x[3 * i5] = S.tgt[3 * i5]; S.x[3 * i5 + 1] = S.tgt[3 * i5 + 1]; S.x[3 * i5 + 2] = S.tgt[3 * i5 + 2]; } softSkin(S); return; }
var x = S.x, v = S.v, im = S.im, n = S.n, h = SOFT_DT, t = S.tgt;
S.obj.getWorldQuaternion(qW);
var ease = Math.min(1, dt / 0.5);
S.gNow = S.gNow == null ? S.gravity : S.gNow + (S.gravity - S.gNow) * ease;
S.scanNow = S.scanNow == null ? (S.scanG ? 1 : 0) : S.scanNow + ((S.scanG ? 1 : 0) - S.scanNow) * ease;
if (S.softTarget != null && Math.abs(S.softTarget - S.softness) > 1e-3) { S.softness += (S.softTarget - S.softness) * ease; softStiffness(); }
gW.set(0, -9.81 * S.gNow, 0);
gScan.set(0, 0, -9.81 * S.gNow * S.scanNow).applyQuaternion(qW); gW.sub(gScan);
var ks = S.ksup * 1 / S.softness, air = 2 * S.damp * Math.sqrt(ks);                     // the support's damping: critical at Damping 1 (no swing back)
S.acc = Math.min(S.acc + dt, 0.034);
var f = S.f || (S.f = new Float32Array(3 * n)), tStart = performance.now(), done = 0, tp = S.tp, tv = S.tv, ti = S.ti || (S.ti = new Float32Array(3 * n));
var nsub = Math.max(1, Math.floor(S.acc / h));
while (S.acc >= h) {
if (done && performance.now() - tStart > SOFT_BUDGET) { S.acc = 0; S.slow = true; break; }
S.acc -= h; S.steps++; done++;
if (S.steps % 20 === 0) softNeighbours(S);
var al = Math.min(1, done / nsub);
for (var i = 0; i < n; i++) {
var i3 = 3 * i;
ti[i3] = tp[i3] + (t[i3] - tp[i3]) * al; ti[i3 + 1] = tp[i3 + 1] + (t[i3 + 1] - tp[i3 + 1]) * al; ti[i3 + 2] = tp[i3 + 2] + (t[i3 + 2] - tp[i3 + 2]) * al;
if (!im[i]) { x[i3] = ti[i3]; x[i3 + 1] = ti[i3 + 1]; x[i3 + 2] = ti[i3 + 2]; v[i3] = tv[i3]; v[i3 + 1] = tv[i3 + 1]; v[i3 + 2] = tv[i3 + 2]; continue; }
var mi = S.mass[i], kw = ks * mi;
f[i3] = mi * gW.x - air * mi * (v[i3] - tv[i3]) + kw * (ti[i3] - x[i3]);
f[i3 + 1] = mi * gW.y - air * mi * (v[i3 + 1] - tv[i3 + 1]) + kw * (ti[i3 + 1] - x[i3 + 1]);
f[i3 + 2] = mi * gW.z - air * mi * (v[i3 + 2] - tv[i3 + 2]) + kw * (ti[i3 + 2] - x[i3 + 2]);
}
for (var j = 0; j < S.la.length; j++) {
var a = S.la[j], b = S.lb[j], dx = x[3 * b] - x[3 * a], dy = x[3 * b + 1] - x[3 * a + 1], dz = x[3 * b + 2] - x[3 * a + 2], d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-9;
dx /= d; dy /= d; dz /= d;
var vr = (v[3 * b] - v[3 * a]) * dx + (v[3 * b + 1] - v[3 * a + 1]) * dy + (v[3 * b + 2] - v[3 * a + 2]) * dz;
var F = S.k[j] * (d - S.rest[j]) + S.c[j] * vr;
f[3 * a] += F * dx; f[3 * a + 1] += F * dy; f[3 * a + 2] += F * dz;
f[3 * b] -= F * dx; f[3 * b + 1] -= F * dy; f[3 * b + 2] -= F * dz;
}
var P = S.pairs;
for (var q = 0; q < P.length; q += 2) {
var a2 = P[q], b2 = P[q + 1], ex = x[3 * b2] - x[3 * a2], ey = x[3 * b2 + 1] - x[3 * a2 + 1], ez = x[3 * b2 + 2] - x[3 * a2 + 2], rr = S.lim[q >> 1];
var d2 = ex * ex + ey * ey + ez * ez; if (d2 >= rr * rr) continue;
var bone = !im[a2] || !im[b2], mc = bone ? (im[a2] ? S.mass[a2] : S.mass[b2]) : Math.min(S.mass[a2], S.mass[b2]);
var dd = Math.sqrt(d2) || 1e-6, F2 = (bone ? 0.25 : 0.06) * mc / (h * h) * (rr - dd) / dd;
var vn = ((v[3 * b2] - v[3 * a2]) * ex + (v[3 * b2 + 1] - v[3 * a2 + 1]) * ey + (v[3 * b2 + 2] - v[3 * a2 + 2]) * ez) / dd;
if (vn < 0) F2 -= 0.25 * S.damp * mc / h * vn / dd;                                      // contacts do not bounce back
f[3 * a2] -= F2 * ex; f[3 * a2 + 1] -= F2 * ey; f[3 * a2 + 2] -= F2 * ez;
f[3 * b2] += F2 * ex; f[3 * b2 + 1] += F2 * ey; f[3 * b2 + 2] += F2 * ez;
}
if (S.grab) {
var gi = S.grab.i, kg = 0.08 * S.mass[gi] / (h * h);
f[3 * gi] += kg * (S.grab.t.x - x[3 * gi]); f[3 * gi + 1] += kg * (S.grab.t.y - x[3 * gi + 1]); f[3 * gi + 2] += kg * (S.grab.t.z - x[3 * gi + 2]);
}
for (var i2 = 0; i2 < n; i2++) {
if (!im[i2]) continue;
v[3 * i2] += f[3 * i2] * im[i2] * h; v[3 * i2 + 1] += f[3 * i2 + 1] * im[i2] * h; v[3 * i2 + 2] += f[3 * i2 + 2] * im[i2] * h;
x[3 * i2] += v[3 * i2] * h; x[3 * i2 + 1] += v[3 * i2 + 1] * h; x[3 * i2 + 2] += v[3 * i2 + 2] * h;
}
}
for (var i4 = 0; i4 < n; i4++) if (!im[i4]) { x[3 * i4] = t[3 * i4]; x[3 * i4 + 1] = t[3 * i4 + 1]; x[3 * i4 + 2] = t[3 * i4 + 2]; }
if (!isFinite(x[0] + x[3 * (n - 1)])) { softPlace(S, true); S.softness = Math.max(0.25, S.softness / 2); softStiffness(); ctx.status('The soft tissue went unstable: started again, stiffer.'); }
softSkin(S);
var now = performance.now();
if (now - S.rateT > 1000) { S.rate = Math.round(S.steps * 1000 / (now - S.rateT)); S.steps = 0; S.rateT = now; softRate(); }
}
function boneGrid(S) {
var cell = 0.02, map = new Map(), any = false;
for (var i = 0; i < S.n; i++) {
if (S.im[i] || S.m.bodies[S.body[i]].name === 'skin') continue;
any = true;
var r = S.r[i], x = S.x0[3 * i], y = S.x0[3 * i + 1], z = S.x0[3 * i + 2];
for (var a = Math.floor((x - r) / cell); a <= Math.floor((x + r) / cell); a++) for (var b = Math.floor((y - r) / cell); b <= Math.floor((y + r) / cell); b++) for (var c = Math.floor((z - r) / cell); c <= Math.floor((z + r) / cell); c++) {
var k = ((a + 1024) * 2048 + b + 1024) * 2048 + c + 1024, l = map.get(k); if (l) l.push(i); else map.set(k, [i]);
}
}
return any ? { cell: cell, map: map } : null;
}
function softSkin(S) {
var e = MI.copy(S.obj.matrixWorld).invert().elements, x = S.x, n = S.n, d = S.dl || (S.dl = new Float32Array(3 * n));
for (var i = 0; i < n; i++) {
var X = x[3 * i], Y = x[3 * i + 1], Z = x[3 * i + 2];
d[3 * i] = e[0] * X + e[4] * Y + e[8] * Z + e[12] - S.x0[3 * i];
d[3 * i + 1] = e[1] * X + e[5] * Y + e[9] * Z + e[13] - S.x0[3 * i + 1];
d[3 * i + 2] = e[2] * X + e[6] * Y + e[10] * Z + e[14] - S.x0[3 * i + 2];
}
S.frame = (S.frame || 0) + 1;
if (S.boneGrid === undefined) {
S.boneGrid = boneGrid(S);
if (S.boneGrid) S.binds.forEach(function (bd) {
var nb = new Uint8Array(bd.nv), c = S.boneGrid.cell, m = S.boneGrid.map;
for (var v = 0; v < bd.nv; v++) {
var a = Math.floor(bd.base[3 * v] / c), b = Math.floor(bd.base[3 * v + 1] / c), cc = Math.floor(bd.base[3 * v + 2] / c);
search: for (var da = -2; da <= 2; da++) for (var db = -2; db <= 2; db++) for (var dc = -2; dc <= 2; dc++) if (m.has(((a + da + 1024) * 2048 + b + db + 1024) * 2048 + cc + dc + 1024)) { nb[v] = 1; break search; }
}
bd.nearBone = nb;
});
}
var bg = S.boneGrid;
S.binds.forEach(function (bd) {
if (!bd.mesh.visible) return;
var arr = bd.mesh.geometry.attributes.position.array, base = bd.base, idx = bd.idx, w = bd.w;
for (var vtx = 0; vtx < bd.nv; vtx++) {
var ox = 0, oy = 0, oz = 0, o4 = 4 * vtx;
for (var z = 0; z < 4; z++) { var ww = w[o4 + z]; if (!ww) continue; var p = 3 * idx[o4 + z]; ox += ww * d[p]; oy += ww * d[p + 1]; oz += ww * d[p + 2]; }
var px = base[3 * vtx] + ox, py = base[3 * vtx + 1] + oy, pz = base[3 * vtx + 2] + oz, f0 = bd.phi0[vtx];
if (f0 > 1e-4) for (var it = 0; it < 2; it++) {
var ph = 0, gx = 0, gy = 0, gz = 0, rmin = 1;
for (var z4 = 0; z4 < 4; z4++) {
if (!w[o4 + z4]) continue;
var c4 = idx[o4 + z4], R4 = S.r[c4] * 1.8, ex = px - (S.x0[3 * c4] + d[3 * c4]), ey = py - (S.x0[3 * c4 + 1] + d[3 * c4 + 1]), ez = pz - (S.x0[3 * c4 + 2] + d[3 * c4 + 2]), s4 = (ex * ex + ey * ey + ez * ez) / (R4 * R4);
if (R4 < rmin) rmin = R4;
if (s4 >= 1) continue;
var u = 1 - s4, k4 = -6 * u * u / (R4 * R4);
ph += u * u * u; gx += k4 * ex; gy += k4 * ey; gz += k4 * ez;
}
var g2 = gx * gx + gy * gy + gz * gz; if (g2 < 1e-12) break;
var st = (f0 - ph) / g2, mx = 0.15 * rmin, len = Math.abs(st) * Math.sqrt(g2);
if (len > mx) st *= mx / len;
px += st * gx; py += st * gy; pz += st * gz;
}
if (bg && bd.nearBone && bd.nearBone[vtx]) {
var gk = ((Math.floor(px / bg.cell) + 1024) * 2048 + Math.floor(py / bg.cell) + 1024) * 2048 + Math.floor(pz / bg.cell) + 1024, cand = bg.map.get(gk);
if (cand) for (var cq = 0; cq < cand.length; cq++) {
var bi2 = cand[cq], cx = S.x0[3 * bi2], cy = S.x0[3 * bi2 + 1], cz = S.x0[3 * bi2 + 2], br = S.r[bi2];
var qx = px - cx, qy = py - cy, qz = pz - cz, qd = qx * qx + qy * qy + qz * qz;
if (qd >= br * br) continue;
var rx = base[3 * vtx] - cx, ry = base[3 * vtx + 1] - cy, rz = base[3 * vtx + 2] - cz;
if (rx * rx + ry * ry + rz * rz < br * br) continue;
var ql = Math.sqrt(qd) || 1e-6; px = cx + qx / ql * br; py = cy + qy / ql * br; pz = cz + qz / ql * br;
}
}
arr[3 * vtx] = px; arr[3 * vtx + 1] = py; arr[3 * vtx + 2] = pz;
}
bd.mesh.geometry.attributes.position.needsUpdate = true;
if (S.frame % 3 === 0) bd.mesh.geometry.computeVertexNormals();
bd.mesh.geometry.boundingSphere = null; bd.mesh.geometry.boundingBox = null;
});
ballsUpdate(S);
}
var softEl = null;
function softUi() {
if (!softEl) {
softEl = document.createElement('div');
softEl.style.cssText = 'display:flex;flex-direction:column;gap:5px;padding:0 10px 8px;border-bottom:1px solid #2a303b;margin-bottom:4px';
softEl.innerHTML = '<div style="display:flex;gap:6px;align-items:center"><b style="flex:1">Soft tissue</b><button class="pt-b sf-run" title="Pause or go on">Pause</button><button class="pt-b sf-reset" title="Back to the scan\'s shape">Reset</button><button class="pt-b sf-pull" title="Drag an organ to pull it">Pull</button></div>'
+ '<label style="display:flex;gap:6px;align-items:center;font-size:11.5px">Gravity<input class="sf-g" type="range" min="0" max="300" value="100" style="flex:1;accent-color:#7b8cff"><span class="sf-gv" style="width:34px;text-align:right">1 g</span></label>'
+ '<label style="display:flex;gap:6px;align-items:center;font-size:11.5px">Softness<input class="sf-s" type="range" min="-200" max="200" value="0" style="flex:1;accent-color:#7b8cff"><span class="sf-sv" style="width:34px;text-align:right">×1</span></label>'
+ '<label style="display:flex;gap:6px;align-items:center;font-size:11.5px">Damping<input class="sf-d" type="range" min="5" max="100" value="45" style="flex:1;accent-color:#7b8cff"><span class="sf-dv" style="width:34px;text-align:right">0.45</span></label>'
+ '<label style="display:flex;gap:6px;align-items:center;font-size:11.5px"><input class="sf-scan" type="checkbox" checked style="margin:0;accent-color:#7b8cff">Lying on the back is at rest (the scan\'s pose)</label>'
+ '<label style="display:flex;gap:6px;align-items:center;font-size:11.5px"><input class="sf-drag" type="checkbox" checked style="margin:0;accent-color:#7b8cff">Drag turns the body (with Ctrl: moves it), so gravity and inertia act</label>'
+ '<div class="sf-rate" style="color:#8a93a3;font-size:11px"></div>';
partsEl.querySelector('.pt-body').insertBefore(softEl, partsEl.querySelector('.pt-body').firstChild);
softEl.addEventListener('click', function (e) {
var t = e.target; if (!SOFT) return;
if (t.closest('.sf-run')) { SOFT.on = !SOFT.on; t.textContent = SOFT.on ? 'Pause' : 'Go on'; }
if (t.closest('.sf-reset')) softPlace(SOFT, true);
if (t.closest('.sf-pull')) { SOFT.pull = !SOFT.pull; t.style.background = SOFT.pull ? '#2f4ae0' : ''; renderer.domElement.style.cursor = SOFT.pull ? 'grab' : ''; }
});
softEl.querySelector('.sf-g').addEventListener('input', function () { if (SOFT) SOFT.gravity = +this.value / 100; softEl.querySelector('.sf-gv').textContent = (+this.value / 100).toFixed(1).replace(/\.0$/, '') + ' g'; });
softEl.querySelector('.sf-s').addEventListener('input', function () { var k = Math.pow(2, +this.value / 100); if (SOFT) SOFT.softTarget = k; softEl.querySelector('.sf-sv').textContent = '×' + (k < 1 ? k.toFixed(2) : k.toFixed(1)).replace(/\.0+$/, ''); });
softEl.querySelector('.sf-scan').addEventListener('change', function () { if (SOFT) SOFT.scanG = this.checked; });
softEl.querySelector('.sf-d').addEventListener('input', function () { if (SOFT) { SOFT.damp = +this.value / 100; softStiffness(); } softEl.querySelector('.sf-dv').textContent = (+this.value / 100).toFixed(2).replace(/0$/, ''); });
softEl.querySelector('.sf-drag').addEventListener('change', function () { if (SOFT) SOFT.dragTurn = this.checked; });
}
softEl.style.display = 'flex';
softEl.querySelector('.sf-run').textContent = 'Pause';
SOFT.gravity = +softEl.querySelector('.sf-g').value / 100; SOFT.softness = Math.pow(2, +softEl.querySelector('.sf-s').value / 100); SOFT.scanG = softEl.querySelector('.sf-scan').checked;
SOFT.damp = +softEl.querySelector('.sf-d').value / 100; SOFT.dragTurn = softEl.querySelector('.sf-drag').checked;
softStiffness();
softRate();
if (lookEl) lookEl.querySelector('.lk-balls-l').style.display = 'flex';
if (BALLS.on) ballsShow(true);
}
function softRate() {
if (!softEl || !SOFT) return;
var nb = SOFT.m.bodies.filter(function (b) { return !b.fixed; }).length;
var real = Math.round(100 * (SOFT.rate || 0) * SOFT_DT);
softEl.querySelector('.sf-rate').textContent = nb + ' soft structures, ' + SOFT.n + ' particles, ' + SOFT.la.length + ' links · ' + (SOFT.rate || 0) + ' steps/s' + (SOFT.rate && real < 90 ? ' (' + real + ' % of real time on this computer)' : '');
}
var sfRay = new THREE.Raycaster(), sfM = new THREE.Vector2();
function sfPoint(ev, plane) {
var rc = renderer.domElement.getBoundingClientRect();
sfM.set(((ev.clientX - rc.left) / rc.width) * 2 - 1, -((ev.clientY - rc.top) / rc.height) * 2 + 1);
sfRay.setFromCamera(sfM, camera);
return sfRay.ray.intersectPlane(plane, new THREE.Vector3());
}
renderer.domElement.addEventListener('pointerdown', function (ev) {
if (!SOFT || !SOFT.pull || mode !== 'files') return;
var i = partAt(ev); if (i < 0) return;
var hit = ptRay.intersectObject(PARTS.list[i].mesh, false)[0]; if (!hit) return;
var lp = hit.point.clone(), best = -1, bd = 1e9, S = SOFT;
for (var k = 0; k < S.n; k++) { if (!S.im[k]) continue; var dx = S.x[3 * k] - lp.x, dy = S.x[3 * k + 1] - lp.y, dz = S.x[3 * k + 2] - lp.z, d = dx * dx + dy * dy + dz * dz; if (d < bd) { bd = d; best = k; } }
if (best < 0) return;
var nrm = camera.getWorldDirection(new THREE.Vector3());
S.grab = { i: best, plane: new THREE.Plane().setFromNormalAndCoplanarPoint(nrm, hit.point), t: lp };
controls.enabled = false; renderer.domElement.style.cursor = 'grabbing'; ev.stopImmediatePropagation();
}, true);
renderer.domElement.addEventListener('pointermove', function (ev) {
if (!SOFT || !SOFT.grab) return;
var w = sfPoint(ev, SOFT.grab.plane); if (w) SOFT.grab.t = w;
});
var turnD = null;
renderer.domElement.addEventListener('pointerdown', function (ev) {
var hold = SOFT ? SOFT.dragTurn && !SOFT.pull : P.mouse_mode === 'The model';
if (!hold || mode !== 'files' || ev.button !== 0 || !FILES.root) return;
turnD = { x: ev.clientX, y: ev.clientY, move: ev.ctrlKey || ev.shiftKey || ev.metaKey };
controls.enabled = false; ev.stopImmediatePropagation();
try { renderer.domElement.setPointerCapture(ev.pointerId); } catch (e) { /* not needed */ }
}, true);
renderer.domElement.addEventListener('pointermove', function (ev) {
if (!turnD) return;
var dx = ev.clientX - turnD.x, dy = ev.clientY - turnD.y, root = FILES.root; turnD.x = ev.clientX; turnD.y = ev.clientY;
if (turnD.move) {
var dist = camera.position.distanceTo(controls.target), k = dist * 2 * Math.tan(camera.fov * Math.PI / 360) / Math.max(1, renderer.domElement.clientHeight);
root.position.add(new THREE.Vector3(dx * k, -dy * k, 0).applyQuaternion(camera.quaternion));
} else {
var up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion), right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
root.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(up, dx * 0.008)).premultiply(new THREE.Quaternion().setFromAxisAngle(right, dy * 0.008)).normalize();
}
root.updateMatrixWorld(true); flown = true;
});
window.addEventListener('pointerup', function () { if (turnD) { turnD = null; controls.enabled = true; } });
window.addEventListener('pointerup', function () { if (SOFT && SOFT.grab) { SOFT.grab = null; controls.enabled = true; renderer.domElement.style.cursor = SOFT.pull ? 'grab' : ''; } });
var MOUSE = { t: [0, 0, 0], r: [0, 0, 0], ft: [0, 0, 0], fr: [0, 0, 0], at: 0, seen: false }, flying = false, flown = false;
var V3 = THREE.Vector3, flyEuler = new THREE.Euler(0, 0, 0, 'YXZ'), flyQ = new THREE.Quaternion();
ctx.on('spacemouse', function (m) {
MOUSE.t = m.t || [0, 0, 0]; MOUSE.r = m.r || [0, 0, 0]; MOUSE.at = performance.now();
if (!MOUSE.seen) { MOUSE.seen = true; smBtn.textContent = '3D mouse ✓'; smBtn.title = '3D mouse connected: push, pull and lift the cap to move the camera, tilt and twist it to turn. Left button: fit the view; right button: level the horizon.'; }
(m.pressed || []).forEach(function (b) { if (b === 0) { flying = false; flown = false; setCam(false); fitView(); } else if (b === 1) { flying = false; controls.enableDamping = true; } });
});
function smooth(out, raw, k, kStop) {
var any = false;
for (var i = 0; i < 3; i++) {
out[i] += (raw[i] - out[i]) * (raw[i] === 0 ? kStop : k);
if (raw[i] === 0 && Math.abs(out[i]) < 0.02) out[i] = 0;
if (out[i]) any = true;
}
return any;
}
function applyMouse(dt) {
var stale = performance.now() - MOUSE.at > 400, Z = [0, 0, 0], k = 1 - Math.exp(-dt / 0.07), ks = 1 - Math.exp(-dt / 0.025);
var mt = smooth(MOUSE.ft, stale ? Z : MOUSE.t, k, ks), mr = smooth(MOUSE.fr, stale ? Z : MOUSE.r, k, ks);
if (!mt && !mr) return;
var T = MOUSE.ft, R = MOUSE.fr;
if (P.mouse_mode === 'The model' && mode === 'files' && FILES.root) return turnModel(T, R, dt);
if (mode === 'rocket' && (ONBOARD || RK.cam === 'track')) return;
if (mode === 'rocket' && RK.cam !== 'free') rkSetCam('free', true);
if (!flying) controls.enableDamping = false;
if (follow) setCam(false);
flown = true;
flying = true;
var dir = P.mouse_mode === 'Move the scene' ? -1 : 1, sp = Math.max(0.05, +P.mouse_speed || 1);
var dist = Math.max(0.5, camera.position.distanceTo(controls.target));
var move = new V3(T[0], -T[2], T[1]).multiplyScalar(dir * sp * dt * dist * 1.2).applyQuaternion(camera.quaternion);
camera.position.add(move);
var a = dir * sp * dt * 1.6;
flyEuler.set(R[0] * a, -R[2] * a, R[1] * a, 'YXZ');
camera.quaternion.multiply(flyQ.setFromEuler(flyEuler)).normalize();
camera.updateMatrixWorld();
controls.target.copy(camera.position).addScaledVector(new V3(0, 0, -1).applyQuaternion(camera.quaternion), dist);
keepView(false);
}
function turnModel(T, R, dt) {
var sp = Math.max(0.05, +P.mouse_speed || 1), root = FILES.root;
var dist = Math.max(0.05, camera.position.distanceTo(controls.target));
flown = true;
var a = sp * dt * 1.6;
flyEuler.set(R[0] * a, -R[2] * a, R[1] * a, 'YXZ');
var qc = camera.quaternion.clone(), qd = qc.clone().multiply(flyQ.setFromEuler(flyEuler)).multiply(qc.invert());
root.quaternion.premultiply(qd).normalize();
var mv = new V3(T[0], -T[2], 0).multiplyScalar(sp * dt * dist * 0.8).applyQuaternion(camera.quaternion);
root.position.add(mv);
if (T[1]) {
var fwd = controls.target.clone().sub(camera.position).normalize(), step = T[1] * sp * dt * dist * 1.2;
if (dist - step > 0.02) camera.position.addScaledVector(fwd, step);
}
root.updateMatrixWorld(true);
}
var CAP = { rec: null, offline: false, pr: renderer.getPixelRatio(), started: 0, timer: 0 };
var tools = document.createElement('div');
tools.style.cssText = 'position:absolute;right:12px;top:12px;display:flex;gap:6px;pointer-events:auto;align-items:center';
var btnCss = 'all:unset;cursor:pointer;padding:3px 9px;border:1px solid #2a303b;border-radius:7px;background:rgba(10,14,22,.72);backdrop-filter:blur(6px);font-size:12px;white-space:nowrap';
tools.innerHTML = '<button class="sm" style="' + btnCss + '" title="Fly the camera with a 3Dconnexion SpaceMouse (Chrome, Edge or Opera)">3D mouse</button>'
+ '<button class="pic" style="' + btnCss + '" title="Save a picture of the view">Picture</button>'
+ '<button class="recb" style="' + btnCss + '" title="Record a video of the view">● Record</button>'
+ '<button class="capset" style="' + btnCss + '" title="Picture and video settings">⚙</button>';
ui.appendChild(tools);
var smBtn = tools.querySelector('.sm'), picBtn = tools.querySelector('.pic'), recBtn = tools.querySelector('.recb');
smBtn.onclick = function () { ctx.spacemouse(); };
var selCss = 'background:#1b2029;color:#e8ecf2;border:1px solid #2a303b;border-radius:6px;font-size:12px;padding:2px 4px;width:100%';
var panel = document.createElement('div');
panel.style.cssText = 'position:absolute;right:12px;top:46px;width:270px;background:rgba(10,14,22,.92);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:10px 12px;pointer-events:auto;display:none;gap:7px;flex-direction:column;z-index:3';
var VID = [];
if (window.MediaRecorder) [['video/mp4;codecs=avc1.640028', 'MP4 (H.264)'], ['video/mp4', 'MP4'], ['video/webm;codecs=vp9', 'WebM (VP9)'], ['video/webm;codecs=vp8', 'WebM (VP8)'], ['video/webm', 'WebM']].forEach(function (v) {
if (MediaRecorder.isTypeSupported(v[0]) && !VID.some(function (x) { return x[1].split(' ')[0] === v[1].split(' ')[0] && x[0].indexOf('codecs') > 0; })) VID.push(v);
});
var opt = function (list, sel) { return list.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === sel ? ' selected' : '') + '>' + o[1] + '</option>'; }).join(''); };
panel.innerHTML = '<b style="font-size:12.5px">Pictures and videos</b>'
+ '<label>Picture<select class="c-img" style="' + selCss + '">' + opt([['image/png', 'PNG'], ['image/jpeg', 'JPEG'], ['image/webp', 'WebP']], 'image/png') + '</select></label>'
+ '<label>Record<select class="c-mode" style="' + selCss + '">' + opt([['live', 'What I see, in real time'], ['replay', 'The replay of this run, frame by frame']], 'live') + '</select></label>'
+ '<label>Video format<select class="c-vid" style="' + selCss + '"></select></label>'
+ '<label>Size<select class="c-size" style="' + selCss + '">' + opt([['view', 'As the view'], ['1280x720', '1280 × 720 (HD)'], ['1920x1080', '1920 × 1080 (Full HD)'], ['2560x1440', '2560 × 1440'], ['3840x2160', '3840 × 2160 (4K)']], 'view') + '</select></label>'
+ '<div style="display:flex;gap:8px"><label style="flex:1">Frames per second<select class="c-fps" style="' + selCss + '">' + opt([['24', '24'], ['25', '25'], ['30', '30'], ['60', '60']], '30') + '</select></label>'
+ '<label style="flex:1">Quality<select class="c-q" style="' + selCss + '">' + opt([['0.08', 'Standard'], ['0.16', 'High'], ['0.32', 'Best']], '0.16') + '</select></label></div>'
+ '<div class="c-note" style="color:#9aa3b2;font-size:11.5px"></div>';
panel.querySelectorAll('label').forEach(function (l) { l.style.cssText = 'display:flex;flex-direction:column;gap:3px;color:#c9d1dc;font-size:11.5px'; });
ui.appendChild(panel);
var cq = function (c) { return panel.querySelector(c); };
function vidFormats() {
var live = cq('.c-mode').value === 'live', list = [];
if (live) list = VID.slice();
else {
if (window.VideoEncoder) list.push(['mp4', 'MP4 (H.264)'], ['webm-vp9', 'WebM (VP9)']);
list.push(['zip', 'PNG frames in a zip']);
}
var cur = cq('.c-vid').value;
cq('.c-vid').innerHTML = list.length ? opt(list, cur) : '<option value="">This browser cannot record video</option>';
cq('.c-note').textContent = live ? 'Records the view as it plays, with your camera moves (the 3D mouse too). Press Record again to stop.'
: (runs.length ? 'Renders the selected run from its start to its end at the speed of the timeline, every frame, then saves it.' : 'Needs a replay: a scene with recorded runs.');
recBtn.textContent = live ? '● Record' : '● Render';
}
cq('.c-mode').onchange = vidFormats; vidFormats();
tools.querySelector('.capset').onclick = function () { panel.style.display = panel.style.display === 'none' ? 'flex' : 'none'; vidFormats(); };
function capSize() {
var v = cq('.c-size').value;
if (v === 'view') { var r = renderer.domElement.getBoundingClientRect(), pr = CAP.pr; return [Math.round(r.width * pr / 2) * 2, Math.round(r.height * pr / 2) * 2]; }
return v.split('x').map(Number);
}
function setCapSize(w, h) { renderer.setPixelRatio(1); renderer.setSize(w, h, false); if (composer) composer.setSize(w, h); renderer.domElement.style.objectFit = 'contain'; camera.aspect = w / h; camera.updateProjectionMatrix(); }
function endCapSize() { renderer.setPixelRatio(CAP.pr); renderer.domElement.style.objectFit = ''; resize(); }
function fileName(ext) { var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; }; return '3d-view-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + '.' + ext; }
function note(text) { cq('.c-note').textContent = text; }
picBtn.onclick = function () {
var sz = capSize(), type = cq('.c-img').value;
CAP.pic = true; setCapSize(sz[0], sz[1]); draw();
capSource().toBlob(function (b) {
CAP.pic = false; endCapSize();
if (b) ctx.save(fileName(type === 'image/jpeg' ? 'jpg' : type.split('/')[1]), b); else ctx.status('The picture could not be made.');
}, type, 0.95);
};
recBtn.onclick = function () {
if (CAP.rec) { CAP.rec.stop(); return; }
if (CAP.offline) { CAP.cancel = true; return; }
if (cq('.c-mode').value === 'live') recordLive(); else renderReplay();
};
function recordLive() {
var mime = cq('.c-vid').value; if (!mime || !renderer.domElement.captureStream) { note('This browser cannot record the view.'); return; }
var sz = capSize(), fps = +cq('.c-fps').value, bits = Math.round(sz[0] * sz[1] * fps * +cq('.c-q').value);
setCapSize(sz[0], sz[1]); CAP.pic = true; draw(); var comp = capCompose(); CAP.pic = false;
var chunks = [], rec;
var stream = comp.captureStream(fps), at = AUD.rec && ((AUD.on && (mode === 'rocket' || mode === 'car' || mode === 'village' || mode === 'humanoid')) || (mode === 'car' && CR.musicOn && CR.mus)) ? AUD.rec.stream.getAudioTracks()[0] : null, mt = mime;
if (at) { stream.addTrack(at); var withA = /mp4/.test(mime) ? [mime.replace(/codecs=([^;]+)/, 'codecs=$1,mp4a.40.2'), 'video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4'] : [mime.replace(/codecs=([^;]+)/, 'codecs=$1,opus'), 'video/webm;codecs=vp9,opus', 'video/webm'];
mt = withA.filter(function (x) { return /codecs/.test(x) ? /,/.test(x) && MediaRecorder.isTypeSupported(x) : MediaRecorder.isTypeSupported(x); })[0] || mime; }
try { rec = new MediaRecorder(stream, { mimeType: mt, videoBitsPerSecond: bits, audioBitsPerSecond: 160000 }); } catch (e) { endCapSize(); note('Recording failed: ' + e.message); return; }
rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
rec.onstop = function () {
clearInterval(CAP.timer); CAP.rec = null; endCapSize(); recBtn.textContent = '● Record'; recBtn.style.background = 'rgba(10,14,22,.72)';
ctx.save(fileName(mime.indexOf('mp4') >= 0 ? 'mp4' : 'webm'), new Blob(chunks, { type: mime.split(';')[0] }));
};
rec.start(1000); CAP.rec = rec; CAP.started = Date.now();
recBtn.style.background = '#b4232c';
CAP.timer = setInterval(function () { var s = Math.round((Date.now() - CAP.started) / 1000); recBtn.textContent = '■ Stop ' + Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + s % 60; }, 250);
}
function Zip() {
var parts = [], central = [], offset = 0, table = new Uint32Array(256);
for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
function crc(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = table[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
return {
add: function (name, bytes) {
var nm = new TextEncoder().encode(name), sum = crc(bytes), h = new DataView(new ArrayBuffer(30));
h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint32(14, sum, true); h.setUint32(18, bytes.length, true); h.setUint32(22, bytes.length, true); h.setUint16(26, nm.length, true);
parts.push(h.buffer, nm, bytes);
var cd = new DataView(new ArrayBuffer(46));
cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint32(16, sum, true); cd.setUint32(20, bytes.length, true); cd.setUint32(24, bytes.length, true); cd.setUint16(28, nm.length, true); cd.setUint32(42, offset, true);
central.push(cd.buffer, nm);
offset += 30 + nm.length + bytes.length;
},
blob: function () {
var size = central.reduce(function (a, b) { return a + b.byteLength; }, 0), end = new DataView(new ArrayBuffer(22)), count = central.length / 2;
end.setUint32(0, 0x06054b50, true); end.setUint16(8, count, true); end.setUint16(10, count, true); end.setUint32(12, size, true); end.setUint32(16, offset, true);
return new Blob(parts.concat(central, [end.buffer]), { type: 'application/zip' });
}
};
}
function renderReplay() {
if (!runs.length) { note('Nothing to render: this view has no replay.'); return; }
var fmt = cq('.c-vid').value, sz = capSize(), fps = +cq('.c-fps').value, step = speed / fps;
var total = Math.max(1, Math.ceil(duration / step) + 1), wasPlaying = playing, wasT = t, i = 0, enc = null, mux = null, zip = null, failed = null;
var w = sz[0], h = sz[1];
CAP.offline = true; CAP.cancel = false; playing = false; panel.style.display = 'none';
recBtn.style.background = '#b4232c';
var done = function (blob, ext) {
CAP.offline = false; t = wasT; playing = wasPlaying; endCapSize(); recBtn.style.background = 'rgba(10,14,22,.72)'; vidFormats();
if (blob) ctx.save(fileName(ext), blob); else if (failed) ctx.status('The video could not be made: ' + failed);
};
var start = function () {
setCapSize(w, h); t = 0;
var next = function () {
if (CAP.cancel) { done(null); return; }
if (failed) { done(null); return; }
if (i >= total) {
if (zip) { done(zip.blob(), 'zip'); return; }
enc.flush().then(function () { mux.finalize(); done(new Blob([mux.target.buffer], { type: fmt === 'mp4' ? 'video/mp4' : 'video/webm' }), fmt === 'mp4' ? 'mp4' : 'webm'); }).catch(function (e) { failed = e.message; done(null); });
return;
}
t = Math.min(duration, i * step); advance(step, true); draw();
recBtn.textContent = '■ ' + Math.round(i / total * 100) + '%';
if (zip) {
var idx = i;
capSource().toBlob(function (b) { b.arrayBuffer().then(function (buf) { zip.add('frame_' + String(idx).padStart(5, '0') + '.png', new Uint8Array(buf)); i++; setTimeout(next, 0); }); }, 'image/png');
return;
}
var vf = new VideoFrame(capSource(), { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
enc.encode(vf, { keyFrame: i % (fps * 2) === 0 }); vf.close(); i++;
if (enc.encodeQueueSize > 6) setTimeout(function wait() { if (enc.encodeQueueSize > 2) setTimeout(wait, 5); else next(); }, 5); else setTimeout(next, 0);
};
next();
};
if (fmt === 'zip') { zip = Zip(); start(); return; }
if (!window.VideoEncoder) { done(null); note('This browser cannot encode video frame by frame: choose PNG frames in a zip.'); return; }
var mp4 = fmt === 'mp4', bits = Math.round(w * h * fps * +cq('.c-q').value);
var codecs = mp4 ? ['avc1.640034', 'avc1.640033', 'avc1.640032', 'avc1.64002a', 'avc1.640028', 'avc1.4d0034', 'avc1.42e034'] : ['vp09.00.51.08', 'vp09.00.41.08', 'vp8'];
var pick = function (k) {
if (k >= codecs.length) return Promise.reject(new Error('no encoder for ' + w + ' × ' + h + ' at ' + fps + ' frames per second; choose a smaller size'));
var cfg = { codec: codecs[k], width: w, height: h, bitrate: bits, framerate: fps };
return VideoEncoder.isConfigSupported(cfg).then(function (r) { return r.supported ? cfg : pick(k + 1); }, function () { return pick(k + 1); });
};
Promise.all([ctx.load(mp4 ? 'mp4-muxer' : 'webm-muxer'), pick(0)]).then(function (x) {
var M = x[0], cfg = x[1];
mux = mp4 ? new M.Muxer({ target: new M.ArrayBufferTarget(), video: { codec: 'avc', width: w, height: h, frameRate: fps }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' })
: new M.Muxer({ target: new M.ArrayBufferTarget(), video: { codec: cfg.codec === 'vp8' ? 'V_VP8' : 'V_VP9', width: w, height: h, frameRate: fps }, firstTimestampBehavior: 'offset' });
enc = new VideoEncoder({ output: function (chunk, meta) { mux.addVideoChunk(chunk, meta); }, error: function (e) { failed = e.message; } });
enc.configure(cfg);
start();
}).catch(function (e) { failed = e.message; done(null); note('Not made: ' + e.message); });
}
var RK = { on: false, eps: {}, order: [], cur: null, ct: null, played: {}, wall: 0, cam: 'booster', idle: true, banner: null,
lastEp: null, emit: 0, soot: 0, lastT: null, clock: null, warp: 1 };
var R_EARTH = 6371000, RK_DRY = 25600, RK_LEN = 45;
var RK_LEG_HINGE = 1.6, RK_LEG_LEN = 7.55, RK_LEG_ANG = Math.PI - Math.atan2(7.05, 1.6 + 1.2 - 0.25);
el.__view3d.rk = RK; el.__view3d.rkCam = function (c) { rkSetCam(c, true); RK.camReset = true; };
var ONBOARD = String(P.camera || 'free').toLowerCase();
if (ONBOARD === 'free' || /^car:/.test(ONBOARD)) ONBOARD = '';
var ONB_FIXED = ONBOARD;
if (ONB_FIXED && ctx.peer) {
var toMain = document.createElement('button'); toMain.textContent = '⇱ Main view'; toMain.title = 'Show this camera in the main view (the one with the controls)';
toMain.style.cssText = 'all:unset;cursor:pointer;padding:3px 9px;border:1px solid #2a303b;border-radius:7px;background:rgba(10,14,22,.72);backdrop-filter:blur(6px);font-size:12px;white-space:nowrap';
toMain.onclick = function () { ctx.peer('rocket-camera', { cam: ONB_FIXED === 'tracking (ground)' ? 'track' : ONB_FIXED }); };
tools.insertBefore(toMain, tools.firstChild);
}
if (!ONB_FIXED && ctx.on) ctx.on('peer', function (topic, data) { if (topic === 'rocket-camera' && data && data.cam && mode === 'rocket') rkSetCam(String(data.cam)); });
function rocketItems(stream) { return stream.filter(function (it) { return it && it.data && it.data.format === 'esasim.rocket/1'; }); }
var RF = {};
function rkIdx(fields) { RF = {}; (fields || []).forEach(function (f, i) { RF[f] = i; }); }
var FOC = { x: 0, y: 0, z: 0 };
function W(x, y, z, out) { out = out || new THREE.Vector3(); return out.set(x - FOC.x, z - FOC.z, -(y - FOC.y)); }
function camWorld() { return { x: camera.position.x + FOC.x, y: FOC.y - camera.position.z, z: camera.position.y + FOC.z }; }
function dropAt(x, y) { var c = RK.globeOn ? { x: 0, y: 0 } : camWorld(), dx = x - c.x, dy = y - c.y; return (dx * dx + dy * dy) / (2 * R_EARTH); } // seen from far out, the Earth bends around the pad (the globe's frame)
var GLSL_CURVE = 'uniform vec3 uCam; float curveDrop(vec3 w){\n#ifdef CURVE_FLAT\n return 0.0;\n#else\n vec2 d = w.xz - uCam.xz; return dot(d,d) / (2.0 * 6371000.0);\n#endif\n}\n';
function rkShader(o) {
var u = Object.assign({ uCam: { value: new THREE.Vector3() }, uTime: { value: 0 } }, o.uniforms || {});
var m = new THREE.ShaderMaterial({
uniforms: u, transparent: !!o.transparent, depthWrite: o.depthWrite !== false, depthTest: o.depthTest !== false, side: o.side || THREE.FrontSide,
blending: o.blending || THREE.NormalBlending, toneMapped: o.toneMapped !== false,
vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\n' + (o.flat ? '#define CURVE_FLAT\n' : '') + GLSL_CURVE + o.vertex,
fragmentShader: '#include <common>\n#include <logdepthbuf_pars_fragment>\n' + o.fragment
});
RK.mats.push(m);
return m;
}
RK.mats = [];
var GLSL_NOISE = 'float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }\n'
+ 'float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f); return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y); }\n'
+ 'float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }\n'
+ 'float fbmLo(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s + 0.0625; }\n';
var PAD_LAT = 28.608 * Math.PI / 180, PAD_LON = -80.604 * Math.PI / 180;
var EARTH = { tex: null, on: { value: 0 } };
function earthTex() {
if (EARTH.tex || typeof EARTH_JPG !== 'string') return EARTH.tex;
EARTH.tex = new THREE.TextureLoader().load(EARTH_JPG, function () { EARTH.on.value = 1; });
EARTH.tex.colorSpace = THREE.SRGBColorSpace; EARTH.tex.anisotropy = 8; EARTH.tex.wrapS = THREE.RepeatWrapping;
return EARTH.tex;
}
var GLSL_EARTH = 'uniform sampler2D uEarth; uniform float uEarthOn;\n'
+ 'const float PLAT = ' + PAD_LAT.toFixed(6) + ', PLON = ' + PAD_LON.toFixed(6) + ';\n'
+ 'vec2 earthUV(vec3 d){ return vec2(fract(atan(d.y, d.x) / 6.2831853 + 0.5), 0.5 + asin(clamp(d.z, -1.0, 1.0)) / 3.1415927); }\n' // d: a direction from the Earth's centre (ECEF)
+ 'vec3 ecef(float e, float n, float u){ float sf = sin(PLAT), cf = cos(PLAT), sl = sin(PLON), cl = cos(PLON);'
+ ' return normalize(e * vec3(-sl, cl, 0.0) + n * vec3(-sf * cl, -sf * sl, cf) + u * vec3(cf * cl, cf * sl, sf)); }\n'
+ 'vec2 localUV(vec2 p){ return earthUV(ecef(sin(p.x / 6371000.0), sin(p.y / 6371000.0), cos(length(p) / 6371000.0))); }\n' // local ground (east, north metres from the pad)
+ 'float seaOf(vec3 c){ return smoothstep(0.9, 1.4, c.b / (c.r + 0.004)); }\n';
var GLSL_AIR = 'uniform float uCamH; uniform vec3 uHazeLo; uniform float uHazeK;\n'
+ 'float airDepth(vec3 p){ vec3 dv = p - cameraPosition; float len = length(dv), dh = length(dv.xz), s = 0.0, a0 = uCamH, a1;'
+ ' for (int i = 1; i <= 12; i++) { float u = float(i) / 12.0; a1 = max(0.0, uCamH + u * dv.y + (u * dh) * (u * dh) / 12742000.0);'
+ '  float d = a1 - a0; s += abs(d) > 1.0 ? 8000.0 * (exp(-a0 / 8000.0) - exp(-a1 / 8000.0)) / d : exp(-a0 / 8000.0); a0 = a1; }'
+ ' return s * len / 12.0; }\n'
+ 'vec3 airMix(vec3 col, vec3 p, float sunUp){ float tau = airDepth(p) * uHazeK; float hi = smoothstep(1500.0, 25000.0, uCamH);'
+ ' vec3 hz = mix(uHazeLo, mix(vec3(0.16, 0.36, 0.78), vec3(0.66, 0.78, 0.93), smoothstep(0.25, 5.0, tau)) * (0.35 + 0.75 * sunUp), hi);'
+ ' return mix(col, hz, 1.0 - exp(-tau)); }\n';
function rkBuild() {
if (RK.root) return;
var root = RK.root = new THREE.Group(); scene.add(root);
var sunW = RK.sunW = new THREE.Vector3(-0.62, 0.47, -0.36).normalize();
RK.skyU = { uSun: { value: sunW }, uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uDip: { value: 0 }, uThin: { value: 1 }, uLimbW: { value: 0.05 }, uGlobe: { value: 0 }, uUnder: { value: 0 } };
RK.sky = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), rkShader({ side: THREE.BackSide, depthWrite: false, uniforms: RK.skyU,
vertex: 'varying vec3 vD; void main(){ vD = position; vec4 wp = modelMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * viewMatrix * wp;\n#include <logdepthbuf_vertex>\n }',
fragment: 'uniform vec3 uSun; uniform vec3 uZen; uniform vec3 uHor; uniform float uDip; uniform float uThin; uniform float uLimbW; uniform float uGlobe; uniform float uUnder; varying vec3 vD;\n'
+ 'void main(){ vec3 d = normalize(vD); float el = asin(clamp(d.y, -1.0, 1.0)) + uDip; float up = clamp(el / 1.4, 0.0, 1.0);'
+ ' vec3 col = mix(uHor, uZen, pow(up, 0.42)); float limbW = mix(0.004, 0.06, uThin); float limb = exp(-abs(el) / limbW);'
+ ' col += vec3(0.35, 0.55, 1.0) * limb * (0.35 + 0.65 * (1.0 - uThin)) * (1.0 - uThin * 0.7);'
+ ' float sp = (1.0 - uThin) * (1.0 - uGlobe), e2 = max(el, 0.0);'
+ ' col += sp * (vec3(0.30, 0.55, 1.0) * exp(-e2 / uLimbW) * 0.9 + vec3(0.75, 0.85, 1.0) * exp(-e2 / (uLimbW * 0.22)) * 0.75 + vec3(0.1, 0.2, 0.55) * exp(-e2 / (uLimbW * 3.5)) * 0.35);'
+ ' if (el < 0.0) col = mix(col, uHor * 0.35, smoothstep(0.0, 0.05, -el));'
+ ' float sd = max(dot(d, normalize(uSun)), 0.0); col += vec3(1.0, 0.95, 0.85) * (pow(sd, 3000.0) * 60.0 + pow(sd, 400.0) * 1.5 + pow(sd, 12.0) * 0.25 * (0.15 + uThin));'
+ ' if (uUnder > 0.5) col = mix(vec3(0.003, 0.02, 0.032), vec3(0.03, 0.15, 0.2), smoothstep(-0.4, 0.9, d.y));'
+ ' gl_FragColor = vec4(col, 1.0);\n#include <logdepthbuf_fragment>\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n }' }));
RK.sky.scale.setScalar(2.0e6); RK.sky.frustumCulled = false; RK.sky.renderOrder = -10; root.add(RK.sky);
var sg = new THREE.BufferGeometry(), sp = new Float32Array(3000 * 3), ss = new Float32Array(3000);
for (var i = 0; i < 3000; i++) { var th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1); sp[3 * i] = Math.sin(ph) * Math.cos(th); sp[3 * i + 1] = Math.cos(ph); sp[3 * i + 2] = Math.sin(ph) * Math.sin(th); ss[i] = Math.pow(Math.random(), 6) * 2.4 + 0.6; }
sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('aSize', new THREE.BufferAttribute(ss, 1));
RK.stars = new THREE.Points(sg, rkShader({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uAlpha: { value: 0 } },
vertex: 'attribute float aSize; varying float vS; void main(){ vS = aSize; vec4 mv = modelViewMatrix * vec4(position * 1.4e6, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize; \n#include <logdepthbuf_vertex>\n }',
fragment: 'uniform float uAlpha; varying float vS; void main(){ vec2 c = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(c)) * uAlpha * min(1.0, vS); gl_FragColor = vec4(vec3(0.85,0.9,1.0) * a, a);\n#include <logdepthbuf_fragment>\n }' }));
RK.stars.frustumCulled = false; RK.stars.renderOrder = -9; RK.stars.material.transparent = false; root.add(RK.stars);
rkOcean(root); rkLand(root); rkClouds(root); rkGlobe(root); rkPad(root); rkShip(root); rkBooster(root); rkUpper(root); rkParticles(root);
RK.fire = new THREE.PointLight(0xff9a40, 0, 0, 2); RK.fire.castShadow = false; root.add(RK.fire);
root.visible = false;
}
function rkOcean(root) {
var rings = [], r = 0.6; while (r < 2.6e6) { rings.push(r); r *= 1.055; }
var seg = quality === 'fast' ? 96 : 160, pos = [], idx = [];
pos.push(0, 0, 0);
rings.forEach(function (rr) { for (var s = 0; s < seg; s++) { var a = s / seg * Math.PI * 2; pos.push(Math.cos(a) * rr, 0, Math.sin(a) * rr); } });
for (var s = 0; s < seg; s++) idx.push(0, 1 + (s + 1) % seg, 1 + s);
for (var k = 0; k < rings.length - 1; k++) for (var s2 = 0; s2 < seg; s2++) {
var a0 = 1 + k * seg + s2, a1 = 1 + k * seg + (s2 + 1) % seg, b0 = a0 + seg, b1 = a1 + seg;
idx.push(a0, a1, b0, a1, b1, b0);
}
var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
RK.oceanU = { uEarth: { value: earthTex() }, uEarthOn: EARTH.on, uCamH: { value: 0 }, uHazeLo: { value: new THREE.Color(0xb7cbe0) }, uHazeK: { value: 1 / 45000 }, uOff: { value: new THREE.Vector2() }, uOffL: { value: new THREE.Vector2() }, uSea: { value: 0.4 }, uSun: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color(1.0, 0.92, 0.8) },
uZenith: { value: new THREE.Color(0x2a5d9a) }, uHorizon: { value: new THREE.Color(0xa9c4dc) }, uHaze: { value: new THREE.Color(0xb7cbe0) }, uHazeDist: { value: 40000 },
uShip: { value: new THREE.Vector4(0, 0, 0, 0) }, uShipN: { value: new THREE.Vector3(0, 1, 0) }, uJet: { value: new THREE.Vector4(0, 0, 0, 1) }, uJetI: { value: 0 }, uFire: { value: new THREE.Vector4(0, 0, 0, 0) }, uWind: { value: new THREE.Vector2(1, 0.3) } };
var wave = GLSL_NOISE + 'uniform vec2 uOff; uniform vec2 uOffL; uniform float uSea; uniform vec2 uWind; uniform float uTime;\n'
+ 'vec3 gerst(vec2 p, vec2 dir, float L, float A, float sp, float t, inout vec3 dx, inout vec3 dz){ float k = 6.2831853 / L; float c = sqrt(9.81 / k); vec2 d = normalize(dir); float f = k * (dot(d, p) - c * t * sp);'
+ ' float Q = 0.55; dx += vec3(-Q*d.x*d.x*A*k*sin(f), d.x*A*k*cos(f), -Q*d.x*d.y*A*k*sin(f)); dz += vec3(-Q*d.x*d.y*A*k*sin(f), d.y*A*k*cos(f), -Q*d.y*d.y*A*k*sin(f));'
+ ' return vec3(Q*A*d.x*cos(f), A*sin(f), Q*A*d.y*cos(f)); }\n'
+ 'vec2 rot(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }\n'
+ 'vec3 waves(vec2 p, float t, out vec3 n, float fade){ vec3 dx = vec3(1.0,0.0,0.0), dz = vec3(0.0,0.0,1.0); vec3 o = vec3(0.0); float s = (0.25 + uSea * 1.6) * fade; vec2 w = normalize(uWind);'
+ ' float g1 = 0.45 + 1.1 * vnoise(p / 420.0 + vec2(t * 0.011, 3.1)), g2 = 0.4 + 1.2 * vnoise(p / 230.0 + vec2(-t * 0.017, 7.7)), g3 = 0.35 + 1.3 * vnoise(p / 120.0 + vec2(1.3, t * 0.023));'
+ ' o += gerst(p, rot(w, 0.08), 97.0, 0.42*s*g1, 1.0, t, dx, dz); o += gerst(p, rot(w, -0.47), 71.3, 0.30*s*g2, 1.0, t, dx, dz); o += gerst(p, rot(w, 0.61), 53.1, 0.24*s*g1, 1.0, t, dx, dz);'
+ ' o += gerst(p, rot(w, -0.19), 41.7, 0.19*s*g3, 1.0, t, dx, dz); o += gerst(p, rot(w, 0.93), 29.3, 0.13*s*g2, 1.0, t, dx, dz); o += gerst(p, rot(w, -0.83), 23.9, 0.11*s*g3, 1.0, t, dx, dz);'
+ ' o += gerst(p, rot(w, 0.33), 17.1, 0.08*s*g1, 1.0, t, dx, dz); o += gerst(p, rot(w, -1.21), 12.7, 0.055*s*g3, 1.0, t, dx, dz); o += gerst(p, rot(w, 1.37), 9.3, 0.04*s*g2, 1.0, t, dx, dz);'
+ ' n = normalize(cross(vec3(dz.x, dz.y, dz.z), vec3(dx.x, dx.y, dx.z))); return o; }\n';
var mat = rkShader({ uniforms: RK.oceanU,
vertex: wave + 'uniform vec4 uShip; uniform vec3 uShipN; varying vec2 vPw; varying vec3 vW; varying vec3 vN; varying float vCrest; varying vec2 vP; varying float vDist;\n'
+ 'void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); float r = length(position.xz); float fade = 1.0 - smoothstep(600.0, 5000.0, r); vec2 p = vec2(wp.x, -wp.z) + uOffL; vP = p; vPw = vec2(wp.x, -wp.z) + uOff;'
+ ' vec3 n; vec3 d = waves(p, uTime, n, fade); wp.x += d.x; wp.z -= d.z; wp.y += d.y; vCrest = d.y / (0.6 + uSea * 1.6); vN = vec3(n.x, n.y, -n.z);'
+ ' if (uShip.w > 0.0) { vec2 sq = abs(vec2(wp.x - uShip.x, wp.z - uShip.z)) - vec2(46.0, 27.0); float sd = length(max(sq, 0.0)) + min(max(sq.x, sq.y), 0.0);'
+ '   float dk = uShip.y - (uShipN.x * (wp.x - uShip.x) + uShipN.z * (wp.z - uShip.z)) / max(uShipN.y, 0.5);'   // the deck's height here, as it pitches and rolls
+ '   float lim = dk - 2.2 + 30.0 * smoothstep(0.0, 22.0, sd); if (wp.y > lim) { wp.y = lim; vCrest = min(vCrest, 0.2); } }'
+ ' wp.y -= curveDrop(wp.xyz); vW = wp.xyz; vDist = length(wp.xyz - cameraPosition); vec4 mv = viewMatrix * wp; gl_Position = projectionMatrix * mv;\n#include <logdepthbuf_vertex>\n }',
fragment: GLSL_NOISE + GLSL_AIR + GLSL_EARTH + 'uniform vec3 uSun; uniform vec3 uSunCol; uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uHaze; uniform float uHazeDist; uniform vec4 uShip; uniform vec4 uJet; uniform float uJetI; uniform vec4 uFire; uniform float uSea; uniform float uTime;\n'
+ 'varying vec2 vPw; varying vec3 vW; varying vec3 vN; varying float vCrest; varying vec2 vP; varying float vDist;\n'
+ 'void main(){ vec3 V = normalize(cameraPosition - vW); float near = 1.0 - smoothstep(25.0, 350.0, vDist);'
+ ' vec2 g = vec2(0.0); for (int i = 0; i < 7; i++) { float fi = float(i); float a = fi * 2.399 + 0.3 + 0.6 * sin(fi * 7.3); vec2 dir = vec2(cos(a), sin(a)); float L = 1.3 + fi * 0.9 + 0.4 * sin(fi * 3.1); float k = 6.2831 / L; float ph = k * dot(dir, vP) - sqrt(9.81 * k) * uTime + fi * 1.7;'
+ '  float grp = 0.3 + 1.4 * vnoise(vP / (9.0 + fi * 4.0) + vec2(fi * 5.1, uTime * 0.05)); g += dir * cos(ph) * k * 0.035 * L / (1.0 + fi * 0.15) * grp; }'
+ ' float mid = 1.0 - smoothstep(200.0, 2500.0, vDist); vec2 q = vP * 0.11 + vec2(uTime * 0.07, -uTime * 0.05); float e = 0.35;'
+ ' vec2 gn = vec2(fbm(q + vec2(e, 0.0)) - fbm(q - vec2(e, 0.0)), fbm(q + vec2(0.0, e)) - fbm(q - vec2(0.0, e))) / (2.0 * e);'
+ ' vec3 N = normalize(vN + near * vec3(-g.x, 0.0, g.y) * (0.35 + uSea * 0.8) + mid * vec3(-gn.x, 0.0, gn.y) * (0.10 + uSea * 0.22));'
+ ' float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0); vec3 Rf = reflect(-V, N); Rf.y = abs(Rf.y);'
+ ' vec3 sky = mix(uHorizon, uZenith, pow(clamp(Rf.y, 0.0, 1.0), 0.45));'
+ ' float rough = vnoise(vP / 260.0 + 4.0); float far2 = smoothstep(3000.0, 60000.0, vDist);' // calmer and rougher patches (wind gusts on the water), a broad glint far off
+ ' float sd = max(dot(Rf, uSun), 0.0); vec3 spec = uSunCol * (pow(sd, mix(mix(1100.0, 350.0, rough), 90.0, far2)) * mix(6.0, 2.5, far2) + pow(sd, mix(60.0, 14.0, far2)) * 0.5 * (0.4 + uSea)) * smoothstep(-0.05, 0.1, uSun.y);'
+ ' vec3 deep = vec3(0.004, 0.03, 0.055); vec3 scat = vec3(0.0, 0.10, 0.11) * (0.35 + 0.65 * clamp(vCrest + 0.5, 0.0, 1.5)) * max(uSun.y, 0.05);'
+ ' vec3 col = mix(deep + scat, sky, fres) + spec;'
+ ' col *= 0.85 + 0.3 * vnoise(vP / 900.0 + 9.0);'
+ ' if (uEarthOn > 0.5) { vec3 bm = texture2D(uEarth, localUV(vPw)).rgb; float wf = smoothstep(15000.0, 120000.0, vDist) * 0.55; col = mix(col, bm * 0.9 + spec * 0.4, wf * (0.4 + 0.6 * seaOf(bm))); }'
+ ' float caps = smoothstep(0.62, 0.8, fbm(vP * 0.018 + vec2(uTime * 0.012, 2.0))) * smoothstep(0.15, 0.7, vCrest);'
+ ' float foam = (smoothstep(0.55, 1.0, vCrest) * 0.6 + caps * 1.4 * fbm(vP * 0.35 - uTime * 0.25)) * uSea * (1.0 - smoothstep(1500.0, 9000.0, vDist));'
+ ' if (uShip.w > 0.0) { vec2 sp = vec2(vW.x - uShip.x, vW.z - uShip.z); vec2 bd = abs(sp) - vec2(47.0, 28.0); float dd = length(max(bd, 0.0)) + min(max(bd.x, bd.y), 0.0);'
+ '   float fn = fbm(vP * 0.25 - uTime * 0.3), ends = smoothstep(20.0, 47.0, abs(sp.x));'
+ '   foam += (1.0 - smoothstep(0.0, (1.2 + 4.0 * uSea) * (0.4 + fn + ends), dd)) * smoothstep(0.35, 0.75, fbm(vP * 0.6 - uTime * 0.5) + 0.2 * ends) * (0.6 + 0.4 * ends); }'
+ ' if (uJetI > 0.0) { float jd = length(vec2(vW.x - uJet.x, vW.z - uJet.z)) / uJet.w;' // where an engine's jet beat the sea: churned white water, broken at its edge
+ '   foam += uJetI * (1.0 - smoothstep(0.35, 1.0, jd + 0.35 * (fbm(vP * 0.12 + 3.0) - 0.5))) * (0.55 + 0.6 * smoothstep(0.3, 0.75, fbm(vP * 0.45 - uTime * 0.6))); }'
+ ' col = mix(col, vec3(0.86, 0.9, 0.92) * max(uSun.y + 0.2, 0.2), clamp(foam, 0.0, 0.9));'
+ ' if (uFire.w > 0.0) { float fd = length(vW - uFire.xyz); col += vec3(1.0, 0.45, 0.12) * uFire.w / (1.0 + fd * fd / 900.0) * (0.25 + fres); }'
+ ' col = airMix(col, vW, max(uSun.y, 0.0));'
+ ' if (!gl_FrontFacing) {'
+ '  float c = abs(V.y), win = smoothstep(0.6, 0.7, c); vec3 deepW = vec3(0.004, 0.035, 0.055);'
+ '  vec3 lit = vec3(0.35, 0.62, 0.72) * (0.65 + 0.7 * fbm(vP * 0.25 + vec2(uTime * 0.35, -uTime * 0.2))) * max(uSun.y + 0.15, 0.1);'
+ '  col = mix(deepW * 2.5, lit, win); col = mix(col, deepW, 1.0 - exp(-vDist / 45.0)); }'
+ ' gl_FragColor = vec4(col, 1.0);\n#include <logdepthbuf_fragment>\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n }' });
mat.side = THREE.DoubleSide;
RK.ocean = new THREE.Mesh(g, mat); RK.ocean.frustumCulled = false; RK.ocean.renderOrder = -2; root.add(RK.ocean);
}
function rkClouds(root) {
var rings = [], r = 30; while (r < 1500000) { rings.push(r); r *= 1.08; }
var seg = 96, pos = [0, 0, 0], idx = [];
rings.forEach(function (rr) { for (var s2 = 0; s2 < seg; s2++) { var a = s2 / seg * Math.PI * 2; pos.push(Math.cos(a) * rr, 0, Math.sin(a) * rr); } });
for (var s3 = 0; s3 < seg; s3++) idx.push(0, 1 + (s3 + 1) % seg, 1 + s3);
for (var k = 0; k < rings.length - 1; k++) for (var s4 = 0; s4 < seg; s4++) { var a0 = 1 + k * seg + s4, a1 = 1 + k * seg + (s4 + 1) % seg; idx.push(a0, a1, a0 + seg, a1, a1 + seg, a0 + seg); }
var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
RK.clouds = [1800, 2500].map(function (z, li) {
var U = { uOff: { value: new THREE.Vector2() }, uSun: RK.oceanU.uSun, uHaze: RK.oceanU.uHaze, uHazeDist: RK.oceanU.uHazeDist, uCamH: RK.oceanU.uCamH, uHazeLo: RK.oceanU.uHazeLo, uHazeK: RK.oceanU.uHazeK, uBelow: { value: 0 }, uSeed: { value: li * 37.0 }, uCover: { value: li ? 0.6 : 0.55 } };
var m = rkShader({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: U,
vertex: 'varying vec3 vW; varying vec2 vP; varying float vDist; uniform vec2 uOff; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vP = vec2(wp.x, -wp.z) + uOff; wp.y -= curveDrop(wp.xyz); vW = wp.xyz; vDist = length(wp.xyz - cameraPosition); gl_Position = projectionMatrix * viewMatrix * wp;\n#include <logdepthbuf_vertex>\n }',
fragment: GLSL_NOISE + GLSL_AIR + 'uniform vec3 uSun; uniform vec3 uHaze; uniform float uHazeDist; uniform float uBelow; uniform float uSeed; uniform float uCover; uniform float uTime; varying vec3 vW; varying vec2 vP; varying float vDist;\n'
+ 'void main(){ vec2 q = vP * 0.00042 + uSeed + vec2(uTime * 0.0006, 0.0); float far = smoothstep(15000.0, 60000.0, vDist);'
+ ' float n = mix(fbm(q), fbmLo(q), smoothstep(40000.0, 160000.0, vDist)) * 0.65 + mix(fbm(q * 4.1 + 3.0) * 0.35, 0.165, far); float d = mix(fbm(q * 13.0 - 7.0), 0.45, far);'
+ ' n += (fbm(q * 0.11 + 11.0) - 0.5) * 0.55 + (fbm(q * 0.035 + 23.0) - 0.5) * 0.7;'
+ ' float soft = smoothstep(20000.0, 250000.0, vDist); float c = smoothstep(uCover + 0.05 * soft, uCover + 0.12 + 0.2 * soft, n + d * 0.12) * (1.0 - 0.35 * soft); if (c < 0.01) discard;'
+ ' float lit = clamp(0.55 + (n - fbm(q + vec2(uSun.x, -uSun.z) * 0.02)) * 4.0, 0.25, 1.15);'
+ ' vec3 top = vec3(1.0, 0.99, 0.97) * (0.75 + 0.35 * lit); vec3 under = vec3(0.55, 0.6, 0.68) * (0.6 + 0.4 * (1.0 - c));'
+ ' vec3 col = mix(top, under, uBelow) * max(uSun.y + 0.25, 0.2);'
+ ' col = airMix(col, vW, max(uSun.y, 0.0));'
+ ' float a = c * (0.92 - 0.35 * far) * (1.0 - smoothstep(1000000.0, 1450000.0, vDist)) * smoothstep(15.0, 120.0, vDist);'
+ ' gl_FragColor = vec4(col, a);\n#include <logdepthbuf_fragment>\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n }' });
var mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 2 - li; mesh.userData.z = z; root.add(mesh);
return mesh;
});
}
var GLSL_NOISE3 = 'float h13(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }\n'
+ 'float vn3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);'
+ ' return mix(mix(mix(h13(i), h13(i + vec3(1,0,0)), f.x), mix(h13(i + vec3(0,1,0)), h13(i + vec3(1,1,0)), f.x), f.y), mix(mix(h13(i + vec3(0,0,1)), h13(i + vec3(1,0,1)), f.x), mix(h13(i + vec3(0,1,1)), h13(i + vec3(1,1,1)), f.x), f.y), f.z); }\n'
+ 'float fbm3(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 6; i++) { s += a * vn3(p); p = p * 2.07 + 13.3; a *= 0.5; } return s; }\n';
function rkGlobe(root) {
var G = RK.globe = new THREE.Group(); G.visible = false; root.add(G);
RK.globeU = { uEarth: { value: earthTex() }, uEarthOn: EARTH.on, uSun: { value: RK.sunW }, uCenter: { value: new THREE.Vector3() } };
var earth = new THREE.Mesh(new THREE.SphereGeometry(R_EARTH, 256, 128), rkShader({ uniforms: RK.globeU,
vertex: 'varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(position); vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp;\n#include <logdepthbuf_vertex>\n }',
fragment: GLSL_EARTH + 'uniform vec3 uSun; varying vec3 vN; varying vec3 vW;\n'
+ 'void main(){ vec3 n = normalize(vN), V = normalize(cameraPosition - vW); vec3 c = uEarthOn > 0.5 ? texture2D(uEarth, earthUV(ecef(n.x, -n.z, n.y))).rgb : vec3(0.02, 0.05, 0.12);'
+ ' float lit = dot(n, uSun), day = smoothstep(-0.12, 0.25, lit), sea = seaOf(c); vec3 R = reflect(-V, n);'
+ ' vec3 col = c * (0.015 + 1.35 * max(lit, 0.0)) + vec3(1.0, 0.93, 0.8) * pow(max(dot(R, uSun), 0.0), 90.0) * sea * 0.9 * day;'
+ ' float mu = max(dot(n, V), 0.0); col = mix(col, vec3(0.33, 0.55, 0.95) * (0.1 + 1.2 * max(lit + 0.15, 0.0)), pow(1.0 - mu, 2.2) * 0.75) + vec3(0.04, 0.08, 0.18) * day * 0.35;'
+ ' gl_FragColor = vec4(col, 1.0);\n#include <logdepthbuf_fragment>\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n }' }));
earth.frustumCulled = false; G.add(earth);
var clouds = new THREE.Mesh(new THREE.SphereGeometry(R_EARTH + 7000, 256, 128), rkShader({ transparent: true, depthWrite: false, uniforms: RK.globeU,
vertex: 'varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(position); vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp;\n#include <logdepthbuf_vertex>\n }',
fragment: GLSL_NOISE3 + 'uniform vec3 uSun; varying vec3 vN; varying vec3 vW;\n'
+ 'void main(){ vec3 n = normalize(vN); float lat = abs(n.y * 0.0 + asin(clamp(n.z * 0.0 + n.y, -1.0, 1.0)));'
+ ' vec3 q = n * 9.0; q += 0.35 * vec3(fbm3(q * 1.7), fbm3(q * 1.7 + 5.2), fbm3(q * 1.7 + 9.4));'
+ ' float k = fbm3(q) * 0.75 + fbm3(n * 70.0) * 0.25; float band = 0.06 * cos(lat * 6.0);'
+ ' float c = smoothstep(0.5 - band, 0.62 - band, k); if (c < 0.01) discard;'
+ ' float lit = max(dot(n, uSun), 0.0); vec3 col = vec3(1.0, 0.99, 0.97) * (0.02 + 1.15 * lit);'
+ ' gl_FragColor = vec4(col, c * 0.92);\n#include <logdepthbuf_fragment>\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n }' }));
clouds.frustumCulled = false; clouds.renderOrder = 1; G.add(clouds);
var air = new THREE.Mesh(new THREE.SphereGeometry(R_EARTH + 160000, 128, 64), rkShader({ transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending, uniforms: RK.globeU,
vertex: 'varying vec3 vW; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp;\n#include <logdepthbuf_vertex>\n }',
fragment: 'uniform vec3 uSun; uniform vec3 uCenter; varying vec3 vW;\n'
+ 'void main(){ vec3 rd = normalize(vW - cameraPosition), L = uCenter - cameraPosition; float tca = max(dot(L, rd), 0.0); vec3 P = cameraPosition + rd * tca;'
+ ' float b = length(P - uCenter) - 6371000.0; if (b < 0.0) discard; float g = exp(-b / 16000.0);'
+ ' float sunlit = smoothstep(-0.3, 0.25, dot(normalize(P - uCenter), uSun));'
+ ' vec3 col = (vec3(0.28, 0.52, 1.0) * g + vec3(0.8, 0.9, 1.0) * pow(g, 5.0) * 0.9) * sunlit * 1.7;'
+ ' gl_FragColor = vec4(col, 1.0);\n#include <logdepthbuf_fragment>\n }' }));
air.frustumCulled = false; air.renderOrder = 2; G.add(air);
}
function rkLand(root) {
var rings = [], r = 4; while (r < 2400000) { rings.push(r); r *= 1.07; }
var seg = 128, pos = [0, 0, 0], idx = [];
rings.forEach(function (rr) { for (var s = 0; s < seg; s++) { var a = s / seg * Math.PI * 2; pos.push(Math.cos(a) * rr, 0, Math.sin(a) * rr); } });
for (var s = 0; s < seg; s++) idx.push(0, 1 + (s + 1) % seg, 1 + s);
for (var k = 0; k < rings.length - 1; k++) for (var s2 = 0; s2 < seg; s2++) { var a0 = 1 + k * seg + s2, a1 = 1 + k * seg + (s2 + 1) % seg; idx.push(a0, a1, a0 + seg, a1, a1 + seg, a0 + seg); }
var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
RK.landU = { uHaze: RK.oceanU.uHaze, uHazeDist: RK.oceanU.uHazeDist, uSun: RK.oceanU.uSun, uOrigin: { value: new THREE.Vector3() }, uCamH: RK.oceanU.uCamH, uHazeLo: RK.oceanU.uHazeLo, uHazeK: RK.oceanU.uHazeK,
uEarth: { value: earthTex() }, uEarthOn: EARTH.on };
var mat = rkShader({ uniforms: RK.landU,
vertex: 'varying vec3 vW; varying vec2 vP; varying float vDist; uniform vec3 uOrigin; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vP = vec2(position.x, -position.z); wp.y -= curveDrop(wp.xyz); vDist = length(wp.xyz - cameraPosition); wp.y += (1.5 + vDist * 0.0012) * smoothstep(800.0, 2500.0, length(position.xz)); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp;\n#include <logdepthbuf_vertex>\n }',
fragment: GLSL_NOISE + GLSL_AIR + GLSL_EARTH + 'uniform vec3 uHaze; uniform float uHazeDist; uniform vec3 uSun; varying vec3 vW; varying vec2 vP; varying float vDist;\n'
+ 'void main(){ float coast = 1800.0 + 500.0 * sin(vP.y / 3100.0) + 160.0 * sin(vP.y / 700.0 + 1.3) + 60.0 * fbm(vP * 0.004);'
+ ' float big = smoothstep(15000.0, 120000.0, abs(vP.y)); coast += big * (26000.0 * sin(vP.y / 190000.0 + 0.7) + 50000.0 * (fbm(vP * 0.000011) - 0.5) + 9000.0 * (fbm(vP * 0.00009) - 0.5));'
+ ' if (length(vP) < 835.0) discard;'
+ ' vec3 bm = texture2D(uEarth, localUV(vP)).rgb; float away = smoothstep(14000.0, 32000.0, length(vP)) * uEarthOn;'
+ ' float pm = vP.x > coast ? 0.0 : 1.0, bl = 1.0 - seaOf(bm), dP = length(vP);'
+ ' if (uEarthOn > 0.5 ? (dP < 14000.0 ? pm < 0.5 : dP < 32000.0 ? min(pm, bl) < 0.5 : bl < 0.5) : pm < 0.5) discard; if (uEarthOn < 0.5 && length(vP) > 380000.0 + 300000.0 * fbm(vP * 0.000007)) discard; float toSea = coast - vP.x;'
+ ' float far = smoothstep(8000.0, 60000.0, vDist); float n = mix(fbm(vP * 0.0035), 0.32 + 0.3 * (fbm(vP * 0.00006) - 0.5) + 0.12 * (fbm(vP * 0.0004) - 0.5), far), m = mix(fbm(vP * 0.03 + 5.0), 0.45, smoothstep(1500.0, 9000.0, vDist));'
+ ' vec3 scrub = mix(vec3(0.18, 0.22, 0.12), vec3(0.32, 0.31, 0.2), n); scrub = mix(scrub, vec3(0.12, 0.17, 0.1), smoothstep(0.55, 0.75, m) * 0.7);'
+ ' vec3 sand = vec3(0.78, 0.72, 0.58); vec3 col = mix(sand, scrub, smoothstep(40.0, 160.0, toSea));'
+ ' float r = length(vP); col = mix(vec3(0.62, 0.61, 0.58), col, smoothstep(70.0, 90.0, r));'
+ ' float road = smoothstep(7.0, 4.0, abs(vP.y + 0.03 * vP.x)) * step(90.0, r) * step(vP.x, -90.0); col = mix(col, vec3(0.3, 0.3, 0.31), road);'
+ ' vec3 farCol = mix(vec3(0.15, 0.2, 0.11), vec3(0.25, 0.26, 0.16), smoothstep(0.15, 0.5, n)); farCol = mix(farCol, bm * (0.8 + 0.4 * n), uEarthOn); col = mix(col, farCol, max(smoothstep(20000.0, 90000.0, vDist), away * 0.85));'
+ ' col *= 0.45 + 0.75 * max(uSun.y, 0.0); col = airMix(col, vW, max(uSun.y, 0.0));'
+ ' gl_FragColor = vec4(col, 1.0);\n#include <logdepthbuf_fragment>\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n }' });
RK.land = new THREE.Mesh(g, mat); RK.land.renderOrder = -1; root.add(RK.land);
}
function rkBox(w, h, d, mat, x, y, z) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x || 0, y || 0, z || 0); m.castShadow = m.receiveShadow = true; return m; }
function rkPad(root) {
var G = RK.pad = new THREE.Group(); root.add(G);
var conc = std(0x6f6c66, 0.95, 0.0), steel = std(0x8e9296, 0.5, 0.6), dark = std(0x2b2d30, 0.8, 0.2), red = std(0x7d8186, 0.6, 0.55);
var gcv = document.createElement('canvas'); gcv.width = gcv.height = 2048; var gg = gcv.getContext('2d'), GPM = 2048 / 1800, gx = function (e) { return 1024 + e * GPM; }, gy = function (n) { return 1024 - n * GPM; };
gg.fillStyle = '#6c7650'; gg.fillRect(0, 0, 2048, 2048);
for (var bi = 0; bi < 14000; bi++) { var bx = Math.random() * 2048, by = Math.random() * 2048, br = 1.5 + Math.pow(Math.random(), 3) * 16, cc = Math.random();
gg.fillStyle = cc < 0.4 ? 'rgba(84,96,58,.16)' : cc < 0.7 ? 'rgba(128,128,92,.14)' : cc < 0.85 ? 'rgba(52,64,40,.2)' : 'rgba(160,150,118,.14)'; gg.beginPath(); gg.ellipse(bx, by, br * (1 + Math.random()), br, Math.random() * 3, 0, Math.PI * 2); gg.fill(); }
for (var bj = 0; bj < 30000; bj++) { gg.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '40,50,30' : '170,170,130') + ',' + (Math.random() * 0.18) + ')'; gg.fillRect(Math.random() * 2048, Math.random() * 2048, 2, 2); }
var road = function (pts, w, col) { gg.strokeStyle = col; gg.lineWidth = w * GPM; gg.lineJoin = gg.lineCap = 'round'; gg.beginPath(); pts.forEach(function (q, k) { if (k) gg.lineTo(gx(q[0]), gy(q[1])); else gg.moveTo(gx(q[0]), gy(q[1])); }); gg.stroke(); };
var burn = gg.createRadialGradient(gx(0), gy(60), 5, gx(0), gy(90), 110 * GPM); burn.addColorStop(0, 'rgba(40,34,28,.85)'); burn.addColorStop(0.6, 'rgba(70,62,50,.5)'); burn.addColorStop(1, 'rgba(70,62,50,0)');
gg.fillStyle = burn; gg.beginPath(); gg.arc(gx(0), gy(90), 110 * GPM, 0, Math.PI * 2); gg.fill();
gg.fillStyle = '#9b9584'; gg.beginPath(); gg.arc(gx(0), gy(0), 96 * GPM, 0, Math.PI * 2); gg.fill();
road([[-30, -60], [-200, -140], [-900, -150]], 14, '#a8a395'); road([[-30, -80], [-200, -165], [-900, -175]], 14, '#a8a395');
road([[0, 0], [0, -300], [-300, -300], [-300, 300], [300, 300], [300, -300], [0, -300]], 7, '#4a4b4d');
road([[0, 0], [80, 45], [150, -85]], 6, '#4a4b4d'); road([[0, 0], [-90, -58], [-150, -20]], 6, '#4a4b4d'); road([[-60, 70], [40, 95], [300, 95]], 6, '#4a4b4d');
[[80, 45, 24], [-90, -58, 22], [112, 24, 8], [-60, 70, 22], [150, -85, 34], [-150, -20, 16], [40, 95, 12], [-45, 115, 6]].forEach(function (c) { gg.fillStyle = '#b9b5aa'; gg.fillRect(gx(c[0]) - c[2] * GPM, gy(c[1]) - c[2] * GPM, 2 * c[2] * GPM, 2 * c[2] * GPM); });
var fade = gg.createRadialGradient(1024, 1024, 845 * GPM, 1024, 1024, 900 * GPM); fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
gg.globalCompositeOperation = 'destination-out'; gg.fillStyle = fade; gg.fillRect(0, 0, 2048, 2048); gg.globalCompositeOperation = 'source-over';
var gtex = new THREE.CanvasTexture(gcv); gtex.colorSpace = THREE.SRGBColorSpace; gtex.anisotropy = 8;
var field = new THREE.Mesh(new THREE.CircleGeometry(900, 128), new THREE.MeshStandardMaterial({ map: gtex, transparent: true, roughness: 0.95, metalness: 0 }));
field.rotation.x = -Math.PI / 2; field.position.y = 3.15; field.receiveShadow = true; field.renderOrder = -1; G.add(field);
var ccv = document.createElement('canvas'); ccv.width = ccv.height = 1024; var cg = ccv.getContext('2d');
cg.fillStyle = '#a9a69e'; cg.fillRect(0, 0, 1024, 1024);
for (var ci = 0; ci < 9000; ci++) { cg.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '70,68,64' : '220,218,210') + ',' + Math.random() * 0.08 + ')'; cg.fillRect(Math.random() * 1024, Math.random() * 1024, 2 + Math.random() * 6, 2 + Math.random() * 6); }
cg.strokeStyle = 'rgba(60,58,55,.35)'; cg.lineWidth = 2; for (var cj = 0; cj <= 1024; cj += 64) { cg.beginPath(); cg.moveTo(cj, 0); cg.lineTo(cj, 1024); cg.stroke(); cg.beginPath(); cg.moveTo(0, cj); cg.lineTo(1024, cj); cg.stroke(); }
var st = cg.createRadialGradient(512, 512, 20, 512, 420, 380); st.addColorStop(0, 'rgba(25,22,20,.7)'); st.addColorStop(0.5, 'rgba(45,40,36,.35)'); st.addColorStop(1, 'rgba(45,40,36,0)'); cg.fillStyle = st; cg.fillRect(0, 0, 1024, 1024);
var ctex = new THREE.CanvasTexture(ccv); ctex.colorSpace = THREE.SRGBColorSpace; ctex.anisotropy = 8;
var hs = new THREE.Mesh(new THREE.CylinderGeometry(70, 74, 2, 64), new THREE.MeshStandardMaterial({ map: ctex, roughness: 0.92, metalness: 0.02 })); hs.position.y = 3.0; hs.receiveShadow = true; G.add(hs);
var trench = new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 52), dark); trench.position.set(0, 4.02, -32); G.add(trench);
G.add(rkBox(10, 6, 10, dark, 0, 7, 0));
for (var i = 0; i < 4; i++) { var a = i * Math.PI / 2 + Math.PI / 4; G.add(rkBox(1.2, 6, 1.2, steel, Math.cos(a) * 4.2, 7, Math.sin(a) * 4.2)); }
var white = std(0xf1f1ee, 0.6, 0.25), yellow = std(0xe2b21d, 0.6, 0.3);
G.add(rkBox(36, 4.6, 26, std(0x9c9a94, 0.9, 0.05), -2, 6.7, 0));
G.add(rkBox(10, 1.0, 10, dark, 0, 9.5, 0));
[-1, 1].forEach(function (sx) { [-1, 1].forEach(function (sz) { G.add(rkBox(0.9, 1.6, 0.9, white, sx * 2.2, 10.2, sz * 2.2)); }); });
var rail = function (x0, z0, x1, z1) { var L = Math.hypot(x1 - x0, z1 - z0), m = rkBox(L, 0.08, 0.08, yellow, (x0 + x1) / 2, 10.1, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); G.add(m);
for (var q = 0; q <= L; q += 2) G.add(rkBox(0.06, 1.1, 0.06, yellow, x0 + (x1 - x0) * q / L, 9.55, z0 + (z1 - z0) * q / L)); };
rail(-20, -13, 16, -13); rail(-20, 13, 16, 13); rail(-20, -13, -20, 13);
var beams = [], beam = function (a, b2, w) { beams.push([a, b2, w]); };
var X0 = 2.7, X1 = 6.9, yb = 9, ym = 31, yt = 67, zb = 11, zm = 2.6;
var zAt = function (y) { return y <= ym ? zb + (zm - zb) * (y - yb) / (ym - yb) : zm; };
[X0, X1].forEach(function (x) { [-1, 1].forEach(function (sg) { beam([x, yb, sg * zb], [x, ym, sg * zm], 0.7); beam([x, ym, sg * zm], [x, yt, sg * zm], 0.6); }); });
for (var yy = yb + 3.5, n = 0; yy < yt; yy += yy < ym ? 3.6 : 4.4, n++) {
var zz = zAt(yy), zz2 = zAt(Math.min(yt, yy + (yy < ym ? 3.6 : 4.4)));
[X0, X1].forEach(function (x) { beam([x, yy, -zz], [x, yy, zz], 0.35); var sg = n % 2 ? 1 : -1; beam([x, yy, -sg * zz], [x, Math.min(yt, yy + (yy < ym ? 3.6 : 4.4)), sg * zz2], 0.25); });
[-1, 1].forEach(function (sg) { beam([X0, yy, sg * zz], [X1, yy, sg * zz], 0.3); if (n % 2) beam([X0, yy, sg * zz], [X1, Math.min(yt, yy + 4), sg * zAt(Math.min(yt, yy + 4))], 0.22); });
if (yy < ym) beam([X0, yy, 0], [X1, yy, 0], 0.25);
}
[20, 41, 59].forEach(function (hh) { [-1, 1].forEach(function (sg) { beam([X0, hh, sg * 1.0], [1.95, hh, sg * 0.8], 0.4); }); G.add(rkBox(0.3, 1.4, 2.4, white, 2.0, hh, 0)); });
beam([X0, yt, -zm], [X1, yt, zm], 0.3); beam([X0, yt, zm], [X1, yt, -zm], 0.3);
var bi = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), white, beams.length), BM = new THREE.Matrix4(), BQ = new THREE.Quaternion(), BV = new THREE.Vector3(), BD = new THREE.Vector3();
beams.forEach(function (bm, k2) { var a = new THREE.Vector3(bm[0][0], bm[0][1], bm[0][2]), b3 = new THREE.Vector3(bm[1][0], bm[1][1], bm[1][2]); BD.subVectors(b3, a); var L = BD.length();
BQ.setFromUnitVectors(UPV, BD.normalize()); BV.addVectors(a, b3).multiplyScalar(0.5); BM.compose(BV, BQ, new THREE.Vector3(bm[2], L + bm[2] * 0.5, bm[2])); bi.setMatrixAt(k2, BM); });
bi.castShadow = bi.receiveShadow = true; G.add(bi); RK.strongback = bi;
var tankW = std(0xf2f2ef, 0.4, 0.25), saddle = std(0x7d8186, 0.6, 0.5);
var hTank = function (x, z, r, L) { var c = new THREE.Mesh(new THREE.CapsuleGeometry(r, L, 6, 24), tankW); c.rotation.z = Math.PI / 2; c.position.set(x, 4.2 + r, z); G.add(c);
[-L / 3, L / 3].forEach(function (dx) { G.add(rkBox(0.6, 1.4 + r * 0.6, r * 1.6, saddle, x + dx, 3.4 + r * 0.3, z)); }); };
for (var tk = 0; tk < 6; tk++) hTank(80, -32 - tk * 5.2, 1.9, 16);
for (var tk2 = 0; tk2 < 4; tk2++) hTank(-90, 48 + tk2 * 6.4, 2.4, 18);
var vt = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 24, 28), tankW); vt.position.set(112, 15.5, -24); G.add(vt);
var vtop = new THREE.Mesh(new THREE.SphereGeometry(2.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), tankW); vtop.position.set(112, 27.5, -24); G.add(vtop);
var LT = new THREE.Group(); LT.position.set(-45, 3, -115); G.add(LT); var ltM = std(0xb9bcbf, 0.55, 0.6), LH = 112;
for (var lc = 0; lc < 3; lc++) { var lca = lc / 3 * Math.PI * 2; LT.add(rkBox(0.25, LH, 0.25, ltM, Math.cos(lca) * 0.9, LH / 2, Math.sin(lca) * 0.9)); }
for (var lr = 3; lr < LH; lr += 3) { var ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.06, 4, 3), ltM); ring.rotation.x = Math.PI / 2; ring.position.y = lr; LT.add(ring); }
LT.add(rkBox(0.15, 6, 0.15, ltM, 0, LH + 3, 0));
[[-60, 70, 30, 8, 18], [150, -85, 54, 9, 16], [-150, -20, 20, 6, 12], [40, 95, 16, 5, 10]].forEach(function (b) { G.add(rkBox(b[2], b[3], b[4], std(0xeeede8, 0.8, 0.05), b[0], 3 + b[3] / 2, -b[1])); });
G.traverse(function (o) { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
}
function rkShip(root) {
var G = RK.ship = new THREE.Group(); root.add(G);
var B = RK.shipBody = new THREE.Group(); G.add(B);
var cv = document.createElement('canvas'); cv.width = 1024; cv.height = 600; var g = cv.getContext('2d');
g.fillStyle = '#3a3d40'; g.fillRect(0, 0, 1024, 600);
for (var i = 0; i < 2600; i++) { g.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '255,255,255' : '0,0,0') + ',' + (Math.random() * 0.05) + ')'; g.fillRect(Math.random() * 1024, Math.random() * 600, Math.random() * 40, Math.random() * 6); }
g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2;
for (var x = 0; x < 1024; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 600); g.stroke(); }
for (var y = 0; y < 600; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
var cx = 512, cy = 300, ppm = 1024 / 91;
for (var k = 0; k < 7; k++) { var ox = cx + (Math.random() - 0.5) * 10 * ppm, oy = cy + (Math.random() - 0.5) * 8 * ppm, rr = (4 + Math.random() * 7) * ppm, gd = g.createRadialGradient(ox, oy, 1, ox, oy, rr);
gd.addColorStop(0, 'rgba(12,11,10,.32)'); gd.addColorStop(1, 'rgba(12,11,10,0)'); g.fillStyle = gd; g.beginPath(); g.arc(ox, oy, rr, 0, Math.PI * 2); g.fill(); }
g.strokeStyle = 'rgba(240,240,236,.92)'; g.lineWidth = 1.1 * ppm; g.beginPath(); g.arc(cx, cy, 22 * ppm, 0, Math.PI * 2); g.stroke();
g.strokeStyle = 'rgba(232,184,34,.92)'; g.lineWidth = 2.2 * ppm; for (var q = 0; q < 4; q++) { g.beginPath(); g.arc(cx, cy, 9.5 * ppm, q * Math.PI / 2 + 0.09, (q + 1) * Math.PI / 2 - 0.09); g.stroke(); }
for (var w = 0; w < 900; w++) { var wa = Math.random() * Math.PI * 2, wr = (Math.random() < 0.5 ? 22 : 9.5) * ppm + (Math.random() - 0.5) * 2.2 * ppm; g.fillStyle = 'rgba(58,61,64,' + (Math.random() * 0.6) + ')'; g.fillRect(cx + Math.cos(wa) * wr, cy + Math.sin(wa) * wr, 2 + Math.random() * 5, 2 + Math.random() * 3); }
var paintName = function (txt, x, y, wM, rot) { g.save(); g.translate(x, y); g.rotate(rot || 0); g.font = '800 100px Inter, "Segoe UI", Arial, sans-serif'; var mw = g.measureText(txt).width, k = wM * ppm / mw;
g.scale(k, k); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(244,244,240,.9)'; g.fillText(txt, 0, 0); g.restore(); };
paintName('EsaSim', cx, cy, 14.5); paintName('EsaSim', cx, 600 - 3.2 * ppm, 9);
for (var w2 = 0; w2 < 700; w2++) { g.fillStyle = 'rgba(58,61,64,' + (Math.random() * 0.55) + ')'; g.fillRect(cx + (Math.random() - 0.5) * 16 * ppm, cy + (Math.random() - 0.5) * 6 * ppm, 1 + Math.random() * 4, 1 + Math.random() * 3); }
g.fillStyle = 'rgba(20,21,23,.85)'; g.fillRect(0, 0, 1024, 7); g.fillRect(0, 593, 1024, 7); g.fillRect(0, 0, 7, 600); g.fillRect(1017, 0, 7, 600);
var tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
RK.scorchCv = document.createElement('canvas'); RK.scorchCv.width = 1024; RK.scorchCv.height = 600;
RK.scorch = new THREE.CanvasTexture(RK.scorchCv); RK.scorch.colorSpace = THREE.SRGBColorSpace;
var deck = new THREE.Mesh(new THREE.PlaneGeometry(91, 52), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82, metalness: 0.35 }));
deck.rotation.x = -Math.PI / 2; deck.receiveShadow = true; B.add(deck);
var burn = new THREE.Mesh(new THREE.PlaneGeometry(91, 52), new THREE.MeshStandardMaterial({ map: RK.scorch, transparent: true, roughness: 1, metalness: 0, depthWrite: false }));
burn.rotation.x = -Math.PI / 2; burn.position.y = 0.02; B.add(burn);
var black = std(0x1d1e20, 0.72, 0.35), dark = std(0x2b2d30, 0.65, 0.4), steel = std(0x4a4d51, 0.55, 0.6), dome = std(0xf2f2ef, 0.5, 0.05);
B.add(rkBox(91, 1.4, 52, dark, 0, -0.72, 0));
B.add(rkBox(91, 7.6, 30, black, 0, -1.4 - 3.8, 0));
var brace = function (a, b, w) { var d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length(), m = new THREE.Mesh(new THREE.BoxGeometry(w, L, w), steel);
m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); m.quaternion.setFromUnitVectors(UPV, d.normalize()); B.add(m); };
for (var bx = -40; bx <= 40; bx += 10) [-1, 1].forEach(function (sg) { brace([bx, -1.45, sg * 24.5], [bx, -5.6, sg * 15.0], 0.45); B.add(rkBox(0.35, 0.9, 10.5, steel, bx, -1.85, sg * 20.3)); });
var post = new THREE.CylinderGeometry(0.07, 0.07, 1.1, 5), posts = new THREE.InstancedMesh(post, dark, 140), M = new THREE.Matrix4(), n = 0;
for (var px = -33; px <= 44 && n < 140; px += 2.4) { M.makeTranslation(px, 0.55, 25.7); posts.setMatrixAt(n++, M); M.makeTranslation(px, 0.55, -25.7); posts.setMatrixAt(n++, M); }
posts.count = n; B.add(posts);
[-25.7, 25.7].forEach(function (z) { B.add(rkBox(77, 0.12, 0.12, dark, 5.5, 1.1, z)); B.add(rkBox(77, 0.08, 0.08, dark, 5.5, 0.6, z)); });
B.add(rkBox(0.9, 1.6, 52, black, 45.05, 0.8, 0));
[-18, 18].forEach(function (z) { B.add(rkBox(1.6, 3.2, 1.6, black, 44.2, 1.6, z)); });
B.add(rkBox(0.8, 0.8, 37.6, black, 44.2, 3.6, 0));
B.add(rkBox(11.5, 6.2, 30, black, -39.75, 3.1, 0));
B.add(rkBox(7.5, 2.0, 22, black, -41.2, 7.2, 0));
for (var hz = -9; hz <= 9; hz += 6) B.add(rkBox(2.2, 0.6, 3.4, steel, -36.6, 6.5, hz));
B.add(rkBox(0.6, 1.8, 30, black, -33.9, 7.0, 0));
[[-44.6, -14], [-44.6, 14], [-35.2, -14], [-35.2, 14]].forEach(function (c) { var dm = new THREE.Mesh(new THREE.SphereGeometry(0.85, 18, 12), dome); dm.position.set(c[0], 7.6, c[1]); B.add(dm);
B.add(rkBox(0.3, 1.0, 0.3, steel, c[0], 6.7, c[1])); });
var mast = rkBox(0.25, 6, 0.25, steel, -42, 11.2, 0); B.add(mast); B.add(rkBox(0.1, 0.1, 2.4, steel, -42, 13.6, 0));
[-1, 1].forEach(function (sg) { B.add(rkBox(9, 2.4, 6, dark, -40.5, 1.2, sg * 21)); });
[[-40, -11], [-40, 11], [40, -11], [40, 11]].forEach(function (c) { var th = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3, 16), steel); th.position.set(c[0], -10.4, c[1]); B.add(th); });
B.traverse(function (o) { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
G.visible = false;
}
function bell(r0, r1, len) { var pts = []; for (var i = 0; i <= 16; i++) { var s = i / 16; pts.push(new THREE.Vector2(r0 - (r0 - r1) * Math.pow(s, 1.6), len * s)); } return new THREE.LatheGeometry(pts, 28); }
function paintTex(logo) {
var W = logo ? 1024 : 256, H = logo ? 4096 : 1024, sx = W / 256, sy = H / 1024;
var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var g = cv.getContext('2d');
g.fillStyle = '#f1f2ef'; g.fillRect(0, 0, W, H);
g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 2 * sx; for (var y = 0; y < H; y += 128 * sy) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
for (var i = 0; i < 900 * sx; i++) { g.fillStyle = 'rgba(120,120,120,' + Math.random() * 0.04 + ')'; g.fillRect(Math.random() * W, Math.random() * H, sx, Math.random() * 30 * sy); }
if (logo) {
var pxu = W / (2 * Math.PI * 1.83), pxv = H / 35.5;
[0.25, 0.75].forEach(function (u) {
g.save(); g.translate(u * W, 10.5 * pxv); g.scale(pxu, pxv); g.rotate(Math.PI / 2); // metres; text along the tank, read from the top down
var r = 0.66, x0 = -5.4, cx0 = x0 + r;
g.strokeStyle = '#1b1e24'; g.lineWidth = 0.14; g.lineJoin = 'round'; g.beginPath();
for (var hk = 0; hk < 6; hk++) { var ha = -Math.PI / 2 + hk * Math.PI / 3, hx = cx0 + Math.cos(ha) * (r - 0.07), hy = Math.sin(ha) * (r - 0.07); if (hk) g.lineTo(hx, hy); else g.moveTo(hx, hy); }
g.closePath(); g.stroke(); g.fillStyle = '#1b1e24';
var bar = function (bx, by, bw) { g.beginPath(); if (g.roundRect) g.roundRect(bx, by - 0.055, bw, 0.11, 0.03); else g.rect(bx, by - 0.055, bw, 0.11); g.fill(); };
[-0.165, 0, 0.165].forEach(function (yy, k) { bar(cx0 - 0.4, yy, 0.37); bar(cx0 + 0.03, yy, k === 1 ? 0.22 : 0.37); });
g.fillStyle = '#1b1e24'; g.font = '700 1.3px Inter, "Segoe UI", Arial, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left';
g.fillText('EsaSim', x0 + 2 * r + 0.45, 0.06);
g.restore();
});
}
var t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
var INVB = new THREE.Matrix4();
scene.onBeforeRender = function () { if (RK.booster) INVB.copy(RK.booster.matrixWorld).invert(); };
function sootable(mat, lo, hi, inBooster) {
mat.userData.u = { uSoot: { value: 0 }, uHeat: { value: 0 } };
mat.onBeforeCompile = function (sh) {
sh.uniforms.uSoot = mat.userData.u.uSoot; sh.uniforms.uHeat = mat.userData.u.uHeat; sh.uniforms.uInvB = { value: INVB };
sh.vertexShader = 'varying vec3 vLoc; uniform mat4 uInvB;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvLoc = ' + (inBooster ? '(uInvB * modelMatrix * vec4(position, 1.0)).xyz' : 'position') + ';');
sh.fragmentShader = 'varying vec3 vLoc; uniform float uSoot; uniform float uHeat;\n' + GLSL_NOISE + sh.fragmentShader
.replace('#include <map_fragment>', '#include <map_fragment>\n float ang = atan(vLoc.z, vLoc.x); float streak = fbm(vec2(ang * 7.0, vLoc.y * 0.05)) * 0.7 + fbm(vec2(ang * 31.0, vLoc.y * 0.3)) * 0.5;'
+ ' float lowness = 1.0 - smoothstep(' + lo.toFixed(1) + ', ' + hi.toFixed(1) + ', vLoc.y + streak * 14.0); float sootM = clamp(uSoot * (lowness * 1.3 + streak * 0.25 * uSoot), 0.0, 0.97);'
+ (inBooster ? ' float legM = 0.0; float hw = 0.98 * pow(1.0 - smoothstep(1.4, 11.8, vLoc.y), 0.55) + 0.04; float en = 0.22 * (fbm(vec2(ang * 9.0, vLoc.y * 0.9)) - 0.5);'
+ ' for (int k = 0; k < 4; k++) { float la = -(0.7853982 + float(k) * 1.5707963); float d = abs(mod(ang - la + 3.1415927, 6.2831853) - 3.1415927) * 1.83 + en;'
+ '  legM = max(legM, (1.0 - smoothstep(hw - 0.1, hw + 0.18, d)) * smoothstep(0.9, 1.7, vLoc.y) * (1.0 - smoothstep(10.2, 11.6, vLoc.y))); }'
+ ' sootM *= 1.0 - 0.9 * legM;' : '')
+ ' diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.02, 0.018, 0.016), vec3(0.075, 0.058, 0.042), fbm(vec2(ang * 3.0, vLoc.y * 0.12)) * 0.8), sootM);')
.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.92, sootM);')
.replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\n material.clearcoat *= 1.0 - sootM;\n#endif')
.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(0.9, 0.18, 0.03) * uHeat * 1.2 * (1.0 - smoothstep(0.5, 3.0, vLoc.y)) * (0.3 + 0.95 * fbm(vec2(atan(vLoc.z, vLoc.x) * 16.0, vLoc.y * 0.35)));')
};
return mat;
}
function gridFin() {
var G = new THREE.Group(), m = std(0x4a4c50, 0.48, 0.85), web = std(0x55575b, 0.52, 0.8), dark = std(0x1e1f22, 0.6, 0.6);
var span = 1.55, half = 0.64, depth = 0.34;
var P = [[0.0, -0.36], [0.34, -half], [span, -half], [span, half], [0.34, half], [0.0, 0.36]];
var inside = function (x0, z0, dx, dz) {
var t0 = -1e9, t1 = 1e9;
for (var i = 0; i < P.length; i++) { var a = P[i], b2 = P[(i + 1) % P.length], ex = b2[0] - a[0], ez = b2[1] - a[1], nx = -ez, nz = ex;
var c0 = nx * (x0 - a[0]) + nz * (z0 - a[1]), c1 = nx * dx + nz * dz;
if (Math.abs(c1) < 1e-9) { if (c0 < 0) return null; continue; }
var tt = -c0 / c1; if (c1 > 0) t0 = Math.max(t0, tt); else t1 = Math.min(t1, tt); }
return t1 > t0 ? [t0, t1] : null; };
var bars = [], M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), Pv = new THREE.Vector3();
var add = function (x0, z0, x1, z1, w, d) { bars.push([x0, z0, x1, z1, w, d]); };
var gap = 0.118, rootX = 0.3;
[[1, 1], [1, -1]].forEach(function (dir) {
var dx = dir[0] / Math.SQRT2, dz = dir[1] / Math.SQRT2;
for (var c = -2.5; c <= 2.5; c += gap) {
var x0 = c * dz, z0 = -c * dx, r = inside(x0, z0, dx, dz); if (!r) continue;
var ax = x0 + dx * r[0], az = z0 + dz * r[0], bx = x0 + dx * r[1], bz = z0 + dz * r[1];
if (ax < rootX && bx < rootX) continue;
if (ax < rootX) { var k = (rootX - ax) / (bx - ax); ax = rootX; az = az + (bz - az) * k; } if (bx < rootX) { var k2 = (rootX - bx) / (ax - bx); bx = rootX; bz = bz + (az - bz) * k2; }
if (Math.hypot(bx - ax, bz - az) > 0.03) add(ax, az, bx, bz, 0.018, depth);
}
});
for (var i = 0; i < P.length; i++) { var a = P[i], b2 = P[(i + 1) % P.length]; add(a[0], a[1], b2[0], b2[1], 0.055, depth + 0.04); }
var inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), m, bars.length);
bars.forEach(function (br, j) { var len = Math.hypot(br[2] - br[0], br[3] - br[1]) + br[4];
Q.setFromAxisAngle(UPV, -Math.atan2(br[3] - br[1], br[2] - br[0])); S.set(len, br[5], br[4]); Pv.set((br[0] + br[2]) / 2, 0, (br[1] + br[3]) / 2);
M4.compose(Pv, Q, S); inst.setMatrixAt(j, M4); });
inst.castShadow = inst.receiveShadow = true; G.add(inst);
var shp = new THREE.Shape(); shp.moveTo(0, -0.36); shp.lineTo(rootX, -0.36 - (rootX / 0.34) * (half - 0.36)); shp.lineTo(rootX, 0.36 + (rootX / 0.34) * (half - 0.36)); shp.lineTo(0, 0.36); shp.lineTo(0, -0.36);
var wg = new THREE.ExtrudeGeometry(shp, { depth: depth + 0.04, bevelEnabled: false }); wg.rotateX(Math.PI / 2); wg.translate(0, (depth + 0.04) / 2, 0);
var wm = new THREE.Mesh(wg, web); wm.castShadow = true; G.add(wm);
[-0.17, 0.17].forEach(function (zz) { var hole = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, depth + 0.06, 16), dark); hole.position.set(0.16, 0, zz); G.add(hole); });
var lug = new THREE.Mesh(new THREE.BoxGeometry(0.22, depth + 0.1, 0.36), web); lug.position.set(-0.08, 0, 0); G.add(lug);
var pin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 14), dark); pin.rotation.x = Math.PI / 2; pin.position.set(-0.12, 0, 0); G.add(pin);
G.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
return G;
}
function rkBooster(root) {
var G = RK.booster = new THREE.Group(); root.add(G);
var paint = sootable(new THREE.MeshPhysicalMaterial({ map: paintTex(true), roughness: 0.38, metalness: 0.0, clearcoat: 0.9, clearcoatRoughness: 0.14, specularIntensity: 0.9 }), 18.0, 46.0, true);
var carbon = sootable(new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.62, metalness: 0.15 }), 14.0, 34.0, true);
var engMat = sootable(new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 0.4, metalness: 0.85, emissive: 0x000000 }), 0.0, 4.0, true);
RK.sootMats = [paint, carbon, engMat];
var tank = new THREE.Mesh(new THREE.CylinderGeometry(1.83, 1.83, 35.5, 48, 1, true), paint); tank.position.y = 3 + 35.5 / 2; G.add(tank);
var skirt = new THREE.Mesh(new THREE.CylinderGeometry(1.83, 1.86, 1.6, 48, 1, true), engMat); skirt.position.y = 2.2; G.add(skirt);
var inter = new THREE.Mesh(new THREE.CylinderGeometry(1.83, 1.83, 6.5, 48, 1, true), carbon); inter.position.y = 38.5 + 3.25; G.add(inter);
var heat = new THREE.Mesh(new THREE.CircleGeometry(1.84, 48), engMat); heat.rotation.x = Math.PI / 2; heat.position.y = 1.45; G.add(heat);
var cav = new THREE.Mesh(new THREE.CylinderGeometry(1.78, 1.6, 4.5, 40, 1, true), std(0x0b0c0d, 0.95, 0.1)); cav.material.side = THREE.BackSide; cav.position.y = 41.95; G.add(cav);
var top = new THREE.Mesh(new THREE.CircleGeometry(1.6, 40), std(0x2a2c2f, 0.7, 0.5)); top.rotation.x = -Math.PI / 2; top.position.y = 39.7; G.add(top);
var pusher = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.2, 16), std(0x6a6d70, 0.4, 0.8)); pusher.position.y = 40.3; G.add(pusher);
var rim = new THREE.Mesh(new THREE.TorusGeometry(1.82, 0.05, 6, 64), std(0x2e2f31, 0.6, 0.4)); rim.rotation.x = Math.PI / 2; rim.position.y = 44.2; G.add(rim);
RK.nozzles = [];
var nzMat = RK.nzMat = sootable(new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 0.4, metalness: 0.85, emissive: 0x000000, side: THREE.DoubleSide }), 0.0, 4.0);
var nz = bell(0.46, 0.17, 1.9), boot = new THREE.CylinderGeometry(0.42, 0.5, 0.55, 20), bootMat = std(0x232426, 0.7, 0.4);
for (var i = 0; i < 9; i++) {
var a = (i - 1) / 8 * Math.PI * 2 + Math.PI / 8, rr = i === 0 ? 0 : 1.22;
var n = new THREE.Mesh(nz, nzMat); n.position.set(Math.cos(a) * rr, -0.45, Math.sin(a) * rr); n.castShadow = true; G.add(n); RK.nozzles.push(n);
var bt = new THREE.Mesh(boot, bootMat); bt.position.set(Math.cos(a) * rr, 1.25, Math.sin(a) * rr); G.add(bt);
}
RK.nzMat.userData.u.uSoot = engMat.userData.u.uSoot;
var race = rkBox(0.34, 34.0, 0.26, paint, 0, 20.7, 0); race.position.set(Math.cos(2.3) * 1.93, 20.7, -Math.sin(2.3) * 1.93); race.rotation.y = 2.3; G.add(race);
[9, 15, 21, 27, 33].forEach(function (y) { var w = new THREE.Mesh(new THREE.TorusGeometry(1.835, 0.012, 4, 64), std(0xb9bab7, 0.6, 0.2)); w.rotation.x = Math.PI / 2; w.position.y = y; G.add(w); });
[0, Math.PI].forEach(function (a) { var p = rkBox(0.5, 0.7, 0.8, std(0x2a2b2d, 0.6, 0.4), Math.cos(a + 0.78) * 1.9, 43.2, -Math.sin(a + 0.78) * 1.9); p.rotation.y = a + 0.78; G.add(p);
for (var k = -1; k <= 1; k += 2) { var nzl = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 8), std(0x777a7d, 0.4, 0.8)); nzl.position.set(Math.cos(a + 0.78 + k * 0.12) * 2.17, 43.2, -Math.sin(a + 0.78 + k * 0.12) * 2.17); nzl.rotation.z = Math.PI / 2; nzl.rotation.y = a + 0.78; G.add(nzl); } });
RK.fins = [];
for (var f = 0; f < 4; f++) {
var hinge = new THREE.Group(), az = f * Math.PI / 2;
hinge.position.set(Math.cos(az) * 1.86, 42.6, -Math.sin(az) * 1.86); hinge.rotation.y = az; G.add(hinge);
var tilt = new THREE.Group(); hinge.add(tilt);
var fin = gridFin(); tilt.add(fin);
var act = rkBox(0.5, 0.9, 0.7, std(0x141516, 0.7, 0.3), Math.cos(az) * 1.95, 43.6, -Math.sin(az) * 1.95); act.rotation.y = az; G.add(act);
RK.fins.push({ hinge: hinge, tilt: tilt, fin: fin, az: az });
}
RK.legs = [];
var legMat = std(0x151618, 0.62, 0.2), railMat = std(0x1c1d20, 0.5, 0.45), footMat = std(0x202124, 0.75, 0.4), strutMat = std(0x2a2c2f, 0.35, 0.8);
var LG = RK_LEG_LEN, taper = function (geo, w0, w1, shift) {
var P = geo.attributes.position;
for (var i = 0; i < P.count; i++) { var y = P.getY(i), k = Math.max(0, Math.min(1, y / LG)), w = w0 + (w1 - w0) * k; if (shift) P.setZ(i, P.getZ(i) + shift * (w / 2 - 0.07)); else P.setZ(i, P.getZ(i) * w / w0); }
geo.computeVertexNormals(); return geo; };
for (var l = 0; l < 4; l++) {
var az2 = l * Math.PI / 2 + Math.PI / 4, h2 = new THREE.Group();
h2.position.set(Math.cos(az2) * 1.95, RK_LEG_HINGE, -Math.sin(az2) * 1.95); h2.rotation.y = az2; G.add(h2);
var arm2 = new THREE.Group(); h2.add(arm2);
var pg = new THREE.BoxGeometry(0.42, LG, 1.35); pg.translate(0, LG / 2, 0); arm2.add(new THREE.Mesh(taper(pg, 1.35, 0.5), legMat));
[-1, 1].forEach(function (sg) { var rg = new THREE.BoxGeometry(0.58, LG, 0.16); rg.translate(0, LG / 2, 0); arm2.add(new THREE.Mesh(taper(rg, 1.35, 0.5, sg), railMat)); });
var rib = new THREE.BoxGeometry(0.36, LG * 0.92, 0.1); rib.translate(0.02, LG * 0.46, 0); arm2.add(new THREE.Mesh(rib, railMat));
var hingeBar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.5, 12), railMat); hingeBar.rotation.x = Math.PI / 2; arm2.add(hingeBar);
var footG = new THREE.Group(); footG.position.y = LG; arm2.add(footG);
var fsh = new THREE.Shape(); fsh.moveTo(-0.55, -0.62); fsh.lineTo(0.55, -0.42); fsh.lineTo(1.05, 0); fsh.lineTo(0.55, 0.42); fsh.lineTo(-0.55, 0.62); fsh.lineTo(-0.55, -0.62);
var fgeo = new THREE.ExtrudeGeometry(fsh, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 }); fgeo.rotateX(Math.PI / 2); fgeo.translate(0, -0.05, 0);
var pad = new THREE.Mesh(fgeo, footMat); pad.position.set(0.05, 0, 0); pad.castShadow = true; footG.add(pad);
var ank = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.3), railMat); ank.position.set(0.12, 0.15, 0); footG.add(ank);
var strut = [0.17, 0.135, 0.1].map(function (r) { var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10), strutMat); G.add(m); return m; });
RK.legs.push({ hinge: h2, arm: arm2, foot: footG, strut: strut, az: az2 });
}
G.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material.isMeshStandardMaterial && o.material.side === THREE.FrontSide) o.material.side = THREE.DoubleSide; } });
RK.plume = rkPlume(); G.add(RK.plume);
RK.cores = [];
for (var c = 0; c < 9; c++) { var core = rkCore(); core.position.copy(RK.nozzles[c].position); core.position.y -= 0.05; G.add(core); RK.cores.push(core); }
RK.sheath = rkSheath(); G.add(RK.sheath);
RK.splash = rkSplash(); RK.shipBody.add(RK.splash);
RK.vapor = rkVapor(); G.add(RK.vapor);
rkBoomBuild(root); rkRcsBuild(root);
}
function linerTex() {
if (RK.linerTex) return RK.linerTex;
var c = document.createElement('canvas'); c.width = 512; c.height = 1024; var x = c.getContext('2d'), r = 11;
var rn = function () { r = (r * 16807) % 2147483647; return (r - 1) / 2147483646; };
x.fillStyle = '#17181a'; x.fillRect(0, 0, 512, 1024);
for (var i = 0; i < 2600; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.015 + rn() * 0.03) + ')'; x.fillRect(rn() * 512, rn() * 1024, 2 + rn() * 30, 1 + rn() * 3); }
x.fillStyle = '#56585c'; for (var hx = 14; hx < 512; hx += 26) for (var hy = 18; hy < 1024; hy += 34) if (rn() < 0.55) { x.beginPath(); x.arc(hx + rn() * 4, hy + rn() * 4, 1.8, 0, 7); x.fill(); }
x.fillStyle = '#2a2b2e'; x.fillRect(0, 610, 512, 7); x.fillRect(0, 980, 512, 10);
x.strokeStyle = '#e9e9e4'; x.lineCap = 'round';
for (var w = 0; w < 5; w++) {
x.lineWidth = 2 + rn() * 2.5; x.beginPath(); var px = 40 + rn() * 430, py = 1000; x.moveTo(px, py);
for (var st = 0; st < 9; st++) { px = Math.max(10, Math.min(500, px + (rn() - 0.5) * 120)); py -= 60 + rn() * 70; x.quadraticCurveTo(px + (rn() - 0.5) * 80, py + 40, px, py); }
x.stroke();
}
for (var b = 0; b < 3; b++) { var bx = 60 + rn() * 380, by = 600 + rn() * 300;
x.fillStyle = '#8d9096'; for (var q = 0; q < 3; q++) { x.fillRect(bx + q * 16, by, 11, 60); x.beginPath(); x.arc(bx + q * 16 + 5.5, by, 5.5, 0, 7); x.fill(); }
x.fillStyle = '#c8cacd'; x.fillRect(bx + 60 + rn() * 40, by - 120 + rn() * 60, 34, 70);
}
var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; RK.linerTex = t; return t;
}
function rkPayload() {
if (!RK.plParts) {
var cv = document.createElement('canvas'); cv.width = cv.height = 256; var g2 = cv.getContext('2d');
g2.fillStyle = '#808080'; g2.fillRect(0, 0, 256, 256);
for (var i = 0; i < 900; i++) {
var x = Math.random() * 256, y = Math.random() * 256, l = 6 + Math.random() * 26, an = Math.random() * Math.PI;
g2.strokeStyle = 'rgba(' + (Math.random() < 0.5 ? '255,255,255' : '0,0,0') + ',' + (0.08 + Math.random() * 0.18) + ')'; g2.lineWidth = 1 + Math.random() * 2.5;
g2.beginPath(); g2.moveTo(x, y); g2.lineTo(x + Math.cos(an) * l, y + Math.sin(an) * l); g2.stroke();
}
var crk = new THREE.CanvasTexture(cv); crk.wrapS = crk.wrapT = THREE.RepeatWrapping;
var cc = document.createElement('canvas'); cc.width = cc.height = 128; var g3 = cc.getContext('2d');
g3.fillStyle = '#121a30'; g3.fillRect(0, 0, 128, 128); g3.strokeStyle = '#9aa0aa'; g3.lineWidth = 2;
for (var k = 0; k <= 128; k += 32) { g3.beginPath(); g3.moveTo(k, 0); g3.lineTo(k, 128); g3.stroke(); g3.beginPath(); g3.moveTo(0, k); g3.lineTo(128, k); g3.stroke(); }
var cells = new THREE.CanvasTexture(cc); cells.colorSpace = THREE.SRGBColorSpace;
var ch = document.createElement('canvas'); ch.width = ch.height = 128; var g4 = ch.getContext('2d');
g4.fillStyle = '#ffffff'; g4.fillRect(0, 0, 128, 128); g4.fillStyle = '#6a6250';
for (var hx = 8; hx < 128; hx += 16) for (var hy = 8; hy < 128; hy += 16) { g4.beginPath(); g4.arc(hx, hy, 1.6, 0, 7); g4.fill(); }
var holes = new THREE.CanvasTexture(ch); holes.colorSpace = THREE.SRGBColorSpace; holes.wrapS = holes.wrapT = THREE.RepeatWrapping; holes.repeat.set(4, 6);
RK.plParts = {
deck: std(0x2b2c30, 0.75, 0.3), cone: std(0x161618, 0.5, 0.35), silver: std(0xc9ccd0, 0.3, 0.95),
plate: std(0xcbb68a, 0.42, 0.75, { map: holes }), gold: std(0xd9a640, 0.3, 1.0, { bumpMap: crk, bumpScale: 1.6 }),
foil: std(0xd6d8dc, 0.28, 1.0, { bumpMap: crk, bumpScale: 1.4 }), black: std(0x1b1b1d, 0.55, 0.3),
cells: std(0xffffff, 0.3, 0.4, { map: cells }), white: std(0xebebe6, 0.55, 0.05), orange: std(0xc9581c, 0.5, 0.2), blue: std(0x1f3f86, 0.45, 0.3), lens: std(0x0a0a0a, 0.15, 0.6)
};
}
var M = RK.plParts, P = new THREE.Group(); P.position.y = 14.5;
var seed = 7; var rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
var pick = function (a) { return a[Math.floor(rnd() * a.length)]; };
var add = function (par, geo, mat, x, y, z) { var o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); par.add(o); return o; };
var room = function (h) { var sN = Math.min(1, Math.max(0, h / 13)); return 2.6 * Math.sqrt(Math.max(0, 1 - Math.pow(sN, 2.2))) - 0.28; };
add(P, new THREE.CylinderGeometry(2.48, 2.48, 0.1, 48), M.deck, 0, 0.05, 0);
add(P, new THREE.CylinderGeometry(1.62, 1.66, 0.22, 48), M.silver, 0, 0.21, 0);
add(P, new THREE.CylinderGeometry(1.32, 1.6, 0.85, 48, 1, true), M.cone, 0, 0.74, 0);
add(P, new THREE.CylinderGeometry(1.42, 1.34, 0.14, 48), M.silver, 0, 1.22, 0);
for (var f = 0; f < 12; f++) { var sc = add(P, new THREE.BoxGeometry(0.42, 0.22, 0.05), M.silver, 0, 1.1, 0); var fa = f / 12 * Math.PI * 2; sc.position.set(Math.cos(fa) * 1.38, 1.08, Math.sin(fa) * 1.38); sc.rotation.y = -fa + Math.PI / 2; }
var sat = function (par, w, h, d) {
var g = new THREE.Group(), skin = pick([M.gold, M.gold, M.foil, M.white, M.black, M.foil]);
add(g, new THREE.BoxGeometry(w, h, d), skin, 0, 0, d / 2);
var face = rnd();
if (face < 0.4) add(g, new THREE.BoxGeometry(w * 0.86, h * 0.86, 0.03), M.cells, 0, 0, d + 0.016);
else if (face < 0.6) { var ln = add(g, new THREE.CylinderGeometry(0.11, 0.13, 0.12, 20), M.white, w * 0.2, h * 0.15, d + 0.06); ln.rotation.x = Math.PI / 2; var le = add(g, new THREE.CylinderGeometry(0.07, 0.07, 0.13, 16), M.lens, w * 0.2, h * 0.15, d + 0.07); le.rotation.x = Math.PI / 2; }
else if (face < 0.75) add(g, new THREE.BoxGeometry(w * 0.6, h * 0.5, 0.04), M.gold, -w * 0.12, h * 0.1, d + 0.02);
if (rnd() < 0.35) { var rg = add(g, new THREE.CylinderGeometry(Math.min(w, h) * 0.32, Math.min(w, h) * 0.32, 0.1, 20), M.black, 0, 0, -0.03); rg.rotation.x = Math.PI / 2; }   // separation ring
par.add(g); return g;
};
var C0 = 1.3, C1 = 4.5, R8 = 1.3, ap = R8 * Math.cos(Math.PI / 8);
var col = add(P, new THREE.CylinderGeometry(R8, R8, C1 - C0, 8), M.plate, 0, (C0 + C1) / 2, 0); col.rotation.y = Math.PI / 8;
for (var q = 0; q < 16; q++) {
var qa = (q + 0.5) / 16 * Math.PI * 2, bx = add(P, new THREE.BoxGeometry(0.46, 0.42, 0.34), q % 7 === 3 ? M.orange : q % 4 === 1 ? M.blue : q % 3 ? M.black : M.silver, Math.cos(qa) * 1.5, C0 + 0.24, Math.sin(qa) * 1.5);
bx.rotation.y = -qa + Math.PI / 2;
}
for (var fc = 0; fc < 8; fc++) {
var a = fc / 8 * Math.PI * 2, rows = [C0 + 0.95, C0 + 1.85, C0 + 2.7];
rows.forEach(function (yy) {
if (rnd() < 0.18) return;
var w = 0.45 + rnd() * 0.45, h = 0.4 + rnd() * 0.45, d = 0.3 + rnd() * 0.45;
d = Math.min(d, room(yy + h / 2) - ap - 0.02); if (d < 0.15) return;
var g = sat(P, w, h, d); g.position.set(Math.cos(a) * ap, yy, -Math.sin(a) * ap); g.rotation.y = a + Math.PI / 2;
g.position.x += Math.cos(a + Math.PI / 2) * (rnd() - 0.5) * 0.25; g.position.z -= Math.sin(a + Math.PI / 2) * (rnd() - 0.5) * 0.25;
});
}
add(P, new THREE.CylinderGeometry(0.66, R8 + 0.08, 0.6, 32, 1, true), M.cone, 0, C1 + 0.28, 0);
add(P, new THREE.CylinderGeometry(R8 + 0.1, R8 + 0.1, 0.07, 32), M.silver, 0, C1 + 0.02, 0);
for (var sc2 = 0; sc2 < 8; sc2++) { var a8 = (sc2 + 0.5) / 8 * Math.PI * 2, sp8 = add(P, new THREE.BoxGeometry(0.5, 0.3, 0.04), M.silver, Math.cos(a8) * (R8 + 0.06), C1 + 0.12, Math.sin(a8) * (R8 + 0.06)); sp8.rotation.y = -a8 + Math.PI / 2; }
var U0 = C1 + 0.5, U1 = 9.3;
[0, Math.PI / 2].forEach(function (ra) { add(P, new THREE.BoxGeometry(1.3, U1 - U0, 0.1), M.plate, 0, (U0 + U1) / 2, 0).rotation.y = ra; });
for (var qd = 0; qd < 4; qd++) {
var qa2 = qd * Math.PI / 2 + Math.PI / 4;
[U0 + 0.75, U0 + 2.2, U0 + 3.5].forEach(function (yy, li) {
var w = 0.7 + rnd() * 0.4, h = 0.7 + rnd() * 0.5, d = 0.6 + rnd() * 0.45;
var lim = room(yy + h / 2) - 0.1; if (lim < 0.6) return;
d = Math.min(d, lim - 0.12); w = Math.min(w, lim * 0.9);
var g = sat(P, w, h, d); g.position.set(Math.cos(qa2) * 0.12, yy, -Math.sin(qa2) * 0.12); g.rotation.y = qa2 + Math.PI / 2;
});
}
var cap = add(P, new THREE.CylinderGeometry(0.05, 0.42, 0.55, 20), M.white, 0, U1 + 0.27, 0);
return P;
}
function rkUpper(root) {
var make = function () {
var G = new THREE.Group(), paint = new THREE.MeshPhysicalMaterial({ map: paintTex(), roughness: 0.38, metalness: 0.0, clearcoat: 0.9, clearcoatRoughness: 0.14, specularIntensity: 0.9 });
var body = new THREE.Mesh(new THREE.CylinderGeometry(1.83, 1.83, 13.5, 48), paint); body.position.y = 6.75 + 1.0; G.add(body);
var pts = []; for (var i = 0; i <= 24; i++) { var s = i / 24; pts.push(new THREE.Vector2(2.6 * Math.sqrt(Math.max(0, 1 - Math.pow(s, 2.2))), 13 * s)); }
G.userData.halves = [0, 1].map(function (k) {
var hg = new THREE.Group(); hg.position.y = 14.5; G.add(hg);
var half = new THREE.Mesh(new THREE.LatheGeometry(pts, 24, k * Math.PI, Math.PI), paint); half.material = paint.clone(); half.material.side = THREE.DoubleSide; hg.add(half);
var liner = new THREE.Mesh(new THREE.LatheGeometry(pts.map(function (v) { return new THREE.Vector2(Math.max(0, v.x - 0.06), v.y); }), 24, k * Math.PI, Math.PI),
new THREE.MeshStandardMaterial({ map: linerTex(), roughness: 0.55, metalness: 0.3, side: THREE.BackSide })); liner.userData.noShadow = true; hg.add(liner);
var seam = new THREE.Mesh(new THREE.BoxGeometry(0.06, 13, 0.06), std(0x1c1c1c, 0.6, 0.2)); seam.position.set(0, 6.5, k ? -2.0 : 2.0); seam.visible = false; hg.add(seam);
return hg;
});
var ring = new THREE.Mesh(new THREE.CylinderGeometry(2.62, 2.62, 0.25, 48, 1, true), std(0x1a1a1a, 0.6, 0.2)); ring.position.y = 14.6; G.add(ring);
G.add(rkPayload());
var adap = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 1.83, 1.2, 48, 1, true), paint); adap.position.y = 14.0; G.add(adap);
var mvm = std(0x6a6560, 0.3, 0.9); mvm.emissive = new THREE.Color(0, 0, 0);
mvm.onBeforeCompile = function (sh) {
sh.vertexShader = 'varying vec3 vNz;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvNz = position;');
sh.fragmentShader = 'varying vec3 vNz;\n' + GLSL_NOISE + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n'
+ ' float aN = atan(vNz.z, vNz.x); float stN = fbm(vec2(aN * 8.0, vNz.y * 0.12)) * 0.8 + fbm(vec2(aN * 26.0, vNz.y * 0.2)) * 0.45;'
+ ' float band = 1.0;'
+ ' totalEmissiveRadiance *= (0.3 + 1.1 * stN) * band * (0.6 + 0.7 * smoothstep(-0.5, 3.2, vNz.y));');
}; if (!RK.mvacMat || G === undefined) RK.mvacMat = mvm; G.userData.mvac = mvm;
var mvac = new THREE.Mesh(bell(1.6, 0.35, 3.2), mvm); mvac.position.y = -2.2; G.add(mvac);
G.traverse(function (o) { if (o.isMesh) { o.castShadow = !o.userData.noShadow; o.receiveShadow = !o.userData.noShadow; if (o.material.isMeshStandardMaterial && o.material.side === THREE.FrontSide) o.material.side = THREE.DoubleSide; } });
return G;
};
RK.stack = make(); RK.stack.position.y = 44.2; RK.booster.add(RK.stack);
RK.s2 = make(); root.add(RK.s2); RK.s2.visible = false; RK.mvacMat = RK.s2.userData.mvac;
RK.s2plume = rkPlume(true); RK.s2plume.position.y = -2.3; RK.s2.add(RK.s2plume);
}
function rkPlume(vac) {
var g = new THREE.CylinderGeometry(1, 1, 1, 40, 80, true); g.translate(0, -0.5, 0);
var m = rkShader({ flat: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
uniforms: { uLen: { value: 40 }, uR0: { value: 1.6 }, uR1: { value: 6 }, uI: { value: 0 }, uExp: { value: 0 }, uVac: { value: vac ? 1 : 0 }, uClip: { value: -1e9 }, uGreen: { value: 0 }, uShell: { value: 0 } },
vertex: 'uniform float uLen; uniform float uR0; uniform float uR1; uniform float uExp; uniform float uShell; varying float vS; varying vec3 vNv; varying vec3 vW; varying float vAng; varying vec3 vAx; varying vec3 vVp;\n'
+ 'void main(){ float s = -position.y; vS = s; vAng = atan(position.z, position.x); float r = mix(uR0 * (1.0 + 0.5 * s) + (uR1 - uR0) * 0.35 * s, uR0 + (uR1 - uR0) * pow(s, 0.55), uExp);'
+ ' r *= 1.0 + uShell * (0.04 + 0.05 * uExp) * (0.4 + s); vec3 p = vec3(position.x * r, -s * uLen * (1.0 + uShell * 0.025), position.z * r); vec4 wp = modelMatrix * vec4(p, 1.0); vW = wp.xyz; wp.y -= curveDrop(wp.xyz);'
+ ' vNv = normalize(normalMatrix * vec3(position.x, 0.0, position.z)); vAx = normalize(normalMatrix * vec3(0.0, 1.0, 0.0)); vec4 mv = viewMatrix * wp; vVp = mv.xyz; gl_Position = projectionMatrix * mv;\n#include <logdepthbuf_vertex>\n }',
fragment: GLSL_NOISE + 'uniform float uI; uniform float uExp; uniform float uVac; uniform float uTime; uniform float uClip; uniform float uGreen; uniform float uShell; varying float vS; varying vec3 vNv; varying vec3 vW; varying float vAng; varying vec3 vAx; varying vec3 vVp;\n'
+ 'void main(){ if (vW.y < uClip) discard; vec3 V = normalize(-vVp); float edge = abs(dot(normalize(vNv), V)); float along = abs(dot(normalize(vAx), V)); '
+ ' float n = fbm(vec2(vAng * 2.0, vS * 9.0 - uTime * 16.0)); float n2 = fbm(vec2(vAng * 5.0 + 3.0, vS * 30.0 - uTime * 40.0));'
+ ' float swirl = fbm(vec2(vAng * 9.0 + uTime * 3.0, vS * 14.0 - uTime * 22.0)); float body = max(pow(edge, 1.2 + uExp * 0.8), pow(along, 2.0) * (0.15 + 0.9 * swirl * swirl + 0.5 * (1.0 - vS) * (1.0 - vS)));'
+ ' float dia = (1.0 - uExp) * smoothstep(0.55, 1.0, sin(vS * 70.0 - 0.5)) * (1.0 - smoothstep(0.05, 0.45, vS)) * 1.6;'
+ ' float fall = pow(1.0 - vS, mix(1.0, 0.7, uExp)) * smoothstep(0.0, 0.02, vS + 0.004);'
+ ' fall *= 1.0 - uExp * smoothstep(0.35 + 0.3 * n, 1.0, vS); fall *= mix(1.0, smoothstep(0.0, 0.45, edge + along * 0.3), uExp * 0.8);'
+ ' vec3 hot = vec3(1.0, 0.88, 0.62), mid = vec3(1.0, 0.5, 0.13), cool = vec3(0.7, 0.2, 0.05);'
+ ' vec3 col = mix(hot, mid, smoothstep(0.02, 0.25 + uExp * 0.3, vS)); col = mix(col, cool, smoothstep(0.35, 0.9, vS));'
+ ' if (uVac > 0.5) col = mix(vec3(0.85, 0.82, 1.0), vec3(0.95, 0.55, 0.35), smoothstep(0.0, 0.6, vS));'
+ ' col = mix(col, vec3(0.75, 0.82, 1.0), uExp * 0.25 * smoothstep(0.2, 0.9, vS)); col = mix(col, hot, pow(along, 3.0) * 0.5 * (1.0 - vS));'
+ ' float a = uI * fall * body * (0.55 + 0.6 * n + 0.25 * n2) * mix(1.0, mix(0.3, 0.12, uVac), uExp) + dia * uI * pow(edge, 2.5) * (1.0 - along * 0.8);'
+ ' col = mix(col, vec3(0.3, 1.0, 0.38), uGreen * 0.9);'
+ ' if (uShell > 0.5) { float sh = uShell / 5.0; float wisp = fbm(vec2(vAng * (3.0 + uShell) + uShell * 1.7, vS * (7.0 + 2.0 * uShell) - uTime * (10.0 + 3.0 * uShell)));'
+ '   a *= pow(1.0 - sh * 0.92, 1.8) * mix(1.0, smoothstep(0.15 + 0.3 * sh, 0.85, wisp + 0.2), 0.35 + 0.65 * sh) * (0.4 + 0.6 * uExp); }'
+ ' a *= mix(1.0, 0.62, uExp);'
+ ' if (uVac < 0.5) { float core = (1.0 - uExp) * (1.0 - smoothstep(0.0, 0.45, vS)) * pow(edge, 0.8); col = mix(col, vec3(1.0, 0.97, 0.88), core * 0.8); a *= 1.0 + 0.9 * core; }'
+ ' gl_FragColor = vec4(col * a * (2.6 + 1.6 * (1.0 - uExp)), a);\n#include <logdepthbuf_fragment>\n }' });
var mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 5; mesh.visible = false;
for (var k = 1; k <= 5; k++) {
var ms = new THREE.ShaderMaterial({ uniforms: Object.assign({}, m.uniforms, { uShell: { value: k } }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
side: THREE.DoubleSide, vertexShader: m.vertexShader, fragmentShader: m.fragmentShader });
var sm = new THREE.Mesh(g, ms); sm.frustumCulled = false; sm.renderOrder = 5; mesh.add(sm);
}
return mesh;
}
function rkRcsBuild(root) {
var g = new THREE.ConeGeometry(1, 1, 24, 6, true); g.rotateX(Math.PI); g.translate(0, 0.5, 0);
var m = rkShader({ flat: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uI: { value: 0 } },
vertex: 'varying float vS; varying vec3 vNv; varying float vA; void main(){ vS = position.y; vA = atan(position.z, position.x); vNv = normalize(normalMatrix * vec3(position.x, 0.0, position.z)); vec4 wp = modelMatrix * vec4(position, 1.0); wp.y -= curveDrop(wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp;\n#include <logdepthbuf_vertex>\n }',
fragment: GLSL_NOISE + 'uniform float uI; uniform float uTime; varying float vS; varying vec3 vNv; varying float vA;\n'
+ 'void main(){ float e = abs(normalize(vNv).z); float n = fbm(vec2(vA * 3.0, vS * 6.0 - uTime * 14.0)); float a = uI * pow(1.0 - vS, 1.6) * (0.25 + 0.75 * pow(e, 0.7)) * (0.5 + 0.8 * n) * smoothstep(0.0, 0.08, vS);'
+ ' gl_FragColor = vec4(vec3(0.92, 0.96, 1.0) * a * 2.2, a);\n#include <logdepthbuf_fragment>\n }' });
RK.rcsJet = new THREE.Mesh(g, m); RK.rcsJet.frustumCulled = false; RK.rcsJet.visible = false; RK.rcsJet.renderOrder = 6; root.add(RK.rcsJet); RK.rcsI = 0;
}
function rkRcsJet(rc, u, bAxis, alt, training, dt) {
if (!RK.rcsJet) return;
var pulse = (performance.now() / 1000 * 7.0) % 1 < 0.55 ? 1 : 0.25;   // nitrogen thrusters fire in pulses
var want = rc > 0.06 && RK.booster.visible ? Math.min(1, 0.3 + rc * 1.2) * pulse : 0; RK.rcsI += (want - RK.rcsI) * Math.min(1, dt * 20);
RK.rcsJet.visible = RK.rcsI > 0.02; if (!RK.rcsJet.visible) return;
var tq = new THREE.Vector3(u[0], u[2], -u[1]), ex = new THREE.Vector3().crossVectors(bAxis, tq);
if (ex.lengthSq() < 1e-8) { RK.rcsJet.visible = false; return; } ex.normalize();
var len = 7 + 6 * RK.rcsI * (alt > 30000 ? 1.6 : 0.6), w = len * (alt > 30000 ? 0.55 : 0.3);
RK.rcsJet.position.copy(RK.booster.position).addScaledVector(bAxis, 43.0).addScaledVector(ex, 1.95);
RK.rcsJet.quaternion.setFromUnitVectors(UPV, ex); RK.rcsJet.scale.set(w, len, w);
RK.rcsJet.material.uniforms.uI.value = RK.rcsI * (alt > 30000 ? 0.9 : 0.5);
}
function rkCore() {
var g = new THREE.ConeGeometry(0.46, 1, 24, 12, true); g.rotateX(Math.PI); g.translate(0, -0.5, 0);
var m = rkShader({ flat: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uI: { value: 0 }, uL: { value: 6 }, uGreen: { value: 0 } },
vertex: 'uniform float uL; varying float vS; varying vec3 vNv; void main(){ vS = clamp(-position.y, 0.0, 1.0); vec3 p = position; p.y *= uL; p.xz *= (1.0 + vS * 0.3); vNv = normalize(normalMatrix * vec3(position.x, 0.0, position.z)); vec4 wp = modelMatrix * vec4(p, 1.0); wp.y -= curveDrop(wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp;\n#include <logdepthbuf_vertex>\n }',
fragment: 'uniform float uI; uniform float uTime; uniform float uGreen; varying float vS; varying vec3 vNv; void main(){ float e = abs(normalize(vNv).z); float a = uI * pow(1.0 - vS, 1.5) * pow(e, 0.8) * (0.85 + 0.15 * sin(uTime * 90.0 + vS * 20.0)); gl_FragColor = vec4(mix(vec3(1.0, 0.95, 0.85), vec3(0.35, 1.0, 0.45), uGreen) * a * 12.0, a);\n#include <logdepthbuf_fragment>\n }' });
var c = new THREE.Mesh(g, m); c.frustumCulled = false; c.renderOrder = 6; c.visible = false; return c;
}
function rkSheath() {
var g = new THREE.CylinderGeometry(1, 1, 1, 48, 72, true); g.translate(0, 0.5, 0);
var m = rkShader({ flat: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uI: { value: 0 }, uPl: { value: 0 } },
vertex: 'varying float vS; varying vec3 vNv; varying float vAng; varying vec3 vVp; varying float vCap;\n'
+ 'void main(){ float u = position.y, C = 0.14; vAng = atan(position.z, position.x); vec2 rd = vec2(position.x, position.z); vec3 p, n;'
+ ' if (u < C) { float th = u / C * 1.5707963; float r = 2.1 * sin(th); p = vec3(rd.x * r, -0.8 - 1.6 * cos(th), rd.y * r); n = vec3(rd.x * sin(th) / 2.1, -cos(th) / 1.6, rd.y * sin(th) / 2.1); vS = 0.0; vCap = 1.0 - u / C; }'
+ ' else { vS = (u - C) / (1.0 - C); float r = 2.1 + 9.0 * pow(vS, 0.7); p = vec3(rd.x * r, -0.8 + vS * 50.0, rd.y * r); n = vec3(rd.x, -0.12 * (1.0 - vS), rd.y); vCap = 0.0; }'
+ ' vNv = normalize(normalMatrix * normalize(n)); vec4 wp = modelMatrix * vec4(p, 1.0); wp.y -= curveDrop(wp.xyz); vec4 mv = viewMatrix * wp; vVp = mv.xyz; gl_Position = projectionMatrix * mv;\n#include <logdepthbuf_vertex>\n }',
fragment: GLSL_NOISE + 'uniform float uI; uniform float uPl; uniform float uTime; varying float vS; varying vec3 vNv; varying float vAng; varying vec3 vVp; varying float vCap;\n'
+ 'void main(){ vec3 V = normalize(-vVp); float f = abs(dot(normalize(vNv), V)); float e = mix(f, 0.55 + 0.45 * f, vCap * vCap);'
+ ' float n = fbm(vec2(vAng * 3.0, vS * 6.0 - vCap * 2.0 - uTime * 5.0)); float a = uI * pow(1.0 - vS, 1.3) * pow(e, 1.4) * (0.4 + 0.9 * n);'
+ ' float p = uPl * pow(1.0 - vS, 4.0) * pow(e, 2.0) * (0.6 + 0.6 * n) * (1.0 + 0.6 * vCap);'
+ ' vec3 col = vec3(1.0, 0.5, 0.15) * a * 6.0 + vec3(1.0, 0.45, 0.22) * p * 4.0;'
+ ' gl_FragColor = vec4(col, max(a, p));\n#include <logdepthbuf_fragment>\n }' });
var s = new THREE.Mesh(g, m); s.frustumCulled = false; s.renderOrder = 6; s.visible = false;
return s;
}
function rkSplash() {
var g = new THREE.CircleGeometry(1, 64); g.rotateX(-Math.PI / 2);
var m = rkShader({ flat: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uI: { value: 0 }, uR: { value: 10 } },
vertex: 'uniform float uR; varying vec2 vP; void main(){ vP = position.xz; vec4 wp = modelMatrix * vec4(position.x * uR, 0.15, position.z * uR, 1.0); wp.y -= curveDrop(wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp;\n#include <logdepthbuf_vertex>\n }',
fragment: GLSL_NOISE + 'uniform float uI; uniform float uTime; varying vec2 vP; void main(){ float r = length(vP); float an = atan(vP.y, vP.x); float n = fbm(vec2(an * 6.0, r * 5.0 - uTime * 6.0));'
+ ' float a = uI * smoothstep(1.0, 0.25, r) * (0.35 + 0.9 * n) * (0.6 + 0.4 * smoothstep(0.0, 0.3, r)); vec3 col = mix(vec3(1.0, 0.85, 0.6), vec3(1.0, 0.4, 0.1), smoothstep(0.1, 0.8, r));'
+ ' gl_FragColor = vec4(col * a * 6.0, a);\n#include <logdepthbuf_fragment>\n }' });
var s = new THREE.Mesh(g, m); s.frustumCulled = false; s.renderOrder = 7; s.visible = false; return s;
}
function rkVapor() {
var g = new THREE.CylinderGeometry(1, 1, 1, 40, 12, true); g.translate(0, 0.5, 0);
var m = rkShader({ flat: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uI: { value: 0 } },
vertex: 'varying float vS; varying vec3 vNv; varying float vAng; void main(){ vS = position.y; vAng = atan(position.z, position.x); float r = 2.0 + 7.0 * vS; vec3 p = vec3(position.x * r, 52.0 - vS * 26.0, position.z * r); vNv = normalize(normalMatrix * vec3(position.x, 0.0, position.z)); vec4 wp = modelMatrix * vec4(p, 1.0); wp.y -= curveDrop(wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp;\n#include <logdepthbuf_vertex>\n }',
fragment: GLSL_NOISE + 'uniform float uI; uniform float uTime; varying float vS; varying vec3 vNv; varying float vAng; void main(){ float e = abs(normalize(vNv).z); float n = fbm(vec2(vAng * 4.0, vS * 3.0 + uTime * 2.0)); float a = uI * sin(vS * 3.14159) * pow(e, 0.7) * (0.3 + 0.8 * n) * 0.55; gl_FragColor = vec4(vec3(0.95), a);\n#include <logdepthbuf_fragment>\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n }' });
var v = new THREE.Mesh(g, m); v.frustumCulled = false; v.renderOrder = 4; v.visible = false; return v;
}
var PN = quality === 'fast' ? 2500 : 7000;
function rkBakePuffs() {
var rt = new THREE.WebGLRenderTarget(512, 512, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
var mat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
fragmentShader: GLSL_NOISE + 'varying vec2 vUv; void main(){ vec2 cell = floor(vUv * 2.0), p = fract(vUv * 2.0); float n = fbm(p * 3.0 + cell * 23.7 + 5.3); gl_FragColor = vec4(n, n, n, 1.0); }' });
var sc = new THREE.Scene(), q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); q.frustumCulled = false; sc.add(q);
var prev = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.render(sc, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)); renderer.setRenderTarget(prev);
mat.dispose(); q.geometry.dispose();
return rt.texture;
}
function rkParticles(root) {
var g = new THREE.BufferGeometry();
RK.pw = new Float64Array(PN * 3); RK.pv = new Float32Array(PN * 3); RK.page = new Float32Array(PN); RK.plife = new Float32Array(PN); RK.psz = new Float32Array(PN * 2); RK.pcol = new Float32Array(PN * 3); RK.palpha = new Float32Array(PN); RK.pkind = new Uint8Array(PN);
RK.ppos = new Float32Array(PN * 3); RK.pSize = new Float32Array(PN); RK.pA = new Float32Array(PN); RK.pC = new Float32Array(PN * 3); RK.pE = new Float32Array(PN);
g.setAttribute('position', new THREE.BufferAttribute(RK.ppos, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(RK.pSize, 1)); g.setAttribute('aA', new THREE.BufferAttribute(RK.pA, 1)); g.setAttribute('aC', new THREE.BufferAttribute(RK.pC, 3)); g.setAttribute('aE', new THREE.BufferAttribute(RK.pE, 1));
RK.pU = { uPuff: { value: rkBakePuffs() }, uScale: { value: 800 }, uMaxPt: { value: 400 }, uLight: { value: new THREE.Vector3(0, 1, 0) }, uFire: { value: new THREE.Vector4() }, uSunLit: { value: 1 } };
var m = rkShader({ transparent: true, depthWrite: false, uniforms: RK.pU,
vertex: 'uniform float uScale; uniform float uMaxPt; uniform vec4 uFire; attribute float aSize; attribute float aA; attribute vec3 aC; attribute float aE; varying float vA; varying vec3 vC; varying float vF; varying float vRot; varying vec2 vCell; varying float vE;\n'
+ 'void main(){ vA = aA; vC = aC; vE = aE; float id = float(gl_VertexID); vCell = vec2(mod(id, 2.0), mod(floor(id * 0.5), 2.0)); vRot = id * 2.39996 + aSize * 0.02; vec4 wp = modelMatrix * vec4(position, 1.0); float fd = length(wp.xyz - uFire.xyz); vF = uFire.w / (1.0 + fd * fd / 1600.0); wp.y -= curveDrop(wp.xyz);'
+ ' vec4 mv = viewMatrix * wp; gl_Position = projectionMatrix * mv; gl_PointSize = clamp(aSize * uScale / max(0.5, -mv.z), 0.0, uMaxPt); if (aSize < 0.3) gl_PointSize = min(gl_PointSize, 3.5);'
+ ' float nf = smoothstep(0.15, 0.7, -mv.z / max(aSize, 0.01)); vA *= nf; if (nf <= 0.001) { gl_PointSize = 0.0; gl_Position = vec4(2.0, 2.0, 2.0, 1.0); }\n#include <logdepthbuf_vertex>\n }',
fragment: 'uniform sampler2D uPuff; uniform vec3 uLight; uniform float uSunLit; varying float vA; varying vec3 vC; varying float vF; varying float vRot; varying vec2 vCell; varying float vE;\n'
+ 'void main(){ vec2 c = gl_PointCoord * 2.0 - 1.0; c.y = -c.y; float r2 = dot(c, c); float cr = cos(vRot), sr = sin(vRot);'
+ ' vec2 q = vec2(cr * c.x - sr * c.y, sr * c.x + cr * c.y) * 0.5 + 0.5; float n = texture2D(uPuff, (vCell + clamp(q, 0.004, 0.996)) * 0.5).r; float rr = r2 + 0.45 * (n - 0.5); if (rr >= 1.0) discard; float edge = exp(-3.2 * max(rr, 0.0)) * (1.0 - smoothstep(0.7, 1.0, rr));'
+ ' vec3 nrm = normalize(vec3(c, sqrt(max(0.0, 1.0 - min(r2, 1.0))))); float lit = mix(0.85, clamp(dot(nrm, uLight) * 0.5 + 0.55, 0.15, 1.1), 0.45) * uSunLit + 0.12;'
+ ' vec3 own = vC * (0.55 + 0.7 * n) * (0.75 + 0.6 * (1.0 - min(r2, 1.0)));'
+ ' vec3 col = mix(vC * lit * (0.8 + 0.35 * n), own, vE) + vec3(1.0, 0.45, 0.12) * vF; gl_FragColor = vec4(col, vA * edge);\n#include <logdepthbuf_fragment>\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n }' });
RK.points = new THREE.Points(g, m); RK.points.frustumCulled = false; RK.points.renderOrder = 3; root.add(RK.points);
RK.pnext = 0;
}
function puff(x, y, z, vx, vy, vz, life, s0, s1, col, alpha, kind) {
var PC = Math.floor(PN * 0.25), i;
if (kind === 10) { i = PN - PC + (RK.pnext10 || 0); RK.pnext10 = ((RK.pnext10 || 0) + 1) % PC; }
else { i = RK.pnext; RK.pnext = (RK.pnext + 1) % (PN - PC); }
RK.pw[3 * i] = x; RK.pw[3 * i + 1] = y; RK.pw[3 * i + 2] = z; RK.pv[3 * i] = vx; RK.pv[3 * i + 1] = vy; RK.pv[3 * i + 2] = vz;
RK.page[i] = 0; RK.plife[i] = life; RK.psz[2 * i] = s0; RK.psz[2 * i + 1] = s1; RK.pcol[3 * i] = col[0]; RK.pcol[3 * i + 1] = col[1]; RK.pcol[3 * i + 2] = col[2]; RK.palpha[i] = alpha; RK.pkind[i] = kind || 0; if (RK.pE) RK.pE[i] = kind === 1 || kind === 7 || (kind === 4 && col[0] > 1.5) ? 1 : kind === 4 && col[0] > 0.75 ? 0.55 : 0;
}
function particlesStep(dt, wind, dts) {
if (dts == null) dts = dt;
for (var i = 0; i < PN; i++) {
if (RK.plife[i] <= 0) { RK.pA[i] = 0; RK.pSize[i] = 0; continue; }
var a = (RK.page[i] += dt), u = a / RK.plife[i];
if (u >= 1) { RK.plife[i] = 0; RK.pA[i] = 0; RK.pSize[i] = 0; continue; }
var kd = RK.pkind[i], drag = kd === 1 ? 2.5 : kd === 4 ? 0.25 : kd === 0 || kd === 5 ? 0.14 : kd === 2 ? 0.4 : kd === 10 ? 0.2 : 0.6, k = Math.exp(-drag * dt);
if (kd === 6 || kd === 8) {
RK.pw[3 * i] += RK.pv[3 * i] * dt; RK.pw[3 * i + 1] += RK.pv[3 * i + 1] * dt; RK.pw[3 * i + 2] += RK.pv[3 * i + 2] * dt;
var bwp = (kd === 8 ? RK.s2World : RK.bWorld) || [0, 0, 0];
RK.ppos[3 * i] = bwp[0] + RK.pw[3 * i] - FOC.x; RK.ppos[3 * i + 1] = bwp[2] + RK.pw[3 * i + 2] - FOC.z; RK.ppos[3 * i + 2] = -(bwp[1] + RK.pw[3 * i + 1] - FOC.y);
RK.pSize[i] = RK.psz[2 * i] + (RK.psz[2 * i + 1] - RK.psz[2 * i]) * u; RK.pA[i] = RK.palpha[i] * Math.min(1, u * 15) * Math.pow(1 - u, 1.5);
RK.pC[3 * i] = RK.pcol[3 * i]; RK.pC[3 * i + 1] = RK.pcol[3 * i + 1]; RK.pC[3 * i + 2] = RK.pcol[3 * i + 2];
continue;
}
if (kd === 9) {
var k9 = Math.exp(-0.5 * dt);
RK.pv[3 * i] = RK.pv[3 * i] * k9 + wind[0] * 0.25 * (1 - k9); RK.pv[3 * i + 1] = RK.pv[3 * i + 1] * k9 + wind[1] * 0.25 * (1 - k9); RK.pv[3 * i + 2] = RK.pv[3 * i + 2] * k9 - 2.2 * dt;
RK.pw[3 * i] += RK.pv[3 * i] * dt; RK.pw[3 * i + 1] += RK.pv[3 * i + 1] * dt; RK.pw[3 * i + 2] += RK.pv[3 * i + 2] * dt;
var fl9 = 1.0, P9 = RK.padXY; if (P9) { var dx9 = RK.pw[3 * i] - P9[0], dy9 = RK.pw[3 * i + 1] - P9[1];
fl9 = dx9 > -20 && dx9 < 16 && dy9 > -13 && dy9 < 13 ? 9.2 : Math.abs(dx9) < 90 && Math.abs(dy9) < 90 ? 4.2 : 1.0; }
if (RK.pw[3 * i + 2] < fl9) { if (RK.pw[3 * i + 2] > fl9 - 1.5) { RK.pw[3 * i + 2] = fl9; RK.pv[3 * i + 2] = 0; var hv9 = Math.hypot(RK.pv[3 * i], RK.pv[3 * i + 1]);
if (hv9 < 1.6) { var a9 = hv9 > 0.05 ? Math.atan2(RK.pv[3 * i + 1], RK.pv[3 * i]) : Math.random() * 6.283; RK.pv[3 * i] = Math.cos(a9) * 1.6; RK.pv[3 * i + 1] = Math.sin(a9) * 1.6; } } }
RK.ppos[3 * i] = RK.pw[3 * i] - FOC.x; RK.ppos[3 * i + 1] = RK.pw[3 * i + 2] - FOC.z; RK.ppos[3 * i + 2] = -(RK.pw[3 * i + 1] - FOC.y);
RK.pSize[i] = RK.psz[2 * i] + (RK.psz[2 * i + 1] - RK.psz[2 * i]) * Math.sqrt(u); RK.pA[i] = RK.palpha[i] * Math.min(1, u * 10) * Math.pow(1 - u, 1.3); RK.pE[i] = 0;
RK.pC[3 * i] = RK.pcol[3 * i]; RK.pC[3 * i + 1] = RK.pcol[3 * i + 1]; RK.pC[3 * i + 2] = RK.pcol[3 * i + 2];
continue;
}
if (kd === 7) {
var k7 = Math.exp(-1.9 * dt), hot = Math.max(0, 1 - u * (1.6 + RK.pcol[3 * i] * 0.9)), lift = 2 + 16 * hot;
RK.pv[3 * i] = RK.pv[3 * i] * k7 + wind[0] * (1 - k7); RK.pv[3 * i + 1] = RK.pv[3 * i + 1] * k7 + wind[1] * (1 - k7); RK.pv[3 * i + 2] = RK.pv[3 * i + 2] * k7 + lift * dt * 2.2;
RK.pw[3 * i] += RK.pv[3 * i] * dt; RK.pw[3 * i + 1] += RK.pv[3 * i + 1] * dt; RK.pw[3 * i + 2] += RK.pv[3 * i + 2] * dt;
if (RK.pw[3 * i + 2] < RK.pcol[3 * i + 1]) { RK.pw[3 * i + 2] = RK.pcol[3 * i + 1]; RK.pv[3 * i + 2] = Math.abs(RK.pv[3 * i + 2]) * 0.3; }
RK.ppos[3 * i] = RK.pw[3 * i] - FOC.x; RK.ppos[3 * i + 1] = RK.pw[3 * i + 2] - FOC.z; RK.ppos[3 * i + 2] = -(RK.pw[3 * i + 1] - FOC.y);
RK.pSize[i] = RK.psz[2 * i] + (RK.psz[2 * i + 1] - RK.psz[2 * i]) * (1 - Math.pow(1 - u, 3));
var e7 = hot <= 0.05 ? 0 : hot >= 0.45 ? 1 : (hot - 0.05) / 0.4; e7 = e7 * e7 * (3 - 2 * e7);
var fr = 4.4 * Math.pow(hot, 0.6), fg = 2.7 * Math.pow(hot, 1.5), fb = 1.1 * Math.pow(hot, 3);
RK.pC[3 * i] = 0.075 + (fr - 0.075) * e7; RK.pC[3 * i + 1] = 0.068 + (fg - 0.068) * e7; RK.pC[3 * i + 2] = 0.062 + (fb - 0.062) * e7; RK.pE[i] = e7;
RK.pA[i] = RK.palpha[i] * Math.min(1, u * 25) * Math.pow(1 - u, 1.1);
continue;
}
if (kd === 4) { RK.pv[3 * i + 2] -= 9.81 * dt; if (RK.pw[3 * i + 2] < 0.3) { RK.plife[i] = 0; continue; } }
RK.pv[3 * i] = RK.pv[3 * i] * k + wind[0] * (1 - k); RK.pv[3 * i + 1] = RK.pv[3 * i + 1] * k + wind[1] * (1 - k); if (kd !== 4) RK.pv[3 * i + 2] = RK.pv[3 * i + 2] * k + (kd === 2 ? 1.5 : kd === 5 ? 6.0 : kd === 10 ? 1.3 : 0.25) * (1 - k);
RK.pw[3 * i] += RK.pv[3 * i] * dt; RK.pw[3 * i + 1] += RK.pv[3 * i + 1] * dt; RK.pw[3 * i + 2] += RK.pv[3 * i + 2] * dt;
if (RK.pw[3 * i + 2] < 0.5 && kd !== 3 && kd !== 4) { RK.pw[3 * i + 2] = 0.5; RK.pv[3 * i + 2] = Math.abs(RK.pv[3 * i + 2]) * 0.2; }
RK.ppos[3 * i] = RK.pw[3 * i] - FOC.x; RK.ppos[3 * i + 1] = RK.pw[3 * i + 2] - FOC.z; RK.ppos[3 * i + 2] = -(RK.pw[3 * i + 1] - FOC.y);
RK.pSize[i] = RK.psz[2 * i] + (RK.psz[2 * i + 1] - RK.psz[2 * i]) * Math.pow(u, kd === 2 || kd === 10 ? 0.4 : 0.6);
var grow = kd === 0 || kd === 2 || kd === 5 || kd === 10 ? Math.pow(Math.max(1, RK.pSize[i] / Math.max(0.3, RK.psz[2 * i])), kd === 2 ? -0.5 : kd === 10 ? -0.3 : -0.75) : 1;
RK.pA[i] = RK.palpha[i] * Math.min(1, u * 12) * Math.pow(1 - u, kd === 0 || kd === 2 || kd === 5 || kd === 10 ? 0.8 : 1.4) * grow; RK.pE[i] = kd === 1 || (kd === 4 && RK.pcol[3 * i] > 1.5) ? 1 : kd === 4 && RK.pcol[3 * i] > 0.75 ? 0.55 : 0;
RK.pC[3 * i] = RK.pcol[3 * i]; RK.pC[3 * i + 1] = RK.pcol[3 * i + 1]; RK.pC[3 * i + 2] = RK.pcol[3 * i + 2];
}
var gg = RK.points.geometry; gg.attributes.position.needsUpdate = true; gg.attributes.aSize.needsUpdate = true; gg.attributes.aA.needsUpdate = true; gg.attributes.aC.needsUpdate = true; gg.attributes.aE.needsUpdate = true;
}
function particlesClear() { for (var i = 0; i < PN; i++) RK.plife[i] = 0; }
function rocketFeed(stream) {
rocketItems(stream).forEach(function (it) {
var d = it.data, key = (it.node || '') + '|' + it.t + '|' + it.channel + '|' + d.ep + '|' + (d.seq == null ? '' : d.seq) + '|' + (d.clock == null ? '' : d.clock);
if (RK.seen && RK.seen[key]) return; (RK.seen = RK.seen || {})[key] = 1;
if (d.fields) rkIdx(d.fields);
var id = (d.kind || 'mission') + ':' + d.ep, E = RK.eps[id];
var made = typeof it.t === 'number' && it.t > 1e9 ? it.t : Date.now() / 1000, got = Date.now() / 1000;
RK.skewMin = Math.min(RK.skewMin == null ? 1e9 : RK.skewMin, got - made);
var late = got - made - (Math.abs(RK.skewMin) > 5 ? RK.skewMin : 0);
if (late >= 0 && late < 30) RK.latHi = Math.max(RK.latHi || 0, late);
if (!E) { E = RK.eps[id] = { id: id, kind: d.kind || 'mission', ep: d.ep, frames: [], chunks: {}, s2: [], meta: {}, done: false, at: made }; RK.order.push(id); }
['ship', 'pad', 'meco_t', 'sep_t', 'handover_t', 'label', 'result', 'warp', 'phase', 'status', 'wind', 'sea', 'deck', 'deck_z', 'mission', 'clock'].forEach(function (k) { if (d[k] !== undefined) E.meta[k] = d[k]; });
E.meta.alt_km = d.alt_km; E.at = Math.max(E.at || 0, made);
var lastT = d.frames && d.frames.length ? d.frames[d.frames.length - 1][0] : (typeof d.clock === 'number' ? d.clock : null);
if (lastT != null && (!E.sync || made >= E.sync.at)) E.sync = { at: made, t: lastT };
if (d.last) E.doneAt = made;
if (d.frames && d.frames.length) {
if (E.kind === 'training') { E.chunks[d.seq || 0] = d.frames; }
else { var last = E.frames.length ? E.frames[E.frames.length - 1][0] : -1e9; d.frames.forEach(function (f) { if (f[0] > last + 1e-6) { E.frames.push(f); last = f[0]; } }); }
}
if (d.s2 && d.s2.length) { var l2 = E.s2.length ? E.s2[E.s2.length - 1][0] : -1e9; d.s2.forEach(function (f) { if (f[0] > l2 + 1e-6) { E.s2.push(f); l2 = f[0]; } }); }
if (d.last) E.done = true;
if (E.kind === 'training' && E.done) { var ks = Object.keys(E.chunks).map(Number).sort(function (a, b) { return a - b; }); E.frames = []; ks.forEach(function (k) { E.frames = E.frames.concat(E.chunks[k]); }); }
});
var ids = RK.order;
if (ids.length > 40) { ids.slice(0, ids.length - 40).forEach(function (k) { delete RK.eps[k]; }); RK.order = ids.slice(-40); }
}
function frameLerp(F, t, out) {
var lo = 0, hi = F.length - 1;
if (t <= F[0][0]) { copyRow(F[0], out); return out; }
if (t >= F[hi][0]) { copyRow(F[hi], out); return out; }
while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (F[mid][0] <= t) lo = mid; else hi = mid; }
var a = F[lo], b = F[hi], k = (t - a[0]) / Math.max(1e-9, b[0] - a[0]);
for (var i = 0; i < a.length; i++) out[i] = a[i] + (b[i] - a[i]) * k;
var e = RF.engines; if (e != null) out[e] = k < 0.5 ? a[e] : b[e];
return out;
}
function copyRow(a, out) { for (var i = 0; i < a.length; i++) out[i] = a[i]; return out; }
var AUD = { on: true, voice: true, ctx: null, nodes: null, last: {}, said: {}, voiceObj: null, sayEp: null };
el.__view3d.aud = AUD;
var rkBar = document.createElement('span'); rkBar.style.cssText = 'display:none;gap:6px;flex-wrap:wrap';
var RK_CAMS = [['director', 'Director', 'The camera cuts by itself through the flight, like a launch broadcast (a drag takes over)'], ['booster', 'Booster', 'Orbit the booster as it flies (drag to turn around it, wheel to zoom)'], ['s2', '2nd stage', 'Orbit the second stage'], ['ship', 'Ship', 'Orbit the drone ship'], ['pad', 'Pad', 'Orbit the launch pad'],
['track', 'Tracking', 'A long-lens camera on the ground follows the booster'], ['free', 'Free', 'The camera stays where you leave it (drag, wheel, right-drag to pan, 3D mouse)']];
var RK_ONB = [['onboard: interstage', 'Onboard: interstage'], ['onboard: engines', 'Onboard: engines'], ['onboard: grid fin', 'Onboard: grid fin'], ['second stage', 'Onboard: second stage'], ['drone ship deck', 'Drone ship deck']];
var rkCamSel = document.createElement('select'); rkCamSel.title = 'The camera: orbiting ones you can turn with the mouse, the broadcast director, the tracking camera and the onboard cameras';
rkCamSel.style.cssText = 'background:#1b2029;color:#e8ecf2;border:1px solid #2a303b;border-radius:6px;font-size:12px;padding:1px 4px';
rkCamSel.innerHTML = '<optgroup label="Cameras">' + RK_CAMS.map(function (c) { return '<option value="' + c[0] + '" title="' + esc(c[2]) + '">' + esc(c[1]) + '</option>'; }).join('') + '</optgroup>'
+ '<optgroup label="Onboard">' + RK_ONB.map(function (c) { return '<option value="' + c[0] + '">' + esc(c[1]) + '</option>'; }).join('') + '</optgroup>';
rkCamSel.onchange = function () { rkSetCam(rkCamSel.value); };
rkBar.appendChild(rkCamSel);
barEl.insertBefore(rkBar, $('.cam'));
[['on', '🔊 Sound', 'Sound effects on or off (they need air: none in space)'], ['voice', '🎙 Commentary', 'The spoken commentary on or off']].forEach(function (c) {
var b = document.createElement('button'); b.textContent = c[1]; b.title = c[2]; b.style.cssText = 'all:unset;cursor:pointer;padding:2px 8px;border:1px solid #2a303b;border-radius:6px;margin-left:6px';
var paint = function () { b.style.background = AUD[c[0]] ? '#3a4dd8' : ''; b.style.opacity = AUD[c[0]] ? '1' : '0.6'; };
b.onclick = function () { audUnlock(); AUD[c[0]] = !AUD[c[0]]; if (c[0] === 'voice' && !AUD.voice && window.speechSynthesis) try { window.speechSynthesis.cancel(); } catch (e) { } paint(); keepView(true); };
paint(); rkBar.appendChild(b); RK['btn_' + c[0]] = paint; });
var voiceSel = document.createElement('select'); voiceSel.title = 'The commentator\'s voice (Edge offers the most natural ones)';
voiceSel.style.cssText = 'background:#1b2029;color:#e8ecf2;border:1px solid #2a303b;border-radius:6px;font-size:12px;max-width:190px;margin-left:4px';
function fillVoices() {
var S = window.speechSynthesis, vs = S ? rankVoices(S.getVoices() || []) : []; if (!vs.length) { voiceSel.style.display = 'none'; return; }
voiceSel.style.display = ''; voiceSel.innerHTML = vs.map(function (v) { return '<option>' + esc(v.name) + '</option>'; }).join('');
voiceSel.value = AUD.voiceName && vs.some(function (v) { return v.name === AUD.voiceName; }) ? AUD.voiceName : vs[0].name;
}
voiceSel.onchange = function () { AUD.voiceName = voiceSel.value; AUD.voiceObj = undefined; audUnlock(); keepView(true); say('This is the voice of your flight commentary.', true); };
rkBar.appendChild(voiceSel); fillVoices();
if (window.speechSynthesis) try { window.speechSynthesis.addEventListener('voiceschanged', fillVoices); } catch (e) { }
var rkBanner = document.createElement('div');
rkBanner.style.cssText = 'position:absolute;left:50%;top:22%;transform:translate(-50%,-50%);font:700 30px/1.1 Inter,-apple-system,Segoe UI,sans-serif;letter-spacing:2px;padding:12px 26px;border-radius:14px;background:rgba(10,14,22,.55);backdrop-filter:blur(6px);display:none;text-align:center';
ui.appendChild(rkBanner);
var rkCamUi = document.createElement('div');
rkCamUi.style.cssText = 'position:absolute;inset:0;pointer-events:none;display:none';
rkCamUi.innerHTML = '<div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 55%,rgba(0,0,0,.55) 100%)"></div><canvas class="rkn" width="480" height="270" style="position:absolute;inset:0;width:100%;height:100%;opacity:.055"></canvas>'
+ '<div class="rkg" style="position:absolute;inset:0;display:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.05) 0 2px,rgba(0,0,0,.25) 2px 5px)"></div>'
+ '<div style="position:absolute;left:12px;top:10px;font:600 12px ui-monospace,Menlo,monospace;color:#f3f5f7;text-shadow:0 1px 2px #000;letter-spacing:1px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff3b3b;margin-right:6px"></span><span class="rkl"></span></div>'
+ '<div class="rkc" style="position:absolute;right:12px;top:46px;font:600 12px ui-monospace,Menlo,monospace;color:#f3f5f7;text-shadow:0 1px 2px #000"></div>'
+ '<div class="rkd" style="position:absolute;inset:0;display:none;align-items:center;justify-content:center;font:700 22px ui-monospace,Menlo,monospace;letter-spacing:4px;color:#f3f5f7;text-shadow:0 2px 6px #000;background:rgba(20,22,26,.55)">SIGNAL LOST</div>'
+ '<div class="rkx" style="position:absolute;left:12px;bottom:10px;font:600 11.5px ui-monospace,Menlo,monospace;color:#f3f5f7;text-shadow:0 1px 2px #000;opacity:.9"></div>';
ui.appendChild(rkCamUi);
var ONB_NAME = { 'onboard: interstage': 'BOOSTER · INTERSTAGE', 'onboard: engines': 'BOOSTER · ENGINES', 'onboard: grid fin': 'BOOSTER · GRID FIN', 'second stage': 'SECOND STAGE', 'drone ship deck': 'DRONE SHIP · DECK', 'tracking (ground)': 'TRACKING' };
function enterRocket() {
stopLive(); clearEntities(); runs = []; runSel.style.display = 'none'; modeBtn.style.display = 'none'; $('.cam').style.display = 'none'; $('.fit').style.display = 'none'; tl.style.display = 'none';
mode = 'rocket'; shownKey = 'rocket'; RK.on = true;
rkBuild(); RK.root.visible = true;
ground.visible = false; grid.visible = false; grid10.visible = false; windLines.visible = false; trailGroup.visible = false;
if (sky) { scene.remove(sky); sky = null; }
scene.fog = null; scene.background = new THREE.Color(0x000000);
var env = new THREE.Scene(), s2 = new A.Sky(); s2.scale.setScalar(3000); s2.material.uniforms.sunPosition.value.copy(RK.sunW); s2.material.uniforms.rayleigh.value = 1.4; s2.material.uniforms.turbidity.value = 4; env.add(s2);
scene.environment = pmrem.fromScene(env).texture; scene.environmentIntensity = 0.85;
sun.color.set(0xfff1dc); sun.intensity = 3.0; hemi.intensity = 0.35; hemi.color.set(0xcfe2ff); hemi.groundColor.set(0x0c2a40);
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
renderer.toneMappingExposure = 0.6;
controls.maxPolarAngle = Math.PI; controls.minDistance = 2; controls.maxDistance = 4.0e7; controls.enablePan = true;
camera.near = 0.3; camera.far = 1.2e8; camera.updateProjectionMatrix();
if (!renderer.capabilities.logarithmicDepthBuffer) { camera.near = 1.0; camera.far = 3.0e6; camera.updateProjectionMatrix(); }
if (quality !== 'fast') {
composer = new A.EffectComposer(renderer); composer.addPass(new A.RenderPass(scene, camera));
composer.addPass(cleanPass()); RK.bloom = new A.UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.4, 4.5); composer.addPass(RK.bloom); composer.addPass(new A.OutputPass()); composer.addPass(fxaaPass()); resize();
}
if (ONBOARD) { barEl.style.display = 'none'; ui.querySelector('.hud').style.display = 'none'; numEl.style.display = 'none'; evEl.style.display = 'none'; ctlEl.style.display = 'none'; rkCamUi.style.display = ''; rkCamUi.querySelector('.rkl').textContent = ONB_NAME[ONBOARD] || ONBOARD.toUpperCase(); controls.enabled = false; }
else { barEl.style.display = 'flex'; rkBar.style.display = 'inline-flex'; rkSetCam((ctx.state && ctx.state.rkcam) || 'director', true); }
renderer.domElement.addEventListener('pointerdown', function () { if (RK.cam === 'director' && !ONBOARD) { var f = RK.shotFocus || 'booster'; rkSetCam(f === 'pad' || f === 'ship' || f === 's2' ? f : 'booster', true); RK.camReset = false; controls.enabled = true; camera.fov = 45; camera.updateProjectionMatrix(); } });
RK.camReset = true;
}
function cleanPass() {
var mat = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null } }, depthTest: false, depthWrite: false,
vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv;\n'
+ 'void main(){ vec4 c = texture2D(tDiffuse, vUv); bvec4 bad = notEqual(c, c); c = mix(c, vec4(0.0, 0.0, 0.0, 1.0), vec4(bad));'
+ ' c.rgb = clamp(c.rgb, vec3(0.0), vec3(64.0)); c.a = clamp(c.a, 0.0, 1.0); gl_FragColor = c; }' });
var quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); quad.frustumCulled = false;
return { enabled: true, needsSwap: true, clear: false, renderToScreen: false, setSize: function () { },
render: function (r, write, read) { mat.uniforms.tDiffuse.value = read.texture; r.setRenderTarget(this.renderToScreen ? null : write); r.render(quad, cam); },
dispose: function () { mat.dispose(); quad.geometry.dispose(); } };
}
function fxaaPass() {
var mat = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1 / 1024, 1 / 768) } }, depthTest: false, depthWrite: false,
vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
fragmentShader: 'uniform sampler2D tDiffuse; uniform vec2 uRes; varying vec2 vUv;\n'
+ 'void main(){ vec3 nw = texture2D(tDiffuse, vUv + vec2(-1.0, -1.0) * uRes).rgb, ne = texture2D(tDiffuse, vUv + vec2(1.0, -1.0) * uRes).rgb;'
+ ' vec3 sw = texture2D(tDiffuse, vUv + vec2(-1.0, 1.0) * uRes).rgb, se = texture2D(tDiffuse, vUv + vec2(1.0, 1.0) * uRes).rgb, m = texture2D(tDiffuse, vUv).rgb;'
+ ' vec3 L = vec3(0.299, 0.587, 0.114); float lnw = dot(nw, L), lne = dot(ne, L), lsw = dot(sw, L), lse = dot(se, L), lm = dot(m, L);'
+ ' float lmin = min(lm, min(min(lnw, lne), min(lsw, lse))), lmax = max(lm, max(max(lnw, lne), max(lsw, lse)));'
+ ' vec2 dir = vec2(-((lnw + lne) - (lsw + lse)), (lnw + lsw) - (lne + lse));'
+ ' float red = max((lnw + lne + lsw + lse) * 0.03125, 0.0078125); float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + red);'
+ ' dir = clamp(dir * rcp, vec2(-8.0), vec2(8.0)) * uRes;'
+ ' vec3 a = 0.5 * (texture2D(tDiffuse, vUv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(tDiffuse, vUv + dir * (2.0 / 3.0 - 0.5)).rgb);'
+ ' vec3 b = a * 0.5 + 0.25 * (texture2D(tDiffuse, vUv - dir * 0.5).rgb + texture2D(tDiffuse, vUv + dir * 0.5).rgb);'
+ ' float lb = dot(b, L); gl_FragColor = vec4((lb < lmin || lb > lmax) ? a : b, 1.0); }' });
var quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); quad.frustumCulled = false;
return { enabled: true, needsSwap: true, clear: false, renderToScreen: false,
setSize: function (w, h) { mat.uniforms.uRes.value.set(1 / Math.max(1, w), 1 / Math.max(1, h)); },
render: function (r, write, read) { mat.uniforms.tDiffuse.value = read.texture; r.setRenderTarget(this.renderToScreen ? null : write); r.render(quad, cam); },
dispose: function () { mat.dispose(); quad.geometry.dispose(); } };
}
function rkSetCam(c, quiet) {
var onb = !ONB_FIXED && RK_ONB.some(function (o) { return o[0] === c; });
if (ONB_FIXED) onb = false;
if (!ONB_FIXED) { ONBOARD = onb ? c : ''; rkCamUi.style.display = onb ? '' : 'none'; if (onb) { rkCamUi.querySelector('.rkl').textContent = ONB_NAME[c] || c.toUpperCase(); rkCamUi.querySelector('.rkc').textContent = ''; rkCamUi.querySelector('.rkx').textContent = ''; } }
var prev = RK.cam; RK.cam = c; RK.camSet = true;
if (rkCamSel.value !== c) rkCamSel.value = c;
controls.enabled = c !== 'track' && c !== 'director' && !onb;
if (c !== 'director' && !onb) { camera.fov = 45; camera.updateProjectionMatrix(); }
if (!ONB_FIXED && c === 'track') { rkCamUi.style.display = ''; rkCamUi.querySelector('.rkl').textContent = 'TRACKING'; rkCamUi.querySelector('.rkc').textContent = ''; rkCamUi.querySelector('.rkx').textContent = ''; }
if (!onb && prev && RK_ONB.some(function (o) { return o[0] === prev; })) camera.up.set(0, 1, 0);
RK.camReset = c !== prev || !quiet;
if (!quiet) keepView(true);
}
var ROW = [], ROW2 = [];
function rkPick() {
var ids = RK.order, mission = null, train = null;
for (var i = ids.length - 1; i >= 0; i--) { var E = RK.eps[ids[i]]; if (!E) continue; if (!mission && E.kind !== 'training') mission = E; if (!train && E.kind === 'training' && E.done && E.frames.length > 1) train = E; }
if (mission && (mission.kind === 'mission' || mission.kind === 'idle')) return mission;
return train;
}
var SYNC_LAG = 3.0;
function rkNow() { var sk = RK.skewMin == null ? 0 : RK.skewMin; return Date.now() / 1000 - (Math.abs(sk) > 5 ? sk : 0); }
function rkLen(E) { var F = E.frames; return F[F.length - 1][0] - F[0][0] + (E.meta.result && !E.meta.result.landed ? 11.0 : 4.0); }
function rkSchedule(now) {
var list = RK.order.map(function (k) { return RK.eps[k]; }).filter(function (E) { return E && E.kind === 'training' && E.done && E.frames.length > 1; })
.sort(function (a, b) { return (a.doneAt || a.at) - (b.doneAt || b.at); });
var cur = null, start = 0, i = 0;
while (i < list.length) {
var free = cur ? start + rkLen(cur) : -1e18, j = i, pick = -1;
for (; j < list.length && (list[j].doneAt || list[j].at) + SYNC_LAG <= free; j++) pick = j;
if (pick < 0) pick = i;
var s0 = Math.max((list[pick].doneAt || list[pick].at) + SYNC_LAG, free);
if (s0 > now) break;
cur = list[pick]; start = s0; i = pick + 1;
}
return cur ? { E: cur, ct: cur.frames[0][0] + (now - start) } : null;
}
function rkSwitch(E) {
RK.cur = E; ctx.status(''); RK.af = null; rkBoomsClear(); RK.soot = 0; RK.bannerShown = false; particlesClear(); RK.splashT = 0; RK.scorched = false; rkScorch(0);
}
function rkStep(dt) {
if (!RK.held && RK.seek == null) {
var now = rkNow(), ids = RK.order, M = null;
for (var k = ids.length - 1; k >= 0; k--) { var X = RK.eps[ids[k]]; if (X && X.kind !== 'training') { M = X; break; } }
var E2 = null, ct2 = null;
var stopped = M && !M.done && !ctx.sample && !liveRun() && M.frames.length;
if (!stopped) { if (RK.frozen) ctx.status(''); RK.stopId = null; RK.frozen = null; }
else if (RK.frozen === M.id) return;
if (M) {
E2 = M; var w = +M.meta.warp || 1;
if (stopped) {
if (RK.stopId !== M.id) { RK.stopId = M.id; RK.stopT = RK.cur === M && RK.ct != null ? RK.ct : M.frames[M.frames.length - 1][0]; }
ct2 = Math.min(RK.stopT, M.frames[M.frames.length - 1][0]);
if (RK.cur === M) {
RK.frozen = M.id;
try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { }
var ss = Math.max(0, Math.round(ct2));
ctx.status('The run ' + (ctx.run && ctx.run.status === 'failed' ? 'ended with an error' : 'was stopped') + ' at T+' + String(Math.floor(ss / 60)).padStart(2, '0') + ':' + String(ss % 60).padStart(2, '0') + ': the view holds that moment. Run the blueprint to fly again.');
}
} else if (M.sync) {
var el = RK.ptAt == null ? 0 : Math.min(1, Math.max(0, now - RK.ptAt)); RK.ptAt = now;
RK.latHi = Math.max(0, (RK.latHi || 0) - el * 0.03);
var lagNow = Math.min(12, Math.max(SYNC_LAG, (RK.latHi || 0) + 1.2));
var tgt = M.sync.t + (now - M.sync.at - lagNow) * w, newest = M.frames.length ? M.frames[M.frames.length - 1][0] : tgt;
if (RK.ptId !== M.id || RK.pt == null || Math.abs(tgt - RK.pt) > 12 * w || !dt || !el) { RK.ptId = M.id; RK.pt = tgt; }
else {
var rate = Math.min(1.5, Math.max(0.5, 1 + 0.5 * (tgt - RK.pt) / w)), room = newest - RK.pt;
if (room < w) rate *= Math.max(0.25, room / w);   // nearly out of frames: slow down instead of stopping dead
RK.pt = Math.min(newest, RK.pt + el * w * rate);
}
ct2 = Math.min(RK.pt, newest);
}
} else { var sc = rkSchedule(now); if (sc) { E2 = sc.E; ct2 = sc.ct; } }
if (E2 !== RK.cur) rkSwitch(E2);
RK.ct = ct2;
if (!E2) { rkPose(null, dt); return; }
if (!E2.frames.length || ct2 == null || (ct2 < 0 && E2.kind !== 'training')) { rkPose(E2, dt); return; }
frameLerp(E2.frames, ct2, ROW); rkPose(E2, dt, ROW);
return;
}
var E = RK.cur, want = rkPick();
if (want && want !== E) {
var cur = RK.cur, curDone = !cur || cur.kind !== 'training' || (RK.ct != null && cur.frames.length && RK.ct >= cur.frames[cur.frames.length - 1][0] + (cur.meta.result && !(cur.meta.result.landed) ? 11.0 : 4.0));
if (want.kind !== 'training' || curDone) { RK.cur = E = want; RK.ct = null; ctx.status(''); RK.af = null; rkBoomsClear(); RK.soot = 0; RK.bannerShown = false; particlesClear(); RK.splashT = 0; RK.scorched = false; rkScorch(0); }
}
if (!E) { rkPose(null, dt); return; }
var F = E.frames, warp = +E.meta.warp || 1, now = performance.now() / 1000;
if (E.kind === 'training') {
if (RK.ct == null) RK.ct = F[0][0];
if (RK.seek != null) { RK.ct = F[0][0] + RK.seek; RK.seek = null; RK.held = true; }
if (playing && !RK.hold) RK.ct += dt * speed;
} else if (!F.length) {
RK.ct = typeof E.meta.clock === 'number' ? E.meta.clock : null;
} else {
var newest = F[F.length - 1][0], lag = 2.2 * warp;
if (RK.seek != null) { RK.ct = RK.seek; RK.seek = null; RK.held = true; }
if (RK.ct == null || RK.ct < 0) RK.ct = Math.max(F[0][0], newest - lag);
if (!RK.hold) RK.ct += dt * (RK.warpOverride || warp);
if (!RK.held && RK.ct < newest - lag - 5 * warp) RK.ct = newest - lag;
if (RK.ct > newest) RK.ct = newest;
}
if (!F.length) { rkPose(E, dt); return; }
frameLerp(F, RK.ct, ROW);
rkPose(E, dt, ROW);
}
var RK_EU = new THREE.Euler(), RK_QA = new THREE.Quaternion(), RK_QB = new THREE.Quaternion();
var QV = new THREE.Quaternion(), V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), V3_ = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0);
function cgOf(prop) { var m = RK_DRY + Math.max(0, prop); return (RK_DRY * 15 + Math.max(0, prop) * 11) / m; }
function rkPose(E, dt, r) {
var t = RK.ct, kind = E ? E.kind : 'idle', meta = E ? E.meta : {};
var ship = meta.ship || [kind === 'training' ? 0 : 640000, 0], pad = meta.pad || [0, 0], training = kind === 'training';
RK.padXY = pad;
var g = function (k, d) { var i = RF[k]; return r && i != null ? r[i] : d; };
var onPad = !r || (t != null && t < 0);
var bx, by, bz, qx = 0, qy = 0, qz = 0, qw = 1;
if (onPad) { bx = pad[0]; by = pad[1]; bz = 10 + cgOf(400000); }
else { bx = g('x', 0); by = g('y', 0); bz = g('z', 0); qx = g('qx', 0); qy = g('qy', 0); qz = g('qz', 0); qw = g('qw', 1); }
QV.set(qx, qz, -qy, qw).normalize();
var bAxis = V1.set(0, 1, 0).applyQuaternion(QV);
var prop = onPad ? 400000 : g('prop', 8000), cg = cgOf(prop);
var ex = bx - bAxis.x * cg, ey = by + bAxis.z * cg, ez = bz - bAxis.y * cg;
var engines = onPad ? 0 : g('engines', 0), thrust = onPad ? 0 : g('thrust', 0), legs = g('legs', 0), fins = g('fins', 0), q = g('q', 0), mach = g('mach', 0), heat = g('heat', 0);
if (onPad && t != null && t > -3) { engines = 9; thrust = 9 * Math.min(1, (t + 3) / 2.5); }     // the engines start while held down
var heave = g('heave', 0), pitch = g('pitch', 0), roll = g('roll', 0);
var dZ = meta.deck_z != null ? +meta.deck_z : 2.5;
var SC = RK.sc || (RK.sc = { t: 0, seen: null });
if (t != null && t !== SC.seen) { SC.seen = t; SC.t = t; } else SC.t += Math.min(0.1, dt || 0);
var dkm = meta.deck, tD = SC.t;
if (dkm && dkm.length === 9) { heave = dkm[0] * Math.sin(dkm[1] * tD + dkm[2]); pitch = dkm[3] * Math.sin(dkm[4] * tD + dkm[5]); roll = dkm[6] * Math.sin(dkm[7] * tD + dkm[8]); }
else if (!r || onPad) { heave = 0.7 * Math.sin(0.68 * tD); pitch = 0.016 * Math.sin(0.83 * tD + 1.1); roll = 0.03 * Math.sin(0.57 * tD + 2.3); }
var AF = rkAfter(E, t, r, dZ + heave);
if (AF) {
engines = 0; thrust = 0;
if (!AF.landed) { ex = AF.ex; ey = AF.ey; ez = AF.ez; QV.copy(AF.q); bAxis.set(0, 1, 0).applyQuaternion(QV); heat = 0; }
}
RK.booster.scale.set(1, AF && !AF.landed ? 1 - AF.crumple : 1, 1);
if (AF && AF.landed && E && E.frames.length && t != null && dkm && dkm.length === 9) {
var tLast = E.frames[E.frames.length - 1][0];
if (t >= tLast - 1e-3 && tD > tLast) {
var deckQ = function (tq, o) { return o.setFromEuler(RK_EU.set(dkm[6] * Math.sin(dkm[7] * tq + dkm[8]), 0, -dkm[3] * Math.sin(dkm[4] * tq + dkm[5]), 'XZY')); };
var hL = dkm[0] * Math.sin(dkm[1] * tLast + dkm[2]);
deckQ(tLast, RK_QA).invert(); deckQ(tD, RK_QB).multiply(RK_QA);
V2.set(ex - ship[0], ez - (dZ + hL), -(ey - ship[1])).applyQuaternion(RK_QB);
ex = ship[0] + V2.x; ez = dZ + heave + V2.y; ey = ship[1] - V2.z;
QV.premultiply(RK_QB); bAxis.set(0, 1, 0).applyQuaternion(QV);
}
}
var sepT = meta.sep_t != null ? meta.sep_t : 1e9, attached = !training && (onPad || t < sepT);
var alt = ez;
var s2r = null, s2w = null;
var tS2 = t != null && E && E.done && E.frames.length && t >= E.frames[E.frames.length - 1][0] - 1e-3 && SC ? Math.max(t, SC.t) : t;
if (E && E.s2 && E.s2.length && t != null && t >= sepT - 0.05 && tS2 <= s2End(E) && !training && E.frames.length && E.frames[E.frames.length - 1][0] >= sepT) {
s2r = s2At(E, tS2, ROW2);
if (!E.s2off) {
var c0 = rowExit(frameLerp(E.frames, sepT, [])), r0 = frameLerp(E.s2, sepT, []), bw = c0.bw;
E.s2off = [c0.x + bw[0] * 44.2 - r0[1], c0.y + bw[1] * 44.2 - r0[2], c0.z + bw[2] * 44.2 - r0[3]];
}
RK.s2off = E.s2off;
s2w = [s2r[1] + E.s2off[0], s2r[2] + E.s2off[1], s2r[3] + E.s2off[2]];
}
var focus;
var shipZ = dZ + heave;
var cam = ONBOARD ? 'onboard' : RK.cam, shot = null;
var s2ax = s2r ? new THREE.Vector3(s2r[4], s2r[6], -s2r[5]).normalize() : null;
if (cam === 'director') { shot = rkShot(E, t, alt, ex, ey, ez, bAxis, ship, shipZ, pad, s2w, s2ax, training); cam = shot.focus; if (cam === 's2' && !s2w) cam = 'booster'; }
if (ONBOARD === 'second stage' && s2r) cam = 'onboard-s2';
if (cam === 's2' && !s2r) cam = 'booster';
if (cam === 'booster' || cam === 'onboard' || cam === 'track') focus = [ex + bAxis.x * 22, ey - bAxis.z * 22, ez + bAxis.y * 22];
else if (cam === 's2' || cam === 'onboard-s2') focus = s2w.slice();
else if (cam === 'ship') focus = [ship[0], ship[1], shipZ];
else if (cam === 'pad') focus = [pad[0], pad[1], 30];
else focus = RK.freeFocus || [ex, ey, ez];
if (cam === 'free') { if (!RK.freeFocus) RK.freeFocus = [FOC.x, FOC.y, FOC.z]; focus = RK.freeFocus; } else RK.freeFocus = null;
var shift = [focus[0] - FOC.x, focus[1] - FOC.y, focus[2] - FOC.z];
FOC.x = focus[0]; FOC.y = focus[1]; FOC.z = focus[2];
if (shot) { RK.camReset = false; rkApplyShot(shot, dt); }
else if (RK.camReset) {
RK.camReset = false; controls.target.set(0, 0, 0);
var d0 = cam === 'ship' ? 170 : cam === 'pad' ? 320 : cam === 's2' ? 70 : 90;
camera.position.set(d0 * 0.75, d0 * 0.32, d0 * 0.62);
if (cam === 'booster' && alt < 200 && !onPad) camera.position.set(60, 10, 60);
if (cam === 'free') camera.position.add(new THREE.Vector3(0, 0, 0));
} else if (cam === 'free') {
}
if (cam !== 'free' && cam !== 'track' && !ONBOARD && !shot) controls.target.set(0, 0, 0);
var dropB = dropAt(ex, ey);
W(ex, ey, ez - dropB, RK.booster.position); RK.booster.quaternion.copy(QV); RK.booster.visible = !(RK.af && RK.af.sea && RK.af.sink >= 52);
RK.stack.visible = attached;
var fv = [g('fx', 0), g('fy', 0), g('fz', 0)];
RK.fins.forEach(function (f, i) {
f.hinge.rotation.z = 0; f.tilt.rotation.set(0, 0, (1 - fins) * Math.PI / 2);
var tw = new THREE.Vector3(-Math.sin(f.az), 0, -Math.cos(f.az));
var defl = (fv[0] * tw.x + fv[1] * -tw.z + fv[2] * 0) * 1.2;
f.fin.rotation.x = Math.max(-0.6, Math.min(0.6, defl)) * fins;
});
RK.legs.forEach(function (L) { rkLegPose(L, legs * RK_LEG_ANG); });
var halves = RK.s2.userData.halves || [];
halves.forEach(function (hg, k) {
var tau = t != null ? t - ((meta.sep_t || 1e9) + 50) : -1;
if (tau <= 0) { hg.position.set(0, 14.5, 0); hg.rotation.set(0, 0, 0); hg.visible = true; return; }
var sg = k ? -1 : 1; hg.visible = tau < 40;
var open = Math.min(0.55, 0.32 * tau) + 0.035 * tau;
hg.position.set(sg * (2.4 * tau + 0.04 * tau * tau), 14.5 - 4.8 * tau * tau, 0); hg.rotation.set(0.04 * tau * (k ? -1 : 1), 0.03 * tau, -sg * open);
});
if (s2w) {
var sx = s2w[0], sy = s2w[1], sz = s2w[2];
RK.s2World = [sx, sy, sz];
if (sz > 70000 && s2r && t != null && t > sepT + 1) {
var a2x = [s2r[4], s2r[5], s2r[6]], al2 = Math.hypot(a2x[0], a2x[1], a2x[2]) || 1, nI2 = Math.random() < (dt * 22) % 1 ? Math.ceil(dt * 22) : Math.floor(dt * 22);
for (var k8 = 0; k8 < Math.min(5, nI2); k8++) {
var al8 = Math.random() * 6, th8 = Math.random() * Math.PI * 2, ph8 = Math.acos(2 * Math.random() - 1), sp8 = 1.5 + Math.random() * 5;
var d8 = [Math.sin(ph8) * Math.cos(th8), Math.sin(ph8) * Math.sin(th8), Math.cos(ph8)];
puff(a2x[0] / al2 * al8 + d8[0] * 1.9, a2x[1] / al2 * al8 + d8[1] * 1.9, a2x[2] / al2 * al8 + d8[2] * 1.9, d8[0] * sp8, d8[1] * sp8, d8[2] * sp8, 2.5 + Math.random() * 3, 0.05 + Math.random() * 0.07, 0.08 + Math.random() * 0.1, [1.25, 1.28, 1.35], 0.9, 8);
}
}
W(sx, sy, sz - dropAt(sx, sy), RK.s2.position);
RK.s2.quaternion.setFromUnitVectors(UPV, V2.set(s2r[4], s2r[6], -s2r[5]).normalize()); RK.s2.visible = true;
var s2lit = s2r[7] > 0.5, s2alt = sz; RK.s2LitNow = s2lit;
RK.s2plume.visible = s2lit; var su = RK.s2plume.material.uniforms; su.uI.value = s2lit ? 0.22 : 0; su.uExp.value = 1; su.uLen.value = 55; su.uR0.value = 1.5; su.uR1.value = 9;
if (E.s2ign === undefined) { E.s2ign = null; for (var si = 0; si < E.s2.length; si++) if (E.s2[si][7] > 0.5) { E.s2ign = E.s2[si][0]; break; } }
var dI = E.s2ign != null && t != null ? t - E.s2ign : -1;
if (s2lit && dI >= 0 && dI < 3) { var bl = Math.pow(1 - dI / 3, 2); su.uI.value = 0.22 + 0.5 * bl; su.uR1.value = 9 + 70 * bl; su.uLen.value = 55 - 25 * bl; if (su.uGreen) su.uGreen.value = Math.max(0, 1 - dI / 0.7); }
else if (su.uGreen) su.uGreen.value = 0;
if (dI >= 0 && dI < 1.5 && E.s2puffed !== E.s2ign) {
E.s2puffed = E.s2ign; var ax8 = [s2r[4], s2r[5], s2r[6]], an8 = Math.hypot(ax8[0], ax8[1], ax8[2]) || 1; ax8 = [ax8[0] / an8, ax8[1] / an8, ax8[2] / an8];
var p8 = Math.abs(ax8[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], u8 = [ax8[1] * p8[2] - ax8[2] * p8[1], ax8[2] * p8[0] - ax8[0] * p8[2], ax8[0] * p8[1] - ax8[1] * p8[0]], un8 = Math.hypot(u8[0], u8[1], u8[2]); u8 = [u8[0] / un8, u8[1] / un8, u8[2] / un8];
var w8 = [ax8[1] * u8[2] - ax8[2] * u8[1], ax8[2] * u8[0] - ax8[0] * u8[2], ax8[0] * u8[1] - ax8[1] * u8[0]];
for (var q8 = 0; q8 < 70; q8++) { var a8 = Math.random() * Math.PI * 2, out8 = 15 + Math.random() * 45, bk8 = -(20 + Math.random() * 60), c8 = Math.cos(a8), s8 = Math.sin(a8);
var v8 = [u8[0] * c8 * out8 + w8[0] * s8 * out8 + ax8[0] * bk8, u8[1] * c8 * out8 + w8[1] * s8 * out8 + ax8[1] * bk8, u8[2] * c8 * out8 + w8[2] * s8 * out8 + ax8[2] * bk8];
puff(-ax8[0] * 5, -ax8[1] * 5, -ax8[2] * 5, v8[0], v8[1], v8[2], 0.7 + Math.random() * 0.8, 3 + Math.random() * 2, 30 + Math.random() * 30, [0.9, 0.92, 0.95], 0.13, 8); }
} RK.s2Hot = s2lit ? Math.min(1, (RK.s2Hot || 0) + (dt || 0) * 0.5) : (RK.s2Hot || 0) * Math.exp(-(dt || 0) / 2.5); var hH = RK.s2Hot;   // warms over a couple of seconds, cools after cut-off
RK.mvacMat.emissive.setRGB(0.9, 0.22 * hH, 0.04 * hH * hH); RK.mvacMat.emissiveIntensity = 2.2 * hH * hH;
RK.s2alt = s2alt;
} else { RK.s2.visible = false; if (!s2r) RK.s2off = null; }
var showWorld = !training;
RK.pad.visible = showWorld; RK.land.visible = showWorld;
W(pad[0], pad[1], 0 - dropAt(pad[0], pad[1]), RK.pad.position);
RK.ship.visible = true;
W(ship[0], ship[1], shipZ - dropAt(ship[0], ship[1]), RK.ship.position);
RK.shipBody.rotation.set(roll, 0, -pitch, 'XZY');
if (legs > 0.99 && E && E.meta && E.meta.result && E.meta.result.on_deck && rkTouchT(E) != null && t >= rkTouchT(E) - 0.3) {
RK.booster.updateMatrixWorld(true); RK.ship.updateMatrixWorld(true);
RK.legs.forEach(function (L) {
var fp = L.foot.localToWorld(V3_.set(0.25, -0.21, 0)); RK.shipBody.worldToLocal(fp);
if (fp.y < 0 && Math.hypot(fp.x, fp.z) < 50) rkLegPose(L, RK_LEG_ANG - Math.min(0.09, -fp.y / 7.05));
});
}
W(0, 0, 0, RK.land.position); RK.land.position.y = 3 - FOC.z;
var tRel = thrust / Math.max(1, engines || 1), lit = engines > 0 && thrust > 0.02;
var pAmb = Math.exp(-Math.max(0, alt) / 7400), ex2 = 1 - pAmb, U = RK.plume.material.uniforms;
RK.plume.visible = lit;
var cluster = engines >= 9 ? 1.75 : engines >= 3 ? 1.6 : 0.55;
U.uI.value = lit ? Math.min(1.6, 0.6 + 0.6 * Math.min(1, tRel)) * (1 + 0.5 * pAmb) : 0;
U.uExp.value = ex2; U.uR0.value = cluster; U.uLen.value = (engines >= 9 ? 70 : engines >= 3 ? 44 : 34) * (0.75 + 0.45 * tRel) * (1 + ex2 * 4.5); U.uR1.value = cluster * (engines >= 3 ? 2.8 : 6.5) + ex2 * (engines >= 3 ? 75 : 35);
if (lit && engines === 3 && !attached) { var push = Math.min(1, q / 6000); U.uExp.value = 0.85 - 0.55 * push; U.uLen.value = 10 + 45 * (1 - push); U.uR1.value = 7 + 22 * (1 - push); U.uI.value = 1.8; }   // the oncoming air presses the flame back into a short bright bulb
var hDeck = alt - shipZ, overShip = Math.hypot(ex - ship[0], ey - ship[1]) < 50, onPadArea = alt < 150 && Math.hypot(ex - pad[0], ey - pad[1]) < 200;
U.uClip.value = overShip && lit ? (shipZ - FOC.z - dropAt(ship[0], ship[1]) + 0.3) : -1e9;
var jetL = U.uLen.value * 1.15 + 6, sJ = bAxis.y > 0.2 ? alt / bAxis.y : 1e9, jx = ex - bAxis.x * sJ, jy = ey + bAxis.z * sJ;
var onDeckJ = Math.abs(jx - ship[0]) < 46 && Math.abs(jy - ship[1]) < 27;
var jetK = lit && sJ < jetL && !onDeckJ ? Math.min(1, (jetL - sJ) / (0.6 * jetL)) * Math.min(1, tRel + 0.3) * Math.min(1, engines / 3 + 0.5) : 0;
if (!overShip && lit && (alt < 40 || jetK > 0)) U.uClip.value = -FOC.z + 0.3 - dropB;
var JF = RK.jf || (RK.jf = { x: 0, y: 0, r: 10, i: 0, ep: null });
if (JF.ep !== (E ? E.id : null)) { JF.ep = E ? E.id : null; JF.i = 0; JF.r = 10; }
if (jetK > 0) { JF.x = jx; JF.y = jy; JF.i = Math.min(1, JF.i + (dt || 0) * jetK * 1.5); JF.r = Math.min(70, Math.max(JF.r, 12 + 55 * jetK)); }
else { JF.i = Math.max(0, JF.i - (dt || 0) / 30); JF.r += (dt || 0) * 1.2; } // the foam spreads and fades
var jw = W(JF.x, JF.y, 0, V3_); RK.oceanU.uJet.value.set(jw.x, 0, jw.z, JF.r); RK.oceanU.uJetI.value = JF.i;
RK.jetSea = jetK > 0 ? { x: jx, y: jy, k: jetK } : null;
RK.cores.forEach(function (c, i) {
var on = lit && (engines >= 9 || (engines >= 3 && (i === 0 || i === 1 || i === 5)) || (engines >= 1 && engines < 3 && i === 0));
c.visible = on; c.material.uniforms.uI.value = on ? 0.9 + 0.5 * pAmb : 0; c.material.uniforms.uL.value = (4.5 + 3 * tRel) * (1 + 0.8 * pAmb) * (1 - ex2 * 0.5);
});
var EVS = rkEvents(E), green = 0;
if (EVS && t != null) EVS.ign.forEach(function (ig) { var d = t - ig; if (d >= 0 && d < 0.8) green = Math.max(green, 1 - d / 0.8); });
U.uGreen.value = lit ? green : 0; RK.cores.forEach(function (c) { c.material.uniforms.uGreen.value = lit ? green : 0; });
var entry = lit && engines === 3 && q > 1500;
RK.sheath.visible = entry || heat > 0.05; RK.sheath.material.uniforms.uI.value = entry ? Math.min(1, q / 12000) * 1.1 : 0; RK.sheath.material.uniforms.uPl.value = Math.min(1, heat * 0.9);
RK.vapor.visible = attached && mach > 0.85 && mach < 1.25 && alt < 15000; RK.vapor.material.uniforms.uI.value = RK.vapor.visible ? Math.sin((mach - 0.85) / 0.4 * Math.PI) : 0;
var spl = lit && overShip && hDeck < 75 && hDeck > -5;
RK.splash.visible = spl; RK.splash.position.set(ex - ship[0], 0, -(ey - ship[1])); RK.splash.material.uniforms.uI.value = spl ? Math.min(1, (60 - hDeck) / 40) * Math.min(1, tRel + 0.2) : 0; RK.splash.material.uniforms.uR.value = 6 + Math.max(0, 60 - hDeck) * 0.45;
if (E && E.entryT === undefined && E.frames.length && RF.engines != null) {
E.entryT = null; var mc0 = meta.meco_t || 0;
for (var fi = 0; fi < E.frames.length; fi++) { var fr0 = E.frames[fi]; if (fr0[0] > mc0 + 20 && fr0[RF.engines] === 3) { E.entryT = fr0[0]; break; } }
}
if (E && E.entryT === null && E.done) E.entryT = undefined;
RK.soot = training ? 0.8 : E && E.entryT != null && t != null ? Math.min(0.85, Math.max(0, (t - E.entryT) / 18) * 0.85) : 0;
var glow = Math.min(1, heat * 0.6 + (lit && engines === 3 ? 0.35 : 0));
var after = 0;
if (EVS && t != null) [meta.meco_t, EVS.entryEnd, EVS.touch].forEach(function (e, k) { if (e != null && t > e) after = Math.max(after, k === 2 ? 0.3 * Math.exp(-(t - e) / 4) : 0.4 * Math.exp(-(t - e) / 7)); });   // the nozzles stay hot for a few seconds after a burn, then go dark; on the way down the air heats them again (glow, from the flight's heating)
RK.sootMats.forEach(function (m) { if (m.userData.u) { m.userData.u.uSoot.value = RK.soot; m.userData.u.uHeat.value = glow * 0.2; } });
if (RK.nzMat) RK.nzMat.userData.u.uHeat.value = Math.max(glow, after);
RK.fire.visible = lit; RK.fire.intensity = lit ? 1600 * Math.pow(Math.min(9, thrust), 0.75) * (0.85 + 0.15 * Math.random()) * (0.3 + 0.7 * pAmb) * (onPadArea ? 0.3 : 1) : 0;
W(ex - bAxis.x * 10, ey + bAxis.z * 10, ez - bAxis.y * 10 - dropB, RK.fire.position);
var flash = rkBooms(RK.af && RK.afNow != null && t != null ? Math.max(t, RK.afNow) : t, dt);
if (flash) { RK.fire.visible = true; RK.fire.intensity = Math.max(RK.fire.intensity, flash.i); W(flash.x, flash.y, flash.z - dropAt(flash.x, flash.y), RK.fire.position); }
var wind = [g('wx', 3), g('wy', 0)];
if (dt > 0 && (t != null || onPad)) {
RK.emit += dt;
var nrm = Math.min(3, dt * 60);
if ((onPad || (t != null && t < 6)) && !training && Math.hypot(ex - pad[0], ey - pad[1]) < 300) {
var held = onPad || t < 0;
for (var vk = 0; vk < (Math.random() < 0.7 * nrm ? 1 : 0); vk++) { var va = Math.random() * Math.PI * 2, vh = Math.random() < 0.6 ? 40 + Math.random() * 3 : 57 + Math.random() * 2;
puff(pad[0] + Math.cos(va) * 2.1, pad[1] + Math.sin(va) * 2.1, vh, Math.cos(va) * 2.5 + 1.5, Math.sin(va) * 2.5, -2.5 - Math.random() * 2, 8 + Math.random() * 5, 1.2, 10 + Math.random() * 6, [0.96, 0.97, 0.98], 0.4, 9); }
if (held) for (var ek = 0; ek < (Math.random() < 0.5 * nrm ? 1 : 0); ek++) { var ea = Math.random() * Math.PI * 2;
puff(pad[0] + Math.cos(ea) * 1.6, pad[1] + Math.sin(ea) * 1.6, 10.5 + Math.random() * 1.5, Math.cos(ea) * 1.5, Math.sin(ea) * 1.5, -3 - Math.random() * 2, 6 + Math.random() * 4, 1, 7 + Math.random() * 4, [0.95, 0.96, 0.98], 0.4, 9); }
}
if (!training && t != null && t > -5 && t < 8 && Math.hypot(ex - pad[0], ey - pad[1]) < 400) {
var wk = Math.min(1, (t + 5) / 1.2) * (t > 5 ? Math.max(0, (8 - t) / 3) : 1);
for (var wj = 0; wj < 8; wj++) {
var wa = wj / 8 * Math.PI * 2 + 0.2, wx = pad[0] + Math.cos(wa) * 10.5 - 2, wy = pad[1] + Math.sin(wa) * 10.5;
for (var wd = 0; wd < (t > 0 ? 1.5 : 3) * nrm * wk; wd++) { var sp9 = 6 + Math.random() * 3, wsp = (Math.random() - 0.5) * 0.2, cw9 = Math.cos(wa + wsp), sw9 = Math.sin(wa + wsp);
puff(wx, wy, 9.4, -cw9 * sp9, -sw9 * sp9, 6 + Math.random() * 3, 1.1 + Math.random() * 0.4, 0.35, 1.0, [0.9, 0.94, 1.0], 0.9, 4); }
}
if (Math.random() < 0.8 * nrm * wk) puff(pad[0] + (Math.random() - 0.5) * 16, pad[1] + (Math.random() - 0.5) * 16, 9.5, 0, 0, 0.6 + Math.random(), 4 + Math.random() * 3, 3, 10, [0.93, 0.95, 0.98], 0.32, 2);
if (Math.random() < 0.6 * nrm * wk) puff(pad[0] + (Math.random() - 0.5) * 10, pad[1] + 20 + Math.random() * 20, 4.5, 0, 0, 0.5 + Math.random(), 4 + Math.random() * 3, 3, 9, [0.92, 0.94, 0.97], 0.3, 2);
}
if (lit && alt < 450 && Math.hypot(ex - pad[0], ey - pad[1]) < 200 && !training) {
var nC = 2.2 * nrm * (alt < 300 ? 1 : 0.5);
for (var k = 0; k < Math.floor(nC) + (Math.random() < nC % 1 ? 1 : 0); k++) { var side = Math.random() < 0.6 ? -1 : 1, a = (side > 0 ? Math.PI / 2 : -Math.PI / 2) + (Math.random() - 0.5) * 2.8, sp = 35 + Math.random() * 80;
var tan = 0.86 + Math.random() * 0.1, tc = Math.random() < 0.2 ? [0.9 * tan, 0.86 * tan, 0.8 * tan] : [0.97 * tan, 0.83 * tan, 0.62 * tan];
puff(pad[0] + (Math.random() - 0.5) * 12, pad[1] + side * (40 + Math.random() * 30), 6, Math.cos(a) * sp, Math.sin(a) * sp, 1.5 + Math.random() * 4, 100 + Math.random() * 80, 12, 120 + Math.random() * 110, tc, 0.7, 10); }
}
if (lit && alt < 32000 && !training && engines >= 9) {
var n = Math.ceil(6 * nrm), vel = [g('vx', 0), g('vy', 0), g('vz', 0)], L0 = U.uLen.value, bw2 = [bAxis.x, -bAxis.z, bAxis.y];
var p1 = Math.abs(bw2[2]) < 0.9 ? [bw2[1], -bw2[0], 0] : [1, 0, 0], p1l = Math.hypot(p1[0], p1[1], p1[2]); p1 = [p1[0] / p1l, p1[1] / p1l, p1[2] / p1l];
var p2 = [bw2[1] * p1[2] - bw2[2] * p1[1], bw2[2] * p1[0] - bw2[0] * p1[2], bw2[0] * p1[1] - bw2[1] * p1[0]];
for (var k2 = 0; k2 < n; k2++) { var back = L0 * (0.6 + Math.random() * 0.6), ra = Math.random() * Math.PI * 2, rs = (3 + Math.random() * 6) * (1 + ex2 * 4), c2 = Math.cos(ra), s2 = Math.sin(ra);
var ox = p1[0] * c2 + p2[0] * s2, oy = p1[1] * c2 + p2[1] * s2, oz = p1[2] * c2 + p2[2] * s2;
puff(ex - bAxis.x * back + ox * 2, ey + bAxis.z * back + oy * 2, ez - bAxis.y * back + oz * 2, vel[0] * 0.02 + ox * rs, vel[1] * 0.02 + oy * rs, vel[2] * 0.02 + oz * rs,
60 + Math.random() * 60, 5 + ex2 * 20, 70 + ex2 * 380, [0.9, 0.9, 0.9], 0.42 * (1 - ex2 * 0.7), 0); }
}
RK.bWorld = [ex, ey, ez];
if (lit && attached && !training && t != null && t > 0 && alt < 120) {
var fall = Math.max(0, 1 - alt / 120), bwI = [bAxis.x, -bAxis.z, bAxis.y], vI = [g('vx', 0), g('vy', 0), g('vz', 0)];
var nI = 7 * nrm * fall;
for (var ii = 0; ii < Math.floor(nI) + (Math.random() < nI % 1 ? 1 : 0); ii++) {
var hI = 6 + Math.random() * 36, aI = Math.random() * Math.PI * 2, cI = Math.cos(aI), sI = Math.sin(aI), out = 0.8 + Math.random() * 2.5, keep = 0.75 + Math.random() * 0.2;
var big = Math.random() < 0.2, szI = big ? 0.35 + Math.random() * 0.3 : 0.12 + Math.random() * 0.16;
puff(ex + bwI[0] * hI + cI * 1.9, ey + bwI[1] * hI + sI * 1.9, ez + bwI[2] * hI, vI[0] * keep + cI * out, vI[1] * keep + sI * out, vI[2] * keep - 1, 4 + Math.random() * 3, szI, szI, [1.05, 1.07, 1.1], 0.95, 4);
}
if (Math.random() < 1.6 * nrm * fall) { var hW = 8 + Math.random() * 30, aW = Math.random() * Math.PI * 2;
puff(ex + bwI[0] * hW + Math.cos(aW) * 2, ey + bwI[1] * hW + Math.sin(aW) * 2, ez + bwI[2] * hW, vI[0] * 0.8 + Math.cos(aW) * 1.5, vI[1] * 0.8 + Math.sin(aW) * 1.5, vI[2] * 0.8, 2.5 + Math.random() * 2, 1, 5 + Math.random() * 3, [0.97, 0.98, 1.0], 0.45, 0); }
}
if (alt > 70000 && !training && !attached && RK.booster.visible) {
var bw = [bAxis.x, -bAxis.z, bAxis.y], nIce = Math.random() < (dt * 30) % 1 ? Math.ceil(dt * 30) : Math.floor(dt * 30);
for (var ki = 0; ki < Math.min(6, nIce); ki++) {
var along = Math.random() < 0.45 ? Math.random() * 5 : 30 + Math.random() * 15, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), sp = 1.5 + Math.random() * 6;
var dx = Math.sin(ph) * Math.cos(th), dy = Math.sin(ph) * Math.sin(th), dz = Math.cos(ph);
puff(bw[0] * along + dx * 2, bw[1] * along + dy * 2, bw[2] * along + dz * 2, dx * sp, dy * sp, dz * sp, 2.5 + Math.random() * 3, 0.05 + Math.random() * 0.07, 0.08 + Math.random() * 0.1, [1.25, 1.28, 1.35], 0.9, 6);
}
}
rkRcsJet(Math.hypot(g('rx', 0), g('ry', 0), g('rz', 0)), [g('rx', 0), g('ry', 0), g('rz', 0)], bAxis, alt, training, dt);
if (spl) {
var near = Math.min(1, Math.max(0.15, (75 - hDeck) / 55)), hx = ex - ship[0], hy = ey - ship[1];
for (var k4 = 0; k4 < 16 * nrm * near; k4++) { var a4 = Math.random() * Math.PI * 2, s4 = 18 + Math.random() * 40, gr = Math.random();
var col4 = gr < 0.55 ? [0.82, 0.79, 0.74] : gr < 0.85 ? [0.62, 0.6, 0.58] : [0.4, 0.38, 0.37];
puff(ship[0] + hx + Math.cos(a4) * 4, ship[1] + hy + Math.sin(a4) * 4, shipZ + 1.5, Math.cos(a4) * s4, Math.sin(a4) * s4, 1 + Math.random() * 5, 8 + Math.random() * 8, 5 + Math.random() * 3, 35 + Math.random() * 35, col4, 0.5 + 0.25 * near, 2); }
}
if (RK.jetSea) {
var JS = RK.jetSea;
for (var k5 = 0; k5 < 16 * nrm * JS.k; k5++) { var a5 = Math.random() * Math.PI * 2, s5 = 10 + Math.random() * 38 * JS.k, w5 = Math.random();
puff(JS.x + Math.cos(a5) * 3, JS.y + Math.sin(a5) * 3, 1.5, Math.cos(a5) * s5, Math.sin(a5) * s5, 2 + Math.random() * 9, 8 + Math.random() * 8, 5 + Math.random() * 3, 30 + Math.random() * 30,
w5 < 0.75 ? [0.95, 0.96, 0.98] : [0.82, 0.85, 0.9], 0.45 + 0.35 * JS.k, 2); }
for (var k6 = 0; k6 < 5 * nrm * JS.k; k6++) { var a6 = Math.random() * Math.PI * 2, s6 = 6 + Math.random() * 14;
puff(JS.x + Math.cos(a6) * 5, JS.y + Math.sin(a6) * 5, 1, Math.cos(a6) * s6, Math.sin(a6) * s6, 8 + Math.random() * 16, 1.5 + Math.random(), 1.2, 4, [0.9, 0.93, 0.97], 0.5, 4); }
}
if (!training && RK.ship.visible) {
var cwS = camWorld(), dSh = Math.hypot(cwS.x - ship[0], cwS.y - ship[1]);
if (dSh < 2500 && cwS.z < 1500) {
var seaS = meta.sea != null ? +meta.sea : 0.4, dkS = meta.deck, hv = 0;
if (dkS && dkS.length === 9) hv = dkS[0] * dkS[1] * Math.cos(dkS[1] * (RK.sc ? RK.sc.t : 0) + dkS[2]);
var rateS = (0.8 + 3.5 * seaS) * (1 + 1.2 * Math.max(0, -hv)), nS = rateS * Math.min(0.1, dt);
nS = Math.floor(nS) + (Math.random() < nS % 1 ? 1 : 0);
for (var kS = 0; kS < nS; kS++) {
var side = Math.random(), px, py, ox, oy;
if (side < 0.35) { px = (Math.random() - 0.5) * 88; py = 26.5; ox = 0; oy = 1; }
else if (side < 0.7) { px = (Math.random() - 0.5) * 88; py = -26.5; ox = 0; oy = -1; }
else if (side < 0.85) { px = 46; py = (Math.random() - 0.5) * 50; ox = 1; oy = 0; }
else { px = -46; py = (Math.random() - 0.5) * 50; ox = -1; oy = 0; }
var big = 0.5 + Math.random() * (0.6 + seaS), wx0 = ship[0] + px, wy0 = ship[1] + py;
for (var dS = 0; dS < 8 + 10 * big; dS++) { var along = (Math.random() - 0.5) * 6 * big, up = (2.5 + Math.random() * 4) * big, outv = 0.6 + Math.random() * 1.8;
puff(wx0 + oy * along + ox * 0.6, wy0 + ox * along + oy * 0.6, 0.6 + Math.random() * 0.5, ox * outv + (Math.random() - 0.5) * 0.6, oy * outv + (Math.random() - 0.5) * 0.6, up,
0.7 + Math.random() * 0.5, 0.25, 0.8 + 0.6 * big, [0.93, 0.96, 1.0], 0.8, 4); }
if (Math.random() < 0.5) puff(wx0 + ox * 1.5, wy0 + oy * 1.5, 1.2, ox * 0.8, oy * 0.8, 0.6, 2 + Math.random() * 1.5, 1.5, 5 + 3 * big, [0.92, 0.94, 0.97], 0.22, 2);
}
}
}
var tTd = E && E.meta.result ? rkTouchT(E) : null, smk = tTd != null && t != null ? Math.max(0, 1 - (t - tTd) / 4.5) : 0;
if (!lit && r && smk > 0 && (alt - shipZ) < 30 && overShip && Math.random() < 0.6 * nrm * smk) {
puff(ex + (Math.random() - 0.5) * 4, ey + (Math.random() - 0.5) * 4, ez + 1, 0, 0, 3 + Math.random() * 3, 5 + Math.random() * 3, 3, 14, [0.35, 0.34, 0.33], 0.4 * (0.4 + 0.6 * smk), 2);
}
var onDk = !!(E && E.meta.result && E.meta.result.on_deck), scT = tTd != null && onDk ? tTd - 1 : null;
if (!RK.scorched && ((spl && hDeck < 8) || (scT != null && t != null && t >= scT))) {
RK.scorched = true; RK.scorchT = t;
var sx = ex - ship[0], sy = ey - ship[1];
if (scT != null && t > tTd + 0.5 && E.frames.length) { var cR = rowExit(frameLerp(E.frames, tTd, [])); sx = cR.x - ship[0]; sy = cR.y - ship[1]; }
rkScorch(1, sx, sy);
} else if (RK.scorched && t != null && RK.scorchT != null && t < RK.scorchT - 2 && !(scT != null && t >= scT)) { RK.scorched = false; rkScorch(0); }
var dts = t != null && RK.ptLast != null && t >= RK.ptLast && t - RK.ptLast < 2 ? t - RK.ptLast : 0; RK.ptLast = t;
particlesStep(dt, wind, dts);
}
if (cam === 'track') rkTrack(ex, ey, ez, ship, pad, alt);
RK.qNow = r ? g('q', 0) : 0;
if (ONBOARD) rkOnboard(cam, ex, ey, ez, bAxis, QV, ship, shipZ, lit, alt - shipZ, E, t);
rkDrops(E, t, alt - shipZ, lit, dt);
var cw = camWorld(), ch = Math.max(0, cw.z);
var cen = W(0, 0, -R_EARTH, V3_), hFar = camera.position.distanceTo(cen) - R_EARTH, globe = hFar > 450000;
if (globe !== !!RK.globeOn) { RK.globeOn = globe; RK.ocean.visible = !globe; (RK.clouds || []).forEach(function (cm) { cm.visible = !globe; }); RK.globe.visible = globe; }
if (globe) { RK.globe.position.copy(cen); RK.globeU.uCenter.value.copy(cen); RK.globeU.uSun.value.copy(RK.sunW); RK.land.visible = false; ch = hFar; }
var thin = Math.exp(-ch / 8000);
var dip = Math.acos(Math.min(1, R_EARTH / (R_EARTH + ch)));
RK.skyU.uGlobe.value = RK.globeOn ? 1 : 0; if (RK.globeOn) { thin = 0; dip = Math.PI / 2; }
var under = !RK.globeOn && cw.z < -0.4;
if (under !== !!RK.under) {
RK.under = under; RK.skyU.uUnder.value = under ? 1 : 0; scene.fog = under ? (RK.waterFog || (RK.waterFog = new THREE.FogExp2(0x062f42, 0.028))) : null;
(RK.clouds || []).forEach(function (cm) { cm.visible = !under; }); rkUnderUi.style.opacity = under ? '1' : '0';
}
if (under) RK.land.visible = false;
RK.skyU.uDip.value = dip; RK.skyU.uThin.value = thin; RK.skyU.uLimbW.value = Math.max(0.01, Math.min(0.2, 30000 / Math.sqrt(2 * R_EARTH * Math.max(ch, 500))));
RK.skyU.uZen.value.setRGB(0.10 * thin, 0.26 * thin, 0.62 * thin + 0.002); RK.skyU.uHor.value.setRGB(0.55 * thin + 0.01, 0.68 * thin + 0.02, 0.86 * thin + 0.05);
RK.sky.position.copy(camera.position);
RK.stars.position.copy(camera.position); RK.stars.material.uniforms.uAlpha.value = Math.min(1, Math.max(0, (ch - 30000) / 40000));
var O = RK.oceanU; O.uSun.value.copy(RK.sunW); O.uSea.value = meta.sea != null ? +meta.sea : 0.4;
O.uHazeDist.value = 45000 / Math.max(0.02, thin); O.uZenith.value.setRGB(0.104, 0.248, 0.52); O.uHorizon.value.setRGB(0.54, 0.66, 0.84);
O.uHaze.value.setRGB(0.48 * thin + 0.05, 0.58 * thin + 0.08, 0.72 * thin + 0.14); O.uHazeLo.value.setRGB(0.53, 0.66, 0.86); O.uCamH.value = ch;
RK.ocean.position.set(camera.position.x, 0 - FOC.z, camera.position.z);
(RK.clouds || []).forEach(function (cm) { cm.position.set(camera.position.x, cm.userData.z - FOC.z, camera.position.z); var U = cm.material.uniforms; U.uOff.value.set(FOC.x, FOC.y); U.uBelow.value = cw.z < cm.userData.z ? 1 : 0; });
O.uOff.value.set(FOC.x, FOC.y);
var no = Math.hypot(FOC.x - ship[0], FOC.y - ship[1]) < Math.hypot(FOC.x - pad[0], FOC.y - pad[1]) ? ship : pad;
O.uOffL.value.set(FOC.x - no[0], FOC.y - no[1]);
var shipV = W(ship[0], ship[1], 0, V2); O.uShip.value.set(shipV.x, shipZ - FOC.z, shipV.z, 1); O.uShipN.value.set(0, 1, 0).applyQuaternion(RK.shipBody.quaternion);
O.uFire.value.set(RK.fire.position.x, RK.fire.position.y, RK.fire.position.z, lit && (alt - shipZ) < 200 ? 2.5 * Math.min(1, tRel) * Math.min(1, (200 - (alt - shipZ)) / 120) : 0);
O.uWind.value.set(wind[0] || 1, -(wind[1] || 0.3)).normalize();
var camV = camera.position;
var camRef = RK.globeOn ? W(0, 0, 0, new THREE.Vector3()) : camV;
RK.mats.forEach(function (m) { if (m.uniforms.uCam) m.uniforms.uCam.value.copy(camRef); if (m.uniforms.uTime) m.uniforms.uTime.value = performance.now() / 1000 % 1000; });
RK.pU.uScale.value = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360)); RK.pU.uMaxPt.value = Math.max(128, Math.min(700, renderer.domElement.height * 0.8));
RK.pU.uLight.value.copy(RK.sunW).transformDirection(camera.matrixWorldInverse);
RK.pU.uFire.value.set(RK.fire.position.x, RK.fire.position.y, RK.fire.position.z, lit ? Math.min(1.5, thrust * 0.25) : 0);
scene.environmentIntensity = 0.2 + 0.65 * thin; hemi.intensity = 0.06 + 0.29 * thin; hemi.color.setRGB(0.81 * thin + 0.02, 0.89 * thin + 0.03, thin + 0.05);
hemi.groundColor.setRGB(0.05 + 0.0 * thin, 0.17 - 0.12 * thin, 0.35 - 0.25 * thin); sun.intensity = 3.0 + 1.2 * (1 - thin);
var tgt = camera.position.distanceTo(RK.booster.position) < 400 && RK.booster.visible ? V2.copy(RK.booster.position).addScaledVector(bAxis, 22) : controls.target;
sun.position.copy(tgt).addScaledVector(RK.sunW, 300); sun.target.position.copy(tgt);
var nearPad = Math.hypot(cw.x - pad[0], cw.y - pad[1]) < 2500 && cw.z < 800;
var sc = sun.shadow.camera, ext = nearPad && (cam === 'pad' || RK.shotFocus === 'pad' || cam === 'free') ? 190 : 70; sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 1; sc.far = 800; sc.updateProjectionMatrix();
renderer.toneMappingExposure = 0.58 + 0.12 * (1 - thin);
if (RK.bloom) RK.bloom.strength = 0.75 + (lit ? 0.25 : 0);
if (!ONB_FIXED) {
rkHud(E, t, r, alt, ship, ex, ey, engines, thrust, prop);
rkSound(E, t, dt, { lit: lit, engines: engines, thrust: thrust, alt: alt, h: alt - shipZ, q: q, mach: mach, legs: legs, rcs: Math.hypot(g('rx', 0), g('ry', 0), g('rz', 0)),
dist: camera.position.distanceTo(RK.booster.position), training: training, booms: RK.booms ? RK.booms.length : 0,
seaNear: !training && RK.ship.visible ? Math.exp(-Math.max(0, cw.z) / 150) * (0.3 + 0.7 / (1 + Math.hypot(cw.x - ship[0], cw.y - ship[1]) / 300)) : 0, sea: meta.sea != null ? +meta.sea : 0.4 });
}
else rkCamText(E, t, alt, r);
if (!ONB_FIXED && (ONBOARD || RK.cam === 'track')) rkCamText(E, t, alt, r);
var tTouch = E && E.meta.result ? (rkTouchT(E) != null ? rkTouchT(E) : F_end(E)) : null;
if (E && E.meta.result && r && !RK.bannerShown && tTouch != null && t >= tTouch - 0.05 && t < tTouch + 3 && (E.kind === 'training' || t > (E.meta.handover_t || 0))) {
var R = E.meta.result; RK.bannerShown = true;
var ok = R === true || R.landed || R.text === 'landed';
rkBanner.innerHTML = ok ? '<span style="color:#4ade80">LANDED ✓</span>' + (R.miss != null ? '<div style="font-size:13px;font-weight:500;letter-spacing:0;margin-top:6px;opacity:.85">' + esc(R.miss) + ' m from the centre · ' + esc(Math.abs(R.vz || 0).toFixed(1)) + ' m/s</div>' : '')
: '<span style="color:#f87171">' + (R.on_deck || R.text === 'crashed on the deck' ? 'CRASHED ON THE DECK' : R.text === 'lost' || R.lost ? 'LOST CONTROL' : 'IN THE SEA') + '</span>';
rkBanner.style.display = ONB_FIXED ? 'none' : 'block'; clearTimeout(RK.bannerT); RK.bannerT = setTimeout(function () { rkBanner.style.display = 'none'; }, 5000);
if (ONBOARD && ok) RK.glitch = performance.now() + 1200;
}
}
function rowExit(row) {
var q = new THREE.Quaternion(row[RF.qx], row[RF.qz], -row[RF.qy], row[RF.qw]).normalize(), b = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
var cg = cgOf(row[RF.prop]);
return { x: row[RF.x] - b.x * cg, y: row[RF.y] + b.z * cg, z: row[RF.z] - b.y * cg, bw: [b.x, -b.z, b.y], v: [row[RF.vx], row[RF.vy], row[RF.vz]] };
}
function rkLegPose(L, ang) {
L.arm.rotation.z = -ang; L.foot.rotation.z = ang;
var base = new THREE.Vector3(Math.cos(L.az) * 1.86, RK_LEG_HINGE + RK_LEG_LEN + 0.6, -Math.sin(L.az) * 1.86);
var tip = new THREE.Vector3(0.18, RK_LEG_LEN * 0.7, 0); L.arm.updateMatrix(); L.hinge.updateMatrix();
tip.applyMatrix4(L.arm.matrix).applyMatrix4(L.hinge.matrix);
var d = base.distanceTo(tip), dir = V3_.copy(tip).sub(base).normalize(), q = new THREE.Quaternion().setFromUnitVectors(UPV, dir);
[[0, Math.max(0.8, 0.46 * d)], [0.27 * d, Math.max(0.6, 0.5 * d)], [d, Math.max(0.6, 0.46 * d)]].forEach(function (sp, k) {
var m = L.strut[k], len = Math.min(sp[1], d), c = k === 0 ? len / 2 : k === 2 ? d - len / 2 : d / 2;
m.scale.set(1, len, 1); m.quaternion.copy(q); m.position.copy(base).addScaledVector(dir, c); });
}
function rkTouchT(E) {
if (!E || !E.meta.result || !E.frames.length || RF.x == null) return null;
if (E.touchAt !== undefined && E.done) return E.touchAt;
if (E.meta.result.t_touch != null && E.kind !== 'training') return E.meta.result.t_touch;
var F = E.frames, at = null;
if (E.kind === 'training') at = E.done ? F[F.length - 1][0] : null;
else {
var ho = E.meta.handover_t || 0;
for (var i = F.length - 2; i > 0; i--) { var a = F[i], b = F[i - 1]; if (a[0] < ho) break; if (a[RF.x] !== b[RF.x] || a[RF.y] !== b[RF.y] || a[RF.z] !== b[RF.z]) { at = a[0]; break; } }
}
if (E.done) E.touchAt = at;
return at;
}
function rkAfter(E, t, r, deckZ) {
if (!E || !r || t == null) return null;
var tt = rkTouchT(E);
if (tt == null || t < tt) { if (RK.af && RK.af.ep === E.id && t < RK.af.t0) { RK.af = null; rkBoomsClear(); particlesClear(); /* back before the crash: its smoke goes too */ } return null; }
var R = E.meta.result || {}, landed = R === true || R.landed || R.text === 'landed';
if (landed) return { landed: true };
if (R.physics && R.on_deck) {
var bt = R.boom_t != null ? R.boom_t : 1e9;
if (t < bt) { if (RK.af && RK.af.ep === E.id) { RK.af = null; rkBoomsClear(); particlesClear(); } return { landed: true }; }
var P = RK.af;
if (!P || P.ep !== E.id) {
P = RK.af = { ep: E.id, t0: bt, tl: bt, x: r[RF.x], y: r[RF.y], z0: deckZ, sea: false, dir: [1, 0], th: 0, om: 0, crumple: 0, sink: 0, vi: 0,
boom: true, boom2: true, dead: true, deadT: bt, phys: true, wall0: performance.now(), tSeen: t };
rkExplode(r[RF.x], r[RF.y], deckZ + 5, 20, false, bt);
}
P.x = r[RF.x]; P.y = r[RF.y]; P.z0 = deckZ;
if (t !== P.tSeen) { P.tSeen = t; P.wallAt = performance.now(); P.tAtWall = t; }
RK.afNow = Math.max(t, (P.tAtWall != null ? P.tAtWall : t) + (performance.now() - (P.wallAt || performance.now())) / 1000);
return { landed: true };
}
if (R.lost || R.text === 'lost') return null;
var A = RK.af;
if (!A || A.ep !== E.id) {
var c = rowExit(frameLerp(E.frames, tt, []));
var onDeck = !!(R.on_deck || R.text === 'crashed on the deck');
var vh = Math.hypot(c.v[0], c.v[1]), vi = Math.abs(R.vz != null ? R.vz : c.v[2]) + (R.vh != null ? R.vh : vh);
var th = Math.acos(Math.max(-1, Math.min(1, c.bw[2]))), hl = Math.hypot(c.bw[0], c.bw[1]);
var dir = th > 0.03 && hl > 1e-6 ? [c.bw[0] / hl, c.bw[1] / hl] : vh > 0.2 ? [c.v[0] / vh, c.v[1] / vh] : [Math.cos(tt * 7.1), Math.sin(tt * 7.1)];
var surf = onDeck ? deckZ : 0;
A = RK.af = { ep: E.id, t0: tt, tl: tt, x: c.x, y: c.y, z0: surf, sea: !onDeck, dir: dir, th: Math.max(0.04, th), om: Math.max(0.06, vh / 20 + vi * 0.006),
crumple: Math.max(0, Math.min(0.55, (vi - 6) / 40)), sink: 0, vi: vi, boom: false, boom2: false, dead: false, deadT: 1e9, wall0: performance.now(), tSeen: t };
if (vi > 6 || A.sea) { rkExplode(A.x, A.y, surf + 4, 12 + Math.min(22, vi * 0.25), A.sea, tt); A.boom = true; A.dead = true; A.deadT = tt + 0.15; }
}
if (t !== A.tSeen) { A.tSeen = t; A.wallAt = performance.now(); A.tAtWall = t; }
var tA = Math.max(t, (A.tAtWall != null ? A.tAtWall : t) + (performance.now() - (A.wallAt || performance.now())) / 1000);
RK.afNow = tA; t = tA;
if (t < A.tl) { A.tl = A.t0; }
var L = 45 * (1 - A.crumple), k = 3 * 9.81 / (2 * Math.max(10, L)), h = 1 / 120;
while (A.tl + h <= t) {
A.tl += h;
if (A.th < Math.PI / 2) {
A.om += k * Math.sin(A.th) * h; A.th += A.om * h;
if (A.th >= Math.PI / 2) { A.th = Math.PI / 2; A.om = 0;
if (!A.boom2) { A.boom2 = true; var ex2 = A.x + A.dir[0] * L * 0.55, ey2 = A.y + A.dir[1] * L * 0.55; rkExplode(ex2, ey2, A.z0 + 2 - A.sink, A.boom ? 11 : 20, A.sea, A.tl); if (!A.dead) { A.dead = true; A.deadT = A.tl; } } }
else if (!A.boom && A.th > 1.25) { A.boom = true; rkExplode(A.x + A.dir[0] * L * 0.4, A.y + A.dir[1] * L * 0.4, A.z0 + 6, 16, A.sea, A.tl); A.dead = true; A.deadT = A.tl; }
}
if (A.sea) A.sink = Math.min(60, A.sink + h * (A.th > 1.3 ? (A.tl - A.t0 > 12 ? 2.2 : 0.5) : 1.4));
}
var s = Math.sin(A.th), bw = [s * A.dir[0], s * A.dir[1], Math.cos(A.th)];
var q = new THREE.Quaternion().setFromUnitVectors(UPV, new THREE.Vector3(bw[0], bw[2], -bw[1]).normalize());
return { landed: false, ex: A.x, ey: A.y, ez: A.z0 + 1.85 * s - A.sink, q: q, crumple: A.crumple };
}
var DEB_N = 36;
function rkBoomBuild(root) {
RK.booms = []; RK.boomMeshes = [];
for (var i = 0; i < 3; i++) {
var m = rkShader({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uI: { value: 0 }, uAge: { value: 0 } },
vertex: 'varying vec3 vN; varying vec3 vP; void main(){ vP = position; vN = normalize(normalMatrix * normal); vec4 wp = modelMatrix * vec4(position, 1.0); wp.y -= curveDrop(wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp;\n#include <logdepthbuf_vertex>\n }',
fragment: GLSL_NOISE + 'uniform float uI; uniform float uAge; uniform float uTime; varying vec3 vN; varying vec3 vP;\n'
+ 'void main(){ float e = abs(vN.z); float n = fbm(vP.xy * 2.2 + vec2(uTime * 0.9, -uTime * 1.3)) * 0.7 + fbm(vP.yz * 4.0 - uTime) * 0.5;'
+ ' float hot = exp(-uAge * 1.6); vec3 col = mix(vec3(0.55, 0.12, 0.02), mix(vec3(1.0, 0.5, 0.12), vec3(1.0, 0.92, 0.7), hot), clamp(n * 1.2 - 0.2 + hot * 0.4, 0.0, 1.0));'
+ ' float a = uI * pow(e, 0.6) * (0.35 + 0.9 * n); gl_FragColor = vec4(col * a * 6.0, a);\n#include <logdepthbuf_fragment>\n }' });
var b = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), m); b.visible = false; b.frustumCulled = false; b.renderOrder = 8; root.add(b); RK.boomMeshes.push(b);
}
var chunkMat = new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.8, metalness: 0.4, emissive: 0x501800, emissiveIntensity: 1.0 });
RK.deb = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), chunkMat, DEB_N); RK.deb.castShadow = true; RK.deb.frustumCulled = false; RK.deb.count = 0; root.add(RK.deb);
RK.dw = new Float64Array(DEB_N * 3); RK.dv = new Float32Array(DEB_N * 3); RK.ds = new Float32Array(DEB_N * 3); RK.dr = new Float32Array(DEB_N * 6); RK.dfloor = new Float32Array(DEB_N); RK.dn = 0;
}
function rkBoomsClear() { if (!RK.booms) return; RK.booms = []; RK.fbq = []; RK.boomMeshes.forEach(function (m) { m.visible = false; }); RK.dn = 0; if (RK.deb) RK.deb.count = 0; }
function rkExplode(x, y, z, size, water, t) {
if (!RK.booms) return;
RK.booms.push({ x: x, y: y, z: z, size: size, t0: t }); if (RK.booms.length > 3) RK.booms.shift();
var f = size / 15, rnd = Math.random, floor = water ? 0.5 : z - 3;
for (var i0 = 0; i0 < 3; i0++) { var bf = (rnd() - 0.5) * 4 * f; puff(x + bf, y - bf, z + 2 * f, 0, 0, 4, 0.18 + rnd() * 0.1, 4 * f, (14 + rnd() * 6) * f, [0.0, floor, 0], 0.8, 7); }
var lobes = []; for (var lb = 0; lb < 4 + Math.floor(rnd() * 4); lb++) { var la = rnd() * Math.PI * 2, le = rnd() * 1.1 - 0.05; lobes.push([Math.cos(la) * Math.cos(le), Math.sin(la) * Math.cos(le), Math.sin(le), 0.5 + rnd() * 0.9, rnd() * 0.6]); }
(RK.fbq = RK.fbq || []).push({ x: x, y: y, z: z, f: water ? f * 0.6 : f, floor: floor, t0: t, lobes: lobes, done: 0, n: water ? 80 : 170, water: water });
for (var i1 = 0; i1 < 50; i1++) { var a1 = rnd() * Math.PI * 2, sp1 = (18 + rnd() * 22) * f;
puff(x + Math.cos(a1) * 4 * f, y + Math.sin(a1) * 4 * f, (water ? 1 : floor + 1.5), Math.cos(a1) * sp1, Math.sin(a1) * sp1, 1 + rnd() * 2, 2.5 + rnd() * 2.5, 3 * f, (12 + rnd() * 8) * f, water ? [0.9, 0.92, 0.95] : [0.42, 0.4, 0.38], 0.5, 2); }
for (var j = 0; j < 90; j++) { var a2 = rnd() * Math.PI * 2, sp2 = (2 + rnd() * 8) * f;
puff(x + (rnd() - 0.5) * 8 * f, y + (rnd() - 0.5) * 8 * f, z + rnd() * 6 * f, Math.cos(a2) * sp2, Math.sin(a2) * sp2, 4 + rnd() * 10, 18 + rnd() * 20, 8 * f, (45 + rnd() * 35) * f, [0.1, 0.09, 0.085], 0.8, 5); }
for (var k2 = 0; k2 < 60; k2++) { var a3 = rnd() * Math.PI * 2, el3 = 0.2 + rnd() * 1.1, sp3 = (14 + rnd() * 30) * f;
puff(x, y, z + 2, Math.cos(a3) * Math.cos(el3) * sp3, Math.sin(a3) * Math.cos(el3) * sp3, Math.sin(el3) * sp3, 2.5 + rnd() * 3, 0.9, 0.5, [7, 2.6, 0.6], 1, 4); }
if (water) {
for (var w = 0; w < 110; w++) { var a4 = rnd() * Math.PI * 2, rr = rnd() * 6 * f, sp4 = 3 + rnd() * 9;
puff(x + Math.cos(a4) * rr, y + Math.sin(a4) * rr, 1, Math.cos(a4) * sp4, Math.sin(a4) * sp4, 14 + rnd() * 30 * f, 3 + rnd() * 2.5, 3, 10 + rnd() * 8, [0.92, 0.95, 1.0], 0.75, 4); }
for (var v = 0; v < 40; v++) puff(x + (rnd() - 0.5) * 20, y + (rnd() - 0.5) * 20, 2, 0, 0, 3 + rnd() * 3, 12 + rnd() * 10, 8, 40, [0.85, 0.87, 0.9], 0.55, 2);
for (var c1 = 0; c1 < 140; c1++) { var a6 = rnd() * Math.PI * 2, r6 = rnd() * 5 * f, up6 = (22 + rnd() * 45) * Math.sqrt(f), out6 = 2 + rnd() * 8;
puff(x + Math.cos(a6) * r6, y + Math.sin(a6) * r6, 1, Math.cos(a6) * out6, Math.sin(a6) * out6, up6, 3 + rnd() * 3.5, 4 + rnd() * 3, 10 + rnd() * 9, rnd() < 0.7 ? [0.93, 0.96, 1.0] : [0.8, 0.87, 0.92], 0.9, 4); }
for (var c2 = 0; c2 < 110; c2++) { var a7 = rnd() * Math.PI * 2, r7 = (7 + rnd() * 7) * f, out7 = 8 + rnd() * 14, up7 = 14 + rnd() * 24;
puff(x + Math.cos(a7) * r7, y + Math.sin(a7) * r7, 1, Math.cos(a7) * out7, Math.sin(a7) * out7, up7, 2.2 + rnd() * 2, 3, 8 + rnd() * 5, [0.94, 0.97, 1.0], 0.85, 4); }
for (var c3 = 0; c3 < 60; c3++) { var a8 = rnd() * Math.PI * 2, r8 = rnd() * 10 * f;
puff(x + Math.cos(a8) * r8, y + Math.sin(a8) * r8, 4 + rnd() * 40 * f, (rnd() - 0.5) * 6, (rnd() - 0.5) * 6, 2 + rnd() * 4, 8 + rnd() * 8, 8, 30 + rnd() * 25, [0.9, 0.92, 0.95], 0.4, 2); }
for (var c4 = 0; c4 < 70; c4++) { var a9 = rnd() * Math.PI * 2, out9 = 18 + rnd() * 22;
puff(x + Math.cos(a9) * 8 * f, y + Math.sin(a9) * 8 * f, 1.2, Math.cos(a9) * out9, Math.sin(a9) * out9, 1 + rnd() * 3, 3 + rnd() * 2, 4, 14 + rnd() * 10, [0.9, 0.93, 0.97], 0.5, 2); }
var JF = RK.jf || (RK.jf = { x: 0, y: 0, r: 10, i: 0, ep: null }); JF.x = x; JF.y = y; JF.r = Math.max(JF.r, 45 * f); JF.i = 1;
}
var n = Math.min(DEB_N - RK.dn, 12 + Math.round(10 * f));
for (var d = 0; d < n; d++) {
var i3 = RK.dn++, a5 = rnd() * Math.PI * 2, el5 = 0.25 + rnd() * 1.0, sp5 = (10 + rnd() * 28) * f;
RK.dw[3 * i3] = x; RK.dw[3 * i3 + 1] = y; RK.dw[3 * i3 + 2] = z + 2;
RK.dv[3 * i3] = Math.cos(a5) * Math.cos(el5) * sp5; RK.dv[3 * i3 + 1] = Math.sin(a5) * Math.cos(el5) * sp5; RK.dv[3 * i3 + 2] = Math.sin(el5) * sp5;
RK.ds[3 * i3] = 0.4 + rnd() * 2.6; RK.ds[3 * i3 + 1] = 0.15 + rnd() * 0.5; RK.ds[3 * i3 + 2] = 0.4 + rnd() * 1.8;
for (var e = 0; e < 3; e++) { RK.dr[6 * i3 + e] = rnd() * 6; RK.dr[6 * i3 + 3 + e] = (rnd() - 0.5) * 10; }
RK.dfloor[i3] = water ? -50 : z - 2;
}
}
var DM = new THREE.Matrix4(), DQ = new THREE.Quaternion(), DE = new THREE.Euler(), DP = new THREE.Vector3(), DS = new THREE.Vector3();
function rkBooms(t, dt) {
var flash = null;
(RK.fbq || []).forEach(function (Q) {
var age = t - Q.t0, want = age < 0 ? 0 : Math.min(Q.n, Math.round(Q.n * Math.min(1, age / 0.9)));
for (; Q.done < want; Q.done++) {
var L = Q.lobes[Math.floor(Math.random() * Q.lobes.length)], f = Q.f, j = 0.55, d = [L[0] + (Math.random() - 0.5) * j, L[1] + (Math.random() - 0.5) * j, L[2] + (Math.random() - 0.5) * j];
var dn = Math.hypot(d[0], d[1], d[2]) || 1, sp = (5 + Math.pow(Math.random(), 0.7) * 34 * L[3]) * f, late = Q.done / Q.n;
puff(Q.x + (Math.random() - 0.5) * 3 * f, Q.y + (Math.random() - 0.5) * 3 * f, Q.z + Math.random() * 3 * f, d[0] / dn * sp, d[1] / dn * sp, d[2] / dn * sp + 5 * f,
2.2 + Math.random() * 3.4, (2.5 + Math.random() * 3) * f, (9 + Math.random() * 14) * f, [Math.min(1, L[4] + late * 0.8 + Math.random() * 0.4), Q.floor, 0], 0.92, 7);
if (!Q.water && Math.random() < 0.35) puff(Q.x + d[0] / dn * 6 * f, Q.y + d[1] / dn * 6 * f, Q.z + 4 * f, d[0] / dn * sp * 0.25, d[1] / dn * sp * 0.25, 6 + Math.random() * 8, 14 + Math.random() * 16, 6 * f, (30 + Math.random() * 30) * f, [0.07, 0.065, 0.06], 0.65, 5); // soot rising after it
}
});
if (RK.fbq) RK.fbq = RK.fbq.filter(function (Q) { return Q.done < Q.n && t - Q.t0 < 5; });
(RK.boomMeshes || []).forEach(function (m, i) {
var B = RK.booms[i];
m.visible = false;
if (!B || t == null) return;
var age = t - B.t0;
if (age < 0 || age > 7) return;
var rad = B.size * (0.25 + 1.1 * (1 - Math.exp(-age * 2.6)));
W(B.x, B.y, B.z + age * 4 - dropAt(B.x, B.y), m.position); m.scale.setScalar(rad);
m.material.uniforms.uI.value = Math.max(0, Math.exp(-age * 0.9) - age * 0.02); m.material.uniforms.uAge.value = age;
var fi = 90000 * (B.size / 15) * Math.exp(-age * 2.2);
if (!flash || fi > flash.i) flash = { i: fi, x: B.x, y: B.y, z: B.z + 6 };
});
if (RK.deb && RK.dn) {
var h = Math.min(0.05, dt || 0);
for (var i = 0; i < RK.dn; i++) {
var fl = RK.dfloor[i];
RK.dv[3 * i + 2] -= 9.81 * h; var kd = Math.exp(-0.15 * h); RK.dv[3 * i] *= kd; RK.dv[3 * i + 1] *= kd;
RK.dw[3 * i] += RK.dv[3 * i] * h; RK.dw[3 * i + 1] += RK.dv[3 * i + 1] * h; RK.dw[3 * i + 2] += RK.dv[3 * i + 2] * h;
if (fl > -40 && RK.dw[3 * i + 2] < fl + 0.3 && Math.hypot(RK.dw[3 * i] - (RK.af ? RK.af.x : 0), RK.dw[3 * i + 1] - (RK.af ? RK.af.y : 0)) < 60) {
RK.dw[3 * i + 2] = fl + 0.3; RK.dv[3 * i + 2] = Math.abs(RK.dv[3 * i + 2]) * 0.3; RK.dv[3 * i] *= 0.6; RK.dv[3 * i + 1] *= 0.6; for (var e = 3; e < 6; e++) RK.dr[6 * i + e] *= 0.6;
} else if (RK.dw[3 * i + 2] < 0) { RK.dw[3 * i + 2] = Math.max(-40, RK.dw[3 * i + 2]); RK.dv[3 * i] *= 0.9; RK.dv[3 * i + 1] *= 0.9; RK.dv[3 * i + 2] = Math.max(RK.dv[3 * i + 2], -2); }
for (var e2 = 0; e2 < 3; e2++) RK.dr[6 * i + e2] += RK.dr[6 * i + 3 + e2] * h;
W(RK.dw[3 * i], RK.dw[3 * i + 1], RK.dw[3 * i + 2] - dropAt(RK.dw[3 * i], RK.dw[3 * i + 1]), DP);
DQ.setFromEuler(DE.set(RK.dr[6 * i], RK.dr[6 * i + 1], RK.dr[6 * i + 2]));
DM.compose(DP, DQ, DS.set(RK.ds[3 * i], RK.ds[3 * i + 1], RK.ds[3 * i + 2])); RK.deb.setMatrixAt(i, DM);
if (Math.random() < 0.15 && RK.dw[3 * i + 2] > 0.5 && RK.booms.length && t - RK.booms[RK.booms.length - 1].t0 < 6)
puff(RK.dw[3 * i], RK.dw[3 * i + 1], RK.dw[3 * i + 2], 0, 0, 1, 2.5, 0.8, 4, [0.15, 0.14, 0.13], 0.5, 2);
}
RK.deb.count = RK.dn; RK.deb.instanceMatrix.needsUpdate = true;
var age2 = RK.booms.length ? t - RK.booms[0].t0 : 99; RK.deb.material.emissiveIntensity = Math.max(0, 1.2 * Math.exp(-age2 * 0.25));
}
var burnFor = RK.af && RK.af.sea ? Math.min(14, 6 + RK.af.sink * 0.2) : 40, afT = RK.af && t != null ? Math.max(t, RK.afNow || t) - RK.af.deadT : 1e9;
if (RK.af && RK.af.sea && RK.af.dead && afT > 0 && afT < burnFor + 10 && RK.af.sink > 8 && Math.random() < 0.3 * (1 - afT / (burnFor + 10)))
puff(RK.af.x + (Math.random() - 0.5) * 10, RK.af.y + (Math.random() - 0.5) * 10, 1, 0, 0, 2, 6 + Math.random() * 4, 4, 18, [0.85, 0.86, 0.88], 0.35, 2);
if (RK.af && RK.af.dead && t != null && afT < burnFor && (!RK.af.sea || RK.af.sink < 9) && Math.random() < 0.5) {
var A = RK.af; puff(A.x + (Math.random() - 0.5) * 6, A.y + (Math.random() - 0.5) * 6, A.z0 + 1 - A.sink, 0, 0, 3, 3 + Math.random() * 2, 3, 9, [3.5, 1.3, 0.35], 0.7, 1);
if (Math.random() < 0.5) puff(A.x, A.y, A.z0 + 3 - A.sink, 0, 0, 6, 20 + Math.random() * 10, 6, 40, [0.1, 0.09, 0.085], 0.6 * (1 - afT / burnFor), 5);
}
return flash;
}
function rkEvents(E) {
if (!E || !E.frames.length || RF.engines == null) return null;
if (E.ev && (E.done || E.frames.length - E.ev.n < 40)) return E.ev;
var F = E.frames, m = E.meta, mc = m.meco_t, ev = { n: F.length, ign: [], list: [] };
var qm = 0, qmT = null, prev = 0;
for (var i = 0; i < F.length; i++) {
var f = F[i], en = f[RF.engines];
if (mc != null && f[0] < mc && f[RF.q] > qm) { qm = f[RF.q]; qmT = f[0]; }
if (qmT != null && ev.maxq == null && f[RF.q] < qm * 0.8 && f[0] > qmT) ev.maxq = qmT;
if (RF.mach != null && ev.mach1 == null && f[0] > 1 && f[0] < (mc || 1e9) && f[RF.mach] >= 1) ev.mach1 = f[0];
if (en > 0 && prev === 0 && f[0] > 0.5) ev.ign.push(f[0]);
if (en === 3 && ev.entry == null && f[0] > (mc || 0) + 10) ev.entry = f[0];
if (ev.entry != null && ev.entryEnd == null && en !== 3 && f[0] > ev.entry) ev.entryEnd = f[0];
if (m.handover_t != null && f[0] > m.handover_t && en > 0 && ev.landing == null) ev.landing = f[0];
prev = en;
}
if (E.kind !== 'training') ev.ign.unshift(-3.0);
ev.touch = rkTouchT(E);
if (E.kind !== 'training') {
var L = ev.list;
L.push([-3, 'STARTUP', 'ENGINE STARTUP']); L.push([0, 'LIFTOFF', 'LIFTOFF']);
if (ev.maxq != null) L.push([ev.maxq, 'MAX-Q', 'MAX-Q']);
if (mc != null) { L.push([mc, 'MECO', 'MAIN ENGINE CUT-OFF']); L.push([m.sep_t, 'STAGE SEP', 'STAGE SEPARATION']); L.push([m.sep_t + 4, 'SES-1', 'SECOND STAGE ENGINE START']); L.push([m.sep_t + 50, 'FAIRING', 'FAIRING SEPARATION']); }
if (ev.entry != null) L.push([ev.entry, 'ENTRY', 'ENTRY BURN']);
if (ev.entryEnd != null) L.push([ev.entryEnd, '', 'ENTRY BURN SHUTDOWN']);
if (ev.landing != null) L.push([ev.landing, 'LANDING', 'LANDING BURN']);
if (ev.touch != null && m.result) L.push([ev.touch, 'TOUCHDOWN', 'TOUCHDOWN']);
}
E.ev = ev;
return ev;
}
var SIDE = new THREE.Vector3(), UPW = new THREE.Vector3(0, 1, 0);
function rkShot(E, t, alt, ex, ey, ez, bAxis, ship, shipZ, pad, s2w, s2ax, training) {
var ev = rkEvents(E) || {}, m = E ? E.meta : {}, mid = [ex + bAxis.x * 22, ey - bAxis.z * 22, ez + bAxis.y * 22];
SIDE.crossVectors(bAxis, UPW); if (SIDE.lengthSq() < 0.01) SIDE.set(0, 0, 1); SIDE.normalize();
var off = function (side, along, up) { return new THREE.Vector3().addScaledVector(SIDE, side).addScaledVector(bAxis, along).addScaledVector(UPW, up); };
var h = alt - shipZ, touch = ev.touch, ret;
if (touch != null && t > touch + 4) { var a = (t - touch) * 0.05 + 0.6; return { id: 'orbit', focus: 'ship', world: [ship[0] + Math.cos(a) * 170, ship[1] + Math.sin(a) * 170, 45], look: [ship[0], ship[1], shipZ + 14], fov: 40 }; }
if (training || t > (m.handover_t || 1e9) - 1) {
if (h < 450) { var hh = Math.max(h, 0), D = Math.max(178, hh * 1.4 + 150) / 178; // far enough back to hold the booster and the deck, above the overlay
return { id: 'shipwide', focus: 'ship', world: [ship[0] - 140 * D, ship[1] - 110 * D, 40], look: [ship[0], ship[1], shipZ + hh * 0.32 + 12], size: Math.max(70, hh * 0.7 + 60) }; }
if (h < 4500 && !training) return { id: 'shiplong', focus: 'booster', world: [ship[0] - 700, ship[1] - 1100, 20], look: mid, size: 55 };
return { id: 'descent', focus: 'booster', off: off(70, 10, 6), fov: 45 };
}
if (t == null || t < -1) return { id: 'padwide', focus: 'pad', world: [pad[0] - 230, pad[1] - 170, 60], look: [pad[0], pad[1], 38], size: 130 };
if (t < 12) return { id: 'padlow', focus: 'booster', world: [pad[0] - 60, pad[1] - 80, 3], look: mid, fov: 55 };
if (t < 50) return { id: 'track', focus: 'booster', world: [pad[0] - 3500, pad[1] - 4200, 12], look: mid, size: 85 };
var mc = m.meco_t || 1e9, sep = m.sep_t || 1e9;
if (t < mc - 4) return { id: 'chase', focus: 'booster', off: off(42, -30, 6), fov: 50 };
if (t < sep + 22) return { id: 'sep', focus: 'booster', off: off(55, 26, 0), lookOff: bAxis.clone().multiplyScalar(18), fov: 50 };
if (t < sep + 60 && s2w) { var sd2 = new THREE.Vector3().crossVectors(s2ax, UPW); if (sd2.lengthSq() < 0.01) sd2.set(0, 0, 1); sd2.normalize();
return { id: 's2', focus: 's2', off: new THREE.Vector3().addScaledVector(sd2, 30).addScaledVector(s2ax, -6).addScaledVector(UPW, -6), lookOff: s2ax.clone().multiplyScalar(9), fov: 50 }; }
var en = ev.entry || 1e9, ee = ev.entryEnd || 1e9;
if (t < en - 20) return { id: 'coast', focus: 'booster', off: off(90, 0, 25), fov: 45 };
if (t < ee + 6) return { id: 'entry', focus: 'booster', off: off(45, -14, -4), fov: 55 };
return { id: 'descent', focus: 'booster', off: off(70, 10, 6), fov: 45 };
}
function rkApplyShot(sh, dt) {
var cut = sh.id !== RK.shotId; RK.shotId = sh.id; RK.shotFocus = sh.focus;
var tgt = sh.look ? W(sh.look[0], sh.look[1], sh.look[2] - dropAt(sh.look[0], sh.look[1]), new THREE.Vector3()) : (sh.lookOff ? sh.lookOff.clone() : new THREE.Vector3());
if (sh.world) W(sh.world[0], sh.world[1], sh.world[2] - dropAt(sh.world[0], sh.world[1]), camera.position);
else if (cut) camera.position.copy(sh.off); else camera.position.lerp(sh.off, 1 - Math.exp(-(dt || 0.016) * 1.4));
camera.up.set(0, 1, 0); camera.lookAt(tgt); controls.target.copy(tgt);
var fov = sh.size ? Math.max(0.3, Math.min(55, 2 * Math.atan(sh.size / Math.max(1, camera.position.distanceTo(tgt))) * 180 / Math.PI)) : sh.fov || 45;
camera.fov = cut ? fov : camera.fov + (fov - camera.fov) * Math.min(1, (dt || 0.016) * 2.5); camera.updateProjectionMatrix();
}
function F_end(E) {
if (!E.frames.length) return 0;
if (E.kind !== 'training' && E.meta.result && E.done && RF.engines != null) {
if (E.touchT === undefined) { E.touchT = null; for (var i = E.frames.length - 1; i >= 0; i--) if (E.frames[i][RF.engines] > 0) { E.touchT = E.frames[Math.min(E.frames.length - 1, i + 1)][0]; break; } }
if (E.touchT != null) return E.touchT;
}
return E.frames[E.frames.length - 1][0];
}
function rkScorch(on, dx, dy) {
var g = RK.scorchCv.getContext('2d'); g.clearRect(0, 0, 1024, 600);
if (on) {
var cx = 512 + (dx || 0) * 1024 / 91, cy = 300 - (dy || 0) * 600 / 52, px = 11.3, R = Math.random;
var halo = g.createRadialGradient(cx, cy, 4, cx, cy, 26 * px);
halo.addColorStop(0, 'rgba(60,40,22,.75)'); halo.addColorStop(0.45, 'rgba(78,52,30,.45)'); halo.addColorStop(0.8, 'rgba(70,50,32,.15)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
g.fillStyle = halo; g.beginPath(); g.arc(cx, cy, 26 * px, 0, Math.PI * 2); g.fill();
g.lineCap = 'round';
for (var i = 0; i < 90; i++) {
var a = R() * Math.PI * 2, r0 = (2 + R() * 4) * px, r1 = r0 + (6 + R() * 18) * px, w = 2 + R() * 9;
var sg = g.createLinearGradient(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
sg.addColorStop(0, 'rgba(12,9,7,' + (0.45 + R() * 0.35).toFixed(2) + ')'); sg.addColorStop(1, 'rgba(40,28,18,0)');
g.strokeStyle = sg; g.lineWidth = w; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke();
}
var core = g.createRadialGradient(cx, cy, 2, cx, cy, 11 * px);
core.addColorStop(0, 'rgba(4,3,2,.97)'); core.addColorStop(0.6, 'rgba(10,8,6,.85)'); core.addColorStop(1, 'rgba(20,15,10,0)');
g.fillStyle = core; g.beginPath(); g.arc(cx, cy, 11 * px, 0, Math.PI * 2); g.fill();
for (var j = 0; j < 40; j++) {
var bx = cx + (R() - 0.5) * 26 * px, by = cy + (R() - 0.5) * 26 * px, br = (0.8 + R() * 2.2) * px, ash = R() > 0.75;
var bg = g.createRadialGradient(bx, by, 0, bx, by, br), ba = ash ? 0.06 + R() * 0.08 : 0.12 + R() * 0.2;
bg.addColorStop(0, ash ? 'rgba(130,120,108,' + ba.toFixed(2) + ')' : 'rgba(8,6,5,' + ba.toFixed(2) + ')'); bg.addColorStop(1, 'rgba(8,6,5,0)');
g.fillStyle = bg; g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill();
}
}
RK.scorch.needsUpdate = true;
}
function rkTrack(ex, ey, ez, ship, pad, alt) {
var nearShip = Math.hypot(ex - ship[0], ey - ship[1]) < 120000 && RK.ct > 200;
var st = nearShip ? [ship[0] - 2800, ship[1] - 2200, 8] : [pad[0] - 3500, pad[1] - 4200, 12];
var p = W(st[0], st[1], st[2], V2), tgt, size;
var s2On = RK.s2.visible && RK.s2World, dS2 = s2On ? Math.hypot(RK.s2World[0] - st[0], RK.s2World[1] - st[1], RK.s2World[2] - st[2]) : 1e12;
if (s2On && !nearShip && dS2 < 140000) { tgt = V3_.set(0, 7, 0).applyQuaternion(RK.s2.quaternion).add(RK.s2.position); size = 30; }
else { tgt = V3_.set(0, RK.stack && RK.stack.visible ? 34 : 22, 0).applyQuaternion(RK.booster.quaternion).add(RK.booster.position); size = RK.stack && RK.stack.visible ? 85 : 60; }
var dist = p.distanceTo(tgt);
camera.position.copy(p); camera.up.set(0, 1, 0); controls.target.copy(tgt); camera.lookAt(tgt);
camera.fov = Math.max(0.05, Math.min(40, 2 * Math.atan(size / dist) * 180 / Math.PI)); camera.updateProjectionMatrix();
}
var ONB = {
'onboard: interstage': { pos: [1.45, 44.0, 1.45], look: [0.11, -1, 0.11], up: [0.707, 0, 0.707], fov: 80 },
'onboard: engines': { pos: [0, 3.0, 2.4], look: [0, -1, 0.24], up: [0, 0, 1], fov: 84 },
'onboard: grid fin': { pos: [0.7, 40.2, 1.95], look: [-0.35, 0.85, 0.42], up: [0, 0, 1], fov: 70 }
};
function rkOnboard(cam, ex, ey, ez, bAxis, Q, ship, shipZ, lit, hDeck, E, t) {
var buffet = Math.max(0, Math.min(1, ((RK.qNow || 0) - 3000) / 30000));
var shake = 0;
if (ONB[ONBOARD]) shake = lit ? 0.004 + 0.004 * buffet + (hDeck < 40 ? 0.01 : 0) : 0;
if (ONB[ONBOARD]) {
var o = ONB[ONBOARD];
camera.position.set(o.pos[0], o.pos[1], o.pos[2]).applyQuaternion(Q).add(RK.booster.position);
var look = V2.set(o.look[0], o.look[1], o.look[2]).normalize().applyQuaternion(Q);
camera.up.set(o.up[0], o.up[1], o.up[2]).applyQuaternion(Q);
camera.lookAt(V3_.copy(camera.position).add(look));
camera.fov = o.fov;
} else if (ONBOARD === 'second stage') {
if (!RK.s2.visible) { shake = lit ? 0.004 + 0.004 * buffet : 0; camera.position.set(0, 72, 2.4).applyQuaternion(Q).add(RK.booster.position); camera.up.copy(UPV); camera.lookAt(RK.booster.position); camera.fov = 70; }
else {
shake = RK.s2LitNow ? 0.003 : 0; var sq = RK.s2.quaternion, fT = E && E.meta.sep_t != null ? E.meta.sep_t + 50 : null;
{ camera.position.set(0, 6.0, 2.3).applyQuaternion(sq).add(RK.s2.position); camera.up.set(0, 0, 1).applyQuaternion(sq); camera.lookAt(V3_.set(0, -1, 0.2).applyQuaternion(sq).add(camera.position)); camera.fov = 70; }
}
} else if (ONBOARD === 'drone ship deck') {
RK.ship.updateMatrixWorld(true);
camera.position.set(40, 3.2, 21); RK.shipBody.localToWorld(camera.position);
var aim = V3_.set(0, 17, 0); RK.shipBody.localToWorld(aim);
camera.up.set(0, 1, 0).applyQuaternion(RK.shipBody.getWorldQuaternion(new THREE.Quaternion()));
camera.lookAt(aim); camera.fov = 72;
shake = lit && hDeck < 70 ? 0.012 * (1 - hDeck / 70) : 0;   // the landing burn beating on the deck
} else if (ONBOARD === 'tracking (ground)') {
rkTrack(ex, ey, ez, ship, RK_padOf(E), ez);
shake = 0;
}
if (shake > 0) { camera.position.x += (Math.random() - 0.5) * shake * 20; camera.position.y += (Math.random() - 0.5) * shake * 20; }
camera.updateProjectionMatrix();
}
function RK_padOf(E) { return (E && E.meta.pad) || [0, 0]; }
function fmtClock(t) { if (t == null) return ''; var s = Math.abs(t), m = Math.floor(s / 60), x = Math.floor(s % 60); return 'T' + (t < 0 ? '−' : '+') + ('0' + m).slice(-2) + ':' + ('0' + x).slice(-2); }
function audUnlock() {
if (AUD.ctx) { if (AUD.ctx.state === 'suspended') AUD.ctx.resume(); return; }
var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
try { AUD.ctx = new AC(); } catch (e) { return; }
var A = AUD.ctx, out = A.createDynamicsCompressor(); out.threshold.value = -16; out.ratio.value = 4; out.connect(A.destination); AUD.out = out;
if (A.createMediaStreamDestination) { AUD.rec = A.createMediaStreamDestination(); out.connect(AUD.rec); }
var master = A.createGain(); master.gain.value = AUD.on ? 0.9 : 0; master.connect(out);
var noise = function (sec, brown) { var n = Math.floor(A.sampleRate * sec), b = A.createBuffer(1, n, A.sampleRate), d = b.getChannelData(0), l = 0;
for (var i = 0; i < n; i++) { var w = Math.random() * 2 - 1; if (brown) { l = (l + 0.02 * w) / 1.02; d[i] = l * 3.5; } else d[i] = w; } return b; };
var loop = function (buf) { var s0 = A.createBufferSource(); s0.buffer = buf; s0.loop = true; s0.start(); return s0; };
var W = noise(3, false), B = noise(3, true);
var chain = function (src, type, f, Q) { var fl = A.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = Q || 0.7; var gn = A.createGain(); gn.gain.value = 0; src.connect(fl); fl.connect(gn); gn.connect(master); return { f: fl, g: gn }; };
AUD.nodes = { master: master, white: W, brown: B,
rumble: chain(loop(B), 'lowpass', 140, 0.5), roar: chain(loop(W), 'lowpass', 900, 0.4), crack: chain(loop(W), 'bandpass', 2600, 1.4),
wind: chain(loop(W), 'bandpass', 500, 0.6), fin: chain(loop(W), 'bandpass', 1350, 9),
sea: chain(loop(B), 'lowpass', 380, 0.5), surf: chain(loop(W), 'bandpass', 850, 0.45),
rcs: chain(loop(W), 'bandpass', 2400, 0.35) };
}
['pointerdown', 'keydown'].forEach(function (ev) { el.addEventListener(ev, audUnlock, true); });
function audBurst(o) {
var A = AUD.ctx; if (!A || !AUD.on) return;
var s0 = A.createBufferSource(); s0.buffer = o.brown ? AUD.nodes.brown : AUD.nodes.white; s0.loop = true;
var fl = A.createBiquadFilter(); fl.type = o.type || 'lowpass'; fl.frequency.value = o.f || 400; fl.Q.value = o.Q || 0.7;
var gn = A.createGain(), t0 = A.currentTime + (o.at || 0); gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(o.g || 1, t0 + (o.a || 0.005)); gn.gain.exponentialRampToValueAtTime(0.0005, t0 + (o.a || 0.005) + (o.d || 0.4));
s0.connect(fl); fl.connect(gn); gn.connect(AUD.nodes.master); s0.start(t0, Math.random() * 2); s0.stop(t0 + (o.a || 0.005) + (o.d || 0.4) + 0.1);
}
function audTone(f, d, g, at) { var A = AUD.ctx; if (!A || !AUD.on) return; var o = A.createOscillator(), gn = A.createGain(), t0 = A.currentTime + (at || 0); o.type = 'triangle'; o.frequency.value = f;
gn.gain.setValueAtTime(g, t0); gn.gain.exponentialRampToValueAtTime(0.0005, t0 + d); o.connect(gn); gn.connect(AUD.nodes.master); o.start(t0); o.stop(t0 + d + 0.05); }
function audSet(node, v, tc) { node.g.gain.setTargetAtTime(v, AUD.ctx.currentTime, tc || 0.12); }
function rankVoices(vs) {
var score = function (v) { var n = v.name; return (/online \(natural\)/i.test(n) ? 100 : /natural|neural/i.test(n) ? 80 : /premium|enhanced/i.test(n) ? 60 : /google/i.test(n) ? 40 : 0)
+ (/(andrew|brian|guy|christopher|eric|roger|steffan|ryan|thomas)/i.test(n) ? 8 : /(ava|emma|aria|jenny|michelle|sonia|libby)/i.test(n) ? 6 : 0) + (/en[-_]US/i.test(v.lang) ? 2 : /en[-_]GB/i.test(v.lang) ? 1 : 0); };
return vs.filter(function (v) { return /^en[-_]/i.test(v.lang); }).sort(function (a, b) { return score(b) - score(a); });
}
function bestVoice() {
if (AUD.voiceObj !== null && AUD.voiceObj !== undefined) return AUD.voiceObj;
var S = window.speechSynthesis; if (!S) return null;
var vs = S.getVoices() || []; if (!vs.length) return null;
var en = rankVoices(vs), pick = AUD.voiceName ? en.filter(function (v) { return v.name === AUD.voiceName; })[0] : null;
AUD.voiceObj = pick || en[0] || vs[0] || null; return AUD.voiceObj;
}
function say(text, urgent) {
var S = window.speechSynthesis; if (!S || !AUD.voice || !AUD.ctx) return;
try { if (urgent || S.speaking) S.cancel(); var u = new SpeechSynthesisUtterance(text), v = bestVoice(); if (v) { u.voice = v; u.lang = v.lang; } u.rate = 1.0; u.pitch = 0.98; u.volume = 1; S.speak(u); } catch (e) { /* no speech here */ }
}
if (window.speechSynthesis) try { window.speechSynthesis.onvoiceschanged = function () { AUD.voiceObj = undefined; }; } catch (e) { }
function rkCommentary(E, t, s) {
if (!E || E.kind === 'training' || !AUD.voice) return;
if (AUD.sayEp !== E.id) { AUD.sayEp = E.id; AUD.said = {}; AUD.prevT = null; }
var m = E.meta, ev = rkEvents(E) || {}, tt = t != null ? t : (typeof m.clock === 'number' ? m.clock : null); if (tt == null) return;
var prev = AUD.prevT; AUD.prevT = tt; if (prev == null) prev = tt - 0.01; if (tt < prev || tt - prev > 5) return;
var at = function (key, when, text, urgent) { if (when != null && prev < when && tt >= when && !AUD.said[key]) { AUD.said[key] = 1; say(text, urgent); } };
for (var k = 10; k >= 1; k--) at('c' + k, -k, k === 10 ? 'T minus 10' : String(k), true);
at('ign', -3, 'Ignition', true); at('lift', 0, 'Zero. Liftoff!', true);
at('tower', 9, 'The vehicle has cleared the tower.');
at('pitch', 22, 'Vehicle is pitching downrange. All systems nominal.');
at('mach1', ev.mach1, 'The vehicle is now supersonic.');
at('maxq', ev.maxq, 'Max-Q. The vehicle is passing through the highest aerodynamic pressure of the flight.');
at('meco', m.meco_t, 'MECO. Main engine cut-off.', true);
at('sep', m.sep_t, 'Stage separation confirmed.', true);
at('ses', m.sep_t != null ? m.sep_t + 4 : null, 'Second stage engine ignition. The second stage is on its way to orbit.');
at('flip', m.sep_t != null ? m.sep_t + 14 : null, 'The booster is flipping around with its cold gas thrusters, and its grid fins are out.');
at('fair', m.sep_t != null ? m.sep_t + 50 : null, 'Fairing separation.');
at('coast', m.sep_t != null ? m.sep_t + 95 : null, 'The booster is coasting at about ' + Math.round(s.alt / 1000) + ' kilometers, falling back toward the drone ship.');
at('entry', ev.entry, 'Entry burn startup. Three engines are slowing the booster down as it falls back into the atmosphere.', true);
at('entryEnd', ev.entryEnd, 'Entry burn shutdown. The landing controller takes over, steering with the grid fins.', true);
at('subsonic', AUD.subsonicT, 'The booster is now subsonic.');
at('landing', ev.landing, 'Landing burn startup.', true);
if (s.legs > 0.02 && AUD.prevLegs != null && AUD.prevLegs <= 0.02 && !AUD.said.legs) { AUD.said.legs = 1; say('Landing legs deploying.'); }
AUD.prevLegs = s.legs;
if (ev.touch != null && m.result && prev < ev.touch + 0.3 && tt >= ev.touch + 0.3 && !AUD.said.touch) {
AUD.said.touch = 1; var R = m.result;
say(R.landed ? 'Touchdown! The booster has landed on the drone ship.' : R.on_deck ? 'The booster came down too hard on the deck. We have lost the booster.' : 'We have lost the booster.', true);
}
}
setInterval(function () {
if (!AUD.ctx || !AUD.nodes) return;
if (performance.now() - (AUD.updAt || 0) > 350) ['rumble', 'roar', 'crack', 'wind', 'fin', 'sea', 'surf', 'rcs'].forEach(function (k) { AUD.nodes[k].g.gain.setTargetAtTime(0, AUD.ctx.currentTime, 0.08); });
}, 200);
document.addEventListener('visibilitychange', function () { if (!AUD.ctx) return; if (document.hidden) AUD.ctx.suspend(); else if (AUD.on) AUD.ctx.resume(); });
function rkSound(E, t, dt, s) {
AUD.updAt = performance.now();
rkCommentary(E, t, s);
if (!AUD.ctx || !AUD.nodes) return;
var N = AUD.nodes; N.master.gain.setTargetAtTime(AUD.on ? 0.9 : 0, AUD.ctx.currentTime, 0.1);
if (!AUD.on) return;
var air = Math.exp(-Math.max(0, s.alt) / 7000), near = 1 / Math.pow(1 + s.dist / 400, 0.65), lit = s.lit && s.thrust > 0.02 && !(E && E.meta.result && rkTouchT(E) != null && t >= rkTouchT(E)) ? 1 : 0; // engines off: no engine sound
var th = Math.min(1, s.thrust / 9) * 0.6 + (s.lit ? 0.4 : 0), loud = air * near * lit;
audSet(N.rumble, 1.1 * loud * (0.5 + 0.5 * th)); audSet(N.roar, 0.55 * loud * (0.4 + 0.6 * th)); N.roar.f.frequency.setTargetAtTime(500 + 900 * th * near, AUD.ctx.currentTime, 0.2);
audSet(N.crack, 0, 0.1);
var down = E && E.meta.result && rkTouchT(E) != null && t >= rkTouchT(E) - 0.05;
var qn = down ? 0 : Math.min(1, s.q / 30000) * Math.min(1, air * 6) * near;
audSet(N.wind, 0.5 * qn); N.wind.f.frequency.setTargetAtTime(350 + 900 * qn, AUD.ctx.currentTime, 0.3);
audSet(N.fin, (E && E.meta.handover_t && t > E.meta.meco_t + 30 ? 0.12 : 0) * qn);
var rcsOn = s.rcs > 0.06 && !down ? Math.min(1, 0.3 + s.rcs) : 0;
audSet(N.rcs, 0.16 * rcsOn * Math.max(0.3, Math.min(1, air * 40)) * Math.min(1, near * 1.5), 0.15);
var sn = s.seaNear || 0, ss = 0.5 + 0.8 * (s.sea || 0), wt = performance.now() / 1000;
var swell = 0.62 + 0.25 * Math.sin(wt * 0.9) + 0.13 * Math.sin(wt * 2.3 + 1.7);
audSet(N.sea, 0.5 * sn * ss * swell, 0.6); audSet(N.surf, 0, 0.3);
var L = AUD.last, key = E ? E.id : '';
if (L.ep !== key) { AUD.last = L = { ep: key, lit: s.lit, legs: s.legs, mach: s.mach, booms: s.booms, t: t }; return; }
var big = t != null && L.t != null && Math.abs(t - L.t) > 3; L.t = t;
if (!big) {
if (s.lit && !L.lit && air > 0.02) { audBurst({ f: 180, g: 1.2 * air * near, d: 0.6, brown: true }); audBurst({ type: 'highpass', f: 2500, g: 0.25 * air * near, d: 0.25 }); }
if (s.legs > 0.01 && L.legs <= 0.01) audBurst({ type: 'highpass', f: 1800, g: 0.35 * near * Math.max(0.2, air), a: 0.05, d: 1.4 });
if (s.legs >= 0.99 && L.legs < 0.99) { audBurst({ f: 120, g: 0.9 * near, d: 0.35, brown: true }); audTone(190, 0.6, 0.12 * near); audTone(410, 0.4, 0.05 * near); }
if (s.mach < 1 && L.mach >= 1 && s.alt < 30000 && E && t > (E.meta.meco_t || 0) + 60) {
AUD.subsonicT = (t || 0) + 1.5; var bg = 1.4 * Math.max(0.3, air);
audBurst({ f: 160, g: bg, d: 0.5, brown: true, at: 0.3 }); audBurst({ f: 160, g: bg * 0.85, d: 0.5, brown: true, at: 0.48 }); audBurst({ f: 140, g: bg * 0.7, d: 0.7, brown: true, at: 0.9 }); }
if (s.booms > L.booms) { audBurst({ f: 110, g: 2.2 * near, d: 3.2, a: 0.02, brown: true }); audBurst({ f: 900, g: 0.5 * near, d: 1.2 }); audBurst({ type: 'bandpass', f: 2400, Q: 1.2, g: 0.3 * near, d: 2.5, at: 0.2 }); }
if (E && E.meta.result && rkTouchT(E) != null && L.tt == null && t >= rkTouchT(E)) { L.tt = 1; audBurst({ f: 90, g: 1.3 * near, d: 0.5, brown: true }); audTone(140, 0.8, 0.1 * near); }
}
L.lit = s.lit; L.legs = s.legs; L.mach = s.mach; L.booms = s.booms;
}
var CAST_FONT = "'D-DIN','DIN Alternate','DIN Next','Bahnschrift','Barlow','Roboto Condensed','Arial Narrow',Inter,sans-serif";
var rkUnderUi = document.createElement('div');
rkUnderUi.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .25s;background:radial-gradient(ellipse at 50% 30%, rgba(20,90,120,.18), rgba(0,20,35,.55))';
ui.insertBefore(rkUnderUi, ui.firstChild);
var rkDropsUi = document.createElement('div');
rkDropsUi.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;display:none';
ui.insertBefore(rkDropsUi, rkUnderUi.nextSibling);
var DROPS = { ep: null, list: [], wetT: null };
function rkDrops(E, t, hDeck, lit, dt) {
var on = ONBOARD === 'drone ship deck' && E && t != null;
rkDropsUi.style.display = on ? '' : 'none';
if (!on) return;
if (DROPS.ep !== E.id || (DROPS.wetT != null && t < DROPS.wetT - 1)) { DROPS.ep = E.id; DROPS.wetT = null; DROPS.list.forEach(function (d) { d.el.remove(); }); DROPS.list = []; }
var tt0 = rkTouchT(E), rate = tt0 != null && t > tt0 - 0.6 && t < tt0 + 1.2 ? 45 : 0;
if (tt0 != null && t >= tt0 + 1.2 && t < tt0 + 7) rate = 3;
var n = rate * Math.min(0.1, dt || 0); n = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
for (var i = 0; i < n && DROPS.list.length < 70; i++) {
if (DROPS.wetT == null) DROPS.wetT = t;
var sz = 5 + Math.pow(Math.random(), 2.2) * 38, el = document.createElement('div'), x = Math.random() * 100, y = Math.random() * 100;
el.style.cssText = 'position:absolute;left:' + x + '%;top:' + y + '%;width:' + sz + 'px;height:' + (sz * (0.85 + Math.random() * 0.3)) + 'px;border-radius:50%;'
+ 'transform:translate(-50%,-50%);backdrop-filter:blur(' + (1 + sz / 14).toFixed(1) + 'px) brightness(1.12) saturate(0.9);-webkit-backdrop-filter:blur(' + (1 + sz / 14).toFixed(1) + 'px) brightness(1.12);'
+ 'background:radial-gradient(circle at 38% 32%,rgba(255,255,255,.45) 0,rgba(255,255,255,.08) 22%,rgba(255,255,255,0) 45%,rgba(0,0,0,.10) 78%,rgba(0,0,0,.22) 100%);'
+ 'box-shadow:inset 0 -1px 2px rgba(255,255,255,.25),0 1px 2px rgba(0,0,0,.18);opacity:0;transition:opacity .2s';
rkDropsUi.appendChild(el); requestAnimationFrame(function (e) { return function () { e.style.opacity = '0.95'; }; }(el));
DROPS.list.push({ el: el, x: x, y: y, sz: sz, run: sz > 22 && Math.random() < 0.5 ? 1.5 + Math.random() * 4 : 0 });
}
DROPS.list.forEach(function (d) { if (d.run) { d.y += d.run * Math.min(0.1, dt || 0); d.el.style.top = d.y + '%'; if (d.y > 110) d.run = 0; } });
}
var rkCast = document.createElement('div');
rkCast.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:calc(150px * var(--s,1));display:none;pointer-events:none;font-family:' + CAST_FONT + ';color:#fff;--s:1;'
+ 'background:linear-gradient(0deg,rgba(0,0,0,.78) 0%,rgba(0,0,0,.5) 45%,rgba(0,0,0,0) 100%);text-shadow:0 1px 2px rgba(0,0,0,.45)';
function rkGauge(cls, label) {
return '<div class="' + cls + '" style="position:relative;width:calc(86px * var(--s));height:calc(86px * var(--s))"><svg viewBox="0 0 100 100" width="100%" height="100%">'
+ '<circle cx="50" cy="50" r="43" fill="none" stroke="rgba(255,255,255,.32)" stroke-width="1.6" stroke-dasharray="172.2 270.2" transform="rotate(135 50 50)"/>'
+ '<circle cx="50" cy="50" r="43" fill="none" stroke="#e8322b" stroke-width="2.6" stroke-dasharray="0 172.2 30.4 270.2" transform="rotate(135 50 50)"/>'
+ '<circle class="arc" cx="50" cy="50" r="43" fill="none" stroke="#fff" stroke-width="3.4" stroke-dasharray="0 270.2" transform="rotate(135 50 50)"/></svg>'
+ '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1">'
+ '<span style="font-size:calc(8.5px * var(--s));letter-spacing:.12em;font-weight:600;opacity:.92;margin-bottom:calc(2px * var(--s))">' + label + '</span>'
+ '<b class="val" style="font-size:calc(23px * var(--s));font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:.02em">0</b>'
+ '<span class="unit" style="font-size:calc(7.5px * var(--s));letter-spacing:.14em;font-weight:600;opacity:.85;margin-top:calc(2px * var(--s))"></span></div></div>';
}
function rkEngines() {
var c = '<circle cx="50" cy="50" r="42" fill="none" stroke="#fff" stroke-width="2"/>';
for (var i = 0; i < 9; i++) { var a = (i - 1) / 8 * Math.PI * 2 - Math.PI / 2, rr = i === 0 ? 0 : 24; c += '<circle class="e' + i + '" cx="' + (50 + Math.cos(a) * rr).toFixed(1) + '" cy="' + (50 + Math.sin(a) * rr).toFixed(1) + '" r="7.6" fill="rgba(255,255,255,.14)" stroke="rgba(255,255,255,.4)" stroke-width="1"/>'; }
return '<div style="width:calc(86px * var(--s));height:calc(86px * var(--s))"><svg viewBox="0 0 100 100" width="100%" height="100%">' + c + '</svg></div>';
}
var castBox = 'position:absolute;bottom:calc(12px * var(--s));display:flex;flex-direction:column;align-items:center;gap:calc(5px * var(--s));transition:opacity .5s';
var castLbl = 'font-size:calc(10px * var(--s));letter-spacing:.14em;font-weight:700';
rkCast.innerHTML = '<svg class="rkarc" style="position:absolute;left:17%;width:66%;top:0;height:100%;overflow:hidden"></svg>'
+ '<div class="rkclk" style="position:absolute;left:50%;transform:translateX(-50%);top:calc(64px * var(--s));font-size:calc(30px * var(--s));font-weight:600;letter-spacing:.04em;font-variant-numeric:tabular-nums;white-space:nowrap">T-00:00:10</div>'
+ '<div class="rkmn" style="position:absolute;left:50%;transform:translateX(-50%);top:calc(100px * var(--s));font-size:calc(11px * var(--s));letter-spacing:.16em;font-weight:600;opacity:.9;white-space:nowrap"></div>'
+ '<div class="rk1" style="' + castBox + ';left:calc(26px * var(--s))"><div style="display:flex;gap:calc(14px * var(--s))">' + rkGauge('sp', 'SPEED') + rkGauge('al', 'ALTITUDE') + '</div><div style="' + castLbl + '">STAGE 1 TELEMETRY</div></div>'
+ '<div class="rk2" style="' + castBox + ';right:calc(26px * var(--s))"><div style="display:flex;gap:calc(14px * var(--s))">' + rkGauge('sp', 'SPEED') + rkGauge('al', 'ALTITUDE') + '</div><div style="' + castLbl + '">STAGE 2 TELEMETRY</div></div>'
+ '<div class="rkg" style="' + castBox + ';right:calc(26px * var(--s))"><div style="display:flex;gap:calc(14px * var(--s))">' + rkGauge('gf', 'G-FORCE') + rkEngines() + '</div><div style="' + castLbl + '">STAGE 1 ENGINES</div></div>';
ui.appendChild(rkCast);
el.addEventListener('pointerenter', function () { RK.hover = true; }); el.addEventListener('pointermove', function () { RK.hover = true; }); el.addEventListener('pointerleave', function () { RK.hover = false; });
var rkCap = document.createElement('div');
rkCap.style.cssText = 'position:absolute;left:50%;top:13%;transform:translate(-50%,0);font:600 calc(15px * var(--s,1)) ' + CAST_FONT + ';letter-spacing:.22em;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.7);display:none;pointer-events:none;white-space:nowrap';
ui.appendChild(rkCap);
function capCompose() {
var src = renderer.domElement, W = src.width, H = src.height;
var c = CAP.comp || (CAP.comp = document.createElement('canvas'));
if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
var g = c.getContext('2d');
g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.shadowColor = 'transparent';
g.drawImage(src, 0, 0, W, H);
try { paintCast(g, W, H); } catch (e) { /* the overlay is a nicety: the frame stands without it */ }
return c;
}
function capSource() { return CAP.comp && (CAP.rec || CAP.offline || CAP.pic) ? CAP.comp : renderer.domElement; }
function paintCast(g, W, H) {
var er = el.getBoundingClientRect(), eW = er.width || 1, eH = er.height || 1, s = W / eW;
var shown = function (n) { return n && n.style.display !== 'none' && getComputedStyle(n).display !== 'none'; };
var alphaOf = function (n, root) { var a = 1; for (var p = n; p && p !== root.parentNode; p = p.parentNode) { if (p.nodeType === 1) a *= +getComputedStyle(p).opacity; } return a; };
var num = function (v, d) { var x = parseFloat(v); return isFinite(x) ? x : d; };
function paintText(n, root, map, shadow) {
var cs = getComputedStyle(n), rg = document.createRange();
for (var k = n.firstChild; k; k = k.nextSibling) {
if (k.nodeType !== 3 || !k.textContent.trim()) continue;
rg.selectNodeContents(k); var b = rg.getBoundingClientRect(); if (!b.width) continue;
var ls = num(cs.letterSpacing, 0), p = map(b.left + b.width / 2 - er.left - ls / 2, b.top + b.height / 2 - er.top);
g.save(); g.globalAlpha = alphaOf(n, root);
g.font = cs.fontWeight + ' ' + (num(cs.fontSize, 12) * s).toFixed(2) + 'px ' + cs.fontFamily;
if ('letterSpacing' in g) g.letterSpacing = (ls * s).toFixed(2) + 'px';
g.fillStyle = cs.color; g.textAlign = 'center'; g.textBaseline = 'middle';
if (shadow) { g.shadowColor = shadow[0]; g.shadowBlur = shadow[1] * s; g.shadowOffsetY = s; }
g.fillText(k.textContent.trim(), p[0], p[1]); g.restore();
}
}
function paintSvg(svg, root, map) {
var b = svg.getBoundingClientRect(); if (!b.width) return;
var vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal : null;
var k = vb ? b.width / vb.width : 1, o = map(b.left - er.left, b.top - er.top), a0 = alphaOf(svg, root);
g.save(); g.translate(o[0], o[1]); g.scale(k * s, k * s);
if (!vb) { g.beginPath(); g.rect(0, 0, b.width, b.height); g.clip(); }
svg.querySelectorAll('circle,path,text').forEach(function (n) {
var at = function (x) { return n.getAttribute(x); };
g.save(); g.globalAlpha = a0 * num(at('opacity'), 1);
var tr = /rotate\(\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*\)/.exec(at('transform') || '');
if (tr) { g.translate(+tr[2], +tr[3]); g.rotate(+tr[1] * Math.PI / 180); g.translate(-tr[2], -tr[3]); }
var fill = at('fill'), stroke = at('stroke');
if (n.tagName === 'text') {
var cs = getComputedStyle(n);
g.font = cs.fontWeight + ' ' + num(cs.fontSize, 10).toFixed(2) + 'px ' + cs.fontFamily;
if ('letterSpacing' in g) g.letterSpacing = num(cs.letterSpacing, 0).toFixed(2) + 'px';
g.textAlign = at('text-anchor') === 'middle' ? 'center' : at('text-anchor') === 'end' ? 'right' : 'left';
g.textBaseline = at('dominant-baseline') === 'hanging' ? 'hanging' : at('dominant-baseline') === 'middle' ? 'middle' : 'alphabetic';
g.fillStyle = fill || '#fff'; g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 2 * s / k;
g.fillText(n.textContent, num(at('x'), 0), num(at('y'), 0)); g.restore(); return;
}
var path;
if (n.tagName === 'circle') { path = new Path2D(); path.arc(num(at('cx'), 0), num(at('cy'), 0), num(at('r'), 0), 0, Math.PI * 2); }
else path = new Path2D(at('d') || '');
if (fill && fill !== 'none') { g.fillStyle = fill; g.fill(path); }
if (stroke && stroke !== 'none') {
var da = (at('stroke-dasharray') || '').split(/[\s,]+/).filter(Boolean).map(Number);
if (da.length) { if (da.every(function (x) { return !x; })) { g.restore(); return; } g.setLineDash(da); }
g.strokeStyle = stroke; g.lineWidth = num(at('stroke-width'), 1); g.stroke(path);
}
g.restore();
});
g.restore();
}
if (shown(rkCamUi)) {
var vg = g.createRadialGradient(W / 2, H / 2, Math.hypot(W, H) * 0.5 * 0.55, W / 2, H / 2, Math.hypot(W, H) * 0.5);
vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
var nz = rkCamUi.querySelector('.rkn'); g.save(); g.globalAlpha = num(getComputedStyle(nz).opacity, 0.05); g.drawImage(nz, 0, 0, W, H); g.restore();
if (shown(rkCamUi.querySelector('.rkg'))) { g.fillStyle = 'rgba(0,0,0,.25)'; for (var yy = 0; yy < H; yy += 5 * s) g.fillRect(0, yy + 2 * s, W, 3 * s); }
if (shown(rkCamUi.querySelector('.rkd'))) { g.fillStyle = 'rgba(20,22,26,.55)'; g.fillRect(0, 0, W, H); }
var lab = rkCamUi.querySelector('.rkl'), dot = lab.previousSibling, db = dot.getBoundingClientRect();
g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc((db.left - er.left + db.width / 2) * s, (db.top - er.top + db.height / 2) * s, db.width / 2 * s, 0, Math.PI * 2); g.fill();
var tl = function (x, y) { return [x * s, y * s]; };
rkCamUi.querySelectorAll('div,span').forEach(function (n) { if (shown(n)) paintText(n, rkCamUi, tl, ['rgba(0,0,0,.9)', 2]); });
}
if (shown(rkCast)) {
var cb = rkCast.getBoundingClientRect(), bot = function (x, y) { return [x * s, H - (eH - y) * s]; }, top0 = H - (eH - (cb.top - er.top)) * s;
var gr = g.createLinearGradient(0, H, 0, top0); gr.addColorStop(0, 'rgba(0,0,0,.78)'); gr.addColorStop(0.45, 'rgba(0,0,0,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
g.fillStyle = gr; g.fillRect(0, top0, W, H - top0);
rkCast.querySelectorAll('svg').forEach(function (v) { paintSvg(v, rkCast, bot); });
rkCast.querySelectorAll('div,span,b').forEach(function (n) { paintText(n, rkCast, bot, ['rgba(0,0,0,.45)', 2]); });
}
if (shown(rkCap) && rkCap.textContent) {
var capY = H * 0.13 - (eH * 0.13) * s;
paintText(rkCap, rkCap, function (x, y) { return [W / 2 + (x - eW / 2) * s, capY + y * s]; }, ['rgba(0,0,0,.7)', 6]);
}
if (mode === 'car') paintCar(g, W, H, s, er, shown, paintText);
if (mode === 'village' || mode === 'humanoid') { paintCar(g, W, H, s, er, shown, paintText); paintVillage(g, W, H, s, er, shown, paintText); }
if (mode === 'humanoid') {
var pd = function (root) { if (root && shown(root)) paintDom(g, s, er, root, shown, paintText); };
if (typeof HMA !== 'undefined' && HMA) pd(HMA.box);
if (typeof HMP !== 'undefined' && HMP) pd(HMP.box);
pd(evEl);
}
}
function paintDom(g, s, er, root, shown, paintText) {
var at = function (x, y) { return [x * s, y * s]; }, num = function (v, d) { var x = parseFloat(v); return isFinite(x) ? x : d; };
var alphaOf = function (n) { var a = 1; for (var p = n; p && p !== root.parentNode; p = p.parentNode) { if (p.nodeType === 1) a *= +getComputedStyle(p).opacity; } return a; };
var all = [root].concat(Array.prototype.slice.call(root.querySelectorAll('*')));
all.forEach(function (n) {
if (!shown(n)) return;
var cs = getComputedStyle(n), b = n.getBoundingClientRect(); if (!b.width || !b.height) return;
var x = (b.left - er.left) * s, y = (b.top - er.top) * s, w = b.width * s, h = b.height * s, r = num(cs.borderTopLeftRadius, 0) * s, a = alphaOf(n);
var bg = cs.backgroundColor, bw = num(cs.borderTopWidth, 0);
if ((bg && bg !== 'transparent' && !/rgba\([^)]*,\s*0\)/.test(bg)) || (bw > 0 && cs.borderTopStyle !== 'none')) {
g.save(); g.globalAlpha = a; g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h);
if (bg && !/rgba\([^)]*,\s*0\)/.test(bg)) { g.fillStyle = bg; g.fill(); }
if (bw > 0 && cs.borderTopStyle !== 'none') { g.strokeStyle = cs.borderTopColor; g.lineWidth = bw * s; g.stroke(); }
g.restore();
}
if (n.tagName === 'CANVAS') { g.save(); g.globalAlpha = a; g.drawImage(n, x, y, w, h); g.restore(); }
});
all.forEach(function (n) { if (shown(n) && n.tagName !== 'CANVAS') paintText(n, root, at); });
}
function paintCar(g, W, H, s, er, shown, paintText) {
var at = function (x, y) { return [x * s, y * s]; };
var visible = function (n) { return shown(n) && getComputedStyle(n).visibility !== 'hidden'; };
var box = function (n, rad) {
var b = n.getBoundingClientRect(), cs = getComputedStyle(n), x = (b.left - er.left) * s, y = (b.top - er.top) * s, w = b.width * s, h = b.height * s, r = rad * s;
g.save(); g.fillStyle = cs.backgroundColor || 'rgba(10,14,22,.6)'; g.beginPath();
if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h);
g.fill(); g.restore(); return [x, y, w, h];
};
var hudEl = ui.querySelector('.hud');
if (hudEl && visible(hudEl)) { box(hudEl, 10); hudEl.querySelectorAll('div,span').forEach(function (n) { paintText(n, hudEl, at); }); }
if (visible(crNoz)) { var bx = box(crNoz, 10); g.drawImage(crNoz, bx[0], bx[1], bx[2], bx[3]); }
if (visible(crBan)) { box(crBan, 14); paintText(crBan, crBan, at); crBan.querySelectorAll('div').forEach(function (n) { paintText(n, crBan, at); }); }
if (visible(crCnt) && CR.cnt) {
var eb = el.getBoundingClientRect(), k = 0.45 + 1.35 * CR.cnt.s, a = Math.max(0, 1 - Math.pow(CR.cnt.s, 1.6));
g.save(); g.globalAlpha = a; g.font = '900 ' + (170 * k * s).toFixed(1) + 'px Inter,-apple-system,Segoe UI,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
g.fillStyle = '#f6f7fa'; g.shadowColor = 'rgba(255,60,40,.6)'; g.shadowBlur = 40 * s * k;
g.fillText(String(CR.cnt.n), eb.width * 0.5 * s, eb.height * 0.42 * s); g.restore();
}
}
function setGauge(root, cls, frac, val, unit) {
var g = root.querySelector('.' + cls); if (!g) return;
g.querySelector('.arc').setAttribute('stroke-dasharray', (202.6 * Math.max(0, Math.min(1, frac))).toFixed(1) + ' 270.2');
var v = g.querySelector('.val'), u = g.querySelector('.unit');
if (v.textContent !== val) v.textContent = val; if (u.textContent !== unit) u.textContent = unit;
}
function clockText(t) { if (t == null) return 'T- --:--:--'; var a = Math.abs(t), h = Math.floor(a / 3600), m = Math.floor(a / 60) % 60, x = Math.floor(a % 60); return 'T' + (t < 0 ? '-' : '+') + ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2) + ':' + ('0' + x).slice(-2); }
function s2End(E) { var S = E.s2, tl = S[S.length - 1][0], fl = E.frames.length ? E.frames[E.frames.length - 1][0] : -1e9; return E.done || fl > tl + 2 ? 1e9 : tl + 2; }
function s2At(E, t, out) {
var S = E.s2, n = S.length, tl = S[n - 1][0];
if (t <= tl || n < 2) return frameLerp(S, Math.min(t, tl), out);
var a = S[n - 2], b = S[n - 1], k = (t - tl) / Math.max(0.05, b[0] - a[0]);
for (var i = 0; i < b.length; i++) out[i] = b[i]; out[0] = t; out[1] = b[1] + (b[1] - a[1]) * k; out[2] = b[2] + (b[2] - a[2]) * k; out[3] = b[3] + (b[3] - a[3]) * k;
return out;
}
function s2State(E, t) {
var S = E && E.s2; if (!S || S.length < 2 || t == null || t < S[0][0] || t > s2End(E)) return null;
var a = s2At(E, t, []), b = s2At(E, t + 0.5, []), dtt = 0.5;
return { v: Math.hypot(b[1] - a[1], b[2] - a[2], b[3] - a[3]) / dtt, h: a[3] };
}
var GROW = [];
function gForce(E, t) {
if (!E || t == null || !E.frames.length || RF.vx == null) return 1;
var F = E.frames; if (t < F[0][0] + 0.3) return 1;
var a = frameLerp(F, t - 0.3, GROW), ax = a[RF.vx], ay = a[RF.vy], az = a[RF.vz], b = frameLerp(F, t, GROW);
return Math.hypot((b[RF.vx] - ax) / 0.3, (b[RF.vy] - ay) / 0.3, (b[RF.vz] - az) / 0.3 + 9.81) / 9.81;
}
var ENG_SETS = { 0: [], 1: [0], 3: [0, 1, 5], 9: [0, 1, 2, 3, 4, 5, 6, 7, 8] };
function arcAngle(dt, amax) { var s = dt < 0 ? -1 : 1; return s * amax * Math.min(1.05, Math.asinh(Math.abs(dt) / 45) / Math.asinh(560 / 45)); }
function rkCastUpdate(E, t, r, alt) {
var ev = rkEvents(E), meta = E.meta, mission = E.kind !== 'training';
rkCast.style.display = mission ? 'block' : 'none';
if (!mission) { rkCap.style.display = 'none'; return; }
var Wv = el.clientWidth || 800, sc = Math.max(0.5, Math.min(1.15, Wv / 1150));
if (RK.castS !== sc) { RK.castS = sc; rkCast.style.setProperty('--s', sc.toFixed(3)); rkCap.style.setProperty('--s', sc.toFixed(3)); }
var v1 = r ? Math.hypot(r[RF.vx], r[RF.vy], r[RF.vz]) * 3.6 : 0, h1 = r ? Math.max(0, alt) / 1000 : 0;
var g1 = rkCast.querySelector('.rk1'), g2 = rkCast.querySelector('.rk2'), gg = rkCast.querySelector('.rkg');
setGauge(g1, 'sp', v1 / 9500, Math.round(v1).toString(), 'KM/H'); setGauge(g1, 'al', h1 / 180, h1 < 100 ? h1.toFixed(1) : Math.round(h1).toString(), 'KM');
var sep = meta.sep_t != null ? meta.sep_t : 1e9, s2 = t != null && t >= sep ? s2State(E, t) : null;
var eng = r && RF.engines != null ? r[RF.engines] : 0, lit = eng > 0 && (RF.thrust == null || r[RF.thrust] > 0);
var showEng = !s2 || t < sep + 25 || lit || (RK.engOffAt != null && t - RK.engOffAt < 6);
if (lit) RK.engOffAt = t;
g2.style.opacity = showEng ? '0' : '1'; gg.style.opacity = showEng ? '1' : '0';
if (s2) setGauge(g2, 'sp', s2.v * 3.6 / 28000, Math.round(s2.v * 3.6).toString(), 'KM/H'), setGauge(g2, 'al', s2.h / 1000 / 260, s2.h < 100000 ? (s2.h / 1000).toFixed(1) : Math.round(s2.h / 1000).toString(), 'KM');
var gf = gForce(E, t); RK.gfS = RK.gfS == null ? gf : RK.gfS + (gf - RK.gfS) * 0.15;
setGauge(gg, 'gf', RK.gfS / 6, RK.gfS.toFixed(1), 'G');
var set = ENG_SETS[lit ? eng : 0] || ENG_SETS[9].slice(0, eng), key0 = set.join(',');
if (gg.dataset.k !== key0) { gg.dataset.k = key0; for (var i = 0; i < 9; i++) { var c = gg.querySelector('.e' + i), on = set.indexOf(i) >= 0; c.setAttribute('fill', on ? '#fff' : 'rgba(255,255,255,.14)'); c.setAttribute('stroke', on ? '#fff' : 'rgba(255,255,255,.4)'); } }
var tt = t != null ? t : (typeof meta.clock === 'number' ? meta.clock : null);
var ck = rkCast.querySelector('.rkclk'), txt = clockText(tt); if (ck.textContent !== txt) ck.textContent = txt;
var mn = rkCast.querySelector('.rkmn'), mtx = String(meta.mission || meta.label || 'Demo flight').toUpperCase(); if (mn.textContent !== mtx) mn.textContent = mtx;
var L = ev ? ev.list : [[-3, 'STARTUP', 'ENGINE STARTUP'], [0, 'LIFTOFF', 'LIFTOFF']];
var svg = rkCast.querySelector('.rkarc'), Wd = svg.clientWidth || Wv * 0.66, Hd = svg.clientHeight || 150 * sc;
var now = tt == null ? -10 : tt, key = Math.round(Wd) + '|' + L.map(function (e) { return Math.round(e[0]); }).join(',') + '|' + Math.round(now * 4);
if (svg.dataset.k !== key) {
svg.dataset.k = key;
var R = Wd * 1.05, cx = Wd / 2, y0 = 30 * sc, cy = y0 + R, amax = Math.asin(Math.min(0.99, (Wd / 2) / R)) * 0.97;
var P = function (a, rr) { return [cx + rr * Math.sin(a), cy - rr * Math.cos(a)]; };
var arcPath = function (a0, a1, rr) { var p0 = P(a0, rr), p1 = P(a1, rr); return 'M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' A' + rr.toFixed(1) + ' ' + rr.toFixed(1) + ' 0 0 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1); };
var h = '<path d="' + arcPath(-amax, 0, R) + '" fill="none" stroke="#fff" stroke-width="' + (2.4 * sc).toFixed(2) + '"/>'
+ '<path d="' + arcPath(0, amax, R) + '" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="' + (1.6 * sc).toFixed(2) + '"/>';
var lastUp = -1e9, lastDn = -1e9, gap = 64 * sc / R; // labels take turns above and below the arc; one that would touch another is left out
L.forEach(function (e, k) {
if (!e[1]) return;
var a = arcAngle(e[0] - now, amax); if (Math.abs(a) > amax) return;
var p = P(a, R), past = now >= e[0], near = Math.abs(e[0] - now) < 6, deg = a * 180 / Math.PI;
var w = gap * Math.max(0.6, e[1].length / 7), up = a - lastUp >= w ? true : a - lastDn >= w ? false : null;
if (up === true) lastUp = a; else if (up === false) lastDn = a;
var q = P(a, R + (up ? 13 : -13) * sc);
var fade = Math.max(0.35, 1 - Math.abs(a) / amax * 0.6);
h += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + ((near ? 5.2 : 4.2) * sc).toFixed(1) + '" fill="' + (past ? '#fff' : '#0a0a0a') + '" stroke="#fff" stroke-width="' + (1.6 * sc).toFixed(2) + '" opacity="' + fade.toFixed(2) + '"/>';
if (up !== null) h += '<text x="' + q[0].toFixed(1) + '" y="' + q[1].toFixed(1) + '" transform="rotate(' + deg.toFixed(1) + ' ' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')" text-anchor="middle" dominant-baseline="' + (up ? 'auto' : 'hanging') + '" fill="#fff" opacity="' + (near ? 1 : fade * 0.92).toFixed(2) + '" style="font:' + (near ? 700 : 600) + ' ' + (9.5 * sc).toFixed(1) + 'px ' + CAST_FONT.replace(/"/g, '') + ';letter-spacing:.08em">' + esc(e[1]) + '</text>';
});
svg.innerHTML = h;
}
if (tt != null) L.forEach(function (e) { if (RK.capPrev != null && RK.capPrev < e[0] && tt >= e[0] && tt - e[0] < 2) { RK.capText = e[2] || e[1]; RK.capUntil = tt + 4; } });
RK.capPrev = tt;
var showCap = RK.capText && tt != null && tt < RK.capUntil && tt > RK.capUntil - 6;
rkCap.style.display = showCap ? 'block' : 'none'; if (showCap && rkCap.textContent !== RK.capText) rkCap.textContent = RK.capText;
}
function rkHud(E, t, r, alt, ship, ex, ey, engines, thrust, prop) {
var castOn = E && E.kind !== 'training';
ui.querySelector('.hud').style.display = castOn ? 'none' : '';
var cp = ctlEl.parentElement;
if (RK.castLay !== castOn) {
RK.castLay = castOn;
cp.style.bottom = castOn ? 'auto' : '56px'; cp.style.top = castOn ? '58px' : '';
barEl.style.top = castOn ? '12px' : ''; barEl.style.bottom = castOn ? 'auto' : '12px';
evEl.style.display = numEl.style.display = castOn ? 'none' : ''; var wb = ui.querySelector('.wind'); if (wb) wb.style.visibility = castOn ? 'hidden' : '';
barEl.style.transition = cp.style.transition = 'opacity .35s';
}
if (E) rkCastUpdate(E, t, r, alt); else rkCast.style.display = 'none';
var hide = castOn && !RK.hover;
if (RK.hidden !== hide) { RK.hidden = hide; barEl.style.opacity = cp.style.opacity = hide ? '0' : '1'; barEl.style.pointerEvents = hide ? 'none' : 'auto'; cp.style.pointerEvents = hide ? 'none' : ''; }
var g = function (k, d) { var i = RF[k]; return r && i != null ? r[i] : d; };
var meta = E ? E.meta : {}, rows = [];
var v = r ? Math.sqrt(g('vx', 0) * g('vx', 0) + g('vy', 0) * g('vy', 0) + g('vz', 0) * g('vz', 0)) : 0;
if (E && E.kind !== 'training') rows.push(['clock', fmtClock(t != null ? t : meta.clock)]);
else if (r) rows.push(['time', (t - E.frames[0][0]).toFixed(1) + ' s']);
if (r) {
rows.push(['altitude', alt > 2000 ? (alt / 1000).toFixed(1) + ' km' : Math.max(0, alt).toFixed(0) + ' m']);
rows.push(['speed', Math.round(v * 3.6).toLocaleString() + ' km/h']);
rows.push(['vertical', g('vz', 0).toFixed(0) + ' m/s']);
var dsh = Math.hypot(ex - ship[0], ey - ship[1]); rows.push(['to the ship', dsh > 2000 ? (dsh / 1000).toFixed(1) + ' km' : dsh.toFixed(0) + ' m']);
rows.push(['engines', engines ? engines + ' · ' + Math.round(100 * thrust / Math.max(1, engines)) + '%' : 'off']);
rows.push(['propellant', (prop / 1000).toFixed(1) + ' t']);
if (g('mach', 0) > 0.3) rows.push(['mach', g('mach', 0).toFixed(1)]);
}
hudRows.innerHTML = rows.map(function (x) { return '<span style="opacity:.65">' + esc(x[0]) + '</span><span>' + esc(x[1]) + '</span>'; }).join('');
var ph = '';
if (E && E.kind === 'mission' && t != null) {
var mc = meta.meco_t || 1e9, ho = meta.handover_t || 1e9, done = meta.result && E.done && t >= F_end(E) - 0.05;
ph = t < 0 ? 'countdown' : t < mc ? 'ascent' : t < mc + 3 ? 'main engine cut-off' : t < mc + 40 ? 'separation and flip' : engines === 3 ? 'entry burn' : t < ho ? 'coast' : done ? (meta.result.landed ? 'landed' : meta.result.on_deck ? 'hard landing' : 'lost') : engines ? 'landing burn' : 'descent';
}
var title = E ? (E.kind === 'training' ? (meta.label || 'Training') : (meta.label || 'Flight') + (ph ? ' · ' + ph : '')) : 'Ready';
if (E && E.kind === 'idle') title = meta.status || 'On the pad';
if (E && E.kind === 'mission' && t != null && t < 0) title = (meta.label || 'Flight') + ' · countdown';
hudTitle.innerHTML = (E && E.kind !== 'training' && liveRun() ? '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#ff4d5e;margin-right:6px;vertical-align:1px"></span>' : '') + esc(title);
tm.textContent = E && E.kind === 'training' ? 'replay x' + speed : 'live';
}
function rkCamText(E, t, alt, r) {
var mainV = !ONB_FIXED; rkCamUi.querySelector('.rkc').style.display = mainV ? 'none' : ''; rkCamUi.querySelector('.rkx').style.display = mainV ? 'none' : '';
rkCamUi.querySelector('.rkc').textContent = fmtClock(t);
var v = r ? Math.sqrt(Math.pow(r[RF.vx] || 0, 2) + Math.pow(r[RF.vy] || 0, 2) + Math.pow(r[RF.vz] || 0, 2)) : 0;
rkCamUi.querySelector('.rkx').textContent = r ? (alt > 2000 ? (alt / 1000).toFixed(1) + ' KM' : Math.max(0, alt).toFixed(0) + ' M') + '   ' + Math.round(v * 3.6) + ' KM/H' : '';
var gl = RK.glitch && performance.now() < RK.glitch; rkCamUi.querySelector('.rkg').style.display = gl ? 'block' : 'none';
var dead = RK.af && RK.af.dead && /^onboard/.test(ONBOARD) && t >= RK.af.deadT;
rkCamUi.querySelector('.rkd').style.display = dead ? 'flex' : 'none';
if (dead) { var nc = rkCamUi.querySelector('.rkn'); nc.style.opacity = '0.9'; } else rkCamUi.querySelector('.rkn').style.opacity = '0.055';
if (Math.random() < 0.3) { var c = rkCamUi.querySelector('.rkn'), g = c.getContext('2d'), im = g.createImageData(480, 270); for (var i = 0; i < im.data.length; i += 4) { var v2 = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v2; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); }
}
function rocketStatus() {
var E = RK.cur;
if (E) return '';
var src = (ctx.sources || []).filter(function (s) { return /booster|rocket/i.test(s.block + ' ' + s.name); })[0];
return src ? 'The flight appears here when the blueprint runs: ' + src.name + ' streams it.' : '';
}
var VG = { eps: {}, order: [], seen: {}, seenQ: [], F: {}, cam: 'director', key: '' };
function vgItems(stream) { return stream.filter(function (it) { return it && it.data && it.data.format === 'esasim.resupply/1'; }); }
function VW(x, y, z, out) { return (out || new THREE.Vector3()).set(x, z, -y); }
function vgNow() { var sk = VG.skew == null ? 0 : VG.skew; return Date.now() / 1000 - (Math.abs(sk) > 5 ? sk : 0); }
function vgFeed(stream) {
vgItems(stream).forEach(function (it) {
var d = it.data, key = (it.node || '') + '|' + it.t + '|' + d.kind + '|' + d.ep + '|' + (d.seq == null ? '' : d.seq);
if (VG.seen[key]) return; VG.seen[key] = 1;
VG.seenQ.push(key); if (VG.seenQ.length > 6000) VG.seenQ.splice(0, 1000).forEach(function (k) { delete VG.seen[k]; });
if (d.kind === 'village') {
var L = d.village, k2 = [L.seed, L.hour, L.weather, Math.round(L.wind || 0)].join('|');
if (k2 !== VG.key) { VG.layout = L; VG.key = k2; VG.rebuild = true; }
return;
}
if (d.fields) { VG.F = {}; d.fields.forEach(function (f, i) { VG.F[f] = i; }); }
var id = d.kind + ':' + d.ep, E = VG.eps[id];
var made = typeof it.t === 'number' && it.t > 1e9 ? it.t : Date.now() / 1000, got = Date.now() / 1000;
VG.skew = Math.min(VG.skew == null ? 1e9 : VG.skew, got - made);
if (!E) { E = VG.eps[id] = { id: id, kind: d.kind, ep: d.ep, frames: [], chunks: {}, meta: {}, done: false, at: made }; VG.order.push(id); }
['label', 'result', 'hour', 'weather', 'wind', 'threat', 'status'].forEach(function (k) { if (d[k] !== undefined) E.meta[k] = d[k]; });
if (d.lz) E.lz = d.lz; if (d.home) E.home = d.home; if (d.events) E.events = d.events;
if (d.frames && d.frames.length) {
if (E.kind === 'training' || E.kind === 'run') E.chunks[d.seq || 0] = d.frames;
else E.frames = d.frames.slice();
}
if (d.ahead && E.startAt == null) { E.ahead = true; E.startAt = made + (+d.start_in || 0); }
if (d.last) { E.done = true; }
if (E.kind !== 'idle') { var ks = Object.keys(E.chunks).map(Number).sort(function (a, b) { return a - b; }); E.frames = []; ks.forEach(function (k) { E.frames = E.frames.concat(E.chunks[k]); }); }
});
if (VG.order.length > 20) { VG.order.slice(0, VG.order.length - 20).forEach(function (k) { delete VG.eps[k]; }); VG.order = VG.order.slice(-20); }
}
function vgPick() {
var ids = VG.order, run = null, idle = null, train = null;
for (var i = ids.length - 1; i >= 0; i--) {
var E = VG.eps[ids[i]]; if (!E) continue;
if (!run && E.kind === 'run' && E.frames.length > 1) run = E;
if (!idle && E.kind === 'idle') idle = E;
if (!train && E.kind === 'training' && E.done && E.frames.length > 1) train = E;
}
if (run && (!idle || run.at >= idle.at)) return run;
if (idle && (!train || idle.at >= train.at)) return idle;
return train;
}
function vgLerp(F, t, out) {
var lo = 0, hi = F.length - 1, i;
if (t <= F[0][0]) { for (i = 0; i < F[0].length; i++) out[i] = F[0][i]; return out; }
if (t >= F[hi][0]) { for (i = 0; i < F[hi].length; i++) out[i] = F[hi][i]; return out; }
while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (F[mid][0] <= t) lo = mid; else hi = mid; }
var a = F[lo], b = F[hi], k = (t - a[0]) / Math.max(1e-9, b[0] - a[0]);
var flip = (a[4] * b[4] + a[5] * b[5] + a[6] * b[6] + a[7] * b[7]) < 0 ? -1 : 1;
for (var m = 0; m < a.length; m++) { var bv = b[m]; if (m >= 4 && m <= 7) bv *= flip; out[m] = a[m] + (bv - a[m]) * k; }
out[VG.F.gnss] = (k < 0.5 ? a : b)[VG.F.gnss]; out[VG.F.phase] = (k < 0.5 ? a : b)[VG.F.phase]; out[VG.F.mk] = (k < 0.5 ? a : b)[VG.F.mk];
return out;
}
function vgMerge() {
var M = {}, nm = new THREE.Matrix3(), v = new THREE.Vector3();
function slot(key) { return M[key] || (M[key] = { p: [], n: [], u: [], c: [] }); }
function add(key, g, m, col) {
var S = slot(key), G = g.index ? g.toNonIndexed() : g, P = G.attributes.position, N = G.attributes.normal, U = G.attributes.uv;
nm.getNormalMatrix(m); var r = col ? col.r : 1, gg = col ? col.g : 1, b = col ? col.b : 1;
for (var i = 0; i < P.count; i++) {
v.fromBufferAttribute(P, i).applyMatrix4(m); S.p.push(v.x, v.y, v.z);
if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); S.n.push(v.x, v.y, v.z); } else S.n.push(0, 1, 0);
if (U) S.u.push(U.getX(i), U.getY(i)); else S.u.push(0, 0);
S.c.push(r, gg, b);
}
if (G !== g) G.dispose();
}
var e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nn = new THREE.Vector3();
function quad(key, a, b, c, d, uw, vh, col, u0, v0) {
var S = slot(key); u0 = u0 || 0; v0 = v0 || 0; var r = col ? col.r : 1, gg = col ? col.g : 1, bb = col ? col.b : 1;
e1.subVectors(b, a); e2.subVectors(d, a); nn.crossVectors(e1, e2).normalize();
[[a, u0, v0], [b, u0 + uw, v0], [c, u0 + uw, v0 + vh], [a, u0, v0], [c, u0 + uw, v0 + vh], [d, u0, v0 + vh]].forEach(function (q) {
S.p.push(q[0].x, q[0].y, q[0].z); S.n.push(nn.x, nn.y, nn.z); S.u.push(q[1], q[2]); S.c.push(r, gg, bb);
});
}
function build(mats, parent, opt) {
opt = opt || {};
Object.keys(M).forEach(function (k) {
var S = M[k]; if (!S.p.length || !mats[k]) return;
var g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(S.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(S.n, 3));
g.setAttribute('uv', new THREE.Float32BufferAttribute(S.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(S.c, 3));
g.computeBoundingSphere();
var m = new THREE.Mesh(g, mats[k]); m.castShadow = !(opt.noShadow && opt.noShadow[k]); m.receiveShadow = true; m.name = k; parent.add(m);
});
M = {};
}
return { add: add, quad: quad, build: build };
}
var VGM = new THREE.Matrix4(), VGQ = new THREE.Quaternion(), VGS = new THREE.Vector3(), VGP = new THREE.Vector3(), VGY = new THREE.Vector3(0, 1, 0);
function vgAt(x, y, z, yaw, sx, sy, sz) { return VGM.compose(VW(x, y, z, VGP), VGQ.setFromAxisAngle(VGY, yaw || 0), VGS.set(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy, sz == null ? (sx == null ? 1 : sx) : sz)); }
function vgRnd(seed) { var s = (Math.abs(seed | 0) % 2147483646) + 1; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function vgTex(w, h, draw, srgb) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); if (srgb !== false) t.colorSpace = THREE.SRGBColorSpace; return t; }
function vgSpeckle(g, w, h, r, n, s0, s1, cols, a0, a1) { for (var k = 0; k < n; k++) { var s = s0 + r() * (s1 - s0); g.fillStyle = cols[(r() * cols.length) | 0].replace('A', (a0 + r() * (a1 - a0)).toFixed(3)); g.beginPath(); g.ellipse(r() * w, r() * h, s, s * (0.5 + r() * 0.5), r() * 3, 0, 6.3); g.fill(); } }
function vgBlobs(g, w, h, r, n, r0, r1, cols, a0, a1) { for (var k = 0; k < n; k++) { var x = r() * w, y = r() * h, rr = r0 + r() * (r1 - r0), gr = g.createRadialGradient(x, y, 0, x, y, rr), c = cols[(r() * cols.length) | 0]; gr.addColorStop(0, c.replace('A', (a0 + r() * (a1 - a0)).toFixed(3))); gr.addColorStop(1, c.replace('A', '0')); g.fillStyle = gr; g.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); } }
function vgTextures() {
if (VG.tex) return VG.tex;
var T = VG.tex = {};
T.plaster = vgTex(256, 1152, function (g, w, h) {
var r = vgRnd(41); g.fillStyle = '#e9e3d8'; g.fillRect(0, 0, w, h);
vgBlobs(g, w, h, r, 200, 20, 90, ['rgba(120,100,80,A)', 'rgba(255,255,250,A)', 'rgba(160,140,110,A)'], 0.025, 0.06);
vgSpeckle(g, w, h, r, 9000, 0.4, 1.3, ['rgba(90,80,70,A)', 'rgba(255,255,255,A)'], 0.05, 0.18);
for (var k = 0; k < 7; k++) {
var x = r() * w, y = 60 + r() * (h - 200), rr = 5 + r() * 11; g.beginPath();
for (var j = 0; j <= 14; j++) { var a = j / 14 * 6.283, q = rr * (0.55 + 0.6 * r()); g.lineTo(x + Math.cos(a) * q * 1.4, y + Math.sin(a) * q * 0.8); }
g.closePath(); g.fillStyle = 'rgba(168,150,124,0.42)'; g.fill(); g.strokeStyle = 'rgba(110,95,78,0.22)'; g.lineWidth = 1; g.stroke();
}
var gr = g.createLinearGradient(0, h, 0, h - 64 * 1.3); gr.addColorStop(0, 'rgba(70,58,44,0.55)'); gr.addColorStop(0.35, 'rgba(90,76,60,0.25)'); gr.addColorStop(1, 'rgba(90,76,60,0)'); g.fillStyle = gr; g.fillRect(0, h - 90, w, 90);
for (var s = 0; s < 14; s++) { var sx = r() * w, sl = 40 + r() * 220, sy = r() * (h - sl - 100); var gl = g.createLinearGradient(0, sy, 0, sy + sl); gl.addColorStop(0, 'rgba(80,70,60,0.10)'); gl.addColorStop(1, 'rgba(80,70,60,0)'); g.fillStyle = gl; g.fillRect(sx, sy, 2 + r() * 5, sl); }
});
T.stone = vgTex(512, 512, function (g, w, h) {
var r = vgRnd(7); g.fillStyle = '#a99d8a'; g.fillRect(0, 0, w, h); var row = 0;
for (var y = 0; y < h; y += 32, row++) { var x = -r() * 40; while (x < w) { var bw = 40 + r() * 34, sh = 178 + r() * 40 | 0; g.fillStyle = 'rgb(' + sh + ',' + (sh - 8 - r() * 6 | 0) + ',' + (sh - 22 - r() * 8 | 0) + ')'; g.fillRect(x + 2, y + 2, bw - 3, 28); x += bw; } }
vgSpeckle(g, w, h, r, 6000, 0.4, 1.5, ['rgba(60,50,40,A)', 'rgba(255,250,240,A)'], 0.08, 0.25);
vgBlobs(g, w, h, r, 60, 20, 90, ['rgba(80,70,55,A)'], 0.05, 0.15);
});
T.roof = vgTex(512, 512, function (g, w, h) {
var r = vgRnd(13); g.fillStyle = '#a8a197'; g.fillRect(0, 0, w, h);
vgBlobs(g, w, h, r, 90, 20, 120, ['rgba(40,38,36,A)', 'rgba(200,195,185,A)', 'rgba(110,95,70,A)'], 0.06, 0.2);
vgSpeckle(g, w, h, r, 9000, 0.4, 1.4, ['rgba(40,40,40,A)', 'rgba(240,240,235,A)'], 0.06, 0.2);
g.strokeStyle = 'rgba(50,48,45,0.3)'; for (var k = 0; k < 10; k++) { g.lineWidth = 1 + r() * 2; g.beginPath(); var x = r() * w, y = r() * h; g.moveTo(x, y); for (var j = 0; j < 6; j++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
});
T.window = vgTex(128, 192, function (g, w, h) {
g.fillStyle = '#ece6d8'; g.fillRect(0, 0, w, h);
var gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#2b3440'); gr.addColorStop(0.5, '#141a22'); gr.addColorStop(1, '#232a33'); g.fillStyle = gr; g.fillRect(10, 10, w - 20, h - 20);
g.fillStyle = 'rgba(200,190,170,0.45)'; g.fillRect(12, 12, 34, h - 24); g.fillRect(w - 40, 12, 28, h - 24);
g.fillStyle = '#ece6d8'; g.fillRect(w / 2 - 4, 10, 8, h - 20); g.fillRect(10, 56, w - 20, 7);
g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3; g.strokeRect(9, 9, w - 18, h - 18);
});
T.windowLit = vgTex(128, 192, function (g, w, h) {
g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
var gr = g.createRadialGradient(w / 2, h * 0.6, 4, w / 2, h * 0.6, h * 0.7); gr.addColorStop(0, '#ffd08a'); gr.addColorStop(1, '#c87a2c'); g.fillStyle = gr; g.fillRect(10, 10, w - 20, h - 20);
g.fillStyle = 'rgba(255,190,110,0.9)'; g.fillRect(12, 12, 34, h - 24); g.fillRect(w - 40, 12, 28, h - 24);
g.fillStyle = '#000'; g.fillRect(w / 2 - 4, 10, 8, h - 20); g.fillRect(10, 56, w - 20, 7);
});
T.shutter = vgTex(64, 192, function (g, w, h) {
g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.28)'; for (var y = 8; y < h - 8; y += 9) g.fillRect(5, y, w - 10, 3);
g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
var r = vgRnd(3); vgSpeckle(g, w, h, r, 500, 0.4, 1.6, ['rgba(255,255,255,A)', 'rgba(60,40,20,A)'], 0.1, 0.4);
});
T.door = vgTex(128, 256, function (g, w, h) {
g.fillStyle = '#e9e3d8'; g.fillRect(0, 0, w, h);
g.fillStyle = '#7b4b2a'; g.beginPath(); g.moveTo(10, h); g.lineTo(10, 60); g.arc(w / 2, 60, w / 2 - 10, Math.PI, 0); g.lineTo(w - 10, h); g.fill();
g.fillStyle = 'rgba(0,0,0,0.3)'; for (var x = 18; x < w - 10; x += 14) g.fillRect(x, 30, 2, h - 30);
g.fillStyle = 'rgba(30,25,20,0.8)'; for (var y = 80; y < h; y += 50) for (var x2 = 20; x2 < w - 14; x2 += 22) { g.beginPath(); g.arc(x2, y, 2.2, 0, 6.3); g.fill(); }
g.strokeStyle = 'rgba(40,25,15,0.8)'; g.lineWidth = 4; g.beginPath(); g.moveTo(10, h); g.lineTo(10, 60); g.arc(w / 2, 60, w / 2 - 10, Math.PI, 0); g.lineTo(w - 10, h); g.stroke();
});
T.arches = vgTex(256, 256, function (g, w, h) {
g.fillStyle = '#efe9dc'; g.fillRect(0, 0, w, h);
var r = vgRnd(5); vgSpeckle(g, w, h, r, 2500, 0.4, 1.2, ['rgba(90,80,70,A)'], 0.05, 0.15);
g.fillStyle = '#1d2530'; g.beginPath(); g.moveTo(w * 0.3, h * 0.82); g.lineTo(w * 0.3, h * 0.42); g.quadraticCurveTo(w * 0.3, h * 0.2, w * 0.5, h * 0.12); g.quadraticCurveTo(w * 0.7, h * 0.2, w * 0.7, h * 0.42); g.lineTo(w * 0.7, h * 0.82); g.fill();
g.strokeStyle = '#2f7f7a'; g.lineWidth = 6; g.stroke();
g.fillStyle = '#d7cfbd'; g.fillRect(w * 0.27, h * 0.82, w * 0.46, 8);
});
T.tiles = vgTex(256, 256, function (g, w, h) {
var r = vgRnd(19); g.fillStyle = '#2f8a7f'; g.fillRect(0, 0, w, h);
for (var y = 0; y < h; y += 16) for (var x = (y / 16 % 2) * 8; x < w; x += 16) { var l = 0.85 + r() * 0.3; g.fillStyle = 'rgba(' + (40 * l | 0) + ',' + (150 * l | 0) + ',' + (138 * l | 0) + ',1)'; g.fillRect(x + 1, y + 1, 14, 14); }
vgSpeckle(g, w, h, r, 900, 0.5, 1.5, ['rgba(255,255,255,A)'], 0.1, 0.3);
});
T.paving = vgTex(512, 512, function (g, w, h) {
var r = vgRnd(29); g.fillStyle = '#958a74'; g.fillRect(0, 0, w, h);
for (var y = 0; y < h; y += 64) { var x = -r() * 40; while (x < w) { var fw = 50 + r() * 70, sh = 168 + r() * 40 | 0; g.fillStyle = 'rgb(' + sh + ',' + (sh - 10 - r() * 6 | 0) + ',' + (sh - 32 - r() * 8 | 0) + ')'; g.fillRect(x + 3, y + 3, fw - 5, 58); x += fw; } }
vgSpeckle(g, w, h, r, 9000, 0.4, 1.4, ['rgba(60,55,45,A)', 'rgba(250,245,235,A)'], 0.06, 0.22);
vgBlobs(g, w, h, r, 50, 30, 140, ['rgba(100,85,60,A)', 'rgba(40,36,30,A)'], 0.05, 0.14);
});
T.lane = vgTex(512, 1024, function (g, w, h) {
var r = vgRnd(37); g.fillStyle = '#8f8270'; g.fillRect(0, 0, w, h);
vgBlobs(g, w, h, r, 120, 30, 160, ['rgba(70,64,58,A)', 'rgba(160,145,118,A)', 'rgba(110,100,86,A)'], 0.12, 0.35);
vgSpeckle(g, w, h, r, 26000, 0.5, 1.8, ['rgba(50,46,42,A)', 'rgba(200,188,165,A)'], 0.1, 0.35);
for (var k = 0; k < 220; k++) { var x = r() * w, y = r() * h, sz = 4 + r() * 9, sh = 130 + r() * 50 | 0; g.fillStyle = 'rgba(' + sh + ',' + (sh - 10) + ',' + (sh - 26) + ',' + (0.35 + r() * 0.4) + ')'; g.beginPath(); g.ellipse(x, y, sz, sz * (0.6 + r() * 0.4), r() * 3, 0, 6.3); g.fill(); }
[0.3, 0.7].forEach(function (u) { var gr = g.createLinearGradient(w * (u - 0.07), 0, w * (u + 0.07), 0); gr.addColorStop(0, 'rgba(60,55,50,0)'); gr.addColorStop(0.5, 'rgba(60,55,50,0.22)'); gr.addColorStop(1, 'rgba(60,55,50,0)'); g.fillStyle = gr; g.fillRect(w * (u - 0.07), 0, w * 0.14, h); });
var ge = g.createLinearGradient(0, 0, w, 0); ge.addColorStop(0, 'rgba(178,160,125,0.7)'); ge.addColorStop(0.12, 'rgba(178,160,125,0)'); ge.addColorStop(0.88, 'rgba(178,160,125,0)'); ge.addColorStop(1, 'rgba(178,160,125,0.7)'); g.fillStyle = ge; g.fillRect(0, 0, w, h);
});
T.detail = vgTex(512, 512, function (g, w, h) {
var r = vgRnd(53), img = g.createImageData(w, h), D = img.data;
for (var i = 0; i < w * h; i++) { var v = 128 + (r() - 0.5) * 50; D[i * 4] = D[i * 4 + 1] = D[i * 4 + 2] = v; D[i * 4 + 3] = 255; }
g.putImageData(img, 0, 0);
vgSpeckle(g, w, h, r, 1600, 1.2, 4.5, ['rgba(70,70,70,A)', 'rgba(210,210,210,A)'], 0.3, 0.7);
vgBlobs(g, w, h, r, 40, 30, 120, ['rgba(90,90,90,A)', 'rgba(170,170,170,A)'], 0.1, 0.25);
}, false);
T.leaves = vgTex(256, 256, function (g, w, h) {
var r = vgRnd(61); g.clearRect(0, 0, w, h);
for (var c = 0; c < 70; c++) {
var cx = r() * w, cy = r() * h, cr = 10 + r() * 16;
for (var k = 0; k < 34; k++) { var a = r() * 6.3, d = Math.sqrt(r()) * cr, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, l = 2.2 + r() * 3.2, sh = 0.55 + r() * 0.5, light = r() < 0.18 ? 1.25 : 1;
g.fillStyle = 'rgba(' + (205 * sh * light | 0) + ',' + (220 * sh * light | 0) + ',' + (200 * sh * light | 0) + ',1)'; g.beginPath(); g.ellipse(x, y, l, l * 0.3, r() * 6.3, 0, 6.3); g.fill(); }
}
});
T.leaves.repeat.set(3, 2);
T.frond = vgTex(128, 512, function (g, w, h) {
g.clearRect(0, 0, w, h); var r = vgRnd(67);
g.strokeStyle = '#c7c19a'; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
for (var y = 20; y < h - 6; y += 7) { var t = y / h, len = (w / 2 - 4) * Math.sin(Math.PI * Math.min(1, t * 1.1)) * (0.8 + r() * 0.2); [-1, 1].forEach(function (s) { var sh = 0.75 + r() * 0.35; g.strokeStyle = 'rgba(' + (190 * sh | 0) + ',' + (210 * sh | 0) + ',' + (170 * sh | 0) + ',1)'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w / 2 + s * len * 0.6, y + 6, w / 2 + s * len, y + 18); g.stroke(); }); }
});
T.frond.wrapS = T.frond.wrapT = THREE.ClampToEdgeWrapping;
T.bark = vgTex(128, 256, function (g, w, h) {
var r = vgRnd(71); g.fillStyle = '#6b6152'; g.fillRect(0, 0, w, h);
for (var k = 0; k < 140; k++) { var x = r() * w; g.strokeStyle = 'rgba(' + (r() < 0.5 ? '40,35,28' : '150,140,120') + ',' + (0.2 + r() * 0.4) + ')'; g.lineWidth = 1 + r() * 3; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 30, h * 0.3, x + (r() - 0.5) * 30, h * 0.7, x + (r() - 0.5) * 20, h); g.stroke(); }
});
T.palmBark = vgTex(128, 128, function (g, w, h) {
g.fillStyle = '#8a7a60'; g.fillRect(0, 0, w, h); for (var y = 0; y < h; y += 16) { var gr = g.createLinearGradient(0, y, 0, y + 16); gr.addColorStop(0, '#5f523f'); gr.addColorStop(0.4, '#9c8b6c'); gr.addColorStop(1, '#6f6049'); g.fillStyle = gr; g.fillRect(0, y, w, 16); }
var r = vgRnd(73); vgSpeckle(g, w, h, r, 600, 0.5, 1.5, ['rgba(40,30,20,A)'], 0.1, 0.4);
});
T.marker = vgTex(512, 512, function (g, w, h) {
g.fillStyle = '#ff6a10'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 26; g.beginPath(); g.arc(w / 2, h / 2, w * 0.38, 0, 6.3); g.stroke();
g.fillStyle = '#fff'; g.fillRect(w * 0.33, h * 0.3, w * 0.07, h * 0.4); g.fillRect(w * 0.6, h * 0.3, w * 0.07, h * 0.4); g.fillRect(w * 0.33, h * 0.465, w * 0.34, h * 0.07);
var r = vgRnd(83); vgBlobs(g, w, h, r, 30, 20, 80, ['rgba(120,90,60,A)'], 0.08, 0.2);
}, true);
T.marker.wrapS = T.marker.wrapT = THREE.ClampToEdgeWrapping;
T.pad = vgTex(512, 512, function (g, w, h) {
var r = vgRnd(89); g.fillStyle = '#9d9a94'; g.fillRect(0, 0, w, h); vgBlobs(g, w, h, r, 60, 20, 100, ['rgba(60,55,50,A)', 'rgba(220,215,205,A)'], 0.05, 0.15); vgSpeckle(g, w, h, r, 6000, 0.4, 1.3, ['rgba(40,40,40,A)'], 0.08, 0.2);
g.strokeStyle = '#e8c21a'; g.lineWidth = 16; g.beginPath(); g.arc(w / 2, h / 2, w * 0.4, 0, 6.3); g.stroke();
g.fillStyle = '#f1f1ee'; g.fillRect(w * 0.34, h * 0.3, w * 0.07, h * 0.4); g.fillRect(w * 0.59, h * 0.3, w * 0.07, h * 0.4); g.fillRect(w * 0.34, h * 0.465, w * 0.32, h * 0.07);
g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4);
});
T.pad.wrapS = T.pad.wrapT = THREE.ClampToEdgeWrapping;
T.kit = vgTex(256, 128, function (g, w, h) {
g.fillStyle = '#1f7a45'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; var c = h * 0.5, s = h * 0.15; g.fillRect(w / 2 - s, c - 3 * s, 2 * s, 6 * s); g.fillRect(w / 2 - 3 * s, c - s, 6 * s, 2 * s);
g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
});
T.kit.wrapS = T.kit.wrapT = THREE.ClampToEdgeWrapping;
T.puff = vgTex(128, 128, function (g, w, h) { var gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false);
T.disc = vgTex(256, 256, function (g, w, h) { var gr = g.createRadialGradient(w / 2, h / 2, w * 0.08, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(20,20,22,0.0)'); gr.addColorStop(0.2, 'rgba(20,20,22,0.25)'); gr.addColorStop(0.9, 'rgba(20,20,22,0.38)'); gr.addColorStop(0.97, 'rgba(230,230,230,0.5)'); gr.addColorStop(1, 'rgba(20,20,22,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
return T;
}
var VG_WX = {
clear: { sun: 1.0, fog: 0.0011, cloud: 0.12, mixH: 0.0, mixZ: 0.0, col: 0xffffff, rain: 0, dust: 0 },
haze: { sun: 0.78, fog: 0.0034, cloud: 0.2, mixH: 0.45, mixZ: 0.15, col: 0xdcd6c8, rain: 0, dust: 0.15 },
overcast: { sun: 0.22, fog: 0.0024, cloud: 0.95, mixH: 0.85, mixZ: 0.85, col: 0x9aa1a8, rain: 0, dust: 0 },
rain: { sun: 0.14, fog: 0.0050, cloud: 1.0, mixH: 0.92, mixZ: 0.92, col: 0x6f777f, rain: 1, dust: 0 },
dust: { sun: 0.5, fog: 0.0085, cloud: 0.3, mixH: 0.75, mixZ: 0.5, col: 0xc89e6c, rain: 0, dust: 1 },
fog: { sun: 0.3, fog: 0.0190, cloud: 0.7, mixH: 0.92, mixZ: 0.8, col: 0xbcc0c2, rain: 0, dust: 0 }
};
var VG_SKY = [
[-90, 0x020409, 0x070b14], [-14, 0x03060d, 0x0b1220], [-6, 0x0d1830, 0x3b3550], [-1, 0x1c2f58, 0xc77a4c], [4, 0x2a5088, 0xeda56a],
[10, 0x2d5d9c, 0xf2c89c], [25, 0x2f68c0, 0xb3cde8], [90, 0x2a5fc6, 0xbdd5ee]];
function vgSun(hour) {
var lat = 33 * Math.PI / 180, dec = 6 * Math.PI / 180, H = (hour - 12.3) * 15 * Math.PI / 180;
var e = -Math.cos(dec) * Math.sin(H), n = Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.cos(H) * Math.sin(lat), u = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H);
return { e: e, n: n, u: u, el: Math.asin(Math.max(-1, Math.min(1, u))) * 180 / Math.PI };
}
function vgLight(L) {
var W = VG_WX[L.weather] || VG_WX.clear, s = vgSun(+L.hour || 12), el = s.el, i = 0;
while (i < VG_SKY.length - 2 && VG_SKY[i + 1][0] < el) i++;
var a = VG_SKY[i], b = VG_SKY[i + 1], k = Math.max(0, Math.min(1, (el - a[0]) / (b[0] - a[0])));
var zen = new THREE.Color(a[1]).lerp(new THREE.Color(b[1]), k), hor = new THREE.Color(a[2]).lerp(new THREE.Color(b[2]), k);
var day = THREE.MathUtils.smoothstep(el, -8, 14), bright = 0.06 + 0.94 * day;
var wc = new THREE.Color(W.col).multiplyScalar(bright);
zen.lerp(wc, W.mixZ); hor.lerp(wc, W.mixH);
var sunCol = new THREE.Color(0xff8a3c).lerp(new THREE.Color(0xfff3e2), THREE.MathUtils.smoothstep(el, 1, 32));
if (L.weather === 'dust') sunCol.lerp(new THREE.Color(0xff9b4a), 0.5);
var night = 1 - THREE.MathUtils.smoothstep(el, -10, -2);
return { sun: s, el: el, day: day, night: night, zen: zen, hor: hor, sunCol: sunCol, sunI: 3.3 * THREE.MathUtils.smoothstep(el, -1.5, 9) * W.sun,
fog: W.fog, fogCol: hor.clone().lerp(zen, 0.15), cloud: W.cloud, rain: W.rain, dust: W.dust, W: W };
}
function vgSkyMesh(Lt) {
var mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
uniforms: { uZen: { value: Lt.zen }, uHor: { value: Lt.hor }, uSunDir: { value: VW(Lt.sun.e, Lt.sun.n, Lt.sun.u).normalize() }, uSunCol: { value: Lt.sunCol }, uCloud: { value: Lt.cloud },
uCloudCol: { value: Lt.hor.clone().lerp(new THREE.Color(1, 1, 1).multiplyScalar(0.25 + 0.75 * Lt.day), 0.55) }, uStars: { value: Lt.night }, uMoon: { value: VW(0.45, -0.6, 0.66).normalize() }, uTime: { value: 0 }, uHaze: { value: Lt.W.mixH } },
vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
fragmentShader: [
'uniform vec3 uZen, uHor, uSunDir, uSunCol, uCloudCol, uMoon; uniform float uCloud, uStars, uTime, uHaze; varying vec3 vP;',
'float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
'float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }',
'float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * n2(p); p *= 2.03; a *= 0.5; } return s; }',
'float h3(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }',
'void main(){',
'  vec3 d = normalize(vP); float y = d.y;',
'  vec3 c = mix(uHor, uZen, pow(clamp(y, 0.0, 1.0), 0.42));',
'  if (y < 0.0) c = mix(uHor, uHor * 0.6, clamp(-y * 5.0, 0.0, 1.0));',
'  float sd = max(dot(d, uSunDir), 0.0);',
'  c += uSunCol * (pow(sd, 5.0) * 0.16 * (1.0 + 2.0 * uHaze) + pow(sd, 60.0) * 0.4) * (1.0 - 0.6 * uCloud) * smoothstep(-0.3, 0.05, uSunDir.y);',
'  float disc = smoothstep(0.99955, 0.9998, sd) * smoothstep(-0.02, 0.01, y);',
'  float cov = 0.0;',
'  if (y > 0.0) {',
'    vec2 q = d.xz / (y + 0.09) * 0.9 + vec2(uTime * 0.003, uTime * 0.001);',
'    float f = fbm(q * 1.6) * 0.65 + fbm(q * 5.0) * 0.35;',
'    cov = smoothstep(0.66 - 0.45 * uCloud, 0.86 - 0.28 * uCloud, f) * smoothstep(0.0, 0.1, y);',
'    vec3 cc = uCloudCol * (0.72 + 0.5 * f) + uSunCol * pow(sd, 6.0) * 0.5 * (1.0 - uCloud * 0.7);',
'    c = mix(c, cc, cov * (0.6 + 0.4 * uCloud));',
'  }',
'  c += uSunCol * disc * 14.0 * (1.0 - cov) * (1.0 - 0.85 * uCloud);',
'  vec3 qs = floor(d * 380.0); float s = h3(qs);',
'  c += vec3(0.9, 0.92, 1.0) * 0.6 * step(0.9982, s) * smoothstep(0.04, 0.3, y) * (0.3 + 0.7 * h3(qs + 1.0)) * uStars * (1.0 - cov) * (1.0 - 0.8 * uCloud);',
'  float md = dot(d, uMoon); c += vec3(0.85, 0.88, 0.95) * (smoothstep(0.99975, 0.9999, md) * 2.4 + pow(max(md, 0.0), 200.0) * 0.25) * uStars * (1.0 - cov * 0.8);',
'  gl_FragColor = vec4(c, 1.0);',
'}'].join('\n') });
var m = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), mat); m.frustumCulled = false; m.renderOrder = -10; return m;
}
var VG_WALL = [0xfbf7ee, 0xf4e4c6, 0xe9cc9e, 0xe5d3ba, 0xf0d9cf, 0xdfe4e3];
var VG_SHUT = [0x2f7d86, 0x2c5f9e, 0x6b4a2e, 0x4f7a3a];
var VG_CARS = [0xe9e9e6, 0xb9bcc0, 0x9a1d1d, 0x1f2f4d, 0xcfbf9c];
function vgMats(Lt) {
var T = vgTextures(), std = function (o) { return new THREE.MeshStandardMaterial(o); };
var M = {
wall: std({ map: T.plaster, vertexColors: true, roughness: 0.92 }),
stone: std({ map: T.stone, vertexColors: true, roughness: 0.9 }),
roof: std({ map: T.roof, vertexColors: true, roughness: 0.95 }),
win: std({ map: T.window, roughness: 0.25, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
winL: std({ map: T.window, emissive: 0xffffff, emissiveMap: T.windowLit, emissiveIntensity: 0, roughness: 0.25, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
shut: std({ map: T.shutter, vertexColors: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
door: std({ map: T.door, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
arches: std({ map: T.arches, roughness: 0.9 }),
tiles: std({ map: T.tiles, roughness: 0.32, metalness: 0.15 }),
gold: std({ color: 0xd9b45a, roughness: 0.3, metalness: 1.0 }),
metal: std({ vertexColors: true, roughness: 0.45, metalness: 0.75 }),
plastic: std({ vertexColors: true, roughness: 0.55, metalness: 0.0 }),
solar: std({ color: 0x1c2b4a, roughness: 0.15, metalness: 0.4 }),
glass: std({ color: 0x0d1218, roughness: 0.08, metalness: 0.6 }),
paint: std({ vertexColors: true, roughness: 0.35, metalness: 0.45 }),
tyre: std({ color: 0x151515, roughness: 0.9 }),
leaves: std({ map: T.leaves, vertexColors: true, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 }),
core: std({ vertexColors: true, roughness: 0.95 }),
frond: std({ map: T.frond, vertexColors: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 }),
bark: std({ map: T.bark, vertexColors: true, roughness: 0.95 }),
palmBark: std({ map: T.palmBark, roughness: 0.95 }),
lamp: new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffc27a, emissiveIntensity: 0, roughness: 0.4 }),
red: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.1, 0.06) }),
green: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 2.2, 0.8) }),
blue: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.6, 3) }),
canvas: std({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }),
marker: std({ map: T.marker, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }),
pad: std({ map: T.pad, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }),
kitTex: std({ map: T.kit, roughness: 0.6, side: THREE.DoubleSide })
};
VG.sway = { value: 0 }; VG.swayK = { value: 0.3 + 0.08 * (+Lt.wind || 0) };
['leaves', 'frond', 'core'].forEach(function (k) {
M[k].onBeforeCompile = function (sh) {
sh.uniforms.uT = VG.sway; sh.uniforms.uK = VG.swayK;
sh.vertexShader = 'uniform float uT; uniform float uK;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  { float hh = max(0.0, position.y - 1.2); float ph = position.x * 0.31 + position.z * 0.23; transformed.x += (sin(uT * 1.3 + ph) * 0.6 + sin(uT * 3.1 + ph * 2.0) * 0.25) * 0.012 * hh * uK; transformed.z += sin(uT * 1.1 + ph * 1.3) * 0.008 * hh * uK; }');
};
});
return M;
}
function vgBox(B, key, cx, cy, hx, hy, yaw, z0, z1, col, o) {
o = o || {}; var c = Math.cos(yaw), s = Math.sin(yaw), P = function (lx, ly, z) { return VW(cx + lx * c - ly * s, cy + lx * s + ly * c, z); };
var K = [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]], us = o.us || 4, vs = o.vs || 18;
for (var i = 0; i < 4; i++) { var A = K[i], Bq = K[(i + 1) % 4], len = Math.hypot(Bq[0] - A[0], Bq[1] - A[1]); B.quad(o.side || key, P(A[0], A[1], z0), P(Bq[0], Bq[1], z0), P(Bq[0], Bq[1], z1), P(A[0], A[1], z1), len / us, (z1 - z0) / vs, col, o.u0 || (i * 0.37), o.v0 != null ? o.v0 : z0 / vs); }
if (o.top !== false) B.quad(o.topKey || key, P(-hx, -hy, z1), P(hx, -hy, z1), P(hx, hy, z1), P(-hx, hy, z1), 2 * hx / (o.ts || 6), 2 * hy / (o.ts || 6), o.topCol || col);
if (o.bottom) B.quad(key, P(-hx, hy, z0), P(hx, hy, z0), P(hx, -hy, z0), P(-hx, -hy, z0), 2 * hx / 6, 2 * hy / 6, col);
}
function vgHouse(B, it, Lt) {
var r = vgRnd(it.s || 1), cx = it.x, cy = it.y, hx = it.w / 2, hy = it.d / 2, yaw = it.yaw || 0, h = it.h, F = it.f || 1;
var c = Math.cos(yaw), s = Math.sin(yaw), P = function (lx, ly, z) { return VW(cx + lx * c - ly * s, cy + lx * s + ly * c, z); };
var tint = new THREE.Color(VG_WALL[(it.c || 0) % VG_WALL.length]).multiplyScalar(0.92 + 0.1 * r());
var dark = tint.clone().multiplyScalar(0.84), slab = h - 0.9, ins = 0.22;
vgBox(B, 'wall', cx, cy, hx, hy, yaw, 0, h, tint, { top: false, u0: r() * 3 });
var K = [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]], Ki = [[-hx + ins, -hy + ins], [hx - ins, -hy + ins], [hx - ins, hy - ins], [-hx + ins, hy - ins]];
for (var i = 0; i < 4; i++) {
var a = Ki[i], b = Ki[(i + 1) % 4], ao = K[i], bo = K[(i + 1) % 4], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
B.quad('wall', P(b[0], b[1], slab), P(a[0], a[1], slab), P(a[0], a[1], h), P(b[0], b[1], h), len / 4, 0.9 / 18, dark, 0, slab / 18);
B.quad('wall', P(ao[0], ao[1], h), P(bo[0], bo[1], h), P(b[0], b[1], h), P(a[0], a[1], h), len / 4, ins / 18, tint.clone().multiplyScalar(0.97));
}
B.quad('roof', P(-hx + ins, -hy + ins, slab), P(hx - ins, -hy + ins, slab), P(hx - ins, hy - ins, slab), P(-hx + ins, hy - ins, slab), (2 * hx) / 6, (2 * hy) / 6, new THREE.Color(1, 1, 1).multiplyScalar(0.85 + 0.2 * r()));
vgBox(B, 'stone', cx, cy, hx + 0.05, hy + 0.05, yaw, 0, 0.5 + 0.2 * r(), dark.clone().lerp(new THREE.Color(0xc8b89a), 0.6), { top: false, us: 3, vs: 3 });
for (var f = 1; f < F; f++) vgBox(B, 'wall', cx, cy, hx + 0.07, hy + 0.07, yaw, 3.2 * f - 0.08, 3.2 * f + 0.08, dark, { us: 4, vs: 18, ts: 4 });
vgBox(B, 'wall', cx, cy, hx + 0.06, hy + 0.06, yaw, h - 0.12, h + 0.04, dark, { us: 4, vs: 18, ts: 4 });
var shutters = r() < 0.45, sc = new THREE.Color(VG_SHUT[(r() * VG_SHUT.length) | 0]).multiplyScalar(0.85 + 0.2 * r()), doorFace = (r() * 4) | 0, lit = Lt.night > 0.05;
for (var fc = 0; fc < 4; fc++) {
var A0 = K[fc], B0 = K[(fc + 1) % 4], L = Math.hypot(B0[0] - A0[0], B0[1] - A0[1]), ux = (B0[0] - A0[0]) / L, uy = (B0[1] - A0[1]) / L, nx = uy, ny = -ux;   // the face's outward normal (local)
var n = Math.max(1, Math.floor((L - 1.2) / 2.6)), gap = L / n;
for (var fl = 0; fl < F; fl++) {
for (var w = 0; w < n; w++) {
if (r() < 0.22) continue;
var along = gap * (w + 0.5), z0 = 3.2 * fl + (fl ? 1.0 : 0.95), ww = 0.5, wh = 0.68;
var door = fl === 0 && fc === doorFace && w === Math.floor(n / 2);
if (door) { z0 = 0.02; ww = 0.62; wh = 1.12; }
var off = 0.03, bx = A0[0] + ux * along + nx * off, by = A0[1] + uy * along + ny * off;
var p0 = P(bx - ux * ww, by - uy * ww, z0), p1 = P(bx + ux * ww, by + uy * ww, z0), p2 = P(bx + ux * ww, by + uy * ww, z0 + 2 * wh), p3 = P(bx - ux * ww, by - uy * ww, z0 + 2 * wh);
if (door) {
B.quad('door', p0, p1, p2, p3, 1, 1);
if (r() < 0.35) {
var ac = new THREE.Color([0xb3362b, 0x2e74b5, 0x2f8f57, 0xd2a53a][(r() * 4) | 0]), aw = 1.15, ain = A0[0] + ux * along + nx * 0.02, ainy = A0[1] + uy * along + ny * 0.02, aox = ain + nx * 1.1, aoy = ainy + ny * 1.1;
B.quad('canvas', P(aox - ux * aw, aoy - uy * aw, 2.25), P(aox + ux * aw, aoy + uy * aw, 2.25), P(ain + ux * aw, ainy + uy * aw, 2.75), P(ain - ux * aw, ainy - uy * aw, 2.75), 1, 1, ac);
B.quad('canvas', P(aox - ux * aw, aoy - uy * aw, 2.0), P(aox + ux * aw, aoy + uy * aw, 2.0), P(aox + ux * aw, aoy + uy * aw, 2.25), P(aox - ux * aw, aoy - uy * aw, 2.25), 1, 1, ac.clone().multiplyScalar(0.85));
}
continue;
}
B.quad(lit && r() < 0.38 ? 'winL' : 'win', p0, p1, p2, p3, 1, 1);
var slx = A0[0] + ux * along + nx * 0.07, sly = A0[1] + uy * along + ny * 0.07, sx = cx + slx * c - sly * s, sy = cy + slx * s + sly * c;
vgBox(B, 'stone', sx, sy, Math.abs(ux) * (ww + 0.1) + Math.abs(nx) * 0.08, Math.abs(uy) * (ww + 0.1) + Math.abs(ny) * 0.08, yaw, z0 - 0.08, z0, tint.clone().multiplyScalar(0.9), { us: 3, vs: 3, ts: 3 });
if (shutters) {
[-1, 1].forEach(function (sd) {
var qx = bx + ux * sd * (ww + 0.26) + nx * 0.02, qy = by + uy * sd * (ww + 0.26) + ny * 0.02;
B.quad('shut', P(qx - ux * 0.25, qy - uy * 0.25, z0), P(qx + ux * 0.25, qy + uy * 0.25, z0), P(qx + ux * 0.25, qy + uy * 0.25, z0 + 2 * wh), P(qx - ux * 0.25, qy - uy * 0.25, z0 + 2 * wh), 1, 1, sc);
});
}
}
}
if (r() < 0.25 && F >= 1) {
var al = L * (0.2 + 0.6 * r()), zz = 3.2 * Math.max(0, F - 1) + 2.2, alx = A0[0] + ux * al + nx * 0.18, aly = A0[1] + uy * al + ny * 0.18;
B.add('plastic', new THREE.BoxGeometry(0.8, 0.55, 0.3), vgAt(cx + alx * c - aly * s, cy + alx * s + aly * c, zz, yaw + (fc % 2 ? Math.PI / 2 : 0)), new THREE.Color(0xe6e6e2));
}
}
if (r() < 0.2) {
var bf = (r() * 4) | 0, BA = K[bf], BB = K[(bf + 1) % 4], bl = Math.hypot(BB[0] - BA[0], BB[1] - BA[1]), bux = (BB[0] - BA[0]) / bl, buy = (BB[1] - BA[1]) / bl, bnx = buy, bny = -bux, bat = bl * (0.15 + 0.7 * r()), top = Math.min(h - 0.4, 3.2 * Math.min(F, 2) - 0.2);
for (var bb = 0; bb < 7; bb++) {
var t2 = r(), lx2 = BA[0] + bux * (bat + (r() - 0.5) * 1.6) + bnx * 0.3, ly2 = BA[1] + buy * (bat + (r() - 0.5) * 1.6) + bny * 0.3, zb = 0.6 + t2 * (top - 0.6), R2 = 0.45 + 0.4 * r() * (1.2 - t2 * 0.5);
var flower = r() < 0.7 ? new THREE.Color().setHSL(0.9 + 0.04 * r(), 0.7, 0.42 + 0.1 * r()) : new THREE.Color().setHSL(0.26, 0.4, 0.3);
B.add('leaves', VG.ico1 || (VG.ico1 = new THREE.IcosahedronGeometry(1, 1)), new THREE.Matrix4().compose(P(lx2, ly2, zb), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw + Math.atan2(buy, bux)), new THREE.Vector3(R2 * 1.3, R2, R2 * 0.45)), flower);
}
B.add('bark', new THREE.CylinderGeometry(0.05, 0.08, top, 5), vgAt(cx + (BA[0] + bux * bat + bnx * 0.12) * c - (BA[1] + buy * bat + bny * 0.12) * s, cy + (BA[0] + bux * bat + bnx * 0.12) * s + (BA[1] + buy * bat + bny * 0.12) * c, top / 2, 0), new THREE.Color(0.6, 0.5, 0.4));
}
if (F >= 2 && r() < 0.4) {
var fb = 1 + ((r() * (F - 1)) | 0), side = r() < 0.5 ? 1 : -1, bw = Math.min(hx * 0.8, 1.6), zf = 3.2 * fb;
var bcx = cx + (-s) * side * (hy + 0.45), bcy = cy + c * side * (hy + 0.45);
vgBox(B, 'wall', bcx, bcy, bw, 0.45, yaw, zf - 0.15, zf, tint, { bottom: true, ts: 3 });
vgBox(B, 'wall', cx + (-s) * side * (hy + 0.85), cy + c * side * (hy + 0.85), bw, 0.06, yaw, zf, zf + 0.95, tint, { ts: 3 });
}
var nT = 1 + ((r() * 2.4) | 0);
for (var t = 0; t < nT; t++) {
var tx = (r() - 0.5) * (2 * hx - 1.6), ty = (r() - 0.5) * (2 * hy - 1.6), wx = cx + tx * c - ty * s, wy = cy + tx * s + ty * c, black = r() < 0.65;
B.add('metal', new THREE.BoxGeometry(0.9, 0.35, 0.9), vgAt(wx, wy, slab + 0.175, yaw), new THREE.Color(0x6e6e6e));
B.add('plastic', new THREE.CylinderGeometry(0.5, 0.52, 0.95, 14), vgAt(wx, wy, slab + 0.35 + 0.475, 0), new THREE.Color(black ? 0x1d1d1f : 0xe8e6df));
}
if (r() < 0.5) {
var sxp = (r() - 0.5) * (2 * hx - 2.4), syp = (r() - 0.5) * (2 * hy - 2.4), px = cx + sxp * c - syp * s, py = cy + sxp * s + syp * c;
var pm = new THREE.Matrix4().compose(VW(px, py, slab + 0.75), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.62, 0, 0)), new THREE.Vector3(1, 1, 1));
B.add('solar', new THREE.BoxGeometry(1.0, 0.05, 1.9), pm);
var tm = new THREE.Matrix4().compose(VW(px, py + 0.6, slab + 1.35), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2), new THREE.Vector3(1, 1, 1));
B.add('metal', new THREE.CylinderGeometry(0.25, 0.25, 1.2, 12), tm, new THREE.Color(0xd8d8d8));
}
if (r() < 0.5) {
var dxp = (r() - 0.5) * (2 * hx - 1.2), dyp = (r() - 0.5) * (2 * hy - 1.2), qx = cx + dxp * c - dyp * s, qy = cy + dxp * s + dyp * c;
B.add('metal', new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), vgAt(qx, qy, slab + 0.45, 0), new THREE.Color(0x888888));
var dm = new THREE.Matrix4().compose(VW(qx, qy - 0.08, slab + 0.95), new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.15, 0, 0)), new THREE.Vector3(1, 1, 1));
B.add('metal', new THREE.SphereGeometry(0.42, 14, 6, 0, Math.PI * 2, 0, 0.55), dm, new THREE.Color(0xd9d9d6));
}
if (F >= 3 && r() < 0.6) {
var hxp = (r() - 0.5) * Math.max(0, 2 * hx - 3.0), hyp = (r() - 0.5) * Math.max(0, 2 * hy - 3.2), hcx = cx + hxp * c - hyp * s, hcy = cy + hxp * s + hyp * c;
vgBox(B, 'wall', hcx, hcy, 1.1, 1.2, yaw, slab, slab + 2.1, tint, { topKey: 'roof', ts: 4 });
var dpx = hcx + (-s) * -1.215, dpy = hcy + c * -1.215;
B.quad('door', VW(dpx - c * 0.45, dpy - s * 0.45, slab), VW(dpx + c * 0.45, dpy + s * 0.45, slab), VW(dpx + c * 0.45, dpy + s * 0.45, slab + 1.9), VW(dpx - c * 0.45, dpy - s * 0.45, slab + 1.9), 1, 1);
}
}
function vgMosque(B, it, Lt) {
var cx = it.x, cy = it.y, hx = it.w / 2, hy = it.d / 2, h = it.h, cream = new THREE.Color(0xf6f0e2);
vgBox(B, 'arches', cx, cy, hx, hy, 0, 0.8, h - 0.9, null, { top: false, us: 4, vs: h - 1.7, v0: 0, u0: 0 });
vgBox(B, 'stone', cx, cy, hx + 0.1, hy + 0.1, 0, 0, 0.8, new THREE.Color(0xd8ccb2), { top: false, us: 3, vs: 3 });
vgBox(B, 'wall', cx, cy, hx, hy, 0, h - 0.9, h, cream, { topKey: 'roof', ts: 6 });
for (var x = -hx; x <= hx + 0.01; x += 1.2) [-hy, hy].forEach(function (y) { B.add('wall', new THREE.BoxGeometry(0.5, 0.55, 0.3), vgAt(cx + x, cy + y, h + 0.27, 0), cream); });
for (var y = -hy + 1.2; y <= hy - 1.2; y += 1.2) [-hx, hx].forEach(function (x) { B.add('wall', new THREE.BoxGeometry(0.3, 0.55, 0.5), vgAt(cx + x, cy + y, h + 0.27, 0), cream); });
B.add('wall', new THREE.CylinderGeometry(5.45, 5.45, 0.9, 40, 1, true), vgAt(cx, cy, h + 0.45, 0), cream);
B.add('tiles', new THREE.SphereGeometry(it.dome || 5.2, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), vgAt(cx, cy, h + 0.6, 0, 1, 1.02, 1));
B.add('gold', new THREE.CylinderGeometry(0.06, 0.1, 1.6, 8), vgAt(cx, cy, h + 0.6 + 5.3 + 0.8, 0));
B.add('gold', new THREE.SphereGeometry(0.22, 12, 8), vgAt(cx, cy, h + 0.6 + 5.3 + 0.9, 0));
B.add('gold', new THREE.TorusGeometry(0.32, 0.05, 6, 16, Math.PI * 1.4), new THREE.Matrix4().compose(VW(cx, cy, h + 0.6 + 5.3 + 1.75), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -Math.PI * 0.2)), new THREE.Vector3(1, 1, 1)));
var mx = it.mx, my = it.my, mh = it.mh || 31, b0 = mh * 0.7;
B.add('stone', new THREE.CylinderGeometry(1.85, 1.95, 1.2, 8), vgAt(mx, my, 0.6, Math.PI / 8), new THREE.Color(0xd8ccb2));
B.add('wall', new THREE.CylinderGeometry(1.45, 1.7, b0 - 1.2, 8), vgAt(mx, my, 1.2 + (b0 - 1.2) / 2, Math.PI / 8), cream);
for (var k = 1; k < 4; k++) B.add('wall', new THREE.CylinderGeometry(1.62 - 0.05 * k, 1.62 - 0.05 * k, 0.16, 8), vgAt(mx, my, b0 * k / 4, Math.PI / 8), cream.clone().multiplyScalar(0.9));
B.add('wall', new THREE.CylinderGeometry(2.35, 1.45, 1.0, 16), vgAt(mx, my, b0 - 0.5, 0), cream.clone().multiplyScalar(0.94));
B.add('wall', new THREE.CylinderGeometry(2.35, 2.35, 0.25, 16), vgAt(mx, my, b0 + 0.12, 0), cream);
B.add('wall', new THREE.CylinderGeometry(2.3, 2.3, 0.95, 24, 1, true), vgAt(mx, my, b0 + 0.25 + 0.47, 0), cream);
B.add('wall', new THREE.CylinderGeometry(2.2, 2.2, 0.95, 24, 1, true), vgAt(mx, my, b0 + 0.25 + 0.47, 0), cream.clone().multiplyScalar(0.85));
B.add('wall', new THREE.CylinderGeometry(1.1, 1.25, mh - 3.2 - b0, 8), vgAt(mx, my, b0 + (mh - 3.2 - b0) / 2, Math.PI / 8), cream);
B.add('wall', new THREE.CylinderGeometry(1.16, 1.16, 1.6, 8, 1, true), vgAt(mx, my, mh - 4.4, Math.PI / 8), new THREE.Color(0x2f8a7f));
B.add('wall', new THREE.CylinderGeometry(1.35, 1.35, 0.25, 8), vgAt(mx, my, mh - 3.1, Math.PI / 8), cream);
B.add('tiles', new THREE.ConeGeometry(1.3, 2.9, 8), vgAt(mx, my, mh - 3.0 + 1.45, Math.PI / 8));
B.add('gold', new THREE.CylinderGeometry(0.04, 0.07, 1.0, 6), vgAt(mx, my, mh + 0.4, 0));
B.add('gold', new THREE.SphereGeometry(0.14, 10, 8), vgAt(mx, my, mh + 0.35, 0));
return { balcony: VW(mx, my, b0 + 0.9), top: VW(mx, my, mh + 1.0) };
}
function vgWaterTower(B, it) {
var x = it.x, y = it.y, R = it.r || 3.2, H = it.h || 21, conc = new THREE.Color(0xc9c4ba);
B.add('roof', new THREE.CylinderGeometry(1.25, 1.45, H - 8, 20), vgAt(x, y, (H - 8) / 2, 0), conc);
B.add('roof', new THREE.CylinderGeometry(R, 1.25, 2.4, 28), vgAt(x, y, H - 8 + 1.2, 0), conc);
B.add('roof', new THREE.CylinderGeometry(R, R, 5.0, 28), vgAt(x, y, H - 5.6 + 2.5, 0), conc.clone().multiplyScalar(1.04));
for (var k = 0; k < 3; k++) B.add('roof', new THREE.CylinderGeometry(R + 0.06, R + 0.06, 0.12, 28, 1, true), vgAt(x, y, H - 5.0 + k * 1.6, 0), conc.clone().multiplyScalar(0.8));
B.add('roof', new THREE.ConeGeometry(R + 0.1, 0.8, 28), vgAt(x, y, H - 0.6 + 0.4, 0), conc.clone().multiplyScalar(0.9));
B.add('metal', new THREE.CylinderGeometry(0.02, 0.02, H - 1, 4), vgAt(x + 1.3, y, (H - 1) / 2, 0), new THREE.Color(0x777777));   // the ladder's rail
return VW(x, y, H + 0.25);
}
function vgMast(B, it) {
var x = it.x, y = it.y, H = it.h || 34, rb = 1.6, rt = 0.5, n = Math.round(H / 2.0), lights = [];
var leg = function (k, z) { var rr = rb + (rt - rb) * z / H, a = k * 2 * Math.PI / 3; return [x + rr * Math.cos(a), y + rr * Math.sin(a), z]; };
var beam = function (a, b, r, col) { var A = VW(a[0], a[1], a[2]), Bv = VW(b[0], b[1], b[2]), d = Bv.clone().sub(A), L = d.length(); B.add('metal', new THREE.BoxGeometry(r, L, r), new THREE.Matrix4().compose(A.clone().addScaledVector(d, 0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1)), col); };
for (var i = 0; i < n; i++) {
var z0 = H * i / n, z1 = H * (i + 1) / n, band = Math.floor(z0 / (H / 7)) % 2 ? new THREE.Color(0xe9e9e6) : new THREE.Color(0xc4321f);
for (var k = 0; k < 3; k++) { beam(leg(k, z0), leg(k, z1), 0.12, band); beam(leg(k, z1), leg((k + 1) % 3, z1), 0.05, band); beam(leg(k, z0), leg((k + 1) % 3, z1), 0.04, band); }
}
for (var a = 0; a < 3; a++) { var aa = a * 2 * Math.PI / 3 + Math.PI / 3; B.add('plastic', new THREE.BoxGeometry(0.32, 1.7, 0.12), vgAt(x + 0.75 * Math.cos(aa), y + 0.75 * Math.sin(aa), H - 2.5, -aa + Math.PI / 2), new THREE.Color(0xdedede)); }
for (var d = 0; d < 2; d++) { var da = d * Math.PI + 0.4, dm = new THREE.Matrix4().compose(VW(x + 1.0 * Math.cos(da), y + 1.0 * Math.sin(da), H - 7), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -da, Math.PI / 2)), new THREE.Vector3(1, 1, 1)); B.add('metal', new THREE.SphereGeometry(0.45, 14, 6, 0, Math.PI * 2, 0, 0.6), dm, new THREE.Color(0xd8d8d4)); }
vgBox(B, 'wall', x + 3.2, y + 1.0, 1.5, 1.2, 0, 0, 2.6, new THREE.Color(0xd7d3c8), { topKey: 'roof', ts: 4 });
lights.push(VW(x, y, H + 0.3), VW(x, y, H * 0.52));
return lights;
}
function vgOlive(B, it) {
var r = vgRnd(it.s || 3), x = it.x, y = it.y, sc = 0.85 + 0.3 * r(), bark = new THREE.Color(1, 1, 1).multiplyScalar(0.8 + 0.3 * r());
var lean = (r() - 0.5) * 0.5, la = r() * 6.28;
for (var t = 0; t < 2; t++) {
var m = new THREE.Matrix4().compose(VW(x + Math.cos(la) * 0.25 * t, y + Math.sin(la) * 0.25 * t, 0.85 * sc), new THREE.Quaternion().setFromEuler(new THREE.Euler(lean + t * 0.35, r() * 6, (r() - 0.5) * 0.5)), new THREE.Vector3(sc, sc, sc));
B.add('bark', new THREE.CylinderGeometry(0.13, 0.26, 1.9, 7, 3), m, bark);
}
var leaf = new THREE.Color().setHSL(0.2 + 0.05 * r(), 0.22 + 0.1 * r(), 0.36 + 0.08 * r()), core = leaf.clone().multiplyScalar(0.55);
var nb = 4 + ((r() * 3) | 0);
for (var k = 0; k < nb; k++) {
var a = r() * 6.28, d = (0.5 + r() * 1.1) * sc, z = (2.3 + r() * 1.7) * sc, R = (0.9 + r() * 0.6) * sc;
var p = vgAt(x + d * Math.cos(a), y + d * Math.sin(a), z, r() * 6, R, R * (0.65 + 0.2 * r()), R);
B.add('leaves', VG.ico1 || (VG.ico1 = new THREE.IcosahedronGeometry(1, 1)), p, leaf.clone().multiplyScalar(0.9 + 0.25 * r()));
if (k < 3) B.add('core', VG.ico0 || (VG.ico0 = new THREE.IcosahedronGeometry(0.72, 0)), p, core);
}
}
function vgPalm(B, it) {
var r = vgRnd(it.s || 5), x = it.x, y = it.y, H = 7.5 + r() * 2.5, bend = 0.6 + r() * 1.0, ba = r() * 6.28, pts = [];
for (var i = 0; i <= 8; i++) { var t = i / 8, off = bend * t * t; pts.push(VW(x + Math.cos(ba) * off, y + Math.sin(ba) * off, H * t)); }
var top = pts[8];
B.add('palmBark', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.2, 8, false), new THREE.Matrix4());
B.add('core', new THREE.SphereGeometry(0.42, 10, 8), new THREE.Matrix4().makeTranslation(top.x, top.y, top.z), new THREE.Color(0x6b5a35));
var nf = 14 + ((r() * 5) | 0), base = new THREE.Color().setHSL(0.22 + 0.04 * r(), 0.35, 0.33);
for (var f = 0; f < nf; f++) {
var az = f / nf * 6.28 + r() * 0.3, up = 0.55 - 1.1 * (f % 3) / 2 - r() * 0.2, Lf = 3.2 + r() * 0.9, dead = f >= nf - 2;
var col = dead ? new THREE.Color(0x8a7550) : base.clone().multiplyScalar(0.85 + 0.3 * r());
if (dead) up = -1.2;
var P = [], U = [], S = 7, w = 0.65;
for (var j = 0; j <= S; j++) {
var t = j / S, el = up - 1.6 * t * t, dx = Math.cos(az), dz = Math.sin(az), along = Lf * t;
var cxp = top.x + dx * along * Math.cos(up * 0.5) , cyp = top.y + Lf * 0.55 * (Math.sin(up) * t - 0.5 * t * t * 1.4) , czp = top.z + dz * along * Math.cos(up * 0.5);
var px = -dz, pz = dx, ww = w * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.08));
P.push([cxp - px * ww, cyp - 0.08 * ww, czp - pz * ww], [cxp + px * ww, cyp - 0.08 * ww, czp + pz * ww], [cxp, cyp + 0.04, czp]);
U.push(t);
}
for (var q = 0; q < S; q++) {
var a0 = P[q * 3], a1 = P[q * 3 + 1], ac = P[q * 3 + 2], b0 = P[(q + 1) * 3], b1 = P[(q + 1) * 3 + 1], bc = P[(q + 1) * 3 + 2];
var V = function (p) { return new THREE.Vector3(p[0], p[1], p[2]); };
B.quad('frond', V(a0), V(ac), V(bc), V(b0), 0.5, 1 / S, col, 0, U[q]);
B.quad('frond', V(ac), V(a1), V(b1), V(bc), 0.5, 1 / S, col, 0.5, U[q]);
}
}
}
function vgCypress(B, it) {
var r = vgRnd(it.s || 7), x = it.x, y = it.y, H = 9.5 + r() * 2.5, R = 0.9 + r() * 0.25, pr = [];
for (var i = 0; i <= 10; i++) { var t = i / 10; pr.push(new THREE.Vector2(R * Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + t * 0.95)), 0.8) * (1 - 0.55 * t) + 0.02, H * t)); }
var g = new THREE.LatheGeometry(pr, 10), col = new THREE.Color().setHSL(0.28, 0.35, 0.2 + 0.05 * r());
B.add('leaves', g, vgAt(x, y, 0.3, r() * 6), col);
B.add('core', new THREE.LatheGeometry(pr.map(function (p) { return new THREE.Vector2(p.x * 0.8, p.y); }), 8), vgAt(x, y, 0.3, 0), col.clone().multiplyScalar(0.6));
B.add('bark', new THREE.CylinderGeometry(0.1, 0.16, 0.8, 6), vgAt(x, y, 0.4, 0), new THREE.Color(0.7, 0.7, 0.7));
}
function vgCar(B, it, col, pickup) {
var x = it.x, y = it.y, yaw = it.yaw || 0, c = Math.cos(yaw), s = Math.sin(yaw), at = function (lx, ly, z) { return vgAt(x + lx * c - ly * s, y + lx * s + ly * c, z, yaw); };
B.add('paint', new THREE.BoxGeometry(4.3, 0.62, 1.76), at(0, 0, 0.66), col);
B.add('paint', new THREE.BoxGeometry(4.1, 0.2, 1.7), at(0, 0, 0.32), col.clone().multiplyScalar(0.5));
if (pickup) { B.add('glass', new THREE.BoxGeometry(1.7, 0.6, 1.6), at(0.55, 0, 1.27)); B.add('paint', new THREE.BoxGeometry(1.75, 0.07, 1.64), at(0.55, 0, 1.6), col); vgBox(B, 'paint', x - c * 1.25, y - s * 1.25, 0.95, 0.85, yaw, 0.97, 1.35, col, { top: false }); }
else { B.add('glass', new THREE.BoxGeometry(2.3, 0.56, 1.58), at(-0.25, 0, 1.25)); B.add('paint', new THREE.BoxGeometry(2.2, 0.07, 1.6), at(-0.3, 0, 1.56), col); }
[[1.35, 0.83], [1.35, -0.83], [-1.35, 0.83], [-1.35, -0.83]].forEach(function (w) {
B.add('tyre', new THREE.CylinderGeometry(0.33, 0.33, 0.24, 14), new THREE.Matrix4().compose(VW(x + w[0] * c - w[1] * s, y + w[0] * s + w[1] * c, 0.33), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, yaw, 0, 'YXZ')), new THREE.Vector3(1, 1, 1)));
});
}
function vgGround(L, root) {
var B = L.bounds || [-150, -120, 160, 120], X0 = B[0] - 40, Y0 = B[1] - 40, X1 = B[2] + 40, Y1 = B[3] + 40, N = 2048, sx = N / (X1 - X0), sy = N / (Y1 - Y0);
var c = document.createElement('canvas'); c.width = c.height = N; var g = c.getContext('2d'), r = vgRnd((L.seed || 7) * 31 + 5);
var px = function (x) { return (x - X0) * sx; }, py = function (y) { return (Y1 - y) * sy; };
g.fillStyle = '#b29d78'; g.fillRect(0, 0, N, N);
vgBlobs(g, N, N, r, 420, 30, 180, ['rgba(190,170,120,A)', 'rgba(120,100,70,A)', 'rgba(130,128,80,A)', 'rgba(175,150,105,A)'], 0.12, 0.35);
vgSpeckle(g, N, N, r, 60000, 0.5, 2.0, ['rgba(80,70,50,A)', 'rgba(210,195,160,A)', 'rgba(110,110,70,A)'], 0.15, 0.45);
var ce = L.centre || [25, 0], ex = L.extent || [95, 72];
var gr = g.createRadialGradient(px(ce[0]), py(ce[1]), 0, px(ce[0]), py(ce[1]), ex[0] * 1.12 * sx); gr.addColorStop(0, 'rgba(196,180,148,0.85)'); gr.addColorStop(0.8, 'rgba(190,172,138,0.6)'); gr.addColorStop(1, 'rgba(190,172,138,0)');
g.save(); g.translate(px(ce[0]), py(ce[1])); g.scale(1, ex[1] / ex[0]); g.translate(-px(ce[0]), -py(ce[1])); g.fillStyle = gr; g.fillRect(0, 0, N, N); g.restore();
vgSpeckle(g, N, N, r, 20000, 0.5, 1.6, ['rgba(120,105,80,A)'], 0.1, 0.3);
(L.items || []).forEach(function (it) {
if (it.k === 'olive' || it.k === 'palm' || it.k === 'cypress') { var rr = (it.k === 'olive' ? 3.2 : 2.2) * sx, gg = g.createRadialGradient(px(it.x), py(it.y), 0, px(it.x), py(it.y), rr); gg.addColorStop(0, 'rgba(70,60,40,0.55)'); gg.addColorStop(1, 'rgba(70,60,40,0)'); g.fillStyle = gg; g.fillRect(px(it.x) - rr, py(it.y) - rr, 2 * rr, 2 * rr); }
if (it.k === 'olive') { g.fillStyle = 'rgba(120,95,65,0.25)'; g.fillRect(px(it.x) - 3.5 * sx, py(it.y) - 0.8 * sy, 7 * sx, 1.6 * sy); }
if (it.k === 'house' || it.k === 'mosque' || it.k === 'yard') { var hw = (it.w || 8) / 2 + 1.0, hd = (it.d || 8) / 2 + 1.0; g.save(); g.translate(px(it.x), py(it.y)); g.rotate(-(it.yaw || 0)); var g2 = g.createRadialGradient(0, 0, 0, 0, 0, Math.max(hw, hd) * sx * 1.3); g2.addColorStop(0.5, 'rgba(90,78,60,0.35)'); g2.addColorStop(1, 'rgba(90,78,60,0)'); g.fillStyle = g2; g.fillRect(-hw * sx * 1.3, -hd * sy * 1.3, 2.6 * hw * sx, 2.6 * hd * sy); g.restore(); }   // dirt along the walls
});
var tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
var T = vgTextures(), det = T.detail;
var mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.97, metalness: 0 });
mat.onBeforeCompile = function (sh) {
sh.uniforms.uDet = { value: det };
sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
sh.fragmentShader = 'uniform sampler2D uDet; varying vec3 vWp;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n  { float d1 = texture2D(uDet, vWp.xz / 3.0).r, d2 = texture2D(uDet, vWp.xz / 23.0 + 0.37).r, d3 = texture2D(uDet, vWp.xz / 410.0 + 0.71).r; diffuseColor.rgb *= (0.8 + 0.4 * d1) * (0.86 + 0.28 * d2) * (0.8 + 0.4 * d3); }');
};
var size = 6000, gm = new THREE.PlaneGeometry(size, size, 1, 1), uv = gm.attributes.uv, pos = gm.attributes.position;
for (var i = 0; i < pos.count; i++) { var wx = pos.getX(i), wy = pos.getY(i); uv.setXY(i, (wx - X0) / (X1 - X0), (wy - Y0) / (Y1 - Y0)); }   // (the plane lies in x, y before it is laid down: y is north)
var m = new THREE.Mesh(gm, mat); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; root.add(m);
return m;
}
function vgHills(root, seed) {
var r = vgRnd(seed * 7 + 3), NA = 160, NR = 14, P = [], C = [], I = [], amp = [], ph = [];
for (var k = 0; k < 6; k++) { amp.push(0.3 + r() * 0.7); ph.push(r() * 6.28); }
for (var j = 0; j <= NR; j++) for (var i = 0; i <= NA; i++) {
var a = i / NA * Math.PI * 2, t = j / NR, R = 650 + t * 2600, n = 0;
for (var k2 = 0; k2 < 6; k2++) n += amp[k2] * Math.sin(a * (k2 + 2) + ph[k2] + t * (k2 + 1) * 1.7) / (k2 + 1);
var h = Math.max(0, (60 + 110 * n + 40 * Math.sin(a * 13 + t * 9)) * Math.sin(Math.PI * Math.min(1, t * 1.6)) + 30 * t);
P.push(R * Math.cos(a), h, -R * Math.sin(a));
var col = new THREE.Color(0x9a8a66).lerp(new THREE.Color(0x6e7048), Math.max(0, Math.min(1, 0.4 + 0.5 * Math.sin(a * 7 + j))) * 0.5).multiplyScalar(0.85 + 0.15 * r());
C.push(col.r, col.g, col.b);
}
for (var j2 = 0; j2 < NR; j2++) for (var i2 = 0; i2 < NA; i2++) { var a0 = j2 * (NA + 1) + i2, b0 = a0 + NA + 1; I.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); }
var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I); g.computeVertexNormals();
var m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })); m.receiveShadow = false; root.add(m);
}
function vgLane(B, pts, wd) {
var acc = 0;
for (var i = 0; i < pts.length - 1; i++) {
var a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L * wd / 2, ny = dx / L * wd / 2;
var ext = 2.5, ax = a[0] - dx / L * (i ? ext : 0), ay = a[1] - dy / L * (i ? ext : 0);
B.quad('lane', VW(ax - nx, ay - ny, 0.03), VW(b[0] - nx, b[1] - ny, 0.03), VW(b[0] + nx, b[1] + ny, 0.03), VW(ax + nx, ay + ny, 0.03), 1, (L + (i ? ext : 0)) / 12, null, 0, acc / 12);
acc += L;
}
}
function vgWorld() {
var L = VG.layout; if (!L) return;
if (VG.root) {
scene.remove(VG.root);
VG.root.traverse(function (o) { if (o.geometry) o.geometry.dispose(); (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(function (m) { if (m.map && m.map.isCanvasTexture && !vgIsShared(m.map)) m.map.dispose(); if (m.dispose) m.dispose(); }); });
}
if (VG.envRT) { VG.envRT.dispose(); VG.envRT = null; }
var root = VG.root = new THREE.Group(); scene.add(root);
var Lt = VG.light = vgLight(L), hi = quality !== 'fast';
var sky = VG.sky = vgSkyMesh(Lt); root.add(sky);
var es = new THREE.Scene(), sk2 = vgSkyMesh(Lt); sk2.scale.setScalar(0.01); es.add(sk2);
var eg = new THREE.Mesh(new THREE.CircleGeometry(40, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8a7a5c).multiplyScalar(0.15 + 0.85 * Lt.day * Math.max(0.3, Lt.W.sun)) })); eg.rotation.x = -Math.PI / 2; eg.position.y = -2; es.add(eg);
VG.envRT = pmrem.fromScene(es, 0.03); scene.environment = VG.envRT.texture; scene.environmentIntensity = 0.55 + 0.45 * Lt.day;
sk2.geometry.dispose(); sk2.material.dispose(); eg.geometry.dispose(); eg.material.dispose();
scene.background = Lt.hor.clone(); scene.fog = new THREE.FogExp2(Lt.fogCol.getHex(), Lt.fog);
var sd = Lt.day > 0.02 ? VW(Lt.sun.e, Lt.sun.n, Math.max(0.03, Lt.sun.u)).normalize() : VW(0.45, -0.6, 0.66).normalize();
VG.sunDir = sd; var ctr = VW((L.centre || [25, 0])[0] - 35, (L.centre || [25, 0])[1], 0);
sun.color.copy(Lt.day > 0.02 ? Lt.sunCol : new THREE.Color(0x9fb4ff)); sun.intensity = Lt.day > 0.02 ? Lt.sunI : 0.32 * (1 - 0.6 * Lt.W.mixZ);
sun.position.copy(ctr).addScaledVector(sd, 420); sun.target.position.copy(ctr); sun.target.updateMatrixWorld();
sun.castShadow = renderer.shadowMap.enabled && (Lt.day > 0.02 ? Lt.sunI > 0.25 : true);
if (sun.castShadow) { var sc = sun.shadow.camera; sc.left = -175; sc.right = 175; sc.top = 150; sc.bottom = -150; sc.near = 50; sc.far = 900; sc.updateProjectionMatrix();
var ms = quality === 'high' ? 4096 : hi ? 4096 : 2048; sun.shadow.mapSize.set(ms, ms); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.06; sun.shadow.radius = 2.5; }
hemi.color.copy(Lt.zen.clone().lerp(new THREE.Color(1, 1, 1), 0.35)); hemi.groundColor.set(0x6d5d44).multiplyScalar(0.3 + 0.7 * Lt.day);
hemi.intensity = Lt.day > 0.02 ? 0.45 + 0.9 * Lt.day * (0.5 + 0.8 * Lt.W.mixZ) : 0.14;
if (Lt.night > 0.5) { hemi.color.set(0x34446e); hemi.groundColor.set(0x0e0c0a); }
renderer.toneMappingExposure = 0.92 + 0.6 * Lt.night - 0.15 * Lt.day * Lt.W.sun;
vgGround(L, root); vgHills(root, L.seed || 7);
var M = VG.mats = vgMats(Lt), T = vgTextures();
M.lane = new THREE.MeshStandardMaterial({ map: T.lane, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
M.paving = new THREE.MeshStandardMaterial({ map: T.paving, roughness: 0.88, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
var B = vgMerge();
(L.lanes || []).forEach(function (ln) { vgLane(B, ln, 5.5); });
var PL = L.pl || 13;
(L.lzs || []).forEach(function (p) {
B.quad('paving', VW(p[0] - PL, p[1] - PL, 0.05), VW(p[0] + PL, p[1] - PL, 0.05), VW(p[0] + PL, p[1] + PL, 0.05), VW(p[0] - PL, p[1] + PL, 0.05), 2 * PL / 6, 2 * PL / 6);
[[0, -PL, PL, 0.15], [0, PL, PL, 0.15], [-PL, 0, 0.15, PL], [PL, 0, 0.15, PL]].forEach(function (k) { vgBox(B, 'stone', p[0] + k[0], p[1] + k[1], k[2], k[3], 0, 0, 0.14, new THREE.Color(0xd2c6ae), { us: 3, vs: 3, ts: 3 }); });
});
var landmarks = { lights: [] }, lampsAt = [];
(L.items || []).forEach(function (it) {
if (it.k === 'house') vgHouse(B, it, Lt);
else if (it.k === 'yard') {
var c = Math.cos(it.yaw || 0), s = Math.sin(it.yaw || 0), hx = it.w / 2, hy = it.d / 2, col = new THREE.Color(0xe4d7bd);
[[0, hy, hx, 0.2], [0, -hy, hx, 0.2], [hx, 0, 0.2, hy * 0.35, hy * 0.62], [hx, 0, 0.2, hy * 0.35, -hy * 0.62], [-hx, 0, 0.2, hy]].forEach(function (w) {
var ox = w[0], oy = w[1] + (w[4] || 0); vgBox(B, 'stone', it.x + ox * c - oy * s, it.y + ox * s + oy * c, w[2], w[3], it.yaw || 0, 0, it.h || 2.3, col, { us: 3, vs: 3, ts: 3 });
});
}
else if (it.k === 'mosque') { var mq = vgMosque(B, it, Lt); landmarks.minaret = mq; }
else if (it.k === 'tower') landmarks.lights.push(vgWaterTower(B, it));
else if (it.k === 'mast') landmarks.lights = landmarks.lights.concat(vgMast(B, it));
else if (it.k === 'olive') vgOlive(B, it);
else if (it.k === 'palm') vgPalm(B, it);
else if (it.k === 'cypress') vgCypress(B, it);
else if (it.k === 'car') vgCar(B, it, new THREE.Color(VG_CARS[(it.c || 0) % VG_CARS.length]), it.c === 4);
});
var main = (L.lanes || [])[0] || [], ce = L.centre || [25, 0], ex = L.extent || [95, 72];
for (var i = 0; i < main.length - 1; i++) {
var a = main[i], b = main[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
for (var d = 12; d < len; d += 26) {
var t = d / len, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len, sd2 = (lampsAt.length % 2 ? 1 : -1);
if (Math.pow((x - ce[0]) / ex[0], 2) + Math.pow((y - ce[1]) / ex[1], 2) > 1.1) continue;
if ((L.lzs || []).some(function (p) { return Math.abs(x - p[0]) < PL + 3 && Math.abs(y - p[1]) < PL + 3; })) continue;
lampsAt.push([x + nx * 3.1 * sd2, y + ny * 3.1 * sd2, -nx * sd2, -ny * sd2]);
}
}
var WP = [];
for (var wi = 0; wi < lampsAt.length - 1; wi++) {
var la = lampsAt[wi], lb = lampsAt[wi + 1], wl = Math.hypot(lb[0] - la[0], lb[1] - la[1]); if (wl > 40) continue;
[6.15, 5.7].forEach(function (zw, j) { var sag = 0.5 + 0.35 * j; for (var q2 = 0; q2 < 10; q2++) { var t0 = q2 / 10, t1 = (q2 + 1) / 10, A1 = VW(la[0] + (lb[0] - la[0]) * t0, la[1] + (lb[1] - la[1]) * t0, zw - 4 * sag * t0 * (1 - t0)), B1 = VW(la[0] + (lb[0] - la[0]) * t1, la[1] + (lb[1] - la[1]) * t1, zw - 4 * sag * t1 * (1 - t1)); WP.push(A1.x, A1.y, A1.z, B1.x, B1.y, B1.z); } });
}
if (WP.length) { var wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(WP, 3)); root.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0x1c1c1c }))); }
lampsAt.forEach(function (l) {
B.add('metal', new THREE.CylinderGeometry(0.06, 0.1, 6.2, 8), vgAt(l[0], l[1], 3.1, 0), new THREE.Color(0x3b3b3b));
var hx = l[0] + l[2] * 0.9, hy = l[1] + l[3] * 0.9;
B.add('metal', new THREE.BoxGeometry(1.0, 0.05, 0.05), vgAt((l[0] + hx) / 2, (l[1] + hy) / 2, 6.1, Math.atan2(l[3], l[2])), new THREE.Color(0x3b3b3b));
B.add('metal', new THREE.CylinderGeometry(0.12, 0.28, 0.22, 10), vgAt(hx, hy, 6.0, 0), new THREE.Color(0x2a2a2a));
B.add('lamp', new THREE.CylinderGeometry(0.22, 0.22, 0.04, 10), vgAt(hx, hy, 5.88, 0));
l.head = VW(hx, hy, 5.82);
});
var bs = (L.bases || [[-115, 2]])[0], padH = 6.5;
B.quad('pad', VW(bs[0] - padH, bs[1] - padH, 0.06), VW(bs[0] + padH, bs[1] - padH, 0.06), VW(bs[0] + padH, bs[1] + padH, 0.06), VW(bs[0] - padH, bs[1] + padH, 0.06), 1, 1);
vgBox(B, 'paint', bs[0] - 4, bs[1] + 15, 3.0, 1.2, 0.1, 0, 2.6, new THREE.Color(0x5d6346), { topCol: new THREE.Color(0x4d533a), ts: 6, us: 6, vs: 6 });
vgCar(B, { x: bs[0] + 6, y: bs[1] + 16, yaw: 0.3 }, new THREE.Color(0xc9bd98), true);
for (var k = 0; k < 5; k++) B.add('paint', new THREE.BoxGeometry(0.9, 0.6, 0.7), vgAt(bs[0] - 8.5 + (k % 3) * 1.0, bs[1] + 11.2 + (k > 2 ? 0.8 : 0), 0.3 + (k === 4 ? 0.6 : 0), 0.05 * k), new THREE.Color(0x6a6e4f));
var blueAt = []; for (var q = 0; q < 12; q++) { var aa = q / 12 * Math.PI * 2, bx = bs[0] + Math.cos(aa) * (padH + 0.6), by = bs[1] + Math.sin(aa) * (padH + 0.6); B.add('metal', new THREE.CylinderGeometry(0.07, 0.09, 0.22, 8), vgAt(bx, by, 0.11, 0), new THREE.Color(0x333333)); blueAt.push(VW(bx, by, 0.26)); }
B.add('metal', new THREE.CylinderGeometry(0.05, 0.07, 5.2, 8), vgAt(bs[0] + 11, bs[1] - 8, 2.6, 0), new THREE.Color(0xe0e0e0));
B.build(M, root, { noShadow: { lane: 1, paving: 1, pad: 1, win: 1, winL: 1, door: 1, shut: 1 } });
var sock = new THREE.Group(), sm = new THREE.MeshStandardMaterial({ color: 0xff6a12, roughness: 0.7, side: THREE.DoubleSide });
var cone = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.32, 1.8, 14, 1, true), sm); cone.rotation.z = Math.PI / 2; cone.position.x = 0.9; cone.castShadow = true; sock.add(cone);
for (var bnd = 0; bnd < 2; bnd++) { var wb = new THREE.Mesh(new THREE.CylinderGeometry(0.19 + bnd * 0.07 - 0.005, 0.25 + bnd * 0.07, 0.3, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.7, side: THREE.DoubleSide })); wb.rotation.z = Math.PI / 2; wb.position.x = 1.25 - bnd * 0.6; sock.add(wb); }
sock.position.copy(VW(bs[0] + 11, bs[1] - 8, 5.1)); root.add(sock); VG.sock = sock;
VG.lz = vgLzKit(root, M);
VG.glows = []; VG.blink = [];
var nightK = Lt.night, dusk = Math.max(nightK, 1 - THREE.MathUtils.smoothstep(Lt.el, 2, 12) * (1 - 0.6 * Lt.W.mixZ));
M.lamp.emissiveIntensity = dusk > 0.25 ? 5 * dusk : 0;
M.winL.emissiveIntensity = 1.6 * Math.max(nightK, dusk * 0.7);
VG.dusk = dusk;
if (dusk > 0.25) {
lampsAt.forEach(function (l, i) {
var f = crFlare(0xffc988, 3.2, 0.55 * dusk); f.position.copy(l.head); root.add(f); VG.glows.push(f);
if (i % 3 === 0 && i < 30) { var pl = new THREE.PointLight(0xffb870, 40 * dusk, 26, 1.8); pl.position.copy(l.head).add(new THREE.Vector3(0, -0.4, 0)); root.add(pl); }
});
if (landmarks.minaret) { var ring = new THREE.Mesh(new THREE.TorusGeometry(2.32, 0.05, 6, 48), M.green); ring.rotation.x = Math.PI / 2; ring.position.copy(landmarks.minaret.balcony); root.add(ring); var gp = new THREE.PointLight(0x40ff90, 30 * dusk, 14, 2); gp.position.copy(landmarks.minaret.balcony); root.add(gp); }
}
landmarks.lights.forEach(function (p) { var s = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), M.red); s.position.copy(p); root.add(s); var f = crFlare(0xff3020, 2.6, 0.9); f.position.copy(p); root.add(f); VG.blink.push({ m: f, ph: Math.random() * 3, base: 0.95 }); });
blueAt.forEach(function (p) { var s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), M.blue); s.position.copy(p); root.add(s); if (dusk > 0.2) { var f = crFlare(0x3a7bff, 0.9, 0.7 * dusk); f.position.copy(p); root.add(f); } });
if (Lt.rain > 0) {
root.traverse(function (o) { var m = o.material; if (!m || !m.isMeshStandardMaterial || m.emissiveIntensity > 0 || m.userData.wet) return; m.userData.wet = 1; m.color.multiplyScalar(0.72); if (m.roughness > 0.6) m.roughness = 0.42; m.envMapIntensity = 1.3; });
renderer.toneMappingExposure *= 0.82;
} else if (Lt.W.mixZ > 0.8) renderer.toneMappingExposure *= 0.92;
vgWeatherFx(root, Lt, L);
VG.drone = vgDroneModel(); root.add(VG.drone.root);
VG.kitDrop = VG.drone.kit.clone(); VG.kitDrop.visible = false; root.add(VG.kitDrop);
vgParticles(root);
vgRays(root);
VG.mapBg = null;
}
function vgIsShared(t) { var T = VG.tex; if (!T) return false; for (var k in T) if (T[k] === t) return true; return false; }
function vgLzKit(root, M) {
var g = new THREE.Group(), T = vgTextures();
var mk = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), M.marker); mk.rotation.x = -Math.PI / 2; mk.position.y = 0.08; mk.receiveShadow = true; g.add(mk);
var leg = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
for (var k = 0; k < 3; k++) { var l = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 5), leg); var a = k * 2.1; l.position.set(2.9 + Math.cos(a) * 0.12, 0.24, 2.9 + Math.sin(a) * 0.12); l.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3); g.add(l); }
var st = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.12), leg); st.position.set(2.9, 0.52, 2.9); g.add(st);
var strobe = crFlare(0xffffff, 2.2, 0); strobe.position.set(2.9, 0.62, 2.9); g.add(strobe);
var can = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.22, 10), new THREE.MeshStandardMaterial({ color: 0x3c5a2c, roughness: 0.6 })); can.position.set(-3.2, 0.11, -3.0); can.castShadow = true; g.add(can);
var tent = new THREE.Group(), tw = 4.2, tl = 5.0, th = 2.6, cv = new THREE.MeshStandardMaterial({ color: 0xb3a27a, roughness: 0.95, side: THREE.DoubleSide });
var shape = new THREE.Shape(); shape.moveTo(-tw / 2, 0); shape.lineTo(tw / 2, 0); shape.lineTo(0.15, th); shape.lineTo(-0.15, th); shape.lineTo(-tw / 2, 0);
var tg = new THREE.ExtrudeGeometry(shape, { depth: tl, bevelEnabled: false }); tg.translate(0, 0, -tl / 2);
var tm = new THREE.Mesh(tg, cv); tm.castShadow = tm.receiveShadow = true; tent.add(tm);
var crossP = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), M.kitTex); var sl = Math.atan2(th, tw / 2 - 0.15);
crossP.position.set(tw / 4 + 0.03, th / 2 + 0.02, 0); crossP.rotation.set(0, Math.PI / 2, 0); crossP.rotateX(-(Math.PI / 2 - sl)); tent.add(crossP);
var crossP2 = crossP.clone(); crossP2.position.x = -crossP.position.x; crossP2.rotation.set(0, -Math.PI / 2, 0); crossP2.rotateX(-(Math.PI / 2 - sl)); tent.add(crossP2);
var flap = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.0), new THREE.MeshStandardMaterial({ color: 0x1a1712, roughness: 1 })); flap.position.set(0, 1.0, tl / 2 + 0.02); tent.add(flap);
tent.position.set(-7.8, 0, 6.5); tent.rotation.y = 0.35; g.add(tent);
var olive = new THREE.MeshStandardMaterial({ color: 0x5b6142, roughness: 0.9 });
var str = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 2.0), olive); str.position.set(-5.2, 0.35, 8.6); str.rotation.y = 0.35; str.castShadow = true; g.add(str);
[[-5.0, 0.15], [-5.4, -0.15]].forEach(function (s) { var l2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), leg); l2.position.set(s[0], 0.15, 8.6 + s[1] * 5); g.add(l2); });
for (var b = 0; b < 3; b++) { var bx = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.45), M.kitTex); bx.position.set(-9.9 + b * 0.7, 0.2, 3.8); bx.castShadow = true; g.add(bx); }
var sand = new THREE.MeshStandardMaterial({ color: 0xa8956c, roughness: 1 });
for (var s2 = 0; s2 < 9; s2++) { var sb = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.45, 3, 8), sand); sb.rotation.z = Math.PI / 2; sb.scale.set(1, 1, 0.6); sb.position.set(-11 + (s2 % 5) * 0.68, 0.12 + (s2 > 4 ? 0.22 : 0), 11.2); sb.castShadow = true; g.add(sb); }
g.position.copy(VW(0, 0, 0)); root.add(g); g.visible = false;
return { group: g, strobe: strobe, can: can };
}
function vgB(bx, by, bz) { return new THREE.Vector3(bx, bz, -by); }
function vgDroneModel() {
var D = { root: new THREE.Group(), props: [], discs: [], blades: [] }, b = D.body = new THREE.Group(); D.root.add(b);
var arm = ARM_V, std = function (o) { return new THREE.MeshStandardMaterial(o); };
var carbon = std({ color: 0x1b1d21, roughness: 0.38, metalness: 0.4 }), white = new THREE.MeshPhysicalMaterial({ color: 0xe9ebee, roughness: 0.32, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.2 });
var grey = std({ color: 0x4a4e55, roughness: 0.5, metalness: 0.6 }), alu = std({ color: 0xb8bcc2, roughness: 0.3, metalness: 0.9 }), dark = std({ color: 0x0f1012, roughness: 0.6 });
var add = function (g, m, p, rot) { var o = new THREE.Mesh(g, m); o.position.copy(p); if (rot) o.quaternion.copy(rot); o.castShadow = true; o.receiveShadow = true; b.add(o); return o; };
add(new THREE.CylinderGeometry(0.36, 0.4, 0.16, 8), carbon, vgB(0, 0, 0.0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 8));
var cap = add(new THREE.SphereGeometry(0.34, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), white, vgB(0, 0, 0.08)); cap.scale.set(1.18, 0.5, 0.95);
add(new THREE.BoxGeometry(0.3, 0.05, 0.2), white, vgB(0.36, 0, 0.04));
add(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 16), white, vgB(-0.05, 0, 0.27));
add(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 6), grey, vgB(-0.2, 0.1, 0.3));
add(new THREE.SphereGeometry(0.075, 16, 12), dark, vgB(0.36, 0, -0.12));
var lens = add(new THREE.CircleGeometry(0.035, 16), new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.05, metalness: 0.9 }), vgB(0.432, 0, -0.13)); lens.rotation.y = Math.PI / 2;
var MP = [[arm, arm], [arm, -arm], [-arm, -arm], [-arm, arm]];
MP.forEach(function (m, i) {
var p = vgB(m[0], m[1], 0.02), len = Math.hypot(m[0], m[1]) - 0.25, mid = vgB(m[0] * 0.58, m[1] * 0.58, 0.02);
var q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().setY(0).normalize());
add(new THREE.CylinderGeometry(0.032, 0.04, len, 12), carbon, mid, q);
add(new THREE.CylinderGeometry(0.09, 0.1, 0.1, 18), grey, vgB(m[0], m[1], 0.06));
add(new THREE.CylinderGeometry(0.085, 0.085, 0.05, 18), alu, vgB(m[0], m[1], 0.13));
add(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 6), dark, vgB(m[0], m[1], -0.01));
var rot = new THREE.Group(); rot.position.copy(vgB(m[0], m[1], 0.17)); b.add(rot); D.props.push(rot);
var bl = new THREE.Group(); rot.add(bl); D.blades.push(bl);
[-1, 1].forEach(function (sd) {
var bg = new THREE.BoxGeometry(0.5, 0.012, 0.075); bg.translate(0.25 * sd, 0, 0);
var bm = new THREE.Mesh(bg, carbon); bm.rotation.x = 0.12 * sd * (i % 2 ? -1 : 1); bm.castShadow = true; bl.add(bm);
});
var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.04, 12), alu); bl.add(hub);
var disc = new THREE.Mesh(new THREE.CircleGeometry(0.51, 40), new THREE.MeshBasicMaterial({ map: vgTextures().disc, transparent: true, depthWrite: false, opacity: 0, side: THREE.DoubleSide }));
disc.rotation.x = -Math.PI / 2; disc.renderOrder = 4; rot.add(disc); D.discs.push(disc);
D.props[i].userData.dir = i % 2 ? -1 : 1;
});
[-1, 1].forEach(function (sd) {
[0.22, -0.22].forEach(function (x) { var a = vgB(x, sd * 0.24, -0.07), c = vgB(x * 1.15, sd * 0.36, -0.53), d = c.clone().sub(a), o = add(new THREE.CylinderGeometry(0.018, 0.018, d.length(), 8), carbon, a.clone().addScaledVector(d, 0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); });
add(new THREE.CylinderGeometry(0.022, 0.022, 0.8, 10), carbon, vgB(0, sd * 0.36, -0.535), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2));
});
var T = vgTextures(), side = std({ color: 0x1f7a45, roughness: 0.55 }), top = std({ map: T.kit, roughness: 0.55 });
var kit = D.kit = new THREE.Group(), kb = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.32, 0.38), [top, top, top, side, top, top]); kb.castShadow = true; kit.add(kb);
var strap = std({ color: 0x111111, roughness: 0.8 });
[-0.14, 0.14].forEach(function (x) { var s = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.33, 0.39), strap); s.position.x = x; kit.add(s); });
var hd = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 12, Math.PI), strap); hd.position.y = 0.16; kit.add(hd);
kit.position.copy(vgB(0, 0, -0.33)); b.add(kit);
add(new THREE.BoxGeometry(0.62, 0.03, 0.06), grey, vgB(0, 0.2, -0.13)); add(new THREE.BoxGeometry(0.62, 0.03, 0.06), grey, vgB(0, -0.2, -0.13));
var mk = function (col, p, sz) { var m = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshBasicMaterial({ color: col })); m.position.copy(p); b.add(m); var f = crFlare(col, sz, 0.85); f.position.copy(p); b.add(f); return f; };
D.nav = [mk(new THREE.Color(3, 0.1, 0.05), vgB(arm + 0.05, arm + 0.05, 0.0), 0.7), mk(new THREE.Color(0.1, 3, 0.4), vgB(arm + 0.05, -arm - 0.05, 0.0), 0.7),
mk(new THREE.Color(0.1, 3, 0.4), vgB(-arm - 0.05, -arm - 0.05, 0.0), 0.7), mk(new THREE.Color(3, 0.1, 0.05), vgB(-arm - 0.05, arm + 0.05, 0.0), 0.7)];
D.strobe = mk(new THREE.Color(3, 3, 3), vgB(-0.3, 0, 0.12), 2.4); D.strobe2 = mk(new THREE.Color(3, 3, 3), vgB(0, 0, -0.1), 2.0);
var spot = D.spot = new THREE.SpotLight(0xfff4e0, 0, 45, 0.55, 0.6, 1.5); spot.position.copy(vgB(0.3, 0, -0.14)); spot.castShadow = false; b.add(spot);
spot.target.position.copy(vgB(1.2, 0, -5)); b.add(spot.target);
return D;
}
var ARM_V = 0.68;
function vgParticles(root) {
var N = 900, g = new THREE.BufferGeometry(), P = new Float32Array(N * 3), C = new Float32Array(N * 4), S = new Float32Array(N);
g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 4)); g.setAttribute('size', new THREE.BufferAttribute(S, 1));
var mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: true, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uMap: { value: vgTextures().puff }, uScale: { value: 400 } }]),
vertexShader: '#include <fog_pars_vertex>\nattribute float size; attribute vec4 color; varying vec4 vC; uniform float uScale; void main(){ vC = color; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * uScale / max(0.5, -mvPosition.z); gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}',
fragmentShader: '#include <fog_pars_fragment>\nuniform sampler2D uMap; varying vec4 vC; void main(){ float a = texture2D(uMap, gl_PointCoord).a * vC.a; if (a < 0.004) discard; gl_FragColor = vec4(vC.rgb, a);\n#include <fog_fragment>\n}' });
var pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 6; root.add(pts);
VG.pt = { g: g, P: P, C: C, S: S, N: N, list: [], mat: mat };
}
function vgEmit(x, y, z, vx, vy, vz, life, s0, s1, col, a, up, wk) {
var Q = VG.pt; if (!Q || Q.list.length >= Q.N) return;
Q.list.push({ p: new THREE.Vector3(x, y, z), v: new THREE.Vector3(vx, vy, vz), age: 0, life: life, s0: s0, s1: s1, c: col, a: a, up: up || 0, wk: wk == null ? 0.5 : wk });
}
function vgPartStep(dt, wind) {
var Q = VG.pt; if (!Q) return; var keep = [], i = 0;
for (var k = 0; k < Q.list.length; k++) {
var p = Q.list[k]; p.age += dt; if (p.age >= p.life) continue;
var drag = Math.exp(-dt * 1.6); p.v.multiplyScalar(drag); p.v.x += (wind.x - p.v.x) * dt * p.wk; p.v.z += (wind.z - p.v.z) * dt * p.wk; p.v.y += p.up * dt;
p.p.addScaledVector(p.v, dt); if (p.p.y < 0.05) { p.p.y = 0.05; p.v.y = Math.abs(p.v.y) * 0.2; }
keep.push(p); var t = p.age / p.life;
Q.P[i * 3] = p.p.x; Q.P[i * 3 + 1] = p.p.y; Q.P[i * 3 + 2] = p.p.z;
Q.C[i * 4] = p.c.r; Q.C[i * 4 + 1] = p.c.g; Q.C[i * 4 + 2] = p.c.b; Q.C[i * 4 + 3] = p.a * Math.min(1, t * 6) * (1 - t) * (1 - t);
Q.S[i] = p.s0 + (p.s1 - p.s0) * Math.sqrt(t); i++;
}
Q.list = keep;
for (var j = i; j < Q.N; j++) Q.C[j * 4 + 3] = 0;
Q.g.attributes.position.needsUpdate = true; Q.g.attributes.color.needsUpdate = true; Q.g.attributes.size.needsUpdate = true; Q.g.setDrawRange(0, Math.max(1, i));
}
function vgRays(root) {
var n = 26, g = new THREE.BufferGeometry(), P = new Float32Array(n * 6), C = new Float32Array(n * 6);
g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3));
var ln = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
ln.frustumCulled = false; ln.renderOrder = 8; root.add(ln);
var dg = new THREE.BufferGeometry(), DP = new Float32Array(n * 3), DC = new Float32Array(n * 3);
dg.setAttribute('position', new THREE.BufferAttribute(DP, 3)); dg.setAttribute('color', new THREE.BufferAttribute(DC, 3));
var dots = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.35, vertexColors: true, map: vgTextures().puff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
dots.frustumCulled = false; dots.renderOrder = 9; root.add(dots);
VG.rays = { ln: ln, g: g, P: P, C: C, dots: dots, dg: dg, DP: DP, DC: DC, max: 1 };
}
function vgWeatherFx(root, Lt, L) {
VG.rain = null; VG.motes = null;
if (Lt.rain > 0) {
var n = 9000, g = new THREE.BufferGeometry(), P = new Float32Array(n * 6), r = vgRnd(9);
for (var i = 0; i < n; i++) { var rr = 2 + Math.pow(r(), 1.6) * 60, a = r() * 6.283, x = Math.cos(a) * rr, y = r() * 60, z = Math.sin(a) * rr; P.set([x, y, z, x, y - 1.3, z], i * 6); }
g.setAttribute('position', new THREE.BufferAttribute(P, 3));
var m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: new THREE.Color(0xd6dde6).multiplyScalar(0.45 + 0.55 * Lt.day), transparent: true, opacity: 0.55, depthWrite: false }));
m.frustumCulled = false; root.add(m); VG.rain = { m: m, P: P, n: n, base: P.slice() };
}
if (Lt.dust > 0) {
var n2 = 1600, g2 = new THREE.BufferGeometry(), P2 = new Float32Array(n2 * 3), r2 = vgRnd(11);
for (var j = 0; j < n2; j++) P2.set([(r2() - 0.5) * 140, r2() * 40, (r2() - 0.5) * 140], j * 3);
g2.setAttribute('position', new THREE.BufferAttribute(P2, 3));
var m2 = new THREE.Points(g2, new THREE.PointsMaterial({ size: 0.9, map: vgTextures().puff, color: new THREE.Color(0xd7b088).multiplyScalar(0.4 + 0.6 * Lt.day), transparent: true, opacity: 0.22 * Lt.dust, depthWrite: false }));
m2.frustumCulled = false; root.add(m2); VG.motes = { m: m2, P: P2, n: n2 };
}
}
var VROW = [], VGV = new THREE.Vector3(), VGV2 = new THREE.Vector3(), VGV3 = new THREE.Vector3(), VGQ2 = new THREE.Quaternion();
var VG_FIXED = /^village:/.test(String(P.camera || '')) ? String(P.camera).slice(8).trim() : '';
function vgStep(dt) {
if (VG.rebuild && VG.layout) { vgWorld(); VG.rebuild = false; VG.cur = null; }
if (!VG.root) return;
var E = vgPick(), now = vgNow();
if (E && E.kind === 'training' && VG.cur && VG.cur.kind === 'training' && VG.cur !== E && VG.ct != null && VG.ct < VG.cur.frames[VG.cur.frames.length - 1][0] + 3.0) E = VG.cur;
if (E !== VG.cur) { VG.cur = E; VG.ct = null; VG.shot = null; VG.resShown = false; VG.capKey = ''; vgCap.style.display = 'none'; if (E && E.kind === 'run') VG.wait = 0; ctx.status(vgStatus()); }
VG.sway.value += dt; if (VG.sky) VG.sky.material.uniforms.uTime.value += dt;
if (!E || !E.frames.length) { vgIdleCam(dt); vgFx(dt, null, null); return; }
var F = E.frames;
if (E.nF !== F.length) { E.nF = F.length; vgEpisode(E); }
if (E.kind === 'training') {
if (VG.ct == null) VG.ct = F[0][0];
if (playing) VG.ct += dt * speed;
if (VG.ct > F[F.length - 1][0] + 3.0) { VG.ct = F[0][0]; VG.shot = null; VG.resShown = false; }
} else if (E.kind === 'run' && E.ahead) {
var pt = now - E.startAt;
if (pt < 0) {
var cd = Math.ceil(-pt - 1e-6); VG.ct = F[0][0];
if (cd <= 3) { crBan.style.display = 'none'; crCount(cd, Math.min(1, Math.max(0, cd + pt))); if (VG.beep !== -cd) { VG.beep = -cd; crSnd('count', 1, null); } }
else { crCount(null); if (crBan.style.display === 'none') crBanner('GET READY', '#f3f5f7'); }
} else {
crCount(null);
if (VG.beep != null && VG.beep < 0 && pt < 1.5) { crBan.style.display = 'none'; VG.beep = 0; crSnd('go', 1, null); }
var want = F[0][0] + pt, newest = F[F.length - 1][0];
if (VG.ct == null || Math.abs(want - VG.ct) > 0.5) VG.ct = want; else VG.ct += dt * Math.min(1.1, Math.max(0.9, 1 + 0.5 * (want - VG.ct)));
VG.ct = Math.min(Math.max(VG.ct, F[0][0]), newest);
}
} else VG.ct = F[0][0];
if (VG.hold != null) { VG.ct = Math.min(F[F.length - 1][0], VG.hold); crCount(null); if (/GET READY/.test(crBan.textContent)) crBan.style.display = 'none'; }   // (a fixed moment, for checking a picture)
if (VG.wait && performance.now() - VG.wait > 30000) { VG.wait = 0; if (crBan.style.display !== 'none' && /GET READY/.test(crBan.textContent)) crBan.style.display = 'none'; }
vgLerp(F, VG.ct, VROW);
vgPose(E, VROW, dt);
}
function vgEpisode(E) {
var I = VG.F, F = E.frames; E.kitAt = null;
for (var i = 0; i < F.length; i++) if (F[i][I.kit] < 0.5) { E.kitAt = F[i][0]; E.kitRow = F[i]; break; }
var L = VG.layout || {}, lzs = L.lzs || [], bs = (L.bases || [[0, 0]])[0];
E.lzP = E.lz || (lzs[1] || lzs[0] || [0, 0]); E.homeP = E.home || bs;
if (VG.lz) { VG.lz.group.position.copy(VW(E.lzP[0], E.lzP[1], 0)); VG.lz.group.visible = true; }
VG.kitDrop.visible = false; VG.trail = null;
}
function vgFlag(r, k) { var i = VG.F[k]; return i == null ? 0 : r[i]; }
function vgPose(E, r, dt) {
var I = VG.F, D = VG.drone; if (!D) return;
var p = VW(r[I.x], r[I.y], r[I.z], D.root.position);
D.root.quaternion.set(r[I.qx], r[I.qz], -r[I.qy], r[I.qw]).normalize();
for (var k = 0; k < 4; k++) {
var m = Math.max(0, r[I['m' + k]] || 0), w = m > 0.02 ? 30 + 160 * Math.sqrt(m) : 0;
D.props[k].rotation.y += (offlineDt(dt)) * w * D.props[k].userData.dir;
var op = Math.max(0, Math.min(1, (m - 0.04) * 5)); D.discs[k].material.opacity = 0.85 * op; D.blades[k].visible = op < 0.6;
}
var kitOn = E.kitAt == null || VG.ct < E.kitAt; D.kit.visible = kitOn;
if (!kitOn && E.kitRow) { var kr = E.kitRow; VG.kitDrop.visible = true; VG.kitDrop.position.copy(VW(kr[I.x], kr[I.y], 0.17)); VG.kitDrop.quaternion.set(0, kr[I.qz], 0, kr[I.qw]).normalize(); }
else VG.kitDrop.visible = false;
var tt = performance.now() / 1000, agl = vgFlag(r, 'agl'), mm = ((r[I.m0] || 0) + (r[I.m1] || 0) + (r[I.m2] || 0) + (r[I.m3] || 0)) / 4;
var fl = (tt % 1.1) < 0.06 || ((tt % 1.1) > 0.16 && (tt % 1.1) < 0.2); D.strobe.material.opacity = fl ? 1 : 0; D.strobe2.material.opacity = ((tt + 0.55) % 1.1) < 0.06 ? 1 : 0;
D.spot.intensity = mm > 0.05 && VG.dusk > 0.3 && agl < 30 ? 90 * VG.dusk : 0;
var nk = 0.25 + 0.75 * (VG.dusk || 0); D.nav.forEach(function (f) { f.material.opacity = 0.45 + 0.45 * nk; f.scale.setScalar(0.75 * nk); }); D.strobe.scale.setScalar(2.4 * nk); D.strobe2.scale.setScalar(2.0 * nk);
VG.drone.root.userData.mm = mm;
vgFx(dt, E, r);
vgSensors(E, r);
vgCamera(E, r, dt);
vgHudTick(E, r);
vgAud(E, r);
}
function offlineDt(dt) { return CAP.offline ? 1 / 30 : dt; }
function vgFx(dt, E, r) {
var I = VG.F, Lt = VG.light || {}, L = VG.layout || {}, tt = performance.now() / 1000, d = offlineDt(dt);
var wx = r && I.wx != null ? r[I.wx] : (+L.wind || 0) * 0.7, wy = r && I.wy != null ? r[I.wy] : (+L.wind || 0) * 0.7;
var wind3 = VW(wx, wy, 0, VGV3), shade = 0.25 + 0.75 * (Lt.day || 0);
if (r && VG.drone) {
var p = VG.drone.root.position, agl = vgFlag(r, 'agl'), mm = VG.drone.root.userData.mm || 0;
if (agl < 7 && mm > 0.12) {
var n = Math.round(d * 90 * (1 - agl / 7) * Math.min(1, mm * 2.5) + Math.random());
for (var k = 0; k < n; k++) { var a = Math.random() * 6.283, rr = 0.8 + Math.random() * 1.6, sp = 4 + Math.random() * 5; vgEmit(p.x + Math.cos(a) * rr, 0.15, p.z + Math.sin(a) * rr, Math.cos(a) * sp, 0.4 + Math.random() * 0.9, Math.sin(a) * sp, 1.4 + Math.random() * 1.2, 0.6, 3.8, new THREE.Color(0xbfa983).multiplyScalar(shade), 0.32, -0.4, 0.6); }
}
if (E && VG.lz && VG.lz.group.visible) {
var lz = VG.lz.group.position, dist = Math.hypot(p.x - lz.x, p.z - lz.z), on = dist < 160 && (E.kitAt == null || VG.ct < E.kitAt + 25);
if (on) { var cp = VGV.copy(VG.lz.can.position).add(lz), ns = Math.round(d * 22 + Math.random()); for (var j = 0; j < ns; j++) { var gsh = 0.8 + 0.35 * Math.random(); vgEmit(cp.x, cp.y + 0.15, cp.z, (Math.random() - 0.5) * 1.2, 1.2 + Math.random() * 0.8, (Math.random() - 0.5) * 1.2, 8 + Math.random() * 4, 0.35, 7.5, new THREE.Color(0.30 * gsh, 0.74 * gsh, 0.40 * gsh).multiplyScalar(0.35 + 0.65 * shade), 0.5, 0.35, 0.35); } }
VG.lz.strobe.material.opacity = on && (tt % 0.7) < 0.07 ? 1 : 0;
}
}
vgPartStep(d, wind3);
if (VG.sock) { var ws = Math.hypot(wx, wy); VG.sock.rotation.y = Math.atan2(-wind3.z, wind3.x) * 1; VG.sock.rotation.z = -Math.max(0, 1.25 - ws * 0.22) + Math.sin(tt * 3.1) * 0.04 * Math.min(1, ws / 4); }
VG.blink.forEach(function (b) { b.m.material.opacity = ((tt + b.ph) % 1.5) < 0.75 ? b.base : 0.05; });
if (VG.rain) {
var R = VG.rain, P = R.P, cam = camera.position;
R.m.position.set(Math.round(cam.x / 4) * 4, Math.max(0, cam.y - 25), Math.round(cam.z / 4) * 4);
for (var i = 0; i < R.n; i++) { var o = i * 6; P[o + 1] -= 9 * d; P[o + 4] -= 9 * d; P[o] += wind3.x * 0.1 * d; P[o + 3] = P[o] - wind3.x * 0.08; if (P[o + 4] < 0) { P[o + 1] += 60; P[o + 4] += 60; } if (P[o] > 62) { P[o] -= 124; P[o + 3] -= 124; } else if (P[o] < -62) { P[o] += 124; P[o + 3] += 124; } }
R.m.geometry.attributes.position.needsUpdate = true;
}
if (VG.motes) { var Mo = VG.motes, cam2 = camera.position; Mo.m.position.set(Math.round(cam2.x / 4) * 4, 0, Math.round(cam2.z / 4) * 4); Mo.m.rotation.y += d * 0.01; }
}
function vgSensors(E, r) {
var on = VG.sensOn !== false && !VG_FIXED, R = VG.rays, I = VG.F; if (!R) return;
R.ln.visible = R.dots.visible = on && I.r0 != null; if (VG.ghost) VG.ghost.visible = on;
if (!on || I.r0 == null) return;
var p = VG.drone.root.position, qz = r[I.qz], qw = r[I.qw], qx = r[I.qx], qy = r[I.qy], yaw = Math.atan2(2 * (qw * qz + qx * qy), 1 - 2 * (qy * qy + qz * qz));
var mx = 0; for (var k = 0; k < 26; k++) mx = Math.max(mx, r[I.r0 + k]); R.max = Math.max(R.max * 0.999, mx);
var c30 = Math.cos(Math.PI / 6), s30 = Math.sin(Math.PI / 6);
for (var k2 = 0; k2 < 26; k2++) {
var dx, dy, dz;
if (k2 < 16) { var a = yaw + 2 * Math.PI * k2 / 16; dx = Math.cos(a); dy = Math.sin(a); dz = 0; }
else if (k2 < 24) { var a2 = yaw + 2 * Math.PI * (k2 - 16) / 8; dx = c30 * Math.cos(a2); dy = c30 * Math.sin(a2); dz = -s30; }
else { dx = 0; dy = 0; dz = k2 === 24 ? -1 : 1; }
var d = r[I.r0 + k2], hit = d < R.max * 0.97; if (!hit) d = 0; var e = VW(dx * d, dy * d, dz * d, VGV).add(p), o = k2 * 6;
R.P[o] = p.x; R.P[o + 1] = p.y; R.P[o + 2] = p.z; R.P[o + 3] = e.x; R.P[o + 4] = e.y; R.P[o + 5] = e.z;
var c = hit ? (d < 3 ? [1.0, 0.18, 0.1] : d < 8 ? [1.0, 0.62, 0.12] : [0.15, 0.85, 1.0]) : [0.05, 0.22, 0.3];
R.C.set([c[0] * 0.15, c[1] * 0.15, c[2] * 0.15, c[0], c[1], c[2]], o);
R.DP.set([e.x, e.y, e.z], k2 * 3); R.DC.set(hit ? c : [0, 0, 0], k2 * 3);
}
R.g.attributes.position.needsUpdate = R.g.attributes.color.needsUpdate = true; R.dg.attributes.position.needsUpdate = R.dg.attributes.color.needsUpdate = true;
if (!VG.ghost) {
var gg = new THREE.Group(), gm = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.85, depthWrite: false, fog: false });
var ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.03, 6, 48), gm); ring.rotation.x = Math.PI / 2; gg.add(ring);
var lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
VG.ghostLine = new THREE.Line(lg, new THREE.LineDashedMaterial({ color: 0xffa040, dashSize: 0.5, gapSize: 0.35, transparent: true, opacity: 0.8, fog: false })); VG.ghostLine.frustumCulled = false;
gg.renderOrder = 9; VG.root.add(gg); VG.root.add(VG.ghostLine); VG.ghost = gg;
}
var gp = VW(r[I.ex], r[I.ey], r[I.ez], VGV2); VG.ghost.position.copy(gp); VG.ghost.rotation.y += 0.02;
var lp = VG.ghostLine.geometry.attributes.position; lp.setXYZ(0, p.x, p.y, p.z); lp.setXYZ(1, gp.x, gp.y, gp.z); lp.needsUpdate = true; VG.ghostLine.computeLineDistances();
VG.ghostLine.visible = p.distanceTo(gp) > 0.6;
}
function vgHouseAt(x, y) {
var L = VG.layout; if (!L) return 0; var top = 0;
(L.items || []).forEach(function (it) {
if (it.k !== 'house' && it.k !== 'mosque') return;
var c = Math.cos(it.yaw || 0), s = Math.sin(it.yaw || 0), dx = x - it.x, dy = y - it.y, lx = dx * c + dy * s, ly = -dx * s + dy * c;
if (Math.abs(lx) < it.w / 2 + 1.2 && Math.abs(ly) < it.d / 2 + 1.2) top = Math.max(top, (it.h || 0) + (it.k === 'mosque' ? 6 : 0));
});
return top;
}
function vgClear(v) { var x = v.x, y = -v.z, top = vgHouseAt(x, y); if (v.y < top + 1.5) v.y = top + 1.5; if (v.y < 1.2) v.y = 1.2; return v; }
function vgFuture(E, dt) { var F = E.frames, out = []; vgLerp(F, Math.min(F[F.length - 1][0], VG.ct + dt), out); return VW(out[VG.F.x], out[VG.F.y], out[VG.F.z]); }
function vgSetCam(c) {
VG.cam = c; if (vgCamSel.value !== c) vgCamSel.value = c; VG.shot = null;
controls.enabled = c === 'orbit' || c === 'free'; camera.up.set(0, 1, 0);
if (c === 'orbit' && VG.drone) { controls.target.copy(VG.drone.root.position); VG.orbitLast = VG.drone.root.position.clone(); }
}
function vgIdleCam(dt) {
if (VG.cam !== 'director' && VG.cam !== 'top') return;
var L = VG.layout || {}, ce = L.centre || [25, 0], t = performance.now() / 1000 * 0.03;
camera.position.copy(VW(ce[0] + 170 * Math.cos(t), ce[1] + 170 * Math.sin(t), 70)); camera.lookAt(VW(ce[0], ce[1], 0));
}
function vgCamera(E, r, dt) {
var I = VG.F, p = VG.drone.root.position, d = Math.max(1e-3, offlineDt(dt)), c = VG.cam;
var vel = VW(r[I.vx], r[I.vy], r[I.vz], VGV3), hs = Math.hypot(vel.x, vel.z);
var qz = r[I.qz], qw = r[I.qw], qx = r[I.qx], qy = r[I.qy], yaw = Math.atan2(2 * (qw * qz + qx * qy), 1 - 2 * (qy * qy + qz * qz));
var fwd = hs > 1.5 ? new THREE.Vector3(vel.x / hs, 0, vel.z / hs) : VW(Math.cos(yaw), Math.sin(yaw), 0);
VG.fwd = VG.fwd ? VG.fwd.lerp(fwd, 1 - Math.exp(-d * 1.5)).normalize() : fwd.clone();
if (c === 'orbit') { if (VG.orbitLast) { var dv = p.clone().sub(VG.orbitLast); camera.position.add(dv); controls.target.add(dv); } VG.orbitLast = p.clone(); controls.update(); return; }
if (c === 'free') { controls.update(); return; }
if (c === 'top') { camera.up.set(0, 0, -1); VGV.copy(p).add(new THREE.Vector3(0, 75, 0.01)); camera.position.lerp(VGV, 1 - Math.exp(-d * 3)); camera.lookAt(p); return; }
camera.up.set(0, 1, 0);
if (c === 'chase') { vgChase(p, d, 11, 4.2, 0); return; }
var S = VG.shot, now = VG.ct, ph = vgFlag(r, 'phase'), lz = VG.lz.group.position, home = VW(E.homeP[0], E.homeP[1], 0);
var dLz = Math.hypot(p.x - lz.x, p.z - lz.z), dHome = Math.hypot(p.x - home.x, p.z - home.z), agl = vgFlag(r, 'agl');
var want = null;
if ((ph === 0 || (dHome < 45 && E.kitAt != null && VG.ct > E.kitAt)) && dHome < 60) want = 'base';
else if (dLz < 48 && (E.kitAt == null || VG.ct < E.kitAt + 9)) want = 'lz';
if (!S || (want && S.kind !== want) || (!want && (S.kind === 'base' || S.kind === 'lz')) || now > S.until || now < S.from - 0.5) {
var kind = want || (S && S.kind === 'chase' ? (Math.random() < 0.6 ? 'flyby' : 'crane') : S && S.kind === 'flyby' ? 'chase' : S && S.kind === 'crane' ? 'chase' : 'chase');
S = VG.shot = { kind: kind, from: now, until: now + (kind === 'chase' ? 7 : kind === 'flyby' ? 6.5 : kind === 'crane' ? 7 : 1e9), side: Math.random() < 0.5 ? 1 : -1 };
if (kind === 'base') { var bs = E.homeP; S.pos = vgClear(VW(bs[0] - 15, bs[1] - 11, 1.7)); }
if (kind === 'lz') { var lp = E.lzP, best = null; [[11, -10], [11, 10], [-11, 10]].forEach(function (o) { var v = VW(lp[0] + o[0], lp[1] + o[1], 1.6); if (!best || v.distanceTo(p) > best.distanceTo(p)) best = v; }); S.pos = best; }
if (kind === 'flyby') { var f = vgFuture(E, 3.6), side = new THREE.Vector3(-VG.fwd.z, 0, VG.fwd.x).multiplyScalar(13 * S.side), v2 = f.clone().add(side); v2.y = Math.max(2.5, f.y - 3.5); if (vgHouseAt(v2.x, -v2.z) > v2.y - 1) { v2 = f.clone().sub(side); v2.y = Math.max(2.5, f.y - 3.5); } S.pos = vgClear(v2); }
if (kind === 'crane') { S.off = VW(-VG.fwd.x * 30 + VG.fwd.z * 34 * S.side, VG.fwd.z * 30 + VG.fwd.x * 34 * S.side, 0).add(new THREE.Vector3(0, 32, 0)); }
S.look = p.clone();
}
if (S.kind === 'chase') { vgChase(p, d, 10.5, 3.8, 0); return; }
if (S.kind === 'crane') { VGV.copy(p).add(S.off); vgClear(VGV); if (now - S.from < 0.05) camera.position.copy(VGV); else camera.position.lerp(VGV, 1 - Math.exp(-d * 1.2)); }
else camera.position.copy(S.pos);
S.look.lerp(p, 1 - Math.exp(-d * (S.kind === 'flyby' ? 6 : 3)));
if (now - S.from < 0.05) S.look.copy(p);
camera.lookAt(S.look);
}
function vgChase(p, d, back, up, side) {
VGV.copy(p).addScaledVector(VG.fwd, -back); VGV.y = p.y + up; vgClear(VGV);
if (!VG.chaseOn || camera.position.distanceTo(VGV) > 60) camera.position.copy(VGV); else camera.position.lerp(VGV, 1 - Math.exp(-d * 2.6));
VG.chaseOn = true; VGV2.copy(p).addScaledVector(VG.fwd, 5); VGV2.y = p.y - 0.5; camera.lookAt(VGV2);
}
var vgMap = document.createElement('canvas'), VGM_W = 230, VGM_H = 178;
vgMap.width = VGM_W * 2; vgMap.height = VGM_H * 2;
vgMap.style.cssText = 'position:absolute;right:12px;top:52px;width:' + VGM_W + 'px;height:' + VGM_H + 'px;background:rgba(10,14,22,.66);border:1px solid rgba(255,255,255,.1);border-radius:10px;display:none;pointer-events:none';
vgMap.title = 'The village from above: the drone (white) and where it thinks it is (orange), the way it has flown, the jammed area, the landmarks, the base and the medic';
ui.appendChild(vgMap);
var vgCap = document.createElement('div');
vgCap.style.cssText = 'position:absolute;left:50%;bottom:64px;transform:translateX(-50%);max-width:78%;font:600 15px/1.35 Inter,-apple-system,Segoe UI,sans-serif;color:#f3f5f7;padding:8px 16px;border-radius:10px;background:rgba(10,14,22,.62);backdrop-filter:blur(6px);display:none;text-align:center;pointer-events:none';
ui.appendChild(vgCap);
var VG_PH = ['On the base', 'Flying to the medic', "Homing on the medic's marker", 'Landed: releasing the kit', 'Kit released', 'Back on the base'];
var VG_GNSS = [['good fix', '#7ee08a'], ['JAMMED: no fix', '#ffb547'], ['spoofed (not yet caught)', '#ff6b5b'], ['ignored: spoofing caught', '#ffb547']];
function vgHudTick(E, r) {
var now = performance.now(); if (VG.hudAt && now - VG.hudAt < 160 && !CAP.rec && !CAP.offline) return; VG.hudAt = now;
var I = VG.F, ph = vgFlag(r, 'phase'), kit = vgFlag(r, 'kit') > 0.5, g = Math.round(vgFlag(r, 'gnss'));
var phase = E.kind === 'idle' ? 'On the base: ready' : ph === 1 && !kit ? 'Flying home' : VG_PH[ph] || '';
var err = Math.hypot(r[I.ex] - r[I.x], r[I.ey] - r[I.y]), v = Math.hypot(r[I.vx], r[I.vy], r[I.vz]), gn = VG_GNSS[g] || VG_GNSS[0];
var rows = [['phase', phase], ['GNSS', '<span style="color:' + gn[1] + '">' + gn[0] + '</span>'],
['cameras (VIO)', Math.round(100 * vgFlag(r, 'vio')) + ' %' + (vgFlag(r, 'lm') > 0.6 ? ' · <span style="color:#7ee08a">landmark fix</span>' : '')],
['nav error', err.toFixed(1) + ' m (± ' + vgFlag(r, 'sig').toFixed(1) + ')'], ['height', Math.max(0, vgFlag(r, 'agl')).toFixed(1) + ' m'], ['speed', Math.round(v * 3.6) + ' km/h'],
['battery', Math.round(100 * vgFlag(r, 'batt')) + ' %'], ['kit', kit ? 'on board, 12 kg' : '<span style="color:#7ee08a">delivered</span>'], ['wind', Math.hypot(vgFlag(r, 'wx'), vgFlag(r, 'wy')).toFixed(1) + ' m/s']];
if (vgFlag(r, 'mk') > 0.5) rows.splice(3, 0, ['marker', '<span style="color:#7ee08a">in sight</span>']);
hudRows.innerHTML = rows.map(function (x) { return '<span style="opacity:.65">' + x[0] + '</span><span>' + x[1] + '</span>'; }).join('');
hudTitle.textContent = E.meta.label || (E.kind === 'idle' ? 'Casualty-care resupply' : 'Resupply mission');
var hudEl = ui.querySelector('.hud'), sens = VG.sensOn !== false && !VG_FIXED;
if (hudEl) hudEl.style.visibility = sens ? '' : 'hidden';
vgMap.style.display = VG_FIXED ? 'none' : ''; vgMap.style.visibility = sens ? '' : 'hidden';
if (sens) vgMapDraw(E, r);
var evs = E.events || [], cur = null; for (var i = 0; i < evs.length; i++) if (evs[i][0] <= VG.ct + 0.05) cur = evs[i];
var showCap = cur && VG.ct - cur[0] < 6 && !(E.ahead && vgNow() < E.startAt) && !VG_FIXED;
if (showCap) { if (VG.capKey !== cur[1]) { VG.capKey = cur[1]; vgCap.textContent = cur[1]; } vgCap.style.display = ''; } else vgCap.style.display = 'none';
var F = E.frames, end = F[F.length - 1][0];
if (E.kind === 'run' && E.done && VG.ct >= end - 0.05 && !VG.resShown) {
VG.resShown = true; var res = E.meta.result || {};
if (res.home) crBanner('MISSION COMPLETE<div style="font-size:15px;font-weight:600;letter-spacing:0;margin-top:4px;opacity:.85">kit delivered ' + (res.miss != null ? res.miss.toFixed(1) + ' m from the marker' : '') + ' · back on the base</div>', '#7ee08a');
else if (res.delivered) crBanner('KIT DELIVERED<div style="font-size:15px;font-weight:600;letter-spacing:0;margin-top:4px;opacity:.85">but on the way home: ' + esc(res.text || 'not back') + '</div>', '#ffd36b');
else crBanner('NOT DELIVERED<div style="font-size:15px;font-weight:600;letter-spacing:0;margin-top:4px;opacity:.85">' + esc(res.text || '') + '</div>', '#ff7b6b');
VG.resAt = performance.now();
}
if (VG.resAt && performance.now() - VG.resAt > 7000) { VG.resAt = 0; if (/MISSION|DELIVERED/.test(crBan.textContent)) crBan.style.display = 'none'; }
}
function vgMapDraw(E, r) {
var L = VG.layout; if (!L) return;
var g = vgMap.getContext('2d'), W = vgMap.width, H = vgMap.height, B = L.bounds || [-150, -120, 160, 120], pad = 10;
var k = Math.min((W - 2 * pad) / (B[2] - B[0]), (H - 2 * pad) / (B[3] - B[1])), ox = (W - k * (B[2] - B[0])) / 2, oy = (H - k * (B[3] - B[1])) / 2;
var X = function (x) { return ox + (x - B[0]) * k; }, Y = function (y) { return H - oy - (y - B[1]) * k; };
if (!VG.mapBg) {
var bg = VG.mapBg = document.createElement('canvas'); bg.width = W; bg.height = H; var q = bg.getContext('2d');
q.strokeStyle = 'rgba(200,185,150,.35)'; q.lineWidth = 5.5 * k; q.lineCap = 'round';
(L.lanes || []).forEach(function (ln) { q.beginPath(); ln.forEach(function (pt, i) { if (i) q.lineTo(X(pt[0]), Y(pt[1])); else q.moveTo(X(pt[0]), Y(pt[1])); }); q.stroke(); });
(L.lzs || []).forEach(function (pt) { var pl = L.pl || 13; q.fillStyle = 'rgba(200,190,170,.18)'; q.fillRect(X(pt[0] - pl), Y(pt[1] + pl), 2 * pl * k, 2 * pl * k); });
(L.items || []).forEach(function (it) {
if (it.k === 'house' || it.k === 'mosque' || it.k === 'yard') { q.save(); q.translate(X(it.x), Y(it.y)); q.rotate(-(it.yaw || 0)); q.fillStyle = it.k === 'yard' ? 'rgba(210,200,180,.25)' : 'rgba(230,222,205,' + (0.35 + 0.1 * Math.min(4, it.f || 2)) + ')'; q.fillRect(-it.w / 2 * k, -it.d / 2 * k, it.w * k, it.d * k); q.restore(); }
else if (it.k === 'olive' || it.k === 'palm' || it.k === 'cypress') { q.fillStyle = 'rgba(120,150,90,.55)'; q.beginPath(); q.arc(X(it.x), Y(it.y), Math.max(1.2, (it.k === 'olive' ? 2.4 : 1.5) * k), 0, 6.3); q.fill(); }
});
(L.landmarks || []).forEach(function (lm) { q.fillStyle = '#9fd0ff'; q.beginPath(); q.arc(X(lm[0]), Y(lm[1]), 4, 0, 6.3); q.fill(); q.strokeStyle = 'rgba(159,208,255,.5)'; q.lineWidth = 1.5; q.beginPath(); q.arc(X(lm[0]), Y(lm[1]), 8, 0, 6.3); q.stroke(); });
}
g.clearRect(0, 0, W, H); g.drawImage(VG.mapBg, 0, 0);
var res = E.meta.result || {}, jam = res.jam;
if (jam && /jam/.test(E.meta.threat || '')) { g.save(); g.fillStyle = 'rgba(255,90,60,.10)'; g.strokeStyle = 'rgba(255,110,80,.65)'; g.setLineDash([6, 5]); g.lineWidth = 2; g.beginPath(); g.arc(X(jam[0]), Y(jam[1]), jam[2] * k, 0, 6.3); g.fill(); g.stroke(); g.restore(); }
var bs = E.homeP, lz = E.lzP;
g.fillStyle = '#e8c21a'; g.fillRect(X(bs[0]) - 6, Y(bs[1]) - 6, 12, 12); g.fillStyle = '#111'; g.font = '700 10px Inter,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', X(bs[0]), Y(bs[1]) + 0.5);
g.fillStyle = '#ff6a10'; g.fillRect(X(lz[0]) - 6, Y(lz[1]) - 6, 12, 12); g.fillStyle = '#fff'; g.fillRect(X(lz[0]) - 1.5, Y(lz[1]) - 4.5, 3, 9); g.fillRect(X(lz[0]) - 4.5, Y(lz[1]) - 1.5, 9, 3);
var F = E.frames, I = VG.F, n = 0;
g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,255,255,.85)'; g.beginPath();
for (var i = 0; i < F.length && F[i][0] <= VG.ct; i += 4) { if (n++) g.lineTo(X(F[i][I.x]), Y(F[i][I.y])); else g.moveTo(X(F[i][I.x]), Y(F[i][I.y])); }
g.lineTo(X(r[I.x]), Y(r[I.y])); g.stroke();
g.save(); g.setLineDash([5, 4]); g.strokeStyle = 'rgba(255,160,64,.9)'; g.beginPath(); n = 0;
for (var j = 0; j < F.length && F[j][0] <= VG.ct; j += 4) { if (n++) g.lineTo(X(F[j][I.ex]), Y(F[j][I.ey])); else g.moveTo(X(F[j][I.ex]), Y(F[j][I.ey])); }
g.lineTo(X(r[I.ex]), Y(r[I.ey])); g.stroke(); g.restore();
g.strokeStyle = '#ffa040'; g.lineWidth = 2; g.beginPath(); g.arc(X(r[I.ex]), Y(r[I.ey]), 6 + 2 * Math.min(10, vgFlag(r, 'sig')) * k * 4 / 4, 0, 6.3); g.stroke();
var qz = r[I.qz], qw = r[I.qw], qx = r[I.qx], qy = r[I.qy], yaw = Math.atan2(2 * (qw * qz + qx * qy), 1 - 2 * (qy * qy + qz * qz));
g.save(); g.translate(X(r[I.x]), Y(r[I.y])); g.rotate(-yaw); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(10, 0); g.lineTo(-6, 6); g.lineTo(-3, 0); g.lineTo(-6, -6); g.closePath(); g.fill(); g.stroke(); g.restore();
g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '600 18px Inter,sans-serif'; g.textAlign = 'left'; g.fillText('N ↑', 12, 22);
if (vgFlag(r, 'lm') > 0.6) { g.fillStyle = '#7ee08a'; g.font = '700 18px Inter,sans-serif'; g.textAlign = 'right'; g.fillText('landmark fix', W - 12, 22); }
}
function paintVillage(g, W, H, s, er, shown, paintText) {
var vis = function (n) { return shown(n) && getComputedStyle(n).visibility !== 'hidden'; };
if (vis(vgMap)) { var b = vgMap.getBoundingClientRect(), x = (b.left - er.left) * s, y = (b.top - er.top) * s, w = b.width * s, h = b.height * s; g.save(); g.fillStyle = 'rgba(10,14,22,.66)'; g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, 10 * s); else g.rect(x, y, w, h); g.fill(); g.drawImage(vgMap, x, y, w, h); g.restore(); }
if (vis(vgCap)) { var c = vgCap.getBoundingClientRect(), cx = (c.left - er.left) * s, cy = (c.top - er.top) * s; g.save(); g.fillStyle = 'rgba(10,14,22,.62)'; g.beginPath(); if (g.roundRect) g.roundRect(cx, cy, c.width * s, c.height * s, 10 * s); else g.rect(cx, cy, c.width * s, c.height * s); g.fill(); g.restore(); paintText(vgCap, vgCap, function (x2, y2) { return [x2 * s, y2 * s]; }); }
}
function vgAud(E, r) {
var A = AUD.ctx, N = AUD.nodes; if (!A || !N) return;
if (!VG.aud) {
var M = N.master, loop = function (buf) { var s0 = A.createBufferSource(); s0.buffer = buf; s0.loop = true; s0.start(0, Math.random() * 2); return s0; };
var chain = function (src, type, f, Q) { var fl = A.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = Q || 0.7; var gn = A.createGain(); gn.gain.value = 0; src.connect(fl); fl.connect(gn); gn.connect(M); return { f: fl, g: gn }; };
var bf = A.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.value = 1100; var bg = A.createGain(); bg.gain.value = 0; bf.connect(bg); bg.connect(M);
var o1 = A.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 90; o1.connect(bf); o1.start();
var o2 = A.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 91.3; o2.connect(bf); o2.start();
var o3 = A.createOscillator(); o3.type = 'triangle'; o3.frequency.value = 45; o3.connect(bf); o3.start();
VG.aud = { o1: o1, o2: o2, o3: o3, buzz: { f: bf, g: bg }, air: chain(loop(N.brown), 'lowpass', 420, 0.7), swish: chain(loop(N.white), 'bandpass', 1700, 1.4),
wind: chain(loop(N.brown), 'lowpass', 260, 0.6), rain: chain(loop(N.white), 'lowpass', 5200, 0.5) };
}
var V = VG.aud, t = A.currentTime, on = AUD.on && mode === 'village' && !document.hidden && !CAP.offline, mm = VG.drone ? VG.drone.root.userData.mm || 0 : 0;
var near = VG.drone ? 1 / Math.pow(1 + camera.position.distanceTo(VG.drone.root.position) / 12, 1.1) : 0;
var f = 2 * 2800 * Math.sqrt(Math.max(0, mm) / 0.46) / 60, k = on && mm > 0.02 ? Math.min(1, mm * 3) : 0, tc = 0.08;
V.o1.frequency.setTargetAtTime(Math.max(20, f), t, tc); V.o2.frequency.setTargetAtTime(Math.max(20, f * 1.014), t, tc); V.o3.frequency.setTargetAtTime(Math.max(15, f / 2), t, tc);
V.buzz.g.gain.setTargetAtTime(0.16 * near * k, t, tc); V.air.g.gain.setTargetAtTime(0.5 * near * k, t, tc); V.swish.g.gain.setTargetAtTime(0.1 * near * k, t, tc);
V.swish.f.frequency.setTargetAtTime(900 + f * 8, t, tc);
var Lt = VG.light || {}, wv = +(VG.layout && VG.layout.wind) || 0;
V.wind.g.gain.setTargetAtTime(on ? 0.03 + 0.012 * wv : 0, t, 0.5); V.rain.g.gain.setTargetAtTime(on ? 0.1 * (Lt.rain || 0) : 0, t, 0.5);
}
function vgAudOff() { if (!VG.aud || !AUD.ctx) return; var t = AUD.ctx.currentTime; ['buzz', 'air', 'swish', 'wind', 'rain'].forEach(function (k) { VG.aud[k].g.gain.setTargetAtTime(0, t, 0.05); }); }
var vgBar = document.createElement('span'); vgBar.style.cssText = 'display:none;gap:6px;align-items:center';
var VG_CAMS = [['director', 'Director', 'The camera cuts by itself through the mission, like a broadcast (a drag takes over)'], ['chase', 'Chase', 'Behind the drone'], ['orbit', 'Orbit', 'Around the drone: drag to turn, wheel to zoom'], ['top', 'Top', 'Straight down from above, north up'], ['free', 'Free', 'The camera stays where you leave it']];
var vgCamSel = document.createElement('select'); vgCamSel.style.cssText = 'background:#1b2029;color:#e8ecf2;border:1px solid #2a303b;border-radius:6px;font-size:12px;padding:1px 4px';
vgCamSel.innerHTML = VG_CAMS.map(function (c) { return '<option value="' + c[0] + '" title="' + esc(c[2]) + '">' + esc(c[1]) + '</option>'; }).join('');
vgCamSel.onchange = function () { vgSetCam(vgCamSel.value); keepView(true); };
vgBar.appendChild(vgCamSel); barEl.insertBefore(vgBar, $('.cam'));
VG.sensOn = (function () { try { return localStorage.getItem('v3d.vsens') !== '0'; } catch (e) { return true; } })();
[['snd', '🔊 Sound', 'Sound on or off (it starts with your first click in the view)'], ['las', '📡 Sensors', 'The sensors: the numbers, the map, the range beams and where the drone thinks it is (on screen and in recordings)']].forEach(function (c) {
var b = document.createElement('button'); b.textContent = c[1]; b.title = c[2]; b.style.cssText = 'all:unset;cursor:pointer;padding:2px 8px;border:1px solid #2a303b;border-radius:6px;font-size:12px';
var on = function () { return c[0] === 'snd' ? AUD.on : VG.sensOn !== false; };
var paint = function () { b.style.background = on() ? '#3a4dd8' : ''; b.style.opacity = on() ? '1' : '0.6'; };
b.onclick = function () { audUnlock(); if (c[0] === 'snd') AUD.on = !AUD.on; else { VG.sensOn = !on(); try { localStorage.setItem('v3d.vsens', VG.sensOn ? '1' : '0'); } catch (e) { } VG.hudAt = 0; } paint(); keepView(true); };
paint(); vgBar.appendChild(b);
});
if (ctx.on) ctx.on('peer', function (topic) { if (topic === 'village-start' && mode === 'village') vgStartPressed(true); });
function vgStartPressed(fromPeer) { if (!fromPeer && ctx.peer) ctx.peer('village-start', {}); VG.wait = performance.now(); crBanner('GET READY<div style="font-size:15px;font-weight:600;letter-spacing:0;margin-top:4px;opacity:.85">the mission is starting…</div>', '#f3f5f7'); }
function enterVillage() {
stopLive(); clearEntities(); runs = []; runSel.style.display = 'none'; modeBtn.style.display = 'none'; $('.cam').style.display = 'none'; $('.fit').style.display = 'none'; tl.style.display = 'none';
mode = 'village'; shownKey = 'village';
ground.visible = false; grid.visible = false; grid10.visible = false; windLines.visible = false; trailGroup.visible = false;
if (sky) { scene.remove(sky); sky = null; }
controls.maxPolarAngle = Math.PI * 0.495; controls.minDistance = 2; controls.maxDistance = 900; controls.enablePan = true;
camera.near = 0.1; camera.far = 12000; camera.fov = 50; camera.updateProjectionMatrix();
if (quality !== 'fast' && !composer) {
composer = new A.EffectComposer(renderer); composer.addPass(new A.RenderPass(scene, camera));
if (quality === 'high' && A.GTAOPass && !VG_FIXED) {
try { var w0 = Math.max(10, el.clientWidth), h0 = Math.max(10, el.clientHeight); gtao = new A.GTAOPass(scene, camera, w0, h0);
gtao.updateGtaoMaterial({ radius: 2.2, distanceExponent: 1.4, thickness: 2.0, scale: 1.0, samples: 16 }); gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 }); gtao.blendIntensity = 0.85;
var ovr = gtao.overrideVisibility; if (ovr) gtao.overrideVisibility = function () { ovr.call(this); this.scene.traverse(function (o) { if (o.isSprite || (o.material && !Array.isArray(o.material) && o.material.transparent && o.material.depthWrite === false)) o.visible = false; }); };
composer.addPass(gtao); } catch (e) { gtao = null; }
}
composer.addPass(cleanPass()); VG.bloom = new A.UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.4, 1.4); composer.addPass(VG.bloom); composer.addPass(new A.OutputPass()); composer.addPass(fxaaPass()); resize();
}
barEl.style.display = 'flex'; vgBar.style.display = 'inline-flex';
vgSetCam(VG_FIXED || (ctx.state && ctx.state.vgcam) || 'director');
renderer.domElement.addEventListener('pointerdown', function () { if (VG.cam === 'director' && !VG_FIXED && VG.drone) vgSetCam('orbit'); });
if (VG_FIXED) { barEl.style.display = 'none'; }
}
function vgStatus() { return VG.layout || VG.cur ? '' : 'The resupply mission appears here when the blueprint runs.'; }
var HM = { eps: {}, order: [], seen: {}, seenQ: [], F: {}, cam: 'director', info: null, live: {} };
function hmItems(stream) { return stream.filter(function (it) { return it && it.data && it.data.format === 'esasim.humanoid/1'; }); }
function hmFeed(stream) {
hmItems(stream).forEach(function (it) {
var d = it.data, key = (it.node || '') + '|' + it.t + '|' + d.kind + '|' + (d.ep == null ? d.run : d.ep) + '|' + (d.seq == null ? '' : d.seq) + '|' + (d.frames ? d.frames.length + ':' + (d.frames[0] || [])[0] : '');
if (HM.seen[key]) return; HM.seen[key] = 1;
HM.seenQ.push(key); if (HM.seenQ.length > 8000) HM.seenQ.splice(0, 1000).forEach(function (k) { delete HM.seen[k]; });
if (d.kind === 'robot') { var sig = function (R_) { return JSON.stringify([R_.bodies, R_.course && R_.course.kind, R_.patrol && R_.patrol.route]); }; if (!HM.info || sig(HM.info) !== sig(d.robot)) { var was = HM.info && HM.info.model; HM.info = d.robot; HM.F = {}; d.robot.fields.forEach(function (f, i) { HM.F[f] = i; }); if (HM.F.c0 != null) { HM.F.cl = HM.F.c0; HM.F.cr = HM.F.c1; HM.F.fl = HM.F.f0; HM.F.fr = HM.F.f1; } hmKin(); HM.courseDirty = true; HM.modelDirty = true; HM.telS = null; if (was && was !== d.robot.model) { HM.eps = {}; HM.order = []; HM.live = {}; HM.cur = null; HM.telLast = null; } } return; }
var made = typeof it.t === 'number' && it.t > 1e9 ? it.t : Date.now() / 1000;
if (d.kind === 'live') {
var L = HM.live[d.run];
if (!L) { L = HM.live[d.run] = { id: 'live:' + d.run, kind: 'live', run: d.run, frames: [], t0: d.t0, at: made, meta: {} }; HM.order.push(L.id); HM.eps[L.id] = L; }
L.at = made; L.t0 = d.t0; L.line = d.line; L.path = d.path; L.drive = d.drive; if (d.tiles) L.tiles = d.tiles; L.meta.label = d.label;
if (d.mission) { var MS_ = L.missions || (L.missions = []); if (!MS_.length || d.mission.t > MS_[MS_.length - 1].t) MS_.push(d.mission); if (MS_.length > 600) MS_.splice(0, 200); }
var F = L.frames, last = F.length ? F[F.length - 1][0] : -1, had = last;
(d.frames || []).forEach(function (r) { if (r[0] > last + 1e-6) { F.push(r); last = r[0]; } });
if (last > had) {
var now_ = Date.now() / 1000, age = (now_ - d.t0) - last, A = L.arr || (L.arr = []);
if (age < 10) { A.push([now_, age]); if (A.length > 24) A.shift(); }
}
if (F.length > 3000) F.splice(0, F.length - 3000);
return;
}
var id = d.kind + ':' + d.ep, E = HM.eps[id];
if (!E) { E = HM.eps[id] = { id: id, kind: d.kind, ep: d.ep, frames: [], chunks: {}, meta: {}, done: false, at: made }; HM.order.push(id); }
['label', 'result'].forEach(function (k) { if (d[k] !== undefined) E.meta[k] = d[k]; });
if (d.line) E.line = d.line;
if (d.path != null) E.path = d.path;
if (d.tiles) E.tiles = d.tiles;
if (d.frames && d.frames.length) E.chunks[d.seq || 0] = d.frames;
if (d.last) E.done = true;
var ks = Object.keys(E.chunks).map(Number).sort(function (a, b) { return a - b; }); E.frames = []; ks.forEach(function (k) { E.frames = E.frames.concat(E.chunks[k]); });
});
if (HM.order.length > 16) { HM.order.slice(0, HM.order.length - 16).forEach(function (k) { var E = HM.eps[k]; delete HM.eps[k]; if (E && E.kind === 'live') delete HM.live[E.run]; }); HM.order = HM.order.slice(-16); }
}
function hmPick() {
var live = null, train = null;
for (var i = HM.order.length - 1; i >= 0; i--) {
var E = HM.eps[HM.order[i]]; if (!E) continue;
if (!live && E.kind === 'live' && E.frames.length > 1) live = E;
if (!train && E.kind === 'training' && E.done && E.frames.length > 1) train = E;
}
if (live && (!train || live.at >= train.at - 2)) return live;
return train;
}
function hmLerp(F, t, out) {
var lo = 0, hi = F.length - 1, i;
if (t <= F[0][0]) { for (i = 0; i < F[0].length; i++) out[i] = F[0][i]; return out; }
if (t >= F[hi][0]) { for (i = 0; i < F[hi].length; i++) out[i] = F[hi][i]; return out; }
while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (F[mid][0] <= t) lo = mid; else hi = mid; }
var a = F[lo], b = F[hi], k = (t - a[0]) / Math.max(1e-9, b[0] - a[0]);
var jump = Math.abs(b[1] - a[1]) + Math.abs(b[2] - a[2]) > 1.0;
if (jump) { var s = k < 0.5 ? a : b; for (i = 0; i < s.length; i++) out[i] = s[i]; return out; }
var dot = a[4] * b[4] + a[5] * b[5] + a[6] * b[6] + a[7] * b[7], sg = dot < 0 ? -1 : 1;
for (var m = 0; m < a.length; m++) { var bv = b[m]; if (m >= 4 && m <= 7) bv *= sg; out[m] = a[m] + (bv - a[m]) * k; }
var nq = Math.hypot(out[4], out[5], out[6], out[7]) || 1; out[4] /= nq; out[5] /= nq; out[6] /= nq; out[7] /= nq;
var F_ = HM.F; hmCF().forEach(function (f) { if (F_[f] != null) out[F_[f]] = (k < 0.5 ? a : b)[F_[f]]; });
return out;
}
var HMQ = new THREE.Quaternion(), HMQ2 = new THREE.Quaternion(), HMV = new THREE.Vector3(), HMAX = new THREE.Vector3();
function hmKin() {
var I = HM.info; if (!I) return;
HM.K = I.bodies.map(function (b) { return { name: b.name, parent: b.parent, pos: new THREE.Vector3().fromArray(b.pos), quat: new THREE.Quaternion(b.quat[1], b.quat[2], b.quat[3], b.quat[0]),
jtype: b.jtype, axis: b.axis ? new THREE.Vector3().fromArray(b.axis) : null, qadr: b.qadr, wp: new THREE.Vector3(), wq: new THREE.Quaternion() }; });
HM.byName = {}; HM.K.forEach(function (k, i) { HM.byName[k.name] = i; });
HM.bound = null;
}
function hmFK(qpos) {
var K = HM.K; if (!K) return;
for (var i = 0; i < K.length; i++) {
var b = K[i];
if (b.jtype === 'free') { b.wp.set(qpos[0], qpos[1], qpos[2]); b.wq.set(qpos[4], qpos[5], qpos[6], qpos[3]).normalize(); continue; }
var P = b.parent >= 0 ? K[b.parent] : null;
if (P) { b.wp.copy(b.pos).applyQuaternion(P.wq).add(P.wp); b.wq.copy(P.wq).multiply(b.quat); }
else { b.wp.copy(b.pos); b.wq.copy(b.quat); }
if (b.jtype === 'hinge') b.wq.multiply(HMQ.setFromAxisAngle(b.axis, qpos[b.qadr]));
}
}
function hmNJ() { return (HM.info && HM.info.joints && HM.info.joints.length) || 29; }
function hmQpos(row, out) {
var F = HM.F, n = hmNJ(); out[0] = row[F.x]; out[1] = row[F.y]; out[2] = row[F.z]; out[3] = row[F.qw]; out[4] = row[F.qx]; out[5] = row[F.qy]; out[6] = row[F.qz];
for (var j = 0; j < n; j++) out[7 + j] = row[F['j' + j]];
return out;
}
function HW(x, y, z, out) { return (out || new THREE.Vector3()).set(x, z, -y); }
var HM_G = new THREE.Matrix4().set(0.00000028, -0.54785856, -2.13094935, -0.00000002, 1.08172637, 1.85562975, -0.47707485, 1.39334677,
1.91597552, -1.04765612, 0.26934845, 0.0, 0.0, 0.0, 0.0, 1.0);
function hmLoadModel(id, done) {
var MS = HM.models || (HM.models = {}), M = MS[id];
if (M && M.obj) { done(M.obj); return; }
if (M) { M.wait.push(done); return; }
M = MS[id] = { wait: [done] };
var fin = function (obj) { M.obj = obj; var w = M.wait; M.wait = []; w.forEach(function (f) { f(obj); }); };
var fail = function (msg) { delete MS[id]; ctx.status(msg); };
var key = id === 'g1' ? 'g1' : id.replace(/^robot-/, ''), have = function () { return id === 'g1' ? (window.ESASIM_MODELS || {}).g1 : (window.ESASIM_ROBOTS || {})[key]; };
var go = function () {
var got = have(); if (!got) { fail('The robot model did not load'); return; }
if (id !== 'g1') { fin(hmLinkModel(got)); return; }
var bin = atob(got), buf = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
new A.GLTFLoader().parse(buf.buffer, '', function (g) { fin(g.scene); }, function (e) { fail('Could not read the robot model: ' + (e && e.message || e)); });
};
var builtin = function () {
if (have()) { go(); return; }
var sc = document.createElement('script'); sc.src = 'models/' + id + '.js?v=1'; sc.onload = go; sc.onerror = function () { fail('The robot model is missing: add it to the project\'s assets (models/' + (id === 'g1' ? 'g1.glb' : 'robot-' + key + '.json') + ')'); }; document.head.appendChild(sc);
};
fromProject(id === 'g1' ? ['g1.glb'] : ['robot-' + key + '.json', key + '.robot-links.json'], id === 'g1' ? 'buffer' : 'json', function (x) {
if (id !== 'g1') { if (x && x.bodies) fin(hmLinkModel(x)); else { ctx.status('The project\'s robot model has no "bodies"'); builtin(); } return; }
new A.GLTFLoader().parse(x, '', function (g) { fin(g.scene); }, function (e) { fail('Could not read the robot model: ' + (e && e.message || e)); });
}, builtin);
}
function hmLinkModel(R) {
var g = new THREE.Group(), links = {}, mats = {};
var b64 = function (s, T) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new T(u.buffer); };
Object.keys(R.bodies).forEach(function (name) {
var lg = new THREE.Group(); lg.name = name; lg.matrixAutoUpdate = false;
R.bodies[name].forEach(function (p) {
var v = b64(p.v, Float32Array), w = new Float32Array(v.length);
for (var i = 0; i < v.length; i += 3) { w[i] = v[i]; w[i + 1] = v[i + 2]; w[i + 2] = -v[i + 1]; }
var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(w, 3)); geo.setIndex(new THREE.BufferAttribute(b64(p.i, p.w === 4 ? Uint32Array : Uint16Array), 1));
geo = hmCrease(geo.toNonIndexed());
var ck = p.c.join(','), dark = (p.c[0] + p.c[1] + p.c[2]) < 0.9;
var m = mats[ck] || (mats[ck] = new THREE.MeshStandardMaterial({ color: new THREE.Color().setStyle('rgb(' + p.c.map(function (x) { return Math.round(255 * Math.max(0.17, x)); }).join(',') + ')'), metalness: dark ? 0.35 : 0.15, roughness: dark ? 0.45 : 0.42 }));
var mesh = new THREE.Mesh(geo, m); mesh.castShadow = true; mesh.receiveShadow = true; lg.add(mesh);
});
g.add(lg); links[name] = lg;
});
g.userData.links = links; return g;
}
function hmCrease(geo) {
var P = geo.attributes.position.array, n = P.length / 9, FN = new Float32Array(n * 3), N = new Float32Array(P.length), map = {}, c = Math.cos(35 * Math.PI / 180);
for (var f = 0; f < n; f++) {
var o = f * 9, ax = P[o + 3] - P[o], ay = P[o + 4] - P[o + 1], az = P[o + 5] - P[o + 2], bx = P[o + 6] - P[o], by = P[o + 7] - P[o + 1], bz = P[o + 8] - P[o + 2];
var x = ay * bz - az * by, y = az * bx - ax * bz, z = ax * by - ay * bx, l = Math.hypot(x, y, z) || 1;
FN[f * 3] = x / l; FN[f * 3 + 1] = y / l; FN[f * 3 + 2] = z / l;
for (var v = 0; v < 3; v++) { var k = Math.round(P[o + v * 3] * 1e4) + ',' + Math.round(P[o + v * 3 + 1] * 1e4) + ',' + Math.round(P[o + v * 3 + 2] * 1e4); (map[k] || (map[k] = [])).push(f); }
}
for (f = 0; f < n; f++) for (v = 0; v < 3; v++) {
var q = f * 9 + v * 3, key = Math.round(P[q] * 1e4) + ',' + Math.round(P[q + 1] * 1e4) + ',' + Math.round(P[q + 2] * 1e4), L = map[key], sx = 0, sy = 0, sz = 0;
for (var i = 0; i < L.length; i++) { var g = L[i]; if (FN[g * 3] * FN[f * 3] + FN[g * 3 + 1] * FN[f * 3 + 1] + FN[g * 3 + 2] * FN[f * 3 + 2] >= c) { sx += FN[g * 3]; sy += FN[g * 3 + 1]; sz += FN[g * 3 + 2]; } }
var ln = Math.hypot(sx, sy, sz) || 1; N[q] = sx / ln; N[q + 1] = sy / ln; N[q + 2] = sz / ln;
}
geo.setAttribute('normal', new THREE.BufferAttribute(N, 3)); return geo;
}
function hmBindLinks(obj) {
var L = [], links = obj.userData.links || {};
Object.keys(links).forEach(function (name) { var k = HM.byName[name]; if (k != null) L.push({ o: links[name], k: k }); else links[name].visible = false; });
return { root: obj, L: L };
}
function hmAttach() {
HM.modelDirty = false;
if (HM_TEL || !HM.K || !HM.root) return;
var id = (HM.info && HM.info.glb) || 'g1';
if (HM.bind && HM.bind.id === id && HM.bind.K === HM.K) return;
if (HM.bind && HM.bind.root.parent) HM.bind.root.parent.remove(HM.bind.root);
HM.bind = null; HM.want = id;
hmLoadModel(id, function (obj) {
if (!HM.K || HM.want !== id) return;
if (HM.bind && HM.bind.root.parent) HM.bind.root.parent.remove(HM.bind.root);
HM.bind = id === 'g1' ? hmBind(obj) : hmBindLinks(obj); if (!HM.bind) return;
HM.bind.id = id; HM.bind.K = HM.K; HM.root.add(obj); hmCredit.textContent = hmCreditText();
});
}
function hmT(k, out) {
var b = HM.K[k]; HMQ2.set(b.wq.x, b.wq.z, -b.wq.y, b.wq.w);
return (out || new THREE.Matrix4()).compose(HW(b.wp.x, b.wp.y, b.wp.z, HMV), HMQ2, HMAX.set(1, 1, 1));
}
function hmBind(root) {
if (!HM.K) return null;
root.updateMatrixWorld(true);
var bones = [], seen = {};
root.traverse(function (o) {
if (o.isSkinnedMesh) { o.frustumCulled = false; o.castShadow = true; o.receiveShadow = true; o.skeleton.bones.forEach(function (b) { if (!seen[b.uuid]) { seen[b.uuid] = 1; bones.push(b); } }); }
if (o.isMesh && o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { m.envMapIntensity = 1.0; if (/alloy/i.test(m.name)) { m.metalness = Math.max(m.metalness, 0.55); m.roughness = Math.min(Math.max(m.roughness, 0.28), 0.42); } if (/rubber/i.test(m.name)) m.roughness = 0.9; }); }
});
var depth = function (o) { var d = 0; while (o.parent) { d++; o = o.parent; } return d; };
bones.sort(function (a, b) { return depth(a) - depth(b); });
hmFK(new Array(36).fill(0).map(function (v, i) { return i === 3 ? 1 : 0; }));
var Gi = HM_G.clone().invert(), T0 = new THREE.Matrix4(), pel = HM.byName.pelvis;
var B = bones.map(function (bone) {
var S = bone.matrixWorld.clone(), link = bone.name.replace(/_\d+_\d+$/, ''), k = HM.byName[link];
var e = { bone: bone, k: k, R: null, rel: null, parent: null };
if (k != null) { hmT(k, T0); e.R = T0.clone().invert().multiply(Gi).multiply(S); }
else if (bone.parent && bone.parent.isBone && seen[bone.parent.uuid]) { e.parent = bone.parent; e.rel = bone.parent.matrixWorld.clone().invert().multiply(S); }
else { hmT(pel, T0); e.k = pel; e.R = T0.clone().invert().multiply(Gi).multiply(S); }
bone.matrixAutoUpdate = false; bone.matrixWorldAutoUpdate = false;
return e;
});
var byBone = {}; B.forEach(function (e) { byBone[e.bone.uuid] = e; });
B.forEach(function (e) { if (e.parent) e.pe = byBone[e.parent.uuid]; });
return { root: root, B: B };
}
var HMM = new THREE.Matrix4();
function hmPose(bind, qpos) {
hmFK(qpos);
if (bind.L) { for (var l = 0; l < bind.L.length; l++) { var e_ = bind.L[l]; hmT(e_.k, e_.o.matrix); e_.o.matrixWorldNeedsUpdate = true; } return; }
var B = bind.B;
for (var i = 0; i < B.length; i++) {
var e = B[i];
if (e.R) { hmT(e.k, HMM); e.bone.matrixWorld.multiplyMatrices(HMM, e.R); }
else if (e.pe) e.bone.matrixWorld.multiplyMatrices(e.pe.bone.matrixWorld, e.rel);
}
}
function hmTextures() {
if (HM.tex) return HM.tex;
var T = HM.tex = {};
T.floor = vgTex(1024, 1024, function (g, w, h) {
var r = vgRnd(5); g.fillStyle = '#9a9c9f'; g.fillRect(0, 0, w, h);
vgBlobs(g, w, h, r, 260, 40, 220, ['rgba(70,72,76,A)', 'rgba(200,202,205,A)', 'rgba(120,115,108,A)'], 0.03, 0.09);
vgSpeckle(g, w, h, r, 26000, 0.4, 1.3, ['rgba(60,60,60,A)', 'rgba(235,235,235,A)', 'rgba(140,130,120,A)'], 0.08, 0.3);
g.strokeStyle = 'rgba(40,40,42,0.35)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
for (var k = 0; k < 14; k++) { var x = r() * w, y = r() * h; g.strokeStyle = 'rgba(50,50,52,' + (0.05 + r() * 0.08) + ')'; g.lineWidth = 0.6 + r(); g.beginPath(); g.moveTo(x, y); for (var j = 0; j < 5; j++) { x += (r() - 0.5) * 120; y += (r() - 0.5) * 120; g.lineTo(x, y); } g.stroke(); }
});
T.floorRough = vgTex(512, 512, function (g, w, h) {
var r = vgRnd(9); g.fillStyle = '#5a5a5a'; g.fillRect(0, 0, w, h); vgBlobs(g, w, h, r, 120, 30, 140, ['rgba(140,140,140,A)', 'rgba(30,30,30,A)'], 0.1, 0.35);
}, false);
T.lane = vgTex(256, 1024, function (g, w, h) {
var r = vgRnd(13); g.fillStyle = '#3a4656'; g.fillRect(0, 0, w, h);
vgSpeckle(g, w, h, r, 9000, 0.4, 1.4, ['rgba(20,26,34,A)', 'rgba(120,135,150,A)'], 0.1, 0.35);
g.fillStyle = 'rgba(240,242,245,0.95)'; g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h);
for (var y = 0; y < h; y += 128) { g.fillRect(w / 2 - 3, y + 20, 6, 70); }                                           // the line it follows, dashed
g.fillStyle = 'rgba(240,242,245,0.8)'; for (var m = 0; m < 4; m++) { var yy = m * h / 4; g.fillRect(10, yy, 34, 4); g.fillRect(w - 44, yy, 34, 4); }   // a tick every metre
});
T.glow = vgTex(64, 64, function (g, w, h) { var gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false);
return T;
}
function hmNumberTex(txt) {
var c = document.createElement('canvas'); c.width = 256; c.height = 128; var g = c.getContext('2d');
g.clearRect(0, 0, 256, 128); g.fillStyle = 'rgba(240,242,245,0.92)'; g.font = '700 92px Inter, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 128, 68);
var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function hmWorld() {
if (HM.root) { scene.remove(HM.root); HM.root.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); }
var root = HM.root = new THREE.Group(); scene.add(root);
HM.courseKey = null; HM.courseG = null; HM.courseDirty = true;
var T = hmTextures(), hi = quality !== 'fast';
var bg = new THREE.Color(0x1d232b);
scene.background = bg; scene.fog = new THREE.Fog(0x1d232b, 30, 140);
T.floor.repeat.set(1, 1); T.floorRough.repeat.set(1, 1);
var fm = new THREE.MeshStandardMaterial({ map: T.floor, roughnessMap: T.floorRough, roughness: 0.55, metalness: 0.0, envMapIntensity: 0.55 });
fm.onBeforeCompile = function (sh) {
sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
sh.fragmentShader = 'varying vec3 vWp;\n' + sh.fragmentShader.replace('#include <map_fragment>', '  vec4 sampledDiffuseColor = texture2D(map, vWp.xz / 4.0); diffuseColor *= sampledDiffuseColor;')
.replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness; roughnessFactor *= 0.6 + 0.8 * texture2D(roughnessMap, vWp.xz / 7.0).g;');
};
var fl = HM.baseFloor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), fm); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; root.add(fl);
var hall = HM.hall = new THREE.Group(); root.add(hall);
var wallM = new THREE.MeshStandardMaterial({ color: 0x2a313a, roughness: 0.9 }), ribM = new THREE.MeshStandardMaterial({ color: 0x39424d, roughness: 0.7, metalness: 0.3 });
var barM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.62, 1.7) });
[-26, 26].forEach(function (z) {
var w = new THREE.Mesh(new THREE.PlaneGeometry(600, 14), wallM); w.position.set(0, 7, z); w.rotation.y = z > 0 ? Math.PI : 0; hall.add(w);
for (var x = -300; x <= 300; x += 8) { var r = new THREE.Mesh(new THREE.BoxGeometry(0.5, 14, 0.4), ribM); r.position.set(x, 7, z + (z > 0 ? -0.2 : 0.2)); hall.add(r); }
var strip = new THREE.Mesh(new THREE.BoxGeometry(600, 0.12, 0.05), barM); strip.position.set(0, 0.6, z + (z > 0 ? -0.25 : 0.25)); hall.add(strip);
});
esaLogo(function (img) {
var c = document.createElement('canvas'); c.width = 2048; c.height = 512; var x = c.getContext('2d');
var lh = 420, lw = img ? Math.round(lh * (img.naturalWidth || img.width) / (img.naturalHeight || img.height)) : 420;
x.font = '700 290px Inter, "Segoe UI", Arial, sans-serif'; x.textBaseline = 'middle';
var tw = x.measureText('EsaSim').width, gap = 80, x0 = (2048 - lw - gap - tw) / 2;
if (img) x.drawImage(img, x0, 46, lw, lh); else esaHexagon(x, x0 + 210, 256, 200);
x.fillStyle = '#ffffff'; x.fillText('EsaSim', x0 + lw + gap, 268);
var tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
var paint = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.03, color: 0xeef2f8, roughness: 0.85, metalness: 0,
emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
if (HM.signs) HM.signs.forEach(function (o) { o.parent && o.parent.remove(o); });
HM.signs = [];
[-26, 26].forEach(function (z) {
[-16, 16, 48].forEach(function (sx) {
var sg = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.8), paint);
sg.position.set(sx, 3.4, z + (z > 0 ? -0.012 : 0.012)); sg.rotation.y = z > 0 ? Math.PI : 0; sg.receiveShadow = true;
hall.add(sg); HM.signs.push(sg);
});
});
if (!img) return;
var fc = document.createElement('canvas'), fw = 512, fh = Math.round(512 * (img.naturalHeight || img.height) / (img.naturalWidth || img.width));
fc.width = fw; fc.height = fh; fc.getContext('2d').drawImage(img, 0, 0, fw, fh);
var ft = new THREE.CanvasTexture(fc); ft.colorSpace = THREE.SRGBColorSpace; ft.anisotropy = 8;
var floorPaint = new THREE.MeshStandardMaterial({ map: ft, transparent: true, opacity: 0.82, alphaTest: 0.03, color: 0xe9edf3, roughness: 0.6, metalness: 0,
polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, depthWrite: false });
[[20, 0, 4.2], [15, 15, 3.2], [15, -15, 3.2], [-12, 0, 3.2], [46, 0, 3.2]].forEach(function (f) {
var d = new THREE.Mesh(new THREE.PlaneGeometry(f[2] * fw / fh, f[2]), floorPaint);
d.rotation.x = -Math.PI / 2; d.rotation.z = Math.PI / 2; d.position.set(f[0], 0.012, f[1]); d.receiveShadow = true; d.renderOrder = 1;
hall.add(d); HM.signs.push(d);
});
});
var ceil = new THREE.Mesh(new THREE.PlaneGeometry(600, 52), new THREE.MeshStandardMaterial({ color: 0x161a1f, roughness: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = 14; hall.add(ceil);
for (var xx = -300; xx <= 300; xx += 6) [-13, -4.5, 4.5, 13].forEach(function (z) { var b = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 0.28), barM); b.position.set(xx, 13.6, z); hall.add(b); });
var es = new THREE.Scene(); es.background = new THREE.Color(0x232a33);
var eb = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5, 5.2) });
for (var ex = -40; ex <= 40; ex += 6) [-13, -4.5, 4.5, 13].forEach(function (z) { var b = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 0.3), eb); b.position.set(ex, 13.6, z); es.add(b); });
var efl = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ color: 0x55585c })); efl.rotation.x = -Math.PI / 2; es.add(efl);
[-26, 26].forEach(function (z) { var w = new THREE.Mesh(new THREE.PlaneGeometry(200, 14), new THREE.MeshBasicMaterial({ color: 0x2c333c, side: THREE.DoubleSide })); w.position.set(0, 7, z); es.add(w); var s = new THREE.Mesh(new THREE.BoxGeometry(200, 0.15, 0.1), eb); s.position.set(0, 0.6, z); es.add(s); });
if (HM.envRT) HM.envRT.dispose();
HM.envRT = pmrem.fromScene(es, 0.02); scene.environment = HM.envRT.texture; scene.environmentIntensity = 0.9;
sun.color.set(0xfff4e8); sun.intensity = 2.3; sun.castShadow = renderer.shadowMap.enabled;
if (sun.castShadow) { var sc = sun.shadow.camera; sc.left = -5; sc.right = 5; sc.top = 5; sc.bottom = -5; sc.near = 1; sc.far = 40; sc.updateProjectionMatrix(); var ms = hi ? 4096 : 2048; sun.shadow.mapSize.set(ms, ms); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3; }
HM.keyOff = new THREE.Vector3(4, 9, 6);
hemi.color.set(0xcfd8e6); hemi.groundColor.set(0x3a3c40); hemi.intensity = 0.55;
if (!HM.rim) { HM.rim = new THREE.DirectionalLight(0xa9c4ff, 1.1); scene.add(HM.rim); scene.add(HM.rim.target); }
HM.rim.visible = true;
renderer.toneMappingExposure = 1.0;
HM.laneKey = ''; HM.lane = null;
HM.dots = null;
HM.prints = []; HM.printM = new THREE.MeshBasicMaterial({ map: T.glow, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 });
var arrow = function (col) { var g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, depthWrite: false }); var sh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.012, 0.05), m); sh.position.x = 0.5; g.add(sh); var hd = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 16), m); hd.rotation.z = -Math.PI / 2; hd.position.x = 1.06; g.add(hd); g.renderOrder = 7; root.add(g); return g; };
HM.arCmd = arrow(0x37d67a); HM.arAct = arrow(0x3ec5ff);
HM.bind = null;
if (HM_TEL) return;
hmAttach();
}
function hmCourseH(x, y) {
var C = HM.info && HM.info.course; if (!C) return 0;
var h = 0, rp = C.ramp;
if (rp) {
var xs = rp.x, pr = 0;
if (x > xs[0] && x < xs[3]) pr = x < xs[1] ? rp.h * (x - xs[0]) / (xs[1] - xs[0]) : x <= xs[2] ? rp.h : rp.h * (xs[3] - x) / (xs[3] - xs[2]);
h += pr * Math.max(0, Math.min(1, (rp.half + rp.bank - Math.abs(y)) / rp.bank));
}
var sa = hmStairAt(x, y); if (sa) h += hmStairH(sa.st, sa.u);
var ti = hmTileAt(x, y); if (ti >= 0) h = Math.max(h, (HM.tileH && HM.tileH[ti]) || 0);
if (hmIceAt(x, y)) h = Math.max(h, C.ice.top);
if (hmInSq(C.sand, x, y)) h = Math.max(h, C.sand.top);
(C.ramps || []).forEach(function (q) { if (x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1) { var u = q.axis === 'y' ? (y - q.y0) / (q.y1 - q.y0) : (x - q.x0) / (q.x1 - q.x0); h = Math.max(h, q.h0 + (q.h1 - q.h0) * Math.max(0, Math.min(1, u))); } });
if (C.boxes) for (var bi = 0; bi < C.boxes.length; bi++) { var bx = C.boxes[bi]; if (x >= bx.x0 && x <= bx.x1 && y >= bx.y0 && y <= bx.y1 && bx.h > h) h = bx.h; }
var pa = hmPatchAt(x, y);
if (pa) {
var n = pa.n, c = pa.cell, u = (x - pa.x0) / c, v = (y - pa.y0) / c, g = pa.mm;
if (pa.kind === 'bumps') { var u0 = Math.min(n - 2, Math.floor(u)), v0 = Math.min(n - 2, Math.floor(v)), fu = u - u0, fv = v - v0; h += (g[v0 * n + u0] * (1 - fu) * (1 - fv) + g[v0 * n + u0 + 1] * fu * (1 - fv) + g[(v0 + 1) * n + u0] * (1 - fu) * fv + g[(v0 + 1) * n + u0 + 1] * fu * fv) / 1000; }
else h += g[Math.min(n - 1, Math.floor(v)) * n + Math.min(n - 1, Math.floor(u))] / 1000;
}
return h;
}
function hmInSq(q, x, y) { return !!q && x >= q.x0 && x <= q.x0 + q.size && y >= q.y0 && y <= q.y0 + q.size; }
function hmIceAt(x, y) {
var I = HM.info && HM.info.course && HM.info.course.ice; return !!I && x >= I.x0 && x <= I.x0 + I.size && y >= I.y0 && y <= I.y0 + I.size;
}
function hmPatchAt(x, y) {
var C = HM.info && HM.info.course; if (!C) return null;
var P = C.patches || [];
for (var i = 0; i < P.length; i++) { var pa = P[i]; if (x >= pa.x0 && x <= pa.x0 + pa.size && y >= pa.y0 && y <= pa.y0 + pa.size) return pa; }
return null;
}
function hmStairH(st, u) {
var n = st.n, r = st.rise, t = st.tread, L = st.landing, up = (n - 1) * t;
if (u < 0) return 0; if (u < up) return (Math.floor(u / t + 1e-6) + 1) * r; if (u < up + L) return n * r;
if (u < 2 * up + L) return (n - 1 - Math.floor((u - up - L) / t + 1e-6)) * r; return 0;
}
function hmTileAt(x, y) {
var T = HM.info && HM.info.course && HM.info.course.tiles; if (!T) return -1;
var u = (x - T.x0) / T.cell, v = (y - T.y0) / T.cell;
return u >= 0 && u < T.n && v >= 0 && v < T.n ? Math.floor(v) * T.n + Math.floor(u) : -1;
}
function hmTiles(E, r) {
var T = HM.info && HM.info.course && HM.info.course.tiles; if (!T) return;
var n = T.n * T.n, P = E && E.tiles, tt = HM.F.tt != null ? r[HM.F.tt] : 0;
if (!HM.tileH || HM.tileH.length !== n) HM.tileH = new Float32Array(n);
for (var i = 0; i < n; i++) HM.tileH[i] = P ? P.b[i] + P.a[i] * (1 + Math.sin(P.w[i] * tt + P.p[i])) : 0;
if (!HM.tileMesh) return;
var M = HM.tileM || (HM.tileM = new THREE.Matrix4()), c = T.cell - 0.012;
for (i = 0; i < n; i++) {
var x = T.x0 + ((i % T.n) + 0.5) * T.cell, y = T.y0 + (Math.floor(i / T.n) + 0.5) * T.cell, h = Math.max(0.003, HM.tileH[i]);
M.makeScale(c, h, c); M.setPosition(x, 0, -y); HM.tileMesh.setMatrixAt(i, M);
}
HM.tileMesh.instanceMatrix.needsUpdate = true;
}
function hmStairAt(x, y) {
var C = HM.info && HM.info.course; if (!C || !C.stairs) return null;
for (var i = 0; i < C.stairs.length; i++) {
var st = C.stairs[i], u = (x - st.x0) * st.dir, ln = 2 * (st.n - 1) * st.tread + st.landing;
if (Math.abs(y - st.y) <= st.width / 2 + 1e-6 && u >= 0 && u < ln) return { st: st, u: u };
}
return null;
}
function hmZone(x, y) {
var C = HM.info && HM.info.course; if (!C) return 'the floor';
var pa = hmPatchAt(x, y); if (pa) return pa.kind === 'bumps' ? 'bumps' : 'blocks';
if (hmTileAt(x, y) >= 0) return 'the moving tiles';
if (hmIceAt(x, y)) return 'the ice';
if (hmInSq(C.sand, x, y)) return 'the sand';
if (hmInSq(C.water, x, y)) return 'the water';
var sa = hmStairAt(x, y);
if (sa && sa.st.name === 'curb') return 'a curb (' + Math.round(sa.st.rise * 100) + ' cm)';
if (sa) { var st = sa.st, up = (st.n - 1) * st.tread, cm = Math.round(st.rise * 100), w = st.name === 'yard' ? 'training stairs (' + cm + ' cm)' : 'the stairs (' + cm + ' cm)';
return sa.u < up || sa.u >= up + st.landing ? w : st.name === 'yard' ? 'a training landing' : 'the landing'; }
var rp = C.ramp; if (rp && Math.abs(y) < rp.half + rp.bank && x > rp.x[0] && x < rp.x[3]) return x < rp.x[1] || x > rp.x[2] ? 'the slope' : 'the plateau';
if ((C.ramps || []).some(function (q) { return x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1; })) return 'the ramp';
var pfs = C.platforms || (C.platform ? [C.platform] : []);
for (var pi_ = 0; pi_ < pfs.length; pi_++) { var pf = pfs[pi_]; if (x >= pf.x0 && x <= pf.x1 && y >= pf.y0 && y <= pf.y1) return pf.name === 'dispatch' ? 'the dispatch platform' : 'the mezzanine'; }
if ((C.clutter || []).some(function (q) { return x >= q.x0 - 0.3 && x <= q.x1 + 0.3 && y >= q.y0 - 0.3 && y <= q.y1 + 0.3; })) return 'clutter (pallets, cartons)';
return 'the floor';
}
function hmPathAt(x, y) {
var P = HM.info && HM.info.course && HM.info.course.path; if (!P) return null;
var bi = 0, bd = Infinity;
for (var i = 0; i < P.length; i++) { var dx = P[i][0] - x, dy = P[i][1] - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = i; } }
var a = P[(bi + P.length - 1) % P.length], b = P[(bi + 1) % P.length], hd = Math.atan2(b[1] - a[1], b[0] - a[0]);
return { i: bi, hd: hd, off: -(x - P[bi][0]) * Math.sin(hd) + (y - P[bi][1]) * Math.cos(hd) };
}
function hmWorldUV(m, scale, extra) {
m.onBeforeCompile = function (sh) {
sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
sh.fragmentShader = 'varying vec3 vWp;\n' + sh.fragmentShader.replace('#include <map_fragment>', '  vec4 sampledDiffuseColor = texture2D(map, vWp.xz / ' + scale.toFixed(2) + '); diffuseColor *= sampledDiffuseColor;' + (extra || ''));
};
return m;
}
function hmCourse() {
var C = HM.info && HM.info.course, key = C ? JSON.stringify([C.ramp, (C.patches || []).map(function (p) { return [p.x0, p.y0, p.n, p.mm.length, p.mm[0], p.mm[p.mm.length - 1]]; }), C.stairs || [], C.circuit || null, C.ice || null, C.sand || null, C.water || null, C.kind || '']) : '';
if (key === HM.courseKey) return; HM.courseKey = key;
if (HM.hall) HM.hall.visible = true; if (HM.baseFloor) HM.baseFloor.visible = true; HM.wh = null; if (typeof HMP !== 'undefined' && HMP) HMP.box.style.display = 'none';
if (HM.courseG) { HM.root.remove(HM.courseG); HM.courseG.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); }); HM.courseG = null; }
if (!C) return;
var g = HM.courseG = new THREE.Group(), T = hmTextures(), Hf = hmCourseH;
var mesh = function (pos, idx, col, mat) {
var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); if (col) geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
geo.setIndex(idx); geo.computeVertexNormals(); var m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
};
var grid = function (xs, ys, hf, keep) {
var pos = [], idx = [], nx = xs.length, ny = ys.length;
for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) pos.push(xs[i], hf(xs[i], ys[j]), -ys[j]);
for (j = 0; j < ny - 1; j++) for (i = 0; i < nx - 1; i++) {
if (keep && !keep(xs[i], xs[i + 1], ys[j], ys[j + 1])) continue;
var a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, b, c, b, d, c);
}
return { pos: pos, idx: idx };
};
var steps = function (a, b, d, must) { var v = [], x; for (x = a; x < b + 1e-6; x += d) v.push(+x.toFixed(4)); (must || []).forEach(function (m) { if (m > a && m < b) v.push(m); }); v.sort(function (p, q) { return p - q; }); return v.filter(function (x, i) { return !i || x - v[i - 1] > 1e-4; }); };
var rp = C.ramp;
if (rp) {
var rampH = function (x, y) { var C2 = HM.info.course, xs = rp.x, pr = 0; if (x > xs[0] && x < xs[3]) pr = x < xs[1] ? rp.h * (x - xs[0]) / (xs[1] - xs[0]) : x <= xs[2] ? rp.h : rp.h * (xs[3] - x) / (xs[3] - xs[2]); return pr * Math.max(0, Math.min(1, (rp.half + rp.bank - Math.abs(y)) / rp.bank)) + 0.001; };
var W = rp.half + rp.bank, R = grid(steps(rp.x[0], rp.x[3], 0.25, rp.x), steps(-W, W, 0.25, [-rp.half, rp.half]), rampH);
var rm = hmWorldUV(new THREE.MeshStandardMaterial({ map: T.floor, color: 0xc9c5bd, roughness: 0.8, envMapIntensity: 0.4 }), 3.0,
'\n  float gro = smoothstep(0.38, 0.46, abs(fract(vWp.x / 0.15) - 0.5)); diffuseColor.rgb *= 1.0 - 0.28 * gro;');
mesh(R.pos, R.idx, null, rm);
var hz = T.hazard || (T.hazard = vgTex(256, 32, function (c2, w, h) { c2.fillStyle = '#f2c230'; c2.fillRect(0, 0, w, h); c2.fillStyle = '#16181b'; for (var x = -h; x < w + h; x += 32) { c2.beginPath(); c2.moveTo(x, h); c2.lineTo(x + 16, h); c2.lineTo(x + 16 + h, 0); c2.lineTo(x + h, 0); c2.fill(); } }));
hz.wrapS = THREE.RepeatWrapping;
[-1, 1].forEach(function (sd) {
var xs = steps(rp.x[0], rp.x[3], 0.25, rp.x), pos = [], uv = [], idx = [], y0 = sd * (rp.half - 0.02), y1 = sd * (rp.half - 0.12);
xs.forEach(function (x, i) { pos.push(x, rampH(x, y0) + 0.003, -y0, x, rampH(x, y1) + 0.003, -y1); uv.push(x / 0.5, 0, x / 0.5, 1); if (i) { var a = 2 * i - 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
var m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: hz, roughness: 0.7, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })); m.receiveShadow = true; g.add(m);
});
}
var rub = T.rubber || (T.rubber = vgTex(512, 512, function (c2, w, h) { var r = vgRnd(21); c2.fillStyle = '#6a6c70'; c2.fillRect(0, 0, w, h); vgSpeckle(c2, w, h, r, 30000, 0.5, 1.6, ['rgba(20,20,22,A)', 'rgba(110,112,116,A)', 'rgba(70,60,50,A)'], 0.15, 0.5); }));
rub.wrapS = rub.wrapT = THREE.RepeatWrapping;
(C.patches || []).forEach(function (pa) {
var n = pa.n, c = pa.cell, x0 = pa.x0, y0 = pa.y0, S = pa.size;
if (pa.kind === 'bumps') {
var xs = [], ys = [], k; for (k = 0; k < n; k++) { xs.push(x0 + k * c); ys.push(y0 + k * c); }
var B = grid(xs, ys, function (x, y) { return hmCourseH(x, y) + 0.001; }), col = [];
for (k = 1; k < B.pos.length; k += 3) { var t = Math.max(0, Math.min(1, B.pos[k] / 0.045)); t = t * t * (3 - 2 * t); col.push(0.38 + 1.05 * t, 0.36 + 0.98 * t, 0.33 + 0.9 * t); }   // hollows dark, tops light: the relief reads from afar
var base = B.pos.length / 3; [[0, 0, 1, 0], [0, n - 1, 1, 0], [0, 0, 0, 1], [n - 1, 0, 0, 1]].forEach(function (e) {
for (var q = 0; q < n; q++) { var i = e[0] + q * e[2], j = e[1] + q * e[3], X = x0 + i * c, Y = y0 + j * c; B.pos.push(X, hmCourseH(X, Y) + 0.001, -Y, X, 0.0, -Y); col.push(0.5, 0.5, 0.52, 0.5, 0.5, 0.52); }
var s0 = base; for (q = 0; q < n - 1; q++) { var a = s0 + 2 * q; B.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2, a, a + 2, a + 1, a + 1, a + 2, a + 3); } base += 2 * n;
});
mesh(B.pos, B.idx, col, hmWorldUV(new THREE.MeshStandardMaterial({ map: rub, vertexColors: true, roughness: 0.95, envMapIntensity: 0.25 }), 1.2));
} else {
var pos = [], idx = [], cl = [], r2 = vgRnd(31), gap = 0.006;
for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
var h = pa.mm[j * n + i] / 1000; if (h < 0.002) continue;
var ax = x0 + i * c + gap, bx = x0 + (i + 1) * c - gap, ay = y0 + j * c + gap, by = y0 + (j + 1) * c - gap, s0 = pos.length / 3;
var shade = 0.55 + 0.25 * r2() + 3 * h, tint = r2() < 0.18 ? [1.0, 0.86, 0.55] : [1, 1, 1.03];
var V = [[ax, 0, ay], [bx, 0, ay], [bx, 0, by], [ax, 0, by], [ax, h, ay], [bx, h, ay], [bx, h, by], [ax, h, by]];
var faces = [[4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
faces.forEach(function (f, fi) {
var b0 = pos.length / 3; f.forEach(function (vi) { pos.push(V[vi][0], V[vi][1], -V[vi][2]); var dk = fi ? 0.72 : 1; cl.push(shade * dk * tint[0], shade * dk * tint[1], shade * dk * tint[2]); });
idx.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3);
});
}
mesh(pos, idx, cl, hmWorldUV(new THREE.MeshStandardMaterial({ map: rub, vertexColors: true, roughness: 0.85, envMapIntensity: 0.3 }), 1.6));
}
var stl = new THREE.MeshStandardMaterial({ color: 0x7a8088, metalness: 0.6, roughness: 0.45 });
[[x0 + S / 2, y0 - 0.02, S + 0.08, 0.04], [x0 + S / 2, y0 + S + 0.02, S + 0.08, 0.04], [x0 - 0.02, y0 + S / 2, 0.04, S], [x0 + S + 0.02, y0 + S / 2, 0.04, S]].forEach(function (e) {
var b = new THREE.Mesh(new THREE.BoxGeometry(e[2], 0.012, e[3]), stl); b.position.set(e[0], 0.006, -e[1]); b.castShadow = b.receiveShadow = true; g.add(b);
});
});
var SC = { 6: 0x3e9bfe, 9: 0x46d884, 12: 0xf2c230, 15: 0xff6b5a };
(C.stairs || []).forEach(function (st) {
if (C.kind === 'warehouse' && st.name !== 'curb') return;
var n = st.n, r = st.rise, t = st.tread, L = st.landing, up = (n - 1) * t, d = st.dir, hw = st.width / 2, yc = st.y;
var pos = [], col = [], idx = [], tread = [0.80, 0.80, 0.78], riser = [0.56, 0.56, 0.55];
var box = function (u0, u1, h, c1, c2) {
var xa = st.x0 + d * u0, xb = st.x0 + d * u1, x0 = Math.min(xa, xb), x1 = Math.max(xa, xb), y0 = yc - hw, y1 = yc + hw;
var V = [[x0, 0, y0], [x1, 0, y0], [x1, 0, y1], [x0, 0, y1], [x0, h, y0], [x1, h, y0], [x1, h, y1], [x0, h, y1]];
[[4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]].forEach(function (f, fi) {
var b0 = pos.length / 3, cc = fi ? c2 : c1; f.forEach(function (vi) { pos.push(V[vi][0], V[vi][1], -V[vi][2]); col.push(cc[0], cc[1], cc[2]); });
idx.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3);
});
};
var noses = [];
for (var k = 0; k < n - 1; k++) { box(k * t, (k + 1) * t, (k + 1) * r, tread, riser); noses.push([k * t + 0.02, (k + 1) * r]); }
box(up, up + L, n * r, tread, riser); noses.push([up + 0.02, n * r]);
for (k = 0; k < n - 1; k++) { box(up + L + k * t, up + L + (k + 1) * t, (n - 1 - k) * r, tread, riser); noses.push([up + L + k * t - 0.02, (n - k) * r]); }
noses.push([2 * up + L - 0.02, r]);
mesh(pos, idx, col, hmWorldUV(new THREE.MeshStandardMaterial({ map: T.floor, vertexColors: true, roughness: 0.75, envMapIntensity: 0.35 }), 3.0));
var nm = new THREE.MeshStandardMaterial({ color: st.name === 'yard' ? (SC[Math.round(r * 100)] || 0xf2c230) : 0xf2c230, roughness: 0.6 });
noses.forEach(function (q) { var m = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.006, st.width - 0.04), nm); m.position.set(st.x0 + d * q[0], q[1] + 0.003, -yc); m.receiveShadow = true; g.add(m); });
if (st.name !== 'yard' && st.name !== 'curb') {
var steel = new THREE.MeshStandardMaterial({ color: 0xb8bec6, metalness: 0.8, roughness: 0.3 });
[-1, 1].forEach(function (sd) {
var yy = yc + sd * (hw - 0.06), pts = [];
for (var u = 0.15; u <= 2 * up + L - 0.15 + 1e-6; u += 0.6) pts.push(u);
pts.forEach(function (u) { var h = hmStairH(st, u); var p = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 10), steel); p.position.set(st.x0 + d * u, h + 0.45, -yy); p.castShadow = true; g.add(p); });
var rail = []; for (var u2 = 0.15; u2 <= 2 * up + L - 0.15 + 1e-6; u2 += t) rail.push(new THREE.Vector3(st.x0 + d * u2, hmStairH(st, u2) + 0.9, -yy));
var tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail), rail.length * 2, 0.025, 8, false), steel); tube.castShadow = true; g.add(tube);
});
}
});
HM.tileMesh = null;
if (C.tiles) {
var TL = C.tiles, nt = TL.n * TL.n, ug = new THREE.BoxGeometry(1, 1, 1); ug.translate(0, 0.5, 0);
var tm = new THREE.InstancedMesh(ug, hmWorldUV(new THREE.MeshStandardMaterial({ map: rub, roughness: 0.85, envMapIntensity: 0.3 }), 1.4), nt);
var r3 = vgRnd(41), tc = new THREE.Color();
for (var q = 0; q < nt; q++) { var sh = 0.75 + 0.3 * r3(); tm.setColorAt(q, (Math.floor(q / TL.n) + q) % 2 ? tc.setRGB(0.95 * sh, 0.62 * sh, 0.22 * sh) : tc.setRGB(0.55 * sh, 0.57 * sh, 0.6 * sh)); }
tm.castShadow = true; tm.receiveShadow = true; tm.frustumCulled = false; g.add(tm); HM.tileMesh = tm; HM.tileH = null;
var S2 = TL.cell * TL.n, stl2 = new THREE.MeshStandardMaterial({ color: 0x5c626a, metalness: 0.6, roughness: 0.45 });
[[TL.x0 + S2 / 2, TL.y0 - 0.03, S2 + 0.12, 0.06], [TL.x0 + S2 / 2, TL.y0 + S2 + 0.03, S2 + 0.12, 0.06], [TL.x0 - 0.03, TL.y0 + S2 / 2, 0.06, S2], [TL.x0 + S2 + 0.03, TL.y0 + S2 / 2, 0.06, S2]].forEach(function (e) {
var b = new THREE.Mesh(new THREE.BoxGeometry(e[2], 0.03, e[3]), stl2); b.position.set(e[0], 0.015, -e[1]); b.castShadow = b.receiveShadow = true; g.add(b);
});
hmTiles(null, []);
}
if (C.ice) {
var IC = C.ice, itx = T.ice || (T.ice = vgTex(512, 512, function (c2, w, h) {
var rr = vgRnd(77); c2.fillStyle = '#cfe6f3'; c2.fillRect(0, 0, w, h);
for (var q = 0; q < 900; q++) { c2.globalAlpha = 0.04 + 0.06 * rr(); c2.fillStyle = rr() < 0.5 ? '#ffffff' : '#9cc6dd'; c2.beginPath(); c2.arc(rr() * w, rr() * h, 6 + 40 * rr(), 0, 6.283); c2.fill(); }
c2.strokeStyle = '#ffffff'; for (q = 0; q < 160; q++) { c2.globalAlpha = 0.12 + 0.25 * rr(); c2.lineWidth = 0.6 + rr(); var x = rr() * w, y = rr() * h, a = rr() * 6.283, L = 20 + 120 * rr();
c2.beginPath(); c2.moveTo(x, y); c2.quadraticCurveTo(x + Math.cos(a) * L * 0.5 + 10 * (rr() - 0.5), y + Math.sin(a) * L * 0.5 + 10 * (rr() - 0.5), x + Math.cos(a) * L, y + Math.sin(a) * L); c2.stroke(); }
c2.globalAlpha = 1;
}));
itx.wrapS = itx.wrapT = THREE.RepeatWrapping; itx.repeat.set(IC.size / 2, IC.size / 2);
var imat = new (THREE.MeshPhysicalMaterial || THREE.MeshStandardMaterial)({ map: itx, color: 0xeaf6ff, roughness: 0.04, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.02, envMapIntensity: 1.6, transparent: true, opacity: 0.9 });
var slab = new THREE.Mesh(new THREE.BoxGeometry(IC.size, IC.top, IC.size), imat);
slab.position.set(IC.x0 + IC.size / 2, IC.top / 2, -(IC.y0 + IC.size / 2)); slab.receiveShadow = true; g.add(slab);
var stl3 = new THREE.MeshStandardMaterial({ color: 0x8d97a3, metalness: 0.7, roughness: 0.35 });
[[IC.x0 + IC.size / 2, IC.y0 - 0.025, IC.size + 0.1, 0.05], [IC.x0 + IC.size / 2, IC.y0 + IC.size + 0.025, IC.size + 0.1, 0.05], [IC.x0 - 0.025, IC.y0 + IC.size / 2, 0.05, IC.size], [IC.x0 + IC.size + 0.025, IC.y0 + IC.size / 2, 0.05, IC.size]].forEach(function (e) {
var b = new THREE.Mesh(new THREE.BoxGeometry(e[2], IC.top + 0.004, e[3]), stl3); b.position.set(e[0], (IC.top + 0.004) / 2, -e[1]); b.castShadow = b.receiveShadow = true; g.add(b);
});
}
if (C.sand) {
var SD = C.sand, stx = T.sand || (T.sand = vgTex(512, 512, function (c2, w, h) {
var rr = vgRnd(19), im = c2.createImageData(w, h);
for (var p = 0; p < w * h; p++) { var v = 0.82 + 0.18 * rr(), k = p * 4; im.data[k] = 214 * v; im.data[k + 1] = 186 * v; im.data[k + 2] = 132 * v; im.data[k + 3] = 255; }
c2.putImageData(im, 0, 0);
for (var q = 0; q < 260; q++) { c2.globalAlpha = 0.05 + 0.08 * rr(); c2.fillStyle = rr() < 0.5 ? '#8a6e45' : '#f1dcae'; c2.beginPath(); c2.ellipse(rr() * w, rr() * h, 10 + 40 * rr(), 4 + 10 * rr(), rr() * 3.14, 0, 6.283); c2.fill(); }
c2.globalAlpha = 1;
}));
stx.wrapS = stx.wrapT = THREE.RepeatWrapping; stx.repeat.set(SD.size / 1.5, SD.size / 1.5);
var sgeo = new THREE.PlaneGeometry(SD.size, SD.size, 50, 50); sgeo.rotateX(-Math.PI / 2);
var sp = sgeo.attributes.position, sr = vgRnd(23);
for (var si = 0; si < sp.count; si++) sp.setY(si, SD.top - 0.004 + 0.006 * sr());
sgeo.computeVertexNormals();
var sm = new THREE.Mesh(sgeo, new THREE.MeshStandardMaterial({ map: stx, roughness: 0.97, envMapIntensity: 0.15 })); sm.position.set(SD.x0 + SD.size / 2, 0, -(SD.y0 + SD.size / 2)); sm.receiveShadow = true; g.add(sm);
var wood = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.8 });
[[SD.x0 + SD.size / 2, SD.y0 - 0.06, SD.size + 0.24, 0.12], [SD.x0 + SD.size / 2, SD.y0 + SD.size + 0.06, SD.size + 0.24, 0.12], [SD.x0 - 0.06, SD.y0 + SD.size / 2, 0.12, SD.size], [SD.x0 + SD.size + 0.06, SD.y0 + SD.size / 2, 0.12, SD.size]].forEach(function (e) {
var b = new THREE.Mesh(new THREE.BoxGeometry(e[2], SD.top + 0.05, e[3]), wood); b.position.set(e[0], (SD.top + 0.05) / 2, -e[1]); b.castShadow = b.receiveShadow = true; g.add(b);
});
}
HM.water = null;
if (C.water) {
var WA = C.water;
var wgeo = new THREE.PlaneGeometry(WA.size, WA.size, 60, 60); wgeo.rotateX(-Math.PI / 2);
var wmat = new (THREE.MeshPhysicalMaterial || THREE.MeshStandardMaterial)({ color: 0x7fb2c8, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.42, envMapIntensity: 1.4, clearcoat: 1.0, clearcoatRoughness: 0.05, depthWrite: false });
var wm = new THREE.Mesh(wgeo, wmat); wm.position.set(WA.x0 + WA.size / 2, WA.depth, -(WA.y0 + WA.size / 2)); wm.renderOrder = 3; g.add(wm);
var bed = new THREE.Mesh(new THREE.PlaneGeometry(WA.size, WA.size), new THREE.MeshStandardMaterial({ color: 0x3e4c52, roughness: 0.9 })); bed.rotation.x = -Math.PI / 2; bed.position.set(WA.x0 + WA.size / 2, 0.002, -(WA.y0 + WA.size / 2)); bed.receiveShadow = true; g.add(bed);
var kerb = new THREE.MeshStandardMaterial({ color: 0x9a9a96, roughness: 0.8 });
[[WA.x0 + WA.size / 2, WA.y0 - 0.05, WA.size + 0.2, 0.1], [WA.x0 + WA.size / 2, WA.y0 + WA.size + 0.05, WA.size + 0.2, 0.1], [WA.x0 - 0.05, WA.y0 + WA.size / 2, 0.1, WA.size], [WA.x0 + WA.size + 0.05, WA.y0 + WA.size / 2, 0.1, WA.size]].forEach(function (e) {
var b = new THREE.Mesh(new THREE.BoxGeometry(e[2], WA.depth + 0.02, e[3]), kerb); b.position.set(e[0], (WA.depth + 0.02) / 2, -e[1]); b.castShadow = b.receiveShadow = true; g.add(b);
});
HM.water = { mesh: wm, geo: wgeo, base: Float32Array.from(wgeo.attributes.position.array), rings: [], C: WA };
}
if (C.circuit && HM.hall) HM.hall.position.z = -(C.circuit.y0 + C.circuit.y1) / 2;      // the hall over the circuit
if (C.area && HM.hall) HM.hall.position.z = -(C.area[2] + C.area[3]) / 2;
var label = function (txt, x, y) {
if (C.kind === 'warehouse') return;
var cv = document.createElement('canvas'); cv.width = 512; cv.height = 96; var c2 = cv.getContext('2d');
c2.fillStyle = 'rgba(240,242,245,0.88)'; c2.font = '700 54px Inter, Arial, sans-serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText(txt, 256, 52);
var tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
var m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.45), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
m.rotation.x = -Math.PI / 2; m.position.set(x, hmCourseH(x, y) + 0.006, -y); g.add(m);
};
if (C.sand) label('SAND  ' + Math.round(C.sand.top * 100) + ' cm', C.sand.x0 + C.sand.size / 2, C.sand.y0 - 0.5);
if (C.water) label('WATER  ' + Math.round(C.water.depth * 100) + ' cm', C.water.x0 + C.water.size / 2, C.water.y0 + C.water.size + 0.5);
(C.patches || []).forEach(function (pa) { var mx = Math.max.apply(null, pa.mm) / 10; if (pa.label) { label(pa.label, pa.x0 + pa.size / 2, pa.y0 - 0.45); return; } label(pa.kind === 'bumps' ? 'BUMPS  0–' + mx.toFixed(1) + ' cm' : 'BLOCKS  0–' + mx.toFixed(0) + ' cm', pa.x0 + pa.size / 2, pa.y0 - 0.45); });
if (rp) { var pct = Math.round(100 * rp.h / (rp.x[1] - rp.x[0]) * 10) / 10; label('SLOPE ' + pct + ' %', (rp.x[0] + rp.x[1]) / 2 - 1.6, -(rp.half + rp.bank + 0.5)); label('PLATEAU +' + rp.h.toFixed(1) + ' m', (rp.x[1] + rp.x[2]) / 2, -(rp.half - 0.6)); }
if (C.ice) label('ICE  μ ' + C.ice.mu.toFixed(2), C.ice.x0 - 1.4, C.ice.y0 + C.ice.size / 2);
if (C.tiles) label('MOVING TILES  ±' + Math.round(C.tiles.amp[1] * 100) + ' cm', C.tiles.x0 + C.tiles.cell * C.tiles.n + 0.6, C.tiles.y0 + C.tiles.cell * C.tiles.n / 2);
(C.stairs || []).forEach(function (st) {
var cm = Math.round(st.rise * 100), ln = 2 * (st.n - 1) * st.tread + st.landing;
if (st.name === 'yard') label('PRACTICE ' + cm + ' cm', st.x0 - 1.4 * st.dir, st.y);
else if (st.label) label(st.label, st.label_at ? st.label_at[0] : st.x0 + st.dir * ln / 2, st.label_at ? st.label_at[1] : st.y - st.width / 2 - 0.45);
else { label(st.n + ' STEPS × ' + cm + ' cm', st.x0 + st.dir * ln / 2, st.y - st.width / 2 - 0.45); }
});
(C.ramps || []).forEach(function (q) { if (q.label) label(q.label, (q.x0 + q.x1) / 2 - 1.9, (q.y0 + q.y1) / 2); });
if (C.kind === 'warehouse') hmWarehouse(g, C);
HM.root.add(g);
}
function hmLanePath(C) {
var g = HM.lane = new THREE.Group(), P = C.path, N = P.length, ds = C.circuit.length / N, T = hmTextures(); T.lane.wrapT = THREE.RepeatWrapping;
var lm = new THREE.MeshStandardMaterial({ map: T.lane, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
var hd = function (i) { var a = P[(i + N - 1) % N], b = P[(i + 1) % N]; return Math.atan2(b[1] - a[1], b[0] - a[0]); };
var pos = [], uv = [], idx = [], us = [0.8, 0, -0.8];
for (var i = 0; i <= N; i++) {
var k = i % N, h = hd(k), nx = -Math.sin(h), ny = Math.cos(h);
us.forEach(function (u, j) { var x = P[k][0] + nx * u, y = P[k][1] + ny * u; pos.push(x, hmCourseH(x, y) + 0.004, -y); uv.push(j / 2, i * ds / 4); });
if (i) for (var j = 0; j < 2; j++) {
var a = 3 * (i - 1) + j, b = a + 3, mx = (P[(i - 1) % N][0] + P[k][0]) / 2 + nx * (0.4 - 0.8 * j), my = (P[(i - 1) % N][1] + P[k][1]) / 2 + ny * (0.4 - 0.8 * j);
if (hmPatchAt(mx, my) || hmStairAt(mx, my) || hmTileAt(mx, my) >= 0 || hmIceAt(mx, my)) continue;
idx.push(a, a + 1, b, a + 1, b + 1, b);
}
}
var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
var lane = new THREE.Mesh(geo, lm); lane.receiveShadow = true; g.add(lane);
var st = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.6), new THREE.MeshBasicMaterial({ color: 0xffffff })); st.rotation.x = -Math.PI / 2; st.rotation.z = hd(0); st.position.set(P[0][0], hmCourseH(P[0][0], P[0][1]) + 0.006, -P[0][1]); g.add(st);
for (var m = 5; m < C.circuit.length - 2; m += 5) {
var k2 = Math.round(m / ds) % N, h2 = hd(k2), x2 = P[k2][0] + Math.sin(h2) * 1.3, y2 = P[k2][1] - Math.cos(h2) * 1.3;
if (hmPatchAt(x2, y2) || hmStairAt(x2, y2) || hmTileAt(x2, y2) >= 0 || hmIceAt(x2, y2)) continue;
var nm = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({ map: hmNumberTex(m + ' m'), transparent: true, depthWrite: false }));
nm.rotation.order = 'YXZ'; nm.rotation.y = h2; nm.rotation.x = -Math.PI / 2; nm.rotation.z = Math.PI / 2; nm.position.set(x2, hmCourseH(x2, y2) + 0.007, -y2); g.add(nm);
}
HM.root.add(g);
}
function hmLane(line) {
var C = HM.info && HM.info.course;
if (C && (C.kind === 'playground' || C.kind === 'warehouse')) {
if (HM.laneKey === 'play') return; HM.laneKey = 'play';
if (HM.lane) { HM.root.remove(HM.lane); HM.lane = null; }
return;
}
if (C && C.path) {
if (HM.laneKey === 'path|' + HM.courseKey) return; HM.laneKey = 'path|' + HM.courseKey;
if (HM.lane) { HM.root.remove(HM.lane); HM.lane.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map && o.material.map !== hmTextures().lane) o.material.map.dispose(); }); }
hmLanePath(C); return;
}
var key = (line ? line[0].toFixed(3) + '|' + line[1].toFixed(4) : 'none') + '|' + (HM.courseKey || ''); if (key === HM.laneKey) return; HM.laneKey = key;
if (HM.lane) { HM.root.remove(HM.lane); HM.lane.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map && o.material.map !== hmTextures().lane) o.material.map.dispose(); }); }
var g = HM.lane = new THREE.Group(), yaw = line ? line[1] : 0, off = line ? line[0] : 0, cy = Math.cos(yaw), sy = Math.sin(yaw);
var P = function (s, u) { return [s * cy - (off + u) * sy, s * sy + (off + u) * cy]; };
var T = hmTextures(); T.lane.wrapT = THREE.RepeatWrapping;
var lm = new THREE.MeshStandardMaterial({ map: T.lane, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
var pos = [], uv = [], idx = [], us = [0.8, 0, -0.8], s0 = -20, s1 = 220, ds = C ? 0.1 : 4;
for (var s = s0, k = 0; s <= s1 + 1e-6; s += ds, k++) {
us.forEach(function (u, i) { var p = P(s, u); pos.push(p[0], hmCourseH(p[0], p[1]) + 0.004, -p[1]); uv.push(i / 2, s / 4); });
if (k) for (var i = 0; i < 2; i++) {
var a = 3 * (k - 1) + i, b = a + 3, pm = P(s - ds / 2, 0.8 - 0.8 * i - 0.4);
if (hmPatchAt(pm[0], pm[1])) continue;
idx.push(a, a + 1, b, a + 1, b + 1, b);
}
}
var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
var lane = new THREE.Mesh(geo, lm); lane.receiveShadow = true; g.add(lane);
var st = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.6), new THREE.MeshBasicMaterial({ color: 0xffffff })); st.rotation.x = -Math.PI / 2; st.rotation.z = yaw; var p0 = P(0, 0); st.position.set(p0[0], hmCourseH(p0[0], p0[1]) + 0.006, -p0[1]); g.add(st);
for (var m = 5; m <= 200; m += 5) {
var lu = C ? 2.35 : 1.25, pp = P(m, lu);
var nm = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({ map: hmNumberTex(m + ' m'), transparent: true, depthWrite: false }));
nm.rotation.order = 'YXZ'; nm.rotation.y = yaw; nm.rotation.x = -Math.PI / 2; nm.rotation.z = Math.PI / 2; nm.position.set(pp[0], hmCourseH(pp[0], pp[1]) + 0.007, -pp[1]); g.add(nm);
}
HM.root.add(g);
}
var HROW = [], HQ = new Array(7 + 64).fill(0), HM_FIXED = /^humanoid:/.test(String(P.camera || '')) ? String(P.camera).slice(9).trim() : '';
var HM_TEL = HM_FIXED === 'telemetry';
function hmEyes(c) { return c === 'eyes' || c === 'depth'; }
var HM_DELAY = 1.2;
function hmLiveDelay(E) {
var A = E.arr || []; if (A.length < 3) return E.delay || HM_DELAY;
var lag = 0, gap = 0;
for (var i = 0; i < A.length; i++) { lag = Math.max(lag, A[i][1]); if (i) gap = Math.max(gap, A[i][0] - A[i - 1][0]); }
var want = Math.max(0.2, Math.min(2.5, lag + gap + 0.08));
E.delay = E.delay == null ? want : E.delay + (want - E.delay) * (want > E.delay ? 0.5 : 0.02);
return E.delay;
}
function hmStep(dt) {
if (!HM.root) hmWorld();
if (!HM.K) { ctx.status('Waiting for the robot…'); if (HM_TEL) hmTel(null); return; }
if (HM.courseDirty) { HM.courseDirty = false; if (!HM_TEL) hmCourse(); HM.laneKey = ''; }
if (HM.modelDirty) hmAttach();
var E = hmPick(), d = CAP.offline ? 1 / 30 : dt;
if (E !== HM.cur) { HM.cur = E; HM.ct = null; HM.shot = null; HM.prints.forEach(function (p) { HM.root.remove(p.m); }); HM.prints = []; HM.lastC = null; HM.down = null; ctx.status(''); }
if (!E) { if (HM_TEL) hmTel(null); else hmIdle(d); return; }
var F = E.frames;
if (E.kind === 'training') {
if (HM.ct == null) HM.ct = F[0][0];
if (playing) HM.ct += d * speed;
if (HM.ct > F[F.length - 1][0] + 2.0) { var nx = hmPick(); if (nx !== E) { HM.cur = null; return; } HM.ct = F[0][0]; HM.shot = null; }
} else {
var want = Date.now() / 1000 - E.t0 - hmLiveDelay(E), newest = F[F.length - 1][0];
if (HM.ct == null || Math.abs(want - HM.ct) > 1.5) HM.ct = Math.min(want, newest);
else HM.ct += d * Math.min(1.15, Math.max(0.85, 1 + 0.4 * (want - HM.ct)));
HM.ct = Math.min(Math.max(HM.ct, F[0][0]), newest);
}
if (HM.hold != null) HM.ct = Math.min(F[F.length - 1][0], F[0][0] + HM.hold);
if (HM_TEL) { hmTel(E); return; }
hmLerp(F, HM.ct, HROW);
hmTiles(E, HROW);
hmQpos(HROW, HQ);
if (HM.bind) hmPose(HM.bind, HQ);
else hmFK(HQ);
hmLane(E.line);
hmFx(E, HROW, d);
hmPushFx(d);
hmCamera(E, HROW, d);
hmHud(E, HROW);
hmPatrolTick(E, HROW, d);
hmAud(E, HROW);
}
function hmIdle(d) {
if (HM.cam !== 'director') return;
var t = performance.now() / 1000 * 0.05; camera.position.set(6 * Math.cos(t), 2.2, 6 * Math.sin(t)); camera.lookAt(0, 0.8, 0);
}
function hmFx(E, r, d) {
var F = HM.F, K = HM.K, pel = K[HM.byName.pelvis];
var p = HW(pel.wp.x, pel.wp.y, pel.wp.z);
var kc = p, WHc = hmWH();
if (WHc) kc = HM.whKc || (HM.whKc = new THREE.Vector3((WHc.hall.x0 + WHc.hall.x1) / 2, 0, -(WHc.hall.y0 + WHc.hall.y1) / 2));
sun.position.copy(kc).add(HM.keyOff); sun.target.position.copy(kc); sun.target.updateMatrixWorld();
if (HM.rim) { HM.rim.position.copy(p).add(new THREE.Vector3(-5, 4, -6)); HM.rim.target.position.copy(p); HM.rim.target.updateMatrixWorld(); }
var CF = hmCF(), LF = hmLF(), c = CF.map(function (k_) { return r[F[k_]]; }), feet = (HM.info && HM.info.feet) || [{ body: 'left_ankle_roll_link', sole: 0.037, ahead: 0.04, size: [0.18, 0.06] }, { body: 'right_ankle_roll_link', sole: 0.037, ahead: 0.04, size: [0.18, 0.06] }];
var noPrints = !!hmWH();
if (HM.lastC && HM.lastC.length === c.length) for (var s = 0; s < c.length; s++) if (c[s] > 0.5 && HM.lastC[s] < 0.5) {
var ft = feet[s], fb = K[HM.byName[ft.body]]; if (!fb) continue;
var yaw = Math.atan2(2 * (fb.wq.w * fb.wq.z + fb.wq.x * fb.wq.y), 1 - 2 * (fb.wq.y * fb.wq.y + fb.wq.z * fb.wq.z));
var pk = ft.size.join('x') + (ft.round ? 'o' : ''); if (HM.printK !== pk) { HM.printK = pk; HM.printG = ft.round ? new THREE.CircleGeometry(ft.size[0] / 2 + 0.05, 20) : new THREE.PlaneGeometry(ft.size[0] + 0.08, ft.size[1] + 0.05); }
var px = fb.wp.x + (ft.ahead - 0.005) * Math.cos(yaw), py = fb.wp.y + (ft.ahead - 0.005) * Math.sin(yaw), CC = HM.info.course || {};
if (hmInSq(CC.water, px, py)) { hmRipple(px, py, 1); if (AUD.ctx) hmSplash(r[F[LF[s]]]); continue; }
if (noPrints) { if (AUD.ctx) hmThump(r[F[LF[s]]] * (c.length > 2 ? 0.6 : 1)); continue; }
var sandy = hmInSq(CC.sand, px, py), m = new THREE.Mesh(HM.printG, HM.printM.clone());
if (sandy) { m.material = new THREE.MeshBasicMaterial({ color: 0x6b5232, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }); }
var pz = Math.max(hmCourseH(px, py), fb.wp.z - ft.sole) + 0.003;
m.rotation.x = -Math.PI / 2; m.rotation.z = yaw; m.position.copy(HW(px, py, pz)); m.renderOrder = 2; HM.root.add(m);
HM.prints.push({ m: m, t: 0, life: sandy ? 30 : 8 }); if (HM.prints.length > 60) { var o = HM.prints.shift(); HM.root.remove(o.m); o.m.material.dispose(); }
if (AUD.ctx) hmThump(r[F[LF[s]]] * (sandy ? 0.5 : 1) * (c.length > 2 ? 0.6 : 1));
}
HM.lastC = c.slice();
var hz = r[F.z] - (F.h != null && isFinite(r[F.h]) ? r[F.h] : hmCourseH(r[F.x], r[F.y])), upz = 1 - 2 * (r[F.qx] * r[F.qx] + r[F.qy] * r[F.qy]);
var hk = ((HM.info && HM.info.h0) || 0.755) / 0.755, down = hz < 0.45 * hk || upz < 0.5, up = hz > 0.62 * hk && upz > 0.85;   // (heights for the G1, scaled to this robot)
if (down && HM.down === false) hmCrash(Math.min(1.5, Math.hypot(r[F.vx] || 0, r[F.vy] || 0) + 0.6));
if (down) HM.down = true; else if (up || HM.down == null) HM.down = false;
hmScanDots(pel);
HM.prints.forEach(function (q) { q.t += d; q.m.material.opacity = Math.max(0, (q.life > 8 ? 0.55 : 0.9) - q.t / (q.life || 8)); });
hmWater(d, K);
var sens = HM.sensOn !== false && !HM_FIXED && !hmEyes(HM.cam), gp = hmCourseH(pel.wp.x, pel.wp.y), yawp = Math.atan2(2 * (pel.wq.w * pel.wq.z + pel.wq.x * pel.wq.y), 1 - 2 * (pel.wq.y * pel.wq.y + pel.wq.z * pel.wq.z));
[[HM.arCmd, r[F.cvx], r[F.cvy]], [HM.arAct, r[F.vx], r[F.vy]]].forEach(function (a, i) {
var vx = a[1], vy = a[2], len = Math.hypot(vx, vy);
a[0].visible = sens && len > 0.05;
if (!a[0].visible) return;
a[0].position.copy(HW(pel.wp.x, pel.wp.y, gp + 0.01 + 0.004 * i)); a[0].rotation.y = yawp + Math.atan2(vy, vx); a[0].scale.set(Math.min(2.5, len * 1.6), 1, 1);
});
}
var HMC1 = new THREE.Color(), HMM4 = new THREE.Matrix4();
function hmScanDots(pel) {
var S = HM.info && HM.info.scan, on = S && HM.sensOn !== false && !HM_FIXED && !hmEyes(HM.cam) && !hmWH();
if (!S) { if (HM.dots) HM.dots.visible = false; return; }
var n = S.x.length * S.y.length;
if (!HM.dots || HM.dots.count !== n) {
if (HM.dots) HM.root.remove(HM.dots);
var gd = new THREE.CircleGeometry(0.022, 10); gd.rotateX(-Math.PI / 2);
HM.dots = new THREE.InstancedMesh(gd, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }), n); HM.dots.renderOrder = 8; HM.dots.frustumCulled = false;
HM.root.add(HM.dots);
}
HM.dots.visible = !!on; if (!on) return;
var yaw = Math.atan2(2 * (pel.wq.w * pel.wq.z + pel.wq.x * pel.wq.y), 1 - 2 * (pel.wq.y * pel.wq.y + pel.wq.z * pel.wq.z)), c = Math.cos(yaw), s = Math.sin(yaw), g0 = hmCourseH(pel.wp.x, pel.wp.y), k = 0;
for (var i = 0; i < S.x.length; i++) for (var j = 0; j < S.y.length; j++) {
var x = pel.wp.x + c * S.x[i] - s * S.y[j], y = pel.wp.y + s * S.x[i] + c * S.y[j], h = hmCourseH(x, y), dh = h - g0;
HMM4.makeTranslation(x, h + 0.008, -y); HM.dots.setMatrixAt(k, HMM4);
HM.dots.setColorAt(k, dh > 0.03 ? HMC1.setRGB(1.0, 0.62, 0.2) : dh < -0.03 ? HMC1.setRGB(0.25, 0.45, 1.0) : HMC1.setRGB(0.3, 0.95, 0.95)); k++;
}
HM.dots.instanceMatrix.needsUpdate = true; if (HM.dots.instanceColor) HM.dots.instanceColor.needsUpdate = true;
}
var HMF = { drag: null, keys: {} }, HMF_V = new THREE.Vector3();
function hmFlyOn() { return mode === 'humanoid' && HM.cam === 'free' && !HM_FIXED && !HM.pushTool; }
function hmFlyAngles() { camera.getWorldDirection(HMF_V); HMF.yaw = Math.atan2(-HMF_V.x, -HMF_V.z); HMF.pitch = Math.asin(Math.max(-1, Math.min(1, HMF_V.y))); }
function hmFlyApply(fwd, side, up, dyaw, dpitch) {
HMF.yaw += dyaw; HMF.pitch = Math.max(-1.45, Math.min(1.45, HMF.pitch + dpitch));
var sy = Math.sin(HMF.yaw), cy = Math.cos(HMF.yaw);
camera.position.x += -sy * fwd + cy * side; camera.position.z += -cy * fwd - sy * side; camera.position.y = Math.max(0.15, camera.position.y + up);
camera.rotation.set(HMF.pitch, HMF.yaw, 0, 'YXZ'); camera.updateMatrixWorld();
controls.target.copy(camera.position).add(camera.getWorldDirection(HMF_V).multiplyScalar(4));
keepView(true);
}
renderer.domElement.addEventListener('pointerdown', function (ev) {
if (!hmFlyOn()) return;
hmFlyAngles(); HMF.drag = { x: ev.clientX, y: ev.clientY, look: ev.button === 2 || ev.shiftKey };
try { renderer.domElement.setPointerCapture(ev.pointerId); } catch (e) { }
});
renderer.domElement.addEventListener('pointermove', function (ev) {
var D = HMF.drag; if (!D || !hmFlyOn()) return;
var dx = ev.clientX - D.x, dy = ev.clientY - D.y; D.x = ev.clientX; D.y = ev.clientY;
var k = Math.max(0.6, Math.min(4, camera.position.y)) * 0.012;
if (D.look) hmFlyApply(0, dx * k, 0, 0, -dy * 0.004); else hmFlyApply(-dy * k * 1.6, 0, 0, -dx * 0.0045, 0);
});
var hmFlyEnd = function () { HMF.drag = null; };
renderer.domElement.addEventListener('pointerup', hmFlyEnd); renderer.domElement.addEventListener('pointercancel', hmFlyEnd);
renderer.domElement.addEventListener('contextmenu', function (ev) { if (hmFlyOn()) ev.preventDefault(); });
renderer.domElement.addEventListener('wheel', function (ev) { if (!hmFlyOn()) return; ev.preventDefault(); hmFlyAngles(); hmFlyApply(-ev.deltaY * 0.006 * Math.max(0.6, Math.min(4, camera.position.y)), 0, 0, 0, 0); }, { passive: false });
window.addEventListener('keydown', function (ev) { if (!hmFlyOn() || /input|select|textarea/i.test((ev.target && ev.target.tagName) || '')) return; var k = ev.key.toLowerCase(); if ('wasdqe'.indexOf(k) >= 0 || /^arrow/.test(k)) { HMF.keys[k] = true; ev.preventDefault(); } });
window.addEventListener('keyup', function (ev) { HMF.keys[ev.key.toLowerCase()] = false; });
window.addEventListener('blur', function () { HMF.keys = {}; });
function hmFlyTick(d) {
var K = HMF.keys, f = (K.w || K.arrowup ? 1 : 0) - (K.s || K.arrowdown ? 1 : 0), t = (K.a || K.arrowleft ? 1 : 0) - (K.d || K.arrowright ? 1 : 0), u = (K.e ? 1 : 0) - (K.q ? 1 : 0);
if (!f && !t && !u) return;
hmFlyAngles(); hmFlyApply(f * 3.0 * d, 0, u * 1.5 * d, t * 1.3 * d, 0);
}
function hmSetCam(c) {
HM.cam = c; if (hmCamSel.value !== c) hmCamSel.value = c; HM.shot = null; HM.camOn = false; controls.enabled = c === 'orbit';
if (!hmEyes(c)) { camera.up.set(0, 1, 0); camera.fov = 42; camera.updateProjectionMatrix(); }
hmEyeLbl.style.display = hmEyes(c) && !HM_TEL ? '' : 'none'; hmEyeLbl.innerHTML = (c === 'depth' ? HM_EYE_DEPTH : HM_EYE_COLOUR).replace('RealSense D435i', ((HM.info && HM.info.camera && HM.info.camera.name) || 'RealSense D435i').replace(/^(Intel |a )/, '').replace(/ in the head$/, '')); if (c === 'orbit' && HM.K) { var pel = HM.K[HM.byName.pelvis]; controls.target.copy(HW(pel.wp.x, pel.wp.y, pel.wp.z)); HM.orbitLast = controls.target.clone(); } }
function hmNearStairs(x, y, R) { for (var a = 0; a < 8; a++) for (var q = 0.5; q <= R; q += 1) if (hmStairAt(x + q * Math.cos(a * Math.PI / 4), y + q * Math.sin(a * Math.PI / 4))) return true; return false; }
function hmCamera(E, r, d) {
var K = HM.K, pel = K[HM.byName.pelvis], c = HM_FIXED || HM.cam;
var p = HW(pel.wp.x, pel.wp.y, Math.max(0.35, pel.wp.z)), yaw = Math.atan2(2 * (pel.wq.w * pel.wq.z + pel.wq.x * pel.wq.y), 1 - 2 * (pel.wq.y * pel.wq.y + pel.wq.z * pel.wq.z));
var pa = E.line ? null : (E.path != null ? hmPathAt(pel.wp.x, pel.wp.y) : null);
var hd = E.line ? E.line[1] : pa ? pa.hd + (E.path < 0 ? Math.PI : 0) : yaw;
var play = HM.info && HM.info.course && HM.info.course.kind === 'playground';
HM.hd = HM.hd == null ? hd : HM.hd + Math.atan2(Math.sin(hd - HM.hd), Math.cos(hd - HM.hd)) * (1 - Math.exp(-d * (play ? 3.0 : 1.5)));
var fw = HW(Math.cos(HM.hd), Math.sin(HM.hd), 0), lf = HW(-Math.sin(HM.hd), Math.cos(HM.hd), 0);
HM.look = HM.look && HM.look.distanceTo(p) < 5 ? HM.look.lerp(p, 1 - Math.exp(-d * 4)) : p.clone();
var gnd = hmCourseH(pel.wp.x, pel.wp.y); HM.gnd = HM.gnd == null ? gnd : HM.gnd + (gnd - HM.gnd) * (1 - Math.exp(-d * 2));
if (hmEyes(c)) { hmEyeCam(); return; }
if (c === 'free') { hmFlyTick(d); return; }
if (c === 'orbit') { if (HM.orbitLast) { var dv = HM.look.clone().sub(HM.orbitLast); camera.position.add(dv); controls.target.add(dv); } HM.orbitLast = HM.look.clone(); controls.update(); return; }
var shot = c;
if (c === 'director' && play) shot = 'follow';
else if (c === 'director') {
var S = HM.shot, now = performance.now() / 1000;
if (!S || now > S.until) {
var seq = hmWH() ? ['follow', 'front', 'high', 'follow', 'side', 'front', 'high'] : ['side', 'front', 'follow', 'low', 'side', 'crane', 'front'], k = S ? (S.i + 1) % seq.length : 0;
S = HM.shot = { i: k, kind: seq[k], until: now + (seq[k] === 'crane' ? 7 : 6), from: now, sd: Math.random() < 0.5 ? 1 : -1 };
S.cut = true;
}
shot = S.kind;
if (shot === 'low' && hmNearStairs(pel.wp.x, pel.wp.y, 3.5)) shot = 'side';
}
var S2 = HM.shot || {}, sd = S2.sd || 1, want = new THREE.Vector3(), aim = HM.look.clone(), G = HM.gnd || 0, z = Math.sqrt(((HM.info && HM.info.h0) || 0.755) / 0.755), zh = z * z;   // (shots made for the G1: a taller robot, a little further and higher)
if (shot === 'side') { want.copy(HM.look).addScaledVector(lf, 3.6 * sd * z).addScaledVector(fw, 0.4); want.y = G + 1.05 * zh; aim.y = G + 0.75 * zh; }
else if (shot === 'front') { want.copy(HM.look).addScaledVector(fw, 3.4 * z).addScaledVector(lf, 0.5 * sd); want.y = G + 1.2 * zh; aim.y = G + 0.8 * zh; }
else if (shot === 'follow') { want.copy(HM.look).addScaledVector(fw, -3.2 * z).addScaledVector(lf, 0.6 * sd); want.y = G + 1.55 * zh; aim.addScaledVector(fw, 1.2); aim.y = G + 0.7 * zh; }
else if (shot === 'low') { want.copy(HM.look).addScaledVector(fw, 2.2 * z).addScaledVector(lf, 1.6 * sd * z); want.y = Math.max(G, hmCourseH(want.x, -want.z)) + 0.22; aim.y = G + 0.9 * zh; }
else if (shot === 'crane') { var a = (performance.now() / 1000 - (S2.from || 0)) * 0.12 * sd; want.copy(HM.look).addScaledVector(fw, 4.5 * z * Math.cos(a + 0.6)).addScaledVector(lf, 4.5 * z * Math.sin(a + 0.6)); want.y = G + 3.2 * zh; aim.y = G + 0.6 * zh; }
else if (shot === 'high') { want.copy(HM.look).addScaledVector(fw, -4.6).addScaledVector(lf, 0.8 * sd); want.y = G + 3.4; aim.addScaledVector(fw, 1.5); aim.y = G + 0.3; }
if (hmWH()) want = hmWhFree(HM.look, want);
if (S2.cut || !HM.camOn || camera.position.distanceTo(want) > 12) { camera.position.copy(want); S2.cut = false; HM.camOn = true; }
else camera.position.lerp(want, 1 - Math.exp(-d * 3));
camera.lookAt(aim);
}
function hmHud(E, r) {
var now = performance.now(); if (HM.hudAt && now - HM.hudAt < 150 && !CAP.rec && !CAP.offline) return; HM.hudAt = now;
var F = HM.F, K = HM.K, pel = K[HM.byName.pelvis], line = E.line || [0, 0];
var off = -pel.wp.x * Math.sin(line[1]) + pel.wp.y * Math.cos(line[1]) - line[0];
if (!E.line && E.path != null) { var pa = hmPathAt(pel.wp.x, pel.wp.y); if (pa) off = pa.off * (E.path < 0 ? -1 : 1); }
var bar = function (v) { var n = Math.max(0, Math.min(10, Math.round(v * 5))); return '<span style="color:#7ee08a">' + '▮'.repeat(n) + '</span><span style="opacity:.25">' + '▮'.repeat(10 - n) + '</span>'; };
var rows = [['speed', r[F.vx].toFixed(2) + ' m/s <span style="opacity:.6">(asked ' + r[F.cvx].toFixed(2) + ')</span>'],
['turn', (r[F.wz] * 57.3).toFixed(0) + ' °/s <span style="opacity:.6">(asked ' + (r[F.cwz] * 57.3).toFixed(0) + ')</span>'],
HM.info.course && HM.info.course.kind === 'playground' ? ['driven', hmDriveText(E)] : ['off the line', (off * 100).toFixed(0) + ' cm'], ['pelvis height', (pel.wp.z - hmCourseH(pel.wp.x, pel.wp.y)).toFixed(2) + ' m'],
].concat(hmQuad() ? ['front left', 'front right', 'hind left', 'hind right'].map(function (nm, k_) { return [nm, (r[F['c' + k_]] > 0.5 ? 'down ' : 'up ') + bar(2 * r[F['f' + k_]])]; })
: [['left foot', (r[F.cl] > 0.5 ? 'down ' : 'up ') + bar(r[F.fl])], ['right foot', (r[F.cr] > 0.5 ? 'down ' : 'up ') + bar(r[F.fr])]]);
if (hmQuad()) rows[3][0] = 'body height';
if (hmWH()) rows.splice(2, 1);
if (HM.info && HM.info.course) rows.splice(3, 0, ['walking on', hmZone(pel.wp.x, pel.wp.y) + (hmCourseH(pel.wp.x, pel.wp.y) > 0.005 ? ' <span style="opacity:.6">(+' + (hmCourseH(pel.wp.x, pel.wp.y) * 100).toFixed(0) + ' cm)</span>' : '')]);
rows.push([E.kind === 'live' ? 'walking' : 'episode', (E.kind === 'live' ? HM.ct : HM.ct - E.frames[0][0]).toFixed(1) + ' s']);
hudRows.innerHTML = rows.map(function (x) { return '<span style="opacity:.65">' + x[0] + '</span><span>' + x[1] + '</span>'; }).join('');
var rn = (HM.info && HM.info.name) || 'Unitree G1'; hudTitle.textContent = E.kind === 'live' ? rn + ' · walking (live)' : rn + (/^Try \d/.test(String((E.meta && E.meta.label) || '')) ? ' · learning to stand up' : ' · learning to walk');
var hudEl = ui.querySelector('.hud'), sens = HM.sensOn !== false && !HM_FIXED; if (hudEl) hudEl.style.visibility = sens ? '' : 'hidden';
var cap = E.kind === 'training' ? (E.meta.label || '') : '';
if (cap && !HM_FIXED) { if (vgCap.textContent !== cap) vgCap.textContent = cap; vgCap.style.display = ''; } else vgCap.style.display = 'none';
}
function hmThump(load) {
var A_ = AUD.ctx, N = AUD.nodes; if (!A_ || !N || !AUD.on || CAP.offline || mode !== 'humanoid') return;
var t = A_.currentTime, s = A_.createBufferSource(); s.buffer = N.brown; var f = A_.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180 + 120 * Math.random();
var g = A_.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35 * Math.min(1.5, 0.4 + load), t + 0.008); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
s.connect(f); f.connect(g); g.connect(N.master); s.start(t, Math.random()); s.stop(t + 0.25);
}
function hmDriveText(E) {
var v = HM.myDrive ? [HM.myDrive.x, HM.myDrive.y, HM.myDrive.turn] : E && E.drive; if (!v || (!v[0] && !v[1] && !v[2])) return 'standing';
var w = [];
if (v[0]) w.push(v[0] > 0 ? 'forward' : 'back'); if (v[1]) w.push(v[1] > 0 ? 'stepping left' : 'stepping right'); if (v[2]) w.push(v[2] > 0 ? 'turning left' : 'turning right');
return w.join(', ');
}
function hmRipple(x, y, k) {
var W = HM.water; if (!W) return;
var g = HM.rippleG || (HM.rippleG = new THREE.RingGeometry(0.92, 1.0, 48));
var m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 * k, depthWrite: false }));
m.rotation.x = -Math.PI / 2; m.position.copy(HW(x, y, W.C.depth + 0.004)); m.scale.setScalar(0.05); m.renderOrder = 4; HM.root.add(m);
W.rings.push({ m: m, t: 0, k: k }); if (W.rings.length > 40) { var o = W.rings.shift(); HM.root.remove(o.m); o.m.material.dispose(); }
}
function hmWater(d, K) {
var W = HM.water; if (!W) return;
var t = performance.now() / 1000, P = W.geo.attributes.position, B = W.base;
for (var i = 0; i < P.count; i++) { var x = B[3 * i], z = B[3 * i + 2]; P.setY(i, 0.0025 * Math.sin(1.7 * x + 1.1 * t) + 0.0018 * Math.sin(2.3 * z - 1.4 * t)); }
P.needsUpdate = true; W.geo.computeVertexNormals();
W.rings.forEach(function (q) { q.t += d; q.m.scale.setScalar(0.05 + 0.45 * q.t); q.m.material.opacity = Math.max(0, 0.3 * q.k * (1 - q.t / 1.6)); });
W.rings = W.rings.filter(function (q) { if (q.t < 1.6) return true; HM.root.remove(q.m); q.m.material.dispose(); return false; });
var feet = (HM.info && HM.info.feet) || [];
W.wk = (W.wk || 0) + d; if (W.wk < 0.12) return; W.wk = 0;
feet.forEach(function (ft, s) {
var fb = K[HM.byName[ft.body]]; if (!fb || !hmInSq(W.C, fb.wp.x, fb.wp.y) || fb.wp.z > W.C.depth + 0.08) return;
var L = W.last || (W.last = []), pr = L[s]; L[s] = [fb.wp.x, fb.wp.y];
if (pr && Math.hypot(fb.wp.x - pr[0], fb.wp.y - pr[1]) > 0.04) hmRipple(fb.wp.x, fb.wp.y, 0.45);
});
}
function hmSplash(load) {
var A_ = AUD.ctx, N = AUD.nodes; if (!A_ || !N || !AUD.on || CAP.offline || mode !== 'humanoid') return;
var t = A_.currentTime, s = A_.createBufferSource(); s.buffer = N.white; var f = A_.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700 + 500 * Math.random(); f.Q.value = 0.8;
var g = A_.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12 * Math.min(1.5, 0.4 + load), t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
s.connect(f); f.connect(g); g.connect(N.master); s.start(t, Math.random()); s.stop(t + 0.4);
}
function hmCrash(k) {
var A_ = AUD.ctx, N = AUD.nodes; if (!A_ || !N || !AUD.on || CAP.offline || mode !== 'humanoid') return;
var t = A_.currentTime, s = A_.createBufferSource(); s.buffer = N.brown; var f = A_.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180 + 120 * Math.random();
var g = A_.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35 * 3.2 * Math.min(1.3, Math.max(0.8, k)), t + 0.008); g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
s.connect(f); f.connect(g); g.connect(N.master); s.start(t, Math.random()); s.stop(t + 0.32);
}
function hmAud(E, r) {
var A_ = AUD.ctx, N = AUD.nodes; if (!A_ || !N) return;
if (!HM.aud) {
var o = A_.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 180; var bp = A_.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 3;
var g = A_.createGain(); g.gain.value = 0; o.connect(bp); bp.connect(g); g.connect(N.master); o.start();
HM.aud = { o: o, bp: bp, g: g, jq: null };
}
var V = HM.aud, t = A_.currentTime, on = AUD.on && mode === 'humanoid' && !document.hidden && !CAP.offline, F = HM.F, sp = 0;
N.master.gain.setTargetAtTime(AUD.on ? 0.9 : 0, t, 0.05);
var jq = [], nj = hmNJ(); for (var j = 0; j < nj; j++) jq.push(r[F['j' + j]]);
if (V.jq && V.jq.length === nj) for (var k = 0; k < nj; k++) sp += Math.abs(jq[k] - V.jq[k]); V.jq = jq;
var near = 1 / Math.pow(1 + camera.position.distanceTo(HM.look || camera.position) / 3, 1.2), w = Math.min(1, sp * 4);
V.o.frequency.setTargetAtTime(140 + 160 * w, t, 0.08); V.bp.frequency.setTargetAtTime(500 + 500 * w, t, 0.08);
V.g.gain.setTargetAtTime(on ? 0.004 * w * near : 0, t, 0.08);
}
function hmAudOff() { if (HM.aud && AUD.ctx) HM.aud.g.gain.setTargetAtTime(0, AUD.ctx.currentTime, 0.05); }
var HM_EYE_COLOUR = '<b>Head camera</b> · RealSense D435i · colour';
var HM_EYE_DEPTH = '<b>Depth camera</b> · RealSense D435i<div style="margin-top:5px;display:flex;align-items:center;gap:6px;font-size:10.5px"><span>0.2 m</span><span style="width:120px;height:8px;border-radius:2px;background:linear-gradient(90deg,#7a0403,#f05b12,#e1dd37,#46f884,#1ae4b6,#3e9bfe,#4040a0,#30123b)"></span><span>5 m</span></div>';
var hmEyeLbl = document.createElement('div');
hmEyeLbl.style.cssText = 'position:absolute;left:12px;bottom:58px;background:rgba(10,14,22,.62);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:6px 9px;font:11.5px Inter,-apple-system,Segoe UI,sans-serif;color:#e8ecf2;pointer-events:none;display:none';
ui.appendChild(hmEyeLbl);
var HMQ3 = new THREE.Quaternion(), HMV2 = new THREE.Vector3(), HMV3 = new THREE.Vector3();
function hmEyeCam() {
var I = HM.info || {}, cam = I.camera || { body: 'torso_link', pos: [0.0576, 0.0175, 0.4299], pitch: 0.8308, fov_h: 69 };
var tb = HM.K[HM.byName[cam.body]] || HM.K[HM.byName.pelvis];
HMQ3.setFromAxisAngle(HMV2.set(0, 1, 0), cam.pitch).premultiply(tb.wq);
var p = HMV2.fromArray(cam.pos).applyQuaternion(tb.wq).add(tb.wp);
var f = new THREE.Vector3(1, 0, 0).applyQuaternion(HMQ3), u = new THREE.Vector3(0, 0, 1).applyQuaternion(HMQ3);
camera.position.copy(HW(p.x + 0.012 * f.x, p.y + 0.012 * f.y, p.z + 0.012 * f.z));
camera.up.copy(HW(u.x, u.y, u.z)); camera.lookAt(HMV3.copy(camera.position).add(HW(f.x, f.y, f.z)));
var asp = Math.max(0.2, el.clientWidth / Math.max(1, el.clientHeight)), vf = 2 * Math.atan(Math.tan(cam.fov_h * Math.PI / 360) / asp) * 180 / Math.PI;
if (Math.abs(camera.fov - vf) > 0.05) { camera.fov = vf; camera.updateProjectionMatrix(); }
}
function hmDepthMat() {
if (HM.depthMat) return HM.depthMat;
HM.depthMat = new THREE.ShaderMaterial({
vertexShader: '#include <common>\n#include <skinning_pars_vertex>\nvarying float vD;\nvoid main() {\n#include <skinbase_vertex>\n#include <begin_vertex>\n#include <skinning_vertex>\n#include <project_vertex>\n  vD = -mvPosition.z;\n}',
fragmentShader: 'varying float vD;\nvec3 turbo(float x) { const vec4 kR = vec4(0.13572138, 4.61539260, -42.66032258, 132.13108234); const vec2 kR2 = vec2(-152.94239396, 59.28637943);\n'
+ ' const vec4 kG = vec4(0.09140261, 2.19418839, 4.84296658, -14.18503333); const vec2 kG2 = vec2(4.27729857, 2.82956604);\n'
+ ' const vec4 kB = vec4(0.10667330, 12.64194608, -60.58204836, 110.36276771); const vec2 kB2 = vec2(-89.90310912, 27.34824973);\n'
+ ' x = clamp(x, 0.0, 1.0); vec4 v4 = vec4(1.0, x, x * x, x * x * x); vec2 v2 = v4.zw * v4.z;\n'
+ ' return vec3(dot(v4, kR) + dot(v2, kR2), dot(v4, kG) + dot(v2, kG2), dot(v4, kB) + dot(v2, kB2)); }\n'
+ 'void main() { if (vD > 10.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; } float t = clamp((vD - 0.2) / 4.8, 0.0, 1.0); gl_FragColor = vec4(pow(turbo(1.0 - t), vec3(2.2)), 1.0); }',
side: THREE.DoubleSide
});
return HM.depthMat;
}
function hmDepthRender() {
var bg = scene.background, fog = scene.fog, hidden = [];
scene.background = HM.black || (HM.black = new THREE.Color(0, 0, 0)); scene.fog = null; scene.overrideMaterial = hmDepthMat();
scene.traverse(function (o) { if (o.visible && (o.isSprite || (o.material && !Array.isArray(o.material) && o.material.transparent))) { o.visible = false; hidden.push(o); } });
renderer.render(scene, camera);
scene.overrideMaterial = null; scene.background = bg; scene.fog = fog; hidden.forEach(function (o) { o.visible = true; });
}
var hmTelC = document.createElement('canvas');
hmTelC.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;background:#0b0f16;display:none;z-index:50';
function hmTelSeries(E) {
var F = E.frames, n = F.length, I = HM.F, D = 180 / Math.PI;
if (E._tel && E._tel.n === n && E._tel.f0 === F[0][0]) return E._tel;
var keys = ['t', 'cvx', 'vx', 'cwz', 'wz', 'hp', 'hg', 'roll', 'pitch', 'gx', 'gy', 'gz', 'ax', 'ay', 'az', 'fl', 'fr', 'cl', 'cr'], S = { n: n, f0: F[0][0], J: [], Q: [] };
keys.forEach(function (k) { S[k] = new Float32Array(n); });
var nj = hmNJ(); for (var j = 0; j < nj; j++) { S.J.push(new Float32Array(n)); S.Q.push(new Float32Array(n)); }
var has = function (k) { return I[k] != null; };
for (var i = 0; i < n; i++) {
var f = F[i], qw = f[I.qw], qx = f[I.qx], qy = f[I.qy], qz = f[I.qz];
S.t[i] = f[0]; S.cvx[i] = f[I.cvx]; S.vx[i] = f[I.vx]; S.cwz[i] = f[I.cwz] * D; S.wz[i] = f[I.wz] * D;
var gh = has('h') ? f[I.h] : hmCourseH(f[I.x], f[I.y]); S.hg[i] = gh; S.hp[i] = f[I.z] - gh;
S.roll[i] = Math.atan2(2 * (qw * qx + qy * qz), 1 - 2 * (qx * qx + qy * qy)) * D; S.pitch[i] = Math.asin(Math.max(-1, Math.min(1, 2 * (qw * qy - qz * qx)))) * D;
for (var a = 0; a < 3; a++) { var gk = 'gxyz'.charAt(0) + 'xyz'.charAt(a), ak = 'a' + 'xyz'.charAt(a); S[gk][i] = has(gk) ? f[I[gk]] * D : NaN; S[ak][i] = has(ak) ? f[I[ak]] : NaN; }
S.fl[i] = f[I.fl]; S.fr[i] = f[I.fr]; S.cl[i] = f[I.cl]; S.cr[i] = f[I.cr];
for (j = 0; j < nj; j++) { S.J[j][i] = f[I['j' + j]] * D; S.Q[j][i] = has('tq' + j) ? f[I['tq' + j]] : NaN; }
}
E._tel = S; return S;
}
function hmJ(name) { var J = (HM.info && HM.info.joints) || []; var k = J.indexOf(name); if (k < 0) k = J.indexOf(name + '_joint'); return k < 0 ? 0 : k; }
var HMT_CH = [
{ title: 'Forward speed', unit: 'm/s', s: [['cvx', 'asked', '#7bd88f'], ['vx', 'measured', '#6ea8ff']] },
{ title: 'Turn rate', unit: '°/s', s: [['cwz', 'asked', '#7bd88f'], ['wz', 'measured', '#6ea8ff']], zero: true },
{ title: 'Height: pelvis above the ground · the ground', unit: 'm', s: [['hp', 'pelvis', '#e8ecf2'], ['hg', 'ground', '#ffd166']] },
{ title: 'Attitude (IMU)', unit: '°', s: [['roll', 'roll (left up +)', '#6ea8ff'], ['pitch', 'pitch (nose down +)', '#ff9f43']], zero: true },
{ title: 'Gyro (pelvis IMU)', unit: '°/s', s: [['gx', 'x', '#6ea8ff'], ['gy', 'y', '#ff9f43'], ['gz', 'z', '#7bd88f']], zero: true, clip: 300 },
{ title: 'Accelerometer (pelvis IMU)', unit: 'm/s²', s: [['ax', 'x', '#6ea8ff'], ['ay', 'y', '#ff9f43'], ['az', 'z', '#7bd88f']], zero: true, clip: 40 },
{ title: 'Load on the feet', unit: '× its weight', s: [['fl', 'left', '#c39bff'], ['fr', 'right', '#ffd166']], feet: true },
{ title: 'Legs: joint angles', unit: '°', s: [['J:left_hip_pitch', 'L hip', '#6ea8ff'], ['J:left_knee', 'L knee', '#7bd88f'], ['J:left_ankle_pitch', 'L ankle', '#ffd166'], ['J:right_hip_pitch', 'R hip', '#ff9f43'], ['J:right_knee', 'R knee', '#ff6b5a'], ['J:right_ankle_pitch', 'R ankle', '#c39bff']], zero: true },
{ title: 'Legs: motor torques', unit: 'N·m', s: [['Q:left_hip_pitch', 'L hip', '#6ea8ff'], ['Q:left_knee', 'L knee', '#7bd88f'], ['Q:left_ankle_pitch', 'L ankle', '#ffd166'], ['Q:right_hip_pitch', 'R hip', '#ff9f43'], ['Q:right_knee', 'R knee', '#ff6b5a'], ['Q:right_ankle_pitch', 'R ankle', '#c39bff']], zero: true }];
function hmSer(S, key) { if (key.charAt(1) === ':') return (key.charAt(0) === 'J' ? S.J : S.Q)[hmJ(key.slice(2))]; return S[key]; }
function hmTel(E) {
var nowMs = performance.now(); if (nowMs - (HM.telAt || 0) < 80 && !CAP.offline) return; HM.telAt = nowMs;
var W = Math.max(200, el.clientWidth), H = Math.max(150, el.clientHeight), pr = Math.min(2, window.devicePixelRatio || 1);
if (hmTelC.width !== Math.round(W * pr) || hmTelC.height !== Math.round(H * pr)) { hmTelC.width = Math.round(W * pr); hmTelC.height = Math.round(H * pr); }
var g = hmTelC.getContext('2d'), FONT = 'Inter,-apple-system,Segoe UI,sans-serif';
g.setTransform(pr, 0, 0, pr, 0, 0); g.fillStyle = '#0b0f16'; g.fillRect(0, 0, W, H);
if (E && E.frames && E.frames.length > 1) HM.telLast = E; else E = HM.telLast;
if (!E) { g.font = '12px ' + FONT; g.fillStyle = 'rgba(232,236,242,.55)'; g.fillText('Waiting for the robot: its sensors show here as it walks.', 14, 46); return; }
var S = hmTelSeries(E), live = E.kind === 'live', ct = HM.ct == null ? S.t[S.n - 1] : HM.ct;
var t1 = live ? Math.max(ct, S.t[0] + 20) : S.t[S.n - 1], t0 = live ? t1 - 20 : S.t[0];
var k = 0, lo = 0, hi = S.n - 1, mid; while (lo <= hi) { mid = (lo + hi) >> 1; if (S.t[mid] <= ct) { k = mid; lo = mid + 1; } else hi = mid - 1; }
var i0 = 0; lo = 0; hi = S.n - 1; while (lo <= hi) { mid = (lo + hi) >> 1; if (S.t[mid] < t0) { i0 = mid + 1; lo = mid + 1; } else hi = mid - 1; }
g.font = '600 13px ' + FONT; g.fillStyle = '#e8ecf2'; g.fillText(((HM.info && HM.info.name) || 'Unitree G1') + ' · telemetry' + (E.meta && E.meta.label ? ' · ' + E.meta.label : ''), 14, 22);
var hdr = live ? 'live · the last 20 s' : 't = ' + (ct - S.t[0]).toFixed(1) + ' s of ' + (S.t[S.n - 1] - S.t[0]).toFixed(0) + ' s';
if (HM.info && HM.info.course) hdr = 'on ' + hmZone(E.frames[k][HM.F.x], E.frames[k][HM.F.y]) + ' · ' + hdr;
g.font = '12px ' + FONT; g.fillStyle = 'rgba(232,236,242,.6)'; g.fillText(hdr, W - g.measureText(hdr).width - 14, 22);
var side = W >= 860, bw = side ? Math.min(340, W * 0.3) : W - 20, bh = side ? H - 42 : Math.min(320, H * 0.45);
var CW = side ? W - bw - 10 : W, CH = side ? H : H - bh - 10;
hmTelBoard(g, S, k, side ? W - bw - 10 : 10, side ? 32 : CH, bw, bh, FONT);
var cols = CW < 520 ? 1 : CW / CH > 1.9 ? 4 : CW / CH > 1.1 ? 3 : 2, rows = Math.ceil(hmCharts().length / cols), pad = 10, top = 32, cw = (CW - pad * (cols + 1)) / cols, chh = (CH - top - pad * (rows + 1)) / rows;
hmCharts().forEach(function (c, ci) {
var cx = pad + (ci % cols) * (cw + pad), cy = top + pad + Math.floor(ci / cols) * (chh + pad), px = cx + 34, pw = cw - 42, py = cy + 30, ph = chh - 40;
var mn = Infinity, mx = -Infinity;
c.s.forEach(function (sr) { var a = hmSer(S, sr[0]); for (var i = i0; i < S.n && S.t[i] <= t1; i++) { var v = a[i]; if (v !== v) continue; if (c.clip) v = Math.max(-c.clip, Math.min(c.clip, v)); if (v < mn) mn = v; if (v > mx) mx = v; } });
var none = !(mx >= mn);
if (none) { mn = 0; mx = 1; }
if (c.zero) { mn = Math.min(mn, 0); mx = Math.max(mx, 0); }
if (!(mx > mn)) mx = mn + 1; var sp = (mx - mn) * 0.08, pos = mn >= 0; mn -= sp; mx += sp; if (pos) mn = Math.max(0, mn);
g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(cx, cy, cw, chh);
g.fillStyle = 'rgba(232,236,242,.9)'; g.font = '600 11px ' + FONT; g.fillText(c.title, cx + 8, cy + 14);
var vals = none ? 'not sent by this block version' : c.s.length > 3 ? '' : c.s.map(function (sr) { var v = hmSer(S, sr[0])[k]; return v === v ? (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(Math.abs(v) >= 10 ? 1 : 2)) : '–'; }).join(' / ') + ' ' + c.unit;
if (c.s.length > 3 && !none) vals = c.unit;
g.font = '11px ' + FONT; g.fillStyle = 'rgba(232,236,242,.65)'; g.textAlign = 'right'; g.fillText(vals, cx + cw - 8, cy + 14); g.textAlign = 'left';
var X = function (t) { return px + (t - t0) / Math.max(1e-6, t1 - t0) * pw; }, Y = function (v) { return py + ph - (v - mn) / (mx - mn) * ph; };
g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1; g.beginPath();
for (var q = 0; q <= 4; q++) { var yy = py + ph * q / 4; g.moveTo(px, yy); g.lineTo(px + pw, yy); } g.stroke();
if (mn < 0 && mx > 0) { g.strokeStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.moveTo(px, Y(0)); g.lineTo(px + pw, Y(0)); g.stroke(); }
g.font = '10px ' + FONT; g.fillStyle = 'rgba(232,236,242,.45)'; g.textAlign = 'right';
var fmt = function (v) { return Math.abs(mx - mn) < 3 ? v.toFixed(1) : String(Math.round(v)); };
g.fillText(fmt(mx), px - 5, py + 8); g.fillText(fmt(mn), px - 5, py + ph); g.textAlign = 'left';
var st = t1 - t0 > 40 ? 10 : 5; for (var ts = Math.ceil((t0 - S.t[0]) / st) * st; S.t[0] + ts <= t1 + 1e-6; ts += st) g.fillText(ts + ' s', X(S.t[0] + ts) - 6, Math.min(cy + chh - 1, py + ph + 11));
if (c.feet) {
[['cl', '#c39bff', 0], ['cr', '#ffd166', 4]].forEach(function (fc) { g.fillStyle = fc[1]; for (var i = Math.max(i0, 1); i <= k; i++) if (S[fc[0]][i] > 0.5) { var xa = X(S.t[i - 1]), xb = X(S.t[i]); g.fillRect(xa, py + ph - 7 + fc[2], Math.max(1, xb - xa + 0.5), 2.5); } });
}
c.s.forEach(function (sr) {
var a = hmSer(S, sr[0]), step = Math.max(1, Math.floor((k - i0) / (pw * 1.5))), started = false;
g.strokeStyle = sr[2]; g.lineWidth = 1.4; g.beginPath();
for (var i = i0; i <= k; i += step) { var v = a[i]; if (v !== v) { started = false; continue; } if (c.clip) v = Math.max(-c.clip, Math.min(c.clip, v)); var x = X(S.t[i]), y = Y(v); if (!started) { g.moveTo(x, y); started = true; } else g.lineTo(x, y); }
g.stroke();
});
if (c.s.length > 1) { var lx = cx + 8; g.font = '10px ' + FONT; c.s.forEach(function (sr) { if (lx > cx + cw - 40) return; g.fillStyle = sr[2]; g.fillRect(lx, cy + 21, 9, 2); g.fillStyle = 'rgba(232,236,242,.6)'; g.fillText(sr[1], lx + 12, cy + 25); lx += g.measureText(sr[1]).width + 22; }); }
g.strokeStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(X(ct), py); g.lineTo(X(ct), py + ph); g.stroke();
});
}
function hmTelBoard(g, S, k, bx, by, bw, bh, FONT) {
var I = HM.info || {}, J = I.joints || [], L = I.limits || [], TM = I.torque_max || [], DEF = I['default'] || [], D = 180 / Math.PI;
g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(bx, by, bw, bh);
g.fillStyle = 'rgba(232,236,242,.9)'; g.font = '600 11px ' + FONT; g.fillText('All ' + (J.length || 29) + ' joints: angle · motor torque', bx + 8, by + 15);
var n = J.length || 29, rh = (bh - 34) / n, nameW = Math.min(122, bw * 0.38), avail = bw - nameW - 20, aw = avail * 0.5, tw = avail * 0.5, fs = Math.max(8.5, Math.min(11, rh * 0.66));
var group = function (nm) { return /^(waist|torso|neck|spine|head)/.test(nm) ? 'waist' : (/^(left|l_)/.test(nm) ? 'L' : 'R') + (/hip|knee|ankle/.test(nm) ? 'leg' : 'arm'); };
for (var j = 0; j < n; j++) {
var y = by + 22 + j * rh, raw = J[j] || ('joint ' + j), nm = raw.replace(/_joint$/, '').replace(/^(left|l)_/, 'L ').replace(/^(right|r)_/, 'R ').replace(/_/g, ' ');
if (j && group(raw) !== group(J[j - 1] || '')) { g.strokeStyle = 'rgba(255,255,255,.09)'; g.beginPath(); g.moveTo(bx + 6, y); g.lineTo(bx + bw - 6, y); g.stroke(); }
g.font = fs + 'px ' + FONT; g.fillStyle = 'rgba(232,236,242,.72)'; g.fillText(nm, bx + 8, y + rh * 0.72);
var a = S.J[j][k], lim = L[j] || [-Math.PI, Math.PI], lo = lim[0] * D, hi = lim[1] * D, x0 = bx + nameW + 8, yy = y + rh * 0.52;
g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x0, yy - 2, aw - 6, 4);
var fx = function (v) { return x0 + Math.max(0, Math.min(1, (v - lo) / Math.max(1e-6, hi - lo))) * (aw - 6); };
if (DEF[j] != null) { g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(fx(DEF[j] * D) - 0.5, yy - 4, 1, 8); }
var near = Math.min(a - lo, hi - a) / Math.max(1e-6, hi - lo) < 0.05;
g.fillStyle = near ? '#ff6b5a' : '#6ea8ff'; g.fillRect(fx(a) - 2, yy - 4, 4, 8);
var q = S.Q[j][k], qm = TM[j] || 50, t0 = x0 + aw + 4, half = (tw - 8) / 2, tc = t0 + half;
g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(t0, yy - 2, tw - 8, 4); g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(tc - 0.5, yy - 4, 1, 8);
if (q === q) { var fr = Math.max(-1, Math.min(1, q / qm)), af = Math.abs(fr); g.fillStyle = af > 0.8 ? '#ff6b5a' : af > 0.5 ? '#ffb347' : '#7bd88f'; g.fillRect(fr < 0 ? tc + fr * half : tc, yy - 3, af * half, 6); }
}
g.font = '9.5px ' + FONT; g.fillStyle = 'rgba(232,236,242,.45)'; g.fillText('angle within its range (tick: standing) · torque, to its motor’s limit', bx + 8, by + bh - 5);
}
var hmBar = document.createElement('span'); hmBar.style.cssText = 'display:none;gap:6px;align-items:center';
var HM_CAMS = [['director', 'Director', 'The camera cuts by itself between angles (a drag takes over)'], ['follow', 'Follow', 'Behind the robot'], ['side', 'Side', 'Tracking alongside it'], ['front', 'Front', 'Ahead of it, looking back'], ['orbit', 'Orbit', 'Around the robot: drag to turn, wheel to zoom'], ['free', 'Free', 'Walk the camera yourself: drag left and right to turn, up and down to go forward and back; right-drag (or Shift) to look up and down and step sideways; wheel: forward and back; keys W A S D or the arrows, Q and E down and up'],
['eyes', "Robot's eyes", 'What the RealSense camera in its head sees (colour)'], ['depth', 'Depth camera', 'What the same camera measures: how far each point is, red near to blue far']];
var hmCamSel = document.createElement('select'); hmCamSel.style.cssText = 'background:#1b2029;color:#e8ecf2;border:1px solid #2a303b;border-radius:6px;font-size:12px;padding:1px 4px';
hmCamSel.innerHTML = HM_CAMS.map(function (c) { return '<option value="' + c[0] + '" title="' + esc(c[2]) + '">' + esc(c[1]) + '</option>'; }).join('');
hmCamSel.onchange = function () { HM.camPicked = hmCamSel.value; hmSetCam(hmCamSel.value); keepView(true); };
hmBar.appendChild(hmCamSel); barEl.insertBefore(hmBar, $('.cam'));
HM.sensOn = (function () { try { return localStorage.getItem('v3d.hsens') !== '0'; } catch (e) { return true; } })();
HM.litOn = (function () { try { return localStorage.getItem('v3d.hlit') !== '0'; } catch (e) { return true; } })();
window.addEventListener('storage', function (ev) { if (ev.key === 'v3d.hlit') { HM.litOn = ev.newValue !== '0'; if (HMLOG.litBtn) HMLOG.litBtn.onpaint && HMLOG.litBtn.onpaint(); } });
HM.litSet = function (on, tell) {
HM.litOn = !!on; try { localStorage.setItem('v3d.hlit', HM.litOn ? '1' : '0'); } catch (e) { }
if (HMLOG.litBtn && HMLOG.litBtn.onpaint) HMLOG.litBtn.onpaint();
if (tell && ctx.peer) ctx.peer('wh-lights', { on: HM.litOn, at: Date.now() });
};
if (ctx.on) ctx.on('peer', function (topic, data) {
if (topic === 'wh-lights' && data && typeof data.on === 'boolean') HM.litSet(data.on, false);
else if (topic === 'wh-lights?' && HM.litTouched && ctx.peer) ctx.peer('wh-lights', { on: HM.litOn !== false, at: Date.now() });
});
if (ctx.peer) setTimeout(function () { ctx.peer('wh-lights?', {}); }, 600);
[['lit', '💡 Lights', 'The warehouse lights on or off (off: the hall in the dark, only the robot\'s own lights)'], ['log', '📋 Log', 'The patrol\'s log: its mission, what has happened, the map of the hall (on or off)'], ['snd', '🔊 Sound', 'Sound on or off (it starts with your first click in the view)'], ['las', '📡 Sensors', 'The numbers (speed, turn, off the line, what it walks on, the feet), the arrows of the command (green) and of what it does (blue), and the elevation map it reads (dots on the ground: cyan level, orange higher, blue lower), on screen and in recordings']].forEach(function (c) {
var b = document.createElement('button'); b.textContent = c[1]; b.title = c[2]; b.style.cssText = 'all:unset;cursor:pointer;padding:2px 8px;border:1px solid #2a303b;border-radius:6px;font-size:12px';
var on = function () { return c[0] === 'snd' ? AUD.on : c[0] === 'log' ? !!HMLOG.on : c[0] === 'lit' ? HM.litOn !== false : HM.sensOn !== false; };
var paint = function () { b.style.background = on() ? '#3a4dd8' : ''; b.style.opacity = on() ? '1' : '0.6'; };
if (c[0] === 'log') { HMLOG.btn = b; b.style.display = 'none'; }
if (c[0] === 'lit') { HMLOG.litBtn = b; b.style.display = 'none'; }
b.onclick = function () { audUnlock(); if (c[0] === 'lit') { HM.litTouched = true; HM.litSet(!on(), true); } else if (c[0] === 'log') { HMLOG.on = !HMLOG.on; try { localStorage.setItem('v3d.hlog', HMLOG.on ? '1' : '0'); } catch (e) { } evShown = null; drawEvents(); } else if (c[0] === 'snd') AUD.on = !AUD.on; else { HM.sensOn = !on(); try { localStorage.setItem('v3d.hsens', HM.sensOn ? '1' : '0'); } catch (e) { } HM.hudAt = 0; } paint(); keepView(true); };
paint(); b.onpaint = paint; hmBar.appendChild(b);
});
var hmCredit = document.createElement('div');
hmCredit.style.cssText = 'position:absolute;right:10px;bottom:46px;font:11px Inter,-apple-system,Segoe UI,sans-serif;color:rgba(232,236,242,.45);pointer-events:none;display:none';
hmCredit.textContent = 'G1 model: KenzoDkohno22T, CC BY 4.0'; ui.appendChild(hmCredit);
var HM_PALM = 'url("data:image/svg+xml;utf8,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>"
+ "<g fill='#15181d' stroke='#15181d' stroke-width='2.6' stroke-linejoin='round'><rect x='9.5' y='8' width='3.6' height='12' rx='1.8'/><rect x='13.5' y='5' width='3.6' height='14' rx='1.8'/><rect x='17.5' y='6' width='3.6' height='13' rx='1.8'/><rect x='21.5' y='9' width='3.6' height='11' rx='1.8'/><rect x='9.5' y='14' width='15.6' height='14' rx='5'/><rect x='4.2' y='14.5' width='3.6' height='9.5' rx='1.8' transform='rotate(-38 6 19)'/></g>"
+ "<g fill='#ffffff'><rect x='9.5' y='8' width='3.6' height='12' rx='1.8'/><rect x='13.5' y='5' width='3.6' height='14' rx='1.8'/><rect x='17.5' y='6' width='3.6' height='13' rx='1.8'/><rect x='21.5' y='9' width='3.6' height='11' rx='1.8'/><rect x='9.5' y='14' width='15.6' height='14' rx='5'/><rect x='4.2' y='14.5' width='3.6' height='9.5' rx='1.8' transform='rotate(-38 6 19)'/></g></svg>") + '") 16 15, grab';
function hmPushTool(c) {
HM.pushTool = HM.pushTool ? null : c;
OVL.ctls.forEach(function (k) { if (/^push$/i.test(k.name) && k.kind === 'button') k.el.classList.toggle('on', !!HM.pushTool); });
renderer.domElement.style.cursor = HM.pushTool ? HM_PALM : '';
if (HM.pushTool && !HM.pushTold) { HM.pushTold = true; toast('Push: click the robot where you want to push it; it is pushed the way you are looking. Click Push again (or Esc) to stop.'); }
}
var HMRC = new THREE.Raycaster(), HMM2 = new THREE.Vector2();
function hmPickDepth(ev, obj) {
try {
var rc = renderer.domElement.getBoundingClientRect(), W = Math.max(1, Math.round(rc.width)), H = Math.max(1, Math.round(rc.height));
var px = Math.min(W - 1, Math.max(0, Math.round(ev.clientX - rc.left))), py = Math.min(H - 1, Math.max(0, Math.round(ev.clientY - rc.top)));
if (!HM.pickRT) { HM.pickRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.FloatType }); HM.pickMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.BasicDepthPacking, side: THREE.DoubleSide }); HM.pickScene = new THREE.Scene(); }
var par = obj.parent, sc = HM.pickScene, oldBg = sc.background;
sc.add(obj); sc.overrideMaterial = HM.pickMat;
camera.setViewOffset(W, H, px, py, 1, 1);
var oldT = renderer.getRenderTarget(), oldC = renderer.getClearColor(new THREE.Color()), oldA = renderer.getClearAlpha();
renderer.setRenderTarget(HM.pickRT); renderer.setClearColor(0x000000, 0); renderer.clear(true, true, true);
renderer.render(sc, camera);
var buf = new Float32Array(4); renderer.readRenderTargetPixels(HM.pickRT, 0, 0, 1, 1, buf);
renderer.setRenderTarget(oldT); renderer.setClearColor(oldC, oldA);
camera.clearViewOffset(); sc.background = oldBg;
if (par) par.add(obj);
if (!(buf[3] > 0.5)) return null;
var z = 1 - buf[0], n = camera.near, f = camera.far;
var ahead = (n * f) / (f - (f - n) * z), fw = camera.getWorldDirection(new THREE.Vector3()), cs = Math.max(0.05, HMRC.ray.direction.dot(fw));
return HMRC.ray.origin.clone().addScaledVector(HMRC.ray.direction, ahead / cs);
} catch (e) { try { camera.clearViewOffset(); } catch (e2) {} if (obj.parent !== HM.root && HM.root) HM.root.add(obj); return null; }
}
function hmPushAt(ev) {
if (!HM.K) return;
var rc = renderer.domElement.getBoundingClientRect();
HMM2.set(((ev.clientX - rc.left) / rc.width) * 2 - 1, -((ev.clientY - rc.top) / rc.height) * 2 + 1);
HMRC.setFromCamera(HMM2, camera);
var K = HM.K, hk = ((HM.info && HM.info.h0) || 0.755) / 0.755, segs = [];
K.forEach(function (b, i) { segs.push([i, b.wp, b.wp]); if (b.parent >= 0) segs.push([b.parent, K[b.parent].wp, b.wp]); });
var near = function (p) {
var best = -1, bd = 1e9, ab = new THREE.Vector3(), ap = new THREE.Vector3();
segs.forEach(function (sg) { ab.subVectors(sg[2], sg[1]); var L2 = ab.lengthSq(), t = L2 > 1e-9 ? Math.max(0, Math.min(1, ap.subVectors(p, sg[1]).dot(ab) / L2)) : 0;
var d = ap.copy(sg[1]).addScaledVector(ab, t).distanceTo(p); if (d < bd) { bd = d; best = sg[0]; } });
return [best, bd];
};
var hit = null;
if (HM.bind && HM.bind.root) hit = hmPickDepth(ev, HM.bind.root);
var p = null, k = -1;
if (hit) { p = new THREE.Vector3(hit.x, -hit.z, hit.y); var nk = near(p); if (nk[1] < 0.35 * hk) k = nk[0]; }
if (k < 0) {
var o = HMRC.ray.origin, dv = HMRC.ray.direction, O = new THREE.Vector3(o.x, -o.z, o.y), D = new THREE.Vector3(dv.x, -dv.z, dv.y), bd = 0.18 * hk;
segs.forEach(function (sg) {
for (var t = 0; t <= 1.0001; t += 0.1) {
var q = sg[1].clone().lerp(sg[2], t), s_ = Math.max(0, q.clone().sub(O).dot(D)), d = O.clone().addScaledVector(D, s_).distanceTo(q);
if (d < bd) { bd = d; k = sg[0]; p = O.clone().addScaledVector(D, s_); }
}
});
}
if (k < 0 || !p) { toast('Push: click on the robot.'); return; }
var b = K[k], inv = b.wq.clone().invert(), loc = p.clone().sub(b.wp).applyQuaternion(inv);
var f = camera.getWorldDirection(new THREE.Vector3()), dir = new THREE.Vector3(f.x, -f.z, 0);
if (dir.length() < 0.15) { var rd = HMRC.ray.direction; dir.set(rd.x, -rd.z, 0); }
if (dir.length() < 1e-3) { toast('Push: look at the robot from the side to push it.'); return; }
dir.normalize();
sendCtl(HM.pushTool ? HM.pushTool.name : 'Push', { body: b.name, at: [+loc.x.toFixed(4), +loc.y.toFixed(4), +loc.z.toFixed(4)], dir: [+dir.x.toFixed(4), +dir.y.toFixed(4), 0] });
var arr = new THREE.ArrowHelper(HW(dir.x, dir.y, 0).normalize(), HW(p.x - dir.x * 0.55, p.y - dir.y * 0.55, p.z), 0.5, 0xff7a1a, 0.16, 0.1);
arr.traverse(function (o) { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.depthTest = false; } o.renderOrder = 9; });
HM.root.add(arr); (HM.pushFx || (HM.pushFx = [])).push({ o: arr, t: 0 });
}
function hmPushFx(d) {
(HM.pushFx || []).forEach(function (e) { e.t += d; e.o.traverse(function (o) { if (o.material) o.material.opacity = Math.max(0, 1 - e.t / 1.8); }); });
HM.pushFx = (HM.pushFx || []).filter(function (e) { if (e.t < 1.8) return true; HM.root.remove(e.o); e.o.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); return false; });
}
(function () {
var down = null;
renderer.domElement.addEventListener('pointerdown', function (ev) { down = { x: ev.clientX, y: ev.clientY }; });
renderer.domElement.addEventListener('pointerup', function (ev) {
if (mode !== 'humanoid' || !HM.pushTool || !down || Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 5) return;
hmPushAt(ev);
});
window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && HM.pushTool) hmPushTool(HM.pushTool); });
})();
function hmCreditText() { var I = HM.info; return !I || (I.glb || 'g1') === 'g1' ? 'G1 model: KenzoDkohno22T, CC BY 4.0' : (I.credit || ''); }
function enterHumanoid() {
if (HM_FIXED) AUD.on = false;
stopLive(); clearEntities(); runs = []; runSel.style.display = 'none'; modeBtn.style.display = 'none'; $('.cam').style.display = 'none'; $('.fit').style.display = 'none'; tl.style.display = 'none';
mode = 'humanoid'; shownKey = 'humanoid';
ground.visible = false; grid.visible = false; grid10.visible = false; windLines.visible = false; trailGroup.visible = false;
if (sky) { scene.remove(sky); sky = null; }
controls.maxPolarAngle = Math.PI * 0.495; controls.minDistance = 0.6; controls.maxDistance = 60; controls.enablePan = true;
camera.near = 0.03; camera.far = 800; camera.fov = 42; camera.updateProjectionMatrix();
if (HM_TEL) { el.appendChild(hmTelC); hmTelC.style.display = ''; renderer.domElement.style.visibility = 'hidden'; AUD.on = false; ui.querySelector('.hud').style.display = 'none'; }
if (quality !== 'fast' && !composer && !HM_TEL && HM_FIXED !== 'depth') {
composer = new A.EffectComposer(renderer); composer.addPass(new A.RenderPass(scene, camera));
if (quality === 'high' && A.GTAOPass && (!HM_FIXED || HM_FIXED === 'eyes')) {
try { var w0 = Math.max(10, el.clientWidth), h0 = Math.max(10, el.clientHeight); gtao = new A.GTAOPass(scene, camera, w0, h0);
gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.2, thickness: 0.6, scale: 1.0, samples: 16 }); gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 }); gtao.blendIntensity = 0.9;
var ovr = gtao.overrideVisibility; if (ovr) gtao.overrideVisibility = function () { ovr.call(this); this.scene.traverse(function (o) { if (o.isSprite || (o.material && !Array.isArray(o.material) && o.material.transparent && o.material.depthWrite === false)) o.visible = false; }); };
composer.addPass(gtao); } catch (e) { gtao = null; }
}
composer.addPass(cleanPass()); HM.bloom = new A.UnrealBloomPass(new THREE.Vector2(256, 256), 0.28, 0.5, 1.2); composer.addPass(HM.bloom); composer.addPass(new A.OutputPass()); composer.addPass(fxaaPass()); resize();
}
barEl.style.display = 'flex'; hmBar.style.display = 'inline-flex'; hmCredit.style.display = 'none';
HM.camPicked = (ctx.state && ctx.state.hmcam) || 'director';
hmSetCam(HM_FIXED || HM.camPicked);
var hmDn = null;
renderer.domElement.addEventListener('pointerdown', function (ev) { hmDn = [ev.clientX, ev.clientY]; });
renderer.domElement.addEventListener('pointerup', function () { hmDn = null; });
renderer.domElement.addEventListener('pointermove', function (ev) {
if (!hmDn || !ev.buttons || HM.cam !== 'director' || HM_FIXED || !HM.K || HM.pushArm) return;
if (Math.hypot(ev.clientX - hmDn[0], ev.clientY - hmDn[1]) > 8) { hmDn = null; hmSetCam('orbit'); }
});
if (HM_FIXED) barEl.style.display = 'none';
}
function hmQuad() { return !!(HM.info && HM.info.legs === 4); }
function hmWH() { var C = HM.info && HM.info.course; return C && C.kind === 'warehouse' ? C : null; }
function hmCF() { return HM.F.c0 != null ? ['c0', 'c1', 'c2', 'c3'] : ['cl', 'cr']; }
function hmLF() { return HM.F.f0 != null ? ['f0', 'f1', 'f2', 'f3'] : ['fl', 'fr']; }
var HMT_CH_Q = [
{ title: 'Forward speed', unit: 'm/s', s: [['cvx', 'asked', '#7bd88f'], ['vx', 'measured', '#6ea8ff']] },
{ title: 'Turn rate', unit: '°/s', s: [['cwz', 'asked', '#7bd88f'], ['wz', 'measured', '#6ea8ff']], zero: true },
{ title: 'Height: body above the ground · the ground', unit: 'm', s: [['hp', 'body', '#e8ecf2'], ['hg', 'ground', '#ffd166']] },
{ title: 'Attitude (IMU)', unit: '°', s: [['roll', 'roll (left up +)', '#6ea8ff'], ['pitch', 'pitch (nose down +)', '#ff9f43']], zero: true },
{ title: 'Gyro (body IMU)', unit: '°/s', s: [['gx', 'x', '#6ea8ff'], ['gy', 'y', '#ff9f43'], ['gz', 'z', '#7bd88f']], zero: true, clip: 300 },
{ title: 'Accelerometer (body IMU)', unit: 'm/s²', s: [['ax', 'x', '#6ea8ff'], ['ay', 'y', '#ff9f43'], ['az', 'z', '#7bd88f']], zero: true, clip: 40 },
{ title: 'Load on the front feet', unit: '× its weight', s: [['fl', 'front left', '#c39bff'], ['fr', 'front right', '#ffd166']], feet: true },
{ title: 'Legs: joint angles', unit: '°', s: [['J:fl_hy', 'FL hip', '#6ea8ff'], ['J:fl_kn', 'FL knee', '#7bd88f'], ['J:hr_hy', 'HR hip', '#ff9f43'], ['J:hr_kn', 'HR knee', '#ff6b8b']] },
{ title: 'Legs: motor torques', unit: 'N·m', s: [['Q:fl_hy', 'FL hip', '#6ea8ff'], ['Q:fl_kn', 'FL knee', '#7bd88f'], ['Q:hr_hy', 'HR hip', '#ff9f43'], ['Q:hr_kn', 'HR knee', '#ff6b8b']], clip: 150 }
];
function hmWhSolid(x, y, z) {
var C = hmWH(); if (!C) return false; var Hl = C.hall;
if (x < Hl.x0 + 0.3 || x > Hl.x1 - 0.3 || y < Hl.y0 + 0.3 || y > Hl.y1 - 0.3 || z > (Hl.height || 9) - 1.4) return true;
for (var i = 0; i < C.boxes.length; i++) { var b = C.boxes[i]; if (x < b.x0 - 0.25 || x > b.x1 + 0.25 || y < b.y0 - 0.25 || y > b.y1 + 0.25) continue;
var top = b.kind === 'rack' ? 8.3 : b.kind === 'office' ? 3.9 : b.kind === 'wall' ? 99 : b.kind === 'rail' ? 2.0 : b.kind === 'conveyor' ? 1.2 : b.h + 0.15; if (z < top) return true; }
return false;
}
function hmWhFree(look, want) {
var clear = function (c) { for (var k = 1; k <= 12; k++) { var q = look.clone().lerp(c, k / 12); if (hmWhSolid(q.x, -q.z, q.y)) return false; } return true; };
var lifts = [0, 1.0, 2.0];
for (var li = 0; li < lifts.length; li++) for (var t = 1; t >= 0.55; t -= 0.075) {
var c = look.clone().lerp(want, t); c.y = want.y + lifts[li]; if (clear(c)) return c;
}
for (t = 0.5; t >= 0.25; t -= 0.05) { var c2 = look.clone().lerp(want, t); c2.y = want.y + 1.5; if (clear(c2)) return c2; }
var up = look.clone(); up.y = look.y + 2.2; return up;
}
function hmCharts() { return hmQuad() ? HMT_CH_Q : HMT_CH; }
function hmMission(E) {
var M = E && E.missions; if (!M || !M.length) return null;
var t = HM.ct || 0, k = M.length - 1; while (k > 0 && M[k].t > t + 0.05) k--;
var a = M[k], b = M[Math.min(M.length - 1, k + 1)];
if (b !== a && b.t > a.t && a.actors) {
var f = Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t))), byId = {};
(b.actors || []).forEach(function (q) { byId[q.id] = q; });
a._lerp = a.actors.map(function (q) { var n = byId[q.id]; if (!n) return q; var o = {}; for (var kk in q) o[kk] = q[kk]; o.x = q.x + (n.x - q.x) * f; o.y = q.y + (n.y - q.y) * f; var dy = Math.atan2(Math.sin(n.yaw - q.yaw), Math.cos(n.yaw - q.yaw)); o.yaw = q.yaw + dy * f; return o; });
} else a._lerp = a.actors || [];
if (a.props) {
var f2 = b !== a && b.t > a.t && b.props && b.props.length === a.props.length ? Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t))) : 0;
a._props = a.props.map(function (q, i) { if (!f2) return q; var n = b.props[i], o = []; for (var k = 0; k < 7; k++) o.push(q[k] + (n[k] - q[k]) * f2); var dt = q[3] * n[3] + q[4] * n[4] + q[5] * n[5] + q[6] * n[6]; if (dt < 0) for (k = 3; k < 7; k++) o[k] = q[k] - (n[k] + q[k]) * f2; return o; });
}
return a;
}
function hmNrm(hc, s) {
var w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data, c = document.createElement('canvas'); c.width = w; c.height = h;
var g = c.getContext('2d'), out = g.createImageData(w, h), d = out.data, H = function (x, y) { x = (x + w) % w; y = (y + h) % h; return src[(y * w + x) * 4] / 255; };
for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
var dx = (H(x + 1, y) - H(x - 1, y)) * s, dy = (H(x, y + 1) - H(x, y - 1)) * s, n = 1 / Math.sqrt(dx * dx + dy * dy + 1), k = (y * w + x) * 4;
d[k] = (-dx * n * 0.5 + 0.5) * 255; d[k + 1] = (dy * n * 0.5 + 0.5) * 255; d[k + 2] = (n * 0.5 + 0.5) * 255; d[k + 3] = 255;
}
g.putImageData(out, 0, 0); var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t;
}
function hmTexSet(w, h, col, hgt, rgh, s, ns) {
var t = vgTex(w, h, col); t.userData = {};
if (hgt) { var hc = document.createElement('canvas'); hc.width = w; hc.height = h; var g = hc.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); hgt(g, w, h); t.userData.nrm = hmNrm(hc, s || 4); t.userData.ns = ns || 1; }
if (rgh) t.userData.rgh = vgTex(w, h, rgh, false);
return t;
}
function hmPbr(m) {
var t = m.map; if (!t || !t.userData || !t.userData.nrm) return m;
var n = t.userData.nrm.clone(); n.needsUpdate = true; n.repeat.copy(t.repeat); m.normalMap = n; m.normalScale = new THREE.Vector2(t.userData.ns, t.userData.ns);
if (t.userData.rgh) { var r = t.userData.rgh.clone(); r.needsUpdate = true; r.repeat.copy(t.repeat); m.roughnessMap = r; }
return m;
}
function hmWhTex() {
var T = hmTextures();
if (T.whPanel) return T;
var noise = function (g, w, h, seed, n, a, cols) { vgSpeckle(g, w, h, vgRnd(seed), n, 0.4, 1.6, cols || ['rgba(0,0,0,A)', 'rgba(255,255,255,A)'], a * 0.3, a); };
T.whPanel = hmTexSet(256, 256, function (g, w, h) {
g.fillStyle = '#c3c7cb'; g.fillRect(0, 0, w, h);
for (var x = 0; x < w; x += 64) { g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(x + 4, 0, 6, h); g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(x + 22, 0, 6, h); }
var r = vgRnd(4); for (var k = 0; k < 40; k++) { g.fillStyle = 'rgba(70,60,50,' + (0.02 + 0.04 * r()).toFixed(3) + ')'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 20 + r() * 120); }
noise(g, w, h, 5, 1500, 0.06);
}, function (g, w, h) { for (var x = 0; x < w; x += 64) { g.fillStyle = '#ffffff'; g.fillRect(x + 10, 0, 12, h); var gr = g.createLinearGradient(x + 4, 0, x + 10, 0); gr.addColorStop(0, '#808080'); gr.addColorStop(1, '#ffffff'); g.fillStyle = gr; g.fillRect(x + 4, 0, 6, h); gr = g.createLinearGradient(x + 22, 0, x + 28, 0); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#808080'); g.fillStyle = gr; g.fillRect(x + 22, 0, 6, h); } }, null, 6, 1.4);
T.whConcrete = hmTexSet(512, 256, function (g, w, h) {
g.fillStyle = '#8f8e8a'; g.fillRect(0, 0, w, h); var r = vgRnd(9);
for (var y = 0; y < h; y += 64) for (var x = (y / 64) % 2 ? -64 : 0; x < w; x += 128) { var v = 130 + r() * 25 | 0; g.fillStyle = 'rgb(' + v + ',' + (v - 2) + ',' + (v - 6) + ')'; g.fillRect(x + 3, y + 3, 122, 58); }
noise(g, w, h, 9, 9000, 0.22, ['rgba(40,40,40,A)', 'rgba(210,210,200,A)']);
var gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(40,35,30,0.35)'); gr.addColorStop(0.3, 'rgba(40,35,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
}, function (g, w, h) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#5a5a5a'; for (var y = 0; y < h; y += 64) { g.fillRect(0, y, w, 3); for (var x = (y / 64) % 2 ? -64 : 0; x < w; x += 128) g.fillRect(x, y, 3, 64); } vgSpeckle(g, w, h, vgRnd(19), 4000, 0.5, 1.5, ['rgba(0,0,0,A)'], 0.1, 0.4); }, null, 5, 1.2);
var cartonTex = function (seed, base, print, tape, fragile) {
return hmTexSet(256, 256, function (g, w, h) {
var r = vgRnd(seed); g.fillStyle = base; g.fillRect(0, 0, w, h); noise(g, w, h, seed + 1, 2600, 0.12, ['rgba(90,60,30,A)', 'rgba(240,215,170,A)']);
for (var x = 0; x < w; x += 2) { g.fillStyle = 'rgba(80,55,25,' + (x % 4 ? 0.025 : 0.05) + ')'; g.fillRect(x, 0, 1, h); }
var ed = g.createLinearGradient(0, 0, w, 0); ed.addColorStop(0, 'rgba(60,40,20,0.22)'); ed.addColorStop(0.06, 'rgba(60,40,20,0)'); ed.addColorStop(0.94, 'rgba(60,40,20,0)'); ed.addColorStop(1, 'rgba(60,40,20,0.22)'); g.fillStyle = ed; g.fillRect(0, 0, w, h);
ed = g.createLinearGradient(0, 0, 0, h); ed.addColorStop(0, 'rgba(60,40,20,0.2)'); ed.addColorStop(0.06, 'rgba(60,40,20,0)'); ed.addColorStop(0.94, 'rgba(60,40,20,0)'); ed.addColorStop(1, 'rgba(60,40,20,0.25)'); g.fillStyle = ed; g.fillRect(0, 0, w, h);
if (tape) { g.fillStyle = tape; g.fillRect(w / 2 - 15, 0, 30, h); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(w / 2 - 15, 0, 3, h); }
g.strokeStyle = 'rgba(60,40,20,0.3)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, h * 0.5); g.lineTo(w, h * 0.5); g.stroke();
g.fillStyle = '#f6f5f0'; g.fillRect(26, 150, 72, 50); g.fillStyle = '#1d1d1d'; for (var i = 0; i < 12; i++) g.fillRect(32 + i * 5, 176, i % 3 ? 2 : 3, 18);
g.font = '700 9px Arial'; g.fillText('SKU ' + (4000 + seed * 37 % 900), 32, 166);
g.fillStyle = print; g.font = '800 30px Arial'; g.textAlign = 'center';
if (fragile) { g.fillText('FRAGILE', w * 0.68, 70); g.lineWidth = 3; g.strokeStyle = print; g.strokeRect(w * 0.68 - 70, 40, 140, 42); }
else {
var bx = w * 0.42, by = 38; g.beginPath(); if (g.roundRect) g.roundRect(bx, by, 34, 34, 8); else g.rect(bx, by, 34, 34); g.fill();
g.save(); g.globalCompositeOperation = 'destination-out'; g.font = '900 24px Arial'; g.fillText('E', bx + 17, by + 26); g.restore();
g.textAlign = 'left'; g.font = '800 28px Arial'; g.fillText('EsaSim', bx + 42, by + 27); g.textAlign = 'center';
}
g.textAlign = 'left'; g.font = '700 20px Arial'; g.fillText('↑↑', 196, 196); g.strokeStyle = print; g.lineWidth = 2; g.strokeRect(192, 176, 34, 26);
g.beginPath(); g.arc(160, 222, 9, Math.PI, 0); g.moveTo(160, 222); g.lineTo(160, 236); g.stroke();
g.beginPath(); g.moveTo(186, 214); g.lineTo(200, 214); g.lineTo(196, 230); g.lineTo(190, 230); g.closePath(); g.stroke();
for (var k = 0; k < 6; k++) { g.fillStyle = 'rgba(70,45,20,' + (0.05 + 0.08 * r()).toFixed(2) + ')'; g.fillRect(r() * w, r() * h, 6 + r() * 30, 1 + r() * 2); }
}, function (g, w, h) {
g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, w, h); for (var x = 0; x < w; x += 4) { g.fillStyle = '#868686'; g.fillRect(x, 0, 2, h); }
if (tape) { g.fillStyle = '#9c9c9c'; g.fillRect(w / 2 - 15, 0, 30, h); }
g.fillStyle = '#5a5a5a'; g.fillRect(0, h * 0.5 - 1, w, 2); g.fillRect(0, 0, w, 3); g.fillRect(0, h - 3, w, 3); g.fillRect(0, 0, 3, h); g.fillRect(w - 3, 0, 3, h);
g.fillStyle = '#909090'; g.fillRect(26, 150, 72, 50);
}, function (g, w, h) { g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, w, h); if (tape) { g.fillStyle = '#6a6a6a'; g.fillRect(w / 2 - 15, 0, 30, h); } g.fillStyle = '#b0b0b0'; g.fillRect(26, 150, 72, 50); }, 3, 0.8);
};
T.whCartons = [cartonTex(3, '#b98a57', 'rgba(150,30,25,0.85)', 'rgba(200,160,100,0.95)', true), cartonTex(5, '#c9a374', 'rgba(35,35,35,0.75)', 'rgba(210,175,120,0.95)', false),
cartonTex(7, '#e6dfd0', 'rgba(40,60,110,0.8)', 'rgba(215,205,185,0.9)', true), cartonTex(9, '#ad7f4f', 'rgba(35,35,35,0.75)', null, false)];
T.whCarton = T.whCartons[0];
T.whWrap = hmTexSet(256, 256, function (g, w, h) {
g.fillStyle = '#a27c52'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(60,40,20,0.55)'; g.lineWidth = 2;
for (var y = 0; y < h; y += 64) for (var x = (y / 64) % 2 ? -32 : 0; x < w; x += 64) g.strokeRect(x + 1, y + 1, 62, 62);
for (var k = 0; k < 40; k++) { g.strokeStyle = 'rgba(255,255,255,' + (0.05 + 0.12 * Math.random()).toFixed(2) + ')'; g.lineWidth = 1 + Math.random() * 3; g.beginPath(); var yy = Math.random() * h; g.moveTo(0, yy); g.bezierCurveTo(w / 3, yy + 10, 2 * w / 3, yy - 10, w, yy + 4); g.stroke(); }
}, function (g, w, h) { for (var k = 0; k < 60; k++) { g.strokeStyle = 'rgba(255,255,255,' + (0.1 + 0.3 * Math.random()).toFixed(2) + ')'; g.lineWidth = 2 + Math.random() * 6; g.beginPath(); var yy = Math.random() * h; g.moveTo(0, yy); g.bezierCurveTo(w / 3, yy + 12, 2 * w / 3, yy - 12, w, yy); g.stroke(); } }, null, 3, 0.6);
T.whDoor = hmTexSet(128, 256, function (g, w, h) { g.fillStyle = '#c9ced3'; g.fillRect(0, 0, w, h); for (var y = 0; y < h; y += 16) { g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, y + 2, w, 1); } noise(g, w, h, 6, 800, 0.08); },
function (g, w, h) { for (var y = 0; y < h; y += 16) { var gr = g.createLinearGradient(0, y, 0, y + 16); gr.addColorStop(0, '#404040'); gr.addColorStop(0.2, '#ffffff'); gr.addColorStop(0.8, '#c0c0c0'); gr.addColorStop(1, '#404040'); g.fillStyle = gr; g.fillRect(0, y, w, 16); } }, null, 5, 1.5);
T.whPlate = hmTexSet(128, 128, function (g, w, h) { g.fillStyle = '#80858b'; g.fillRect(0, 0, w, h); noise(g, w, h, 8, 1500, 0.15); for (var y = 0; y < h; y += 16) for (var x = (y / 16) % 2 ? 8 : 0; x < w; x += 16) { g.save(); g.translate(x + 4, y + 4); g.rotate((y / 16) % 2 ? 0.8 : -0.8); g.fillStyle = 'rgba(220,225,230,0.35)'; g.fillRect(-4, -1.2, 8, 2.4); g.restore(); } },
function (g, w, h) { g.fillStyle = '#606060'; g.fillRect(0, 0, w, h); for (var y = 0; y < h; y += 16) for (var x = (y / 16) % 2 ? 8 : 0; x < w; x += 16) { g.save(); g.translate(x + 4, y + 4); g.rotate((y / 16) % 2 ? 0.8 : -0.8); g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, 0, 4.5, 1.4, 0, 0, 6.3); g.fill(); g.restore(); } }, null, 6, 1.5);
T.whGrate = hmTexSet(128, 128, function (g, w, h) { g.fillStyle = '#23272c'; g.fillRect(0, 0, w, h); g.fillStyle = '#9aa1a8'; for (var x = 0; x < w; x += 16) g.fillRect(x, 0, 4, h); for (var y = 0; y < h; y += 32) g.fillRect(0, y, w, 3); noise(g, w, h, 44, 500, 0.15); },
function (g, w, h) { g.fillStyle = '#000000'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; for (var x = 0; x < w; x += 16) g.fillRect(x, 0, 4, h); for (var y = 0; y < h; y += 32) g.fillRect(0, y, w, 3); }, null, 5, 1.5);
T.whHatch = vgTex(128, 32, function (g, w, h) { g.fillStyle = '#f2c230'; g.fillRect(0, 0, w, h); g.fillStyle = '#17191c'; for (var x = -h; x < w + h; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 16 + h, 0); g.lineTo(x + h, 0); g.fill(); } vgSpeckle(g, w, h, vgRnd(2), 300, 0.5, 1.5, ['rgba(90,80,60,A)'], 0.1, 0.3); });
T.whUpright = hmTexSet(64, 256, function (g, w, h) { g.fillStyle = '#3a7de4'; g.fillRect(0, 0, w, h); noise(g, w, h, 12, 400, 0.08); for (var y = 6; y < h; y += 26) { g.fillStyle = '#0d1520'; g.beginPath(); g.ellipse(w / 2, y + 5, 5, 8, 0, 0, 6.3); g.fill(); g.fillRect(w / 2 - 3, y + 8, 6, 8); } g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(4, 0, 3, h); g.fillRect(w - 7, 0, 3, h); },
function (g, w, h) { g.fillStyle = '#c0c0c0'; g.fillRect(0, 0, w, h); for (var y = 6; y < h; y += 26) { g.fillStyle = '#202020'; g.beginPath(); g.ellipse(w / 2, y + 5, 5, 8, 0, 0, 6.3); g.fill(); g.fillRect(w / 2 - 3, y + 8, 6, 8); } var e1 = g.createLinearGradient(0, 0, 9, 0); e1.addColorStop(0, '#303030'); e1.addColorStop(1, 'rgba(192,192,192,0)'); g.fillStyle = e1; g.fillRect(0, 0, 9, h);
var e2 = g.createLinearGradient(w - 9, 0, w, 0); e2.addColorStop(0, 'rgba(192,192,192,0)'); e2.addColorStop(1, '#303030'); g.fillStyle = e2; g.fillRect(w - 9, 0, 9, h);
g.fillStyle = '#e8e8e8'; g.fillRect(11, 0, 3, h); g.fillRect(w - 14, 0, 3, h); }, null, 4, 1);
T.whBeam = hmTexSet(512, 32, function (g, w, h) { g.fillStyle = '#e06528'; g.fillRect(0, 0, w, h); var r = vgRnd(14); for (var k = 0; k < 60; k++) { g.fillStyle = 'rgba(' + (r() < 0.5 ? '40,40,40' : '230,220,210') + ',' + (0.1 + 0.25 * r()).toFixed(2) + ')'; g.fillRect(r() * w, h * 0.2 + r() * h * 0.5, 2 + r() * 14, 1 + r() * 2); } g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(0, 2, w, 2); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, h - 4, w, 4); },
function (g, w, h) { var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#606060'); gr.addColorStop(0.15, '#ffffff'); gr.addColorStop(0.85, '#ffffff'); gr.addColorStop(1, '#606060'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, null, 4, 1);
T.whWood = hmTexSet(256, 256, function (g, w, h) { var r = vgRnd(21); g.fillStyle = '#3a2a1a'; g.fillRect(0, 0, w, h); for (var y = 0; y < h; y += 43) { var v = 150 + r() * 40 | 0; g.fillStyle = 'rgb(' + v + ',' + (v * 0.78 | 0) + ',' + (v * 0.52 | 0) + ')'; g.fillRect(0, y + 3, w, 37); for (var k = 0; k < 14; k++) { g.strokeStyle = 'rgba(90,60,30,' + (0.08 + 0.15 * r()).toFixed(2) + ')'; g.lineWidth = 1; g.beginPath(); var yy = y + 5 + r() * 32; g.moveTo(0, yy); g.bezierCurveTo(w / 3, yy + r() * 6 - 3, 2 * w / 3, yy + r() * 6 - 3, w, yy); g.stroke(); } } vgSpeckle(g, w, h, vgRnd(22), 900, 0.5, 2.5, ['rgba(40,30,20,A)'], 0.1, 0.3); for (var n = 0; n < 6; n++) { g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(20 + r() * (w - 40), 10 + Math.floor(r() * 6) * 43 + 10, 2.5, 0, 6.3); g.fill(); } },
function (g, w, h) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); for (var y = 0; y < h; y += 43) { g.fillStyle = '#202020'; g.fillRect(0, y, w, 3); } }, null, 6, 1.2);
var flScuff = (function () { var r = vgRnd(36), out = []; for (var k = 0; k < 260; k++) out.push({ x: r(), y: r(), a: r() * 6.3, ln: (20 + r() * 160) / 1024, lw: 1 + r() * 3, al: 0.01 + 0.025 * r(), deep: r() }); return out; })();
var flScuffDraw = function (g, w, h, col) { flScuff.forEach(function (q) { g.strokeStyle = col(q); g.lineWidth = q.lw * (col.wide || 1); g.lineCap = 'round'; g.beginPath(); g.moveTo(q.x * w, q.y * h); g.lineTo(q.x * w + Math.cos(q.a) * q.ln * w, q.y * h + Math.sin(q.a) * q.ln * h); g.stroke(); }); };
T.whFloor = hmTexSet(1024, 1024, function (g, w, h) {
g.fillStyle = '#44525f'; g.fillRect(0, 0, w, h); var r = vgRnd(31);
for (var k = 0; k < 120; k++) { var x = r() * w, y = r() * h, rr = 60 + r() * 260, gr = g.createRadialGradient(x, y, 0, x, y, rr); var dk = r() < 0.5; gr.addColorStop(0, dk ? 'rgba(30,38,46,0.10)' : 'rgba(120,135,150,0.07)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); }
flScuffDraw(g, w, h, function (q) { return 'rgba(190,200,210,' + q.al.toFixed(3) + ')'; });
vgSpeckle(g, w, h, vgRnd(32), 18000, 0.4, 1.2, ['rgba(25,30,36,A)', 'rgba(150,165,180,A)'], 0.04, 0.14);
g.fillStyle = 'rgba(20,24,28,0.6)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);
}, function (g, w, h) { g.fillStyle = '#202020'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h); vgSpeckle(g, w, h, vgRnd(34), 8000, 0.4, 1.0, ['rgba(0,0,0,A)', 'rgba(255,255,255,A)'], 0.03, 0.1); },
function (g, w, h) { g.fillStyle = '#4a4a4a'; g.fillRect(0, 0, w, h); var r = vgRnd(35); for (var k = 0; k < 80; k++) { var x = r() * w, y = r() * h, rr = 80 + r() * 260, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, r() < 0.6 ? 'rgba(20,20,20,0.3)' : 'rgba(200,200,200,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); }
var wide = function (q) { return 'rgba(235,235,235,' + (0.35 + 0.5 * q.deep).toFixed(2) + ')'; }; wide.wide = 2.2; flScuffDraw(g, w, h, wide);
vgSpeckle(g, w, h, vgRnd(37), 6000, 0.4, 1.4, ['rgba(255,255,255,A)'], 0.08, 0.3); }, 2, 0.3);
T.whBrick = (function () {
var W = 1024, Hh = 1024, bw = 256, bh = 128, jt = 4, r = vgRnd(61), tone = {};
var key = function (row, col) { return row + ':' + col; };
var colAt = function (x, y) { var row = Math.floor(y / bh), off = row % 2 ? bw / 2 : 0, col = Math.floor((x + off) / bw); return [row, col, (x + off) - col * bw, y - row * bh]; };
var col = function (g, w, h) {
var im = g.createImageData(w, h), D = im.data, rr = vgRnd(62);
for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
var c = colAt(x, y), k = key(c[0], c[1]); if (tone[k] == null) tone[k] = (r() - 0.5) * 14;
var lx = c[2], ly = c[3], edge = Math.min(lx, bw - lx, ly, bh - ly), v;
if (edge < jt / 2) v = 128 + (rr() - 0.5) * 12;                                   // (the joint: darker, rough)
else {
v = 186 + tone[k] + (rr() - 0.5) * 22;
var q = rr(); if (q < 0.035) v += 40 + rr() * 30; else if (q < 0.07) v -= 45 + rr() * 30;
if (edge < jt / 2 + 3) v -= (jt / 2 + 3 - edge) * 5;                              // (the arris, a little worn)
}
var i = 4 * (y * w + x); D[i] = v - 2; D[i + 1] = v; D[i + 2] = v + 3; D[i + 3] = 255;
}
g.putImageData(im, 0, 0);
var gr = vgRnd(63); for (var s2 = 0; s2 < 30; s2++) { var x0 = gr() * w, y0 = gr() * h, rad = 30 + gr() * 120, gg = g.createRadialGradient(x0, y0, 0, x0, y0, rad); gg.addColorStop(0, 'rgba(70,70,70,' + (0.03 + 0.05 * gr()).toFixed(3) + ')'); gg.addColorStop(1, 'rgba(70,70,70,0)'); g.fillStyle = gg; g.fillRect(x0 - rad, y0 - rad, 2 * rad, 2 * rad); }
};
var hgt = function (g, w, h) {
var im = g.createImageData(w, h), D = im.data, rr = vgRnd(64);
for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
var c = colAt(x, y), edge = Math.min(c[2], bw - c[2], c[3], bh - c[3]);
var v = edge < jt / 2 ? 40 : edge < jt / 2 + 4 ? 40 + (edge - jt / 2) * 45 : 220 + (rr() - 0.5) * 30;
var i = 4 * (y * w + x); D[i] = D[i + 1] = D[i + 2] = v; D[i + 3] = 255;
}
g.putImageData(im, 0, 0);
};
return hmTexSet(W, Hh, col, hgt, function (g, w, h) { g.fillStyle = '#e0e0e0'; g.fillRect(0, 0, w, h); }, 3, 1.1);
})();
T.whGuard = vgTex(512, 512, function (g, w, h) {
var r = vgRnd(71); g.fillStyle = '#f0c12e'; g.fillRect(0, 0, w, h); noise(g, w, h, 72, 5000, 0.06, ['rgba(140,100,20,A)', 'rgba(255,245,200,A)']);
for (var k = 0; k < 70; k++) { var y = h * (0.15 + 0.8 * r()), x = r() * w, L = 15 + r() * 160; g.strokeStyle = r() < 0.55 ? 'rgba(70,60,45,' + (0.12 + 0.3 * r()).toFixed(2) + ')' : 'rgba(255,252,235,' + (0.25 + 0.35 * r()).toFixed(2) + ')'; g.lineWidth = 0.5 + r() * 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + L, y + (r() - 0.5) * 2); g.stroke(); }
for (k = 0; k < 14; k++) { var cx = r() * w, cy = h * (0.4 + 0.55 * r()), rx = 4 + r() * 14, ry = 1.5 + r() * 4; g.fillStyle = 'rgba(80,70,55,' + (0.15 + 0.25 * r()).toFixed(2) + ')'; g.beginPath(); g.ellipse(cx, cy, rx, ry, (r() - 0.5) * 0.2, 0, 6.3); g.fill(); g.fillStyle = 'rgba(170,170,165,' + (0.35 * r()).toFixed(2) + ')'; g.beginPath(); g.ellipse(cx + 1, cy, rx * 0.5, ry * 0.4, 0, 0, 6.3); g.fill(); }
var gr = g.createLinearGradient(0, h * 0.85, 0, h); gr.addColorStop(0, 'rgba(40,36,30,0)'); gr.addColorStop(1, 'rgba(40,36,30,0.28)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
T.whBoard = vgTex(256, 256, function (g, w, h) { g.fillStyle = '#8e9398'; g.fillRect(0, 0, w, h); vgSpeckle(g, w, h, vgRnd(73), 2500, 0.5, 2.0, ['rgba(60,64,70,A)', 'rgba(190,195,200,A)'], 0.1, 0.35); });
T.whHatchV = vgTex(32, 128, function (g, w, h) { g.fillStyle = '#f2c230'; g.fillRect(0, 0, w, h); g.fillStyle = '#17191c'; for (var y = -w; y < h + w; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(0, y + 16); g.lineTo(w, y + 16 + w); g.lineTo(w, y + w); g.fill(); } });
return T;
}
function hmPalletGeo() {
if (HM.palGeo) return HM.palGeo;
var parts = [];
for (var i = 0; i < 7; i++) parts.push([1.2, 0.022, 0.1, 0, 0.133, -0.45 + i * 0.15]);
[-0.55, 0, 0.55].forEach(function (x) { parts.push([0.1, 0.022, 1.0, x, 0.111, 0]); });
[-0.55, 0, 0.55].forEach(function (x) { [-0.43, 0, 0.43].forEach(function (z) { parts.push([0.1, 0.078, 0.14, x, 0.061, z]); }); });
[-0.43, 0, 0.43].forEach(function (z) { parts.push([1.2, 0.022, 0.14, 0, 0.011, z]); });
var pos = [], nor = [], uv = [];
parts.forEach(function (q) {
var bg = new THREE.BoxGeometry(q[0], q[1], q[2]).toNonIndexed(); bg.translate(q[3], q[4], q[5]);
var P = bg.attributes.position.array, N = bg.attributes.normal.array, U = bg.attributes.uv.array;
for (var k = 0; k < P.length; k++) { pos.push(P[k]); nor.push(N[k]); }
for (k = 0; k < U.length; k += 2) uv.push(U[k] * Math.max(q[0], q[2]) / 1.2, U[k + 1] * 0.16);
});
var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
return (HM.palGeo = geo);
}
function hmWarehouse(g, C) {
var T = hmWhTex(), H = C.hall, R = vgRnd(77), WH = HM.wh = { doors: [], beacons: [], window: null, actors: {}, rings: [], pools: [], cones: [], panes: [], g: g, litState: null };
var mat = function (o) { return hmPbr(new THREE.MeshStandardMaterial(o)); };
var box = function (x0, x1, y0, y1, z0, z1, m, cast) {
var b = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.01, x1 - x0), Math.max(0.01, z1 - z0), Math.max(0.01, y1 - y0)), m);
b.position.set((x0 + x1) / 2, (z0 + z1) / 2, -(y0 + y1) / 2); b.castShadow = cast !== false; b.receiveShadow = true; g.add(b); return b;
};
var rep = function (t, u, v) { var c = t.clone(); c.userData = t.userData; c.needsUpdate = true; c.repeat.set(u, v); return c; };
if (HM.hall) HM.hall.visible = false;
if (HM.baseFloor) HM.baseFloor.visible = false;
scene.background = new THREE.Color(0xbcc1c6); scene.fog = new THREE.FogExp2(0xbcc1c6, 0.009);
hemi.intensity = 0.32; hemi.color.set(0xf2f5f8); hemi.groundColor.set(0x1c2126);
if (!WH.fill) { WH.fill = new THREE.DirectionalLight(0xf4f6ff, 0.3); WH.fill.position.set(-12, 14, 9); g.add(WH.fill); }
if (HM.rim) HM.rim.intensity = 0.35;
sun.color.set(0xfff6ea); sun.intensity = 2.9; HM.keyOff = new THREE.Vector3(2.5, 16, 3.5);
if (sun.castShadow) { var shc = sun.shadow.camera, shr = Math.max(H.x1 - H.x0, H.y1 - H.y0) / 2 + 3; shc.left = -shr; shc.right = shr; shc.top = shr; shc.bottom = -shr; shc.near = 1; shc.far = 50; shc.updateProjectionMatrix(); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.025; sun.shadow.radius = 3; if (sun.shadow.mapSize.x !== 3072) { sun.shadow.mapSize.set(3072, 3072);
if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } } }
renderer.toneMappingExposure = 0.92;
var Hh = H.height || 9, cx = (H.x0 + H.x1) / 2, cy = (H.y0 + H.y1) / 2, Lx = H.x1 - H.x0, Ly = H.y1 - H.y0;
var panelM = function (u, v) { return mat({ map: rep(T.whPanel, u, v), roughness: 0.45, metalness: 0.35, side: THREE.DoubleSide }); };
var concM = function (u) { return mat({ map: rep(T.whConcrete, u, 1.5), roughness: 0.92 }); }, panel = panelM(1, 1), conc = concM(1), HB = 3.2;
var brickM = function (along, ht) { return mat({ map: rep(T.whBrick, along / 1.6, ht / 1.6), roughness: 0.88 }); };
var fl = new THREE.Mesh(new THREE.PlaneGeometry(Lx, Ly), new THREE.MeshStandardMaterial({ map: rep(T.whFloor, Lx / 6, Ly / 6), roughness: 0.42, metalness: 0, envMapIntensity: 0.45 }));
hmPbr(fl.material); fl.rotation.x = -Math.PI / 2; fl.position.set(cx, 0.0015, -cy); fl.receiveShadow = true; g.add(fl);
var wc = document.createElement('canvas'); wc.width = 2048; wc.height = Math.round(2048 * Ly / Lx); var wg = wc.getContext('2d'), wr = vgRnd(41), PX = function (x) { return (x - H.x0) / Lx * wc.width; }, PY = function (y) { return (H.y1 - y) / Ly * wc.height; };
[-2.6].concat((C.aisles || [{ y: 4.5 }, { y: 9.7 }, { y: 14.9 }]).map(function (q) { return q.y; })).forEach(function (yy) { for (var k = 0; k < 6; k++) { wg.strokeStyle = 'rgba(150,165,180,' + (0.025 + 0.04 * wr()).toFixed(3) + ')'; wg.lineWidth = 3 + wr() * 4; wg.beginPath(); var off = (wr() - 0.5) * 1.6; wg.moveTo(PX(H.x0 + 1), PY(yy + off)); for (var x = H.x0 + 1; x < 26; x += 3) wg.lineTo(PX(x), PY(yy + off + (wr() - 0.5) * 0.3)); wg.stroke(); } });
for (var st_ = 0; st_ < 40; st_++) { var sx_ = H.x0 + wr() * Lx, sy_ = H.y0 + wr() * Ly, rr_ = 3 + wr() * 14, gr_ = wg.createRadialGradient(PX(sx_), PY(sy_), 0, PX(sx_), PY(sy_), rr_); gr_.addColorStop(0, 'rgba(14,18,22,' + (0.08 + 0.14 * wr()).toFixed(2) + ')'); gr_.addColorStop(1, 'rgba(14,18,22,0)'); wg.fillStyle = gr_; wg.fillRect(PX(sx_) - rr_, PY(sy_) - rr_, 2 * rr_, 2 * rr_); }
(C.docks || []).forEach(function (d) { var gr2 = wg.createRadialGradient(PX(d.x), PY(H.y0), 0, PX(d.x), PY(H.y0), 90); gr2.addColorStop(0, 'rgba(35,30,24,0.28)'); gr2.addColorStop(1, 'rgba(35,30,24,0)'); wg.fillStyle = gr2; wg.fillRect(PX(d.x) - 90, PY(H.y0) - 90, 180, 90); });
var wt = new THREE.CanvasTexture(wc); wt.colorSpace = THREE.SRGBColorSpace; wt.anisotropy = 8;
(function () {
var rc = document.createElement('canvas'); rc.width = wc.width; rc.height = wc.height;
var src = wg.getImageData(0, 0, wc.width, wc.height).data, rg = rc.getContext('2d'), im = rg.createImageData(wc.width, wc.height), D = im.data;
for (var i = 0; i < D.length; i += 4) { var v = Math.min(255, src[i + 3] * 3.2); D[i] = D[i + 1] = D[i + 2] = v; D[i + 3] = 255; }
rg.putImageData(im, 0, 0);
var wr_ = new THREE.CanvasTexture(rc); wr_.anisotropy = 4;
fl.material.onBeforeCompile = function (sh) {
sh.uniforms.uWearR = { value: wr_ }; sh.uniforms.uHall = { value: new THREE.Vector2(Lx, Ly) };
sh.vertexShader = 'uniform vec2 uHall; varying vec2 vHallUv;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vHallUv = position.xy / uHall + 0.5;');
sh.fragmentShader = 'uniform sampler2D uWearR; varying vec2 vHallUv;\n' + sh.fragmentShader.replace('#include <roughnessmap_fragment>',
'#include <roughnessmap_fragment>\n  { float wr = texture2D(uWearR, vHallUv).g; roughnessFactor = clamp(roughnessFactor + wr * 0.45, 0.0, 1.0); }');
};
fl.material.customProgramCacheKey = function () { return 'wh-floor-wear'; };
fl.material.needsUpdate = true;
})();
var wear = new THREE.Mesh(new THREE.PlaneGeometry(Lx, Ly), new THREE.MeshStandardMaterial({ map: wt, transparent: true, roughness: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
wear.rotation.x = -Math.PI / 2; wear.position.set(cx, 0.002, -cy); wear.receiveShadow = true; wear.renderOrder = 1; g.add(wear);
WH.floor = fl; WH.wear = wear;
try {
var es = new THREE.Scene(); es.background = new THREE.Color(0x8d949b);
var room = new THREE.Mesh(new THREE.BoxGeometry(Lx, Hh, Ly), new THREE.MeshBasicMaterial({ color: 0xb4bac0, side: THREE.BackSide })); room.position.set(0, Hh / 2, 0); es.add(room);
var efl = new THREE.Mesh(new THREE.PlaneGeometry(Lx, Ly), new THREE.MeshBasicMaterial({ color: 0x3a4651 })); efl.rotation.x = -Math.PI / 2; efl.position.y = 0.01; es.add(efl);
var elm = new THREE.MeshBasicMaterial({ color: new THREE.Color(12, 11.5, 10.5) });
for (var ex = -Lx / 2 + 3; ex < Lx / 2; ex += 6) for (var ez = -Ly / 2 + 2.5; ez < Ly / 2; ez += 5) { var lb = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.35), elm); lb.position.set(ex, Hh - 1.2, ez); es.add(lb); }
var orM = new THREE.MeshBasicMaterial({ color: 0xf0901c }), grM = new THREE.MeshBasicMaterial({ color: 0x3a7de4 }), cbM = new THREE.MeshBasicMaterial({ color: 0x9c7348 });
(C.racks || []).forEach(function (r) {
var ox = -cx, oz = cy, len = r.x1 - r.x0, xm = (r.x0 + r.x1) / 2 + ox, zm = -(r.y0 + r.y1) / 2 + oz;
var body = new THREE.Mesh(new THREE.BoxGeometry(len, 7.4, r.y1 - r.y0 - 0.2), cbM); body.position.set(xm, 3.9, zm); es.add(body);
for (var lv = 1; lv <= 4; lv++) [r.y0, r.y1].forEach(function (yy) { var bm = new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, 0.08), orM); bm.position.set(xm, lv * 1.86, -yy + oz); es.add(bm); });
for (var ux = r.x0; ux <= r.x1 + 0.01; ux += 2.7) [r.y0, r.y1].forEach(function (yy) { var um = new THREE.Mesh(new THREE.BoxGeometry(0.1, 8, 0.1), grM); um.position.set(ux + ox, 4, -yy + oz); es.add(um); });
});
if (HM.envRT) HM.envRT.dispose(); HM.envRT = pmrem.fromScene(es, 0.02); scene.environment = HM.envRT.texture; scene.environmentIntensity = 0.6;
} catch (e) { }
var walls = [[H.x0, H.x1, H.y0 - 0.3, H.y0, 'S'], [H.x0, H.x1, H.y1, H.y1 + 0.3, 'N'], [H.x0 - 0.3, H.x0, H.y0, H.y1, 'W'], [H.x1, H.x1 + 0.3, H.y0, H.y1, 'E']];
walls.forEach(function (w) {
var along = w[4] === 'S' || w[4] === 'N' ? Lx : Ly;
if (w[4] === 'S') {
var xs = [H.x0]; (C.docks || []).forEach(function (d) { xs.push(d.x - d.w / 2, d.x + d.w / 2); }); xs.push(H.x1);
for (var i = 0; i < xs.length; i += 2) { box(xs[i], xs[i + 1], w[2], w[3], 0, HB, brickM(xs[i + 1] - xs[i], HB)); box(xs[i], xs[i + 1], w[2], w[3], HB, Hh, panelM((xs[i + 1] - xs[i]) / 1, (Hh - HB) / 3)); }
(C.docks || []).forEach(function (d) { box(d.x - d.w / 2, d.x + d.w / 2, w[2], w[3], 3.6, Hh, panelM(d.w, (Hh - 3.6) / 3)); });
} else { box(w[0], w[1], w[2], w[3], 0, HB, brickM(along, HB)); box(w[0], w[1], w[2], w[3], HB, Hh, panelM(along, (Hh - HB) / 3)); }
});
var shadeT = T.whShade || (T.whShade = vgTex(256, 256, function (g2, w, h) {
var gr = g2.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(12,14,18,0.6)'); gr.addColorStop(0.5, 'rgba(12,14,18,0.14)'); gr.addColorStop(0.92, 'rgba(12,14,18,0.02)'); gr.addColorStop(1, 'rgba(12,14,18,0.3)'); g2.fillStyle = gr; g2.fillRect(0, 0, w, h);
var gx = g2.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(12,14,18,0.35)'); gx.addColorStop(0.1, 'rgba(12,14,18,0)'); gx.addColorStop(0.9, 'rgba(12,14,18,0)'); gx.addColorStop(1, 'rgba(12,14,18,0.35)'); g2.fillStyle = gx; g2.fillRect(0, 0, w, h);
}));
shadeT.wrapS = shadeT.wrapT = THREE.ClampToEdgeWrapping;
[[(H.x0 + H.x1) / 2, H.y0 + 0.02, Lx, Math.PI], [(H.x0 + H.x1) / 2, H.y1 - 0.02, Lx, 0], [H.x0 + 0.02, (H.y0 + H.y1) / 2, Ly, Math.PI / 2], [H.x1 - 0.02, (H.y0 + H.y1) / 2, Ly, -Math.PI / 2]].forEach(function (q) {
var pl = new THREE.Mesh(new THREE.PlaneGeometry(q[2], Hh), new THREE.MeshBasicMaterial({ map: shadeT, transparent: true, depthWrite: false })); pl.position.set(q[0], Hh / 2, -q[1]); pl.rotation.y = q[3]; pl.renderOrder = 2; g.add(pl);
});
var steel = mat({ color: 0x6b737c, roughness: 0.5, metalness: 0.5 }), dark = mat({ color: 0x2a2f36, roughness: 0.7, metalness: 0.4 }), truss = mat({ color: 0x8a9199, roughness: 0.6, metalness: 0.5 });
for (var x = H.x0; x <= H.x1 + 1e-6; x += 6) [H.y0 + 0.15, H.y1 - 0.15].forEach(function (y) { box(x - 0.15, x + 0.15, y - 0.12, y + 0.12, 0, Hh, steel); });
for (var y = H.y0 + 5; y < H.y1; y += 5) [H.x0 + 0.15, H.x1 - 0.15].forEach(function (xx) { box(xx - 0.12, xx + 0.12, y - 0.15, y + 0.15, 0, Hh, steel); });
var roof = new THREE.Mesh(new THREE.PlaneGeometry(Lx + 1, Ly + 1), mat({ color: 0xc5cacf, roughness: 0.9, side: THREE.DoubleSide })); roof.rotation.x = Math.PI / 2; roof.position.set(cx, Hh + 0.6, -cy); g.add(roof);
for (x = H.x0; x <= H.x1 + 1e-6; x += 6) { box(x - 0.08, x + 0.08, H.y0, H.y1, Hh - 0.05, Hh + 0.55, truss, false); box(x - 0.05, x + 0.05, H.y0, H.y1, Hh - 0.8, Hh - 0.7, truss, false); }
var poolT = T.whPool || (T.whPool = vgTex(128, 128, function (g2, w, h) { var gr = g2.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,236,205,0.55)'); gr.addColorStop(0.5, 'rgba(255,236,205,0.18)'); gr.addColorStop(1, 'rgba(255,236,205,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, w, h); }));
var poolM = new THREE.MeshBasicMaterial({ map: poolT, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
var lampM = new THREE.MeshBasicMaterial({ color: new THREE.Color(4.2, 3.9, 3.4) }), lampG = new THREE.CylinderGeometry(0.32, 0.4, 0.12, 20), houseG = new THREE.CylinderGeometry(0.42, 0.42, 0.22, 20);
var CN = 16, CL = 5.2, CA = 0.4, coneMs = [];
for (var ci = 0; ci < CN; ci++) { var cu = ci / (CN - 1); coneMs.push(new THREE.SpriteMaterial({ map: T_whBeam(), color: 0xfff0d8, transparent: true, opacity: 0.13 * Math.pow(1 - cu, 1.1) + 0.006, blending: THREE.AdditiveBlending, depthWrite: false })); }
for (x = H.x0 + 3; x < H.x1; x += 6) for (y = H.y0 + 2.5; y < H.y1; y += 5) {
for (ci = 0; ci < CN; ci++) { var cu2 = ci / (CN - 1), al_ = 0.15 + cu2 * CL, dia_ = 2 * (0.3 + al_ * Math.tan(CA)), cs = new THREE.Sprite(coneMs[ci]); cs.position.set(x, Hh - 1.3 - al_, -y); cs.scale.set(dia_, dia_, 1); cs.renderOrder = 7; g.add(cs); WH.cones.push(cs); }
var hs = new THREE.Mesh(houseG, dark); hs.position.set(x, Hh - 1.1, -y); g.add(hs);
var lm = new THREE.Mesh(lampG, lampM); lm.position.set(x, Hh - 1.25, -y); g.add(lm);
if (hmCourseH(x, y) < 0.3) { var pool = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), poolM); pool.rotation.x = -Math.PI / 2; pool.position.set(x, 0.003, -y); pool.renderOrder = 2; g.add(pool); WH.pools.push(pool); }
}
WH.lampM = lampM;
var yl = new THREE.MeshBasicMaterial({ color: 0xe8b923, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }), wl = new THREE.MeshBasicMaterial({ color: 0xc9d0d6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
if (!T.whPaint) T.whPaint = vgTex(1024, 48, function (g, w, h) {
var r = vgRnd(77); g.fillStyle = '#e3b21a'; g.fillRect(0, 0, w, h);
vgBlobs(g, w, h, r, 90, 8, 40, ['rgba(255,214,90,A)', 'rgba(170,120,20,A)', 'rgba(120,100,70,A)'], 0.06, 0.2);
vgSpeckle(g, w, h, r, 2600, 0.4, 1.4, ['rgba(70,60,40,A)', 'rgba(255,240,180,A)'], 0.1, 0.4);
for (var k = 0; k < 70; k++) { g.strokeStyle = 'rgba(40,36,30,' + (0.06 + 0.16 * r()).toFixed(3) + ')'; g.lineWidth = 1 + 4 * r(); var x = r() * w, len = 20 + 140 * r(); g.beginPath(); g.moveTo(x, r() * h); g.lineTo(x + len * (r() - 0.3), r() * h); g.stroke(); }
g.globalCompositeOperation = 'destination-out';
for (k = 0; k < 140; k++) { var cx = r() * w, cy = r() < 0.5 ? r() * 6 : h - r() * 6, rr = 1.5 + 5 * r(); g.fillStyle = 'rgba(0,0,0,' + (0.5 + 0.5 * r()).toFixed(2) + ')'; g.beginPath(); g.ellipse(cx, cy, rr * (1 + 2 * r()), rr, r() * 3, 0, 6.3); g.fill(); }
for (k = 0; k < 9; k++) { var px = r() * w, pw = 25 + 110 * r(), gr = g.createRadialGradient(px, h / 2, 0, px, h / 2, pw); gr.addColorStop(0, 'rgba(0,0,0,' + (0.35 + 0.45 * r()).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.save(); g.scale(1, 0.35); g.fillRect(px - pw, (h / 2) / 0.35 - pw, 2 * pw, 2 * pw); g.restore(); }
vgSpeckle(g, w, h, r, 900, 0.5, 2.2, ['rgba(0,0,0,A)'], 0.5, 1);
g.globalCompositeOperation = 'source-over';
});
var paint = function (len, along) { var t = T.whPaint.clone(); t.needsUpdate = true; t.center.set(0.5, 0.5); if (along) { t.rotation = Math.PI / 2; } t.repeat.set(Math.max(1, len / 3), 1); return new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.55, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }); };
var strip = function (x0, x1, y0, y1, m) { var lx_ = Math.max(0.02, x1 - x0), ly_ = Math.max(0.02, y1 - y0); if (!m || m === wl) m = paint(Math.max(lx_, ly_), ly_ > lx_); var s = new THREE.Mesh(new THREE.PlaneGeometry(lx_, ly_), m); s.rotation.x = -Math.PI / 2; s.position.set((x0 + x1) / 2, 0.004, -(y0 + y1) / 2); s.renderOrder = 1; s.receiveShadow = true; g.add(s); return s; };
(C.racks || []).forEach(function (r) {
if (r.axis === 'y') { strip(r.x1 + 0.28, r.x1 + 0.36, r.y0 - 0.3, r.y1 + 0.3); return; }
strip(r.x0 - 0.3, r.x1 + 0.3, r.y0 - 0.36, r.y0 - 0.28); strip(r.x0 - 0.3, r.x1 + 0.3, r.y1 + 0.28, r.y1 + 0.36);
});
var hatch = new THREE.MeshBasicMaterial({ map: rep(T.whHatch, 6, 1), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
(C.docks || []).forEach(function (d, i) {
strip(d.x - d.w / 2 - 0.1, d.x - d.w / 2, H.y0, H.y0 + 3.2); strip(d.x + d.w / 2, d.x + d.w / 2 + 0.1, H.y0, H.y0 + 3.2);
var hb = strip(d.x - d.w / 2, d.x + d.w / 2, H.y0 + 0.05, H.y0 + 0.5, hatch); hb.material = hatch;
var door = box(d.x - d.w / 2, d.x + d.w / 2, H.y0 - 0.22, H.y0 - 0.12, 0, 3.6, mat({ map: rep(T.whDoor, 1.5, 2), roughness: 0.5, metalness: 0.4 }));
WH.doors.push({ m: door, x: d.x, z0: door.position.z });
box(d.x - d.w / 2 - 0.15, d.x - d.w / 2, H.y0 - 0.1, H.y0 + 0.05, 0, 3.7, mat({ map: rep(T.whHatchV, 1, 3.7 / 0.6), roughness: 0.6 }));
box(d.x + d.w / 2, d.x + d.w / 2 + 0.15, H.y0 - 0.1, H.y0 + 0.05, 0, 3.7, mat({ map: rep(T.whHatchV, 1, 3.7 / 0.6), roughness: 0.6 }));
box(d.x - d.w / 2 - 0.15, d.x + d.w / 2 + 0.15, H.y0 - 0.1, H.y0 + 0.05, 3.6, 3.8, dark);
box(d.x - 1.0, d.x + 1.0, H.y0, H.y0 + 1.8, 0, 0.012, mat({ map: rep(T.whPlate, 7, 6), roughness: 0.45, metalness: 0.7 }), false);
var lt = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: 0x33dd66 })); lt.position.set(d.x + d.w / 2 + 0.45, 2.2, -(H.y0 + 0.05)); g.add(lt);
var nc = document.createElement('canvas'); nc.width = 128; nc.height = 128; var c2 = nc.getContext('2d'); c2.fillStyle = '#1d4e89'; c2.fillRect(0, 0, 128, 128); c2.fillStyle = '#fff'; c2.font = '700 92px Inter, Arial'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText(String(i + 1), 64, 70);
var nt = new THREE.CanvasTexture(nc); nt.colorSpace = THREE.SRGBColorSpace;
var ns = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshStandardMaterial({ map: nt, roughness: 0.6 })); ns.position.set(d.x, 4.4, -(H.y0 + 0.02)); g.add(ns);
});
var up = [], beams = [], conns = [], decks = [], braces = [], pals = [], guards = [], loads = [[], [], [], []], signs = [], CT = T.whCartons || [T.whCarton];
var SIZES = [[0.6, 0.4, 0.4], [0.5, 0.48, 0.38], [0.4, 0.3, 0.3], [0.55, 0.45, 0.33], [0.38, 0.38, 0.48], [0.3, 0.24, 0.24], [0.8, 0.6, 0.45]];
var stack = function (px, py, z0, lim, yaw0) {
var sz = SIZES[Math.floor(R() * SIZES.length)], kind = R() < 0.45 ? 0 : R() < 0.55 ? 1 : R() < 0.5 ? 3 : 2;
var swap = R() < 0.5, cw = swap ? sz[1] : sz[0], cd = swap ? sz[0] : sz[1], ch = sz[2];
var nx = Math.max(1, Math.floor(1.16 / (cw + 0.01))), ny = Math.max(1, Math.floor(0.98 / (cd + 0.01))), nz = Math.max(1, Math.min(4, Math.floor(lim / ch)));
if (R() < 0.12) nz = 1;
var c0 = Math.cos(yaw0), s0 = Math.sin(yaw0), gx = (nx - 1) * (cw + 0.01) / 2, gy = (ny - 1) * (cd + 0.01) / 2;
for (var k = 0; k < nz; k++) for (var i = 0; i < nx; i++) for (var j = 0; j < ny; j++) {
if (k === nz - 1 && nz > 1 && R() < 0.28) continue;
var lx = i * (cw + 0.01) - gx + (R() - 0.5) * 0.03, ly = j * (cd + 0.01) - gy + (R() - 0.5) * 0.03;
var kk = R() < 0.12 ? (kind + 1) % CT.length : kind;
loads[kk].push([px + lx * c0 - ly * s0, py + lx * s0 + ly * c0, z0 + k * ch, cw - 0.006, cd - 0.006, ch - 0.004, yaw0 + (R() - 0.5) * 0.07, 0.86 + R() * 0.18]);
}
};
var signN = 0;
(C.racks || []).forEach(function (r, ri) {
var Yr = r.axis === 'y', rot = Yr ? Math.PI / 2 : 0, X0 = Yr ? r.y0 : r.x0, X1 = Yr ? r.y1 : r.x1, Y0 = Yr ? -r.x1 : r.y0, Y1 = Yr ? -r.x0 : r.y1;
var w2 = function (lx, ly) { return Yr ? [-ly, lx] : [lx, ly]; };
var L = X1 - X0, nb = Math.max(1, Math.round(L / (r.bay || 2.7))), bw = L / nb, lv = r.levels || 4, top = Math.min(r.height || 8, Hh - 1.2), lh = top / (lv + 0.3);
var rows = r.single ? [[Y0, Y1]] : [[Y0, Y0 + (Y1 - Y0) / 2 - 0.1], [Y0 + (Y1 - Y0) / 2 + 0.1, Y1]];
rows.forEach(function (row, rw) {
var cyl = (row[0] + row[1]) / 2;
for (var b = 0; b <= nb; b++) {
var xb = X0 + b * bw;
[row[0], row[1]].forEach(function (yy) { var p_ = w2(xb, yy); up.push([p_[0], p_[1], top]); });
var dep = row[1] - row[0], nzz = Math.max(3, Math.round(top / 1.4)), sh = top / nzz, pc = w2(xb, cyl);
[0.15, top - 0.1].forEach(function (zz) { braces.push([pc[0], pc[1], zz, dep, 0, rot]); });
for (var q = 0; q < nzz; q++) { var za = q * sh + 0.15, zb = Math.min(top - 0.1, (q + 1) * sh + 0.15), ln = Math.hypot(dep, zb - za); braces.push([pc[0], pc[1], (za + zb) / 2, ln, (q % 2 ? 1 : -1) * Math.atan2(zb - za, dep), rot]); }
}
for (var l = 0; l <= lv; l++) {
var zl = l === 0 ? 0 : l * lh;
if (l > 0) for (b = 0; b < nb; b++) {
[row[0], row[1]].forEach(function (yy) { var pm = w2(X0 + b * bw + bw / 2, yy), pa = w2(X0 + b * bw, yy), pb = w2(X0 + (b + 1) * bw, yy); beams.push([pm[0], pm[1], zl - 0.07, bw - 0.12, rot]); conns.push([pa[0], pa[1], zl - 0.07, rot]); conns.push([pb[0], pb[1], zl - 0.07, rot]); });   // (each beam hooks onto the uprights by a connector round them)
var pd = w2(X0 + b * bw + bw / 2, cyl); decks.push([pd[0], pd[1], zl + 0.004, bw - 0.12, row[1] - row[0] + 0.04, rot]);      // (the deck the pallets stand on)
}
for (b = 0; b < nb; b++) for (var k = 0; k < 2; k++) {
if (R() < 0.14) continue;
var pp_ = w2(X0 + b * bw + bw * (k ? 0.73 : 0.27) + (R() - 0.5) * 0.1, cyl + (R() - 0.5) * 0.08), z0 = zl + (l ? 0.016 : 0), yw = (R() - 0.5) * 0.05 + rot;
pals.push([pp_[0], pp_[1], z0, yw]);
stack(pp_[0], pp_[1], z0 + 0.144, Math.min(lh - 0.35, 0.6 + R() * 1.0), yw);
}
}
[[X0, -1], [X1, 1]].forEach(function (e) {
[row[0], row[1]].forEach(function (yy) { var pg = w2(e[0] + e[1] * 0.09, yy); guards.push([pg[0], pg[1], e[1], rot]); });
signN++; var ps = w2(e[0] + e[1] * 0.07, cyl);
signs.push({ x: ps[0], y: ps[1], z: top - 0.75, face: e[1], rot: rot, n: signN, txt: 'BOXES ' + 'ABCDEFGHJKLMNPRSTUVWXYZ'.charAt((signN * 3) % 23) + '–' + 'ABCDEFGHJKLMNPRSTUVWXYZ'.charAt((signN * 3 + 2) % 23) });
});
});
});
(C.stacks || []).forEach(function (sk) { var yw = (R() - 0.5) * 0.06, sx = sk.x + (R() - 0.5) * 0.08, sy = sk.y + (R() - 0.5) * 0.06; pals.push([sx, sy, 0, yw]); stack(sx, sy, 0.144, Math.max(0.35, sk.h - 0.1), yw); });
(C.pallets || []).forEach(function (pp) { pals.push([pp.x, pp.y, 0, pp.yaw || 0]); if (pp.load > 0) stack(pp.x, pp.y, 0.144, pp.load - 0.1, pp.yaw || 0); });
var inst = function (geo, m, list, set) { var im = new THREE.InstancedMesh(geo, m, Math.max(1, list.length)), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), col = new THREE.Color(); im.count = list.length; list.forEach(function (q, i) { Q.identity(); set(q, P, S, Q, col); M4.compose(P, Q, S); im.setMatrixAt(i, M4); }); im.castShadow = true; im.receiveShadow = true; g.add(im); return im; };
var unit = new THREE.BoxGeometry(1, 1, 1), Yax = new THREE.Vector3(0, 1, 0), Xax = new THREE.Vector3(1, 0, 0), qa = new THREE.Quaternion();
var gloss = function (o) { o.clearcoat = 1; o.clearcoatRoughness = o.clearcoatRoughness || 0.07; return hmPbr(new THREE.MeshPhysicalMaterial(o)); };
var beamGeo = (function () {
var W_ = 0.06, H_ = 0.13, r = 0.014, seg = 5, pr = [];
[[W_ / 2 - r, H_ / 2 - r, 0], [-W_ / 2 + r, H_ / 2 - r, 0.5 * Math.PI], [-W_ / 2 + r, -H_ / 2 + r, Math.PI], [W_ / 2 - r, -H_ / 2 + r, 1.5 * Math.PI]].forEach(function (c) {
for (var k = 0; k <= seg; k++) { var a = c[2] + k / seg * 0.5 * Math.PI; pr.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), Math.cos(a), Math.sin(a)]); }
});
var n = pr.length, pos = [], nor = [], uv = [], idx = [];
for (var e = 0; e < 2; e++) pr.forEach(function (q, k) { pos.push(e - 0.5, q[1], q[0]); nor.push(0, q[3], q[2]); uv.push(e, k / n); });
for (var k = 0; k < n; k++) { var k2 = (k + 1) % n; idx.push(k, n + k, k2, k2, n + k, n + k2); }
var gb = new THREE.BufferGeometry(); gb.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gb.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); gb.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gb.setIndex(idx);
return gb;
})();
inst(unit, gloss({ map: rep(T.whUpright, 1, 15.6), roughness: 0.38, metalness: 0.15, envMapIntensity: 1.6, clearcoatRoughness: 0.09 }), up, function (q, P, S) { P.set(q[0], q[2] / 2, -q[1]); S.set(0.09, q[2], 0.09); });
inst(beamGeo, gloss({ color: 0xf5961a, roughness: 0.36, metalness: 0.1, envMapIntensity: 1.7, clearcoatRoughness: 0.06 }), beams, function (q, P, S, Q) { P.set(q[0], q[2], -q[1]); S.set(q[3], 1, 1); Q.setFromAxisAngle(Yax, q[4] || 0); });
inst(unit, mat({ color: 0xb4bbc1, roughness: 0.28, metalness: 0.85, envMapIntensity: 1.5 }), braces, function (q, P, S, Q) { P.set(q[0], q[2], -q[1]); S.set(0.035, 0.035, q[3]); Q.setFromAxisAngle(Yax, q[5] || 0).multiply(qa.setFromAxisAngle(Xax, q[4])); });
var palGeo = hmPalletGeo();
inst(palGeo, mat({ map: rep(T.whWood, 1, 1), roughness: 0.9 }), pals, function (q, P, S, Q) { P.set(q[0], q[2], -q[1]); S.set(1, 1, 1); Q.setFromAxisAngle(Yax, q[3]); });
loads.forEach(function (list, kk) {
if (!list.length) return;
var li = inst(unit, mat({ map: CT[kk % CT.length], roughness: 0.8, envMapIntensity: 0.8 }), list, function (q, P, S, Q) { P.set(q[0], q[2] + q[5] / 2, -q[1]); S.set(q[3], q[5], q[4]); Q.setFromAxisAngle(Yax, q[6]); });
list.forEach(function (q, i) { li.setColorAt(i, new THREE.Color(q[7], q[7], q[7] * 0.98)); }); if (li.instanceColor) li.instanceColor.needsUpdate = true;
});
var gs = new THREE.Shape(), gw = 0.14, gd = 0.3, gr_ = 0.03;
gs.moveTo(-gw / 2 + gr_, -gd / 2); gs.lineTo(gw / 2 - gr_, -gd / 2); gs.quadraticCurveTo(gw / 2, -gd / 2, gw / 2, -gd / 2 + gr_); gs.lineTo(gw / 2, gd / 2 - gr_); gs.quadraticCurveTo(gw / 2, gd / 2, gw / 2 - gr_, gd / 2);
gs.lineTo(-gw / 2 + gr_, gd / 2); gs.quadraticCurveTo(-gw / 2, gd / 2, -gw / 2, gd / 2 - gr_); gs.lineTo(-gw / 2, -gd / 2 + gr_); gs.quadraticCurveTo(-gw / 2, -gd / 2, -gw / 2 + gr_, -gd / 2);
var gGeo = new THREE.ExtrudeGeometry(gs, { depth: 0.58, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 3, curveSegments: 5 });
gGeo.rotateX(-Math.PI / 2); gGeo.translate(0, 0.015, 0);
var gT = T.whGuard.clone(); gT.needsUpdate = true; gT.repeat.set(1 / 0.88, 1 / 0.62); gT.offset.set(0, 1 - 1 / 0.62 - 0.005);      // (the sides' v runs 1 - height: one picture up the whole side)
gT.wrapS = gT.wrapT = THREE.RepeatWrapping;
inst(gGeo, gloss({ map: gT, roughness: 0.5, metalness: 0.05, envMapIntensity: 1.4, clearcoat: 1, clearcoatRoughness: 0.18 }), guards, function (q, P, S, Q) { P.set(q[0], 0, -q[1]); S.set(1, 1, 1); Q.setFromAxisAngle(Yax, q[3] || 0); });
inst(unit, gloss({ color: 0xf5961a, roughness: 0.38, metalness: 0.1, envMapIntensity: 1.6 }), conns, function (q, P, S, Q) { P.set(q[0], q[2] - 0.02, -q[1]); S.set(0.125, 0.24, 0.115); Q.setFromAxisAngle(Yax, q[3] || 0); });
inst(unit, mat({ map: rep(T.whBoard, 1, 1), roughness: 0.42, metalness: 0.55, envMapIntensity: 1.3 }), decks, function (q, P, S, Q) { P.set(q[0], q[2], -q[1]); S.set(q[3], 0.018, q[4]); Q.setFromAxisAngle(Yax, q[5] || 0); });
signs.forEach(function (sg) {
var cv = document.createElement('canvas'); cv.width = 128; cv.height = 192; var c2 = cv.getContext('2d');
c2.fillStyle = '#121416'; c2.fillRect(0, 0, 128, 192); c2.fillStyle = '#f4f4f2'; c2.fillRect(8, 8, 112, 70); c2.fillStyle = '#121416'; c2.font = '800 60px Inter, Arial'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText((sg.n < 10 ? '0' : '') + sg.n, 64, 46);
c2.strokeStyle = '#f4f4f2'; c2.lineWidth = 3; c2.strokeRect(46, 92, 36, 28); c2.beginPath(); c2.moveTo(46, 100); c2.lineTo(82, 100); c2.stroke();
c2.fillStyle = '#f4f4f2'; c2.font = '800 22px Inter, Arial'; c2.fillText(sg.txt, 64, 150);
var tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
var m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.63), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.5 })); m.position.set(sg.x, sg.z, -sg.y); m.rotation.y = (sg.face > 0 ? Math.PI / 2 : -Math.PI / 2) + (sg.rot || 0); g.add(m);
});
var palM = mat({ map: rep(T.whWood, 1, 1), roughness: 0.9 });
var P_ = C.platform;
if (P_) {
box(P_.x0, P_.x1, P_.y0, P_.y1, 0, P_.h - 0.1, mat({ color: 0x4b525b, roughness: 0.8, metalness: 0.3 }));
var deck = box(P_.x0, P_.x1, P_.y0, P_.y1, P_.h - 0.1, P_.h, mat({ map: rep(T.whPlate, (P_.x1 - P_.x0) / 0.32, (P_.y1 - P_.y0) / 0.32), roughness: 0.4, metalness: 0.7 })); deck.receiveShadow = true;
box(P_.x0 - 0.02, P_.x1, P_.y0 - 0.02, P_.y0, P_.h - 0.25, P_.h + 0.1, mat({ map: T.whHatch, roughness: 0.6 }));
}
var railM = mat({ color: 0xf2c230, roughness: 0.4, metalness: 0.5 });
(C.rails || []).forEach(function (r) {
var z0 = r.z0 != null ? r.z0 : (P_ ? P_.h : 0), alongX = r.x1 - r.x0 > r.y1 - r.y0, L = alongX ? r.x1 - r.x0 : r.y1 - r.y0;
[1.05, 0.55].forEach(function (zz) { if (alongX) box(r.x0, r.x1, r.y0, r.y1, z0 + zz, z0 + zz + 0.05, railM); else box(r.x0, r.x1, r.y0, r.y1, z0 + zz, z0 + zz + 0.05, railM); });
box(r.x0, r.x1, r.y0, r.y1, z0, z0 + 0.12, railM);
for (var s = 0; s <= L + 1e-6; s += 1.2) { var px = alongX ? r.x0 + s : (r.x0 + r.x1) / 2, py = alongX ? (r.y0 + r.y1) / 2 : r.y0 + s; box(px - 0.03, px + 0.03, py - 0.03, py + 0.03, z0, z0 + 1.1, railM); }
});
var O = C.office;
if (O && P_) {
var z0 = P_.h, glass = new THREE.MeshPhysicalMaterial({ color: 0xa8c4d8, roughness: 0.05, metalness: 0, transmission: 0.0, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
var T_gl = T.whGlassStreak || (T.whGlassStreak = vgTex(256, 256, function (g2, w, h) {
g2.fillStyle = '#6a7076'; g2.fillRect(0, 0, w, h);
[[0.32, 0.16, 0.5], [0.62, 0.07, 0.35]].forEach(function (b) { g2.save(); g2.translate(w * b[0], h / 2); g2.rotate(-0.6); var gr = g2.createLinearGradient(-w * b[1], 0, w * b[1], 0); gr.addColorStop(0, 'rgba(235,240,245,0)'); gr.addColorStop(0.5, 'rgba(235,240,245,' + b[2] + ')'); gr.addColorStop(1, 'rgba(235,240,245,0)'); g2.fillStyle = gr; g2.fillRect(-w * b[1], -h, 2 * w * b[1], 2 * h); g2.restore(); });
vgBlobs(g2, w, h, vgRnd(9), 14, 20, 60, ['rgba(140,146,152,A)'], 0.05, 0.12);
}));
var glassR = new THREE.MeshStandardMaterial({ map: T_gl, color: 0xffffff, emissive: 0x000000, metalness: 1, roughness: 0.04, envMapIntensity: 1.6, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
var pane = function (x0, x1, y0, y1, za, zb) { var gb = box(x0, x1, y0, y1, za, zb, glass, false); var rb = box(x0, x1, y0, y1, za, zb, glassR, false); rb.renderOrder = gb.renderOrder + 1; rb.receiveShadow = false; WH.panes.push(gb, rb); return gb; };
WH.glassR = glassR; WH.glassEye = new THREE.Vector3(28.0, z0 + 1.6, -16.6);
var wallW = mat({ color: 0xdfe3e8, roughness: 0.8 }), frame = mat({ color: 0x30353c, roughness: 0.5, metalness: 0.6 });
(C.boxes || []).filter(function (b) { return b.kind === 'office'; }).forEach(function (b) {
box(b.x0, b.x1, b.y0, b.y1, z0, z0 + 1.0, wallW); pane(b.x0, b.x1, b.y0, b.y1, z0 + 1.0, z0 + 2.6); box(b.x0, b.x1, b.y0, b.y1, z0 + 2.6, z0 + 2.9, wallW);
var alongX = b.x1 - b.x0 > b.y1 - b.y0, L = alongX ? b.x1 - b.x0 : b.y1 - b.y0;
for (var s = 0; s <= L + 1e-6; s += 1.2) { var px = alongX ? b.x0 + s : (b.x0 + b.x1) / 2, py = alongX ? (b.y0 + b.y1) / 2 : b.y0 + s; box(px - 0.035, px + 0.035, py - 0.04, py + 0.04, z0 + 1.0, z0 + 2.6, frame); }
});
box(O.door[0], O.door[1], O.y0 - 0.02, O.y0 + 0.17, z0 + 2.2, z0 + 2.9, wallW);
box(O.x0, O.x1, O.y0, O.y1, z0 + 2.9, z0 + 3.0, mat({ color: 0xcfd4da, roughness: 0.9 }), false);
var pnl = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.8, 1.7) });
[[O.x0 + 2.5, (O.y0 + O.y1) / 2], [O.x0 + 5, (O.y0 + O.y1) / 2]].forEach(function (q) { var pl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), pnl); pl.rotation.x = Math.PI / 2; pl.position.set(q[0], z0 + 2.88, -q[1]); g.add(pl); });
var frameM = mat({ color: 0x30353c, roughness: 0.5, metalness: 0.6 });
if (O.desk) {
var dk = O.desk, dx = (dk.x0 + dk.x1) / 2, dy = (dk.y0 + dk.y1) / 2, dz = z0 + dk.h;
box(dk.x0, dk.x1, dk.y0, dk.y1, dz - 0.035, dz, mat({ color: 0xd8d2c4, roughness: 0.55 }));
[[dk.x0 + 0.04, dk.y0 + 0.04], [dk.x1 - 0.08, dk.y0 + 0.04], [dk.x0 + 0.04, dk.y1 - 0.08], [dk.x1 - 0.08, dk.y1 - 0.08]].forEach(function (q) { box(q[0], q[0] + 0.04, q[1], q[1] + 0.04, z0, dz - 0.035, frameM); });
box(dk.x0 + 0.1, dk.x1 - 0.1, dk.y0 + 0.04, dk.y0 + 0.06, z0 + 0.3, dz - 0.04, frameM);
var scr = box(dx - 0.3, dx + 0.3, dy - 0.13, dy - 0.1, dz + 0.12, dz + 0.47, mat({ color: 0x15171a, roughness: 0.4 }));
var disp = box(dx - 0.28, dx + 0.28, dy - 0.1, dy - 0.095, dz + 0.14, dz + 0.45, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.6, 1.1) })); void scr; void disp;
box(dx - 0.03, dx + 0.03, dy - 0.15, dy - 0.12, dz, dz + 0.13, frameM); box(dx - 0.12, dx + 0.12, dy - 0.2, dy - 0.05, dz, dz + 0.01, frameM);
box(dx - 0.22, dx + 0.22, dy + 0.1, dy + 0.25, dz, dz + 0.02, mat({ color: 0x202226, roughness: 0.6 }));
box(dx + 0.3, dx + 0.36, dy + 0.11, dy + 0.2, dz, dz + 0.025, mat({ color: 0x202226, roughness: 0.5 }));
box(dk.x1 - 0.32, dk.x1 - 0.12, dy - 0.25, dy + 0.2, z0, z0 + 0.45, mat({ color: 0x24272c, roughness: 0.45, metalness: 0.3 }));
var led_ = box(dk.x1 - 0.31, dk.x1 - 0.29, dy - 0.255, dy - 0.25, z0 + 0.38, z0 + 0.4, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 1.4, 2.2) })); void led_;
}
(O.chairs || []).forEach(function (c) {
var ch = new THREE.Group(); ch.position.set(c.x, z0, -c.y); ch.rotation.y = c.yaw || 0; g.add(ch);
var dark = mat({ color: 0x1e2124, roughness: 0.6 }), fab = mat({ color: 0x2f3a4a, roughness: 0.9 });
for (var k = 0; k < 5; k++) { var a_ = k * 2 * Math.PI / 5, leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.04), dark); leg.position.set(Math.cos(a_) * 0.15, 0.06, Math.sin(a_) * 0.15); leg.rotation.y = -a_; ch.add(leg); var cw = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), dark); cw.position.set(Math.cos(a_) * 0.29, 0.025, Math.sin(a_) * 0.29); ch.add(cw); }
var gas = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.36, 10), mat({ color: 0x8a9096, roughness: 0.3, metalness: 0.8 })); gas.position.y = 0.25; ch.add(gas);
var seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.46), fab); seat.position.y = 0.46; ch.add(seat);
var back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.44), fab); back.position.set(-0.24, 0.78, 0); back.rotation.z = -0.1; ch.add(back);
ch.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
});
(C.boxes || []).filter(function (b) { return b.kind === 'cabinet' || (b.kind === 'desk' && !O.desk); }).forEach(function (b) {
box(b.x0, b.x1, b.y0, b.y1, z0, Math.max(z0 + 0.8, b.h), mat({ color: 0x8f969e, roughness: 0.5, metalness: 0.5 }));
for (var k = 1; k < 4; k++) box(b.x0 + 0.03, b.x1 - 0.03, b.y1 + 0.001, b.y1 + 0.006, z0 + k * (Math.max(0.8, b.h - z0) / 4), z0 + k * (Math.max(0.8, b.h - z0) / 4) + 0.012, frameM);
});
var win = box(33.6, 35.6, H.y1 - 0.02, H.y1 + 0.02, z0 + 1.1, z0 + 2.5, glass.clone(), false); WH.window = win; box(33.6, 35.6, H.y1 - 0.025, H.y1 - 0.02, z0 + 1.1, z0 + 2.5, glassR, false);
}
(C.platforms || []).forEach(function (q) {
if (q === P_ || (P_ && q.x0 === P_.x0 && q.y0 === P_.y0)) return;
box(q.x0, q.x1, q.y0, q.y1, 0, q.h - 0.08, mat({ map: rep(T.whPanel, (q.x1 - q.x0) * 2, q.h * 2), roughness: 0.5, metalness: 0.4 }));
box(q.x0, q.x1, q.y0, q.y1, q.h - 0.08, q.h, mat({ map: rep(T.whPlate, (q.x1 - q.x0) / 0.32, (q.y1 - q.y0) / 0.32), roughness: 0.4, metalness: 0.7 }));
box(q.x1 - 0.12, q.x1, q.y0, q.y1, q.h - 0.001, q.h + 0.004, mat({ map: rep(T.whHatch, (q.y1 - q.y0) / 0.6, 1), roughness: 0.6 }), false);
box(q.x0 + 0.05, q.x0 + 0.85, q.y1 - 2.4, q.y1 - 0.4, q.h, q.h + 0.9, mat({ color: 0x8e959c, roughness: 0.5, metalness: 0.5 }));
});
var grateM = mat({ map: rep(T.whGrate, 1, 1), roughness: 0.45, metalness: 0.75 }), strM = mat({ color: 0x4d555e, roughness: 0.45, metalness: 0.6 }), noseM = mat({ color: 0xf2c230, roughness: 0.5 });
(C.stairs || []).forEach(function (st) {
if (st.name === 'curb') return;
var n = st.n, r = st.rise, t = st.tread, L = st.landing, up = (n - 1) * t, d = st.dir, hw = st.width / 2, yc = st.y, hump = st.name === 'crossover';
var X = function (u) { return st.x0 + d * u; };
var tread = function (u0, u1, h) { var xa = Math.min(X(u0), X(u1)), xb = Math.max(X(u0), X(u1)); var m = box(xa, xb, yc - hw + 0.06, yc + hw - 0.06, h - 0.035, h, grateM); m.material = mat({ map: rep(T.whGrate, (xb - xa) / 0.25, (2 * hw) / 0.25), roughness: 0.45, metalness: 0.75 }); box(d > 0 ? xa - 0.004 : xb - 0.04, d > 0 ? xa + 0.04 : xb + 0.004, yc - hw + 0.055, yc + hw - 0.055, h - 0.039, h + 0.004, noseM, false); };
for (var k = 0; k < n - 1; k++) tread(k * t, (k + 1) * t, (k + 1) * r);
var lc = X(up + L / 2), onPlat = (C.platforms || []).some(function (q) { return lc > q.x0 && lc < q.x1 && yc > q.y0 && yc < q.y1; });
if (!onPlat) tread(up, up + L, n * r);
if (hump) for (k = 0; k < n - 1; k++) { var u0 = up + L + k * t; var xa = Math.min(X(u0), X(u0 + t)), xb = Math.max(X(u0), X(u0 + t)), h = (n - 1 - k) * r; box(xa, xb, yc - hw + 0.06, yc + hw - 0.06, h - 0.035, h, mat({ map: rep(T.whGrate, t / 0.25, (2 * hw) / 0.25), roughness: 0.45, metalness: 0.75 })); box(d > 0 ? xb - 0.04 : xa - 0.004, d > 0 ? xb + 0.004 : xa + 0.04, yc - hw + 0.055, yc + hw - 0.055, h - 0.039, h + 0.004, noseM, false); }
var flights = hump ? [[0, up + t, 0, n * r], [up + L - 0.0, 2 * up + L + t, n * r, 0]] : [[0, up + t, 0, n * r]];
[-1, 1].forEach(function (sd) {
var yy = yc + sd * (hw - 0.03);
flights.forEach(function (f) {
var xa = X(f[0]), xb = X(f[1]), za = f[2], zb = f[3], len = Math.hypot(xb - xa, zb - za);
var s_ = new THREE.Mesh(new THREE.BoxGeometry(len, 0.22, 0.06), strM); s_.position.set((xa + xb) / 2, (za + zb) / 2 - 0.08, -yy); s_.rotation.z = Math.atan2(zb - za, xb - xa); s_.castShadow = s_.receiveShadow = true; g.add(s_);
var rl = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, len, 10), railM); rl.position.set((xa + xb) / 2, (za + zb) / 2 + 0.95, -yy); rl.rotation.z = Math.atan2(zb - za, xb - xa) - Math.PI / 2; rl.castShadow = true; g.add(rl);
for (var q = 0.15; q < 1; q += 0.35) { var px = xa + (xb - xa) * q, pz = za + (zb - za) * q; var po = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.95, 10), railM); po.position.set(px, pz + 0.47, -yy); po.castShadow = true; g.add(po); }
});
if (hump) { var la = X(up), lb = X(up + L); box(Math.min(la, lb), Math.max(la, lb), yy - 0.025, yy + 0.025, n * r + 0.92, n * r + 0.97, railM); box(Math.min(la, lb), Math.max(la, lb), yy - 0.03, yy + 0.03, n * r - 0.15, n * r, strM); }
});
if (hump) [[up, -1], [up, 1], [up + L, -1], [up + L, 1]].forEach(function (q) { var px = X(q[0]); box(px - 0.05, px + 0.05, yc + q[1] * (hw - 0.05) - 0.05, yc + q[1] * (hw - 0.05) + 0.05, 0, n * r - 0.035, strM); });
});
var CV = C.conveyor;
if (CV) {
var frM = mat({ color: 0x5d6f80, roughness: 0.45, metalness: 0.6 }), rolM = mat({ color: 0xc4cad0, roughness: 0.25, metalness: 0.9 }), cvH = CV.h;
var parts = CV.parts || [{ x0: CV.x0, x1: CV.x1, y0: CV.y0, y1: CV.y1, axis: 'y' }];
var rollG = {}, rolls = [], M4 = new THREE.Matrix4(), cordM = mat({ color: 0xd92b2b, roughness: 0.5 });
parts.forEach(function (q, pi_) {
var ax = q.axis === 'x', L0 = ax ? q.x0 : q.y0, L1 = ax ? q.x1 : q.y1, W0 = ax ? q.y0 : q.x0, W1 = ax ? q.y1 : q.x1;
var B = function (l0, l1, w0, w1, z0, z1, m, c) { return ax ? box(l0, l1, w0, w1, z0, z1, m, c) : box(w0, w1, l0, l1, z0, z1, m, c); };
var inW = q.inner ? (q.inner === (ax ? 'y0' : 'x0') ? W0 : W1) : W1, outW = inW === W0 ? W1 : W0, sgn = inW === W1 ? 1 : -1;
[W0, W1].forEach(function (ww) { B(L0, L1, ww - 0.04, ww + 0.04, cvH - 0.14, cvH, frM); });
B(L0, L1, inW - 0.035 * sgn - 0.01, inW - 0.035 * sgn + 0.01, cvH, cvH + 0.07, frM);
for (var l_ = L0 + 0.4; l_ < L1; l_ += 1.5) { [W0 + 0.02, W1 - 0.02].forEach(function (ww) { B(l_ - 0.03, l_ + 0.03, ww - 0.03, ww + 0.03, 0, cvH - 0.14, frM); }); B(l_ - 0.02, l_ + 0.02, W0, W1, 0.15, 0.19, frM); }
for (var r_ = L0 + 0.05; r_ < L1 - 0.02; r_ += 0.1) rolls.push([ax, ax ? r_ : (W0 + W1) / 2, ax ? (W0 + W1) / 2 : r_, W1 - W0 - 0.1]);
[0.35, 0.62].forEach(function (f, k) { var c0 = L0 + (L1 - L0) * f + pi_ * 0.7, lw = 0.5 + 0.1 * k; if (c0 + lw / 2 < L1 - 0.3) B(c0 - lw / 2, c0 + lw / 2, W0 + 0.1, W1 - 0.1, cvH, cvH + 0.3 + 0.04 * k, mat({ map: (T.whCartons || [T.whCarton])[k % 3], roughness: 0.82 })); });
B(L0, L1, inW + 0.05 * sgn - 0.01, inW + 0.05 * sgn + 0.01, cvH + 0.08, cvH + 0.1, cordM, false);
});
var rG = new THREE.CylinderGeometry(0.03, 0.03, 1, 12), rim = new THREE.InstancedMesh(rG, rolM, rolls.length);
var Qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2), Qz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
rolls.forEach(function (q, i) { M4.compose(new THREE.Vector3(q[1], cvH - 0.04, -q[2]), q[0] ? Qz : Qx, new THREE.Vector3(1, q[3], 1)); rim.setMatrixAt(i, M4); }); rim.castShadow = rim.receiveShadow = true; g.add(rim);
(CV.curves || []).forEach(function (cu) {
var a0 = cu.a0 * Math.PI / 180, a1 = cu.a1 * Math.PI / 180, rc = (cu.r0 + cu.r1) / 2, nr = Math.max(4, Math.round(Math.abs(a1 - a0) * rc / 0.1)), ns = 24;
var arc = function (r, z0, z1, th, m) {
for (var k = 0; k < ns; k++) {
var ta = a0 + (a1 - a0) * k / ns, tb = a0 + (a1 - a0) * (k + 1) / ns, tm = (ta + tb) / 2, len = 2 * r * Math.sin(Math.abs(tb - ta) / 2) + 0.01;
var pc = new THREE.Mesh(new THREE.BoxGeometry(len, z1 - z0, th), m); pc.position.set(cu.cx + r * Math.cos(tm), (z0 + z1) / 2, -(cu.cy + r * Math.sin(tm))); pc.rotation.y = tm + Math.PI / 2; pc.castShadow = pc.receiveShadow = true; g.add(pc);
}
};
arc(cu.r0, cvH - 0.14, cvH, 0.08, frM); arc(cu.r1, cvH - 0.14, cvH, 0.08, frM);
arc(cu.r0 + 0.035, cvH, cvH + 0.07, 0.02, frM); arc(cu.r0 - 0.05, cvH + 0.08, cvH + 0.1, 0.02, cordM);
var tg = new THREE.CylinderGeometry(0.034, 0.024, 1, 12);
for (var k = 0; k < nr; k++) {
var t = a0 + (a1 - a0) * (k + 0.5) / nr, len_ = cu.r1 - cu.r0 - 0.1, rm = cu.r0 + 0.05 + len_ / 2, rl = new THREE.Mesh(tg, rolM);
rl.scale.y = len_; rl.position.set(cu.cx + rm * Math.cos(t), cvH - 0.04, -(cu.cy + rm * Math.sin(t)));
rl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(t), 0, -Math.sin(t))); rl.castShadow = true; g.add(rl);
}
[0.15, 0.5, 0.85].forEach(function (f) { var t = a0 + (a1 - a0) * f; [cu.r0 + 0.02, cu.r1 - 0.02].forEach(function (r) { var lg = new THREE.Mesh(new THREE.BoxGeometry(0.06, cvH - 0.14, 0.06), frM); lg.position.set(cu.cx + r * Math.cos(t), (cvH - 0.14) / 2, -(cu.cy + r * Math.sin(t))); lg.rotation.y = t; g.add(lg); }); });
});
var p0 = parts[0]; box(p0.x0 - 0.45, p0.x0 - 0.05, p0.y1 - 1.4, p0.y1 - 0.9, 0.2, 0.75, mat({ color: 0x2e5aa8, roughness: 0.4, metalness: 0.5 }));
}
(C.bays || []).forEach(function (q) {
var h2 = q.s / 2, w_ = 0.06;
[[q.x - h2, q.x + h2, q.y - h2, q.y - h2 + w_], [q.x - h2, q.x + h2, q.y + h2 - w_, q.y + h2], [q.x - h2, q.x - h2 + w_, q.y - h2, q.y + h2], [q.x + h2 - w_, q.x + h2, q.y - h2, q.y + h2]].forEach(function (e) { strip(e[0], e[1], e[2], e[3]); });
});
var BN = C.bin;
if (BN) {
var bo = new THREE.Group(); bo.position.set(BN.x, 0, -BN.y); bo.rotation.y = BN.yaw || 0; g.add(bo);
var binT = T.whBin || (T.whBin = vgTex(256, 256, function (c2, w, h) {
c2.fillStyle = '#1f6f3f'; c2.fillRect(0, 0, w, h); vgSpeckle(c2, w, h, vgRnd(81), 900, 0.5, 1.8, ['rgba(0,0,0,A)', 'rgba(255,255,255,A)'], 0.04, 0.12);
c2.fillStyle = 'rgba(255,255,255,0.92)'; c2.font = '700 150px "Segoe UI Symbol", "Noto Sans Symbols", "DejaVu Sans", sans-serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText('♻', w / 2, h / 2 + 6);
}));
var plain = mat({ color: 0x1f6f3f, roughness: 0.55 }), sym = mat({ map: binT, roughness: 0.55 });
var bodyG = new THREE.CylinderGeometry(0.42, 0.36, 0.95, 4, 1); bodyG.rotateY(Math.PI / 4);      // (a tapered square body)
var bb = new THREE.Mesh(bodyG, plain); bb.scale.set(BN.w / 0.594, 1, BN.d / 0.594); bb.position.y = 0.1 + 0.475; bb.castShadow = bb.receiveShadow = true; bo.add(bb);
var lid = new THREE.Mesh(new THREE.BoxGeometry(BN.w + 0.06, 0.06, BN.d + 0.08), [plain, plain, sym, plain, plain, plain]); lid.position.y = 1.08; lid.castShadow = true; bo.add(lid);
var face = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), sym); face.position.set(BN.w / 2 + 0.02, 0.62, 0); face.rotation.y = Math.PI / 2; face.rotation.z = 0.0; bo.add(face);
var wh = mat({ color: 0x151719, roughness: 0.8 });
[[-BN.w / 2 + 0.08, -BN.d / 2 + 0.08], [-BN.w / 2 + 0.08, BN.d / 2 - 0.08], [BN.w / 2 - 0.08, -BN.d / 2 + 0.08], [BN.w / 2 - 0.08, BN.d / 2 - 0.08]].forEach(function (q) { var wl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 14), wh); wl.rotation.x = Math.PI / 2; wl.position.set(q[0], 0.06, q[1]); bo.add(wl); });
var hdl = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, BN.d - 0.1, 8), mat({ color: 0x0f3d22, roughness: 0.5 })); hdl.rotation.x = Math.PI / 2; hdl.position.set(-BN.w / 2 - 0.04, 1.0, 0); bo.add(hdl);
}
(C.clutter || []).forEach(function (q, i) {
if (q.what === 'pallet') {
var o = new THREE.Group(), w = q.x1 - q.x0, dd = q.y1 - q.y0, wm = mat({ map: rep(T.whWood, 1, 0.16), roughness: 0.9 });
var along = w > dd, Lb = along ? w : dd, Wb = along ? dd : w;
for (var k2 = 0; k2 < 5; k2++) { var pl = new THREE.Mesh(new THREE.BoxGeometry(along ? Lb : 0.14, 0.022, along ? 0.14 : Lb), wm); var off = -Wb / 2 + 0.07 + k2 * (Wb - 0.14) / 4; pl.position.set(along ? 0 : off, q.h - 0.011, along ? off : 0); pl.castShadow = pl.receiveShadow = true; o.add(pl); }
for (k2 = 0; k2 < 3; k2++) for (var k3 = 0; k3 < 3; k3++) { var bl = new THREE.Mesh(new THREE.BoxGeometry(0.14, q.h - 0.044, 0.14), wm); bl.position.set((along ? (-Lb / 2 + 0.07 + k2 * (Lb - 0.14) / 2) : (-Wb / 2 + 0.07 + k3 * (Wb - 0.14) / 2)), (q.h - 0.044) / 2 + 0.022, -(along ? (-Wb / 2 + 0.07 + k3 * (Wb - 0.14) / 2) : (-Lb / 2 + 0.07 + k2 * (Lb - 0.14) / 2))); bl.castShadow = true; o.add(bl); }
for (k2 = 0; k2 < 3; k2++) { var bt = new THREE.Mesh(new THREE.BoxGeometry(along ? Lb : 0.14, 0.022, along ? 0.14 : Lb), wm); var off2 = -Wb / 2 + 0.07 + k2 * (Wb - 0.14) / 2; bt.position.set(along ? 0 : off2, 0.011, along ? off2 : 0); bt.receiveShadow = true; o.add(bt); }
} else if (!(C.props && C.props.length)) {
var cb = box(q.x0, q.x1, q.y0, q.y1, 0, q.h, mat({ map: T.whCarton, roughness: 0.82, color: q.what === 'flat' ? 0xb9a58a : 0xffffff }));
cb.rotation.y = (i % 3 - 1) * 0.12; if (q.what === 'flat') cb.rotation.z = 0.03;
}
});
(C.ramps || []).forEach(function (r) {
var ax = r.axis === 'y', L = ax ? r.y1 - r.y0 : r.x1 - r.x0, W_ = ax ? r.x1 - r.x0 : r.y1 - r.y0, ang = Math.atan2(r.h1 - r.h0, L);
var sl = new THREE.Mesh(new THREE.BoxGeometry(ax ? W_ : Math.hypot(L, r.h1 - r.h0), 0.06, ax ? Math.hypot(L, r.h1 - r.h0) : W_), mat({ map: rep(T.whPlate, W_ / 0.32, L / 0.32), roughness: 0.6, metalness: 0.6 }));
sl.position.set((r.x0 + r.x1) / 2, (r.h0 + r.h1) / 2 - 0.02, -(r.y0 + r.y1) / 2); if (ax) sl.rotation.x = ang; else sl.rotation.z = ang; sl.castShadow = sl.receiveShadow = true; g.add(sl);
if (ax) [r.x0 - 0.05, r.x1 + 0.05].forEach(function (xx) {
var rl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, Math.hypot(L, r.h1 - r.h0)), railM); rl.position.set(xx, (r.h0 + r.h1) / 2 + 1.0, -(r.y0 + r.y1) / 2); rl.rotation.x = ang; g.add(rl);
for (var s = 0; s <= L + 1e-6; s += 1.1) { var hh = r.h0 + (r.h1 - r.h0) * s / L; box(xx - 0.03, xx + 0.03, r.y0 + s - 0.03, r.y0 + s + 0.03, hh, hh + 1.0, railM); }
});
});
WH.dropsReal = (C.props || []).some(function (q) { return q.what === 'drop'; }); WH.hall = C.hall;
WH.props = (C.props || []).map(function (q, i) {
var m = new THREE.Mesh(new THREE.BoxGeometry(q.sx, q.sz, q.sy), mat({ map: (T.whCartons || [T.whCarton])[i % 3], roughness: 0.84, color: q.what === 'flat' ? 0xb9a58a : 0xffffff }));
m.position.set(q.x, q.sz / 2, -q.y); m.rotation.y = q.yaw || 0; if (q.what === 'flat') m.rotation.z = 0.03; m.castShadow = m.receiveShadow = true; if (q.spare) m.visible = false; g.add(m); return m;
});
(C.forklifts || []).forEach(function (f) {
var fo = new THREE.Group(); fo.position.set(f.x, 0, -f.y); fo.rotation.y = f.yaw || 0; g.add(fo);
hmGlb('forklift', function (sc) {
sc.updateMatrixWorld(true); var bb = new THREE.Box3().setFromObject(sc), c = bb.getCenter(new THREE.Vector3());
var inner = new THREE.Group(); sc.position.set(-c.x, -bb.min.y, -c.z); inner.add(sc); inner.rotation.y = -Math.PI / 2;      // (its forks along the model's -z)
sc.traverse(function (m) { if (m.isMesh) { m.castShadow = m.receiveShadow = true; m.material = hmForkWear(m.material); } });
fo.add(inner);
});
});
var D = C.dock;
if (D) {
var dg = new THREE.Group(), dz_ = hmCourseH(D.x, D.y); dg.position.set(D.x, dz_, -D.y); dg.rotation.y = D.yaw || 0; g.add(dg);
var pad = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.2), new THREE.MeshBasicMaterial({ color: 0x1c3a5e, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })); pad.rotation.x = -Math.PI / 2; pad.position.set(0.3, 0.005, 0); dg.add(pad);
var ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.78, 48), new THREE.MeshBasicMaterial({ color: 0x3ec5ff, transparent: true, opacity: 0.8, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 })); ring.rotation.x = -Math.PI / 2; ring.position.set(0.3, 0.007, 0); dg.add(ring); WH.dockRing = ring; ring.material.userData.glow = true;
var chg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.7), mat({ color: 0x23272e, roughness: 0.5, metalness: 0.5 })); chg.position.set(-0.95, 0.275, 0); chg.castShadow = chg.receiveShadow = true; dg.add(chg);
var led = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.5), new THREE.MeshBasicMaterial({ color: 0x3ec5ff })); led.position.set(-0.745, 0.45, 0); dg.add(led);
}
var redM = mat({ color: 0xc81e1e, roughness: 0.4 }), exitM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 1.6, 0.5) });
[[9.0, H.y1 - 0.02, 0, 6.3, 5.0, 'Robotics Distribution Center'], [9.0, H.y0 + 0.02, Math.PI, 5.6, 5.0, 'Loading Docks 1 – 4'], [H.x1 - 0.02, 4.0, -Math.PI / 2, 6.0, 5.0, 'Autonomous Security · Spot Patrol']].forEach(function (q) {
var sg = new THREE.Mesh(new THREE.PlaneGeometry(q[4], q[4] / 4), new THREE.MeshStandardMaterial({ map: hmBrandTex(q[5]), roughness: 0.5, metalness: 0.1 }));
sg.position.set(q[0], q[3], -q[1]); sg.rotation.y = q[2]; g.add(sg);
});
var Of_ = C.office, Pl_ = C.platform;
if (Of_ && Pl_) { var op = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshStandardMaterial({ map: hmBrandTex('Operations Office'), roughness: 0.45 })); op.position.set(34.2, Pl_.h + 2.62, -(Of_.y0 - 0.012)); g.add(op); }
[[-1.0, H.y1, -1], [21.6, H.y1, -1], [5.0, H.y0, 1], [11.0, H.y0, 1], [17.0, H.y0, 1]].forEach(function (q) { g.add(hmFirePoint(q[0], q[1], q[2])); });
[[1.0, H.y1, -1], [12.9, H.y0, 1]].forEach(function (q) { g.add(hmFirstAid(q[0], q[1], q[2])); });
[[H.x0 + 0.05, 9.5, 'W'], [H.x1 - 0.05, 4.0, 'E']].forEach(function (q) { var e = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.5), exitM); e.position.set(q[0], 2.6, -q[1]); g.add(e); });
var bM = new THREE.MeshBasicMaterial({ color: 0x401010 });
[[H.x0 + 0.3, 2], [H.x0 + 0.3, 14], [H.x1 - 0.3, 2], [H.x1 - 0.3, 14], [10, H.y0 + 0.3], [22, H.y0 + 0.3], [10, H.y1 - 0.3], [22, H.y1 - 0.3]].forEach(function (q) {
var bc = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), bM.clone()); bc.position.set(q[0], 4.8, -q[1]); g.add(bc); WH.beacons.push(bc);
});
WH.alarmLight = new THREE.PointLight(0xff2020, 0, 40, 1.6); WH.alarmLight.position.set(cx, 6, -cy); g.add(WH.alarmLight);
WH.dyn = new THREE.Group(); g.add(WH.dyn);
hmPatrolStatic(g);
}
function hmFirePoint(x, y, side) {
var T = hmTextures(), o = new THREE.Group(); o.position.set(x, 0, -y); o.rotation.y = side > 0 ? Math.PI : 0;
var red = new THREE.MeshPhysicalMaterial({ color: 0xb3121a, roughness: 0.32, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08 });
var chrome = new THREE.MeshStandardMaterial({ color: 0xd9dde2, roughness: 0.18, metalness: 1 }), blk = new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.55 });
var lab = T.feLabel || (T.feLabel = vgTex(512, 256, function (g, w, h) {
g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#b3121a'; g.fillRect(0, 0, w, 34); g.fillRect(0, h - 22, w, 22);
g.fillStyle = '#ffffff'; g.font = '800 26px Inter, Arial'; g.textAlign = 'center'; g.fillText('FIRE EXTINGUISHER', w * 0.25, 26); g.fillText('FIRE EXTINGUISHER', w * 0.75, 26);
g.fillStyle = '#16181c'; g.font = '800 40px Inter, Arial'; g.fillText('ABC POWDER', w * 0.25, 92); g.fillText('ABC POWDER', w * 0.75, 92);
g.font = '600 20px Inter, Arial'; g.fillText('6 kg · 34A 233B C', w * 0.25, 124); g.fillText('6 kg · 34A 233B C', w * 0.75, 124);
['#1d4fa0', '#e0a21b', '#c22'].forEach(function (c, i) { g.fillStyle = c; g.fillRect(w * 0.25 - 75 + i * 52, 144, 44, 44); g.fillRect(w * 0.75 - 75 + i * 52, 144, 44, 44); });
g.fillStyle = '#16181c'; g.font = '500 13px Inter, Arial'; g.fillText('1. PULL PIN  2. AIM AT BASE  3. SQUEEZE', w * 0.25, 214); g.fillText('1. PULL PIN  2. AIM AT BASE  3. SQUEEZE', w * 0.75, 214);
}));
var R = 0.075, Hb = 0.46, z0 = 0.62, cz = 0.13;
var prof = [new THREE.Vector2(0, 0), new THREE.Vector2(R - 0.008, 0), new THREE.Vector2(R, 0.01)];
for (var k = 0; k <= 8; k++) { var a = k / 8 * Math.PI / 2; prof.push(new THREE.Vector2(R * Math.cos(a) + 0.0001, Hb - 0.05 + 0.05 * Math.sin(a) * 1.0 + (k ? 0 : 0))); }
prof.splice(3, 0, new THREE.Vector2(R, Hb - 0.05)); prof.push(new THREE.Vector2(0.018, Hb + 0.006), new THREE.Vector2(0, Hb + 0.006));
var bottle = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), red); bottle.position.set(0, z0, cz); bottle.castShadow = true; o.add(bottle);
var band = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.001, R + 0.001, 0.2, 32, 1, true), new THREE.MeshStandardMaterial({ map: lab, roughness: 0.5 })); band.position.set(0, z0 + 0.2, cz); band.rotation.y = -Math.PI / 2; o.add(band);
var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.04, 16), chrome); neck.position.set(0, z0 + Hb + 0.025, cz); o.add(neck);
var head = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.07), chrome); head.position.set(0, z0 + Hb + 0.065, cz + 0.005); o.add(head);
var lever = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.15), blk); lever.position.set(0, z0 + Hb + 0.1, cz + 0.05); lever.rotation.x = -0.18; o.add(lever);
var carry = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.13), blk); carry.position.set(0, z0 + Hb + 0.075, cz + 0.05); o.add(carry);
var pin = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.003, 6, 16), new THREE.MeshStandardMaterial({ color: 0xe8c22a, roughness: 0.4, metalness: 0.7 })); pin.position.set(0.03, z0 + Hb + 0.07, cz + 0.02); pin.rotation.y = Math.PI / 2; o.add(pin);
var gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.01, 18), chrome); gauge.rotation.z = Math.PI / 2; gauge.position.set(0.028, z0 + Hb + 0.062, cz - 0.01); o.add(gauge);
var dial = new THREE.Mesh(new THREE.CircleGeometry(0.013, 18), new THREE.MeshBasicMaterial({ color: 0x9fd18a })); dial.rotation.y = Math.PI / 2; dial.position.set(0.0336, z0 + Hb + 0.062, cz - 0.01); o.add(dial);
var hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.025, z0 + Hb + 0.06, cz), new THREE.Vector3(-0.07, z0 + Hb - 0.02, cz + 0.02), new THREE.Vector3(-0.088, z0 + 0.25, cz + 0.03), new THREE.Vector3(-0.084, z0 + 0.1, cz + 0.035)]), 24, 0.008, 8), blk); hose.castShadow = true; o.add(hose);
var noz = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.05, 12), blk); noz.position.set(-0.084, z0 + 0.075, cz + 0.035); o.add(noz);
var clip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.03), blk); clip.position.set(-0.08, z0 + 0.12, cz + 0.02); o.add(clip);
var steel = new THREE.MeshStandardMaterial({ color: 0x3c4046, roughness: 0.45, metalness: 0.8 });
var plate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.012), steel); plate.position.set(0, z0 + 0.36, 0.008); o.add(plate);
var strap = new THREE.Mesh(new THREE.TorusGeometry(R + 0.006, 0.006, 6, 24, Math.PI), steel); strap.position.set(0, z0 + 0.36, cz); strap.rotation.x = Math.PI / 2; strap.rotation.z = Math.PI; o.add(strap);
var hook = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, cz - R), steel); hook.position.set(0, z0 + Hb - 0.01, (cz - R) / 2); o.add(hook);
var sg = T.feSign || (T.feSign = vgTex(256, 320, function (g, w, h) {
g.fillStyle = '#c4161c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
g.fillStyle = '#fff'; g.beginPath(); if (g.roundRect) g.roundRect(100, 70, 56, 150, 18); else g.rect(100, 70, 56, 150); g.fill();
g.fillRect(112, 46, 32, 26); g.fillRect(96, 40, 70, 12); g.beginPath(); g.moveTo(150, 52); g.quadraticCurveTo(200, 70, 186, 150); g.lineWidth = 9; g.strokeStyle = '#fff'; g.stroke();
g.font = '800 40px Inter, Arial'; g.textAlign = 'center'; g.fillText('FIRE', w / 2, 266); g.fillText('POINT', w / 2, 304);
}));
var sign = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.375), new THREE.MeshStandardMaterial({ map: sg, roughness: 0.45 })); sign.position.set(0, 1.62, 0.012); o.add(sign);
return o;
}
function hmBrandTex(sub) {
var T = hmTextures(), key = 'brand_' + sub; if (T[key]) return T[key];
return (T[key] = vgTex(1024, 256, function (g, w, h) {
g.fillStyle = '#0f1626'; g.fillRect(0, 0, w, h);
var sh = g.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(255,255,255,0.06)'); sh.addColorStop(1, 'rgba(0,0,0,0.2)'); g.fillStyle = sh; g.fillRect(0, 0, w, h);
var gr = g.createLinearGradient(56, 48, 216, 208); gr.addColorStop(0, '#2f4ae0'); gr.addColorStop(1, '#18b6c9'); g.fillStyle = gr;
g.beginPath(); if (g.roundRect) g.roundRect(56, 48, 160, 160, 36); else g.rect(56, 48, 160, 160); g.fill();
g.fillStyle = '#ffffff'; g.font = '900 112px Inter, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('E', 136, 134);
g.textAlign = 'left'; g.font = '800 120px Inter, Arial'; g.fillText('EsaSim', 252, 112);
g.fillStyle = '#9fb3d1'; g.font = '600 38px Inter, Arial'; g.fillText(sub, 258, 196);
g.fillStyle = '#18b6c9'; g.fillRect(0, h - 10, w, 10);
}));
}
function hmFirstAid(x, y, side) {
var T = hmTextures(), o = new THREE.Group(); o.position.set(x, 0, -y); o.rotation.y = side > 0 ? Math.PI : 0;
var face = T.faFace || (T.faFace = vgTex(256, 320, function (g, w, h) {
g.fillStyle = '#0d8a43'; g.fillRect(0, 0, w, h); var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.08)'); gr.addColorStop(1, 'rgba(0,0,0,.12)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
g.fillStyle = '#ffffff'; g.fillRect(w / 2 - 22, 60, 44, 130); g.fillRect(w / 2 - 65, 103, 130, 44);
g.font = '800 34px Inter, Arial'; g.textAlign = 'center'; g.fillText('FIRST AID', w / 2, 250);
g.font = '600 17px Inter, Arial'; g.fillText('IN CASE OF EMERGENCY', w / 2, 284);
g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, h - 12);
}));
var gm = new THREE.MeshPhysicalMaterial({ color: 0x0f8f47, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15 });
var Wb = 0.36, Hc = 0.45, D = 0.14, sh = new THREE.Shape(), r = 0.02;
sh.moveTo(-Wb / 2 + r, -Hc / 2); sh.lineTo(Wb / 2 - r, -Hc / 2); sh.quadraticCurveTo(Wb / 2, -Hc / 2, Wb / 2, -Hc / 2 + r); sh.lineTo(Wb / 2, Hc / 2 - r); sh.quadraticCurveTo(Wb / 2, Hc / 2, Wb / 2 - r, Hc / 2);
sh.lineTo(-Wb / 2 + r, Hc / 2); sh.quadraticCurveTo(-Wb / 2, Hc / 2, -Wb / 2, Hc / 2 - r); sh.lineTo(-Wb / 2, -Hc / 2 + r); sh.quadraticCurveTo(-Wb / 2, -Hc / 2, -Wb / 2 + r, -Hc / 2);
var body = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 6 }), gm); body.position.set(0, 1.35, 0.004); body.castShadow = true; o.add(body);
var door = new THREE.Mesh(new THREE.PlaneGeometry(Wb - 0.02, Hc - 0.02), new THREE.MeshPhysicalMaterial({ map: face, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15 })); door.position.set(0, 1.35, D + 0.0115); o.add(door);
var hdl = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.07, 0.02), new THREE.MeshStandardMaterial({ color: 0xd0d4d8, roughness: 0.25, metalness: 0.9 })); hdl.position.set(Wb / 2 - 0.03, 1.35, D + 0.022); o.add(hdl);
var hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, Hc - 0.06, 8), new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.3, metalness: 0.9 })); hinge.position.set(-Wb / 2 - 0.002, 1.35, D + 0.008); o.add(hinge);
return o;
}
function hmPatrolStatic(g) {
var PI = HM.info && HM.info.patrol; if (!PI || hmWH()) return;
var pts = PI.route || [], pos = [];
for (var i = 0; i < pts.length; i++) pos.push(pts[i][0], hmCourseH(pts[i][0], pts[i][1]) + 0.02, -pts[i][1]);
void pos;
(PI.looks || []).forEach(function (q) { var m = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.36, 4), new THREE.MeshBasicMaterial({ color: 0x3ec5ff, transparent: true, opacity: 0.55, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(q[0], hmCourseH(q[0], q[1]) + 0.02, -q[1]); m.renderOrder = 3; g.add(m); });
(PI.areas || []).forEach(function (a) {
var p = a.path[Math.floor(a.path.length / 2)] || a.path[0]; if (!p) return;
var cv = document.createElement('canvas'); cv.width = 512; cv.height = 96; var c2 = cv.getContext('2d');
c2.fillStyle = 'rgba(62,197,255,0.55)'; c2.font = '700 46px Inter, Arial, sans-serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText(a.name.toUpperCase(), 256, 50);
var tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
var m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
m.rotation.x = -Math.PI / 2; m.position.set(p[0], hmCourseH(p[0], p[1]) + 0.01, -(p[1] - 0.6)); g.add(m);
});
}
function hmGlbBuf(id, done) {
var MS = HM.glb || (HM.glb = {}), M = MS[id];
if (M && M.buf) { done(M.buf); return; }
if (M) { M.wait.push(done); return; }
M = MS[id] = { wait: [done] };
var go = function () {
var b64 = (window.ESASIM_MODELS || {})[id]; if (!b64) { delete MS[id]; return; }
var bin = atob(b64), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
M.buf = u.buffer; var w = M.wait; M.wait = []; w.forEach(function (f) { f(M.buf); });
};
fromProject([id + '.glb'], 'buffer', function (buf) { M.buf = buf; var w = M.wait; M.wait = []; w.forEach(function (f) { f(M.buf); }); }, function () {
if ((window.ESASIM_MODELS || {})[id]) { go(); return; }
var sc = document.createElement('script'); sc.src = 'models/' + id + '.js?v=1'; sc.onload = go; sc.onerror = function () { delete MS[id]; }; document.head.appendChild(sc);
});
}
function hmGlb(id, done) {
hmGlbBuf(id, function (buf) {
try {
var gl = new A.GLTFLoader(); gl.register(function (parser) { parser.textureLoader = new THREE.TextureLoader(); return { name: 'esasim_images' }; });
gl.parse(buf, '', function (r) { done(r.scene); }, function () { });
} catch (e) { }
});
}
function hmIntruder() {
var o = new THREE.Group(), ph = hmPerson(false); o.add(ph); o.userData = ph.userData;
hmGlb('person', function (sc) {
sc.updateMatrixWorld(true);
var B = {}; sc.traverse(function (n) {
if (n.isBone) B[n.name.replace(/^mixamorig:?/, '').replace(/_\d+$/, '')] = n;
if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; n.frustumCulled = false; (Array.isArray(n.material) ? n.material : [n.material]).forEach(function (m) { if (!/eyewear/i.test(m.name || '')) { m.transparent = false; m.depthWrite = true; m.alphaTest = 0.4; } m.envMapIntensity = 0.6; if (/top|bottom|shoe|glove/i.test(m.name || '') && !m.userData.dark) { m.userData.dark = true; m.color.multiplyScalar(0.22); m.roughness = Math.max(m.roughness, 0.85); } }); }      // (dark clothes: black, charcoal)
});
if (!B.Hips || !B.LeftUpLeg || !B.RightUpLeg || !B.LeftArm) return;
var wp = function (b) { return b.getWorldPosition(new THREE.Vector3()); };
var rgt = wp(B.RightUpLeg).sub(wp(B.LeftUpLeg)); rgt.y = 0; rgt.normalize();
var fwd = new THREE.Vector3(0, 1, 0).cross(rgt).normalize();
var bb = new THREE.Box3().setFromObject(sc), hgt = Math.max(0.5, bb.max.y - bb.min.y), hip = wp(B.Hips);
var inner = new THREE.Group(); inner.quaternion.setFromUnitVectors(fwd, new THREE.Vector3(1, 0, 0)); inner.scale.setScalar(1.76 / hgt);
sc.position.set(-hip.x, -bb.min.y, -hip.z); inner.add(sc);
var rest = {}; Object.keys(B).forEach(function (k) { rest[k] = B[k].quaternion.clone(); });
o.remove(ph); o.add(inner); o.userData = { rig: { B: B, rest: rest, inner: inner, ph: 0, cr: 0 } };
});
return o;
}
var RG_V1 = new THREE.Vector3(), RG_V2 = new THREE.Vector3(), RG_Q1 = new THREE.Quaternion(), RG_Q2 = new THREE.Quaternion(), RG_Q3 = new THREE.Quaternion(), RG_OQ = new THREE.Quaternion();
function hmRigAim(bone, child, dir) {
if (!bone || !child || !bone.parent) return;
bone.getWorldPosition(RG_V1); child.getWorldPosition(RG_V2); RG_V2.sub(RG_V1); if (RG_V2.lengthSq() < 1e-10) return; RG_V2.normalize();
var want = dir.clone().normalize().applyQuaternion(RG_OQ);
RG_Q1.setFromUnitVectors(RG_V2, want); bone.getWorldQuaternion(RG_Q2); RG_Q1.multiply(RG_Q2);
bone.parent.getWorldQuaternion(RG_Q3).invert(); bone.quaternion.copy(RG_Q3.multiply(RG_Q1)); bone.updateMatrixWorld(true);
}
function hmGait(u, run) {
var so = run ? 0.38 : 0.6, hipF = run ? 0.62 : 0.42, hipB = run ? 0.42 : 0.26, hip, knee, foot;
var bump = function (x, a, b) { return x <= a || x >= b ? 0 : Math.pow(Math.sin(Math.PI * (x - a) / (b - a)), 2); };
if (u < so) { var t = u / so; hip = hipF - (hipF + hipB) * t; }
else { var s2 = (u - so) / (1 - so); hip = -hipB + (hipF + hipB) * (0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, s2 * 1.3))) - 0.05 * bump(s2, 0.8, 1.0); }      // (the thigh comes through early, then reaches)
if (run) knee = 0.12 + 0.42 * bump(u, 0, so) + 1.55 * bump(u, so - 0.04, 1.0);
else knee = 0.05 + 0.22 * bump(u, 0, 0.32) + 0.88 * bump(u, 0.46, 0.94);
if (u < 0.12) foot = 0.25 * (1 - u / 0.12);                                   // (the heel down, the toes coming down)
else if (u < so - 0.18) foot = 0;
else if (u < so) foot = -0.55 * (u - (so - 0.18)) / 0.18;                     // (on the toes, pushing off)
else foot = -0.55 + 0.8 * Math.min(1, (u - so) / 0.18) - (u > 0.9 ? 0.0 : 0) ; // (lifted clear, toes up for the strike)
return { hip: hip, knee: knee, foot: Math.max(-0.6, Math.min(0.3, foot)) };
}
function hmRigPose(o, a, mv, d) {
var U = o.userData.rig, B = U.B, V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
Object.keys(U.rest).forEach(function (k) { B[k].quaternion.copy(U.rest[k]); });
var run = !!a.fast;
U.ph += mv * (run ? 3.2 : 4.3);
U.amp = (U.amp || 0) + ((a.moving ? 1 : 0) - (U.amp || 0)) * Math.min(1, d * 6);
U.run = (U.run || 0) + ((run ? 1 : 0) - (U.run || 0)) * Math.min(1, d * 4);
U.idle = (U.idle || 0) + d;
var A = U.amp, Rn = U.run, P = U.ph, tw = 2 * Math.PI;
U.inner.position.set(0, 0, 0); o.updateMatrixWorld(true); o.getWorldQuaternion(RG_OQ);
var sway = A * (0.025 - 0.012 * Rn) * Math.sin(P) + (1 - A) * 0.012 * Math.sin(U.idle * 0.7);
U.inner.position.z = sway;
if (B.Hips && B.Hips.parent) {
B.Hips.parent.getWorldQuaternion(RG_Q3).invert(); RG_V1.set(0, 1, 0).applyQuaternion(RG_OQ).applyQuaternion(RG_Q3);
B.Hips.quaternion.premultiply(RG_Q1.setFromAxisAngle(RG_V1, A * (0.09 + 0.05 * Rn) * Math.sin(P))); B.Hips.updateMatrixWorld(true);
}
var lean = 0.05 + 0.2 * Rn * A, twist = -A * (0.12 + 0.06 * Rn) * Math.sin(P);
if (B.Spine) hmRigAim(B.Spine, B.Spine1 || B.Spine2 || B.Neck, V(Math.sin(lean), Math.cos(lean), 0));
if (B.Spine2 && B.Neck) { B.Spine2.parent.getWorldQuaternion(RG_Q3).invert(); RG_V1.set(0, 1, 0).applyQuaternion(RG_OQ).applyQuaternion(RG_Q3); B.Spine2.quaternion.premultiply(RG_Q1.setFromAxisAngle(RG_V1, twist)); B.Spine2.updateMatrixWorld(true); }
[['Left', -1, 0], ['Right', 1, Math.PI]].forEach(function (q) {
var side = q[0], sz = q[1], p = P + q[2], u = ((p / tw) % 1 + 1) % 1;
var gw = hmGait(u, false), gr = hmGait(u, true), g_ = { hip: gw.hip + (gr.hip - gw.hip) * Rn, knee: gw.knee + (gr.knee - gw.knee) * Rn, foot: gw.foot + (gr.foot - gw.foot) * Rn };
var phi = A * g_.hip, kap = A * g_.knee + (1 - A) * 0.06, th = A * g_.foot;
hmRigAim(B[side + 'UpLeg'], B[side + 'Leg'], V(Math.sin(phi), -Math.cos(phi), sz * 0.025));
hmRigAim(B[side + 'Leg'], B[side + 'Foot'], V(Math.sin(phi - kap), -Math.cos(phi - kap), sz * 0.015));
if (B[side + 'ToeBase']) hmRigAim(B[side + 'Foot'], B[side + 'ToeBase'], V(Math.cos(th - 0.5), Math.sin(th - 0.5), sz * 0.06));
var swing = -A * (0.3 + 0.3 * Rn) * Math.sin(p), elb = 0.22 + 0.12 * A * Math.max(0, -Math.sin(p)) + 0.75 * Rn * A;
hmRigAim(B[side + 'Arm'], B[side + 'ForeArm'], V(Math.sin(swing - 0.25 * Rn * A), -Math.cos(swing - 0.25 * Rn * A), sz * 0.16));
hmRigAim(B[side + 'ForeArm'], B[side + 'Hand'], V(Math.sin(swing + elb), -Math.cos(swing + elb), sz * (0.08 + 0.12 * Rn)));
});
var low = 1e9; ['LeftToeBase', 'RightToeBase', 'LeftFoot', 'RightFoot'].forEach(function (k) { if (B[k]) { B[k].getWorldPosition(RG_V1); low = Math.min(low, RG_V1.y); } });
if (low < 1e8) { o.getWorldPosition(RG_V2); U.inner.position.y = (RG_V2.y - low + 0.03) / o.scale.y + Rn * A * 0.05 * Math.max(0, Math.sin(2 * P)); }
}
function hmPerson(staff) {
var o = new THREE.Group(), cloth = new THREE.MeshStandardMaterial({ color: staff ? 0xf08a1c : 0x2f3640, roughness: 0.85 }), pants = new THREE.MeshStandardMaterial({ color: staff ? 0x2b3a55 : 0x1a1c20, roughness: 0.9 }), skin = new THREE.MeshStandardMaterial({ color: 0xc69c7a, roughness: 0.7 });
var part = function (geo, m, x, y, z) { var p = new THREE.Mesh(geo, m); p.position.set(x, y, z); p.castShadow = true; o.add(p); return p; };
var legG = new THREE.CapsuleGeometry(0.075, 0.72, 4, 10), armG = new THREE.CapsuleGeometry(0.055, 0.55, 4, 10);
var hipL = new THREE.Group(), hipR = new THREE.Group(); hipL.position.set(0, 0.92, 0.1); hipR.position.set(0, 0.92, -0.1); o.add(hipL); o.add(hipR);
[hipL, hipR].forEach(function (h) { var l = new THREE.Mesh(legG, pants); l.position.y = -0.45; l.castShadow = true; h.add(l); });
part(new THREE.CapsuleGeometry(0.17, 0.42, 4, 12), cloth, 0, 1.25, 0).scale.set(1, 1, 1.25);
var head = part(new THREE.SphereGeometry(0.11, 14, 10), skin, 0.02, 1.67, 0);
if (!staff) { var hood = part(new THREE.SphereGeometry(0.125, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), cloth, 0.0, 1.69, 0); hood.rotation.z = 0.35; }
else { part(new THREE.SphereGeometry(0.12, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.4 }), 0.02, 1.72, 0); }
var shL = new THREE.Group(), shR = new THREE.Group(); shL.position.set(0, 1.45, 0.24); shR.position.set(0, 1.45, -0.24); o.add(shL); o.add(shR);
[shL, shR].forEach(function (s) { var a = new THREE.Mesh(armG, cloth); a.position.y = -0.33; a.castShadow = true; s.add(a); });
if (!staff) {
part(new THREE.BoxGeometry(0.18, 0.4, 0.3), new THREE.MeshStandardMaterial({ color: 0x3a3f2e, roughness: 0.9 }), -0.2, 1.28, 0);
var beam = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3.2, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1c0, transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
beam.rotation.z = Math.PI / 2 + 0.25; beam.position.set(1.75, 0.75, -0.24); o.add(beam);
}
o.userData = { hipL: hipL, hipR: hipR, shL: shL, shR: shR, ph: 0, head: head };
return o;
}
function hmForklift() {
var o = new THREE.Group(), body = new THREE.MeshStandardMaterial({ color: 0xf2a900, roughness: 0.45, metalness: 0.3 }), blk = new THREE.MeshStandardMaterial({ color: 0x16181b, roughness: 0.7 }), st = new THREE.MeshStandardMaterial({ color: 0x55595f, roughness: 0.4, metalness: 0.8 });
var add = function (geo, m, x, y, z) { var p = new THREE.Mesh(geo, m); p.position.set(x, y, z); p.castShadow = true; p.receiveShadow = true; o.add(p); return p; };
add(new THREE.BoxGeometry(1.7, 0.75, 1.05), body, -0.15, 0.6, 0); add(new THREE.BoxGeometry(0.7, 0.55, 1.0), blk, -0.85, 0.6, 0);
[[0.45, 0.48], [0.45, -0.48], [-0.75, 0.45], [-0.75, -0.45]].forEach(function (q) { var w = add(new THREE.CylinderGeometry(0.27, 0.27, 0.2, 18), blk, q[0], 0.27, q[1]); w.rotation.x = Math.PI / 2; });
[[0.35, 0.45], [0.35, -0.45], [-0.6, 0.45], [-0.6, -0.45]].forEach(function (q) { add(new THREE.BoxGeometry(0.06, 1.25, 0.06), blk, q[0], 1.6, q[1]); });
add(new THREE.BoxGeometry(1.05, 0.05, 1.0), blk, -0.12, 2.22, 0);
[-0.32, 0.32].forEach(function (z) { add(new THREE.BoxGeometry(0.08, 2.3, 0.1), st, 0.72, 1.15, z); add(new THREE.BoxGeometry(1.1, 0.05, 0.12), st, 1.3, 0.12, z * 0.9); });
add(new THREE.BoxGeometry(0.06, 0.9, 0.9), st, 0.78, 0.55, 0);
var drv = hmPerson(true); drv.scale.setScalar(0.9); drv.position.set(-0.3, 0.35, 0); o.add(drv); drv.userData.hipL.rotation.z = drv.userData.hipR.rotation.z = 1.4;
var bc = add(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff9900 }), -0.2, 2.32, 0);
o.userData = { beacon: bc };
return o;
}
function hmForkWear(m0) {
if (!m0 || m0.userData.forkWear) return m0;
var W_ = HM.forkMats || (HM.forkMats = {}); if (W_[m0.uuid]) return W_[m0.uuid];
var m = m0.clone(); m.userData.forkWear = true;
m.onBeforeCompile = function (sh) {
sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFkP; varying vec3 vFkN;')
.replace('#include <begin_vertex>', '#include <begin_vertex>\nvFkP = position; vFkN = normal;');
sh.fragmentShader = sh.fragmentShader.replace('#include <common>', ['#include <common>', 'varying vec3 vFkP; varying vec3 vFkN; float fkWear;',
'float fkH(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }',
'float fkN(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);',
'  return mix(mix(mix(fkH(i), fkH(i + vec3(1,0,0)), f.x), mix(fkH(i + vec3(0,1,0)), fkH(i + vec3(1,1,0)), f.x), f.y),',
'             mix(mix(fkH(i + vec3(0,0,1)), fkH(i + vec3(1,0,1)), f.x), mix(fkH(i + vec3(0,1,1)), fkH(i + vec3(1,1,1)), f.x), f.y), f.z); }'].join('\n'))
.replace('#include <map_fragment>', ['#include <map_fragment>',
'fkWear = 0.0;',
'vec3 fp = vFkP, fn = normalize(vFkN); float ax = abs(fp.x);',
'if (ax > 20.0 && ax < 41.0 && fp.y < -160.0 && fp.z < 112.0) {',
'  float blot = fkN(fp * vec3(0.35, 0.08, 0.35)) * 0.6 + fkN(fp * vec3(1.3, 0.3, 1.3)) * 0.4;      // (patches)',
'  float scr = fkN(fp * vec3(2.6, 0.035, 2.6));                                                    // (scrapes along the fork)',
'  float tine = step(fp.z, 8.5) * step(fp.y, -166.0);',
'  float top = tine * smoothstep(0.45, 0.8, fn.z);',
'  float tip = smoothstep(-228.0, -272.0, fp.y) * tine;',
'  float w = 0.0;',
'  w = max(w, top * (0.78 + 0.3 * blot));',
'  w = max(w, tip * (0.7 + 0.4 * blot));',
'  w = max(w, tine * smoothstep(0.42, 0.75, blot * 0.55 + scr * 0.6));',
'  float shank = (1.0 - tine) * smoothstep(0.5, 0.75, -fn.y);',
'  w = max(w, shank * smoothstep(0.5, 0.8, blot * 0.6 + fkN(fp * vec3(0.9, 0.9, 3.5)) * 0.5) * (0.6 + 0.4 * smoothstep(60.0, 0.0, fp.z)));',
'  fkWear = clamp(w, 0.0, 1.0);',
'  vec3 steel = vec3(0.50, 0.505, 0.52) * (0.72 + 0.45 * scr) + vec3(0.08) * fkN(fp * vec3(6.0, 0.2, 6.0)) - vec3(0.12, 0.13, 0.13) * smoothstep(0.6, 0.9, blot) * (1.0 - top);',
'  diffuseColor.rgb = mix(diffuseColor.rgb * (0.82 + 0.18 * blot), steel, fkWear);',
'}'].join('\n'))
.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.3, fkWear);')
.replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.9, fkWear);');
};
m.customProgramCacheKey = function () { return 'forkwear1'; };
W_[m0.uuid] = m; return m;
}
function hmCartonDrop() {
var o = new THREE.Group(), T = hmWhTex(), m = new THREE.MeshStandardMaterial({ map: T.whCarton, roughness: 0.85 });
[[0, 0.17, 0, 0.5, 0.34, 0.4, 0.3], [0.45, 0.1, 0.25, 0.3, 0.2, 0.3, 1.1], [-0.3, 0.08, -0.3, 0.25, 0.16, 0.22, 0.6]].forEach(function (q) { var b = new THREE.Mesh(new THREE.BoxGeometry(q[3], q[4], q[5]), m); b.position.set(q[0], q[1], q[2]); b.rotation.y = q[6]; b.rotation.z = q[6] * 0.2; b.castShadow = true; o.add(b); });
return o;
}
function T_whTorch() {
var T = hmTextures(); if (T.whTorch) return T.whTorch;
var t = T.whTorch = new THREE.TextureLoader().load('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAQDAwMDAgQDAwMEBAQFBgoGBgUFBgwICQcKDgwPDg4MDQ0PERYTDxAVEQ0NExoTFRcYGRkZDxIbHRsYHRYYGRj/wAALCAEAAQABAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APz/AKKKKKKKKKKKKUAmlCE07ym9KXyG9DS/Z39KQwsO1NMbDtTSpFJRRRRRRRRRRRRRRRRRRRRSgE9KesRPap0tWY9Ktxac7H7pq9Do0jfwH8quxeH5G/gP5VbTwzKf+WZqb/hFpcf6s1FJ4YlUf6s/lVCfQJU/gNZk2lSJn5aoyWjr2qs0RU9KYQRSUUUUUUUUUUUUUUUUoGakSJmPSrkNkzkfLWta6Q74+Wtu10E4GVrYttFhTG4CtOGwtkxkCr0UVsvRRV2IW4/hH5VcjFsRyg/KnNDaMOVFUbjTrOQH5VrCvdCgcHaBXNX2gbSSq1zt3pTIT8tZM1qyE8VUdCDTKKKKKKKKKKKKKKcqFjV2CzZyPlrZs9Id8fLXRWeiqgBda1Y7eCEYwKmEoHCip4o55iAqmtO30i6lxnIrUg8OTNjO6ta28KuwGVNacfhFiPuGo7jwpKikqpFYF9o13BkgE4rnbozQkhwQfesyWfJO4Vn3EcMoPAzWDfaepyVFc/dWpQnis54yCaiNFFFFFFFFFFFSRxljWvY6a0rDC5rrtL8PFgCycV0KafFbR9BmopGPRRgU2K2lmcBQa3tO0B5CGdSfwrrtO8OElf3f6V1Vj4bUKCVH5Vt2+gxLj5P0rXttHiX/AJZ1rQaVDt/1YpLnR7dkPyVy+q+H4WVsKPyrzvXfDi/NhM/hXn+p6PJC7bQa5u5SSJsEEVmzT9Q1ZV1scHpWRPDycCqTpioyMUlFFFFFFFFSRRl2AxW9pmmNNIvy5zXoWieHgEV3SuiaGK3j2oBmqMkLytgDNWrTQpp2BKnBrp9O8NiMAsuPwrqtP0ZQQBHXWadopO35MV0trooCjIrRTSUUfdqeOwRT0q3HaoB2pk9sm3iuf1KzBRsVwms2jDd8tcDq1vGdwZa4TV7JPmKiuJ1CIxufSsWVyDUB+bioZIMjIFVJIiO1QMMGkoooooopyIWatrTbBpZF4r0nw9oYCq7rXXEpBEEjAH0psFlNeS4VSc966vSvCDuAzRk/UV09t4cWEACPn6VqW2hMzDKV0VjoyRgZUVv21rHGo4FXlZFGKVp1HcVEblB/EKT7YoHDVXmvlwfmFZN3fKQRmua1J45FbOK4PXLRWVilebawHiZgwxXE6iQxIPWueuIzuOKrhDmrMUYYYIps9n8pIFZU8BUniqjDBpKKKKKUDJxV+yty8g4zXf8AhzSQzKzLxXex7LeAIgGcVb0+xlv7kAA4zya9S8NeFF2oWjH5V6DZ6FGkQRY/0q8NDQDJUUhsUiH3RTMiM88UouD/AAij99J608W8rdaU2chHQ1DJauAetZF7HKqnBNc1fXNxEx5NYV3qhAO+sC91BZFPzZrj9YjiuVYYrz7VtPmhkLBSUrG8gucYpGsW6haasJRuRVpIw6YIrNv7LGSBWFPEVY8VWIxRRRRUsKbmHFdPotlvlXivSdORLW2HGDir9vvurlUXua9S8I6IpCEpXrelWaIioi8V1VpaKqAkVLMiheAKxLxwpIUZNZy27yvk5rRt9O4GRWlFp3+xVldO/wBmnHT+Kqz6cdpxWJfaaxU/LmuR1PTPvZSuL1bS22tgVwOqwz2zsVzisL7QZZNj8GpG01bpMFQc1iXvhd4mMkScdxVEadgbWXFULvTyuSFqgFKNyKfPEssXSuav7ba54rHkXBplFFKOtX7OLc613GhwKihiK6E3OSFB4rrPDNpvlVmHJr2rw7GsUKKBya9F0qMbQTW+rhU61Tubjd8qmqQtjK2TVuCxwRha1rayAwWFaCW6gdBT/I9qaYPao5LbI6VmXVnkH5a5++08MDlM1yOraMGViq153rmhFiwKc+tcLfaC8UxKqas6dbEMEkGPets6aksWCueK5jWNEEDmRFx61zV1aqyEY5rmL6Dy5CQKqo3ODVDUYAylsVzVzHtY1TPWiinxjLVtabCWkHFdjbN5NuBV2xYy3Qz0r0vw4Vj2k16t4el3lTXodjcKkQ5q5JfjG0NzRB+8bJrVtodxGBWpFAABgVdih9BVhYwBzSnaKYWXPSkJXHSq8saMKzbqyVgeK5+/07g/LXKajoizAgp+lcnqHhsKSDHXNXejeQ5YLjFNhOF2t1FVtRgWW3YYzxXn+pQeVM6471y2qRDBIFc++VeklHmQkVzt9Dtc8VkuMGmUVYt0ywrqNKt+hxWy+RhRWrpEZ3Bsd673SpijIoNeo+HrgJCpJrrY9VCR/eqxaX5mmyWrqLBwwUCuitVGBitWBM4q4AFXpUcsoUcmqUt4q96rm+5p63malWZWpSARVWa2WQHisu40wcnbWFqGloUYba4fV9NClht5rhtQiNtMSOAKoyXCun1rkdeQb9471x178ysDXNXQ2uagSTjBNZmopyTisGZcMahpR1rRsY90grtNMttsAOKnePdJjFdJpFr8q8V1Gnwn7Uld5YSmGFRmrUmqMGCBq6DRrokAk13ukzHaGNdXYvuxW3E4VaWS4CLyayrq8Jzg1ntM7txzT0hmfsasrbSjHBqZVZPvVKshzVuNA4zRNCpQ8VhX9uORiuM1q0BVmxXmPiOAKjECuFNztkZCaydWkEluxz71xV5KN5rn79huJrOEuH61BduGjJrDn+8arHrTkGWrd0qLdKvFd5aQbbMcdqIoN04GO9dnpVn+5BxXSabZkzg4rfZTHGKz1dpb3GT1rttEjJCj1rv9OQqqj0rq7AlVBrS+0YGc1Unuy3eqyK07+1alppu4j5a3LbSCVHy1bbSsL92qFzp+0fdrLkhMTVJBNg1aLAjNZeoJlDXH6so2MK8r8TgbJB6V5JqU/k3x54zWXd3O6JhmuLvrnbMyk8g1i3c4Yday2mw3WmyTbk61mzHJNVz1qSIfOK6jQot0y8V36RbbMfSlsoN12OK73TbbFsvFdRplpgBsVbu4tsR47Vl2MBa7zivQ9BtQWXiu80+36cV0MMW2OmXJKpgVm72aTbW/pltu28V2Om6cCAStdHb2ACjipZLIbfu1kX1kADxXK6jAFDDFYRl2SYzVyGcFOtQXb5jNcZrDYDV5T4qk2lx65rxLxDc7LsnNZElzviyD2rjNZnKXp561jS3BYGqjSEmmlzioHOTUVSwffFdj4eTMq16CY/8ARFqbSoN14OK9I0yzzbpxXV2FiREDjtTb+1IibjtWfp1oftHTvXoWhW5XHFdzp0WAtbQTCDiqV2KpwRbrkcV1+kQDK8V3GnRAKK6S1tgyjgUtxbhFPFYV+o2GuH1hgpbFcVczkXJAPerNrOT3qSdi0ZrkdYUnfXlniuIkscGvDvE8DC4bjuax44iYBkdq5TxJblZlcDvXOsjY6VAVING046VC4qI9amg/1grtfDf+uSvRzHmzU1b0SMG+Ar1fSLUNbIcV19lZjyBx2qHULMeW3Has+wtAJxx3ruNGgAIrr7JAMVqYGwVSulHWqcLKlwM11mkzqCtdtp867RzXRWt0FUc0tzdKy9a53UbgbG5rgtanBLc1xVw266P1rQsV4zVyRMxmuZ1SHIbivN/E1ruzxXjXiXTS8x+XuaxU0wiIfL2rlfE2nnA+XvXJzWJVT8tZ8luQ/Sm+QdvSqUyYJqsRT4ThxXZ+HHxOn1r0+P57AfSrWjuE1AV63ocym1Xmu00+RWiApb1QyHjtWVbEJcYrrNKlAZfeuptZRgVprJujzmq102UOKx5JSkuc1s6bfgY+auy03VBgAtXQwakpX71Ol1EbD81c/qepDacNXEarfAluawY/3ku6tyyTCA1bkwI6wNQQMD71wmvW4dm4ry/WtO3zn5azW0nCfd6CuP8AEWl5kxtrjr3TdsZ+WubuLXEp4qNrbEROKxLxNrGs5utOjOHFdPoU+ydea9UsJhJpw57U60n8q+U5716boGoD7OBntXbaVqK/d3VsyzB481ivJ5d3+Nb+m3J+U5rrbSfKA5rXt5srgmpnG4YrJu4CGPFVIpngk74rcsdTIA+at231chQN1TSasSv3qx77USwPNc5dO80p9KktYTuHFbETBVA6U24uQFIBrFvJxtY5rkNVYMGPrXIT2YnueneoZ9PURn5a4jXLJWmPFcRrFoqRniuMntwZzx3qK6gCWxOO1chf8Oay260KcNWzpc2yVecV6bol4GtAue1WJJvLuM5711+hantCjdXa6XqB88fNXcWk3mwA56ioLuAlg4FW9Ok2kAmussLjKBc1sQT4I5rWicOgpJYRIuCKz5rIg9KriB0PGRViKSZTjJq0HmYdTTGgdzzmnJZZPSpfIEY4FQzS+Wh5rHub3knNY97qAC7d3Nc5fXgYkZqC1jD5cikvkVYCa4LVYw8zGuA8QEDcK5EQ7peneqWr4jtyK4S/bLms09aSrlpJtkHNdxoV9gBS1btxJkBh3rU0a9IKjNd7pF1uKnNek6HN5kSgmt2SENGeOtUFJhmweK2bO76HdW9b3QYAg81rWlzyBniteJldRUpjDDkZphtEY9KcmngmrSWAx0p/2NV7Uxowo6VTuGVVPrXP38/XniuZv7zywSTXLX2pEEktWQLtrifAPFblrJsjAzVLVb0CIqGri9SnURuxNeca3OJJio9ay4owAWNc14gnAyoNcPdvukNU6KkibDCuh0m6KOvNdjFN51sPpUtjOY7jBOK7nQ74CRQTweK9O0K+CbRmu3gmEsIINU7yPqw6iqcV6Yn2k4rYtNS+YENXR2N6rAENzW7b3mAMH8K0obtW6mrsUiNV2Lb61aULjrUchUCs66nCg4NYN7ddea53ULsKpJNcZqt9lmJNcld3LSykCr2n2xUBm6mtGaUQQnmuW1HUC0pG7gVyOtakFjZQ3SuHnmM9wWznmieRYLQnviuB1u73ytzXMStlzUVFKDg1fs5trjmuv0q7DIFJrSclXDrW9pN7grzXpOg6nuRQW+YV6BpeqKUClq1JJ1kTg5rHvEPLpVe3vmicBjXQWGqgYIbmujtdYUgBmrXt9QDYw2a1be+6fNWpBe9Pmq8t3kfepktzx1rKu7kBTk4rmdQvwucGuU1C/wCuWya5S+medyFyaZZ6cxcO45rbjgWKLJ9K5/WLzaCAa4nUL0RqzE81w2ragZJCoNZ8B53HpWbrV+FjKBq4O/uC8h5rMJyaSiipInw1bmnXexxzXW20gngHOasQSNbzZ7V1+kaqE2kNiuzsdZZQrBq6bT9cWQBWetpZVmTIOc1RurXcdycGqqTTWxwc1oW2rlcZatyz1fph8fjXQWmrMQPmzW1baoeOa1YtSO2km1A7T81Yt7qGc/NXM6hels4Nc9MJZ3IAOKlttOHVxk1pJbJGuSBWfqVyqRlQa4LW7sDcS1efazqON3zVypdppix5zTri4W3tzzjiuN1W+Mjt81c7K5ZqiooooHBq3bTFWHNdRpV9ggE10eVli3KcmiC5kt5ODxXR6brPIVmrrLG93YZWrrdM1NsBWbNdJE6TRg5HNRzWiuDxms+TTmVsr+VSQxzxMMZxWxaXEq4zmt+0umwOtbMNyxQcmlllkK8VnzRzyHoarNpxbluaiNiqdFAqKQpB1qjc367SFNc3ql8qxszNXnWu6kCW+auAvp2uJyATjNQErDGWbrXO6rqGcgNXLXM5dic1TJyaKKKKKcrYNaFpclGHNdVpuogqFY1rsFkXctJE7RvkE10Wl6q0TAM3FdrpmpJIqkNz6V1VlqRQDLcVu22oxuAC1X0MUoGCOasR2qE8Yq/b2aEjKitq1sI+PlFbFtYpj7gq01kgXoKqSWig9KqzIiKelYl9cpHnBFcxf3rEnBrnrzUlhBy4zXHaxrYIb564TULyS6lIUnFUGRY1LNWBquohQVU1yN5cl3PNZ7Nkmm0UUUUUU9HKmtG0uyjDmuo07UgQFZq20CTICvWnoGjbvWrY6g8LDDEV1Fjr5ACuc1v2usI2Nr81sWutOpHzVtW3iDaBk1rWviOPIywrctfEsIx8wrXg8UW4H3h+dPl8VRY4YVQm8S7/ALpqhNrDyg/PgVjX2pRopLyD865DVdejUMFYCuH1TXSxYK2T7Vzc0s1zIdxOKhkCQpuYjNc3q2qqAyq1cde3hdj81ZbuWPWmUUUUUUUUU9HKmr9rdlGHOK6TTtV2kBmrpbe5inQcirHlkDcpzT45pIz1q/b6k6H7xFbNprjrjLVs2+uRkDditW31eA4+YitSDVIOP3lXo9WtwP8AWUSa3bqOHJ/GqU3iNU+4R+dZtx4onwcPWLeeILiUEBs1hXNzcXBOWP4VTNsT8zVTurqC1Q8jNcnqut7shW4rkby+aRjzWY7ljnNMoooooooooopysQatQXLIRg1t2WqtGR81dLZayrABjWvFPDOvUZqXyc8qc0oWRfWrEc8qnqauw3sq+tXotRlHc1aXUpccE/nQb6Vu9RtPM/c03y5XPOacLYDlziq9xcWtspyRkVzWqeII0DBGFcZqWtvIT85rnLm8ZycmqTMWNNoooooooooooooBxUqTFT1q7BfMhHzVr2usOmPnrctNf6BmzWzb61C4GSKvxX1s/cVdiktm/iFXYvs5/i/WrSC2A++Kf5tovVhTH1GyiH3lrPufEdtGDtYcVg33izghWrl7/wARySZG8/nXPXWpvIT81Zkk7MTzUJJNJRRRRRRRRRRRRRRRSgkU9ZWXvViO7Ze9XItSdf4quxazIv8AGfzq9F4gkXH7w/nVtPE0o/5aGpP+Eplx/rD+dRSeJ5T/AMtD+dUpvEMrA/vD+dZ82syPn5z+dUJdQds/MaqPOzHrURYmkoooooooooooooooooooopQSKUORThMw7mnfaG9aDcN6mkM7HuaaZGNNLE0lFFFFFFFFFFFf/9k='); t.colorSpace = THREE.SRGBColorSpace;
fromProject(['flashlight.jpg', 'flashlight.png', 'torch.jpg', 'torch.png'], 'url', function (u) { new THREE.TextureLoader().load(u, function (x) { t.image = x.image; t.needsUpdate = true; }); }, function () { });
return t;
}
function T_whFlare() {
var T = hmTextures(); if (T.whFlare) return T.whFlare;
return (T.whFlare = vgTex(256, 128, function (g, w, h) {
var cx = w / 2, cy = h / 2, gr = g.createRadialGradient(cx, cy, 0, cx, cy, h / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.12, 'rgba(235,242,255,0.9)'); gr.addColorStop(0.4, 'rgba(170,200,255,0.25)'); gr.addColorStop(1, 'rgba(120,160,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
var st = g.createLinearGradient(0, 0, w, 0); st.addColorStop(0, 'rgba(160,190,255,0)'); st.addColorStop(0.5, 'rgba(220,235,255,0.7)'); st.addColorStop(1, 'rgba(160,190,255,0)'); g.fillStyle = st; g.fillRect(0, cy - 2, w, 4);
g.strokeStyle = 'rgba(180,210,255,0.07)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, h * 0.3, 0, 6.3); g.stroke();
}, false));
}
var BEAM_N = 26, BEAM_L = 0.7, BEAM_A = 0.5;
function T_whBeam() {
var T = hmTextures(); if (T.whAirBeam) return T.whAirBeam;
return (T.whAirBeam = vgTex(64, 64, function (g, w, h) { var gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); for (var i = 0; i <= 8; i++) { var x = i / 8; gr.addColorStop(x, 'rgba(255,255,255,' + Math.exp(-4.5 * x * x).toFixed(3) + ')'); } g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false));
}
function hmGlassCapture(WH) {
if (!WH.glassR || !WH.glassEye) return;
if (!WH.cubeRT) { WH.cubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter }); WH.cubeCam = new THREE.CubeCamera(0.1, 90, WH.cubeRT); scene.add(WH.cubeCam); }
WH.cubeCam.position.copy(WH.glassEye);
var hid = WH.panes.concat(WH.dyn ? [WH.dyn] : []), was = hid.map(function (o) { return o.visible; });
hid.forEach(function (o) { o.visible = false; });
try { WH.cubeCam.update(renderer, scene); } catch (e) { }
hid.forEach(function (o, i) { o.visible = was[i]; });
WH.glassR.envMap = WH.cubeRT.texture; WH.glassR.envMapIntensity = 1.0; WH.glassR.roughness = 0.02; WH.glassR.needsUpdate = true;
}
function hmWhLights(WH, on) {
WH.litState = on; WH.glassAt = performance.now() / 1000 + 0.3;
sun.intensity = on ? 2.9 : 0; sun.visible = on; hemi.intensity = on ? 0.32 : 0; if (WH.fill) WH.fill.intensity = on ? 0.3 : 0; if (HM.rim) HM.rim.intensity = on ? 0.35 : 0;
scene.environmentIntensity = on ? 0.6 : 0.0;
if (scene.fog && scene.fog.color) scene.fog.color.set(on ? 0xbcc1c6 : 0x000000);
if (scene.background && scene.background.isColor) scene.background.set(on ? 0xbcc1c6 : 0x000000);
if (WH.lampM) WH.lampM.color.setRGB(on ? 4.2 : 0.015, on ? 3.9 : 0.015, on ? 3.4 : 0.015);
WH.pools.forEach(function (o) { o.visible = on; }); WH.cones.forEach(function (o) { o.visible = on; });
var dyn = WH.dyn, seen = {};
WH.g.traverse(function (o) {
if (!o.material || o === dyn) return;
for (var p = o.parent; p; p = p.parent) if (p === dyn) return;
(Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
if (!m.isMeshBasicMaterial || m.blending === THREE.AdditiveBlending || m.userData.glow || seen[m.uuid] || m === WH.lampM) return;
seen[m.uuid] = 1; if (!m.userData.c0) m.userData.c0 = m.color.clone();
m.color.copy(m.userData.c0).multiplyScalar(on ? 1 : 0.02);
});
});
}
function hmPatrolTick(E, r, d) {
var WH = HM.wh; if (HMLOG.btn) HMLOG.btn.style.display = WH && hmWH() ? '' : 'none'; if (HMLOG.litBtn) HMLOG.litBtn.style.display = WH && hmWH() ? '' : 'none';
if (!WH || !hmWH()) { hmPatrolPanel(null); hmAlerts(null); return; }
if (WH.litState !== (HM.litOn !== false)) hmWhLights(WH, HM.litOn !== false);
var tg_ = performance.now() / 1000; if (WH.glassAt == null) WH.glassAt = tg_ + 3; if (WH.glassAt && tg_ > WH.glassAt) { WH.glassAt = 0; hmGlassCapture(WH); }      // (once the hall and its models are in)
if (HM.bloom && !WH.bloomSet) { WH.bloomSet = true; HM.bloom.strength = 0.42; HM.bloom.radius = 0.5; HM.bloom.threshold = 1.05; }
['arCmd', 'arAct'].forEach(function (k) { if (HM[k]) HM[k].visible = false; });
var M = hmMission(E), t = performance.now() / 1000;
hmPatrolPanel(M); hmAlerts(M);
if (!M) return;
(M._props || []).forEach(function (q, i) {
var m = WH.props && WH.props[i]; if (!m) return;
var Hh_ = WH.hall || null; m.visible = !Hh_ || (q[0] > Hh_.x0 && q[0] < Hh_.x1 && q[1] > Hh_.y0 && q[1] < Hh_.y1);
m.position.set(q[0], q[2], -q[1]); RG_Q1.set(q[4], q[6], -q[5], q[3]).normalize(); m.quaternion.copy(RG_Q1);
});
var seen = {};
(M._lerp || []).forEach(function (a) {
seen[a.id] = 1;
var A = WH.actors[a.id];
if (!A) {
var obj = a.kind === 'person' ? (a.badge ? hmPerson(true) : hmIntruder()) : a.kind === 'forklift' ? hmForklift() : a.kind === 'carton' ? (WH.dropsReal ? new THREE.Group() : hmCartonDrop()) : null;
A = WH.actors[a.id] = { obj: obj, kind: a.kind, lx: a.x, ly: a.y };
if (obj) WH.dyn.add(obj);
}
if (a.kind === 'door') { var dr = WH.doors.reduce(function (b, q) { return !b || Math.abs(q.x - a.x) < Math.abs(b.x - a.x) ? q : b; }, null); if (dr) { dr.m.position.z = dr.z0 + Math.sin(t * 31) * 0.03 * (Math.sin(t * 3.1) > 0 ? 1 : 0.3); dr.shake = t; } return; }
var o = A.obj; if (!o) return;
var gz = hmCourseH(a.x, a.y);
o.position.set(a.x, gz, -a.y); o.rotation.y = a.yaw;
var mv = Math.hypot(a.x - A.lx, a.y - A.ly); A.lx = a.x; A.ly = a.y;
if (o.userData.hipL) {
var U = o.userData; U.ph += mv * 4.2; var sw = a.moving ? Math.sin(U.ph) * 0.55 : 0;
U.hipL.rotation.z = sw; U.hipR.rotation.z = -sw; U.shL.rotation.z = -sw * 0.7; U.shR.rotation.z = sw * 0.7;
if (a.crouch) { o.scale.set(1, 0.62, 1); } else o.scale.set(1, 1, 1);
} else if (o.userData.rig) hmRigPose(o, a, mv, d);
if (o.userData.beacon) o.userData.beacon.material.color.setRGB(Math.sin(t * 9) > 0 ? 1.6 : 0.3, Math.sin(t * 9) > 0 ? 0.8 : 0.15, 0);
});
Object.keys(WH.actors).forEach(function (id) { if (!seen[id]) { var A = WH.actors[id]; if (A.obj) WH.dyn.remove(A.obj); delete WH.actors[id]; } });
WH.doors.forEach(function (q) { if (q.shake && t - q.shake > 0.3) { q.m.position.z = q.z0; q.shake = 0; } });
if (WH.window) { var Of = hmWH().office || { x0: 29, y0: 15 }, broke = (M._lerp || []).some(function (a) { return a.kind === 'person' && a.x > Of.x0 && a.y > Of.y0; }) || WH.broke; if (broke) { WH.broke = true; WH.window.material.opacity = 0.05; } }
(M.rings || []).forEach(function (q) {
if (!q[4] && q[2] < 60) return;
var key = q[0] + ',' + q[1] + ',' + q[3]; if (WH.rings.some(function (x) { return x.key === key; })) return;
var m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.0, 48), new THREE.MeshBasicMaterial({ color: q[4] ? 0xff9f43 : 0x8a9099, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
m.rotation.x = -Math.PI / 2; m.position.set(q[0], hmCourseH(q[0], q[1]) + 0.05, -q[1]); m.renderOrder = 6; WH.dyn.add(m);
WH.rings.push({ key: key, m: m, t: 0, k: Math.max(0.3, (q[2] - 40) / 40) });
});
WH.rings.forEach(function (q) { q.t += d; q.m.scale.setScalar(0.3 + 9 * q.k * q.t); q.m.material.opacity = Math.max(0, 0.75 * (1 - q.t / 1.4)); });
WH.rings = WH.rings.filter(function (q) { if (q.t < 1.4 && WH.rings.length < 60) return true; WH.dyn.remove(q.m); q.m.geometry.dispose(); q.m.material.dispose(); return false; });
var pk = M.plan && M.plan.length ? M.plan.length + ':' + M.plan[M.plan.length - 1].join(',') : '';
if (pk !== WH.planKey) {
WH.planKey = pk; if (WH.plan) { WH.dyn.remove(WH.plan); WH.plan.geometry.dispose(); }
if (false && M.plan && M.plan.length > 1) {
var pos = []; M.plan.forEach(function (p) { pos.push(p[0], hmCourseH(p[0], p[1]) + 0.04, -p[1]); });
var ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
WH.plan = new THREE.Line(ge, new THREE.LineBasicMaterial({ color: M.state === 'investigate' || M.state === 'track' ? 0xff9f43 : 0x3ec5ff, transparent: true, opacity: 0.9, depthWrite: false })); WH.plan.renderOrder = 5; WH.dyn.add(WH.plan);
} else WH.plan = null;
}
if (!WH.tgt) { WH.tgt = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.55, 40), new THREE.MeshBasicMaterial({ color: 0xff9f43, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide })); WH.tgt.rotation.x = -Math.PI / 2; WH.tgt.renderOrder = 6; WH.dyn.add(WH.tgt); }
WH.tgt.visible = false;
if (M.target) { WH.tgt.position.set(M.target[0], hmCourseH(M.target[0], M.target[1]) + 0.05, -M.target[1]); WH.tgt.scale.setScalar(1 + 0.25 * Math.sin(t * 6)); WH.tgt.material.color.set(M.alarm ? 0xff3030 : 0xff9f43); }
var K = HM.K, pel = K && K[HM.byName.pelvis];
if (pel) {
if (!WH.lamps) {
var flT = T_whFlare(), bmT = T_whBeam();
WH.lamps = [0.035, -0.035].map(function (sy) {
var L = new THREE.SpotLight(0xeef4ff, 9, 30, 0.62, 0.4, 2); L.map = T_whTorch(); L.castShadow = true; L.shadow.mapSize.set(512, 512); L.shadow.camera.near = 0.05; L.shadow.camera.far = 18; L.shadow.bias = -0.0005; L.shadow.normalBias = 0.02;
WH.dyn.add(L); WH.dyn.add(L.target);
var fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: flT, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); fl.renderOrder = 9; WH.dyn.add(fl);
var beam = [];
for (var k = 0; k < BEAM_N; k++) {
var u = k / (BEAM_N - 1), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: bmT, color: 0xeef4ff, transparent: true, opacity: 0.075 * Math.pow(1 - u, 1.6) + 0.004, blending: THREE.AdditiveBlending, depthWrite: false }));
sp.renderOrder = 8; sp.userData.u = u; WH.dyn.add(sp); beam.push(sp);
}
var lens = new THREE.Mesh(new THREE.PlaneGeometry(0.009, 0.011), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6.2, 7) })); WH.dyn.add(lens);
return { L: L, fl: fl, beam: beam, lens: lens, sy: sy };
});
WH.bounce = new THREE.PointLight(0xdfe4ea, 0, 9, 2); WH.bounce.castShadow = false; WH.dyn.add(WH.bounce);
WH.spill = new THREE.PointLight(0xe8eef6, 0, 3, 2); WH.spill.castShadow = false; WH.dyn.add(WH.spill);
}
var Qr = new THREE.Quaternion(pel.wq.x, pel.wq.z, -pel.wq.y, pel.wq.w), base = HW(pel.wp.x, pel.wp.y, pel.wp.z);
var fwd = new THREE.Vector3(1, -0.22, 0).normalize().applyQuaternion(Qr), toCam = new THREE.Vector3();
var lensQ = Qr.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.42)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));   // (the face leans back: its windows look a little down)
var lampsOn = HM.litOn === false;
if (WH.bounce) {
var bp = HW(pel.wp.x, pel.wp.y, pel.wp.z), bd = new THREE.Vector3(1, -0.22, 0).normalize().applyQuaternion(Qr), hit = null, P_ = new THREE.Vector3();
for (var st2 = 0.3; st2 < 14; st2 += 0.15) { P_.copy(bp).addScaledVector(bd, st2); if (P_.y <= hmCourseH(P_.x, -P_.z) + 0.02) { hit = st2; break; } }
if (hit == null) hit = 14;
WH.bounce.position.copy(bp).addScaledVector(bd, Math.max(0.3, hit - 0.6)); WH.bounce.position.y += 0.9;
WH.bounce.intensity = lampsOn ? 2.6 * Math.min(1, 3.5 / Math.max(1, hit)) + 0.5 : 0;
WH.spill.position.copy(bp).addScaledVector(bd, 0.6); WH.spill.intensity = lampsOn ? 0.35 : 0;
}
WH.lamps.forEach(function (lp) {
var onboard = camera.position.distanceTo(HW(pel.wp.x, pel.wp.y, pel.wp.z)) < 1.2;
lp.L.visible = lampsOn; lp.fl.visible = lampsOn && !onboard; lp.beam.forEach(function (sp) { sp.visible = lampsOn && !onboard; });
lp.lens.material.color.setRGB(lampsOn ? 6 : 0.12, lampsOn ? 6.2 : 0.12, lampsOn ? 7 : 0.13);
var pos = new THREE.Vector3(0.428, 0.026, -lp.sy).applyQuaternion(Qr).add(base);
lp.L.position.copy(pos).addScaledVector(fwd, 0.035); lp.L.target.position.copy(pos).addScaledVector(fwd, 5);
lp.lens.position.copy(pos).addScaledVector(fwd, 0.002); lp.lens.quaternion.copy(lensQ);
lp.beam.forEach(function (sp) { var al = sp.userData.u * BEAM_L, dia = 2 * (0.008 + al * Math.tan(BEAM_A)); sp.position.copy(pos).addScaledVector(fwd, al); sp.scale.set(dia, dia, 1); });
toCam.copy(camera.position).sub(pos); var dist = toCam.length(); toCam.normalize();
var face = Math.max(0, fwd.dot(toCam)), a2 = Math.pow(Math.max(0, (face - 0.45) / 0.55), 2);
lp.fl.position.copy(pos).addScaledVector(toCam, 0.02);
lp.fl.material.opacity = 0.05 + 0.55 * a2; var sc = (0.012 + 0.09 * a2) * Math.max(0.6, Math.min(3, dist * 0.3)); lp.fl.scale.set(sc * 1.3, sc, 1);
});
}
var al = !!M.alarm;
WH.beacons.forEach(function (b, i) { var on = al && Math.sin(t * 7 + i) > 0.2; b.material.color.setRGB(on ? 3 : 0.25, on ? 0.15 : 0.05, on ? 0.1 : 0.05); });
WH.alarmLight.intensity = al ? 25 * (0.5 + 0.5 * Math.sin(t * 7)) : 0;
if (WH.dockRing) WH.dockRing.material.opacity = M.state === 'docked' ? 0.6 + 0.4 * Math.sin(t * 3) : 0.8;
hmSiren(al);
}
function hmSiren(on) {
var A_ = AUD.ctx, N = AUD.nodes; if (!A_ || !N) return;
var S = HM.siren;
if (!S) { var o = A_.createOscillator(), gg = A_.createGain(); o.type = 'sawtooth'; o.frequency.value = 700; gg.gain.value = 0; var f = A_.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200; o.connect(f); f.connect(gg); gg.connect(N.master); o.start(); S = HM.siren = { o: o, g: gg }; }
var t = A_.currentTime, play = on && AUD.on && mode === 'humanoid' && !document.hidden && !CAP.offline;
S.o.frequency.setTargetAtTime(play ? 650 + 450 * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 1.6)) : 700, t, 0.05);
S.g.gain.setTargetAtTime(play ? 0.018 : 0, t, 0.08);
}
var HMP = null, HMA = null;
function hmAlerts(M) {
if (!HMA) {
var bx = document.createElement('div'); bx.style.cssText = 'position:absolute;left:50%;top:54px;transform:translateX(-50%);z-index:21;display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none;font:600 14px/1.3 Inter,-apple-system,Segoe UI,sans-serif;color:#f4f6fa';
el.appendChild(bx); HMA = { box: bx, seen: {}, list: [], html: null };
}
if (!M || HM_FIXED) { HMA.box.style.display = 'none'; return; }
HMA.box.style.display = '';
var now = performance.now() / 1000;
(M.feed || []).forEach(function (f) {
var key = f[0] + '|' + f[2]; if (HMA.seen[key]) return; HMA.seen[key] = 1;
var tx = String(f[2]), kind = /^ALARM|intruder|without a badge/i.test(tx) ? 'alarm' : /^Heard/i.test(tx) ? 'heard' : /^Saw|^Inspecting/i.test(tx) ? 'seen' : null;
if (!kind || (HMA.first == null && M.t > f[0] + 3)) return;
HMA.list.push({ text: tx, kind: kind, at: now });
});
HMA.first = 1;
HMA.list = HMA.list.filter(function (q) { return now - q.at < (q.kind === 'alarm' ? 7 : 4.5); }).slice(-3);
var html = HMA.list.map(function (q) {
var c = { alarm: ['rgba(150,20,24,.88)', 'rgba(255,90,90,.9)', '🚨'], heard: ['rgba(60,40,8,.85)', 'rgba(255,184,77,.85)', '🔊'], seen: ['rgba(10,30,60,.85)', 'rgba(110,170,255,.85)', '👁'] }[q.kind];
var age = now - q.at, op = Math.min(1, age * 5) * Math.min(1, ((q.kind === 'alarm' ? 7 : 4.5) - age) * 2);
return '<div style="background:' + c[0] + ';border:1px solid ' + c[1] + ';border-radius:10px;padding:7px 14px;opacity:' + op.toFixed(2) + ';white-space:nowrap;box-shadow:0 4px 18px rgba(0,0,0,.35)">' + c[2] + ' ' + q.text.replace(/</g, '&lt;') + '</div>';
}).join('');
if (html !== HMA.html) { HMA.html = html; HMA.box.innerHTML = html; }
}
function hmPatrolPanel(M) {
if (!M) { if (HMP) HMP.box.style.display = 'none'; return; }
if (!HMP) {
var box = document.createElement('div'); box.style.cssText = 'position:absolute;right:12px;top:48px;width:300px;z-index:20;font:12px/1.4 Inter,-apple-system,Segoe UI,sans-serif;color:#e8ecf2;pointer-events:none';
box.innerHTML = '<div class="pc" style="background:rgba(11,15,22,.82);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px 12px;backdrop-filter:blur(6px)"></div>' +
'<div class="pf" style="margin-top:8px;background:rgba(11,15,22,.78);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:8px 12px"></div>' +
'<canvas class="pm" width="600" height="360" style="margin-top:8px;width:300px;height:180px;background:rgba(11,15,22,.82);border:1px solid rgba(255,255,255,.08);border-radius:10px"></canvas>';
el.appendChild(box); HMP = { box: box, card: box.querySelector('.pc'), feed: box.querySelector('.pf'), map: box.querySelector('.pm') };
}
HMP.box.style.display = HM_FIXED || !HMLOG.on ? 'none' : '';
if (HMP.box.style.display === 'none') return;
var col = M.alarm ? '#ff4d4d' : { investigate: '#ff9f43', search: '#ff9f43', inspect: '#ffd166', track: '#ff4d4d', hold: '#ff4d4d', docked: '#7ee08a', home: '#9fb3c8' }[M.state] || '#3ec5ff';
var mm = Math.floor((M.left || 0) / 60), ss = Math.round((M.left || 0) % 60), C = M.counts || {};
var bat = Math.max(0, Math.min(100, M.battery || 0)), bcol = bat > 40 ? '#7ee08a' : bat > 20 ? '#ffd166' : '#ff4d4d';
var html = '<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:700;letter-spacing:.04em">SPOT · SECURITY PATROL</span><span style="font-variant-numeric:tabular-nums;opacity:.85">' + (M.clock || '') + '</span></div>' +
'<div style="margin:7px 0 6px;display:flex;gap:8px;align-items:center"><span style="background:' + col + ';color:#0b0f16;font-weight:800;border-radius:5px;padding:2px 7px;font-size:11px;letter-spacing:.05em' + (M.alarm ? ';animation:none' : '') + '">' + (M.text || '') + '</span><span style="opacity:.8">' + (M.area || '') + '</span></div>' +
'<div style="display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-variant-numeric:tabular-nums">' +
'<span style="opacity:.6">battery</span><span><span style="display:inline-block;width:110px;height:7px;border-radius:4px;background:rgba(255,255,255,.12);vertical-align:middle;overflow:hidden"><span style="display:block;height:100%;width:' + bat + '%;background:' + bcol + '"></span></span> ' + bat.toFixed(0) + ' %</span>' +
'<span style="opacity:.6">walked</span><span>' + (M.dist || 0) + ' m · lap ' + (M.lap || 1) + '</span>' +
'<span style="opacity:.6">incidents</span><span>' + (C.noticed || 0) + ' detected · ' + (C.closed || 0) + ' resolved · <b style="color:' + ((C.alarms || 0) ? '#ff6b6b' : 'inherit') + '">' + (C.alarms || 0) + ' alarm' + ((C.alarms || 0) === 1 ? '' : 's') + '</b></span>' +
'<span style="opacity:.6">patrol ends</span><span>in ' + mm + ':' + (ss < 10 ? '0' : '') + ss + '</span>' +
(M.aim ? '<span style="opacity:.6">cameras</span><span>' + (M.aim[0] >= 0 ? 'up ' : 'down ') + Math.abs(M.aim[0]) + '° · ' + (M.aim[1] >= 0 ? 'left ' : 'right ') + Math.abs(M.aim[1]) + '°' + (M.aim[2] ? ' · ' + (M.aim[2] < 0 ? 'lower ' : 'higher ') + Math.abs(M.aim[2]) + ' cm' : '') + '</span>' : '') + '</div>' +
(M.animated ? '<div style="margin-top:7px;font-size:11px;color:#ffd166">Animated: no walking policy wired (the mission is real, the gait is drawn)</div>' : '') +
(M.alarm ? '<div style="margin-top:7px;font-weight:800;color:#ff4d4d;letter-spacing:.06em">● ALARM · OPERATOR ALERTED</div>' : '');
if (html !== HMP.last) { HMP.last = html; HMP.card.innerHTML = html; HMP.card.style.borderColor = M.alarm ? 'rgba(255,77,77,.7)' : 'rgba(255,255,255,.08)'; }
var fh = (M.feed || []).slice(-5).reverse().map(function (f, i) {
var c2 = { alarm: '#ff6b6b', warn: '#ffb35c', ok: '#7ee08a' }[f[3]] || '#c9d3df';
return '<div style="display:flex;gap:8px;opacity:' + (1 - i * 0.14).toFixed(2) + '"><span style="opacity:.55;font-variant-numeric:tabular-nums">' + String(f[1]).slice(0, 8) + '</span><span style="color:' + c2 + '">' + String(f[2]).replace(/</g, '&lt;') + '</span></div>';
}).join('');
if (fh !== HMP.lastF) { HMP.lastF = fh; HMP.feed.innerHTML = fh || '<span style="opacity:.5">No events yet</span>'; }
hmPatrolMap(M);
}
function hmPatrolMap(M) {
var cv = HMP.map, g = cv.getContext('2d'), C = hmWH(), Hl = C.hall, W = cv.width, Hc = cv.height, pad = 14;
var s = Math.min((W - 2 * pad) / (Hl.x1 - Hl.x0), (Hc - 2 * pad) / (Hl.y1 - Hl.y0)), ox = pad, oy = Hc - pad;
var X = function (x) { return ox + (x - Hl.x0) * s; }, Y = function (y) { return oy - (y - Hl.y0) * s; };
g.clearRect(0, 0, W, Hc);
g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(X(Hl.x0), Y(Hl.y1), (Hl.x1 - Hl.x0) * s, (Hl.y1 - Hl.y0) * s);
g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; g.strokeRect(X(Hl.x0), Y(Hl.y1), (Hl.x1 - Hl.x0) * s, (Hl.y1 - Hl.y0) * s);
(C.boxes || []).forEach(function (b) { if (b.kind === 'wall') return; g.fillStyle = { rack: 'rgba(224,104,42,0.55)', stack: 'rgba(180,138,90,0.55)', pallet: 'rgba(180,138,90,0.45)', mezzanine: 'rgba(120,130,140,0.35)', office: 'rgba(220,225,232,0.7)', desk: 'rgba(200,200,200,0.4)', rail: 'rgba(242,194,48,0.6)', conveyor: 'rgba(93,111,128,0.8)', platform: 'rgba(120,130,140,0.45)', clutter: 'rgba(200,150,90,0.8)', forklift: 'rgba(242,194,48,0.85)', bin: 'rgba(40,140,80,0.9)', chair: 'rgba(200,200,200,0.35)', cabinet: 'rgba(200,200,200,0.4)' }[b.kind] || 'rgba(255,255,255,0.2)'; g.fillRect(X(b.x0), Y(b.y1), Math.max(1, (b.x1 - b.x0) * s), Math.max(1, (b.y1 - b.y0) * s)); });
(C.docks || []).forEach(function (d) { g.fillStyle = '#3ec5ff'; g.fillRect(X(d.x - d.w / 2), Y(Hl.y0) - 2, d.w * s, 4); });
var PI = HM.info.patrol || {};
g.strokeStyle = 'rgba(62,197,255,0.35)'; g.lineWidth = 1.5; g.setLineDash([4, 4]); g.beginPath(); (PI.route || []).forEach(function (p, i) { if (i) g.lineTo(X(p[0]), Y(p[1])); else g.moveTo(X(p[0]), Y(p[1])); }); g.stroke(); g.setLineDash([]);
if (M.plan && M.plan.length > 1) { g.strokeStyle = M.state === 'investigate' || M.state === 'track' ? '#ff9f43' : '#3ec5ff'; g.lineWidth = 2.5; g.beginPath(); M.plan.forEach(function (p, i) { if (i) g.lineTo(X(p[0]), Y(p[1])); else g.moveTo(X(p[0]), Y(p[1])); }); g.stroke(); }
var t = performance.now() / 1000;
(M.rings || []).forEach(function (q) { var age = (M.t || 0) - q[3]; if (age < 0 || age > 1.6) return; g.strokeStyle = q[4] ? 'rgba(255,159,67,' + (1 - age / 1.6).toFixed(2) + ')' : 'rgba(160,170,180,' + (0.6 - age / 2.7).toFixed(2) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(X(q[0]), Y(q[1]), 4 + age * 26, 0, 6.29); g.stroke(); });
(M._lerp || []).forEach(function (a) {
if (a.kind === 'door') return;
g.fillStyle = a.kind === 'person' ? (a.badge ? '#f08a1c' : '#ff4d4d') : a.kind === 'forklift' ? '#f2c230' : '#b48a5a';
g.beginPath(); g.arc(X(a.x), Y(a.y), a.kind === 'forklift' ? 6 : 5, 0, 6.29); g.fill();
if (a.kind === 'person' && !a.badge) { g.strokeStyle = 'rgba(255,77,77,' + (0.5 + 0.5 * Math.sin(t * 8)).toFixed(2) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(X(a.x), Y(a.y), 10, 0, 6.29); g.stroke(); }
});
if (M.target) { g.strokeStyle = M.alarm ? '#ff4d4d' : '#ff9f43'; g.lineWidth = 2; g.beginPath(); g.arc(X(M.target[0]), Y(M.target[1]), 7, 0, 6.29); g.stroke(); }
var K = HM.K, pel = K && K[HM.byName.pelvis];
if (pel) {
var yaw = Math.atan2(2 * (pel.wq.w * pel.wq.z + pel.wq.x * pel.wq.y), 1 - 2 * (pel.wq.y * pel.wq.y + pel.wq.z * pel.wq.z)), px = X(pel.wp.x), py = Y(pel.wp.y);
g.fillStyle = 'rgba(62,197,255,0.16)'; g.beginPath(); g.moveTo(px, py); g.arc(px, py, 6 * s, -yaw - 0.96, -yaw + 0.96); g.closePath(); g.fill();
g.save(); g.translate(px, py); g.rotate(-yaw); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(9, 0); g.lineTo(-6, 5.5); g.lineTo(-3, 0); g.lineTo(-6, -5.5); g.closePath(); g.fill(); g.restore();
}
}
var CR = { snd: {}, on: false, eps: {}, order: [], cur: null, ct: null, cam: 'director', seen: {}, F: {}, built: false, shot: null, shotT: 0,
banner: null, bannerAt: 0, lastPhase: -1, tdShown: false, held: 0 };
var CR_PUFF = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCACAAIADASIAAhEBAxEB/8QAHAAAAQUBAQEAAAAAAAAAAAAABgADBAUHAgEI/8QALBAAAQMDAwQABgMBAQAAAAAAAQACAwQFEQYSIRMxQVEiIzJhcaEUgZEHFv/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwD4ySSSQJJJe4QeJLoMJXYjKBvCWFIbAT4XQpnekEXCWFJdTkJsxkIGUk4WkLghB4kkkgSSSSBL0BeLpgyg9a3KcEZ9J+nhLscKY2mJ8IIcUJPhdmIg4AVvTURI+lT6S0mWQDagoadmO4U6KNhb2RN/5z5WQ1NxWGQO+koBipgGOAoLoTuxhGVbaHxtxtVZJb3M7tQD8lMducKI+Jw8IpMDSNpCi1dCNuQEA05uFyp9RTlpPCiPbgoG0l6V4g9Cfp2ZKaYMlT6NmXDhBPoIRxlWUVMXPGBlcUVHK7aWNzlF9isskm1z2/pBBpKDEYJaiCy20PIO0K+p9OPkgyxh4ClWq0VcNRt6TtufSCO23FwDA3Knw6fLY9xb+kcWOwGaNr3x8/hXj7S0RdLbz6QY3W2dr3kOb2Q9dLS3qbGM7/ZbDedN1LpPgYcfZNxaOe6MSyxcj2gw2ssL4W9QtIHfsqqqgPTI29ltuobK0xuibFyPsgGotBbUOiMZ/wAQZrVUZdnLVT1lMWE8LU7rY+lEXBmECX6DpOcMIBhw5XCdl+oppA/AAXBXtppupI3AVBCfiCKNPvALcoDzTNua4NDmAo3oLZIXsbFGqHSD4XlgJGVqWluh/KjDgCEBFo/Tm+lZ1o/HkIxptIUbviEbcj7KxtlLm3sMDPHgIgsFNMWfMagpKPT0UTdrWD+lGqtOSmoDgMDKPWU2x/ITV1+VTktbygExZYmxjcwFNy2iJ8Lmho/xW9HLJKSHghPOaG54QZrcrBTCoc1zQcoWv+lKSEunDAPPZa3cKKOR5fjlDmoKDrQGPCDBNTU0QjcGNHCyTVNDvc7AX0ZqDTLzHJhpWU6o09NCXHaf8QYhXUzonnIUEhGGoLc5pccdkLTRlriEDcP1BElljc8gNyh2nHxBFdhIaBjugP8ASdHUgteCQFtX/Pbe6oqY+o4cELHtMPqnw/LBP9LR9A1FzirWk7sZQfTunaanipGxvI7IipmQhvwFvbwsio7nctrQA5GumK6qewdbKAlmw1xPCjzOZK3aRlM1lSAO6YppQ9+MoOZIAzJaFXVj3tyETNpw+PKp7tTtAPCChMhecFcupBL3TckjY5CCcKXT1kQbyQgo7va42xOLmrJdeUUHSkLQCcErYtSVIdTO2u8LENc1MkUcm5xPdBhWsXNjkkaQAs8qnNdKce0a62mNRM/bwgSdrmyHKBUv1gIv09E17m5QfTfWEU2d72lpacINk0h0ooANo7IrsN5/h3IDp8ArOtG15a5okdwjBtbSNna8hufaDZLdq+giazrNA95RrZdRUNVAHQOH9L5ruMrqwNMEhAH3RLpa8G3QBj5iTjyUG4XK8xsaTvAVZatSsdWdPd5WQ6n1mY28SfteaQ1JDPKJHSc/lB9MUl2YYAdw7KqvdzZtd8QWe0+qGdMBsg7e1X3LUYcD8z9oLe8XPa4kOVZT33DsOf8AtD1ddWPYXF/7Q1WXTa4lr+yA7vV+BjI38Y9rL9ZXGOdjwT3UG8alEe5peg68XoThxL0AnqtzRI8jCCaw7nkokv1UJJDzlDlRguQMwHDwr631Wxgwh1pwcqXBPt4ygM7TdpI5xh2BlFsV3Y9gLn8rLIKwN5B5Utt1eON2EGsU9+Ece1rlDF/qHVhPVOPys5ZenDjcV6Lw8OyHYQGepbvPKQA84/KlaWulREBl5H9oGfc+qAXOyVKpLsIm4DkG00F/eyAkvyR91V3HVz2SEF5/srPqbUJ27S/j8pi4V7JRu3INGdqgzUpAdyqxt6LiQ5/f7oHpLh8Jbu/ablrniTglARXmoEpJ3IarajaC0OXs1W5zDlyqKqU5OSgh1ry55JKrZTlyk1MuT3UJ5yUHIXoPorlJA4HkeUuoU2kgc6h9r1srvaaSQSBO4eV0Kl3tRUkFhHWOb5wnP5zjwXKsyllBbw1xae6f/ng85VEHH2ug8+0Fy+tyO6hz1G7yofUPtcucSg6kdkkpspErxB//2Q==';   // a puff of white smoke (128 px), for the plumes
var CR_FIXED = /^car:/.test(String(P.camera || '')) ? String(P.camera).slice(4).trim() : '';
var CR_TEL = CR_FIXED === 'telemetry';
function carItems(stream) { return stream.filter(function (it) { return it && it.data && it.data.format === 'esasim.car/1'; }); }
function CW(x, y, z, out) { return (out || new THREE.Vector3()).set(x, z, -y); }
function CB(x, y, z) { return new THREE.Vector3(x, z, -y); }
function crIdx(fields) { CR.F = {}; (fields || []).forEach(function (f, i) { CR.F[f] = i; }); }
function carFeed(stream) {
carItems(stream).forEach(function (it) {
var d = it.data, key = (it.node || '') + '|' + it.t + '|' + d.kind + '|' + d.ep + '|' + (d.seq == null ? '' : d.seq) + '|' + (d.clock == null ? '' : d.clock);
if (CR.seen[key]) return; CR.seen[key] = 1;
(CR.seenQ = CR.seenQ || []).push(key); if (CR.seenQ.length > 6000) CR.seenQ.splice(0, 1000).forEach(function (k) { delete CR.seen[k]; });
if (d.fields) crIdx(d.fields);
var id = (d.kind || 'run') + ':' + d.ep, E = CR.eps[id];
var made = typeof it.t === 'number' && it.t > 1e9 ? it.t : Date.now() / 1000, got = Date.now() / 1000;
CR.skew = Math.min(CR.skew == null ? 1e9 : CR.skew, got - made);
var late = (got - made) - CR.skew; CR.late = Math.max((CR.late || 0) * 0.98, late);
if (!E) { E = CR.eps[id] = { id: id, kind: d.kind || 'run', ep: d.ep, frames: [], chunks: {}, meta: {}, done: false, at: made }; CR.order.push(id); }
['label', 'result', 'phase', 'status', 'clock', 'wind'].forEach(function (k) { if (d[k] !== undefined) E.meta[k] = d[k]; });
if (d.track) { E.track = d.track; var tj = JSON.stringify(d.track); if (CR.trackJ !== tj) { CR.trackJ = tj; CR.track = d.track; CR.rebuild = true; } }
var lastT = d.frames && d.frames.length ? d.frames[d.frames.length - 1][0] : null;
if (lastT != null && E.kind === 'run' && (!E.sync || made >= E.sync.at)) E.sync = { at: made, t: lastT };
if (d.frames && d.frames.length) {
if (E.kind === 'training') E.chunks[d.seq || 0] = d.frames;
else if (E.kind === 'idle') E.frames = d.frames.slice();
else { var last = E.frames.length ? E.frames[E.frames.length - 1][0] : -1e9; d.frames.forEach(function (f) { if (f[0] > last + 1e-6) { E.frames.push(f); last = f[0]; } }); }
}
if (typeof d.clock === 'number' && d.clock < 0) { E.countdown = d.clock; E.countAt = made; }
if (d.ahead && E.startAt == null) { E.ahead = true; E.startAt = made + (+d.start_in || 0); }
if (d.last) { E.done = true; E.doneAt = made; }
if (E.kind === 'training' && E.done) { var ks = Object.keys(E.chunks).map(Number).sort(function (a, b) { return a - b; }); E.frames = []; ks.forEach(function (k) { E.frames = E.frames.concat(E.chunks[k]); }); }
});
if (CR.order.length > 30) { CR.order.slice(0, CR.order.length - 30).forEach(function (k) { delete CR.eps[k]; }); CR.order = CR.order.slice(-30); }
}
function crNow() { var sk = CR.skew == null ? 0 : CR.skew; return Date.now() / 1000 - (Math.abs(sk) > 5 ? sk : 0); }
function crCanvas(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; }
function crRnd(seed) { var s = seed || 1; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
function crNoise(g, w, h, base, amp, seed, speck) {
var img = g.createImageData(w, h), r = crRnd(seed);
for (var i = 0; i < w * h; i++) { var n = (r() - 0.5) * amp, sp = speck && r() < speck ? (r() < 0.5 ? 34 : -22) : 0; img.data[i * 4] = base[0] + n + sp; img.data[i * 4 + 1] = base[1] + n + sp; img.data[i * 4 + 2] = base[2] + n + sp; img.data[i * 4 + 3] = 255; }
g.putImageData(img, 0, 0);
}
function crMat(c, r, m, extra) { return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: m }, extra || {})); }
function crBox(w, h, d, mat, x, y, z, root) { var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; (root || CR.root).add(b); return b; }
function crBeam(a, b, r, mat, root) {
var d = new THREE.Vector3().subVectors(b, a), len = d.length(), m = new THREE.Mesh(new THREE.BoxGeometry(r, len, r), mat);
m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.castShadow = m.receiveShadow = true; (root || CR.root).add(m); return m;
}
function crSky() {
var g = new THREE.SphereGeometry(6000, 48, 24), mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
uniforms: {}, vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
fragmentShader: 'varying vec3 vP; float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }\n'
+ 'void main(){ float y = max(vP.y, 0.0); vec3 top = vec3(0.002,0.003,0.006), hor = vec3(0.012,0.013,0.018);'
+ ' vec3 c = mix(hor, top, pow(y, 0.45));'
+ ' c += vec3(0.03,0.02,0.015) * exp(-y * 28.0) * smoothstep(-0.3, 0.6, vP.x * 0.5 + 0.5);'
+ ' vec3 q = floor(vP * 420.0); float s = h(q); float star = 0.35 * step(0.9985, s) * smoothstep(0.05, 0.3, y) * (0.4 + 0.6 * h(q + 1.0));'
+ ' c += vec3(star); gl_FragColor = vec4(c, 1.0); }' });
var m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = -10; return m;
}
function crStarTex() {
if (CR.starTex) return CR.starTex;
return (CR.starTex = crCanvas(256, 256, function (g, w, h) {
var c = w / 2, gr = g.createRadialGradient(c, c, 0, c, c, c); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.06, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.22, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
g.fillStyle = gr; g.fillRect(0, 0, w, h);
g.globalCompositeOperation = 'lighter';
[[0, 1.0, 3], [Math.PI / 2, 1.0, 3], [Math.PI / 4, 0.55, 2], [-Math.PI / 4, 0.55, 2]].forEach(function (sp) {
g.save(); g.translate(c, c); g.rotate(sp[0]);
var lg = g.createLinearGradient(-c, 0, c, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,' + sp[1] + ')'); lg.addColorStop(1, 'rgba(255,255,255,0)');
g.fillStyle = lg; g.fillRect(-c, -sp[2] / 2, w, sp[2]); g.restore();
});
}));
}
function crFlare(color, size, opacity) {
var sm = new THREE.SpriteMaterial({ map: crStarTex(), color: color, transparent: true, opacity: opacity == null ? 1 : opacity, blending: THREE.AdditiveBlending, depthWrite: false });
var s = new THREE.Sprite(sm); s.scale.set(size, size, 1); s.renderOrder = 22; return s;
}
function crNightEnv() {
var s = new THREE.Scene(); s.background = new THREE.Color(0x05070c);
var lamp = new THREE.MeshBasicMaterial({ color: 0xffffff }); lamp.color.multiplyScalar(14);
[[-30, 24, -25], [-35, 22, 25], [30, 24, -22], [28, 24, 24], [0, 30, 0]].forEach(function (p) { var b = new THREE.Mesh(new THREE.BoxGeometry(6, 2.5, 6), lamp); b.position.set(p[0] * 0.4, p[1] * 0.4, p[2] * 0.4); b.lookAt(0, 0, 0); s.add(b); });
var gnd = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ color: 0x15161a })); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -2; s.add(gnd);
var red = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 0.25, 0.12) });
[[-9, 0.4], [9, 0.4], [-9, -0.3]].forEach(function (p) { var b = new THREE.Mesh(new THREE.BoxGeometry(60, 0.18, 0.18), red); b.position.set(0, p[1], p[0]); s.add(b); });
var ramp = new THREE.Mesh(new THREE.PlaneGeometry(6, 9), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.55, 0.53), side: THREE.DoubleSide }));
ramp.position.set(11, 3, 0); ramp.rotation.y = -Math.PI / 2; s.add(ramp);
var strip = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.3, 2.5) });
[[-4, 6], [4, 6]].forEach(function (p) { var b = new THREE.Mesh(new THREE.BoxGeometry(18, 0.5, 1.2), strip); b.position.set(0, p[1], p[0]); s.add(b); });
return pmrem.fromScene(s, 0.02).texture;
}
function crConcrete() {
return crCanvas(512, 1024, function (g, w, h) {
crNoise(g, w, h, [104, 104, 101], 14, 11, 0.03);
var r = crRnd(23);
for (var k = 0; k < 70; k++) { var x = r() * w, y = r() * h, rr = 20 + r() * 110, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(' + (r() < 0.6 ? '60,58,55,0.10' : '255,255,255,0.07') + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); }
g.fillStyle = 'rgba(0,0,0,0.14)'; for (var y = 0; y < h; y += 128) g.fillRect(0, y, w, 2);
g.fillStyle = '#f4f3ee'; g.fillRect(Math.round(w * 0.5) - 6, 0, 12, h);
});
}
function crWorld() {
var T = CR.track || {}, W = T.width || 5, x0 = T.x0 || 0;
var PR = T.profile || (function () { var o = []; for (var i = 0; i <= 120; i++) { var a = Math.PI * 170 / 180 * i / 120; o.push([10 * Math.sin(a), 10 - 10 * Math.cos(a), a * 180 / Math.PI]); } return o; })();
if (CR.root) {
scene.remove(CR.root);
CR.root.traverse(function (o) { if (o.geometry) o.geometry.dispose(); (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(function (m) { ['map', 'bumpMap', 'roughnessMap', 'clearcoatRoughnessMap', 'emissiveMap'].forEach(function (k) { if (m[k] && m[k].dispose) m[k].dispose(); }); if (m.dispose) m.dispose(); }); });
}
var root = CR.root = new THREE.Group(); scene.add(root);
var hi = quality !== 'fast';
root.add(crSky());
var AS = 2048, asC = document.createElement('canvas'), roC = document.createElement('canvas'); asC.width = asC.height = AS; roC.width = roC.height = AS / 2; var hgC = document.createElement('canvas'); hgC.width = hgC.height = AS / 2;   // hgC: the relief (grains and cracks only)
(function () {
var g = asC.getContext('2d'), q = roC.getContext('2d'), w = AS, h = AS, r = crRnd(19), k, rs = 0.5;
var img = g.createImageData(w, h), D = img.data;
for (var i = 0; i < w * h; i++) { var u = r(), v = 74 + (r() - 0.5) * 26 + (u < 0.06 ? 40 + r() * 45 : u < 0.14 ? -30 : 0); D[i * 4] = v; D[i * 4 + 1] = v; D[i * 4 + 2] = v + 2; D[i * 4 + 3] = 255; }
g.putImageData(img, 0, 0);
for (k = 0; k < 22000; k++) { var sx = r() * w, sy = r() * h, ss = 1.2 + r() * 2.6, sc = r() < 0.6 ? 115 + r() * 60 : 28 + r() * 20; g.fillStyle = 'rgba(' + (sc | 0) + ',' + (sc | 0) + ',' + ((sc + 3) | 0) + ',' + (0.25 + r() * 0.45) + ')'; g.beginPath(); g.ellipse(sx, sy, ss, ss * (0.5 + r() * 0.5), r() * 3, 0, 6.3); g.fill(); }
q.fillStyle = 'rgb(150,150,150)'; q.fillRect(0, 0, w * rs, h * rs);
var hq = hgC.getContext('2d'); hq.drawImage(asC, 0, 0, w * rs, h * rs);
var blob = function (cx, cy, rr, a, col, ra, rcol) {
var gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr); gr.addColorStop(0, 'rgba(' + col + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)'); g.fillStyle = gr; g.fillRect(cx - rr, cy - rr, 2 * rr, 2 * rr);
var gq = q.createRadialGradient(cx * rs, cy * rs, 0, cx * rs, cy * rs, rr * rs); gq.addColorStop(0, 'rgba(' + rcol + ',' + ra + ')'); gq.addColorStop(1, 'rgba(' + rcol + ',0)'); q.fillStyle = gq; q.fillRect((cx - rr) * rs, (cy - rr) * rs, 2 * rr * rs, 2 * rr * rs);
};
for (k = 0; k < 60; k++) blob(r() * w, r() * h, 150 + r() * 450, 0.04 + r() * 0.05, r() < 0.6 ? '10,10,12' : '200,200,205', 0.15, r() < 0.5 ? '120,120,120' : '180,180,180');
})();
var asph = new THREE.CanvasTexture(asC), arough = new THREE.CanvasTexture(roC), ahgt = new THREE.CanvasTexture(hgC);
[asph, arough, ahgt].forEach(function (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4000 / 14, 4000 / 14); t.anisotropy = renderer.capabilities.getMaxAnisotropy ? Math.min(16, renderer.capabilities.getMaxAnisotropy()) : 1; });   // one tile: 14 m
asph.colorSpace = THREE.SRGBColorSpace;
var black = new THREE.MeshPhysicalMaterial({ color: 0x46464b, map: asph, bumpMap: ahgt, bumpScale: 1.0, roughnessMap: arough, roughness: 1.0, metalness: 0.0, clearcoat: 0.25, clearcoatRoughnessMap: arough, clearcoatRoughness: 0.75, envMapIntensity: 0.35, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 8 });
black.onBeforeCompile = function (sh) {
sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n  #ifdef USE_MAP\n  { float mac = dot(texture2D(map, vMapUv * 0.043 + vec2(0.31, 0.77), 5.0).rgb, vec3(0.333)); diffuseColor.rgb *= clamp(1.0 + 3.0 * (mac - 0.075), 0.82, 1.18); }\n  #endif');
};
var land = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), black); land.rotation.x = -Math.PI / 2; land.receiveShadow = true; root.add(land);
var wl = crMat(0xd9d9d4, 0.7, 0.0, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
function line(xa, ya, xb, yb, wd) { var A = CW(xa, ya, 0.02), B = CW(xb, yb, 0.02), m = new THREE.Mesh(new THREE.PlaneGeometry(A.distanceTo(B), wd), wl); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.atan2(-(B.z - A.z), B.x - A.x); m.position.copy(A).add(B).multiplyScalar(0.5); m.receiveShadow = true; root.add(m); }
line(-160, 0, x0 - 10, 0, 0.12);
var conc = crConcrete(); conc.colorSpace = THREE.SRGBColorSpace;
var roadLen = 10, rt = conc.clone(); rt.needsUpdate = true; rt.repeat.set(1, 1);
var road = new THREE.Mesh(new THREE.PlaneGeometry(W, roadLen), crMat(0xbdbdb9, 0.8, 0.0, { map: rt, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }));
road.rotation.x = -Math.PI / 2; road.rotation.z = Math.PI / 2; road.position.copy(CW(x0 - roadLen / 2, 0, 0.01)); road.receiveShadow = true; root.add(road);
var redLed = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.04, 0.02) });
var segL = 1.0, nSeg = Math.ceil((x0 + 160) / segL), glowTex = crCanvas(8, 64, function (g, w, h) { var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
var ledBar = new THREE.InstancedMesh(new THREE.BoxGeometry(segL * 0.94, 0.03, 0.07), new THREE.MeshBasicMaterial({ color: 0xffffff }), 2 * nSeg);
var ledGlow = new THREE.InstancedMesh(new THREE.PlaneGeometry(segL * 1.05, 1.2), new THREE.MeshBasicMaterial({ color: 0xff1a0d, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, map: glowTex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 }), 2 * nSeg);
var mtx = new THREE.Matrix4(), rotFlat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), one = new THREE.Vector3(1, 1, 1), q0 = new THREE.Quaternion(), black0 = new THREE.Color(0, 0, 0);
var ledX = [];
[-1, 1].forEach(function (sd, j) {
for (var i6 = 0; i6 < nSeg; i6++) {
var cx6 = x0 - (i6 + 0.5) * segL, id = j * nSeg + i6; ledX[id] = cx6;
ledBar.setMatrixAt(id, mtx.compose(CW(cx6, sd * (W / 2 + 0.02), 0.02), q0, one)); ledBar.setColorAt(id, black0);
ledGlow.setMatrixAt(id, mtx.compose(CW(cx6, sd * (W / 2 + 0.02), 0.012), rotFlat, one)); ledGlow.setColorAt(id, black0);
}
});
ledBar.frustumCulled = ledGlow.frustumCulled = false; root.add(ledBar, ledGlow);
CR.leds = { bar: ledBar, glow: ledGlow, x: ledX, x0: x0, far: x0 - nSeg * segL, end: null, lit: [] };
var thk = 0.35, N = PR.length;
function at(i, off, y) { var p = PR[i], a = p[2] * Math.PI / 180; return CW(p[0] + off * Math.sin(a), y, p[1] - off * Math.cos(a)); }   // off > 0: behind the deck
var len = [0]; for (var i = 1; i < N; i++) len.push(len[i - 1] + Math.hypot(PR[i][0] - PR[i - 1][0], PR[i][1] - PR[i - 1][1]));
function ribbon(off0, y0, off1, y1, mat, uvs) {
var P2 = [], U2 = [], I2 = [];
for (var i2 = 0; i2 < N; i2++) { var A1 = at(i2, off0, y0), A2 = at(i2, off1, y1); P2.push(A1.x, A1.y, A1.z, A2.x, A2.y, A2.z); U2.push(0, len[i2] / 12, 1, len[i2] / 12); }
for (var q = 0; q < N - 1; q++) { var b0 = 2 * q; I2.push(b0, b0 + 2, b0 + 1, b0 + 1, b0 + 2, b0 + 3); }
var gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(P2, 3)); if (uvs) gg.setAttribute('uv', new THREE.Float32BufferAttribute(U2, 2)); gg.setIndex(I2); gg.computeVertexNormals();
var mm = new THREE.Mesh(gg, mat); mm.castShadow = mm.receiveShadow = true; root.add(mm); return mm;
}
var dt2 = conc.clone(); dt2.needsUpdate = true;
ribbon(0, -W / 2, 0, W / 2, crMat(0xd6d6d2, 0.78, 0.0, { map: dt2, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }), true);
var under = crMat(0x9a9b9c, 0.85, 0.1, { side: THREE.DoubleSide });
ribbon(thk, -W / 2, thk, W / 2, under);
ribbon(0, -W / 2, thk, -W / 2, under); ribbon(0, W / 2, thk, W / 2, under);
[-1, 1].forEach(function (sd) {
var lp = []; for (var i3 = 0; i3 < N; i3 += 1) lp.push(at(i3, -0.02, sd * (W / 2 - 0.03)));
root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lp), 400, 0.035, 6, false), redLed));
var lp2 = []; for (var i4 = 0; i4 < N; i4 += 1) lp2.push(at(i4, thk * 0.5, sd * (W / 2 + 0.02)));
root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lp2), 400, 0.05, 6, false), redLed));
});
var steel = crMat(0xb4b8bd, 0.42, 0.75), steel2 = crMat(0x8d9298, 0.5, 0.7);
var maxX = -1e9, topZ = -1e9; PR.forEach(function (p) { maxX = Math.max(maxX, p[0]); topZ = Math.max(topZ, p[1]); });
var lip = PR[N - 1], tx0 = maxX + thk + 1.0, tx1 = tx0 + 2.2, hy = W / 2 - 0.25, zt = topZ + thk + 2.6, zg = zt - 2.2;
function lattice(ax, az, bx, bz, depthV, n, chord, brace) {
var dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, nx = -uz, nz = ux, k = Math.max(1, Math.round(L / n));
var C = [[0, -hy], [0, hy], [depthV, -hy], [depthV, hy]];
C.forEach(function (c) { crBeam(CW(ax + nx * c[0], c[1], az + nz * c[0]), CW(bx + nx * c[0], c[1], bz + nz * c[0]), 0.16, chord); });
for (var s = 0; s <= k; s++) {
var px = ax + ux * L * s / k, pz = az + uz * L * s / k, qx = ax + ux * L * (s + 1) / k, qz = az + uz * L * (s + 1) / k;
crBeam(CW(px, -hy, pz), CW(px, hy, pz), 0.08, brace); crBeam(CW(px + nx * depthV, -hy, pz + nz * depthV), CW(px + nx * depthV, hy, pz + nz * depthV), 0.08, brace);
crBeam(CW(px, -hy, pz), CW(px + nx * depthV, -hy, pz + nz * depthV), 0.08, brace); crBeam(CW(px, hy, pz), CW(px + nx * depthV, hy, pz + nz * depthV), 0.08, brace);
if (s < k) { [-hy, hy].forEach(function (yy) { crBeam(CW(px, yy, pz), CW(qx + nx * depthV, yy, qz + nz * depthV), 0.06, brace); });
crBeam(CW(px, -hy, pz), CW(qx, hy, qz), 0.06, brace); crBeam(CW(px + nx * depthV, -hy, pz + nz * depthV), CW(qx + nx * depthV, hy, qz + nz * depthV), 0.06, brace); }
}
}
lattice(tx0, 0, tx0, zt, -2.2, 2.2, steel, steel2);
lattice(tx1, zt, lip[0] - 0.4, zt, 2.2, 2.2, steel, steel2);
crBox(3.2, 0.5, W + 0.6, crMat(0x777776, 0.9, 0), (tx0 + tx1) / 2, 0.25, 0);
for (var i5 = 0; i5 < N; i5 += 6) {
var p5 = PR[i5], a5 = p5[2], back = at(i5, thk, 0);
if (a5 > 25 && a5 < 120 && p5[1] > 1.5) { [-hy, hy].forEach(function (yy) { var b = at(i5, thk, yy); crBeam(b, CW(tx0, yy, Math.min(zt, p5[1] + 0.8)), 0.12, steel2); }); }
else if (a5 >= 120 && p5[0] < tx0 - 0.5) { [-hy, hy].forEach(function (yy) { var b2 = at(i5, thk, yy); crBeam(b2, CW(p5[0] + (thk) * Math.sin(a5 * Math.PI / 180), yy, zg), 0.1, steel2); }); }
}
CR.lights = []; CR.redFlares = [];
var stageW = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6, 6) });
function beam(pos, tgt, color, len, ang, opacity) {
var d = tgt.clone().sub(pos).normalize(), g = new THREE.CylinderGeometry(0.08, Math.tan(ang) * len, len, 24, 1, true); g.translate(0, -len / 2, 0);
var m = new THREE.Mesh(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uC: { value: new THREE.Color(color) }, uA: { value: opacity } },
vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = -position.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
fragmentShader: 'uniform vec3 uC; uniform float uA; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float rim = pow(abs(dot(vN, vV)), 1.5); float f = exp(-vY * 0.045) * rim * uA; gl_FragColor = vec4(uC * f, f); }' }));
m.position.copy(pos); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d); m.renderOrder = 5; root.add(m); return m;
}
function fixture(p, tgt, color, lens) { var f = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.4, 16), crMat(0x15161a, 0.5, 0.6)); f.position.copy(p); f.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tgt.clone().sub(p).normalize()); root.add(f);
var l = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), lens); l.position.copy(p).add(tgt.clone().sub(p).normalize().multiplyScalar(0.21)); l.lookAt(tgt); root.add(l); }
[[x0 - 6, -4.5, 0.4, [maxX - 2, 0, 9]], [x0 - 6, 4.5, 0.4, [maxX - 2, 0, 9]], [x0 - 14, -9, 0.4, [lip[0] + 2, 0, topZ - 1]], [x0 - 14, 9, 0.4, [lip[0] + 2, 0, topZ - 1]]].forEach(function (s, si) {
var p = CW(s[0], s[1], s[2]), tg = CW(s[3][0], s[3][1], s[3][2]);
var sp = new THREE.SpotLight(0xf3f5ff, si < 2 ? 420 : 520, 80, 0.5, 0.6, 1.4); sp.position.copy(p); sp.target.position.copy(tg); root.add(sp, sp.target);
sp.castShadow = si < 2 && renderer.shadowMap.enabled; if (sp.castShadow) { sp.shadow.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024); sp.shadow.bias = -0.0002; sp.shadow.normalBias = 0.03; sp.shadow.camera.near = 2; sp.shadow.camera.far = 90; }
fixture(p, tg, stageW); beam(p, tg, 0xdfe6ff, 34, 0.4, 0.24); beam(p, tg, 0xf2f5ff, 30, 0.18, 0.2); CR.lights.push(sp);
var sgl = crFlare(0xf0f4ff, 1.6, 0.85), sdir = tg.clone().sub(p).normalize(); sgl.position.copy(p).addScaledVector(sdir, 0.3); root.add(sgl);
(CR.redFlares = CR.redFlares || []).push({ s: sgl, dir: sdir, base: 1.6 });
});
CR.follow = new THREE.SpotLight(0xf6f8ff, 420, 120, 0.13, 0.5, 1.3);
CR.follow.castShadow = renderer.shadowMap.enabled;
if (CR.follow.castShadow) { CR.follow.shadow.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024); CR.follow.shadow.bias = -0.0003; CR.follow.shadow.normalBias = 0.03; CR.follow.shadow.camera.near = 8; CR.follow.shadow.camera.far = 90; }
root.add(CR.follow, CR.follow.target);
var over = new THREE.SpotLight(0xf3f5ff, 650, 90, 0.55, 0.7, 1.4); over.position.copy(CW((T.land || [-25, 0])[0] + 6, -20, 18)); over.target.position.copy(CW((T.land || [-25, 0])[0], 0, 4)); root.add(over, over.target); CR.lights.push(over);
var wallX0 = -78, wallX1 = 2, wallY = 15;
crBox(wallX1 - wallX0, 1.1, 0.6, crMat(0x101113, 0.7, 0.2), (wallX0 + wallX1) / 2, 0.55, -wallY);
var edge = new THREE.Mesh(new THREE.BoxGeometry(wallX1 - wallX0, 0.06, 0.06), redLed); edge.position.copy(CW((wallX0 + wallX1) / 2, wallY - 0.32, 1.1)); root.add(edge);
var edge2 = new THREE.Mesh(new THREE.BoxGeometry(wallX1 - wallX0, 0.05, 0.05), redLed); edge2.position.copy(CW((wallX0 + wallX1) / 2, wallY - 0.32, 0.12)); root.add(edge2);
var redLens = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.08, 0.04) }), reds = [];
var streak = crCanvas(32, 256, function (g, w, h) { var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); var gx = g.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.5, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, w, h); });
for (var rx = wallX0 + 2; rx <= wallX1 - 1; rx += 4.0) {
var pr = CW(rx, wallY - 0.35, 0.7), tg2 = CW(rx + 5, wallY - 9, 24), idx = reds.length;
fixture(pr, tg2, redLens);
beam(pr, tg2, 0xff2a14, 30, 0.13, 0.13);
var dir2 = tg2.clone().sub(pr).normalize();
var ring = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.03, 8, 24), redLens); ring.position.copy(pr).addScaledVector(dir2, 0.2); ring.lookAt(tg2); root.add(ring);
var glow = crFlare(0xff2a14, 1.5, 0.75); glow.position.copy(pr).addScaledVector(dir2, 0.28); root.add(glow);
(CR.redFlares = CR.redFlares || []).push({ s: glow, dir: dir2, base: 1.5 });
var refl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 9), new THREE.MeshBasicMaterial({ map: streak, color: 0xff2a14, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
refl.rotation.x = -Math.PI / 2; refl.position.copy(CW(rx, wallY - 0.4 - 4.6, 0.012)); root.add(refl);
if (idx % 4 === 0) { var rs = new THREE.SpotLight(0xff2a14, 260, 50, 0.22, 0.6, 1.5); rs.position.copy(pr); rs.target.position.copy(tg2); root.add(rs, rs.target); CR.lights.push(rs); }
if (idx % 3 === 0) { var pl = new THREE.PointLight(0xff2a14, 3, 10, 2); pl.position.copy(CW(rx, wallY - 1.2, 0.8)); root.add(pl); }
reds.push(pr);
}
var lineRefl = new THREE.Mesh(new THREE.PlaneGeometry(wallX1 - wallX0, 2.4), new THREE.MeshBasicMaterial({ color: 0xff1a0d, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, map: crCanvas(8, 64, function (g, w, h) { var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) }));
lineRefl.rotation.x = -Math.PI / 2; lineRefl.position.copy(CW((wallX0 + wallX1) / 2, wallY - 1.3, 0.011)); root.add(lineRefl);
[-40, -12].forEach(function (fx) {
var fp = CW(fx, wallY - 0.2, 1.6), ft = CW(fx + 8, 0, 0);
var head = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.5), crMat(0x1a1b1f, 0.5, 0.6)); head.position.copy(fp); head.lookAt(ft); root.add(head);
var lens2 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.75), new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 9, 9) })); lens2.position.copy(fp).add(ft.clone().sub(fp).normalize().multiplyScalar(0.27)); lens2.lookAt(ft); root.add(lens2);
var fsp = new THREE.SpotLight(0xf6f7ff, 420, 90, 0.6, 0.6, 1.4); fsp.position.copy(fp); fsp.target.position.copy(ft); root.add(fsp, fsp.target); CR.lights.push(fsp);
beam(fp, ft, 0xe8eeff, 24, 0.36, 0.075);
});
var red = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.15, 0.1) });
[[420, -380, 60], [520, 260, 45], [-650, -520, 40], [-300, 700, 55]].forEach(function (tw2) { var rl = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), red); rl.position.copy(CW(tw2[0], tw2[1], tw2[2])); root.add(rl); });
var bcn = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), red); bcn.position.copy(CW((tx0 + tx1) / 2, 0, zt + 0.3)); root.add(bcn);
CR.car = crCarModel(); root.add(CR.car.root);
crFxBuild(root);
}
function crLoft(stations, ring, close) {
var M = ring(stations[0]).length, P4 = [], I4 = [];
stations.forEach(function (x) { ring(x).forEach(function (p) { var v = CB(x, p[0], p[1]); P4.push(v.x, v.y, v.z); }); });
for (var s = 0; s < stations.length - 1; s++) for (var k = 0; k < M - 1; k++) { var a = s * M + k, b = a + M; I4.push(a, b, a + 1, a + 1, b, b + 1); }
if (close) {
[0, stations.length - 1].forEach(function (s, e) {
var ctr = P4.length / 3, pts = ring(stations[s]), cy = 0, cz = 0; pts.forEach(function (p) { cy += p[0]; cz += p[1]; });
var v = CB(stations[s] + (e ? -0.02 : 0.02), cy / pts.length * 0, cz / pts.length); P4.push(v.x, v.y, v.z);
for (var k = 0; k < M - 1; k++) { var a = s * M + k; if (e) I4.push(ctr, a, a + 1); else I4.push(ctr, a + 1, a); }
});
}
var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P4, 3)); g.setIndex(I4); g.computeVertexNormals(); return g;
}
function crCarModel() {
var C = { root: new THREE.Group(), wheels: [], nozzles: [] }, T = CR.track || {}, D = C.drawn = new THREE.Group(); C.root.add(D);
D.visible = false;
var L2 = 2.175, wx = 1.33, rest = T.rest || 0.40, wr = T.wheel_r || 0.36;
var paint = new THREE.MeshPhysicalMaterial({ color: 0x7a0c12, metalness: 0.55, roughness: 0.28, clearcoat: 1.0, clearcoatRoughness: 0.04, envMapIntensity: 1.4 });
var inside = crMat(0x0b0c0e, 0.9, 0.1, { side: THREE.BackSide });
var glass = new THREE.MeshPhysicalMaterial({ color: 0x06080b, metalness: 0.0, roughness: 0.04, clearcoat: 1.0, envMapIntensity: 2.2, transparent: true, opacity: 0.93 });
var carbon = crMat(0x121316, 0.55, 0.35);
function hw(x) { var w = 1.0; if (x > 0.95) w -= 0.17 * Math.pow((x - 0.95) / (L2 - 0.95), 2.4); if (x < -1.15) w -= 0.11 * Math.pow((-1.15 - x) / (L2 - 1.15), 2.0); return w - 0.025 * Math.exp(-x * x / 0.5); }
function sill(x) { var b = -0.20; [wx, -wx].forEach(function (c) { var d = x - c, r = 0.45; if (Math.abs(d) < r) b = Math.max(b, -0.10 + Math.sqrt(r * r - d * d)); }); return b; }
function crown(x) {
if (x > 1.05) return 0.02 + 0.28 * Math.pow((L2 - x) / (L2 - 1.05), 0.75);
if (x > -1.2) return 0.30 + 0.04 * (1.05 - x) / 2.25;
return 0.34 + 0.05 * Math.sin(Math.min(1, (-1.2 - x) / 0.6) * Math.PI / 2) - 0.07 * Math.pow(Math.max(0, (-1.75 - x) / 0.425), 2);
}
function fender(x) { return 0.10 * Math.exp(-Math.pow((x - wx) / 0.55, 2)) + 0.13 * Math.exp(-Math.pow((x + wx) / 0.7, 2)); }
var ST = []; for (var i = 0; i <= 90; i++) ST.push(-L2 + 2 * L2 * (0.5 - 0.5 * Math.cos(Math.PI * i / 90)));
var bodyG = crLoft(ST, function (x) {
var out = [], M = 40, a = hw(x), b0 = sill(x), top = crown(x), fb = fender(x), n = 3.0;
for (var k = 0; k <= M; k++) {
var ph = Math.PI * k / M, c = Math.cos(ph), s = Math.sin(ph);
var y = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), yy = Math.abs(y);
var tz = top + fb * Math.exp(-Math.pow((yy - 0.78) / 0.2, 2)) - 0.05 * Math.pow(yy / a, 2) * (1 - Math.exp(-Math.pow((yy - 0.78) / 0.2, 2)));
out.push([y, b0 + (tz - b0) * Math.pow(s, 2 / n)]);
}
return out;
}, false);
var bm = new THREE.Mesh(bodyG, paint); bm.castShadow = bm.receiveShadow = true; D.add(bm);
D.add(new THREE.Mesh(bodyG, inside));
[L2, -L2].forEach(function (xe) {
var sh2 = new THREE.Shape(), M = 30, a = hw(xe), b0 = sill(xe), top = crown(xe);
for (var k = 0; k <= M; k++) { var ph = Math.PI * k / M, c = Math.cos(ph), s = Math.sin(ph), y = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / 3); var z = b0 + (top - b0) * Math.pow(s, 2 / 3); if (k === 0) sh2.moveTo(y, z); else sh2.lineTo(y, z); }
var fg = new THREE.ShapeGeometry(sh2), fm = new THREE.Mesh(fg, xe > 0 ? paint : carbon);
fm.rotation.y = xe > 0 ? Math.PI / 2 : -Math.PI / 2; fm.position.x = xe; if (xe > 0) fm.scale.x = -1; D.add(fm);
});
var CS = []; for (var j = 0; j <= 50; j++) CS.push(0.98 - 2.3 * j / 50);
function roof(x) { if (x > 0.05) return 0.31 + 0.39 * (1 - Math.pow((x - 0.05) / 0.93, 1.7)); if (x > -0.35) return 0.70 - 0.02 * (0.05 - x) / 0.4; return 0.68 - 0.30 * Math.pow((-0.35 - x) / 0.97, 1.3); }
var canG = crLoft(CS, function (x) {
var out = [], M = 24, base = crown(x) - 0.01, top = Math.max(base + 0.005, roof(x)), a0 = 0.74 - 0.04 * Math.abs(x + 0.2), a1 = 0.50;
for (var k = 0; k <= M; k++) { var ph = Math.PI * k / M, c = Math.cos(ph), s = Math.sin(ph), f = Math.pow(s, 0.8); var a = a0 + (a1 - a0) * f; out.push([a * Math.sign(c) * Math.pow(Math.abs(c), 0.8), base + (top - base) * Math.pow(s, 0.6)]); }
return out;
}, true);
var cm = new THREE.Mesh(canG, glass); cm.castShadow = true; D.add(cm);
var floorM = crMat(0x16171a, 0.6, 0.3);
var fl = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.03, 1.36), floorM); fl.position.copy(CB(0, 0, -0.205)); fl.castShadow = true; D.add(fl);
[-1, 1].forEach(function (sd) { var sl = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.3), carbon); sl.position.copy(CB(0, sd * 0.84, -0.15)); D.add(sl); });
C.fans = [];
[0.95, -0.95].forEach(function (fx) {
var ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.03, 8, 40), crMat(0x3a3d42, 0.4, 0.8)); ring2.rotation.x = Math.PI / 2; ring2.position.copy(CB(fx, 0, -0.222)); D.add(ring2);
var grille = new THREE.Mesh(new THREE.CircleGeometry(0.32, 40), crMat(0x050506, 0.7, 0.2, { side: THREE.DoubleSide })); grille.rotation.x = Math.PI / 2; grille.position.copy(CB(fx, 0, -0.221)); D.add(grille);
var blades = new THREE.Group(); blades.position.copy(CB(fx, 0, -0.215));
for (var bl = 0; bl < 7; bl++) { var bb = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.008, 0.06), crMat(0x60646a, 0.4, 0.8)); bb.position.x = 0.14; var arm = new THREE.Group(); arm.rotation.y = bl * Math.PI * 2 / 7; arm.add(bb); blades.add(arm); }
D.add(blades); C.fans.push(blades);
});
var skirt = crMat(0x0d0d0f, 0.9, 0.0);
[[0, 0.68, 3.6, 0.04], [0, -0.68, 3.6, 0.04]].forEach(function (s) { var sk = new THREE.Mesh(new THREE.BoxGeometry(s[2], 0.05, s[3]), skirt); sk.position.copy(CB(s[0], s[1], -0.235)); D.add(sk); });
for (var fin = -3; fin <= 3; fin++) { var df = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.02), carbon); df.position.copy(CB(-2.0, fin * 0.22, -0.13)); df.rotation.z = 0.25; D.add(df); }
var headM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1.05).multiplyScalar(5) }), tailM = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.08, 0.06) });
[-1, 1].forEach(function (sd) { var h = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.018, 0.42), headM); h.position.copy(CB(L2 - 0.12, sd * 0.62, 0.075)); h.rotation.y = sd * 0.35; D.add(h); });
var tb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 1.72), tailM); tb.position.copy(CB(-L2 + 0.01, 0, 0.30)); D.add(tb);
C.heads = [-1, 1].map(function (sd) { var hl = new THREE.SpotLight(0xf4f7ff, 220, 70, 0.38, 0.6, 1.5); hl.position.copy(CB(L2 + 0.05, sd * 0.62, 0.05)); hl.target.position.copy(CB(L2 + 14, sd * 1.2, -1.6)); C.root.add(hl, hl.target); return hl; });
C.head = C.heads[0];
C.brake = new THREE.PointLight(0xff2010, 0, 6, 2); C.brake.position.copy(CB(-L2 - 0.3, 0, 0.3)); C.root.add(C.brake);
var dummy = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.35, 4, 8), crMat(0x2b2b2e, 0.9, 0)); dummy.position.copy(CB(-0.2, 0.35, 0.33)); dummy.rotation.z = 0.35; D.add(dummy);
var helmet = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), crMat(0xd8d8d8, 0.3, 0.2)); helmet.position.copy(CB(-0.32, 0.35, 0.58)); D.add(helmet);
var tyreM = crMat(0x161616, 0.92, 0.0), rimM = crMat(0x2c2f34, 0.3, 0.9), discM = crMat(0x6f7378, 0.5, 0.9), calM = crMat(0xc81c1c, 0.4, 0.3);
var prof = [[0.235, -0.155], [0.31, -0.158], [0.345, -0.145], [0.36, -0.10], [0.362, 0], [0.36, 0.10], [0.345, 0.145], [0.31, 0.158], [0.235, 0.155]].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
var tyreG = new THREE.LatheGeometry(prof, 48);
(T.wheels || [[1.33, 0.85, -0.12], [1.33, -0.85, -0.12], [-1.33, 0.85, -0.12], [-1.33, -0.85, -0.12]]).forEach(function (w, wi) {
var mount = new THREE.Group(), spin = new THREE.Group(), side = w[1] > 0 ? 1 : -1;
mount.userData.base = [w[0], w[1], w[2] - rest + wr];
var tyre = new THREE.Mesh(tyreG, tyreM); tyre.rotation.x = Math.PI / 2; tyre.castShadow = true; spin.add(tyre);
var rim = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.03, 40), rimM); rim.rotation.x = Math.PI / 2; rim.position.z = -side * 0.12; spin.add(rim);
for (var sp2 = 0; sp2 < 10; sp2++) { var spk = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2, 0.035), rimM); var arm2 = new THREE.Group(); arm2.rotation.z = sp2 * Math.PI / 5; spk.position.y = 0.12; arm2.add(spk); arm2.position.z = -side * 0.135; spin.add(arm2); }
var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16), crMat(0x9aa0a6, 0.3, 0.9)); cap.rotation.x = Math.PI / 2; cap.position.z = -side * 0.15; spin.add(cap);
var disc = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.03, 32), discM); disc.rotation.x = Math.PI / 2; disc.position.z = side * 0.0; spin.add(disc);
mount.add(spin);
var cal = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.06), calM); cal.position.set(0.12, 0.08, -side * 0.06); mount.add(cal);
D.add(mount); C.wheels.push({ mount: mount, spin: spin, front: w[0] > 0 });
});
var NP = T.nozzles || [], ND = T.nozzle_dirs || [], nozM = crMat(0x8d939b, 0.3, 0.9);
NP.forEach(function (p, k) {
var d = ND[k] || [0, 0, 1], jet = [-d[0], -d[1], -d[2]], ex;
if (d[2] > 0.5) ex = [p[0], p[1], -0.215]; else if (d[2] < -0.5) ex = [p[0], p[1], crown(p[0]) + fender(p[0]) * 0.8 + 0.01]; else if (Math.abs(d[0]) > 0.5) ex = [p[0], p[1], p[2]]; else ex = [p[0], Math.sign(jet[1]) * (hw(p[0]) + 0.005), p[2]];
var cone = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.075, 0.08, 16, 1, true), nozM);
cone.position.copy(CB(ex[0], ex[1], ex[2])); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), CB(jet[0], jet[1], jet[2]).normalize()); D.add(cone);
C.nozzles.push({ at: CB(ex[0], ex[1], ex[2]), dir: CB(jet[0], jet[1], jet[2]).normalize(), size: Math.abs(d[0]) > 0.5 ? 0.9 : 1.0 });
});
C.root.traverse(function (o) { if (o.isMesh && o.material !== inside) { o.castShadow = true; } });
if (CR.custom) crUseModel(C, CR.custom);
return C;
}
function crUseModel(C, obj) {
if (C.custom) { C.root.remove(C.custom); (C.customWheels || []).forEach(function (w) { C.root.remove(w.mount); }); }
var T = CR.track || {}, o = obj.clone(true), holder = new THREE.Group(); holder.add(o); C.root.add(holder);
var box = new THREE.Box3().setFromObject(o), sz = box.getSize(new THREE.Vector3());
if (sz.z > sz.x) o.rotation.y = Math.PI / 2;
var wheels = [];
o.traverse(function (n) { if (/wheel/i.test(n.name) && !/steer/i.test(n.name) && !wheels.some(function (w) { var p = n.parent; while (p) { if (p === w) return true; p = p.parent; } return false; })) wheels.push(n); });
wheels = wheels.filter(function (n) { var has = false; n.traverse(function (m) { if (m.isMesh) has = true; }); return has; });
var W4 = T.wheels || [[1.5, 0.837, -0.145], [1.5, -0.837, -0.145], [-1.316, 0.837, -0.145], [-1.316, -0.837, -0.145]];
var rest = T.rest || 0.4, wr = T.wheel_r || 0.33, comp0 = T.comp0 || 0.045;
function centres() { holder.updateMatrixWorld(true); var inv = new THREE.Matrix4().copy(C.root.matrixWorld).invert(); return wheels.map(function (n) { return new THREE.Box3().setFromObject(n).getCenter(new THREE.Vector3()).applyMatrix4(inv); }); }
if (wheels.length === 4) {
var c = centres(), xs = c.map(function (v) { return v.x; }), wbM = Math.max.apply(null, xs) - Math.min.apply(null, xs), wbP = W4[0][0] - W4[2][0];
o.scale.multiplyScalar(wbP / Math.max(1e-6, wbM));
c = centres();
var mx = 0, my = 0, mz = 0; c.forEach(function (v) { mx += v.x / 4; my += v.y / 4; mz += v.z / 4; });
var want = CB((W4[0][0] + W4[2][0]) / 2, 0, W4[0][2] - rest + wr + comp0);
o.position.add(new THREE.Vector3(want.x - mx, want.y - my, want.z - mz));
c = centres();
C.root.updateMatrixWorld(true);
C.customWheels = wheels.map(function (n, k) {
var v = c[k], bx = v.x, by = -v.z, idx = (bx > (W4[0][0] + W4[2][0]) / 2 ? 0 : 2) + (by > 0 ? 0 : 1);
var mount = new THREE.Group(), spin = new THREE.Group(); mount.position.copy(v); mount.add(spin); C.root.add(mount); mount.updateMatrixWorld(true);
spin.attach(n);
mount.userData.base = [bx, by, W4[idx][2] - rest + wr];
return { mount: mount, spin: spin, front: idx < 2, k: idx };
});
C.customWheels.sort(function (a, b) { return a.k - b.k; });
} else {
var L = (T.car && T.car[0]) || 4.31, k2 = L / Math.max(1e-6, sz.x > sz.z ? sz.x : sz.z); o.scale.multiplyScalar(k2);
o.updateMatrixWorld(true); box = new THREE.Box3().setFromObject(o); var ctr = box.getCenter(new THREE.Vector3());
o.position.sub(new THREE.Vector3(ctr.x, box.min.y + (T.ride || 0.5), ctr.z)); C.customWheels = null;
}
o.traverse(function (m) {
if (!m.isMesh) return; m.castShadow = true; m.receiveShadow = true;
var mats = Array.isArray(m.material) ? m.material : [m.material];
mats.forEach(function (mt) {
if (!mt) return;
if (/light/i.test(mt.name || '') && mt.map && mt.emissive) { mt.emissiveMap = mt.map; mt.emissive.set(0xffffff); mt.emissiveIntensity = /r$/i.test(mt.name) ? 2.5 : 1.6; }
if (mt.envMapIntensity != null) mt.envMapIntensity = 0.9;
if (mt.roughness != null && !/glass/i.test(mt.name || '') && mt.roughness < 0.28) mt.roughness = 0.28;   // a mirror finish blows out under the stage lights
if (/glass|window|blinn1/i.test(mt.name || '') || (mt.transparent && mt.opacity < 0.95)) {   // the glass: fully black and glossy (the cabin stays hidden)
mt.transparent = false; mt.opacity = 1; mt.depthWrite = true; mt.alphaMap = null; mt.map = null; if (mt.transmission) mt.transmission = 0;
if (mt.color) mt.color.set(0x030405); if (mt.roughness != null) mt.roughness = 0.06; if (mt.metalness != null) mt.metalness = 0.0; mt.envMapIntensity = 1.3; mt.needsUpdate = true;
}
});
});
o.traverse(function (m) {
if (!m.isMesh || !m.material) return;
var up = function (mt) {
if (!mt || mt.isMeshPhysicalMaterial || !mt.isMeshStandardMaterial) return mt;
var glass = /glass|window|blinn1/i.test(mt.name || ''), paint = /^base$/i.test(mt.name || '') || /paint|body/i.test(mt.name || '');
if (!glass && !paint) return mt;
var pm = new THREE.MeshPhysicalMaterial(); THREE.MeshStandardMaterial.prototype.copy.call(pm, mt); pm.name = mt.name;
pm.clearcoat = 1.0; pm.clearcoatRoughness = glass ? 0.02 : 0.06;
pm.envMapIntensity = glass ? 2.4 : 1.9; if (paint) { pm.roughness = Math.max(pm.roughness, 0.32); pm.color.multiplyScalar(0.8); }
pm.needsUpdate = true; return pm;
};
m.material = Array.isArray(m.material) ? m.material.map(up) : up(m.material);
});
C.custom = holder; C.drawn.visible = false;
C.hl = null;
C.root.updateMatrixWorld(true);
var inv = C.root.matrixWorld.clone().invert(), vv = new THREE.Vector3();
o.traverse(function (m) {
if (!m.isMesh || C.hl || !/LightW/.test((m.material && m.material.name) || '') || !m.geometry.attributes.position) return;
var P = m.geometry.attributes.position, half = 0;
for (var i = 0; i < P.count; i++) { vv.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld).applyMatrix4(inv); half = Math.max(half, Math.abs(vv.z)); }
if (half < 0.2) return;
var mt = m.material = m.material.clone(), pl = [new THREE.Plane(), new THREE.Plane()];
mt.clippingPlanes = pl; mt.clipIntersection = true; mt.clipShadows = true;
C.hl = { planes: pl, gap: 0.5 * half };
renderer.localClippingEnabled = true;
});
(C.flares || []).forEach(function (f) { if (f.s.parent) f.s.parent.remove(f.s); });
C.flares = [];
var lightBox = function (re) {
var bb = null;
o.traverse(function (m) { if (!m.isMesh || !re.test((m.material && m.material.name) || '') || !m.geometry.attributes.position) return; var P = m.geometry.attributes.position;
for (var i = 0; i < P.count; i++) { vv.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld).applyMatrix4(inv); if (!bb) bb = new THREE.Box3(vv.clone(), vv.clone()); else bb.expandByPoint(vv); } });
return bb;
};
var hb = lightBox(/LightW/), tb = lightBox(/LightR/);
if (C.belly) { if (C.belly.parent) C.belly.parent.remove(C.belly); C.belly = null; }
(function () {
var rc = new THREE.Raycaster(), lo = 1e9, pts = [[-1.2, 0], [0, 0], [1.2, 0], [0, 0.4], [0, -0.4]];
pts.forEach(function (q) {
var org = new THREE.Vector3(q[0], -3, q[1]).applyMatrix4(C.root.matrixWorld), dir = new THREE.Vector3(0, 1, 0).transformDirection(C.root.matrixWorld);
rc.set(org, dir); var hit = rc.intersectObject(o, true).filter(function (h) { return !/wheel|tire|tyre|rim/i.test(h.object.name || ''); })[0];
if (hit) lo = Math.min(lo, hit.point.clone().applyMatrix4(inv).y);
});
if (!(lo < 1e8)) return;
var L0 = -1.7, L1 = 1.8, Wd = 1.24, TW = 1024, TH = Math.round(TW * Wd / (L1 - L0));
var U = function (x) { return (x - L0) / (L1 - L0) * TW; }, V = function (y) { return (0.5 - y / Wd) * TH; };   // body x, body y (left) to the canvas
var tex = crCanvas(TW, TH, function (g, w, h) {
crNoise(g, w, h, [14, 15, 17], 8, 41, 0.02);
var r = crRnd(43), k;
g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 3;
[-1.15, -0.55, 0.05, 0.6, 1.2].forEach(function (x) { g.beginPath(); g.moveTo(U(x), 0); g.lineTo(U(x), h); g.stroke(); });
[-0.42, 0.42].forEach(function (y) { g.beginPath(); g.moveTo(0, V(y)); g.lineTo(w, V(y)); g.stroke(); });
g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 1;
[-1.15, -0.55, 0.05, 0.6, 1.2].forEach(function (x) { g.beginPath(); g.moveTo(U(x) + 2, 0); g.lineTo(U(x) + 2, h); g.stroke(); });
g.fillStyle = 'rgba(120,124,130,0.55)';
[-1.15, -0.55, 0.05, 0.6, 1.2].forEach(function (x) { for (var y = -0.58; y <= 0.58; y += 0.08) g.fillRect(U(x) - 7, V(y), 2, 2); });
[-0.42, 0.42].forEach(function (y) { for (var x = L0 + 0.05; x <= L1; x += 0.08) g.fillRect(U(x), V(y) - 6, 2, 2); });
var tank = function (y) {
var x0 = -0.5, x1 = 0.55, rr = 14, X0 = U(x0), X1 = U(x1), Y0 = V(y + 0.13), Y1 = V(y - 0.13);
g.fillStyle = 'rgba(30,32,36,0.9)'; g.strokeStyle = 'rgba(0,0,0,0.9)'; g.lineWidth = 2;
g.beginPath(); g.moveTo(X0 + rr, Y0); g.lineTo(X1 - rr, Y0); g.quadraticCurveTo(X1, Y0, X1, Y0 + rr); g.lineTo(X1, Y1 - rr); g.quadraticCurveTo(X1, Y1, X1 - rr, Y1); g.lineTo(X0 + rr, Y1); g.quadraticCurveTo(X0, Y1, X0, Y1 - rr); g.lineTo(X0, Y0 + rr); g.quadraticCurveTo(X0, Y0, X0 + rr, Y0); g.fill(); g.stroke();
g.fillStyle = 'rgba(70,74,80,0.8)'; [-0.25, 0.3].forEach(function (x) { g.fillRect(U(x) - 5, Y0 - 3, 10, Y1 - Y0 + 6); });
g.fillStyle = 'rgba(200,40,30,0.55)'; g.font = 'bold 13px sans-serif'; g.fillText('HP AIR 300 BAR', U(-0.2), (Y0 + Y1) / 2 + 4);
};
tank(0.24); tank(-0.24);
var fan = function (x) {
var cx = U(x), cy = V(0), rad = 0.3 / (L1 - L0) * TW;
g.fillStyle = 'rgba(4,4,5,1)'; g.beginPath(); g.arc(cx, cy, rad, 0, 6.283); g.fill();
g.strokeStyle = 'rgba(95,98,104,0.9)'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, rad, 0, 6.283); g.stroke();
g.lineWidth = 1.5; for (var c = 0.3; c < 1; c += 0.18) { g.beginPath(); g.arc(cx, cy, rad * c, 0, 6.283); g.stroke(); }
for (var a = 0; a < 24; a++) { var an = a / 24 * 6.283; g.beginPath(); g.moveTo(cx + Math.cos(an) * rad * 0.22, cy + Math.sin(an) * rad * 0.22); g.lineTo(cx + Math.cos(an) * rad * 0.97, cy + Math.sin(an) * rad * 0.97); g.stroke(); }
g.fillStyle = 'rgba(60,62,66,1)'; g.beginPath(); g.arc(cx, cy, rad * 0.2, 0, 6.283); g.fill();
g.strokeStyle = 'rgba(230,180,40,0.5)'; g.lineWidth = 3; g.setLineDash([10, 8]); g.beginPath(); g.arc(cx, cy, rad * 1.12, 0, 6.283); g.stroke(); g.setLineDash([]);
};
fan(0.95); fan(-0.85);
g.strokeStyle = 'rgba(40,42,46,0.9)'; g.lineWidth = 2;
for (k = 0; k < 7; k++) { var xr = 1.25 + k * 0.075; g.beginPath(); g.moveTo(U(xr), V(0.36)); g.lineTo(U(xr), V(-0.36)); g.stroke(); }
for (k = 0; k < 6; k++) { var xs = -1.62 + k * 0.075; g.beginPath(); g.moveTo(U(xs), V(0.36)); g.lineTo(U(xs), V(-0.36)); g.stroke(); }
g.fillStyle = 'rgba(210,210,215,0.35)'; g.font = 'bold 15px sans-serif';
g.fillText('NO STEP', U(0.1), V(0.5)); g.fillText('JACK POINT', U(-1.1), V(-0.47)); g.fillText('\u25B2 FRONT', U(1.42), V(0.0) + 5);
for (k = 0; k < 300; k++) { g.fillStyle = 'rgba(0,0,0,' + (0.1 + r() * 0.25) + ')'; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1); }
});
tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
var mat = new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 2.0, roughness: 0.7, metalness: 0.35, color: 0xffffff });
var pl = new THREE.Mesh(new THREE.PlaneGeometry(L1 - L0, Wd), mat);
pl.rotation.x = Math.PI / 2;   // facing down
pl.position.set((L0 + L1) / 2, lo - 0.006, 0); pl.receiveShadow = true;
C.root.add(pl); C.belly = pl;
})();
if (hb) [-1, 1].forEach(function (sd) {
var hw = Math.max(Math.abs(hb.min.z), Math.abs(hb.max.z)), zc = sd * (C.hl ? (C.hl.gap + hw) / 2 : hw * 0.75);
var f = crFlare(0xeaf2ff, 1.0, 0); f.material.depthTest = false; f.renderOrder = 30; f.position.set(hb.max.x + 0.06, (hb.min.y + hb.max.y) / 2, zc); C.root.add(f); C.flares.push({ s: f, kind: 'head' });   // a flare is in the lens of the camera: never cut by the tarmac or the car
});
if (tb) (function () {
var pts = [];
o.traverse(function (m) { if (!m.isMesh || !/LightR/.test((m.material && m.material.name) || '') || !m.geometry.attributes.position) return; var P = m.geometry.attributes.position;
for (var i = 0; i < P.count; i++) { vv.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld).applyMatrix4(inv); pts.push(vv.x, vv.y, vv.z); } });
var STEP = 0.022, z0 = tb.min.z, nb = Math.max(2, Math.ceil((tb.max.z - z0) / STEP)), bins = [];
for (var j = 0; j < nb; j++) bins.push({ x: 1e9, xs: 0, ys: 0, n: 0 });
for (var i = 0; i < pts.length; i += 3) { var bj = Math.min(nb - 1, Math.floor((pts[i + 2] - z0) / STEP)); if (pts[i] < bins[bj].x) bins[bj].x = pts[i]; }
for (i = 0; i < pts.length; i += 3) { var B = bins[Math.min(nb - 1, Math.floor((pts[i + 2] - z0) / STEP))]; if (pts[i] < B.x + 0.03) { B.xs += pts[i]; B.ys += pts[i + 1]; B.n++; } }
var line = []; bins.forEach(function (B, j) { if (B.n) line.push([B.xs / B.n - 0.012, B.ys / B.n, z0 + (j + 0.5) * STEP]); });
if (line.length < 2) return;
var res = [line[0]], acc = 0;
for (var li = 1; li < line.length; li++) {
var pA = line[li - 1], pB = line[li], sl = Math.hypot(pB[0] - pA[0], pB[1] - pA[1], pB[2] - pA[2]), tt = STEP - acc;
for (; tt <= sl; tt += STEP) { var fr = tt / sl; res.push([pA[0] + (pB[0] - pA[0]) * fr, pA[1] + (pB[1] - pA[1]) * fr, pA[2] + (pB[2] - pA[2]) * fr]); }
acc = sl - (tt - STEP);
}
line = res;
var dotT = CR.ledDot || (CR.ledDot = crCanvas(64, 64, function (g, w, h) { var gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.12, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.22)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.04)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }));
var layer = function (every, size, col, op, ro, over) {
var arr = []; line.forEach(function (p_, k) { if (k % every === 0) arr.push(p_[0], p_[1], p_[2]); });
var gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
var pm = new THREE.Points(gm, new THREE.PointsMaterial({ map: dotT, color: col, size: size, sizeAttenuation: true, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: !over, toneMapped: false }));
pm.renderOrder = ro; pm.frustumCulled = false; C.root.add(pm); C.flares.push({ s: pm, kind: 'tail', op: op, over: !!over });
};
layer(1, 0.04, 0xffb4a4, 1.0, 25);
layer(1, 0.18, 0xff2a14, 0.6, 24, true);
layer(2, 0.6, 0xff1404, 0.26, 23, true);
layer(4, 1.6, 0xff0a00, 0.08, 22, true);
})();
}
CR.musicOn = (function () { try { return localStorage.getItem('v3d.music') !== '0'; } catch (e) { return true; } })();
function crMusic() {
var A = AUD.ctx, want = !!(A && CR.musicOn && mode === 'car' && !document.hidden);
if (!A) return;
if (want && !CR.musBuf && !CR.musLoading) {
CR.musLoading = 1;
var dec = function () {
var b64 = (window.ESASIM_AUDIO || {}).soundtrack; if (!b64) { CR.musLoading = 0; return; }
var bin = atob(b64), u8 = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
var ok = function (buf) { CR.musBuf = buf; CR.musLoading = 0; crMusic(); }, bad = function () { CR.musLoading = 0; CR.musBroken = 1; };
try { var pr = A.decodeAudioData(u8.buffer, ok, bad); if (pr && pr.catch) pr.catch(bad); } catch (e) { bad(); }
};
fromProject(['soundtrack.mp3', 'soundtrack.ogg', 'music.mp3'], 'buffer', function (buf) {
var ok = function (b) { CR.musBuf = b; CR.musLoading = 0; crMusic(); }, bad = function () { CR.musLoading = 0; CR.musBroken = 1; };
try { var pr = A.decodeAudioData(buf, ok, bad); if (pr && pr.catch) pr.catch(bad); } catch (e) { bad(); }
}, function () {
if ((window.ESASIM_AUDIO || {}).soundtrack) dec();
else { var sc = document.createElement('script'); sc.src = 'audio/soundtrack.js?v=2'; sc.onload = dec; sc.onerror = function () { CR.musLoading = 0; CR.musBroken = 1; }; document.head.appendChild(sc); }
});
return;
}
if (!CR.musBuf) return;
if (!CR.mus || CR.mus.ctx !== A) {
if (!want) return;
var src = A.createBufferSource(), g = A.createGain(); src.buffer = CR.musBuf; src.loop = true; g.gain.value = 0;
src.connect(g); g.connect(AUD.out || A.destination); src.start();
CR.mus = { ctx: A, src: src, g: g };
}
CR.mus.g.gain.setTargetAtTime(want ? 0.3 : 0, A.currentTime, want ? 0.6 : 0.25);
}
setInterval(function () { if (CR.mus || (CR.musicOn && mode === 'car' && AUD.ctx)) crMusic(); }, 300);
function crBuiltin() {
if (CR.builtin) return; CR.builtin = 1;
var go = function () {
var b64 = (window.ESASIM_MODELS || {}).roadster; if (!b64 || CR.modelId) return;
var bin = atob(b64), buf = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
var gl = new A.GLTFLoader();
gl.register(function (parser) { parser.textureLoader = new THREE.TextureLoader(); return { name: 'esasim_images' }; });
gl.parse(buf.buffer, '', function (g) { if (CR.modelId) return; CR.custom = g.scene; if (CR.car) crUseModel(CR.car, g.scene); }, function (e) { ctx.status('Could not read the stunt car: ' + (e && e.message || e)); });
};
fromProject(['roadster.glb', 'car.glb'], 'buffer', function (buf) {
var gl = new A.GLTFLoader();
gl.register(function (parser) { parser.textureLoader = new THREE.TextureLoader(); return { name: 'esasim_images' }; });
gl.parse(buf, '', function (g) { if (CR.modelId) return; CR.custom = g.scene; if (CR.car) crUseModel(CR.car, g.scene); }, function (e) { ctx.status('Could not read the stunt car: ' + (e && e.message || e)); });
}, function () {
if ((window.ESASIM_MODELS || {}).roadster) { go(); return; }
var sc = document.createElement('script'); sc.src = 'models/roadster.js?v=1'; sc.onload = go; sc.onerror = function () { CR.builtin = 0; }; document.head.appendChild(sc);
});
}
var CRFX = { n: quality === 'fast' ? 2200 : 7000 };
function crFxBuild(root) {
var jetMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 0 } },
vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
fragmentShader: 'uniform float uA; varying vec2 vUv; void main(){ float along = 1.0 - vUv.y; float edge = sin(vUv.x * 3.14159); float a = uA * pow(edge, 1.5) * (1.0 - along) * (0.35 + 0.65 * (1.0 - along));'
+ ' gl_FragColor = vec4(vec3(0.7, 0.84, 1.0) * a, a); }' });
CRFX.jets = (CR.car.nozzles || []).map(function (nz) {
var g = new THREE.CylinderGeometry(0.05, 0.6, 1, 20, 1, true); g.translate(0, -0.5, 0);
var m = new THREE.Mesh(g, jetMat.clone()); m.frustumCulled = false; m.renderOrder = 19; CR.car.root.add(m); m.position.copy(nz.at);
m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), nz.dir); m.visible = false; return m;
});
if (!CRFX.puff) { CRFX.puff = new THREE.TextureLoader().load(CR_PUFF); }
function sys(blend, col, tex) {
var g = new THREE.BufferGeometry(), N = CRFX.n;
g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(3 * N), 3));
g.setAttribute('aSize', new THREE.Float32BufferAttribute(new Float32Array(N), 1));
g.setAttribute('aAlpha', new THREE.Float32BufferAttribute(new Float32Array(N), 1));
g.setAttribute('aRot', new THREE.Float32BufferAttribute(new Float32Array(N), 1));
var m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: blend, uniforms: { uCol: { value: new THREE.Color(col) }, uScale: { value: 400 }, uMax: { value: 300 }, uTex: { value: CRFX.puff }, uUse: { value: tex ? 1 : 0 } },
vertexShader: 'attribute float aSize; attribute float aAlpha; attribute float aRot; varying float vA; varying float vR; uniform float uScale; uniform float uMax; void main(){ vR = aRot; vec4 mv = modelViewMatrix * vec4(position, 1.0); float ps = aSize * uScale / max(0.5, -mv.z); vA = aAlpha * mix(0.3, 1.0, min(1.0, uMax / ps)) * smoothstep(0.8, 3.5, -mv.z); gl_PointSize = min(ps, uMax); gl_Position = projectionMatrix * mv; if (vA < 0.002) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); }',
fragmentShader: 'uniform vec3 uCol; uniform sampler2D uTex; uniform float uUse; varying float vA; varying float vR; void main(){ vec2 d = gl_PointCoord - 0.5;'
+ ' if (uUse > 0.5) { float c = cos(vR), s = sin(vR); vec2 q = vec2(c * d.x - s * d.y, s * d.x + c * d.y) * 1.38 + 0.5; if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) discard; float t = texture2D(uTex, q).r; float e = 1.0 - smoothstep(0.32, 0.5, length(d)); float a = vA * t * e; if (a < 0.003) discard; gl_FragColor = vec4(uCol * (0.75 + 0.35 * t), a); }'
+ ' else { float r = dot(d, d) * 4.0; if (r > 1.0) discard; float a = vA * exp(-r * 3.2) * (1.0 - r); gl_FragColor = vec4(uCol, a); } }' });
var p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 20; root.add(p);
return { pts: p, x: new Float32Array(3 * N), v: new Float32Array(3 * N), life: new Float32Array(N), max: new Float32Array(N), s0: new Float32Array(N), s1: new Float32Array(N), a0: new Float32Array(N), rot: new Float32Array(N), w: new Float32Array(N), i: 0 };
}
CRFX.mist = sys(THREE.NormalBlending, 0xe9eef4, true); CRFX.mist.cold = true;
CRFX.dust = sys(THREE.NormalBlending, 0xe4e8ee, true); CRFX.dust.cold = true;
CRFX.glass = sys(THREE.AdditiveBlending, 0xd8ecff);
CRFX.spark = sys(THREE.AdditiveBlending, 0xffa040);
var lm = new THREE.LineBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
var dm = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.3, 0.2) });
CRFX.lasers = [0, 1].map(function () {
var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
var l = new THREE.Line(g, lm); l.frustumCulled = false; root.add(l);
var dot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), dm); root.add(dot); l.visible = dot.visible = false;
return { line: l, dot: dot };
});
}
var CRX = { on: false, t: null, parts: [], scrape: 0 };
function crCrashReset() {
var C = CR.car; CRX.on = false; CRX.t = null; CRX.scrape = 0;
CRX.parts.forEach(function (p) { if (p.m.parent) p.m.parent.remove(p.m); if (p.own) p.m.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); }); CRX.parts = [];
if (!C) return;
(C.customWheels || C.wheels || []).forEach(function (w) { w.mount.visible = true; });
(C.dents || []).forEach(function (d) { d.mesh.geometry.dispose(); d.mesh.geometry = d.geo; }); C.dents = null;
}
var CR_BODY = [[2.22, 0.62, -0.29], [2.22, -0.62, -0.29], [-2.05, 0.8, -0.25], [-2.05, -0.8, -0.25], [0.1, 0.95, -0.32], [0.1, -0.95, -0.32], [0.45, 0.55, 0.7], [0.45, -0.55, 0.7], [-0.25, 0.55, 0.7], [-0.25, -0.55, 0.7]];
function crCrash(r, hit) {
var C = CR.car, I = CR.F, T = CR.track || {}; if (!C || CRX.on) return;
CRX.on = true; CRX.t = CR.ct; CRX.hit = hit;
C.root.updateMatrixWorld(true);
var sev = Math.max(0, Math.min(1, (hit - 1) / 12));       // 0: a scrape, 1: a crash at 50 km/h
var P = null; (T.body || CR_BODY).forEach(function (b) { var w = CB(b[0], b[1], b[2]).applyMatrix4(C.root.matrixWorld); if (!P || w.y < P.y) P = w; });
var vel = new THREE.Vector3(r[I.vx] || 0, r[I.vz] || 0, -(r[I.vy] || 0));
var depth = 0.06 + 0.4 * sev, rad = 0.9 + 0.9 * sev, up = new THREE.Vector3(0, 1, 0), V = new THREE.Vector3(), inv = new THREE.Matrix4();
C.dents = [];
(C.custom || C.drawn).traverse(function (m) {
if (!m.isMesh || !m.visible || !m.geometry || !m.geometry.attributes.position) return;
var inWheel = false, q = m; while (q) { if ((C.customWheels || C.wheels || []).some(function (w) { return w.mount === q; })) inWheel = true; q = q.parent; } if (inWheel) return;
var g0 = m.geometry, g = g0.clone(), pa = g.attributes.position, moved = false;
inv.copy(m.matrixWorld).invert();
for (var i = 0; i < pa.count; i++) {
V.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld);
var d2 = V.distanceToSquared(P); if (d2 > rad * rad * 4) continue;
var f = Math.exp(-d2 / (2 * rad * rad)) * Math.max(0, 1 - (V.y - P.y) / 1.3);
if (f < 0.02) continue;
V.addScaledVector(up, depth * f).add(new THREE.Vector3((Math.random() - 0.5) * 0.04 * f, 0, (Math.random() - 0.5) * 0.04 * f));
V.applyMatrix4(inv); pa.setXYZ(i, V.x, V.y, V.z); moved = true;
}
if (!moved) { g.dispose(); return; }
pa.needsUpdate = true; g.computeVertexNormals(); m.geometry = g; C.dents.push({ mesh: m, geo: g0 });
});
function fly(obj, own, size, v, w) { CR.root.attach(obj); CRX.parts.push({ m: obj, v: v, w: w, hs: size, own: own, rest: false }); }
var ws = (C.customWheels || C.wheels || []).slice().sort(function (a, b) { return a.mount.getWorldPosition(new THREE.Vector3()).distanceTo(P) - b.mount.getWorldPosition(new THREE.Vector3()).distanceTo(P); });
var nOff = hit > 9 ? 4 : hit > 5 ? 2 : hit > 3 ? 1 : 0;
ws.slice(0, nOff).forEach(function (w) {
var piece = w.mount.clone(true); w.mount.getWorldPosition(piece.position); w.mount.getWorldQuaternion(piece.quaternion); CR.root.add(piece); w.mount.visible = false;
var out = piece.position.clone().sub(C.root.position).setY(0).normalize();
CRX.parts.push({ m: piece, v: vel.clone().multiplyScalar(0.6).addScaledVector(out, 2 + 5 * Math.random() * (0.4 + sev)).add(new THREE.Vector3(0, 2 + 4 * Math.random() * (0.3 + sev), 0)),
w: new THREE.Vector3((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 18), hs: (T.wheel_r || 0.33), own: false, rest: false });
});
var white = crMat(0xe9e9e6, 0.25, 0.1), carb = crMat(0x16171a, 0.45, 0.3), nP = Math.round(6 + 26 * sev);
for (var k = 0; k < nP; k++) {
var a = 0.12 + Math.random() * (0.25 + 0.5 * sev), b2 = 0.08 + Math.random() * 0.4, m2 = new THREE.Mesh(new THREE.BoxGeometry(a, 0.012 + Math.random() * 0.03, b2), Math.random() < 0.55 ? white : carb);
m2.castShadow = true; m2.position.copy(P).add(new THREE.Vector3((Math.random() - 0.5) * 1.6, 0.15 + Math.random() * 0.5, (Math.random() - 0.5) * 1.6)); m2.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); CR.root.add(m2);
var an = Math.random() * Math.PI * 2, sp = 2 + Math.random() * (4 + 8 * sev);
CRX.parts.push({ m: m2, v: vel.clone().multiplyScalar(0.5).add(new THREE.Vector3(Math.cos(an) * sp, 1.5 + Math.random() * (2 + 5 * sev), Math.sin(an) * sp)), w: new THREE.Vector3((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30), hs: 0.02, own: true, rest: false });
}
var nG = Math.round(120 + 500 * sev); for (var g2 = 0; g2 < nG; g2++) { var a2 = Math.random() * Math.PI * 2, s2 = 1 + Math.random() * (3 + 7 * sev); crPuff(CRFX.glass, P.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 0.3 + Math.random() * 0.6, (Math.random() - 0.5) * 1.2)), vel.clone().multiplyScalar(0.4).add(new THREE.Vector3(Math.cos(a2) * s2, 1 + Math.random() * (2 + 4 * sev), Math.sin(a2) * s2)), 1.2 + Math.random() * 1.5, 0.05, 0.03, 0.9); }
for (var g3 = 0; g3 < 90 + 200 * sev; g3++) { var a3 = Math.random() * Math.PI * 2, s3 = 2 + Math.random() * 9; crPuff(CRFX.spark, P.clone().setY(0.1), vel.clone().multiplyScalar(0.5).add(new THREE.Vector3(Math.cos(a3) * s3, 0.5 + Math.random() * 3, Math.sin(a3) * s3)), 0.25 + Math.random() * 0.5, 0.05, 0.02, 1.0); }
crSnd('crash', hit, P);
}
function crDebris(dt) {
if (!CRX.parts.length || dt <= 0) return;
var q = new THREE.Quaternion(), e = new THREE.Euler();
CRX.parts.forEach(function (p) {
if (p.rest) return;
p.v.y -= 9.81 * dt; p.m.position.addScaledVector(p.v, dt);
e.set(p.w.x * dt, p.w.y * dt, p.w.z * dt); q.setFromEuler(e); p.m.quaternion.multiply(q);
if (p.m.position.y < p.hs) {
p.m.position.y = p.hs;
if (p.v.y < -2.5) crSnd('clatter', -p.v.y, p.m.position);
p.v.y = Math.abs(p.v.y) * 0.32; p.v.x *= 0.72; p.v.z *= 0.72; p.w.multiplyScalar(0.7);
if (Math.abs(p.v.y) < 0.4 && p.v.x * p.v.x + p.v.z * p.v.z < 0.05) p.rest = true;
}
});
}
function crPuff(S, p, v, life, s0, s1, a0) {
var i = S.i = (S.i + 1) % CRFX.n; S.x[3 * i] = p.x; S.x[3 * i + 1] = p.y; S.x[3 * i + 2] = p.z; S.v[3 * i] = v.x; S.v[3 * i + 1] = v.y; S.v[3 * i + 2] = v.z;
S.life[i] = life; S.max[i] = life; S.s0[i] = s0; S.s1[i] = s1; S.a0[i] = a0; S.rot[i] = Math.random() * 6.283; S.w[i] = (Math.random() < 0.5 ? -1 : 1) * (7 + 9 * Math.random());
}
function crFxStep(S, dt, drag, rise) {
S.pts.material.uniforms.uMax.value = Math.max(96, renderer.domElement.height * 0.3);
var P5 = S.pts.geometry.attributes.position.array, SZ = S.pts.geometry.attributes.aSize.array, AL = S.pts.geometry.attributes.aAlpha.array, RO = S.pts.geometry.attributes.aRot.array, k = Math.exp(-drag * dt);
for (var i = 0; i < CRFX.n; i++) {
if (S.life[i] <= 0) { AL[i] = 0; continue; }
S.life[i] -= dt; var f = 1 - S.life[i] / S.max[i];
S.v[3 * i] *= k; S.v[3 * i + 1] = S.v[3 * i + 1] * k + rise * dt; S.v[3 * i + 2] *= k;
S.x[3 * i] += S.v[3 * i] * dt; S.x[3 * i + 1] += S.v[3 * i + 1] * dt; S.x[3 * i + 2] += S.v[3 * i + 2] * dt;
var sz_ = S.s0[i] + (S.s1[i] - S.s0[i]) * (0.8 * Math.sqrt(f) + 0.45 * f * f), floor_ = S.cold ? Math.max(0.05, 0.16 * sz_) : 0.05;
if (S.x[3 * i + 1] < floor_) { S.x[3 * i + 1] = floor_; if (S.v[3 * i + 1] < 0) { var spl = -S.v[3 * i + 1] * (S.cold ? 0.35 : 0); S.v[3 * i + 1] = S.cold ? 0 : Math.abs(S.v[3 * i + 1]) * 0.1; if (spl) { var hv = Math.hypot(S.v[3 * i], S.v[3 * i + 2]) || 1; S.v[3 * i] += S.v[3 * i] / hv * spl; S.v[3 * i + 2] += S.v[3 * i + 2] / hv * spl; } } }
P5[3 * i] = S.x[3 * i]; P5[3 * i + 1] = S.x[3 * i + 1]; P5[3 * i + 2] = S.x[3 * i + 2];
SZ[i] = sz_; AL[i] = S.a0[i] * (1 - Math.pow(f, 2.4)) * Math.min(1, f * 8);
var gr = S.s0[i] / Math.max(1e-3, SZ[i]); S.rot[i] += S.w[i] * gr * gr * dt; RO[i] = S.rot[i];
}
S.pts.geometry.attributes.aRot.needsUpdate = true;
S.pts.geometry.attributes.position.needsUpdate = true; S.pts.geometry.attributes.aSize.needsUpdate = true; S.pts.geometry.attributes.aAlpha.needsUpdate = true;
}
var crBar = document.createElement('span'); crBar.style.cssText = 'display:none;gap:6px;align-items:center';
var CR_CAMS = [['director', 'Director', 'The camera cuts by itself through the stunt, like a broadcast (a drag takes over)'], ['chase', 'Chase', 'Behind the car'], ['orbit', 'Orbit', 'Around the car: drag to turn, wheel to zoom'],
['side', 'Side', 'A long lens on the side of the ramp'], ['free', 'Free', 'The camera stays where you leave it']];
var crCamSel = document.createElement('select'); crCamSel.style.cssText = 'background:#1b2029;color:#e8ecf2;border:1px solid #2a303b;border-radius:6px;font-size:12px;padding:1px 4px';
crCamSel.innerHTML = CR_CAMS.map(function (c) { return '<option value="' + c[0] + '" title="' + esc(c[2]) + '">' + esc(c[1]) + '</option>'; }).join('');
crCamSel.onchange = function () { crSetCam(crCamSel.value); keepView(true); };
crBar.appendChild(crCamSel); barEl.insertBefore(crBar, $('.cam'));
var crTelC = document.createElement('canvas');
crTelC.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;background:#0b0f16;display:none;z-index:50';
if (CR_TEL) { el.appendChild(crTelC); CR.musicOn = false; AUD.on = false; }
CR.lasersOn = (function () { try { return localStorage.getItem('v3d.sens') !== '0'; } catch (e) { return true; } })();
[['snd', '🔊 Sound', 'Sound effects on or off (they start with your first click in the view)'], ['mus', '🎵 Music', 'The soundtrack on or off: it plays in a loop, and a recording of the view takes it in'], ['las', '📡 Sensors', 'The sensors: the numbers, the air system (tanks, fans, nozzles) and the beams of the two laser rangefinders, on screen and in recordings']].forEach(function (c) {
var b = document.createElement('button'); b.textContent = c[1]; b.title = c[2]; b.style.cssText = 'all:unset;cursor:pointer;padding:2px 8px;border:1px solid #2a303b;border-radius:6px;font-size:12px';
var on = function () { return c[0] === 'snd' ? AUD.on : c[0] === 'mus' ? CR.musicOn : CR.lasersOn !== false; };
var paint = function () { b.style.background = on() ? '#3a4dd8' : ''; b.style.opacity = on() ? '1' : '0.6'; };
b.onclick = function () { audUnlock(); if (c[0] === 'snd') AUD.on = !AUD.on; else if (c[0] === 'mus') { CR.musicOn = !CR.musicOn; try { localStorage.setItem('v3d.music', CR.musicOn ? '1' : '0'); } catch (e) { } crMusic(); } else { CR.lasersOn = !on(); try { localStorage.setItem('v3d.sens', CR.lasersOn ? '1' : '0'); } catch (e) { } } paint(); keepView(true); };
paint(); crBar.appendChild(b);
});
var crBan = document.createElement('div');
crBan.style.cssText = 'position:absolute;left:50%;top:24%;transform:translate(-50%,-50%);font:700 30px/1.15 Inter,-apple-system,Segoe UI,sans-serif;letter-spacing:2px;padding:12px 26px;border-radius:14px;background:rgba(10,14,22,.55);backdrop-filter:blur(6px);display:none;text-align:center';
ui.appendChild(crBan);
var crNoz = document.createElement('canvas'), CRN_W = 200, CRN_H = 300; crNoz.width = CRN_W * 2; crNoz.height = CRN_H * 2;
crNoz.style.cssText = 'position:absolute;left:12px;top:170px;width:' + CRN_W + 'px;height:' + CRN_H + 'px;background:rgba(10,14,22,.66);border:1px solid rgba(255,255,255,.08);border-radius:10px;display:none;pointer-events:none';
crNoz.title = 'The air system from above, front up: the tanks with their level, the suction fans, and each nozzle with its thrust while it blows';
ui.appendChild(crNoz);
function crSetCam(c) {
if (c === 'onboard') c = 'chase';
CR.cam = c; if (crCamSel.value !== c) crCamSel.value = c;
controls.enabled = c === 'orbit' || c === 'free'; CR.shot = null;
if (c !== 'onboard') camera.up.set(0, 1, 0);
}
function enterCar() {
stopLive(); clearEntities(); runs = []; runSel.style.display = 'none'; modeBtn.style.display = 'none'; $('.cam').style.display = 'none'; $('.fit').style.display = 'none'; tl.style.display = 'none';
mode = 'car'; shownKey = 'car'; CR.on = true;
ground.visible = false; grid.visible = false; grid10.visible = false; windLines.visible = false; trailGroup.visible = false;
if (sky) { scene.remove(sky); sky = null; }
scene.background = new THREE.Color(0x000000); scene.fog = new THREE.FogExp2(0x020203, 0.0022);
scene.environment = crNightEnv(); scene.environmentIntensity = 0.55;
sun.intensity = 0.15; sun.color.set(0xdfe6ff); sun.castShadow = false; sun.position.set(-200, 400, 300);
if (sun.castShadow) { var sc_ = sun.shadow.camera; sc_.left = -16; sc_.right = 16; sc_.top = 16; sc_.bottom = -16; sc_.near = 1; sc_.far = 160; sc_.updateProjectionMatrix();
sun.shadow.mapSize.set(quality === 'high' ? 4096 : 2048, quality === 'high' ? 4096 : 2048); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; sun.shadow.radius = 3; }
hemi.intensity = 0.12; hemi.color.set(0x9db4e8); hemi.groundColor.set(0x1a1712);
renderer.toneMappingExposure = 0.8;
controls.maxPolarAngle = Math.PI * 0.497; controls.minDistance = 2; controls.maxDistance = 600; controls.enablePan = true;
camera.near = 0.05; camera.far = 9000; camera.updateProjectionMatrix();
crWorld(); CR.rebuild = false;
if (quality !== 'fast' && !composer) {
composer = new A.EffectComposer(renderer); composer.addPass(new A.RenderPass(scene, camera));
composer.addPass(cleanPass()); CR.bloom = new A.UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.45, 2.2); composer.addPass(CR.bloom); composer.addPass(new A.OutputPass()); composer.addPass(fxaaPass()); resize();
}
barEl.style.display = 'flex'; crBar.style.display = 'inline-flex'; crNoz.style.display = '';
crSetCam(CR_TEL ? 'free' : CR_FIXED || (ctx.state && ctx.state.crcam) || 'director');
if (CR_TEL) { crTelC.style.display = ''; renderer.domElement.style.visibility = 'hidden'; }
renderer.domElement.addEventListener('pointerdown', function () { if (CR.cam === 'director' && !CR_FIXED) { controls.target.copy(CR.look || CR.car.root.position); crSetCam('orbit'); } });
if (CR_FIXED) { barEl.style.display = 'none'; crNoz.style.display = 'none'; }
}
var CROW = [], CROW2 = [];
function crLerp(F, t, out) {
var lo = 0, hi = F.length - 1;
if (t <= F[0][0]) { for (var i = 0; i < F[0].length; i++) out[i] = F[0][i]; return out; }
if (t >= F[hi][0]) { for (var j = 0; j < F[hi].length; j++) out[j] = F[hi][j]; return out; }
while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (F[mid][0] <= t) lo = mid; else hi = mid; }
var a = F[lo], b = F[hi], k = (t - a[0]) / Math.max(1e-9, b[0] - a[0]), I = CR.F;
var flip = (a[4] * b[4] + a[5] * b[5] + a[6] * b[6] + a[7] * b[7]) < 0 ? -1 : 1;
for (var m = 0; m < a.length; m++) {
var bv = b[m];
if (m >= 4 && m <= 7) bv *= flip;
if (m >= I.s0 && m <= I.s3) { var dd = bv - a[m]; if (dd > Math.PI) dd -= 2 * Math.PI; if (dd < -Math.PI) dd += 2 * Math.PI; out[m] = a[m] + dd * k; continue; }
out[m] = a[m] + (bv - a[m]) * k;
}
if (I.phase != null) out[I.phase] = k < 0.5 ? a[I.phase] : b[I.phase];
return out;
}
function crPick() {
var ids = CR.order, run = null, idle = null, train = null, now = crNow();
for (var i = ids.length - 1; i >= 0; i--) {
var E = CR.eps[ids[i]]; if (!E) continue;
if (!run && E.kind === 'run') run = E;
if (!idle && E.kind === 'idle') idle = E;
if (!train && E.kind === 'training' && E.done && E.frames.length > 1) train = E;
}
if (run && (!idle || run.at >= idle.at)) return run;
if (idle && (!train || idle.at >= train.at)) return idle;
return train;
}
var CR_LAG = 1.2;
function crStep(dt) {
if (CR.rebuild) { crCrashReset(); crWorld(); CR.rebuild = false; }
var E = crPick(), now = crNow();
if (E && E.kind === 'training' && CR.cur && CR.cur.kind === 'training' && CR.cur !== E && CR.ct != null && CR.ct < CR.cur.frames[CR.cur.frames.length - 1][0] + 3.0) E = CR.cur;
if (E !== CR.cur) { CR.cur = E; CR.ct = null; CR.shot = null; CR.lastPhase = -1; CR.tdShown = false; CR.resShown = false; crBan.style.display = 'none'; crCrashReset(); CR.snd = {}; if (CR.leds) CR.leds.end = null; if (E && E.kind === 'run') CR.wait = 0; }
if (!E || !E.frames.length) { if (CR_TEL) crTel(null); else crPose(null, null, dt); return; }
var F = E.frames;
if (E.kind === 'training') {
if (CR.ct == null) CR.ct = F[0][0];
if (playing) CR.ct += dt * speed;
if (CR.ct > F[F.length - 1][0] + 3.0) CR.ct = F[0][0];
} else if (E.kind === 'run' && E.ahead) {
var pt = now - E.startAt;
if (pt < 0) {
var cd = Math.ceil(-pt - 1e-6); CR.ct = F[0][0];
if (cd <= 3) { crBan.style.display = 'none'; crCount(cd, Math.min(1, Math.max(0, cd + pt))); if (CR.beep !== -cd) { CR.beep = -cd; crSnd('count', 1, null); } }
else { crCount(null); if (crBan.style.display === 'none') crBanner('GET READY', '#f3f5f7'); }
} else {
crCount(null);
if (CR.beep != null && CR.beep < 0 && pt < 1.5) { crBan.style.display = 'none'; CR.beep = 0; crSnd('go', 1, null); }
var want = F[0][0] + pt, newest2 = F[F.length - 1][0];
if (CR.ct == null || Math.abs(want - CR.ct) > 0.5) CR.ct = want; else CR.ct += dt * Math.min(1.1, Math.max(0.9, 1 + 0.5 * (want - CR.ct)));
CR.ct = Math.min(Math.max(CR.ct, F[0][0]), newest2);
}
} else if (E.kind === 'run') {
var newest = F[F.length - 1][0];
if (E.countdown != null && (!E.sync || E.sync.t <= F[0][0] + 0.01) && now - E.countAt < 2) {
crBanner(String(-E.countdown), '#f3f5f7'); CR.ct = F[0][0];
if (CR.beep !== E.countdown) { CR.beep = E.countdown; crSnd('beep', 1, null); }
} else if (E.sync) {
var tgt = E.sync.t + (now - E.sync.at) - Math.max(CR_LAG, Math.min(6, (CR.late || 0) + 0.6));
if (CR.ct == null || Math.abs(tgt - CR.ct) > 4) CR.ct = Math.max(F[0][0], tgt);
else CR.ct += dt * Math.min(1.4, Math.max(0.6, 1 + 0.5 * (tgt - CR.ct)));
CR.ct = Math.min(CR.ct, newest);
}
} else CR.ct = F[0][0];
if (CRX.on && CRX.t != null && CR.ct < CRX.t - 0.05) { crCrashReset(); CR.tdShown = false; CR.snd = {}; }
crLerp(F, CR.ct, CROW);
if (CR_TEL) { crTel(E); return; }
crPose(E, CROW, dt);
}
var crCnt = document.createElement('div');
crCnt.style.cssText = 'position:absolute;left:50%;top:42%;transform:translate(-50%,-50%) scale(1);font:900 170px/1 Inter,-apple-system,Segoe UI,sans-serif;color:#f6f7fa;text-shadow:0 0 30px rgba(255,60,40,.55),0 0 80px rgba(255,40,20,.35);display:none;pointer-events:none;will-change:transform,opacity';
ui.appendChild(crCnt);
function crCount(n, s) {
CR.cnt = n == null ? null : { n: n, s: s };
if (n == null) { crCnt.style.display = 'none'; return; }
if (crCnt.textContent !== String(n)) crCnt.textContent = String(n);
crCnt.style.display = ''; crCnt.style.opacity = String(Math.max(0, 1 - Math.pow(s, 1.6)));
crCnt.style.transform = 'translate(-50%,-50%) scale(' + (0.45 + 1.35 * s).toFixed(3) + ')';
}
if (ctx.on) ctx.on('peer', function (topic) { if (topic === 'car-start' && mode === 'car') crStartPressed(true); });
function crStartPressed(fromPeer) { if (!fromPeer && ctx.peer) ctx.peer('car-start', {}); CR.wait = performance.now(); crBanner('GET READY<div style="font-size:15px;font-weight:600;letter-spacing:0;margin-top:4px;opacity:.85">the stunt is starting…</div>', '#f3f5f7'); }
function crBanner(text, col) { crBan.innerHTML = text; crBan.style.color = col || '#f3f5f7'; crBan.style.display = ''; CR.bannerAt = performance.now(); }
var CRQ = new THREE.Quaternion(), CRV = new THREE.Vector3(), CRV2 = new THREE.Vector3(), CRV3 = new THREE.Vector3(), CRM = new THREE.Matrix4();
var CRLC = new THREE.Color();
function crLeds(carX, dt) {
var L = CR.leds; if (!L) return;
var want = Math.max(L.far, Math.min(L.x0 - 10, carX));
if (L.end == null) L.end = L.x0 - 10;
L.end = want > L.end ? want : Math.max(want, L.end - 45 * Math.max(0, dt || 0));
var tt = performance.now() / 1000, n = L.x.length, changed = false;
for (var i = 0; i < n; i++) {
var x = L.x[i], d = x - L.end, k = d >= 0.5 ? 1 : d > -0.5 ? d + 0.5 : 0;
var head = Math.max(0, 1 - Math.abs(x - carX) / 3) * (carX < L.x0 ? 1 : 0);  // the bars by the car: brighter, pulsing
var v = k * (1 + head * (0.8 + 0.4 * Math.sin(tt * 14)));
if (Math.abs((L.lit[i] || 0) - v) < 0.01) continue;
L.lit[i] = v; changed = true;
L.bar.setColorAt(i, CRLC.setRGB(0.12 + 2.48 * v, 0.008 + 0.036 * v, 0.006 + 0.017 * v));
L.glow.setColorAt(i, CRLC.setRGB(v, v, v));
}
if (changed) { L.bar.instanceColor.needsUpdate = true; L.glow.instanceColor.needsUpdate = true; }
}
function crHeadlights(C) {
if (!C.hl) return;
var hn = CRV.set(0, 0, -1).applyQuaternion(C.root.quaternion), hd = hn.dot(C.root.position);
C.hl.planes[0].set(hn, -hd - C.hl.gap); C.hl.planes[1].normal.copy(hn).negate(); C.hl.planes[1].constant = hd - C.hl.gap;
}
function crKey(C) {
if (mode !== 'car') return;
var p = C.root.position;
sun.target.position.set(p.x, Math.max(0, p.y - 2), p.z); sun.position.set(p.x - 30, p.y + 60, p.z + 45); sun.target.updateMatrixWorld();
var F = CR.follow; if (!F) return;
F.position.set(p.x + 8, Math.max(26, p.y + 22), p.z - 18); F.target.position.copy(p); F.target.updateMatrixWorld();
}
function crCube(C) {
if (quality !== 'high' || CR_FIXED || !C || !C.root || !C.custom) return;
var K = CR.cube;
if (!K) {
var rt = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType, generateMipmaps: false, minFilter: THREE.LinearFilter });
K = CR.cube = { rt: rt, cam: new THREE.CubeCamera(0.4, 600, rt), face: 0, mats: null };
scene.add(K.cam);
}
if (K.car !== C.custom) {
K.car = C.custom; K.mats = [];
C.root.traverse(function (m) { if (!m.isMesh || !m.material) return; (Array.isArray(m.material) ? m.material : [m.material]).forEach(function (mt) { if (mt && mt.isMeshPhysicalMaterial && mt.clearcoat > 0 && K.mats.indexOf(mt) < 0) { mt.envMap = K.rt.texture; mt.needsUpdate = true; K.mats.push(mt); } }); });
}
if (K.face === 0) {
K.cam.position.copy(C.root.position); K.cam.position.y += 0.7; K.cam.updateMatrixWorld(true);
if (K.cam.coordinateSystem !== renderer.coordinateSystem) { K.cam.coordinateSystem = renderer.coordinateSystem; K.cam.updateCoordinateSystem(); }
}
var vis = C.root.visible, sa = renderer.shadowMap.autoUpdate, prt = renderer.getRenderTarget(), pf = renderer.getActiveCubeFace(), pm = renderer.getActiveMipmapLevel();
C.root.visible = false; renderer.shadowMap.autoUpdate = false;
try { renderer.setRenderTarget(K.rt, K.face, 0); renderer.render(scene, K.cam.children[K.face]); } catch (e) { }
renderer.setRenderTarget(prt, pf, pm); renderer.shadowMap.autoUpdate = sa; C.root.visible = vis;
if (++K.face === 6) { K.face = 0; K.rt.texture.needsPMREMUpdate = true; }
}
var CRF = new THREE.Vector3(), CRF2 = new THREE.Vector3();
function crFlares(C) {
if (C && C.flares && C.flares.length) {
var fw = CRF.set(1, 0, 0).applyQuaternion(C.root.quaternion);
C.flares.forEach(function (f) {
var tc = CRF2.copy(camera.position).sub(f.s.getWorldPosition(CRV3)).normalize(), d = fw.dot(tc);
if (f.kind === 'head') { var k = Math.max(0, (d - 0.45) / 0.55); f.s.material.opacity = Math.min(1, k * k * 1.2); var sz = 0.6 + 2.6 * Math.pow(k, 4); f.s.scale.set(sz, sz, 1); }
else { var kb = Math.max(0, -d), brk = C.brake && C.brake.intensity > 0.01 ? 1.6 : 1; f.s.material.opacity = Math.min(1, f.op * (f.over ? Math.min(1, Math.max(0, (kb - 0.12) / 0.3)) * (0.6 + 0.5 * kb) : 0.45 + 0.75 * kb) * brk); }
});
}
(CR.redFlares || []).forEach(function (f) {
var tc = CRF2.copy(camera.position).sub(f.s.position).normalize(), a = Math.max(0, f.dir.dot(tc)), k = Math.pow(a, 3);
var sz = f.base * (1 + 2.2 * k); f.s.scale.set(sz, sz, 1); f.s.material.opacity = 0.55 + 0.45 * k;
});
}
function crPose(E, r, dt) {
var C = CR.car; if (!C) return;
var I = CR.F, T = CR.track || {};
if (!r) { C.root.position.copy(CW(-60, 0, T.ride || 0.5)); C.root.quaternion.set(0, 0, 0, 1); crHeadlights(C); crKey(C); crCube(C); crFlares(C); crLeds(-60, dt); crCamera(null, null, dt); crHud(null, null); return; }
C.root.position.copy(CW(r[I.x], r[I.y], r[I.z]));
crLeds(r[I.x], dt);
C.root.quaternion.set(r[I.qx], r[I.qz], -r[I.qy], r[I.qw]).normalize();
var steer = r[I.steer] || 0, rest = T.rest || 0.4, wr = T.wheel_r || 0.36;
(C.customWheels || C.wheels).forEach(function (w, k) {
if (w.k != null) k = w.k;
var b = w.mount.userData.base, comp = r[I['c' + k]] || 0;
w.mount.position.copy(CB(b[0], b[1], b[2] + Math.min(comp, 0.17)));
w.mount.rotation.set(0, w.front ? steer : 0, 0);
w.spin.rotation.z = -(r[I['s' + k]] || 0);
});
crHeadlights(C);
crKey(C);
crCube(C);
crFlares(C);
var fan = Math.max(r[I.fan0] || 0, r[I.fan1] || 0);
C.fans.forEach(function (f, k) { f.rotation.y += dt * 140 * (r[I['fan' + k]] || 0) + dt * 2; });
C.brake.intensity = (r[I.drive] || 0) < -0.05 ? 6 : 0;
C.root.updateMatrixWorld(true);
var anyJet = 0, RES = (CR.snd.res = CR.snd.res || []);
for (var k2 = 0; k2 < CRFX.jets.length; k2++) {
var th = Math.max(0, Math.min(1, r[I['n' + k2]] || 0)), jm = CRFX.jets[k2];
if (dt > 0) RES[k2] = Math.max((RES[k2] || 0) * Math.exp(-dt / 1.4), th * 0.6);
jm.visible = th > 0.02;
if (!jm.visible) {
var rs_ = RES[k2] || 0, nzr = C.nozzles[k2];
if (dt > 0 && rs_ > 0.03 && nzr) {
var kr = nzr.size || 1, atr = CRV.copy(nzr.at).applyMatrix4(C.root.matrixWorld), dirr = CRV2.copy(nzr.dir).applyQuaternion(C.root.quaternion), velr = CRV3.set(r[I.vx], r[I.vz], -r[I.vy]);
var nR = rs_ * 80 * dt * kr + (Math.random() < rs_ * 0.5 ? 1 : 0);
for (var qr = 0; qr < nR; qr++) crPuff(CRFX.mist, atr.clone().addScaledVector(dirr, Math.random() * 0.3 * kr), dirr.clone().multiplyScalar((1.5 + 3.5 * Math.random()) * kr * (0.5 + rs_)).add(velr).add(new THREE.Vector3((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 1.2)), 1.8 + Math.random() * 1.8, 0.3 * kr, (2.6 + 3.4 * rs_) * kr, 0.06 + 0.1 * rs_);
}
continue;
}
anyJet += th;
var nz = C.nozzles[k2], kf = nz.size || 1;
var len = (1.0 + 6.0 * th) * kf; jm.scale.set((0.5 + 0.7 * th) * kf, len, (0.5 + 0.7 * th) * kf); jm.material.uniforms.uA.value = 0.55 + 0.7 * th;
var at = CRV.copy(nz.at).applyMatrix4(C.root.matrixWorld), dir = CRV2.copy(nz.dir).applyQuaternion(C.root.quaternion);
var vel = CRV3.set(r[I.vx], r[I.vz], -r[I.vy]);
if (dt > 0) {
var nP = Math.min(14, th * 420 * dt * kf + Math.random() * kf); for (var q = 0; q < nP; q++) crPuff(CRFX.mist, at.clone().addScaledVector(dir, (0.1 + Math.random() * 0.9) * kf), dir.clone().multiplyScalar((9 + 15 * Math.random()) * kf).add(vel).add(new THREE.Vector3((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4).multiplyScalar(kf)), 1.0 + Math.random() * 1.6, 0.5 * kf, (4.6 + th * 5.0) * kf, 0.12 + 0.12 * th);
if (dir.y < -0.4 && at.y < 8) {
var hitT = at.y / -dir.y, hit = at.clone().addScaledVector(dir, hitT), strength = th * Math.max(0, 1 - at.y / 8);
var nD = Math.min(8, strength * 220 * dt + (Math.random() < strength ? 1 : 0));
for (var q2 = 0; q2 < nD; q2++) { var an = Math.random() * Math.PI * 2, sp = 6 + 10 * Math.random() * strength; crPuff(CRFX.dust, hit.clone().setY(0.25), new THREE.Vector3(Math.cos(an) * sp, 0.15 + Math.random() * 0.5, Math.sin(an) * sp), 2.8 + Math.random() * 3.2, 1.5, 8.5 + 5 * strength, 0.08 + 0.12 * strength); }
}
}
}
var phase = I.phase != null ? r[I.phase] : 0, compSum = (r[I.c0] || 0) + (r[I.c1] || 0) + (r[I.c2] || 0) + (r[I.c3] || 0);
var wc = (CR.snd.c = CR.snd.c || [0, 0, 0, 0]), wt = (CR.snd.ct = CR.snd.ct || [-9, -9, -9, -9]), tnow = performance.now() / 1000;
if (phase >= 4 && r[I.z] < 1.2 && dt > 0 && !CRX.on) for (var w4 = 0; w4 < 4; w4++) {
var cw = r[I['c' + w4]] || 0;
if (cw > 0.008 && wc[w4] < 0.002 && CR.tdShown && tnow - wt[w4] > 0.25) { wt[w4] = tnow; crSnd('wheel', Math.abs(r[I.vz] || 0) + 1, C.root.position); }
wc[w4] = cw;
}
if (phase >= 4 && r[I.z] < 0.9 && compSum > 0.008 && !CR.tdShown && dt > 0) {
CR.tdShown = true; var vzT = Math.abs(r[I.vz] || 0);
crSnd('touch', vzT, C.root.position); for (var w5 = 0; w5 < 4; w5++) { if ((r[I['c' + w5]] || 0) > 0.008) wt[w5] = tnow; }
if (vzT > 6.5 && !CRX.on) crCrash(r, vzT);
}
var hitV = I.hit != null ? (r[I.hit] || 0) : 0;
if (hitV > 0.3 && !CRX.on && dt > 0) crCrash(r, hitV);
var vH = Math.hypot(r[I.vx] || 0, r[I.vy] || 0);
CRX.scrape = CRX.on && r[I.z] < 1.2 && vH > 1 ? Math.min(1, vH / 10) : 0;
if (CRX.scrape && dt > 0) for (var q4 = 0; q4 < CRX.scrape * 300 * dt; q4++) { var sp4 = CB(-1 + Math.random() * 2, (Math.random() - 0.5) * 1.6, -0.3).applyMatrix4(C.root.matrixWorld).setY(0.05); crPuff(CRFX.spark, sp4, new THREE.Vector3(-(r[I.vx] || 0) * 0.3 + (Math.random() - 0.5) * 4, 0.5 + Math.random() * 2, (r[I.vy] || 0) * 0.3 + (Math.random() - 0.5) * 4), 0.2 + Math.random() * 0.4, 0.05, 0.02, 1.0); }
crDebris(dt);
var SN = T.sensors, showL = SN && I.las0 != null && CR.cam !== 'onboard' && CR.lasersOn !== false;
(CRFX.lasers || []).forEach(function (L, k) {
L.line.visible = L.dot.visible = false; if (!showL) return;
var rg = r[I['las' + k]], mx = T.laser_max || 40; if (rg == null) return;
var sp = SN[k ? 'laser_roof' : 'laser_floor'], o = CB(sp[0], sp[1], sp[2]).applyMatrix4(C.root.matrixWorld), d = CB(0, 0, k ? 1 : -1).applyQuaternion(C.root.quaternion);
var e = o.clone().addScaledVector(d, Math.min(rg, mx)), pa = L.line.geometry.attributes.position.array;
pa[0] = o.x; pa[1] = o.y; pa[2] = o.z; pa[3] = e.x; pa[4] = e.y; pa[5] = e.z; L.line.geometry.attributes.position.needsUpdate = true;
L.line.visible = L.dot.visible = rg < mx - 0.05; L.dot.position.copy(e);
});
if (dt > 0) { crFxStep(CRFX.mist, dt, 1.7, -2.6); crFxStep(CRFX.dust, dt, 1.0, -0.8); crFxStep(CRFX.glass, dt, 0.25, -9.81); crFxStep(CRFX.spark, dt, 0.9, -7.0); }
crSound(E, r, dt);
if (E && E.meta.result && !CR.resShown && E.frames.length && CR.ct >= E.frames[E.frames.length - 1][0] - (E.kind === 'run' ? 2.6 : 0.05)) {
CR.resShown = true; var res = E.meta.result;
var sub = '<div style="font-size:15px;font-weight:600;letter-spacing:0;margin-top:4px;opacity:.85">' + (res.vz != null ? Math.abs(res.vz).toFixed(1) + ' m/s at touchdown' : '') + (!res.landed && res.miss != null ? ' · ' + res.miss.toFixed(1) + ' m off the line' : '') + (!res.landed && res.hdg != null ? ', ' + Math.round(res.hdg) + '° askew' : '') + (res.air_used != null ? ' · ' + Math.round(res.air_used) + ' kg of air' : res.air != null ? ' · ' + Math.round(res.air) + ' kg of air' : '') + '</div>';
if (!res.landed && res.text === 'off the line') crBanner('OFF THE LINE' + sub, '#ffc145');
else crBanner(res.landed ? 'CAR LANDED!' + sub
: 'LOST<div style="font-size:15px;font-weight:600;letter-spacing:0;margin-top:4px;opacity:.85">' + esc(res.text || '') + '</div>', res.landed ? '#3ddc84' : '#ff6b6b');
}
if (CR.wait) { if (performance.now() - CR.wait > 30000) CR.wait = 0; else CR.bannerAt = performance.now(); }
if (crBan.style.display !== 'none' && performance.now() - CR.bannerAt > 4500) crBan.style.display = 'none';
crCamera(E, r, dt);
crHud(E, r);
}
function crAudBuild() {
var A = AUD.ctx, N = AUD.nodes, M = N.master;
var loop = function (buf) { var s0 = A.createBufferSource(); s0.buffer = buf; s0.loop = true; s0.start(0, Math.random() * 2); return s0; };
var chain = function (src, type, f, Q) { var fl = A.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = Q || 0.7; var gn = A.createGain(); gn.gain.value = 0; src.connect(fl); fl.connect(gn); gn.connect(M); return { f: fl, g: gn }; };
var osc = function (type, f, to) { var o = A.createOscillator(); o.type = type; o.frequency.value = f; o.connect(to); o.start(); return o; };
var mf = A.createBiquadFilter(); mf.type = 'lowpass'; mf.frequency.value = 2400; var mg = A.createGain(); mg.gain.value = 0; mf.connect(mg); mg.connect(M);
var ff = A.createBiquadFilter(); ff.type = 'bandpass'; ff.frequency.value = 1600; ff.Q.value = 3; var fg = A.createGain(); fg.gain.value = 0; ff.connect(fg); fg.connect(M);
AUD.car = { mA: osc('sawtooth', 90, mf), mB: osc('sine', 280, mf), mC: osc('triangle', 560, mf), motor: { f: mf, g: mg }, fanO: osc('sawtooth', 200, ff), fanO2: osc('square', 410, ff), fan: { f: ff, g: fg },
fanAir: chain(loop(N.white), 'bandpass', 1500, 0.6), fanLow: chain(loop(N.brown), 'lowpass', 200, 0.6), tyre: chain(loop(N.white), 'bandpass', 650, 0.9), tyreLow: chain(loop(N.brown), 'lowpass', 220, 0.6),
wind: chain(loop(N.white), 'bandpass', 450, 0.6),
scrape: chain(loop(N.white), 'bandpass', 2300, 2.2), scrapeLow: chain(loop(N.brown), 'lowpass', 500, 1.0) };
AUD.car.jets = [];
for (var k = 0; k < 10; k++) {
var kind = k < 4 ? 0 : k < 6 ? 1 : 2, tune = 0.86 + 0.28 * ((k * 7) % 10) / 9;
var pan = A.createStereoPanner ? A.createStereoPanner() : null, out = pan || M; if (pan) pan.connect(M);
var hs = A.createBufferSource(); hs.buffer = N.white; hs.loop = true; hs.start(0, Math.random() * 2.9);
var hf = A.createBiquadFilter(); hf.type = kind === 1 ? 'bandpass' : 'highpass'; hf.frequency.value = (kind === 1 ? 3400 : 1300) * tune; hf.Q.value = kind === 1 ? 0.9 : 0.5;
var hg = A.createGain(); hg.gain.value = 0; hs.connect(hf); hf.connect(hg); hg.connect(out);
var rs = A.createBufferSource(); rs.buffer = N.brown; rs.loop = true; rs.start(0, Math.random() * 2.9);
var rf = A.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = (kind === 2 ? 210 : kind === 1 ? 520 : 290) * tune; rf.Q.value = 0.7;
var rg = A.createGain(); rg.gain.value = 0; rs.connect(rf); rf.connect(rg); rg.connect(out);
AUD.car.jets.push({ kind: kind, tune: tune, pan: pan, hiss: { f: hf, g: hg }, roar: { f: rf, g: rg }, hissG: [0.3, 0.2, 0.28][kind], roarG: [0.42, 0.08, 0.4][kind] });
}
}
function crNear(pos) { if (!pos || CR.cam === 'onboard') return 1; return 1 / Math.pow(1 + camera.position.distanceTo(pos) / 14, 0.9); }
function crSnd(kind, v, pos) {
if (!AUD.ctx || !AUD.nodes || !AUD.on || CAP.offline) return;
var n = crNear(pos);
if (kind === 'beep') { audTone(880, 0.25, 0.25, 0); return; }
if (kind === 'count' || kind === 'go') {
var A9 = AUD.ctx; if (!A9 || !AUD.on) return;
var go = kind === 'go', t9 = A9.currentTime, o9 = A9.createOscillator(), g9 = A9.createGain();
o9.type = 'sine'; o9.frequency.setValueAtTime(go ? 70 : 62, t9); o9.frequency.exponentialRampToValueAtTime(go ? 30 : 38, t9 + (go ? 1.6 : 0.9));
g9.gain.setValueAtTime(0.0001, t9); g9.gain.exponentialRampToValueAtTime(go ? 1.1 : 0.85, t9 + 0.012); g9.gain.exponentialRampToValueAtTime(0.0005, t9 + (go ? 2.2 : 1.1));
o9.connect(g9); g9.connect(AUD.nodes.master); o9.start(t9); o9.stop(t9 + (go ? 2.3 : 1.2));
audBurst({ f: go ? 110 : 140, type: 'lowpass', brown: true, a: 0.004, d: go ? 1.6 : 0.7, g: go ? 1.3 : 0.8 });
audTone(go ? 98 : 123, go ? 1.4 : 0.6, 0.12, 0.01);
return;
}
if (kind === 'pop') { audBurst({ f: (2600 + Math.random() * 1500) * (v || 1), type: 'bandpass', Q: 1.2, a: 0.003, d: 0.09, g: 0.35 * n }); return; }
if (kind === 'touch') {
var k = Math.max(0.65, Math.min(1.6, v / 2.5)), m = Math.max(n, 0.5) * k;
audBurst({ f: 120, type: 'lowpass', brown: true, a: 0.003, d: 0.55 + 0.3 * k, g: 2.2 * m });
audTone(55, 0.45, 0.6 * m);
audBurst({ f: 330, type: 'bandpass', Q: 1.4, a: 0.002, d: 0.22, g: 1.1 * m, at: 0.01 });
audBurst({ f: 1900, type: 'bandpass', Q: 3, a: 0.004, d: 0.16, g: 0.45 * m, at: 0.02 });
audTone(190, 0.22, 0.22 * m, 0.03); audTone(430, 0.14, 0.1 * m, 0.035);
audBurst({ f: 260, type: 'bandpass', Q: 1.2, a: 0.004, d: 0.2, g: 0.45 * m, at: 0.2 });
return;
}
if (kind === 'wheel') { var kw = Math.max(0.5, Math.min(1.4, v / 2.5)), mw = Math.max(n, 0.45) * kw; audBurst({ f: 150, type: 'lowpass', brown: true, a: 0.002, d: 0.3, g: 1.0 * mw }); audBurst({ f: 420, type: 'bandpass', Q: 1.6, a: 0.002, d: 0.12, g: 0.5 * mw }); return; }
if (kind === 'shut') { audBurst({ f: (v || 1) * 1100, type: 'bandpass', Q: 1.5, a: 0.002, d: 0.08, g: 0.18 * n }); return; }
if (kind === 'clatter') { var c = Math.min(1, v / 8); audBurst({ f: 1200 + Math.random() * 2500, type: 'bandpass', Q: 4, a: 0.002, d: 0.06 + 0.1 * Math.random(), g: 0.5 * c * n }); return; }
if (kind === 'crash') {
var s = Math.min(1.6, 0.4 + v / 8);
audBurst({ f: 110, type: 'lowpass', brown: true, a: 0.003, d: 1.4, g: 2.0 * s * n });
audTone(48, 0.6, 0.6 * s * n);
for (var i = 0; i < 9; i++) audBurst({ f: 500 + Math.random() * 2200, type: 'bandpass', Q: 2 + Math.random() * 4, a: 0.002, d: 0.08 + Math.random() * 0.25, g: (0.5 + Math.random() * 0.6) * s * n, at: Math.random() * 0.35 });
for (var j = 0; j < 28; j++) audBurst({ f: 5000 + Math.random() * 6000, type: 'highpass', Q: 0.8, a: 0.001, d: 0.03 + Math.random() * 0.09, g: (0.25 + Math.random() * 0.4) * s * n, at: 0.02 + Math.random() * Math.random() * 1.1 });
audBurst({ f: 3200, type: 'bandpass', Q: 0.7, a: 0.002, d: 0.9, g: 0.5 * s * n, at: 0.01 });
}
}
function crSound(E, r, dt) {
if (!AUD.ctx || !AUD.nodes || CAP.offline) return;
AUD.crAt = performance.now();
var A = AUD.ctx, N = AUD.nodes, I = CR.F, now = A.currentTime; N.master.gain.setTargetAtTime(AUD.on ? 0.9 : 0, now, 0.1);
if (!AUD.car) crAudBuild();
var S = AUD.car; if (!AUD.on) return;
var n = crNear(CR.car.root.position), v = Math.sqrt((r[I.vx] || 0) * (r[I.vx] || 0) + (r[I.vy] || 0) * (r[I.vy] || 0) + (r[I.vz] || 0) * (r[I.vz] || 0));
var drive = Math.abs(r[I.drive] || 0), comp = (r[I.c0] || 0) + (r[I.c1] || 0) + (r[I.c2] || 0) + (r[I.c3] || 0), onWheels = comp > 0.01 && !CRX.on;
var wv = onWheels ? v : 0, mfq = 70 + 34 * wv;
S.mA.frequency.setTargetAtTime(mfq, now, 0.08); S.mB.frequency.setTargetAtTime(mfq * 3.02, now, 0.08); S.mC.frequency.setTargetAtTime(mfq * 6.1, now, 0.08);
audSet(S.motor, (CRX.on ? 0 : (0.012 + 0.045 * Math.min(1, drive * 3)) * Math.min(1, wv / 2 + 0.15 * (drive > 0.02 ? 1 : 0))) * n, 0.1);
audSet(S.tyre, (onWheels ? 0.22 * Math.min(1, wv / 12) : 0) * n); audSet(S.tyreLow, (onWheels ? 0.4 * Math.min(1, wv / 10) : 0) * n);
var fs = I.fspin != null ? (r[I.fspin] || 0) : Math.max(r[I.fan0] || 0, r[I.fan1] || 0);
audSet(S.fan, 0, 0.1); S.fanAir.f.frequency.setTargetAtTime(1100 + 1500 * fs, now, 0.2); S.fanLow.f.frequency.setTargetAtTime(220 + 260 * fs, now, 0.2);
var flut = 1 + 0.12 * Math.sin(now * 2 * Math.PI * 9.5) * fs;
audSet(S.fanAir, 0.95 * fs * flut * n, 0.05); audSet(S.fanLow, 0.4 * fs * n, 0.15);
var NZ = CR.car.nozzles || [], mw_ = CR.car.root.matrixWorld, sn = (CR.snd.n = CR.snd.n || []);
for (var k = 0; k < 10 && k < S.jets.length; k++) {
var J = S.jets[k], x = Math.max(0, Math.min(1, r[I['n' + k]] || 0)), was = sn[k] || 0, nk = n, pk = 0;
if (NZ[k]) { var wp = CRV.copy(NZ[k].at).applyMatrix4(mw_); nk = crNear(wp); if (CR.cam !== 'onboard') { wp.applyMatrix4(camera.matrixWorldInverse); pk = Math.max(-0.85, Math.min(0.85, wp.x / Math.max(1, Math.hypot(wp.x, wp.z)) * 1.6)); } }
if (dt > 0 && x > 0.25 && was < 0.05) crSnd('pop', J.kind === 1 ? 1.3 : 0.85 + 0.1 * k / 10, CR.car.root.position);
if (dt > 0 && x < 0.05 && was > 0.25) crSnd('shut', J.tune, CR.car.root.position);
sn[k] = x;
var lv = x > 0.005 ? Math.sqrt(x) : 0.3 * Math.min(1, ((CR.snd.res || [])[k] || 0) * 1.6);
J.hiss.g.gain.setTargetAtTime(J.hissG * lv * nk, now, 0.012); J.roar.g.gain.setTargetAtTime(J.roarG * x * nk, now, 0.018);
J.hiss.f.frequency.setTargetAtTime((J.kind === 1 ? 3400 : 1300) * J.tune * (0.8 + 0.5 * x), now, 0.03);
if (J.pan) J.pan.pan.setTargetAtTime(pk, now, 0.05);
}
audSet(S.wind, 0.35 * Math.min(1, (v / 18) * (v / 18)) * n, 0.2); S.wind.f.frequency.setTargetAtTime(300 + 40 * v, now, 0.3);
audSet(S.scrape, 0.5 * CRX.scrape * n, 0.06); audSet(S.scrapeLow, 0.8 * CRX.scrape * n, 0.06);
}
setInterval(function () { if (AUD.car && AUD.ctx && performance.now() - (AUD.crAt || 0) > 350) Object.keys(AUD.car).forEach(function (k) { var x = AUD.car[k]; if (x && x.g) x.g.gain.setTargetAtTime(0, AUD.ctx.currentTime, 0.08); if (k === 'jets') x.forEach(function (j) { j.hiss.g.gain.setTargetAtTime(0, AUD.ctx.currentTime, 0.05); j.roar.g.gain.setTargetAtTime(0, AUD.ctx.currentTime, 0.05); }); }); }, 250);
function crShot(name, pos, look, fov, cut) { var s = CR.shot; if (!s || s.name !== name) { CR.shot = { name: name, cut: true }; } CR.shot.pos = pos; CR.shot.look = look; CR.shot.fov = fov; }
function crCamera(E, r, dt) {
var C = CR.car, p = C.root.position, mode_ = CR.cam, I = CR.F, T = CR.track || { R: 10.5, land: [-16, 0] };
if (mode_ === 'free') return;
if (mode_ === 'orbit') { controls.target.lerp(p, 1 - Math.exp(-dt * 6)); controls.update(); return; }
var k = 1 - Math.exp(-dt * 3.0), vel = r ? CRV3.set(r[I.vx], r[I.vz], -r[I.vy]) : new THREE.Vector3(), phase = r && I.phase != null ? r[I.phase] : 0;
if (mode_ === 'onboard') {
var eye = CB(0.15, 0, 0.66).applyMatrix4(C.root.matrixWorld), fwd = CB(1, 0, -0.08).applyQuaternion(C.root.quaternion), up = CB(0, 0, 1).applyQuaternion(C.root.quaternion);
camera.position.copy(eye); camera.up.copy(up); camera.lookAt(eye.clone().add(fwd)); camera.fov = 72; camera.updateProjectionMatrix(); return;
}
if (mode_ === 'chase' && r && (phase >= 1 || r[I.z] > 1.5 || r[I.x] > (T.x0 || 0) - 1)) {
var cx = r[I.x] - 5, cz = Math.max(1.4, Math.min(r[I.z] + 1.0, 22));
crShot('chase-side', CW(cx, -10, cz), p.clone(), 50);
} else if (mode_ === 'chase') {
var h = new THREE.Vector3(vel.x, 0, vel.z); if (h.length() < 1.5) h.copy(CB(1, 0, 0).applyQuaternion(C.root.quaternion)).setY(0); if (h.lengthSq() < 1e-6) h.set(1, 0, 0); h.normalize();
crShot('chase', p.clone().addScaledVector(h, -9).add(new THREE.Vector3(0, 3.2, 0)), p.clone(), 50);
} else if (mode_ === 'side') {
var cam = CW(-12, 48, 4), dist = cam.distanceTo(p); crShot('side', cam, p.clone(), Math.max(10, Math.min(45, 2 * Math.atan(9 / dist) * 180 / Math.PI)));
} else {
if (!E || E.kind === 'idle' || !r) { var a = performance.now() / 9000; crShot('idle', p.clone().add(new THREE.Vector3(Math.cos(a) * 8, 2.2, Math.sin(a) * 8)), p.clone().add(new THREE.Vector3(0, 0.4, 0)), 42); }
else if (E.kind === 'training') { var b = (CR.ct || 0) * 0.15; crShot('train', p.clone().add(new THREE.Vector3(Math.cos(b) * 18, 6, Math.sin(b) * 18 + 4)), p.clone(), 45); }
else {
var x = r[I.x], z = r[I.z], done = E.meta.result && CR.ct >= E.frames[E.frames.length - 1][0] - 2.6;
if (done) { var c2 = (CR.ct || 0) * 0.2; crShot('after', p.clone().add(new THREE.Vector3(Math.cos(c2) * 9, 2.5, Math.sin(c2) * 9)), p.clone().add(new THREE.Vector3(0, 0.3, 0)), 40); }
else if (phase === 0 && x < -12) crShot('runup', CW(Math.min(x + 7, -14), -11, 1.1), p.clone(), 38);
else if (phase <= 1) crShot('loop', CW(-24, 44, 6), CW(2, 0, 10), 42);
else if (phase <= 3) crShot('hold', CW(-9, -6, 1.6), p.clone(), 40);
else if (r[I.z] > 8 && x > (T.x0 || 0) - 9) crShot('over', CW(-14, -9, 1.6), p.clone(), 44);
else if (z > 5) crShot('fall', CW(-26, 11, 3.5), p.clone(), 40);
else crShot('land', CW(Math.min(x, T.land[0]) - 18, -7, 1.8), p.clone(), 34);
}
}
var s = CR.shot; if (!s) return;
if (s.cut) { camera.position.copy(s.pos); CR.look = s.look.clone(); s.cut = false; }
else { camera.position.lerp(s.pos, s.name === 'chase' || s.name === 'chase-side' ? 1 - Math.exp(-dt * 5) : k); CR.look = (CR.look || s.look.clone()).lerp(s.look, 1 - Math.exp(-dt * 6)); }
camera.up.set(0, 1, 0); camera.lookAt(CR.look); camera.fov += (s.fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix();
controls.target.copy(CR.look);
}
function crHud(E, r) {
var I = CR.F;
if (!r) { hudTitle.textContent = 'Ramp stunt'; hudRows.innerHTML = '<span style="opacity:.65">waiting</span><span>for a run</span>'; return; }
var v = Math.sqrt(r[I.vx] * r[I.vx] + r[I.vy] * r[I.vy] + r[I.vz] * r[I.vz]), ph = I.phase != null ? r[I.phase] : 0;
var names = ['Run-up', 'Up the ramp', 'At the top, upside down', 'Letting go', 'Off the end: thrusters'];
var fan = Math.max(r[I.fan0] || 0, r[I.fan1] || 0), nozOn = 0; for (var k = 0; k < 10; k++) if ((r[I['n' + k]] || 0) > 0.05) nozOn++;
var up = 1 - 2 * (r[I.qx] * r[I.qx] + r[I.qy] * r[I.qy]), tilt = Math.acos(Math.max(-1, Math.min(1, up))) * 180 / Math.PI;
var rows = [['phase', E && E.kind === 'idle' ? 'on the start line' : names[ph] || ''], ['speed', Math.round(v * 3.6) + ' km/h'], ['height', Math.max(0, r[I.z] - 0.424).toFixed(1) + ' m'],
['upside down', tilt > 90 ? Math.round(tilt) + '°' : 'no (' + Math.round(tilt) + '°)'], ['g', (r[I.g] || 0).toFixed(1)], ['suction', Math.round(100 * fan) + ' %'], ['air', Math.round(r[I.air] || 0) + ' kg'], ['nozzles', nozOn ? nozOn + ' blowing' : 'closed']];
if (I.las0 != null) rows.push(['laser floor / roof', (r[I.las0] >= 39.9 ? '–' : r[I.las0].toFixed(1)) + ' / ' + (r[I.las1] >= 39.9 ? '–' : r[I.las1].toFixed(1)) + ' m']);
if (ph >= 4 || (E && E.kind === 'training')) {
var fx = 1 - 2 * (r[I.qy] * r[I.qy] + r[I.qz] * r[I.qz]), fy = 2 * (r[I.qx] * r[I.qy] + r[I.qz] * r[I.qw]), hd = Math.atan2(Math.abs(fy), Math.abs(fx)) * 180 / Math.PI;
rows.push(['off the line', Math.abs(r[I.y]).toFixed(1) + ' m · ' + Math.round(hd) + '°']);
}
if (I.hit != null && r[I.hit] > 0.3) rows.push(['impact', Math.round(r[I.hit] * 3.6) + ' km/h']);
hudRows.innerHTML = rows.map(function (x) { return '<span style="opacity:.65">' + x[0] + '</span><span>' + x[1] + '</span>'; }).join('');
hudTitle.textContent = E ? (E.meta.label || (E.kind === 'idle' ? 'Ready' : 'Ramp stunt')) : 'Ramp stunt';
var hudEl = ui.querySelector('.hud'); if (hudEl) crNoz.style.top = (hudEl.offsetTop + hudEl.offsetHeight + 8) + 'px';
var sensOn = CR.lasersOn !== false && !CR_FIXED;
if (hudEl) hudEl.style.visibility = sensOn ? '' : 'hidden'; crNoz.style.visibility = sensOn ? '' : 'hidden';
crAirPanel(r);
}
function crTelSeries(E) {
var F = E.frames, n = F.length, I = CR.F, T = CR.track || {};
if (E._tel && E._tel.n === n) return E._tel;
var S = { n: n, t: new Float32Array(n), v: new Float32Array(n), vz: new Float32Array(n), h: new Float32Array(n), l0: new Float32Array(n), l1: new Float32Array(n),
off: new Float32Array(n), roll: new Float32Array(n), pitch: new Float32Array(n), p: new Float32Array(n), q: new Float32Array(n), r: new Float32Array(n),
g: new Float32Array(n), down: new Float32Array(n), side: new Float32Array(n), fan: new Float32Array(n), air: new Float32Array(n) }, D = 180 / Math.PI, ride = T.ride || 0.5;
for (var i = 0; i < n; i++) {
var f = F[i], qx = f[I.qx], qy = f[I.qy], qz = f[I.qz], qw = f[I.qw];
S.t[i] = f[0]; S.v[i] = 3.6 * Math.hypot(f[I.vx], f[I.vy], f[I.vz]); S.vz[i] = f[I.vz]; S.h[i] = f[I.z] - ride;
S.l0[i] = I.las0 != null && f[I.las0] < 39.9 ? f[I.las0] : NaN; S.l1[i] = I.las1 != null && f[I.las1] < 39.9 ? f[I.las1] : NaN;
S.roll[i] = Math.acos(Math.max(-1, Math.min(1, 1 - 2 * (qx * qx + qy * qy)))) * D;
S.g[i] = f[I.g]; S.down[i] = 25 * ((f[I.n0] || 0) + (f[I.n1] || 0) + (f[I.n2] || 0) + (f[I.n3] || 0)); S.side[i] = 50 * ((f[I.n4] || 0) + (f[I.n5] || 0));
S.fan[i] = 50 * ((f[I.fan0] || 0) + (f[I.fan1] || 0)); S.air[i] = f[I.air];
if (i > 0) {
var p0 = F[i - 1], ax = p0[I.qx], ay = p0[I.qy], az = p0[I.qz], aw = p0[I.qw], dt = Math.max(1e-3, f[0] - p0[0]);
var rx = aw * qx - ax * qw - ay * qz + az * qy, ry = aw * qy + ax * qz - ay * qw - az * qx, rz = aw * qz - ax * qy + ay * qx - az * qw, rw = aw * qw + ax * qx + ay * qy + az * qz, sg = rw < 0 ? -2 : 2;
S.p[i] = sg * rx / dt * D; S.q[i] = sg * ry / dt * D; S.r[i] = sg * rz / dt * D;
}
}
E._tel = S; return S;
}
var CRT_CH = [
{ title: 'Speed', unit: 'km/h', s: [['v', 'speed', '#6ea8ff']] },
{ title: 'Vertical speed', unit: 'm/s', s: [['vz', 'up +', '#7bd88f']], zero: true },
{ title: 'Height (GNSS) · laser rangefinders', unit: 'm', s: [['h', 'height', '#e8ecf2'], ['l0', 'floor laser', '#ff6b5a'], ['l1', 'roof laser', '#ffd166']] },
{ title: 'Off the white line (GNSS)', unit: 'm', s: [['off', 'left +', '#c39bff']], zero: true },
{ title: 'Attitude (IMU)', unit: '°', s: [['roll', 'tilt (180 upside down)', '#6ea8ff'], ['pitch', 'nose up', '#ff9f43']], zero: true },
{ title: 'Turn rates (gyro)', unit: '°/s', s: [['p', 'roll', '#6ea8ff'], ['q', 'pitch', '#ff9f43'], ['r', 'yaw', '#7bd88f']], zero: true, clip: 400 },
{ title: 'Load (accelerometer)', unit: 'g', s: [['g', 'g', '#ffd166']] },
{ title: 'Nozzles · fans · air', unit: '%', s: [['down', 'down nozzles', '#e8ecf2'], ['side', 'flank', '#ff6b5a'], ['fan', 'suction fans', '#6ea8ff']], extra: 'air' }];
function crTel(E) {
var nowMs = performance.now(); if (nowMs - (CR.telAt || 0) < 80) return; CR.telAt = nowMs;
var W = Math.max(200, el.clientWidth), H = Math.max(150, el.clientHeight), pr = Math.min(2, window.devicePixelRatio || 1);
if (crTelC.width !== Math.round(W * pr) || crTelC.height !== Math.round(H * pr)) { crTelC.width = Math.round(W * pr); crTelC.height = Math.round(H * pr); }
var g = crTelC.getContext('2d'), FONT = 'Inter,-apple-system,Segoe UI,sans-serif';
g.setTransform(pr, 0, 0, pr, 0, 0); g.fillStyle = '#0b0f16'; g.fillRect(0, 0, W, H);
var live = E && E.frames && E.frames.length > 1;
if (live) CR.telLast = E; else E = CR.telLast;
if (!E) { g.font = '12px ' + FONT; g.fillStyle = 'rgba(232,236,242,.55)'; g.fillText('Waiting for a run: press Start in the stunt view.', 14, 46); return; }
var S = crTelSeries(E), t0 = S.t[0], t1 = S.t[S.n - 1], ct = !live ? t1 : CR.ct == null ? t0 : CR.ct;
var k = 0, lo = 0, hi = S.n - 1; while (lo <= hi) { var mid = (lo + hi) >> 1; if (S.t[mid] <= ct) { k = mid; lo = mid + 1; } else hi = mid - 1; }
g.font = '600 13px ' + FONT; g.fillStyle = '#e8ecf2'; g.fillText('Telemetry' + (E.meta && E.meta.label ? ' · ' + E.meta.label : E.label ? ' · ' + E.label : ''), 14, 22);
var wait = live && E.ahead && E.startAt != null ? E.startAt - crNow() : 0, hdr = !live ? 'the whole run, ' + (t1 - t0).toFixed(0) + ' s (the next one shows as it starts)' : wait > 0 ? 'starts in ' + Math.ceil(wait) + ' s' : 't = ' + (ct - t0).toFixed(1) + ' s of ' + (t1 - t0).toFixed(0) + ' s';
g.font = '12px ' + FONT; g.fillStyle = 'rgba(232,236,242,.6)'; g.fillText(hdr, W - g.measureText(hdr).width - 14, 22);
var cols = W < 520 ? 1 : W / H > 1.9 ? 4 : 2, rows = Math.ceil(CRT_CH.length / cols), pad = 10, top = 32, cw = (W - pad * (cols + 1)) / cols, chh = (H - top - pad * (rows + 1)) / rows;
CRT_CH.forEach(function (c, ci) {
var cx = pad + (ci % cols) * (cw + pad), cy = top + pad + Math.floor(ci / cols) * (chh + pad), px = cx + 34, pw = cw - 42, py = cy + 30, ph = chh - 38;
var mn = Infinity, mx = -Infinity;
c.s.forEach(function (sr) { var a = S[sr[0]]; for (var i = 0; i < S.n; i++) { var v = a[i]; if (v !== v) continue; if (c.clip) v = Math.max(-c.clip, Math.min(c.clip, v)); if (v < mn) mn = v; if (v > mx) mx = v; } });
if (c.zero) { mn = Math.min(mn, 0); mx = Math.max(mx, 0); }
if (!(mx > mn)) { mx = mn + 1; } var sp = (mx - mn) * 0.08, pos = mn >= 0; mn -= sp; mx += sp; if (pos) mn = Math.max(0, mn);
g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(cx, cy, cw, chh);
g.fillStyle = 'rgba(232,236,242,.9)'; g.font = '600 11px ' + FONT; g.fillText(c.title, cx + 8, cy + 14);
var vals = c.s.map(function (sr) { var v = S[sr[0]][k]; return v === v ? (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1)) : '–'; }).join(' / ') + ' ' + c.unit + (c.extra === 'air' ? ' · air ' + S.air[k].toFixed(0) + ' kg' : '');
g.font = '11px ' + FONT; g.fillStyle = 'rgba(232,236,242,.65)'; g.fillText(vals, cx + cw - g.measureText(vals).width - 8, cy + 14);
var X = function (t) { return px + (t - t0) / Math.max(1e-6, t1 - t0) * pw; }, Y = function (v) { return py + ph - (v - mn) / (mx - mn) * ph; };
g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1; g.beginPath();
for (var q = 0; q <= 4; q++) { var yy = py + ph * q / 4; g.moveTo(px, yy); g.lineTo(px + pw, yy); } g.stroke();
if (mn < 0 && mx > 0) { g.strokeStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.moveTo(px, Y(0)); g.lineTo(px + pw, Y(0)); g.stroke(); }
g.font = '10px ' + FONT; g.fillStyle = 'rgba(232,236,242,.45)'; g.textAlign = 'right';
g.fillText(String(Math.round(mx)), px - 5, py + 8); g.fillText(String(Math.round(mn)), px - 5, py + ph); g.textAlign = 'left';
for (var ts = 0; ts <= t1 - t0; ts += (t1 - t0 > 40 ? 10 : 5)) g.fillText(ts + ' s', X(t0 + ts) - 6, py + ph + 11 > cy + chh ? cy + chh - 1 : py + ph + 11);
c.s.forEach(function (sr) {
var a = S[sr[0]], step = Math.max(1, Math.floor(k / (pw * 1.5))), started = false;
g.strokeStyle = sr[2]; g.lineWidth = 1.5; g.beginPath();
for (var i = 0; i <= k; i += step) { var v = a[i]; if (v !== v) { started = false; continue; } if (c.clip) v = Math.max(-c.clip, Math.min(c.clip, v)); var x = X(S.t[i]), y = Y(v); if (!started) { g.moveTo(x, y); started = true; } else g.lineTo(x, y); }
g.stroke();
});
if (c.s.length > 1) { var lx = cx + 8; g.font = '10px ' + FONT; c.s.forEach(function (sr) { g.fillStyle = sr[2]; g.fillRect(lx, cy + 21, 9, 2); g.fillStyle = 'rgba(232,236,242,.6)'; g.fillText(sr[1], lx + 12, cy + 25); lx += g.measureText(sr[1]).width + 26; }); }
g.strokeStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(X(ct), py); g.lineTo(X(ct), py + ph); g.stroke();
});
}
function crAirPanel(r) {
var I = CR.F, g = crNoz.getContext('2d'), T = CR.track || {}, NP = T.nozzles || [], ND = T.nozzle_dirs || [], CAR = T.car || [4.31, 1.9];
g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, CRN_W, CRN_H);
var cx = 100, cy = 158, sc = 50, L = CAR[0] / 2, Wd = CAR[1] / 2;
var X = function (by) { return cx - by * sc; }, Y = function (bx) { return cy - bx * sc; };
g.font = '600 11px Inter,system-ui,sans-serif'; g.fillStyle = 'rgba(232,236,242,.85)'; g.textAlign = 'left'; g.fillText('Air system', 10, 16);
g.beginPath();
var pts = [[L, 0.55], [L - 0.25, 0.86], [1.2, Wd], [-1.6, Wd], [-L + 0.12, 0.88], [-L, 0.6]];
g.moveTo(X(0), Y(L + 0.02)); pts.forEach(function (p) { g.lineTo(X(p[1]), Y(p[0])); }); g.lineTo(X(0), Y(-L));
pts.slice().reverse().forEach(function (p) { g.lineTo(X(-p[1]), Y(p[0])); }); g.closePath();
g.fillStyle = 'rgba(255,255,255,.10)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,.42)'; g.lineWidth = 1.2; g.stroke();
g.beginPath(); g.ellipse(X(0), Y(0.0), 0.62 * sc, 0.95 * sc, 0, 0, 7); g.strokeStyle = 'rgba(255,255,255,.14)'; g.stroke();
(T.wheels || []).forEach(function (w) { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(X(w[1]) - 6, Y(w[0]) - 15, 12, 30); });
var air = Math.max(0, r[I.air] || 0), frac = Math.max(0, Math.min(1, air / 250));
[[0.45, 'L'], [-0.45, 'R']].forEach(function (tk) {
var x0 = X(tk[0]) - 0.21 * sc, y0 = Y(0.95), w = 0.42 * sc, h = 1.9 * sc;
g.beginPath(); g.roundRect ? g.roundRect(x0, y0, w, h, 9) : g.rect(x0, y0, w, h); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill(); g.strokeStyle = 'rgba(160,200,255,.55)'; g.stroke();
g.save(); g.clip(); var col = frac > 0.3 ? 'rgba(90,170,255,.55)' : frac > 0.12 ? 'rgba(255,190,70,.6)' : 'rgba(255,80,60,.65)';
g.fillStyle = col; g.fillRect(x0, y0 + h * (1 - frac), w, h * frac); g.restore();
g.fillStyle = '#e8ecf2'; g.font = '600 11px Inter,system-ui,sans-serif'; g.textAlign = 'center';
g.fillText(Math.round(frac * 100) + '%', x0 + w / 2, y0 + h / 2 + 4);
g.font = '9px Inter,system-ui,sans-serif'; g.fillStyle = 'rgba(232,236,242,.7)'; g.fillText('tank ' + tk[1], x0 + w / 2, y0 + h + 11);
});
var fs = I.fspin != null ? (r[I.fspin] || 0) : 0;
[[0.95, 0], [-0.85, 0]].forEach(function (fp, k) {
var f = Math.max(0, Math.min(1, r[I['fan' + k]] || 0)), x = X(0), y = Y(fp[0]);
g.beginPath(); g.arc(x, y, 9, 0, 7); g.fillStyle = 'rgba(123,140,255,' + (0.12 + 0.6 * f) + ')'; g.fill(); g.strokeStyle = 'rgba(123,140,255,.7)'; g.stroke();
g.save(); g.translate(x, y); g.rotate((performance.now() / 1000) * 30 * fs); g.strokeStyle = 'rgba(232,236,242,.6)'; for (var b = 0; b < 3; b++) { g.rotate(2.094); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -7); g.stroke(); } g.restore();
if (f > 0.02) { g.fillStyle = 'rgba(200,210,255,.9)'; g.font = '9px Inter,system-ui,sans-serif'; g.textAlign = 'left'; g.fillText('fan ' + Math.round(f * 100) + '%', x + 12, y + 3); }
});
NP.forEach(function (p, k) {
var th = Math.max(0, Math.min(1, r[I['n' + k]] || 0)), d = ND[k] || [0, 0, 1], x = X(p[1]), y = Y(p[0]);
var down = Math.abs(d[2]) > 0.5, bx = -d[0], by = -d[1];
if (th > 0.02) {
if (down) { var gr = g.createRadialGradient(x, y, 0, x, y, 6 + 16 * th); gr.addColorStop(0, 'rgba(225,238,255,.95)'); gr.addColorStop(1, 'rgba(225,238,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 6 + 16 * th, 0, 7); g.fill(); }
else { var ex = x - by * (10 + 26 * th), ey = y - bx * (10 + 26 * th); var gl = g.createLinearGradient(x, y, ex, ey); gl.addColorStop(0, 'rgba(225,238,255,.95)'); gl.addColorStop(1, 'rgba(225,238,255,0)'); g.strokeStyle = gl; g.lineWidth = 3 + 5 * th; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke(); g.lineWidth = 1.2; }
}
g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fillStyle = th > 0.02 ? '#ffffff' : 'rgba(255,255,255,.28)'; g.fill(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1; g.stroke();
if (th > 0.02) {
g.font = '600 9px Inter,system-ui,sans-serif'; g.fillStyle = '#ffffff'; g.textAlign = 'center';
var lx = x + (down ? (p[1] > 0 ? -16 : 16) : -by * 18), ly = y + (down ? (p[0] > 0 ? -10 : 13) : -bx * 18 + (Math.abs(d[0]) > 0.5 ? 0 : -8));
g.fillText(Math.round(th * 100) + '%', lx, ly);
}
});
g.font = '9px Inter,system-ui,sans-serif'; g.fillStyle = 'rgba(232,236,242,.55)'; g.textAlign = 'center'; g.fillText('front', cx, Y(L) - 6);
g.textAlign = 'left'; g.fillText(Math.round(air) + ' kg of air', 10, CRN_H - 10);
}
function carStatus() {
if (CR.cur) return '';
var src = (ctx.sources || []).filter(function (s) { return /stunt|ramp|car/i.test(s.block + ' ' + s.name); })[0];
return src ? 'The stunt appears here when the blueprint runs: ' + src.name + ' streams it.' : '';
}
var clock = new THREE.Clock(), alive = true;
window.__v3dStop = function () {
alive = false;
try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { }
try { if (AUD.ctx) { var ac = AUD.ctx; AUD.ctx = null; ac.close(); } } catch (e) { }
try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) { }
};
window.addEventListener('pagehide', function () { if (window.__v3dStop) window.__v3dStop(); });
renderer.domElement.addEventListener('webglcontextlost', function (e) {
if (!alive) return;
e.preventDefault(); alive = false; FR.lost = true;
var m = document.createElement('div'); m.textContent = 'The graphics card was reset: the 3D view restarts when it is back…';
m.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#0b0e14;color:#9aa3b2;font:13px Inter,system-ui,sans-serif;z-index:50';
el.appendChild(m);
}, false);
renderer.domElement.addEventListener('webglcontextrestored', function () { if (FR.lost) setTimeout(function () { render(ctx); }, 500); }, false);
var FR = { gap: ONB_FIXED || CR_FIXED || VG_FIXED || HM_FIXED ? 1 / 30 : 0, acc: 0, avg: 0, slow: 0, fast: 0, max: renderer.getPixelRatio() };
window.__v3dHM = { HM: HM, setCam: function (c) { hmSetCam(c); }, hold: function (t) { HM.hold = t; HM.shot = null; }, rig: { intruder: hmIntruder, pose: hmRigPose } };
window.__v3dVG = { VG: VG, setCam: function (c) { vgSetCam(c); }, hold: function (t) { VG.hold = t; VG.shot = null; } };
window.__v3dFR = FR; window.__v3dRK = RK; window.__v3dCR = { CR: CR, FX: CRFX, AUD: AUD, cam: camera, ctl: controls, scene: scene, setCam: function (c) { crSetCam(c); }, compose: function () { return capCompose(); } };
function pace(d) {
if (CAP.rec || CAP.offline || d > 0.5) return;
FR.avg = FR.avg ? FR.avg * 0.9 + d * 0.1 : d;
var want = Math.max(FR.gap, 1 / 60), pr = renderer.getPixelRatio();
if (FR.avg > Math.max(want * 1.7, 0.05)) { FR.slow += d; FR.fast = 0; } else if (FR.avg < want * 1.25) { FR.fast += d; FR.slow = 0; } else { FR.slow = FR.fast = 0; }
if (FR.slow > 1.5 && pr > 0.5) { pr = Math.max(0.5, pr - 0.25); FR.slow = 0; FR.avg = 0; FR.downAt = performance.now(); renderer.setPixelRatio(pr); CAP.pr = pr; resize(); }
else if (FR.fast > 6 && pr < FR.max && performance.now() - (FR.downAt || -1e9) > 45000 && FR.avg < want * 1.1) { pr = Math.min(FR.max, pr + 0.25); FR.fast = 0; FR.avg = 0; renderer.setPixelRatio(pr); CAP.pr = pr; resize(); }
}
function resize() {
var w = Math.max(10, el.clientWidth), h = Math.max(10, el.clientHeight);
renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
css2d.setSize(w, h); if (composer) composer.setSize(w, h); if (gtao) gtao.setSize(w, h);
camera.aspect = w / h; camera.updateProjectionMatrix();
}
function tick() {
if (!alive) return;
requestAnimationFrame(tick);
FR.acc += clock.getDelta();
if (FR.acc < FR.gap - 0.004 && !CAP.rec) return;
pace(FR.acc);
var dt = Math.min(0.05, FR.acc); FR.acc = 0; FR.n = (FR.n || 0) + 1;
if (CAP.offline) return;
try {
applyMouse(dt);
if (mode === 'files') softStep(dt);
advance(dt, false);
draw();
} catch (err) {
if (!tickErr || tickErr.message !== err.message) { tickErr = err; console.error(err); ctx.status('The 3D view hit an error: ' + err.message + (err.stack ? ' (' + String(err.stack).split('\n').slice(1, 3).join(' ').replace(/\s+/g, ' ').trim() + ')' : '')); }
}
}
var tickErr = null;
function advance(dt, offline) {
if (mode === 'car') { crStep(offline ? 0 : dt); return; }
if (mode === 'village') { vgStep(offline ? 0 : dt); return; }
if (mode === 'humanoid') { hmStep(offline ? 0 : dt); return; }
if (mode === 'rocket') {
rkStep(offline ? 0 : dt);
if (!flying && controls.enabled && RK.cam !== 'track' && !ONBOARD) controls.update();
return;
}
if (mode === 'fleet') {
if (!offline) fleetStep(dt);
} else if (mode === 'robot' && !offline) {
stepRobot(dt); rfxStep(dt);
} else if (mode === 'live' && !offline) {
stepLive(dt);
if (LIVE.pendingReplay && liveDone()) { LIVE.pendingReplay = false; load(); }
} else if (runs.length) {
if (offline) applyRun(dt);
else {
if (playing) { t += dt * speed; if (t > duration + 1.2) t = 0; }
applyRun(playing ? dt * speed : 0);
}
}
Object.keys(entities).forEach(function (k) { (entities[k].userData.props || []).forEach(function (p) { p.rotation.y += p.userData.dir * dt * 90; }); });
stepWind(dt);
if (follow === 'chase' && entities.drone) {
var d = entities.drone.position, want = d.clone().add(new THREE.Vector3(-2.8, 1.4, 2.8));
camera.position.lerp(want, 0.06); controls.target.lerp(d, 0.12);
} else if (follow === 'frame' && entities.drone && entities.pad && (runs.length || mode === 'live')) {
var dp = entities.drone.position, pp = entities.pad.position, mid = dp.clone().add(pp).multiplyScalar(0.5);
var dist = Math.max(7, dp.distanceTo(pp) * 1.7), dir = camera.position.clone().sub(controls.target);
if (dir.lengthSq() < 1e-6) dir.set(0.6, 0.35, 0.75);
dir.normalize(); if (dir.y < 0.22) { dir.y = 0.22; dir.normalize(); }
controls.target.lerp(mid, 0.08); camera.position.lerp(mid.clone().add(dir.multiplyScalar(dist)), 0.05);
fitShadow(mid, Math.max(6, dist * 0.6));
}
if (!flying) controls.update();
}
function draw() {
if (mode === 'car' && CR_TEL) return;
if (mode === 'humanoid' && HM_TEL) return;
try { if (mode === 'humanoid' && (HM_FIXED || HM.cam) === 'depth') hmDepthRender(); else if (composer) composer.render(); else renderer.render(scene, camera); }
catch (e) {                                                                // a material whose program went stale (its uniforms missing):
if (!/setting 'value'|reading 'value'/.test(String(e && e.message)) || (RENDER_HEAL = (RENDER_HEAL || 0) + 1) > 20) throw e;   // rebuild every material once and go on
scene.traverse(function (o) { (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(function (m) { m.needsUpdate = true; }); });
if (renderer.info && renderer.info.programs) { try { renderer.renderLists.dispose(); } catch (e2) { } }
console.warn('[view] a material was rebuilt after: ' + e.message);
}
css2d.render(scene, camera);
if (CAP.rec || CAP.offline || CAP.pic) capCompose();
}
var saveAt = 0;
function keepView(now) {
if (!ctx.saveState) return;
if (!now && performance.now() - saveAt < 1000) return;
saveAt = performance.now();
ctx.saveState({ cam: { p: camera.position.toArray(), t: controls.target.toArray(), q: camera.quaternion.toArray(), flying: flying }, speed: speed, model: FILES.sel, partsMin: PARTS.min,
fleet: { routes: FLEET.routes, heat: FLEET.heat, cine: FLEET.cine, labels: FLEET.labels }, rkcam: RK.cam, crcam: CR.cam, vgcam: VG.cam, hmcam: HM.camPicked || 'director', sound: AUD.on, voice: AUD.voice, voiceName: AUD.voiceName || null });
}
controls.addEventListener('end', function () { keepView(true); });
$('.fit').addEventListener('click', function () { setTimeout(function () { keepView(true); }, 50); });
spSel.addEventListener('change', function () { keepView(true); });
var was = ctx.state || {};
if (was.cam && Array.isArray(was.cam.p) && Array.isArray(was.cam.t)) {
camera.position.fromArray(was.cam.p); controls.target.fromArray(was.cam.t);
if (was.cam.flying && Array.isArray(was.cam.q)) { camera.quaternion.fromArray(was.cam.q); flying = true; controls.enableDamping = false; }
camera.updateMatrixWorld(); flown = true;
}
if (+was.speed > 0) { speed = +was.speed; spSel.value = String(speed); }
if (was.voiceName) { AUD.voiceName = was.voiceName; AUD.voiceObj = undefined; if (typeof fillVoices === 'function') fillVoices(); }
if (was.sound === false) AUD.on = false; if (was.voice === false) AUD.voice = false; if (RK.btn_on) { RK.btn_on(); RK.btn_voice(); }
if (was.fleet) { FLEET.routes = was.fleet.routes !== false; FLEET.heat = !!was.fleet.heat; FLEET.cine = !!was.fleet.cine; FLEET.labels = !!was.fleet.labels; fleetMarks(); }
ctx.on('resize', resize);
ctx.on('update', load);
resize();
load();
tick();
}
var EARTH_JPG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkqPtfDwAEswH/kRBHVwAAAABJRU5ErkJggg==';