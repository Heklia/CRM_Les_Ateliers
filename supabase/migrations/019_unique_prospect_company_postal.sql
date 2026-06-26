-- Migration 019 - interdiction des doublons prospect par nom d'entreprise + code postal.

create or replace function public.normalize_prospect_duplicate_key(source_value text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    lower(
      translate(
        coalesce(source_value, ''),
        'ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝàáâãäåçèéêëìíîïñòóôõöùúûüýÿ',
        'aaaaaaceeeeiiiinooooouuuuyaaaaaaceeeeiiiinooooouuuuyy'
      )
    ),
    '[^a-z0-9]+',
    '',
    'g'
  )
$$;

drop index if exists public.prospects_unique_company_postal_idx;

do $$
begin
  if exists (
    select 1
    from public.prospects
    group by
      public.normalize_prospect_duplicate_key(company_name),
      public.normalize_prospect_duplicate_key(postal_code)
    having count(*) > 1
  ) then
    raise exception 'Doublons prospects existants : corrigez les prospects ayant le meme nom d''entreprise et le meme code postal avant de relancer cette migration.';
  end if;
end;
$$;

create unique index prospects_unique_company_postal_idx
on public.prospects (
  public.normalize_prospect_duplicate_key(company_name),
  public.normalize_prospect_duplicate_key(postal_code)
);
