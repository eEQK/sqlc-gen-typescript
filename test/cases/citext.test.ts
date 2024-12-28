import { expect, it, describe } from "bun:test";
import { db, gen, prepare, sql } from "../case";

await prepare(sql`
    -- name: GetEmails :one
    SELECT * FROM emails limit 1;
`);

describe("citext", () => {
	it("resolves citext to string", async () => {
		const result = await gen().getEmails(db);
		expect(result.em1).toBe("foo@gmail.com");
		expect(result.em1).toBeTypeOf("string");
	});

	it("resolves custom domain to string", async () => {
		const result = await gen().getEmails(db);
		expect(result.em2).toBe("foo+1@gmail.com");
		expect(result.em2).toBeTypeOf("string");
	});
});
