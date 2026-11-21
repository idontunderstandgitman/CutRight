/**
 * STL reader: mesh parsing, face selection and projection of a face to 2D contours.
 */
(function (Core) {
  'use strict';

  function parseSTL(buf) {
    const dv = new DataView(buf);
    if (buf.byteLength >= 84) {
      const nt = dv.getUint32(80, true);
      if (84 + nt * 50 === buf.byteLength) {
        const pos = new Float32Array(nt * 9);
        for (let t = 0; t < nt; t++) {
          const o = 84 + t * 50 + 12;
          for (let k = 0; k < 9; k++) pos[t * 9 + k] = dv.getFloat32(o + k * 4, true);
        }
        return pos;
      }
    }
    const txt = new TextDecoder().decode(buf);
    const re = /vertex\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)/g;
    const arr = [];
    let m;
    while ((m = re.exec(txt))) arr.push(+m[1], +m[2], +m[3]);
    if (arr.length < 9 || arr.length % 9) throw new Error('ERR_STL_PARSE');
    return Float32Array.from(arr);
  }

  function makeMeshIndex(pos) {
    const nt = pos.length / 9;
    let mn = [Infinity, Infinity, Infinity],
      mx = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pos.length; i += 3)
      for (let k = 0; k < 3; k++) {
        mn[k] = Math.min(mn[k], pos[i + k]);
        mx[k] = Math.max(mx[k], pos[i + k]);
      }
    const diag = Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) || 1;
    const q = diag * 1e-6;
    const vmap = new Map(),
      vpos = [],
      tri = new Int32Array(nt * 3);
    for (let t = 0; t < nt; t++)
      for (let k = 0; k < 3; k++) {
        const o = t * 9 + k * 3;
        const key =
          Math.round(pos[o] / q) +
          ',' +
          Math.round(pos[o + 1] / q) +
          ',' +
          Math.round(pos[o + 2] / q);
        let id = vmap.get(key);
        if (id === undefined) {
          id = vpos.length / 3;
          vmap.set(key, id);
          vpos.push(pos[o], pos[o + 1], pos[o + 2]);
        }
        tri[t * 3 + k] = id;
      }
    const nv = vpos.length / 3;
    const edges = new Map();
    for (let t = 0; t < nt; t++)
      for (let k = 0; k < 3; k++) {
        const a = tri[t * 3 + k],
          b = tri[t * 3 + ((k + 1) % 3)];
        const key = Math.min(a, b) * nv + Math.max(a, b);
        const l = edges.get(key);
        if (l) l.push(t);
        else edges.set(key, [t]);
      }
    const nrm = new Float32Array(nt * 3);
    for (let t = 0; t < nt; t++) {
      const o = t * 9;
      const ux = pos[o + 3] - pos[o],
        uy = pos[o + 4] - pos[o + 1],
        uz = pos[o + 5] - pos[o + 2];
      const vx = pos[o + 6] - pos[o],
        vy = pos[o + 7] - pos[o + 1],
        vz = pos[o + 8] - pos[o + 2];
      let x = uy * vz - uz * vy,
        y = uz * vx - ux * vz,
        z = ux * vy - uy * vx;
      const l = Math.hypot(x, y, z) || 1;
      nrm[t * 3] = x / l;
      nrm[t * 3 + 1] = y / l;
      nrm[t * 3 + 2] = z / l;
    }
    return { nt, nv, vpos: Float32Array.from(vpos), tri, edges, nrm, diag, bbMin: mn, bbMax: mx };
  }

  // Connected face around triangle t0. A neighbour is included when its normal differs at most
  // angTolDeg from the clicked face's normal. For small angles (<= 2°) it must also lie in the
  // same plane (so a slightly curved surface does not "creep" away). For larger angles the face
  // follows rounded edges (fillets) out towards a vertical wall (90° = wall, never included).
  function faceRegion(M, t0, angTolDeg) {
    const cosT = Math.cos((angTolDeg * Math.PI) / 180);
    const strictPlane = angTolDeg <= 2;
    const n0 = [M.nrm[t0 * 3], M.nrm[t0 * 3 + 1], M.nrm[t0 * 3 + 2]];
    const v0 = M.tri[t0 * 3];
    const p0 = [M.vpos[v0 * 3], M.vpos[v0 * 3 + 1], M.vpos[v0 * 3 + 2]];
    const planeEps = M.diag * 1e-4;
    const inPlane = (t) => {
      for (let k = 0; k < 3; k++) {
        const v = M.tri[t * 3 + k];
        const d =
          (M.vpos[v * 3] - p0[0]) * n0[0] +
          (M.vpos[v * 3 + 1] - p0[1]) * n0[1] +
          (M.vpos[v * 3 + 2] - p0[2]) * n0[2];
        if (Math.abs(d) > planeEps) return false;
      }
      return true;
    };
    const mask = new Uint8Array(M.nt);
    mask[t0] = 1;
    const stack = [t0],
      list = [t0];
    while (stack.length) {
      const t = stack.pop();
      for (let k = 0; k < 3; k++) {
        const a = M.tri[t * 3 + k],
          b = M.tri[t * 3 + ((k + 1) % 3)];
        const l = M.edges.get(Math.min(a, b) * M.nv + Math.max(a, b));
        for (const t2 of l) {
          if (mask[t2]) continue;
          const d = M.nrm[t2 * 3] * n0[0] + M.nrm[t2 * 3 + 1] * n0[1] + M.nrm[t2 * 3 + 2] * n0[2];
          if (d < cosT || (strictPlane && !inPlane(t2))) continue;
          mask[t2] = 1;
          stack.push(t2);
          list.push(t2);
        }
      }
    }
    return { mask, list, normal: n0 };
  }

  // Face -> 2D contours (mm), rotated to the minimum bounding rectangle and normalised to the origin
  function faceToPattern(M, region, unitScale = 1) {
    const { mask, list, normal: n } = region;
    const adj = new Map(); // vertex -> neighbouring vertices (only edges on the face boundary)
    const addAdj = (a, b) => {
      (adj.get(a) || adj.set(a, []).get(a)).push(b);
    };
    for (const t of list)
      for (let k = 0; k < 3; k++) {
        const a = M.tri[t * 3 + k],
          b = M.tri[t * 3 + ((k + 1) % 3)];
        const l = M.edges.get(Math.min(a, b) * M.nv + Math.max(a, b));
        let cnt = 0;
        for (const t2 of l) if (mask[t2]) cnt++;
        if (cnt === 1) {
          addAdj(a, b);
          addAdj(b, a);
        }
      }
    // Loops of vertex ids
    const visited = new Set(),
      idLoops = [];
    for (const start of adj.keys()) {
      for (const first of adj.get(start)) {
        const ek = (a, b) => Math.min(a, b) * M.nv + Math.max(a, b);
        if (visited.has(ek(start, first))) continue;
        const loop = [start];
        let prev = start,
          cur = first;
        visited.add(ek(start, first));
        let guard = 0;
        while (cur !== start && guard++ < 5e6) {
          loop.push(cur);
          const nb = adj.get(cur).find((x) => !visited.has(ek(cur, x)));
          if (nb === undefined) break;
          visited.add(ek(cur, nb));
          prev = cur;
          cur = nb;
        }
        if (loop.length >= 3) idLoops.push(loop);
      }
    }
    // Project onto the face plane
    const helper = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    let u = [
      helper[1] * n[2] - helper[2] * n[1],
      helper[2] * n[0] - helper[0] * n[2],
      helper[0] * n[1] - helper[1] * n[0],
    ];
    const ul = Math.hypot(...u);
    u = u.map((x) => x / ul);
    const v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
    let loops = idLoops.map((l) => ({
      closed: true,
      pts: simplifyLoop(
        l.map((id) => {
          const x = M.vpos[id * 3],
            y = M.vpos[id * 3 + 1],
            z = M.vpos[id * 3 + 2];
          return [x * u[0] + y * u[1] + z * u[2], x * v[0] + y * v[1] + z * v[2]];
        }),
      ),
    }));
    loops = loops.filter((l) => l.pts.length >= 3);
    // Minimum-area bounding rectangle via the convex hull
    const all = [];
    for (const l of loops) for (const p of l.pts) all.push(p);
    const hull = convexHull(all);
    let best = { area: Infinity, ang: 0 };
    for (let i = 0; i < hull.length; i++) {
      const a = hull[i],
        b = hull[(i + 1) % hull.length];
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const c = Math.cos(-ang),
        s = Math.sin(-ang);
      let mnx = Infinity,
        mny = Infinity,
        mxx = -Infinity,
        mxy = -Infinity;
      for (const p of hull) {
        const x = p[0] * c - p[1] * s,
          y = p[0] * s + p[1] * c;
        mnx = Math.min(mnx, x);
        mxx = Math.max(mxx, x);
        mny = Math.min(mny, y);
        mxy = Math.max(mxy, y);
      }
      const area = (mxx - mnx) * (mxy - mny);
      if (area < best.area - 1e-9) best = { area, ang };
    }
    const c = Math.cos(-best.ang),
      s = Math.sin(-best.ang);
    loops = loops.map((l) => ({
      closed: true,
      pts: l.pts.map((p) => [p[0] * c - p[1] * s, p[0] * s + p[1] * c]),
    }));
    return Core.normalize(loops, unitScale);
  }

  function simplifyLoop(pts, eps = 1e-4) {
    let cur = pts.slice(),
      changed = true;
    while (changed && cur.length > 3) {
      changed = false;
      const nxt = [];
      for (let i = 0; i < cur.length; i++) {
        const a = cur[(i + cur.length - 1) % cur.length],
          b = cur[i],
          c = cur[(i + 1) % cur.length];
        const dx = c[0] - a[0],
          dy = c[1] - a[1],
          L = Math.hypot(dx, dy);
        const dist =
          L < 1e-12
            ? Math.hypot(b[0] - a[0], b[1] - a[1])
            : Math.abs(dx * (b[1] - a[1]) - dy * (b[0] - a[0])) / L;
        if (dist < eps && nxt.length + (cur.length - i - 1) > 3) {
          changed = true;
          continue;
        }
        nxt.push(b);
      }
      cur = nxt;
    }
    return cur;
  }

  function convexHull(P) {
    const pts = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (pts.length < 3) return pts;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [];
    for (const p of pts) {
      while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
      lo.push(p);
    }
    const up = [];
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
      up.push(p);
    }
    lo.pop();
    up.pop();
    return lo.concat(up);
  }

  /* ---------------------------------------- repeat a face choice on similar models */
  // Signature of a chosen face: normal direction + where the click was relative to the model's bounding box.
  function faceSignature(M, t0) {
    const c = [0, 0, 0];
    for (let k = 0; k < 3; k++) {
      const v = M.tri[t0 * 3 + k];
      for (let a = 0; a < 3; a++) c[a] += M.vpos[v * 3 + a] / 3;
    }
    const nc = c.map((x, a) => {
      const d = M.bbMax[a] - M.bbMin[a];
      return d > 1e-9 ? (x - M.bbMin[a]) / d : 0.5;
    });
    return { n: [M.nrm[t0 * 3], M.nrm[t0 * 3 + 1], M.nrm[t0 * 3 + 2]], nc };
  }
  // Finds the triangle on another model that best matches the signature (same normal, same relative position).
  function matchFace(M, sig, maxAngDeg = 5) {
    const cosT = Math.cos((maxAngDeg * Math.PI) / 180);
    const span = [0, 1, 2].map((a) => M.bbMax[a] - M.bbMin[a]);
    let best = -1,
      bd = Infinity;
    for (let t = 0; t < M.nt; t++) {
      const d = M.nrm[t * 3] * sig.n[0] + M.nrm[t * 3 + 1] * sig.n[1] + M.nrm[t * 3 + 2] * sig.n[2];
      if (d < cosT) continue;
      let s = 0;
      for (let a = 0; a < 3; a++) {
        let c = 0;
        for (let k = 0; k < 3; k++) c += M.vpos[M.tri[t * 3 + k] * 3 + a] / 3;
        const nc = span[a] > 1e-9 ? (c - M.bbMin[a]) / span[a] : 0.5;
        s += (nc - sig.nc[a]) ** 2;
      }
      if (s < bd) {
        bd = s;
        best = t;
      }
    }
    return best;
  }

  Object.assign(Core, {
    parseSTL,
    makeMeshIndex,
    faceRegion,
    faceToPattern,
    faceSignature,
    matchFace,
  });
})((globalThis.Core = globalThis.Core || {}));
