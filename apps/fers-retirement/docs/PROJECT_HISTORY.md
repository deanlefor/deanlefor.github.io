# Federal Retirement Calculator: Project History and Direction

**Status date:** July 14, 2026  
**Purpose:** Preserve the product decisions, reasoning, roadmap, and current development state so a new Codex session can continue without reconstructing the originating conversation.

## Instructions for Codex

Treat this document as project context, not as a substitute for inspecting the repository. Before making changes:

1. Read this document in full.
2. Read `README.md`, `docs/PRODUCT_SPEC.md`, `docs/CALCULATION_RULES.md`, `docs/ROADMAP.md`, and `docs/HANDOFF_TO_CODEX.md`.
3. Inspect `src/lib/calculator.ts`, `src/App.tsx`, and `tests/calculator.test.ts`.
4. Run `npm run check` and preserve the passing baseline.
5. Do not broaden the feature set until the Release 0.1 results have been reconciled against the project owner's independent calculations.

## 1. Project origin

The project began as an effort to create a federal employee retirement calculator that could eventually cover the full retirement-planning lifecycle. The owner wanted to avoid building one enormous application all at once. The initial planning therefore organized the product into ten incremental releases, each of which would be understandable, testable, and useful on its own.

Two principles governed the original roadmap:

1. Every release should produce a working product rather than invisible infrastructure alone.
2. Users should not be required to complete the federal-retirement equivalent of a tax return before receiving an initial projection. The application should use progressive disclosure, permit official estimates where available, and carry saved information into later modules.

The project owner subsequently clarified that the first useful audience would be the owner and spouse, both regular FERS employees. This shifted Release 0.1 from a generic retirement runway into a distinctive dual-federal household calculator.

## 2. Intended product identity

The calculator's defining use case is a household with two federal employees who may have different:

- Dates of birth
- Federal service dates and retirement service computation dates
- Salaries and salary growth
- Planned retirement dates
- TSP balances, contribution elections, and investment returns
- FERS annuities and survivor elections
- Social Security estimates and claiming dates
- Planning horizons

The dual-federal structure is not a later enhancement. It is foundational to the data model and monthly calculation engine. The application must represent at least three household phases:

1. Both spouses working
2. One spouse retired while the other remains employed
3. Both spouses retired

A simplified survivor phase is also necessary because FERS survivor elections affect the annuity received while both spouses are alive and the income available after the first spouse's planning horizon.

## 3. Original ten-release roadmap

### Release 0.1: Household Retirement Runway

The original concept accepted manually entered pensions and Social Security, retirement-account balances, other savings, spending, inflation, returns, and planning ages. It projected annual income, spending, withdrawals, asset balances, depletion, and basic survivor spending.

This release was later expanded substantially for the initial dual-FERS use case. The revised scope is described below.

### Release 0.2: Basic FERS Pension Module

Originally planned to add regular FERS immediate-retirement eligibility, high-3 salary, service, the 1.0% and 1.1% formulas, sick-leave credit, FERS COLAs, retirement dates, and comparison with an official estimate. The core general-formula calculations were moved into Release 0.1 because the owner considered them essential to a minimally useful product.

More exact FERS computation and eligibility work remains appropriate for Release 0.2.

### Release 0.3: Accounts and Withdrawal Strategies

Planned additions include distinct Traditional TSP, Roth TSP, Traditional IRA, Roth IRA, taxable brokerage, and cash accounts; contributions; account-specific returns; withdrawal ordering; RMDs; and multiple withdrawal methods.

Release 0.1 already separates Traditional and Roth TSP balances and contributions so later tax treatment does not require restructuring the data model.

### Release 0.4: Social Security Module

The intended approach is to use estimates from the user's Social Security statement rather than reconstructing a 35-year earnings record. Later capabilities may include claiming by month, early reductions, delayed credits, COLAs, spousal benefits, survivor conversion, and the earnings test.

Release 0.1 accepts user-entered estimates and commencement dates but does not perform a complete Social Security calculation.

### Release 0.5: Federal Tax Module

Planned capabilities include filing status, wages, taxable FERS income, Traditional withdrawals, Roth withdrawals, taxable Social Security, interest, dividends, simplified capital gains, deductions, brackets, and the filing-status change after the first spouse dies.

All 50 state tax systems are intentionally outside the initial scope. A later release may use effective rates or support a limited set of states.

### Release 0.6: FEHB and Medicare Module

Planned capabilities include FEHB premiums and enrollment type, enrollee identity, dual-federal FEHB arrangements, premium growth, Medicare Parts A and B, different Medicare elections, and basic IRMAA calculations.

The calculator should explain eligibility concerns without attempting to adjudicate every coverage-history question.

### Release 0.7: Survivor and Dual-Federal Household Module

This release was intended to make the calculator substantially better than generic retirement tools. Planned comparisons include full, partial, and no FERS survivor elections for either spouse; Social Security survivor conversion; removal of deceased-spouse income; account transfer; filing-status and healthcare changes; survivor spending; life insurance; and survivor sustainability.

Release 0.1 includes only the survivor mechanics necessary to avoid structurally misleading results. A full election-comparison laboratory remains later work.

### Release 0.8: Scenario Laboratory

Planned comparisons include different retirement dates, Social Security claiming dates, survivor elections, FEHB arrangements, spending, withdrawal methods, investment returns, and states. Results should emphasize a limited set of understandable measures rather than an overwhelming data dump.

### Release 0.9: Investment Risk Module

Planned optional capabilities include historical sequences, Monte Carlo simulation, sequence-of-returns risk, depletion probabilities, outcome ranges, sustainable spending, and optional guardrails.

The deterministic engine must be correct and understandable before probabilistic modeling is added.

### Release 1.0: Public-Ready Product

The initial public-ready release should focus on reliability and usability: guided onboarding, quick and detailed modes, unsupported-case warnings, save and reopen, import/export, printable reports, accessibility, plain-language explanations, rule-version documentation, citations, error handling, test cases, and privacy protections.

## 4. Decisions that expanded Release 0.1

The owner identified four results that Release 0.1 must provide at a minimum:

1. Calculate the projected total retirement-account amount.
2. Accept Social Security estimates obtained from the SSA website and separate claiming dates.
3. Calculate FERS annuities for both spouses.
4. Estimate the total gross monthly retirement income the household could support.

This moved several features originally planned for Releases 0.2 through 0.4 into Release 0.1. The expansion was accepted because the initial calculator is limited to two known regular FERS use cases rather than attempting to support the entire federal workforce.

### Release 0.1 supported boundary

The current intended boundary is:

- Two regular FERS employees
- Common unreduced immediate-retirement cases
- Separate career, salary, retirement, TSP, Social Security, return, and planning inputs
- FERS general-formula annuities
- Sick-leave service credit approximation
- Full, partial, and no survivor elections
- Basic FERS annuity supplement estimate
- TSP accumulation with Agency Automatic (1%) and matching contributions
- Traditional and Roth TSP buckets
- User-entered Social Security benefits and dates
- Sustainable gross monthly income
- User-selected planning ages
- User-selected ending portfolio in today's dollars, including zero
- Browser-only storage

The owner confirmed that CSRS should not be a design priority because relatively few remaining employees would require it. Special-category, disability, VERA, deferred, postponed, and other complex cases are also outside Release 0.1.

## 5. Contribution and account decisions

The owner currently contributes to the Traditional TSP rather than Roth TSP or a Roth IRA, but wanted the architecture to permit Roth choices later.

The project therefore made these decisions:

- Traditional TSP and Roth TSP must remain separate balances.
- Traditional IRA and Roth IRA should eventually be separate accounts.
- Traditional and Roth employee TSP contributions share the applicable elective-deferral limit.
- Users should be able to contribute a fixed annual amount, a percentage of salary, or the projected annual maximum.
- Contributions should be modeled across 26 biweekly pay periods, even if the monthly engine aggregates them for computation.
- Agency automatic and matching contributions must be included.
- Agency contributions remain in the Traditional balance.
- Each spouse may have a separate pre-retirement return because their Lifecycle Fund or investment allocation may differ.
- The household should have a separate post-retirement return assumption, with account-level refinement possible later.

Future contribution limits cannot be known. Release 0.1 therefore begins with the official 2026 limits and uses an explicitly labeled growth assumption for future limit scenarios. Projected future limits must never be described as official.

## 6. FERS decisions

Release 0.1 calculates the regular FERS general formula:

- 1.0% of high-3 for each year of service when retiring under age 62, or at age 62 with fewer than 20 years.
- 1.1% of high-3 for each year of service when retiring at age 62 or later with at least 20 years.

The current engine recognizes common unreduced immediate-retirement combinations and warns when an entered case falls outside the supported boundary.

Important implementation decisions:

- Federal start date and retirement service computation date are conceptually different. The application uses a retirement SCD field because breaks, deposits, or other history may make the original start date inappropriate.
- A current high-3 estimate may be projected using salary growth.
- A projected high-3 override is available for an official or independently calculated estimate.
- Sick leave is converted approximately at 2,087 hours per service year, truncated to whole months, and used for the annuity calculation rather than eligibility.
- Full, partial, and no survivor elections are included because omitting the election would overstate the retiree's own annuity or fail to represent survivor protection.

The FERS annuity supplement was added after recognizing that a retirement before age 62 could otherwise be materially understated. Release 0.1 uses a basic approximation based on the user's age-62 Social Security estimate and FERS service. The earnings test and exact OPM computation are not yet implemented.

## 7. Social Security decisions

The project intentionally does not reconstruct Social Security benefits from earnings history in Release 0.1.

Each spouse enters:

- A monthly SSA estimate at age 62, used to approximate the FERS annuity supplement.
- A monthly benefit estimate at the chosen claiming age.
- A benefit commencement date.

Benefits are currently treated as today-dollar estimates. Later work must verify that the wording matches the values displayed in current SSA statements and must implement more complete spousal and survivor rules.

The simplified survivor phase uses a higher-benefit assumption rather than a full SSA survivor calculation. This is an explicit limitation.

## 8. Sustainable-income and legacy decisions

The owner wanted the calculator to support both full portfolio spend-down and preservation of an inheritance.

The application therefore accepts a **target ending portfolio in today's dollars**:

- `$0` permits full portfolio spend-down by the later planning horizon.
- Any positive amount instructs the solver to preserve that inflation-adjusted real amount.

Each spouse selects a planning age rather than an asserted date of death. The target applies at the later spouse's planning horizon.

An important conceptual refinement was made during planning: the calculator should not solve for a constant portfolio withdrawal. It should solve for a level real household-income target. Portfolio withdrawals should vary as FERS, the annuity supplement, and Social Security begin or end.

The headline result is therefore conceptually:

> Fixed retirement income + variable portfolio top-up = estimated sustainable gross monthly household income.

This avoids an artificial income jump when Social Security begins. The portfolio fills a larger gap before Social Security and a smaller gap afterward.

The current result is gross and before taxes, FEHB, Medicare, and IRMAA. It is a deterministic planning estimate rather than a guarantee.

## 9. Survivor-phase decisions

Including survivor elections without modeling any survivor phase would be misleading. Release 0.1 therefore includes a simplified survivor transition:

- Each spouse selects a planning age.
- The first planning horizon ends that spouse's own income.
- The applicable FERS survivor annuity begins for the remaining spouse.
- Social Security uses a simplified higher-benefit treatment.
- The household income target falls to a user-selected percentage of the joint amount.
- The remaining portfolio continues through the later planning horizon.

The initial default survivor-spending assumption is 75% of the joint amount, but it is user-adjustable.

Release 0.1 does not yet compare every survivor-election combination or model all Social Security, tax, healthcare, and life-insurance consequences.

## 10. Visual and interaction direction

Three visual directions were considered:

1. Civic Editorial
2. Analytical Dashboard
3. Journey Timeline

The owner selected **Journey Timeline**.

The selected direction uses:

- A calm, spacious, professional tone
- A dual-person timeline as the primary explanatory device
- Separate retirement milestones aligned on one household time axis
- Ink navy, warm ivory, person-one blue, person-two sage, and amber accents
- A prominent serif treatment for the monthly-income result
- Progressive-disclosure input panels
- Clear distinctions between today's dollars and future dollars
- Accessible focus states and reduced-motion support

The interface should avoid fintech hype, government seals, imitation agency branding, decorative lifestyle photography, and unnecessary animation.

## 11. Technical architecture

The portable repository uses:

- Vite
- React
- TypeScript
- A client-only static build
- GitHub Pages deployment through GitHub Actions
- Browser `localStorage` for scenario persistence
- A calculation engine isolated in `src/lib/calculator.ts`
- A primary interface in `src/App.tsx`
- Calculation tests in `tests/calculator.test.ts`

There is no database, application API, authentication layer, or server-side storage of financial inputs. Personal household values must never be committed to the repository. The bundled sample household is intentionally illustrative.

The application can later be placed behind Cloudflare if public visibility becomes a concern. Public accessibility is not the immediate risk priority; preserving progress and maintaining calculation transparency are higher priorities.

## 12. Current implementation status

The portable Release 0.1 prototype currently:

- Builds successfully as a static Vite application.
- Passes calculation tests covering the 1.1% FERS multiplier, the effect of the legacy target on sustainable income, and Traditional/Roth allocation behavior.
- Includes a GitHub Pages workflow.
- Includes official-source links and a 2026 rule baseline.
- Provides editable dual-person inputs and immediate recalculation.
- Saves the scenario locally in the browser.
- Displays a Journey Timeline and major household income phases.

The initial Git commit created for the portable repository was titled:

`Create portable dual-FERS retirement calculator prototype`

## 13. Official rule sources used so far

Primary sources should continue to govern implementation:

- [OPM FERS computation](https://www.opm.gov/retirement-center/fers-information/computation/)
- [OPM FERS eligibility](https://www.opm.gov/retirement-center/fers-information/eligibility/)
- [OPM types of retirement and annuity supplement](https://www.opm.gov/retirement-center/fers-information/types-of-retirement/)
- [OPM annuity-supplement handbook](https://www.opm.gov/retirement-center/publications-forms/csrsfers-handbook/c051.pdf)
- [OPM Information for FERS Annuitants](https://www.opm.gov/retirement-center/publications-forms/pamphlets/ri90-8.pdf)
- [OPM survivor benefit information](https://www.opm.gov/retirement-center/fers-information/survivors/)
- [TSP contribution types](https://www.tsp.gov/making-contributions/contribution-types/)
- [TSP annual-limit guidance](https://www.tsp.gov/publications/tspfs07.pdf)
- [IRS 2026 retirement-plan limits](https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500)

When adding Social Security calculations, use current official SSA sources rather than secondary summaries.

## 14. Known limitations and unresolved questions

The following items are intentionally unresolved or approximate:

### Calculation precision

- Reconcile monthly contribution timing against an exact 26-pay-period model.
- Verify salary and high-3 projection treatment against realistic pay histories.
- Replace approximate service computation with more exact day/month treatment where justified.
- Confirm sick-leave conversion against OPM examples and boundary conditions.
- Validate FERS COLA timing and first-partial-COLA treatment.
- Validate the supplement approximation and clarify its relationship to the user's SSA estimate.
- Decide how to handle projected future TSP limits beyond a simple growth assumption.

### Social Security

- Confirm whether the SSA input is expressed in today's dollars in every supported workflow.
- Add more exact claiming-month, spousal, survivor, and earnings-test logic in a later release.

### Survivor modeling

- Decide whether planning-age scenarios should support easy reversal of death order.
- Add complete survivor-election comparisons later.
- Incorporate taxes, FEHB, Medicare, life insurance, and account ownership changes in the full survivor module.

### User experience

- Add import/export so a scenario is not tied to one browser.
- Improve input validation and unsupported-case warnings.
- Decide whether users should enter salary changes as one growth rate, scheduled events, or both.
- Add a reproducible report listing inputs, formulas, rule versions, and warnings.

### Scope discipline

- Do not add CSRS merely for completeness.
- Do not add Monte Carlo before the deterministic engine is reconciled.
- Do not add detailed taxes, Medicare, or state rules before Release 0.1 calculations are trusted.

## 15. Immediate next step

The highest-priority next step is empirical reconciliation, not feature expansion.

The owner should enter an actual two-person household scenario and compare the application against independent calculations for:

1. Each spouse's projected Traditional and Roth TSP balances.
2. Creditable service at retirement.
3. Projected high-3 salary.
4. Unreduced FERS annuity.
5. Survivor-election reduction.
6. FERS annuity supplement.
7. Fixed household income when both retire.
8. Sustainable income with a zero legacy target.
9. Sustainable income with a nonzero legacy target.

For each discrepancy:

1. Document the input and expected result.
2. Determine whether the paper calculation or application assumption differs.
3. Verify the governing rule with a primary source.
4. Correct the engine if necessary.
5. Add a regression test before proceeding.

## 16. Development guardrails

- Preserve the working baseline before making significant changes.
- Keep the monthly, two-person architecture.
- Keep Traditional and Roth balances separate.
- Keep personal financial values out of version control.
- Clearly label today's dollars versus future nominal dollars.
- Clearly distinguish an estimate from an official benefit determination.
- Use primary sources and record the rule year.
- Detect unsupported cases rather than silently returning misleading results.
- Prefer progressive disclosure over a single enormous intake form.
- Add regression tests whenever a hand-calculation discrepancy is resolved.
- Preserve an official-estimate override path rather than forcing users to reconstruct every employment detail.

## 17. Definition of near-term success

Release 0.1 should be considered ready for the owner's continuing personal use when:

- The owner's and spouse's TSP projections reconcile within an explained tolerance.
- FERS annuity estimates reconcile with independent calculations or official estimates.
- Supplement estimates are either reconciled or explicitly treated as manual inputs.
- Sustainable-income results respond correctly to retirement dates, Social Security dates, returns, inflation, survivor elections, and legacy targets.
- Every known approximation is visible to the user.
- The tests cover the principal formulas and important boundary conditions.
- The scenario can be exported and restored without exposing the data publicly.

Only after this reconciliation should development proceed materially into the later roadmap.
