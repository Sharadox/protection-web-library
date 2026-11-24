import { afterEach, beforeEach, expect, test } from "vitest";
import { createMemoryDatabase } from "@sharadox/database-web-library/memory-database";
import type { MemoryDatabase } from "@sharadox/database-web-library/memory-database/type";
import type { ProtectionDatabase } from "@sharadox/protection-web-library/protection-database/type";
import { migrateProtection } from "@sharadox/protection-web-library/protection-migration";
import { spendFromCap } from "@sharadox/protection-web-library/spending-cap";

let memory: MemoryDatabase<ProtectionDatabase>;
beforeEach(async () => {
  memory = await createMemoryDatabase<ProtectionDatabase>();
  await migrateProtection(memory.database);
});
afterEach(() => memory.close());

const daily = { name: "email-send", limit: 3, period: "day" as const };
const noon = Date.UTC(2026, 10, 24, 12);

test("allows spending up to the limit in a day, then refuses until the next day (UTC)", async () => {
  const results = [];
  for (let i = 0; i < 4; i++) results.push(await spendFromCap(memory.database, daily, { now: noon }));
  expect(results.map(({ allowed }) => allowed)).toEqual([true, true, true, false]);
  expect(results[2]).toEqual({ allowed: true, used: 3, remaining: 0, resetsAt: new Date(Date.UTC(2026, 10, 25)) });
  expect(results[3]).toEqual({ allowed: false, used: 3, remaining: 0, resetsAt: new Date(Date.UTC(2026, 10, 25)) });
  const tomorrow = await spendFromCap(memory.database, daily, { now: Date.UTC(2026, 10, 25, 0, 0, 1) });
  expect(tomorrow).toMatchObject({ allowed: true, used: 1, remaining: 2 });
});

test("monthly caps reset on the first of the month", async () => {
  const monthly = { name: "sms-send", limit: 10, period: "month" as const };
  expect(await spendFromCap(memory.database, monthly, { now: noon, cost: 10 })).toEqual({
    allowed: true,
    used: 10,
    remaining: 0,
    resetsAt: new Date(Date.UTC(2026, 11, 1)),
  });
  expect((await spendFromCap(memory.database, monthly, { now: Date.UTC(2026, 10, 30, 23) })).allowed).toBe(false);
  expect((await spendFromCap(memory.database, monthly, { now: Date.UTC(2026, 11, 1) })).allowed).toBe(true);
});

test("a refused spend uses nothing, even when it costs more than the limit", async () => {
  expect(await spendFromCap(memory.database, daily, { now: noon, cost: 4 })).toEqual({
    allowed: false,
    used: 0,
    remaining: 3,
    resetsAt: new Date(Date.UTC(2026, 10, 25)),
  });
  await spendFromCap(memory.database, daily, { now: noon, cost: 2 });
  expect(await spendFromCap(memory.database, daily, { now: noon, cost: 2 })).toMatchObject({ allowed: false, used: 2 });
  expect(await spendFromCap(memory.database, daily, { now: noon, cost: 1 })).toMatchObject({ allowed: true, used: 3 });
});

test("caps are separate by name", async () => {
  await spendFromCap(memory.database, daily, { now: noon, cost: 3 });
  expect((await spendFromCap(memory.database, { ...daily, name: "other" }, { now: noon })).allowed).toBe(true);
});

test("holds under concurrent spends: never past the limit", async () => {
  const results = await Promise.all(
    Array.from({ length: 8 }, () => spendFromCap(memory.database, daily, { now: noon })),
  );
  expect(results.filter(({ allowed }) => allowed)).toHaveLength(3);
});

test("uses the current time when none is given", async () => {
  const { resetsAt } = await spendFromCap(memory.database, daily);
  expect(resetsAt.getTime()).toBeGreaterThan(Date.now());
  expect(resetsAt.getTime() - Date.now()).toBeLessThanOrEqual(86_400_000);
});

test("refuses a cost that isn't a positive whole number", async () => {
  for (const cost of [0, -1, 1.5]) {
    await expect(spendFromCap(memory.database, daily, { now: noon, cost })).rejects.toThrow(
      "the cost must be a positive whole number",
    );
  }
});
