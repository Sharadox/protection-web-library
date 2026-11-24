import type { TokenBucketRule } from "@sharadox/protection-web-library/token-bucket/type";

/** One layer of a rate limit: what is counted (`contact:…`, `address:…`, `account:…`) and how fast. */
export interface RateLimitLayer {
  key: string;
  rule: TokenBucketRule;
  /** Tokens this action takes from the layer (1 by default). */
  cost?: number;
}

export interface RateLimitOptions {
  /** At least 32 characters, kept outside the database: keys are stored only as HMACs under it. */
  secret: string;
  /** Milliseconds since 1970 (now by default). */
  now?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until every blocking layer has enough tokens again (0 when allowed). */
  retryAfterSeconds: number;
  /** The keys of the layers that blocked, as given. */
  blockedBy: string[];
}
