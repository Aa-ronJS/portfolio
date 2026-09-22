-- How long a job is expected to take, so a booking blocks the right number of days rather than assuming one.
-- The app knows; it comes across with the job.
alter table job_index add column if not exists est_days int not null default 1;
