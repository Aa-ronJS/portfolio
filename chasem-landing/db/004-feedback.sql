-- What a tester found. Written from the app, read by a human, never by the app again.
create table if not exists feedback (
  id          text primary key,              -- made on the phone, so sending the same note twice cannot double it up
  painter_id  text not null default '',      -- not a foreign key: a note from a phone that has since been deleted is still worth having
  step        text not null default '',      -- which step of the walkthrough, or '' for a loose note
  verdict     text not null default '',      -- works | broken | note
  note        text not null default '',
  screen      text not null default '',      -- the hash he was on
  app         text not null default '',      -- app version
  ua          text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists feedback_recent on feedback (created_at desc);
