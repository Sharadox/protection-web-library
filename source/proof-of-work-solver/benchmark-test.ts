import { expect, test } from "vitest";
import { solveChallenge } from "@sharadox/protection-web-library/proof-of-work-solver";

/** The default challenge (14 bits, no strikes) must stay invisible: well under a second, even on a slower phone. */
test("solves a default 14-bit challenge in a fraction of a second", async ({ bench }) => {
  let round = 0;
  const result = await bench("solve 14 bits", () =>
    solveChallenge({ salt: `benchmark-${round++}`, difficulty: 14 }),
  ).run();
  expect(result.latency.mean).toBeLessThan(250);
});
