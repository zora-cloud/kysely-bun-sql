import { runMigrations } from "../reset/run-migrations";
import { db } from "../database";

async function main() {
  try {
    await runMigrations();
  } catch (error) {
    console.error("Failed to run migrations:", error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
