-- =========================================================
-- Planning Centraliste – Tech labo : aucune modification de commande
-- Le labo consulte les commandes. Il peut seulement : ajouter une info (à la suite des infos existantes)
-- et proposer une formule (fLabo). Il ne crée, ne modifie ni ne supprime aucune commande.
-- Le planning l'empêche déjà ; ce script le garantit aussi dans la base.
-- À exécuter une fois dans Supabase → SQL Editor (et à relancer sans risque).
-- =========================================================
create or replace function public.documents_labo()
returns trigger language plpgsql security definer set search_path = public as $$
declare r text := public.mon_role(); a jsonb; b jsonb; n int;
begin
  if r is distinct from 'labo' then return coalesce(new, old); end if;
  if coalesce(new.collection, old.collection) <> 'orders' then return coalesce(new, old); end if;
  if tg_op <> 'UPDATE' then
    raise exception 'Tech labo : les commandes sont saisies par le commercial ou la centrale' using errcode = 'PLB01';
  end if;
  if (old.data - 'pills' - 'fLabo' - 'maj') is distinct from (new.data - 'pills' - 'fLabo' - 'maj') then
    raise exception 'Tech labo : une commande ne se modifie pas (ajoutez une info ou faites une demande)' using errcode = 'PLB01';
  end if;
  a := coalesce(old.data->'pills', '[]'::jsonb); b := coalesce(new.data->'pills', '[]'::jsonb); n := jsonb_array_length(a);
  if jsonb_array_length(b) < n
     or (select coalesce(jsonb_agg(e order by k), '[]'::jsonb) from jsonb_array_elements(b) with ordinality as t(e, k) where k <= n) is distinct from a then
    raise exception 'Tech labo : les infos existantes ne se modifient pas (ajout seulement)' using errcode = 'PLB01';
  end if;
  return new;
end $$;
drop trigger if exists documents_labo on public.documents;
create trigger documents_labo before insert or update or delete on public.documents
for each row execute function public.documents_labo();
revoke execute on function public.documents_labo() from public, anon, authenticated;

-- État de la base : le planning vérifie aussi ce script.
create or replace function public.etat_base()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare manque text[] := '{}';
begin
  if public.mon_role() is distinct from 'admin' then return null; end if;
  if to_regclass('realtime.messages') is null
     or not exists (select 1 from pg_policies where schemaname='realtime' and tablename='messages' and policyname='planning membres recoivent')
    then manque := manque || '08'::text; end if;
  if to_regclass('public.verrous') is null
     or not exists (select 1 from pg_trigger where tgname='documents_verrou' and not tgisinternal)
    then manque := manque || '09'::text; end if;
  if to_regclass('public.push_config') is null
     or not exists (select 1 from pg_trigger where tgname='documents_notifs' and not tgisinternal)
    then manque := manque || '10'::text; end if;
  if to_regprocedure('public.push_rappel_pompes()') is null or to_regclass('cron.job') is null
     or (select count(*) from cron.job where jobname like 'rappel-pompes-%') < 2
    then manque := manque || '11'::text; end if;
  if not exists (select 1 from pg_trigger where tgname='documents_cloture' and not tgisinternal)
    then manque := manque || '12'::text; end if;
  if (select prosrc from pg_proc where oid = to_regprocedure('public.doc_ecriture_ok(text,text)')) not like '%plaquesX%'
     or to_regprocedure('public.doc_ecriture_ok(text,text)') is null
    then manque := manque || '13'::text; end if;
  if to_regclass('public.erreurs') is null or to_regprocedure('public.erreur_log(jsonb)') is null
     or not exists (select 1 from cron.job where jobname = 'erreurs-menage')
    then manque := manque || '15'::text; end if;
  if not exists (select 1 from pg_trigger where tgname='documents_labo' and not tgisinternal)
    then manque := manque || '16'::text; end if;
  return jsonb_build_object('version', 16, 'manque', to_jsonb(manque));
end $$;
revoke execute on function public.etat_base() from public, anon;
grant execute on function public.etat_base() to authenticated;
