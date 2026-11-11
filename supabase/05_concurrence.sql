-- =========================================================
-- Planning Centraliste – enregistrements simultanés, journal séparé, purge
-- =========================================================

-- 1. Le journal devient une collection à part : une ligne = un document (jamais réécrit)
alter table public.documents drop constraint if exists documents_collection_check;
alter table public.documents add constraint documents_collection_check
  check (collection in ('orders','days','ref','chat','journal'));

create or replace function public.doc_ecriture_ok(p_collection text, p_id text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare r text := public.mon_role();
begin
  if r is null or r = 'lecture' then return false; end if;
  if r in ('admin','centraliste') then return true; end if;
  -- commercial et labo
  if p_collection in ('orders','days','chat','journal') then return true; end if;
  if p_collection = 'ref' then return p_id in ('clients','chantiers','formules','demandes'); end if;
  return false;
end $$;

-- 2. Enregistrement conditionnel : refusé si quelqu'un a modifié le document depuis la version connue
--    p_expected = date de modification connue par la page (null = le document ne doit pas encore exister)
create or replace function public.doc_set(p_collection text, p_id text, p_data jsonb, p_expected timestamptz)
returns timestamptz language plpgsql security invoker set search_path = public as $$
declare v timestamptz;
begin
  if not public.doc_ecriture_ok(p_collection, p_id) then
    raise exception 'Écriture non autorisée' using errcode = '42501';
  end if;
  if p_expected is null then
    insert into public.documents (collection, id, data) values (p_collection, p_id, p_data)
      on conflict (collection, id) do nothing
      returning modifie_le into v;
  else
    update public.documents set data = p_data
      where collection = p_collection and id = p_id and modifie_le = p_expected
      returning modifie_le into v;
  end if;
  if v is null then
    raise exception 'Document modifié entre-temps' using errcode = '40001';
  end if;
  return v;
end $$;
revoke execute on function public.doc_set(text,text,jsonb,timestamptz) from public, anon;
grant execute on function public.doc_set(text,text,jsonb,timestamptz) to authenticated;

-- 3. Purge automatique : historique et journal au-delà de 13 mois
--    (de temps en temps, lors d'un enregistrement de commande ; la sauvegarde annuelle garde le reste)
create or replace function public.documents_historique()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.collection, old.collection) <> 'orders' then return coalesce(new, old); end if;
  insert into public.historique (table_nom, ligne_id, action, avant, apres, auteur_id)
  values ('commande', coalesce(new.id, old.id), tg_op,
          case when tg_op in ('UPDATE','DELETE') then old.data end,
          case when tg_op in ('INSERT','UPDATE') then new.data end,
          auth.uid());
  if random() < 0.02 then
    delete from public.historique where fait_le < now() - interval '13 months';
    delete from public.documents where collection = 'journal' and id < to_char(now() - interval '13 months', 'YYYY-MM-DD');
  end if;
  return coalesce(new, old);
end $$;
revoke execute on function public.documents_historique() from public, anon, authenticated;
