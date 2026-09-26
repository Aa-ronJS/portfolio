-- Quotes and invoices found by one look through a tradie's sent email or his Xero, waiting for his phone to
-- collect them. Nothing else from the look is kept: not the emails, not the permission. A row lives until his
-- phone collects it, and an hour at most.
create table if not exists found (
  id          text primary key,
  painter_id  text not null,
  provider    text not null default '',
  account     text not null default '',
  items       jsonb not null default '[]'::jsonb,
  scanned     int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists found_painter_idx on found (painter_id, created_at);
