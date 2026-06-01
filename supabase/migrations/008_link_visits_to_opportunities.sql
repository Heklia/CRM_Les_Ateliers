alter table public.visites
  add column if not exists opportunite_id uuid references public.opportunites(id) on delete set null;

create index if not exists visites_opportunite_id_idx
  on public.visites (opportunite_id);
