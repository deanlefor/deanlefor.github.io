'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const backupApi = require('./game-backup.js');
const games = backupApi._test.games;
const projectsDirectory = __dirname;

function pageSource(game){
  return fs.readFileSync(path.join(projectsDirectory,game.page),'utf8');
}

function escapeRegExp(value){
  return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
}

test('every registered storage key remains declared by its owning scorekeeper',() => {
  games.forEach(game => {
    const source = pageSource(game);
    game.storageKeys.forEach(item => {
      assert.match(
        source,
        new RegExp("['\"]" + escapeRegExp(item.key) + "['\"]"),
        game.page + ' must retain the existing ' + item.role + ' key ' + item.key
      );
    });
  });
});

test('every scorekeeper keeps its state, history, and backup integration points',() => {
  games.forEach(game => {
    const source = pageSource(game);
    assert.match(source,/function\s+loadState\s*\(/,game.page + ' must keep loading saved state');
    assert.match(source,/function\s+normalizeState\s*\(/,game.page + ' must keep normalizing saved state');
    assert.match(source,/function\s+saveGameArchive\s*\(/,game.page + ' must keep saving finished-game history');
    assert.match(
      source,
      new RegExp("SiteGamesBackup\\.registerPage\\(['\"]" + escapeRegExp(game.id) + "['\"]"),
      game.page + ' must remain connected to the consolidated backup'
    );
  });
});

test('scorekeeper code never clears all local or session storage',() => {
  const files = [
    ...games.map(game => game.page),
    'game-backup.js',
    'player-names.js',
    'scorecard-common.js'
  ];

  files.forEach(file => {
    const source = fs.readFileSync(path.join(projectsDirectory,file),'utf8');
    assert.doesNotMatch(
      source,
      /(?:localStorage|sessionStorage)\.clear\s*\(/,
      file + ' must never clear unrelated browser data'
    );
  });
});
