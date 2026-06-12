-- Migration 016 - preference utilisateur pour les emails quotidiens de taches.

alter table public.users
  add column if not exists daily_task_email_enabled boolean not null default true;
