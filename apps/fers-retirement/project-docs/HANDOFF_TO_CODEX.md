# Codex Handoff Guide

## Start here

This repository is the durable continuation point for the Dual-FERS Retirement Planner. Do not recreate the application from the chat history. Read these files first:

1. `project-docs/PROJECT_HISTORY.md`
2. `README.md`
3. `project-docs/PRODUCT_SPEC.md`
4. `project-docs/CALCULATION_RULES.md`
5. `project-docs/ROADMAP.md`
6. `src/lib/calculator.ts`
7. `src/App.tsx`
8. `tests/calculator.test.ts`

## Project owner priorities

1. Preserve working progress and calculation transparency.
2. Validate each calculation against hand calculations before adding breadth.
3. Keep the architecture dual-person and monthly from the beginning.
4. Keep personal financial inputs local to the browser.
5. Use official OPM, TSP, IRS, and SSA sources; document the rule year.
6. Prefer a useful deterministic tool before adding probabilistic complexity.
7. Keep Traditional and Roth balances separate for future tax treatment.

## Visual direction

The selected design is **Journey Timeline**:

- Calm, spacious, professional retirement journey
- Ink navy `#13283F`, warm ivory `#F7F4ED`, person-one blue `#3F6F8F`, person-two sage `#6F927D`, amber `#C9922F`
- Household timeline is the main explanatory device
- Strong serif treatment for the primary income number
- Topic-first progressive-disclosure panels, with Person 1 and Person 2 side by side inside each topic
- Source-separated results for investments, FERS, Social Security, and portfolio use
- Never mix today's-dollar and future-dollar values in the same primary comparison; disclose alternate-basis values separately
- Avoid fintech hype, government seals, and decorative lifestyle photography

## Architecture

- Vite + React + TypeScript
- Client-only static site suitable for GitHub Pages
- Calculation engine isolated in `src/lib/calculator.ts`
- Inputs stored in `localStorage`
- Vite writes the browser-ready build to the repository-level
  `fers-retirement/` directory
- GitHub Pages publishes committed files from `main` at the repository root
- No database, API, authentication, or server-side financial data

## Immediate next task

Enter an actual two-person test scenario through the UI and compare these outputs to independent calculations:

- Projected Traditional and Roth TSP balances
- FERS service and multiplier
- Gross FERS annuity before and after survivor reduction
- FERS annuity supplement
- Fixed income when both retire
- Sustainable monthly income with a $0 legacy target
- Sustainable monthly income with a nonzero legacy target

Document each discrepancy before changing formulas. Add a regression test for every corrected discrepancy.

## Commands

```bash
npm install
npm run dev
npm run test
npm run build
npm run check
```

Before committing any completed calculator change, run `npm run check` and
include the regenerated repository-level `fers-retirement/` directory in the
same commit. The project owner publishes by pushing `main` through GitHub
Desktop; do not add a custom deployment workflow.

## Guardrails

- Do not present the output as an official retirement estimate.
- Do not silently broaden support to CSRS, special-category, disability, or complex service cases.
- Do not hardcode personal household data in the repository.
- Do not replace official-source rules with unsourced secondary explanations.
- Do not combine Traditional and Roth balances merely because taxes are not yet modeled.
- Do not add taxes, Medicare, or Monte Carlo until the Release 0.1 deterministic engine is reconciled.
