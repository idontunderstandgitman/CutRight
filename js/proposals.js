'use strict';

function save(text, name, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const LEVEL_COLORS = [
  '#0b6bcb',
  '#d9480f',
  '#2b8a3e',
  '#9c36b5',
  '#c2255c',
  '#0c8599',
  '#e67700',
  '#5f3dc4',
  '#6b7280',
];
const lvColor = (lv) => LEVEL_COLORS[(lv / 5) % LEVEL_COLORS.length];
const tick = () => new Promise((r) => setTimeout(r, 30));

function computeLevel(lv) {
  const R = state.run;
  const r = Core.nest(R.pats, {
    W: R.W,
    H: R.H,
    gap: R.gap,
    margin: R.margin,
    rotate: R.rotate,
    prefer: lv / 100,
    cache: R.cache,
  });
  state.levels.set(lv, r);
  return r;
}
function sameLevel(lv) {
  // Lowest level that produced an identical layout
  const sig = (r) => r.counts.join(',') + '|' + r.parts.length;
  const mine = sig(state.levels.get(lv));
  for (const k of [...state.levels.keys()].sort((a, b) => a - b))
    if (k < lv && sig(state.levels.get(k)) === mine) return k;
  return null;
}
function renderLevels(pending) {
  const box = $('props');
  box.innerHTML = '';
  const keys = [...state.levels.keys()].sort((a, b) => a - b);
  for (const lv of keys) {
    const r = state.levels.get(lv),
      R = state.run,
      same = sameLevel(lv);
    const d = document.createElement('button');
    d.className = 'proposal' + (lv === state.sel ? ' sel' : '');
    d.style.borderColor = lvColor(lv);
    d.dataset.lv = lv;
    d.type = 'button';
    d.innerHTML = `<svg viewBox="-1 -1 ${R.W + 2} ${R.H + 2}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path fill="none" d="${r.parts.map((p) => Core.pathD(p.loops, R.H)).join('')}"/></svg>
      <b style="color:${lvColor(lv)}">${lv} %</b><span>${fmt((100 * r.used) / r.total)} % · ${t('partsN', r.parts.length)}</span>${same != null ? `<span class="muted">${t('sameAs', same)}</span>` : ''}`;
    box.appendChild(d);
  }
  if (pending != null) {
    const d = document.createElement('div');
    d.className = 'proposal pending';
    d.textContent = t('calc') + ' ' + pending + ' %';
    box.appendChild(d);
  }
  // Coloured dots on the slider
  const max = +$('prefer').max,
    dots = $('dots');
  dots.innerHTML = '';
  for (const lv of keys) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dot' + (lv === state.sel ? ' sel' : '');
    b.dataset.lv = lv;
    b.style.background = lvColor(lv);
    b.style.left = `calc(8px + (100% - 16px) * ${lv / max})`;
    b.title = lv + ' %';
    b.setAttribute('aria-label', lv + ' %');
    b.disabled = state.stale;
    dots.appendChild(b);
  }
}
function selectLevel(lv, scroll) {
  const r = state.levels.get(lv);
  if (!r) return;
  state.sel = lv;
  $('prefer').value = lv;
  syncPrefer();
  levelHint();
  state.result = { r, W: state.run.W, H: state.run.H, pats: state.run.pats };
  renderLevels();
  showResult(!!scroll);
}
$('props').addEventListener('click', (e) => {
  const b = e.target.closest('.proposal[data-lv]');
  if (b) selectLevel(+b.dataset.lv);
});
$('dots').addEventListener('click', (e) => {
  const b = e.target.closest('.dot');
  if (b && !state.stale) selectLevel(+b.dataset.lv);
});
let pDown = null;
function levelHint() {
  const lv = parseInt($('prefer').value, 10);
  const show = !!state.run && !state.stale && !state.busy && !state.levels.has(lv);
  $('lvHint').hidden = !show;
  if (show) $('lvHint').textContent = t('lvHint', lv);
  const g = $('ghost');
  g.hidden = !show;
  if (show) g.style.left = `calc(8px + (100% - 16px) * ${lv / +$('prefer').max})`;
}
async function generateLevel(lv) {
  state.busy = true;
  $('prefer').disabled = true;
  levelHint();
  renderLevels(lv);
  await tick();
  try {
    computeLevel(lv);
  } catch (err) {
    $('msg').textContent = t('errPrefix') + err.message;
  }
  $('prefer').disabled = false;
  state.busy = false;
  if (state.levels.has(lv)) selectLevel(lv);
  else {
    renderLevels();
    levelHint();
  }
}
// A deliberate click on the handle (without moving it) generates the level; dragging or clicking the track only moves the slider.
async function deliberate() {
  if (!state.run || state.stale || state.busy) return;
  const lv = parseInt($('prefer').value, 10);
  if (state.levels.has(lv)) selectLevel(lv);
  else await generateLevel(lv);
}
$('prefer').addEventListener('pointerdown', (e) => {
  pDown = { v: $('prefer').value, x: e.clientX, y: e.clientY };
});
$('prefer').addEventListener('pointerup', (e) => {
  const d = pDown;
  pDown = null;
  if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 4 && $('prefer').value === d.v)
    deliberate();
});
$('prefer').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    deliberate();
  }
});
$('prefer').addEventListener('input', () => {
  syncPrefer();
  levelHint();
});
$('prefer').addEventListener('change', () => {
  const lv = parseInt($('prefer').value, 10);
  if (state.run && !state.stale && state.levels.has(lv)) selectLevel(lv);
  else levelHint();
});
function markStale() {
  if (state.levels.size && !state.stale) {
    state.stale = true;
    $('stale').hidden = false;
    renderLevels();
    levelHint();
  }
}
for (const id of ['W', 'H', 'gap', 'margin', 'rot']) $(id).addEventListener('input', markStale);

$('go').onclick = async () => {
  const msg = $('msg');
  msg.textContent = '';
  const W = parseFloat($('W').value),
    H = parseFloat($('H').value),
    gap = parseFloat($('gap').value) || 0,
    margin = parseFloat($('margin').value) || 0;
  const pats = state.patterns.filter((p) => p.include && p.loops.length && p.w > 0 && p.h > 0);
  if (!pats.length) {
    msg.textContent = t('addFirst');
    return;
  }
  if (!(W > 0 && H > 0)) {
    msg.textContent = t('enterSize');
    return;
  }
  saveSettings();
  $('go').disabled = true;
  $('go').textContent = t('calc');
  state.run = { W, H, gap, margin, rotate: $('rot').checked, pats, cache: {} };
  state.levels.clear();
  state.stale = false;
  $('stale').hidden = true;
  state.sel = 10;
  try {
    await tick();
    const first = computeLevel(10);
    if (!first.parts.length) {
      msg.textContent = t('noFit');
      $('res').hidden = true;
      state.levels.clear();
      return;
    }
    $('res').hidden = false;
    selectLevel(10, true);
    for (const lv of [0, 20]) {
      renderLevels(lv);
      await tick();
      computeLevel(lv);
      renderLevels();
    }
  } catch (err) {
    msg.textContent = t('errPrefix') + err.message;
  } finally {
    $('go').disabled = false;
    $('go').textContent = t('go');
  }
};
function showResult(scroll = true) {
  const { r, W, H, pats } = state.result;
  const pct = (100 * r.used) / r.total;
  const unused = r.counts.filter((n) => n === 0).length;
  let rows = pats
    .map((p, i) =>
      r.counts[i] === 0
        ? ''
        : `<tr><td>${r.counts[i]} ${t('pcs')}</td><td>${esc(p.name)}</td><td>${fmt(p.w)} × ${fmt(p.h)} mm</td></tr>`,
    )
    .join('');
  $('stats').innerHTML =
    `<div><span class="headline">${fmt(pct)} %</span> ${t('cover', r.parts.length)}</div><table>${rows}</table>${unused ? `<div class="note">${t('unusedN', unused)}</div>` : ''}${r.bestPossible > r.used * 1.001 ? `<div class="note">${t('smallerCould', fmt((100 * r.bestPossible) / r.total))}</div>` : ''}`;
  $('prev').innerHTML = Core.toSVG(r.parts, W, H);
  $('res').hidden = false;
  if (scroll) $('res').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
const base = () => `${t('filePrefix')}${state.result.W}x${state.result.H}`;
$('dDxf').onclick = () =>
  save(Core.toDXF(state.result.r.parts), base() + '.dxf', 'application/dxf');
$('dPdf').onclick = async () => {
  try {
    save(await buildPdf(), base() + '.pdf', 'application/pdf');
  } catch (err) {
    $('msg').textContent = t('errPrefix') + msgOf(err);
  }
};
$('dSvg').onclick = () =>
  save(
    Core.toSVG(state.result.r.parts, state.result.W, state.result.H),
    base() + '.svg',
    'image/svg+xml',
  );
