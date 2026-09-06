import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeStoredHousehold,
  sampleHousehold,
  readSavedHousehold,
  saveHousehold,
  STORAGE_KEY,
} from "../src/lib/household.ts";

function memory(raw: string | null = null) {
  return {
    raw,
    writes: 0,
    getItem() {
      return this.raw;
    },
    setItem(_key: string, value: string) {
      this.writes++;
      this.raw = value;
    },
  };
}

test("load preserves a saved household without first writing sample inputs", () => {
  const input = structuredClone(sampleHousehold);
  input.people[0].name = "Saved person";
  const store = memory(JSON.stringify(input));
  const loaded = readSavedHousehold(() => store);
  assert.equal(loaded.household.people[0].name, "Saved person");
  assert.equal(store.writes, 0);
  assert.equal(loaded.protectedData, false);
});

test("bad saved fields and blocked reads protect the original saved copy", () => {
  for (const patch of [
    { name: 123 },
    { planningAge: "invalid" },
    { contributionMode: "wrong" },
    { survivorElection: null },
    { retirementDate: "invalid" },
  ]) {
    const input = structuredClone(sampleHousehold);
    Object.assign(input.people[0], patch);
    const store = memory(JSON.stringify(input));
    const before = store.raw;
    assert.throws(() => normalizeStoredHousehold(input));
    const loaded = readSavedHousehold(() => store);
    assert.equal(loaded.protectedData, true);
    assert.match(
      saveHousehold(sampleHousehold, () => store, loaded.protectedData),
      /preserved/,
    );
    assert.equal(store.raw, before);
    assert.equal(store.writes, 0);
  }
  const loaded = readSavedHousehold(() => {
    throw new Error("SecurityError");
  });
  assert.equal(loaded.protectedData, true);
});

test("failed writes return a useful status and preserve the current input object", () => {
  const household = structuredClone(sampleHousehold);
  household.people[0].name = "Unsaved person";
  const status = saveHousehold(household, () => ({
    getItem: () => null,
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
  }));
  assert.match(status, /Saving failed/);
  assert.equal(household.people[0].name, "Unsaved person");
});

test("legacy claiming dates migrate without modifying other household inputs", () => {
  const input = structuredClone(sampleHousehold) as any;
  for (const person of input.people) {
    delete person.socialSecurityClaimingAgeMonths;
    person.socialSecurityStartDate = `${Number(person.birthDate.slice(0, 4)) + 67}-${person.birthDate.slice(5, 7)}-01`;
  }
  const result = normalizeStoredHousehold(input);
  assert.equal(result.people[0].socialSecurityClaimingAgeMonths, 67 * 12);
  assert.equal(result.people[1].socialSecurityClaimingAgeMonths, 67 * 12);
  assert.equal(
    result.people[0].traditionalTsp,
    sampleHousehold.people[0].traditionalTsp,
  );
  assert.equal(STORAGE_KEY, "dual-fers-retirement-planner-v01");
});
