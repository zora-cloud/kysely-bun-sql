import { db } from "../database";

export async function runSeeds() {
  console.log("\n🌱 Running seeds...");

  try {
    // Check if a separate seed file exists
    try {
      const seedModule = await import("../seed");
      if (seedModule && typeof seedModule.seed === "function") {
        await seedModule.seed();
        console.log("✅ Database seeded successfully using seed.ts");
        return;
      }
    } catch (importError) {
      // Seed file doesn't exist, run basic seeds inline
      console.log("📝 No seed.ts file found, running basic example seeds...");
    }

    // Basic seed data
    await db
      .insertInto("users")
      .values([
        {
          name: "John Doe",
          email: "john@example.com",
          active: true,
        },
        {
          name: "Jane Smith",
          email: "jane@example.com",
          active: true,
        },
        {
          name: "Bob Wilson",
          email: "bob@example.com",
          active: false,
        },
      ])
      .execute();

    console.log("👤 Created sample users");

    // Get user IDs for posts
    const users = await db.selectFrom("users").select("id").execute();

    if (users && users.length > 0) {
      await db
        .insertInto("posts")
        .values([
          {
            title: "Welcome to the Blog",
            content: "This is our first blog post!",
            user_id: users[0]!.id,
          },
          {
            title: "Getting Started with Kysely",
            content: "Kysely is a great TypeScript SQL query builder...",
            user_id: users[1]!.id,
          },
        ])
        .execute();

      console.log("📝 Created sample posts");
    }

    console.log("✅ Basic seeding completed successfully");
  } catch (seedError) {
    console.error("❌ Failed to seed database:");
    console.error(seedError);
    throw seedError;
  }
}
