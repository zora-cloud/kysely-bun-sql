import {
  describe,
  test,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  expect,
} from "bun:test";
import { sql } from "kysely";

import {
  clearDatabase,
  destroyTest,
  initTest,
  type TestContext,
} from "./test-setup";

describe("Migration System", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await initTest();
  });

  beforeEach(async () => {
    await clearDatabase(ctx);
  });

  afterEach(async () => {
    await clearDatabase(ctx);
  });

  afterAll(async () => {
    await destroyTest(ctx);
  });

  test("should create and drop tables (simulating migration)", async () => {
    // Test basic table creation and dropping like a migration would do
    try {
      await ctx.db.schema
        .createTable("test_users")
        .addColumn("id", "varchar", (col) => col.primaryKey())
        .addColumn("name", "varchar", (col) => col.notNull())
        .addColumn("email", "varchar", (col) => col.notNull().unique())
        .addColumn("created_at", "timestamp", (col) =>
          col.defaultTo(sql`now()`).notNull()
        )
        .execute();

      // Verify table was created
      const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'test_users'
      `.execute(ctx.db);

      expect(tables.rows).toHaveLength(1);
      expect((tables.rows[0] as any)?.table_name).toBe("test_users");

      // Test inserting data
      await sql`
        INSERT INTO test_users (id, name, email) 
        VALUES ('user1', 'Test User', 'test@example.com')
      `.execute(ctx.db);

      const users = await sql`
        SELECT id, name, email FROM test_users
      `.execute(ctx.db);

      expect(users.rows).toHaveLength(1);
      expect((users.rows[0] as any)?.name).toBe("Test User");
    } finally {
      await ctx.db.schema.dropTable("test_users").ifExists().execute();
    }
  });

  test("should handle schema-qualified migrations", async () => {
    // Create test schema
    await ctx.db.schema
      .createSchema("test_migration_schema")
      .ifNotExists()
      .execute();

    try {
      // Create a table in the custom schema using withSchema
      await ctx.db
        .withSchema("test_migration_schema")
        .schema.createTable("schema_test_table")
        .addColumn("id", "serial", (col) => col.primaryKey())
        .addColumn("data", "varchar", (col) => col.notNull())
        .execute();

      // Verify the table was created in the correct schema
      const tables = await sql`
        SELECT table_name, table_schema
        FROM information_schema.tables 
        WHERE table_schema = 'test_migration_schema' 
        AND table_name = 'schema_test_table'
      `.execute(ctx.db);

      expect(tables.rows).toHaveLength(1);
      expect((tables.rows[0] as any)?.table_schema).toBe(
        "test_migration_schema"
      );

      // Test inserting and querying data using raw SQL to avoid type issues
      await sql`
        INSERT INTO test_migration_schema.schema_test_table (data) 
        VALUES ('test data')
      `.execute(ctx.db);

      const results = await sql`
        SELECT id, data FROM test_migration_schema.schema_test_table
      `.execute(ctx.db);

      expect(results.rows).toHaveLength(1);
      expect((results.rows[0] as any)?.data).toBe("test data");
    } finally {
      // Cleanup
      await ctx.db.schema
        .dropSchema("test_migration_schema")
        .ifExists()
        .cascade()
        .execute();
    }
  });

  test("should handle table creation and removal", async () => {
    try {
      // Create table (like migration up)
      await ctx.db.schema
        .createTable("rollback_test")
        .addColumn("id", "serial", (col) => col.primaryKey())
        .addColumn("value", "varchar", (col) => col.notNull())
        .execute();

      // Verify table exists
      const tablesAfterUp = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'rollback_test'
      `.execute(ctx.db);
      expect(tablesAfterUp.rows).toHaveLength(1);

      // Drop table (like migration down)
      await ctx.db.schema.dropTable("rollback_test").execute();

      // Verify table was dropped
      const tablesAfterDown = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'rollback_test'
      `.execute(ctx.db);
      expect(tablesAfterDown.rows).toHaveLength(0);
    } finally {
      await ctx.db.schema.dropTable("rollback_test").ifExists().execute();
    }
  });

  test("should handle SQL defaults and expressions", async () => {
    try {
      await ctx.db.schema
        .createTable("sql_defaults_test")
        .addColumn("id", "serial", (col) => col.primaryKey())
        .addColumn("created_at", "timestamp", (col) =>
          col.defaultTo(sql`now()`).notNull()
        )
        .addColumn("updated_at", "timestamp", (col) =>
          col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
        )
        .addColumn("active", "boolean", (col) => col.defaultTo(true).notNull())
        .execute();

      // Insert without providing timestamp values (using defaults)
      await sql`
        INSERT INTO sql_defaults_test DEFAULT VALUES
      `.execute(ctx.db);

      const result = await sql`
        SELECT id, active, created_at, updated_at FROM sql_defaults_test
      `.execute(ctx.db);

      expect(result.rows).toHaveLength(1);
      expect((result.rows[0] as any)?.active).toBe(true);
      expect((result.rows[0] as any)?.created_at).toBeDefined();
      expect((result.rows[0] as any)?.updated_at).toBeDefined();
    } finally {
      await ctx.db.schema.dropTable("sql_defaults_test").ifExists().execute();
    }
  });
});
