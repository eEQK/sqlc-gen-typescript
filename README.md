# sqlc-gen-typescript

> [!CAUTION]
> Here be dragons! This plugin is still in early access. Expect breaking changes, missing functionality, and sub-optimal output. Please report all issues and errors. Good luck!

Please refer to the upstream for setup and configuration. https://github.com/sqlc-dev/sqlc-gen-typescript

### Usage

Go to releases and pick the one you want to use (preferably the latest one)

Example (plugins section only):
```yml
plugins:
- name: ts
  wasm:
    url: https://github.com/eEQK/sqlc-gen-typescript/releases/download/nightly-29d84fa/sqlc-gen-typescript_dev.wasm
    sha256: e0925a08f6e4cc32372fc2746e2034bb37aa8c3f59d993e475813a315a19d5eb
```

### Changes in this fork

#### Do not export queries
Makes LSP suggestions less cluttered

#### Export queries in a module
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
export module Authors {
    const getQuery = `...`;
    export async function get(...) { ... }
}

export module Authors {
    const listQuery = `...`;
    export async function list(...) { ... }
}
```
