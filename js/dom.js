'use strict';

const $ = (id) => document.getElementById(id);
const state = {
  patterns: [],
  engravings: [],
  nextId: 1,
  result: null,
  stlQueue: [],
  info: null,
  run: null,
  levels: new Map(),
  sel: 10,
  stale: false,
};
const fmt = (v, d = 1) => (lang === 'sv' ? v.toFixed(d).replace('.', ',') : v.toFixed(d));
