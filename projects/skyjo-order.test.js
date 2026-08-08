'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname,'skyjo.html'),'utf8');
const standingsSource = source.match(/function renderStandings\(\)\{([\s\S]*?)\n\}/);

test('Skyjo standings retain the original player order',() => {
  assert.ok(standingsSource,'renderStandings must remain present');
  assert.match(standingsSource[1],/visiblePlayers\(\)\.forEach\(i\s*=>/);
  assert.doesNotMatch(standingsSource[1],/\.sort\s*\(/);
  assert.doesNotMatch(standingsSource[1],/class=["']rank["']/);
});
