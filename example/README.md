# Kysely Bun SQL Example

This is a simplified example of using Kysely with Bun's native SQL support and PostgreSQL.

## Features

- Simple database schema with `users` and `posts` tables
- Zod validation for data types
- Database migrations using Kysely's migration system
- Example CRUD operations
- Environment variable configuration

## Setup

### 1. Database Configuration

The example uses the `DATABASE_URL` environment variable for database connection. You can either:

**Option A: Create a `.env` file in the project root:**

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/kysely-bun-sql-example
```

**Option B: Set the environment variable directly:**

```bash
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/kysely-bun-sql-example"
```

**Option C: Use the default** (works if you have PostgreSQL running locally with default settings)

### 2. Start PostgreSQL

You can use Docker for a quick setup:

```bash
docker run --name kysely-example-postgres \
  -e POSTGRES_DB=kysely-bun-sql-example \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:15
```

Or use your local PostgreSQL installation with these settings:

- Host: localhost
- Port: 5432
- Database: kysely-bun-sql-example
- Username: postgres
- Password: postgres

### 3. Install dependencies

```bash
bun install
```

### 4. Run migrations to create the database tables

```bash
bun run example/migrator.ts
```

### 5. Run the example

```bash
bun run example/example.ts
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection URL (optional, has sensible default)

## Database Schema

### Users Table

- `id` (serial, primary key)
- `name` (varchar(255), not null)
- `email` (varchar(255), not null, unique)
- `active` (boolean, default true)
- `created_at` (timestamp, default CURRENT_TIMESTAMP)

### Posts Table

- `id` (serial, primary key)
- `title` (varchar(255), not null)
- `content` (text, not null)
- `user_id` (integer, foreign key to users.id)
- `created_at` (timestamp, default CURRENT_TIMESTAMP)

## Validation

The example uses Zod for runtime validation of user and post data. See `database.ts` for the schema definitions.
