'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const backupApi = require('./game-backup.js');
const {
  applyRestoreOperations,
  createBackupDocument,
  games,
  getStorage,
  metaKeys,
  parseBackupText,
  reminderState,
  sevenDaysMs,
  sitePreferences,
  thirtyDaysMs,
  validateBackup
} = backupApi._test;

class FakeStorage{
  constructor(entries = {}){
    this.values = new Map(Object.entries(entries).map(([key,value]) => [key,String(value)]));
    this.failNextSetFor = null;
  }

  get length(){
    return this.values.size;
  }

  key(index){
    return Array.from(this.values.keys())[index] || null;
  }

  getItem(key){
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key,value){
    if(this.failNextSetFor === key){
      this.failNextSetFor = null;
      throw new Error('Simulated quota failure');
    }
    this.values.set(key,String(value));
  }

  removeItem(key){
    this.values.delete(key);
  }

  snapshot(){
    return Object.fromEntries(this.values);
  }
}

const intendedGameKeys = games.flatMap(game => game.storageKeys.map(item => item.key));
const intendedPreferenceKeys = sitePreferences.storageKeys.map(item => item.key);
const intendedKeys = [...intendedGameKeys,...intendedPreferenceKeys];

function populatedStorage(){
  const entries = {};
  intendedKeys.forEach((key,index) => {
    const samples = [
      '{"players":["Ada","Grace"],"rounds":[1,2]}',
      '[{"winner":"Ada"}]',
      'true',
      '17',
      'null',
      'legacy:not-valid-json:{'
    ];
    entries[key] = samples[index % samples.length];
  });
  entries['unrelated.application.key'] = 'must-stay-private';
  return new FakeStorage(entries);
}

test('registry contains exactly six scorekeepers and every audited key',() => {
  assert.equal(games.length,6);
  assert.deepEqual(
    games.map(game => game.id),
    ['flexibleCards','pinochle','canasta','handAndFoot','skyjo','qwirkle']
  );
  assert.deepEqual(intendedGameKeys,[
    'cardsScorecard.v1',
    'cardsScorecard.history.v1',
    'cardsScorecard.darkMode.v1',
    'pinochleScorekeeper.v2',
    'pinochleScorekeeper.history.v1',
    'pinochleScorekeeper.darkMode.v1',
    'pinochleGame',
    'canastaScorecard.v1',
    'canastaScorecard.history.v1',
    'canastaScorecard.darkMode.v1',
    'handFootRemasteredScorecard.v1',
    'handFootRemasteredScorecard.history.v1',
    'handFootRemasteredScorecard.darkMode.v1',
    'skyjoScorecard.v1',
    'skyjoScorecard.history.v1',
    'skyjoScorecard.darkMode.v1',
    'qwirkleScorecard.v1',
    'qwirkleScorecard.history.v1',
    'qwirkleScorecard.darkMode.v1'
  ]);
  assert.deepEqual(intendedPreferenceKeys,['trackerLibrary.darkMode.v1']);
});

test('consolidated export captures every intended key without mutating storage',() => {
  const storage = populatedStorage();
  const before = storage.snapshot();
  const backup = createBackupDocument(storage,{
    exportedAt:new Date('2026-07-25T12:00:00.000Z'),
    siteOrigin:'https://deanlefor.com'
  });

  assert.equal(backup.backupFormat,'game-history-backup');
  assert.equal(backup.schemaVersion,2);
  assert.equal(backup.siteOrigin,'https://deanlefor.com');
  assert.equal(Object.keys(backup.games).length,6);
  assert.deepEqual(storage.snapshot(),before);

  const exportedKeys = [
    ...Object.values(backup.games).flatMap(game => Object.keys(game.storageKeys)),
    ...Object.keys(backup.sitePreferences.storageKeys)
  ];
  assert.deepEqual(exportedKeys,intendedKeys);
  assert.equal(JSON.stringify(backup).includes('unrelated.application.key'),false);
  assert.equal(JSON.stringify(backup).includes('must-stay-private'),false);
});

test('storage availability checks leave data unchanged and fail closed when access is blocked',() => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const storage = populatedStorage();
  const before = storage.snapshot();
  try{
    Object.defineProperty(globalThis,'localStorage',{
      configurable:true,
      value:storage
    });
    assert.equal(getStorage(),storage);
    assert.deepEqual(storage.snapshot(),before);

    Object.defineProperty(globalThis,'localStorage',{
      configurable:true,
      get(){
        throw new Error('Storage is blocked');
      }
    });
    assert.equal(getStorage(),null);
  }finally{
    if(originalDescriptor){
      Object.defineProperty(globalThis,'localStorage',originalDescriptor);
    }else{
      delete globalThis.localStorage;
    }
  }
});

test('raw strings, malformed JSON, numeric strings, and null-like strings round-trip exactly',() => {
  const source = populatedStorage();
  source.setItem('cardsScorecard.v1','malformed:{not-json');
  source.setItem('cardsScorecard.history.v1','42');
  source.setItem('cardsScorecard.darkMode.v1','null');
  const backup = createBackupDocument(source,{
    exportedAt:new Date('2026-07-25T12:00:00.000Z'),
    siteOrigin:'https://deanlefor.com'
  });
  const plan = validateBackup(backup);
  const target = new FakeStorage({'unrelated.application.key':'untouched'});

  applyRestoreOperations(target,plan.operations);

  assert.equal(target.getItem('cardsScorecard.v1'),'malformed:{not-json');
  assert.equal(target.getItem('cardsScorecard.history.v1'),'42');
  assert.equal(target.getItem('cardsScorecard.darkMode.v1'),'null');
  assert.equal(target.getItem('unrelated.application.key'),'untouched');
});

test('a valid consolidated backup restores all game sections and clears only intended absent keys',() => {
  const source = populatedStorage();
  source.removeItem('pinochleGame');
  source.removeItem('skyjoScorecard.darkMode.v1');
  const backup = createBackupDocument(source,{
    exportedAt:new Date('2026-07-25T12:00:00.000Z'),
    siteOrigin:'https://deanlefor.com'
  });
  const plan = parseBackupText(JSON.stringify(backup));
  const target = populatedStorage();
  target.setItem('pinochleGame','old legacy value');
  target.setItem('skyjoScorecard.darkMode.v1','true');
  target.setItem('unrelated.application.key','still unrelated');

  applyRestoreOperations(target,plan.operations);

  assert.equal(target.getItem('pinochleGame'),null);
  assert.equal(target.getItem('skyjoScorecard.darkMode.v1'),null);
  intendedKeys.forEach(key => assert.equal(target.getItem(key),source.getItem(key)));
  assert.equal(target.getItem('unrelated.application.key'),'still unrelated');
});

test('invalid JSON, unrelated JSON, and unsupported schemas are rejected before writes',() => {
  const target = populatedStorage();
  const before = target.snapshot();

  assert.throws(() => parseBackupText('{bad json'),/not valid JSON/);
  assert.throws(() => parseBackupText('{"hello":"world"}'),/not a supported game backup/);

  const backup = createBackupDocument(target,{
    exportedAt:new Date('2026-07-25T12:00:00.000Z'),
    siteOrigin:'https://deanlefor.com'
  });
  backup.schemaVersion = 99;
  assert.throws(() => validateBackup(backup),/Unsupported backup schema version/);
  assert.deepEqual(target.snapshot(),before);
});

test('unexpected or missing storage keys make a consolidated backup invalid',() => {
  const backup = createBackupDocument(populatedStorage(),{
    exportedAt:new Date('2026-07-25T12:00:00.000Z'),
    siteOrigin:'https://deanlefor.com'
  });
  backup.games.skyjo.storageKeys['unrelated.key'] = {
    present:true,
    encoding:'raw-localStorage-string',
    value:'bad'
  };
  assert.throws(() => validateBackup(backup),/unexpected storage key/);

  delete backup.games.skyjo.storageKeys['unrelated.key'];
  delete backup.games.skyjo.storageKeys['skyjoScorecard.v1'];
  assert.throws(() => validateBackup(backup),/missing the expected storage key/);
});

test('schema-1 backups from before Qwirkle remain restorable without touching Qwirkle data',() => {
  const backup = createBackupDocument(populatedStorage(),{
    exportedAt:new Date('2026-07-25T12:00:00.000Z'),
    siteOrigin:'https://deanlefor.com'
  });
  backup.schemaVersion = 1;
  delete backup.games.qwirkle;

  const plan = validateBackup(backup);
  assert.equal(plan.sourceFormat,'consolidated');
  assert.equal(plan.gameSummaries.length,5);
  assert.equal(plan.operations.some(operation => operation.key.startsWith('qwirkleScorecard.')),false);
});

test('restore rolls back earlier writes if any storage operation fails',() => {
  const target = new FakeStorage({one:'original one',two:'original two',unrelated:'safe'});
  target.failNextSetFor = 'two';
  const operations = [
    {key:'one',present:true,value:'replacement one'},
    {key:'two',present:true,value:'replacement two'}
  ];

  assert.throws(
    () => applyRestoreOperations(target,operations),
    /original browser data was rolled back/
  );
  assert.deepEqual(target.snapshot(),{
    one:'original one',
    two:'original two',
    unrelated:'safe'
  });
});

test('legacy version-1 full backups remain safely restorable by declared kind',() => {
  games.forEach(game => {
    const plan = validateBackup({
      kind:game.legacyKind,
      version:1,
      exportedAt:'2025-01-01T00:00:00.000Z',
      current:{title:game.label},
      history:[{id:'saved-game'}],
      preferences:{darkMode:true}
    });
    assert.equal(plan.sourceFormat,'legacy');
    assert.equal(plan.gameSummaries[0].label,game.label);
    assert.equal(plan.operations.length,3);
  });
});

test('no-backup and more-than-30-day states are overdue; a recent backup is not',() => {
  const now = new Date('2026-07-25T12:00:00.000Z');
  const empty = new FakeStorage();
  assert.equal(reminderState(empty,new FakeStorage(),now).showReminder,true);

  const exactBoundary = new FakeStorage({
    [metaKeys.lastSuccessfulExport]:new Date(now.getTime() - thirtyDaysMs).toISOString()
  });
  assert.equal(reminderState(exactBoundary,new FakeStorage(),now).showReminder,false);

  const overdue = new FakeStorage({
    [metaKeys.lastSuccessfulExport]:new Date(now.getTime() - thirtyDaysMs - 1).toISOString()
  });
  assert.equal(reminderState(overdue,new FakeStorage(),now).showReminder,true);

  const recent = new FakeStorage({
    [metaKeys.lastSuccessfulExport]:new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
  });
  assert.equal(reminderState(recent,new FakeStorage(),now).showReminder,false);
});

test('seven-day snooze and session dismiss hide reminders without recording a backup',() => {
  const now = new Date('2026-07-25T12:00:00.000Z');
  const storage = new FakeStorage({
    [metaKeys.remindAfter]:new Date(now.getTime() + sevenDaysMs).toISOString()
  });
  const session = new FakeStorage();
  const snoozed = reminderState(storage,session,now);
  assert.equal(snoozed.snoozed,true);
  assert.equal(snoozed.showReminder,false);
  assert.equal(storage.getItem(metaKeys.lastSuccessfulExport),null);

  storage.removeItem(metaKeys.remindAfter);
  session.setItem(metaKeys.dismissedForSession,'true');
  const dismissed = reminderState(storage,session,now);
  assert.equal(dismissed.dismissed,true);
  assert.equal(dismissed.showReminder,false);
  assert.equal(storage.getItem(metaKeys.lastSuccessfulExport),null);
});

test('the shared last-backup timestamp produces the same status on every page',() => {
  const now = new Date('2026-07-25T12:00:00.000Z');
  const sharedStorage = new FakeStorage({
    [metaKeys.lastSuccessfulExport]:now.toISOString(),
    [metaKeys.schemaVersion]:'1'
  });
  const libraryStatus = reminderState(sharedStorage,new FakeStorage(),now);
  const skyjoStatus = reminderState(sharedStorage,new FakeStorage(),now);
  assert.equal(libraryStatus.lastBackup.toISOString(),now.toISOString());
  assert.equal(skyjoStatus.lastBackup.toISOString(),now.toISOString());
  assert.equal(libraryStatus.showReminder,false);
  assert.equal(skyjoStatus.showReminder,false);
});

test('all seven game-facing pages load the shared utility and each scorekeeper registers once',() => {
  const directory = __dirname;
  const pages = [
    'scorecards.html',
    'cards-score.html',
    'pinochle.html',
    'canasta.html',
    'hf-score.html',
    'skyjo.html',
    'qwirkle.html'
  ];
  pages.forEach(file => {
    const html = fs.readFileSync(path.join(directory,file),'utf8');
    assert.match(html,/<script src="game-backup\.js"><\/script>/);
    assert.doesNotMatch(html,/function export(?:Data|State)\s*\(/);
    assert.doesNotMatch(html,/function import(?:Data|State)\s*\(/);
  });

  const registered = pages.slice(1).map(file => {
    const html = fs.readFileSync(path.join(directory,file),'utf8');
    const match = html.match(/SiteGamesBackup\.registerPage\('([^']+)'/);
    assert.ok(match,'Expected a shared-backup registration in ' + file);
    return match[1];
  });
  assert.deepEqual(registered,['flexibleCards','pinochle','canasta','handAndFoot','skyjo','qwirkle']);
});
