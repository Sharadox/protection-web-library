# @sharadox/protection-web-library

Protection for web forms and APIs against repeated tries, bots and attacks on the bill. It provides:

- token-bucket rate limits;
- address groups that treat a whole IPv6 /64 as one visitor;
- an invisible proof-of-work challenge (no third-party captcha, no puzzle);
- difficulty that rises with each strike;
- layered rate limits and hard spending caps kept in Postgres (through `@sharadox/database-web-library`).

The building blocks are pure or stateless; the Postgres parts store only keyed hashes, never contacts or addresses.

## Install

```sh
pnpm add @sharadox/protection-web-library
```

## Configuration

| Variable               | Meaning                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `PROOF_OF_WORK_SECRET` | At least 32 random characters, server only. It signs challenges (suggested name: the library only takes `secret`). |
| `RATE_LIMIT_SECRET`    | At least 32 random characters, server only. Rate-limit keys are stored as HMACs under it (suggested name).         |

The Postgres parts need their tables: run `migrateProtection(database)` when the application migrates. They are
tracked in their own table (`protection_migration`), apart from the application's migrations.

## API

Each export has its own entry point (`@sharadox/protection-web-library/<name>`).

### `token-bucket`: `takeToken(bucket | undefined, { capacity, refillPerSecond }, now, cost = 1)`

Returns `{ allowed, bucket, retryAfterSeconds }`.

- A new key starts full.
- Each action costs `cost` tokens.
- Tokens come back at `refillPerSecond`, never above `capacity`.
- A clock that goes backwards refills nothing.

```ts
const rule = { capacity: 5, refillPerSecond: 1 / 60 }; // 5 at once, then one a minute
const { allowed, bucket, retryAfterSeconds } = takeToken(stored, rule, Date.now());
```

Layer several buckets per action: per contact, per account, per `addressGroup`, and one global bucket.

### `address-group`: `addressGroup(address)` → group

- An IPv4 address is its own group.
- An IPv6 address counts as its `/64` (`2001:db8:1:2::/64`).
- `::ffff:203.0.113.7` counts as IPv4.
- Anything else is `"unknown"`.

Use it with `clientAddress` from `@sharadox/web-library/client-address`.

### `proof-of-work`: `createChallenge({ secret, difficulty, now?, lifetimeSeconds = 300 })`, `verifySolution({ challenge, nonce }, { secret, now? })`

A challenge asks for a nonce such that SHA-256(`salt:nonce`) starts with `difficulty` zero bits.

- **Signed:** the server keeps nothing until a solution comes back.
- **Verification** returns `{ valid: true, id }` or `{ valid: false, reason: "signature" | "expired" | "work" }`. The
  signature is compared in constant time, so the difficulty can't be lowered.
- **One use per challenge:** store `id` until `expiresAt` and refuse it after that.

### `proof-of-work-solver`: `solveChallenge({ salt, difficulty })` → nonce

Runs in the browser and pauses every 2,000 attempts so the page stays responsive. A default 14-bit challenge takes a
small fraction of a second.

```ts
const challenge = await (await fetch("/api/challenge")).json();
const nonce = await solveChallenge(challenge);
await fetch("/api/code", { method: "POST", body: JSON.stringify({ email, proof: { challenge, nonce } }) });
```

### `adaptive-difficulty`: `adaptiveDifficulty(strikes, { base = 14, maximum = 22 })`

Adds one bit per strike, which doubles the work, from `base` up to `maximum`.

### `leading-zero-bits`: `leadingZeroBits(bytes)`, `sha-256`: `sha256(bytes)`

The building blocks of the solver. `sha256` is a synchronous FIPS 180-4 SHA-256, made for many small hashes. It is
not for secrets.

### `protection-migration`: `migrateProtection(database)`, `protectionMigrations`, `PROTECTION_MIGRATION_TABLE`

Creates `rate_limit_bucket`, `spending_cap_usage` and `used_challenge`, every row with a UUIDv7 `id` (challenge ids
are UUIDv7 too). Type a Kysely instance with `ProtectionDatabase`
(`protection-database/type`), or include it in the application's own schema type.

### `rate-limit`: `limitRate(database, layers, { secret, now? })` → `{ allowed, retryAfterSeconds, blockedBy }`

Every layer must have the tokens, or nothing is taken from any of them.

- One transaction, rows locked in a fixed order: concurrent requests never pass a capacity and never deadlock.
- `blockedBy` lists the keys that blocked, as given: count strikes with it for `adaptiveDifficulty`.
- The same key twice is refused.

```ts
const result = await limitRate(
  database,
  [
    { key: `contact:${email}`, rule: { capacity: 5, refillPerSecond: 1 / 600 } },
    { key: `address:${addressGroup(ip)}`, rule: { capacity: 20, refillPerSecond: 1 / 60 } },
    { key: "global:sign-in", rule: { capacity: 500, refillPerSecond: 1 } },
  ],
  { secret: process.env.RATE_LIMIT_SECRET! },
);
```

### `solution-redemption`: `redeemSolution(database, solution, { secret, now? })`

`verifySolution` plus spending it: a valid solution counts once (its challenge id is kept until the challenge
expires), so a solved challenge can't be replayed. Reasons: `signature`, `expired`, `work`, `used`.
`pruneUsedChallenges(database, { now? })` (`used-challenge-prune`) forgets expired ones, from a daily job.

### `rate-limit-prune`: `pruneRateLimits(database, { before })` → deleted count

For a daily job. Pick `before` so that every bucket untouched since then would be full again.

### `spending-cap`: `spendFromCap(database, { name, limit, period: "day" | "month" }, { now?, cost = 1 })` → `{ allowed, used, remaining, resetsAt }`

A hard cap per UTC day or month on anything that costs money. Past the limit it refuses: pause and alert, never
spend. It is one atomic statement, and a refused spend uses nothing.

## License

Sharadox Open Source License 0.1.0 (see `LICENSE.md`).
