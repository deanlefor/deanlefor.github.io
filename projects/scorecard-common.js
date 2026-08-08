(function(global){
  'use strict';

  var toastTimers = typeof WeakMap === 'function' ? new WeakMap() : null;

  function escapeHtml(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g,function(character){
      return {
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
      }[character];
    });
  }

  function formatDate(value,locale){
    var date = new Date(value);
    if(Number.isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleString(locale || [],{
      month:'short',
      day:'numeric',
      year:'numeric',
      hour:'numeric',
      minute:'2-digit'
    });
  }

  function defaultGameTitle(value,locale){
    var date = value === undefined ? new Date() : new Date(value);
    if(Number.isNaN(date.getTime())) date = new Date();
    return date.toLocaleDateString(locale || [],{
      weekday:'long',
      month:'long',
      day:'numeric',
      year:'numeric'
    });
  }

  function upgradeLegacyDefaultTitle(state,hasProgress,value,locale){
    if(!state || typeof state !== 'object' || hasProgress) return state;
    if(String(state.title == null ? '' : state.title).trim() !== 'Game Night') return state;
    state.title = defaultGameTitle(value,locale);
    return state;
  }

  function documentFor(options){
    if(options && options.document) return options.document;
    return global && global.document ? global.document : null;
  }

  function toast(message,options){
    options = options || {};
    var document = documentFor(options);
    if(!document) return false;
    var node = document.getElementById(options.id || 'toast');
    if(!node) return false;
    node.setAttribute('role','status');
    node.setAttribute('aria-live','polite');
    node.setAttribute('aria-atomic','true');
    var duration = Number(options.duration);
    if(!Number.isFinite(duration) || duration < 0) duration = 1700;
    if(toastTimers){
      var previousTimer = toastTimers.get(node);
      if(previousTimer) clearTimeout(previousTimer);
    }
    node.textContent = String(message == null ? '' : message);
    node.classList.add('show');
    var timer = setTimeout(function(){
      node.classList.remove('show');
      if(toastTimers) toastTimers.delete(node);
    },duration);
    if(toastTimers) toastTimers.set(node,timer);
    return true;
  }

  function syncCountButtons(target,value,options){
    var document = documentFor(options);
    var container = typeof target === 'string'
      ? (document ? document.querySelector(target) : null)
      : target;
    if(!container || typeof container.querySelectorAll !== 'function') return 0;
    var selected = Number(value);
    var activeCount = 0;
    var locked = !!(options && options.locked);
    Array.prototype.forEach.call(container.querySelectorAll('button[data-count]'),function(button){
      var isActive = Number(button.dataset.count) === selected;
      button.classList.toggle('active',isActive);
      button.setAttribute('aria-pressed',String(isActive));
      button.disabled = locked;
      if(isActive) activeCount += 1;
    });
    if(typeof container.setAttribute === 'function'){
      container.setAttribute('aria-disabled',String(locked));
    }
    if(options && options.message){
      var message = typeof options.message === 'string'
        ? (document ? document.querySelector(options.message) : null)
        : options.message;
      if(message) message.hidden = !locked;
    }
    return activeCount;
  }

  function upsertArchiveEntry(archive,entry,editingId,limit){
    var next = Array.isArray(archive) ? archive.slice() : [];
    var maximum = Number(limit);
    if(!Number.isInteger(maximum) || maximum < 1) maximum = next.length + 1;
    var sourceId = editingId == null ? '' : String(editingId);
    var index = sourceId
      ? next.findIndex(function(item){ return item && String(item.id) === sourceId; })
      : -1;
    var savedEntry = entry;
    if(index >= 0){
      savedEntry = Object.assign({},entry,{
        id:next[index].id,
        completedAt:next[index].completedAt
      });
      next[index] = savedEntry;
    }else{
      next.unshift(savedEntry);
    }
    return {
      archive:next.slice(0,maximum),
      entry:savedEntry,
      replaced:index >= 0
    };
  }

  function bindLifecycleFlush(flush,options){
    if(typeof flush !== 'function') return function(){};
    options = options || {};
    var windowTarget = options.window || global;
    var documentTarget = options.document || (windowTarget && windowTarget.document);
    function run(){
      try{ return flush(); }catch(error){ return false; }
    }
    function onVisibilityChange(){
      if(documentTarget && documentTarget.visibilityState === 'hidden') run();
    }
    if(windowTarget && typeof windowTarget.addEventListener === 'function'){
      windowTarget.addEventListener('pagehide',run);
    }
    if(documentTarget && typeof documentTarget.addEventListener === 'function'){
      documentTarget.addEventListener('visibilitychange',onVisibilityChange);
    }
    return function(){
      if(windowTarget && typeof windowTarget.removeEventListener === 'function'){
        windowTarget.removeEventListener('pagehide',run);
      }
      if(documentTarget && typeof documentTarget.removeEventListener === 'function'){
        documentTarget.removeEventListener('visibilitychange',onVisibilityChange);
      }
    };
  }

  function retainForNewGame(freshState,currentState,fields){
    if(!freshState || typeof freshState !== 'object') return freshState;
    if(!currentState || typeof currentState !== 'object' || !Array.isArray(fields)) return freshState;
    fields.forEach(function(field){
      if(!Object.prototype.hasOwnProperty.call(currentState,field)) return;
      var value = currentState[field];
      freshState[field] = Array.isArray(value) ? value.slice() : value;
    });
    return freshState;
  }

  var api = Object.freeze({
    bindLifecycleFlush:bindLifecycleFlush,
    defaultGameTitle:defaultGameTitle,
    escapeHtml:escapeHtml,
    formatDate:formatDate,
    retainForNewGame:retainForNewGame,
    syncCountButtons:syncCountButtons,
    toast:toast,
    upsertArchiveEntry:upsertArchiveEntry,
    upgradeLegacyDefaultTitle:upgradeLegacyDefaultTitle
  });

  if(global) global.SiteScorecards = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
