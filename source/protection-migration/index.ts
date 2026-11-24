import type { Kysely } from "kysely";
import { migrate } from "@sharadox/database-web-library/migration";
import type { Migration } from "@sharadox/database-web-library/migration/type";

/** The table that records which protection migrations a database has applied (apart from the application's own). */
export const PROTECTION_MIGRATION_TABLE = "protection_migration";

/**
 * The protection tables, forward only: rate-limit buckets, spending-cap usage and used challenges, each row with a
 * UUIDv7 `id`.
 */
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
  {
    name: "0003-identifier-version-7",
    sql: `
      alter table rate_limit_bucket drop constraint rate_limit_bucket_pkey;
      alter table rate_limit_bucket add constraint rate_limit_bucket_key_key unique (key);
      alter table rate_limit_bucket
        add column id uuid primary key default uuidv7() check (uuid_extract_version(id) = 7);
      alter table spending_cap_usage drop constraint spending_cap_usage_pkey;
      alter table spending_cap_usage
        add constraint spending_cap_usage_name_period_start_key unique (name, period_start);
      alter table spending_cap_usage
        add column id uuid primary key default uuidv7() check (uuid_extract_version(id) = 7);
      delete from used_challenge where expires_at < now()
        or id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
      alter table used_challenge drop constraint used_challenge_id_check;
      alter table used_challenge alter column id type uuid using id::uuid;
      alter table used_challenge add constraint used_challenge_id_check check (uuid_extract_version(id) = 7);
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
