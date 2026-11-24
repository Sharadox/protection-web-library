import { expect, test } from "vitest";
import { createChallenge, verifySolution } from "@sharadox/protection-web-library/proof-of-work";
import { solveChallenge } from "@sharadox/protection-web-library/proof-of-work-solver";

const secret = "a test secret that is long enough to sign with";

test("a solved challenge verifies, once per id", async () => {
  const challenge = createChallenge({ secret, difficulty: 8, now: 0 });
  const nonce = await solveChallenge(challenge);
  expect(verifySolution({ challenge, nonce }, { secret, now: 1_000 })).toEqual({ valid: true, id: challenge.id });
});

test("challenges are unique and expire after five minutes by default", () => {
  const first = createChallenge({ secret, difficulty: 8, now: 0 });
  const second = createChallenge({ secret, difficulty: 8, now: 0 });
  expect(first.id).not.toBe(second.id);
  expect(first.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(first.salt).not.toBe(second.salt);
  expect(first.expiresAt).toBe(300_000);
  expect(createChallenge({ secret, difficulty: 8, now: 0, lifetimeSeconds: 10 }).expiresAt).toBe(10_000);
});

test("refuses an expired challenge", async () => {
  const challenge = createChallenge({ secret, difficulty: 4, now: 0 });
  const nonce = await solveChallenge(challenge);
  expect(verifySolution({ challenge, nonce }, { secret, now: 300_001 })).toEqual({ valid: false, reason: "expired" });
});

test("refuses a challenge someone made easier, or signed with another secret", async () => {
  const challenge = createChallenge({ secret, difficulty: 12, now: 0 });
  const easier = { ...challenge, difficulty: 1 };
  const nonce = await solveChallenge(easier);
  expect(verifySolution({ challenge: easier, nonce }, { secret, now: 0 })).toEqual({
    valid: false,
    reason: "signature",
  });
  expect(verifySolution({ challenge, nonce }, { secret: "another secret, also long enough to sign", now: 0 })).toEqual({
    valid: false,
    reason: "signature",
  });
  expect(verifySolution({ challenge: { ...challenge, signature: "short" }, nonce }, { secret, now: 0 })).toEqual({
    valid: false,
    reason: "signature",
  });
});

test("refuses a nonce that doesn't do the work", () => {
  const challenge = createChallenge({ secret, difficulty: 30, now: 0 });
  expect(verifySolution({ challenge, nonce: "0" }, { secret, now: 0 })).toEqual({ valid: false, reason: "work" });
});

test("refuses a secret too short to sign with", () => {
  expect(() => createChallenge({ secret: "short", difficulty: 8, now: 0 })).toThrow("at least 32 characters");
  const challenge = createChallenge({ secret, difficulty: 8, now: 0 });
  expect(() => verifySolution({ challenge, nonce: "0" }, { secret: "short", now: 0 })).toThrow(
    "at least 32 characters",
  );
});

test("uses the clock when no time is given", async () => {
  const challenge = createChallenge({ secret, difficulty: 4 });
  expect(challenge.expiresAt).toBeGreaterThan(Date.now());
  expect(verifySolution({ challenge, nonce: await solveChallenge(challenge) }, { secret }).valid).toBe(true);
});
