import { expect, test } from "vitest";
import { takeToken } from "@sharadox/protection-web-library/token-bucket";

const rule = { capacity: 3, refillPerSecond: 1 / 60 }; // 3 at once, then one a minute

test("starts full and lets a burst through up to the capacity", () => {
  let bucket;
  const allowed: boolean[] = [];
  for (let i = 0; i < 4; i++) {
    const result = takeToken(bucket, rule, 1_000);
    allowed.push(result.allowed);
    bucket = result.bucket;
  }
  expect(allowed).toEqual([true, true, true, false]);
});

test("says when to try again", () => {
  const empty = { tokens: 0, updatedAt: 0 };
  expect(takeToken(empty, rule, 0)).toEqual({ allowed: false, bucket: empty, retryAfterSeconds: 60 });
  expect(takeToken(empty, rule, 30_000).retryAfterSeconds).toBe(30);
});

test("refills with time, never above the capacity", () => {
  const empty = { tokens: 0, updatedAt: 0 };
  expect(takeToken(empty, rule, 60_000)).toEqual({
    allowed: true,
    bucket: { tokens: 0, updatedAt: 60_000 },
    retryAfterSeconds: 0,
  });
  expect(takeToken(empty, rule, 3_600_000).bucket.tokens).toBe(2);
});

test("charges more for costlier actions", () => {
  expect(takeToken(undefined, rule, 0, 3).bucket.tokens).toBe(0);
  expect(takeToken(undefined, rule, 0, 4).allowed).toBe(false);
});

test("ignores a clock that went backwards", () => {
  expect(takeToken({ tokens: 1, updatedAt: 10_000 }, rule, 5_000).bucket).toEqual({ tokens: 0, updatedAt: 10_000 });
});
