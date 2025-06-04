import { promises as fs } from "fs";
import { FileMigrationProvider, Migrator } from "kysely";
import * as path from "path";
import { db } from "../database";

export async function runMigrations() {
  console.log("\n📈 Running migrations from scratch...");

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      // This needs to be an absolute path.
      migrationFolder: path.join(__dirname, "../migrations"),
    }),
  });

  const { error: upError, results: upResults } =
    await migrator.migrateToLatest();

  upResults?.forEach((it) => {
    if (it.status === "Success") {
      console.log(
        `✅ migration "${it.migrationName}" was executed successfully`
      );
    } else if (it.status === "Error") {
      console.error(`❌ failed to execute migration "${it.migrationName}"`);
    }
  });

  if (upError) {
    console.error("❌ failed to migrate");
    console.error(upError);
    throw upError;
  }

  console.log("✅ All migrations completed successfully");
}
