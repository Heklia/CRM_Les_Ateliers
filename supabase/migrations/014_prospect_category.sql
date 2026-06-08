-- Migration 014 - categorisation simple des prospects.

alter table public.prospects
  add column if not exists category text not null default 'standard';

alter table public.prospects
  drop constraint if exists prospects_category_check;

alter table public.prospects
  add constraint prospects_category_check
  check (category in ('favori', 'standard', 'a_ecarter'));

create index if not exists prospects_category_idx
  on public.prospects (category);
