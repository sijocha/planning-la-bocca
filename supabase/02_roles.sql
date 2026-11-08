-- =========================================================
-- Planning Centraliste – Axe 4 : rôles et règles d'accès
-- =========================================================

-- ---------- Liste des personnes autorisées (gérée par l'admin) ----------
create table public.autorisations (
  email      text primary key,
  nom        text,
  role       text not null default 'lecture'
             check (role in ('admin','centraliste','commercial','labo','lecture')),
  actif      boolean not null default true,
  cree_le    timestamptz not null default now()
);
alter table public.autorisations enable row level security;

-- Les adresses autorisées sont ajoutées directement dans la table (jamais dans ce dépôt public) :
-- insert into public.autorisations (email, nom, role) values ('prenom.nom@exemple.fr', 'Prénom', 'centraliste');

-- ---------- Rôle de la personne connectée ----------
create or replace function public.mon_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profils where id = auth.uid() and actif
$$;

-- ---------- Création automatique du profil à la première connexion ----------
create or replace function public.creer_profil()
returns trigger language plpgsql security definer set search_path = public as $$
declare a public.autorisations;
begin
  select * into a from public.autorisations where lower(email) = lower(new.email);
  insert into public.profils (id, nom, email, role, actif)
  values (
    new.id,
    coalesce(a.nom, new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce(a.role, 'lecture'),
    coalesce(a.actif, false)          -- pas dans la liste = compte inactif, aucun accès
  );
  return new;
end $$;

create trigger profil_a_la_creation
after insert on auth.users
for each row execute function public.creer_profil();

-- ---------- Un changement dans la liste met à jour le profil ----------
create or replace function public.synchro_autorisation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    update public.profils set actif = false where lower(email) = lower(old.email);
    return old;
  end if;
  update public.profils
     set role = new.role, actif = new.actif, nom = coalesce(new.nom, nom)
   where lower(email) = lower(new.email);
  return new;
end $$;

create trigger autorisation_synchro
after insert or update or delete on public.autorisations
for each row execute function public.synchro_autorisation();

-- ---------- Auteur par défaut des commandes ----------
alter table public.commandes alter column cree_par set default auth.uid();
alter table public.journal   alter column auteur_id set default auth.uid();

-- ---------- Lecture : tout membre actif voit le planning ----------
do $$
declare t text;
begin
  foreach t in array array['clients','chantiers','formules','camions','commandes','tours','planning_camions','journal'] loop
    execute format('create policy "lecture membres" on public.%I for select to authenticated using ((select public.mon_role()) is not null)', t);
  end loop;
end $$;

-- ---------- Clients et chantiers : admin, centraliste, commercial ----------
do $$
declare t text;
begin
  foreach t in array array['clients','chantiers'] loop
    execute format('create policy "ajout" on public.%I for insert to authenticated with check ((select public.mon_role()) in (''admin'',''centraliste'',''commercial''))', t);
    execute format('create policy "modif" on public.%I for update to authenticated using ((select public.mon_role()) in (''admin'',''centraliste'',''commercial'')) with check ((select public.mon_role()) in (''admin'',''centraliste'',''commercial''))', t);
    execute format('create policy "suppr" on public.%I for delete to authenticated using ((select public.mon_role()) = ''admin'')', t);
  end loop;
end $$;

-- ---------- Formules : admin, centraliste, labo ----------
create policy "ajout" on public.formules for insert to authenticated
  with check ((select public.mon_role()) in ('admin','centraliste','labo'));
create policy "modif" on public.formules for update to authenticated
  using ((select public.mon_role()) in ('admin','centraliste','labo'))
  with check ((select public.mon_role()) in ('admin','centraliste','labo'));
create policy "suppr" on public.formules for delete to authenticated
  using ((select public.mon_role()) = 'admin');

-- ---------- Camions, planning camions, tours : admin, centraliste ----------
do $$
declare t text;
begin
  foreach t in array array['camions','planning_camions','tours'] loop
    execute format('create policy "ajout" on public.%I for insert to authenticated with check ((select public.mon_role()) in (''admin'',''centraliste''))', t);
    execute format('create policy "modif" on public.%I for update to authenticated using ((select public.mon_role()) in (''admin'',''centraliste'')) with check ((select public.mon_role()) in (''admin'',''centraliste''))', t);
    execute format('create policy "suppr" on public.%I for delete to authenticated using ((select public.mon_role()) in (''admin'',''centraliste''))', t);
  end loop;
end $$;

-- ---------- Commandes ----------
-- Ajout : admin, centraliste, commercial
create policy "ajout" on public.commandes for insert to authenticated
  with check ((select public.mon_role()) in ('admin','centraliste','commercial'));
-- Modification : admin et centraliste tout ; commercial seulement ses demandes pas encore planifiées
create policy "modif centrale" on public.commandes for update to authenticated
  using ((select public.mon_role()) in ('admin','centraliste'))
  with check ((select public.mon_role()) in ('admin','centraliste'));
create policy "modif commercial" on public.commandes for update to authenticated
  using ((select public.mon_role()) = 'commercial' and cree_par = (select auth.uid()) and statut in ('demandee','validee'))
  with check ((select public.mon_role()) = 'commercial' and statut in ('demandee','validee','annulee'));
-- Suppression : admin seulement (sinon on annule)
create policy "suppr" on public.commandes for delete to authenticated
  using ((select public.mon_role()) = 'admin');

-- ---------- Journal de bord : tout membre sauf lecture écrit ; admin corrige ----------
create policy "ajout" on public.journal for insert to authenticated
  with check ((select public.mon_role()) in ('admin','centraliste','commercial','labo'));
create policy "modif" on public.journal for update to authenticated
  using ((select public.mon_role()) = 'admin') with check ((select public.mon_role()) = 'admin');
create policy "suppr" on public.journal for delete to authenticated
  using ((select public.mon_role()) = 'admin');

-- ---------- Historique : lecture admin et centraliste, écriture uniquement par le système ----------
create policy "lecture" on public.historique for select to authenticated
  using ((select public.mon_role()) in ('admin','centraliste'));

-- ---------- Profils : chacun voit le sien, l'admin voit tout ; rôles modifiés seulement via la liste ----------
create policy "mon profil" on public.profils for select to authenticated
  using (id = (select auth.uid()) or (select public.mon_role()) = 'admin');

-- ---------- Liste des autorisations : admin seulement ----------
create policy "admin" on public.autorisations for all to authenticated
  using ((select public.mon_role()) = 'admin') with check ((select public.mon_role()) = 'admin');

-- ---------- Opérateurs (code à 4 chiffres) : le code n'est jamais lisible ----------
revoke all on public.operateurs from anon, authenticated;
grant select (id, nom, profil_id, actif, cree_le) on public.operateurs to authenticated;
create policy "lecture membres" on public.operateurs for select to authenticated
  using ((select public.mon_role()) is not null);

-- L'admin définit un code (stocké chiffré)
create or replace function public.definir_code_operateur(p_operateur uuid, p_code text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if public.mon_role() <> 'admin' then raise exception 'Réservé à l''admin'; end if;
  if p_code !~ '^[0-9]{4}$' then raise exception 'Le code doit faire 4 chiffres'; end if;
  update public.operateurs set code_hash = extensions.crypt(p_code, extensions.gen_salt('bf')) where id = p_operateur;
end $$;

-- Vérifier un code au poste centrale
create or replace function public.verifier_code_operateur(p_operateur uuid, p_code text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare h text;
begin
  if public.mon_role() is null then return false; end if;
  select code_hash into h from public.operateurs where id = p_operateur and actif;
  return h is not null and h = extensions.crypt(p_code, h);
end $$;

-- L'admin gère la liste des opérateurs
create or replace function public.ajouter_operateur(p_nom text, p_code text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare nid uuid;
begin
  if public.mon_role() <> 'admin' then raise exception 'Réservé à l''admin'; end if;
  insert into public.operateurs (nom) values (p_nom) returning id into nid;
  perform public.definir_code_operateur(nid, p_code);
  return nid;
end $$;

-- ---------- Aucune fonction n'est appelable sans être connecté ----------
revoke execute on function public.mon_role(), public.definir_code_operateur(uuid,text),
  public.verifier_code_operateur(uuid,text), public.ajouter_operateur(text,text) from public, anon;
grant execute on function public.mon_role(), public.definir_code_operateur(uuid,text),
  public.verifier_code_operateur(uuid,text), public.ajouter_operateur(text,text) to authenticated;
revoke execute on function public.creer_profil(), public.synchro_autorisation(), public.tracer_historique() from public, anon, authenticated;
