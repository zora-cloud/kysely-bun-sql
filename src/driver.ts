import type { Driver, TransactionSettings } from "kysely";
import { BunSQLConnection } from "./connection.js";
import type { BunSQLDialectConfig } from "./types.js";
import { freeze } from "./utils.js";

export class BunSQLDriver implements Driver {
  readonly #config: BunSQLDialectConfig;

  constructor(config: BunSQLDialectConfig) {
    this.#config = freeze({ ...config });
  }

  async init(): Promise<void> {
    // noop - Bun SQL doesn't require explicit initialization
  }

  async acquireConnection(): Promise<BunSQLConnection> {
    // For Bun SQL, we need to reserve a connection from the pool
    const reservedConnection = await this.#config.sql.reserve();
    return new BunSQLConnection(reservedConnection);
  }

  async beginTransaction(
    connection: BunSQLConnection,
    settings: TransactionSettings
  ): Promise<void> {
    await connection.beginTransaction(settings);
  }

  async commitTransaction(connection: BunSQLConnection): Promise<void> {
    await connection.commitTransaction();
  }

  async rollbackTransaction(connection: BunSQLConnection): Promise<void> {
    await connection.rollbackTransaction();
  }

  async releaseConnection(connection: BunSQLConnection): Promise<void> {
    connection.releaseConnection();
  }

  async destroy(): Promise<void> {
    // Close the Bun SQL connection pool
    await this.#config.sql.close();
  }
}
