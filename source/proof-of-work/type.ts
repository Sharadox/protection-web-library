/** A proof-of-work challenge, signed by the server: find a nonce so SHA-256(`salt:nonce`) starts with `difficulty` zero bits. */
export interface Challenge {
  /** Unique: remember used ids until `expiresAt` so a solution counts once. */
  id: string;
  salt: string;
  difficulty: number;
  /** Milliseconds since 1970. */
  expiresAt: number;
  /** HMAC-SHA-256 of the fields above (base64url). */
  signature: string;
}

/** What the browser sends back. */
export interface Solution {
  challenge: Challenge;
  nonce: string;
}

/** A valid solution (with the id to mark as used) or why not. */
export type Verification = { valid: true; id: string } | { valid: false; reason: "signature" | "expired" | "work" };

export interface CreateChallengeOptions {
  /** At least 32 characters, from the environment; never sent to the browser. */
  secret: string;
  difficulty: number;
  now?: number;
  /** 300 by default. */
  lifetimeSeconds?: number;
}

export interface VerifySolutionOptions {
  secret: string;
  now?: number;
}
