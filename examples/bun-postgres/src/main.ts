import postgres from "postgres";

import { Read } from "./db/query1_sql";
import { Update } from "./db/query2_sql";

async function main() {
  const sql = postgres(process.env["DATABASE_URL"] ?? "");

  // Create an author
  const author = await Update.createAuthor(sql, {
    name: "Seal",
    bio: "Kissed from a rose",
  });
  if (author === null) {
    throw new Error("author not created");
  }
  console.log(author);

  // List the authors
  const authors = await Read.listAuthors(sql);
  console.log(authors);

  // Get that author
  const seal = await Read.getAuthor(sql, { id: author.id });
  if (seal === null) {
    throw new Error("seal not found");
  }
  console.log(seal);

  // Delete the author
  await Update.deleteAuthor(sql, { id: seal.id });
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
