-- =========================================================
-- Planning Centraliste – Prénoms pour l'écran « Qui prend le poste ? »
-- =========================================================
-- Renvoie le prénom et le rôle des personnes autorisées et actives.
-- Aucune adresse e-mail n'est renvoyée. Réservé aux comptes connectés
-- qui ont eux-mêmes accès au planning (rôle actif).

create or replace function public.prenoms_poste()
returns table (prenom text, role text)
language sql stable security definer set search_path = public as $$
  select distinct on (lower(p.prenom)) p.prenom, p.role
  from (
    select split_part(coalesce(nullif(trim(a.nom), ''), pr.nom, split_part(a.email, '@', 1)), ' ', 1) as prenom,
           a.role
    from public.autorisations a
    left join public.profils pr on lower(pr.email) = lower(a.email)
    where a.actif and a.role <> 'lecture'
  ) p
  where (select public.mon_role()) is not null
    and p.prenom <> ''
  order by lower(p.prenom), p.role
$$;
revoke execute on function public.prenoms_poste() from public, anon;
grant execute on function public.prenoms_poste() to authenticated;
