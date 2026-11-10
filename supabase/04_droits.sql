-- =========================================================
-- Planning Centraliste – droits par rôle appliqués par la base
-- (avant : seule la page les appliquait)
-- =========================================================

-- Qui peut écrire quel document
create or replace function public.doc_ecriture_ok(p_collection text, p_id text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare r text := public.mon_role();
begin
  if r is null or r = 'lecture' then return false; end if;
  if r in ('admin','centraliste') then return true; end if;
  -- commercial et labo
  if p_collection in ('orders','days','chat') then return true; end if;
  if p_collection = 'ref' then return p_id in ('clients','chantiers','formules','demandes'); end if;
  return false;
end $$;
revoke execute on function public.doc_ecriture_ok(text,text) from public, anon;
grant execute on function public.doc_ecriture_ok(text,text) to authenticated;

drop policy if exists "ajout" on public.documents;
drop policy if exists "modif" on public.documents;
drop policy if exists "suppr" on public.documents;

create policy "ajout" on public.documents for insert to authenticated
  with check (public.doc_ecriture_ok(collection, id));
create policy "modif" on public.documents for update to authenticated
  using (public.doc_ecriture_ok(collection, id))
  with check (public.doc_ecriture_ok(collection, id));
-- Suppression : admin et centraliste ; les autres seulement les messages du chat de plus de 6 jours
create policy "suppr" on public.documents for delete to authenticated
  using (
    (select public.mon_role()) in ('admin','centraliste')
    or (collection = 'chat' and (select public.mon_role()) in ('commercial','labo')
        and coalesce((data->>'ts')::bigint, 0) < (extract(epoch from now() - interval '6 days') * 1000)::bigint)
  );

-- Garde sur les commandes : statut réservé au centraliste, validation interdite au labo
create or replace function public.documents_garde()
returns trigger language plpgsql security definer set search_path = public as $$
declare r text := public.mon_role();
begin
  if new.collection <> 'orders' or r is null or r in ('admin','centraliste') then return new; end if;
  if coalesce(new.data->>'st','') is distinct from coalesce(old.data->>'st','') then
    raise exception 'Statut de la commande : réservé au centraliste' using errcode = '42501';
  end if;
  if r = 'labo' and coalesce(new.data->>'kind','') is distinct from coalesce(old.data->>'kind','') then
    raise exception 'Validation de la commande : réservée au centraliste et au commercial' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists documents_garde on public.documents;
create trigger documents_garde before update on public.documents
for each row execute function public.documents_garde();
revoke execute on function public.documents_garde() from public, anon, authenticated;

-- Chargement par période : recherche rapide des commandes par date
create index if not exists documents_orders_date on public.documents ((data->>'date')) where collection = 'orders';
