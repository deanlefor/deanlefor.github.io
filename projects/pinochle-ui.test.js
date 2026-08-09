'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname,'pinochle.html'),'utf8');

test('Pinochle setup fields align from the top when the player-count note appears',() => {
  assert.match(source,/\.settings\{[\s\S]*?align-items:start;/);
});

test('Pinochle player-count lock guidance uses a compact accessible tooltip',() => {
  assert.match(source,/class="count-lock-note count-lock-help"/);
  assert.match(source,/aria-label="Player count locked"/);
  assert.match(source,/aria-describedby="playerCountLockTooltip"/);
  assert.match(source,/class="count-lock-tooltip"[^>]*role="tooltip">Start a new game to change the player count\.<\/span>/);
  assert.match(source,/\.settings \.count-lock-help\[hidden\]\{display:none\}/);
  assert.match(source,/\.count-lock-help:hover \.count-lock-tooltip,\.count-lock-help:focus-visible \.count-lock-tooltip/);
});

test('Pinochle keeps current scores above the running tally',() => {
  const scorePanel = source.indexOf('id="currentScoreGrid"');
  const runningTally = source.indexOf('>Running Tally<');
  assert.ok(scorePanel > -1 && runningTally > scorePanel);
  assert.match(source,/function renderCurrentScores\(\)/);
  assert.match(source,/const totals = cumulativeTotals\(\)/);
  assert.match(source,/current-score-total/);
});

test('Pinochle score cards highlight and immediately update the round dealer',() => {
  assert.match(source,/card\.className = 'current-score-card' \+ \(isDealer \? ' is-dealer' : ''\)/);
  assert.match(source,/class="dealer-badge">Dealer · R/);
  assert.match(source,/getElementById\('dealer'\)\.addEventListener\('change',[\s\S]*?renderCurrentScores\(\)/);
});
