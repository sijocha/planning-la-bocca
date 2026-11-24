# Journal des modifications

Les nouveautés du Planning La Bocca, session par session (la plus récente en haut).

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
