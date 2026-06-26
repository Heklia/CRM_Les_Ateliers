-- Migration 020 - code representant pour rattacher les imports de devis aux utilisateurs.

alter table public.users
  add column if not exists representative_code text;

create unique index if not exists users_representative_code_unique_idx
on public.users (upper(trim(representative_code)))
where representative_code is not null and trim(representative_code) <> '';
