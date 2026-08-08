'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const rules = require('./hand-foot-rules.js');

test('Hand & Foot scores every documented bonus and signed card total',() => {
  const row = {
    perfectDeal:true,
    goingOut:true,
    red3:2,
    wildBooks:1,
    cleanBooks:1,
    dirtyBooks:1,
    cardTotal:-250
  };
  assert.equal(rules.sectionValue(row,'perfectDeal'),100);
  assert.equal(rules.sectionValue(row,'goingOut'),100);
  assert.equal(rules.sectionValue(row,'red3'),200);
  assert.equal(rules.sectionValue(row,'wildBooks'),1500);
  assert.equal(rules.sectionValue(row,'cleanBooks'),700);
  assert.equal(rules.sectionValue(row,'dirtyBooks'),300);
  assert.equal(rules.sectionValue(row,'cardTotal'),-250);
  assert.equal(rules.bookTotal(row),2500);
  assert.equal(rules.roundTotal(row),2650);
});

test('Hand & Foot uses four cumulative rounds with 60/90/120/150 requirements',() => {
  assert.deepEqual([...rules.REQUIREMENTS],[60,90,120,150]);
  const scores = Array.from({length:4},()=>Array.from({length:2},rules.emptyRound));
  scores[0][0].cardTotal = 100;
  scores[1][0].red3 = 1;
  scores[2][0].cleanBooks = 1;
  scores[3][0].cardTotal = -50;
  assert.equal(rules.cumulative(scores,0,0),100);
  assert.equal(rules.cumulative(scores,1,0),200);
  assert.equal(rules.cumulative(scores,2,0),900);
  assert.equal(rules.cumulative(scores,3,0),850);
  assert.deepEqual(rules.totalsForGame({playerCount:2,scores}),[850,0]);
});

test('legacy Black 3 values convert to the same signed card score exactly once',() => {
  const legacy = rules.normalizeRound({cardTotal:25,black3:2},1);
  assert.equal(legacy.cardTotal,-175);
  const current = rules.normalizeRound({cardTotal:-175,black3:2},2);
  assert.equal(current.cardTotal,-175);
});

test('legacy team records remain identifiable while current games remain singles',() => {
  const legacyScores = [[{wildBooks:1}]];
  assert.equal(rules.normalizeGameMode('teams',1,legacyScores),'teams');
  assert.equal(rules.normalizeGameMode(undefined,1,legacyScores),'teams');
  assert.equal(rules.normalizeGameMode('singles',3,legacyScores),'singles');
});
