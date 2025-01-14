// Code generated by sqlc. DO NOT EDIT.

import type { Sql } from "postgres";

export namespace Update {
    const deleteAuthorQuery = `-- name: Update_DeleteAuthor :exec
DELETE FROM authors
WHERE id = $1`;
    export interface DeleteAuthorArgs {
        id: number;
    }
    export async function deleteAuthor(sql: Sql, args: DeleteAuthorArgs): Promise<void> {
        await sql.unsafe(deleteAuthorQuery, [args.id]);
    }
    const createAuthorQuery = `-- name: Update_CreateAuthor :one
INSERT INTO authors (
  name, bio
) VALUES (
  $1, $2
)
RETURNING id, name, bio`;
    export interface CreateAuthorArgs {
        name: string;
        bio: string | null;
    }
    export interface CreateAuthorRow {
        id: number;
        name: string;
        bio: string | null;
    }
    export async function createAuthor(sql: Sql, args: CreateAuthorArgs): Promise<CreateAuthorRow | null> {
        const rows = await sql.unsafe(createAuthorQuery, [args.name, args.bio]).values();
        if (rows.length !== 1) {
            return null;
        }
        const row = rows[0];
        if (!row) {
            return null;
        }
        return {
            id: Number(row[0]),
            name: row[1],
            bio: row[2]
        };
    }
}

