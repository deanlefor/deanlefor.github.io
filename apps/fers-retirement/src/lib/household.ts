import {
  isValidIsoDate,
  validateHousehold,
  type HouseholdInput,
  type PersonInput,
} from "./calculator.ts";
export const STORAGE_KEY = "dual-fers-retirement-planner-v01";
const MIN_SOCIAL_SECURITY_CLAIMING_AGE_MONTHS = 62 * 12;
const MAX_SOCIAL_SECURITY_CLAIMING_AGE_MONTHS = 70 * 12;
function normalizeSocialSecurityBasis(value: unknown) {
  if (value === undefined) return "today";
  if (value !== "today" && value !== "future")
    throw new Error("Invalid saved Social Security basis.");
  return value;
}

export const sampleHousehold: HouseholdInput = {
  asOfDate: "2026-07-14",
  inflation: 2.5,
  postRetirementReturn: 5,
  contributionLimitGrowth: 2.2,
  otherSavings: 150_000,
  otherAnnualContribution: 12_000,
  otherSavingsReturn: 5.5,
  legacyTarget: 1_000_000,
  survivorSpendingPercent: 75,
  people: [
    {
      name: "John",
      birthDate: "1983-06-15",
      serviceDate: "2008-01-07",
      retirementDate: "2043-06-30",
      currentSalary: 175_000,
      salaryGrowth: 2.5,
      currentHigh3: 170_000,
      projectedHigh3Override: 0,
      sickLeaveHours: 1_200,
      traditionalTsp: 350_000,
      rothTsp: 0,
      contributionMode: "maximum",
      annualContribution: 24_500,
      contributionPercent: 10,
      rothContributionPercent: 0,
      preRetirementReturn: 6.2,
      socialSecurityDollarBasis: "today",
      socialSecurityAt62: 2_800,
      socialSecurityMonthly: 4_400,
      socialSecurityClaimingAgeMonths: 70 * 12,
      survivorElection: "full",
      planningAge: 95,
    },
    {
      name: "Jane",
      birthDate: "1984-10-20",
      serviceDate: "2010-03-01",
      retirementDate: "2042-10-31",
      currentSalary: 185_000,
      salaryGrowth: 2.5,
      currentHigh3: 180_000,
      projectedHigh3Override: 0,
      sickLeaveHours: 1_000,
      traditionalTsp: 390_000,
      rothTsp: 0,
      contributionMode: "maximum",
      annualContribution: 24_500,
      contributionPercent: 10,
      rothContributionPercent: 0,
      preRetirementReturn: 5.8,
      socialSecurityDollarBasis: "today",
      socialSecurityAt62: 3_000,
      socialSecurityMonthly: 4_650,
      socialSecurityClaimingAgeMonths: 70 * 12,
      survivorElection: "full",
      planningAge: 95,
    },
  ],
};

type LegacyPersonInput = Partial<PersonInput> & {
  socialSecurityStartDate?: unknown;
};

export function normalizeClaimingAgeMonths(value: unknown, fallback: number) {
  if (
    value !== undefined &&
    (typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < MIN_SOCIAL_SECURITY_CLAIMING_AGE_MONTHS ||
      value > MAX_SOCIAL_SECURITY_CLAIMING_AGE_MONTHS)
  )
    throw new Error("Invalid saved claiming age.");
  const numeric = value === undefined ? fallback : (value as number);
  return Math.min(
    MAX_SOCIAL_SECURITY_CLAIMING_AGE_MONTHS,
    Math.max(MIN_SOCIAL_SECURITY_CLAIMING_AGE_MONTHS, numeric),
  );
}

function normalizeStoredDate(value: unknown, fallback: string): string {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !isValidIsoDate(value))
    throw new Error("Invalid saved date.");
  return value;
}

function monthIndex(value: string): number | null {
  const [year, month] = value.split("-").map(Number);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  )
    return null;
  return year * 12 + month - 1;
}

function normalizeStoredPerson(
  stored: LegacyPersonInput | undefined,
  fallback: PersonInput,
): PersonInput {
  if (
    stored !== undefined &&
    (!stored || typeof stored !== "object" || Array.isArray(stored))
  )
    throw new Error("Invalid saved person.");
  const legacy = stored ?? {};
  const { socialSecurityStartDate, ...storedWithoutLegacyDate } = legacy;
  const birthDate = normalizeStoredDate(
    storedWithoutLegacyDate.birthDate,
    fallback.birthDate,
  );
  const birthMonth = monthIndex(birthDate);
  const startMonth =
    typeof socialSecurityStartDate === "string"
      ? monthIndex(socialSecurityStartDate)
      : null;
  const legacyClaimingAgeMonths =
    birthMonth !== null && startMonth !== null
      ? startMonth - birthMonth
      : fallback.socialSecurityClaimingAgeMonths;

  return {
    ...fallback,
    ...storedWithoutLegacyDate,
    birthDate,
    serviceDate: normalizeStoredDate(
      storedWithoutLegacyDate.serviceDate,
      fallback.serviceDate,
    ),
    retirementDate: normalizeStoredDate(
      storedWithoutLegacyDate.retirementDate,
      fallback.retirementDate,
    ),
    socialSecurityDollarBasis: normalizeSocialSecurityBasis(
      storedWithoutLegacyDate.socialSecurityDollarBasis,
    ),
    socialSecurityClaimingAgeMonths: normalizeClaimingAgeMonths(
      storedWithoutLegacyDate.socialSecurityClaimingAgeMonths,
      normalizeClaimingAgeMonths(
        legacyClaimingAgeMonths,
        fallback.socialSecurityClaimingAgeMonths,
      ),
    ),
  };
}

export function normalizeStoredHousehold(value: unknown): HouseholdInput {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid saved household.");
  const stored = value as Partial<HouseholdInput>;
  if (!Array.isArray(stored.people) || stored.people.length !== 2)
    throw new Error("Invalid saved people.");
  const storedPeople = stored.people;
  const personOne = storedPeople[0] as Partial<PersonInput> | undefined;
  const personTwo = storedPeople[1] as Partial<PersonInput> | undefined;

  const normalized: HouseholdInput = {
    ...sampleHousehold,
    ...stored,
    asOfDate: normalizeStoredDate(stored.asOfDate, sampleHousehold.asOfDate),
    people: [
      normalizeStoredPerson(personOne, sampleHousehold.people[0]),
      normalizeStoredPerson(personTwo, sampleHousehold.people[1]),
    ],
  };
  const errors = validateHousehold(normalized);
  if (errors.length) throw new Error(errors.join(" "));
  return normalized;
}

export interface ScenarioStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// Lazy initialization prevents the initial sample from overwriting a saved scenario.
export function readSavedHousehold(storage: () => ScenarioStorage) {
  try {
    const raw = storage().getItem(STORAGE_KEY);
    return {
      household:
        raw === null
          ? structuredClone(sampleHousehold)
          : normalizeStoredHousehold(JSON.parse(raw)),
      protectedData: false,
      message: "",
    };
  } catch {
    return {
      household: structuredClone(sampleHousehold),
      protectedData: true,
      message:
        "Saved inputs could not be read. Sample inputs are shown, and the original saved copy is preserved. Reload the sample explicitly to replace it.",
    };
  }
}

export function saveHousehold(
  household: HouseholdInput,
  storage: () => ScenarioStorage,
  protectedData = false,
): string {
  if (protectedData)
    return "The unreadable saved copy is preserved. Download your current inputs before closing this tab, or reload the sample to replace the saved copy.";
  if (validateHousehold(household).length)
    return "Correct the scenario errors before saving. Your previous saved inputs are unchanged.";
  try {
    storage().setItem(STORAGE_KEY, JSON.stringify(household));
    return "Saved locally";
  } catch {
    return "Saving failed. Your current inputs remain in this tab. Download them before closing this page.";
  }
}
