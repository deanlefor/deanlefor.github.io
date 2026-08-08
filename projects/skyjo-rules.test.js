'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const rules = require('./skyjo-rules.js');

function game(rawScores,closer,safeTies = false){
  return {playerCount:rawScores.length,targetScore:100,safeTies,rounds:[{rawScores,closer}]};
}

test('Skyjo doubles a positive closer above the low score',() => {
  const meta = rules.roundMeta(game([8,3,10],0),game([8,3,10],0).rounds[0]);
  assert.equal(meta.penalty,true);
  assert.deepEqual(meta.adjusted.slice(0,3),[16,3,10]);
});

test('Skyjo official ties double while the safe-ties house rule does not',() => {
  const official = game([5,5,9],0,false);
  const house = game([5,5,9],0,true);
  assert.equal(rules.roundMeta(official,official.rounds[0]).penalty,true);
  assert.deepEqual(rules.roundMeta(official,official.rounds[0]).adjusted.slice(0,3),[10,5,9]);
  assert.equal(rules.roundMeta(house,house.rounds[0]).penalty,false);
});

test('Skyjo never doubles a zero or negative closer',() => {
  const zero = game([0,-1,3],0,false);
  const negative = game([-2,-3,4],0,false);
  assert.equal(rules.roundMeta(zero,zero.rounds[0]).penalty,false);
  assert.equal(rules.roundMeta(negative,negative.rounds[0]).penalty,false);
  assert.deepEqual(rules.roundMeta(negative,negative.rounds[0]).adjusted.slice(0,3),[-2,-3,4]);
});

test('Skyjo cumulative totals, lowest winner, and end threshold are rule-driven',() => {
  const model = {
    playerCount:3,
    targetScore:20,
    safeTies:false,
    rounds:[
      {rawScores:[5,7,9],closer:0},
      {rawScores:[4,13,12],closer:1}
    ]
  };
  assert.deepEqual(rules.cumulativeTotals(model).slice(0,3),[9,33,21]);
  assert.deepEqual(rules.leaderIndexes(model),[0]);
  assert.equal(rules.gameOver(model),true);
});

test('Skyjo migration preserves old safe-ties interpretation deliberately',() => {
  assert.deepEqual(rules.normalizeRuleSettings({safeTies:true}),{
    schemaVersion:2,rulesetVersion:1,safeTies:true
  });
  assert.deepEqual(rules.normalizeRuleSettings({}),{
    schemaVersion:2,rulesetVersion:1,safeTies:true
  });
  assert.deepEqual(rules.normalizeRuleSettings({rulesetVersion:1}),{
    schemaVersion:2,rulesetVersion:1,safeTies:true
  });
  assert.deepEqual(rules.normalizeRuleSettings({rulesetVersion:2,safeTies:false}),{
    schemaVersion:2,rulesetVersion:2,safeTies:false
  });
});
