--@namespace Authors
--@foo bar

-- just a comment
-- name: Authors_GetAuthor :one
SELECT * FROM authors
WHERE id = $1 LIMIT 1;

-- name: Authors_ListAuthors :many
SELECT * FROM authors
ORDER BY name;

-- name: Authors_CreateAuthor :one
INSERT INTO authors (
  name, bio
) VALUES (
  $1, $2
)
RETURNING *;

-- name: Authors_DeleteAuthor :exec
DELETE FROM authors
WHERE id = $1;

-- name: Authors_Nested_List :many
SELECT * FROM authors
ORDER BY name;
