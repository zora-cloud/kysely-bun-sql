# Kysely Bun SQL Example

This is a simplified example of using Kysely with Bun's native SQL support and PostgreSQL.

## Features

- Simple database schema with `users` and `posts` tables
- Zod validation for data types
- Database migrations using Kysely's migration system
- Example CRUD operations

## Setup

1. Make sure you have PostgreSQL running locally with default settings:

   - Host: localhost
   - Port: 5432
   - Database: postgres
   - Username: postgres
   - Password: postgres

2. Install dependencies:

   ```bash
   bun install
   ```

3. Run migrations to create the database tables:

   ```bash
   bun run example/migrator.ts
   ```

4. Run the example:
   ```bash
   bun run example/example.ts
   ```

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
