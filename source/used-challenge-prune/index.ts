import type { Kysely } from "kysely";
import type { ProtectionDatabase } from "@sharadox/protection-web-library/protection-database/type";

/**
 * Forgets used challenges that have expired (their solutions are refused as expired anyway), from a daily job.
 * Returns how many were deleted.
 *
 * @example
 * await pruneUsedChallenges(database);
 */
export async function pruneUsedChallenges(
  database: Kysely<ProtectionDatabase>,
  { now = Date.now() }: { now?: number } = {},
): Promise<number> {
  const result = await database.deleteFrom("used_challenge").where("expires_at", "<", new Date(now)).executeTakeFirst();
  return Number(result.numDeletedRows);
}
