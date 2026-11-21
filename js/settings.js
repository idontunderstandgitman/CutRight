'use strict';

function syncPrefer() {
  $('preferOut').textContent = t('preferOut', parseInt($('prefer').value, 10));
}
$('prefer').addEventListener('input', syncPrefer);

/* Remembered form values (a convenience only; storage may be unavailable). */
const KEYS = ['W', 'H', 'gap', 'margin'];
try {
  for (const k of KEYS) {
    const v = localStorage.getItem('nest_' + k);
    if (v) $(k).value = v;
  }
  if (localStorage.getItem('nest_rot') === '0') $('rot').checked = false;
} catch (e) {}
function saveSettings() {
  try {
    for (const k of KEYS) localStorage.setItem('nest_' + k, $(k).value);
    localStorage.setItem('nest_rot', $('rot').checked ? '1' : '0');
  } catch (e) {}
}
