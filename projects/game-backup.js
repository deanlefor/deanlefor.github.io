(function(global){
  'use strict';

  var BACKUP_FORMAT = 'game-history-backup';
  var SCHEMA_VERSION = 1;
  var THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  var SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  var META_KEYS = Object.freeze({
    lastSuccessfulExport:'siteGamesBackup.lastSuccessfulExport',
    remindAfter:'siteGamesBackup.remindAfter',
    schemaVersion:'siteGamesBackup.schemaVersion',
    dismissedForSession:'siteGamesBackup.dismissedForSession'
  });

  var GAMES = Object.freeze([
    Object.freeze({
      id:'flexibleCards',
      label:'Flexible Cards Scorecard',
      page:'cards-score.html',
      nameField:'players',
      legacyKind:'cards-scorecard-backup',
      storageKeys:Object.freeze([
        Object.freeze({key:'cardsScorecard.v1', role:'currentGame'}),
        Object.freeze({key:'cardsScorecard.history.v1', role:'history'}),
        Object.freeze({key:'cardsScorecard.darkMode.v1', role:'settings'})
      ])
    }),
    Object.freeze({
      id:'pinochle',
      label:'Pinochle Scorecard',
      page:'pinochle.html',
      nameField:'players',
      legacyKind:'pinochle-scorekeeper-backup',
      storageKeys:Object.freeze([
        Object.freeze({key:'pinochleScorekeeper.v2', role:'currentGame'}),
        Object.freeze({key:'pinochleScorekeeper.history.v1', role:'history'}),
        Object.freeze({key:'pinochleScorekeeper.darkMode.v1', role:'settings'}),
        Object.freeze({key:'pinochleGame', role:'legacyCurrentGame'})
      ])
    }),
    Object.freeze({
      id:'canasta',
      label:'Canasta Scorecard',
      page:'canasta.html',
      nameField:'teams',
      legacyKind:'canasta-scorecard-backup',
      storageKeys:Object.freeze([
        Object.freeze({key:'canastaScorecard.v1', role:'currentGame'}),
        Object.freeze({key:'canastaScorecard.history.v1', role:'history'}),
        Object.freeze({key:'canastaScorecard.darkMode.v1', role:'settings'})
      ])
    }),
    Object.freeze({
      id:'handAndFoot',
      label:'Hand & Foot Scorecard',
      page:'hf-score.html',
      nameField:'players',
      legacyKind:'hand-foot-remastered-scorecard-backup',
      storageKeys:Object.freeze([
        Object.freeze({key:'handFootRemasteredScorecard.v1', role:'currentGame'}),
        Object.freeze({key:'handFootRemasteredScorecard.history.v1', role:'history'}),
        Object.freeze({key:'handFootRemasteredScorecard.darkMode.v1', role:'settings'})
      ])
    }),
    Object.freeze({
      id:'skyjo',
      label:'Skyjo Scorecard',
      page:'skyjo.html',
      nameField:'players',
      legacyKind:'skyjo-scorecard-backup',
      storageKeys:Object.freeze([
        Object.freeze({key:'skyjoScorecard.v1', role:'currentGame'}),
        Object.freeze({key:'skyjoScorecard.history.v1', role:'history'}),
        Object.freeze({key:'skyjoScorecard.darkMode.v1', role:'settings'})
      ])
    })
  ]);

  var SITE_PREFERENCES = Object.freeze({
    label:'Tracker library preferences',
    storageKeys:Object.freeze([
      Object.freeze({key:'trackerLibrary.darkMode.v1', role:'settings'})
    ])
  });

  var pageHooks = {};
  var panel = null;
  var importInput = null;
  var pendingRestore = null;
  var dismissedInMemory = false;
  var initialized = false;

  function own(object,key){
    return Object.prototype.hasOwnProperty.call(object,key);
  }

  function plainObject(value){
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function storageEntry(storage,key){
    var value = storage.getItem(key);
    return {
      present:value !== null,
      encoding:'raw-localStorage-string',
      value:value
    };
  }

  function storageSection(storage,definition){
    var storageKeys = {};
    definition.storageKeys.forEach(function(item){
      storageKeys[item.key] = storageEntry(storage,item.key);
    });
    return {
      label:definition.label,
      storageKeys:storageKeys
    };
  }

  function createBackupDocument(storage,options){
    options = options || {};
    var exportedAt = options.exportedAt instanceof Date
      ? options.exportedAt.toISOString()
      : String(options.exportedAt || new Date().toISOString());
    var games = {};
    GAMES.forEach(function(game){
      var section = storageSection(storage,game);
      section.page = game.page;
      games[game.id] = section;
    });
    return {
      backupFormat:BACKUP_FORMAT,
      schemaVersion:SCHEMA_VERSION,
      exportedAt:exportedAt,
      siteOrigin:String(options.siteOrigin || currentOrigin()),
      exportReason:String(options.exportReason || 'manual-backup'),
      games:games,
      sitePreferences:storageSection(storage,SITE_PREFERENCES)
    };
  }

  function currentOrigin(){
    try{
      return global && global.location && global.location.origin
        ? global.location.origin
        : 'unknown';
    }catch(error){
      return 'unknown';
    }
  }

  function getStorage(){
    try{
      if(!global || !global.localStorage) return null;
      var storage = global.localStorage;
      var probe = 'siteGamesBackup.availabilityProbe.' +
        Date.now().toString(36) + Math.random().toString(36).slice(2);
      storage.setItem(probe,'1');
      storage.removeItem(probe);
      return storage;
    }catch(error){
      return null;
    }
  }

  function getSessionStorage(){
    try{
      return global && global.sessionStorage ? global.sessionStorage : null;
    }catch(error){
      return null;
    }
  }

  function validDate(value){
    if(typeof value !== 'string' || !value) return null;
    var date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function reminderState(storage,sessionStorage,now){
    now = now instanceof Date ? now : new Date(now || Date.now());
    var lastBackup = validDate(safeGet(storage,META_KEYS.lastSuccessfulExport));
    var remindAfter = validDate(safeGet(storage,META_KEYS.remindAfter));
    var dismissed = dismissedInMemory;
    try{
      dismissed = dismissed || !!(sessionStorage && sessionStorage.getItem(META_KEYS.dismissedForSession));
    }catch(error){}
    var overdue = !lastBackup || now.getTime() - lastBackup.getTime() > THIRTY_DAYS_MS;
    var snoozed = !!(remindAfter && remindAfter.getTime() > now.getTime());
    return {
      lastBackup:lastBackup,
      remindAfter:remindAfter,
      overdue:overdue,
      snoozed:snoozed,
      dismissed:dismissed,
      showReminder:overdue && !snoozed && !dismissed
    };
  }

  function safeGet(storage,key){
    try{
      return storage ? storage.getItem(key) : null;
    }catch(error){
      return null;
    }
  }

  function setMetadata(storage,key,value){
    storage.setItem(META_KEYS.schemaVersion,String(SCHEMA_VERSION));
    storage.setItem(key,value);
  }

  function formatDate(date){
    if(!(date instanceof Date)) return 'Never';
    try{
      return new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric'}).format(date);
    }catch(error){
      return date.toLocaleDateString();
    }
  }

  function dateStamp(date){
    return date.toISOString().slice(0,10);
  }

  function downloadJson(documentValue,filename){
    if(!global || !global.document || typeof global.Blob !== 'function' ||
      !global.URL || typeof global.URL.createObjectURL !== 'function'){
      throw new Error('This browser cannot create a local backup download.');
    }
    var blob = new global.Blob([JSON.stringify(documentValue,null,2)],{type:'application/json'});
    var url = global.URL.createObjectURL(blob);
    var link = global.document.createElement('a');
    link.href = url;
    link.download = filename;
    link.hidden = true;
    try{
      global.document.body.appendChild(link);
      link.click();
    }catch(error){
      global.URL.revokeObjectURL(url);
      throw error;
    }finally{
      if(link.parentNode) link.parentNode.removeChild(link);
    }
    global.setTimeout(function(){ global.URL.revokeObjectURL(url); },1000);
    return true;
  }

  function runBeforeExportHook(){
    var pathname = '';
    try{ pathname = global.location.pathname || ''; }catch(error){}
    var registeredIds = Object.keys(pageHooks);
    for(var index = 0; index < registeredIds.length; index += 1){
      var hook = pageHooks[registeredIds[index]];
      if(!hook || typeof hook.beforeExport !== 'function') continue;
      if(!hook.page || pathname.endsWith(hook.page)){
        hook.beforeExport();
        return;
      }
    }
  }

  function downloadAll(){
    var storage = getStorage();
    if(!storage){
      announce('Backup is unavailable because browser storage is blocked.');
      renderPanel();
      return false;
    }
    try{
      runBeforeExportHook();
      var now = new Date();
      var backup = createBackupDocument(storage,{
        exportedAt:now,
        siteOrigin:currentOrigin(),
        exportReason:'manual-backup'
      });
      downloadJson(backup,'game-history-backup-' + dateStamp(now) + '.json');
      pendingRestore = null;
      hideRestoreSummary();
      try{
        setMetadata(storage,META_KEYS.lastSuccessfulExport,backup.exportedAt);
      }catch(metadataError){
        announce('The backup download started, but this browser could not save the new backup date.');
        renderPanel();
        return true;
      }
      try{ storage.removeItem(META_KEYS.remindAfter); }catch(error){}
      clearSessionDismissal();
      announce('All game data was prepared for download. Last backup: ' + formatDate(now) + '.');
      renderPanel();
      return true;
    }catch(error){
      announce(error && error.message ? error.message : 'The backup download could not be created.');
      return false;
    }
  }

  function registerPage(id,options){
    var game = GAMES.find(function(item){ return item.id === id; });
    if(!game) throw new Error('Unknown game backup page: ' + id);
    options = options || {};
    pageHooks[id] = {
      page:game.page,
      beforeExport:typeof options.beforeExport === 'function' ? options.beforeExport : null
    };
  }

  function chooseRestoreFile(){
    if(!getStorage()){
      announce('Restore is unavailable because browser storage is blocked.');
      renderPanel();
      return;
    }
    if(!importInput) ensureImportInput();
    if(importInput){
      importInput.value = '';
      importInput.click();
    }
  }

  function readFile(file){
    return new Promise(function(resolve,reject){
      if(!file){
        reject(new Error('Choose a JSON backup file.'));
        return;
      }
      var reader = new global.FileReader();
      reader.onload = function(){ resolve(String(reader.result || '')); };
      reader.onerror = function(){ reject(new Error('The selected file could not be read.')); };
      reader.readAsText(file);
    });
  }

  function validateEntry(entry,key){
    if(!plainObject(entry) || typeof entry.present !== 'boolean'){
      throw new Error('The backup entry for "' + key + '" is malformed.');
    }
    if(entry.encoding !== 'raw-localStorage-string'){
      throw new Error('The backup entry for "' + key + '" uses an unsupported encoding.');
    }
    if(entry.present && typeof entry.value !== 'string'){
      throw new Error('The backup entry for "' + key + '" is missing its original value.');
    }
    if(!entry.present && entry.value !== null){
      throw new Error('The backup entry for "' + key + '" has an invalid absent value.');
    }
    return {
      key:key,
      present:entry.present,
      value:entry.present ? entry.value : null
    };
  }

  function validateSection(section,definition){
    if(!plainObject(section) || !plainObject(section.storageKeys)){
      throw new Error('The backup is missing ' + definition.label + '.');
    }
    var expectedKeys = definition.storageKeys.map(function(item){ return item.key; });
    Object.keys(section.storageKeys).forEach(function(key){
      if(expectedKeys.indexOf(key) === -1){
        throw new Error('The backup contains an unexpected storage key: "' + key + '".');
      }
    });
    return definition.storageKeys.map(function(item){
      if(!own(section.storageKeys,item.key)){
        throw new Error('The backup is missing the expected storage key "' + item.key + '".');
      }
      var operation = validateEntry(section.storageKeys[item.key],item.key);
      operation.role = item.role;
      operation.owner = definition.label;
      return operation;
    });
  }

  function validateConsolidatedBackup(data){
    if(Number(data.schemaVersion) !== SCHEMA_VERSION){
      throw new Error('Unsupported backup schema version "' + String(data.schemaVersion) +
        '". This site supports schema version ' + SCHEMA_VERSION + '.');
    }
    if(!validDate(data.exportedAt)){
      throw new Error('The backup has an invalid export date.');
    }
    if(!plainObject(data.games)){
      throw new Error('The backup does not contain game data.');
    }
    var expectedGameIds = GAMES.map(function(game){ return game.id; });
    Object.keys(data.games).forEach(function(gameId){
      if(expectedGameIds.indexOf(gameId) === -1){
        throw new Error('The backup contains an unsupported game section: "' + gameId + '".');
      }
    });
    var operations = [];
    var gameSummaries = [];
    GAMES.forEach(function(game){
      if(!own(data.games,game.id)){
        throw new Error('The backup is missing ' + game.label + '.');
      }
      var gameOperations = validateSection(data.games[game.id],game);
      operations = operations.concat(gameOperations);
      gameSummaries.push({
        label:game.label,
        present:gameOperations.filter(function(item){ return item.present; }).length,
        absent:gameOperations.filter(function(item){ return !item.present; }).length
      });
    });
    if(!own(data,'sitePreferences')){
      throw new Error('The backup is missing tracker library preferences.');
    }
    operations = operations.concat(validateSection(data.sitePreferences,SITE_PREFERENCES));
    return {
      sourceFormat:'consolidated',
      exportedAt:data.exportedAt,
      siteOrigin:String(data.siteOrigin || 'unknown'),
      operations:operations,
      gameSummaries:gameSummaries
    };
  }

  function gameKey(game,role){
    var item = game.storageKeys.find(function(storageKey){ return storageKey.role === role; });
    return item ? item.key : null;
  }

  function validateLegacyBackup(data){
    var game = GAMES.find(function(item){ return item.legacyKind === data.kind; });
    if(!game){
      throw new Error('This JSON file is not a supported game backup.');
    }
    if(Number(data.version) !== 1){
      throw new Error('Unsupported legacy backup version "' + String(data.version) + '".');
    }
    var current = data.current || data.currentGame;
    var history = data.history || data.gameArchive;
    if(!plainObject(current) || !Array.isArray(history)){
      throw new Error('The ' + game.label + ' backup is missing its current game or saved-match history.');
    }
    if(data.preferences !== undefined && !plainObject(data.preferences)){
      throw new Error('The legacy backup preferences are malformed.');
    }
    if(data.preferences && data.preferences.darkMode !== undefined &&
      typeof data.preferences.darkMode !== 'boolean'){
      throw new Error('The legacy backup has an invalid dark-mode preference.');
    }
    var operations = [
      {
        key:gameKey(game,'currentGame'),
        present:true,
        value:JSON.stringify(current),
        role:'currentGame',
        owner:game.label
      },
      {
        key:gameKey(game,'history'),
        present:true,
        value:JSON.stringify(history),
        role:'history',
        owner:game.label
      }
    ];
    if(data.preferences && typeof data.preferences.darkMode === 'boolean'){
      operations.push({
        key:gameKey(game,'settings'),
        present:true,
        value:data.preferences.darkMode ? 'true' : 'false',
        role:'settings',
        owner:game.label
      });
    }
    return {
      sourceFormat:'legacy',
      exportedAt:validDate(data.exportedAt) ? data.exportedAt : null,
      siteOrigin:'not recorded',
      operations:operations,
      gameSummaries:[{label:game.label,present:operations.length,absent:0}]
    };
  }

  function validateBackup(data){
    if(!plainObject(data)){
      throw new Error('The selected file must contain one JSON backup object.');
    }
    var plan;
    if(data.backupFormat === BACKUP_FORMAT){
      plan = validateConsolidatedBackup(data);
    }else{
      plan = validateLegacyBackup(data);
    }
    var seen = {};
    plan.operations.forEach(function(operation){
      if(!operation.key || seen[operation.key]){
        throw new Error('The backup contains duplicate or invalid storage keys.');
      }
      seen[operation.key] = true;
    });
    plan.setCount = plan.operations.filter(function(item){ return item.present; }).length;
    plan.removeCount = plan.operations.filter(function(item){ return !item.present; }).length;
    plan.originMismatch = plan.siteOrigin !== 'unknown' &&
      plan.siteOrigin !== 'not recorded' &&
      plan.siteOrigin !== currentOrigin();
    return plan;
  }

  function parseBackupText(text){
    var data;
    try{
      data = JSON.parse(text);
    }catch(error){
      throw new Error('That file is not valid JSON. No browser data was changed.');
    }
    return validateBackup(data);
  }

  function handleSelectedFile(file){
    pendingRestore = null;
    hideRestoreSummary();
    announce('Checking ' + (file && file.name ? file.name : 'the selected file') + '…');
    readFile(file).then(function(text){
      var plan = parseBackupText(text);
      plan.fileName = file.name || 'selected backup';
      pendingRestore = plan;
      showRestoreSummary(plan);
      announce('Backup validated. Review the restore summary before continuing.');
    }).catch(function(error){
      pendingRestore = null;
      hideRestoreSummary();
      announce(error && error.message ? error.message : 'That backup could not be validated.');
    });
  }

  function captureSnapshot(storage,operations){
    var snapshot = [];
    operations.forEach(function(operation){
      var value = storage.getItem(operation.key);
      snapshot.push({
        key:operation.key,
        present:value !== null,
        value:value
      });
    });
    return snapshot;
  }

  function rollback(storage,snapshot){
    var failures = [];
    snapshot.forEach(function(entry){
      try{
        if(entry.present) storage.setItem(entry.key,entry.value);
        else storage.removeItem(entry.key);
      }catch(error){
        failures.push(entry.key);
      }
    });
    return failures;
  }

  function applyRestoreOperations(storage,operations){
    var snapshot = captureSnapshot(storage,operations);
    var ordered = operations.filter(function(item){ return item.present; })
      .concat(operations.filter(function(item){ return !item.present; }));
    try{
      ordered.forEach(function(operation){
        if(operation.present) storage.setItem(operation.key,operation.value);
        else storage.removeItem(operation.key);
      });
    }catch(error){
      var failures = rollback(storage,snapshot);
      var restoreError = new Error(failures.length
        ? 'Restore stopped, and automatic rollback could not recover every key. Use the downloaded safety copy.'
        : 'Restore stopped before completion. The original browser data was rolled back.');
      restoreError.rollbackFailures = failures;
      throw restoreError;
    }
    return snapshot;
  }

  function confirmRestore(){
    if(!pendingRestore) return false;
    var storage = getStorage();
    if(!storage){
      announce('Restore is unavailable because browser storage is blocked.');
      return false;
    }
    var plan = pendingRestore;
    var now = new Date();
    var safetyName = 'game-history-before-restore-' + dateStamp(now) + '.json';
    try{
      runBeforeExportHook();
      var safetyBackup = createBackupDocument(storage,{
        exportedAt:now,
        siteOrigin:currentOrigin(),
        exportReason:'pre-restore-safety-copy'
      });
      downloadJson(safetyBackup,safetyName);
    }catch(error){
      announce('Restore was cancelled because the pre-restore safety copy could not be downloaded.');
      return false;
    }
    try{
      applyRestoreOperations(storage,plan.operations);
    }catch(error){
      announce(error.message);
      return false;
    }
    pendingRestore = null;
    hideRestoreSummary();
    announce('Restore completed. A safety copy of the previous data was downloaded. Refreshing the scorecards…');
    global.setTimeout(function(){
      try{ global.location.reload(); }catch(error){}
    },900);
    return true;
  }

  function cancelRestore(){
    pendingRestore = null;
    hideRestoreSummary();
    announce('Restore cancelled. No browser data was changed.');
  }

  function snoozeReminder(){
    var storage = getStorage();
    if(!storage){
      announce('The reminder could not be postponed because browser storage is blocked.');
      return;
    }
    var remindAt = new Date(Date.now() + SEVEN_DAYS_MS);
    try{
      setMetadata(storage,META_KEYS.remindAfter,remindAt.toISOString());
      announce('Backup reminder postponed until ' + formatDate(remindAt) + '.');
      renderPanel();
    }catch(error){
      announce('The reminder date could not be saved in this browser.');
    }
  }

  function dismissReminder(){
    dismissedInMemory = true;
    var sessionStorage = getSessionStorage();
    try{
      if(sessionStorage) sessionStorage.setItem(META_KEYS.dismissedForSession,'true');
    }catch(error){}
    announce('Backup reminder dismissed for this browser session.');
    renderPanel();
  }

  function clearSessionDismissal(){
    dismissedInMemory = false;
    var sessionStorage = getSessionStorage();
    try{
      if(sessionStorage) sessionStorage.removeItem(META_KEYS.dismissedForSession);
    }catch(error){}
  }

  function ensureImportInput(){
    if(!global || !global.document) return null;
    importInput = global.document.getElementById('importFile');
    if(!importInput){
      importInput = global.document.createElement('input');
      importInput.type = 'file';
      importInput.accept = 'application/json,.json';
      importInput.className = 'game-backup-file-input';
      global.document.body.appendChild(importInput);
    }
    importInput.hidden = true;
    importInput.tabIndex = -1;
    importInput.setAttribute('aria-hidden','true');
    if(!importInput.dataset.gameBackupBound){
      importInput.dataset.gameBackupBound = 'true';
      importInput.addEventListener('change',function(event){
        var file = event.target.files && event.target.files[0];
        if(file) handleSelectedFile(file);
        event.target.value = '';
      });
    }
    return importInput;
  }

  function buildPanel(){
    if(!global || !global.document) return null;
    var host = global.document.querySelector('.wrap');
    var header = host && host.querySelector('.top');
    if(!host || !header) return null;
    var section = global.document.createElement('section');
    section.className = 'game-backup-panel panel';
    section.id = 'gameBackupPanel';
    section.setAttribute('aria-labelledby','gameBackupTitle');
    section.innerHTML =
      '<div class="game-backup-main">' +
        '<div class="game-backup-copy">' +
          '<span class="game-backup-kicker">Local game data</span>' +
          '<strong id="gameBackupTitle">Game backup</strong>' +
          '<p class="game-backup-reminder" data-backup-reminder>Your game history has not been backed up recently. Download a backup to protect it from accidental browser-data deletion.</p>' +
          '<span class="game-backup-date" data-backup-date>Last backup: Never</span>' +
        '</div>' +
        '<div class="game-backup-actions">' +
          '<button class="btn primary" type="button" data-backup-download>Download all game data</button>' +
          '<button class="btn" type="button" data-backup-restore>Restore from backup</button>' +
          '<button class="btn game-backup-reminder-action" type="button" data-backup-snooze>Remind me in 7 days</button>' +
          '<button class="btn ghost game-backup-reminder-action" type="button" data-backup-dismiss>Dismiss</button>' +
        '</div>' +
      '</div>' +
      '<div class="game-backup-restore-summary" data-backup-restore-summary hidden></div>' +
      '<p class="game-backup-status" data-backup-status role="status" aria-live="polite" aria-atomic="true"></p>';
    header.insertAdjacentElement('afterend',section);
    section.querySelector('[data-backup-download]').addEventListener('click',downloadAll);
    section.querySelector('[data-backup-restore]').addEventListener('click',chooseRestoreFile);
    section.querySelector('[data-backup-snooze]').addEventListener('click',snoozeReminder);
    section.querySelector('[data-backup-dismiss]').addEventListener('click',dismissReminder);
    return section;
  }

  function showRestoreSummary(plan){
    if(!panel) return;
    var summary = panel.querySelector('[data-backup-restore-summary]');
    if(!summary) return;
    summary.textContent = '';
    var heading = global.document.createElement('strong');
    heading.textContent = plan.sourceFormat === 'consolidated'
      ? 'Ready to restore all five scorecards'
      : 'Ready to restore ' + plan.gameSummaries[0].label;
    var description = global.document.createElement('p');
    description.textContent = plan.setCount + ' stored ' +
      (plan.setCount === 1 ? 'value will' : 'values will') + ' be written' +
      (plan.removeCount ? ', and ' + plan.removeCount + ' absent ' +
        (plan.removeCount === 1 ? 'key will' : 'keys will') + ' be cleared' : '') +
      '. A complete safety backup of the current game data will download before anything is replaced.';
    var list = global.document.createElement('ul');
    plan.gameSummaries.forEach(function(game){
      var item = global.document.createElement('li');
      item.textContent = game.label + ': ' + game.present + ' stored ' +
        (game.present === 1 ? 'value' : 'values') +
        (game.absent ? ', ' + game.absent + ' absent' : '');
      list.appendChild(item);
    });
    if(plan.originMismatch){
      var warning = global.document.createElement('p');
      warning.className = 'game-backup-warning';
      warning.textContent = 'This backup was created on ' + plan.siteOrigin +
        '. It can be restored here, but browser storage never crosses origins automatically.';
      summary.appendChild(warning);
    }
    var actions = global.document.createElement('div');
    actions.className = 'game-backup-confirm-actions';
    var confirmButton = global.document.createElement('button');
    confirmButton.className = 'btn primary';
    confirmButton.type = 'button';
    confirmButton.textContent = 'Download safety copy and restore';
    confirmButton.addEventListener('click',confirmRestore);
    var cancelButton = global.document.createElement('button');
    cancelButton.className = 'btn';
    cancelButton.type = 'button';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click',cancelRestore);
    actions.appendChild(confirmButton);
    actions.appendChild(cancelButton);
    summary.insertBefore(heading,summary.firstChild);
    summary.appendChild(description);
    summary.appendChild(list);
    summary.appendChild(actions);
    summary.hidden = false;
    confirmButton.focus();
  }

  function hideRestoreSummary(){
    if(!panel) return;
    var summary = panel.querySelector('[data-backup-restore-summary]');
    if(summary){
      summary.hidden = true;
      summary.textContent = '';
    }
  }

  function announce(message){
    if(!panel) return;
    var status = panel.querySelector('[data-backup-status]');
    if(status) status.textContent = message || '';
  }

  function bindToolbarButtons(){
    if(!global || !global.document) return;
    var exportButton = global.document.getElementById('exportBtn');
    var importButton = global.document.getElementById('importBtn');
    if(exportButton && !exportButton.dataset.gameBackupBound){
      exportButton.dataset.gameBackupBound = 'true';
      exportButton.textContent = 'Backup All';
      exportButton.title = 'Download all five scorecards in one JSON backup';
      exportButton.addEventListener('click',downloadAll);
    }
    if(importButton && !importButton.dataset.gameBackupBound){
      importButton.dataset.gameBackupBound = 'true';
      importButton.textContent = 'Restore';
      importButton.title = 'Validate and restore a game backup';
      importButton.addEventListener('click',chooseRestoreFile);
    }
  }

  function renderPanel(){
    if(!panel) return;
    var storage = getStorage();
    var downloadButtons = panel.querySelectorAll('[data-backup-download],[data-backup-restore]');
    if(!storage){
      panel.classList.remove('is-overdue');
      panel.querySelector('[data-backup-reminder]').textContent =
        'Browser storage is unavailable. The scorecards can still run in this tab, but backup and restore are disabled.';
      panel.querySelector('[data-backup-reminder]').hidden = false;
      panel.querySelector('[data-backup-date]').textContent = 'Last backup: unavailable';
      panel.querySelectorAll('.game-backup-reminder-action').forEach(function(button){ button.hidden = true; });
      downloadButtons.forEach(function(button){ button.disabled = true; });
      return;
    }
    downloadButtons.forEach(function(button){ button.disabled = false; });
    var state = reminderState(storage,getSessionStorage(),new Date());
    panel.classList.toggle('is-overdue',state.showReminder);
    var reminder = panel.querySelector('[data-backup-reminder]');
    reminder.textContent =
      'Your game history has not been backed up recently. Download a backup to protect it from accidental browser-data deletion.';
    reminder.hidden = !state.showReminder;
    panel.querySelectorAll('.game-backup-reminder-action').forEach(function(button){
      button.hidden = !state.showReminder;
    });
    panel.querySelector('[data-backup-date]').textContent =
      'Last backup: ' + formatDate(state.lastBackup);
  }

  function init(){
    if(initialized || !global || !global.document) return;
    initialized = true;
    panel = global.document.getElementById('gameBackupPanel') || buildPanel();
    ensureImportInput();
    bindToolbarButtons();
    renderPanel();
    global.addEventListener('storage',function(event){
      if(event && Object.keys(META_KEYS).some(function(name){ return META_KEYS[name] === event.key; })){
        renderPanel();
      }
    });
  }

  var api = {
    registerPage:registerPage,
    downloadAll:downloadAll,
    chooseRestoreFile:chooseRestoreFile,
    init:init,
    constants:Object.freeze({
      backupFormat:BACKUP_FORMAT,
      schemaVersion:SCHEMA_VERSION,
      metadataKeys:META_KEYS
    }),
    registry:GAMES,
    _test:Object.freeze({
      createBackupDocument:createBackupDocument,
      validateBackup:validateBackup,
      parseBackupText:parseBackupText,
      reminderState:reminderState,
      applyRestoreOperations:applyRestoreOperations,
      metaKeys:META_KEYS,
      games:GAMES,
      sitePreferences:SITE_PREFERENCES,
      getStorage:getStorage,
      thirtyDaysMs:THIRTY_DAYS_MS,
      sevenDaysMs:SEVEN_DAYS_MS
    })
  };

  if(global){
    global.SiteGamesBackup = api;
    if(global.document){
      if(global.document.readyState === 'loading'){
        global.document.addEventListener('DOMContentLoaded',init,{once:true});
      }else{
        init();
      }
    }
  }
  if(typeof module !== 'undefined' && module.exports){
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
