import { expect, test } from "vitest";
import { adaptiveDifficulty } from "@sharadox/protection-web-library/adaptive-difficulty";

test("adds one bit, twice the work, for each strike, up to a ceiling", () => {
  expect(adaptiveDifficulty(0)).toBe(14);
  expect(adaptiveDifficulty(3)).toBe(17);
  expect(adaptiveDifficulty(100)).toBe(22);
  expect(adaptiveDifficulty(2, { base: 10, maximum: 11 })).toBe(11);
});

test("never goes below the base", () => {
  expect(adaptiveDifficulty(-5)).toBe(14);
});
