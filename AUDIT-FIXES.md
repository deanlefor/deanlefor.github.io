# September 2026 website audit fixes

The September 6 audit covered baseline commit `2277ba7`. All 13 recommended
code fixes have been implemented locally. This document records the changes
and their verification; it does not indicate that they have been published.

| Finding | Implemented change |
| --- | --- |
| 1. Shared tracker HTML injection | Validate shared/imported snapshots and escape profile and course text in every screen and the print report. Invalid share links display an error and cannot expose the viewer's saved profile. |
| 2. Incorrect TSP catch-up limits | Preserve the exact 2026 baseline, include the full calendar year in which a person turns 63, and share the limit function between the interface and accumulation. |
| 3. Survivor Social Security | Retain the higher commenced benefit after either person's first planning horizon, consistent with the documented simplified model. |
| 4. Unsafe backup imports | Validate the complete candidate before confirmation or mutation. Invalid files and failed import writes preserve current memory and storage. Supported legacy backups remain readable. |
| 5. Invalid retirement scenarios | Validate dates, chronology, numeric bounds, and enumerations at the engine boundary. Hide invalid scenario results and keep incomplete numeric edits as explained field drafts. |
| 6. Retirement storage failures | Guard initialization and saves, preserve unreadable stored data, retain edits in memory, and provide a visible warning and input download. |
| 7. Run history lost after failed writes | Load storage once and retain authoritative in-memory data, including unsaved additions. Show persistent save-failure status. |
| 8. Slow retirement recalculation | Precompute monthly fixed income once and reuse it during the bounded solver search. Display-name edits reuse the previous numerical projection. |
| 9. Keyboard controls | Use labeled native buttons for menus, switches, tracker completion and selection, and C25K progress; expose expanded/pressed state and preserve focus during tracker redraws. |
| 10. Dependency advisories | Update Vite to 8.2.2 and affected PostCSS/Nano ID dependencies, preserve exact lockfiles, and regenerate the committed retirement build. |
| 11. Wrong run date near UTC midnight | Use the local calendar date on initialization and after logging a run. |
| 12. Broken guide examples | Link a validated sample share view and the existing, inspected example PDF. |
| 13. Disappearing terminal images | Append transcript nodes and animate only the current text node. Clearing the terminal cancels pending output. |

The maintenance recommendations are also implemented: tracker validation and
persistence are separate testable modules; controller names are descriptive;
render templates and TypeScript are formatted; comments explain data ownership,
failure handling, and calculation assumptions; historical terminal FIX markers
are removed. The homepage caches its star color, stops animation while hidden,
and honors reduced motion. The terminal honors reduced motion as well.

PhD backups now include name and email. Restoring an older backup that omits
these fields preserves the device's existing profile. The tracker and run
storage keys are unchanged, as are all scorecard rules, keys, and schemas. The
retirement planner retains its existing key and supported legacy claiming-date
migration. Its downloaded input JSON is a recovery copy; a file-import interface
for retirement scenarios remains outside this release.

## Verification

- **127 website tests passed:** the existing 104 scorecard tests plus 23 tests
  for tracker validation/imports, failed storage, shared and printed text,
  native controls, terminal output, built retirement UI behavior, local dates,
  public JavaScript syntax, public links, and the guide example.
- **24 retirement tests passed**, including baseline and birthday boundaries,
  either survivor order, benefit commencement, invalid scenarios, legacy storage,
  and independent zero-return drawdown examples.
- TypeScript and the production build pass. Unused locals and parameters are
  now checked by TypeScript. The generated site is rebuilt in `fers-retirement/`.
- A repeated production build produced identical files.
- Successful online `npm audit` queries report **zero known vulnerabilities**
  for both the root test tools and retirement dependencies.
- The public sample's eight warm engine runs measured approximately **4.3–4.5
  ms**, compared with about **430 ms** during the audit. These are direct Node
  engine timings on the same machine, not browser or cross-device guarantees.
- The existing example PDF was inspected across all four pages. All local
  links and referenced assets in the 13 public HTML pages resolve on disk; all
  13 pages also return HTTP 200 from the local server.
- A new GitHub Actions workflow runs the whole-site tests and retirement
  checks, and verifies that the generated calculator matches its source.

The DOM regression tests use jsdom, including the actual built React bundle;
they do not substitute for a visual review in a real browser. The final live
browser check could not proceed because the computer was locked. No production
deployment, commit, or push was performed.

The retirement planner's documented exclusions and simplified benefit model
remain in place. These code fixes do not complete a reconciliation of a real
household's figures against official benefit estimates.

## Repeating the checks

With Node.js 24.15 or later, from the repository root:

```bash
npm ci
npm ci --prefix apps/fers-retirement
npm run check --prefix apps/fers-retirement
npm test
npm audit
npm audit --prefix apps/fers-retirement
```

Commit the source, tests, lockfiles, workflow, documentation, and generated
`fers-retirement/` files together when publishing through the normal GitHub
Desktop/GitHub Pages process.
