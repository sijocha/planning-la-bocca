-- Vérifications des règles de la base. Chaque ligne fausse arrête tout avec un message clair.
create function pg_temp.doit_echouer(q text, code text, quoi text) returns void language plpgsql as $$
begin
  execute q;
  raise exception 'ÉCHEC : % aurait dû être refusé', quoi;
exception when others then
  if sqlerrm like 'ÉCHEC%' then raise; end if;
  if sqlstate <> code then raise exception 'ÉCHEC : % refusé avec le code % au lieu de %', quoi, sqlstate, code; end if;
end $$;
create function pg_temp.verifier(ok boolean, quoi text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'ÉCHEC : %', quoi; end if; end $$;

insert into public.autorisations(email,nom,role) values ('c@x','Jonathan','centraliste'),('m@x','Morgan','commercial'),('l@x','Léa','labo'),('v@x','Paul','lecture');
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000c1','c@x'),('00000000-0000-0000-0000-0000000000a1','m@x'),
  ('00000000-0000-0000-0000-0000000000b1','l@x'),('00000000-0000-0000-0000-0000000000d1','v@x');
insert into public.documents(collection,id,data) values
  ('orders','o1','{"kind":"cmd","h":"07:30","date":"2026-11-25","tours":[{"v":8,"s":0}]}'),
  ('orders','o4','{"kind":"cmd","h":"09:00","date":"2026-11-27","tours":[{"v":6}]}'),
  ('ref','clients','{"v":[]}'),('ref','demandes','{"v":[]}'),('ref','config','{}'),
  ('days','2026-11-26','{"cloture":{"by":"Jonathan","at":"18:00"}}'),('days','2026-11-27','{}');
set role authenticated;

-- ---------- 09 : une commande ouverte par quelqu'un est bloquée pour les autres ----------
set test.uid='00000000-0000-0000-0000-0000000000a1';
select pg_temp.verifier((select a_moi from public.prendre_verrou('o1','Morgan')), 'le commercial prend le verrou');
set test.uid='00000000-0000-0000-0000-0000000000c1';
select pg_temp.verifier(not (select a_moi from public.prendre_verrou('o1','Jonathan')), 'le centraliste voit la commande prise');
select pg_temp.doit_echouer($$update public.documents set data=jsonb_set(data,'{h}','"09:00"') where collection='orders' and id='o1'$$, '55P03', 'enregistrer une commande verrouillée par un autre');
set test.uid='00000000-0000-0000-0000-0000000000a1';
update public.documents set data=jsonb_set(data,'{h}','"08:00"') where collection='orders' and id='o1';
select public.rendre_verrou('o1');
set test.uid='00000000-0000-0000-0000-0000000000c1';
select pg_temp.verifier((select a_moi from public.prendre_verrou('o1','Jonathan')), 'verrou libre après validation');
select public.rendre_verrou('o1');

-- ---------- 12 : journée clôturée ----------
reset role; update public.documents set data=jsonb_set(data,'{date}','"2026-11-26"') where id='o1'; set role authenticated;
set test.uid='00000000-0000-0000-0000-0000000000a1';
select pg_temp.doit_echouer($$update public.documents set data=jsonb_set(data,'{date}','"2026-11-26"') where id='o4'$$, 'PLB01', 'commercial déplaçant une commande vers un jour clôturé');
select pg_temp.doit_echouer($$update public.documents set data=jsonb_set(data,'{h}','"12:00"') where id='o1'$$, 'PLB01', 'commercial modifiant un jour clôturé');
select pg_temp.doit_echouer($$update public.documents set data=jsonb_set(data,'{semis}','[]') where collection='days' and id='2026-11-26'$$, 'PLB01', 'commercial modifiant la journée clôturée');
select pg_temp.doit_echouer($$update public.documents set data='{"cloture":{"by":"M"}}' where collection='days' and id='2026-11-27'$$, 'PLB01', 'commercial clôturant une journée');
update public.documents set data='{"semis":[]}' where collection='days' and id='2026-11-27';
set test.uid='00000000-0000-0000-0000-0000000000c1';
update public.documents set data=jsonb_set(data,'{h}','"13:00"') where id='o1';
select pg_temp.verifier((select data->>'h' from public.documents where id='o1')='13:00', 'le centraliste modifie un jour clôturé');

-- ---------- 13 : droits sur les réglages ----------
set test.uid='00000000-0000-0000-0000-0000000000a1';
select pg_temp.verifier(public.doc_ecriture_ok('ref','config') and public.doc_ecriture_ok('ref','formcat'), 'le commercial modifie les réglages de la centrale');
set test.uid='00000000-0000-0000-0000-0000000000b1';
select pg_temp.verifier(not public.doc_ecriture_ok('ref','config'), 'le labo ne modifie pas les réglages');
set test.uid='00000000-0000-0000-0000-0000000000d1';
select pg_temp.verifier(not public.doc_ecriture_ok('orders','o1') and not public.doc_ecriture_ok('chat','m1'), 'la lecture seule n''écrit rien');

-- ---------- 10 : notifications ----------
set test.uid='00000000-0000-0000-0000-0000000000a1';
insert into public.push_abonnements(endpoint,p256dh,auth,role,nom) values ('https://push/m','k','a','centraliste','Morgan');
select pg_temp.verifier((select role from public.push_abonnements)='commercial', 'un appareil ne peut pas choisir un autre rôle');
select pg_temp.doit_echouer('select * from public.push_config', '42501', 'lire la clé secrète des notifications');
reset role; truncate net.appels; set role authenticated;
set test.uid='00000000-0000-0000-0000-0000000000c1';
insert into public.documents(collection,id,data) values ('orders','o2','{"kind":"aplacer","h":"10:00","date":"2026-11-27","tours":[{"v":"7,5"}]}');
insert into public.documents(collection,id,data) values ('orders','o3','{"kind":"cmd","h":"10:00","date":"2026-11-27","tours":[{"v":4}]}');
update public.documents set data=jsonb_set(data,'{tours,0,s}','1') where id='o3';
insert into public.documents(collection,id,data) values ('chat','m1','{"t":"salut"}');
update public.documents set data='{"v":[{"id":"z"}]}' where collection='ref' and id='clients';
update public.documents set data='{"v":[{"id":"r1","t":"?"}]}' where collection='ref' and id='demandes';
reset role;
select pg_temp.verifier((select string_agg(body->>'collection'||':'||(body->>'id'), ' ' order by id) from net.appels) = 'orders:o2 chat:m1 ref:demandes',
  'notifications envoyées seulement pour : commande à valider, chat, demande (reçu : '||coalesce((select string_agg(body->>'collection'||':'||(body->>'id'), ' ' order by id) from net.appels),'rien')||')');
select pg_temp.verifier((select bool_and(headers->>'x-secret'=(select secret from public.push_config)) from net.appels), 'chaque appel porte le secret');

-- ---------- 11 : rappel des pompes programmé ----------
select pg_temp.verifier((select count(*) from cron.job where jobname like 'rappel-pompes-%')=2, 'deux horaires du rappel (hiver, été)');

-- ---------- 14 : état de la base (ici, seul 08 manque : le temps réel n'existe que chez Supabase) ----------
set role authenticated;
set test.uid='00000000-0000-0000-0000-0000000000a1';
select pg_temp.verifier(public.etat_base() is null, 'état de la base réservé aux admins');
reset role;
insert into public.autorisations(email,nom,role) values ('adm@x','Admin','admin');
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000e1','adm@x');
set role authenticated;
set test.uid='00000000-0000-0000-0000-0000000000e1';
select pg_temp.verifier((public.etat_base()->'manque') = '["08"]'::jsonb, 'état de la base : seul 08 absent (reçu '||(public.etat_base())::text||')');
reset role;
drop trigger documents_cloture on public.documents;
set role authenticated;
select pg_temp.verifier((public.etat_base()->'manque') = '["08","12"]'::jsonb, 'état de la base : 12 retiré détecté');
reset role;
