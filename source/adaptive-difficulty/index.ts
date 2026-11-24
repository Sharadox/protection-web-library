import type { AdaptiveDifficultyOptions } from "@sharadox/protection-web-library/adaptive-difficulty/type";

/**
 * The proof-of-work difficulty for a source with `strikes` (recent refusals, failures or limits hit): one more bit,
 * twice the work, per strike, between `base` (14 bits: a moment on a phone) and `maximum` (22 bits: several seconds,
 * costly by the thousand for a bot).
 *
 * @example
 * createChallenge({ secret, difficulty: adaptiveDifficulty(strikes) });
 */
export function adaptiveDifficulty(
  strikes: number,
  { base = 14, maximum = 22 }: AdaptiveDifficultyOptions = {},
): number {
  return Math.min(maximum, base + Math.max(0, strikes));
}
