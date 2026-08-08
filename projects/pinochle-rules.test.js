'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const rules = require('./pinochle-rules.js');

function round(values = {}){
  return rules.normalizeRound({
    dealer:0,
    bidder:values.bidder ?? 0,
    bid:values.bid ?? 30,
    meld:values.meld ?? [20,10,5],
    tricks:values.tricks ?? [10,8,7],
    thrown:values.thrown ?? false
  });
}

test('Pinochle requires exactly 25 trick points',() => {
  assert.equal(rules.validateRound(round({tricks:[10,8,7]}),3),'');
  assert.match(rules.validateRound(round({tricks:[10,8,6]}),3),/total 25/);
});

test('Pinochle bidder makes or fails the bid under 1/10 scoring',() => {
  const made = round({bid:30,meld:[20,10,5],tricks:[10,8,7]});
  const failed = round({bid:31,meld:[20,10,5],tricks:[10,8,7]});
  assert.equal(rules.isBidMade(made),true);
  assert.deepEqual(rules.totalsForRound(made,3),[30,18,12]);
  assert.equal(rules.isBidMade(failed),false);
  assert.deepEqual(rules.totalsForRound(failed,3),[-31,18,12]);
});

test('zero trick points lose meld for bidder and nonbidder',() => {
  const bidderZero = round({bid:30,meld:[40,10,5],tricks:[0,13,12]});
  assert.deepEqual(rules.totalsForRound(bidderZero,3),[-30,23,17]);
  const nonbidderZero = round({bid:30,meld:[20,50,5],tricks:[15,0,10]});
  assert.deepEqual(rules.totalsForRound(nonbidderZero,3),[35,0,15]);
});

test('Pinochle preserves shutout behavior',() => {
  const shutout = round({bid:30,meld:[10,40,20],tricks:[25,0,0]});
  assert.deepEqual(rules.totalsForRound(shutout,3),[35,0,0]);
});

test('Pinochle cumulative scoring and one-player target wins work at any target',() => {
  const model = {
    playerCount:3,
    targetScore:60,
    rounds:[round(),round({bidder:1,bid:25,meld:[10,20,5],tricks:[8,10,7]})]
  };
  assert.deepEqual(rules.cumulativeTotals(model),[48,48,24]);
  assert.deepEqual(rules.winnerIndexes(model),[]);
  model.targetScore = 45;
  assert.deepEqual(rules.winnerIndexes(model),[1]);
  model.targetScore = 150;
  assert.deepEqual(rules.winnerIndexes(model,[150,149,100]),[0]);
});

test('successful high bidder has precedence when multiple players cross 150',() => {
  const final = round({bidder:1,bid:25,meld:[10,20,5],tricks:[8,10,7]});
  const model = {playerCount:3,targetScore:150,rounds:[final]};
  assert.deepEqual(rules.winnerIndexes(model,[160,151,90]),[1]);
  const bidderBelow = {playerCount:3,targetScore:150,rounds:[final]};
  assert.deepEqual(rules.winnerIndexes(bidderBelow,[160,149,160]),[0,2]);
});
