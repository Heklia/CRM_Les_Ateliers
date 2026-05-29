# Deploiement en ligne

Objectif : rendre l'application accessible aux collegues en deplacement.

## Solution recommandee

- Frontend Next.js : Vercel
- Base de donnees et authentification : Supabase

## Etapes

### 1. Creer un compte Vercel

Aller sur https://vercel.com et creer un compte.

### 2. Mettre le projet sur GitHub

Vercel deploie facilement depuis GitHub.

Depuis le dossier du projet :

```bash
git init
git add .
git commit -m "Initial MVP prospection terrain"
```

Creer ensuite un repository GitHub, puis pousser le projet dessus.

### 3. Importer le projet dans Vercel

Dans Vercel :

1. Cliquer sur Add New Project
2. Choisir le repository GitHub
3. Framework detecte : Next.js
4. Laisser les commandes par defaut

Build command :

```bash
npm run build
```

Install command :

```bash
npm install
```

### 4. Ajouter les variables d'environnement

Dans Vercel > Project Settings > Environment Variables :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxx
```

Ne jamais ajouter de cle `service_role` ou `sb_secret_` dans `NEXT_PUBLIC_`.

### 5. Deployer

Cliquer sur Deploy.

Vercel fournira une URL du type :

```txt
https://nom-du-projet.vercel.app
```

### 6. Configurer Supabase Auth

Dans Supabase :

1. Authentication
2. URL Configuration
3. Site URL :

```txt
https://nom-du-projet.vercel.app
```

4. Redirect URLs :

```txt
https://nom-du-projet.vercel.app/**
http://localhost:3000/**
```

### 7. Creer les utilisateurs

Dans Supabase > Authentication > Users :

- creer les comptes collegues
- definir ou envoyer un mot de passe

Dans SQL Editor, rattacher chaque utilisateur a un role :

```sql
insert into public.users (id, email, full_name, role)
values (
  'USER_UID_ICI',
  'email@entreprise.fr',
  'Nom Prenom',
  'commercial'
)
on conflict (id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  role = excluded.role;
```

Roles possibles :

```txt
admin
manager
commercial
```

## Verification

Tester :

- connexion admin
- connexion commercial
- creation prospect
- creation compte-rendu de visite
- affichage pipeline
- acces mobile depuis le telephone

