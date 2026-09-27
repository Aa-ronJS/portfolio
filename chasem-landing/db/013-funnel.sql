-- The funnel, one row per tradie: where he came from and when he reached each step, so the one number that
-- decides the ad spend (what it costs to get a tradie chasing a real quote) can be read by week, by ad and by
-- trade. Every column is written once, the first time the step happens, and never again.
alter table painter add column if not exists joined_at      timestamptz;              -- first code proved, new account
alter table painter add column if not exists utm_source     text not null default '';
alter table painter add column if not exists utm_medium     text not null default '';
alter table painter add column if not exists utm_campaign   text not null default '';
alter table painter add column if not exists utm_content    text not null default '';  -- which ad
alter table painter add column if not exists utm_term       text not null default '';
alter table painter add column if not exists fbclid         text not null default '';
alter table painter add column if not exists clicked_at     timestamptz;              -- when he first opened the app from the ad
alter table painter add column if not exists trade          text not null default '';
alter table painter add column if not exists setup_at       timestamptz;              -- the set-up questions answered
alter table painter add column if not exists first_chase_at timestamptz;              -- first message to a real customer
alter table painter add column if not exists paid_at        timestamptz;              -- first subscription payment
alter table painter add column if not exists paid_cus       text not null default ''; -- the Stripe customer that pays
create index if not exists painter_joined_idx on painter (joined_at);
