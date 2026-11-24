import { sql } from "kysely";
import { afterEach, beforeEach, expect, test } from "vitest";
import { createMemoryDatabase } from "@sharadox/database-web-library/memory-database";
import type { MemoryDatabase } from "@sharadox/database-web-library/memory-database/type";
import type { ProtectionDatabase } from "@sharadox/protection-web-library/protection-database/type";
import { migrateProtection } from "@sharadox/protection-web-library/protection-migration";
import { limitRate } from "@sharadox/protection-web-library/rate-limit";

const secret = "a-secret-of-at-least-thirty-two-characters";
const perContact = { capacity: 2, refillPerSecond: 1 / 60 };
const perAddress = { capacity: 3, refillPerSecond: 1 / 60 };

let memory: MemoryDatabase<ProtectionDatabase>;
beforeEach(async () => {
  memory = await createMemoryDatabase<ProtectionDatabase>();
  await migrateProtection(memory.database);
});
afterEach(() => memory.close());

const layers = (contact: string, address = "203.0.113.7") => [
  { key: `contact:${contact}`, rule: perContact },
  { key: `address:${address}`, rule: perAddress },
];

test("allows up to each layer's capacity, then says which layer blocked and how long to wait", async () => {
  const now = 1_000_000;
  const results = [];
  for (let i = 0; i < 3; i++) results.push(await limitRate(memory.database, layers("a@example.com"), { secret, now }));
  expect(results.map(({ allowed }) => allowed)).toEqual([true, true, false]);
  expect(results[2]).toEqual({ allowed: false, retryAfterSeconds: 60, blockedBy: ["contact:a@example.com"] });
});

test("an action blocked by one layer takes nothing from the others", async () => {
  const now = 1_000_000;
  await limitRate(memory.database, layers("a@example.com"), { secret, now });
  await limitRate(memory.database, layers("a@example.com"), { secret, now });
  await limitRate(memory.database, layers("a@example.com"), { secret, now }); // blocked by the contact
  // The address still has 1 token left: a different contact from it gets through once.
  expect((await limitRate(memory.database, layers("b@example.com"), { secret, now })).allowed).toBe(true);
  const last = await limitRate(memory.database, layers("c@example.com"), { secret, now });
  expect(last).toEqual({ allowed: false, retryAfterSeconds: 60, blockedBy: ["address:203.0.113.7"] });
});

test("reports every layer that blocked and the longest wait", async () => {
  const tight = [
    { key: "one", rule: { capacity: 1, refillPerSecond: 1 / 10 } },
    { key: "two", rule: { capacity: 1, refillPerSecond: 1 / 100 } },
  ];
  await limitRate(memory.database, tight, { secret, now: 0 });
  expect(await limitRate(memory.database, tight, { secret, now: 0 })).toEqual({
    allowed: false,
    retryAfterSeconds: 100,
    blockedBy: ["one", "two"],
  });
});

test("tokens come back with time", async () => {
  const now = 1_000_000;
  await limitRate(memory.database, layers("a@example.com"), { secret, now });
  await limitRate(memory.database, layers("a@example.com"), { secret, now });
  expect((await limitRate(memory.database, layers("a@example.com"), { secret, now })).allowed).toBe(false);
  expect((await limitRate(memory.database, layers("a@example.com"), { secret, now: now + 60_000 })).allowed).toBe(true);
});

test("an action can cost more than one token", async () => {
  const layer = [{ key: "bulk", rule: { capacity: 5, refillPerSecond: 1 }, cost: 4 }];
  expect((await limitRate(memory.database, layer, { secret, now: 0 })).allowed).toBe(true);
  expect(await limitRate(memory.database, layer, { secret, now: 0 })).toEqual({
    allowed: false,
    retryAfterSeconds: 3,
    blockedBy: ["bulk"],
  });
});

test("stores only keyed hashes, never the contact or address itself", async () => {
  await limitRate(memory.database, layers("a@example.com"), { secret, now: 0 });
  const keys = (await memory.database.selectFrom("rate_limit_bucket").select("key").execute()).map(({ key }) => key);
  expect(keys).toHaveLength(2);
  for (const key of keys) {
    expect(key).toMatch(/^[\w-]{43}$/);
    expect(key).not.toContain("example");
  }
});

test("uses the current time when none is given", async () => {
  expect((await limitRate(memory.database, layers("a@example.com"), { secret })).allowed).toBe(true);
  const [row] = await memory.database.selectFrom("rate_limit_bucket").select("updated_at").execute();
  expect(Math.abs(row!.updated_at.getTime() - Date.now())).toBeLessThan(10_000);
});

test("holds under concurrent requests: never more than the capacity", async () => {
  const layer = [{ key: "busy", rule: { capacity: 3, refillPerSecond: 1 / 3600 } }];
  const results = await Promise.all(
    Array.from({ length: 10 }, () => limitRate(memory.database, layer, { secret, now: 0 })),
  );
  expect(results.filter(({ allowed }) => allowed)).toHaveLength(3);
});

test("allows everything when there are no layers", async () => {
  expect(await limitRate(memory.database, [], { secret })).toEqual({
    allowed: true,
    retryAfterSeconds: 0,
    blockedBy: [],
  });
  expect(await sql`select count(*)::int as n from rate_limit_bucket`.execute(memory.database)).toMatchObject({
    rows: [{ n: 0 }],
  });
});

test("refuses a short secret and the same key twice", async () => {
  await expect(limitRate(memory.database, layers("a"), { secret: "short" })).rejects.toThrow(
    "the secret must be at least 32 characters",
  );
  const twice = [layers("a")[0]!, layers("a")[0]!];
  await expect(limitRate(memory.database, twice, { secret })).rejects.toThrow('the key "contact:a" appears twice');
});
