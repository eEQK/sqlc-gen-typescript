import { expect, it, describe } from "bun:test";
import { db, gen, prepare, sql } from "../case";
await prepare(sql`
    -- name: AggEmails :one
    SELECT array_agg(e.id::text)::text[] AS emails FROM emails e;
`);

describe("aggregation", () => {
	it("returns an array type", async () => {
		const result = await gen().aggEmails(db);

		expect(result).toHaveLength(3);
		expect(Array.isArray(result)).toBe(true);
	});
});
