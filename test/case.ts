import postgres from "postgres";

export const sql = String.raw;

export async function prepare(sql: string) {
	const args = process.argv.slice(2);

	if (args.length !== 0 && args[0] === "prepare") {
		const tsPath = process.argv[1];
		const sqlPath = tsPath.replace(/\.test.ts$/, ".sql");

		const trimmed = sql
			.split("\n")
			.map((l) => l.trim())
			.join("\n");

		await Bun.write(sqlPath, trimmed);

		process.exit(0);
	}
}

export const db = postgres(
	"postgres://test:test@localhost:5439/test?sslmode=disable",
);

export function gen() {
	// biome-ignore lint/style/noNonNullAssertion: this is a test
	const callerPath = new Error().stack
		?.split("\n")
		.slice(2, 3)[0]
		.split("(")[1]
		.split(":")[0]!;
	return require(callerPath.replace(/\.test\.ts$/, "_sql.ts"));
}
