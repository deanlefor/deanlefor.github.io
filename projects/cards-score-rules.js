(function(global){
  'use strict';

  var SCHEMA_VERSION = 4;
  var RULESET_VERSION = 1;

  function numberOr(value,fallback){
    var number = Number(value);
    return Number.isFinite(number) && !Object.is(number,-0) ? number : fallback;
  }

  function totalsForGame(game){
    var totals = Array.from({length:game.playerCount},function(){ return 0; });
    (Array.isArray(game.rounds) ? game.rounds : []).forEach(function(round){
      for(var index = 0;index < game.playerCount;index += 1){
        totals[index] += numberOr(round && round.scores && round.scores[index],0);
      }
    });
    return totals;
  }

  function leaderIndexes(game,totals){
    totals = totals || totalsForGame(game);
    var indexes = Array.from({length:game.playerCount},function(_,index){ return index; });
    if(!indexes.length) return [];
    var values = indexes.map(function(index){ return totals[index]; });
    var best = game.winnerMode === 'low'
      ? Math.min.apply(null,values)
      : Math.max.apply(null,values);
    return indexes.filter(function(index){ return totals[index] === best; });
  }

  function limitReached(game,totals){
    if(!game.rounds.length || game.limitType === 'unlimited') return false;
    if(game.limitType === 'rounds') return game.rounds.length >= game.limitValue;
    totals = totals || totalsForGame(game);
    return totals.some(function(total){ return total >= game.limitValue; });
  }

  function winnerIndexes(game,totals){
    return limitReached(game,totals) ? leaderIndexes(game,totals) : [];
  }

  var api = Object.freeze({
    RULESET_VERSION:RULESET_VERSION,
    SCHEMA_VERSION:SCHEMA_VERSION,
    leaderIndexes:leaderIndexes,
    limitReached:limitReached,
    numberOr:numberOr,
    totalsForGame:totalsForGame,
    winnerIndexes:winnerIndexes
  });

  if(global) global.CardsScoreRules = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
