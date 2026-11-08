-- =========================================================
-- Planning Centraliste – Axe 5 : stockage des données de la page
-- La page enregistre ses données en « documents » (commandes, journées,
-- référentiels, messages). Une ligne = un document.
-- =========================================================

create table public.documents (
  collection   text not null check (collection in ('orders','days','ref','chat')),
  id           text not null,
  data         jsonb not null,
  modifie_le   timestamptz not null default now(),
  modifie_par  uuid default auth.uid(),
  primary key (collection, id)
);
alter table public.documents enable row level security;

-- Date et auteur de chaque modification
create or replace function public.documents_maj()
returns trigger language plpgsql as $$
begin
  new.modifie_le = now();
  new.modifie_par = auth.uid();
  return new;
end $$;
create trigger documents_maj before insert or update on public.documents
for each row execute function public.documents_maj();

-- Historique des commandes (qui a changé quoi et quand)
alter table public.historique alter column ligne_id type text using ligne_id::text;
create or replace function public.documents_historique()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.collection, old.collection) <> 'orders' then return coalesce(new, old); end if;
  insert into public.historique (table_nom, ligne_id, action, avant, apres, auteur_id)
  values ('commande', coalesce(new.id, old.id), tg_op,
          case when tg_op in ('UPDATE','DELETE') then old.data end,
          case when tg_op in ('INSERT','UPDATE') then new.data end,
          auth.uid());
  return coalesce(new, old);
end $$;
create trigger documents_historique after insert or update or delete on public.documents
for each row execute function public.documents_historique();
revoke execute on function public.documents_historique() from public, anon, authenticated;

-- Règles : tout membre actif lit ; admin, centraliste, commercial et labo écrivent ; lecture seule sinon
create policy "lecture membres" on public.documents for select to authenticated
  using ((select public.mon_role()) is not null);
create policy "ajout" on public.documents for insert to authenticated
  with check ((select public.mon_role()) in ('admin','centraliste','commercial','labo'));
create policy "modif" on public.documents for update to authenticated
  using ((select public.mon_role()) in ('admin','centraliste','commercial','labo'))
  with check ((select public.mon_role()) in ('admin','centraliste','commercial','labo'));
create policy "suppr" on public.documents for delete to authenticated
  using ((select public.mon_role()) in ('admin','centraliste','commercial','labo'));

-- Rien pour les visiteurs non connectés
revoke all on public.documents from anon;

-- Mises à jour en direct chez tout le monde
alter publication supabase_realtime add table public.documents;

-- Profil de la personne connectée (nom, rôle, actif) lisible par la page
create or replace function public.mon_profil()
returns table (nom text, email text, role text, actif boolean)
language sql stable security definer set search_path = public as $$
  select nom, email, role, actif from public.profils where id = auth.uid()
$$;
revoke execute on function public.mon_profil() from public, anon;
grant execute on function public.mon_profil() to authenticated;
