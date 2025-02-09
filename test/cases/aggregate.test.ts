import { expect, it, describe } from "bun:test";
import { db, prepare, sql } from "../case";
import { aggEmails } from "./aggregate_sql";

await prepare(sql`
    -- name: AggEmails :one
    SELECT array_agg(e.id::text)::text[] AS emails FROM emails e;
`);

describe("aggregation", () => {
	it("returns an array type", async () => {
		// this should not have any LSP error
		const result = (await aggEmails(db)) as string[];

		expect(result).toHaveLength(3);
		expect(Array.isArray(result)).toBe(true);
	});
});
