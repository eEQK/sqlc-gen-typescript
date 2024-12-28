import { expect, it } from "bun:test";
import { db, gen, prepare, sql } from "../case";

await prepare(sql`
    -- name: Foo_stuff :one
    SELECT 1 + 1;

    -- name: Bar_stuff :one
    SELECT 1 + 2;
`);

it("wraps with namespaces", () => {
	expect(gen().Foo.stuff(db)).resolves.toBe(2);
	expect(gen().Bar.stuff(db)).resolves.toBe(3);
});
