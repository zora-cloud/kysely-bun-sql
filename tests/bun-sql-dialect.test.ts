import {
  describe,
  test,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  expect,
} from "bun:test";
import {
  CompiledQuery,
  DeleteResult,
  InsertResult,
  UpdateResult,
  sql,
  type Kysely,
  type Transaction,
} from "kysely";

import {
  DEFAULT_DATA_SET,
  POOL_SIZE,
  clearDatabase,
  destroyTest,
  initTest,
  insertDefaultDataSet,
  insertPersons,
  testSql,
  expectToContainSubset,
  type Database,
  type Person,
  type TestContext,
} from "./test-setup";

describe("BunSQLDialect", () => {
  let ctx: TestContext;
  const executedQueries: CompiledQuery[] = [];

  beforeAll(async () => {
    ctx = await initTest((event) => {
      if (event.level === "query") {
        executedQueries.push(event.query);
      }
    });
  });

  beforeEach(async () => {
    await clearDatabase(ctx);
    await insertDefaultDataSet(ctx);
    executedQueries.length = 0;
  });

  afterEach(async () => {
    await clearDatabase(ctx);
  });

  afterAll(async () => {
    await destroyTest(ctx);
  });

  test("should select one column", async () => {
    const query = ctx.db
      .selectFrom("person")
      .select("last_name")
      .where("first_name", "=", "Jennifer");

    testSql(query, {
      sql: 'select "last_name" from "person" where "first_name" = $1',
      parameters: ["Jennifer"],
    });

    const persons = await query.execute();

    expect(persons).toHaveLength(1);
    expect(persons).toEqual([{ last_name: "Aniston" }]);
  });

  test("should work with withSchema", async () => {
    // First, insert a toy in the main schema
    const pet = await ctx.db
      .selectFrom("pet")
      .select("id")
      .executeTakeFirstOrThrow();

    await ctx.db
      .insertInto("toy")
      .values({
        name: "Main Schema Ball",
        pet_id: pet.id,
        price: 10.99,
      })
      .execute();

    // Insert a toy in the toy_schema using withSchema
    const insertQuery = ctx.db
      .withSchema("toy_schema")
      .insertInto("toy")
      .values({
        name: "Schema Ball",
        pet_id: pet.id,
        price: 15.99,
      });

    testSql(insertQuery, {
      sql: 'insert into "toy_schema"."toy" ("name", "pet_id", "price") values ($1, $2, $3)',
      parameters: ["Schema Ball", pet.id, 15.99],
    });

    await insertQuery.execute();

    // Test querying from the schema
    const selectQuery = ctx.db
      .withSchema("toy_schema")
      .selectFrom("toy")
      .select(["name", "price"])
      .where("name", "=", "Schema Ball");

    testSql(selectQuery, {
      sql: 'select "name", "price" from "toy_schema"."toy" where "name" = $1',
      parameters: ["Schema Ball"],
    });

    const schemaToys = await selectQuery.execute();

    expect(schemaToys).toHaveLength(1);
    expect(schemaToys[0]).toEqual({
      name: "Schema Ball",
      price: 15.99,
    });

    // Test that regular queries still work and don't see schema data
    const mainToys = await ctx.db
      .selectFrom("toy")
      .select(["name", "price"])
      .execute();

    expect(mainToys).toHaveLength(1);
    expect(mainToys[0]).toEqual({
      name: "Main Schema Ball",
      price: 10.99,
    });
  });

  test("should run multiple transactions in parallel", async () => {
    const threads = Array.from({ length: 25 }).map((_, index) => ({
      id: 1000000 + index + 1,
      fails: Math.random() < 0.5,
    }));

    const results = await Promise.allSettled(
      threads.map((thread) => executeThread(thread.id, thread.fails))
    );

    for (let i = 0; i < threads.length; ++i) {
      const thread = threads[i];
      if (!thread) continue;

      const [personExists, petExists] = await Promise.all([
        doesPersonExists(thread.id),
        doesPetExists(thread.id),
      ]);

      const result = results[i]!;

      if (thread.fails) {
        expect(personExists).toBe(false);
        expect(petExists).toBe(false);
        expect(result.status).toBe("rejected");
      } else {
        expect(personExists).toBe(true);
        expect(petExists).toBe(true);
        expect(result.status).toBe("fulfilled");
      }
    }

    async function executeThread(id: number, fails: boolean): Promise<void> {
      await ctx.db.transaction().execute(async (trx) => {
        await insertPerson(trx, id);
        await insertPet(trx, id);

        if (fails) {
          throw new Error();
        }
      });
    }
  });

  test("should set the transaction isolation level", async () => {
    await ctx.db
      .transaction()
      .setIsolationLevel("serializable")
      .execute(async (trx) => {
        await trx
          .insertInto("person")
          .values({
            first_name: "Foo",
            last_name: "Barson",
            gender: "male",
          })
          .execute();
      });

    expect(
      executedQueries.map((it) => ({
        sql: it.sql,
        parameters: it.parameters,
      }))
    ).toEqual([
      {
        sql: "start transaction isolation level serializable",
        parameters: [],
      },
      {
        sql: 'insert into "person" ("first_name", "last_name", "gender") values ($1, $2, $3)',
        parameters: ["Foo", "Barson", "male"],
      },
      { sql: "commit", parameters: [] },
    ]);
  });

  test("should be able to start a transaction with a single connection", async () => {
    const result = await ctx.db.connection().execute((db) => {
      return db.transaction().execute((trx) => {
        return trx
          .insertInto("person")
          .values({
            first_name: "Foo",
            last_name: "Barson",
            gender: "male",
          })
          .returning("first_name")
          .executeTakeFirstOrThrow();
      });
    });

    expect(result.first_name).toBe("Foo");
  });

  test("should stream results", async () => {
    const males: unknown[] = [];

    const stream = ctx.db
      .selectFrom("person")
      .select(["first_name", "last_name", "gender"])
      .where("gender", "=", "male")
      .orderBy("first_name")
      .stream();

    for await (const male of stream) {
      males.push(male);
    }

    expect(males).toHaveLength(2);
    expect(males).toEqual([
      {
        first_name: "Arnold",
        last_name: "Schwarzenegger",
        gender: "male",
      },
      {
        first_name: "Sylvester",
        last_name: "Stallone",
        gender: "male",
      },
    ]);
  });

  test("should stream results with a specific chunk size", async () => {
    const males: unknown[] = [];

    const stream = ctx.db
      .selectFrom("person")
      .select(["first_name", "last_name", "gender"])
      .where("gender", "=", "male")
      .orderBy("first_name")
      .stream(1);

    for await (const male of stream) {
      males.push(male);
    }

    expect(males).toHaveLength(2);
    expect(males).toEqual([
      {
        first_name: "Arnold",
        last_name: "Schwarzenegger",
        gender: "male",
      },
      {
        first_name: "Sylvester",
        last_name: "Stallone",
        gender: "male",
      },
    ]);
  });

  test("should release connection on premature async iterator stop", async () => {
    for (let i = 0; i <= POOL_SIZE + 1; i++) {
      const stream = ctx.db.selectFrom("person").selectAll().stream();

      for await (const _ of stream) {
        break;
      }
    }
  });

  test("should release connection on premature async iterator stop when using a specific chunk size", async () => {
    for (let i = 0; i <= POOL_SIZE + 1; i++) {
      const stream = ctx.db.selectFrom("person").selectAll().stream(1);

      for await (const _ of stream) {
        break;
      }
    }
  });

  test("should insert multiple rows", async () => {
    const query = ctx.db.insertInto("person").values([
      {
        first_name: "Foo",
        last_name: "Bar",
        gender: "other",
      },
      {
        first_name: "Baz",
        last_name: "Spam",
        gender: "other",
      },
    ]);

    testSql(query, {
      sql: 'insert into "person" ("first_name", "last_name", "gender") values ($1, $2, $3), ($4, $5, $6)',
      parameters: ["Foo", "Bar", "other", "Baz", "Spam", "other"],
    });

    const result = await query.executeTakeFirst();

    expect(result).toBeInstanceOf(InsertResult);
    if (result) {
      expect(result.numInsertedOrUpdatedRows).toBe(2n);
      expect(result.insertId).toBeUndefined();
    }

    const inserted = await ctx.db
      .selectFrom("person")
      .selectAll()
      .orderBy("id", "desc")
      .limit(2)
      .execute();

    expectToContainSubset(inserted, [
      { first_name: "Baz", last_name: "Spam", gender: "other" },
      { first_name: "Foo", last_name: "Bar", gender: "other" },
    ]);
  });

  test("should insert a row and return data using `returning`", async () => {
    const result = await ctx.db
      .insertInto("person")
      .values({
        gender: "other",
        first_name: ctx.db
          .selectFrom("person")
          .select(sql<string>`max(first_name)`.as("max_first_name")),
        last_name: sql`concat(cast(${"Bar"} as varchar), cast(${"son"} as varchar))`,
      })
      .returning(["first_name", "last_name", "gender"])
      .executeTakeFirst();

    expect(result).toEqual({
      first_name: "Sylvester",
      last_name: "Barson",
      gender: "other",
    });

    expect(await getNewestPerson(ctx.db)).toEqual({
      first_name: "Sylvester",
      last_name: "Barson",
    });
  });

  test("should insert multiple rows and stream returned results", async () => {
    const values: Array<{
      first_name: string;
      last_name: string;
      gender: "male" | "female";
    }> = [
      {
        first_name: "Moses",
        last_name: "Malone",
        gender: "male",
      },
      {
        first_name: "Erykah",
        last_name: "Badu",
        gender: "female",
      },
    ];

    const stream = ctx.db
      .insertInto("person")
      .values(values)
      .returning(["first_name", "last_name", "gender"])
      .stream();

    const people: Partial<Person>[] = [];

    for await (const person of stream) {
      people.push(person);
    }

    expect(people).toHaveLength(values.length);
    expect(people).toEqual(values);
  });

  test("should update one row", async () => {
    const query = ctx.db
      .updateTable("person")
      .set({ first_name: "Foo", last_name: "Barson" })
      .where("gender", "=", "female");

    testSql(query, {
      sql: 'update "person" set "first_name" = $1, "last_name" = $2 where "gender" = $3',
      parameters: ["Foo", "Barson", "female"],
    });

    const result = await query.executeTakeFirst();

    expect(result).toBeInstanceOf(UpdateResult);
    if (result) {
      expect(result.numUpdatedRows).toBe(1n);
    }

    expect(
      await ctx.db
        .selectFrom("person")
        .select(["first_name", "last_name", "gender"])
        .orderBy("first_name")
        .orderBy("last_name")
        .execute()
    ).toEqual([
      { first_name: "Arnold", last_name: "Schwarzenegger", gender: "male" },
      { first_name: "Foo", last_name: "Barson", gender: "female" },
      { first_name: "Sylvester", last_name: "Stallone", gender: "male" },
    ]);
  });

  test("should update some rows and return updated rows when `returning` is used", async () => {
    const query = ctx.db
      .updateTable("person")
      .set({ last_name: "Barson" })
      .where("gender", "=", "male")
      .returning(["first_name", "last_name"]);

    testSql(query, {
      sql: 'update "person" set "last_name" = $1 where "gender" = $2 returning "first_name", "last_name"',
      parameters: ["Barson", "male"],
    });

    const result = await query.execute();

    expect(result).toHaveLength(2);
    if (result[0]) {
      expect(Object.keys(result[0]).sort()).toEqual([
        "first_name",
        "last_name",
      ]);
    }
    expectToContainSubset(result, [
      { first_name: "Arnold", last_name: "Barson" },
      { first_name: "Sylvester", last_name: "Barson" },
    ]);
  });

  test("should update multiple rows and stream returned results", async () => {
    const stream = ctx.db
      .updateTable("person")
      .set({ last_name: "Nobody" })
      .returning(["first_name", "last_name", "gender"])
      .stream();

    const people: any[] = [];

    for await (const person of stream) {
      people.push(person);
    }

    expect(people).toHaveLength(DEFAULT_DATA_SET.length);
    expect(people).toEqual(
      DEFAULT_DATA_SET.map(({ first_name, gender }) => ({
        first_name,
        last_name: "Nobody",
        gender,
      }))
    );
  });

  test("should delete two rows", async () => {
    const query = ctx.db
      .deleteFrom("person")
      .where((eb) =>
        eb("first_name", "=", "Jennifer").or("first_name", "=", "Arnold")
      );

    const result = await query.executeTakeFirst();

    expect(result).toBeInstanceOf(DeleteResult);
    if (result) {
      expect(result.numDeletedRows).toBe(2n);
    }
  });

  test("should return deleted rows when `returning` is used", async () => {
    const query = ctx.db
      .deleteFrom("person")
      .where("gender", "=", "male")
      .returning(["first_name", "last_name as last"]);

    testSql(query, {
      sql: 'delete from "person" where "gender" = $1 returning "first_name", "last_name" as "last"',
      parameters: ["male"],
    });

    const result = await query.execute();

    expect(result).toHaveLength(2);
    if (result[0]) {
      expect(Object.keys(result[0]).sort()).toEqual(["first_name", "last"]);
    }
    expectToContainSubset(result, [
      { first_name: "Arnold", last: "Schwarzenegger" },
      { first_name: "Sylvester", last: "Stallone" },
    ]);
  });

  test("should delete all rows and stream returned results", async () => {
    const stream = ctx.db
      .deleteFrom("person")
      .returning(["first_name", "last_name", "gender"])
      .stream();

    const people: any[] = [];

    for await (const person of stream) {
      people.push(person);
    }

    expect(people).toHaveLength(DEFAULT_DATA_SET.length);
    expect(people).toEqual(
      DEFAULT_DATA_SET.map(({ first_name, last_name, gender }) => ({
        first_name,
        last_name,
        gender,
      }))
    );
  });

  async function insertPet(
    trx: Transaction<Database>,
    ownerId: number
  ): Promise<void> {
    await trx
      .insertInto("pet")
      .values({
        name: `Pet of ${ownerId}`,
        owner_id: ownerId,
        species: "cat",
      })
      .execute();
  }

  async function insertPerson(
    trx: Transaction<Database>,
    id: number
  ): Promise<void> {
    await trx
      .insertInto("person")
      .values({
        id: id,
        first_name: `Person ${id}`,
        last_name: null,
        gender: "other",
      })
      .execute();
  }

  async function doesPersonExists(id: number): Promise<boolean> {
    return !!(await ctx.db
      .selectFrom("person")
      .select("id")
      .where("id", "=", id)
      .where("first_name", "=", `Person ${id}`)
      .executeTakeFirst());
  }

  async function doesPetExists(ownerId: number): Promise<boolean> {
    return !!(await ctx.db
      .selectFrom("pet")
      .select("id")
      .where("owner_id", "=", ownerId)
      .where("name", "=", `Pet of ${ownerId}`)
      .executeTakeFirst());
  }

  async function getNewestPerson(
    db: Kysely<Database>
  ): Promise<Pick<Person, "first_name" | "last_name"> | undefined> {
    return await db
      .selectFrom("person")
      .select(["first_name", "last_name"])
      .where(
        "id",
        "=",
        db.selectFrom("person").select(sql<number>`max(id)`.as("max_id"))
      )
      .executeTakeFirst();
  }
});
