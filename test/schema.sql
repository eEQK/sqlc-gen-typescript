drop table if exists authors;

create table authors
(
    id         bigserial primary key,
    name       text not null,
    bio        text,
    born       date,
    created_at timestamptz default now()
);

insert into authors (name, bio, born)
values ('John Doe', 'A mysterious author', '1990-02-09'),
       ('Jane Doe', 'Another mysterious author', null),
       ('Alice', 'A wonderful author', null),
       ('Bob', 'A great author', null),
       ('Charlie', 'A fantastic author', null),
       ('David', 'A brilliant author', null);


drop table if exists emails;
drop domain if exists email;

create extension if not exists citext;
create domain email as citext constraint proper_email check (value ~*
                                                             '^[a-za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-za-z0-9](?:[a-za-z0-9-]{0,61}[a-za-z0-9])?(?:\.[a-za-z0-9](?:[a-za-z0-9-]{0,61}[a-za-z0-9])?)*$');
create table emails
(
    id  bigserial primary key,
    em1 citext not null,
    em2 email  not null
);

insert into emails (em1, em2)
values ('foo@gmail.com', 'foo+1@gmail.com'),
       ('bar@gmail.com', 'bar+1@gmail.com'),
       ('baz@gmail.com', 'baz+1@gmail.com');
