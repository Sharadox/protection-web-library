/** How many actions a key may take: `capacity` at once, then `refillPerSecond` more each second. */
export interface TokenBucketRule {
  capacity: number;
  refillPerSecond: number;
}

/** What is remembered per key: tokens left and when (milliseconds since 1970). */
export interface TokenBucket {
  tokens: number;
  updatedAt: number;
}

/** Whether the action may go ahead, the bucket to store, and how long to wait when it may not. */
export interface TokenBucketResult {
  allowed: boolean;
  bucket: TokenBucket;
  retryAfterSeconds: number;
}
