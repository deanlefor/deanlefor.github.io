import assert from "node:assert/strict";
import test from "node:test";
import { calculateProjection, type HouseholdInput, type PersonInput } from "../src/lib/calculator.ts";

function person(overrides: Partial<PersonInput> = {}): PersonInput {
  return {
    name: "Test employee",
    birthDate: "1980-01-01",
    serviceDate: "2010-01-01",
    retirementDate: "2042-01-01",
    currentSalary: 100_000,
    salaryGrowth: 0,
    currentHigh3: 100_000,
    projectedHigh3Override: 100_000,
    sickLeaveHours: 0,
    traditionalTsp: 100_000,
    rothTsp: 0,
    contributionMode: "annual",
    annualContribution: 10_000,
    contributionPercent: 10,
    rothContributionPercent: 0,
    preRetirementReturn: 5,
    socialSecurityAt62: 2_000,
    socialSecurityMonthly: 3_000,
    socialSecurityStartDate: "2050-01-01",
    survivorElection: "full",
    planningAge: 95,
    ...overrides,
  };
}

function household(overrides: Partial<HouseholdInput> = {}): HouseholdInput {
  return {
    asOfDate: "2026-01-01",
    people: [person({ name: "One" }), person({ name: "Two", birthDate: "1981-01-01" })],
    inflation: 2.5,
    postRetirementReturn: 5,
    contributionLimitGrowth: 2.2,
    otherSavings: 0,
    otherAnnualContribution: 0,
    otherSavingsReturn: 5,
    legacyTarget: 0,
    survivorSpendingPercent: 75,
    ...overrides,
  };
}

test("applies the FERS 1.1% multiplier at age 62 with at least 20 years", () => {
  const input = household();
  const result = calculateProjection(input);
  assert.equal(result.people[0].fersMultiplier, 0.011);
  assert.equal(result.people[0].unreducedAnnualFers, 35_200);
  assert.equal(result.people[0].annualFers, 31_680);
});

test("a larger legacy target lowers sustainable monthly income", () => {
  const noLegacy = calculateProjection(household({ legacyTarget: 0 }));
  const legacy = calculateProjection(household({ legacyTarget: 500_000 }));
  assert.ok(noLegacy.sustainableGrossMonthlyIncome > legacy.sustainableGrossMonthlyIncome);
});

test("Roth allocation changes account buckets without changing total accumulation", () => {
  const traditionalInput = household();
  const rothInput = household({
    people: [
      person({ name: "One", rothContributionPercent: 100 }),
      person({ name: "Two", birthDate: "1981-01-01", rothContributionPercent: 100 }),
    ],
  });
  const traditional = calculateProjection(traditionalInput);
  const roth = calculateProjection(rothInput);
  assert.ok(roth.projectedRothAtBothRetired > traditional.projectedRothAtBothRetired);
  assert.ok(roth.projectedTraditionalAtBothRetired < traditional.projectedTraditionalAtBothRetired);
  assert.ok(Math.abs(roth.projectedPortfolioAtBothRetired - traditional.projectedPortfolioAtBothRetired) < 1);
});
