'use strict';

function buildLog() {
  const L = [],
    line = (x = '') => L.push(x),
    n = (v, d = 1) => (+v).toFixed(d),
    now = new Date();
  line('DXF Nester – log');
  line('Generated: ' + now.toISOString());
  line('Browser: ' + navigator.userAgent);
  line('UI language: ' + lang);
  line('');
  line('== SETTINGS (current form values) ==');
  line(`Workpiece: ${$('W').value} x ${$('H').value} mm`);
  line(
    `Gap between parts: ${$('gap').value} mm; margin to edge: ${$('margin').value} mm; 90° rotation: ${$('rot').checked ? 'allowed' : 'not allowed'}`,
  );
  line(
    `PDF export: line width ${$('pdfW').value} mm, colour ${$('pdfC').value}, workpiece frame ${$('pdfF').checked ? 'on' : 'off'}`,
  );
  line(
    `Engraving patterns (${state.engravings.length}): ` +
      (state.engravings.length
        ? state.engravings.map((p) => p.name).join(', ') +
          `; enabled: ${$('engOn').checked ? 'yes' : 'no'}; ${$('engDpi').value} DPI; scale ${$('engScale').value} %; edge margin ${$('engInset').value} mm; invert ${$('engInvert').checked ? 'yes' : 'no'}`
        : '-'),
  );
  line('');
  line(`== INPUT DESIGNS (${state.patterns.length}) ==`);
  if (!state.patterns.length) line('(none)');
  state.patterns.forEach((p, i) => {
    const pts = p.loops.reduce((a, l) => a + l.pts.length, 0);
    line(`${i + 1}. ${p.name}`);
    line(
      `   source: ${p.kind === 'stl' ? 'STL face' : 'DXF'}; size: ${n(p.w, 2)} x ${n(p.h, 2)} mm; contours: ${p.loops.length}; points: ${pts}; used in nesting: ${p.include ? 'yes' : 'no'}`,
    );
    if (p.kind === 'dxf') {
      line(
        `   layer used: ${p.layer === '*' ? '(all layers)' : p.layer}; layers in file: ${Object.keys(p.layers).join(', ')}; unit factor to mm: ${p.unit}`,
      );
      if (p.ignored && Object.keys(p.ignored).length)
        line(
          '   ignored objects: ' +
            Object.entries(p.ignored)
              .map(([k, v]) => k + 'x' + v)
              .join(', '),
        );
    }
  });
  line('');
  line('== RESULTS ==');
  if (!state.run || !state.levels.size) {
    line('(no result generated yet)');
  } else {
    const R = state.run;
    line(
      `Computed for: workpiece ${R.W} x ${R.H} mm, gap ${R.gap} mm, margin ${R.margin} mm, rotation ${R.rotate ? 'allowed' : 'not allowed'}`,
    );
    line(`Designs in the computation (${R.pats.length}): ${R.pats.map((p) => p.name).join(', ')}`);
    if (state.stale)
      line('NOTE: inputs have changed since this was computed (results are out of date).');
    const keys = [...state.levels.keys()].sort((a, b) => a - b);
    line(`Generated levels: ${keys.map((k) => k + ' %').join(', ')}; selected: ${state.sel} %`);
    for (const lv of keys) {
      const r = state.levels.get(lv),
        same = sameLevel(lv);
      line('');
      line(
        `-- Level ${lv} % (accept up to ${lv} % less coverage for bigger parts)${lv === state.sel ? '  [SELECTED]' : ''}${same != null ? `  (same layout as ${same} %)` : ''}`,
      );
      line(
        `   coverage: ${n((100 * r.used) / r.total)} % of workpiece (${n(r.used, 0)} of ${n(r.total, 0)} mm²); parts: ${r.parts.length}; best possible coverage with any sizes: ${n((100 * r.bestPossible) / r.total)} %`,
      );
      line('   designs that ended up in the layout:');
      R.pats.forEach((p, i) => {
        if (r.counts[i])
          line(`     ${String(r.counts[i]).padStart(3)} x ${p.name} (${n(p.w)} x ${n(p.h)} mm)`);
      });
      const unused = R.pats.filter((p, i) => !r.counts[i]);
      line(
        `   designs NOT used (${unused.length}): ${unused.length ? unused.map((p) => p.name).join(', ') : '-'}`,
      );
      line('   placements (x, y = lower-left corner in mm; w x h = footprint):');
      r.parts.forEach((q, i) =>
        line(
          `     ${String(i + 1).padStart(3)}. ${R.pats[q.idx].name}  x=${n(q.x)} y=${n(q.y)}  ${n(q.w)} x ${n(q.h)}${q.rot ? '  rotated 90°' : ''}`,
        ),
      );
    }
  }
  line('');
  line('== PAGE MESSAGES ==');
  line('Message: ' + ($('msg').textContent || '-'));
  line('Info: ' + ($('info').textContent || '-'));
  line(
    'Result summary: ' + (state.result ? $('stats').innerText.replace(/\s*\n\s*/g, ' | ') : '-'),
  );
  return L.join('\n') + '\n';
}
$('logBtn').onclick = () => {
  const d = new Date(),
    z = (v) => String(v).padStart(2, '0');
  save(
    buildLog(),
    `nester-log_${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}.txt`,
    'text/plain',
  );
};
