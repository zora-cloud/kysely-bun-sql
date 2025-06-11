import type { Dialect } from "kysely";
import type { SQL as BunSQL } from "bun";

export interface BunSQLDialectConfig {
  readonly sql: BunSQL;
}

export class BunSQLDialect implements Dialect {
  constructor(config: BunSQLDialectConfig);
  createDriver(): any;
  createQueryCompiler(): any;
  createAdapter(): any;
  createIntrospector(db: any): any;
}

// Re-export everything from the main implementation
export * from "./src/index";
