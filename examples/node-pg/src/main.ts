import { Pool } from "pg";

import { Read } from "./db/query1_sql";
import { Update } from "./db/query2_sql";

interface Author {
	id: string;
	name: string;
	bio: string | null;
}

async function main() {
	const client = new Pool({ connectionString: process.env["DATABASE_URL"] });
	await client.connect();

	// Create an author
	const author = await Update.createAuthor(client, {
		name: "Seal",
		bio: "Kissed from a rose",
	});
	if (author === null) {
		throw new Error("author not created");
	}
	console.log(author);

	// List the authors
	const authors = await Read.listAuthors(client);
	console.log(authors);

	// Get that author
	const seal = await Read.getAuthor(client, { id: author.id });
	if (seal === null) {
		throw new Error("seal not found");
	}
	console.log(seal);

	// Delete the author
	await Update.deleteAuthor(client, { id: seal.id });
}

(async () => {
	try {
		await main();
		process.exit(0);
	} catch (e) {
		console.error(e);
		process.exit(1);
	}
})();
