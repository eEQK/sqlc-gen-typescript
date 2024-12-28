import { $ } from "bun";
import { db } from "./case";

const ls = await $`ls -1 cases/*.test.ts`;
const cases = ls
	.text()
	.split("\n")
	.filter((c) => c.length > 0);

for (const c of cases) {
	await $`bun run ${c} prepare`;
}

const dbStatus = await $`pg_isready -h localhost -p 5439`;
if (dbStatus.exitCode !== 0) {
    // when running in CI, the database will be up already
    await $`docker compose up -d`;
}

await $`sqlc generate`;

await db.file("schema.sql");
await db.end();
