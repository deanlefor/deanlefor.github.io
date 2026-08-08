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
    Array.prototype.forEach.call(container.querySelectorAll('button[data-count]'),function(button){
      var isActive = Number(button.dataset.count) === selected;
      button.classList.toggle('active',isActive);
      button.setAttribute('aria-pressed',String(isActive));
      if(isActive) activeCount += 1;
    });
    return activeCount;
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
    defaultGameTitle:defaultGameTitle,
    escapeHtml:escapeHtml,
    formatDate:formatDate,
    retainForNewGame:retainForNewGame,
    syncCountButtons:syncCountButtons,
    toast:toast
  });

  if(global) global.SiteScorecards = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
