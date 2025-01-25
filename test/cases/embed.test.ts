import { describe, expect, it } from "bun:test";
import { db, gen, prepare, sql } from "../case";

await prepare(sql`
    -- name: GetEmailsWithAuthor :one
    SELECT e.*, sqlc.embed(a) FROM emails e
        join authors a on a.name = 'John Doe'
        limit 1;

    -- name: AuthorExists :one
    SELECT 1::int as noPrimitiveReturn, exists(select 1 from authors where name = 'John Doe') as exists;
`);

describe("sqlc.embed", () => {
	it("embeds an object", async () => {
		const result = await gen().getEmailsWithAuthor(db);
		console.log(result);
		expect(result.em1).toBe("foo@gmail.com");
		expect(result.em1).toBeTypeOf("string");
		expect(result.author).toMatchObject({
			id: expect.any(Number),
			name: "John Doe",
			bio: "A mysterious author",
			born: new Date("1990-02-09"),
		});
	});

	it("only singularizes fields for embeds", async () => {
		const result = await gen().authorExists(db);
		console.log(result);
		expect(result.exists).toBe(true);
	});
});
