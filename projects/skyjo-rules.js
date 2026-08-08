(function(global){
  'use strict';

  var SCHEMA_VERSION = 2;
  var OFFICIAL_RULESET_VERSION = 2;
  var LEGACY_SAFE_TIES_RULESET_VERSION = 1;
  var MAX_PLAYERS = 8;

  function own(object,key){
    return Object.prototype.hasOwnProperty.call(object,key);
  }

  function numberOr(value,fallback){
    var number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function playerIndexes(count){
    return Array.from({length:count},function(_,index){ return index; });
  }

  function normalizeRuleSettings(source){
    source = source && typeof source === 'object' ? source : {};
    var hasRuleset = Number.isInteger(Number(source.rulesetVersion));
    var safeTies;
    var rulesetVersion;
    if(hasRuleset){
      rulesetVersion = Number(source.rulesetVersion);
      safeTies = own(source,'safeTies')
        ? source.safeTies === true
        : rulesetVersion <= LEGACY_SAFE_TIES_RULESET_VERSION;
    }else if(own(source,'safeTies')){
      safeTies = source.safeTies !== false;
      rulesetVersion = safeTies ? LEGACY_SAFE_TIES_RULESET_VERSION : OFFICIAL_RULESET_VERSION;
    }else{
      safeTies = true;
      rulesetVersion = LEGACY_SAFE_TIES_RULESET_VERSION;
    }
    return {
      schemaVersion:SCHEMA_VERSION,
      rulesetVersion:rulesetVersion,
      safeTies:safeTies
    };
  }

  function roundMeta(game,round){
    var visible = playerIndexes(game.playerCount);
    var scores = visible.map(function(index){ return numberOr(round.rawScores[index],0); });
    var lowest = scores.length ? Math.min.apply(null,scores) : 0;
    var closer = round.closer;
    var closerScore = closer === null ? null : numberOr(round.rawScores[closer],0);
    var shouldLoseTie = !game.safeTies;
    var beatenOrTied = closer !== null && visible.some(function(index){
      if(index === closer) return false;
      var otherScore = numberOr(round.rawScores[index],0);
      return shouldLoseTie ? otherScore <= closerScore : otherScore < closerScore;
    });
    var penalty = closer !== null && closerScore > 0 && beatenOrTied;
    var adjusted = Array(MAX_PLAYERS).fill(0);
    visible.forEach(function(index){
      var raw = numberOr(round.rawScores[index],0);
      adjusted[index] = penalty && index === closer ? raw * 2 : raw;
    });
    return {lowest:lowest,penalty:penalty,adjusted:adjusted};
  }

  function cumulativeTotals(game,throughIndex){
    var totals = Array(MAX_PLAYERS).fill(0);
    var end = throughIndex === undefined ? game.rounds.length - 1 : throughIndex;
    for(var roundIndex = 0;roundIndex <= end;roundIndex += 1){
      if(!game.rounds[roundIndex]) continue;
      var meta = roundMeta(game,game.rounds[roundIndex]);
      playerIndexes(game.playerCount).forEach(function(index){ totals[index] += meta.adjusted[index]; });
    }
    return totals;
  }

  function leaderIndexes(game,totals){
    totals = totals || cumulativeTotals(game);
    var low = Math.min.apply(null,playerIndexes(game.playerCount).map(function(index){ return totals[index]; }));
    return playerIndexes(game.playerCount).filter(function(index){ return totals[index] === low; });
  }

  function gameOver(game,totals){
    totals = totals || cumulativeTotals(game);
    return playerIndexes(game.playerCount).some(function(index){ return totals[index] >= game.targetScore; });
  }

  var api = Object.freeze({
    LEGACY_SAFE_TIES_RULESET_VERSION:LEGACY_SAFE_TIES_RULESET_VERSION,
    MAX_PLAYERS:MAX_PLAYERS,
    OFFICIAL_RULESET_VERSION:OFFICIAL_RULESET_VERSION,
    SCHEMA_VERSION:SCHEMA_VERSION,
    cumulativeTotals:cumulativeTotals,
    gameOver:gameOver,
    leaderIndexes:leaderIndexes,
    normalizeRuleSettings:normalizeRuleSettings,
    roundMeta:roundMeta
  });

  if(global) global.SkyjoRules = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
