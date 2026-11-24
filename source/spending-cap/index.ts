import { sql, type Kysely } from "kysely";
import type { ProtectionDatabase } from "@sharadox/protection-web-library/protection-database/type";
import type { SpendingCap, SpendOptions, SpendResult } from "@sharadox/protection-web-library/spending-cap/type";

/**
 * Spends from a hard cap before doing something that costs money, so an attack can never run up the bill: past the
 * limit it refuses (pause and alert; never spend). One atomic statement, so concurrent spends never pass the limit,
 * and a refused spend uses nothing.
 *
 * @example
 * const { allowed } = await spendFromCap(database, { name: "email-send", limit: 2_000, period: "day" });
 * if (!allowed) return pauseSending();
 */
export async function spendFromCap(
  database: Kysely<ProtectionDatabase>,
  { name, limit, period }: SpendingCap,
  { now = Date.now(), cost = 1 }: SpendOptions = {},
): Promise<SpendResult> {
  if (!Number.isInteger(cost) || cost < 1) throw new Error("spendFromCap: the cost must be a positive whole number");
  const date = new Date(now);
  const [year, month, day] = [date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()];
  const periodStart = new Date(period === "day" ? Date.UTC(year, month, day) : Date.UTC(year, month, 1));
  const resetsAt = new Date(period === "day" ? Date.UTC(year, month, day + 1) : Date.UTC(year, month + 1, 1));
  if (cost <= limit) {
    const added = sql<number>`spending_cap_usage.used + ${cost}`;
    const spent = await database
      .insertInto("spending_cap_usage")
      .values({ name, period_start: periodStart, used: cost })
      .onConflict((conflict) =>
        conflict.columns(["name", "period_start"]).doUpdateSet({ used: added }).where(added, "<=", limit),
      )
      .returning("used")
      .executeTakeFirst();
    if (spent) return { allowed: true, used: spent.used, remaining: limit - spent.used, resetsAt };
  }
  const current = await database
    .selectFrom("spending_cap_usage")
    .select("used")
    .where("name", "=", name)
    .where("period_start", "=", periodStart)
    .executeTakeFirst();
  const used = current?.used ?? 0;
  return { allowed: false, used, remaining: limit - used, resetsAt };
}
