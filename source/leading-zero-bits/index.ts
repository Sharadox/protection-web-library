/**
 * How many zero bits a hash starts with: the measure of a proof of work (each bit doubles the work to find one).
 *
 * @example
 * leadingZeroBits(new Uint8Array([0, 0b0001_0000])); // 11
 */
export function leadingZeroBits(bytes: Uint8Array): number {
  let count = 0;
  for (const byte of bytes) {
    if (byte === 0) {
      count += 8;
      continue;
    }
    return count + Math.clz32(byte) - 24;
  }
  return count;
}
