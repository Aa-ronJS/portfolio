-- How a painter gets paid. The bank details are Stripe's problem, not ours: Connect's own onboarding collects
-- them, so no BSB is ever typed into this app or stored here.
alter table painter add column if not exists stripe_account text not null default '';   -- acct_... once he starts
alter table painter add column if not exists pay_ready boolean not null default false;  -- Stripe says he can take a card
alter table painter add column if not exists pay_note text not null default '';         -- what Stripe is still waiting on
