import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { uuidVersion7 } from "@sharadox/web-library/identifier/uuid-version-7";
import { leadingZeroBits } from "@sharadox/protection-web-library/leading-zero-bits";
import type {
  Challenge,
  CreateChallengeOptions,
  Solution,
  Verification,
  VerifySolutionOptions,
} from "@sharadox/protection-web-library/proof-of-work/type";

function checkSecret(secret: string): void {
  if (secret.length < 32) throw new Error("the proof-of-work secret must have at least 32 characters");
}

const sign = (secret: string, { id, salt, difficulty, expiresAt }: Omit<Challenge, "signature">) =>
  createHmac("sha256", secret).update(`${id}.${salt}.${difficulty}.${expiresAt}`).digest("base64url");

/**
 * A new proof-of-work challenge for a form or an API call: invisible work for a person's browser (a moment at 14
 * bits), real cost for a bot sending thousands. Signed, so the server keeps nothing until a solution comes back.
 *
 * @example
 * const challenge = createChallenge({ secret: process.env.PROOF_OF_WORK_SECRET!, difficulty: adaptiveDifficulty(strikes) });
 */
export function createChallenge({
  secret,
  difficulty,
  now = Date.now(),
  lifetimeSeconds = 300,
}: CreateChallengeOptions): Challenge {
  checkSecret(secret);
  const fields = {
    id: uuidVersion7({ now }),
    salt: randomBytes(16).toString("base64url"),
    difficulty,
    expiresAt: now + lifetimeSeconds * 1000,
  };
  return { ...fields, signature: sign(secret, fields) };
}

/**
 * Checks a solution: the server's own signature (compared in constant time, so the difficulty can't be lowered), not
 * expired, and the work done. On success, store the returned `id` as used until the challenge expires, and refuse it
 * after: this function keeps no state.
 *
 * @example
 * const result = verifySolution(body.proof, { secret: process.env.PROOF_OF_WORK_SECRET! });
 * if (!result.valid || (await alreadyUsed(result.id))) return refuse();
 */
export function verifySolution(
  { challenge, nonce }: Solution,
  { secret, now = Date.now() }: VerifySolutionOptions,
): Verification {
  checkSecret(secret);
  const { signature, ...fields } = challenge;
  const expected = Buffer.from(sign(secret, fields));
  const given = Buffer.from(String(signature));
  if (expected.length !== given.length || !timingSafeEqual(expected, given))
    return { valid: false, reason: "signature" };
  if (now > challenge.expiresAt) return { valid: false, reason: "expired" };
  const hash = createHash("sha256").update(`${challenge.salt}:${nonce}`).digest();
  if (leadingZeroBits(hash) < challenge.difficulty) return { valid: false, reason: "work" };
  return { valid: true, id: challenge.id };
}
