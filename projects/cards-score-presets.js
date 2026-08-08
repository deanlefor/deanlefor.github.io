(function(global){
  'use strict';

  var presets = Object.freeze([
    Object.freeze({id:'generic',label:'Generic / Custom',configurable:true,summary:'Choose the game name, win condition, and limit.'}),
    Object.freeze({id:'shanghai-rummy',label:'Shanghai Rummy',title:'Shanghai Rummy',limitType:'rounds',limitValue:7,winnerMode:'low',summary:'7 rounds · Lowest total wins'}),
    Object.freeze({id:'rummy-500',label:'Rummy 500',title:'Rummy 500',limitType:'score',limitValue:500,winnerMode:'high',summary:'First to 500 points · Highest total wins'}),
    Object.freeze({id:'golf',label:'Golf',title:'Golf',limitType:'rounds',limitValue:9,winnerMode:'low',summary:'9 rounds · Lowest total wins'}),
    Object.freeze({id:'sevens',label:'Sevens',title:'Sevens',limitType:'rounds',limitValue:7,winnerMode:'low',summary:'7 rounds · Lowest total wins'}),
    Object.freeze({id:'flip-7',label:'Flip 7',title:'Flip 7',limitType:'score',limitValue:200,winnerMode:'high',summary:'First to 200 points · Highest total wins'}),
    Object.freeze({id:'chickenfoot',label:'Chickenfoot',title:'Chickenfoot',limitType:'rounds',limitValue:10,winnerMode:'low',summary:'10 rounds · Lowest total wins'}),
    Object.freeze({id:'cat-te',label:'Cắt Tê',title:'Cắt Tê',limitType:'score',limitValue:5,winnerMode:'high',summary:'First to 5 points · Highest total wins · Enter 1 for each round winner'})
  ]);

  var presetsById = presets.reduce(function(result,preset){
    result[preset.id] = preset;
    return result;
  },Object.create(null));

  function normalizeId(value){
    var id = String(value == null ? '' : value);
    return Object.prototype.hasOwnProperty.call(presetsById,id) ? id : 'generic';
  }

  function get(value){
    return presetsById[normalizeId(value)];
  }

  function applyToState(state,value){
    if(!state || typeof state !== 'object') return state;
    var preset = get(value);
    state.gamePreset = preset.id;
    if(preset.configurable) return state;
    state.title = preset.title;
    state.limitType = preset.limitType;
    state.limitValue = preset.limitValue;
    state.winnerMode = preset.winnerMode;
    return state;
  }

  function filterRecords(records,value){
    var presetId = normalizeId(value);
    return (Array.isArray(records) ? records : []).filter(function(record){
      return normalizeId(record && record.presetId) === presetId;
    });
  }

  var api = Object.freeze({
    presets:presets,
    normalizeId:normalizeId,
    get:get,
    applyToState:applyToState,
    filterRecords:filterRecords
  });

  if(global) global.CardsScorePresets = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
