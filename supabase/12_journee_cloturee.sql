-- =========================================================
-- Planning Centraliste – Journée clôturée : seul le centraliste (ou l'admin) peut la modifier
-- Le commercial et le labo ne peuvent plus modifier une commande d'un jour clôturé,
-- ni la déplacer vers ou depuis ce jour, ni toucher à la journée (agrégats, liants, clôture).
-- À exécuter une fois dans Supabase → SQL Editor.
-- =========================================================

create or replace function public.documents_cloture()
returns trigger language plpgsql security definer set search_path = public as $$
declare r text := public.mon_role(); d text;
begin
  if r is null or r in ('admin', 'centraliste') then return new; end if;
  if new.collection = 'orders' then
    foreach d in array array[new.data->>'date', case when tg_op = 'UPDATE' then old.data->>'date' end] loop
      if d is not null and exists (
        select 1 from public.documents x
         where x.collection = 'days' and x.id = d and coalesce(x.data->'cloture', 'null'::jsonb) <> 'null'::jsonb) then
        raise exception 'Journée du % clôturée : seul le centraliste peut la modifier', d using errcode = 'PLB01';
      end if;
    end loop;
  elsif new.collection = 'days' then
    if (tg_op = 'UPDATE' and coalesce(old.data->'cloture', 'null'::jsonb) <> 'null'::jsonb)
       or (coalesce(new.data->'cloture', 'null'::jsonb) <> 'null'::jsonb
           and (tg_op = 'INSERT' or old.data->'cloture' is distinct from new.data->'cloture')) then
      raise exception 'Journée du % clôturée : seul le centraliste peut la modifier', new.id using errcode = 'PLB01';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists documents_cloture on public.documents;
create trigger documents_cloture before insert or update on public.documents
for each row execute function public.documents_cloture();
revoke execute on function public.documents_cloture() from public, anon, authenticated;
