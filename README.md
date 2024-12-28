# sqlc-gen-typescript

> [!CAUTION]
> Here be dragons! This plugin is still in early access. Expect breaking changes, missing functionality, and sub-optimal output. Please report all issues and errors. Good luck!

Please refer to the upstream for setup and configuration. https://github.com/sqlc-dev/sqlc-gen-typescript

## Usage

Go to [Releases](https://github.com/eEQK/sqlc-gen-typescript/releases) and pick the one you want to use (preferably the latest one)

Example (plugins section only):
```yml
plugins:
- name: ts
  wasm:
    url: https://github.com/eEQK/sqlc-gen-typescript/releases/download/v20241222.095711_4e4caaa/sqlc-gen-typescript_dev.wasm
    sha256: 9600a25c0d013d6d1bc69b824cea19acd5e054024704f0cb70092a8722a2b9a1
```

## Changes in this fork

### Do not export queries
Makes LSP suggestions less cluttered

### Postgres only
I've decided to remove other drivers in this fork as I don't have enough capabilities
to also maintain them. As such, only the Postgres database with the `postgres` package is supported
here. This allows me to iterate faster and introduce more features.

My goal with this fork is to provide a great sqlc experience with Postgres+TypeScript,
and I'll focus on achieving that here.

I encourage anyone interested to incorporate changes from this fork into the main repo.

### Resolve values to correct types
In upstream, the query below returns `'1'` (a string). In this fork it is `1` (a number) instead.

```sql
-- name: GetNumber :one
SELECT 1::int
```

### Return values directly from selects with single column
```sql
-- name: GetName :one
SELECT name FROM authors
WHERE id = $1 LIMIT 1;
```

```typescript
const name = await Authors.get(sql, {id: 1});
typeof name // string
```

### Export specific queries in a module
If a query name contains `_` then it will be exported within a module

The format is: `ModuleName_FunctionName`

```sql
-- name: Authors_Get :one
SELECT * FROM authors
WHERE id = $1 LIMIT 1;

-- name: Authors_List :many
SELECT * FROM authors
ORDER BY name;
```

```typescript
const someAuthor = await Authors.get(sql);
const authors = await Authors.list(sql);
```

### Export queries in a module

```sql
--@namespace Authors

-- name: Get :one
SELECT * FROM authors
WHERE id = $1 LIMIT 1;

-- file namespace will be removed from queries, in case
-- you have the same query in multiple files
--
-- name: Authors_List :many
SELECT * FROM authors
ORDER BY name;

-- you can also nest namespaces
--
-- name: Authors_Nested_List :many
SELECT * FROM authors
ORDER BY name;
```

```typescript
const someAuthor = await Authors.get(sql, {id: 1});
const authors = await Authors.list(sql);
const nested = await Authors.Nested.list(sql);
```

The namespace option:
* applies to the entire file
* must appear above the first query
