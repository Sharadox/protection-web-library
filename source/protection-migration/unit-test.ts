import { sql } from "kysely";
import { afterEach, beforeEach, expect, test } from "vitest";
import { createMemoryDatabase } from "@sharadox/database-web-library/memory-database";
import type { MemoryDatabase } from "@sharadox/database-web-library/memory-database/type";
import {
  migrateProtection,
  PROTECTION_MIGRATION_TABLE,
  protectionMigrations,
} from "@sharadox/protection-web-library/protection-migration";

let memory: MemoryDatabase<unknown>;
beforeEach(async () => (memory = await createMemoryDatabase()));
afterEach(() => memory.close());

test("creates the protection tables, tracked in their own migration table", async () => {
  expect(await migrateProtection(memory.database)).toEqual(protectionMigrations.map(({ name }) => name));
  const tables = await sql<{
    name: string;
  }>`select table_name as name from information_schema.tables where table_schema = 'public' order by 1`.execute(
    memory.database,
  );
  expect(tables.rows.map(({ name }) => name)).toEqual([
    PROTECTION_MIGRATION_TABLE,
    "rate_limit_bucket",
    "spending_cap_usage",
    "used_challenge",
  ]);
});

test("does nothing the second time", async () => {
  await migrateProtection(memory.database);
  expect(await migrateProtection(memory.database)).toEqual([]);
});

test("every protection table has a UUIDv7 id as its primary key", async () => {
  await migrateProtection(memory.database);
  const keys = await sql<{ table: string; key: string }>`select indrelid::regclass::text as table,
      string_agg(attname, ',') as key from pg_index join pg_attribute on attrelid = indrelid and attnum = any(indkey)
      where indisprimary and indrelid::regclass::text in ('rate_limit_bucket', 'spending_cap_usage', 'used_challenge',
        ${PROTECTION_MIGRATION_TABLE})
      group by 1 order by 1`.execute(memory.database);
  expect(keys.rows.map(({ key }) => key)).toEqual(["id", "id", "id", "id"]);
  await sql`insert into rate_limit_bucket (key, tokens, updated_at) values (${"k"}, ${1}, now())`.execute(
    memory.database,
  );
  await sql`insert into spending_cap_usage (name, period_start, used) values (${"email"}, now(), ${1})`.execute(
    memory.database,
  );
  const versions = await sql<{ version: number }>`select uuid_extract_version(id) as version from rate_limit_bucket
    union all select uuid_extract_version(id) from spending_cap_usage`.execute(memory.database);
  expect(versions.rows).toEqual([{ version: 7 }, { version: 7 }]);
  await expect(
    sql`insert into used_challenge (id, expires_at) values (${"7d444840-9dc0-41d6-8f34-1aa6c1f2f0d9"}, now())`.execute(
      memory.database,
    ),
  ).rejects.toThrow(/check constraint/);
});

test("used challenges recorded before UUIDv7 ids are pruned when expired, and v7 ones are kept", async () => {
  const { migrate } = await import("@sharadox/database-web-library/migration");
  await migrate(memory.database, protectionMigrations.slice(0, 2), { table: PROTECTION_MIGRATION_TABLE });
  await sql`insert into used_challenge (id, expires_at) values
    (${"7d444840-9dc0-41d6-8f34-1aa6c1f2f0d9"}, now() - interval '1 hour'),
    (${"0198f5a2-7a4c-7000-8000-000000000001"}, now() + interval '1 hour')`.execute(memory.database);
  await migrateProtection(memory.database);
  const rows = await sql<{ id: string }>`select id from used_challenge`.execute(memory.database);
  expect(rows.rows).toEqual([{ id: "0198f5a2-7a4c-7000-8000-000000000001" }]);
});
