import { createHash, randomBytes } from "node:crypto";
import { expect, test } from "vitest";
import { sha256 } from "@sharadox/protection-web-library/sha-256";

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");
const encode = (text: string) => new TextEncoder().encode(text);

test("matches the standard's test vectors (FIPS 180-4 examples)", () => {
  expect(hex(sha256(encode("")))).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  expect(hex(sha256(encode("abc")))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  expect(hex(sha256(encode("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")))).toBe(
    "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
  );
});

test("matches node:crypto for every length around the block boundaries", () => {
  for (let length = 0; length <= 200; length++) {
    const data = randomBytes(length);
    expect(hex(sha256(new Uint8Array(data)))).toBe(createHash("sha256").update(data).digest("hex"));
  }
});
