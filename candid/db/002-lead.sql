-- Someone who asked for an account from the landing page. `via` is the business whose reviewer flow they came
-- through, when they did, so the pilot shows which businesses bring the next ones.
create table if not exists lead (
  id          text primary key,
  email       text not null,
  note        text not null default '',
  via         text not null default '',
  source      text not null default '',     -- 'invite' | 'submitted' | 'paid' | 'ad' | ''
  created_at  timestamptz not null default now()
);
create index if not exists lead_by_time on lead (created_at desc);
