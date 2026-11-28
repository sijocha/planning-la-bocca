# Journal des modifications

Les nouveautés du Planning La Bocca, session par session (la plus récente en haut).

## 28 novembre 2026

### Accès des chantiers et dérogations
- Dans la commande : **camions autorisés sur le chantier** (cases par type de camion) et une note d'accès (chemin étroit, interdit +19 t…), **mémorisés pour le chantier** et repris aux commandes suivantes.
- **Dérogation** : Pas de dérogation / En attente / Validée. Avertissement dans la commande si le camion prévu n'est pas autorisé.
- Sur la ligne : étiquettes **ACCÈS SP4** (rouge si le camion prévu n'est pas autorisé) et **DÉROG. ?** / **DÉROG. ✓**, clic pour changer la dérogation.
- **À surveiller** (aujourd'hui et demain) : dérogation en attente, ou camion non autorisé sans dérogation.
- Une modification de la dérogation par le commercial apparaît dans « avant → après ».

### Tech labo : consultation seulement
- Le labo ne modifie plus aucune commande : ni la commande, ni le paiement, ni la pompe, ni le bon de pompe, ni le statut, ni les tours, ni les infos existantes. Il ne crée ni ne supprime de commande.
- Ce qu'il peut faire : **ajouter une info** (badge violet LABO) et **proposer une formule** pour une commande en attente. Menu ⋯ : « Demander au commercial… », « Demander au centraliste… », « Ajouter une info… ».
- L'info du labo est **montrée au centraliste dès le premier camion chargé** de la commande (fenêtre « Info du labo », bouton Vu), une seule fois.
- Nouveau script **16_labo.sql** : la base refuse aussi toute autre modification venant d'un compte labo. Le planning signale aux admins s'il n'est pas encore exécuté.

## 26 novembre 2026

### Sauvegardes : test de restauration
- La sauvegarde de la nuit a été restaurée pour de vrai sur un banc d'essai (hors ligne) : lisible, complète, chaque jour du mois s'affiche ; la restauration d'un mois seul laisse les autres mois intacts.
- Nouveau : **Vérifier une sauvegarde (sans rien changer)** (badge du compte → Sauvegarde) : rapport mois par mois (identiques, modifiées depuis, ajoutées depuis, absentes du planning), listes, puis consultation de la sauvegarde comme un planning. Aucune écriture.
- Tests automatiques de restauration (complète, mois seul, vérification) ajoutés sur GitHub.
- Mode d'emploi : rubrique « Sauvegardes : vérifier et restaurer ».

### État de la base de données
- Nouveau script **14_etat_base.sql** : le planning vérifie, pour les comptes admin, que chaque script Supabase est bien passé (verrou, notifications, rappel des pompes, journée clôturée, réglages du commercial, temps réel).
- S'il en manque un : avertissement à l'ouverture et détail dans Administration → Accès, avec le nom du fichier à exécuter. Sinon : « ✓ Base de données à jour ».
- Testé sur une base PostgreSQL (détection d'un script retiré) et dans le planning.

### Administration sur téléphone
- **Accès** : chaque personne sur deux lignes (prénom · rôle · retirer, puis adresse · connexion · actif) au lieu de quatre.
- **Produits spéciaux** : gamme, nom, Dmax, classe et chargement regroupés ; variantes et options sur toute la largeur, temps de retard et gravillons côte à côte. Moins de lignes par produit.
- **Camions, pompes, agence, carrières, fournisseurs** : intitulé au-dessus, cases d'ajout sur toute la largeur (on voit à nouveau « Type », « m³ », « fluide m³ »…).
- **Raccourcis** : l'ajout est un bloc « Nouveau raccourci : nom, adresse, thème » (nom et thème sur une ligne, adresse en dessous).
- Descriptions des titres plus lisibles (blanc cassé sur noir au lieu de gris).

### Cubage, écrans 1080p, téléphone
- **Clic droit sur le cubage** (appui long sur téléphone, centraliste) : cubage demandé et « Et plus » (complément à confirmer). Affichage 0/22,5+ avec complément, 0/22,5 sans. Les tours chargés ne bougent pas, les autres sont recalculés ; impossible de descendre sous le déjà chargé.
- **Encadrés du haut** : trois encadrés de même largeur. Agrégats : boutons + Semi / + Liant dans le titre, la ligne de semi passe sur deux lignes au lieu d'être coupée, carrière masquée quand la place manque. En dessous de 1180 px de large : camions et journal sur une ligne, agrégats en dessous sur toute la largeur.
- **Lignes de commande** : camion, réservation, pompe et bon de pompe se resserrent au lieu de disparaître ; le survol de la case affiche tout. Tout texte coupé (client, chantier, commentaire) s'affiche en entier au survol. Titres de colonnes qui ne se chevauchent plus.
- **Téléphone** : la fenêtre de la formule (et les autres) défile de nouveau au doigt après avoir ouvert le compte depuis « Plus ».

### Erreurs du planning chez les utilisateurs
- Nouveau script **15_erreurs.sql** : quand le planning plante chez quelqu'un, le message technique est enregistré dans Supabase (prénom, rôle, heure, version, écran, appareil ; aucune donnée de commande ni de client). Hors connexion, il attend sur l'appareil.
- Administration → **Erreurs** (comptes admin) : erreurs regroupées, nombre de fois, qui ; détail technique ; « Copier pour Claude » ; « Tout effacer ». Message à l'ouverture s'il y a du nouveau.
- Protections : même erreur comptée une seule fois par heure, 50 erreurs maxi par personne et par heure, bruit du navigateur ignoré, effacement automatique après 30 jours.

### Mise en ligne protégée par les tests
- Le site n'est publié que si les tests sont verts (planning, notifications, base de données). Une modification qui casse quelque chose n'arrive jamais chez les utilisateurs : le site reste sur la dernière bonne version.
- Seuls les fichiers de la page sont publiés (plus les dossiers de tests ni les scripts SQL).
- Libellé « ✓ Base de données à jour (Supabase + GitHub) ».

### Formule rapide
- **c16, c20, c30…** tapés seuls donnent toujours une **résistance** (C16/20, C20/25, C30/37…), plus jamais une chape.
- Chape Cemexa : taper **cem16** ou **cem20** (ou « cemexa c20 », « cem 16 »).

### Chapes et produits fluides
- Les chapes ne sont **jamais chargées au maximum du camion** : tours prévus à **7 m³ maxi en 8x4** (6 à 7 selon la route) et **3,5 m³ en 4x2 19 t** (SP4).
- Réglable **par produit spécial** (Administration → Formules) : « Chargement plein » ou « Chargement réduit (fluide) ». Chapes en réduit par défaut, Agilia en plein (7,5 m³) par défaut ; on peut changer chaque produit selon le contexte.
- Rappel sous la quantité dans la commande et dans la bulle du tour.
- Formule changée pour une chape (ou l'inverse) : les tours pas encore chargés sont recalculés ; un tour déjà chargé ne bouge pas.
- Administration → Camions et pompes : m³ maxi en chargement réduit par type de camion, réglable.
- Mode d'emploi à jour (saisie rapide, commande).

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

### Téléphone
- Commande ouverte avec camion et pompe : le camion et la pompe ont chacun leur ligne ; le nom du client, l'adresse et la formule reprennent toute la largeur.

### Lecture seule stricte
- À la connexion, un compte en lecture seule n'a que le bouton **Ouvrir le planning** (ni rôle ni personne à choisir).
- Un compte en lecture seule **consulte uniquement** : planning complet, demandes en cours, carte, impression, et en consultation les camions, pompes, fournisseurs, agence et raccourcis.
- Plus de menu ⋯ sur les commandes, plus de chat, ni notifications ni administration ; un clic sur une formule, une bulle ou une commande n'ouvre rien.

### Accès modifié = déconnexion automatique
- Si l'admin change le rôle d'une personne ou désactive son accès, elle est **déconnectée automatiquement** (vérification toutes les 30 secondes et au retour sur la page), avec un message sur l'écran de connexion.

### Prise de poste
- Chacun ouvre le planning **avec son badge et son prénom** (ceux de son compte, Administration → Accès) : plus de choix d'un autre prénom ni de prénom libre.
- En dessous, **les personnes connectées en ce moment**, en organigramme par rôle (centralistes, commerciaux, tech labo).
- Le rôle est imposé, sauf pour un admin qui choisit le rôle sous lequel il travaille.

### Réglages de la centrale pour le commercial
- Le commercial a accès à **tous les réglages de la centrale** (camions, pompes, fournisseurs, agence, carrières, raccourcis). *(nécessite `supabase/13_reglages_commercial.sql`)*

### Vue semaine : charge par jour
- Chaque jour affiche une barre de charge (m³ du matin, de l'après-midi et de la nuit, comparés au jour le plus chargé de la semaine), le nombre de tours, de pompes et de commandes à valider.

### Fin de chantier
- Statut passé à la main en **Terminée** (ou Annulée) : le complément prévu est retiré et plus aucun complément n'est proposé sur la ligne.
- Après un complément chargé, répondre **« Non, c'est le dernier »** passe la commande en **Terminée**.

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

### Mode d'emploi à jour
- Nouvelles rubriques : **Ce que chaque rôle peut faire**, **Compte en lecture seule**, **Formule en attente : proposition du labo**.
- Mises à jour : connexion (badge et prénom imposés, personnes connectées, déconnexion automatique), paiements en plusieurs lignes, compléments (« Non, c'est le dernier » = Terminée), statut Terminée, validation des modifications (avant → après), agrégats et liants ([+ Semi], [+ Liant], stabilo), section Nuit, charge de la semaine, résumé sur téléphone, rappel des bons de pompe, Betobag, journée clôturée, réglages ouverts au commercial, thème dans Centrale, encadrés repliés.

### Mode d'emploi vivant
- **? Qu'est-ce que c'est ?** : un bouton (ou la touche **?**), puis on touche un élément du planning (bulle, étiquette paiement, pompe, formule, menu ⋯, encadré, badge…) : sa rubrique s'ouvre dans le mode d'emploi. Rien n'est modifié ; Échap pour annuler.
- **Exemples à essayer** : chaque exemple animé devient un petit planning d'essai. On clique dedans, puis sur l'élément entouré d'orange (le €, le menu ⋯, la bulle orange, le badge LABO…) pour passer à l'étape suivante. Rien n'est modifié dans le vrai planning.
- **◎ Montrer sur l'écran** pour les rubriques sans exemple : retour au planning, l'élément est entouré en orange avec son nom.
- Les rubriques ouvertes, la recherche et l'étape des exemples **ne se referment plus** quand le planning se met à jour (toutes les minutes ou à chaque modification d'un autre poste).
- **Nouvelles animations** : menu ⋯, compléments (orange, [+] gris, « Encore un complément ? »), modification à valider (avant → après), proposition du labo, paiements en plusieurs lignes, stabilo des agrégats, verrou, journée clôturée, section Nuit, charge de la semaine, encadrés repliés, notification sur l'écran de verrouillage, badge de synchronisation, connexion.

### En coulisses
- Une seule feuille de styles (`styles.css`) au lieu de deux : 362 réglages jamais appliqués retirés, affichage vérifié identique sur 15 écrans.
- README à jour (fichiers de la page, scripts SQL 01 à 13).
- **Tests automatiques sur GitHub** : à chaque envoi, 15 vérifications du planning dans un vrai navigateur (données fictives), 5 de la fonction des notifications et une série sur les scripts de la base (verrou, journée clôturée, droits, notifications). Coche verte ou croix rouge sur chaque modification, badge en tête du README.

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
