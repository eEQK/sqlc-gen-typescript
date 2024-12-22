--@namespace Update

-- name: Update_DeleteAuthor :exec
DELETE FROM authors
WHERE id = $1;

-- name: Update_CreateAuthor :one
INSERT INTO authors (
  name, bio
) VALUES (
  $1, $2
)
RETURNING *;
