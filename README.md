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

### Export queries in a module

```sql
--@namespace Authors

-- name: Get :one
SELECT * FROM authors
WHERE id = $1 LIMIT 1;

-- name: List :many
SELECT * FROM authors
ORDER BY name;
```

```typescript
const someAuthor = Authors.get(sql);
const authors = Authors.list(sql);
```

The namespace option:
* applies to the entire file
* must appear above the first query

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
const someAuthor = Authors.get(sql);
const authors = Authors.list(sql);
```
