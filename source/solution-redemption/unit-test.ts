import { afterEach, beforeEach, expect, test } from "vitest";
import { createMemoryDatabase } from "@sharadox/database-web-library/memory-database";
import type { MemoryDatabase } from "@sharadox/database-web-library/memory-database/type";
import { createChallenge } from "@sharadox/protection-web-library/proof-of-work";
import { solveChallenge } from "@sharadox/protection-web-library/proof-of-work-solver";
import type { ProtectionDatabase } from "@sharadox/protection-web-library/protection-database/type";
import { migrateProtection } from "@sharadox/protection-web-library/protection-migration";
import { redeemSolution } from "@sharadox/protection-web-library/solution-redemption";

const secret = "a-secret-of-at-least-thirty-two-characters";
let memory: MemoryDatabase<ProtectionDatabase>;
beforeEach(async () => {
  memory = await createMemoryDatabase<ProtectionDatabase>();
  await migrateProtection(memory.database);
});
afterEach(() => memory.close());

test("a valid solution counts once", async () => {
  const challenge = createChallenge({ secret, difficulty: 4, now: 1_000 });
  const solution = { challenge, nonce: await solveChallenge(challenge) };
  expect(await redeemSolution(memory.database, solution, { secret, now: 2_000 })).toEqual({
    valid: true,
    id: challenge.id,
  });
  expect(await redeemSolution(memory.database, solution, { secret, now: 2_000 })).toEqual({
    valid: false,
    reason: "used",
  });
  const [row] = await memory.database.selectFrom("used_challenge").selectAll().execute();
  expect(row).toEqual({ id: challenge.id, expires_at: new Date(challenge.expiresAt) });
});

test("an invalid solution is refused without being stored", async () => {
  const challenge = createChallenge({ secret, difficulty: 4, now: 1_000 });
  const solution = { challenge, nonce: await solveChallenge(challenge) };
  expect(await redeemSolution(memory.database, solution, { secret, now: 1_000_000 })).toEqual({
    valid: false,
    reason: "expired",
  });
  expect(await memory.database.selectFrom("used_challenge").selectAll().execute()).toEqual([]);
});

test("uses the current time by default", async () => {
  const challenge = createChallenge({ secret, difficulty: 2 });
  expect(
    await redeemSolution(memory.database, { challenge, nonce: await solveChallenge(challenge) }, { secret }),
  ).toMatchObject({
    valid: true,
  });
});
