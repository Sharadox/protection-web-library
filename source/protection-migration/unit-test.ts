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
  ]);
});

test("does nothing the second time", async () => {
  await migrateProtection(memory.database);
  expect(await migrateProtection(memory.database)).toEqual([]);
});
