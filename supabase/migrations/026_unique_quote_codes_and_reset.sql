-- Migration 026 - nettoyage ponctuel des devis et unicite du numero de devis.
-- Le marqueur empeche une seconde execution de supprimer les devis reimportes ensuite.

alter table public.opportunites
  add column if not exists is_quote boolean not null default false,
  add column if not exists quote_code text;

create table if not exists public.app_migration_flags (
  key text primary key,
  executed_at timestamptz not null default now()
);

alter table public.app_migration_flags enable row level security;

with first_run as (
  insert into public.app_migration_flags (key)
  values ('026_reset_imported_quotes')
  on conflict (key) do nothing
  returning key
)
delete from public.opportunites opportunity
where exists (select 1 from first_run)
  and (
    opportunity.is_quote = true
    or opportunity.quote_code is not null
    or opportunity.description like '%Code devis :%'
  );

alter table public.opportunites
  drop constraint if exists opportunites_quote_code_required_check;

alter table public.opportunites
  add constraint opportunites_quote_code_required_check
  check (
    is_quote = false
    or (quote_code is not null and btrim(quote_code) <> '')
  );

drop index if exists public.opportunites_quote_code_unique_idx;

create unique index opportunites_quote_code_unique_idx
  on public.opportunites (upper(btrim(quote_code)))
  where is_quote = true;
