-- =========================================================
-- Planning Centraliste – Le commercial a accès à tous les réglages de la centrale
-- (camions, pompes, fournisseurs, agence, carrières, raccourcis, autres camions)
-- Reprend 07 (catalogue des formules, journal) et ajoute config, liens et plaquesX.
-- À exécuter une fois dans Supabase → SQL Editor.
-- =========================================================
create or replace function public.doc_ecriture_ok(p_collection text, p_id text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare r text := public.mon_role();
begin
  if r is null or r = 'lecture' then return false; end if;
  if r in ('admin','centraliste') then return true; end if;
  if p_collection in ('orders','days','chat','journal') then return true; end if;
  if p_collection = 'ref' then
    return p_id in ('clients','chantiers','formules','demandes')
        or (r = 'commercial' and p_id in ('formcat','config','liens','plaquesX'));
  end if;
  return false;
end $$;
revoke execute on function public.doc_ecriture_ok(text,text) from public, anon;
grant execute on function public.doc_ecriture_ok(text,text) to authenticated;
