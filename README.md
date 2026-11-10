# deanlefor.com

A personal website for Dean Lefor — Deputy Assistant Inspector General for 
Management at NASA OIG, PhD student in Public Administration at Virginia Tech, 
and Board of Trustees member for Fairfax County Public Library.

The site covers his federal oversight work, doctoral interests in public
administration, organizational theory, and government accountability, and civic
service. It also hosts a pair of
tools for VT PAPA doctoral students:

- **tracker.html** — A PhD planning and progress tracker built from the CPAP 
  Policy Guide, covering coursework scheduling, dissertation and DMP credit 
  tracking, and major program milestones.
- **tracker-guide.html** — A user guide and FAQ for the tracker.

The original retro DOS-style terminal is still accessible at terminal.html.

The site is primarily built with HTML, CSS, and JavaScript. Larger applications
keep their source under `apps/`; their browser-ready builds are committed at
their public URL paths so GitHub Pages can publish everything directly from the
`main` branch.

## Site structure

- **Root HTML files** — The personal homepage, doctoral tracker, tracker guide,
  and retro terminal.
- **employees/** — Workforce Allocation Studio, a client-side staffing and budget
  scenario calculator at `/employees/`. The `/EMPLOYEES/` path redirects to the
  canonical lowercase URL. Build any number of role types (1–30), enter fully
  loaded position costs, lock specific headcounts or reserve dollar amounts,
  set minimums, maximums, and relative priorities, and generate constrained
  allocations. Four modes: balanced priority-based funding (heuristic),
  priority-weighted headcount, maximum headcount, or budget utilization.
  The last three use an exact bounded integer solver when feasible and label
  approximate results when they fall back to a heuristic. Current and saved
  scenarios are stored under `workforce-allocation-studio:v1` in localStorage;
  export/import JSON backups or export scenario comparisons as CSV. Saved
  scenarios retain their own budget, role types and constraints. No backend,
  dependencies, or network data transfer. Fictional default figures should
  not be mistaken for actual staffing data.
- **margin-maker/** — A self-contained Paper & Ink landing page for the
  open-source macOS PDF margin utility, with a synthetic interactive comparison.
  See its README for asset provenance, preview instructions, and content sources.
- **projects/** — Standalone tools and scorecards, including
  **projects/project-tracker/** for one-tap project timers with local history,
  session statistics, CSV exports, and JSON backups. Version 2 groups projects
  into editable Work, School, Personal, and custom buckets, with separate
  statistics and history. One timer runs across the app; switching buckets does
  not stop it. Moving a project moves its history too. CSV export and history
  clearing apply to the selected bucket; JSON backups include all buckets.
  It supports Home Screen installation and offline use after an initial visit.
  Version 1 records migrate into Work. Version 2 saves under
  `project-tracker-local-v2`, retaining the original `talk-timer-local-v1` copy
  for older tabs. Both backup versions can be restored. The original
  `project-tracker.js` remains available for cached version 1 pages; the current
  page uses `project-tracker-v2.js` and `project-tracker-data.js`. See
  **projects/SCORECARD-DEVELOPMENT.md** before adding or restructuring a
  scorekeeper, and **projects/SCORECARD-RULES.md** for the maintained scoring
  contracts and deliberate house rules.
- **projects/list-mixer/** — An unlisted, self-contained list randomizer with
  a shared library, named setups, bulk TXT/CSV imports, and JSON backups. It
  carries `noindex` and is intentionally absent from navigation, project
  listings, and the sitemap. Data stays in browser storage under
  `list-mixer:workspace:v1`. Version 1.18 retains compact rows, All/Selected views,
  and drag handles. Dragging shows an insertion line and scrolls the list near
  its edges. Clicking a handle opens a position picker; Arrow Up/Down and
  Home/End work on focused handles, and Escape cancels a drag. Reordering a
  Selected or searched view permutes only visible slots, leaving every hidden
  list in its exact saved position. All/Selected and search filters never alter selections, counts,
  locks or results. Each setup stores its own All/Selected choice in workspace
  data, saved immediately and restored on setup changes, refresh and reopening.
  New setups start with All; duplicates inherit the original choice, and backup
  restore/merge preserves each setup's view. Upgrading local version-1 through
  version-5 saves copies the former `list-mixer:list-view:v1` browser preference
  into each existing setup once (invalid/unavailable preferences default to All).
  The legacy key is no longer written and cannot override version-6 views.
  Search remains tab-local. Full order and view are included in backups. Item
  contents remain available in Edit. All/Selected
  counts and empty-view controls keep shown lists reachable; Show / hide lists
  opens the full library visibility checklist. Unchecking
  and rechecking lists preserves their remembered positions.
  Version 1.18 adds Include output text above the result. It enables/disables
  all before/after text, including linked sub-list phrases, without clearing
  saved wording or rerolling. Category visibility, labels, separators and
  instructions are independent; saved history and favorites stay unchanged.
  Each setup stores includeOutputText (default true), immediately persisted
  and included in backup schema 13. Duplicates inherit the choice; new setups
  and schemas 1–12 default to on. Output dialogs explain when text is off.
  Version 1.17 groups Generate, Copy result and Favorite above the output in
  equal-size green buttons, with a three-button row on small screens. Favorite
  keeps its pressed state and star/label feedback; copying and saving behavior
  are unchanged. Storage and backup schema 12 remain unchanged.
  Version 1.16 adds Separate with: Commas, Spaces, or New lines. The selected
  separator applies between lists, multiple picks, and visible category/child
  values, with or without list names. Typed punctuation, explicit whitespace,
  and instruction blocks are preserved. Changes immediately reformat current
  output without rerolling and save per setup as outputSeparator. Duplicates
  inherit it; new setups default to commas. Refresh and backups retain it.
  Child before/after text now applies automatically when a parent draws the
  child's category. The child phrase is formatted first, then category visibility
  and parent text apply. Shared children work with each parent's options;
  Draw separately remains an extra independent draw. Separate multi-item child
  draws still receive a single surrounding phrase. Child editor previews show
  the result through one linked parent, preferring a selected parent and its
  current matching picks. Parent previews retain all child settings.
  Version 1.15 adds an Output dialog for each list, separate from the shared
  list editor. Per-profile options hide a drawn category when a linked child
  exists, and add text before and/or after that list's picks. Unlinked values
  remain visible. Added text wraps multiple picks from the list once; labeled
  output uses one label for that phrase. Without added text, each pick receives
  its own label. The selected separator joins the output. Include list names
  still controls the list label independently of category suppression.
  Preview uses current picks or up to ten first-item examples without consuming
  randomness. Apply immediately reformats the current result without rerolling;
  raw category/child pairs, odds, locks, other profiles, history and favorites
  stay unchanged. Cancel/Escape discard drafts, Reset clears the draft, and
  Apply offers Undo. Lock controls retain the full pair for identification.
  Parent options surround automatic child phrases; child text applies both
  automatically and to separate draws. New profiles/lists default to original formatting; profile
  duplicates copy options. Deletion cleans references and Undo restores them.
  Each setup stores listOutput entries containing listId, hideCategory, before,
  and after. Text fields are limited to 1,000 characters, rendered as plain text,
  and preserved with explicit whitespace. Spacing joins words while simple
  adjacent punctuation remains attached. Refresh and backups retain options;
  backup merge remaps references independently for each imported setup.
  Version 1.14 adds Show / hide lists for each profile (setup). Its searchable
  checklist manages main lists and parent groups; linked children follow their
  parents. Apply saves immediately; Cancel discards the visibility draft.
  Hiding a list unchecks it and releases its direct locks in this setup only.
  A shared child stays available while any parent is shown. Hidden lists stay
  out of All/Selected, search and Select all. Show all restores visibility
  without selecting lists. Saved positions, counts, group expansion, current
  output, favorites, other profiles and shared library contents remain intact.
  Generate applies the selection change. Undo restores visibility and locks.
  Choices persist on reload, duplicate with setups, and travel in backups.
  New profiles show all lists. Each setup's hiddenListIds stores hidden root
  IDs; deleting lists or making them children removes obsolete preferences.
  The editor's Delete list now opens an explicit all-profile confirmation,
  naming the list and current profile and explaining global removal and link
  cleanup. Cancel is focused initially and preserves the editor draft; Escape
  cancels too. Delete from all profiles confirms deletion with Undo. The
  warning points to Show / hide lists for profile-only changes.
  Each list has a per-setup Draw count (default 1). Generate draws that many
  distinct values per list, in slot order; values can still repeat across lists
  and later results. Duplicate entries weight selection, while each selected
  value is excluded from that list's remaining picks. Counts cannot exceed the
  available distinct values; generation reports an error and preserves output
  if a list later shrinks below its count. A result supports up to 50,000 picks.
  Each pick can be locked independently in its slot. Locks count toward the
  requested total, survive reloads, and are released when their list is
  unchecked/deleted, their value is removed, or their slot exceeds a reduced
  count. Counts and full list order are independent per setup, copied when
  duplicating a setup, and included in backups alongside multi-pick locks.
  The list editor's Clean up button removes blank lines, leading bullets, and
  surrounding whitespace from the draft. Item order and duplicates remain;
  Remove duplicates is a separate action and Save list commits the draft.
  Recent keeps 50 generated results; up to 500 favorites support optional names.
  Both are exact output snapshots: editing or deleting lists, instructions,
  or setups does not rewrite them. Clearing history keeps favorites; removals
  offer Undo. Backup merge retains favorites (deduplicated by exact text) and
  the latest 50 results, remaps imported list IDs, counts and lock slots, and
  appends newly available lists to each setup's remembered order. Matching
  favorites keep an existing name or fill an empty name from the backup.
  Labeled output gives each item a name, or one label for a list phrase with
  before/after text; the chosen separator joins entries. Reusable instruction selections, placements and order belong to
  each setup. Formatting and instruction changes retain current picks.
  Version 1.10 automatically unchecks a parent's directly selected sub-lists
  when that parent is checked. Select all prioritizes parents and independent
  lists, and newly added parent links clear matching child selections in setups
  using that parent. Existing saved overlaps remain visible with the fix action;
  intentional extras may be selected explicitly after the parent. Automatic
  unchecking releases direct child locks and offers Undo, preserving parent
  locks, counts, full list order, current output and saved results. Generate
  applies selection changes. Editing existing link names does not clear extras.
  Version 1.12 keeps linked children in collapsible groups regardless of parent
  or child checkboxes. Expand a group to edit a child or select Draw separately;
  independently selected children stay inside, with their Draw counts and any
  overlap notice. Group summaries show how many are selected separately.
  A shared child belongs to the first shown linked parent in saved order, independent
  of selections; other parents still show its connection and group owner.
  In Selected, unchecked parent containers remain visible when their grouped
  children are selected independently or active through another selected parent.
  Showing a container never selects it or adds a parent draw. Version 1.13
  saves expanded/collapsed parent groups per setup immediately when toggled,
  restoring them after switching setups, refreshing or reopening. New setups
  start collapsed; duplicated setups inherit the source choices. Checking lists,
  Select all, ordinary edits and All/Selected changes preserve expansion.
  Search temporarily exposes matching lists directly; clearing it restores the
  saved groups. Deferred events from detached rows cannot overwrite preferences.
  Grouping is display-only: checking, unchecking and filtering never rewrite
  saved positions. Removing a child's last parent link returns it to its exact
  saved slot. Deleting a parent releases its children; Undo restores links and
  grouping. Reordering visible top-level rows leaves hidden child slots intact.
  Nested children have no reorder handles. Each setup stores expanded parent
  list IDs in expandedGroupIds. Deleted parents and lists losing their final
  child link are removed from those preferences; deletion Undo restores them.
  Import merge remaps expanded parent IDs to imported list copies. Collapsed
  groups are represented by absence from the array. Storage keys are unchanged.
  Version 1.11 adds Selection method to the shared parent list editor:
  Equal categories (the default) preserves existing category and duplicate-entry
  weighting. Equal items gives each distinct category/item pair one chance,
  automatically weighting categories by their distinct child counts. Ten cars
  and three SUVs yield 13 equally likely pairs. Unlinked entries count as one
  choice; duplicate lines count once in this mode, and the same child under two
  categories counts as two different pairs. It uses integer sampling over
  weighted ranges without allocating a flattened list. Multiple draws still
  choose distinct categories; locked or already selected categories are excluded
  from later draws. Locks, current output, history and favorites are unchanged
  by a mode edit. Save applies the method to future unlocked draws in every
  setup using the shared parent. Duplicating the list copies its method.
  Version 1.8 adds one level of linked sub-lists from the shared library.
  In the list editor, an optional link maps exact item text to another list ID.
  A category is drawn first, then one item only from that category's sub-list,
  even when the sub-list is unchecked. Unlinked entries stay plain text.
  Duplicate parent entries retain weighting and share the same link; child
  list size does not change category odds in Equal categories mode. Draw counts apply to distinct parent
  values, with one child per selected category. Children may repeat across
  categories. Checking a child separately adds an independent draw with its
  own count. Plain output includes both values (Car, BMW M3); labeled output
  adds the parent name (Vehicles: Car, BMW M3 with Commas).
  Locks preserve entire pairs and release when either value or link changes.
  Self-links, cycles and chains are rejected; a child list cannot contain links.
  Empty linked lists report an error without changing the current output.
  Renaming an item requires reconnecting its link; removed items lose their
  links on Save. Cleanup carries unambiguous links to cleaned item text and
  asks for relinking when different links collide. Deleting a child removes
  incoming links but retains parent items; Undo restores links and locks.
  Parent duplicates keep links to the same shared children. Snapshots retain
  exact historical pairs, even after source deletion. Backup merge remaps
  parent links, child references and pair locks to the imported list copies.
  Backups now use version 13 of the `list-mixer` format, retaining the workspace
  storage key. Versions 1–12 still import without changing saved output;
  versions 1–5 default to All because they lacked per-setup views. Version 6
  retains each setup's existing view. Other migrations retain list order/count
  defaults and favorite names. Schema-7 linked lists migrate to Equal categories.
  Version-8 backups retain selection methods and start with groups collapsed.
  Version-9 backups retain expanded groups. All earlier schemas start with all
  lists shown. Schema 10 validates unique hidden main-list references and
  rejects selected hidden lists. Merge remaps hidden preferences separately
  for each imported setup. Version-10 backups retain hidden choices and default to original output.
  Schema 11 validates unique known list references, boolean hideCategory and
  bounded before/after text; earlier schemas migrate with no custom output.
  Schema 12 adds a validated outputSeparator enum (commas, spaces, lines).
  Earlier named profiles default to lines and unnamed profiles to commas;
  existing result/history/favorite text is never rewritten during migration.
  Schema-11 list options are retained. Child text applies through parents when
  results are next formatted. Schema 13 validates the per-setup includeOutputText
  boolean; schemas 1–12 migrate with text on and retain all saved wording.
  New backups require app 1.18 or later, so older apps reject them instead of
  silently discarding preferences.
  Lists optionally include `selectionMode: "categories" | "items"` (omission
  means categories) and `links: [{value, listId}]`;
  linked result picks and locks include `child: {listId, name, value}`.
  The existing 8 MB workspace cap includes saved results; failed additions
  preserve existing data. Browser storage quotas may be smaller.
  Inline scripts are authorized by SHA-256 CSP hashes. Update those hashes
  whenever editing the script blocks; `tests/list-mixer.test.js` verifies them.
- **apps/fers-retirement/** — React and TypeScript source and tests for the
  Dual-FERS Retirement Planner, with governing documents under
  `project-docs/`.
- **fers-retirement/** — Committed browser-ready calculator generated by Vite;
  this is the calculator's public URL path.

## Publishing

GitHub Pages publishes from `main` at the repository root. Before committing a
calculator change, run `npm run check` from `apps/fers-retirement/`. That command
runs the calculation tests and rebuilds the committed `fers-retirement/` site.
Push the resulting commit through GitHub Desktop as usual; no custom deployment
workflow is required.

## Checking changes

Use Node.js 24.15 or later. From the repository root:

```bash
npm ci
npm ci --prefix apps/fers-retirement
npm run check --prefix apps/fers-retirement
npm test
```

The root suite checks the scorecards, tracker imports and storage failures,
rendered controls, terminal output, the built retirement interface, public local
links, and JavaScript syntax. The retirement check runs calculation and storage
tests, TypeScript, and the production build. GitHub Actions runs these checks on
pushes and pull requests and rejects a calculator build that differs from its
source. Its deployment remains the normal GitHub Pages branch workflow.

The tracker uses `site-data.js` for guarded persistence and `tracker-data.js` for
its backup schema. Rendering and interaction live in `tracker.js`. Version 1.06 uses the September
2026 CPAP guide and current program guidance that future QEs use constellations.
The QE plan tab saves constellation I–IV and a custom pair when applicable;
Dashboard and full reports show coursework readiness. The QE plan also shows
course completion controls, two required and two optional papers, and exam
preparation checkboxes. Paper details and preparation are additive saved fields;
existing QE milestones are reused without inferring individual paper completion. Eligibility requires five
of six foundation courses, PAPA 6294, PAPA 6514, and all chosen constellation
courses. Keep the `phd-tracker-v2` storage key, existing course/milestone IDs and
schema-1 backup support: constellation fields are additive and default to empty
for older saved plans, backups and links. Loading does not rewrite stored data,
and choosing a constellation does not alter existing completion checkmarks. The run
tracker has a separate schema in `projects/run-tracker-data.js`; the scorecard
schemas and storage keys are maintained independently.

The full report includes a QE course checklist and a requirement reference drawn
from `requirement-info.js`, the same content used by the Courses popovers. Summary
reports omit individual plan details. Tracker scripts and new share links use a
release query parameter; bump these together with the displayed version.

The guide's example share link and `Progress_Report_Example.pdf` use only the
fictional plan in `tests/fixtures/tracker-example.json`. Run
`node scripts/build-tracker-example.js /tmp/papa-tracker-example.html` to update
the example link and generate the report from the real application. Render that
HTML to the example PDF, inspect every page, and update the guide's PDF version
parameter with the release. Never generate public examples from a saved plan.

See [the September 2026 audit fixes](AUDIT-FIXES.md) for the fixes, compatibility
decisions, and verification details.

## Privacy when contributing

Everything committed here is public, including development notes and Git
metadata. Use fictional examples and generic product requirements. Keep
personal planning notes, exports and backups outside this checkout. The
`.private/` fallback directory and known backup/credential filenames are ignored;
never force-add them. `.env.example` is reserved for sanitized placeholders.
Ignoring a file does not remove an earlier committed copy.

Use your account's GitHub noreply address for commits, and enable GitHub's
private-email and push-blocking settings. See the
[GitHub commit email instructions](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address).

Privacy checks scan reachable history with checksum-verified Gitleaks 8.30.1.
The only scanner exception is the exact public retirement localStorage key.
To scan staged changes and reachable history locally with that version installed:

```bash
gitleaks git --pre-commit --staged --config .gitleaks.toml --redact=100 .
gitleaks git --config .gitleaks.toml --log-opts="--all" --redact=100 .
```

The public [privacy explanation](privacy.html) describes browser storage,
sharing, backups and third-party resource requests. Share links default to
omitting the profile; full backups remain complete. Leaflet is vendored under
`vendor/leaflet/` with its license and verified source integrity.

Public pages use a Content Security Policy and suppress outgoing referrers,
except map images, which send only the site origin.
Legacy pages still allow inline handlers, but executable scripts must come
from this origin. The retirement production build uses the stricter
`script-src 'self'` policy injected by Vite. The policies permit only the fonts
and map images each page needs; they do not isolate storage between tools.
After changing resources or inline behavior, check them in a real browser:
DOM tests do not enforce CSP. See the
[CSP reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy).

The run map uses standard OpenStreetMap tiles with visible attribution, normal
browser caching, and origin-only image referrers. Do not add bulk downloads or
offline tile prefetching; see the
[OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

Project Tracker's service worker is scoped to `projects/project-tracker/` and
caches only its own static files. Bump the service worker's cache version
when updating the app's static assets. Its current cache is
`project-tracker-v2`. Project Tracker records stay in
browser storage, separate from the static offline cache.
