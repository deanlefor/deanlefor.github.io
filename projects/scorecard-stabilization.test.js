'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const pages = [
  {file:'cards-score.html',module:'cards-score-rules.js',namespace:'CardsScoreRules',count:'playerCount',progress:'hasProgress',finish:'finishGame'},
  {file:'pinochle.html',module:'pinochle-rules.js',namespace:'PinochleRules',count:'playerCount',progress:'hasProgress',finish:'finishGame'},
  {file:'canasta.html',module:'canasta-rules.js',namespace:'CanastaRules',count:'teamCount',progress:'hasProgress',finish:'archiveCurrentGame'},
  {file:'hf-score.html',module:'hand-foot-rules.js',namespace:'HandFootRules',count:'playerCount',progress:'participantCountLocked',finish:'finishGame'},
  {file:'skyjo.html',module:'skyjo-rules.js',namespace:'SkyjoRules',count:'playerCount',progress:'hasProgress',finish:'finishGame'},
  {file:'qwirkle.html',module:'qwirkle-rules.js',namespace:'QwirkleRules',count:'playerCount',progress:'participantCountLocked',finish:'finishGame'}
];

function source(file){
  return fs.readFileSync(path.join(__dirname,file),'utf8');
}

function functionBody(html,name){
  const match = html.match(new RegExp(`function ${name}\\([^)]*\\)\\{([\\s\\S]*?)\\n\\}`));
  assert.ok(match,`Expected ${name} in scorecard source`);
  return match[1];
}

test('each static page loads and executes only its game-specific rules module',() => {
  pages.forEach(page=>{
    const html = source(page.file);
    assert.match(html,new RegExp(`<script src="${page.module.replace('.','\\.')}"></script>`));
    assert.match(html,new RegExp(`${page.namespace}\\.`));
    pages.filter(other=>other !== page).forEach(other=>{
      assert.doesNotMatch(html,new RegExp(`<script src="${other.module.replace('.','\\.')}"></script>`));
    });
  });
});

test('participant counts lock after game-specific progress without deleting hidden slots',() => {
  pages.forEach(page=>{
    const html = source(page.file);
    assert.match(html,new RegExp(`id="${page.count}Lock"[^>]*hidden`));
    assert.match(html,/Start a new game to change the player count\./);
    assert.match(html,new RegExp(`locked:${page.progress}\\(\\)`));
    assert.match(html,new RegExp(`if\\(${page.progress}\\(\\)\\)\\{`));
    assert.doesNotMatch(functionBody(html,page.progress),/\.splice\(|\.length\s*=/);
  });
});

test('archive restore is an edit workflow and finishing replaces instead of duplicating',() => {
  pages.forEach(page=>{
    const html = source(page.file);
    assert.match(html,/Edit Saved Match/);
    assert.match(html,/let editingArchiveId = gameArchive\.some/);
    assert.match(html,/state\.archiveEditId = editingArchiveId/);
    assert.match(functionBody(html,page.finish),/SiteScorecards\.upsertArchiveEntry\(/);
    assert.match(functionBody(html,page.finish),/editingArchiveId/);
    assert.match(functionBody(html,'restoreArchivedGame'),/state\.archiveEditId = entry\.id/);
    assert.match(functionBody(html,'deleteArchivedGame'),/if\(id === editingArchiveId\)/);
  });
});

test('history mutation failures restore the previous in-memory archive',() => {
  pages.forEach(page=>{
    const html = source(page.file);
    [page.finish,'deleteArchivedGame','clearGameArchive'].forEach(name=>{
      const body = functionBody(html,name);
      assert.match(body,/const previousArchive = gameArchive/);
      assert.match(body,/if\(!saveGameArchive\(\)\)\{[\s\S]*?gameArchive = previousArchive/);
      assert.match(body,/return;/);
    });
  });
});

test('initialization renders without rewriting current-game storage',() => {
  pages.forEach(page=>{
    const html = source(page.file);
    assert.match(html,/SiteScorecards\.bindLifecycleFlush\(flushPendingState\)/);
    assert.doesNotMatch(html,/render\(\);\s*(?:saveNow|save)\(\);\s*<\/script>/);
    assert.match(html,/function flushPendingState\(\)/);
  });
});

test('every scorecard carries explicit schema and ruleset metadata',() => {
  pages.forEach(page=>{
    const html = source(page.file);
    assert.match(html,/schemaVersion:/);
    assert.match(html,/rulesetVersion:/);
  });
});

test('Skyjo fresh games use official ties while legacy games retain safe ties',() => {
  const html = source('skyjo.html');
  assert.match(functionBody(html,'defaultState'),/safeTies:false/);
  assert.match(html,/getElementById\('safeTies'\)\.disabled = state\.rounds\.length > 0/);
  assert.match(html,/Safe ties \(house rule\)/);
});

test('rules contract and dependency-free CI workflow cover the suite',() => {
  const rules = source('SCORECARD-RULES.md');
  ['Flexible Cards','Pinochle','Canasta','Hand & Foot','Skyjo','Qwirkle'].forEach(name=>{
    assert.match(rules,new RegExp(`## ${name.replace('&','\\&')}`));
  });
  assert.match(rules,/Wild Books are allowed in singles and score exactly 1,500 points/);
  assert.match(rules,/Safe ties \/ ties count as lowest/);
  const workflow = fs.readFileSync(path.join(__dirname,'..','.github','workflows','scorecard-tests.yml'),'utf8');
  assert.match(workflow,/node-version: 24/);
  assert.match(workflow,/node --test projects\/\*\.test\.js/);
  assert.doesNotMatch(workflow,/npm install|npm ci|pnpm|yarn/);
});
