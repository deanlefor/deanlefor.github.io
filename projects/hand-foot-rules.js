(function(global){
  'use strict';

  var ROUND_COUNT = 4;
  var MAX_PLAYERS = 8;
  var SCHEMA_VERSION = 3;
  var RULESET_VERSION = 1;
  var BLACK3_MIGRATION_SCHEMA_VERSION = 2;
  var REQUIREMENTS = Object.freeze([60,90,120,150]);
  var COUNT_KEYS = Object.freeze(['red3','wildBooks','cleanBooks','dirtyBooks']);

  function number(value){
    var parsed = Number(value);
    return Number.isFinite(parsed) && !Object.is(parsed,-0) ? parsed : 0;
  }

  function count(value){
    return Math.max(0,Math.trunc(number(value)));
  }

  function emptyRound(){
    return {
      perfectDeal:false,
      goingOut:false,
      red3:0,
      wildBooks:0,
      cleanBooks:0,
      dirtyBooks:0,
      cardTotal:0
    };
  }

  function normalizeRound(savedRound,savedSchema){
    var source = savedRound && typeof savedRound === 'object' ? savedRound : {};
    var round = emptyRound();
    Object.keys(round).forEach(function(key){
      if(!Object.prototype.hasOwnProperty.call(source,key)) return;
      if(key === 'perfectDeal' || key === 'goingOut'){
        round[key] = source[key] === true || source[key] === 1 || source[key] === 'true';
      }else{
        round[key] = COUNT_KEYS.indexOf(key) >= 0 ? count(source[key]) : number(source[key]);
      }
    });
    if(Number(savedSchema || 1) < BLACK3_MIGRATION_SCHEMA_VERSION &&
      Object.prototype.hasOwnProperty.call(source,'black3')){
      round.cardTotal += number(source.black3) * -100;
    }
    return round;
  }

  function normalizeGameMode(value,savedSchema,scores){
    if(value === 'singles' || value === 'teams') return value;
    if(Number(savedSchema || 1) < SCHEMA_VERSION && Array.isArray(scores)){
      var usedWildBooks = scores.some(function(round){
        return Array.isArray(round) && round.some(function(player){ return number(player && player.wildBooks) > 0; });
      });
      if(usedWildBooks) return 'teams';
    }
    return 'singles';
  }

  function sectionValue(round,key){
    round = round || emptyRound();
    if(key === 'perfectDeal') return round.perfectDeal ? 100 : 0;
    if(key === 'goingOut') return round.goingOut ? 100 : 0;
    if(key === 'red3') return number(round.red3) * 100;
    if(key === 'wildBooks') return number(round.wildBooks) * 1500;
    if(key === 'cleanBooks') return number(round.cleanBooks) * 700;
    if(key === 'dirtyBooks') return number(round.dirtyBooks) * 300;
    if(key === 'cardTotal') return number(round.cardTotal);
    return 0;
  }

  function bookTotal(round){
    return sectionValue(round,'wildBooks') +
      sectionValue(round,'cleanBooks') +
      sectionValue(round,'dirtyBooks');
  }

  function roundTotal(round){
    return ['perfectDeal','goingOut','red3','wildBooks','cleanBooks','dirtyBooks','cardTotal']
      .reduce(function(total,key){ return total + sectionValue(round,key); },0);
  }

  function rowHasScore(round){
    return !!(round && (round.perfectDeal || round.goingOut ||
      ['red3','wildBooks','cleanBooks','dirtyBooks','cardTotal']
        .some(function(key){ return number(round[key]) !== 0; })));
  }

  function cumulative(scores,throughRound,playerIndex){
    var total = 0;
    for(var roundIndex = 0;roundIndex <= throughRound;roundIndex += 1){
      total += roundTotal(scores && scores[roundIndex] && scores[roundIndex][playerIndex]);
    }
    return total;
  }

  function totalsForGame(game){
    var playerCount = Math.max(0,Math.min(MAX_PLAYERS,Math.trunc(number(game && game.playerCount))));
    return Array.from({length:playerCount},function(_,playerIndex){
      return cumulative(game.scores,ROUND_COUNT - 1,playerIndex);
    });
  }

  function gameHasScores(game){
    var playerCount = Math.max(0,Math.min(MAX_PLAYERS,Math.trunc(number(game && game.playerCount))));
    for(var roundIndex = 0;roundIndex < ROUND_COUNT;roundIndex += 1){
      for(var playerIndex = 0;playerIndex < playerCount;playerIndex += 1){
        if(rowHasScore(game && game.scores && game.scores[roundIndex] && game.scores[roundIndex][playerIndex])) return true;
      }
    }
    return false;
  }

  function playedRoundCount(game){
    var playerCount = Math.max(0,Math.min(MAX_PLAYERS,Math.trunc(number(game && game.playerCount))));
    var played = 0;
    for(var roundIndex = 0;roundIndex < ROUND_COUNT;roundIndex += 1){
      var used = false;
      for(var playerIndex = 0;playerIndex < playerCount;playerIndex += 1){
        if(rowHasScore(game && game.scores && game.scores[roundIndex] && game.scores[roundIndex][playerIndex])) used = true;
      }
      if(used) played += 1;
    }
    return played;
  }

  var api = Object.freeze({
    BLACK3_MIGRATION_SCHEMA_VERSION:BLACK3_MIGRATION_SCHEMA_VERSION,
    REQUIREMENTS:REQUIREMENTS,
    ROUND_COUNT:ROUND_COUNT,
    RULESET_VERSION:RULESET_VERSION,
    SCHEMA_VERSION:SCHEMA_VERSION,
    bookTotal:bookTotal,
    count:count,
    cumulative:cumulative,
    emptyRound:emptyRound,
    gameHasScores:gameHasScores,
    normalizeGameMode:normalizeGameMode,
    normalizeRound:normalizeRound,
    number:number,
    playedRoundCount:playedRoundCount,
    roundTotal:roundTotal,
    rowHasScore:rowHasScore,
    sectionValue:sectionValue,
    totalsForGame:totalsForGame
  });

  if(global) global.HandFootRules = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
