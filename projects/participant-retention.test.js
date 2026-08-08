'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const pages = [
  {file:'cards-score.html',fields:['players','playerCount']},
  {file:'pinochle.html',fields:['players','playerCount']},
  {file:'canasta.html',fields:['teams','teamCount']},
  {file:'hf-score.html',fields:['players','playerCount']},
  {file:'skyjo.html',fields:['players','playerCount','targetScore','safeTies']},
  {file:'qwirkle.html',fields:['players','playerCount']}
];

test('every new-game path retains participant names and count',() => {
  pages.forEach(({file,fields}) => {
    const source = fs.readFileSync(path.join(__dirname,file),'utf8');
    const helper = source.match(/function newGameStateFromCurrent\(\)\{([\s\S]*?)\n\}/);
    assert.ok(helper,file + ' must define a participant-preserving new-game state');
    assert.match(helper[1],/SiteScorecards\.retainForNewGame\(/);
    fields.forEach(field => assert.match(helper[1],new RegExp("['\"]" + field + "['\"]")));
    assert.equal(
      (source.match(/state\s*=\s*newGameStateFromCurrent\(\)/g) || []).length,
      2,
      file + ' must retain names after both Finish Game and New Game'
    );
  });
});
