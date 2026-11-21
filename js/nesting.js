/**
 * Nesting: exact guillotine packing (dynamic programming) and the size-preference search.
 */
(function (Core) {
  'use strict';

  // tiles: [[w, h]] in grid cells. Returns [{x, y, w, h, idx, rot}] that maximises the covered area.
  function solve(W, H, tiles, rotate, weights) {
    const cand = [];
    tiles.forEach(([w, h], i) => {
      const wt = weights ? weights[i] : 1;
      cand.push([w, h, i, false, wt]);
      if (rotate && w !== h) cand.push([h, w, i, true, wt]);
    });
    const SC = 1000,
      S = H + 1;
    const f = new Float64Array((W + 1) * S),
      kind = new Uint8Array((W + 1) * S),
      arg = new Int32Array((W + 1) * S);
    for (let w = 1; w <= W; w++)
      for (let h = 1; h <= H; h++) {
        let best = 0,
          bk = 0,
          ba = -1;
        for (let ci = 0; ci < cand.length; ci++) {
          const c = cand[ci];
          if (c[0] <= w && c[1] <= h) {
            const v = c[0] * c[1] * SC * c[4] - 1;
            if (v > best) {
              best = v;
              bk = 0;
              ba = ci;
            }
          }
        }
        for (let a = 1, m = w >> 1; a <= m; a++) {
          const v = f[a * S + h] + f[(w - a) * S + h];
          if (v > best) {
            best = v;
            bk = 1;
            ba = a;
          }
        }
        for (let b = 1, m = h >> 1; b <= m; b++) {
          const v = f[w * S + b] + f[w * S + h - b];
          if (v > best) {
            best = v;
            bk = 2;
            ba = b;
          }
        }
        const i = w * S + h;
        f[i] = best;
        kind[i] = bk;
        arg[i] = ba;
      }
    const out = [],
      st = [[0, 0, W, H]];
    while (st.length) {
      const [x, y, w, h] = st.pop();
      if (w <= 0 || h <= 0) continue;
      const i = w * S + h;
      if (f[i] === 0) continue;
      const k = kind[i],
        a = arg[i];
      if (k === 0) {
        const c = cand[a];
        out.push({ x, y, w: c[0], h: c[1], idx: c[2], rot: c[3] });
      } else if (k === 1) st.push([x, y, a, h], [x + a, y, w - a, h]);
      else st.push([x, y, w, a], [x, y + a, w, h - a]);
    }
    return out;
  }

  // patterns: [{name, loops, w, h}], opts: {W, H, gap, margin, rotate, prefer, cache}
  function nest(patterns, opts) {
    const { W: WW, H: WH, gap, margin, rotate, prefer } = opts;
    const uw = WW - 2 * margin + gap,
      uh = WH - 2 * margin + gap;
    let res = 0.5;
    while ((uw / res) * (uh / res) > 800000) res += 0.5;
    const areas = patterns.map((p) => p.w * p.h),
      amax = Math.max(...areas);
    const run = (r, g) => {
      // g = size favouring exponent (0 = pure area maximisation)
      const GW = Math.floor(uw / r + 1e-9),
        GH = Math.floor(uh / r + 1e-9);
      const tiles = patterns.map((p) => [
        Math.ceil((p.w + gap) / r - 1e-9),
        Math.ceil((p.h + gap) / r - 1e-9),
      ]);
      const placed = solve(
        GW,
        GH,
        tiles,
        rotate,
        areas.map((a) => Math.pow(a / amax, g)),
      );
      let used = 0;
      for (const q of placed) used += areas[q.idx];
      return { placed, used };
    };
    // Size preference: accept up to `prefer` (0.10 = 10 %) lower coverage if the parts become bigger.
    const cache = opts.cache || {};
    const best0 = cache.best0 || (cache.best0 = run(res, 0));
    let chosen = best0;
    if (prefer > 0 && patterns.length > 1) {
      const resC = Math.max(res, 1),
        c0 = resC === res ? best0 : cache.c0 || (cache.c0 = run(resC, 0)),
        targetC = c0.used / (1 + prefer);
      let lo = 0,
        hi = 8;
      if (run(resC, hi).used >= targetC) lo = hi;
      else
        for (let i = 0; i < 7; i++) {
          const mid = (lo + hi) / 2;
          if (run(resC, mid).used >= targetC) lo = mid;
          else hi = mid;
        }
      const target = best0.used / (1 + prefer);
      let g = lo;
      for (let i = 0; i < 6 && g > 0; i++) {
        const r = run(res, g);
        if (r.used >= target) {
          chosen = r;
          break;
        }
        g *= 0.7;
      }
    }
    const placed = chosen.placed.sort((a, b) => a.y - b.y || a.x - b.x);
    const parts = placed.map((p) => {
      const pat = patterns[p.idx];
      const ox = margin + p.x * res,
        oy = margin + p.y * res;
      const loops = pat.loops.map((l) => ({
        closed: l.closed,
        pts: l.pts.map(([x, y]) => (p.rot ? [pat.h - y + ox, x + oy] : [x + ox, y + oy])),
      }));
      // Inner contours (holes) first, outer contour last, so software that cuts in file order cuts holes first.
      const area = (l) => {
        let a = 1e300,
          b = 1e300,
          c = -1e300,
          d = -1e300;
        for (const [x, y] of l.pts) {
          if (x < a) a = x;
          if (x > c) c = x;
          if (y < b) b = y;
          if (y > d) d = y;
        }
        return (c - a) * (d - b);
      };
      loops.sort((u, v) => area(u) - area(v));
      return {
        idx: p.idx,
        rot: p.rot,
        x: ox,
        y: oy,
        w: p.rot ? pat.h : pat.w,
        h: p.rot ? pat.w : pat.h,
        loops,
      };
    });
    const counts = patterns.map(() => 0);
    let used = 0;
    for (const p of parts) {
      counts[p.idx]++;
      used += patterns[p.idx].w * patterns[p.idx].h;
    }
    return { parts, counts, used, total: WW * WH, res, bestPossible: best0.used };
  }

  Object.assign(Core, { solve, nest });
})((globalThis.Core = globalThis.Core || {}));
