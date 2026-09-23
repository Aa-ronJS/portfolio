-- A sign-in code, on its way to an inbox. Nothing here is worth stealing: the code is kept as an HMAC, it
-- lasts ten minutes, and five wrong guesses kill it. The row is deleted the moment it is used.
create table if not exists signin (
  email       text primary key,
  code_hash   text not null,
  expires_at  timestamptz not null,
  tries       int not null default 0,
  sent_at     timestamptz not null default now(),
  sent_count  int not null default 1          -- codes asked for in the last hour, so an inbox cannot be flooded
);
