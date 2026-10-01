/* Shared clipping helpers (JS versions used for real-time dragging) + Algorithm Lab */
const LEFT = 1, RIGHT = 2, BOTTOM = 4, TOP = 8;
function outcode(x, y, w) {            // w = [xmin, ymin, xmax, ymax], y grows downward
  let c = 0;
  if (x < w[0]) c |= LEFT; else if (x > w[2]) c |= RIGHT;
  if (y < w[1]) c |= TOP; else if (y > w[3]) c |= BOTTOM;
  return c;
}
function shClip(poly, w) {             // Sutherland-Hodgman against a rectangle
  const [x0, y0, x1, y1] = w;
  const edges = [
    [p => p[0] >= x0, (a, b) => [x0, a[1] + (b[1] - a[1]) * (x0 - a[0]) / (b[0] - a[0])]],
    [p => p[0] <= x1, (a, b) => [x1, a[1] + (b[1] - a[1]) * (x1 - a[0]) / (b[0] - a[0])]],
    [p => p[1] >= y0, (a, b) => [a[0] + (b[0] - a[0]) * (y0 - a[1]) / (b[1] - a[1]), y0]],
    [p => p[1] <= y1, (a, b) => [a[0] + (b[0] - a[0]) * (y1 - a[1]) / (b[1] - a[1]), y1]]];
  let out = poly;
  for (const [inside, inter] of edges) {
    const inp = out; out = [];
    if (!inp.length) break;
    let s = inp[inp.length - 1];
    for (const e of inp) {
      if (inside(e)) { if (!inside(s)) out.push(inter(s, e)); out.push(e); }
      else if (inside(s)) out.push(inter(s, e));
      s = e;
    }
  }
  return out;
}

/* ---- Algorithm Labs (About page): call Flask /api/clip-line and /api/clip-polygon ---- */
const LABEL = { inside: 'Completely inside', outside: 'Completely outside', partial: 'Partially clipped' };
function labBase(ctx, win) {
  ctx.clearRect(0, 0, 500, 380);
  ctx.strokeStyle = '#e3e6ea'; ctx.lineWidth = 1; ctx.fillStyle = '#888'; ctx.font = '10px Arial';
  for (let i = 0; i <= 500; i += 50) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 380); ctx.stroke(); ctx.fillText(i, i + 2, 10);
    if (i <= 350) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(500, i); ctx.stroke(); ctx.fillText(i, 2, i - 2); }
  }
  ctx.fillStyle = 'rgba(31,78,140,.08)'; ctx.fillRect(win[0], win[1], win[2] - win[0], win[3] - win[1]);
  ctx.strokeStyle = '#1f4e8c'; ctx.lineWidth = 2; ctx.strokeRect(win[0], win[1], win[2] - win[0], win[3] - win[1]);
}
const postJSON = async (url, body) => {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const r = await res.json();
  if (!res.ok) throw new Error(r.error || 'Server error');
  return r;
};
const err = m => `<span class="badge outside">Error</span> ${m}`;

function lineLab() {
  const btn = document.getElementById('labGo');
  if (!btn) return;
  const ctx = document.getElementById('labCanvas').getContext('2d');
  const ids = ['x1', 'y1', 'x2', 'y2', 'xmin', 'ymin', 'xmax', 'ymax'], out = document.getElementById('labResult');
  async function run() {
    const v = {}; ids.forEach(i => v[i] = parseFloat(document.getElementById(i).value));
    if (ids.some(i => isNaN(v[i]))) { out.innerHTML = err('Enter numbers in all fields.'); return; }
    labBase(ctx, [v.xmin, v.ymin, v.xmax, v.ymax]);
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(v.x1, v.y1); ctx.lineTo(v.x2, v.y2); ctx.stroke(); ctx.setLineDash([]);
    let r;
    try { r = await postJSON('/api/clip-line', { window: { xmin: v.xmin, ymin: v.ymin, xmax: v.xmax, ymax: v.ymax }, line: { x1: v.x1, y1: v.y1, x2: v.x2, y2: v.y2 } }); }
    catch (e) { out.innerHTML = err(e.message); return; }
    if (r.clipped) {
      const c = r.clipped;
      ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[2], c[3]); ctx.stroke();
      ctx.fillStyle = '#000'; [[c[0], c[1]], [c[2], c[3]]].forEach(p => { ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, 7); ctx.fill(); });
    }
    ctx.fillStyle = '#c0392b'; ctx.font = '12px Arial';
    ctx.fillText(r.codes[0], v.x1 + 6, v.y1 - 6); ctx.fillText(r.codes[1], v.x2 + 6, v.y2 - 6);
    out.innerHTML = `<p><span class="badge ${r.status}">${LABEL[r.status]}</span></p>
      <p>Original: (${v.x1}, ${v.y1}) &ndash; (${v.x2}, ${v.y2})<br>Region codes: P1 = ${r.codes[0]}, P2 = ${r.codes[1]}<br>
      Visible portion: ${r.clipped ? `(${r.clipped[0].toFixed(2)}, ${r.clipped[1].toFixed(2)}) &ndash; (${r.clipped[2].toFixed(2)}, ${r.clipped[3].toFixed(2)})` : 'none'}</p>
      <ol>${r.steps.map(s => `<li>${s}</li>`).join('')}</ol>`;
  }
  btn.onclick = run; run();
}

function polygonLab() {
  const btn = document.getElementById('polyGo');
  if (!btn) return;
  const ctx = document.getElementById('polyCanvas').getContext('2d'), out = document.getElementById('polyResult'), sel = document.getElementById('polyStage');
  const wid = ['pxmin', 'pymin', 'pxmax', 'pymax'];
  let last = null, orig = null, win = null;
  const path = pts => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
  function parse() {
    const pts = document.getElementById('polyPts').value.split('\n').map(l => l.trim()).filter(Boolean).map(l => l.split(/[\s,;]+/).map(Number));
    if (pts.some(p => p.length !== 2 || p.some(isNaN))) throw new Error('Each line must contain exactly: x, y');
    if (pts.length < 3) throw new Error('Enter at least 3 vertices.');
    return pts;
  }
  function render() {
    labBase(ctx, win);
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); path(orig); ctx.stroke(); ctx.setLineDash([]);
    const pts = sel.value === 'final' ? last.clipped : last.stages[+sel.value].points;
    if (pts.length >= 3) {
      path(pts); ctx.fillStyle = 'rgba(46,125,50,.3)'; ctx.fill(); ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#000'; pts.forEach(p => { ctx.beginPath(); ctx.arc(p[0], p[1], 3.5, 0, 7); ctx.fill(); });
    }
  }
  async function run() {
    let pts;
    try { pts = parse(); } catch (e) { out.innerHTML = err(e.message); return; }
    const v = wid.map(i => parseFloat(document.getElementById(i).value));
    if (v.some(isNaN)) { out.innerHTML = err('Enter numbers in all window fields.'); return; }
    let r;
    try { r = await postJSON('/api/clip-polygon', { window: { xmin: v[0], ymin: v[1], xmax: v[2], ymax: v[3] }, polygon: pts }); }
    catch (e) { out.innerHTML = err(e.message); return; }
    last = r; orig = pts; win = v; sel.value = 'final'; render();
    out.innerHTML = `<p><span class="badge ${r.status}">${LABEL[r.status]}</span></p>
      <p>Vertices: ${r.original_count} original &rarr; ${r.clipped.length} after clipping</p>
      <ol>${r.stages.map(s => `<li>After <b>${s.edge}</b> edge: ${s.points.length} vertices</li>`).join('')}</ol>
      <p>Clipped vertices: ${r.clipped.length ? r.clipped.map(p => `(${p[0].toFixed(1)}, ${p[1].toFixed(1)})`).join(' ') : 'none'}</p>`;
  }
  sel.onchange = () => last && render();
  btn.onclick = run; run();
}
document.addEventListener('DOMContentLoaded', () => { lineLab(); polygonLab(); });
