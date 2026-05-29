-- Supabase schema for a field sales prospecting MVP.
-- Run this file from the Supabase SQL editor or as a migration.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'commercial',
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint users_role_check
    check (role in ('admin', 'manager', 'commercial'))
);

create table if not exists public.segments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint segments_code_check
    check (code in (
      'agencements_decoratifs',
      'structures_mobilier',
      'usinage_3d_prototypage_rotomoulage'
    ))
);

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  commercial_id uuid not null references public.users(id) on delete restrict,
  segment_id uuid not null references public.segments(id) on delete restrict,

  company_name text not null,
  company_type text,
  sub_segment text,
  website text,
  source text not null default 'terrain',
  status text not null default 'nouveau',
  pipeline_stage text not null default 'prospect_identifie',

  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  country text not null default 'France',
  latitude numeric(10, 7),
  longitude numeric(10, 7),

  interest_level smallint,
  estimated_potential numeric(12, 2),
  priority_score smallint not null default 0,
  capacity_fit smallint,
  recurrence_potential smallint,
  need_maturity smallint,
  project_timeline text not null default 'inconnu',
  last_interaction_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint prospects_status_check
    check (status in (
      'nouveau',
      'a_qualifier',
      'qualifie',
      'contacte',
      'en_cours',
      'client',
      'perdu'
    )),
  constraint prospects_source_check
    check (source in (
      'terrain',
      'salon',
      'recommandation',
      'web',
      'reseau',
      'autre'
    )),
  constraint prospects_pipeline_stage_check
    check (pipeline_stage in (
      'prospect_identifie',
      'contact_etabli',
      'rdv_realise',
      'opportunite_detectee',
      'devis_a_faire',
      'devis_envoye',
      'gagne',
      'perdu'
    )),
  constraint prospects_interest_level_check
    check (interest_level is null or interest_level between 1 and 5),
  constraint prospects_estimated_potential_check
    check (estimated_potential is null or estimated_potential >= 0),
  constraint prospects_priority_score_check
    check (priority_score between 0 and 100),
  constraint prospects_capacity_fit_check
    check (capacity_fit is null or capacity_fit between 1 and 5),
  constraint prospects_recurrence_potential_check
    check (recurrence_potential is null or recurrence_potential between 1 and 5),
  constraint prospects_need_maturity_check
    check (need_maturity is null or need_maturity between 1 and 5),
  constraint prospects_project_timeline_check
    check (project_timeline in ('immediat', 'moins_3_mois', 'moins_6_mois', 'plus_6_mois', 'inconnu')),
  constraint prospects_coordinates_check
    check (
      (latitude is null and longitude is null)
      or (
        latitude between -90 and 90
        and longitude between -180 and 180
      )
    )
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  commercial_id uuid not null references public.users(id) on delete restrict,

  first_name text,
  last_name text,
  job_title text,
  email text,
  phone text,
  mobile_phone text,
  linkedin_url text,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint contacts_email_format_check
    check (email is null or email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  constraint contacts_has_name_or_channel_check
    check (
      first_name is not null
      or last_name is not null
      or email is not null
      or phone is not null
      or mobile_phone is not null
    )
);

create unique index if not exists contacts_one_primary_per_prospect_idx
  on public.contacts (prospect_id)
  where is_primary = true;

create table if not exists public.visites (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  commercial_id uuid not null references public.users(id) on delete restrict,

  visite_date timestamptz not null,
  type text not null default 'visite_terrain',
  statut text not null default 'realisee',
  personnes_rencontrees text,
  resume text not null,
  besoins text,
  freins text,
  application_envisagee text,
  matiere_procede text,
  solutions_evoquees text,
  budget_estime numeric(12, 2),
  delai_projet text,
  niveau_interet smallint,
  prochaine_etape text,
  prochaine_relance_at timestamptz,
  commentaire text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint visites_type_check
    check (type in (
      'appel',
      'email',
      'visite_terrain',
      'salon',
      'autre'
    )),
  constraint visites_statut_check
    check (statut in ('planifiee', 'realisee', 'annulee')),
  constraint visites_niveau_interet_check
    check (niveau_interet is null or niveau_interet between 1 and 5),
  constraint visites_budget_estime_check
    check (budget_estime is null or budget_estime >= 0)
);

create table if not exists public.opportunites (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  commercial_id uuid not null references public.users(id) on delete restrict,
  segment_id uuid not null references public.segments(id) on delete restrict,

  title text not null,
  description text,
  stage text not null default 'prospect_identifie',
  estimated_value numeric(12, 2),
  probability smallint not null default 10,
  expected_close_date date,
  won_at timestamptz,
  lost_at timestamptz,
  loss_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint opportunites_stage_check
    check (stage in (
      'prospect_identifie',
      'contact_etabli',
      'rdv_realise',
      'opportunite_detectee',
      'devis_a_faire',
      'devis_envoye',
      'gagne',
      'perdu'
    )),
  constraint opportunites_estimated_value_check
    check (estimated_value is null or estimated_value >= 0),
  constraint opportunites_probability_check
    check (probability between 0 and 100),
  constraint opportunites_won_lost_check
    check (not (won_at is not null and lost_at is not null)),
  constraint opportunites_loss_reason_check
    check (stage <> 'perdu' or loss_reason is not null)
);

create table if not exists public.actions_suivantes (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  opportunite_id uuid references public.opportunites(id) on delete cascade,
  visite_id uuid references public.visites(id) on delete set null,
  commercial_id uuid not null references public.users(id) on delete restrict,

  type text not null default 'relance',
  title text not null,
  description text,
  due_at timestamptz not null,
  status text not null default 'a_faire',
  priority text not null default 'normale',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint actions_suivantes_type_check
    check (type in (
      'appel',
      'email',
      'visite',
      'devis',
      'relance',
      'rendez_vous',
      'autre'
    )),
  constraint actions_suivantes_status_check
    check (status in ('a_faire', 'en_cours', 'terminee', 'annulee')),
  constraint actions_suivantes_priority_check
    check (priority in ('basse', 'normale', 'haute')),
  constraint actions_suivantes_completed_status_check
    check (
      (status = 'terminee' and completed_at is not null)
      or (status <> 'terminee')
    )
);

create index if not exists prospects_commercial_id_idx on public.prospects (commercial_id);
create index if not exists prospects_segment_id_idx on public.prospects (segment_id);
create index if not exists prospects_status_idx on public.prospects (status);
create index if not exists prospects_city_idx on public.prospects (city);

create index if not exists contacts_prospect_id_idx on public.contacts (prospect_id);
create index if not exists contacts_commercial_id_idx on public.contacts (commercial_id);

create index if not exists visites_prospect_id_idx on public.visites (prospect_id);
create index if not exists visites_commercial_id_idx on public.visites (commercial_id);
create index if not exists visites_visite_date_idx on public.visites (visite_date);

create index if not exists opportunites_prospect_id_idx on public.opportunites (prospect_id);
create index if not exists opportunites_commercial_id_idx on public.opportunites (commercial_id);
create index if not exists opportunites_segment_id_idx on public.opportunites (segment_id);
create index if not exists opportunites_stage_idx on public.opportunites (stage);

create index if not exists actions_suivantes_prospect_id_idx on public.actions_suivantes (prospect_id);
create index if not exists actions_suivantes_commercial_id_idx on public.actions_suivantes (commercial_id);
create index if not exists actions_suivantes_due_at_idx on public.actions_suivantes (due_at);
create index if not exists actions_suivantes_status_idx on public.actions_suivantes (status);

create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger set_segments_updated_at
before update on public.segments
for each row execute function public.set_updated_at();

create trigger set_prospects_updated_at
before update on public.prospects
for each row execute function public.set_updated_at();

create trigger set_contacts_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

create trigger set_visites_updated_at
before update on public.visites
for each row execute function public.set_updated_at();

create trigger set_opportunites_updated_at
before update on public.opportunites
for each row execute function public.set_updated_at();

create trigger set_actions_suivantes_updated_at
before update on public.actions_suivantes
for each row execute function public.set_updated_at();

insert into public.segments (code, name, description)
values
  (
    'agencements_decoratifs',
    'Agencements uniques et decoratifs',
    'Architecture, amenagements paysagers, projets decoratifs sur mesure.'
  ),
  (
    'structures_mobilier',
    'Structures et mobilier',
    'Cuisines exterieures, bancs, tables, mobilier et structures.'
  ),
  (
    'usinage_3d_prototypage_rotomoulage',
    'Usinage 3D, prototypage, rotomoulage',
    'Prototypage, usinage 3D, moules, pieces techniques et rotomoulage.'
  )
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();
