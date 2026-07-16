"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  calculateProjection,
  currentTspLimitFor,
  formatAge,
  type ContributionMode,
  type HouseholdInput,
  type PersonInput,
  type SocialSecurityDollarBasis,
  type SurvivorElection,
} from "./lib/calculator";

const STORAGE_KEY = "dual-fers-retirement-planner-v01";

const sampleHousehold: HouseholdInput = {
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

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compactUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const survivorElectionDisplay: Record<SurvivorElection, { label: string; reduction: string; reductionRate: number }> = {
  full: { label: "Full survivor benefit", reduction: "10% annuity reduction", reductionRate: 10 },
  partial: { label: "Partial survivor benefit", reduction: "5% annuity reduction", reductionRate: 5 },
  none: { label: "No survivor benefit", reduction: "No annuity reduction", reductionRate: 0 },
};

const socialSecurityBasisDisplay: Record<SocialSecurityDollarBasis, string> = {
  today: "Today's dollars",
  future: "Future dollars at each benefit date",
};

const MIN_SOCIAL_SECURITY_CLAIMING_AGE_MONTHS = 62 * 12;
const MAX_SOCIAL_SECURITY_CLAIMING_AGE_MONTHS = 70 * 12;
const SOCIAL_SECURITY_CLAIMING_AGES = Array.from({ length: 9 }, (_, index) => 62 + index);
const SOCIAL_SECURITY_CLAIMING_MONTHS = Array.from({ length: 12 }, (_, index) => index);

function normalizeSocialSecurityBasis(value: unknown): SocialSecurityDollarBasis {
  return value === "future" ? "future" : "today";
}

type LegacyPersonInput = Partial<PersonInput> & { socialSecurityStartDate?: unknown };

function normalizeClaimingAgeMonths(value: unknown, fallback: number) {
  const numeric = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.min(MAX_SOCIAL_SECURITY_CLAIMING_AGE_MONTHS, Math.max(MIN_SOCIAL_SECURITY_CLAIMING_AGE_MONTHS, numeric));
}

function monthIndex(value: string): number | null {
  const [year, month] = value.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return year * 12 + month - 1;
}

function normalizeStoredPerson(stored: LegacyPersonInput | undefined, fallback: PersonInput): PersonInput {
  const legacy = stored ?? {};
  const { socialSecurityStartDate, ...storedWithoutLegacyDate } = legacy;
  const birthDate = typeof storedWithoutLegacyDate.birthDate === "string" ? storedWithoutLegacyDate.birthDate : fallback.birthDate;
  const birthMonth = monthIndex(birthDate);
  const startMonth = typeof socialSecurityStartDate === "string" ? monthIndex(socialSecurityStartDate) : null;
  const legacyClaimingAgeMonths = birthMonth !== null && startMonth !== null
    ? startMonth - birthMonth
    : fallback.socialSecurityClaimingAgeMonths;

  return {
    ...fallback,
    ...storedWithoutLegacyDate,
    socialSecurityDollarBasis: normalizeSocialSecurityBasis(storedWithoutLegacyDate.socialSecurityDollarBasis),
    socialSecurityClaimingAgeMonths: normalizeClaimingAgeMonths(
      storedWithoutLegacyDate.socialSecurityClaimingAgeMonths,
      normalizeClaimingAgeMonths(legacyClaimingAgeMonths, fallback.socialSecurityClaimingAgeMonths),
    ),
  };
}

function normalizeStoredHousehold(value: unknown): HouseholdInput {
  if (!value || typeof value !== "object") return structuredClone(sampleHousehold);
  const stored = value as Partial<HouseholdInput>;
  const storedPeople = Array.isArray(stored.people) ? stored.people : [];
  const personOne = storedPeople[0] as Partial<PersonInput> | undefined;
  const personTwo = storedPeople[1] as Partial<PersonInput> | undefined;

  return {
    ...sampleHousehold,
    ...stored,
    people: [
      normalizeStoredPerson(personOne, sampleHousehold.people[0]),
      normalizeStoredPerson(personTwo, sampleHousehold.people[1]),
    ],
  };
}

function displayDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

function formatService(value: number) {
  const totalMonths = Math.floor(value * 12 + 0.001);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  return `${years} ${years === 1 ? "year" : "years"}${months ? `, ${months} ${months === 1 ? "month" : "months"}` : ""}`;
}

function formatClaimingAge(totalMonths: number) {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  return months ? `${years} and ${months} ${months === 1 ? "month" : "months"}` : `${years}`;
}

function InfoTip({ label, text }: { label: string; text: string }) {
  const tooltipId = useId();

  return (
    <span className="info-tip">
      <button
        type="button"
        className="info-button"
        aria-label={`More information about ${label}`}
        aria-describedby={tooltipId}
      >
        i
      </button>
      <span className="info-tooltip" id={tooltipId} role="tooltip">{text}</span>
    </span>
  );
}

function FieldLabel({ htmlFor, label, info }: { htmlFor: string; label: string; info?: string }) {
  return (
    <div className="field-label">
      <label htmlFor={htmlFor}>{label}</label>
      {info && <InfoTip label={label} text={info} />}
    </div>
  );
}

function ResultTerm({ label, info }: { label: string; info?: string }) {
  return (
    <dt className="result-term">
      <span>{label}</span>
      {info && <InfoTip label={label} text={info} />}
    </dt>
  );
}

function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  min = 0,
  info,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  info?: string;
}) {
  const inputId = useId();

  return (
    <div className="field">
      <FieldLabel htmlFor={inputId} label={label} info={info} />
      <div className="input-wrap">
        {prefix && <span className="input-affix">{prefix}</span>}
        <input
          id={inputId}
          type="number"
          value={value}
          min={min}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix && <span className="input-affix suffix">{suffix}</span>}
      </div>
    </div>
  );
}

function DateField({ label, value, onChange, info }: { label: string; value: string; onChange: (value: string) => void; info?: string }) {
  const inputId = useId();

  return (
    <div className="field">
      <FieldLabel htmlFor={inputId} label={label} info={info} />
      <input id={inputId} type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function TextField({ label, value, onChange, info }: { label: string; value: string; onChange: (value: string) => void; info?: string }) {
  const inputId = useId();

  return (
    <div className="field">
      <FieldLabel htmlFor={inputId} label={label} info={info} />
      <input id={inputId} type="text" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  info,
  children,
  note,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  info?: string;
  children: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <div className="field">
      <FieldLabel htmlFor={id} label={label} info={info} />
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
      {note && <small>{note}</small>}
    </div>
  );
}

function SocialSecurityClaimingAgeField({
  value,
  startDate,
  onChange,
}: {
  value: number;
  startDate: string;
  onChange: (value: number) => void;
}) {
  const ageId = useId();
  const monthsId = useId();
  const normalizedValue = normalizeClaimingAgeMonths(value, MIN_SOCIAL_SECURITY_CLAIMING_AGE_MONTHS);
  const years = Math.floor(normalizedValue / 12);
  const months = normalizedValue % 12;
  const availableMonths = years === 70 ? [0] : SOCIAL_SECURITY_CLAIMING_MONTHS;

  return (
    <div className="field claiming-age-field">
      <FieldLabel htmlFor={ageId} label="Claiming age from SSA" info="Select the same age and additional months used for the estimate on the Social Security retirement calculator. The displayed start month is used for planning; confirm the exact entitlement month with SSA because day-of-birth rules can affect it." />
      <div className="claiming-age-controls">
        <label htmlFor={ageId}><span>Age</span><select id={ageId} value={years} onChange={(event) => {
          const nextYears = Number(event.target.value);
          onChange(nextYears * 12 + (nextYears === 70 ? 0 : months));
        }}>{SOCIAL_SECURITY_CLAIMING_AGES.map((age) => <option key={age} value={age}>{age}</option>)}</select></label>
        <label htmlFor={monthsId}><span>Months</span><select id={monthsId} value={years === 70 ? 0 : months} onChange={(event) => onChange(years * 12 + Number(event.target.value))}>{availableMonths.map((month) => <option key={month} value={month}>{month}</option>)}</select></label>
      </div>
      <small>Projection benefit start month: <strong>{displayDate(startDate)}</strong></small>
    </div>
  );
}

function TopicSection({
  number,
  title,
  description,
  defaultOpen = false,
  children,
}: {
  number: number;
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <details className="topic-section" open={isOpen} onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary>
        <span className="topic-number" aria-hidden="true">{number}</span>
        <span className="topic-heading"><strong>{title}</strong><small>{description}</small></span>
        <span className="topic-state" aria-hidden="true">{isOpen ? "Hide" : "Open"}</span>
      </summary>
      <div className="topic-content">{children}</div>
    </details>
  );
}

function PersonTopicCard({ person, index, children }: { person: PersonInput; index: number; children: React.ReactNode }) {
  return (
    <article className={`person-topic-card person-${index + 1}`}>
      <div className="person-topic-heading">
        <span className="avatar">{person.name.slice(0, 1).toUpperCase()}</span>
        <div><span>Person {index + 1}</span><strong>{person.name}</strong></div>
      </div>
      {children}
    </article>
  );
}

function Timeline({ household, result }: { household: HouseholdInput; result: ReturnType<typeof calculateProjection> }) {
  const startYear = Number(household.asOfDate.slice(0, 4));
  const endYear = Math.max(...result.people.map((person) => Number(person.planningDate.slice(0, 4))));
  const span = endYear - startYear;
  const position = (date: string) => `${Math.min(100, Math.max(0, ((Number(date.slice(0, 4)) - startYear) / span) * 100))}%`;

  return (
    <div className="timeline" aria-label="Household retirement timeline">
      {result.people.map((person, index) => (
        <div className={`person-track person-${index + 1}`} key={person.name}>
          <div className="track-name">
            <span className="avatar">{person.name.slice(0, 1).toUpperCase()}</span>
            <strong>{person.name}</strong>
          </div>
          <div className="track-line" style={{ "--retire": position(person.retirementDate) } as React.CSSProperties}>
            <span className="line-solid" />
            <span className="line-dotted" />
            <span className="timeline-node today" style={{ left: "0%" }}>
              <i />
              <b>{displayDate(household.asOfDate)}</b>
              <small>Age {formatAge(person.currentAge)}</small>
            </span>
            <span className="timeline-node retirement" style={{ left: position(person.retirementDate) }}>
              <i />
              <b>{displayDate(person.retirementDate)}</b>
              <small>Retires · age {formatAge(person.retirementAge)}</small>
            </span>
            <span className="timeline-node planning" style={{ left: position(person.planningDate) }}>
              <i />
              <b>Age {household.people[index].planningAge}</b>
              <small>Planning horizon</small>
            </span>
          </div>
        </div>
      ))}
      <div className="axis">
        {[0, 0.25, 0.5, 0.75, 1].map((portion) => (
          <span key={portion} style={{ left: `${portion * 100}%` }}>{Math.round(startYear + span * portion)}</span>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [household, setHousehold] = useState<HouseholdInput>(sampleHousehold);
  const setupRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = normalizeStoredHousehold(JSON.parse(stored));
        queueMicrotask(() => setHousehold(parsed));
      } catch { /* retain sample */ }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(household));
  }, [household]);

  const result = useMemo(() => calculateProjection(household), [household]);
  const realPostRetirementReturn = ((1 + household.postRetirementReturn / 100) / (1 + household.inflation / 100) - 1) * 100;
  const updatePerson = (index: number, person: PersonInput) => {
    const people = [...household.people] as [PersonInput, PersonInput];
    people[index] = person;
    setHousehold({ ...household, people });
  };
  const updatePersonField = <K extends keyof PersonInput,>(index: number, key: K, value: PersonInput[K]) => {
    updatePerson(index, { ...household.people[index], [key]: value });
  };
  const updateHousehold = <K extends keyof HouseholdInput>(key: K, value: HouseholdInput[K]) => setHousehold({ ...household, [key]: value });
  const reloadSampleHousehold = () => {
    const confirmed = window.confirm(
      "Reload the sample household? This will replace all current inputs saved in this browser with the John and Jane sample data. This cannot be undone.",
    );
    if (confirmed) setHousehold(structuredClone(sampleHousehold));
  };

  return (
    <main>
      <header className="site-header">
        <div>
          <p className="eyebrow">Release 0.1 · working prototype</p>
          <h1>Dual-FERS Retirement Planner</h1>
        </div>
        <div className="header-actions">
          <a className="home-link" href="/">deanlefor.com</a>
          <div className="privacy-note"><span aria-hidden="true">✓</span> Your financial data stays in this browser</div>
        </div>
      </header>

      <section className="projection-card" aria-labelledby="projection-heading">
        <div className="projection-heading">
          <div>
            <p id="projection-heading">Projected gross monthly retirement income</p>
            <div className="hero-number">{usd.format(result.sustainableGrossMonthlyIncome)} <span>/ month</span></div>
          </div>
          <div className="today-card">
            <strong>In today&apos;s dollars</strong>
            <span>Before taxes, FEHB, and Medicare</span>
          </div>
        </div>
        <Timeline household={household} result={result} />
      </section>

      <section className="summary-grid">
        <article className="summary-card">
          <div className="section-heading">
            <div><p className="eyebrow">Household result</p><h2>What supports the monthly estimate</h2></div>
            <span className="saved-state">Saved locally</span>
          </div>
          <div className="metric-grid">
            <div><span>Portfolio when both retire, today&apos;s dollars</span><strong>{compactUsd.format(result.projectedPortfolioAtBothRetiredToday)}</strong><small>{compactUsd.format(result.projectedPortfolioAtBothRetired)} in future dollars</small></div>
            <div><span>Fixed income at the both-retired date</span><strong>{usd.format(result.fixedIncomeAtBothRetired)}</strong><small>today&apos;s dollars</small></div>
            <div><span>Portfolio draw at retirement</span><strong>{usd.format(result.portfolioDrawAtBothRetired)}</strong></div>
            <div><span>Target ending portfolio</span><strong>{compactUsd.format(household.legacyTarget)}</strong></div>
          </div>
          <div className="income-bar" aria-label="Income composition at both-retired date">
            <span className="fixed" style={{ width: `${Math.min(100, (result.fixedIncomeAtBothRetired / Math.max(1, result.sustainableGrossMonthlyIncome)) * 100)}%` }} />
            <span className="draw" />
          </div>
          <div className="legend"><span><i className="fixed-dot" /> FERS, supplement, and Social Security</span><span><i className="draw-dot" /> Portfolio draw</span></div>
          <div className="phase-breakdown">
            <div><span>When both retire</span><strong>{usd.format(result.sustainableGrossMonthlyIncome)}/mo</strong><small>{usd.format(result.fixedIncomeAtBothRetired)} fixed + {usd.format(result.portfolioDrawAtBothRetired)} portfolio</small></div>
            <div><span>After both claim Social Security</span><strong>{usd.format(result.sustainableGrossMonthlyIncome)}/mo</strong><small>{usd.format(result.fixedIncomeAfterBothSocialSecurity)} fixed + {usd.format(result.portfolioDrawAfterBothSocialSecurity)} portfolio</small></div>
            <div><span>Survivor spending target</span><strong>{usd.format(result.survivorMonthlyTarget)}/mo</strong><small>{household.survivorSpendingPercent}% of the joint household amount</small></div>
          </div>
        </article>

        <aside className="action-card">
          <p className="eyebrow">Your scenario</p>
          <h2>Make the projection yours</h2>
          <p>Work through five focused topics, comparing both people side by side as you go.</p>
          <button className="primary-button" onClick={() => setupRef.current?.scrollIntoView({ behavior: "smooth" })}>Edit your household <span>↓</span></button>
          <button className="secondary-button" onClick={reloadSampleHousehold}>Reload sample household</button>
        </aside>
      </section>

      <section className="setup-section" ref={setupRef}>
        <div className="setup-heading">
          <div><p className="eyebrow">Household inputs</p><h2>Build your two-person projection</h2></div>
          <p>Work through one retirement topic at a time. Changes recalculate immediately and save only in this browser.</p>
        </div>

        <div className="topic-list">
          <TopicSection number={1} title="Personal information and retirement timeline" description="Who you are, where the projection starts, and when each retirement journey begins and ends." defaultOpen>
            <div className="shared-date-row">
              <DateField label="Projection as-of date" value={household.asOfDate} onChange={(value) => updateHousehold("asOfDate", value)} info="The date on which the entered salaries, balances, and assumptions apply. Projections begin from this date." />
              <p>Use the same statement or pay-period date for both people whenever practical.</p>
            </div>
            <div className="person-topic-grid">
              {household.people.map((person, index) => {
                const personResult = result.people[index];

                return (
                  <PersonTopicCard key={`personal-${index}`} person={person} index={index}>
                    <div className="field-grid topic-field-grid">
                      <TextField label="Name" value={person.name} onChange={(value) => updatePersonField(index, "name", value)} info="A display name used to keep the two projections separate. It remains only in this browser." />
                      <DateField label="Date of birth" value={person.birthDate} onChange={(value) => updatePersonField(index, "birthDate", value)} info="Used to determine retirement age, minimum retirement age, TSP catch-up limits, and the planning horizon." />
                      <DateField label="Retirement SCD" value={person.serviceDate} onChange={(value) => updatePersonField(index, "serviceDate", value)} info="Enter the retirement service computation date shown in federal records. It may differ from the original hire date because of breaks or prior service." />
                      <DateField label="Planned retirement" value={person.retirementDate} onChange={(value) => updatePersonField(index, "retirementDate", value)} info="The planned retirement date used throughout the TSP, FERS, and household timeline calculations." />
                      <NumberField label="Current basic salary" value={person.currentSalary} prefix="$" step={1000} onChange={(value) => updatePersonField(index, "currentSalary", value)} info="Annual basic pay used for salary projection, TSP contribution matching, and FERS planning. Exclude bonuses and overtime unless they count as basic pay." />
                      <NumberField label="Planning age" value={person.planningAge} suffix="years" step={1} min={70} onChange={(value) => updatePersonField(index, "planningAge", value)} info="The age through which this scenario should plan. It is a modeling horizon, not a prediction of lifespan." />
                    </div>
                    <div className="retirement-date-summary">
                      <div><span>Age at retirement</span><strong>{formatAge(personResult.retirementAge)}</strong><small>Based on birth and retirement dates</small></div>
                      <div><span>Years of service</span><strong>{formatService(personResult.eligibilityServiceYears)}</strong><small>Retirement SCD to retirement; sick leave excluded</small></div>
                      <p className={personResult.eligibleImmediateRetirement ? "eligible" : "not-eligible"}>{personResult.eligibilityMessage}</p>
                    </div>
                  </PersonTopicCard>
                );
              })}
            </div>
          </TopicSection>

          <TopicSection number={2} title="Household and market assumptions" description="Shared assumptions that apply to the combined retirement plan.">
            <article className="shared-topic-card">
              <div className="field-grid shared-field-grid">
                <NumberField label="Inflation" value={household.inflation} suffix="%" step={0.1} onChange={(value) => updateHousehold("inflation", value)} info="The assumed average annual increase in prices. It converts future values into today’s dollars." />
                <NumberField label="Post-retirement return" value={household.postRetirementReturn} suffix="%" step={0.1} onChange={(value) => updateHousehold("postRetirementReturn", value)} info="The assumed average annual investment return after both people retire. This is a planning assumption, not a guarantee." />
                <NumberField label="Target ending portfolio" value={household.legacyTarget} prefix="$" step={50_000} onChange={(value) => updateHousehold("legacyTarget", value)} info="$0 permits full portfolio spend-down by the later planning horizon. Any positive amount is preserved in today’s dollars." />
                <NumberField label="Survivor spending" value={household.survivorSpendingPercent} suffix="% of joint amount" step={5} onChange={(value) => updateHousehold("survivorSpendingPercent", value)} info="The percentage of joint household income the surviving person is assumed to need after the first planning horizon ends." />
              </div>
            </article>
          </TopicSection>

          <TopicSection number={3} title="TSP contributions and investments" description="Current balances, contribution choices, investment assumptions, and other household savings.">
            <div className="person-topic-grid">
              {household.people.map((person, index) => {
                const personResult = result.people[index];
                const matchingRate = person.currentSalary > 0
                  ? personResult.currentAnnualAgencyMatchingContribution / person.currentSalary * 100
                  : 0;

                return (
                  <PersonTopicCard key={`tsp-${index}`} person={person} index={index}>
                    <div className="field-grid topic-field-grid">
                      <NumberField label="Traditional TSP balance" value={person.traditionalTsp} prefix="$" step={1000} onChange={(value) => updatePersonField(index, "traditionalTsp", value)} info="Enter the current Traditional balance from the latest TSP statement. Agency contributions are also projected into this balance." />
                      <NumberField label="Roth TSP balance" value={person.rothTsp} prefix="$" step={1000} onChange={(value) => updatePersonField(index, "rothTsp", value)} info="Enter the current Roth balance from the latest TSP statement. It remains separate for later tax and withdrawal modeling." />
                      <SelectField id={`contribution-strategy-${index}`} label="Contribution strategy" value={person.contributionMode} onChange={(value) => updatePersonField(index, "contributionMode", value as ContributionMode)} info="Choose whether future employee contributions follow the projected annual limit, a fixed annual amount, or a percentage of salary." note={person.contributionMode === "maximum" ? `${usd.format(currentTspLimitFor(person, Number(household.asOfDate.slice(0, 4))))} under 2026 age-based limits` : undefined}>
                        <option value="maximum">Annual maximum</option>
                        <option value="annual">Fixed annual amount</option>
                        <option value="percent">Percent of salary</option>
                      </SelectField>
                      {person.contributionMode === "annual" && <NumberField label="Annual employee contribution" value={person.annualContribution} prefix="$" step={500} onChange={(value) => updatePersonField(index, "annualContribution", value)} info="The employee contribution for the year, excluding Agency Automatic and matching contributions." />}
                      {person.contributionMode === "percent" && <NumberField label="Employee contribution" value={person.contributionPercent} suffix="% of salary" step={0.5} onChange={(value) => updatePersonField(index, "contributionPercent", value)} info="The percentage of basic salary contributed to TSP. The calculator also estimates applicable agency contributions." />}
                      <NumberField label="Employee contribution to Roth" value={person.rothContributionPercent} suffix="%" step={5} onChange={(value) => updatePersonField(index, "rothContributionPercent", value)} info="The percentage of the employee contribution directed to Roth TSP. The remainder and all agency contributions go to Traditional TSP." />
                      <NumberField label="Pre-retirement return" value={person.preRetirementReturn} suffix="%" step={0.1} onChange={(value) => updatePersonField(index, "preRetirementReturn", value)} info="The assumed average annual return for this person’s TSP before retirement." />
                    </div>
                    <div className="calculation-formula">
                      <div className="calculation-heading"><span>Current-year annualized contribution formula</span><div><strong>{usd.format(personResult.currentAnnualTotalTspContribution)}/year into TSP</strong><small>current dollars</small></div></div>
                      <div className="calculation-grid">
                        <div><span>Employee contribution</span><strong>{usd.format(personResult.currentAnnualEmployeeContribution)}</strong><small>{person.contributionMode === "maximum" ? "selected annual maximum" : "selected employee amount"}</small></div>
                        <div><span>Agency Automatic</span><strong>{usd.format(personResult.currentAnnualAgencyAutomaticContribution)}</strong><small>1.0% of current basic pay</small></div>
                        <div><span>Agency match</span><strong>{usd.format(personResult.currentAnnualAgencyMatchingContribution)}</strong><small>{matchingRate.toFixed(1)}% of current basic pay</small></div>
                        <div className="calculation-total"><span>Total first-year deposits</span><strong>{usd.format(personResult.currentAnnualTotalTspContribution)}</strong><small>employee + automatic + match</small></div>
                      </div>
                      <div className="calculation-equations"><p>{usd.format(personResult.currentAnnualEmployeeContribution)} + {usd.format(personResult.currentAnnualAgencyAutomaticContribution)} + {usd.format(personResult.currentAnnualAgencyMatchingContribution)} = {usd.format(personResult.currentAnnualTotalTspContribution)} per year</p></div>
                      <small className="calculation-note">The long-term projection repeats this calculation monthly, updating salary, contribution limits, and investment returns through retirement. Employee contributions are assumed to continue throughout the year so the modeled match is not lost.</small>
                    </div>
                  </PersonTopicCard>
                );
              })}
            </div>
            <article className="shared-subsection">
              <div><p className="eyebrow">Other investments</p><h3>Household savings outside TSP</h3></div>
              <div className="field-grid shared-field-grid three-column-fields">
                <NumberField label="Current balance" value={household.otherSavings} prefix="$" step={1000} onChange={(value) => updateHousehold("otherSavings", value)} info="Current retirement savings outside either person’s TSP that should be included in the household projection." />
                <NumberField label="Annual additions" value={household.otherAnnualContribution} prefix="$" step={1000} onChange={(value) => updateHousehold("otherAnnualContribution", value)} info="The amount the household expects to add to other savings each year before both people retire." />
                <NumberField label="Pre-retirement return" value={household.otherSavingsReturn} suffix="%" step={0.1} onChange={(value) => updateHousehold("otherSavingsReturn", value)} info="The assumed average annual return on other household savings before both people retire." />
              </div>
            </article>
            <details className="advanced-panel">
              <summary>Advanced TSP assumption</summary>
              <div className="advanced-content">
                <NumberField label="Future TSP-limit growth" value={household.contributionLimitGrowth} suffix="%" step={0.1} onChange={(value) => updateHousehold("contributionLimitGrowth", value)} info="A scenario assumption for future TSP contribution-limit increases. These projected limits are not official IRS limits." />
              </div>
            </details>
          </TopicSection>

          <TopicSection number={4} title="Social Security" description="Copy the claiming age and monthly estimates shown by the official Social Security calculator.">
            <div className="official-source-callout">
              <div><strong>Start with your official estimate</strong><span>Sign in to Social Security to review personalized estimates at different claiming ages.</span></div>
              <a href="https://www.ssa.gov/prepare/get-benefits-estimate" target="_blank" rel="noreferrer">Get your SSA estimate <span aria-hidden="true">↗</span></a>
            </div>
            <div className="person-topic-grid">
              {household.people.map((person, index) => {
                const personResult = result.people[index];
                const claimingAge = formatClaimingAge(personResult.socialSecurityClaimingAgeMonths);

                return (
                  <PersonTopicCard key={`social-security-${index}`} person={person} index={index}>
                    <div className="field-grid topic-field-grid">
                      <SelectField id={`social-security-basis-${index}`} label="Dollar basis for estimates" value={person.socialSecurityDollarBasis} onChange={(value) => updatePersonField(index, "socialSecurityDollarBasis", value as SocialSecurityDollarBasis)} info="Choose today’s dollars when the estimate reflects current purchasing power. Choose future dollars when each amount is stated for the date the benefit begins.">
                        <option value="today">Today&apos;s dollars</option>
                        <option value="future">Future dollars at each benefit date</option>
                      </SelectField>
                      <SocialSecurityClaimingAgeField value={person.socialSecurityClaimingAgeMonths} startDate={personResult.socialSecurityStartDate} onChange={(value) => updatePersonField(index, "socialSecurityClaimingAgeMonths", value)} />
                      <NumberField label={`SSA monthly benefit at age ${claimingAge}`} value={person.socialSecurityMonthly} prefix="$" suffix="/month" step={50} onChange={(value) => updatePersonField(index, "socialSecurityMonthly", value)} info="Copy the monthly amount shown by SSA for this exact claiming age. Release 0.1 does not derive the benefit from earnings history." />
                      <NumberField label="SSA monthly benefit at age 62" value={person.socialSecurityAt62} prefix="$" suffix="/month" step={50} onChange={(value) => updatePersonField(index, "socialSecurityAt62", value)} info="Copy the age-62 estimate from SSA. It is used only for the approximate FERS annuity supplement." />
                    </div>
                    {person.socialSecurityDollarBasis === "future" && <p className="conversion-note">Future-dollar entries are converted to today’s dollars using the household inflation assumption before they enter the income projection.</p>}
                  </PersonTopicCard>
                );
              })}
            </div>
          </TopicSection>

          <TopicSection number={5} title="FERS annuity and assumptions" description="Service, high-3, sick leave, and survivor elections used for each pension estimate.">
            <div className="person-topic-grid">
              {household.people.map((person, index) => {
                const personResult = result.people[index];
                const election = survivorElectionDisplay[person.survivorElection];
                const sickLeaveService = Math.max(0, personResult.serviceYears - personResult.eligibilityServiceYears);
                const payablePercent = 100 - election.reductionRate;

                return (
                  <PersonTopicCard key={`fers-${index}`} person={person} index={index}>
                    <p className="uses-timeline">Uses the retirement SCD, {displayDate(person.retirementDate)} retirement date, and {usd.format(person.currentSalary)} salary entered in Personal information.</p>
                    <div className="field-grid topic-field-grid">
                      <NumberField label="Annual salary growth" value={person.salaryGrowth} suffix="%" step={0.1} onChange={(value) => updatePersonField(index, "salaryGrowth", value)} info="The assumed average yearly increase in basic salary before retirement, used to project salary and high-3 values." />
                      <NumberField label="Current high-3 estimate" value={person.currentHigh3} prefix="$" step={1000} onChange={(value) => updatePersonField(index, "currentHigh3", value)} info="The current estimate of the highest average basic pay earned during any three consecutive years of creditable service." />
                      <NumberField label="Unused sick leave at retirement" value={person.sickLeaveHours} suffix="hours" step={8} onChange={(value) => updatePersonField(index, "sickLeaveHours", value)} info="Expected unused sick-leave hours at retirement. Release 0.1 converts them approximately into additional service for the annuity calculation." />
                      <SelectField id={`survivor-election-${index}`} label="Survivor annuity election" value={person.survivorElection} onChange={(value) => updatePersonField(index, "survivorElection", value as SurvivorElection)} info="Full and partial elections reduce the payable FERS annuity in exchange for a survivor benefit. Release 0.1 models full as a 10% reduction and partial as a 5% reduction.">
                        <option value="full">Full survivor benefit</option>
                        <option value="partial">Partial survivor benefit</option>
                        <option value="none">No survivor benefit</option>
                      </SelectField>
                    </div>
                    <details className="advanced-panel person-advanced-panel">
                      <summary>Advanced high-3 option</summary>
                      <div className="advanced-content">
                        <NumberField label="Projected high-3 override" value={person.projectedHigh3Override} prefix="$" step={1000} onChange={(value) => updatePersonField(index, "projectedHigh3Override", value)} info="Enter an official or independently calculated high-3 at retirement. Leave this at $0 to project the current estimate using salary growth." />
                      </div>
                    </details>
                    <div className="calculation-formula fers-input-calculation">
                      <div className="calculation-heading"><span>Projected FERS annuity formula</span><div><strong>{usd.format(personResult.monthlyFersAtRetirement)}/month payable</strong><small>future dollars at retirement</small></div></div>
                      <div className="calculation-grid">
                        <div><span>Projected high-3</span><strong>{usd.format(personResult.projectedHigh3)}</strong><small>{person.projectedHigh3Override > 0 ? "entered override" : `${person.salaryGrowth}% annual growth through retirement`}</small></div>
                        <div><span>Annuity service</span><strong>{formatService(personResult.serviceYears)}</strong><small>{formatService(personResult.eligibilityServiceYears)} eligibility + {formatService(sickLeaveService)} sick leave</small></div>
                        <div><span>FERS multiplier</span><strong>{(personResult.fersMultiplier * 100).toFixed(1)}%</strong><small>retirement age {formatAge(personResult.retirementAge)} and computation service</small></div>
                        <div><span>Unreduced annual annuity</span><strong>{usd.format(personResult.unreducedAnnualFers)}</strong><small>before survivor election</small></div>
                        <div><span>Survivor adjustment</span><strong>−{election.reductionRate}%</strong><small>{election.label}</small></div>
                        <div className="calculation-total"><span>Payable FERS annuity</span><strong>{usd.format(personResult.monthlyFersAtRetirement)}/month</strong><small>after survivor adjustment</small></div>
                      </div>
                      <div className="calculation-equations">
                        {person.projectedHigh3Override > 0
                          ? <p>Projected high-3 override = {usd.format(personResult.projectedHigh3)}</p>
                          : <p>{usd.format(person.currentHigh3)} × (1 + {person.salaryGrowth.toFixed(1)}%)<sup>{personResult.yearsToRetirement.toFixed(2)} years</sup> = {usd.format(personResult.projectedHigh3)} projected high-3</p>}
                        <p>{usd.format(personResult.projectedHigh3)} × {personResult.serviceYears.toFixed(2)} years × {(personResult.fersMultiplier * 100).toFixed(1)}% = {usd.format(personResult.unreducedAnnualFers)}/year</p>
                        <p>{usd.format(personResult.unreducedAnnualFers)} × {payablePercent}% ÷ 12 = {usd.format(personResult.monthlyFersAtRetirement)}/month payable</p>
                        {personResult.monthlySupplementAtRetirement > 0 && <p className="secondary-equation">Supplement approximation · today&apos;s dollars: {usd.format(personResult.socialSecurityAt62Today)} × {Math.min(personResult.eligibilityServiceYears, 40).toFixed(2)} ÷ 40 = {usd.format(personResult.monthlySupplementAtRetirement)}/month</p>}
                      </div>
                      <small className="calculation-note">Eligibility uses service through retirement without sick leave. The annuity formula adds the modeled sick-leave credit. The payable annuity above is shown in future dollars at retirement; the main results convert it to today&apos;s purchasing power.</small>
                    </div>
                  </PersonTopicCard>
                );
              })}
            </div>
          </TopicSection>
        </div>
      </section>

      <section className="detail-section">
        <div className="setup-heading">
          <div><p className="eyebrow">Your retirement picture</p><h2>Results organized by income source</h2></div>
          <p>Review investments, FERS, Social Security, and portfolio use separately before considering the combined household result.</p>
        </div>
        <div className="result-source-list">
          <article className="result-source-card investments-results">
            <div className="result-source-heading">
              <div><p className="eyebrow">Investments · today&apos;s dollars</p><h3>TSP and other retirement savings</h3></div>
              <p className="source-total"><strong>{compactUsd.format(result.projectedPortfolioAtBothRetiredToday)}</strong><span>combined purchasing power at the both-retired date · today&apos;s dollars</span></p>
            </div>
            <div className="source-person-grid">
              {result.people.map((person, index) => (
                <section key={`tsp-result-${index}`} className={`source-person-card person-${index + 1}`} aria-label={`${person.name} TSP projection`}>
                  <div className="source-person-heading"><span className="avatar">{person.name.slice(0, 1).toUpperCase()}</span><h4>{person.name}</h4></div>
                  <dl className="source-details">
                    <div><dt>Traditional TSP</dt><dd>{usd.format(person.projectedTraditionalTspToday)}<small>includes modeled agency deposits</small></dd></div>
                    <div><dt>Roth TSP</dt><dd>{usd.format(person.projectedRothTspToday)}</dd></div>
                    <div className="source-subtotal"><dt>Total TSP</dt><dd>{usd.format(person.projectedTraditionalTspToday + person.projectedRothTspToday)}</dd></div>
                  </dl>
                  <p className="money-basis">At the both-retired date · today&apos;s dollars</p>
                </section>
              ))}
            </div>
            <div className="household-result-strip">
              <div><span>Combined TSP</span><strong>{usd.format(result.projectedPortfolioAtBothRetiredToday - result.projectedOtherAtBothRetiredToday)}</strong><small>today&apos;s dollars</small></div>
              <div><span>Other investments</span><strong>{usd.format(result.projectedOtherAtBothRetiredToday)}</strong><small>today&apos;s dollars</small></div>
            </div>
            <details className="future-values-panel">
              <summary>Show these same balances in future dollars</summary>
              <div className="future-values-grid">
                <p className="future-values-note">These are the same projected accounts before adjusting for inflation—not additional savings or a second projection.</p>
                <div><span>{result.people[0].name} TSP</span><strong>{usd.format(result.people[0].projectedTraditionalTsp + result.people[0].projectedRothTsp)}</strong></div>
                <div><span>{result.people[1].name} TSP</span><strong>{usd.format(result.people[1].projectedTraditionalTsp + result.people[1].projectedRothTsp)}</strong></div>
                <div><span>Other investments</span><strong>{usd.format(result.projectedOtherAtBothRetired)}</strong></div>
                <div><span>Combined portfolio</span><strong>{usd.format(result.projectedPortfolioAtBothRetired)}</strong></div>
              </div>
            </details>
          </article>

          <article className="result-source-card fers-results">
            <div className="result-source-heading">
              <div><p className="eyebrow">Federal pension · today&apos;s dollars</p><h3>FERS annuity estimates</h3></div>
              <p className="source-total"><strong>{usd.format(result.people[0].monthlyFersAtRetirementToday + result.people[1].monthlyFersAtRetirementToday)}/mo</strong><span>combined payable annuities · today&apos;s dollars</span></p>
            </div>
            <div className="source-person-grid">
              {result.people.map((person, index) => {
                const election = survivorElectionDisplay[household.people[index].survivorElection];

                return (
                  <section key={`fers-result-${index}`} className={`source-person-card fers-person-result person-${index + 1}`} aria-label={`${person.name} FERS annuity calculation`}>
                    <div className="source-person-heading"><span className="avatar">{person.name.slice(0, 1).toUpperCase()}</span><div><h4>{person.name}</h4><p>{person.eligibilityMessage}</p></div></div>
                    <p className="person-headline-result"><strong>{usd.format(person.monthlyFersAtRetirementToday)}</strong><span>/ month payable</span><small>today&apos;s dollars</small></p>
                    <dl className="source-details fers-details">
                      <div><ResultTerm label="Retirement age" info="Age on the planned retirement date. It helps determine eligibility and whether the 1.0% or 1.1% formula applies." /><dd>{formatAge(person.retirementAge)}</dd></div>
                      <div><ResultTerm label="Eligibility service" info="Service from the retirement SCD through retirement. Unused sick leave is excluded when testing retirement eligibility." /><dd>{formatService(person.eligibilityServiceYears)}</dd></div>
                      <div><ResultTerm label="Annuity service" info="Eligibility service plus the Release 0.1 unused-sick-leave approximation used in the annuity calculation." /><dd>{formatService(person.serviceYears)}</dd></div>
                      <div><ResultTerm label="Unreduced annuity" info="The estimated annuity before the selected survivor-benefit reduction and before taxes, insurance, or other deductions." /><dd>{usd.format(person.unreducedAnnualFersToday / 12)}/mo<small>today&apos;s dollars</small></dd></div>
                      <div><ResultTerm label="Survivor adjustment" info="The selected survivor benefit reduces the employee’s payable annuity while providing the modeled survivor protection." /><dd>{election.label}<small>{election.reduction}</small></dd></div>
                      <div className="payable-row"><ResultTerm label="Payable FERS annuity" info="The amount after the survivor-election reduction. This is the FERS amount used in the household projection." /><dd>{usd.format(person.monthlyFersAtRetirementToday)}/mo<small>today&apos;s dollars</small></dd></div>
                      <div><ResultTerm label="Estimated supplement" info="A temporary approximation for supported retirements before age 62. The earnings test is not included." /><dd>{usd.format(person.monthlySupplementAtRetirement)}/mo<small>today&apos;s dollars</small></dd></div>
                    </dl>
                    <details className="future-values-panel fers-future-values">
                      <summary>Show future-dollar annuity calculation</summary>
                      <div className="transparency-content">
                        <div className="calculation-formula compact-calculation">
                          <div className="calculation-heading"><span>Future-dollar annuity calculation</span><div><strong>{usd.format(person.monthlyFersAtRetirement)}/month</strong><small>payable at retirement</small></div></div>
                          <div className="calculation-grid">
                            <div><span>Projected high-3</span><strong>{usd.format(person.projectedHigh3)}</strong><small>future dollars at retirement</small></div>
                            <div><span>Annuity service</span><strong>{formatService(person.serviceYears)}</strong><small>including modeled sick leave</small></div>
                            <div><span>FERS multiplier</span><strong>{(person.fersMultiplier * 100).toFixed(1)}%</strong><small>general FERS formula</small></div>
                            <div className="calculation-total"><span>Payable annuity</span><strong>{usd.format(person.monthlyFersAtRetirement)}/month</strong><small>after {election.reduction.toLowerCase()}</small></div>
                          </div>
                          <div className="calculation-equations">
                            <p>{usd.format(person.projectedHigh3)} × {person.serviceYears.toFixed(2)} years × {(person.fersMultiplier * 100).toFixed(1)}% = {usd.format(person.unreducedAnnualFers)}/year</p>
                            <p>{usd.format(person.unreducedAnnualFers)} × {100 - election.reductionRate}% ÷ 12 = {usd.format(person.monthlyFersAtRetirement)}/month payable</p>
                          </div>
                          <small className="calculation-note">These are the same annuity values before converting them into today&apos;s purchasing power.</small>
                        </div>
                      </div>
                    </details>
                  </section>
                );
              })}
            </div>
          </article>

          <article className="result-source-card social-security-results">
            <div className="result-source-heading">
              <div><p className="eyebrow">Social Security</p><h3>Claiming ages and entered benefits</h3></div>
              <p className="source-total"><strong>{usd.format(result.people[0].socialSecurityMonthlyToday + result.people[1].socialSecurityMonthlyToday)}/mo</strong><span>combined benefits used in the projection · today&apos;s dollars</span></p>
            </div>
            <div className="source-person-grid">
              {result.people.map((person, index) => {
                const input = household.people[index];
                const claimingConversionFactor = person.socialSecurityMonthlyToday > 0
                  ? input.socialSecurityMonthly / person.socialSecurityMonthlyToday
                  : 1;
                const age62ConversionFactor = person.socialSecurityAt62Today > 0
                  ? input.socialSecurityAt62 / person.socialSecurityAt62Today
                  : 1;

                return (
                  <section key={`ss-result-${index}`} className={`source-person-card person-${index + 1}`} aria-label={`${person.name} Social Security estimate`}>
                    <div className="source-person-heading"><span className="avatar">{person.name.slice(0, 1).toUpperCase()}</span><h4>{person.name}</h4></div>
                    <dl className="source-details">
                      <div><dt>Entered monthly benefit</dt><dd>{usd.format(input.socialSecurityMonthly)}<small>{socialSecurityBasisDisplay[input.socialSecurityDollarBasis]}</small></dd></div>
                      <div><dt>Benefit used in projection</dt><dd>{usd.format(person.socialSecurityMonthlyToday)}/mo<small>today&apos;s dollars</small></dd></div>
                      <div><dt>Claiming age</dt><dd>{formatClaimingAge(person.socialSecurityClaimingAgeMonths)}</dd></div>
                      <div><dt>Benefit starts</dt><dd>{displayDate(person.socialSecurityStartDate)}</dd></div>
                      <div><dt>Age-62 estimate used for supplement</dt><dd>{usd.format(person.socialSecurityAt62Today)}/mo<small>today&apos;s dollars</small></dd></div>
                    </dl>
                    {input.socialSecurityDollarBasis === "future" && (
                      <details className="future-values-panel">
                        <summary>Show today&apos;s-dollar conversion</summary>
                        <div className="transparency-content">
                          <div className="calculation-formula compact-calculation">
                            <div className="calculation-heading"><span>Benefit dollar conversion</span><div><strong>{usd.format(person.socialSecurityMonthlyToday)}/month</strong><small>today&apos;s dollars used in projection</small></div></div>
                            <div className="calculation-grid">
                              <div><span>Entered claiming benefit</span><strong>{usd.format(input.socialSecurityMonthly)}</strong><small>future dollars at {formatClaimingAge(person.socialSecurityClaimingAgeMonths)}</small></div>
                              <div><span>Claiming-date inflation factor</span><strong>{claimingConversionFactor.toFixed(3)}×</strong><small>{household.inflation}% household inflation assumption</small></div>
                              <div><span>Age-62 conversion factor</span><strong>{age62ConversionFactor.toFixed(3)}×</strong><small>used for supplement estimate</small></div>
                              <div className="calculation-total"><span>Benefit used in projection</span><strong>{usd.format(person.socialSecurityMonthlyToday)}/month</strong><small>today&apos;s dollars</small></div>
                            </div>
                            <div className="calculation-equations"><p>{usd.format(input.socialSecurityMonthly)} ÷ {claimingConversionFactor.toFixed(3)} = {usd.format(person.socialSecurityMonthlyToday)}/month in today&apos;s dollars</p></div>
                            <small className="calculation-note">The age-62 estimate is converted separately through the month the person reaches age 62. These conversions prevent future-dollar estimates from being combined directly with today-dollar spending.</small>
                          </div>
                        </div>
                      </details>
                    )}
                  </section>
                );
              })}
            </div>
          </article>

          <article className="result-source-card portfolio-results">
            <div className="result-source-heading">
              <div><p className="eyebrow">Portfolio plan</p><h3>Withdrawals, survivor target, and ending balance</h3></div>
              <p className="source-total"><strong>{usd.format(result.portfolioDrawAtBothRetired)}/mo</strong><span>portfolio contribution at the both-retired date</span></p>
            </div>
            <div className="portfolio-result-grid">
              <div><span>Target ending portfolio</span><strong>{usd.format(household.legacyTarget)}</strong><small>today&apos;s dollars</small></div>
              <div><span>Projected ending portfolio</span><strong>{usd.format(result.endingPortfolio)}</strong><small>today&apos;s dollars</small></div>
              <div><span>Portfolio draw after both claim Social Security</span><strong>{usd.format(result.portfolioDrawAfterBothSocialSecurity)}/mo</strong><small>today&apos;s dollars</small></div>
              <div><span>Survivor spending target</span><strong>{usd.format(result.survivorMonthlyTarget)}/mo</strong><small>{household.survivorSpendingPercent}% of the joint amount</small></div>
            </div>
            <details className="future-values-panel portfolio-method-panel">
              <summary>Show how sustainable monthly income is solved</summary>
              <div className="transparency-content">
                <div className="calculation-formula compact-calculation">
                  <div className="calculation-heading"><span>Monthly household income at both-retired date</span><div><strong>{usd.format(result.sustainableGrossMonthlyIncome)}/month</strong><small>today&apos;s dollars</small></div></div>
                  <div className="calculation-grid">
                    <div><span>Starting retirement portfolio</span><strong>{usd.format(result.projectedPortfolioAtBothRetiredToday)}</strong><small>today&apos;s dollars when both are retired</small></div>
                    <div><span>Fixed monthly income</span><strong>{usd.format(result.fixedIncomeAtBothRetired)}</strong><small>FERS, supplement, and active Social Security</small></div>
                    <div><span>Monthly portfolio draw</span><strong>{usd.format(result.portfolioDrawAtBothRetired)}</strong><small>fills the gap at the both-retired date</small></div>
                    <div className="calculation-total"><span>Sustainable gross income</span><strong>{usd.format(result.sustainableGrossMonthlyIncome)}/month</strong><small>before taxes and insurance deductions</small></div>
                  </div>
                  <div className="calculation-equations"><p>{usd.format(result.fixedIncomeAtBothRetired)} fixed income + {usd.format(result.portfolioDrawAtBothRetired)} portfolio draw = {usd.format(result.sustainableGrossMonthlyIncome)}/month</p></div>
                  <small className="calculation-note">The engine searches for the highest level monthly amount that lasts through both planning horizons while preserving the {usd.format(household.legacyTarget)} ending-portfolio target. It models a {realPostRetirementReturn.toFixed(2)}% real annual return ({household.postRetirementReturn}% return adjusted for {household.inflation}% inflation) and reduces the target to {household.survivorSpendingPercent}% after the first planning horizon.</small>
                </div>
              </div>
            </details>
          </article>
        </div>
      </section>

      <section className="warnings-section">
        <div><p className="eyebrow">Know the boundaries</p><h2>Important calculation notes</h2></div>
        <ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        <p>The calculator supports regular FERS unreduced immediate retirement only. It uses monthly estimates and projected assumptions; confirm retirement service, high-3, sick leave, supplement, and survivor elections with your agency and OPM.</p>
      </section>

      <footer>
        <p>Rule baseline: 2026 · Built for planning, not benefit adjudication.</p>
        <nav aria-label="Official calculation sources">
          <a href="https://www.opm.gov/retirement-center/fers-information/computation/" target="_blank" rel="noreferrer">OPM FERS computation</a>
          <a href="https://www.opm.gov/retirement-center/fers-information/eligibility/" target="_blank" rel="noreferrer">OPM eligibility</a>
          <a href="https://www.tsp.gov/making-contributions/contribution-types/" target="_blank" rel="noreferrer">TSP contributions</a>
          <a href="https://www.ssa.gov/prepare/get-benefits-estimate" target="_blank" rel="noreferrer">SSA benefit estimates</a>
          <a href="https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500" target="_blank" rel="noreferrer">IRS 2026 limits</a>
        </nav>
      </footer>
    </main>
  );
}
