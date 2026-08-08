'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const backupApi = require('./game-backup.js');
const playerNames = require('./player-names.js');
const {
  canonicalName,
  cleanName,
  collectRoster,
  comparisonKey,
  editDistance,
  findNearMatch,
  isPlaceholder
} = playerNames._test;

class FakeStorage{
  constructor(entries = {}){
    this.values = new Map(Object.entries(entries).map(([key,value]) => [key,String(value)]));
  }

  getItem(key){
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key,value){
    this.values.set(key,String(value));
  }

  removeItem(key){
    this.values.delete(key);
  }

  snapshot(){
    return Object.fromEntries(this.values);
  }
}

function rosterStorage(){
  return new FakeStorage({
    'cardsScorecard.v1':JSON.stringify({
      playerCount:3,
      players:['Alex','samantha','Player 3','Hidden Person']
    }),
    'cardsScorecard.history.v1':JSON.stringify([
      {state:{playerCount:3,players:['Alex','Samantha','Jordan','Player 4']}},
      {state:{playerCount:2,players:['Alex','Samantha','Hidden Archive Name']}}
    ]),
    'pinochleScorekeeper.v2':JSON.stringify({playerCount:3,players:['Alex','Sam','Casey']}),
    'pinochleScorekeeper.history.v1':'not valid json',
    'canastaScorecard.v1':JSON.stringify({teamCount:2,teams:['Alex & Samantha','Team 2','Old Team']}),
    'handFootRemasteredScorecard.history.v1':JSON.stringify([
      {state:{playerCount:4,players:['Alex','Samantha','Jordan','Casey','Player 5']}}
    ]),
    'skyjoScorecard.history.v1':JSON.stringify([
      {state:{playerCount:3,players:['Alex','Samantha','Casey','Player 4']}}
    ]),
    'unrelated.application.key':'Samantha should never be read from this key'
  });
}

test('name cleanup and comparison are case, whitespace, and accent tolerant',() => {
  assert.equal(cleanName('  Mary   Jane  '),'Mary Jane');
  assert.equal(comparisonKey('  SÁMANTHA '),'samantha');
  assert.equal(isPlaceholder('Player 7'),true);
  assert.equal(isPlaceholder('Team 2'),true);
  assert.equal(isPlaceholder('Player Seven'),false);
});

test('the shared roster discovers active names across all six scorekeepers without writes',() => {
  const storage = rosterStorage();
  const before = storage.snapshot();
  const roster = collectRoster(storage,backupApi.registry);
  const byKey = Object.fromEntries(roster.map(person => [person.key,person]));

  assert.equal(byKey.samantha.name,'Samantha');
  assert.equal(byKey.samantha.count,5);
  assert.equal(byKey.sam.name,'Sam');
  assert.equal(byKey.sam.count,1);
  assert.equal(byKey.alex.count,6);
  assert.equal(byKey['alex & samantha'].count,1);
  assert.equal(byKey['hidden person'],undefined);
  assert.equal(byKey['hidden archive name'],undefined);
  assert.equal(byKey['old team'],undefined);
  assert.equal(byKey['player 3'],undefined);
  assert.deepEqual(storage.snapshot(),before);
});

test('exact matches adopt the most frequently used capitalization',() => {
  const roster = collectRoster(rosterStorage(),backupApi.registry);
  assert.equal(canonicalName('samantha',roster),'Samantha');
  assert.equal(canonicalName(' SÁMANTHA ',roster),'Samantha');
  assert.equal(canonicalName('New Person',roster),'New Person');
});

test('near-match detection finds Sam versus Samantha but leaves unrelated names alone',() => {
  const roster = collectRoster(rosterStorage(),backupApi.registry);
  assert.equal(findNearMatch('Sam',roster).name,'Samantha');
  assert.equal(findNearMatch('Samanth',roster).name,'Samantha');
  assert.equal(findNearMatch('Casey',roster),null);
  assert.equal(editDistance('jordan','jrodan'),2);
});

test('review accepts or declines a suggested canonical name deliberately',() => {
  const roster = collectRoster(rosterStorage(),backupApi.registry);
  const prompts = [];
  const accepted = playerNames.reviewNames(['Alex','Sam'],{
    roster,
    noun:'game',
    confirmFn(message){ prompts.push(message); return true; },
    render:false
  });
  assert.equal(accepted.changed,true);
  assert.deepEqual(accepted.names,['Alex','Samantha']);
  assert.equal(accepted.changes[0].type,'near-match');
  assert.match(prompts[0],/“Sam” looks similar to “Samantha”/);

  const declined = playerNames.reviewNames(['Sam'],{
    roster,
    confirmFn(){ return false; },
    render:false
  });
  assert.equal(declined.changed,false);
  assert.deepEqual(declined.names,['Sam']);
});

test('in-place review changes only active participants and preserves unused slots',() => {
  const roster = collectRoster(rosterStorage(),backupApi.registry);
  const names = ['Alex','Sam','Jordan','Unused Name'];
  const result = playerNames.reviewNamesInPlace(names,3,{
    roster,
    confirmFn(){ return true; },
    render:false
  });
  assert.equal(result.changed,true);
  assert.deepEqual(names,['Alex','Samantha','Jordan','Unused Name']);
});

test('blocked or malformed browser storage produces an empty roster without throwing',() => {
  const blocked = {getItem(){ throw new Error('blocked'); }};
  assert.deepEqual(collectRoster(blocked,backupApi.registry),[]);
  assert.deepEqual(collectRoster(null,backupApi.registry),[]);
});

test('all six scorekeepers load and use the shared player-name utility',() => {
  const pages = ['cards-score.html','pinochle.html','canasta.html','skyjo.html','hf-score.html','qwirkle.html'];
  pages.forEach(file => {
    const html = fs.readFileSync(path.join(__dirname,file),'utf8');
    assert.match(html,/<script src="player-names\.js"><\/script>/);
    assert.match(html,/SitePlayerNames\.refresh\(\)/);
    assert.match(html,/SitePlayerNames\.enhanceInput\(input\)/);
    assert.match(html,/SitePlayerNames\.reviewNamesInPlace\(/);
  });
});
