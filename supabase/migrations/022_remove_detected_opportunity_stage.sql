-- Migration 022 - aligne le pipeline sur les cinq etats du logiciel de devis.
-- Etats autorises : en_cours, a_reviser, envoye, accepte, refuse.

alter table public.prospects
  drop constraint if exists prospects_pipeline_stage_check;

alter table public.opportunites
  drop constraint if exists opportunites_stage_check;

alter table public.prospects
  alter column pipeline_stage set default 'en_cours';

alter table public.opportunites
  alter column stage set default 'en_cours';

update public.prospects
set pipeline_stage = 'en_cours'
where pipeline_stage = 'opportunite_detectee';

update public.opportunites
set stage = 'en_cours'
where stage = 'opportunite_detectee';

alter table public.prospects
  add constraint prospects_pipeline_stage_check
  check (pipeline_stage in (
    'en_cours',
    'a_reviser',
    'envoye',
    'accepte',
    'refuse'
  ));

alter table public.opportunites
  add constraint opportunites_stage_check
  check (stage in (
    'en_cours',
    'a_reviser',
    'envoye',
    'accepte',
    'refuse'
  ));
