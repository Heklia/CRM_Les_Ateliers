alter table public.prospects
  add column if not exists last_interaction_at timestamptz;

alter table public.visites
  add column if not exists personnes_rencontrees text,
  add column if not exists application_envisagee text,
  add column if not exists matiere_procede text,
  add column if not exists budget_estime numeric(12, 2),
  add column if not exists delai_projet text,
  add column if not exists commentaire text;

alter table public.visites
  alter column type set default 'visite_terrain';

alter table public.visites
  drop constraint if exists visites_type_check,
  drop constraint if exists visites_budget_estime_check;

alter table public.visites
  add constraint visites_type_check
  check (type in ('appel', 'email', 'visite_terrain', 'salon', 'autre')),
  add constraint visites_budget_estime_check
  check (budget_estime is null or budget_estime >= 0);

create index if not exists prospects_last_interaction_at_idx
  on public.prospects (last_interaction_at);
