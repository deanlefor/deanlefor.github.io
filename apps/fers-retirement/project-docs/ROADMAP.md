# Product Roadmap

The original ten-release sequence remains useful, but Release 0.1 was expanded to include the minimum calculations needed by the initial dual-FERS household.

## Release 0.1: Dual-FERS Household Projection

Current prototype:

- Current-date-to-retirement account accumulation
- Regular FERS annuity
- Basic annuity supplement
- Manual Social Security estimates and claiming dates
- Per-person today/future-dollar basis for Social Security estimates
- Survivor election and simplified survivor phase
- Sustainable gross monthly income
- Adjustable real legacy target
- Local browser storage
- Topic-first inputs and source-separated results

Before calling 0.1 complete:

- Reconcile results against two independent hand calculations
- Add more formula-level unit tests and boundary cases
- Improve validation for impossible or unsupported dates
- Decide how to represent current and projected high-3 more precisely
- Confirm sick-leave treatment against OPM examples
- Review supplement approximation and verify the Social Security dollar-basis explanations against current SSA materials
- Add export/import of a scenario file

## Release 0.2: FERS Precision and Eligibility

- More exact service computation
- Eligibility explanations and retirement-date comparisons
- MRA+10, postponed, and deferred distinctions if intentionally supported
- Better high-3 salary history and pay-change modeling
- Official-estimate comparison mode

## Release 0.3: Accounts and Withdrawals

- Traditional/Roth IRA, taxable brokerage, and cash as separate accounts
- Account-specific returns and contributions
- Withdrawal ordering
- RMDs
- Fixed-dollar, percentage, and shortfall withdrawal methods

## Release 0.4: Social Security

- Claiming by month
- Early and delayed adjustments
- Spousal and survivor benefits
- Earnings test
- Better supplement integration

## Release 0.5: Federal Taxes

- Filing status, brackets, deductions, taxable FERS, Traditional withdrawals, Roth withdrawals, taxable Social Security, interest, dividends, and simplified capital gains
- Filing-status change after a spouse dies

## Release 0.6: FEHB and Medicare

- FEHB premiums and enrollment arrangements
- Medicare A/B elections and premium growth
- IRMAA
- Dual-federal enrollment comparisons

## Release 0.7: Full Survivor and Dual-Federal Comparison

- Compare survivor-election combinations
- More complete FERS and Social Security survivor mechanics
- Healthcare transitions, life insurance, and survivor sustainability

## Release 0.8: Scenario Laboratory

- Duplicate and compare retirement dates, claiming dates, elections, spending, returns, and state assumptions

## Release 0.9: Investment Risk

- Historical sequences, Monte Carlo, probability of depletion, sustainable spending, and optional guardrails

## Release 1.0: Public-Ready Product

- Guided onboarding, quick/detailed modes, import/export, printable reports, accessibility review, rule-version documentation, privacy review, error handling, and comprehensive reference cases
