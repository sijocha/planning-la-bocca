-- =========================================================
-- Planning Centraliste – Axe 2 : structure des données
-- Projet Supabase : planning-centraliste (eu-west-1)
-- =========================================================

-- ---------- Fonction utilitaire : date de mise à jour ----------
create or replace function public.maj_modifie_le()
returns trigger language plpgsql as $$
begin
  new.modifie_le = now();
  return new;
end $$;

-- ---------- Profils (un par compte Google) ----------
create table public.profils (
  id          uuid primary key references auth.users(id) on delete cascade,
  nom         text not null,
  email       text,
  role        text not null default 'lecture'
              check (role in ('admin','centraliste','commercial','labo','lecture')),
  actif       boolean not null default true,
  cree_le     timestamptz not null default now(),
  modifie_le  timestamptz not null default now()
);

-- ---------- Opérateurs du poste centrale (compte commun + code 4 chiffres) ----------
create table public.operateurs (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  code_hash   text,                       -- code à 4 chiffres, jamais stocké en clair
  profil_id   uuid references public.profils(id) on delete set null,
  actif       boolean not null default true,
  cree_le     timestamptz not null default now()
);

-- ---------- Clients ----------
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  telephone   text,
  notes       text,
  actif       boolean not null default true,
  cree_le     timestamptz not null default now(),
  modifie_le  timestamptz not null default now()
);

-- ---------- Chantiers ----------
create table public.chantiers (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete restrict,
  nom         text not null,
  adresse     text,
  commune     text,
  contact     text,
  telephone   text,
  acces       text,                       -- accès, gabarit, restrictions
  actif       boolean not null default true,
  cree_le     timestamptz not null default now(),
  modifie_le  timestamptz not null default now()
);

-- ---------- Formules béton ----------
create table public.formules (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique,     -- ex. C25/30 S4 D20
  classe_resistance   text,                     -- ex. C25/30
  consistance         text,                     -- ex. S3, S4
  dmax                integer,                  -- granulométrie maxi (mm)
  ciment              text,
  description         text,
  actif               boolean not null default true,
  cree_le             timestamptz not null default now(),
  modifie_le          timestamptz not null default now()
);

-- ---------- Camions ----------
create table public.camions (
  id            uuid primary key default gen_random_uuid(),
  numero        text,                     -- numéro interne
  plaque        text,
  type          text not null default 'toupie'
                check (type in ('toupie','pompe','tapis','autre')),
  capacite_m3   numeric(5,2),
  transporteur  text,
  telephone     text,
  actif         boolean not null default true,
  cree_le       timestamptz not null default now(),
  modifie_le    timestamptz not null default now()
);

-- ---------- Commandes (une ligne du planning journalier) ----------
create table public.commandes (
  id              uuid primary key default gen_random_uuid(),
  date_livraison  date not null,
  heure_debut     time,
  client_id       uuid references public.clients(id) on delete restrict,
  chantier_id     uuid references public.chantiers(id) on delete restrict,
  formule_id      uuid references public.formules(id) on delete restrict,
  volume_m3       numeric(6,2) not null check (volume_m3 > 0),
  cadence_m3h     numeric(5,2),
  pompe           boolean not null default false,
  infos           text,
  statut          text not null default 'demandee'
                  check (statut in ('demandee','validee','planifiee','en_cours','livree','annulee')),
  commercial_id   uuid references public.profils(id) on delete set null,
  cree_par        uuid references public.profils(id) on delete set null,
  operateur_id    uuid references public.operateurs(id) on delete set null,
  cree_le         timestamptz not null default now(),
  modifie_le      timestamptz not null default now()
);
create index commandes_date_idx on public.commandes (date_livraison);

-- ---------- Tours (rotations camion pour une commande) ----------
create table public.tours (
  id               uuid primary key default gen_random_uuid(),
  commande_id      uuid not null references public.commandes(id) on delete cascade,
  camion_id        uuid references public.camions(id) on delete set null,
  numero           integer not null default 1,
  volume_m3        numeric(5,2),
  heure_chargement time,
  heure_chantier   time,
  statut           text not null default 'prevu'
                   check (statut in ('prevu','charge','livre','annule')),
  operateur_id     uuid references public.operateurs(id) on delete set null,
  cree_le          timestamptz not null default now(),
  modifie_le       timestamptz not null default now()
);
create index tours_commande_idx on public.tours (commande_id);

-- ---------- Planning camions (renfort, détachement, indisponibilité) ----------
create table public.planning_camions (
  id          uuid primary key default gen_random_uuid(),
  camion_id   uuid not null references public.camions(id) on delete cascade,
  jour        date not null,
  statut      text not null default 'disponible'
              check (statut in ('disponible','renfort','detachement','indisponible')),
  note        text,
  cree_le     timestamptz not null default now(),
  modifie_le  timestamptz not null default now(),
  unique (camion_id, jour)
);

-- ---------- Journal de bord (dont changements de produit) ----------
create table public.journal (
  id            uuid primary key default gen_random_uuid(),
  jour          date not null default current_date,
  type          text not null default 'note'
                check (type in ('note','changement_produit','incident')),
  message       text not null,
  auteur_id     uuid references public.profils(id) on delete set null,
  operateur_id  uuid references public.operateurs(id) on delete set null,
  cree_le       timestamptz not null default now()
);

-- ---------- Historique : qui a modifié quoi et quand ----------
create table public.historique (
  id           bigint generated always as identity primary key,
  table_nom    text not null,
  ligne_id     uuid,
  action       text not null,              -- INSERT, UPDATE, DELETE
  avant        jsonb,
  apres        jsonb,
  auteur_id    uuid,                       -- compte connecté (auth.uid())
  fait_le      timestamptz not null default now()
);

create or replace function public.tracer_historique()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.historique (table_nom, ligne_id, action, avant, apres, auteur_id)
  values (
    tg_table_name,
    coalesce((case when tg_op = 'DELETE' then old.id else new.id end), null),
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
    auth.uid()
  );
  return coalesce(new, old);
end $$;

-- ---------- Déclencheurs ----------
do $$
declare t text;
begin
  foreach t in array array['profils','clients','chantiers','formules','camions','commandes','tours','planning_camions'] loop
    execute format('create trigger %I_modifie_le before update on public.%I for each row execute function public.maj_modifie_le()', t, t);
  end loop;
  foreach t in array array['clients','chantiers','formules','camions','commandes','tours','planning_camions','journal'] loop
    execute format('create trigger %I_historique after insert or update or delete on public.%I for each row execute function public.tracer_historique()', t, t);
  end loop;
end $$;

-- ---------- Sécurité : RLS activé partout (tout est fermé tant que les règles de l'axe 4 ne sont pas posées) ----------
alter table public.profils          enable row level security;
alter table public.operateurs       enable row level security;
alter table public.clients          enable row level security;
alter table public.chantiers        enable row level security;
alter table public.formules         enable row level security;
alter table public.camions          enable row level security;
alter table public.commandes        enable row level security;
alter table public.tours            enable row level security;
alter table public.planning_camions enable row level security;
alter table public.journal          enable row level security;
alter table public.historique       enable row level security;
