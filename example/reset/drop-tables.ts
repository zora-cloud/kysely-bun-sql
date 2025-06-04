import { SQL } from "bun";

export async function dropAllTables() {
  console.log("\n💣 Dropping all schemas and tables...");

  // Create a direct SQL connection (bypasses Kysely for raw SQL execution)
  const sql = new SQL({
    url:
      process.env.DATABASE_URL ||
      "postgres://postgres:postgres@localhost:5432/kysely-bun-sql-example",
    max: 10,
    idleTimeout: 30,
  });

  try {
    // Get all non-system schemas (excluding information_schema, pg_catalog, etc.)
    const schemasResult = await sql`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      AND schema_name NOT LIKE 'pg_%'
    `;

    console.log(`Found ${schemasResult.length} schemas to clean up`);

    // Drop all tenant schemas (everything except public)
    for (const row of schemasResult) {
      if (row.schema_name !== "public") {
        await sql`DROP SCHEMA ${sql(row.schema_name)} CASCADE`;
        console.log(`🗑️  Dropped tenant schema: ${row.schema_name}`);
      }
    }

    // Drop all tables in public schema
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `;

    for (const row of tablesResult) {
      await sql`DROP TABLE IF EXISTS ${sql(row.table_name)} CASCADE`;
      console.log(`🗑️  Dropped public table: ${row.table_name}`);
    }

    // Also drop the kysely migration table if it exists
    await sql`DROP TABLE IF EXISTS "kysely_migration" CASCADE`;
    console.log("🗑️  Dropped kysely_migration table");

    console.log("✅ All schemas and tables dropped successfully");
  } catch (dropError) {
    console.error("❌ Failed to drop schemas/tables:");
    console.error(dropError);
    throw dropError;
  } finally {
    // Clean up the direct SQL connection
    await sql.end();
  }
}
