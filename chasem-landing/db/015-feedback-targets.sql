-- Feedback pointed at one thing on the screen (review.js): which element, its words and HTML, a copy of the screen
-- as it was, where the element sat, and the screen size, so the moment can be drawn again exactly as it was seen.
alter table feedback add column if not exists target       text  not null default '';
alter table feedback add column if not exists target_text  text  not null default '';
alter table feedback add column if not exists html         text  not null default '';
alter table feedback add column if not exists page         text  not null default '';
alter table feedback add column if not exists rect         jsonb not null default '{}'::jsonb;
alter table feedback add column if not exists viewport     jsonb not null default '{}'::jsonb;
alter table feedback add column if not exists done_at      timestamptz;   -- set when a session has dealt with it
