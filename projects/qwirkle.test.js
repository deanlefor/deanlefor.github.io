'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname,'qwirkle.html'),'utf8');

test('Qwirkle uses the official player range and has no target-score setting',() => {
  assert.match(source,/data-count="2"/);
  assert.match(source,/data-count="3"/);
  assert.match(source,/data-count="4"/);
  assert.doesNotMatch(source,/targetScore|Playing To/);
});

test('the draft starts with 15 row-major turn entries and can extend by five',() => {
  assert.match(source,/const INITIAL_ROWS = 15;/);
  assert.match(source,/const ROW_INCREMENT = 5;/);
  assert.match(source,/state\.rows\.forEach\(\(row,rowIndex\)=>\{[\s\S]*?players\.forEach\(index=>\{/);
  assert.match(source,/<button class="btn" id="addRowsBtn" type="button">Add 5 Turns<\/button>/);
});

test('official scoring directions and bonuses are explicit',() => {
  assert.match(source,/Count every tile in each affected line/);
  assert.match(source,/A Qwirkle scores 6 \+ a 6-point bonus/);
  assert.match(source,/const END_BONUS = 6;/);
  assert.match(source,/totals\[game\.finishingPlayer\] \+= END_BONUS/);
  assert.match(source,/Highest total wins/);
  assert.match(source,/mindware\.orientaltrading\.com\/pdf\/instructions\/32016\.pdf/);
});

test('finishing requires scores and the player who went out',() => {
  assert.match(source,/if\(!hasAnyScore\(\)\)/);
  assert.match(source,/if\(state\.finishingPlayer === null\)/);
  assert.match(source,/Select the player who went out/);
});
