export type SurvivorElection = "full" | "partial" | "none";
export type ContributionMode = "maximum" | "annual" | "percent";
export type SocialSecurityDollarBasis = "today" | "future";

export interface PersonInput {
  name: string;
  birthDate: string;
  serviceDate: string;
  retirementDate: string;
  currentSalary: number;
  salaryGrowth: number;
  currentHigh3: number;
  projectedHigh3Override: number;
  sickLeaveHours: number;
  traditionalTsp: number;
  rothTsp: number;
  contributionMode: ContributionMode;
  annualContribution: number;
  contributionPercent: number;
  rothContributionPercent: number;
  preRetirementReturn: number;
  socialSecurityDollarBasis: SocialSecurityDollarBasis;
  socialSecurityAt62: number;
  socialSecurityMonthly: number;
  socialSecurityClaimingAgeMonths: number;
  survivorElection: SurvivorElection;
  planningAge: number;
}

export interface HouseholdInput {
  asOfDate: string;
  people: [PersonInput, PersonInput];
  inflation: number;
  postRetirementReturn: number;
  contributionLimitGrowth: number;
  otherSavings: number;
  otherAnnualContribution: number;
  otherSavingsReturn: number;
  legacyTarget: number;
  survivorSpendingPercent: number;
}

export interface PersonResult {
  name: string;
  currentAge: number;
  retirementAge: number;
  yearsToRetirement: number;
  currentAnnualEmployeeContribution: number;
  currentAnnualAgencyAutomaticContribution: number;
  currentAnnualAgencyMatchingContribution: number;
  currentAnnualAgencyContribution: number;
  currentAnnualTotalTspContribution: number;
  eligibilityServiceYears: number;
  serviceYears: number;
  projectedHigh3: number;
  fersMultiplier: number;
  unreducedAnnualFers: number;
  unreducedAnnualFersToday: number;
  annualFers: number;
  monthlyFersAtRetirement: number;
  monthlyFersAtRetirementToday: number;
  monthlySupplementAtRetirement: number;
  socialSecurityAt62Today: number;
  socialSecurityMonthlyToday: number;
  socialSecurityClaimingAgeMonths: number;
  projectedTraditionalTsp: number;
  projectedRothTsp: number;
  projectedTraditionalTspToday: number;
  projectedRothTspToday: number;
  eligibleImmediateRetirement: boolean;
  eligibilityMessage: string;
  retirementDate: string;
  socialSecurityStartDate: string;
  planningDate: string;
}

export interface ProjectionResult {
  people: [PersonResult, PersonResult];
  firstRetirementDate: string;
  bothRetiredDate: string;
  projectedPortfolioAtBothRetired: number;
  projectedPortfolioAtBothRetiredToday: number;
  projectedTraditionalAtBothRetired: number;
  projectedRothAtBothRetired: number;
  projectedOtherAtBothRetired: number;
  projectedOtherAtBothRetiredToday: number;
  sustainableGrossMonthlyIncome: number;
  portfolioDrawAtBothRetired: number;
  fixedIncomeAtBothRetired: number;
  fixedIncomeAfterBothSocialSecurity: number;
  portfolioDrawAfterBothSocialSecurity: number;
  survivorMonthlyTarget: number;
  endingPortfolio: number;
  legacyFeasible: boolean;
  warnings: string[];
}

const MONTHS_PER_YEAR = 12;
const SICK_LEAVE_HOURS_PER_YEAR = 2087;
const BASE_RULE_YEAR = 2026;
const BASE_ELECTIVE_DEFERRAL = 24_500;
const BASE_CATCH_UP = 8_000;
const BASE_AGE_60_TO_63_CATCH_UP = 11_250;
const MIN_SOCIAL_SECURITY_CLAIMING_AGE_MONTHS = 62 * 12;
const MAX_SOCIAL_SECURITY_CLAIMING_AGE_MONTHS = 70 * 12;

export function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function dateUtc(value: string): Date {
  if (!isValidIsoDate(value)) throw new RangeError(`Invalid calendar date: ${value || "empty value"}`);
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addMonths(date: Date, count: number): Date {
  const copy = new Date(date);
  copy.setUTCMonth(copy.getUTCMonth() + count);
  return copy;
}

function addYears(date: Date, count: number): Date {
  const copy = new Date(date);
  copy.setUTCFullYear(copy.getUTCFullYear() + count);
  return copy;
}

function normalizedSocialSecurityClaimingAgeMonths(value: number): number {
  const months = Number.isFinite(value) ? Math.round(value) : MIN_SOCIAL_SECURITY_CLAIMING_AGE_MONTHS;
  return Math.min(MAX_SOCIAL_SECURITY_CLAIMING_AGE_MONTHS, Math.max(MIN_SOCIAL_SECURITY_CLAIMING_AGE_MONTHS, months));
}

function socialSecurityStartDate(person: PersonInput): Date {
  const birth = dateUtc(person.birthDate);
  const claimingAgeMonths = normalizedSocialSecurityClaimingAgeMonths(person.socialSecurityClaimingAgeMonths);
  const monthIndex = birth.getUTCFullYear() * 12 + birth.getUTCMonth() + claimingAgeMonths;
  return new Date(Date.UTC(Math.floor(monthIndex / 12), monthIndex % 12, 1));
}

function monthsBetween(start: Date, end: Date): number {
  let months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    end.getUTCMonth() -
    start.getUTCMonth();
  if (end.getUTCDate() < start.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

function yearsBetween(start: Date, end: Date): number {
  return monthsBetween(start, end) / MONTHS_PER_YEAR;
}

function annualToMonthlyRate(annualRate: number): number {
  return Math.pow(1 + annualRate / 100, 1 / 12) - 1;
}

function money(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function minimumRetirementAge(birthYear: number): number {
  if (birthYear < 1948) return 55;
  if (birthYear <= 1952) return 55 + (birthYear - 1947) * (2 / 12);
  if (birthYear <= 1964) return 56;
  if (birthYear <= 1969) return 56 + (birthYear - 1964) * (2 / 12);
  return 57;
}

function immediateEligibility(age: number, service: number, birthYear: number) {
  const mra = minimumRetirementAge(birthYear);
  if (age >= 62 && service >= 5) return { eligible: true, message: "Age 62 with at least 5 years" };
  if (age >= 60 && service >= 20) return { eligible: true, message: "Age 60 with at least 20 years" };
  if (age >= mra && service >= 30) return { eligible: true, message: "MRA with at least 30 years" };
  return {
    eligible: false,
    message: "Outside the unreduced immediate-retirement cases supported in Release 0.1",
  };
}

function projectedLimit(base: number, year: number, growth: number): number {
  const years = Math.max(0, year - BASE_RULE_YEAR);
  const projected = base * Math.pow(1 + growth / 100, years);
  return Math.round(projected / 500) * 500;
}

function tspLimit(person: PersonInput, year: number): number {
  const ageAtYearEnd = yearsBetween(dateUtc(person.birthDate), new Date(Date.UTC(year, 11, 31)));
  let catchUp = 0;
  if (ageAtYearEnd >= 60 && ageAtYearEnd <= 63) {
    catchUp = projectedLimit(BASE_AGE_60_TO_63_CATCH_UP, year, 2.2);
  } else if (ageAtYearEnd >= 50) {
    catchUp = projectedLimit(BASE_CATCH_UP, year, 2.2);
  }
  return projectedLimit(BASE_ELECTIVE_DEFERRAL, year, 2.2) + catchUp;
}

function annualEmployeeContribution(person: PersonInput, year: number, salary: number, limitGrowth: number) {
  const limit =
    projectedLimit(BASE_ELECTIVE_DEFERRAL, year, limitGrowth) +
    (() => {
      const ageAtYearEnd = yearsBetween(
        dateUtc(person.birthDate),
        new Date(Date.UTC(year, 11, 31)),
      );
      if (ageAtYearEnd >= 60 && ageAtYearEnd <= 63) {
        return projectedLimit(BASE_AGE_60_TO_63_CATCH_UP, year, limitGrowth);
      }
      if (ageAtYearEnd >= 50) return projectedLimit(BASE_CATCH_UP, year, limitGrowth);
      return 0;
    })();

  if (person.contributionMode === "maximum") return limit;
  if (person.contributionMode === "percent") {
    return Math.min(limit, salary * (person.contributionPercent / 100));
  }
  return Math.min(limit, person.annualContribution);
}

interface AgencyContributionBreakdown {
  automatic: number;
  matching: number;
  total: number;
}

function agencyContributionBreakdown(salary: number, employeeContribution: number): AgencyContributionBreakdown {
  const eligibleSalary = money(salary);
  const contributionRate = eligibleSalary > 0 ? money(employeeContribution) / eligibleSalary : 0;
  const firstThree = Math.min(contributionRate, 0.03);
  const nextTwo = Math.min(Math.max(contributionRate - 0.03, 0), 0.02);
  const matchRate = firstThree + nextTwo * 0.5;
  const automatic = eligibleSalary * 0.01;
  const matching = eligibleSalary * matchRate;
  return { automatic, matching, total: automatic + matching };
}

function agencyAnnualContribution(salary: number, employeeContribution: number): number {
  return agencyContributionBreakdown(salary, employeeContribution).total;
}

function salaryAt(person: PersonInput, asOf: Date, date: Date): number {
  return person.currentSalary * Math.pow(1 + person.salaryGrowth / 100, yearsBetween(asOf, date));
}

function survivorReduction(election: SurvivorElection): number {
  if (election === "full") return 0.1;
  if (election === "partial") return 0.05;
  return 0;
}

function survivorPercent(election: SurvivorElection): number {
  if (election === "full") return 0.5;
  if (election === "partial") return 0.25;
  return 0;
}

function fersCola(inflation: number): number {
  if (inflation <= 2) return inflation;
  if (inflation <= 3) return 2;
  return inflation - 1;
}

function createPersonResult(person: PersonInput, household: HouseholdInput): PersonResult {
  const asOf = dateUtc(household.asOfDate);
  const birth = dateUtc(person.birthDate);
  const service = dateUtc(person.serviceDate);
  const retirement = dateUtc(person.retirementDate);
  const currentAge = yearsBetween(birth, asOf);
  const retirementAge = yearsBetween(birth, retirement);
  const yearsToRetirement = yearsBetween(asOf, retirement);
  const serviceMonths = monthsBetween(service, retirement);
  const sickMonths = Math.floor((money(person.sickLeaveHours) * 12) / SICK_LEAVE_HOURS_PER_YEAR);
  const eligibilityServiceYears = serviceMonths / 12;
  const serviceYears = (serviceMonths + sickMonths) / 12;
  const high3 = person.projectedHigh3Override > 0
    ? person.projectedHigh3Override
    : person.currentHigh3 * Math.pow(1 + person.salaryGrowth / 100, yearsBetween(asOf, retirement));
  const multiplier = retirementAge >= 62 && serviceYears >= 20 ? 0.011 : 0.01;
  const unreduced = high3 * multiplier * serviceYears;
  const reduced = unreduced * (1 - survivorReduction(person.survivorElection));
  const eligibility = immediateEligibility(retirementAge, eligibilityServiceYears, birth.getUTCFullYear());
  const benefitStart = socialSecurityStartDate(person);
  const socialSecurityAt62Today = socialSecurityInTodayDollars(
    person,
    household,
    person.socialSecurityAt62,
    addYears(birth, 62),
  );
  const socialSecurityMonthlyToday = socialSecurityInTodayDollars(
    person,
    household,
    person.socialSecurityMonthly,
    benefitStart,
  );
  const supplement = retirementAge < 62 && eligibility.eligible
    ? socialSecurityAt62Today * Math.min(eligibilityServiceYears, 40) / 40
    : 0;
  const retirementInflationFactor = inflationFactor(household, retirement);
  const currentAnnualEmployeeContribution = annualEmployeeContribution(
    person,
    asOf.getUTCFullYear(),
    person.currentSalary,
    household.contributionLimitGrowth,
  );
  const currentAgencyContributions = agencyContributionBreakdown(
    person.currentSalary,
    currentAnnualEmployeeContribution,
  );

  return {
    name: person.name,
    currentAge,
    retirementAge,
    yearsToRetirement,
    currentAnnualEmployeeContribution,
    currentAnnualAgencyAutomaticContribution: currentAgencyContributions.automatic,
    currentAnnualAgencyMatchingContribution: currentAgencyContributions.matching,
    currentAnnualAgencyContribution: currentAgencyContributions.total,
    currentAnnualTotalTspContribution: currentAnnualEmployeeContribution + currentAgencyContributions.total,
    eligibilityServiceYears,
    serviceYears,
    projectedHigh3: high3,
    fersMultiplier: multiplier,
    unreducedAnnualFers: unreduced,
    unreducedAnnualFersToday: unreduced / retirementInflationFactor,
    annualFers: reduced,
    monthlyFersAtRetirement: reduced / 12,
    monthlyFersAtRetirementToday: reduced / 12 / retirementInflationFactor,
    monthlySupplementAtRetirement: supplement,
    socialSecurityAt62Today,
    socialSecurityMonthlyToday,
    socialSecurityClaimingAgeMonths: normalizedSocialSecurityClaimingAgeMonths(person.socialSecurityClaimingAgeMonths),
    projectedTraditionalTsp: 0,
    projectedRothTsp: 0,
    projectedTraditionalTspToday: 0,
    projectedRothTspToday: 0,
    eligibleImmediateRetirement: eligibility.eligible,
    eligibilityMessage: eligibility.message,
    retirementDate: person.retirementDate,
    socialSecurityStartDate: isoDate(benefitStart),
    planningDate: isoDate(addYears(birth, person.planningAge)),
  };
}

interface AccountState {
  traditional: [number, number];
  roth: [number, number];
  other: number;
}

function accumulateToBothRetired(household: HouseholdInput): AccountState {
  const asOf = dateUtc(household.asOfDate);
  const retirements = household.people.map((person) => dateUtc(person.retirementDate));
  const end = retirements[0] > retirements[1] ? retirements[0] : retirements[1];
  const state: AccountState = {
    traditional: [money(household.people[0].traditionalTsp), money(household.people[1].traditionalTsp)],
    roth: [money(household.people[0].rothTsp), money(household.people[1].rothTsp)],
    other: money(household.otherSavings),
  };

  for (let date = asOf; date < end; date = addMonths(date, 1)) {
    household.people.forEach((person, index) => {
      const returnRate = annualToMonthlyRate(person.preRetirementReturn);
      state.traditional[index] *= 1 + returnRate;
      state.roth[index] *= 1 + returnRate;
      if (date < retirements[index]) {
        const salary = salaryAt(person, asOf, date);
        const employeeAnnual = annualEmployeeContribution(
          person,
          date.getUTCFullYear(),
          salary,
          household.contributionLimitGrowth,
        );
        const agencyAnnual = agencyAnnualContribution(salary, employeeAnnual);
        const rothShare = Math.min(1, Math.max(0, person.rothContributionPercent / 100));
        state.roth[index] += (employeeAnnual * rothShare) / 12;
        state.traditional[index] += (employeeAnnual * (1 - rothShare) + agencyAnnual) / 12;
      }
    });
    state.other *= 1 + annualToMonthlyRate(household.otherSavingsReturn);
    state.other += money(household.otherAnnualContribution) / 12;
  }
  return state;
}

function inflationFactor(household: HouseholdInput, date: Date): number {
  return Math.pow(1 + household.inflation / 100, yearsBetween(dateUtc(household.asOfDate), date));
}

function socialSecurityInTodayDollars(
  person: PersonInput,
  household: HouseholdInput,
  amount: number,
  benefitDate: Date,
): number {
  if (person.socialSecurityDollarBasis !== "future") return money(amount);
  return money(amount) / inflationFactor(household, benefitDate);
}

function realFersMonthly(
  person: PersonInput,
  result: PersonResult,
  household: HouseholdInput,
  date: Date,
  survivor = false,
): number {
  const retirement = dateUtc(person.retirementDate);
  if (date < retirement) return 0;
  const age62 = addYears(dateUtc(person.birthDate), 62);
  const colaStart = retirement > age62 ? retirement : age62;
  const colaYears = date > colaStart ? Math.floor(yearsBetween(colaStart, date)) : 0;
  const nominal = (survivor
    ? result.unreducedAnnualFers * survivorPercent(person.survivorElection)
    : result.annualFers) / 12;
  return nominal * Math.pow(1 + fersCola(household.inflation) / 100, colaYears) / inflationFactor(household, date);
}

function realSupplementMonthly(
  person: PersonInput,
  result: PersonResult,
  household: HouseholdInput,
  date: Date,
): number {
  const retirement = dateUtc(person.retirementDate);
  const age62 = addYears(dateUtc(person.birthDate), 62);
  if (date < retirement || date >= age62) return 0;
  return result.monthlySupplementAtRetirement * inflationFactor(household, retirement) / inflationFactor(household, date);
}

function fixedIncomeAt(
  household: HouseholdInput,
  people: [PersonResult, PersonResult],
  date: Date,
): number {
  const planningDates = people.map((person) => dateUtc(person.planningDate));
  const alive = planningDates.map((planningDate) => date < planningDate);
  let total = 0;

  household.people.forEach((person, index) => {
    if (alive[index]) {
      total += realFersMonthly(person, people[index], household, date);
      total += realSupplementMonthly(person, people[index], household, date);
    } else if (alive[index === 0 ? 1 : 0]) {
      total += realFersMonthly(person, people[index], household, date, true);
    }
  });

  const activeSocialSecurity: number[] = [];
  household.people.forEach((_person, index) => {
    if (date >= dateUtc(people[index].socialSecurityStartDate)) {
      activeSocialSecurity.push(alive[index] ? people[index].socialSecurityMonthlyToday : 0);
    } else {
      activeSocialSecurity.push(0);
    }
  });
  if (alive[0] && alive[1]) total += activeSocialSecurity[0] + activeSocialSecurity[1];
  else if (alive[0] || alive[1]) total += Math.max(...activeSocialSecurity);

  return total;
}

function simulationEnd(people: [PersonResult, PersonResult]): Date {
  const dates = people.map((person) => dateUtc(person.planningDate));
  return dates[0] > dates[1] ? dates[0] : dates[1];
}

function firstPlanningDate(people: [PersonResult, PersonResult]): Date {
  const dates = people.map((person) => dateUtc(person.planningDate));
  return dates[0] < dates[1] ? dates[0] : dates[1];
}

function simulateDrawdown(
  household: HouseholdInput,
  people: [PersonResult, PersonResult],
  startingPortfolioReal: number,
  targetMonthlyReal: number,
): number {
  const retirements = household.people.map((person) => dateUtc(person.retirementDate));
  const start = retirements[0] > retirements[1] ? retirements[0] : retirements[1];
  const end = simulationEnd(people);
  const firstDeath = firstPlanningDate(people);
  const realAnnualReturn =
    (1 + household.postRetirementReturn / 100) / (1 + household.inflation / 100) - 1;
  const monthlyReturn = Math.pow(1 + realAnnualReturn, 1 / 12) - 1;
  let portfolio = startingPortfolioReal;

  for (let date = start; date < end; date = addMonths(date, 1)) {
    portfolio *= 1 + monthlyReturn;
    const target = date >= firstDeath
      ? targetMonthlyReal * (household.survivorSpendingPercent / 100)
      : targetMonthlyReal;
    const fixedIncome = fixedIncomeAt(household, people, date);
    portfolio -= Math.max(0, target - fixedIncome);
    if (portfolio < 0) return portfolio;
  }
  return portfolio;
}

export function calculateProjection(household: HouseholdInput): ProjectionResult {
  const people: [PersonResult, PersonResult] = [
    createPersonResult(household.people[0], household),
    createPersonResult(household.people[1], household),
  ];
  const accumulated = accumulateToBothRetired(household);
  const retirements = household.people.map((person) => dateUtc(person.retirementDate));
  const firstRetirement = retirements[0] < retirements[1] ? retirements[0] : retirements[1];
  const bothRetired = retirements[0] > retirements[1] ? retirements[0] : retirements[1];
  const traditional = accumulated.traditional[0] + accumulated.traditional[1];
  const roth = accumulated.roth[0] + accumulated.roth[1];
  const portfolioNominal = traditional + roth + accumulated.other;
  const bothRetiredInflationFactor = inflationFactor(household, bothRetired);
  const portfolioReal = portfolioNominal / bothRetiredInflationFactor;
  const otherReal = accumulated.other / bothRetiredInflationFactor;

  people[0].projectedTraditionalTsp = accumulated.traditional[0];
  people[0].projectedRothTsp = accumulated.roth[0];
  people[1].projectedTraditionalTsp = accumulated.traditional[1];
  people[1].projectedRothTsp = accumulated.roth[1];
  people[0].projectedTraditionalTspToday = accumulated.traditional[0] / bothRetiredInflationFactor;
  people[0].projectedRothTspToday = accumulated.roth[0] / bothRetiredInflationFactor;
  people[1].projectedTraditionalTspToday = accumulated.traditional[1] / bothRetiredInflationFactor;
  people[1].projectedRothTspToday = accumulated.roth[1] / bothRetiredInflationFactor;

  const zeroIncomeEnding = simulateDrawdown(household, people, portfolioReal, 0);
  const legacyFeasible = zeroIncomeEnding >= household.legacyTarget;
  let low = 0;
  let high = 100_000;
  if (legacyFeasible) {
    for (let index = 0; index < 70; index += 1) {
      const midpoint = (low + high) / 2;
      const ending = simulateDrawdown(household, people, portfolioReal, midpoint);
      if (ending >= household.legacyTarget) low = midpoint;
      else high = midpoint;
    }
  }
  const endingPortfolio = simulateDrawdown(household, people, portfolioReal, low);
  const fixedAtRetirement = fixedIncomeAt(household, people, bothRetired);
  const bothSs = people
    .map((person) => dateUtc(person.socialSecurityStartDate))
    .reduce((latest, date) => date > latest ? date : latest);
  const fixedAfterSs = fixedIncomeAt(household, people, bothSs);
  const warnings: string[] = [];
  people.forEach((person) => {
    if (!person.eligibleImmediateRetirement) warnings.push(`${person.name}: ${person.eligibilityMessage}.`);
  });
  if (!legacyFeasible) warnings.push("The selected legacy target is not achievable even with no portfolio withdrawals.");
  warnings.push("Taxes, FEHB, Medicare, RMDs, and the FERS supplement earnings test are not included in this release.");

  return {
    people,
    firstRetirementDate: isoDate(firstRetirement),
    bothRetiredDate: isoDate(bothRetired),
    projectedPortfolioAtBothRetired: portfolioNominal,
    projectedPortfolioAtBothRetiredToday: portfolioReal,
    projectedTraditionalAtBothRetired: traditional,
    projectedRothAtBothRetired: roth,
    projectedOtherAtBothRetired: accumulated.other,
    projectedOtherAtBothRetiredToday: otherReal,
    sustainableGrossMonthlyIncome: low,
    portfolioDrawAtBothRetired: Math.max(0, low - fixedAtRetirement),
    fixedIncomeAtBothRetired: fixedAtRetirement,
    fixedIncomeAfterBothSocialSecurity: fixedAfterSs,
    portfolioDrawAfterBothSocialSecurity: Math.max(0, low - fixedAfterSs),
    survivorMonthlyTarget: low * (household.survivorSpendingPercent / 100),
    endingPortfolio,
    legacyFeasible,
    warnings,
  };
}

export function formatAge(value: number): string {
  const years = Math.floor(value);
  const months = Math.floor((value - years) * 12 + 0.001);
  return months ? `${years}y ${months}m` : `${years}`;
}

export function currentTspLimitFor(person: PersonInput, year: number): number {
  return tspLimit(person, year);
}
