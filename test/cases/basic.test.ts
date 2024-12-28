import { db, gen, prepare, sql } from "../case";
import { expect, it } from "bun:test";

await prepare(sql`
    -- name: GetFirstAuthorId :one
    select id from authors where id = 1;
    -- name: Count :one
    select count(*) from (values (1), (4), (7)) as t(id);
    -- name: GetDate :one
    select born from authors where id = 1;
    -- name: Square :one
    select power(@a, 2);
`);

it("returns numbers from select", async () => {
	const result = await gen().getFirstAuthorId(db);
	expect(result).toBe(1);
	expect(result).toBeTypeOf("number");
});

it("returns numbers from functions", async () => {
	const result = await gen().count(db);
	expect(result).toBe(3);
	expect(result).toBeTypeOf("number");
});

it("returns dates from select", async () => {
	const result = await gen().getDate(db);
	expect(result).toEqual(new Date("1990-02-09T00:00:00.000Z"));
	expect(result).toBeTypeOf("object");
});

it("accepts parameters", async () => {
	const result = await gen().square(db, { a: 3 });
	expect(result).toBe(9);
	expect(result).toBeTypeOf("number");
});
