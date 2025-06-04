# Tests

This directory contains the test suite for the BunSQL Kysely dialect using Bun's native test runner.

## Prerequisites

1. **PostgreSQL Database**: The tests require a PostgreSQL database
2. **Bun**: Make sure you have Bun installed (version >= 1.0.0)
3. **Environment Variables**: Set up your database connection via `.env` file

## Setup

### 1. Database Configuration

Create a `.env` file in the project root with your database URL:

```env
DATABASE_URL=postgres://admin@localhost:5434/test
```

Or if you need a password:

```env
DATABASE_URL=postgres://admin:password@localhost:5434/test
```

### 2. Setup PostgreSQL Database

You can use Docker to quickly set up a PostgreSQL instance:

```bash
docker run --name kysely-test-postgres \
  -e POSTGRES_DB=test \
  -e POSTGRES_USER=admin \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  -p 5434:5432 \
  -d postgres:15
```

Or with password:

```bash
docker run --name kysely-test-postgres \
  -e POSTGRES_DB=test \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=your_password \
  -p 5434:5432 \
  -d postgres:15
```

Then update your `.env` file accordingly.

## Running Tests

Run all tests:

```bash
bun test
```

Run tests in watch mode:

```bash
bun test --watch
```

Run a specific test file:

```bash
bun test tests/bun-sql-dialect.test.ts
```

## Test Structure

- `test-setup.ts` - Contains the test setup utilities, database configuration, and helper functions
- `bun-sql-dialect.test.ts` - Main test suite covering all dialect functionality

## Key Features Tested

- ✅ Basic SQL operations (SELECT, INSERT, UPDATE, DELETE)
- ✅ Transactions and isolation levels
- ✅ Connection pooling
- ✅ Streaming results
- ✅ Returning clauses
- ✅ Parallel transaction handling
- ✅ Connection management

## Environment Variables

The tests use the following environment variables:

- `DATABASE_URL` - PostgreSQL connection URL (required)

Bun automatically loads `.env` files, so no additional configuration is needed.

## Converting from Mocha/Chai

This test suite has been converted from Mocha/Chai to use Bun's native test runner:

- `describe()` → `describe()`
- `it()` → `test()`
- `before()` → `beforeAll()`
- `beforeEach()` → `beforeEach()`
- `after()` → `afterAll()`
- `afterEach()` → `afterEach()`
- `chai.expect()` → `expect()` (Bun's built-in)
- `chai-subset` → Custom `expectToContainSubset()` helper

The tests maintain the same functionality while leveraging Bun's faster test execution and built-in assertions.
