import { createHash } from "node:crypto";
import { expect, test } from "vitest";
import { leadingZeroBits } from "@sharadox/protection-web-library/leading-zero-bits";
import { solveChallenge } from "@sharadox/protection-web-library/proof-of-work-solver";

test("finds a nonce whose hash starts with the zero bits asked", async () => {
  const nonce = await solveChallenge({ salt: "fixed-salt", difficulty: 12 });
  expect(leadingZeroBits(createHash("sha256").update(`fixed-salt:${nonce}`).digest())).toBeGreaterThanOrEqual(12);
});

test("lets the page do other work while it searches", async () => {
  let ticks = 0;
  const timer = setInterval(() => ticks++, 0);
  await solveChallenge({ salt: "fixed-salt", difficulty: 15 });
  clearInterval(timer);
  expect(ticks).toBeGreaterThan(0);
});
