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
  assert.doesNotMatch(host.innerHTML,/>Last place<\/div>/);
});

test('last place identifies tied worst scores and excludes all-player ties',() => {
  const ScoreStats = loadScoreStats();
  assert.deepEqual(ScoreStats.lastPlaces([200,100,-50],'high'),[2]);
  assert.deepEqual(ScoreStats.lastPlaces([200,-50,-50],'high'),[1,2]);
  assert.deepEqual(ScoreStats.lastPlaces([5,30,30],'low'),[1,2]);
  assert.deepEqual(ScoreStats.lastPlaces([0,0,0],'high'),[]);
  assert.deepEqual(ScoreStats.lastPlaces([10],'high'),[]);
  assert.deepEqual(ScoreStats.lastPlaces([],'high'),[]);
});

test('last-place standings derive counts from existing history and recalculate after edits or deletion',() => {
  const ScoreStats = loadScoreStats();
  const host = {};
  const records = [[200,-50,-50],[10,20,30],[0,0,0]].map((scores,index)=>({
    completedAt:`2026-08-0${index + 1}T12:00:00.000Z`,
    direction:'high',
    participants:scores.map((score,index)=>({name:['Alex','Blair','Casey'][index],score})),
    winnerIndexes:scores.flatMap((score,index)=>score === Math.max(...scores) ? [index] : [])
  }));
  const original = JSON.stringify(records);
  function count(name){
    const row = host.innerHTML.match(new RegExp('title="' + name + '">' + name + '</div>((?:<div class="stats-number">[^<]*</div>)+)'))[1];
    return Number(Array.from(row.matchAll(/>([^<]*)<\/div>/g))[2][1]);
  }
  ScoreStats.render(host,records,{showLastPlace:true});
  assert.match(host.innerHTML,/>Last place<\/div>/);
  assert.deepEqual(['Alex','Blair','Casey'].map(count),[1,1,1]);
  assert.equal(JSON.stringify(records),original);
  records[0].participants[1].score = 0;
  ScoreStats.render(host,records,{showLastPlace:true});
  assert.deepEqual(['Alex','Blair','Casey'].map(count),[1,0,1]);
  ScoreStats.render(host,records.slice(1),{showLastPlace:true});
  assert.deepEqual(['Alex','Blair','Casey'].map(count),[1,0,0]);
});
