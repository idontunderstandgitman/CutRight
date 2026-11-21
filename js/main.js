'use strict';

function applyStatic() {
  document.documentElement.lang = lang;
  document.title = t('title');
  document.querySelectorAll('[data-i]').forEach((el) => {
    el.textContent = t(el.dataset.i);
  });
  document.querySelectorAll('[data-ih]').forEach((el) => {
    el.innerHTML = t(el.dataset.ih);
  });
  document.querySelectorAll('[data-it]').forEach((el) => {
    el.title = t(el.dataset.it);
  });
  document.querySelectorAll('[data-ia]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.ia));
  });
  document
    .querySelectorAll('.lang button')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  if (!$('go').disabled) $('go').textContent = t('go');
  updateAutoBtn();
  renderInfo();
  renderEngravings();
  syncPrefer();
  if (state.levels.size) {
    renderLevels();
    levelHint();
  }
}
document.querySelectorAll('.lang button').forEach((b) =>
  b.addEventListener('click', () => {
    lang = b.dataset.lang;
    try {
      localStorage.setItem('nest_lang', lang);
    } catch (e) {}
    $('msg').textContent = '';
    applyStatic();
    renderList();
    if (state.result) showResult(false);
    if ($('dlg').open) setStlInfo();
  }),
);
applyStatic();
renderList();
