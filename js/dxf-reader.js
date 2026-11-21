/**
 * DXF reader: turns the text of an ASCII DXF file into polylines.
 */
(function (Core) {
  'use strict';

  const UNIT_MM = {
    1: 25.4,
    2: 304.8,
    3: 1609344,
    4: 1,
    5: 10,
    6: 1000,
    7: 1e6,
    8: 2.54e-5,
    9: 0.0254,
    10: 914.4,
  };

  function parseDXF(text) {
    if (text.startsWith('AutoCAD Binary DXF')) throw new Error('ERR_BINARY_DXF');
    const lines = text.split(/\r?\n/);
    const secs = {};
    const header = {};
    let sec = null,
      cur = null,
      pending = false,
      hvar = null;
    for (let i = 0; i + 1 < lines.length; i += 2) {
      const c = parseInt(lines[i].trim(), 10),
        v = lines[i + 1].trim();
      if (c === 0) {
        cur = null;
        if (v === 'SECTION') {
          pending = true;
          continue;
        }
        if (v === 'ENDSEC') {
          sec = null;
          continue;
        }
        if (v === 'EOF') break;
        if (sec && sec !== 'HEADER') {
          cur = { type: v, p: [] };
          (secs[sec] || (secs[sec] = [])).push(cur);
        }
        continue;
      }
      if (pending && c === 2) {
        sec = v;
        pending = false;
        continue;
      }
      if (sec === 'HEADER') {
        if (c === 9) hvar = v;
        else if (hvar && !(hvar in header)) header[hvar] = v;
        continue;
      }
      if (cur) cur.p.push([c, v]);
    }
    // Block table (used by INSERT entities)
    const blocks = {};
    let cb = null;
    for (const e of secs.BLOCKS || []) {
      if (e.type === 'BLOCK') {
        cb = { name: get(e, 2, ''), base: [num(get(e, 10, 0)), num(get(e, 20, 0))], ents: [] };
        blocks[cb.name] = cb;
      } else if (e.type === 'ENDBLK') cb = null;
      else if (cb) cb.ents.push(e);
    }
    const unit = UNIT_MM[parseInt(header['$INSUNITS'], 10)] || 1;
    // Entities -> polylines
    const stats = { ignored: {} };
    const polys = [];
    const ents = secs.ENTITIES || [];
    for (let i = 0; i < ents.length; i++) {
      const e = ents[i];
      if (e.type === 'POLYLINE') {
        const verts = [];
        let j = i + 1;
        while (j < ents.length && ents[j].type === 'VERTEX') {
          verts.push(ents[j]);
          j++;
        }
        if (ents[j] && ents[j].type === 'SEQEND') j++;
        i = j - 1;
        const flags = parseInt(get(e, 70, 0), 10);
        if (flags & 16 || flags & 64) {
          stats.ignored.POLYLINE_3D = (stats.ignored.POLYLINE_3D || 0) + 1;
          continue;
        }
        const pts = verts
          .filter((v) => !(parseInt(get(v, 70, 0), 10) & 16))
          .map((v) => ({ x: num(get(v, 10, 0)), y: num(get(v, 20, 0)), b: num(get(v, 42, 0)) }));
        polys.push({ layer: get(e, 8, '0'), pts: bulgePoly(pts, !!(flags & 1)) });
      } else {
        entityToPolys(e, blocks, polys, stats, 0, null);
      }
    }
    return { polys, unit, ignored: stats.ignored };
  }

  function get(e, code, def) {
    for (const [c, v] of e.p) if (c === code) return v;
    return def;
  }
  function getAll(e, code) {
    const r = [];
    for (const [c, v] of e.p) if (c === code) r.push(num(v));
    return r;
  }
  function num(v) {
    return typeof v === 'number' ? v : parseFloat(v);
  }

  const TOL = 0.01; // mm, maximum deviation when flattening curves
  function arcSteps(r, sweep) {
    r = Math.abs(r);
    if (r < 1e-9) return 1;
    const d = 2 * Math.acos(Math.max(-1, Math.min(1, 1 - TOL / r)));
    return Math.max(2, Math.ceil(Math.abs(sweep) / Math.max(d, 1e-3)));
  }

  function bulgePoly(pts, closed) {
    const out = [];
    const n = pts.length;
    const segCount = closed ? n : n - 1;
    for (let i = 0; i < n; i++) out.push(null);
    const res = [];
    for (let i = 0; i < segCount; i++) {
      const a = pts[i],
        b = pts[(i + 1) % n];
      res.push([a.x, a.y]);
      if (a.b) {
        const dx = b.x - a.x,
          dy = b.y - a.y,
          c = Math.hypot(dx, dy);
        if (c > 1e-12) {
          const th = 4 * Math.atan(a.b),
            ath = Math.abs(th);
          const r = c / (2 * Math.sin(ath / 2));
          const s = Math.sign(a.b);
          const k = (s * r * Math.cos(ath / 2)) / c;
          const cx = (a.x + b.x) / 2 - dy * k,
            cy = (a.y + b.y) / 2 + dx * k;
          const a0 = Math.atan2(a.y - cy, a.x - cx);
          const m = arcSteps(r, th);
          for (let t = 1; t < m; t++) {
            const ang = a0 + (th * t) / m;
            res.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
          }
        }
      }
    }
    const last = closed ? pts[0] : pts[n - 1];
    if (n) res.push([last.x, last.y]);
    return res;
  }

  function entityToPolys(e, blocks, out, stats, depth, xf) {
    const layer = get(e, 8, '0');
    const push = (pts) => {
      if (pts.length > 1) out.push({ layer, pts: xf ? pts.map((p) => applyXf(xf, p)) : pts });
    };
    const ez = num(get(e, 230, 1));
    const flipX = ez < 0;
    const fx = (x) => (flipX ? -x : x);
    switch (e.type) {
      case 'LINE':
        push([
          [num(get(e, 10, 0)), num(get(e, 20, 0))],
          [num(get(e, 11, 0)), num(get(e, 21, 0))],
        ]);
        break;
      case 'CIRCLE': {
        const cx = fx(num(get(e, 10, 0))),
          cy = num(get(e, 20, 0)),
          r = num(get(e, 40, 0));
        const m = arcSteps(r, 2 * Math.PI);
        const pts = [];
        for (let i = 0; i <= m; i++) {
          const a = (2 * Math.PI * i) / m;
          pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
        }
        push(pts);
        break;
      }
      case 'ARC': {
        const cx = num(get(e, 10, 0)),
          cy = num(get(e, 20, 0)),
          r = num(get(e, 40, 0));
        let a0 = (num(get(e, 50, 0)) * Math.PI) / 180,
          a1 = (num(get(e, 51, 0)) * Math.PI) / 180;
        while (a1 <= a0) a1 += 2 * Math.PI;
        const sw = a1 - a0,
          m = arcSteps(r, sw),
          pts = [];
        for (let i = 0; i <= m; i++) {
          const a = a0 + (sw * i) / m;
          pts.push([fx(cx + r * Math.cos(a)), cy + r * Math.sin(a)]);
        }
        push(pts);
        break;
      }
      case 'LWPOLYLINE': {
        const flags = parseInt(get(e, 70, 0), 10);
        const vs = [];
        let curv = null;
        for (const [c, v] of e.p) {
          if (c === 10) {
            curv = { x: fx(num(v)), y: 0, b: 0 };
            vs.push(curv);
          } else if (c === 20 && curv) curv.y = num(v);
          else if (c === 42 && curv) curv.b = flipX ? -num(v) : num(v);
        }
        push(bulgePoly(vs, !!(flags & 1)));
        break;
      }
      case 'ELLIPSE': {
        const cx = num(get(e, 10, 0)),
          cy = num(get(e, 20, 0));
        const mx = num(get(e, 11, 0)),
          my = num(get(e, 21, 0)),
          ratio = num(get(e, 40, 1));
        let t0 = num(get(e, 41, 0)),
          t1 = num(get(e, 42, 2 * Math.PI));
        while (t1 <= t0) t1 += 2 * Math.PI;
        const a = Math.hypot(mx, my),
          rot = Math.atan2(my, mx),
          b = a * ratio;
        const m = arcSteps(a, t1 - t0),
          pts = [];
        for (let i = 0; i <= m; i++) {
          const t = t0 + ((t1 - t0) * i) / m,
            ex = a * Math.cos(t),
            ey = b * Math.sin(t);
          pts.push([
            cx + ex * Math.cos(rot) - ey * Math.sin(rot),
            cy + ex * Math.sin(rot) + ey * Math.cos(rot),
          ]);
        }
        push(pts);
        break;
      }
      case 'SPLINE':
        push(splinePts(e));
        break;
      case 'INSERT': {
        const b = blocks[get(e, 2, '')];
        if (!b || depth > 8) break;
        const sx = num(get(e, 41, 1)),
          sy = num(get(e, 42, 1)),
          rot = (num(get(e, 50, 0)) * Math.PI) / 180;
        const ix = num(get(e, 10, 0)),
          iy = num(get(e, 20, 0));
        const co = Math.cos(rot),
          si = Math.sin(rot);
        // p' = R*S*(p - base) + ins
        let m = [co * sx, si * sx, -si * sy, co * sy, 0, 0];
        m[4] = ix - (m[0] * b.base[0] + m[2] * b.base[1]);
        m[5] = iy - (m[1] * b.base[0] + m[3] * b.base[1]);
        const full = xf ? mulXf(xf, m) : m;
        const sub = [];
        for (let i = 0; i < b.ents.length; i++)
          entityToPolys(b.ents[i], blocks, sub, stats, depth + 1, full);
        for (const p of sub) out.push({ layer: p.layer === '0' ? layer : p.layer, pts: p.pts });
        break;
      }
      case 'VERTEX':
      case 'SEQEND':
        break;
      default:
        stats.ignored[e.type] = (stats.ignored[e.type] || 0) + 1;
    }
  }
  function applyXf(m, p) {
    return [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
  }
  function mulXf(a, b) {
    // a ∘ b  (b is applied first)
    return [
      a[0] * b[0] + a[2] * b[1],
      a[1] * b[0] + a[3] * b[1],
      a[0] * b[2] + a[2] * b[3],
      a[1] * b[2] + a[3] * b[3],
      a[0] * b[4] + a[2] * b[5] + a[4],
      a[1] * b[4] + a[3] * b[5] + a[5],
    ];
  }

  function splinePts(e) {
    const deg = parseInt(get(e, 71, 3), 10);
    const knots = getAll(e, 40);
    const xs = getAll(e, 10),
      ys = getAll(e, 20),
      ws = getAll(e, 41);
    const cps = xs.map((x, i) => [x, ys[i]]);
    const fx = getAll(e, 11),
      fy = getAll(e, 21);
    const n = cps.length;
    if (n > deg && knots.length === n + deg + 1) {
      const rational = ws.length === n;
      const out = [];
      const t0 = knots[deg],
        t1 = knots[n];
      const N = Math.max(32, n * 10);
      for (let s = 0; s <= N; s++) {
        let t = t0 + ((t1 - t0) * s) / N;
        let k = deg;
        while (k < n - 1 && t >= knots[k + 1]) k++;
        const d = [];
        for (let j = 0; j <= deg; j++) {
          const i = j + k - deg;
          const w = rational ? ws[i] : 1;
          d.push([cps[i][0] * w, cps[i][1] * w, w]);
        }
        for (let r = 1; r <= deg; r++)
          for (let j = deg; j >= r; j--) {
            const i = j + k - deg;
            const den = knots[i + deg - r + 1] - knots[i];
            const al = den === 0 ? 0 : (t - knots[i]) / den;
            for (let q = 0; q < 3; q++) d[j][q] = (1 - al) * d[j - 1][q] + al * d[j][q];
          }
        out.push([d[deg][0] / d[deg][2], d[deg][1] / d[deg][2]]);
      }
      return out;
    }
    return fx.map((x, i) => [x, fy[i]]);
  }

  Object.assign(Core, { parseDXF });
})((globalThis.Core = globalThis.Core || {}));
