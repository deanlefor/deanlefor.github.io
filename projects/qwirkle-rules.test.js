'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const rules = require('./qwirkle-rules.js');

function state(finishingPlayer){
  return rules.normalizeState({
    playerCount:3,
    players:['A','B','C','D'],
    rows:[{scores:[10,20,30,null]}],
    finishingPlayer
  });
}

test('Qwirkle normalization preserves a null finishing player and gives no bonus',() => {
  const game = state(null);
  assert.equal(game.finishingPlayer,null);
  assert.deepEqual(rules.totalsForGame(game),[10,20,30,0]);
});

test('Qwirkle awards +6 to player 0 only when player 0 is explicit',() => {
  assert.deepEqual(rules.totalsForGame(state(0)),[16,20,30,0]);
  assert.equal(state('').finishingPlayer,null);
  assert.equal(state(undefined).finishingPlayer,null);
});

test('Qwirkle awards +6 to other explicit finishing-player indexes',() => {
  assert.deepEqual(rules.totalsForGame(state(1)),[10,26,30,0]);
  assert.deepEqual(rules.totalsForGame(state('2')),[10,20,36,0]);
});

test('Qwirkle archived and reloaded totals are stable',() => {
  const original = state(2);
  const before = rules.totalsForGame(original);
  const reloaded = rules.normalizeState(JSON.parse(JSON.stringify(original)));
  assert.deepEqual(rules.totalsForGame(reloaded),before);
  assert.deepEqual(rules.leaderIndexes(reloaded),[2]);
});
