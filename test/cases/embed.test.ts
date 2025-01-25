import { describe, expect, it } from "bun:test";
import { db, gen, prepare, sql } from "../case";

await prepare(sql`
    -- name: GetEmailsWithAuthor :one
    SELECT e.*, sqlc.embed(a) FROM emails e
        join authors a on a.name = 'John Doe'
        limit 1;
`);

describe("sqlc.embed", () => {
	it("embeds an object", async () => {
		const result = await gen().getEmailsWithAuthor(db);
		console.log(result);
		expect(result.em1).toBe("foo@gmail.com");
		expect(result.em1).toBeTypeOf("string");
		expect(result.authors).toMatchObject({
			id: expect.any(Number),
			name: "John Doe",
			bio: "A mysterious author",
			born: new Date("1990-02-09"),
		});
	});
});
