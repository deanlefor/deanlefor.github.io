'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname,'hf-score.html'),'utf8');
const libraryHtml = fs.readFileSync(path.join(__dirname,'scorecards.html'),'utf8');

test('Hand & Foot offers exactly two through eight individual players',() => {
  const counts = Array.from(html.matchAll(/data-count="(\d+)"/g),match => Number(match[1]));
  assert.deepEqual(counts,[2,3,4,5,6,7,8]);
  assert.match(html,/<span class="label">Players<\/span>/);
  assert.match(html,/Scores are tracked separately for 2–8 individual players/);
  assert.doesNotMatch(html,/data-mode="teams"/);
  assert.doesNotMatch(html,/id="gameMode"/);
  assert.doesNotMatch(html,/getElementById\('gameMode'\)/);
  assert.match(libraryHtml,/Hand &amp; Foot Scorecard[\s\S]*?<span class="tracker-tag">2–8 players<\/span>/);
});

test('current and future scorecards normalize to singles',() => {
  assert.match(html,/const DEFAULT_GAME_MODE = 'singles'/);
  assert.match(html,/function normalizeState\(saved,preserveLegacyMode = false\)/);
  assert.match(html,/: DEFAULT_GAME_MODE;/);
  assert.match(html,/aria-label',`Player \$\{i\+1\} name`/);
});

test('legacy team archives remain identifiable without changing their stored records',() => {
  assert.match(html,/normalizeState\(gameSource,true\)/);
  assert.match(html,/Legacy team record/);
  assert.match(html,/game\.gameMode === 'teams' \? 'Team' : 'Player'/);
});
