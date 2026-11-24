import { leadingZeroBits } from "@sharadox/protection-web-library/leading-zero-bits";
import type { Challenge } from "@sharadox/protection-web-library/proof-of-work/type";
import { sha256 } from "@sharadox/protection-web-library/sha-256";

const encoder = new TextEncoder();

/** Attempts between two pauses, so a page doing the work stays responsive. */
const BATCH = 2_000;

/**
 * Does a challenge's work in the browser (or anywhere): tries nonces 0, 1, 2… until SHA-256(`salt:nonce`) starts
 * with the challenge's zero bits, and returns the nonce to send back. No puzzle for the person to solve. It pauses
 * every few thousand attempts so the page stays responsive; at high difficulties run it in a Web Worker.
 *
 * @example
 * const nonce = await solveChallenge(challenge);
 * await fetch("/api/code", { method: "POST", body: JSON.stringify({ email, proof: { challenge, nonce } }) });
 */
export async function solveChallenge({ salt, difficulty }: Pick<Challenge, "salt" | "difficulty">): Promise<string> {
  for (let nonce = 0; ; nonce++) {
    if (leadingZeroBits(sha256(encoder.encode(`${salt}:${nonce}`))) >= difficulty) return String(nonce);
    if (nonce % BATCH === BATCH - 1) await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
