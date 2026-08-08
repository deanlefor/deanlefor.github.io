(function(global){
  'use strict';

  var SCHEMA_VERSION = 3;
  var RULESET_VERSION = 1;
  var MAX_PLAYERS = 3;
  var TRICK_TOTAL = 25;
  var DEFAULT_TARGET = 150;

  function numberOr(value,fallback){
    var number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function nullableNumber(value){
    if(value === '' || value === null || value === undefined) return null;
    var number = Number(value);
    return Number.isFinite(number) ? Math.max(0,number) : null;
  }

  function playerIndexes(count){
    return Array.from({length:count},function(_,index){ return index; });
  }

  function emptyRound(dealer){
    return {
      dealer:Math.max(0,Math.min(MAX_PLAYERS - 1,Math.trunc(numberOr(dealer,0)))),
      bidder:null,
      bid:null,
      trump:'',
      thrown:false,
      meld:Array(MAX_PLAYERS).fill(null),
      tricks:Array(MAX_PLAYERS).fill(null)
    };
  }

  function normalizeRound(round){
    var next = emptyRound(round && round.dealer);
    next.bidder = !round || round.bidder === null || round.bidder === undefined
      ? null
      : Math.max(0,Math.min(MAX_PLAYERS - 1,Math.trunc(numberOr(round.bidder,0))));
    next.bid = nullableNumber(round && round.bid);
    next.trump = String(round && round.trump || '');
    next.thrown = !!(round && (round.thrown || round.handThrown));
    next.meld = Array.from({length:MAX_PLAYERS},function(_,index){ return nullableNumber(round && round.meld && round.meld[index]); });
    next.tricks = Array.from({length:MAX_PLAYERS},function(_,index){ return nullableNumber(round && round.tricks && round.tricks[index]); });
    if(next.thrown) next.tricks = Array(MAX_PLAYERS).fill(null);
    return next;
  }

  function isBidMade(round){
    if(!round || round.thrown || round.bidder === null) return false;
    var trickPoints = numberOr(round.tricks[round.bidder],0);
    if(trickPoints <= 0) return false;
    return numberOr(round.meld[round.bidder],0) + trickPoints >= numberOr(round.bid,0);
  }

  function totalsForRound(round,playerCount){
    var totals = Array(MAX_PLAYERS).fill(0);
    var bid = numberOr(round && round.bid,0);
    var bidder = round && round.bidder;
    var visible = playerIndexes(playerCount);
    if(round && round.thrown){
      visible.forEach(function(index){
        totals[index] = index === bidder ? -bid : numberOr(round.meld[index],0);
      });
      return totals;
    }
    var shutout = visible.find(function(index){ return numberOr(round.tricks[index],0) === TRICK_TOTAL; });
    var bidMade = isBidMade(round);
    visible.forEach(function(index){
      var meld = numberOr(round.meld[index],0);
      var trickPoints = numberOr(round.tricks[index],0);
      if(!bidMade && index === bidder){
        totals[index] = -bid;
      }else if(shutout !== undefined){
        totals[index] = index === shutout ? meld + trickPoints : trickPoints;
      }else if(trickPoints === 0){
        totals[index] = 0;
      }else{
        totals[index] = meld + trickPoints;
      }
    });
    return totals;
  }

  function validateRound(round,playerCount){
    if(!round || round.bidder === null) return 'Select a bidder.';
    if(!numberOr(round.bid,0)) return 'Enter the bid.';
    if(round.thrown) return '';
    var visible = playerIndexes(playerCount);
    if(visible.some(function(index){ return round.tricks[index] === null; })){
      return 'Enter trick points for each player/team.';
    }
    var sum = visible.reduce(function(total,index){ return total + numberOr(round.tricks[index],0); },0);
    return sum === TRICK_TOTAL ? '' : 'Trick points must total ' + TRICK_TOTAL + '. Current total is ' + sum + '.';
  }

  function cumulativeTotals(game,throughIndex){
    var totals = Array(MAX_PLAYERS).fill(0);
    var end = throughIndex === undefined ? game.rounds.length - 1 : throughIndex;
    for(var roundIndex = 0;roundIndex <= end;roundIndex += 1){
      var roundTotals = totalsForRound(game.rounds[roundIndex],game.playerCount);
      playerIndexes(game.playerCount).forEach(function(index){ totals[index] += roundTotals[index]; });
    }
    return totals;
  }

  function leaders(game,totals,indexes){
    indexes = indexes || playerIndexes(game.playerCount);
    if(!indexes.length) return [];
    var best = Math.max.apply(null,indexes.map(function(index){ return totals[index]; }));
    return indexes.filter(function(index){ return totals[index] === best; });
  }

  function winnerIndexes(game,totals){
    totals = totals || cumulativeTotals(game);
    if(!game.rounds.length) return [];
    var target = Math.max(1,numberOr(game.targetScore,DEFAULT_TARGET));
    var reached = playerIndexes(game.playerCount).filter(function(index){ return totals[index] >= target; });
    if(reached.length <= 1) return reached;
    var finalRound = game.rounds[game.rounds.length - 1];
    if(isBidMade(finalRound) && reached.indexOf(finalRound.bidder) >= 0) return [finalRound.bidder];
    return leaders(game,totals,reached);
  }

  var api = Object.freeze({
    DEFAULT_TARGET:DEFAULT_TARGET,
    MAX_PLAYERS:MAX_PLAYERS,
    RULESET_VERSION:RULESET_VERSION,
    SCHEMA_VERSION:SCHEMA_VERSION,
    TRICK_TOTAL:TRICK_TOTAL,
    cumulativeTotals:cumulativeTotals,
    emptyRound:emptyRound,
    isBidMade:isBidMade,
    leaders:leaders,
    normalizeRound:normalizeRound,
    nullableNumber:nullableNumber,
    totalsForRound:totalsForRound,
    validateRound:validateRound,
    winnerIndexes:winnerIndexes
  });

  if(global) global.PinochleRules = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
