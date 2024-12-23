--@namespace Read
--@foo bar

-- just a comment
-- name: Read_GetAuthor :one
SELECT * FROM authors
WHERE id = $1 LIMIT 1;

-- name: Read_ListAuthors :many
SELECT * FROM authors
ORDER BY name;

-- name: Read_Nested_List :many
SELECT * FROM authors
ORDER BY name;
