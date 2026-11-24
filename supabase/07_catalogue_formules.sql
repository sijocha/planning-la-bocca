-- =========================================================
-- Catalogue des formules (document ref/formcat) : modifiable par le centraliste ET le commercial
-- À exécuter une fois dans Supabase → SQL Editor
-- =========================================================
create or replace function public.doc_ecriture_ok(p_collection text, p_id text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare r text := public.mon_role();
begin
  if r is null or r = 'lecture' then return false; end if;
  if r in ('admin','centraliste') then return true; end if;
  -- commercial et labo
  if p_collection in ('orders','days','chat','journal') then return true; end if;   -- 'journal' : ajouté par 05, à garder
  if p_collection = 'ref' then return p_id in ('clients','chantiers','formules','demandes')
    or (p_id = 'formcat' and r = 'commercial'); end if;
  return false;
end $$;
revoke execute on function public.doc_ecriture_ok(text,text) from public, anon;
grant execute on function public.doc_ecriture_ok(text,text) to authenticated;
