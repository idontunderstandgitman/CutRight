/**
 * Exporters: DXF (R12), SVG and PDF writers.
 */
(function (Core) {
  'use strict';

  const f3 = (v) => (Math.round(v * 1000) / 1000).toString();

  function toDXF(parts) {
    // R12 (AC1009): widest compatibility, no handles required
    const o = [
      '0',
      'SECTION',
      '2',
      'HEADER',
      '9',
      '$ACADVER',
      '1',
      'AC1009',
      '0',
      'ENDSEC',
      '0',
      'SECTION',
      '2',
      'TABLES',
      '0',
      'TABLE',
      '2',
      'LTYPE',
      '70',
      '1',
      '0',
      'LTYPE',
      '2',
      'CONTINUOUS',
      '70',
      '0',
      '3',
      'Solid line',
      '72',
      '65',
      '73',
      '0',
      '40',
      '0.0',
      '0',
      'ENDTAB',
      '0',
      'TABLE',
      '2',
      'LAYER',
      '70',
      '1',
      '0',
      'LAYER',
      '2',
      'CUT',
      '70',
      '0',
      '62',
      '1',
      '6',
      'CONTINUOUS',
      '0',
      'ENDTAB',
      '0',
      'ENDSEC',
      '0',
      'SECTION',
      '2',
      'ENTITIES',
    ];
    for (const p of parts)
      for (const l of p.loops) {
        o.push('0', 'POLYLINE', '8', 'CUT', '66', '1', '70', l.closed ? '1' : '0');
        for (const [x, y] of l.pts) o.push('0', 'VERTEX', '8', 'CUT', '10', f3(x), '20', f3(y));
        o.push('0', 'SEQEND', '8', 'CUT');
      }
    o.push('0', 'ENDSEC', '0', 'EOF');
    return o.join('\n') + '\n';
  }

  function pathD(loops, flipH) {
    const fy = (y) => (flipH === undefined ? y : flipH - y);
    return loops
      .map(
        (l) =>
          'M' + l.pts.map(([x, y]) => f3(x) + ' ' + f3(fy(y))).join('L') + (l.closed ? 'Z' : ''),
      )
      .join('');
  }

  function toSVG(parts, W, H, stroke = '#d00') {
    const d = parts.map((p) => pathD(p.loops, H)).join('');
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">` +
      `<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#888" stroke-width="0.3" stroke-dasharray="3 2"/>` +
      `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="0.25" stroke-linejoin="round"/></svg>`
    );
  }

  /**
   * Writes a one-page PDF (page = workpiece, 1:1) and returns its bytes.
   * opt.images[i] is an optional engraving bitmap for parts[i]:
   *   { w, h, data: Uint8Array, flate: boolean }  with 1 bit per pixel, 0 = engrave (black).
   * The bitmap covers the footprint box of the part and is clipped to the part's outline
   * (even-odd, so holes stay clear). The cut lines are drawn on top as thin vector lines.
   */
  function toPDF(parts, W, H, opt = {}) {
    const lineMm = opt.lineMm > 0 ? opt.lineMm : 0.01;
    const hex = /^#[0-9a-f]{6}$/i.test(opt.color || '') ? opt.color : '#ff0000';
    const rgb = [1, 3, 5].map((i) => (parseInt(hex.substr(i, 2), 16) / 255).toFixed(3)).join(' ');
    const k = 72 / 25.4;
    const pw = W * k;
    const ph = H * k;
    const num = (v) => (v * k).toFixed(2);
    const pathOps = (loops) =>
      loops
        .map(
          (l) =>
            l.pts.map(([x, y], i) => num(x) + ' ' + num(y) + (i ? ' l' : ' m')).join('\n') +
            (l.closed ? '\nh' : ''),
        )
        .join('\n');

    // Unique images, so that parts sharing a bitmap embed it once.
    const images = [];
    const imageIndex = new Map();
    const c = [];
    if (opt.frame)
      c.push(`0.5 G 0.4 w [4 3] 0 d 0 0 ${pw.toFixed(2)} ${ph.toFixed(2)} re S [] 0 d`);
    parts.forEach((p, i) => {
      const img = opt.images && opt.images[i];
      if (!img) return;
      if (!imageIndex.has(img)) {
        imageIndex.set(img, images.length);
        images.push(img);
      }
      c.push(
        'q',
        pathOps(p.loops),
        'W* n',
        `${num(p.w)} 0 0 ${num(p.h)} ${num(p.x)} ${num(p.y)} cm`,
        `/Im${imageIndex.get(img)} Do`,
        'Q',
      );
    });
    c.push(`${rgb} RG ${(lineMm * k).toFixed(5)} w 1 j`);
    // Each loop is stroked on its own, so open loops are never closed by accident.
    for (const p of parts) for (const l of p.loops) c.push(pathOps([l]) + '\nS');

    const enc = new TextEncoder();
    const chunks = [];
    const offsets = [];
    let size = 0;
    const push = (bytes) => {
      chunks.push(bytes);
      size += bytes.length;
    };
    const text = (str) => push(enc.encode(str));
    const object = (n, dict, stream) => {
      offsets[n] = size;
      text(`${n} 0 obj\n`);
      if (stream) {
        text(`<<${dict}/Length ${stream.length}>>\nstream\n`);
        push(stream);
        text('\nendstream');
      } else {
        text(dict);
      }
      text('\nendobj\n');
    };

    const xobjects = images.map((_, i) => `/Im${i} ${5 + i} 0 R`).join('');
    text('%PDF-1.4\n');
    object(1, '<</Type/Catalog/Pages 2 0 R>>');
    object(2, '<</Type/Pages/Kids[3 0 R]/Count 1>>');
    object(
      3,
      `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${pw.toFixed(2)} ${ph.toFixed(2)}]/Contents 4 0 R/Resources<</XObject<<${xobjects}>>>>>>`,
    );
    object(4, '', enc.encode(c.join('\n')));
    images.forEach((img, i) => {
      object(
        5 + i,
        `/Type/XObject/Subtype/Image/Width ${img.w}/Height ${img.h}/ColorSpace/DeviceGray/BitsPerComponent 1` +
          (img.flate ? '/Filter/FlateDecode' : ''),
        img.data,
      );
    });
    const count = 5 + images.length;
    const xref = size;
    text(`xref\n0 ${count}\n0000000000 65535 f \n`);
    for (let n = 1; n < count; n++) text(String(offsets[n]).padStart(10, '0') + ' 00000 n \n');
    text(`trailer\n<</Size ${count}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`);

    const out = new Uint8Array(size);
    let at = 0;
    for (const ch of chunks) {
      out.set(ch, at);
      at += ch.length;
    }
    return out;
  }

  Object.assign(Core, { toDXF, toSVG, toPDF, pathD });
})((globalThis.Core = globalThis.Core || {}));
