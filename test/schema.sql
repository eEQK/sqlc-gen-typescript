DROP TABLE IF EXISTS authors;

CREATE TABLE authors (
  id   BIGSERIAL PRIMARY KEY,
  name text      NOT NULL,
  bio  text,
  born DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO authors (name, bio, born) VALUES 
  ('John Doe', 'A mysterious author', '1990-02-09'),
  ('Jane Doe', 'Another mysterious author', null),
  ('Alice', 'A wonderful author', null),
  ('Bob', 'A great author', null),
  ('Charlie', 'A fantastic author', null),
  ('David', 'A brilliant author', null),
  ('Eve', 'A genius author', null),
  ('Frank', 'A smart author', null),
  ('Grace', 'A wise author', null),
  ('Heidi', 'A clever author', null),
  ('Ivan', 'A talented author', null),
  ('Judy', 'A gifted author', null),
  ('Kevin', 'A skilled author', null),
  ('Linda', 'A skilled author', null),
  ('Michael', 'A skilled author', null),
  ('Nancy', 'A skilled author', null),
  ('Oscar', 'A skilled author', null),
  ('Peggy', 'A skilled author', null),
  ('Quincy', 'A skilled author', null),
  ('Rita', 'A skilled author', null),
  ('Steve', 'A skilled author', null),
  ('Tina', 'A skilled author', null),
  ('Ursula', 'A skilled author', null),
  ('Victor', 'A skilled author', null),
  ('Wendy', 'A skilled author', null),
  ('Xavier', 'A skilled author', null),
  ('Yvonne', 'A skilled author', null),
  ('Zack', 'A skilled author', null);


