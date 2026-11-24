# Changelog

What changed in each version of `@sharadox/protection-web-library`, newest first.

## 0.1.0

First version:

- `takeToken`: token-bucket rate limits.
- `addressGroup`: IPv6 counted per /64.
- `createChallenge`, `verifySolution` and `solveChallenge`: a signed, stateless proof of work.
- `adaptiveDifficulty`.
- `leadingZeroBits` and `sha256`.
- In Postgres: `limitRate` (layered rate limits, all or nothing), `pruneRateLimits`, `spendFromCap` (hard
  spending caps per day or month) and `migrateProtection` for their tables.
