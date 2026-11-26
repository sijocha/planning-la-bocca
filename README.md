# Planning La Bocca

[![Tests](https://github.com/sijocha/planning-la-bocca/actions/workflows/tests.yml/badge.svg)](https://github.com/sijocha/planning-la-bocca/actions/workflows/tests.yml)

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

## Fichiers de la page

- `index.html` : squelette de la page (en-tête, emplacements, chargement des fichiers ci-dessous).
- `styles.css` : toute la mise en forme (une seule feuille ; la partie « Retouches » en fin de fichier contient les ajustements récents).
- `app.js` : le programme du planning (synchronisation, verrou, rendu, formulaires, mode d'emploi).
- `formules.js` / `formules.css` : saisie rapide des formules béton et catalogue de la centrale.
- `motion-m3.js` : animations de fermeture des menus, du tiroir, du chat et des messages, sans toucher à la logique.
- `sw.js`, `manifest.webmanifest`, `icons/` : application installable et notifications.
- `vendor/leaflet/` : carte pour placer le point exact d'un chantier (chargée seulement à la demande).
- `tests/` : tests automatiques (voir en bas de page).

## Dossier `supabase/`, scripts à exécuter dans l'ordre (SQL Editor)

01 à 06 : structure, rôles, droits, concurrence, prénoms du poste · 07 : catalogue des formules (commercial) · 08 : temps réel réservé aux membres · 09 : verrou des commandes · 10 : notifications · 11 : rappel des bons de pompe · 12 : journée clôturée réservée au centraliste · 13 : réglages de la centrale ouverts au commercial · 14 : état de la base (le planning signale aux admins les scripts pas encore exécutés). La fonction `functions/notifs/index.ts` se déploie dans Edge Functions (nom `notifs`, « Verify JWT » désactivé).

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

## Tests automatiques

À chaque envoi sur GitHub, trois séries de tests tournent (onglet **Actions**, environ 2 minutes) :

- `tests/test_planning.py` : le planning dans un vrai navigateur, avec des données fictives (`tests/demo.js`) ;
- `tests/notifs/` : la fonction des notifications (chiffrement, signature, destinataires) ;
- `tests/sql/` : les scripts `supabase/` sur une base PostgreSQL vide (verrou, journée clôturée, droits, notifications).

Coche verte : tout passe. Croix rouge : un comportement a changé, le détail est dans l'onglet Actions.

**Mise en ligne** (`.github/workflows/deploiement.yml`) : le site n'est publié sur GitHub Pages que si les trois séries de tests sont vertes, et seulement les fichiers du site (sans `tests/` ni `supabase/`). Réglage du dépôt : Settings → Pages → Source : **GitHub Actions**.

