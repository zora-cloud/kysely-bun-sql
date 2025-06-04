import { Kysely, type Generated, type ColumnType } from "kysely";
import { BunSQLDialect } from "../src/index";
import { SQL } from "bun";
import { z } from "zod/v4";

// Zod schemas for validation
export const UserSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  active: z.boolean().default(true),
  created_at: z.date().optional(),
});

export const PostSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1).max(255),
  content: z.string(),
  user_id: z.number(),
  created_at: z.date().optional(),
});

// Database table interfaces
export interface UsersTable {
  id: Generated<number>;
  name: string;
  email: string;
  active: boolean;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface PostsTable {
  id: Generated<number>;
  title: string;
  content: string;
  user_id: number;
  created_at: ColumnType<Date, string | undefined, never>;
}

// Database interface
export interface Database {
  users: UsersTable;
  posts: PostsTable;
}

// Get database URL from environment variables
// Defaults to a local PostgreSQL instance for development
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

console.log(
  `🔗 Connecting to database: ${databaseUrl.replace(/\/\/.*@/, "//***@")}`
);

// Create Bun SQL instance
export const sql = new SQL({
  url: databaseUrl,
  max: 10, // Maximum number of connections in the pool
  idleTimeout: 30, // Close idle connections after 30 seconds
});

// Create Kysely database instance with BunSQLDialect
export const db = new Kysely<Database>({
  dialect: new BunSQLDialect({
    sql: sql,
  }),
});

// Helper function to validate user data
export function validateUser(data: unknown) {
  return UserSchema.parse(data);
}

// Helper function to validate post data
export function validatePost(data: unknown) {
  return PostSchema.parse(data);
}
