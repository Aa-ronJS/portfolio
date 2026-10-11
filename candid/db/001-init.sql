-- Candid: one row per business, its whole state as a document, saved under a version check.
-- Reviewer tokens are the only other identity: a link is a seat.
create table if not exists business (
  id          text primary key,
  name        text not null default '',
  state       jsonb not null,
  version     bigint not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists reviewer_token (
  token        text primary key,
  business_id  text not null references business(id) on delete cascade,
  reviewer_id  text not null,
  created_at   timestamptz not null default now()
);
create index if not exists reviewer_token_by_reviewer on reviewer_token (business_id, reviewer_id);

-- Failed sign-in attempts per place, so the passcode cannot be guessed.
create table if not exists login_bucket (
  bucket     text primary key,
  window_at  timestamptz not null default now(),
  n          int not null default 0
);
