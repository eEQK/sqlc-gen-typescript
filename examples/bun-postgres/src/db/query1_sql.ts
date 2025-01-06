// Code generated by sqlc. DO NOT EDIT.

import type { Sql } from "postgres";

export namespace Read {
    const getAuthorQuery = `-- name: Read_GetAuthor :one
SELECT id, name, bio FROM authors
WHERE id = $1 LIMIT 1`;
    export interface GetAuthorArgs {
        id: number;
    }
    export interface GetAuthorRow {
        id: number;
        name: string;
        bio: string | null;
    }
    export async function getAuthor(sql: Sql, args: GetAuthorArgs): Promise<GetAuthorRow | null> {
        const rows = await sql.unsafe(getAuthorQuery, [args.id]).values();
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
    const listAuthorsQuery = `-- name: Read_ListAuthors :many
SELECT id, name, bio FROM authors
ORDER BY name`;
    export interface ListAuthorsRow {
        id: number;
        name: string;
        bio: string | null;
    }
    export async function listAuthors(sql: Sql): Promise<ListAuthorsRow[]> {
        return (await sql.unsafe(listAuthorsQuery, []).values()).map(row => ({
            id: Number(row[0]),
            name: row[1],
            bio: row[2]
        }));
    }
    const getNameByIdQuery = `-- name: GetNameById :one
SELECT name FROM authors
where id = $1 limit 1`;
    export interface GetNameByIdArgs {
        id: number;
    }
    export async function getNameById(sql: Sql, args: GetNameByIdArgs): Promise<string | null> {
        const rows = await sql.unsafe(getNameByIdQuery, [args.id]).values();
        if (rows.length !== 1) {
            return null;
        }
        const row = rows[0];
        if (!row) {
            return null;
        }
        return row[0];
    }
    const getCountQuery = `-- name: GetCount :one
SELECT count(id) FROM authors`;
    export async function getCount(sql: Sql): Promise<number | null> {
        const rows = await sql.unsafe(getCountQuery, []).values();
        if (rows.length !== 1) {
            return null;
        }
        const row = rows[0];
        if (!row) {
            return null;
        }
        return Number(row[0]);
    }
    export namespace Nested {
        const listQuery = `-- name: Read_Nested_List :many
SELECT id, name, bio FROM authors
ORDER BY name`;
        export interface ListRow {
            id: number;
            name: string;
            bio: string | null;
        }
        export async function list(sql: Sql): Promise<ListRow[]> {
            return (await sql.unsafe(listQuery, []).values()).map(row => ({
                id: Number(row[0]),
                name: row[1],
                bio: row[2]
            }));
        }
    }
}

