import type { Kysely } from "kysely";
import { migrate } from "@sharadox/database-web-library/migration";
import type { Migration } from "@sharadox/database-web-library/migration/type";

/** The table that records which protection migrations a database has applied (apart from the application's own). */
export const PROTECTION_MIGRATION_TABLE = "protection_migration";

/** The protection tables, forward only: rate-limit buckets, spending-cap usage and used challenges. */
export const protectionMigrations: Migration[] = [
  {
    name: "0001-rate-limit-and-spending-cap",
    sql: `
      create table rate_limit_bucket (
        key text primary key,
        tokens double precision not null check (tokens >= 0),
        updated_at timestamptz not null
      );
      create index rate_limit_bucket_updated_at on rate_limit_bucket (updated_at);
      create table spending_cap_usage (
        name text not null,
        period_start timestamptz not null,
        used integer not null check (used >= 0),
        primary key (name, period_start)
      );
    `,
  },
  {
    name: "0002-used-challenge",
    sql: `
      create table used_challenge (
        id text primary key check (length(id) <= 100),
        expires_at timestamptz not null
      );
      create index used_challenge_expires_at on used_challenge (expires_at);
    `,
  },
];

/**
 * Creates or updates the protection tables, tracked in their own migration table so they never clash with the
 * application's migrations. Returns the names applied.
 *
 * @example
 * await migrateProtection(database);
 */
export function migrateProtection<Schema>(database: Kysely<Schema>): Promise<string[]> {
  return migrate(database, protectionMigrations, { table: PROTECTION_MIGRATION_TABLE });
}
