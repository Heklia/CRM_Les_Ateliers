alter table public.prospects
  add column if not exists sub_segment text,
  add column if not exists estimated_potential numeric(12, 2);

alter table public.prospects
  drop constraint if exists prospects_estimated_potential_check;

alter table public.prospects
  add constraint prospects_estimated_potential_check
  check (estimated_potential is null or estimated_potential >= 0);
