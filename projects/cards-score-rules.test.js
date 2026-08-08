'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const rules = require('./cards-score-rules.js');

test('Flexible Cards keeps positive and negative values in cumulative totals',() => {
  const game = {playerCount:3,rounds:[{scores:[10,-5,0]},{scores:[-3,20,7]}]};
  assert.deepEqual(rules.totalsForGame(game),[7,15,7]);
});

test('Flexible Cards supports high-score and low-score winners including ties',() => {
  const game = {playerCount:3,rounds:[],winnerMode:'high'};
  assert.deepEqual(rules.leaderIndexes(game,[10,20,20]),[1,2]);
  game.winnerMode = 'low';
  assert.deepEqual(rules.leaderIndexes(game,[10,-2,-2]),[1,2]);
});

test('Flexible Cards supports score, round, and unlimited limits',() => {
  const game = {playerCount:2,rounds:[{scores:[50,40]}],winnerMode:'high',limitType:'score',limitValue:50};
  assert.equal(rules.limitReached(game),true);
  assert.deepEqual(rules.winnerIndexes(game),[0]);
  game.limitType = 'rounds';
  game.limitValue = 2;
  assert.equal(rules.limitReached(game),false);
  game.rounds.push({scores:[0,20]});
  assert.equal(rules.limitReached(game),true);
  game.limitType = 'unlimited';
  assert.equal(rules.limitReached(game),false);
  assert.deepEqual(rules.winnerIndexes(game),[]);
});
