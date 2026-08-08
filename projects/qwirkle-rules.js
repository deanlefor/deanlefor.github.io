(function(global){
  'use strict';

  var SCHEMA_VERSION = 2;
  var RULESET_VERSION = 1;
  var MAX_PLAYERS = 4;
  var INITIAL_ROWS = 15;
  var END_BONUS = 6;

  function numberOr(value,fallback){
    var number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function nullableScore(value){
    if(value === '' || value === null || value === undefined) return null;
    var number = Number(value);
    return Number.isFinite(number) ? Math.max(0,Math.trunc(number)) : null;
  }

  function emptyRow(){
    return {scores:Array(MAX_PLAYERS).fill(null)};
  }

  function normalizeRow(row){
    var source = Array.isArray(row) ? row : row && row.scores;
    return {scores:Array.from({length:MAX_PLAYERS},function(_,index){
      return nullableScore(source && source[index]);
    })};
  }

  function normalizeFinishingPlayer(value,playerCount){
    if(value === null || value === undefined || value === '') return null;
    var finisher = Number(value);
    return Number.isInteger(finisher) && finisher >= 0 && finisher < playerCount ? finisher : null;
  }

  function normalizeState(source,options){
    options = options || {};
    var defaultTitle = String(options.defaultTitle || 'Game Night');
    var base = {
      schemaVersion:SCHEMA_VERSION,
      rulesetVersion:RULESET_VERSION,
      version:1,
      archiveEditId:null,
      title:defaultTitle,
      playerCount:4,
      players:Array.from({length:MAX_PLAYERS},function(_,index){ return 'Player ' + (index + 1); }),
      rows:Array.from({length:INITIAL_ROWS},emptyRow),
      finishingPlayer:null
    };
    var next = source && typeof source === 'object' ? Object.assign({},base,source) : base;
    next.schemaVersion = SCHEMA_VERSION;
    next.rulesetVersion = RULESET_VERSION;
    next.version = 1;
    next.archiveEditId = typeof next.archiveEditId === 'string' ? next.archiveEditId.slice(0,120) : null;
    next.title = String(next.title || base.title).slice(0,48);
    next.playerCount = Math.min(MAX_PLAYERS,Math.max(2,Math.trunc(numberOr(next.playerCount,4))));
    next.players = Array.from({length:MAX_PLAYERS},function(_,index){
      return String(next.players && next.players[index] || base.players[index]).slice(0,24);
    });
    var rows = Array.isArray(next.rows) ? next.rows.map(normalizeRow) : [];
    while(rows.length < INITIAL_ROWS) rows.push(emptyRow());
    next.rows = rows;
    next.finishingPlayer = normalizeFinishingPlayer(next.finishingPlayer,next.playerCount);
    return next;
  }

  function playerIndexes(game){
    return Array.from({length:game.playerCount},function(_,index){ return index; });
  }

  function hasAnyScore(game){
    return game.rows.some(function(row){
      return playerIndexes(game).some(function(index){ return row.scores[index] !== null; });
    });
  }

  function usedRowCount(game){
    var used = 0;
    game.rows.forEach(function(row,rowIndex){
      if(playerIndexes(game).some(function(index){ return row.scores[index] !== null; })) used = rowIndex + 1;
    });
    return used;
  }

  function totalsForGame(game){
    var totals = Array(MAX_PLAYERS).fill(0);
    game.rows.forEach(function(row){
      playerIndexes(game).forEach(function(index){ totals[index] += numberOr(row.scores[index],0); });
    });
    if(Number.isInteger(game.finishingPlayer) && game.finishingPlayer >= 0 && game.finishingPlayer < game.playerCount){
      totals[game.finishingPlayer] += END_BONUS;
    }
    return totals;
  }

  function leaderIndexes(game,totals){
    totals = totals || totalsForGame(game);
    var high = Math.max.apply(null,playerIndexes(game).map(function(index){ return totals[index]; }));
    return playerIndexes(game).filter(function(index){ return totals[index] === high; });
  }

  var api = Object.freeze({
    END_BONUS:END_BONUS,
    INITIAL_ROWS:INITIAL_ROWS,
    MAX_PLAYERS:MAX_PLAYERS,
    RULESET_VERSION:RULESET_VERSION,
    SCHEMA_VERSION:SCHEMA_VERSION,
    emptyRow:emptyRow,
    hasAnyScore:hasAnyScore,
    leaderIndexes:leaderIndexes,
    normalizeFinishingPlayer:normalizeFinishingPlayer,
    normalizeRow:normalizeRow,
    normalizeState:normalizeState,
    nullableScore:nullableScore,
    totalsForGame:totalsForGame,
    usedRowCount:usedRowCount
  });

  if(global) global.QwirkleRules = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
