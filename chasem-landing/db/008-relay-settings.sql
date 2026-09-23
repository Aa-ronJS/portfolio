-- Things the relay works out for itself and must remember: at the moment, the signing secret of the Stripe
-- Connect webhook it creates the first time a painter turns card payments on. Kept here rather than in an
-- environment variable so that switching Connect on is one dashboard step, not three.
create table if not exists setting (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);
