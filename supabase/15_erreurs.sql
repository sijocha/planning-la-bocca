-- =========================================================
-- Planning Centraliste – Erreurs du planning
-- Quand le planning plante chez quelqu'un (téléphone ou PC), le message d'erreur technique
-- est enregistré ici : qui (prénom, rôle), quand, quelle version, sur quel appareil.
-- Aucune donnée de commande ou de client. Lecture et effacement : comptes admin.
-- Les erreurs de plus de 30 jours sont effacées chaque nuit.
-- À exécuter une fois dans Supabase → SQL Editor (et à relancer sans risque).
-- =========================================================
create table if not exists public.erreurs (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  par     uuid default auth.uid(),
  nom     text,
  role    text,
  msg     text not null,
  src     text,
  pile    text,
  vue     text,
  version text,
  appareil text,
  n       int not null default 1
);
create index if not exists erreurs_at on public.erreurs (at desc);
alter table public.erreurs enable row level security;
revoke all on public.erreurs from anon, authenticated;
grant select, delete on public.erreurs to authenticated;
drop policy if exists "erreurs admin lit" on public.erreurs;
create policy "erreurs admin lit" on public.erreurs for select to authenticated using ((select public.mon_role()) = 'admin');
drop policy if exists "erreurs admin efface" on public.erreurs;
create policy "erreurs admin efface" on public.erreurs for delete to authenticated using ((select public.mon_role()) = 'admin');

-- Enregistrer une erreur (tout membre connecté). Textes tronqués ; au plus 50 erreurs par personne et par heure ;
-- la même erreur répétée dans l'heure augmente seulement le compteur.
create or replace function public.erreur_log(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare r text := public.mon_role(); m text := left(coalesce(p->>'msg',''), 300); x bigint;
begin
  if r is null or m = '' then return; end if;
  select id into x from public.erreurs where par = auth.uid() and msg = m and at > now() - interval '1 hour' order by at desc limit 1;
  if x is not null then update public.erreurs set n = n + 1, at = now() where id = x; return; end if;
  if (select count(*) from public.erreurs where par = auth.uid() and at > now() - interval '1 hour') >= 50 then return; end if;
  insert into public.erreurs (par, nom, role, msg, src, pile, vue, version, appareil)
  values (auth.uid(), left(p->>'nom', 40), r, m, left(p->>'src', 200), left(p->>'pile', 1500), left(p->>'vue', 60), left(p->>'version', 40), left(p->>'appareil', 160));
end $$;
revoke execute on function public.erreur_log(jsonb) from public, anon;
grant execute on function public.erreur_log(jsonb) to authenticated;

-- Ménage : effacer les erreurs de plus de 30 jours (chaque nuit à 3 h 17 UTC).
select cron.unschedule('erreurs-menage') where exists (select 1 from cron.job where jobname = 'erreurs-menage');
select cron.schedule('erreurs-menage', '17 3 * * *', $$delete from public.erreurs where at < now() - interval '30 days'$$);

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
  return jsonb_build_object('version', 15, 'manque', to_jsonb(manque));
end $$;
revoke execute on function public.etat_base() from public, anon;
grant execute on function public.etat_base() to authenticated;
