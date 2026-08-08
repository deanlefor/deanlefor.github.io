'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const rules = require('./canasta-rules.js');

test('Canasta scores natural, mixed, and 1000-point Wild Canastas',() => {
  assert.equal(rules.teamRoundTotal({natural:1}),500);
  assert.equal(rules.teamRoundTotal({mixed:1}),300);
  assert.equal(rules.teamRoundTotal({wild:1}),1000);
});

test('Canasta scores going out and concealed out',() => {
  assert.equal(rules.teamRoundTotal({goingOut:true}),100);
  assert.equal(rules.teamRoundTotal({goingOut:true,concealed:true}),200);
  assert.equal(rules.teamRoundTotal({concealed:true}),0);
});

test('Canasta Red 3 scoring includes four-card bonus and no-meld penalty',() => {
  assert.equal(rules.red3Score({red3:3}),300);
  assert.equal(rules.red3Score({red3:4}),800);
  assert.equal(rules.red3Score({red3:4,noMeld:true}),-800);
});

test('Canasta meld thresholds follow the running score',() => {
  assert.equal(rules.meldRequirement(-1),15);
  assert.equal(rules.meldRequirement(0),50);
  assert.equal(rules.meldRequirement(1499),50);
  assert.equal(rules.meldRequirement(1500),90);
  assert.equal(rules.meldRequirement(3000),120);
});

test('Canasta cumulative totals and target winner behavior use 5000 by default',() => {
  const model = {
    teamCount:2,
    targetScore:5000,
    rounds:[
      [{natural:1,cardPoints:100},{mixed:1,cardPoints:50}],
      [{wild:4,goingOut:true,cardPoints:500},{wild:3,cardPoints:1000}]
    ]
  };
  assert.deepEqual(rules.cumulativeTotals(model).slice(0,2),[5200,4350]);
  assert.deepEqual(rules.winnerIndexes(model),[0]);
});
