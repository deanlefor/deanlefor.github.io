(function(global){
  'use strict';

  var SCHEMA_VERSION = 2;
  var RULESET_VERSION = 1;
  var MAX_TEAMS = 4;
  var DEFAULT_TARGET = 5000;

  function numberOr(value,fallback){
    var number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function wholeNumber(value){
    return Math.max(0,Math.floor(numberOr(value,0)));
  }

  function emptyTeamRound(){
    return {
      red3:0,
      natural:0,
      mixed:0,
      wild:0,
      cardPoints:0,
      goingOut:false,
      concealed:false,
      noMeld:false
    };
  }

  function normalizeTeamRound(team){
    return {
      red3:wholeNumber(team && team.red3),
      natural:wholeNumber(team && team.natural),
      mixed:wholeNumber(team && team.mixed),
      wild:wholeNumber(team && team.wild),
      cardPoints:numberOr(team && team.cardPoints,0),
      goingOut:!!(team && team.goingOut),
      concealed:!!(team && team.concealed),
      noMeld:!!(team && team.noMeld)
    };
  }

  function red3Score(team){
    var count = wholeNumber(team && team.red3);
    if(!count) return 0;
    var points = count >= 4 ? 800 : count * 100;
    return team && team.noMeld ? -points : points;
  }

  function teamRoundTotal(team){
    team = team || emptyTeamRound();
    return red3Score(team) +
      wholeNumber(team.natural) * 500 +
      wholeNumber(team.mixed) * 300 +
      wholeNumber(team.wild) * 1000 +
      (team.goingOut ? 100 : 0) +
      (team.goingOut && team.concealed ? 100 : 0) +
      numberOr(team.cardPoints,0);
  }

  function roundTotals(round){
    return Array.from({length:MAX_TEAMS},function(_,index){ return teamRoundTotal(round && round[index]); });
  }

  function cumulativeTotals(game,throughIndex){
    var totals = Array(MAX_TEAMS).fill(0);
    var end = throughIndex === undefined ? game.rounds.length - 1 : throughIndex;
    for(var roundIndex = 0;roundIndex <= end;roundIndex += 1){
      if(!game.rounds[roundIndex]) continue;
      roundTotals(game.rounds[roundIndex]).forEach(function(score,index){ totals[index] += score; });
    }
    return totals;
  }

  function meldRequirement(score){
    if(score < 0) return 15;
    if(score < 1500) return 50;
    if(score < 3000) return 90;
    return 120;
  }

  function leaderIndexes(game,totals){
    var indexes = Array.from({length:game.teamCount},function(_,index){ return index; });
    var best = Math.max.apply(null,indexes.map(function(index){ return totals[index]; }));
    return indexes.filter(function(index){ return totals[index] === best; });
  }

  function winnerIndexes(game,totals){
    totals = totals || cumulativeTotals(game);
    var target = Math.max(1,numberOr(game.targetScore,DEFAULT_TARGET));
    var reached = Array.from({length:game.teamCount},function(_,index){ return index; })
      .filter(function(index){ return totals[index] >= target; });
    if(!reached.length) return [];
    var best = Math.max.apply(null,reached.map(function(index){ return totals[index]; }));
    return reached.filter(function(index){ return totals[index] === best; });
  }

  var api = Object.freeze({
    DEFAULT_TARGET:DEFAULT_TARGET,
    MAX_TEAMS:MAX_TEAMS,
    RULESET_VERSION:RULESET_VERSION,
    SCHEMA_VERSION:SCHEMA_VERSION,
    cumulativeTotals:cumulativeTotals,
    emptyTeamRound:emptyTeamRound,
    leaderIndexes:leaderIndexes,
    meldRequirement:meldRequirement,
    normalizeTeamRound:normalizeTeamRound,
    numberOr:numberOr,
    red3Score:red3Score,
    roundTotals:roundTotals,
    teamRoundTotal:teamRoundTotal,
    wholeNumber:wholeNumber,
    winnerIndexes:winnerIndexes
  });

  if(global) global.CanastaRules = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
