import { type ColumnType, type Generated } from "kysely";
import { db, sql } from "./database";

// Define your database schema
interface Database {
  users: UsersTable;
  posts: PostsTable;
}

interface UsersTable {
  id: Generated<number>;
  name: string;
  email: string;
  active: boolean;
  created_at: ColumnType<Date, string | undefined, never>;
}

interface PostsTable {
  id: Generated<number>;
  title: string;
  content: string;
  user_id: number;
  created_at: ColumnType<Date, string | undefined, never>;
}

async function main() {
  // Use the database instance from our database.ts
  // const db is already imported above

  try {
    // Example queries
    console.log("Fetching active users...");
    const activeUsers = await db
      .selectFrom("users")
      .select(["id", "name", "email"])
      .where("active", "=", true)
      .execute();

    console.log("Active users:", activeUsers);

    // Insert a new user
    console.log("Creating a new user...");
    const newUser = await db
      .insertInto("users")
      .values({
        name: "Alice Smith",
        email: "alice@example.com",
        active: true,
      })
      .returningAll()
      .executeTakeFirst();

    console.log("Created user:", newUser);

    // Update user
    if (newUser) {
      console.log("Updating user...");
      await db
        .updateTable("users")
        .set({ name: "Alice Johnson" })
        .where("id", "=", newUser.id)
        .execute();
    }

    // Transaction example
    console.log("Running transaction...");
    await db.transaction().execute(async (trx) => {
      const user = await trx
        .insertInto("users")
        .values({
          name: "Bob Wilson",
          email: "bob@example.com",
          active: true,
        })
        .returningAll()
        .executeTakeFirst();

      if (user) {
        await trx
          .insertInto("posts")
          .values({
            title: "My First Post",
            content: "Hello, world!",
            user_id: user.id,
          })
          .execute();
      }
    });

    console.log("Transaction completed successfully!");

    // Join query
    console.log("Fetching users with their posts...");
    const usersWithPosts = await db
      .selectFrom("users")
      .innerJoin("posts", "posts.user_id", "users.id")
      .select([
        "users.id",
        "users.name",
        "users.email",
        "posts.title as post_title",
        "posts.content as post_content",
      ])
      .execute();

    console.log("Users with posts:", usersWithPosts);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    // Clean up
    await sql.close();
  }
}

// Run the example
if (import.meta.main) {
  main().catch(console.error);
}
