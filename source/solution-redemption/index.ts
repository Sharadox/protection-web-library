import type { Kysely } from "kysely";
import type { Solution, VerifySolutionOptions } from "@sharadox/protection-web-library/proof-of-work/type";
import { verifySolution } from "@sharadox/protection-web-library/proof-of-work";
import type { ProtectionDatabase } from "@sharadox/protection-web-library/protection-database/type";

/**
 * Checks a proof-of-work solution and spends it: a valid one counts once (its challenge id is kept until the
 * challenge expires), so one solved challenge can't be replayed. Nothing is stored for invalid solutions.
 *
 * @example
 * const verification = await redeemSolution(database, solution, { secret: process.env.PROOF_OF_WORK_SECRET! });
 * if (!verification.valid) return refuse(verification.reason);
 */
export async function redeemSolution(
  database: Kysely<ProtectionDatabase>,
  solution: Solution,
  options: VerifySolutionOptions,
): Promise<{ valid: true; id: string } | { valid: false; reason: "signature" | "expired" | "work" | "used" }> {
  const verification = verifySolution(solution, options);
  if (!verification.valid) return verification;
  const stored = await database
    .insertInto("used_challenge")
    .values({ id: verification.id, expires_at: new Date(solution.challenge.expiresAt) })
    .onConflict((conflict) => conflict.column("id").doNothing())
    .returning("id")
    .executeTakeFirst();
  return stored ? verification : { valid: false, reason: "used" };
}
