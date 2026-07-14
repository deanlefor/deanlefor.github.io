# Calculation Rules and Limitations

Rule baseline: **2026**. Every rule should be verified against primary sources before a public release.

## Timeline and money convention

- The projection begins on the household as-of date.
- Accumulation and retirement drawdown use monthly time steps.
- The headline sustainable-income result and legacy target are expressed in today's dollars.
- Projected account balances are shown in both today's dollars and future nominal dollars where practical.
- Return and inflation inputs are annual compound rates converted to monthly equivalents.

## TSP accumulation

- Traditional and Roth employee balances are tracked separately.
- Traditional and Roth employee contributions share one elective-deferral limit.
- The 2026 elective-deferral baseline is $24,500.
- The 2026 general age-50 catch-up baseline is $8,000.
- The 2026 higher catch-up baseline for ages 60 through 63 is $11,250.
- Unknown future limits are projected using a user-selected growth assumption and rounded to $500. These are scenarios, not predictions of future IRS limits.
- Agency Automatic (1%) contributions are included.
- Matching is dollar-for-dollar on the first 3% of pay and 50 cents per dollar on the next 2%.
- Agency contributions are assigned to the Traditional balance.
- Contributions are economically spread across the year to preserve matching; the engine aggregates 26-pay-period behavior into monthly steps.

Sources: [IRS 2026 limits](https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500), [TSP contribution types](https://www.tsp.gov/making-contributions/contribution-types/), and [TSP annual-limit guidance](https://www.tsp.gov/publications/tspfs07.pdf).

## FERS annuity

- General formula under age 62, or age 62 with fewer than 20 years: high-3 × creditable service × 1.0%.
- General formula at age 62 or later with at least 20 years: high-3 × creditable service × 1.1%.
- Release 0.1 recognizes the common unreduced immediate-retirement combinations: age 62/5 years, age 60/20 years, and MRA/30 years.
- The MRA table is derived from year of birth.
- Sick leave is converted approximately at 2,087 hours per service year and truncated to whole months. It increases computation service but not eligibility service.
- A projected high-3 override takes precedence. Otherwise, the current high-3 estimate grows by the salary-growth assumption.

Sources: [OPM computation](https://www.opm.gov/retirement-center/fers-information/computation/) and [OPM eligibility](https://www.opm.gov/retirement-center/fers-information/eligibility/).

## Survivor elections

- Full election: 10% employee-annuity reduction; survivor benefit modeled as 50% of the unreduced annuity.
- Partial election: 5% employee-annuity reduction; survivor benefit modeled as 25% of the unreduced annuity.
- No election: no reduction and no FERS survivor annuity.
- Each spouse has a separate election.
- The first planning horizon triggers the simplified survivor phase.

Sources: [OPM Information for FERS Annuitants](https://www.opm.gov/retirement-center/publications-forms/pamphlets/ri90-8.pdf) and [OPM survivor FAQ](https://www.opm.gov/frequently-asked-questions/retire-faq/post-retirement/how-is-the-amount-of-my-benefits-as-a-surviving-spouse-determined/).

## FERS annuity supplement

- The supplement is estimated only for an eligible unreduced immediate retirement before age 62.
- Approximation: user-entered age-62 Social Security estimate × FERS service years ÷ 40, with service capped at 40 years.
- It stops at age 62 and receives no COLA.
- The earnings test is not implemented.
- This approximation will not reproduce OPM's exact computation in all cases.

Sources: [OPM types of retirement](https://www.opm.gov/retirement-center/fers-information/types-of-retirement/) and [OPM annuity-supplement handbook](https://www.opm.gov/retirement-center/publications-forms/csrsfers-handbook/c051.pdf).

## Social Security

- Users enter an age-62 estimate for the FERS supplement and a separate monthly benefit at their chosen claiming age.
- Users enter the benefit commencement date.
- Entered benefits are treated as today's-dollar estimates and remain level in real terms after commencement.
- The survivor phase uses a simplified higher-benefit assumption rather than a complete SSA survivor-benefit calculation.

## Sustainable-income solution

- Accumulation continues until the later spouse retires.
- Retirement assets are converted to today's dollars at that date.
- A real post-retirement return is derived from nominal return and inflation.
- The solver searches for the highest level joint monthly income that leaves at least the selected real legacy target at the later planning horizon.
- Portfolio withdrawals fill the gap between the income target and fixed FERS/Social Security income.
- After the first planning horizon, the income target falls to the selected survivor-spending percentage.
- Fixed income above the target is assumed spent rather than reinvested.

## Known exclusions

- Federal and state income taxes
- FEHB, Medicare, and IRMAA
- RMDs and account-specific withdrawal ordering
- Detailed Social Security claiming and survivor rules
- FERS annuity supplement earnings test
- Exact OPM day-level service computation
- Part-time service and service breaks not already reflected in the entered SCD
- Military deposits, refunded service, redeposits, and court orders
- MRA+10, postponed, deferred, disability, VERA, and discontinued-service retirement
- Special-category employees and CSRS components
- Investment volatility and sequence-of-returns risk
