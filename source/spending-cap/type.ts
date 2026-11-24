/** A hard limit on something that costs money (emails, text messages…) per calendar day or month, in UTC. */
export interface SpendingCap {
  name: string;
  limit: number;
  period: "day" | "month";
}

export interface SpendOptions {
  /** Milliseconds since 1970 (now by default). */
  now?: number;
  /** A positive whole number (1 by default). */
  cost?: number;
}

export interface SpendResult {
  allowed: boolean;
  /** Used in this period, after this spend when allowed. */
  used: number;
  remaining: number;
  /** When the period ends and the cap starts again. */
  resetsAt: Date;
}
