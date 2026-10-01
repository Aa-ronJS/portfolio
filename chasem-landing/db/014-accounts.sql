-- Accounts with a password, so a tradie logs in the way every other app he uses works: an email and a password.
--
-- The Stripe customer is still the account (cus); this row adds what logging in needs. pw_hash is scrypt with
-- its own salt and settings written into the value, so the settings can be raised later without a migration.
-- An account made before passwords existed has no row, or a row with no hash: it proves the inbox once with an
-- emailed code and sets a password then, so nobody is locked out by the change.
create table if not exists account (
  email         text primary key,                 -- trimmed and lower-cased, one person one account
  cus           text not null,                    -- the Stripe customer, which the signed token carries
  pw_hash       text,                             -- null until a password is set
  pw_set_at     timestamptz,
  failed        int not null default 0,           -- wrong passwords in a row
  locked_until  timestamptz,                      -- set after too many in a row; a right password waits it out too
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists account_cus_idx on account (cus);

-- A change of email waits here until the code sent to the new address comes back.
alter table signin add column if not exists purpose  text not null default '';   -- '' sign-in, 'email' change of address
alter table signin add column if not exists cus      text not null default '';   -- whose address is changing
