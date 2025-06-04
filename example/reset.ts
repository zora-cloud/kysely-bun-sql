import { dropAllTables } from "./reset/drop-tables";
import { runMigrations } from "./reset/run-migrations";
import { runSeeds } from "./reset/run-seeds";
import { db } from "./database";

async function resetDatabase() {
  console.log("🔄 Starting database reset...");

  try {
    // Step 1: Drop all tables and schemas
    await dropAllTables();

    // Step 2: Run all migrations from scratch
    await runMigrations();

    // Step 3: Run seeds (optional)
    await runSeeds();

    console.log("\n🎉 Database reset completed successfully!");
  } catch (error) {
    console.error("❌ Database reset failed:");
    console.error(error);
    process.exit(1);
  } finally {
    // Clean up database connection
    await db.destroy();
  }
}

// Run the reset if this file is executed directly
if (import.meta.main) {
  resetDatabase().catch(console.error);
}

export { resetDatabase };
