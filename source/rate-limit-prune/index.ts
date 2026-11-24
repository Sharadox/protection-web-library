import type { Kysely } from "kysely";
import type { ProtectionDatabase } from "@sharadox/protection-web-library/protection-database/type";

/**
 * Deletes the rate-limit buckets untouched since `before`, from a daily job. Choose `before` so every such bucket
 * would be full again (now minus the slowest layer's capacity ÷ refill): deleting a full bucket changes nothing.
 * Returns how many were deleted.
 *
 * @example
 * await pruneRateLimits(database, { before: new Date(Date.now() - 7 * 86_400_000) });
 */
export async function pruneRateLimits(
  database: Kysely<ProtectionDatabase>,
  { before }: { before: Date },
): Promise<number> {
  const result = await database.deleteFrom("rate_limit_bucket").where("updated_at", "<", before).executeTakeFirst();
  return Number(result.numDeletedRows);
}
