-- A painter's connected Google Calendar.
--
-- Only the refresh token is kept, and only so the days he is already booked can be read back without asking
-- him again. Nothing is ever written to his calendar from here, and no event details are stored: the read is a
-- free/busy query, which answers "busy" or "free" for a day and nothing else. Disconnecting deletes the row,
-- and with it every gcal day in `busy`.
create table if not exists calendar (
  painter_id    text primary key references painter(id) on delete cascade,
  provider      text not null default 'google',
  account       text not null default '',      -- the address he connected, so the app can show which one
  refresh_token text not null,
  synced_at     timestamptz,
  error         text not null default '',      -- last failure, so the app can say "reconnect" instead of going quiet
  created_at    timestamptz not null default now()
);
