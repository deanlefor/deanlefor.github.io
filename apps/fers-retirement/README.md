# Federal Retirement Calculator

A local-first web application for projecting retirement income for a household with two regular FERS employees.

This repository contains the portable version of the Release 0.1 prototype developed in ChatGPT Work. It is intentionally limited to regular FERS employees and is not an official benefit estimator.

## Current capabilities

- Two federal employees with separate birth, service, retirement, Social Security, and planning dates
- Three household phases: both working, one retired, and both retired
- Traditional and Roth TSP balances and employee allocations
- Fixed, percentage, or projected-maximum TSP contributions
- Agency Automatic (1%) and matching contributions
- Separate pre-retirement returns for each employee
- FERS 1.0% and 1.1% general formulas
- Sick-leave service credit approximation
- Full, partial, and no survivor-annuity elections
- Basic FERS annuity supplement estimate
- User-entered Social Security estimates and claiming dates
- Inflation, post-retirement return, survivor spending, and ending-portfolio assumptions
- Estimated sustainable gross monthly income in today's dollars
- Browser-only scenario storage

## Run locally

Requires Node.js 22 or later.

```bash
npm install
npm run dev
```

Run calculation tests and a production build:

```bash
npm run check
```

## Deploy with the personal website

This application lives under `apps/fers-retirement/` in the deanlefor.com
repository. The repository-level Pages workflow tests and builds the calculator,
then publishes its `dist` output at `/fers-retirement/` alongside the existing
static website. Do not add a second calculator-only Pages workflow here.

## Privacy

The application has no database or application backend. Scenario inputs are stored in the browser's `localStorage`. Do not commit personal financial inputs or replace the neutral sample with real household data.

## Project documentation

- [Product specification](docs/PRODUCT_SPEC.md)
- [Calculation rules and limitations](docs/CALCULATION_RULES.md)
- [Release roadmap](docs/ROADMAP.md)
- [Codex handoff guide](docs/HANDOFF_TO_CODEX.md)

## Official rule sources

- [OPM FERS computation](https://www.opm.gov/retirement-center/fers-information/computation/)
- [OPM FERS eligibility](https://www.opm.gov/retirement-center/fers-information/eligibility/)
- [OPM types of retirement and annuity supplement](https://www.opm.gov/retirement-center/fers-information/types-of-retirement/)
- [OPM FERS survivor information](https://www.opm.gov/retirement-center/fers-information/survivors/)
- [TSP contribution types](https://www.tsp.gov/making-contributions/contribution-types/)
- [IRS 2026 retirement-plan limits](https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500)

## Important warning

Results are planning estimates, not guarantees or benefit adjudications. Release 0.1 does not calculate taxes, FEHB, Medicare, IRMAA, RMDs, detailed Social Security rules, divorce orders, military deposits, part-time service, VERA, disability retirement, special-category retirement, CSRS components, or all FERS edge cases.
