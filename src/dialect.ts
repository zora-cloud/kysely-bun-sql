import {
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
} from "kysely";
import type {
  DatabaseIntrospector,
  Dialect,
  DialectAdapter,
  Driver,
  Kysely,
  QueryCompiler,
} from "kysely";

import { BunSQLDriver } from "./driver.js";
import type { BunSQLDialectConfig } from "./types.js";
import { freeze } from "./utils.js";

export class BunSQLDialect implements Dialect {
  readonly #config: BunSQLDialectConfig;

  constructor(config: BunSQLDialectConfig) {
    this.#config = freeze({ ...config });
  }

  createAdapter(): DialectAdapter {
    return new PostgresAdapter();
  }

  createDriver(): Driver {
    return new BunSQLDriver(this.#config);
  }

  createIntrospector(db: Kysely<any>): DatabaseIntrospector {
    return new PostgresIntrospector(db);
  }

  createQueryCompiler(): QueryCompiler {
    return new PostgresQueryCompiler();
  }
}
