(function () {
  const cv = document.getElementById('map'), ctx = cv.getContext('2d');
  const R = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const scene = {
    lines: [
      { t: 'road', pts: [[0, 300], [250, 290], [500, 320], [750, 300], [1000, 310]] },
      { t: 'road', pts: [[300, 0], [310, 200], [290, 400], [320, 600]] },
      { t: 'road', pts: [[500, 320], [600, 450], [700, 600]] },
      { t: 'road', pts: [[100, 600], [150, 450], [250, 290]] },
      { t: 'river', pts: [[0, 100], [200, 150], [350, 120], [500, 180], [650, 150], [800, 220], [1000, 200]] },
      { t: 'boundary', pts: [[40, 40], [960, 40], [960, 560], [40, 560], [40, 40]] },
      { t: 'boundary', pts: [[600, 40], [620, 200], [580, 400], [600, 560]] }
    ],
    polys: [
      ...[[340, 320, 50, 40], [400, 330, 60, 35], [350, 230, 45, 40], [100, 320, 60, 50], [190, 330, 45, 45], [650, 320, 70, 50],
        [740, 330, 50, 45], [800, 380, 60, 60], [680, 400, 50, 40], [380, 420, 60, 50], [120, 200, 50, 40], [880, 300, 50, 60]]
        .map(b => ({ t: 'building', pts: R(...b) })),
      { t: 'lake', pts: [[120, 470], [200, 455], [240, 500], [190, 540], [110, 525]] },
      { t: 'park', pts: R(640, 60, 140, 70) }
    ],
    points: [{ n: 'Hospital', p: [420, 250] }, { n: 'Station', p: [700, 360] }, { n: 'School', p: [180, 400] }, { n: 'Market', p: [860, 120] }]
  };
  const STY = { road: { c: '#8a6d3b', w: 3 }, river: { c: '#3b82c4', w: 6 }, boundary: { c: '#555', w: 2 },
    building: { f: '#d8c3a5', c: '#7a6a55' }, lake: { f: '#bcd9ee', c: '#3b82c4' }, park: { f: '#cfe5c4', c: '#5a8f4a' } };
  let zoom = 0.9, px = 20, py = 10;
  const W = { xmin: 250, ymin: 150, xmax: 650, ymax: 420 };
  let process = false, seq = 0, drag = null;
  const $ = id => document.getElementById(id);

  function path(pts, close) {
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    if (close) ctx.closePath();
  }
  function seg(a) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[2], a[3]); ctx.stroke(); }

  async function redraw() {
    const id = ++seq, T = p => [p[0] * zoom + px, p[1] * zoom + py];
    const body = { window: W, lines: scene.lines.map(l => ({ pts: l.pts.map(T) })),
      polys: scene.polys.map(p => ({ pts: p.pts.map(T) })), points: scene.points.map(p => T(p.p)) };
    let r;
    try {
      const res = await fetch('/api/clip-scene', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      r = await res.json();
      if (r.error) throw new Error(r.error);
    } catch (e) { $('iBef').textContent = 'Server error: ' + e.message; return; }
    if (id !== seq) return;
    draw(body, r);
    $('iWin').textContent = `(${W.xmin | 0}, ${W.ymin | 0}) to (${W.xmax | 0}, ${W.ymax | 0}) = ${(W.xmax - W.xmin) | 0}x${(W.ymax - W.ymin) | 0}`;
    $('iBef').textContent = r.before; $('iAft').textContent = r.after;
    $('iZoom').textContent = Math.round(zoom * 100) + '%';
  }

  function draw(b, r) {
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if ($('ghost').checked || process) {  // BEFORE clipping: everything
      ctx.save(); ctx.strokeStyle = process ? '#c0392b' : '#bbb'; ctx.fillStyle = '#bbb';
      ctx.lineWidth = 1; ctx.setLineDash([5, 4]); ctx.globalAlpha = process ? 0.6 : 1;
      b.lines.forEach(l => { path(l.pts); ctx.stroke(); });
      b.polys.forEach(p => { path(p.pts, true); ctx.stroke(); });
      ctx.setLineDash([]);
      b.points.forEach(p => { ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, 7); ctx.fill(); });
      ctx.restore();
    }
    // AFTER clipping: results returned by Python
    r.polys.forEach((p, i) => {
      if (!p.clipped.length) return;
      const s = STY[scene.polys[i].t];
      path(p.clipped, true);
      ctx.fillStyle = process ? 'rgba(46,125,50,.35)' : s.f; ctx.fill();
      ctx.strokeStyle = process ? '#2e7d32' : s.c; ctx.lineWidth = 1.5; ctx.stroke();
    });
    r.lines.forEach((l, i) => {
      const t = scene.lines[i].t, s = STY[t];
      l.segments.forEach(sg => {
        if (!sg.clipped) return;
        ctx.strokeStyle = process ? '#2e7d32' : s.c;
        ctx.lineWidth = process ? 3 : s.w * Math.max(zoom, .5);
        ctx.setLineDash(t === 'boundary' && !process ? [8, 5] : []);
        seg(sg.clipped);
      });
      ctx.setLineDash([]);
    });
    ctx.font = '12px Segoe UI, Arial'; ctx.textAlign = 'left';
    r.points.forEach((v, i) => {
      if (!v) return; const p = b.points[i];
      ctx.fillStyle = process ? '#2e7d32' : '#b3261e';
      ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, 7); ctx.fill();
      ctx.fillStyle = '#222'; ctx.fillText(scene.points[i].n, p[0] + 8, p[1] + 4);
    });
    if (process) {  // region codes + intersection points for partially visible segments
      r.lines.forEach(l => l.segments.forEach(sg => {
        if (sg.status !== 'partial') return;
        const o = sg.orig, c = sg.clipped;
        [[0, 1, 0], [2, 3, 1]].forEach(([ix, iy, n]) => {
          if (Math.abs(o[ix] - c[ix]) > .01 || Math.abs(o[iy] - c[iy]) > .01) {
            ctx.fillStyle = '#c0392b'; ctx.fillText(sg.codes[n], o[ix] + 4, o[iy] - 4);
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(c[ix], c[iy], 4, 0, 7); ctx.fill();
          }
        });
      }));
    }
    ctx.strokeStyle = '#1f4e8c'; ctx.lineWidth = 2.5;
    ctx.strokeRect(W.xmin, W.ymin, W.xmax - W.xmin, W.ymax - W.ymin);
    ctx.fillStyle = '#1f4e8c'; ctx.fillRect(W.xmax - 7, W.ymax - 7, 14, 14);
    ctx.fillText('Clipping Window', W.xmin + 4, W.ymin - 6);
  }

  const pos = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * cv.width / b.width, (e.clientY - b.top) * cv.height / b.height]; };
  cv.addEventListener('mousedown', e => {
    const [x, y] = pos(e);
    let m = 'p';
    if (Math.abs(x - W.xmax) < 14 && Math.abs(y - W.ymax) < 14) m = 'r';
    else if (x > W.xmin && x < W.xmax && y > W.ymin && y < W.ymax) m = 'm';
    drag = { m, x, y };
  });
  window.addEventListener('mousemove', e => {
    if (!drag) return;
    const [x, y] = pos(e), dx = x - drag.x, dy = y - drag.y; drag.x = x; drag.y = y;
    if (drag.m === 'm') { W.xmin += dx; W.xmax += dx; W.ymin += dy; W.ymax += dy; }
    else if (drag.m === 'r') { W.xmax = Math.max(W.xmin + 40, W.xmax + dx); W.ymax = Math.max(W.ymin + 40, W.ymax + dy); }
    else { px += dx; py += dy; }
    redraw();
  });
  window.addEventListener('mouseup', () => drag = null);
  function zoomAt(f, x, y) {
    const z = Math.min(4, Math.max(.3, zoom * f)), k = z / zoom;
    px = x - (x - px) * k; py = y - (y - py) * k; zoom = z; redraw();
  }
  cv.addEventListener('wheel', e => { e.preventDefault(); const [x, y] = pos(e); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, x, y); }, { passive: false });
  $('zin').onclick = () => zoomAt(1.2, cv.width / 2, cv.height / 2);
  $('zout').onclick = () => zoomAt(1 / 1.2, cv.width / 2, cv.height / 2);
  $('reset').onclick = () => { zoom = 0.9; px = 20; py = 10; Object.assign(W, { xmin: 250, ymin: 150, xmax: 650, ymax: 420 }); redraw(); };
  $('proc').onclick = function () { process = !process; this.classList.toggle('on', process); this.textContent = process ? 'Hide Clipping Process' : 'Show Clipping Process'; redraw(); };
  $('ghost').onchange = redraw;
  redraw();
})();
