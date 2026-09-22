-- Quote & Chase, server of record.
--
-- The phone is a cache: it works offline and holds a full copy, but this is the truth. That is what makes
-- "your customer accepted and picked a time" possible at all -- the client and the painter have to agree on
-- one thing, and neither of their devices can be it.
--
-- Shape: each row keeps the app's own document in `doc`, plus the few columns the SERVER has to query on
-- (who a phone number belongs to, what is still open, when someone is busy). The app stays the author of its
-- own data; the server only reads out what it needs to route a reply and offer a time.

create table if not exists painter (
  id            text primary key,              -- the Stripe customer id, which the painter's signed token already carries
  sub           text,                          -- Stripe subscription, when there is one
  trading_name  text not null default '',
  reply_to      text not null default '',
  phone         text not null default '',      -- where "Jane accepted" goes
  state         text not null default '',      -- for public holidays
  tz            text not null default 'Australia/Adelaide',
  rules         jsonb not null default '{}'::jsonb,  -- working days, first slot, notice, how many to offer
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Every record the app syncs. One table, because the phone is the author and the server should not have an
-- opinion about the shape of a job; `kind` keeps them apart and `rev` settles who wrote last.
create table if not exists doc (
  painter_id    text not null references painter(id) on delete cascade,
  kind          text not null,                 -- 'job' | 'client' | 'settings' | 'invoice'
  id            text not null,                 -- the app's own id
  rev           bigint not null default 1,     -- bumped by the writer; higher wins
  deleted       boolean not null default false,
  body          jsonb not null,
  updated_at    timestamptz not null default now(),
  primary key (painter_id, kind, id)
);
create index if not exists doc_pull on doc (painter_id, updated_at);

-- What the server must find fast, pulled out of a job as it syncs.
create table if not exists job_index (
  painter_id    text not null references painter(id) on delete cascade,
  job_id        text not null,
  client_name   text not null default '',
  client_phone  text not null default '',      -- E.164, the key an inbound text arrives on
  client_email  text not null default '',
  quote_no      text not null default '',
  total_cents   bigint not null default 0,
  status        text not null default '',      -- quoted | accepted | invoiced | paid | declined | cancelled
  sent_at       timestamptz,
  expires_at    timestamptz,
  updated_at    timestamptz not null default now(),
  primary key (painter_id, job_id)
);
-- the lookup an inbound reply does: newest still-open quote to this number
create index if not exists job_by_phone on job_index (client_phone, status, sent_at desc);

-- Days the painter cannot start a job. Pushed by the app from his own diary, and optionally from a connected
-- calendar; `source` keeps them separable so reconnecting one does not wipe the other.
create table if not exists busy (
  painter_id    text not null references painter(id) on delete cascade,
  day           date not null,
  source        text not null default 'app',   -- app | gcal | manual
  reason        text not null default '',
  primary key (painter_id, day, source)
);

-- The booking itself. This is the row that means "locked in".
create table if not exists booking (
  id            text primary key,
  painter_id    text not null references painter(id) on delete cascade,
  job_id        text not null,
  start_day     date not null,
  days          int not null default 1,
  start_hour    int not null default 8,
  made_by       text not null default 'client',-- client | painter
  created_at    timestamptz not null default now(),
  cancelled_at  timestamptz
);
create unique index if not exists one_live_booking_per_job on booking (painter_id, job_id) where cancelled_at is null;
create index if not exists booking_by_day on booking (painter_id, start_day) where cancelled_at is null;

-- Which job a message went out against, so a reply can be traced back to it.
create table if not exists outbound (
  id            text primary key,              -- the Twilio or Resend id
  painter_id    text not null references painter(id) on delete cascade,
  job_id        text not null default '',
  channel       text not null,                 -- sms | email
  to_addr       text not null,
  ref           text not null default '',      -- quote+3, INV-2001+10, ...
  sent_at       timestamptz not null default now()
);
create index if not exists outbound_by_to on outbound (to_addr, sent_at desc);

-- Every reply, kept so a painter can see what was said and so a duplicate YES cannot accept twice.
create table if not exists inbound (
  id            text primary key,              -- Twilio's MessageSid: also the idempotency key
  painter_id    text,
  job_id        text not null default '',
  from_addr     text not null,
  body          text not null default '',
  action        text not null default '',      -- accepted | forwarded | unmatched | stop
  received_at   timestamptz not null default now()
);
