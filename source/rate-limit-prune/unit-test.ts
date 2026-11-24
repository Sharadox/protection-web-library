import { afterEach, beforeEach, expect, test } from "vitest";
import { createMemoryDatabase } from "@sharadox/database-web-library/memory-database";
import type { MemoryDatabase } from "@sharadox/database-web-library/memory-database/type";
import type { ProtectionDatabase } from "@sharadox/protection-web-library/protection-database/type";
import { migrateProtection } from "@sharadox/protection-web-library/protection-migration";
import { limitRate } from "@sharadox/protection-web-library/rate-limit";
import { pruneRateLimits } from "@sharadox/protection-web-library/rate-limit-prune";

const secret = "a-secret-of-at-least-thirty-two-characters";
const rule = { capacity: 1, refillPerSecond: 1 };

let memory: MemoryDatabase<ProtectionDatabase>;
beforeEach(async () => {
  memory = await createMemoryDatabase<ProtectionDatabase>();
  await migrateProtection(memory.database);
});
afterEach(() => memory.close());

test("deletes the buckets untouched since before the given time and says how many", async () => {
  await limitRate(memory.database, [{ key: "old", rule }], { secret, now: 1_000 });
  await limitRate(memory.database, [{ key: "new", rule }], { secret, now: 5_000 });
  expect(await pruneRateLimits(memory.database, { before: new Date(2_000) })).toBe(1);
  expect(await memory.database.selectFrom("rate_limit_bucket").select("updated_at").execute()).toEqual([
    { updated_at: new Date(5_000) },
  ]);
});
