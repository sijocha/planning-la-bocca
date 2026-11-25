-- =========================================================
-- Planning Centraliste – Rappel des bons de pompe, la veille au matin (6 h 45, heure de Paris)
-- Chaque matin, une notification liste les pompes du prochain jour travaillé dont le bon n'est pas fait.
-- Nécessite 10_notifications.sql et la fonction « notifs ». À exécuter une fois dans SQL Editor.
-- =========================================================

create extension if not exists pg_cron;

create or replace function public.push_rappel_pompes()
returns void language plpgsql security definer set search_path = public as $$
declare sec text;
begin
  select secret into sec from public.push_config where id = 1;
  if sec is null then return; end if;
  perform net.http_post(
    url := 'https://apedxvyezcitbphlzlfr.supabase.co/functions/v1/notifs',
    body := jsonb_build_object('rappel', 'pompes'),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-secret', sec,
                                  'apikey', 'sb_publishable_M5zlEKqHdyao-lh1lt0rDg_DbimP0TS'),
    timeout_milliseconds := 15000);
end $$;
revoke execute on function public.push_rappel_pompes() from public, anon, authenticated;

-- pg_cron compte en heure universelle : on planifie 5 h 45 et 4 h 45 UTC (6 h 45 en hiver et en été) ;
-- la fonction n'envoie qu'à l'heure de Paris 6 h, donc une seule fois par jour.
do $$ begin perform cron.unschedule('rappel-pompes-hiver'); exception when others then null; end $$;
do $$ begin perform cron.unschedule('rappel-pompes-ete'); exception when others then null; end $$;
select cron.schedule('rappel-pompes-hiver', '45 5 * * *', 'select public.push_rappel_pompes()');
select cron.schedule('rappel-pompes-ete',   '45 4 * * *', 'select public.push_rappel_pompes()');
