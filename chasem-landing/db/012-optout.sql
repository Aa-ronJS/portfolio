-- Numbers that replied STOP. Every tradie texts through one shared number, so a STOP stops texts to that
-- customer from all of them, and the relay refuses to send one rather than let Twilio drop it (and spend a
-- message on it). START takes it off again. updated_at is what sync hands back, so a tradie who was texting
-- that customer hears about it either way.
create table if not exists optout (
  addr        text primary key,
  stopped     boolean not null default true,
  updated_at  timestamptz not null default now()
);
create index if not exists optout_updated_idx on optout (updated_at);
