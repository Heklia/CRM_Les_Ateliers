-- Migration 024 - donnees devis necessaires aux KPI commerciaux.

alter table public.opportunites
  add column if not exists is_quote boolean not null default false,
  add column if not exists quote_code text,
  add column if not exists quote_date date,
  add column if not exists total_cost numeric(12, 2);

alter table public.opportunites
  drop constraint if exists opportunites_total_cost_check;

alter table public.opportunites
  add constraint opportunites_total_cost_check
  check (total_cost is null or total_cost >= 0);

-- Reconnait les devis importes avant l'ajout des colonnes KPI.
with parsed as (
  select
    id,
    nullif(trim(substring(description from 'Code devis : ([^\r\n]+)')), '') as parsed_quote_code,
    nullif(trim(substring(description from 'Date devis : ([^\r\n]+)')), '') as parsed_quote_date,
    nullif(
      replace(
        regexp_replace(
          coalesce(trim(substring(description from 'Debourse total : ([^\r\n]+)')), ''),
          '[^0-9,.-]',
          '',
          'g'
        ),
        ',',
        '.'
      ),
      ''
    ) as parsed_total_cost
  from public.opportunites
  where description like '%Code devis :%'
)
update public.opportunites opportunity
set
  is_quote = true,
  quote_code = coalesce(opportunity.quote_code, parsed.parsed_quote_code),
  quote_date = coalesce(
    opportunity.quote_date,
    case
      when parsed.parsed_quote_date ~ '^\d{2}/\d{2}/\d{4}$'
        then to_date(parsed.parsed_quote_date, 'DD/MM/YYYY')
      when parsed.parsed_quote_date ~ '^\d{4}-\d{2}-\d{2}$'
        then parsed.parsed_quote_date::date
      else null
    end
  ),
  total_cost = coalesce(
    opportunity.total_cost,
    case
      when parsed.parsed_total_cost ~ '^\d+(\.\d+)?$'
        then parsed.parsed_total_cost::numeric
      else null
    end
  )
from parsed
where opportunity.id = parsed.id;

create index if not exists opportunites_quote_date_idx
  on public.opportunites (quote_date)
  where is_quote = true;

create index if not exists opportunites_quote_commercial_idx
  on public.opportunites (commercial_id, quote_date)
  where is_quote = true;
