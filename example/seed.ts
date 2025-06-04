import { db } from "./database";

export async function seed() {
  console.log("🌱 Running custom seeds...");

  // Example seed data - customize this for your needs
  try {
    // Insert sample users
    const users = await db
      .insertInto("users")
      .values([
        {
          name: "Alice Johnson",
          email: "alice@example.com",
          active: true,
        },
        {
          name: "Charlie Brown",
          email: "charlie@example.com",
          active: true,
        },
        {
          name: "Diana Prince",
          email: "diana@example.com",
          active: false,
        },
      ])
      .returningAll()
      .execute();

    console.log(`👤 Created ${users.length} sample users`);

    // Insert sample posts
    if (users.length > 0) {
      const posts = await db
        .insertInto("posts")
        .values([
          {
            title: "Advanced Database Patterns",
            content: "Learn about advanced patterns for database design...",
            user_id: users[0]!.id,
          },
          {
            title: "TypeScript Best Practices",
            content:
              "Here are some best practices for TypeScript development...",
            user_id: users[1]!.id,
          },
          {
            title: "Building Scalable APIs",
            content: "Tips for building APIs that can scale...",
            user_id: users[0]!.id,
          },
        ])
        .returningAll()
        .execute();

      console.log(`📝 Created ${posts.length} sample posts`);
    }

    console.log("✅ Custom seeding completed successfully");
  } catch (error) {
    console.error("❌ Failed to run custom seeds:");
    console.error(error);
    throw error;
  }
}

// Run seeds if this file is executed directly
if (import.meta.main) {
  seed()
    .then(() => {
      console.log("Seeding completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}
