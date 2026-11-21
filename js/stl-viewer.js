'use strict';

const V = {
  renderer: null,
  scene: null,
  cam: null,
  ctl: null,
  mesh: null,
  geom: null,
  M: null,
  raf: 0,
  sel: null,
  region: null,
  pattern: null,
  file: null,
  base: null,
};
function nextStl() {
  const f = state.stlQueue.shift();
  if (!f) return;
  f.arrayBuffer()
    .then((buf) => openStl(f, buf))
    .catch((err) => {
      $('msg').textContent = `${f.name}: ${msgOf(err)}`;
      nextStl();
    });
}
function cssColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function openStl(file, buf) {
  const pos = Core.parseSTL(buf);
  V.M = Core.makeMeshIndex(pos);
  V.file = file;
  V.sel = null;
  V.region = null;
  V.pattern = null;
  $('stlTitle').textContent = file.name;
  $('stlDl').disabled = $('stlUse').disabled = true;
  setStlInfo();
  $('dlg').showModal();
  const host = $('viewer');
  host.innerHTML = '';
  const T = THREE;
  V.renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
  V.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  host.appendChild(V.renderer.domElement);
  V.scene = new T.Scene();
  V.scene.background = new T.Color(cssColor('--sheet') || '#fbfbfc');
  V.geom = new T.BufferGeometry();
  V.geom.setAttribute('position', new T.BufferAttribute(pos, 3));
  V.base = new T.Color(0x9aa5b1);
  const col = new Float32Array(pos.length);
  for (let i = 0; i < col.length; i += 3) {
    col[i] = V.base.r;
    col[i + 1] = V.base.g;
    col[i + 2] = V.base.b;
  }
  V.geom.setAttribute('color', new T.BufferAttribute(col, 3));
  V.geom.computeVertexNormals();
  V.mesh = new T.Mesh(V.geom, new T.MeshLambertMaterial({ vertexColors: true }));
  V.scene.add(V.mesh);
  V.scene.add(
    new T.LineSegments(
      new T.EdgesGeometry(V.geom, 25),
      new T.LineBasicMaterial({ color: 0x3a4650 }),
    ),
  );
  V.scene.add(new T.AmbientLight(0xffffff, 0.65));
  V.light = new T.DirectionalLight(0xffffff, 0.75);
  V.scene.add(V.light);
  const mn = V.M.bbMin,
    mx = V.M.bbMax,
    c = new T.Vector3((mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2);
  V.cam = new T.PerspectiveCamera(40, 1, V.M.diag / 1000, V.M.diag * 20);
  V.cam.up.set(0, 0, 1);
  V.cam.position
    .copy(c)
    .add(new T.Vector3(1, -1.2, 0.9).normalize().multiplyScalar(V.M.diag * 1.4));
  V.ctl = new T.OrbitControls(V.cam, V.renderer.domElement);
  V.ctl.target.copy(c);
  V.ctl.update();
  V.ray = new T.Raycaster();
  resizeViewer();
  const cv = V.renderer.domElement;
  let down = null;
  cv.onpointerdown = (e) => {
    down = [e.clientX, e.clientY, e.button];
  };
  cv.onpointerup = (e) => {
    if (down && down[2] === 0 && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) pick(e);
    down = null;
  };
  const loop = () => {
    V.raf = requestAnimationFrame(loop);
    V.light.position.copy(V.cam.position);
    V.ctl.update();
    V.renderer.render(V.scene, V.cam);
  };
  loop();
}
function setStlInfo() {
  if (!V.M) return;
  updateAutoBtn();
  const p = V.sel != null ? V.pattern : null;
  $('stlInfo').textContent = p
    ? p.loops.length
      ? t('stlSel', fmt(p.w), fmt(p.h), p.loops.length - 1)
      : t('stlNone')
    : t('stlIntro', V.M.nt.toLocaleString(t('locale')));
}
function resizeViewer() {
  if (!V.renderer) return;
  const h = $('viewer'),
    w = h.clientWidth,
    ht = h.clientHeight;
  V.renderer.setSize(w, ht);
  V.cam.aspect = w / ht;
  V.cam.updateProjectionMatrix();
}
window.addEventListener('resize', resizeViewer);

function pick(e) {
  const r = V.renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((e.clientX - r.left) / r.width) * 2 - 1,
    -((e.clientY - r.top) / r.height) * 2 + 1,
  );
  V.ray.setFromCamera(ndc, V.cam);
  const hit = V.ray.intersectObject(V.mesh)[0];
  if (!hit) return;
  V.sel = hit.faceIndex;
  updateSelection();
}
function updateSelection() {
  if (V.sel == null) return;
  const tol = parseFloat($('stlTol').value);
  const col = V.geom.attributes.color,
    a = col.array;
  for (let i = 0; i < a.length; i += 3) {
    a[i] = V.base.r;
    a[i + 1] = V.base.g;
    a[i + 2] = V.base.b;
  }
  V.region = Core.faceRegion(V.M, V.sel, tol);
  for (const t of V.region.list)
    for (let k = 0; k < 3; k++) {
      const o = (t * 3 + k) * 3;
      a[o] = 1;
      a[o + 1] = 0.48;
      a[o + 2] = 0.1;
    }
  col.needsUpdate = true;
  try {
    V.pattern = Core.faceToPattern(V.M, V.region, parseFloat($('stlUnit').value));
    const p = V.pattern;
    setStlInfo();
    $('stlDl').disabled = $('stlUse').disabled = !p.loops.length;
    updateAutoBtn();
  } catch (err) {
    $('stlInfo').textContent = t('stlFail') + err.message;
    $('stlDl').disabled = $('stlUse').disabled = true;
  }
}
$('stlTol').addEventListener('input', () => {
  $('tolOut').textContent = parseInt($('stlTol').value, 10) + '°';
  updateSelection();
});
$('stlUnit').addEventListener('change', updateSelection);
function closeStl() {
  cancelAnimationFrame(V.raf);
  if (V.renderer) {
    V.renderer.dispose();
    V.renderer.forceContextLoss && V.renderer.forceContextLoss();
  }
  if (V.geom) V.geom.dispose();
  V.renderer = V.mesh = V.geom = V.ctl = null;
  $('viewer').innerHTML = '';
  if ($('dlg').open) $('dlg').close();
  renderList();
  if (state.stlQueue.length) nextStl();
}
$('stlClose').onclick = $('stlSkip').onclick = closeStl;
$('dlg').addEventListener('cancel', (e) => {
  e.preventDefault();
  closeStl();
});
function addStlPattern(file, pat) {
  markStale();
  const q = {
    id: state.nextId++,
    kind: 'stl',
    name: file.name.replace(/\.stl$/i, '') + t('faceSuffix'),
    include: true,
    ...pat,
  };
  state.patterns.push(q);
}
function updateAutoBtn() {
  const n = state.stlQueue.length,
    a = $('stlAuto');
  a.hidden = n === 0;
  a.textContent = t('stlAuto', n);
  a.disabled = $('stlUse').disabled;
  $('stlUse').classList.toggle('primary', n === 0);
  a.classList.toggle('primary', n > 0);
}
$('stlUse').onclick = () => {
  const p = V.pattern;
  if (!p) return;
  addStlPattern(V.file, p);
  closeStl();
};
$('stlAuto').onclick = async () => {
  const p = V.pattern;
  if (!p || V.sel == null) return;
  const sig = Core.faceSignature(V.M, V.sel),
    tol = parseFloat($('stlTol').value),
    unit = parseFloat($('stlUnit').value);
  addStlPattern(V.file, p);
  $('stlAuto').disabled = true;
  const rest = state.stlQueue.splice(0),
    failed = [];
  let ok = 0;
  for (const f of rest) {
    try {
      const M = Core.makeMeshIndex(Core.parseSTL(await f.arrayBuffer()));
      const tri = Core.matchFace(M, sig);
      const q = tri < 0 ? null : Core.faceToPattern(M, Core.faceRegion(M, tri, tol), unit);
      if (!q || !q.loops.length) {
        failed.push(f);
        continue;
      }
      addStlPattern(f, q);
      ok++;
    } catch (err) {
      failed.push(f);
    }
    await new Promise((r) => setTimeout(r));
  }
  state.stlQueue.push(...failed);
  state.info = {
    k: failed.length ? 'autoPart' : 'autoDone',
    a: [ok + 1, rest.length + 1, failed.length],
  };
  closeStl();
};
$('zipAll').onclick = () => {
  const files = state.patterns
    .filter((q) => q.kind === 'stl')
    .map((q) => ({ name: q.name + '.dxf', data: Core.toDXF([{ loops: q.loops }]) }));
  if (files.length) save(Core.zip(files), 'designs_dxf.zip', 'application/zip');
};
$('stlDl').onclick = () => {
  if (V.pattern)
    save(
      Core.toDXF([{ loops: V.pattern.loops }]),
      V.file.name.replace(/\.stl$/i, '') + t('faceSuffix') + '.dxf',
      'application/dxf',
    );
};
