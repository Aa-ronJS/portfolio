-- Accounts: an email is an account. A business belongs to one account. Admins are listed in ADMIN_EMAILS.
create table if not exists account (
  id          text primary key,
  email       text not null unique,
  name        text not null default '',
  via         text not null default '',     -- the business whose reviewer flow brought them, if any
  source      text not null default '',     -- 'invite' | 'submitted' | 'paid' | 'ad' | ''
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);
alter table business add column if not exists account_id text not null default '';
create index if not exists business_by_account on business (account_id);

-- A sign-in code on its way to an inbox: kept as an HMAC, ten minutes, five tries, deleted when used.
create table if not exists signin (
  email       text primary key,
  code_hash   text not null,
  expires_at  timestamptz not null,
  tries       int not null default 0,
  sent_at     timestamptz not null default now(),
  sent_count  int not null default 1
);

-- Stripe Checkout sessions that have been credited, so a webhook retry or a return visit cannot credit twice.
create table if not exists payment (
  session_id   text primary key,
  business_id  text not null,
  amount       int not null,
  created_at   timestamptz not null default now()
);
