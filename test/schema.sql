DROP TABLE IF EXISTS authors;

CREATE TABLE authors (
  id   BIGSERIAL PRIMARY KEY,
  name text      NOT NULL,
  bio  text
);

INSERT INTO authors (name, bio) VALUES 
  ('John Doe', 'A mysterious author'),
  ('Jane Doe', 'Another mysterious author'),
  ('Alice', 'A wonderful author'),
  ('Bob', 'A great author'),
  ('Charlie', 'A fantastic author'),
  ('David', 'A brilliant author'),
  ('Eve', 'A genius author'),
  ('Frank', 'A smart author'),
  ('Grace', 'A wise author'),
  ('Heidi', 'A clever author'),
  ('Ivan', 'A talented author'),
  ('Judy', 'A gifted author'),
  ('Kevin', 'A skilled author'),
  ('Linda', 'A skilled author'),
  ('Michael', 'A skilled author'),
  ('Nancy', 'A skilled author'),
  ('Oscar', 'A skilled author'),
  ('Peggy', 'A skilled author'),
  ('Quincy', 'A skilled author'),
  ('Rita', 'A skilled author'),
  ('Steve', 'A skilled author'),
  ('Tina', 'A skilled author'),
  ('Ursula', 'A skilled author'),
  ('Victor', 'A skilled author'),
  ('Wendy', 'A skilled author'),
  ('Xavier', 'A skilled author'),
  ('Yvonne', 'A skilled author'),
  ('Zack', 'A skilled author');


