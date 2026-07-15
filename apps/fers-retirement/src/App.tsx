"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  calculateProjection,
  currentTspLimitFor,
  formatAge,
  type ContributionMode,
  type HouseholdInput,
  type PersonInput,
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
      name: "Alex",
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
      socialSecurityAt62: 2_800,
      socialSecurityMonthly: 4_400,
      socialSecurityStartDate: "2053-06-01",
      survivorElection: "full",
      planningAge: 95,
    },
    {
      name: "Jordan",
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
      socialSecurityAt62: 3_000,
      socialSecurityMonthly: 4_650,
      socialSecurityStartDate: "2054-10-01",
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

const survivorElectionDisplay: Record<SurvivorElection, { label: string; reduction: string }> = {
  full: { label: "Full survivor benefit", reduction: "10% annuity reduction" },
  partial: { label: "Partial survivor benefit", reduction: "5% annuity reduction" },
  none: { label: "No survivor benefit", reduction: "No annuity reduction" },
};

function displayDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
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

function Timeline({ household, result }: { household: HouseholdInput; result: ReturnType<typeof calculateProjection> }) {
  const startYear = Number(household.asOfDate.slice(0, 4));
  const endYear = Math.max(...result.people.map((person) => Number(person.planningDate.slice(0, 4))));
  const span = endYear - startYear;
  const position = (date: string) => `${Math.min(100, Math.max(0, ((Number(date.slice(0, 4)) - startYear) / span) * 100))}%`;

  return (
    <div className="timeline" aria-label="Household retirement timeline">
      <div className="phase-row" aria-hidden="true">
        <span className="phase working">Both working</span>
        <span className="phase mixed">One retired</span>
        <span className="phase retired">Both retired</span>
      </div>
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

function PersonEditor({ person, index, onChange, asOfYear }: { person: PersonInput; index: number; onChange: (person: PersonInput) => void; asOfYear: number }) {
  const update = <K extends keyof PersonInput>(key: K, value: PersonInput[K]) => onChange({ ...person, [key]: value });
  const accent = index === 0 ? "blue" : "green";
  return (
    <article className={`person-editor ${accent}`}>
      <div className="person-editor-title">
        <span className="avatar">{person.name.slice(0, 1).toUpperCase()}</span>
        <label className="name-field">
          <span>Person {index + 1}</span>
          <input value={person.name} onChange={(event) => update("name", event.target.value)} />
        </label>
      </div>

      <details open>
        <summary>Career and FERS</summary>
        <div className="field-grid">
          <DateField label="Date of birth" value={person.birthDate} onChange={(value) => update("birthDate", value)} info="Used to determine retirement age, the applicable minimum retirement age, TSP catch-up limits, and the planning horizon." />
          <DateField label="Retirement SCD" value={person.serviceDate} onChange={(value) => update("serviceDate", value)} info="Enter the retirement service computation date shown in your federal records. It may differ from your original hire date because of breaks or prior service." />
          <DateField label="Planned retirement" value={person.retirementDate} onChange={(value) => update("retirementDate", value)} info="The planned retirement date used to calculate age, creditable service, projected high-3, and the end of TSP contributions." />
          <NumberField label="Current basic salary" value={person.currentSalary} prefix="$" step={1000} onChange={(value) => update("currentSalary", value)} info="Enter annual basic pay. Do not include bonuses or overtime unless they are part of basic pay for retirement purposes." />
          <NumberField label="Annual salary growth" value={person.salaryGrowth} suffix="%" step={0.1} onChange={(value) => update("salaryGrowth", value)} info="The assumed average yearly increase in basic salary before retirement. This is used to project salary and high-3 values." />
          <NumberField label="Current high-3 estimate" value={person.currentHigh3} prefix="$" step={1000} onChange={(value) => update("currentHigh3", value)} info="Your current estimate of the highest average basic pay earned during any three consecutive years of creditable service." />
          <NumberField label="Projected high-3 override" value={person.projectedHigh3Override} prefix="$" step={1000} onChange={(value) => update("projectedHigh3Override", value)} info="Enter an official or independently calculated high-3 at retirement. Leave this at $0 to let the calculator project the current high-3 using salary growth." />
          <NumberField label="Unused sick leave at retirement" value={person.sickLeaveHours} suffix="hours" step={8} onChange={(value) => update("sickLeaveHours", value)} info="Expected unused sick-leave hours at retirement. Release 0.1 converts these approximately into additional service for the annuity calculation." />
          <div className="field">
            <FieldLabel htmlFor={`survivor-election-${index}`} label="Survivor annuity election" info="Full and partial elections reduce your payable FERS annuity in exchange for a survivor benefit. Release 0.1 models full as a 10% reduction and partial as a 5% reduction." />
            <select id={`survivor-election-${index}`} value={person.survivorElection} onChange={(event) => update("survivorElection", event.target.value as SurvivorElection)}>
              <option value="full">Full survivor benefit</option>
              <option value="partial">Partial survivor benefit</option>
              <option value="none">No survivor benefit</option>
            </select>
          </div>
        </div>
      </details>

      <details>
        <summary>TSP and contributions</summary>
        <div className="field-grid">
          <NumberField label="Traditional TSP balance" value={person.traditionalTsp} prefix="$" step={1000} onChange={(value) => update("traditionalTsp", value)} info="Enter the current Traditional balance from your latest TSP statement. Agency contributions are also projected into this balance." />
          <NumberField label="Roth TSP balance" value={person.rothTsp} prefix="$" step={1000} onChange={(value) => update("rothTsp", value)} info="Enter the current Roth balance from your latest TSP statement. Keep this separate from the Traditional balance for future tax modeling." />
          <div className="field">
            <FieldLabel htmlFor={`contribution-strategy-${index}`} label="Contribution strategy" info="Choose whether future employee contributions follow the projected annual limit, a fixed annual dollar amount, or a percentage of salary." />
            <select id={`contribution-strategy-${index}`} value={person.contributionMode} onChange={(event) => update("contributionMode", event.target.value as ContributionMode)}>
              <option value="maximum">Annual maximum</option>
              <option value="annual">Fixed annual amount</option>
              <option value="percent">Percent of salary</option>
            </select>
            {person.contributionMode === "maximum" && <small>{usd.format(currentTspLimitFor(person, asOfYear))} under 2026 age-based limits</small>}
          </div>
          {person.contributionMode === "annual" && <NumberField label="Annual employee contribution" value={person.annualContribution} prefix="$" step={500} onChange={(value) => update("annualContribution", value)} info="Your total employee TSP contribution for the year, excluding Agency Automatic and matching contributions." />}
          {person.contributionMode === "percent" && <NumberField label="Employee contribution" value={person.contributionPercent} suffix="% of salary" step={0.5} onChange={(value) => update("contributionPercent", value)} info="The percentage of basic salary you contribute to TSP. The calculator also estimates applicable agency contributions." />}
          <NumberField label="Employee contribution to Roth" value={person.rothContributionPercent} suffix="%" step={5} onChange={(value) => update("rothContributionPercent", value)} info="The percentage of your employee contribution directed to Roth TSP. The remainder and all agency contributions go to Traditional TSP." />
          <NumberField label="Pre-retirement return" value={person.preRetirementReturn} suffix="%" step={0.1} onChange={(value) => update("preRetirementReturn", value)} info="The assumed average annual investment return for this person’s TSP before retirement. This is a planning assumption, not a guarantee." />
        </div>
      </details>

      <details>
        <summary>Social Security and planning horizon</summary>
        <div className="field-grid">
          <NumberField label="SSA estimate at age 62" value={person.socialSecurityAt62} prefix="$" suffix="/month" step={50} onChange={(value) => update("socialSecurityAt62", value)} info="Enter the monthly age-62 estimate from Social Security. Release 0.1 uses this only for its approximate FERS annuity supplement." />
          <NumberField label="SSA benefit at chosen claiming age" value={person.socialSecurityMonthly} prefix="$" suffix="/month" step={50} onChange={(value) => update("socialSecurityMonthly", value)} info="Enter the monthly benefit estimate from SSA for the age at which you plan to claim. The calculator does not derive this amount from earnings history." />
          <DateField label="Social Security start" value={person.socialSecurityStartDate} onChange={(value) => update("socialSecurityStartDate", value)} info="The month you expect this Social Security benefit to begin. It may be different for each person." />
          <NumberField label="Planning age" value={person.planningAge} suffix="years" step={1} min={70} onChange={(value) => update("planningAge", value)} info="The age through which this scenario should plan. It is a modeling horizon, not a prediction of lifespan." />
        </div>
      </details>
    </article>
  );
}

export default function App() {
  const [household, setHousehold] = useState<HouseholdInput>(sampleHousehold);
  const setupRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as HouseholdInput;
        queueMicrotask(() => setHousehold(parsed));
      } catch { /* retain sample */ }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(household));
  }, [household]);

  const result = useMemo(() => calculateProjection(household), [household]);
  const updatePerson = (index: number, person: PersonInput) => {
    const people = [...household.people] as [PersonInput, PersonInput];
    people[index] = person;
    setHousehold({ ...household, people });
  };
  const updateHousehold = <K extends keyof HouseholdInput>(key: K, value: HouseholdInput[K]) => setHousehold({ ...household, [key]: value });

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
            <div><span>FERS + supplement at retirement, today&apos;s dollars</span><strong>{usd.format(result.fixedIncomeAtBothRetired)}</strong></div>
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
          <p>Update both careers, TSP balances, Social Security dates, and the amount you want to leave at the end.</p>
          <button className="primary-button" onClick={() => setupRef.current?.scrollIntoView({ behavior: "smooth" })}>Edit your household <span>↓</span></button>
          <button className="secondary-button" onClick={() => setHousehold(structuredClone(sampleHousehold))}>Reload sample household</button>
        </aside>
      </section>

      <section className="setup-section" ref={setupRef}>
        <div className="setup-heading">
          <div><p className="eyebrow">Household inputs</p><h2>Build your two-person projection</h2></div>
          <p>Changes recalculate immediately and save only in this browser.</p>
        </div>
        <div className="person-grid">
          <PersonEditor person={household.people[0]} index={0} onChange={(person) => updatePerson(0, person)} asOfYear={Number(household.asOfDate.slice(0, 4))} />
          <PersonEditor person={household.people[1]} index={1} onChange={(person) => updatePerson(1, person)} asOfYear={Number(household.asOfDate.slice(0, 4))} />
        </div>

        <article className="household-editor">
          <div><p className="eyebrow">Shared assumptions</p><h3>Household and market assumptions</h3></div>
          <div className="field-grid household-fields">
            <DateField label="Projection as-of date" value={household.asOfDate} onChange={(value) => updateHousehold("asOfDate", value)} info="The date on which the entered salaries, balances, and assumptions apply. Projections begin from this date." />
            <NumberField label="Inflation" value={household.inflation} suffix="%" step={0.1} onChange={(value) => updateHousehold("inflation", value)} info="The assumed average annual increase in prices. It is used to convert future values into today’s dollars." />
            <NumberField label="Post-retirement return" value={household.postRetirementReturn} suffix="%" step={0.1} onChange={(value) => updateHousehold("postRetirementReturn", value)} info="The assumed average annual investment return after both people retire. This is a planning assumption, not a guarantee." />
            <NumberField label="Future TSP-limit growth" value={household.contributionLimitGrowth} suffix="%" step={0.1} onChange={(value) => updateHousehold("contributionLimitGrowth", value)} info="A scenario assumption for increases in future TSP contribution limits. Future limits are unknown and these projections are not official IRS limits." />
            <NumberField label="Other savings balance" value={household.otherSavings} prefix="$" step={1000} onChange={(value) => updateHousehold("otherSavings", value)} info="Current retirement savings outside either person’s TSP that you want included in the household projection." />
            <NumberField label="Annual other savings" value={household.otherAnnualContribution} prefix="$" step={1000} onChange={(value) => updateHousehold("otherAnnualContribution", value)} info="The total amount the household expects to add to other savings each year before both people retire." />
            <NumberField label="Other-savings return" value={household.otherSavingsReturn} suffix="%" step={0.1} onChange={(value) => updateHousehold("otherSavingsReturn", value)} info="The assumed average annual return on the other-savings balance before both people retire." />
            <NumberField label="Target ending portfolio" value={household.legacyTarget} prefix="$" step={50_000} onChange={(value) => updateHousehold("legacyTarget", value)} info="$0 permits full portfolio spend-down by the later planning horizon. Any positive amount is preserved in today’s dollars." />
            <NumberField label="Survivor spending" value={household.survivorSpendingPercent} suffix="% of joint amount" step={5} onChange={(value) => updateHousehold("survivorSpendingPercent", value)} info="The percentage of joint household income the surviving person is assumed to need after the first planning horizon ends." />
          </div>
        </article>
      </section>

      <section className="detail-section">
        <div className="setup-heading">
          <div><p className="eyebrow">Calculation details</p><h2>FERS annuity calculations and account estimates</h2></div>
          <p>The annuity for each person is shown before and after the selected survivor-benefit reduction.</p>
        </div>
        <div className="person-results">
          {result.people.map((person, index) => {
            const election = survivorElectionDisplay[household.people[index].survivorElection];

            return (
              <article key={person.name} className={`result-person person-${index + 1}`}>
                <div className="result-person-heading"><span className="avatar">{person.name.slice(0, 1)}</span><div><h3>{person.name}</h3><p>{person.eligibilityMessage}</p></div></div>

                <section className="fers-result" aria-label={`${person.name} FERS annuity calculation`}>
                  <div className="fers-result-heading">
                    <div><p className="eyebrow">FERS annuity calculation</p><h4>Estimated payable annuity</h4></div>
                    <p className="fers-payable"><strong>{usd.format(person.monthlyFersAtRetirement)}</strong><span>/ month</span><small>{usd.format(person.annualFers)} per year · future dollars</small></p>
                  </div>
                  <div className="fers-formula">
                    <span>Unreduced formula used</span>
                    <strong>{usd.format(person.projectedHigh3)} × {person.serviceYears.toFixed(2)} years × {(person.fersMultiplier * 100).toFixed(1)}% = {usd.format(person.unreducedAnnualFers)}/year</strong>
                  </div>
                  <dl className="fers-details">
                    <div><ResultTerm label="Retirement age" info="Age on the planned retirement date. It helps determine eligibility and whether the 1.0% or 1.1% formula applies." /><dd>{formatAge(person.retirementAge)}</dd></div>
                    <div><ResultTerm label="Creditable service" info="Service from the entered retirement SCD through the planned retirement date, plus the Release 0.1 sick-leave approximation used in the annuity calculation." /><dd>{person.serviceYears.toFixed(2)} years</dd></div>
                    <div><ResultTerm label="Projected high-3" info="The projected or overridden average basic pay used in the FERS formula. This amount is shown in future dollars." /><dd>{usd.format(person.projectedHigh3)}</dd></div>
                    <div><ResultTerm label="Formula multiplier" info="1.0% generally applies; 1.1% applies at age 62 or later with at least 20 years of service." /><dd>{(person.fersMultiplier * 100).toFixed(1)}%</dd></div>
                    <div><ResultTerm label="Unreduced FERS annuity" info="The estimated annuity before the selected survivor-benefit reduction and before taxes, insurance, or other deductions." /><dd>{usd.format(person.unreducedAnnualFers / 12)}/mo</dd></div>
                    <div><ResultTerm label="Survivor election adjustment" info="The selected survivor benefit reduces the employee’s payable annuity while providing the modeled survivor protection." /><dd>{election.label}<small>{election.reduction}</small></dd></div>
                    <div className="payable-row"><ResultTerm label="Payable FERS after survivor election" info="The estimated monthly FERS annuity after the full, partial, or no-survivor election reduction. This is the amount used in the household projection." /><dd>{usd.format(person.monthlyFersAtRetirement)}/mo</dd></div>
                    <div><ResultTerm label="Estimated FERS supplement" info="A temporary, approximate benefit for supported retirements before age 62, based on the entered age-62 Social Security estimate. The earnings test is not included." /><dd>{usd.format(person.monthlySupplementAtRetirement)}/mo<small>today&apos;s dollars</small></dd></div>
                  </dl>
                </section>

                <section className="account-results" aria-label={`${person.name} TSP projection`}>
                  <p className="result-section-label">TSP projection at the both-retired date</p>
                  <dl className="account-details">
                    <div><dt>Traditional TSP · future dollars</dt><dd>{usd.format(person.projectedTraditionalTsp)}</dd></div>
                    <div><dt>Roth TSP · future dollars</dt><dd>{usd.format(person.projectedRothTsp)}</dd></div>
                  </dl>
                </section>
              </article>
            );
          })}
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
          <a href="https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500" target="_blank" rel="noreferrer">IRS 2026 limits</a>
        </nav>
      </footer>
    </main>
  );
}
