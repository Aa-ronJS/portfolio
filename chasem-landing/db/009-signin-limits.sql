-- How many sign-in codes have gone out lately, per place they were asked from and in total.
--
-- The per-address limit stops one inbox being flooded. It does nothing about a script asking for a code for
-- ten thousand different addresses, which costs money per email and, worse, teaches mail providers that
-- chasem.app sends junk -- and then painters' real quotes and chasers land in spam. The address a request came
-- from is stored only as a keyed hash, and a row is just a count and when its hour started.
create table if not exists signin_bucket (
  bucket     text primary key,
  window_at  timestamptz not null default now(),
  n          int not null default 0
);
