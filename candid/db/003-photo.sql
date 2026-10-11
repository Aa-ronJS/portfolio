-- A reviewer's photo, shown to the business beside their review. Kept out of the business document so the
-- document stays small; served only to the signed-in owner.
create table if not exists photo (
  business_id  text not null references business(id) on delete cascade,
  reviewer_id  text not null,
  type         text not null default 'image/jpeg',
  data         text not null,                  -- base64, resized on the phone before upload
  updated_at   timestamptz not null default now(),
  primary key (business_id, reviewer_id)
);
