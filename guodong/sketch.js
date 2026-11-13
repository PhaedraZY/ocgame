/* sketch.js — a tiny hand-drawn renderer for <canvas>.
   ink(): pressure-varying pen line with wobble, tapered ends, and an overshooting start/end on closed shapes.
   wash(): watercolour-ish flat fill — slightly off-register from the line, soft blooms inside, pigment pooling at the edge.
   Shapes are plain arrays of [x, y] points, so anything can be drawn with the same pen. */
const Sketch = (() => {
  'use strict';
  const TAU = Math.PI * 2;

  function rng(seed) {
    let s = (Math.imul(seed | 0, 2654435761) >>> 0) || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
  function shade(hex, amt) {   // amt < 0 darker, > 0 lighter
    const [r, g, b] = hexRgb(hex), t = amt < 0 ? 0 : 255, k = Math.abs(amt);
    return `rgb(${Math.round(r + (t - r) * k)},${Math.round(g + (t - g) * k)},${Math.round(b + (t - b) * k)})`;
  }
  function rgba(hex, a) { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})`; }

  function resample(pts, closed, step) {
    const src = closed ? [...pts, pts[0]] : pts, out = [];
    for (let i = 0; i < src.length - 1; i++) {
      const [x0, y0] = src[i], [x1, y1] = src[i + 1], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
      for (let k = 0; k < n; k++) out.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
    }
    if (!closed) out.push(src[src.length - 1]);
    return out;
  }

  function wobble(pts, amp, R) {
    const n = pts.length; if (n < 3 || !amp) return pts;
    const f1 = R() * TAU, f2 = R() * TAU, k1 = .018 + R() * .02, k2 = .06 + R() * .05;
    const out = []; let s = 0;
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      if (i) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const o = amp * (Math.sin(s * k1 + f1) * .72 + Math.sin(s * k2 + f2) * .28);
      out.push([p[0] - ty * o, p[1] + tx * o]);
    }
    return out;
  }

  function trace(c, P) { c.beginPath(); c.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) c.lineTo(P[i][0], P[i][1]); }

  class Pen {
    constructor(ctx, seed = 7) { this.c = ctx; this.R = rng(seed); }
    rand(a, b) { return a + (b - a) * this.R(); }

    ink(pts, o = {}) {
      const { color = '#6f625e', w = 2, closed = false, amp = .8, step = 2.5, alpha = 1, taper = true } = o;
      const c = this.c, R = this.R;
      let P = resample(pts, closed, step);
      if (closed) {                                  // start somewhere random and overshoot a little
        const s = Math.floor(R() * P.length), over = Math.ceil(P.length * (.03 + R() * .05));
        P = [...P.slice(s), ...P.slice(0, s), ...P.slice(s, s + over)];
      }
      P = wobble(P, amp, R);
      if (closed) { const d = this.rand(.6, 1.6); const n = P.length; for (let i = n - 8; i < n; i++) if (i > 0) P[i] = [P[i][0] + d * (i - n + 8) / 8, P[i][1] - d * (i - n + 8) / 8]; }
      const n = P.length, ph = R() * TAU, fr = .05 + R() * .05;
      c.save(); c.strokeStyle = color; c.lineCap = 'round'; c.lineJoin = 'round'; c.globalAlpha = alpha;
      for (let i = 0; i < n - 1; i++) {
        const t = i / (n - 1);
        const tp = taper ? Math.pow(Math.min(1, t / .1, (1 - t) / .1), .55) : 1;
        const press = .78 + .22 * Math.sin(i * fr + ph);
        c.lineWidth = Math.max(.45, w * Math.max(.3, tp) * press);
        c.beginPath(); c.moveTo(P[i][0], P[i][1]); c.lineTo(P[i + 1][0], P[i + 1][1]); c.stroke();
      }
      c.restore();
    }

    wash(pts, o = {}) {
      const { color = '#ffffff', amp = 1.1, off = 1.6, blooms = 4, edge = .2, alpha = 1, grain = true } = o;
      const c = this.c, R = this.R;
      let P = wobble(resample(pts, true, 5), amp, R);
      const dx = this.rand(-off, off), dy = this.rand(-off, off);
      P = P.map(([x, y]) => [x + dx, y + dy]);
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      const bw = x1 - x0, bh = y1 - y0, sz = Math.max(bw, bh);
      c.save(); c.globalAlpha = alpha;
      trace(c, P); c.closePath(); c.fillStyle = color; c.fill();
      c.clip();
      for (let i = 0; i < blooms; i++) {                     // uneven pigment
        const x = x0 + R() * bw, y = y0 + R() * bh, r = sz * (.25 + R() * .45);
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        const tone = R() < .55 ? shade(color, -.12) : shade(color, .35);
        g.addColorStop(0, tone.replace('rgb', 'rgba').replace(')', `,${.10 + R() * .12})`)); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
      }
      if (grain && sz > 30) {                                // dry-brush streaks
        c.globalAlpha = alpha * .04; c.strokeStyle = shade(color, -.25); c.lineWidth = 1;
        const ang = R() * .6 - .3;
        for (let i = 0; i < sz / 9; i++) { const y = y0 + R() * bh, x = x0 + R() * bw * .3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + bw * (.3 + R() * .6), y + bw * ang * .3); c.stroke(); }
      }
      c.restore();
      if (edge) {                                            // pigment pooling at the edge
        c.save(); c.globalAlpha = alpha * edge; c.strokeStyle = shade(color, -.22); c.lineWidth = 2.2; c.lineJoin = 'round';
        trace(c, P); c.closePath(); c.stroke(); c.restore();
      }
    }

    // fill + line in one call (line wobbles separately → slight misregistration, like a real drawing)
    draw(pts, o = {}) {
      if (o.fill) this.wash(pts, { color: o.fill, alpha: o.fillAlpha ?? 1, blooms: o.blooms ?? 4, edge: o.edge ?? .2, off: o.off ?? 1.6 });
      if (o.line !== false) this.ink(pts, { color: o.line || '#6f625e', w: o.w ?? 2, closed: o.open ? false : true, amp: o.amp ?? .8 });
    }

    dot(x, y, r, color, o = {}) { this.draw(Shapes.ell(x, y, r, r * this.rand(.85, 1.05)), { fill: color, line: o.line ?? false, w: o.w ?? 1, blooms: 1, edge: .25, off: .5 }); }
  }

  const Shapes = {
    rect(x, y, w, h, r = 0) {
      if (!r) return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
      const pts = [], arc = (cx, cy, a0) => { for (let i = 0; i <= 6; i++) { const a = a0 + i / 6 * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
      arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI);
      return pts;
    },
    ell(cx, cy, rx, ry, a0 = 0, a1 = TAU, rot = 0) {
      const n = Math.max(12, Math.ceil(Math.max(rx, ry) * Math.abs(a1 - a0) / 6)), pts = [], co = Math.cos(rot), si = Math.sin(rot);
      for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, x = Math.cos(a) * rx, y = Math.sin(a) * ry; pts.push([cx + x * co - y * si, cy + x * si + y * co]); }
      if (Math.abs(a1 - a0 - TAU) < 1e-6) pts.pop();
      return pts;
    },
    // Catmull-Rom through control points
    curve(ctrl, closed = false, seg = 8) {
      const n = ctrl.length, pts = [], P = i => closed ? ctrl[(i + n) % n] : ctrl[Math.max(0, Math.min(n - 1, i))];
      const last = closed ? n : n - 1;
      for (let i = 0; i < last; i++) {
        const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
        for (let k = 0; k < seg; k++) {
          const t = k / seg, t2 = t * t, t3 = t2 * t;
          pts.push([0, 1].map(j => .5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
        }
      }
      if (!closed) pts.push(ctrl[n - 1]);
      return pts;
    },
    // a row of scallops hanging under a line (frills, valances)
    scallops(x0, x1, y, size, down = true) {
      const pts = [[x0, y]], n = Math.max(1, Math.round((x1 - x0) / size)), w = (x1 - x0) / n;
      for (let i = 0; i < n; i++) for (let k = 1; k <= 8; k++) { const a = Math.PI * k / 8; pts.push([x0 + i * w + w / 2 - Math.cos(a) * w / 2, y + (down ? 1 : -1) * Math.sin(a) * w * .42]); }
      pts.push([x1, y]);
      return pts;
    },
  };

  // paper grain tile
  function grainTile(size = 220, seed = 3) {
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const x = cv.getContext('2d'), d = x.createImageData(size, size), R = rng(seed);
    for (let i = 0; i < d.data.length; i += 4) { const v = 120 + R() * 135; d.data[i] = v; d.data[i + 1] = v * .97; d.data[i + 2] = v * .92; d.data[i + 3] = R() < .5 ? 26 : 10; }
    x.putImageData(d, 0, 0);
    x.globalAlpha = .08; x.strokeStyle = '#7a6a55';
    for (let i = 0; i < 40; i++) { const a = R() * 6.3, px = R() * size, py = R() * size, l = 4 + R() * 14; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
    return cv;
  }

  return { Pen, Shapes, shade, rgba, rng, grainTile };
})();
