# Database Reset Tools

This directory contains tools for resetting and managing your database.

## Full Reset

To completely reset your database (drop all tables, run migrations, and seed data):

```bash
bun reset.ts
```

## Individual Steps

You can also run individual steps separately:

### 1. Drop All Tables

```bash
bun scripts/drop-tables.ts
```

This will:

- Drop all non-system schemas (except public)
- Drop all tables in the public schema
- Drop the kysely_migration table

### 2. Run Migrations

```bash
bun scripts/migrate.ts
```

This will run all migrations from the `migrations/` folder.

### 3. Run Seeds

```bash
bun scripts/seed.ts
```

This will:

- Look for a `seed.ts` file and run its `seed()` function if it exists
- If no custom seed file exists, run basic example seeds

## Customizing Seeds

Create a `seed.ts` file in the example directory with a `seed()` function:

```typescript
import { db } from "./database";

export async function seed() {
  // Your custom seeding logic here
  await db
    .insertInto("users")
    .values({
      name: "Custom User",
      email: "custom@example.com",
      active: true,
    })
    .execute();
}
```

## Files Structure

- `reset.ts` - Main reset orchestrator
- `reset/drop-tables.ts` - Table dropping logic
- `reset/run-migrations.ts` - Migration running logic
- `reset/run-seeds.ts` - Seeding logic
- `scripts/` - Individual utility scripts
- `seed.ts` - Optional custom seed file

## Environment Variables

The database connection uses:

- `DATABASE_URL` environment variable if set
- Defaults to `postgres://postgres:postgres@localhost:5432/kysely-bun-sql-example`

## Safety

⚠️ **Warning**: The reset functionality will **permanently delete all data** in your database. Only use this in development environments.
