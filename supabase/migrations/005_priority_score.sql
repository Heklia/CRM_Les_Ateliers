alter table public.prospects
  add column if not exists priority_score smallint not null default 0,
  add column if not exists capacity_fit smallint,
  add column if not exists recurrence_potential smallint,
  add column if not exists need_maturity smallint,
  add column if not exists project_timeline text not null default 'inconnu';

alter table public.prospects
  drop constraint if exists prospects_priority_score_check,
  drop constraint if exists prospects_capacity_fit_check,
  drop constraint if exists prospects_recurrence_potential_check,
  drop constraint if exists prospects_need_maturity_check,
  drop constraint if exists prospects_project_timeline_check;

alter table public.prospects
  add constraint prospects_priority_score_check
  check (priority_score between 0 and 100),
  add constraint prospects_capacity_fit_check
  check (capacity_fit is null or capacity_fit between 1 and 5),
  add constraint prospects_recurrence_potential_check
  check (recurrence_potential is null or recurrence_potential between 1 and 5),
  add constraint prospects_need_maturity_check
  check (need_maturity is null or need_maturity between 1 and 5),
  add constraint prospects_project_timeline_check
  check (project_timeline in ('immediat', 'moins_3_mois', 'moins_6_mois', 'plus_6_mois', 'inconnu'));

create or replace function public.calculate_prospect_priority_score(
  interest_level smallint,
  estimated_budget numeric,
  project_timeline text,
  capacity_fit smallint,
  recurrence_potential smallint,
  need_maturity smallint
)
returns smallint
language plpgsql
immutable
as $$
declare
  interest_score numeric := coalesce(interest_level, 0) / 5.0 * 100;
  budget_score numeric := case
    when coalesce(estimated_budget, 0) >= 50000 then 100
    when coalesce(estimated_budget, 0) >= 25000 then 80
    when coalesce(estimated_budget, 0) >= 10000 then 55
    when coalesce(estimated_budget, 0) >= 5000 then 35
    else 15
  end;
  timeline_score numeric := case coalesce(project_timeline, 'inconnu')
    when 'immediat' then 100
    when 'moins_3_mois' then 80
    when 'moins_6_mois' then 55
    when 'plus_6_mois' then 30
    else 40
  end;
  capacity_score numeric := coalesce(capacity_fit, 0) / 5.0 * 100;
  recurrence_score numeric := coalesce(recurrence_potential, 0) / 5.0 * 100;
  maturity_score numeric := coalesce(need_maturity, 0) / 5.0 * 100;
begin
  return greatest(
    0,
    least(
      100,
      round(
        interest_score * 0.25 +
        budget_score * 0.20 +
        timeline_score * 0.15 +
        capacity_score * 0.15 +
        recurrence_score * 0.10 +
        maturity_score * 0.15
      )
    )
  )::smallint;
end;
$$;

create or replace function public.set_prospect_priority_score()
returns trigger
language plpgsql
as $$
begin
  new.priority_score = public.calculate_prospect_priority_score(
    new.interest_level,
    new.estimated_potential,
    new.project_timeline,
    new.capacity_fit,
    new.recurrence_potential,
    new.need_maturity
  );
  return new;
end;
$$;

drop trigger if exists set_prospects_priority_score on public.prospects;

create trigger set_prospects_priority_score
before insert or update of interest_level, estimated_potential, project_timeline, capacity_fit, recurrence_potential, need_maturity
on public.prospects
for each row execute function public.set_prospect_priority_score();

update public.prospects
set priority_score = public.calculate_prospect_priority_score(
  interest_level,
  estimated_potential,
  project_timeline,
  capacity_fit,
  recurrence_potential,
  need_maturity
);

create index if not exists prospects_priority_score_idx
  on public.prospects (priority_score desc);
