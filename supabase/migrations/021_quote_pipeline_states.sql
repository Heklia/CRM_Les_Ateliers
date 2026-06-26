-- Migration 021 - pipeline opportunites centre sur les etats de devis.
-- Nouveaux etats :
-- opportunite_detectee, en_cours, a_reviser, envoye, accepte, refuse.

alter table public.prospects
  alter column pipeline_stage set default 'opportunite_detectee';

alter table public.opportunites
  alter column stage set default 'opportunite_detectee';

alter table public.prospects
  drop constraint if exists prospects_pipeline_stage_check;

alter table public.opportunites
  drop constraint if exists opportunites_stage_check;

alter table public.opportunites
  drop constraint if exists opportunites_loss_reason_check;

update public.prospects
set pipeline_stage = case pipeline_stage
  when 'prospect_identifie' then 'opportunite_detectee'
  when 'contact_etabli' then 'opportunite_detectee'
  when 'rdv_realise' then 'opportunite_detectee'
  when 'opportunite_detectee' then 'opportunite_detectee'
  when 'devis_a_faire' then 'en_cours'
  when 'devis_envoye' then 'envoye'
  when 'gagne' then 'accepte'
  when 'perdu' then 'refuse'
  else 'opportunite_detectee'
end;

update public.opportunites
set
  stage = case stage
    when 'prospect_identifie' then 'opportunite_detectee'
    when 'contact_etabli' then 'opportunite_detectee'
    when 'rdv_realise' then 'opportunite_detectee'
    when 'opportunite_detectee' then 'opportunite_detectee'
    when 'devis_a_faire' then 'en_cours'
    when 'devis_envoye' then 'envoye'
    when 'gagne' then 'accepte'
    when 'perdu' then 'refuse'
    else 'opportunite_detectee'
  end,
  won_at = case
    when stage in ('gagne', 'accepte') and won_at is null then now()
    else won_at
  end,
  lost_at = case
    when stage in ('perdu', 'refuse') and lost_at is null then now()
    else lost_at
  end,
  loss_reason = case
    when stage in ('perdu', 'refuse') and loss_reason is null then 'Refuse avant migration'
    else loss_reason
  end;

alter table public.prospects
  add constraint prospects_pipeline_stage_check
  check (pipeline_stage in (
    'opportunite_detectee',
    'en_cours',
    'a_reviser',
    'envoye',
    'accepte',
    'refuse'
  ));

alter table public.opportunites
  add constraint opportunites_stage_check
  check (stage in (
    'opportunite_detectee',
    'en_cours',
    'a_reviser',
    'envoye',
    'accepte',
    'refuse'
  ));

alter table public.opportunites
  add constraint opportunites_loss_reason_check
  check (stage <> 'refuse' or loss_reason is not null);
