/** One rate-limit bucket: its key (an HMAC, never the raw contact or address), tokens left and when last changed. */
export interface RateLimitBucketTable {
  key: string;
  tokens: number;
  updated_at: Date;
}

/** How much of a spending cap one period has used. */
export interface SpendingCapUsageTable {
  name: string;
  period_start: Date;
  used: number;
}

/** The tables `protectionMigrations` creates, for typing a Kysely instance. */
export interface ProtectionDatabase {
  rate_limit_bucket: RateLimitBucketTable;
  spending_cap_usage: SpendingCapUsageTable;
}
