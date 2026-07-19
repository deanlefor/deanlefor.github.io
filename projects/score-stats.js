(function(global){
  'use strict';

  function escapeHtml(value){
    return String(value).replace(/[&<>"']/g,function(character){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character];
    });
  }

  function number(value){
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function optionalNumber(value){
    if(value === null || value === undefined || value === '') return null;
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function format(value){
    var parsed = number(value);
    return Number.isInteger(parsed)
      ? parsed.toLocaleString()
      : parsed.toLocaleString(undefined,{maximumFractionDigits:1});
  }

  function identity(name){
    return String(name || 'Unnamed').trim().toLocaleLowerCase() || 'unnamed';
  }

  function normalizeRecords(records){
    return (Array.isArray(records) ? records : []).map(function(record){
      var participants = Array.isArray(record && record.participants) ? record.participants.map(function(participant,index){
        return {
          index:index,
          name:String(participant && participant.name || 'Player ' + (index + 1)),
          score:number(participant && participant.score),
          meld:optionalNumber(participant && participant.meld)
        };
      }) : [];
      var winners = Array.isArray(record && record.winnerIndexes)
        ? record.winnerIndexes.map(Number).filter(function(index){ return index >= 0 && index < participants.length; })
        : [];
      return {
        completedAt:String(record && record.completedAt || ''),
        direction:record && record.direction === 'low' ? 'low' : 'high',
        participants:participants,
        winners:winners
      };
    }).filter(function(record){ return record.participants.length && record.winners.length; })
      .sort(function(a,b){ return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(); });
  }

  function calculate(records){
    var people = new Map();
    var highest = null;
    var lowest = null;
    var largestMeld = null;
    var largestMargin = null;

    records.forEach(function(record){
      var winnerSet = new Set(record.winners);
      var tied = record.winners.length > 1;

      record.participants.forEach(function(participant){
        var key = identity(participant.name);
        var person = people.get(key) || {
          key:key,
          name:participant.name,
          games:0,
          wins:0,
          ties:0,
          scoreTotal:0,
          currentStreak:0
        };
        person.name = participant.name;
        person.games += 1;
        person.scoreTotal += participant.score;
        if(winnerSet.has(participant.index)){
          person.wins += 1;
          if(tied) person.ties += 1;
          person.currentStreak += 1;
        }else{
          person.currentStreak = 0;
        }
        people.set(key,person);

        if(!highest || participant.score > highest.score) highest = {name:participant.name,score:participant.score};
        if(!lowest || participant.score < lowest.score) lowest = {name:participant.name,score:participant.score};
        if(participant.meld !== null && (!largestMeld || participant.meld > largestMeld.score)){
          largestMeld = {name:participant.name,score:participant.meld};
        }
      });

      var ordered = record.participants.slice().sort(function(a,b){
        return record.direction === 'low' ? a.score - b.score : b.score - a.score;
      });
      var margin = ordered.length > 1 && !tied ? Math.abs(ordered[0].score - ordered[1].score) : 0;
      if(!largestMargin || margin > largestMargin.margin){
        largestMargin = {
          margin:margin,
          names:record.winners.map(function(index){ return record.participants[index].name; }).join(', ')
        };
      }
    });

    var leaderboard = Array.from(people.values()).sort(function(a,b){
      var aRate = a.games ? a.wins / a.games : 0;
      var bRate = b.games ? b.wins / b.games : 0;
      return b.wins - a.wins || bRate - aRate || b.games - a.games || a.name.localeCompare(b.name);
    });
    var mostWins = leaderboard.length ? leaderboard[0].wins : 0;
    var mostWinners = leaderboard.filter(function(person){ return person.wins === mostWins; });
    var hotStreak = leaderboard.reduce(function(best,person){ return Math.max(best,person.currentStreak); },0);
    var hotPlayers = leaderboard.filter(function(person){ return person.currentStreak === hotStreak && hotStreak > 0; });

    return {
      games:records.length,
      leaderboard:leaderboard,
      highest:highest,
      lowest:lowest,
      largestMeld:largestMeld,
      largestMargin:largestMargin,
      mostWins:mostWins,
      mostWinners:mostWinners,
      hotStreak:hotStreak,
      hotPlayers:hotPlayers
    };
  }

  function highlight(label,value,meta){
    return '<div class="stats-highlight"><div class="stats-label">' + escapeHtml(label) + '</div>' +
      '<div class="stats-value" title="' + escapeHtml(value) + '">' + escapeHtml(value) + '</div>' +
      '<div class="stats-meta" title="' + escapeHtml(meta) + '">' + escapeHtml(meta) + '</div></div>';
  }

  function render(host,records,options){
    if(!host) return;
    var normalized = normalizeRecords(records);
    if(!normalized.length){
      host.innerHTML = '<div class="empty">Finish a game to start building all-time statistics.</div>';
      return;
    }

    var stats = calculate(normalized);
    var mostNames = stats.mostWinners.map(function(person){ return person.name; }).join(', ');
    var hotNames = stats.hotPlayers.map(function(person){ return person.name; }).join(', ');
    var html = '<div class="stats-highlight-grid">';
    html += highlight('Saved matches',format(stats.games),'Stored in this browser');
    html += highlight('Most wins',mostNames,format(stats.mostWins) + (stats.mostWins === 1 ? ' win' : ' wins'));
    html += highlight('Highest score',format(stats.highest.score),stats.highest.name);
    if(options && options.showLargestMeld){
      html += highlight('Largest meld',stats.largestMeld ? format(stats.largestMeld.score) : '—',stats.largestMeld ? stats.largestMeld.name : 'No meld recorded');
    }else{
      html += highlight('Lowest score',format(stats.lowest.score),stats.lowest.name);
    }
    html += highlight('Largest win',format(stats.largestMargin ? stats.largestMargin.margin : 0),stats.largestMargin ? stats.largestMargin.names : '—');
    html += highlight('Hot streak',format(stats.hotStreak),hotNames || 'No active streak');
    html += '</div><div class="stats-leaderboard-title">Player standings</div>';
    html += '<div class="stats-table-wrap"><div class="stats-table">';
    html += '<div class="stats-row stats-row-head"><div>Player</div><div>Wins</div><div>Ties</div><div>Games</div><div>Win %</div><div>Avg</div><div>Streak</div></div>';
    stats.leaderboard.forEach(function(person){
      var winRate = person.games ? Math.round(person.wins / person.games * 100) : 0;
      var average = person.games ? person.scoreTotal / person.games : 0;
      html += '<div class="stats-row"><div class="stats-player" title="' + escapeHtml(person.name) + '">' + escapeHtml(person.name) + '</div>';
      html += '<div class="stats-number">' + format(person.wins) + '</div>';
      html += '<div class="stats-number">' + format(person.ties) + '</div>';
      html += '<div class="stats-number">' + format(person.games) + '</div>';
      html += '<div class="stats-number">' + format(winRate) + '%</div>';
      html += '<div class="stats-number">' + format(average) + '</div>';
      html += '<div class="stats-number">' + format(person.currentStreak) + '</div></div>';
    });
    html += '</div></div>';
    host.innerHTML = html;
  }

  global.ScoreStats = {render:render};
})(window);
