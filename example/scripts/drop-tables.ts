import { dropAllTables } from "../reset/drop-tables";

async function main() {
  try {
    await dropAllTables();
  } catch (error) {
    console.error("Failed to drop tables:", error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
