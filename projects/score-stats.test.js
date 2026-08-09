'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

function loadScoreStats(){
  const modulePath = require.resolve('./score-stats.js');
  delete require.cache[modulePath];
  global.window = {};
  require(modulePath);
  const api = global.window.ScoreStats;
  delete global.window;
  return api;
}

test('low-score standings total outs and zero-score rounds by player',() => {
  const ScoreStats = loadScoreStats();
  const host = {};
  ScoreStats.render(host,[
    {
      completedAt:'2026-08-01T12:00:00.000Z',
      direction:'low',
      participants:[
        {name:'Alex',score:12,outs:2},
        {name:'Blair',score:20,outs:1}
      ],
      winnerIndexes:[0]
    },
    {
      completedAt:'2026-08-02T12:00:00.000Z',
      direction:'low',
      participants:[
        {name:'Alex',score:18,outs:1},
        {name:'Blair',score:8,outs:3}
      ],
      winnerIndexes:[1]
    }
  ]);

  assert.match(host.innerHTML,/>Outs \/ 0s<\/div>/);
  assert.match(host.innerHTML,/title="Alex">Alex<\/div><div class="stats-number">1<\/div><div class="stats-number">0<\/div><div class="stats-number">3<\/div>/);
  assert.match(host.innerHTML,/title="Blair">Blair<\/div><div class="stats-number">1<\/div><div class="stats-number">0<\/div><div class="stats-number">4<\/div>/);
});

test('high-score standings do not show the low-score outs column',() => {
  const ScoreStats = loadScoreStats();
  const host = {};
  ScoreStats.render(host,[{
    completedAt:'2026-08-01T12:00:00.000Z',
    direction:'high',
    participants:[{name:'Alex',score:100,outs:4},{name:'Blair',score:80,outs:2}],
    winnerIndexes:[0]
  }]);

  assert.doesNotMatch(host.innerHTML,/Outs \/ 0s/);
  assert.doesNotMatch(host.innerHTML,/stats-row-with-outs/);
});
