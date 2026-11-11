# Planning La Bocca

Planning des livraisons de béton de la centrale de Cannes La Bocca.

- Lien : https://sijocha.github.io/planning-la-bocca/
- Accès : connexion avec un compte Google. Seules les adresses inscrites dans la liste des accès de la centrale peuvent ouvrir le planning ; une adresse absente de la liste ne voit rien.
- Rôles : admin, centraliste, commercial, labo, lecture seule.

## Fonctionnement

- La page (`index.html`) ne contient aucune donnée réelle. Les données sont stockées dans une base Supabase hébergée en Europe (Irlande), protégée par des règles par rôle (Row Level Security).
- La clé présente dans la page est la clé publique du projet Supabase : elle est faite pour être visible. Ce sont les règles de la base qui protègent les données.
- Toutes les modifications des commandes sont historisées (qui, quoi, quand).
- Les modifications apparaissent en direct chez tous les utilisateurs connectés.

## Dossier `supabase/`

Scripts SQL qui ont créé la base, dans l'ordre : structure, rôles et règles d'accès, stockage des données de la page. Ils servent de référence et de reprise en cas de besoin ; ils ne contiennent ni données ni adresses e-mail.

## Dossier `vendor/`

Copie figée de la bibliothèque Supabase (supabase-js 2.119.0, licence MIT). La page ne dépend d'aucun serveur tiers pour son code : une mise à jour extérieure ne peut pas la casser.

## Fonctionnement des données

- La page charge les 2 derniers mois et tout l'avenir ; une date plus ancienne est chargée à la demande.
- Une commande ouverte par une personne est verrouillée pour les autres jusqu'à sa validation (5 minutes sans action : libérée).
- `supabase/04_droits.sql` : droits par rôle appliqués par la base.
- `supabase/05_concurrence.sql` : enregistrements simultanés, journal séparé, purge automatique.
- Deux personnes qui enregistrent le même document en même temps : la base refuse la seconde écriture si le document a changé entre-temps (fonction `doc_set`). La page relit alors la version de la base, fusionne les deux modifications et renvoie. Rien n'est écrasé sans prévenir.
- Journal de bord : une ligne = un document (collection `journal`), jamais réécrit. Il n'alourdit plus le document de la journée.
- Purge : l'historique des commandes et le journal de plus de 13 mois sont supprimés automatiquement. La sauvegarde complète (Réglages) garde tout.
- Lecture seule : les boutons de saisie sont masqués et aucune modification ne part vers la base.
- Déconnexion : avertissement si des modifications ne sont pas encore envoyées.

## Tables réellement utilisées

| Table | Rôle |
|---|---|
| `documents` | Toutes les données de la page : commandes (`orders`), journées (`days`), listes (`ref`), messages (`chat`), journal (`journal`) |
| `profils` | Comptes connectés : nom, rôle, actif |
| `autorisations` | Liste des adresses autorisées et leur rôle |
| `historique` | Trace de chaque modification de commande (avant / après, auteur, date) |
| `operateurs` | Centralistes du poste partagé |

Les autres tables créées par `01_structure.sql` (commandes, clients, chantiers, camions, tours…) **ne sont pas utilisées** par la page : tout passe par `documents`. Ne pas y écrire.
