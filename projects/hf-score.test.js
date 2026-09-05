'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname,'hf-score.html'),'utf8');
const libraryHtml = fs.readFileSync(path.join(__dirname,'scorecards.html'),'utf8');

test('Hand & Foot offers exactly two through eight individual players',() => {
  const counts = Array.from(html.matchAll(/data-count="(\d+)"/g),match => Number(match[1]));
  assert.deepEqual(counts,[2,3,4,5,6,7,8]);
  assert.match(html,/<span class="label">Players<\/span>/);
  assert.match(html,/Scores are tracked separately for 2–8 individual players/);
  assert.doesNotMatch(html,/data-mode="teams"/);
  assert.doesNotMatch(html,/id="gameMode"/);
  assert.doesNotMatch(html,/getElementById\('gameMode'\)/);
  assert.match(libraryHtml,/Hand &amp; Foot Scorecard[\s\S]*?<span class="tracker-tag">2–8 players<\/span>/);
});

test('current and future scorecards normalize to singles',() => {
  assert.match(html,/const DEFAULT_GAME_MODE = 'singles'/);
  assert.match(html,/function normalizeState\(saved,preserveLegacyMode = false\)/);
  assert.match(html,/: DEFAULT_GAME_MODE;/);
  assert.match(html,/aria-label',`Player \$\{i\+1\} name`/);
});

test('legacy team archives remain identifiable without changing their stored records',() => {
  assert.match(html,/normalizeState\(gameSource,true\)/);
  assert.match(html,/Legacy team record/);
  assert.match(html,/game\.gameMode === 'teams' \? 'Team' : 'Player'/);
});

test('saved Hand & Foot matches show last place and enable historical counts',() => {
  const elements = Object.fromEntries(['gameHistory','gameStats','gameHistoryCount','clearHistoryBtn'].map(id=>[id,{}]));
  const gameArchive = [[100,-20,-20],[5,5,5],[20,10,0]].map((totals,index)=>({
    id:String(index),completedAt:'2026-08-01',
    state:{title:'Saved game',gameMode:'singles',playerCount:3,totals,players:['Alex','B & C','<Casey>']}
  }));
  const original = JSON.stringify(gameArchive);
  const context = vm.createContext({
    window:{},document:{getElementById:id=>elements[id]},gameArchive,ROUND_COUNT:4,editingArchiveId:null,
    totalsForGame:game=>game.totals,
    gameColumnName:(game,index)=>game.players[index],
    playedRoundCount:()=>4,
    formatArchivedDate:value=>value,
    fmt:String,
    escapeHtml:value=>String(value).replace(/[&<>]/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[character]))
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'score-stats.js'),'utf8'),context);
  context.ScoreStats = context.window.ScoreStats;
  const archiveFunction = html.slice(html.indexOf('function renderGameArchive(){'),html.indexOf('function cellHtml('));
  vm.runInContext(archiveFunction + '\nrenderGameArchive();',context);
  assert.match(elements.gameStats.innerHTML,/>Last place<\/div>/);
  assert.match(elements.gameHistory.innerHTML,/Tied for last: B &amp; C, &lt;Casey&gt; · -20/);
  assert.match(elements.gameHistory.innerHTML,/All players tied — no last place/);
  assert.match(elements.gameHistory.innerHTML,/Last place: &lt;Casey&gt; · 0/);
  assert.equal(JSON.stringify(gameArchive),original);
});
