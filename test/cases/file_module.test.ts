import { expect, it } from "bun:test";
import { db, gen, prepare, sql } from "../case";

await prepare(sql`
    --@namespace Queries

    -- name: q1 :one
    SELECT 1 + 1;
    -- name: q2 :one
    SELECT 1 + 2;
    -- name: Queries_q3 :one
    SELECT 1 + 3;
    -- name: Queries_Nested_q4 :one
    SELECT 1 + 4;
`);

it("wraps with file-wide namespace", () => {
	expect(gen().Queries.q1(db)).resolves.toBe(2);
	expect(gen().Queries.q2(db)).resolves.toBe(3);
	expect(gen().Queries.q3(db)).resolves.toBe(4);
	expect(gen().Queries.Nested.q4(db)).resolves.toBe(5);
});
