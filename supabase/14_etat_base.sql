-- =========================================================
-- Planning Centraliste – État de la base
-- Le planning vérifie au démarrage (comptes admin) que tous les scripts sont bien passés
-- et affiche ceux qui manquent. Rien n'est modifié par cette fonction.
-- À exécuter une fois dans Supabase → SQL Editor (et à relancer sans risque).
-- =========================================================
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
  return jsonb_build_object('version', 14, 'manque', to_jsonb(manque));
end $$;
revoke execute on function public.etat_base() from public, anon;
grant execute on function public.etat_base() to authenticated;
