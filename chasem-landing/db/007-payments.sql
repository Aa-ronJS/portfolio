-- A card payment on a painter's own invoice, as Stripe told us.
--
-- None of this is money we hold. Connect pays him directly; the row exists so the app can tick the invoice
-- off by itself instead of him watching a bank feed. The primary key is Stripe's own object id, so a retried
-- webhook can never pay an invoice twice.
create table if not exists payment (
  id           text primary key,
  painter_id   text not null,
  job_id       text not null default '',
  invoice_no   text not null default '',
  amount_cents integer not null default 0,
  currency     text not null default 'aud',
  paid_at      timestamptz not null default now(),
  received_at  timestamptz not null default now()
);
create index if not exists payment_painter_idx on payment (painter_id, received_at);
