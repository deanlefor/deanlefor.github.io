# Scorecard development guide

This directory contains six static, same-origin scorekeepers:

1. Flexible Cards (`cards-score.html`)
2. Pinochle (`pinochle.html`)
3. Canasta (`canasta.html`)
4. Hand & Foot (`hf-score.html`)
5. Skyjo (`skyjo.html`)
6. Qwirkle (`qwirkle.html`)

They intentionally use plain HTML, CSS, JavaScript, and browser `localStorage`. Do not add a build system, framework, server, account system, remote database, analytics upload, or network transfer for game data unless the project requirements explicitly change.

## Non-negotiable compatibility gate

Previously saved scores are part of the product, not disposable implementation detail. A shared-style cleanup or refactor is not complete unless existing current games, finished-game histories, totals, winners, settings, and legacy records still load with the same meaning.

`SCORECARD-RULES.md` is the human-readable rules contract for the six scorekeepers. Update it and the relevant executable rule tests whenever a scoring interpretation changes.

- Do not change an existing storage key, schema version, score formula, winner rule, state-normalization rule, or archive shape as part of an unrelated refactor.
- Do not clear browser storage or rewrite saved data during page load.
- Preserve raw stored values in backup files so legacy strings and malformed-but-recoverable records can be restored exactly.
- Treat a storage or scoring migration as a separate, explicitly reviewed change with fixtures representing old data and a rollback path.
- Before release, compare representative existing games before and after the change: player or team names, every round score, totals, winners, and archived dates must agree.

The automated compatibility tests verify the registered storage keys, page registration, state-loading and archive pipelines, raw-value backup round trips, transactional restore, and protection of unrelated storage. Those tests are a minimum gate; they do not replace loading a real browser backup before publishing a scoring or schema change.

## Shared architecture

Use these files instead of copying their behavior into a scorekeeper:

| Shared file | Responsibility |
| --- | --- |
| `tracker-shell.css` | Theme variables, page shell, buttons, fields, segmented controls, selected player/team count, responsive toolbar, toast presentation, backup panel, and accessibility helpers |
| `score-stats.css` | All-time statistics, saved-match containers, archive summaries, totals, and mobile archive layout |
| `score-stats.js` | Shared statistics aggregation and rendering |
| `scorecard-common.js` | HTML escaping, archived-date formatting, toast behavior, and count-button synchronization |
| `game-backup.js` | Storage registry, consolidated export, validated restore, shared backup date, and reminder UI |
| `player-names.js` | Same-origin name suggestions, spelling normalization, and near-match review |

The game-specific page should retain only its rules, score calculations, state normalization, round-entry UI, and game-specific layout.

## Game-specific rule modules

Shared infrastructure may be generalized; game scoring remains isolated in game-specific testable modules. Each scorekeeper loads its own small browser-compatible/CommonJS-compatible rules file so the browser page and Node tests execute the same calculations.

- Do not create a universal game or scoring engine.
- Keep scoring constants, validation, totals, end conditions, and winner selection in the module for the game that owns those semantics.
- Keep genuinely shared concerns such as archive replacement, lifecycle flushing, participant-count UI state, backup, names, and presentation in the established shared files.
- Similar-looking formulas in different games may intentionally remain separate.

## Required page assets

Keep the existing loading order. The shared shell follows the page-specific style block so it can enforce the common visual contract across the legacy standalone pages.

```html
<link rel="stylesheet" href="score-stats.css">
<style>
  /* Game-specific variables and layouts only. */
</style>
<link rel="stylesheet" href="tracker-shell.css">

<script src="score-stats.js"></script>
<script src="game-backup.js"></script>
<script src="player-names.js"></script>
<script src="scorecard-common.js"></script>
```

Do not redefine these shared selectors in a new page:

- `.btn`, `.panel`, `.field`, `.seg`, `.toolbar`, or `.tracker-home`;
- `.game-history-list`, `.archived-game`, `.archive-*`, or `.match-records`;
- `.toast`, `.sr-only`, or `.game-backup-*`; or
- the active styles for `#playerCount` and `#teamCount`.

Extend the shared stylesheet when a change genuinely belongs to every scorekeeper. Use a game-specific class when the behavior or layout belongs to only one game.

## Shared JavaScript conventions

Use the common helpers directly or create a short page-local alias:

```js
const escapeHtml = SiteScorecards.escapeHtml;
const formatArchivedDate = SiteScorecards.formatDate;
const toast = SiteScorecards.toast;

function renderPlayerCount(){
  SiteScorecards.syncCountButtons('#playerCount', state.playerCount);
}
```

Do not copy implementations of HTML escaping, date formatting, toast timers, or count-button selection into a page.

Keep game calculations local. Similar-looking score functions often encode different rules and should not be generalized merely to reduce line count.

## Storage and backup contract

`game-backup.js` is the source of truth for every scorekeeper and every exported storage key. A new scorekeeper must be added to its `GAMES` registry with:

- a permanent game identifier;
- the page filename and user-facing label;
- `nameField: 'players'` or `nameField: 'teams'`;
- the current-game, history, and settings keys; and
- a legacy backup kind when standalone backups must remain restorable.

Use namespaced keys with an explicit version, for example:

```text
newGameScorecard.v1
newGameScorecard.history.v1
newGameScorecard.darkMode.v1
```

Never rename, clear, reinterpret, or migrate an existing key automatically without a reviewed compatibility plan. Store and restore raw `localStorage` strings through the backup utility so malformed legacy values can still round-trip safely.

Every page must register its save-before-export hook:

```js
SiteGamesBackup.registerPage('newGameIdentifier', {
  beforeExport(){
    // Flush the current in-memory state to its existing storage key.
  }
});
```

## Standard page behavior

A scorekeeper should provide:

- keyboard-accessible player/team count buttons with `data-count` values;
- player or team name fields enhanced by `SitePlayerNames`;
- participant names and the selected count retained when Finish Game or New Game starts a fresh scorecard;
- automatic device-local saving with graceful failure when storage is blocked;
- finished-game history and `ScoreStats` records;
- Backup, Import, Finish Game, and New Game controls;
- a status or toast live region;
- dark mode using the shared theme variables;
- responsive layouts for narrow screens; and
- no network transmission of saved game data.

Use IDs already understood by the shared utilities when applicable: `playerCount` or `teamCount`, `toast`, `exportBtn`, `importBtn`, and `importFile`.

## New scorekeeper checklist

1. Copy the structure of the closest existing game, not all of its game-specific CSS or scoring code.
2. Load every required shared asset exactly once.
3. Define and normalize a versioned state object without mutating stored history during page load.
4. Add the game and all storage keys to the backup registry.
5. Enhance participant inputs with `SitePlayerNames.enhanceInput` and review names before archiving.
6. Render statistics through `ScoreStats` and use the shared archive classes.
7. Synchronize the count selector through `SiteScorecards.syncCountButtons`.
8. Register the page with `SiteGamesBackup.registerPage`.
9. Add the page to `scorecards.html`, the sitemap, and the cross-page test lists.
10. Load representative prior current-game and history data and verify that names, round scores, totals, winners, and dates are unchanged.
11. Test fresh data, storage failure, mobile layout, backup, restore, and invalid restore files.

Run the complete automated suite after every shared change:

```text
node --test projects/*.test.js
```

## Decision record

### 2026-08-08: preserve standalone static pages

The scorekeepers remain independent HTML files so they continue to work on static hosting without a compilation or deployment dependency. Shared CSS and browser scripts provide consistency without introducing a framework.

### 2026-08-08: one origin-wide backup registry

All known game-storage keys are declared once in `game-backup.js`. Export and restore operate from that registry, while each page owns only its save-before-export hook.

### 2026-08-08: shared participant names without a published roster

Names are discovered at runtime from existing same-origin scorecard data. No participant roster is embedded in the source code or transmitted to a server.

### 2026-08-08: common presentation and small runtime helpers

Generic archive styles, toast styles, participant-count highlighting, escaping, date formatting, and count synchronization are shared. Scoring rules and state schemas remain page-specific because combining them would add coupling without eliminating meaningful complexity.

### 2026-08-08: isolated executable rules contracts

Each game keeps a dedicated rules module that can be loaded directly by both its static HTML page and Node's built-in test runner. Shared infrastructure may be generalized, but game scoring is not combined across scorekeepers. The maintained human baseline is `SCORECARD-RULES.md`.
