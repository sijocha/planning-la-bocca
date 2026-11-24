-- =========================================================
-- Planning Centraliste – Notifications sur le téléphone (écran de verrouillage)
-- À exécuter une fois dans Supabase → SQL Editor, puis déployer la fonction « notifs »
-- (supabase/functions/notifs/index.ts).
-- =========================================================

create extension if not exists pg_net;

-- Clés de notification et secret partagé base ↔ fonction : lisibles par la fonction seulement
create table if not exists public.push_config (
  id             int primary key default 1 check (id = 1),
  vapid_public   text,
  vapid_private  text,
  secret         text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;
insert into public.push_config (id) values (1) on conflict (id) do nothing;

-- Un téléphone (ou ordinateur) abonné = une ligne
create table if not exists public.push_abonnements (
  endpoint  text primary key,
  p256dh    text not null,
  auth      text not null,
  par       uuid not null default auth.uid(),
  role      text,
  nom       text,                                  -- nom affiché, ex. « Morgan (commercial) » : reçoit ce qui touche ses commandes
  prefs     jsonb not null default '{}'::jsonb,    -- notifications coupées par la personne
  appareil  text,
  cree_le   timestamptz not null default now(),
  vu_le     timestamptz not null default now()
);
alter table public.push_abonnements enable row level security;
drop policy if exists "mes appareils" on public.push_abonnements;
create policy "mes appareils" on public.push_abonnements for all to authenticated
  using (par = (select auth.uid()))
  with check (par = (select auth.uid()) and (select public.mon_role()) is not null);

-- Le rôle vient de la base (seul un admin choisit le rôle sous lequel il travaille)
create or replace function public.push_abonnement_role()
returns trigger language plpgsql security definer set search_path = public as $$
declare r text := public.mon_role();
begin
  new.par := auth.uid();
  if r <> 'admin' or new.role is null or new.role not in ('centraliste','commercial','labo','lecture') then
    new.role := case when r = 'admin' then 'centraliste' else r end;
  end if;
  new.vu_le := now();
  return new;
end $$;
drop trigger if exists push_abonnement_role on public.push_abonnements;
create trigger push_abonnement_role before insert or update on public.push_abonnements
for each row execute function public.push_abonnement_role();
revoke execute on function public.push_abonnement_role() from public, anon, authenticated;

-- À chaque changement utile, la base prévient la fonction « notifs » (qui décide qui reçoit quoi).
-- Toute erreur ici est ignorée : une notification ne bloque jamais un enregistrement.
create or replace function public.documents_notifs()
returns trigger language plpgsql security definer set search_path = public as $$
declare sec text; vo numeric; vn numeric;
begin
  begin
    if new.collection = 'chat' then
      if tg_op <> 'INSERT' then return new; end if;
    elsif new.collection = 'ref' then
      if new.id <> 'demandes' or (tg_op = 'UPDATE' and old.data = new.data) then return new; end if;
    elsif new.collection = 'orders' then
      if tg_op = 'INSERT' then
        if coalesce(new.data->>'kind', '') <> 'aplacer' then return new; end if;
      else
        select coalesce(sum(case when t->>'v' ~ '^[0-9.]+$' then (t->>'v')::numeric else 0 end), 0) into vo from jsonb_array_elements(coalesce(old.data->'tours', '[]'::jsonb)) t;
        select coalesce(sum(case when t->>'v' ~ '^[0-9.]+$' then (t->>'v')::numeric else 0 end), 0) into vn from jsonb_array_elements(coalesce(new.data->'tours', '[]'::jsonb)) t;
        if old.data->'kind' is not distinct from new.data->'kind'
           and old.data->'modv' is not distinct from new.data->'modv'
           and old.data->>'st' is not distinct from new.data->>'st'
           and old.data->>'h' is not distinct from new.data->>'h'
           and old.data->>'date' is not distinct from new.data->>'date'
           and old.data->>'f' is not distinct from new.data->>'f'
           and vo = vn then return new; end if;
      end if;
    else
      return new;
    end if;
    if not exists (select 1 from public.push_abonnements) then return new; end if;
    select secret into sec from public.push_config where id = 1;
    perform net.http_post(
      url := 'https://apedxvyezcitbphlzlfr.supabase.co/functions/v1/notifs',
      body := jsonb_build_object('collection', new.collection, 'id', new.id,
                                 'old', case when tg_op = 'UPDATE' then old.data end,
                                 'new', new.data, 'auteur', new.modifie_par),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-secret', sec),
      timeout_milliseconds := 8000);
  exception when others then
    null;
  end;
  return new;
end $$;
drop trigger if exists documents_notifs on public.documents;
create trigger documents_notifs after insert or update on public.documents
for each row execute function public.documents_notifs();
revoke execute on function public.documents_notifs() from public, anon, authenticated;

-- Bouton « Envoyer une notification de test » : n'envoie qu'aux appareils de la personne
create or replace function public.push_test()
returns void language plpgsql security definer set search_path = public as $$
declare sec text;
begin
  if public.mon_role() is null then raise exception 'Non autorisé' using errcode = '42501'; end if;
  select secret into sec from public.push_config where id = 1;
  perform net.http_post(
    url := 'https://apedxvyezcitbphlzlfr.supabase.co/functions/v1/notifs',
    body := jsonb_build_object('test', auth.uid()),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-secret', sec),
    timeout_milliseconds := 8000);
end $$;
revoke execute on function public.push_test() from public, anon;
grant execute on function public.push_test() to authenticated;
