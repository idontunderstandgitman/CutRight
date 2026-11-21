'use strict';

/* Engraving patterns: the list in step 1, the engraving settings and the PDF download. */

async function addEngravePattern(file) {
  const pattern = await Engrave.load(file);
  state.engravings.push({ id: state.nextId++, ...pattern });
}

function renderEngravings() {
  const list = $('engraveList');
  list.innerHTML = '';
  for (const p of state.engravings) {
    const size = Engrave.repeatMm(p, parseFloat($('engScale').value) || 100);
    const item = document.createElement('div');
    item.className = 'engrave-item';
    item.innerHTML = `<img src="${p.url}" alt="" />
      <div><div class="name">${esc(p.name)}</div>
        <div class="meta">${t('engraveRepeat', fmt(size.w), fmt(size.h))}</div></div>
      <button type="button" class="link remove-pattern" data-id="${p.id}">${t('remove')}</button>`;
    list.appendChild(item);
  }
  const any = state.engravings.length > 0;
  $('engrave').hidden = !any;
  $('engraveOpts').hidden = !any;
}

$('engraveList').addEventListener('click', (e) => {
  const button = e.target.closest('.remove-pattern');
  if (!button) return;
  const found = state.engravings.find((p) => p.id == button.dataset.id);
  if (found) URL.revokeObjectURL(found.url);
  state.engravings = state.engravings.filter((p) => p.id != button.dataset.id);
  renderEngravings();
});
$('engScale').addEventListener('input', renderEngravings);

/** Builds the PDF for the selected result, with engraving bitmaps when patterns are loaded. */
async function buildPdf() {
  const { r, W, H } = state.result;
  let images;
  if (state.engravings.length && $('engOn').checked) {
    const button = $('dPdf');
    button.disabled = true;
    try {
      images = await Engrave.render(
        r.parts,
        state.engravings,
        {
          dpi: parseFloat($('engDpi').value) || 600,
          scale: parseFloat($('engScale').value) || 100,
          inset: parseFloat($('engInset').value) || 0,
          invert: $('engInvert').checked,
        },
        (done, total) => {
          button.textContent = t('engRendering', done, total);
        },
      );
    } finally {
      button.disabled = false;
      button.textContent = t('dPdf');
    }
  }
  return Core.toPDF(r.parts, W, H, {
    lineMm: parseFloat($('pdfW').value),
    color: $('pdfC').value,
    frame: $('pdfF').checked,
    images,
  });
}
