# Kysely Bun SQL Dialect

A [Kysely](https://github.com/kysely-org/kysely) dialect for [Bun's native SQL](https://bun.sh/docs/api/sql) support.

This dialect allows you to use Kysely's type-safe query builder with Bun's built-in PostgreSQL client.

## Installation

```bash
bun add kysely-bun-sql kysely
```

## Usage

```typescript
import { Kysely } from "kysely";
import { BunSQLDialect } from "kysely-bun-sql";
import { SQL } from "bun";

// Create a Bun SQL instance
const sql = new SQL({
  url: "postgres://user:password@localhost:5432/database",
  // Additional Bun SQL options
  max: 20,
  idleTimeout: 30,
});

// Create Kysely database instance
const db = new Kysely<Database>({
  dialect: new BunSQLDialect({
    sql: sql,
  }),
});

// Use Kysely as normal
const users = await db
  .selectFrom("users")
  .select(["id", "name", "email"])
  .where("active", "=", true)
  .execute();
```

## Features

- **Type-safe**: Full TypeScript support with Kysely's type system
- **Performance**: Uses Bun's native PostgreSQL bindings
- **Connection pooling**: Leverages Bun SQL's built-in connection pooling
- **Transactions**: Full transaction support including savepoints
- **Streaming**: Support for streaming large result sets

## Configuration

The `BunSQLDialect` accepts a configuration object with the following properties:

```typescript
interface BunSQLDialectConfig {
  readonly sql: SQL; // Bun SQL instance
}
```

### Bun SQL Configuration

You can configure the underlying Bun SQL instance with various options:

```typescript
import { SQL } from "bun";

const sql = new SQL({
  // Connection options
  url: "postgres://user:password@localhost:5432/database",
  hostname: "localhost",
  port: 5432,
  database: "myapp",
  username: "user",
  password: "password",

  // Pool configuration
  max: 20, // Maximum connections in pool
  idleTimeout: 30, // Close idle connections after 30s
  maxLifetime: 0, // Connection lifetime (0 = forever)
  connectionTimeout: 30, // Timeout for new connections

  // SSL/TLS
  tls: true,

  // Callbacks
  onconnect: (client) => console.log("Connected"),
  onclose: (client) => console.log("Disconnected"),
});
```

## Transactions

Transactions work seamlessly with Kysely:

```typescript
await db.transaction().execute(async (trx) => {
  await trx
    .insertInto("users")
    .values({ name: "John", email: "john@example.com" })
    .execute();

  await trx
    .updateTable("accounts")
    .set({ balance: sql`balance - 100` })
    .where("user_id", "=", 1)
    .execute();
});
```

## Environment Variables

Bun SQL automatically reads PostgreSQL connection parameters from environment variables:

- `POSTGRES_URL` or `DATABASE_URL` - Connection URL
- `PGHOST` - Database host (default: localhost)
- `PGPORT` - Database port (default: 5432)
- `PGUSER` - Database user (default: postgres)
- `PGPASSWORD` - Database password
- `PGDATABASE` - Database name

### Using .env Files

Since Bun automatically loads `.env` files, you can create a `.env` file in your project root:

```env
DATABASE_URL=postgres://user:password@localhost:5432/database
```

Then use it in your code:

```typescript
import { SQL } from "bun";

const sql = new SQL({
  url: process.env.DATABASE_URL!,
  max: 20,
  idleTimeout: 30,
});
```

## Error Handling

The dialect includes custom error handling for Bun SQL specific errors:

```typescript
import { BunSQLDialectError } from "kysely-bun-sql";

try {
  await db.selectFrom("users").selectAll().execute();
} catch (error) {
  if (error instanceof BunSQLDialectError) {
    // Handle dialect-specific errors
  }
}
```

## License

MIT
