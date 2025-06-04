import { CompiledQuery } from "kysely";
import type {
  DatabaseConnection,
  QueryResult,
  TransactionSettings,
} from "kysely";
import { BunSQLDialectError } from "./errors.js";

export class BunSQLConnection implements DatabaseConnection {
  #reservedConnection: any; // Using any for Bun SQL instance

  constructor(reservedConnection: any) {
    this.#reservedConnection = reservedConnection;
  }

  async beginTransaction(settings: TransactionSettings): Promise<void> {
    const { isolationLevel } = settings;

    // Bun SQL uses sql.begin() for transactions, but for manual control we'll use raw SQL
    const isolationClause = isolationLevel
      ? ` isolation level ${isolationLevel}`
      : "";
    const beginSQL = `begin${isolationClause}`;

    await this.#reservedConnection.unsafe(beginSQL);
  }

  async commitTransaction(): Promise<void> {
    await this.#reservedConnection.unsafe("commit");
  }

  async executeQuery<R>(
    compiledQuery: CompiledQuery<unknown>
  ): Promise<QueryResult<R>> {
    try {
      // Use unsafe with parameters for compiled queries
      const result = await this.#reservedConnection.unsafe(
        compiledQuery.sql,
        compiledQuery.parameters as any[]
      );

      // Bun SQL returns different result structure than postgres.js
      // For INSERT/UPDATE/DELETE, we need to check if the result has metadata
      const rows = Array.isArray(result) ? result : [];

      // For DML operations, try to extract affected rows count
      // Bun SQL might return metadata differently, so we'll handle it gracefully
      if (typeof (result as any)?.changes === "number") {
        const numAffectedRows = BigInt((result as any).changes);
        return { numAffectedRows, rows };
      }

      return { rows };
    } catch (error) {
      // Re-throw with more context if needed
      throw error;
    }
  }

  releaseConnection(): void {
    // For Bun SQL reserved connections, we need to call release()
    if (this.#reservedConnection && "release" in this.#reservedConnection) {
      this.#reservedConnection.release();
    }
    this.#reservedConnection = null!;
  }

  async rollbackTransaction(): Promise<void> {
    await this.#reservedConnection.unsafe("rollback");
  }

  async *streamQuery<R>(
    compiledQuery: CompiledQuery<unknown>,
    chunkSize: number
  ): AsyncIterableIterator<QueryResult<R>> {
    if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
      throw new BunSQLDialectError("chunkSize must be a positive integer");
    }

    // Bun SQL doesn't have built-in cursor support like postgres.js
    // We'll implement a simple streaming approach using LIMIT/OFFSET
    let offset = 0;

    while (true) {
      const paginatedSQL = `${compiledQuery.sql} LIMIT ${chunkSize} OFFSET ${offset}`;

      const rows = await this.#reservedConnection.unsafe(
        paginatedSQL,
        compiledQuery.parameters as any[]
      );

      if (!rows || rows.length === 0) {
        break;
      }

      yield { rows };

      if (rows.length < chunkSize) {
        break;
      }

      offset += chunkSize;
    }
  }
}
