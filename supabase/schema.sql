-- Run in Supabase SQL editor
create table if not exists rsvps (
  id bigint generated always as identity primary key,
  first text, last text, email text, phone text,
  attend text, guests text, diet text, msg text,
  ts timestamptz default now()
);

create table if not exists guestbook (
  id bigint generated always as identity primary key,
  name text, note text, ts timestamptz default now()
);

alter table rsvps enable row level security;
alter table guestbook enable row level security;

create policy "public insert rsvps" on rsvps for insert to anon with check (true);
create policy "public read rsvps" on rsvps for select to anon using (true);
create policy "public insert guestbook" on guestbook for insert to anon with check (true);
create policy "public read guestbook" on guestbook for select to anon using (true);