(function () {
  const cv = document.getElementById('viewer'), ctx = cv.getContext('2d'), $ = id => document.getElementById(id);
  const V = { x: 90, y: 60, w: 640, h: 400 }, VW = [V.x, V.y, V.x + V.w, V.y + V.h];
  let img, iw, ih, s = 1, ox = 0, oy = 0, drag = null;

  function sample() {
    const c = document.createElement('canvas'); c.width = 1200; c.height = 800;
    const g = c.getContext('2d'), sky = g.createLinearGradient(0, 0, 0, 800);
    sky.addColorStop(0, '#7ec8f0'); sky.addColorStop(1, '#e6f4fb');
    g.fillStyle = sky; g.fillRect(0, 0, 1200, 800);
    g.fillStyle = '#f5d442'; g.beginPath(); g.arc(950, 150, 70, 0, 7); g.fill();
    g.fillStyle = '#6b8f71'; g.beginPath(); g.moveTo(0, 650); g.lineTo(300, 250); g.lineTo(600, 650); g.fill();
    g.fillStyle = '#4f7f4f'; g.beginPath(); g.moveTo(400, 650); g.lineTo(780, 200); g.lineTo(1200, 650); g.fill();
    g.fillStyle = '#7bb26b'; g.fillRect(0, 600, 1200, 200);
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.fillStyle = '#222'; g.font = '16px Arial';
    for (let x = 0; x <= 1200; x += 100) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 800); g.stroke(); g.fillText(x, x + 3, 16); }
    for (let y = 100; y <= 800; y += 100) { g.beginPath(); g.moveTo(0, y); g.lineTo(1200, y); g.stroke(); g.fillText(y, 3, y - 3); }
    g.font = 'bold 40px Arial'; g.fillText('Sample Image 1200 x 800', 330, 400);
    setImage(c, c.width, c.height);
  }
  function setImage(i, w, h) { img = i; iw = w; ih = h; s = 1; center(); }
  function center() { ox = V.x + (V.w - iw * s) / 2; oy = V.y + (V.h - ih * s) / 2; redraw(); }

  function redraw() {
    ctx.fillStyle = '#eceff3'; ctx.fillRect(0, 0, cv.width, cv.height);
    if ($('ghost').checked) { ctx.save(); ctx.globalAlpha = .25; ctx.drawImage(img, ox, oy, iw * s, ih * s); ctx.restore(); }
    ctx.fillStyle = '#fff'; ctx.fillRect(V.x, V.y, V.w, V.h);
    // clip the image rectangle against the viewing window
    const c = shClip([[ox, oy], [ox + iw * s, oy], [ox + iw * s, oy + ih * s], [ox, oy + ih * s]], VW);
    let vis = 'none (completely outside)';
    if (c.length >= 3) {
      const xs = c.map(p => p[0]), ys = c.map(p => p[1]);
      const dx = Math.min(...xs), dy = Math.min(...ys), dw = Math.max(...xs) - dx, dh = Math.max(...ys) - dy;
      ctx.drawImage(img, (dx - ox) / s, (dy - oy) / s, dw / s, dh / s, dx, dy, dw, dh);
      vis = `${Math.round(dw / s)} x ${Math.round(dh / s)} px of image`;
    }
    ctx.strokeStyle = '#1f4e8c'; ctx.lineWidth = 3; ctx.strokeRect(V.x, V.y, V.w, V.h);
    ctx.fillStyle = '#1f4e8c'; ctx.font = '13px Segoe UI'; ctx.fillText('Viewing Window (clipping window)', V.x, V.y - 8);
    $('iImg').textContent = `${iw} x ${ih} px`; $('iView').textContent = `${V.w} x ${V.h} px`;
    $('iZoom').textContent = Math.round(s * 100) + '%';
    $('iPos').textContent = `x = ${Math.round(ox - V.x)}, y = ${Math.round(oy - V.y)}`;
    $('iVis').textContent = vis;
  }
  function zoom(f) {
    const ns = Math.min(8, Math.max(.05, s * f)), k = ns / s, cx = V.x + V.w / 2, cy = V.y + V.h / 2;
    ox = cx - (cx - ox) * k; oy = cy - (cy - oy) * k; s = ns; redraw();
  }
  const pos = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * cv.width / b.width, (e.clientY - b.top) * cv.height / b.height]; };
  cv.addEventListener('mousedown', e => { const [x, y] = pos(e); drag = { x, y }; });
  window.addEventListener('mousemove', e => { if (!drag) return; const [x, y] = pos(e); ox += x - drag.x; oy += y - drag.y; drag = { x, y }; redraw(); });
  window.addEventListener('mouseup', () => drag = null);
  cv.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive: false });
  $('zin').onclick = () => zoom(1.2); $('zout').onclick = () => zoom(1 / 1.2);
  $('reset').onclick = () => { s = 1; center(); }; $('center').onclick = center; $('ghost').onchange = redraw;
  $('file').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const im = new Image();
    im.onload = () => setImage(im, im.naturalWidth, im.naturalHeight);
    im.onerror = () => alert('Could not load that file as an image.');
    im.src = URL.createObjectURL(f);
  };
  sample();
})();
