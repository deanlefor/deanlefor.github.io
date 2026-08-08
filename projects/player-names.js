(function(global){
  'use strict';

  var DATALIST_ID = 'sitePlayerNameSuggestions';
  var currentRoster = [];

  function cleanName(value){
    return String(value == null ? '' : value).trim().replace(/\s+/g,' ');
  }

  function comparisonKey(value){
    var cleaned = cleanName(value);
    try{
      cleaned = cleaned.normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
    }catch(error){}
    return cleaned.toLocaleLowerCase();
  }

  function isPlaceholder(value){
    return /^(?:player|team)\s+\d+$/i.test(cleanName(value));
  }

  function safeParse(raw){
    if(typeof raw !== 'string' || !raw) return null;
    try{ return JSON.parse(raw); }catch(error){ return null; }
  }

  function getStorage(){
    try{ return global && global.localStorage ? global.localStorage : null; }
    catch(error){ return null; }
  }

  function participantLimit(state,field,values){
    var countField = field === 'teams' ? 'teamCount' : 'playerCount';
    var count = Number(state && state[countField]);
    if(!Number.isFinite(count) || count < 1) return values.length;
    return Math.min(values.length,Math.trunc(count));
  }

  function addStateNames(groups,state,field){
    if(!state || typeof state !== 'object') return;
    var values = state[field];
    if(!Array.isArray(values)) return;
    var limit = participantLimit(state,field,values);
    for(var index = 0; index < limit; index += 1){
      var value = values[index];
      var name = cleanName(value && typeof value === 'object' ? value.name : value);
      if(!name || isPlaceholder(name)) continue;
      var key = comparisonKey(name);
      if(!key) continue;
      var group = groups.get(key) || {key:key,count:0,variants:new Map()};
      group.count += 1;
      group.variants.set(name,(group.variants.get(name) || 0) + 1);
      groups.set(key,group);
    }
  }

  function archivedState(entry){
    if(!entry || typeof entry !== 'object') return null;
    return entry.state || entry.game || entry.scorecard || entry;
  }

  function roleKey(game,role){
    var item = Array.isArray(game && game.storageKeys)
      ? game.storageKeys.find(function(storageKey){ return storageKey.role === role; })
      : null;
    return item ? item.key : null;
  }

  function collectRoster(storage,registry){
    var groups = new Map();
    if(!storage || !Array.isArray(registry)) return [];

    registry.forEach(function(game){
      var field = game.nameField;
      if(field !== 'players' && field !== 'teams') return;
      var currentKey = roleKey(game,'currentGame');
      var historyKey = roleKey(game,'history');
      try{
        if(currentKey) addStateNames(groups,safeParse(storage.getItem(currentKey)),field);
        var history = historyKey ? safeParse(storage.getItem(historyKey)) : null;
        if(Array.isArray(history)){
          history.forEach(function(entry){ addStateNames(groups,archivedState(entry),field); });
        }
      }catch(error){}
    });

    return Array.from(groups.values()).map(function(group){
      var variants = Array.from(group.variants.entries()).sort(function(a,b){
        return b[1] - a[1] || a[0].localeCompare(b[0]);
      });
      return {key:group.key,name:variants[0][0],count:group.count};
    }).sort(function(a,b){
      return b.count - a.count || a.name.localeCompare(b.name);
    });
  }

  function registry(){
    return global && global.SiteGamesBackup && Array.isArray(global.SiteGamesBackup.registry)
      ? global.SiteGamesBackup.registry
      : [];
  }

  function ensureDatalist(){
    if(!global || !global.document) return null;
    var list = global.document.getElementById(DATALIST_ID);
    if(!list){
      list = global.document.createElement('datalist');
      list.id = DATALIST_ID;
      global.document.body.appendChild(list);
    }
    return list;
  }

  function renderDatalist(){
    var list = ensureDatalist();
    if(!list) return;
    list.textContent = '';
    currentRoster.forEach(function(person){
      var option = global.document.createElement('option');
      option.value = person.name;
      list.appendChild(option);
    });
  }

  function refresh(options){
    options = options || {};
    var nextRegistry = options.registry || registry();
    var storage = options.storage || getStorage();
    currentRoster = collectRoster(storage,nextRegistry);
    if(options.render !== false) renderDatalist();
    return currentRoster.map(function(item){ return Object.assign({},item); });
  }

  function canonicalName(value,roster){
    var cleaned = cleanName(value);
    if(!cleaned || isPlaceholder(cleaned)) return cleaned;
    var key = comparisonKey(cleaned);
    var match = (roster || currentRoster).find(function(item){ return item.key === key; });
    return match ? match.name : cleaned;
  }

  function editDistance(left,right){
    left = String(left || '');
    right = String(right || '');
    var previous = Array.from({length:right.length + 1},function(_,index){ return index; });
    for(var leftIndex = 1; leftIndex <= left.length; leftIndex += 1){
      var current = [leftIndex];
      for(var rightIndex = 1; rightIndex <= right.length; rightIndex += 1){
        var substitution = previous[rightIndex - 1] +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
        current[rightIndex] = Math.min(
          current[rightIndex - 1] + 1,
          previous[rightIndex] + 1,
          substitution
        );
      }
      previous = current;
    }
    return previous[right.length];
  }

  function similarityScore(left,right){
    if(!left || !right || left === right) return null;
    var shorter = Math.min(left.length,right.length);
    if(shorter >= 3 && (left.startsWith(right) || right.startsWith(left))){
      return Math.abs(left.length - right.length);
    }
    var longest = Math.max(left.length,right.length);
    var threshold = longest <= 4 ? 1 : (longest <= 8 ? 2 : 3);
    var distance = editDistance(left,right);
    return distance <= threshold ? 10 + distance : null;
  }

  function findNearMatch(value,roster){
    var cleaned = cleanName(value);
    var key = comparisonKey(cleaned);
    if(!key || isPlaceholder(cleaned)) return null;
    roster = roster || currentRoster;
    var exact = roster.find(function(item){ return item.key === key; });
    var currentCount = exact ? exact.count : 0;
    var matches = roster.map(function(item){
      var score = similarityScore(key,item.key);
      return score === null ? null : {name:item.name,key:item.key,count:item.count,score:score};
    }).filter(function(item){
      return item && item.count >= currentCount;
    }).sort(function(a,b){
      return a.score - b.score || b.count - a.count || a.name.localeCompare(b.name);
    });
    return matches.length ? matches[0] : null;
  }

  function enhanceInput(input){
    if(!input || typeof input.addEventListener !== 'function') return input;
    ensureDatalist();
    input.setAttribute('list',DATALIST_ID);
    input.setAttribute('aria-autocomplete','list');
    if(input.dataset.sitePlayerNamesBound) return input;
    input.dataset.sitePlayerNamesBound = 'true';
    input.addEventListener('change',function(){
      var standardized = canonicalName(input.value);
      if(input.value === standardized) return;
      input.value = standardized;
      var event;
      try{ event = new global.Event('input',{bubbles:true}); }
      catch(error){ event = global.document.createEvent('Event'); event.initEvent('input',true,false); }
      input.dispatchEvent(event);
    });
    return input;
  }

  function reviewNames(names,options){
    options = options || {};
    var roster = options.roster || refresh({storage:options.storage,registry:options.registry,render:options.render});
    var ask = options.confirmFn || (global && typeof global.confirm === 'function'
      ? global.confirm.bind(global)
      : function(){ return false; });
    var noun = cleanName(options.noun || 'game') || 'game';
    var reviewed = (Array.isArray(names) ? names : []).map(function(name){
      return canonicalName(name,roster);
    });
    var changes = [];

    reviewed.forEach(function(name,index){
      if(!name || isPlaceholder(name)) return;
      var match = findNearMatch(name,roster);
      if(!match) return;
      var occurrenceLabel = match.count === 1 ? 'scorecard' : 'scorecards';
      var message = '“' + name + '” looks similar to “' + match.name +
        '”, which appears in ' + match.count + ' saved or current ' + occurrenceLabel +
        '.\n\nUse “' + match.name + '” instead for this ' + noun + '?';
      if(ask(message)){
        changes.push({index:index,from:name,to:match.name,type:'near-match'});
        reviewed[index] = match.name;
      }
    });

    (Array.isArray(names) ? names : []).forEach(function(original,index){
      var cleaned = cleanName(original);
      if(cleaned !== reviewed[index] && !changes.some(function(change){ return change.index === index; })){
        changes.push({index:index,from:String(original == null ? '' : original),to:reviewed[index],type:'standardized'});
      }
    });
    return {names:reviewed,changed:changes.length > 0,changes:changes};
  }

  function reviewNamesInPlace(target,count,options){
    if(!Array.isArray(target)) return {names:[],changed:false,changes:[]};
    var limit = Math.min(target.length,Math.max(0,Math.trunc(Number(count)) || 0));
    var result = reviewNames(target.slice(0,limit),options);
    if(result.changed){
      result.names.forEach(function(name,index){ target[index] = name; });
    }
    return result;
  }

  var api = {
    refresh:refresh,
    enhanceInput:enhanceInput,
    reviewNames:reviewNames,
    reviewNamesInPlace:reviewNamesInPlace,
    _test:Object.freeze({
      cleanName:cleanName,
      comparisonKey:comparisonKey,
      collectRoster:collectRoster,
      canonicalName:canonicalName,
      editDistance:editDistance,
      findNearMatch:findNearMatch,
      similarityScore:similarityScore,
      isPlaceholder:isPlaceholder
    })
  };

  if(global){
    global.SitePlayerNames = api;
    if(typeof global.addEventListener === 'function'){
      global.addEventListener('storage',function(){ refresh(); });
    }
  }
  if(typeof module !== 'undefined' && module.exports){ module.exports = api; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
