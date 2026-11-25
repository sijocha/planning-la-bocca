# Journal des modifications

Les nouveautés du Planning La Bocca, session par session (la plus récente en haut).

## 25 novembre 2026

Pour en profiter : recharger le planning (Ctrl + F5 sur ordinateur ; fermer et rouvrir l'application sur téléphone).

### Demandes
- Le bouton **+ Nouvelle demande** est de nouveau bien visible en haut de l'onglet (il avait l'air désactivé), en pleine largeur sur téléphone.

### Commande sur téléphone
- **Résumé fixe** au-dessus d'« Enregistrer » : jour · heure · client · m³ · formule ; ce qui manque s'affiche en orange.

### Bons de pompe
- **Rappel chaque matin à 6 h 45** (notification) : les pompes du prochain jour travaillé dont le bon n'est pas fait. Le vendredi, il couvre le lundi, sauf si le samedi est ouvert. Activé pour le centraliste, au choix pour le commercial. *(nécessite `supabase/11_rappel_pompes.sql` et la fonction `notifs` à jour)*

### Journée clôturée
- **Seul le centraliste** peut modifier une journée clôturée (commandes, agrégats, liants), règle appliquée par la base. Le commercial et le labo peuvent toujours la consulter, ouvrir la carte et dupliquer une commande vers un autre jour. *(nécessite `supabase/12_journee_cloturee.sql`)*

### Stabilité de l'écran
- Une mise à jour (venue d'un autre poste ou de la minute qui passe) ne modifie plus que ce qui a changé : une ligne ouverte, le défilement, un encadré déplié ou une saisie restent en place.
- Fermer une commande puis en ouvrir une autre aussitôt ne vide plus le nouveau formulaire.

### Validation des modifications du commercial
- La fenêtre « Valider la modification ? » affiche **ce qui a changé** (avant → après) : jour, heure, cubage, formule, SAP, client, chantier, contact, camion, pompe, ce que fait le client, infos. Le détail apparaît aussi dans l'onglet Demandes et dans la notification.
- Si le commercial revient à la version validée, il n'y a plus rien à valider.

### Paiement comptant
- **Clic droit** (appui long sur téléphone) sur le paiement : une ligne par paiement du client, avec montant, mode (Carte, CB, Virement, Attente) et 4 chiffres CB, **+ Autre paiement**, et le total quand il y a plusieurs lignes. Le paiement passe à « Payé » quand rien n'est en attente.

### Formule en attente : proposition du labo
- Le labo **propose la formule** d'une commande en attente. Elle s'affiche en info (badge **LABO**) ; le centraliste ou le commercial l'applique en un clic. Le labo ne modifie jamais la formule elle-même. *(relancer `supabase/10_notifications.sql` pour la notification)*

### Citybag et Betobag
- Pompe : seul le **Betobag** (sac de lavage) est proposé.
- **Citybag** = produit BAG rempli à la centrale : le planning compte les sacs (1 bag = 0,5 m³), sous le cubage et dans chaque bulle.

### Vue semaine : charge par jour
- Chaque jour affiche une barre de charge (m³ du matin, de l'après-midi et de la nuit, comparés au jour le plus chargé de la semaine), le nombre de tours, de pompes et de commandes à valider.

### Tours et compléments réservés au centraliste
- Le commercial et le labo voient les tours et la bulle « +1T à confirmer », mais ne peuvent plus ajouter de tour, de complément ni charger une bulle. Le commercial peut toujours cocher [+] en passant une nouvelle commande.

### Accès gérés depuis le planning
- Administration → **Accès** (comptes admin) : ajouter une personne (adresse Google, prénom, rôle), changer son rôle, la désactiver ou la retirer, voir si elle s'est déjà connectée. Plus besoin de passer par le SQL de Supabase.
- Garde-fous : votre propre accès et le dernier admin actif ne sont pas modifiables.

### Encadrés du haut allégés
- Un encadré vide (planning camions, journal de bord, agrégats) se replie : titre et boutons « + » seulement, et laisse sa largeur aux autres.
- Quand les trois sont vides, la bande se réduit à une ligne fine ; au survol, l'encadré se déplie avec tous ses boutons.

### Réglages et menu
- Notifications et thème clair / sombre rangés dans la partie **Centrale** des réglages.
- « 01 Aujourd'hui » ne clignote plus dans le menu (il était redessiné à chaque mise à jour).
- Texte « Données · Partagées en direct » retiré ; bouton « + Nouvelle demande » à gauche sur ordinateur.

### En coulisses
- Une seule feuille de styles (`styles.css`) au lieu de deux : 362 réglages jamais appliqués retirés, affichage vérifié identique sur 15 écrans.
- README à jour (fichiers de la page, scripts SQL 01 à 12).

## 24 novembre 2026

Pour en profiter : recharger le planning (Ctrl + F5 sur ordinateur ; fermer et rouvrir l'onglet ou l'application sur téléphone).

### Travail à plusieurs
- **Verrou des commandes tenu par la base** : quand quelqu'un ouvre une commande, elle s'affiche grisée « Verrouillée · nom modifie » chez les autres, qui ne peuvent ni l'ouvrir ni cliquer sur ses boutons. Le verrou tient jusqu'à la validation ou la fermeture, ou 5 minutes sans action. Si deux personnes ouvrent la même commande à la même seconde, une seule garde la main. *(nécessite `supabase/09_verrous.sql`)*
- **Synchronisation stable** : fini le badge jaune qui clignotait toutes les 2-3 secondes ; une saisie en cours n'est plus effacée par une mise à jour venue d'un autre poste.
- **Téléphone en veille** : au réveil, celui qui revient cède la main à celui qui a ouvert la commande entre-temps.

### Application sur téléphone
- Le planning **s'installe comme une application** (icône « La Bocca », plein écran, mises à jour automatiques), sans APK ni magasin d'applications.
  - Android : Chrome → menu ⋮ → Installer l'application.
  - iPhone : Safari → Partager → Sur l'écran d'accueil.
  - Raccourci : badge du compte → Aide → Installer l'application sur cet appareil.

### Notifications sur le téléphone *(nécessite `supabase/10_notifications.sql` et la fonction `notifs`)*
- Les notifications s'affichent sur l'**écran de verrouillage**, même planning fermé (Android, iPhone avec l'application installée, ordinateur).
- **Centraliste** : commande du commercial à valider, modification à valider, demandes, chat.
- **Commercial** : ses commandes validées, modifiées ou annulées par la centrale, réponses à ses demandes.
- Réglages → Aide → **Notifications sur cet appareil…** : activer, couper un type de notification, envoyer un test, désactiver.
- Toucher une notification ouvre le planning sur la commande concernée.

### Compléments
- **Une seule méthode, toujours le même ordre** : les tours, puis la **bulle orange** (complément prévu), puis le **[+] gris** (complément non prévu).
- Après **chaque complément chargé**, le planning demande « Encore un complément prévu ? ».
- Tant qu'une bulle orange reste, le chantier n'est **jamais marqué terminé**.

### Chantiers de nuit et ouvertures exceptionnelles
- Section **☾ Nuit** pour les chantiers qui commencent à partir de 19 h.
- Le lendemain, ils sont repris tout en haut dans **☾ Nuit précédente**.
- Chantier le vendredi soir : le **samedi s'affiche tout seul** avec la fin de la nuit, sans ouvrir la journée.
- Les samedis et dimanches ouverts apparaissent dans l'onglet **Agrégats**.
- Impression et PDF : sections Nuit et Nuit précédente.

### Formules
- Clic sur la formule d'une ligne : **saisie rapide**, avec les dernières formules du client et le code SAP.
- **Confirmation** avant de changer la formule (ancienne → nouvelle), notée au journal.

### Agrégats et liants
- Deux boutons en bas de chaque encadré : **[+ Semi]** et **[+ Liant]**.
- Clic sur le nom d'un liant : le renommer, ajouter une livraison ou le supprimer.
- L'encadré de la semaine **s'élargit au survol**.
- L'encadré flottant reste ouvert pendant la saisie, même avec une sélection de texte à la souris.

### Affichage
- **Mini-carte Google Maps** rétablie : clic sur l'adresse du chantier.
- Colonnes Heure et m³ élargies.

### Sécurité et sauvegardes
- Le direct (présence, mises à jour) est **réservé aux comptes du planning** (`supabase/08_temps_reel_prive.sql`).
- `07_catalogue_formules.sql` corrigé : le commercial et le labo gardent l'écriture du journal.
- **Sauvegarde automatique chaque soir** (dépôt privé) : un fichier par mois, plus un fichier des listes.
- Réglages → Sauvegarde → **Restaurer une sauvegarde…** : un fichier de mois ne remet que ce mois ; tous les fichiers ensemble = restauration complète.

### En coulisses
- `index.html` découpé en `styles.css` et `app.js` : ouverture plus rapide, rien ne change à l'écran.
- Le planning ne se redessine plus quand l'onglet est caché.
- Mode d'emploi mis à jour.
- Ce journal des modifications est publié à chaque grosse session (fichier `CHANGELOG.md` et page *Releases* du dépôt).
