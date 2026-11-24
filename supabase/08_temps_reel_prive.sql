-- =========================================================
-- Planning Centraliste – Temps réel réservé aux membres
-- Avant : le canal de présence (qui est connecté, qui modifie quelle commande)
-- était joignable avec la seule clé publique de la page, sans compte.
-- Après : seuls les comptes actifs du planning rejoignent les canaux.
-- À exécuter une fois dans Supabase → SQL Editor, AVANT la mise à jour de la page.
-- =========================================================

-- Rejoindre et recevoir : présence et mises à jour des documents
drop policy if exists "planning membres recoivent" on realtime.messages;
create policy "planning membres recoivent" on realtime.messages
  for select to authenticated
  using (
    (select public.mon_role()) is not null
    and (realtime.topic() = 'presence-planning' or realtime.topic() like 'documents-direct-%')
  );

-- Annoncer sa présence (nom, rôle, commande ouverte)
drop policy if exists "planning membres annoncent" on realtime.messages;
create policy "planning membres annoncent" on realtime.messages
  for insert to authenticated
  with check (
    (select public.mon_role()) is not null
    and realtime.topic() = 'presence-planning'
    and realtime.messages.extension = 'presence'
  );
