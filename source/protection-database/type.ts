import type { Generated } from "kysely";

/** One rate-limit bucket: its key (an HMAC, never the raw contact or address), tokens left and when last changed. */
export interface RateLimitBucketTable {
  /** UUIDv7, made by the database. */
  id: Generated<string>;
  key: string;
  tokens: number;
  updated_at: Date;
}

/** How much of a spending cap one period has used. */
export interface SpendingCapUsageTable {
  /** UUIDv7, made by the database. */
  id: Generated<string>;
  name: string;
  period_start: Date;
  used: number;
}

/** A proof-of-work challenge already answered, kept until it expires so its solution counts once. */
export interface UsedChallengeTable {
  /** The challenge's UUIDv7. */
  id: string;
  expires_at: Date;
}

/** The tables `protectionMigrations` creates, for typing a Kysely instance. */
export interface ProtectionDatabase {
  rate_limit_bucket: RateLimitBucketTable;
  spending_cap_usage: SpendingCapUsageTable;
  used_challenge: UsedChallengeTable;
}
