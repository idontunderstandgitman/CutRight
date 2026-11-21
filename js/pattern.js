/**
 * Pattern building: layer selection, chaining line segments into contours, normalising to the origin.
 */
(function (Core) {
  'use strict';

  function layerExtents(polys) {
    const L = {};
    for (const p of polys) {
      const o =
        L[p.layer] ||
        (L[p.layer] = { minx: Infinity, miny: Infinity, maxx: -Infinity, maxy: -Infinity, n: 0 });
      for (const [x, y] of p.pts) {
        if (x < o.minx) o.minx = x;
        if (x > o.maxx) o.maxx = x;
        if (y < o.miny) o.miny = y;
        if (y > o.maxy) o.maxy = y;
      }
      o.n++;
    }
    for (const k in L) L[k].area = (L[k].maxx - L[k].minx) * (L[k].maxy - L[k].miny);
    return L;
  }

  // Builds a pattern (contours normalised to the origin) from the polylines of one layer ('*' = all layers).
  function buildPattern(polys, unit, layer) {
    const sel = layer === '*' ? polys : polys.filter((p) => p.layer === layer);
    const segs = [];
    for (const p of sel)
      for (let i = 0; i + 1 < p.pts.length; i++) {
        const a = p.pts[i],
          b = p.pts[i + 1];
        if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) > 1e-9)
          segs.push([a[0] * unit, a[1] * unit, b[0] * unit, b[1] * unit]);
      }
    return normalize(chainSegments(segs));
  }

  function chainSegments(segs, tol = 0.005) {
    const n = segs.length,
      used = new Uint8Array(n),
      cell = new Map();
    const ci = (v) => Math.round(v / tol);
    const key = (ix, iy) => (ix + 4194304) * 8388608 + (iy + 4194304);
    const endPt = (m) => {
      const s = segs[m >> 1];
      return m & 1 ? [s[2], s[3]] : [s[0], s[1]];
    };
    for (let i = 0; i < n; i++)
      for (let e = 0; e < 2; e++) {
        const k = key(ci(segs[i][e * 2]), ci(segs[i][e * 2 + 1]));
        const l = cell.get(k);
        if (l) l.push(i * 2 + e);
        else cell.set(k, [i * 2 + e]);
      }
    const find = (p) => {
      let best = -1,
        bd = tol * tol * 4;
      const cx = ci(p[0]),
        cy = ci(p[1]);
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
          const l = cell.get(key(cx + dx, cy + dy));
          if (!l) continue;
          for (const m of l) {
            if (used[m >> 1]) continue;
            const q = endPt(m);
            const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2;
            if (d <= bd) {
              bd = d;
              best = m;
            }
          }
        }
      return best;
    };
    const extend = (pts) => {
      for (;;) {
        const m = find(pts[pts.length - 1]);
        if (m < 0) return;
        used[m >> 1] = 1;
        pts.push(endPt(m ^ 1));
      }
    };
    const loops = [];
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = 1;
      const pts = [
        [segs[i][0], segs[i][1]],
        [segs[i][2], segs[i][3]],
      ];
      extend(pts);
      pts.reverse();
      extend(pts);
      let closed = false;
      if (
        pts.length > 2 &&
        Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) <=
          tol * 2
      ) {
        pts.pop();
        closed = true;
      }
      loops.push({ pts, closed });
    }
    return loops;
  }

  function normalize(loops, scale = 1) {
    let minx = Infinity,
      miny = Infinity,
      maxx = -Infinity,
      maxy = -Infinity;
    for (const l of loops)
      for (const [x, y] of l.pts) {
        if (x < minx) minx = x;
        if (x > maxx) maxx = x;
        if (y < miny) miny = y;
        if (y > maxy) maxy = y;
      }
    if (!isFinite(minx)) return { loops: [], w: 0, h: 0 };
    return {
      loops: loops.map((l) => ({
        closed: l.closed,
        pts: l.pts.map(([x, y]) => [(x - minx) * scale, (y - miny) * scale]),
      })),
      w: (maxx - minx) * scale,
      h: (maxy - miny) * scale,
    };
  }

  Object.assign(Core, { layerExtents, buildPattern, normalize });
})((globalThis.Core = globalThis.Core || {}));
