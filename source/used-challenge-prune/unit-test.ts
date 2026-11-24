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
      { id: "0198f5a2-7a4c-7000-8000-000000000001", expires_at: new Date(1_000) },
      { id: "0198f5a2-7a4c-7000-8000-000000000002", expires_at: new Date(9_000) },
    ])
    .execute();
  expect(await pruneUsedChallenges(memory.database, { now: 5_000 })).toBe(1);
  expect(await memory.database.selectFrom("used_challenge").select("id").execute()).toEqual([
    { id: "0198f5a2-7a4c-7000-8000-000000000002" },
  ]);
  expect(await pruneUsedChallenges(memory.database)).toBe(1);
});
