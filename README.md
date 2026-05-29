# Prospection Terrain

Application MVP de suivi de prospection terrain pour une equipe commerciale.

## Demarrage

1. Copier `.env.example` vers `.env.local`
2. Renseigner `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Installer les dependances avec `npm install`
4. Lancer l'application avec `npm run dev`

## Fonctionnalites MVP

- Authentification Supabase
- Dashboard commercial
- Liste et creation de prospects
- Comptes-rendus de visites
- Pipeline d'opportunites
- Exports CSV

## Base de donnees

Le schema Supabase est disponible dans `supabase/migrations/001_schema_prospection.sql`.
