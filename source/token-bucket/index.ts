import type {
  TokenBucket,
  TokenBucketResult,
  TokenBucketRule,
} from "@sharadox/protection-web-library/token-bucket/type";

/**
 * One step of a token bucket, the rate limit every protection here is made of: a new key starts full (`capacity`),
 * each action costs tokens (`cost`, 1 by default), and tokens come back at `refillPerSecond`, never above the
 * capacity. Pure: store the returned bucket (per contact, per address group, per account…) wherever the caller
 * keeps state. A clock that went backwards refills nothing.
 *
 * @example
 * const { allowed, bucket, retryAfterSeconds } = takeToken(stored, { capacity: 5, refillPerSecond: 1 / 60 }, Date.now());
 */
export function takeToken(
  bucket: TokenBucket | undefined,
  { capacity, refillPerSecond }: TokenBucketRule,
  now: number,
  cost = 1,
): TokenBucketResult {
  const start = bucket ?? { tokens: capacity, updatedAt: now };
  const elapsed = Math.max(0, now - start.updatedAt) / 1000;
  const tokens = Math.min(capacity, start.tokens + elapsed * refillPerSecond);
  const updatedAt = Math.max(now, start.updatedAt);
  if (tokens >= cost) return { allowed: true, bucket: { tokens: tokens - cost, updatedAt }, retryAfterSeconds: 0 };
  return {
    allowed: false,
    bucket: bucket ?? start,
    retryAfterSeconds: Math.ceil((cost - tokens) / refillPerSecond),
  };
}
