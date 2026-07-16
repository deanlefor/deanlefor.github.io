# Release 0.1 Product Specification

## Product purpose

Help a two-person FERS household estimate:

1. Projected retirement-account assets when both employees have retired.
2. Each employee's estimated FERS annuity.
3. The effect of separate Social Security commencement dates.
4. The gross inflation-adjusted monthly household income that the combined resources may support.

## Intended initial users

The initial test household is the project owner and spouse, both regular FERS employees. The design nevertheless stores each person's inputs independently so it can later serve other dual-federal households.

## Design principles

- Local-first: personal financial inputs remain in the browser.
- Progressive disclosure: inputs are organized by retirement topic, with the two people compared side by side inside each topic and advanced assumptions collapsed.
- Monthly engine: calculations use monthly time steps even when contributions originate across 26 pay periods.
- Two people from the beginning: mixed-retirement and survivor phases are structural, not later add-ons.
- Rule transparency: formulas, defaults, unsupported cases, and the rule year must be visible.
- Deterministic before probabilistic: Release 0.1 uses fixed assumptions; Monte Carlo belongs in a later release.

## Supported Release 0.1 cases

- Exactly two regular FERS employees
- Unreduced immediate retirement under the common age-and-service combinations
- Separate birth dates, retirement service computation dates, and retirement dates
- Separate current salaries, current high-3 estimates, salary growth, sick leave, and projected high-3 overrides
- Separate Traditional and Roth TSP balances
- Maximum, fixed-dollar, or percentage employee contributions
- Traditional/Roth employee contribution allocation
- Agency automatic and matching contributions
- A visible current-year TSP deposit formula separating the employee contribution, Agency Automatic 1%, agency match, and total deposited
- Separate pre-retirement investment returns
- Shared inflation and post-retirement return assumptions
- Manual Social Security estimates, claiming ages from 62 through 70, calculated start months, and a per-person today/future-dollar basis
- Full, partial, or no FERS survivor election
- User-selected planning age for each spouse
- User-selected survivor spending percentage
- User-selected ending portfolio in today's dollars, including zero

## Principal outputs

- Sustainable gross monthly household income in today's dollars
- Projected combined portfolio at the later retirement date in today's and future dollars
- Person-level TSP and other-investment comparisons use one dollar basis at a time; today's dollars are primary and future dollars are a separate disclosure
- FERS annuity comparisons follow the same convention: payable annuity and supplement amounts are compared in today's dollars, with the future-dollar annuity calculation disclosed separately
- Live FERS input formulas reconcile projected high-3, eligibility and annuity service, multiplier, survivor reduction, and payable monthly annuity
- Estimated monthly fixed income when both retire
- Estimated portfolio top-up when both retire
- Fixed-income and portfolio components after both Social Security claims begin
- Survivor spending target
- Each employee's retirement age, service, projected high-3, FERS formula, annuity, supplement, and projected TSP balances
- Personal-information cards group birth date, retirement SCD, and retirement date and immediately show retirement age and service for eligibility
- Source-separated investment, FERS, Social Security, and portfolio-use results
- Progressive calculation disclosures show future-to-today Social Security conversions and the fixed-income-plus-portfolio composition of sustainable household income

## Acceptance criteria

- Editing the ending portfolio changes sustainable income in the expected direction.
- Changing a survivor election changes the annuity and survivor projection.
- Roth allocation moves employee contributions between tax buckets without changing gross total contributions.
- The 1.1% FERS formula applies only at retirement age 62 or later with at least 20 years.
- Unused sick leave can increase annuity-computation service but cannot establish retirement eligibility.
- Inputs persist after a browser refresh.
- No household inputs are sent to an application server.
- Future-dollar Social Security entries are converted to today's dollars before entering the household income solution.
- The production build and calculation tests pass.
