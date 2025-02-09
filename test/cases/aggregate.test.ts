import { expect, it, describe } from "bun:test";
import { db, prepare, sql } from "../case";
await prepare(sql`
    -- name: AggEmailsOne :one
    SELECT array_agg(e.id)::text[] AS emails FROM emails e;

    -- name: AggEmailsWithoutCastOne :one
    SELECT array_agg(e.id) AS emails FROM emails e;

    -- name: AggEmailsMany :many
    SELECT 1 as foo, array_agg(e.id)::text[] AS emails FROM emails e;

    -- name: AggEmailsWithoutCastMany :many
    SELECT 1 as foo, array_agg(e.id) AS emails FROM emails e;
`);

describe("aggregation", () => {
	it("returns an array type in One mode", async () => {
		const result = await (await import("./aggregate_sql")).aggEmailsOne(db);

		result as string[];

		expect(result).toHaveLength(3);
		expect(Array.isArray(result)).toBe(true);
	});

	it("returns an array type in Many mode", async () => {
		const result = await (await import("./aggregate_sql")).aggEmailsMany(db);

		result[0].emails as string[];

		expect(result[0].emails).toHaveLength(3);
		expect(Array.isArray(result)).toBe(true);
	});

	it("returns an array type in a query without type cast in One mode", async () => {
		const result = await (
			await import("./aggregate_sql")
		).aggEmailsWithoutCastOne(db);

		result as string[];

		expect(result).toHaveLength(3);
		expect(Array.isArray(result)).toBe(true);
	});

	it("returns an array type in a query without type cast in Many mode", async () => {
		const result = await (
			await import("./aggregate_sql")
		).aggEmailsWithoutCastMany(db);

		result[0].emails as string[];

		expect(result[0].emails).toHaveLength(3);
		expect(Array.isArray(result)).toBe(true);
	});
});
