-- The day each booked message is due to go, and whether it was taken back, so the relay can refuse to put more
-- than a day's worth of automatic messages from one tradie on one day. Every tradie sends through one shared
-- number; a burst from one of them is what gets it reported as spam and filtered for all of them. The app paces
-- itself (twenty a day, five minutes apart); this is the backstop for an app that does not.
alter table outbound add column if not exists send_for timestamptz;
alter table outbound add column if not exists cancelled boolean not null default false;
create index if not exists outbound_by_painter_day on outbound (painter_id, channel, send_for);
