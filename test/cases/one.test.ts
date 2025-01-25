import { describe, expect, it } from "bun:test";
import { db, gen, prepare, sql } from "../case";

await prepare(sql`
    -- name: GetSomeAuthor :one
    select * from authors limit 1;
    -- name: GetAuthorById :one
    select * from authors where id = @id;
`);

describe(":one", () => {
	it("returns complex objects", async () => {
		const result = await gen().getSomeAuthor(db);
		expect(result).toMatchObject({
			id: 1,
			name: "John Doe",
			bio: "A mysterious author",
		});
	});

	it("returns null if no results found", async () => {
		const result = await gen().getAuthorById(db, { id: 999 });
		expect(result).toBe(null);
	});
});
