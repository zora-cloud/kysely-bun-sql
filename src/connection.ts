import { CompiledQuery } from "kysely";
import type {
  DatabaseConnection,
  QueryResult,
  TransactionSettings,
} from "kysely";
import { BunSQLDialectError } from "./errors.js";

export class BunSQLConnection implements DatabaseConnection {
  #reservedConnection: any; // Using any for Bun SQL reserved connection instance

  constructor(reservedConnection: any) {
    this.#reservedConnection = reservedConnection;
  }

  async beginTransaction(settings: TransactionSettings): Promise<void> {
    const { isolationLevel } = settings;

    // For Bun SQL, we need to handle transactions differently
    // Since we're using a reserved connection, we'll use raw SQL for transaction control
    const isolationClause = isolationLevel
      ? ` isolation level ${isolationLevel}`
      : "";
    const beginSQL = `start transaction${isolationClause}`;

    // Execute transaction command through the same path as regular queries
    // to ensure it gets logged properly
    await this.executeQuery({
      sql: beginSQL,
      parameters: [],
      query: null,
      queryId: "transaction-begin",
    } as unknown as CompiledQuery<unknown>);
  }

  async commitTransaction(): Promise<void> {
    // Execute commit through the same path as regular queries
    await this.executeQuery({
      sql: "commit",
      parameters: [],
      query: null,
      queryId: "transaction-commit",
    } as unknown as CompiledQuery<unknown>);
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

      // Bun.SQL returns SQLResultArray objects which are arrays with additional properties
      // For all queries: result has rows as array elements
      // For DML queries: result.count contains affected rows count

      const rows = Array.isArray(result) ? (result as R[]) : [];

      // Extract metadata from SQLResultArray
      let numAffectedRows: bigint | undefined = undefined;

      // Check for count property (affected rows)
      if (result && typeof result === "object" && "count" in result) {
        const count = (result as any).count;
        if (typeof count === "number") {
          numAffectedRows = BigInt(count);
        }
      }

      return {
        rows,
        ...(numAffectedRows !== undefined && { numAffectedRows }),
      };
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
    // Execute rollback through the same path as regular queries
    await this.executeQuery({
      sql: "rollback",
      parameters: [],
      query: null,
      queryId: "transaction-rollback",
    } as unknown as CompiledQuery<unknown>);
  }

  async *streamQuery<R>(
    compiledQuery: CompiledQuery<unknown>,
    chunkSize: number
  ): AsyncIterableIterator<QueryResult<R>> {
    if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
      throw new BunSQLDialectError("chunkSize must be a positive integer");
    }

    // For streaming, we need to determine if this is a query that supports LIMIT/OFFSET
    const sql = compiledQuery.sql.toLowerCase().trim();
    const hasLimit = sql.includes("limit");
    const hasOffset = sql.includes("offset");

    // Check if this is a DML query (INSERT/UPDATE/DELETE) which can't have LIMIT/OFFSET appended
    const isDMLQuery =
      sql.startsWith("insert ") ||
      sql.startsWith("update ") ||
      sql.startsWith("delete ");

    if (hasLimit || hasOffset || isDMLQuery) {
      // For queries that already have LIMIT/OFFSET or are DML queries,
      // execute the query as-is and return all results in chunks
      const result = await this.#reservedConnection.unsafe(
        compiledQuery.sql,
        compiledQuery.parameters as any[]
      );

      const rows = Array.isArray(result) ? result : result?.rows || [];

      // Split results into chunks
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        yield { rows: chunk };
      }
      return;
    }

    // For SELECT queries without LIMIT/OFFSET, implement cursor-based pagination
    let offset = 0;

    while (true) {
      // Add LIMIT and OFFSET to the original query
      const paginatedSQL = `${compiledQuery.sql} LIMIT ${chunkSize} OFFSET ${offset}`;

      const result = await this.#reservedConnection.unsafe(
        paginatedSQL,
        compiledQuery.parameters as any[]
      );

      const rows = Array.isArray(result) ? result : result?.rows || [];

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
