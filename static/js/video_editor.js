(function () {
  const cv = document.getElementById('vid'), ctx = cv.getContext('2d'), $ = id => document.getElementById(id);
  const FR = { xmin: 100, ymin: 25, xmax: 800, ymax: 419 };
  const FW = [FR.xmin, FR.ymin, FR.xmax, FR.ymax];
  $('iFrame').textContent = `${FR.xmax - FR.xmin} x ${FR.ymax - FR.ymin}`;
  let objs = [], sel = null, drag = null, moveOn = true, nid = 1;
  const colors = ['#e57373', '#64b5f6', '#81c784', '#ffb74d', '#ba68c8'];

  const mk = (kind, x, y, w, h, extra) => ({ id: nid++, kind, x, y, w, h, color: colors[nid % colors.length], ...extra });
  function addText(t, x, y) {
    const o = mk('text', x, y, 0, 44, { text: t });
    ctx.font = `bold ${o.h}px Segoe UI, Arial`; o.w = ctx.measureText(t).width; objs.push(o);
  }
  function load() {
    objs = []; nid = 1; sel = null;
    objs.push(mk('rect', 60, 120, 220, 130));
    objs.push(mk('circle', 700, 250, 140, 140));
    addText('Video Title', 380, 340);
    objs.push(mk('image', 420, 60, 200, 140));
    redraw();
  }
  const bbox = o => [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]];
  function parts(o) {
    if (o.kind === 'rect') return [{ pts: bbox(o), fill: o.color }];
    if (o.kind === 'circle') {
      const r = o.w / 2, pts = [];
      for (let i = 0; i < 64; i++) { const a = i / 64 * 2 * Math.PI; pts.push([o.x + r + r * Math.cos(a), o.y + r + r * Math.sin(a)]); }
      return [{ pts, fill: o.color }];
    }
    return [  // image-like shape: sky, two mountains, sun
      { pts: bbox(o), fill: '#9fd0f0' },
      { pts: [[o.x, o.y + o.h], [o.x + o.w * .35, o.y + o.h * .3], [o.x + o.w * .7, o.y + o.h]], fill: '#4f7f4f' },
      { pts: [[o.x + o.w * .45, o.y + o.h], [o.x + o.w * .75, o.y + o.h * .45], [o.x + o.w, o.y + o.h]], fill: '#6b9a6b' },
      { pts: [[o.x + o.w * .8, o.y + o.h * .1], [o.x + o.w * .9, o.y + o.h * .1], [o.x + o.w * .9, o.y + o.h * .25], [o.x + o.w * .8, o.y + o.h * .25]], fill: '#f5d442' }];
  }
  function poly(p) { ctx.beginPath(); p.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); }
  function fillText(o, color) { ctx.font = `bold ${o.h}px Segoe UI, Arial`; ctx.textBaseline = 'top'; ctx.fillStyle = color; ctx.fillText(o.text, o.x, o.y); ctx.textBaseline = 'alphabetic'; }
  function drawObj(o, clipped) {
    if (o.kind === 'text') {
      const c = clipped ? shClip(bbox(o), FW) : bbox(o);
      if (c.length < 3) return;
      ctx.save(); poly(c); ctx.clip(); fillText(o, '#333'); ctx.restore(); return;
    }
    parts(o).forEach(p => { const c = clipped ? shClip(p.pts, FW) : p.pts; if (c.length < 3) return; poly(c); ctx.fillStyle = p.fill; ctx.fill(); });
  }
  function status(o) {
    if (shClip(bbox(o), FW).length < 3) return 'Completely outside (fully clipped)';
    return bbox(o).every(p => outcode(p[0], p[1], FW) === 0) ? 'Completely inside (not clipped)' : 'Partially clipped';
  }
  function redraw() {
    ctx.fillStyle = '#2b2f36'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.save(); ctx.globalAlpha = .3;                      // original objects (before clipping)
    objs.forEach(o => drawObj(o, false));
    ctx.restore();
    ctx.fillStyle = '#e8ecf0'; ctx.fillRect(FR.xmin, FR.ymin, FR.xmax - FR.xmin, FR.ymax - FR.ymin);
    objs.forEach(o => drawObj(o, true));                   // after clipping
    ctx.strokeStyle = '#ffeb3b'; ctx.lineWidth = 2; ctx.strokeRect(FR.xmin, FR.ymin, FR.xmax - FR.xmin, FR.ymax - FR.ymin);
    ctx.fillStyle = '#ffeb3b'; ctx.font = '12px Segoe UI'; ctx.fillText('Video Frame (clipping window)', FR.xmin + 4, FR.ymin - 6);
    const s = objs.find(o => o.id === sel);
    if (s) { ctx.setLineDash([5, 4]); ctx.strokeStyle = '#1f4e8c'; ctx.lineWidth = 1.5; ctx.strokeRect(s.x, s.y, s.w, s.h); ctx.setLineDash([]); }
    $('iCount').textContent = objs.length;
    $('iSel').textContent = s ? s.kind : 'none';
    $('iStat').textContent = s ? status(s) : '-';
  }
  const pos = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * cv.width / b.width, (e.clientY - b.top) * cv.height / b.height]; };
  cv.addEventListener('mousedown', e => {
    const [x, y] = pos(e); sel = null;
    for (let i = objs.length - 1; i >= 0; i--) {
      const o = objs[i];
      if (x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) { sel = o.id; if (moveOn) drag = { o, dx: x - o.x, dy: y - o.y }; objs.push(objs.splice(i, 1)[0]); break; }
    }
    redraw();
  });
  window.addEventListener('mousemove', e => { if (!drag) return; const [x, y] = pos(e); drag.o.x = x - drag.dx; drag.o.y = y - drag.dy; redraw(); });
  window.addEventListener('mouseup', () => drag = null);
  const rnd = (a, b) => a + Math.random() * (b - a);
  $('addRect').onclick = () => { objs.push(mk('rect', rnd(150, 500), rnd(80, 300), rnd(100, 200), rnd(60, 130))); redraw(); };
  $('addCircle').onclick = () => { const d = rnd(70, 140); objs.push(mk('circle', rnd(150, 500), rnd(80, 280), d, d)); redraw(); };
  $('addImg').onclick = () => { objs.push(mk('image', rnd(150, 500), rnd(80, 250), 180, 120)); redraw(); };
  $('addText').onclick = () => { const t = prompt('Enter text:', 'Sample Text'); if (t && t.trim()) { addText(t.trim(), rnd(150, 400), rnd(100, 330)); redraw(); } };
  $('clear').onclick = () => { objs = []; sel = null; redraw(); };
  $('reset').onclick = load;
  $('move').onclick = function () { moveOn = !moveOn; this.classList.toggle('on', moveOn); this.textContent = 'Move Object: ' + (moveOn ? 'ON' : 'OFF'); };
  load();
})();
