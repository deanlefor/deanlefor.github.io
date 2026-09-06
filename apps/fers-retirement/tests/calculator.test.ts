import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateProjection,
  currentTspLimitFor,
  fixedIncomeAt,
  validateHousehold,
  isValidIsoDate,
  type HouseholdInput,
  type PersonInput,
} from "../src/lib/calculator.ts";

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
    socialSecurityDollarBasis: "today",
    socialSecurityAt62: 2_000,
    socialSecurityMonthly: 3_000,
    socialSecurityClaimingAgeMonths: 67 * 12,
    survivorElection: "full",
    planningAge: 95,
    ...overrides,
  };
}

function household(overrides: Partial<HouseholdInput> = {}): HouseholdInput {
  return {
    asOfDate: "2026-01-01",
    people: [
      person({ name: "One" }),
      person({ name: "Two", birthDate: "1981-01-01" }),
    ],
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

test("rejects incomplete and impossible calendar dates", () => {
  assert.equal(isValidIsoDate("2042-10-31"), true);
  assert.equal(isValidIsoDate("2042-11-31"), false);
  assert.equal(isValidIsoDate("2028-02-29"), true);
  assert.equal(isValidIsoDate("2027-02-29"), false);
  assert.equal(isValidIsoDate(""), false);
});

test("fails fast with a descriptive error if an invalid date reaches the engine", () => {
  assert.throws(
    () =>
      calculateProjection(
        household({
          people: [person(), person({ name: "Two", retirementDate: "" })],
        }),
      ),
    /Person 2: enter a valid retirement date/,
  );
});

test("applies the FERS 1.1% multiplier at age 62 with at least 20 years", () => {
  const input = household();
  const result = calculateProjection(input);
  assert.equal(result.people[0].fersMultiplier, 0.011);
  assert.equal(result.people[0].yearsToRetirement, 16);
  assert.equal(result.people[0].unreducedAnnualFers, 35_200);
  assert.equal(result.people[0].annualFers, 31_680);
  assert.equal(result.people[0].monthlyFersAtRetirement, 2_640);
  assert.ok(
    result.people[0].monthlyFersAtRetirementToday <
      result.people[0].monthlyFersAtRetirement,
  );
});

test("a larger legacy target lowers sustainable monthly income", () => {
  const noLegacy = calculateProjection(household({ legacyTarget: 0 }));
  const legacy = calculateProjection(household({ legacyTarget: 500_000 }));
  assert.ok(
    noLegacy.sustainableGrossMonthlyIncome >
      legacy.sustainableGrossMonthlyIncome,
  );
});

test("fixed income and the portfolio draw reconcile to sustainable monthly income", () => {
  const result = calculateProjection(household());

  assert.ok(
    Math.abs(
      result.fixedIncomeAtBothRetired +
        result.portfolioDrawAtBothRetired -
        result.sustainableGrossMonthlyIncome,
    ) < 0.01,
  );
});

test("Roth allocation changes account buckets without changing total accumulation", () => {
  const traditionalInput = household();
  const rothInput = household({
    people: [
      person({ name: "One", rothContributionPercent: 100 }),
      person({
        name: "Two",
        birthDate: "1981-01-01",
        rothContributionPercent: 100,
      }),
    ],
  });
  const traditional = calculateProjection(traditionalInput);
  const roth = calculateProjection(rothInput);
  assert.ok(
    roth.projectedRothAtBothRetired > traditional.projectedRothAtBothRetired,
  );
  assert.ok(
    roth.projectedTraditionalAtBothRetired <
      traditional.projectedTraditionalAtBothRetired,
  );
  assert.ok(
    Math.abs(
      roth.projectedPortfolioAtBothRetired -
        traditional.projectedPortfolioAtBothRetired,
    ) < 1,
  );
});

test("converts future-dollar Social Security estimates to today's dollars", () => {
  const input = household({
    inflation: 10,
    people: [
      person({
        name: "One",
        birthDate: "1965-01-01",
        socialSecurityDollarBasis: "future",
        socialSecurityMonthly: 3_300,
        socialSecurityClaimingAgeMonths: 62 * 12,
      }),
      person({
        name: "Two",
        birthDate: "1965-01-01",
        socialSecurityDollarBasis: "future",
        socialSecurityMonthly: 3_300,
        socialSecurityClaimingAgeMonths: 62 * 12,
      }),
    ],
  });
  const result = calculateProjection(input);

  assert.equal(Math.round(result.people[0].socialSecurityMonthlyToday), 3_000);
  assert.equal(Math.round(result.people[1].socialSecurityMonthlyToday), 3_000);
  assert.equal(Math.round(result.fixedIncomeAfterBothSocialSecurity), 6_000);
});

test("Social Security claiming age converts to a projection start month", () => {
  const result = calculateProjection(
    household({
      people: [
        person({
          birthDate: "1980-06-15",
          socialSecurityClaimingAgeMonths: 67 * 12 + 6,
        }),
        person({ name: "Two" }),
      ],
    }),
  );

  assert.equal(result.people[0].socialSecurityClaimingAgeMonths, 810);
  assert.equal(result.people[0].socialSecurityStartDate, "2047-12-01");
});

test("today-dollar investment components reconcile to the combined portfolio", () => {
  const result = calculateProjection(household({ otherSavings: 50_000 }));
  const sourceTotal = result.people.reduce(
    (total, personResult) =>
      total +
      personResult.projectedTraditionalTspToday +
      personResult.projectedRothTspToday,
    result.projectedOtherAtBothRetiredToday,
  );

  assert.ok(
    Math.abs(sourceTotal - result.projectedPortfolioAtBothRetiredToday) < 1,
  );
});

test("Agency Automatic 1% continues when employee TSP contributions are zero", () => {
  const zeroEmployeeContributions = person({
    traditionalTsp: 0,
    rothTsp: 0,
    contributionMode: "annual",
    annualContribution: 0,
    currentSalary: 100_000,
    salaryGrowth: 0,
    preRetirementReturn: 0,
  });
  const result = calculateProjection(
    household({
      inflation: 0,
      people: [
        zeroEmployeeContributions,
        { ...zeroEmployeeContributions, name: "Two" },
      ],
    }),
  );

  assert.equal(result.people[0].currentAnnualEmployeeContribution, 0);
  assert.equal(
    result.people[0].currentAnnualAgencyAutomaticContribution,
    1_000,
  );
  assert.equal(result.people[0].currentAnnualAgencyMatchingContribution, 0);
  assert.equal(result.people[0].currentAnnualAgencyContribution, 1_000);
  assert.equal(result.people[0].currentAnnualTotalTspContribution, 1_000);
  assert.ok(Math.abs(result.people[0].projectedTraditionalTsp - 16_000) < 0.01);
});

test("annual-maximum TSP formula separates employee, automatic, and matching deposits", () => {
  const maximumContributor = person({
    currentSalary: 100_000,
    contributionMode: "maximum",
  });
  const result = calculateProjection(
    household({
      people: [maximumContributor, { ...maximumContributor, name: "Two" }],
    }),
  );

  assert.equal(result.people[0].currentAnnualEmployeeContribution, 24_500);
  assert.equal(
    result.people[0].currentAnnualAgencyAutomaticContribution,
    1_000,
  );
  assert.equal(result.people[0].currentAnnualAgencyMatchingContribution, 4_000);
  assert.equal(result.people[0].currentAnnualAgencyContribution, 5_000);
  assert.equal(result.people[0].currentAnnualTotalTspContribution, 29_500);
});

test("unused sick leave increases annuity service but not retirement eligibility service", () => {
  const result = calculateProjection(
    household({
      people: [
        person({
          birthDate: "1982-01-01",
          serviceDate: "2022-07-01",
          retirementDate: "2042-01-01",
          sickLeaveHours: 1_044,
        }),
        person({ name: "Two" }),
      ],
    }),
  );

  assert.equal(result.people[0].retirementAge, 60);
  assert.equal(result.people[0].eligibilityServiceYears, 19.5);
  assert.equal(result.people[0].serviceYears, 20);
  assert.equal(result.people[0].eligibleImmediateRetirement, false);
});

test("unused sick leave can reach 20 computation years for the age-62 multiplier", () => {
  const result = calculateProjection(
    household({
      people: [
        person({
          birthDate: "1980-01-01",
          serviceDate: "2022-07-01",
          retirementDate: "2042-01-01",
          sickLeaveHours: 1_044,
        }),
        person({ name: "Two" }),
      ],
    }),
  );

  assert.equal(result.people[0].eligibilityServiceYears, 19.5);
  assert.equal(result.people[0].serviceYears, 20);
  assert.equal(result.people[0].fersMultiplier, 0.011);
});

test("zero balances, contributions, salary, and returns produce a zero portfolio", () => {
  const zeroPerson = person({
    traditionalTsp: 0,
    rothTsp: 0,
    contributionMode: "annual",
    annualContribution: 0,
    currentSalary: 0,
    salaryGrowth: 0,
    preRetirementReturn: 0,
  });
  const result = calculateProjection(
    household({
      inflation: 0,
      postRetirementReturn: 0,
      otherSavings: 0,
      otherAnnualContribution: 0,
      otherSavingsReturn: 0,
      people: [zeroPerson, { ...zeroPerson, name: "Two" }],
    }),
  );

  assert.equal(result.people[0].currentAnnualAgencyContribution, 0);
  assert.equal(result.projectedPortfolioAtBothRetired, 0);
  assert.equal(result.projectedPortfolioAtBothRetiredToday, 0);
});

test("2026 limits preserve exact published amounts across birthday boundaries", () => {
  for (const monthDay of ["01-01", "06-15", "12-31"]) {
    for (const [age, limit] of [
      [49, 24500],
      [50, 32500],
      [59, 32500],
      [60, 35750],
      [61, 35750],
      [62, 35750],
      [63, 35750],
      [64, 32500],
    ]) {
      const input = person({
        birthDate: `${2026 - age}-${monthDay}`,
        contributionMode: "maximum",
        retirementDate: "2027-01-01",
      });
      assert.equal(
        currentTspLimitFor(input, 2026),
        limit,
        `${age} on ${monthDay}`,
      );
      const result = calculateProjection(
        household({ people: [input, person()] }),
      );
      assert.equal(result.people[0].currentAnnualEmployeeContribution, limit);
    }
  }
});

test("future limits use the selected growth assumption consistently", () => {
  const input = person({ contributionMode: "maximum" });
  const result = calculateProjection(
    household({
      asOfDate: "2027-01-01",
      contributionLimitGrowth: 10,
      people: [input, person()],
    }),
  );
  assert.equal(currentTspLimitFor(input, 2027, 10), 27000);
  assert.equal(result.people[0].currentAnnualEmployeeContribution, 27000);
});

test("either survivor retains the higher commenced Social Security benefit", () => {
  for (const first of [0, 1]) {
    const people = [0, 1].map((index) =>
      person({
        name: `Person ${index + 1}`,
        birthDate: "1960-01-01",
        retirementDate: "2026-01-01",
        planningAge: index === first ? 70 : 95,
        currentHigh3: 0,
        projectedHigh3Override: 0,
        socialSecurityMonthly: index === first ? 4000 : 1000,
        socialSecurityClaimingAgeMonths: 62 * 12,
      }),
    ) as [PersonInput, PersonInput];
    const input = household({ inflation: 0, people });
    const result = calculateProjection(input);
    assert.equal(
      fixedIncomeAt(input, result.people, new Date("2029-01-01Z")),
      5000,
    );
    assert.equal(
      fixedIncomeAt(input, result.people, new Date("2030-01-01Z")),
      4000,
    );
    assert.equal(
      fixedIncomeAt(input, result.people, new Date("2055-01-01Z")),
      0,
    );
  }
});

test("the simplified survivor model does not start an uncommenced benefit early", () => {
  const input = household({
    inflation: 0,
    people: [
      person({
        birthDate: "1960-01-01",
        retirementDate: "2026-01-01",
        planningAge: 70,
        currentHigh3: 0,
        projectedHigh3Override: 0,
        socialSecurityMonthly: 1000,
        socialSecurityClaimingAgeMonths: 62 * 12,
      }),
      person({
        birthDate: "1965-01-01",
        retirementDate: "2026-01-01",
        currentHigh3: 0,
        projectedHigh3Override: 0,
        socialSecurityMonthly: 4000,
        socialSecurityClaimingAgeMonths: 70 * 12,
      }),
    ],
  });
  const result = calculateProjection(input);
  assert.equal(
    fixedIncomeAt(input, result.people, new Date("2034-12-01Z")),
    1000,
  );
  assert.equal(
    fixedIncomeAt(input, result.people, new Date("2035-01-01Z")),
    4000,
  );
});

test("invalid chronology, numbers, and enumerations cannot reach the solver", () => {
  const invalid = household({
    people: [
      person({ planningAge: 70, retirementDate: "2080-01-01" }),
      person({ planningAge: 70, retirementDate: "2080-01-01" }),
    ],
  });
  assert.throws(
    () => calculateProjection(invalid),
    /planning horizon must be after both/,
  );
  for (const patch of [
    { inflation: NaN },
    { postRetirementReturn: -100 },
    { survivorSpendingPercent: 101 },
    { otherSavings: Infinity },
  ]) {
    assert.ok(validateHousehold(household(patch)).length);
    assert.throws(() => calculateProjection(household(patch)), RangeError);
  }
  assert.ok(
    validateHousehold(
      household({ people: [person({ planningAge: 70.5 }), person()] }),
    ).length,
  );
  assert.ok(
    validateHousehold(
      household({
        people: [person({ survivorElection: "invalid" as never }), person()],
      }),
    ).length,
  );
});

test("monthly search agrees with an independent zero-return cash-flow calculation", () => {
  // Both retire at 66. With zero income and returns, $348,000 over 29*12 months
  // supports exactly $1,000/month, or $900/month with a $34,800 legacy.
  const base = person({
    birthDate: "1960-01-01",
    retirementDate: "2026-01-01",
    planningAge: 95,
    currentHigh3: 0,
    projectedHigh3Override: 0,
    currentSalary: 0,
    traditionalTsp: 174000,
    rothTsp: 0,
    annualContribution: 0,
    socialSecurityMonthly: 0,
    socialSecurityAt62: 0,
  });
  for (const [legacyTarget, expected] of [
    [0, 1000],
    [34800, 900],
  ]) {
    const result = calculateProjection(
      household({
        inflation: 0,
        postRetirementReturn: 0,
        otherSavings: 0,
        people: [base, { ...base }],
        legacyTarget,
      }),
    );
    assert.ok(
      Math.abs(result.sustainableGrossMonthlyIncome - expected) < 0.001,
    );
    assert.ok(result.endingPortfolio >= legacyTarget);
    assert.ok(result.endingPortfolio - legacyTarget < 0.04);
  }
});
