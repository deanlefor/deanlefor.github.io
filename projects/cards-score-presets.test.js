'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const presets = require('./cards-score-presets.js');

test('common card games expose the expected scorekeeper presets',() => {
  const expected = {
    'shanghai-rummy':['rounds',7,'low'],
    'rummy-500':['score',500,'high'],
    golf:['rounds',9,'low'],
    sevens:['rounds',7,'low'],
    'flip-7':['score',200,'high'],
    chickenfoot:['rounds',10,'low'],
    'cat-te':['score',5,'high']
  };

  Object.entries(expected).forEach(([id,[limitType,limitValue,winnerMode]]) => {
    const preset = presets.get(id);
    assert.equal(preset.limitType,limitType,id + ' limit type');
    assert.equal(preset.limitValue,limitValue,id + ' limit value');
    assert.equal(preset.winnerMode,winnerMode,id + ' winner mode');
    assert.match(preset.summary,/wins/);
  });
});

test('applying a preset sets its title and rules while Generic preserves custom settings',() => {
  const state = {title:'Friday Night',limitType:'unlimited',limitValue:42,winnerMode:'high'};
  assert.equal(presets.applyToState(state,'golf'),state);
  assert.deepEqual(state,{
    gamePreset:'golf',
    title:'Golf',
    limitType:'rounds',
    limitValue:9,
    winnerMode:'low'
  });

  state.title = 'House Rules';
  state.limitValue = 12;
  presets.applyToState(state,'generic');
  assert.equal(state.gamePreset,'generic');
  assert.equal(state.title,'House Rules');
  assert.equal(state.limitValue,12);
});

test('unknown and legacy preset values safely fall back to Generic',() => {
  assert.equal(presets.normalizeId(), 'generic');
  assert.equal(presets.normalizeId('not-a-game'), 'generic');
  assert.equal(presets.get('not-a-game').configurable,true);
});

test('standings records remain isolated by preset',() => {
  const generic = {presetId:'generic',winner:'Alex'};
  const legacy = {winner:'Sam'};
  const golf = {presetId:'golf',winner:'Jordan'};
  const rummy = {presetId:'rummy-500',winner:'Casey'};
  const records = [generic,legacy,golf,rummy];

  assert.deepEqual(presets.filterRecords(records,'golf'),[golf]);
  assert.deepEqual(presets.filterRecords(records,'rummy-500'),[rummy]);
  assert.deepEqual(presets.filterRecords(records,'generic'),[generic,legacy]);
  assert.deepEqual(presets.filterRecords(null,'golf'),[]);
});

test('the flexible scorekeeper renders a preset selector and hides custom controls for presets',() => {
  const html = fs.readFileSync(path.join(__dirname,'cards-score.html'),'utf8');
  assert.equal((html.match(/<script src="cards-score-presets\.js"><\/script>/g) || []).length,1);
  assert.match(html,/<select id="gamePreset"><\/select>/);
  assert.match(html,/getElementById\('gamePreset'\)\.addEventListener\('change'/);
  assert.match(html,/\.settings\.preset-active \.game-title-field/);
  assert.match(html,/\.settings\.preset-active \.win-config/);
  assert.match(html,/'gamePreset','title','limitType','limitValue','winnerMode'/);
});

test('all-time player standings are filtered by game preset',() => {
  const html = fs.readFileSync(path.join(__dirname,'cards-score.html'),'utf8');
  assert.match(html,/<label for="statsPreset">Standings for<\/label>/);
  assert.match(html,/<select id="statsPreset"><\/select>/);
  assert.match(html,/presetId:CardsScorePresets\.normalizeId\(game\.gamePreset\)/);
  assert.match(html,/CardsScorePresets\.filterRecords\(records,selectedStatsPreset\)/);
  assert.match(html,/getElementById\('statsPreset'\)\.addEventListener\('change'/);
});

test('low-score card standings count zero-score rounds as outs',() => {
  const html = fs.readFileSync(path.join(__dirname,'cards-score.html'),'utf8');
  assert.match(html,/function outsForGame\(game,index\)/);
  assert.match(html,/game\.winnerMode !== 'low'/);
  assert.match(html,/Number\(score\) === 0/);
  assert.match(html,/outs:outsForGame\(game,index\)/);
});
