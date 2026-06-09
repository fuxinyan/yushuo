create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  scene text not null check (char_length(scene) <= 120),
  category text not null check (char_length(category) <= 40),
  material text not null check (char_length(material) <= 1800),
  created_at timestamptz not null default now()
);

alter table public.submissions enable row level security;

drop policy if exists "Public submissions are readable" on public.submissions;
create policy "Public submissions are readable"
on public.submissions
for select
to anon
using (true);

drop policy if exists "Anonymous visitors can submit" on public.submissions;
create policy "Anonymous visitors can submit"
on public.submissions
for insert
to anon
with check (
  char_length(scene) between 1 and 120
  and char_length(category) between 1 and 40
  and char_length(material) between 1 and 1800
);
