import { runSeeds } from "../reset/run-seeds";
import { db } from "../database";

async function main() {
  try {
    await runSeeds();
  } catch (error) {
    console.error("Failed to run seeds:", error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
