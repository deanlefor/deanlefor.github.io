# Codex project instructions

## Project and source of truth
- This public repository powers deanlefor.com and several standalone tools. GitHub Pages serves files from the root of `main`; merging or pushing to `main` can change the live site.
- Read `README.md` before working. It documents the site layout, deployment, test commands, privacy requirements, data compatibility rules, and relevant project-specific documentation.
- The primary site and PhD tracker use root-level HTML, CSS, and JavaScript. The Dual-FERS Retirement Planner's React/TypeScript source is in `apps/fers-retirement/`; its generated public files are in `fers-retirement/`. Rebuild generated files from source rather than editing them directly.
- Before changing scorecards, read `projects/SCORECARD-DEVELOPMENT.md` and `projects/SCORECARD-RULES.md`. For FERS calculator changes, consult `apps/fers-retirement/project-docs/`.

## How to work
- Prefer small, focused changes that fit the existing architecture and visual language. Do not rewrite working components, add dependencies, introduce external services, or redesign unrelated pages without a request.
- Preserve responsive layouts, accessibility, semantic HTML, keyboard interactions, and the site's content security policies.
- When revising biography, academic, or professional text, preserve Dean's voice and factual meaning. Do not invent credentials, achievements, dates, or affiliations; flag uncertainties.
- Keep user data compatible. Do not casually change storage keys, backup schemas, migration logic, course/milestone IDs, or share-link formats. Follow the compatibility notes in `README.md` and add relevant regression tests.
- All commits and Git history are public. Never add secrets, private exports, real saved plans, personal research notes, or identifying example data. Use fictional fixtures and follow the repository's privacy guidance.

## Checks and verification
- Use Node.js 24.15 or later. Install locked dependencies with `npm ci` in the root and `npm ci --prefix apps/fers-retirement` when needed.
- For code changes, run `npm test` from the repository root.
- For changes to the FERS calculator, also run `npm run check --prefix apps/fers-retirement`; include the regenerated `fers-retirement/` output and verify it matches the source.
- For changes involving browser behavior, visuals, CSP, storage, or offline caching, check in a real browser when available. Follow the service-worker cache/version guidance in `README.md`. State explicitly if browser verification was not possible.
- Report what changed, the checks actually run, their results, and any remaining risks. Do not claim checks succeeded unless they were run.

## Git and deployment
- Make changes on a focused branch and propose them for review. Do not push directly to `main`, merge a pull request, or trigger a deployment unless Dean specifically requests it.
- Preserve unrelated work. Do not discard changes or rewrite Git history without explicit authorization.
- Keep `README.md` and other maintained project documentation accurate whenever a change affects the workflow or public behavior.
