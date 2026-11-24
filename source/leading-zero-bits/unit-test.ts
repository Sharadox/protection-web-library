import { expect, test } from "vitest";
import { leadingZeroBits } from "@sharadox/protection-web-library/leading-zero-bits";

test("counts the zero bits before the first one", () => {
  expect(leadingZeroBits(new Uint8Array([0b1000_0000]))).toBe(0);
  expect(leadingZeroBits(new Uint8Array([0b0001_0000]))).toBe(3);
  expect(leadingZeroBits(new Uint8Array([0, 0b0000_0001]))).toBe(15);
  expect(leadingZeroBits(new Uint8Array([0, 0]))).toBe(16);
});
