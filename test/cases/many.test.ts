import { db, gen, prepare, sql } from "../case";
import { describe, expect, it } from "bun:test";

await prepare(sql`
    -- name: GetAuthors :many
    select * from authors;
    -- name: GetAuthorIdName :many
    select id, name from authors limit 3;
    -- name: GetAuthorId :many
    select id from authors limit 3;
`);

describe(":many", () => {
	it("returns complex objects", async () => {
		const result = await gen().getAuthors(db);
		expect(result.length).toBeGreaterThan(5);
		expect(result[0]).toMatchObject({
			id: 1,
			name: "John Doe",
			bio: "A mysterious author",
		});
	});

	it("returns complex specific fields", async () => {
		const result = await gen().getAuthorIdName(db);
		expect(result[0]).toMatchObject({
			id: 1,
			name: "John Doe",
		});
	});

	it("returns a specific field array", async () => {
		const result = await gen().getAuthorId(db);
		expect(result).toEqual([1, 2, 3]);
	});
});
