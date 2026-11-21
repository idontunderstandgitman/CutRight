'use strict';

function renderList() {
  const el = $('list');
  el.innerHTML = '';
  for (const p of state.patterns) {
    const d = document.createElement('div');
    d.className = 'pattern' + (p.include ? '' : ' disabled');
    const pad = Math.max(p.w, p.h) * 0.06 + 0.1;
    const vb = `${-pad} ${-pad} ${p.w + 2 * pad} ${p.h + 2 * pad}`;
    let layerSel = '';
    if (p.kind === 'dxf') {
      const names = Object.keys(p.layers).sort((a, b) => p.layers[b].area - p.layers[a].area);
      layerSel =
        `<label class="meta" title="${esc(t('layerTitle'))}">${t('layer')}: <select data-id="${p.id}" class="layer-select">` +
        names
          .map(
            (n) =>
              `<option value="${esc(n)}"${n === p.layer ? ' selected' : ''}>${esc(n)}</option>`,
          )
          .join('') +
        `<option value="*"${p.layer === '*' ? ' selected' : ''}>${t('allLayers')}</option></select></label>`;
    }
    const ign =
      p.ignored && Object.keys(p.ignored).length
        ? `<div class="warn">${t('ignored')}: ${Object.entries(p.ignored)
            .map(([k, v]) => k + '×' + v)
            .join(', ')}</div>`
        : '';
    const empty = p.loops.length === 0 ? `<div class="warn">${t('noGeo')}</div>` : '';
    d.innerHTML = `<svg viewBox="${vb}" aria-hidden="true"><path d="${Core.pathD(p.loops, p.h)}"/></svg>
      <div><div class="name">${esc(p.name)}</div>
        <div class="meta">${fmt(p.w)} × ${fmt(p.h)} mm · ${p.loops.length} ${t(p.loops.length === 1 ? 'contour1' : 'contours')}${p.kind === 'stl' ? ' · ' + t('fromStl') : ''}</div>${layerSel}${ign}${empty}</div>
      <div class="act"><label class="meta" title="${esc(t('useTitle'))}"><input type="checkbox" data-id="${p.id}" class="include"${p.include ? ' checked' : ''}> ${t('useIt')}</label>
      ${p.kind === 'stl' ? `<button class="link save-dxf" data-id="${p.id}">${t('saveDxf')}</button>` : ''}<button class="link remove" data-id="${p.id}">${t('remove')}</button></div>`;
    el.appendChild(d);
  }
  $('listTools').hidden = state.patterns.filter((q) => q.kind === 'stl').length < 2;
  renderInfo();
}
function renderInfo() {
  $('info').textContent = state.info ? t(state.info.k, ...state.info.a) : '';
}
function esc(s) {
  return String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );
}
$('list').addEventListener('click', (e) => {
  const sv = e.target.closest('.save-dxf');
  if (sv) {
    const q = state.patterns.find((x) => x.id == sv.dataset.id);
    if (q) save(Core.toDXF([{ loops: q.loops }]), q.name + '.dxf', 'application/dxf');
    return;
  }
  const b = e.target.closest('.remove');
  if (!b) return;
  markStale();
  state.patterns = state.patterns.filter((p) => p.id != b.dataset.id);
  if (!state.patterns.some((q) => q.kind === 'stl')) state.info = null;
  renderList();
});
$('list').addEventListener('change', (e) => {
  const p = state.patterns.find((q) => q.id == e.target.dataset.id);
  if (!p) return;
  markStale();
  if (e.target.classList.contains('include')) p.include = e.target.checked;
  if (e.target.classList.contains('layer-select')) {
    p.layer = e.target.value;
    Object.assign(p, Core.buildPattern(p.polys, p.unit, p.layer));
  }
  renderList();
});

/* ---------- filhantering ---------- */
const drop = $('drop'),
  fileIn = $('file');
drop.addEventListener('click', (e) => {
  if (e.target !== fileIn) fileIn.click();
});
drop.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileIn.click();
  }
});
fileIn.addEventListener('change', () => {
  handleFiles(fileIn.files);
  fileIn.value = '';
});
for (const ev of ['dragenter', 'dragover'])
  window.addEventListener(ev, (e) => {
    e.preventDefault();
    drop.classList.add('over');
  });
for (const ev of ['dragleave', 'drop'])
  window.addEventListener(ev, (e) => {
    e.preventDefault();
    if (ev === 'drop' || e.target === document.documentElement || e.relatedTarget === null)
      drop.classList.remove('over');
  });
window.addEventListener('drop', (e) => {
  if (e.dataTransfer && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
});

async function handleFiles(files) {
  $('msg').textContent = '';
  for (const f of Array.from(files)) {
    const ext = f.name.split('.').pop().toLowerCase();
    try {
      if (ext === 'dxf') await addDXF(f);
      else if (ext === 'stl') state.stlQueue.push(f);
      else if (['svg', 'png', 'jpg', 'jpeg'].includes(ext)) await addEngravePattern(f);
      else throw new Error(t('unknownType'));
    } catch (err) {
      $('msg').textContent = `${f.name}: ${msgOf(err)}`;
    }
  }
  renderList();
  renderEngravings();
  if (state.stlQueue.length && !$('dlg').open) nextStl();
}

async function addDXF(file) {
  const d = Core.parseDXF(await file.text());
  if (!d.polys.length) throw new Error(t('noGeometry'));
  const layers = Core.layerExtents(d.polys);
  const best = Object.keys(layers).sort((a, b) => layers[b].area - layers[a].area)[0];
  const pat = Core.buildPattern(d.polys, d.unit, best);
  markStale();
  state.patterns.push({
    id: state.nextId++,
    kind: 'dxf',
    name: file.name,
    polys: d.polys,
    unit: d.unit,
    layers,
    layer: best,
    ignored: d.ignored,
    include: true,
    ...pat,
  });
}
