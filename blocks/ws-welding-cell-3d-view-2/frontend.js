// ── EsaSim block ──────────────────────────────────────────────────────
// Welding cell 3D view (ws-welding-cell-3d-view-2) · version 2 · view, JavaScript: function render(ctx)
// The 3D view with the welding cell's hall, polished floor, cube-mapped car, glossy paint and welding sparks, smoke and arc light.
// Workspace: Gianluca De Novi's workspace · Author: Gianluca De Novi
// Saved: 2026-11-15
//
// Inputs   ctx.input("id") gives { files, stream }; ctx.rows("id"), ctx.json("id"), ctx.text("id")
//   scene       Anything (json, gz, glb, gltf, obj, stl, ply) Scene or 3D files · several · A scene (esasim.scene/1 JSON), 3D models, a robot model (.robot.json.gz) and/or live telemetry
// Settings ctx.params.key
//   (none)
// EsaSim rewrites these lines from the block's definition each time it is saved: change the definition, not them.
// ── end of EsaSim block header ────────────────────────────────────────

/* Welding cell 3D view: the project's 3D view with the robot-cell additions (warehouse hall with walls, roof and LED
 * lamps, polished reflective floor, cube-mapped car, clear-coat paint, welding arc light, sparks and smoke).
 *
 * The full view is too large for a block (2.2 MB, blocks take 300 KB), so it lives in the project's assets as
 * views/robot_cell_viewer.js (the built-in 3D view 1.47 with the patch in viewer_patch/, comments stripped). This block
 * reads that file once, compiles it and hands it ctx; everything else (inputs, settings, channels) is the 3D view's own.
 * To change the view: edit the asset, not this block. */
function render(ctx) {
  var NAME = 'robot_cell_viewer.js';
  var W = window;
  function run(fn) {
    try { fn(ctx); } catch (e) { ctx.status('The welding cell view failed: ' + (e && e.message || e)); throw e; }
  }
  if (W.__robotCellRender) return run(W.__robotCellRender);
  var a = ctx.assets && ctx.assets.find ? ctx.assets.find([NAME, 'views/' + NAME]) : null;
  if (!a) { ctx.status('The project asset views/' + NAME + ' is missing (Data > Assets).'); return; }
  ctx.status('Loading the welding cell view…');
  ctx.assets.buffer(a).then(function (buf) {
    var src = new TextDecoder('utf-8').decode(buf);
    var fn = null;
    try { fn = new Function(src + '\n;return render;')(); } catch (e) { fn = null; }
    if (fn) { W.__robotCellRender = fn; ctx.status(''); return run(fn); }
    // no eval in this frame: load it as a script
    var url = URL.createObjectURL(new Blob([src + '\n;window.__robotCellRender = render;'], { type: 'text/javascript' }));
    var s = document.createElement('script'); s.src = url;
    s.onload = function () { URL.revokeObjectURL(url); ctx.status(''); if (W.__robotCellRender) run(W.__robotCellRender); };
    s.onerror = function () { ctx.status('The welding cell view could not be loaded.'); };
    document.head.appendChild(s);
  }, function (e) { ctx.status('The project asset views/' + NAME + ' could not be read (' + (e && e.message || e) + ').'); });
}
