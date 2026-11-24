-- =========================================================
-- Planning Centraliste – Verrou des commandes tenu par la base
-- Quand quelqu'un ouvre une commande, la base lui donne le verrou.
-- Tant qu'il est actif (5 minutes sans action au plus), la base refuse
-- toute modification de cette commande par un autre compte.
-- À exécuter une fois dans Supabase → SQL Editor.
-- =========================================================

create table if not exists public.verrous (
  commande  text primary key,                     -- id de la commande (documents orders)
  par       uuid not null default auth.uid(),     -- compte qui modifie
  nom       text,                                 -- nom affiché aux autres (ex. « Morgan (commercial) »)
  depuis    timestamptz not null default now(),
  vu_le     timestamptz not null default now()    -- dernière activité ; au-delà de 5 min le verrou ne compte plus
);
alter table public.verrous enable row level security;
alter table public.verrous replica identity full;

drop policy if exists "lecture membres" on public.verrous;
create policy "lecture membres" on public.verrous for select to authenticated
  using ((select public.mon_role()) is not null);
-- aucune écriture directe : uniquement par les deux fonctions ci-dessous
revoke insert, update, delete on public.verrous from anon, authenticated;

-- Prendre (ou garder) le verrou. Renvoie qui le tient : soi-même, ou la personne qui l'avait déjà.
create or replace function public.prendre_verrou(p_commande text, p_nom text)
returns table (par uuid, nom text, depuis timestamptz, a_moi boolean)
language plpgsql security definer set search_path = public as $$
declare r text := public.mon_role();
begin
  if r is null or r = 'lecture' then raise exception 'Non autorisé' using errcode = '42501'; end if;
  delete from public.verrous v where v.commande = p_commande and v.vu_le < now() - interval '5 minutes';
  insert into public.verrous as v (commande, par, nom) values (p_commande, auth.uid(), p_nom)
    on conflict (commande) do update set vu_le = now(), nom = excluded.nom
    where v.par = auth.uid();
  return query select v.par, v.nom, v.depuis, v.par = auth.uid() from public.verrous v where v.commande = p_commande;
end $$;

-- Rendre le verrou (fermeture de la commande)
create or replace function public.rendre_verrou(p_commande text)
returns void language sql security definer set search_path = public as $$
  delete from public.verrous where commande = p_commande and par = auth.uid();
$$;

revoke execute on function public.prendre_verrou(text,text), public.rendre_verrou(text) from public, anon;
grant execute on function public.prendre_verrou(text,text), public.rendre_verrou(text) to authenticated;

-- La base refuse la modification d'une commande verrouillée par quelqu'un d'autre
create or replace function public.documents_verrou()
returns trigger language plpgsql security definer set search_path = public as $$
declare v public.verrous;
begin
  if new.collection <> 'orders' then return new; end if;
  select * into v from public.verrous
   where commande = new.id and par <> auth.uid() and vu_le > now() - interval '5 minutes';
  if found then
    raise exception 'Commande verrouillée par %', coalesce(v.nom, 'un collègue') using errcode = '55P03';
  end if;
  return new;
end $$;
drop trigger if exists documents_verrou on public.documents;
create trigger documents_verrou before update on public.documents
for each row execute function public.documents_verrou();
revoke execute on function public.documents_verrou() from public, anon, authenticated;

-- Les verrous s'affichent en direct chez tout le monde
do $$ begin
  alter publication supabase_realtime add table public.verrous;
exception when duplicate_object then null; end $$;
