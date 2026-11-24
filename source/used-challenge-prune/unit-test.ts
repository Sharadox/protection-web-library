import { afterEach, beforeEach, expect, test } from "vitest";
import { createMemoryDatabase } from "@sharadox/database-web-library/memory-database";
import type { MemoryDatabase } from "@sharadox/database-web-library/memory-database/type";
import type { ProtectionDatabase } from "@sharadox/protection-web-library/protection-database/type";
import { migrateProtection } from "@sharadox/protection-web-library/protection-migration";
import { pruneUsedChallenges } from "@sharadox/protection-web-library/used-challenge-prune";

let memory: MemoryDatabase<ProtectionDatabase>;
beforeEach(async () => {
  memory = await createMemoryDatabase<ProtectionDatabase>();
  await migrateProtection(memory.database);
});
afterEach(() => memory.close());

test("forgets used challenges once they have expired", async () => {
  await memory.database
    .insertInto("used_challenge")
    .values([
      { id: "old", expires_at: new Date(1_000) },
      { id: "new", expires_at: new Date(9_000) },
    ])
    .execute();
  expect(await pruneUsedChallenges(memory.database, { now: 5_000 })).toBe(1);
  expect(await memory.database.selectFrom("used_challenge").select("id").execute()).toEqual([{ id: "new" }]);
  expect(await pruneUsedChallenges(memory.database)).toBe(1);
});
