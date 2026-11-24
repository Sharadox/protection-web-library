import { createHmac } from "node:crypto";
import type { Kysely } from "kysely";
import type { ProtectionDatabase } from "@sharadox/protection-web-library/protection-database/type";
import type {
  RateLimitLayer,
  RateLimitOptions,
  RateLimitResult,
} from "@sharadox/protection-web-library/rate-limit/type";
import { takeToken } from "@sharadox/protection-web-library/token-bucket";

/**
 * Layered rate limiting in Postgres: the action goes ahead only when every layer (per contact, per address group,
 * per account, global…) has the tokens for it, and then it takes them from all of them at once; a blocked action
 * takes nothing. One transaction with the rows locked in a fixed order, so concurrent requests never exceed a
 * capacity and never deadlock. Keys are stored as HMACs, so the table holds no contacts or addresses.
 *
 * @example
 * const result = await limitRate(database, [
 *   { key: `contact:${email}`, rule: { capacity: 5, refillPerSecond: 1 / 600 } },
 *   { key: `address:${addressGroup(ip)}`, rule: { capacity: 20, refillPerSecond: 1 / 60 } },
 * ], { secret: process.env.PROTECTION_SECRET! });
 * if (!result.allowed) return tooManyRequests(result.retryAfterSeconds);
 */
export async function limitRate(
  database: Kysely<ProtectionDatabase>,
  layers: RateLimitLayer[],
  { secret, now = Date.now() }: RateLimitOptions,
): Promise<RateLimitResult> {
  if (secret.length < 32) throw new Error("limitRate: the secret must be at least 32 characters");
  const seen = new Set<string>();
  for (const { key } of layers) {
    if (seen.has(key)) throw new Error(`limitRate: the key "${key}" appears twice`);
    seen.add(key);
  }
  if (layers.length === 0) return { allowed: true, retryAfterSeconds: 0, blockedBy: [] };
  const hashed = layers
    .map((layer) => ({ ...layer, hash: createHmac("sha256", secret).update(layer.key).digest("base64url") }))
    .sort((a, b) => (a.hash < b.hash ? -1 : 1));
  return database.transaction().execute(async (transaction) => {
    const at = new Date(now);
    await transaction
      .insertInto("rate_limit_bucket")
      .values(hashed.map(({ hash, rule }) => ({ key: hash, tokens: rule.capacity, updated_at: at })))
      .onConflict((conflict) => conflict.column("key").doNothing())
      .execute();
    const rows = await transaction
      .selectFrom("rate_limit_bucket")
      .selectAll()
      .where(
        "key",
        "in",
        hashed.map(({ hash }) => hash),
      )
      .orderBy("key")
      .forUpdate()
      .execute();
    const stored = new Map(rows.map((row) => [row.key, { tokens: row.tokens, updatedAt: row.updated_at.getTime() }]));
    const steps = hashed.map((layer) => ({
      layer,
      step: takeToken(stored.get(layer.hash), layer.rule, now, layer.cost),
    }));
    const blocked = steps.filter(({ step }) => !step.allowed);
    if (blocked.length > 0) {
      const order = layers.map(({ key }) => key);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(...blocked.map(({ step }) => step.retryAfterSeconds)),
        blockedBy: blocked.map(({ layer }) => layer.key).sort((a, b) => order.indexOf(a) - order.indexOf(b)),
      };
    }
    for (const { layer, step } of steps) {
      await transaction
        .updateTable("rate_limit_bucket")
        .set({ tokens: step.bucket.tokens, updated_at: new Date(step.bucket.updatedAt) })
        .where("key", "=", layer.hash)
        .execute();
    }
    return { allowed: true, retryAfterSeconds: 0, blockedBy: [] };
  });
}
