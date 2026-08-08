'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const common = require('./scorecard-common.js');
const pages = ['cards-score.html','pinochle.html','canasta.html','hf-score.html','skyjo.html','qwirkle.html'];

function fakeButton(count){
  const classes = new Set();
  const attributes = {};
  return {
    dataset:{count:String(count)},
    classList:{
      toggle(name,enabled){ enabled ? classes.add(name) : classes.delete(name); },
      contains(name){ return classes.has(name); }
    },
    disabled:false,
    setAttribute(name,value){ attributes[name] = value; },
    getAttribute(name){ return attributes[name]; }
  };
}

test('shared text helpers escape markup and format invalid dates safely',() => {
  assert.equal(common.escapeHtml('<Player & "friends">'), '&lt;Player &amp; &quot;friends&quot;&gt;');
  assert.equal(common.escapeHtml(null),'');
  assert.equal(common.formatDate('not-a-date'),'Unknown date');
  assert.match(common.formatDate('2026-08-08T12:30:00Z','en-US'),/2026/);
});

test('new scorecard titles use a friendly local calendar date',() => {
  const date = new Date(2026,7,8,12,0,0);
  assert.equal(common.defaultGameTitle(date,'en-US'),'Saturday, August 8, 2026');
  assert.match(common.defaultGameTitle(),/\S/);
});

test('untouched legacy default titles upgrade without changing real games or custom names',() => {
  const date = new Date(2026,7,8,12,0,0);
  const untouched = {title:'Game Night',rounds:[]};
  assert.equal(common.upgradeLegacyDefaultTitle(untouched,false,date,'en-US'),untouched);
  assert.equal(untouched.title,'Saturday, August 8, 2026');

  const started = {title:'Game Night',rounds:[{}]};
  common.upgradeLegacyDefaultTitle(started,true,date,'en-US');
  assert.equal(started.title,'Game Night');

  const custom = {title:'Family Final',rounds:[]};
  common.upgradeLegacyDefaultTitle(custom,false,date,'en-US');
  assert.equal(custom.title,'Family Final');
});

test('shared count synchronization selects exactly one matching button',() => {
  const buttons = [2,3,4,5].map(fakeButton);
  const container = {querySelectorAll(){ return buttons; }};
  assert.equal(common.syncCountButtons(container,4),1);
  buttons.forEach(button => {
    const selected = button.dataset.count === '4';
    assert.equal(button.classList.contains('active'),selected);
    assert.equal(button.getAttribute('aria-pressed'),String(selected));
  });
});

test('shared count synchronization locks every participant button after progress',() => {
  const buttons = [2,3,4].map(fakeButton);
  const attributes = {};
  const note = {hidden:true};
  const container = {
    querySelectorAll(){ return buttons; },
    setAttribute(name,value){ attributes[name] = value; }
  };
  common.syncCountButtons(container,3,{locked:true,message:note});
  assert.equal(attributes['aria-disabled'],'true');
  assert.equal(note.hidden,false);
  buttons.forEach(button=>assert.equal(button.disabled,true));
});

test('new games retain selected local fields without sharing participant arrays',() => {
  const current = {
    players:['Player One','Player Two'],
    playerCount:2,
    rounds:[{scores:[10,20]}]
  };
  const fresh = {
    players:['Player 1','Player 2'],
    playerCount:4,
    rounds:[]
  };
  const next = common.retainForNewGame(fresh,current,['players','playerCount']);

  assert.equal(next,fresh);
  assert.deepEqual(next.players,current.players);
  assert.notEqual(next.players,current.players);
  assert.equal(next.playerCount,2);
  assert.deepEqual(next.rounds,[]);
  next.players[0] = 'Changed Later';
  assert.equal(current.players[0],'Player One');
});

test('shared toast handles missing markup and replaces an existing timer',async () => {
  const classes = new Set();
  const node = {
    textContent:'',
    attributes:{},
    setAttribute(name,value){ this.attributes[name] = value; },
    classList:{
      add(name){ classes.add(name); },
      remove(name){ classes.delete(name); }
    }
  };
  const document = {getElementById(){ return node; }};
  assert.equal(common.toast('First',{document,duration:20}),true);
  assert.equal(common.toast('Second',{document,duration:1}),true);
  assert.equal(node.textContent,'Second');
  assert.deepEqual(node.attributes,{role:'status','aria-live':'polite','aria-atomic':'true'});
  assert.equal(classes.has('show'),true);
  await new Promise(resolve => setTimeout(resolve,5));
  assert.equal(classes.has('show'),false);
  assert.equal(common.toast('Ignored',{document:{getElementById(){ return null; }}}),false);
});

test('archive upsert replaces an edited match without changing its id or completion date',() => {
  const original = {id:'saved-1',completedAt:'2025-01-01T00:00:00.000Z',state:{score:10}};
  const other = {id:'saved-2',completedAt:'2025-02-01T00:00:00.000Z',state:{score:20}};
  const edited = {id:'new-id',completedAt:'2026-01-01T00:00:00.000Z',state:{score:99}};
  const result = common.upsertArchiveEntry([original,other],edited,'saved-1',250);
  assert.equal(result.replaced,true);
  assert.equal(result.archive.length,2);
  assert.deepEqual(result.archive[0],{
    id:'saved-1',completedAt:'2025-01-01T00:00:00.000Z',state:{score:99}
  });
});

test('archive upsert prepends a new match when no archive edit is active',() => {
  const result = common.upsertArchiveEntry(
    [{id:'saved-1',completedAt:'2025-01-01T00:00:00.000Z'}],
    {id:'new-id',completedAt:'2026-01-01T00:00:00.000Z'},
    null,
    250
  );
  assert.equal(result.replaced,false);
  assert.equal(result.archive.length,2);
  assert.equal(result.archive[0].id,'new-id');
});

test('lifecycle binding flushes pending state on page hide and hidden visibility',() => {
  const windowListeners = {};
  const documentListeners = {};
  const fakeWindow = {
    addEventListener(name,listener){ windowListeners[name] = listener; },
    removeEventListener(name){ delete windowListeners[name]; }
  };
  const fakeDocument = {
    visibilityState:'visible',
    addEventListener(name,listener){ documentListeners[name] = listener; },
    removeEventListener(name){ delete documentListeners[name]; }
  };
  let flushes = 0;
  const dispose = common.bindLifecycleFlush(()=>{flushes += 1;},{window:fakeWindow,document:fakeDocument});
  windowListeners.pagehide();
  documentListeners.visibilitychange();
  fakeDocument.visibilityState = 'hidden';
  documentListeners.visibilitychange();
  assert.equal(flushes,2);
  dispose();
  assert.deepEqual(windowListeners,{});
  assert.deepEqual(documentListeners,{});
});

test('all six scorekeepers use the shared runtime instead of duplicating helpers',() => {
  pages.forEach(file => {
    const html = fs.readFileSync(path.join(__dirname,file),'utf8');
    assert.equal((html.match(/<script src="scorecard-common\.js"><\/script>/g) || []).length,1);
    assert.match(html,/SiteScorecards\.syncCountButtons\(/);
    assert.match(html,/title:\s*SiteScorecards\.defaultGameTitle\(\)/);
    assert.match(html,/SiteScorecards\.upgradeLegacyDefaultTitle\(/);
    assert.doesNotMatch(html,/function escapeHtml\(/);
    assert.doesNotMatch(html,/function formatArchivedDate\(/);
    assert.doesNotMatch(html,/function (?:toast|showToast)\(/);
    const style = (html.match(/<style>([\s\S]*?)<\/style>/) || [,''])[1];
    assert.doesNotMatch(style,/\.archived-game\s*(?:>|\{|\[)/);
    assert.doesNotMatch(style,/\.archive-(?:heading|title|meta|result|body|totals|total|actions)/);
    assert.doesNotMatch(style,/^[ \t]*\.toast\s*\{/m);
  });
});

test('the shared architecture and new-scorekeeper checklist are documented',() => {
  const guide = fs.readFileSync(path.join(__dirname,'SCORECARD-DEVELOPMENT.md'),'utf8');
  const readme = fs.readFileSync(path.join(__dirname,'..','README.md'),'utf8');
  ['tracker-shell.css','score-stats.css','scorecard-common.js','game-backup.js','player-names.js'].forEach(file => {
    assert.match(guide,new RegExp(file.replace('.','\\.')));
  });
  assert.match(guide,/New scorekeeper checklist/);
  assert.match(guide,/Decision record/);
  assert.match(readme,/projects\/SCORECARD-DEVELOPMENT\.md/);
  assert.match(readme,/projects\/SCORECARD-RULES\.md/);
});
