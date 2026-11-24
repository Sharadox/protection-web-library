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

/** A proof-of-work challenge already answered, kept until it expires so its solution counts once. */
export interface UsedChallengeTable {
  id: string;
  expires_at: Date;
}

/** The tables `protectionMigrations` creates, for typing a Kysely instance. */
export interface ProtectionDatabase {
  rate_limit_bucket: RateLimitBucketTable;
  spending_cap_usage: SpendingCapUsageTable;
  used_challenge: UsedChallengeTable;
}
