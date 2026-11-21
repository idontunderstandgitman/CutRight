'use strict';

/**
 * Engraving bitmaps: turns a pattern image (SVG, PNG or JPG) into a 1-bit bitmap per part.
 * The bitmap is anchored at the part's own corner and turns with the part when it is rotated,
 * so every copy of a design gets the same look. The PDF writer clips it to the part outline.
 */
const Engrave = (() => {
  const MM_PER_CSS_PX = 25.4 / 96;
  const MAX_PIXELS = 50e6; // per part; the resolution is lowered for very large parts

  /** Reads the natural size (in CSS px) of an SVG from its width/height or viewBox attributes. */
  function svgSize(svgText) {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const root = doc.documentElement;
    if (!root || root.nodeName.toLowerCase() !== 'svg') return null;
    const len = (name) => {
      const v = parseFloat(root.getAttribute(name));
      return v > 0 ? v : 0;
    };
    let w = len('width');
    let h = len('height');
    if (!(w && h)) {
      const vb = (root.getAttribute('viewBox') || '')
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) [w, h] = [vb[2], vb[3]];
    }
    return w && h ? { w, h } : null;
  }

  /** Loads a pattern file. Resolves to { name, url, img, w, h } with w/h in CSS px. */
  async function load(file) {
    let size = null;
    if (/\.svg$/i.test(file.name)) size = svgSize(await file.text());
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch (err) {
      URL.revokeObjectURL(url);
      throw new Error('ERR_PATTERN_LOAD');
    }
    size = size || { w: img.naturalWidth, h: img.naturalHeight };
    if (!(size.w > 0 && size.h > 0)) {
      URL.revokeObjectURL(url);
      throw new Error('ERR_PATTERN_LOAD');
    }
    return { name: file.name, url, img, w: size.w, h: size.h };
  }

  /** Size of one repeat in mm at the given scale (percent). */
  function repeatMm(pattern, scalePct) {
    const f = (MM_PER_CSS_PX * scalePct) / 100;
    return { w: pattern.w * f, h: pattern.h * f };
  }

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  /**
   * Renders one repeat as a grey tile where black = engrave. The less frequent of the two
   * tones becomes the engraved one (usually the lines), unless `invert` flips that.
   */
  function makeCell(pattern, scalePct, dpi, invert) {
    const mm = repeatMm(pattern, scalePct);
    const w = Math.max(1, Math.round((mm.w * dpi) / 25.4));
    const h = Math.max(1, Math.round((mm.h * dpi) / 25.4));
    const canvas = makeCanvas(w, h);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(pattern.img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;
    let bright = 0;
    for (let i = 0; i < px.length; i += 4) {
      px[i] = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
      if (px[i] >= 128) bright++;
    }
    const engraveBright = bright < (w * h) / 2 !== !!invert;
    for (let i = 0; i < px.length; i += 4) {
      const g = engraveBright ? 255 - px[i] : px[i];
      px[i] = px[i + 1] = px[i + 2] = g;
      px[i + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
    return canvas;
  }

  async function compress(bytes) {
    if (typeof CompressionStream === 'undefined') return { data: bytes, flate: false };
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
    return { data: new Uint8Array(await new Response(stream).arrayBuffer()), flate: true };
  }

  /** Draws the pattern inside the footprint of one part and packs it as a 1-bit bitmap. */
  async function renderPart(part, cell, dpi, inset) {
    const wPx = Math.max(1, Math.round((part.w * dpi) / 25.4));
    const hPx = Math.max(1, Math.round((part.h * dpi) / 25.4));
    const canvas = makeCanvas(wPx, hPx);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, wPx, hPx);

    // The pattern is laid out in the part's own orientation. For a part turned 90°
    // the whole pattern is turned with it.
    ctx.fillStyle = ctx.createPattern(cell, 'repeat');
    if (part.rot) {
      ctx.setTransform(0, -1, 1, 0, 0, hPx);
      ctx.fillRect(0, 0, hPx, wPx);
    } else {
      ctx.fillRect(0, 0, wPx, hPx);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Optional free border along the cut line: paint the outline with the background tone.
    if (inset > 0) {
      const sx = wPx / part.w;
      const sy = hPx / part.h;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2 * inset * ((sx + sy) / 2);
      ctx.lineJoin = 'round';
      for (const l of part.loops) {
        ctx.beginPath();
        l.pts.forEach(([x, y], i) => {
          const cx = (x - part.x) * sx;
          const cy = (part.y + part.h - y) * sy;
          if (i) ctx.lineTo(cx, cy);
          else ctx.moveTo(cx, cy);
        });
        if (l.closed) ctx.closePath();
        ctx.stroke();
      }
    }

    const rgba = ctx.getImageData(0, 0, wPx, hPx).data;
    const rowBytes = Math.ceil(wPx / 8);
    const bits = new Uint8Array(rowBytes * hPx).fill(255);
    for (let y = 0; y < hPx; y++) {
      for (let x = 0; x < wPx; x++) {
        if (rgba[(y * wPx + x) * 4] < 128) bits[y * rowBytes + (x >> 3)] &= ~(0x80 >> (x & 7));
      }
    }
    const packed = await compress(bits);
    return { w: wPx, h: hPx, data: packed.data, flate: packed.flate };
  }

  /**
   * Picks a random pattern for each part. The patterns are dealt like a shuffled deck, so all
   * of them are used about equally often, and the same pattern never comes twice in a row
   * (as long as there are at least two patterns).
   */
  function assign(partCount, patternCount, random = Math.random) {
    const picks = [];
    let deck = [];
    while (picks.length < partCount) {
      if (!deck.length) {
        deck = Array.from({ length: patternCount }, (_, i) => i);
        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        // Do not start the new deck with the pattern that ended the previous one.
        const last = picks[picks.length - 1];
        if (patternCount > 1 && deck[deck.length - 1] === last) {
          [deck[0], deck[deck.length - 1]] = [deck[deck.length - 1], deck[0]];
        }
      }
      picks.push(deck.pop());
    }
    return picks;
  }

  /**
   * Renders the engraving of every part, with a random pattern per part (see assign).
   * Returns an array of bitmaps (one per part); identical bitmaps are shared.
   */
  async function render(parts, patterns, opt, onProgress) {
    const cells = new Map();
    const cache = new Map();
    const images = [];
    const picks = assign(parts.length, patterns.length);
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const pi = picks[i];
      const key = `${part.idx}|${part.rot ? 1 : 0}|${pi}`;
      if (!cache.has(key)) {
        // Lower the resolution if the part would need too many pixels.
        const px = ((part.w * opt.dpi) / 25.4) * ((part.h * opt.dpi) / 25.4);
        const dpi = px > MAX_PIXELS ? opt.dpi * Math.sqrt(MAX_PIXELS / px) : opt.dpi;
        const cellKey = `${pi}|${dpi.toFixed(2)}`;
        if (!cells.has(cellKey)) {
          cells.set(cellKey, makeCell(patterns[pi], opt.scale, dpi, opt.invert));
        }
        cache.set(key, await renderPart(part, cells.get(cellKey), dpi, opt.inset));
        await new Promise((r) => setTimeout(r));
      }
      images.push(cache.get(key));
      if (onProgress) onProgress(i + 1, parts.length);
    }
    return images;
  }

  return { load, render, assign, repeatMm, svgSize };
})();
