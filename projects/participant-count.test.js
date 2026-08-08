'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const pages = [
  {file:'cards-score.html',control:'playerCount'},
  {file:'pinochle.html',control:'playerCount'},
  {file:'canasta.html',control:'teamCount'},
  {file:'hf-score.html',control:'playerCount'},
  {file:'skyjo.html',control:'playerCount'},
  {file:'qwirkle.html',control:'playerCount'}
];

test('all six scorekeepers load the shared scorecard shell',() => {
  pages.forEach(({file}) => {
    const html = fs.readFileSync(path.join(__dirname,file),'utf8');
    assert.match(html,/<link rel="stylesheet" href="tracker-shell\.css">/);
    assert.doesNotMatch(html,/participant-count\.css/);
  });
});

test('every player or team count renderer marks exactly which button is selected',() => {
  pages.forEach(({file,control}) => {
    const html = fs.readFileSync(path.join(__dirname,file),'utf8');
    assert.match(html,new RegExp(`id="${control}"[^>]*aria-label="[^"]+"`));
    assert.match(html,new RegExp(`SiteScorecards\\.syncCountButtons\\('#${control}',state\\.(?:playerCount|teamCount)(?:,\\{|\\))`));
    assert.match(html,new RegExp(`getElementById\\('${control}'\\)\\.addEventListener\\('click'`));
  });
});

test('the shared style gives the selected count a strong color, inset ring, and status light',() => {
  const css = fs.readFileSync(path.join(__dirname,'tracker-shell.css'),'utf8');
  assert.match(css,/#playerCount button\[aria-pressed="true"\]/);
  assert.match(css,/#teamCount button\[aria-pressed="true"\]/);
  assert.match(css,/background:var\(--green\)/);
  assert.match(css,/box-shadow:inset 0 0 0 3px/);
  assert.match(css,/::after/);
  assert.match(css,/@media\(forced-colors:active\)/);
});
