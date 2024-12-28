import { db, gen, prepare, sql } from "../case";
import { expect, test } from "bun:test";

await prepare(sql`
    -- name: Sum :one
    select 1 + 1;

    -- name: Count :one
    select count(*) from (values (1), (4), (7)) as t(id);

    -- name: Square :one
    select power(@a, 2);
`);

test("returns simple values", async () => {
	const result = await gen().sum(db);
	expect(result).toBe(2);
	expect(result).toBeTypeOf("number");
});

test("returns simple values from functions", async () => {
	const result = await gen().count(db);
	expect(result).toBe(3);
	expect(result).toBeTypeOf("number");
});

test("accepts parameters", async () => {
	const result = await gen().square(db, { a: 3 });
	expect(result).toBe(9);
	expect(result).toBeTypeOf("number");
});
