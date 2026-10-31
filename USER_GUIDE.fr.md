# Pool Tables Manager - Guide d’utilisation

## Bienvenue dans Pool Tables Manager

Pool Tables Manager est une solution complète pour gérer les activités d’une salle de billard. Ce guide vous aidera à comprendre et à utiliser toutes les fonctionnalités de l’application.

---

## Premiers pas

### Accéder à l’application

Ouvrez votre navigateur Web et rendez-vous sur `http://localhost:3000` (ou à l’adresse de votre serveur).

Lors de la première utilisation, vous devrez définir le mot de passe admin local (ou vous connecter si un mot de passe/OIDC est déjà configuré). Après la connexion, le tableau de bord affiche toutes vos tables regroupées par type.

### Menu principal

L’en-tête comporte trois entrées, ainsi que le bouton de changement de thème et celui de déconnexion :

- **Tableau de bord** - Tables en temps réel, sessions et commandes en attente
- **Admin** - Carte, inventaire des tables, abonnements, rapports et paramètres
- **Statut public** - Ouvre dans un nouvel onglet le tableau de disponibilité destiné aux clients (aucune connexion requise)
- **Aide** - Guide d’utilisation intégré (ce document) avec un sommaire ; comprend un lien vers la référence de l’API
- **Sélecteur de langue** - Disponible dans l’en-tête (ordinateur), dans Paramètres → Localisation et tarification, sur la page des tables côté joueur et sur le tableau de statut public. Le choix est mémorisé sur l’appareil ; les noms des boissons suivent les traductions de la carte (anglais/français actuellement)
- **Se déconnecter** (en haut à droite) - Met fin à la session admin. Lorsque OIDC est activé, la session du fournisseur d’identité est également terminée si cette fonction est prise en charge ; vous revenez alors à la page de connexion

---

## Présentation du tableau de bord

Le tableau de bord est votre espace central pour gérer toutes les tables.

### Affichage des tables

Les tables sont regroupées par type (américain, pool, snooker, français, …) avec des badges de drapeau et des tuiles de couleur :
- **Tuiles vertes** = Tables disponibles
- **Tuiles rouges** = Sessions en cours
- Les tables en maintenance sont masquées dans le tableau de bord (gérez-les dans Admin → Types de tables et inventaire)

Deux présentations sont disponibles (à choisir dans **Paramètres → Disposition du tableau de bord**) :

- **Sections** (par défaut) — tous les types sont présentés dans des groupes repliables. Une rangée de **drapeaux en haut** permet d’accéder directement à un type (et de le déplier) ; utilisez le chevron du groupe pour le replier. L’état des groupes repliés est mémorisé sur cet appareil.
- **Onglets** — un type de table par onglet ; faites glisser la **poignée** à côté d’un onglet pour réorganiser les onglets.

Dans les deux présentations, vous pouvez réorganiser les groupes de types de tables : en mode Sections, faites glisser la **poignée ⋮⋮** à gauche de l’en-tête d’un groupe. L’ordre est enregistré pour tous les appareils du personnel et est également utilisé sur le tableau de statut public.

### Informations sur les tables

Chaque tuile affiche :
- Le numéro et le type de la table
- Le code PIN de la session (lorsqu’elle est active) - affiché à côté du numéro de table, par ex. « #5 (1234) »
- La durée de la session en cours
- Le nombre actuel de joueurs
- Le total de l’addition (montant cumulé)
- Des boutons d’action rapide

### Actions rapides

**Tables disponibles :**
- **Démarrer la session** - Lancer une nouvelle session
- **Maintenance** - Mettre la table hors service (réinitialisez le compteur d’utilisation lors de sa remise en service)

**Tables occupées :**
- **Boisson** - Ajouter des boissons à l’addition (regroupées par catégorie de la carte)
- **Transférer** - Déplacer la session vers une autre table
- **Encaisser** - Appliquer une remise, imprimer l’estimation de l’addition, finaliser le paiement et imprimer la facture
- **−** à côté du nombre de joueurs - Règlement d’un joueur (un joueur paie sa part et s’en va)
- **+** - Ajouter un joueur — indiquez s’il est abonné (cela influe sur la remise)
- **Vignette QR** - Agrandir le code QR du joueur

---

## Démarrer une session

1. Cliquez sur **▶ Démarrer** sur une table disponible
2. Définissez le nombre de joueurs (1 par défaut)
3. (Facultatif) Sélectionnez les abonnés dans votre liste
   - Les abonnés bénéficient d’une remise lorsqu’ils jouent ; **les sessions réservées aux abonnés sont autorisées** (0 non-abonné) et le temps de table leur est offert
   - Au moins un joueur (abonné ou non) est requis
4. Cliquez sur **Démarrer la session**

**Déroulement :**
- Un code PIN unique à 4 chiffres est généré pour la session
- La table est marquée comme occupée
- Les frais commencent à s’accumuler en fonction du temps écoulé
- Le code PIN s’affiche sur la tuile de la table pour permettre aux joueurs d’accéder à leur addition

---

## Gérer les sessions en cours

### Mises à jour en temps réel

Les sessions en cours affichent :
- **Durée** - Mise à jour chaque seconde (par ex. « 1 h 23 min 45 s »)
- **Heures facturées** - Arrondies à l’heure supérieure
- **Total de l’addition** - Frais de table + articles

### Frais de table

Les frais sont calculés à l’heure selon le type de table :
- **Billard américain :** 30 €/heure
- **Pool :** 25 €/heure
- **Snooker :** 40 €/heure
- **Billard français :** 35 €/heure

La durée est toujours arrondie à l’heure supérieure (par ex. 1 heure et 1 minute = 2 heures facturées).

### Remises pour les abonnés

Lorsque des abonnés jouent avec des non-abonnés :
- **Par défaut :** remise de 50 % sur les frais de table
- **Tous les joueurs sont abonnés :** aucun frais
- **Aucun abonné :** plein tarif

*Le pourcentage de remise peut être modifié dans Paramètres.*

---

## Ajouter des articles aux additions

### Ajouter rapidement des boissons

1. Cliquez sur **Boisson** sur la tuile d’une table occupée
2. Parcourez la carte des boissons — utilisez les **pastilles de catégorie** (Froid / Chaud / Alcoolisé) et le **champ de recherche** pour trouver rapidement des articles
3. Utilisez les boutons **+** et **-** pour choisir les quantités
4. Cliquez sur **Ajouter à l’addition**

### Frais personnalisés

Depuis les détails de la session :
1. Cliquez sur la table occupée pour afficher les détails
2. Faites défiler jusqu’à « Ajouter des frais personnalisés »
3. Saisissez une description et un montant
4. Cliquez sur **Ajouter les frais**

**Exemples d’utilisation :**
- Articles alimentaires
- Location de matériel
- Frais spéciaux
- Services supplémentaires

---

## Commandes en attente (commande en libre-service par les joueurs)

Les joueurs peuvent commander eux-mêmes des boissons depuis la [vue publique de la table](#public-table-view) sur leur téléphone, sans que le personnel ait besoin de se déplacer pour prendre la commande.

### Fonctionnement

1. Depuis la page propre à la table, un joueur saisit le **code PIN** de la table et sélectionne des boissons sur la carte.
2. La commande est envoyée et apparaît immédiatement sur le tableau de bord principal, dans une nouvelle section **« Commandes en attente »** en haut de l’écran, au-dessus de la grille des tables.
3. Un signal sonore (« Bright Triangle ») retentit sur le tableau de bord admin à chaque nouvelle commande ; le personnel n’a donc pas besoin de surveiller constamment l’écran.
4. Chaque commande en attente indique le numéro de table, les articles commandés et le total.
5. Le personnel vérifie la commande et clique sur **✓ Servie** une fois les boissons livrées.
6. Une fois la commande servie, ses articles sont automatiquement ajoutés à l’addition de la table — inutile de les saisir à nouveau manuellement.

**Sécurité :** Le code PIN empêche les autres joueurs, ou toute personne qui ne se trouve pas à la table, de passer des commandes sur votre addition.

**Signaux sonores :** Le signal sonore d’arrivée des commandes respecte le paramètre **Signaux sonores** de la page Paramètres.

---

## Règlements des joueurs

Lorsqu’un joueur souhaite partir alors que les autres continuent de jouer :

1. Cliquez sur **🧾 Régler** sur la tuile de la table
2. Vérifiez l’addition en cours et les frais de table
3. **Choisissez l’option de frais de table :**
   - **Part du joueur** - Répartition égale entre les joueurs présents au début
   - **Frais de table complets** - Le joueur paie la totalité des frais de table
   - **Ignorer les frais de table** - Ne payer que les articles

4. **Sélectionnez les articles :**
   - Utilisez les sélecteurs de quantité pour choisir les articles consommés par le joueur
   - Les quantités partielles sont possibles (par ex. 1 bière sur 3)

5. Cliquez sur **💰 Régler**

**Déroulement :**
- Les articles sélectionnés sont retirés de l’addition ou leur quantité est réduite
- Le nombre de joueurs diminue de 1
- L’affichage des joueurs restants est mis à jour automatiquement
- Un reçu peut être imprimé

**Important :** Les montants des règlements sont calculés à partir des frais de table *initiaux*, avant tout règlement précédent.

---

## Terminer les sessions (encaissement)

Lorsque tous les joueurs ont terminé :

1. Cliquez sur **✓ Encaisser** sur la tuile de la table
2. Vérifiez les frais définitifs :
   - Frais de table (calculés selon la durée totale)
   - Tous les articles de l’addition
   - Règlements précédents (affichés sous forme de déductions)
3. **Facultatif :** Cliquez sur **🖨 Imprimer le reçu** pour obtenir une copie papier
4. Cliquez sur **Terminer la session** pour finaliser

**Déroulement :**
- Le montant final est calculé
- La session est marquée comme terminée
- La table redevient disponible pour la session suivante
- Les données sont enregistrées pour les rapports

---

## Abonnements

### Que sont les abonnements ?

Les abonnements sont des adhésions prépayées qui donnent droit à des remises sur les frais de table.

### Consulter les abonnements

1. Ouvrez le menu (☰)
2. Cliquez sur **Abonnements**
3. Consultez tous les abonnements actifs, avec :
   - Le nom du joueur
   - La date de début
   - La date de fin
   - Le statut actuel

### Utiliser les abonnements

Lors du démarrage d’une session :
1. Définissez le nombre de joueurs
2. Cochez les cases à côté des noms des abonnés
3. Le système applique automatiquement la remise

**Avantages :**
- Frais de table réduits ou supprimés
- Utilisation suivie à des fins d’analyse
- Encourage la fidélisation des clients

---

## Vue publique de la table

Les joueurs peuvent consulter leur addition en temps réel depuis n’importe quel appareil et commander eux-mêmes des boissons.

### Accéder à la vue de la table

**Format de l’URL :** `http://[server]/table.html?number=[table_number]`

Exemple : `http://localhost:3000/table.html?number=5`

### Première visite

1. Le joueur ouvre l’URL
2. Il saisit le code PIN à 4 chiffres (affiché sur le tableau de bord)
3. Le code PIN est enregistré pour la session

### Informations affichées aux joueurs

- Numéro et type de table
- Durée actuelle
- Nombre de joueurs
- Tous les articles de l’addition, avec leurs quantités et leurs prix
- Frais de table (durée et montant)
- Total en cours
- Une carte de boissons sur laquelle ils peuvent commander directement (code PIN requis) — voir [Commandes en attente](#pending-orders-player-self-service)

**Actualisation automatique :** La vue s’actualise automatiquement (environ toutes les 10 secondes et immédiatement lorsque vous revenez à l’onglet), afin que les commandes servies et les modifications de l’addition s’affichent rapidement.

### Codes QR

Chaque tuile de table occupée sur le tableau de bord affiche un **code QR** qui renvoie directement vers la vue de cette table avec son code PIN prérempli. Un joueur peut ainsi le scanner avec l’appareil photo de son téléphone pour suivre sa session — inutile de saisir manuellement l’URL ou le code PIN. Cliquez sur le code QR du tableau de bord pour l’agrandir (pratique pour l’imprimer ou l’afficher à la table).

**Définir le nom d’hôte utilisé dans les codes QR :** Par défaut, les codes QR pointent vers l’adresse utilisée par votre navigateur pour charger le tableau de bord admin (par ex. `http://localhost:3000`), qui ne fonctionne que sur la même machine. Pour que les joueurs puissent scanner les codes QR avec leur téléphone, définissez l’**URL publique de base** dans Admin → Paramètres à l’aide du nom d’hôte/de l’adresse IP ou du FQDN accessible depuis leurs téléphones, par exemple `http://[IP_ADDRESS]:3000` ou `https://pool.example.com`. Laissez ce champ vide pour utiliser l’adresse actuelle du navigateur.

---

## Fonctionnalités d’administration

Accès via le menu (☰) → **Panneau d’administration**

### Types de tables et inventaire

**Gérer les types de tables :**
- Ajouter des types de tables (par ex. « Billard », « Carambole »)
- Définir les tarifs horaires dans votre devise
- Définir le **taux de TVA** appliqué aux frais de temps de jeu de ce type de table (20 %, 10 % ou 0 % — voir [Rapports TVA](#vat-tva-reporting--france))
- Modifier ou supprimer des types existants

**Gérer les tables :**
- **Ajouter des tables :** indiquez une quantité pour créer plusieurs tables à la fois (numérotation séquentielle automatique)
- **Renuméroter :** cliquez sur le **crayon** à côté d’un numéro de table, saisissez le nouveau numéro et appuyez sur Entrée (un numéro déjà utilisé est refusé avec un message explicatif)
- **Supprimer des tables :** supprimer les tables inutilisées
- **Activer le mode maintenance :** désactiver temporairement des tables ; leur remise en service réinitialise leur compteur d’utilisation depuis la dernière maintenance
- **Réordonner les types :** utilisez les boutons **↑/↓** sur chaque type pour modifier l’ordre affiché dans le tableau de bord, dans les onglets/le navigateur par drapeaux et sur le tableau de statut public

**Opérations groupées :**
- Ajouter plusieurs tables du même type (de 1 à 50 à la fois)
- Les tables reçoivent automatiquement les prochains numéros disponibles

### Gestion de la carte des boissons

1. Cliquez sur **Carte des boissons**
2. **Ajouter un article :**
   - Nom
   - Prix
   - Taux de TVA (20 % standard, 10 % réduit ou 0 % exonéré — voir [Rapports TVA](#vat-tva-reporting--france))
   - **Catégorie** — Froid, Chaud, Alcoolisé, Autre (ou aucune). Les catégories regroupent les articles sur l’écran de commande des joueurs et dans la fenêtre « Ajouter une boisson » du tableau de bord.
3. **Modifier/Supprimer :** utilisez les boutons crayon/corbeille à côté de chaque article

**Prise en charge de plusieurs langues :**
- Les articles peuvent avoir un nom en anglais et en français
- La langue d’affichage peut être modifiée dans Paramètres

### Paiements (point de vente facultatif)

Les paiements sont **désactivés par défaut**. Activez-les dans **Paramètres → Général → « Paiements (POS) »** (voir également [Configurer les paiements par carte](#setting-up-card-payments-administrator) pour les terminaux de paiement par carte).

Une fois activés :

- **Encaissement** : l’argent est perçu avant l’émission de la facture :
  - **Espèces :** saisissez le montant reçu et cliquez sur **Ajouter un paiement** (la monnaie à rendre s’affiche). Utilisez **Montant exact** pour régler exactement le solde restant.
  - **Carte (terminal) :** cliquez sur **Carte (terminal) — €X**. Une bannière « Présentez la carte sur le terminal… » apparaît ; le client approche ou insère sa carte et le paiement est ajouté automatiquement. **Annuler** interrompt l’opération sur le terminal.
  - **Paiements fractionnés :** ajoutez plusieurs paiements (en espèces et/ou par carte) jusqu’à ce que le solde restant soit nul. **Finaliser l’encaissement** n’est activé que lorsque l’addition est entièrement payée.
  - Les remises sont verrouillées dès qu’un paiement a été ajouté (pour éviter tout écart de montant).
- **Reçus** (à l’écran et sur la facture imprimée) : indiquent le ou les moyens de paiement ainsi que la monnaie à rendre, le cas échéant.
- **Admin → Caisse et paiements** (affiché uniquement lorsque la fonction est activée) :
  - **Caisse :** ouvrez une caisse avec un fond initial en début de journée ; à la fermeture, saisissez le montant compté — le total attendu (fond initial + espèces nettes) et l’**écart** sont calculés. En cas d’écart non nul, un e-mail est envoyé à l’adresse de maintenance configurée (si SMTP est configuré).
  - **Remboursements :** pour chaque paiement, avec un montant (remboursement partiel possible) et un motif facultatif. Le remboursement d’un paiement facturé génère un **avoir numéroté** ; une notification affiche son numéro.
  - **Avoirs :** répertoriés avec un bouton **Imprimer** (ajoute la référence du reçu d’origine et le détail de TVA ; enregistrez au format PDF depuis la fenêtre d’impression).
  - **Clôture et rapprochement de la journée :** choisissez une date pour afficher les paiements par moyen de paiement, les avoirs ainsi que les espèces attendues/comptées et l’écart ; **Exporter CSV** télécharge le journal des paiements ; **Clôturer la journée** la verrouille (l’opération est refusée si une caisse est encore ouverte).
- **Admin → Rapports → Financier** affiche les lignes **Payé en espèces/par carte** et **Remboursements (avoirs)** (également dans les exports PDF et Excel). Le rapport **TVA** déduit les avoirs et affiche une catégorie *Remboursements (avoirs)*.

### Paramètres

Accès via le menu (☰) → **Paramètres**

**Paramètres disponibles :**

- **Nom de l’application :** nom affiché dans l’en-tête (par ex. « Joe’s Pool Hall »)
- **URL publique de base :** nom d’hôte/adresse IP ou FQDN utilisé pour générer les codes QR des tables (voir [Codes QR](#qr-codes)) ; laissez le champ vide pour utiliser l’adresse depuis laquelle vous naviguez actuellement
- **Disposition du tableau de bord :** Sections (groupes repliables + navigateur par drapeaux) ou Onglets (un type par onglet)
- **Langue :** English, Français, Deutsch, Español ou Italiano — modifie l’interface sur cet appareil (également sélectionnable depuis l’en-tête, la page des tables côté joueur et le tableau de statut public)
- **Devise :** $ (USD), € (EUR) ou £ (GBP)
- **Remise abonné :** pourcentage de remise (0-100 %)
- **Signaux sonores :** active ou désactive les sons de clic de l’interface et le signal sonore des nouvelles commandes
- **Informations fiscales / légales :** raison sociale, SIRET, SIREN, numéro de TVA intracommunautaire, adresse du siège, régime de TVA et périodicité déclarative — utilisés dans le rapport de TVA et conservés dans vos dossiers (voir [Rapports TVA](#vat-tva-reporting--france))

**Zone de danger :**
- **Effacer tout l’historique des sessions :** supprime définitivement les sessions terminées
  - Une double confirmation est requise
  - Les sessions actives ne sont PAS concernées
  - Les sessions comprises dans une **période de TVA clôturée** sont également protégées et ne seront pas supprimées

---

## Configurer les paiements par carte (administrateur)

### Prérequis

- L’application fonctionne (Docker) sur une machine pouvant accéder à Internet.
- Un **compte Stripe** (coordonnées de l’entreprise vérifiées). Commencez en **mode test**.
- Un **lecteur Stripe Terminal** (par ex. WisePOS E) associé au Wi-Fi de l’établissement — ou, pour les essais, un **lecteur simulé** Stripe.
- **Stripe doit pouvoir accéder** à votre serveur à l’adresse `https://<your-domain>/api/webhooks/stripe` (HTTPS public, proxy inverse ou tunnel pendant la phase pilote). L’application peut rester en HTTP sur le réseau local.
- Les établissements qui n’acceptent que les espèces n’ont pas besoin de tout cela : activez simplement les paiements et utilisez les espèces.

### Étapes

1. **Stripe (mode test)**
   - Associez/enregistrez le lecteur (Dashboard → Terminal → Readers) ; notez son identifiant (`tmr_…`).
   - Developers → Webhooks → ajoutez `https://<your-domain>/api/webhooks/stripe` avec les événements `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled` ; copiez le secret de signature (`whsec_…`).
2. **Configuration du serveur** (environnement compose / `.env`), puis redémarrez (`docker compose up -d`) :
   - `STRIPE_SECRET_KEY=sk_test_…` (la clé de production ultérieurement)
   - `STRIPE_TERMINAL_READER_ID=tmr_…`
   - `STRIPE_WEBHOOK_SECRET=whsec_…`
   - `COOKIE_SECURE=true` lorsque l’application est servie en HTTPS
3. **Paramètres de l’application**
   - Activez **Paramètres → Général → « Paiements (POS) »**.
   - La devise doit être `€`, `$` ou `£` (transmise à Stripe sous la forme eur/usd/gbp).
   - Définissez le nom de l’application et les informations fiscales/légales (utilisées par les rapports et pour vos dossiers).
   - Facultatif : configurez SMTP et l’adresse e-mail d’alerte de maintenance pour les alertes d’écart de caisse.
4. **Tester sans acheter de matériel**
   - `PAYMENT_PROVIDER=fake` dans l’environnement : les paiements sont capturés instantanément (sans terminal ni réseau) — idéal pour former le personnel ou tester l’interface.
   - Ou utilisez le mode test Stripe avec un **lecteur simulé** pour tester le véritable parcours de paiement par carte.
5. **Liste de contrôle avant la mise en production**
   - Vente en espèces avec paiement fractionné et monnaie à rendre ; paiement par carte ; carte refusée puis nouvel essai ; annulation sur le terminal ; remboursement partiel (imprimez l’avoir) ; clôture de la caisse ; clôture de la journée et export du CSV.
   - Ne passez Stripe aux clés de production qu’une fois la phase pilote validée.

### Dépannage et exploitation

- **Le webhook n’arrive pas** (le terminal indique que le paiement est effectué, mais l’application affiche toujours « présentation en cours ») : vérifiez l’URL du point de terminaison, le secret de signature et les abonnements aux événements ; l’application interroge également l’état du paiement et resynchronise les paiements par carte obsolètes à chaque chargement de la page Caisse. Si le paiement a été abandonné, cliquez sur **Annuler** à côté de celui-ci dans Admin → Caisse et paiements.
- **Les totaux du terminal et de l’application diffèrent** sur la fiche de clôture de journée : la ligne « Terminal (Stripe) » provient des transactions de solde Stripe (montant brut moins les remboursements, plus les frais affichés). Vérifiez l’affichage des frais de paiement, les remboursements dans le tableau de bord Stripe et la concordance de la limite de journée avec votre journée comptable. La ligne n’apparaît que lorsque les données de règlement Stripe sont disponibles.
- **Désactiver rapidement les paiements :** désactivez **Paramètres → Général → « Paiements (POS) »** — l’encaissement retrouve son fonctionnement antérieur au POS, les options de carte disparaissent et la page Caisse est masquée. Les reçus, avoirs et données historiques existants ne sont pas modifiés.
- **Changer les clés/le lecteur :** mettez à jour `STRIPE_SECRET_KEY` / `STRIPE_TERMINAL_READER_ID` / `STRIPE_WEBHOOK_SECRET` dans l’environnement et redémarrez (`docker compose up -d`). Cessez d’utiliser l’ancien lecteur dans le tableau de bord Stripe.
- **Passer en production :** remplacez les clés/secrets de test par ceux de production, puis refaites la liste de contrôle pilote avec un petit paiement réel avant d’annoncer l’acceptation des cartes.
- **Établissements qui n’acceptent que les espèces :** aucune configuration Stripe n’est nécessaire ; activez les paiements et utilisez les espèces. Les caisses, remboursements, avoirs, clôtures de journée et exports CSV fonctionnent sans terminal.

### À savoir

- **Un lecteur par déploiement :** l’identifiant du lecteur est configuré dans l’environnement. Plusieurs caisses nécessiteraient une sélection du lecteur (fonctionnalité non implémentée).
- **Dépendance à Internet :** les paiements par carte nécessitent une connexion ; en cas de coupure pendant un paiement, celui-ci peut rester « en cours de présentation » — annulez-le/remboursez-le depuis la page Caisse. Les espèces restent toujours acceptées.
- **Un seul compte du personnel :** l’application ne comporte actuellement qu’une seule connexion admin ; les paiements/avoirs enregistrent cet utilisateur.
- **NF525 (France) :** l’application enregistre les ventes et paiements avec des reçus séquentiels, des lignes inaltérables, des avoirs et des clôtures de période — mais la certification relève d’une procédure d’attestation légale. Consultez votre expert-comptable avant de revendiquer la conformité ou d’activer les paiements par carte en production.
- Cette intégration concerne les **paiements**, pas un système de caisse externe pour le bar (synchronisation des cartes/commandes), ni le paiement en libre-service par les clients depuis leur téléphone.

## Rapports

Accès via **Admin → Rapports**. La page comporte deux onglets : **Financier** et **TVA**.

### Rapports financiers

Générez des rapports détaillés sur les recettes pour toute période.

**Types de période :**
- **Jour :** date précise avec le détail des sessions
- **Semaine :** période de 7 jours commençant le lundi
- **Mois :** mois civil complet
- **Trimestre :** T1, T2, T3 ou T4
- **Année :** récapitulatif annuel

**Contenu du rapport :**

1. **Chiffre d’affaires total** - Toutes les sources cumulées

2. **Recettes par type de table**
   - Billard américain : X €
   - Pool : X €
   - Snooker : X €
   - Billard français : X €

3. **Recettes des boissons/articles** - Ventes de nourriture et de boissons

4. **Recettes des abonnements** - Abonnements actifs pendant la période

5. **Analyse chronologique** (rapports hebdomadaires/mensuels/trimestriels/annuels)
   - Évolution des recettes au fil du temps
   - Analyse par jour de la semaine
   - Repérage des heures de pointe

6. **Détails quotidiens** (rapports journaliers uniquement)
   - Détail de chaque session
   - Utilisation des tables par session
   - Détail par article
   - Possibilité de modifier/supprimer des frais

### Comprendre les rapports

**Éléments inclus :**
- Frais de table des sessions terminées
- Tous les articles de la carte et les frais personnalisés
- Recettes des abonnements

**Éléments exclus :**
- Sessions actives (en cours)
- Écritures comptables des règlements (ajustements internes)
- Tables en maintenance ou en pause

**Chargement automatique :** Le rapport du jour en cours est généré automatiquement à l’ouverture de la page Rapports.

---

## Déclaration de TVA — France

> ⚠️ **Ces informations ne constituent pas un conseil juridique ou fiscal.** Consultez votre *expert-comptable* pour confirmer que ces chiffres et procédures correspondent au régime de TVA propre à votre entreprise avant toute déclaration. Consultez [VAT-COMPLIANCE.md](VAT-COMPLIANCE.md) pour lire les notes de conformité complètes.

L’onglet **TVA** de la page Rapports prépare votre déclaration périodique de TVA (CA3/CA12).

### Générer un rapport de TVA

1. Choisissez un **type de période** (mois, trimestre, année ou jour), puis la période concernée.
2. Cliquez sur **Charger le rapport de TVA** pour afficher le détail par taux de TVA :
   - Total HT (hors taxes)
   - TVA (montant de TVA)
   - Total TTC (toutes taxes comprises)
3. Le tableau présente ci-dessous un détail par catégorie (temps de table, boissons, remises, autres).

### Clôturer une période

Après avoir transmis votre déclaration aux autorités fiscales pour une période, cliquez sur **Clôturer la période**. Cette action :
- Enregistre un instantané des totaux de la période pour vos dossiers.
- Empêche **Effacer tout l’historique des sessions** de supprimer un jour les ventes de cette période, afin que les chiffres déclarés restent toujours traçables dans la base de données.

Les périodes clôturées apparaissent dans une liste d’historique sous le rapport, avec la période, les totaux et le nom de la personne qui l’a clôturée.

### Exporter les données pour votre comptable

Cliquez sur **Exporter le journal CSV** pour télécharger chaque ligne de vente individuelle de la période sélectionnée (date, table/session, description, quantité, prix unitaire, taux de TVA, montant de TVA, montant HT) — pratique pour transmettre ces données à votre comptable ou les archiver à long terme.

### Garantir l’exactitude des rapports de TVA

- Définissez correctement le taux de TVA de chaque boisson et type de table dans Admin (voir [Gestion de la carte des boissons](#drink-menu-management) et [Types de tables et inventaire](#table-types--inventory)).
- **Utilisez toujours « ✓ Encaisser » → Finaliser le paiement** pour terminer les sessions ayant généré des recettes — c’est ainsi que les frais de temps de table sont enregistrés et qu’un reçu séquentiel est émis. Toute autre méthode de fin de session exclura ces frais du rapport de TVA.
- Renseignez vos **informations fiscales/légales** dans Paramètres (SIRET, numéro de TVA, régime de TVA, etc.) pour les avoir sous la main au moment de la déclaration.

---

## Conseils et bonnes pratiques

### Pour les opérations quotidiennes

1. **Début de journée :**
   - Vérifiez qu’aucune table n’est restée occupée par erreur
   - Consultez le rapport de la veille
   - Vérifiez que toutes les tables sont définies comme « disponibles »

2. **Pendant le service :**
   - Utilisez les boutons d’ajout rapide de boissons pour gagner du temps
   - Vérifiez le code PIN avec les joueurs lorsqu’ils souhaitent consulter leur addition
   - Surveillez les sessions qui durent longtemps

3. **Fin de journée :**
   - Encaissez toutes les sessions restantes
   - Générez le rapport journalier
   - Vérifiez les éventuels problèmes ou ajustements

### Pour les règlements

- Vérifiez toujours le nombre de joueurs avant le règlement
- Imprimez les reçus pour les clients
- Vérifiez que les articles sélectionnés correspondent bien à la consommation du joueur

### Pour garantir l’exactitude

- Ajoutez immédiatement les articles aux additions (n’attendez pas l’encaissement)
- Utilisez les frais personnalisés pour les articles absents de la carte
- Vérifiez le nombre de joueurs au démarrage de la session

### Pour le service client

- Communiquez rapidement les URL des tables aux joueurs
- Placez les codes QR près des tables pour qu’ils soient faciles d’accès
- Expliquez les avantages de l’abonnement pour encourager les inscriptions

---

## Raccourcis clavier

Actuellement, l’application s’utilise à la souris ou au toucher et ne comporte aucun raccourci clavier. Toutes les actions nécessitent un clic sur un bouton.

---

## Accès mobile

L’application est entièrement adaptative et fonctionne sur :
- Les navigateurs d’ordinateur
- Les tablettes
- Les smartphones

**Recommandations :**
- Personnel : ordinateur/tablette pour le tableau de bord
- Joueurs : smartphone pour la vue de la table

---

## Dépannage

### Problèmes courants

**« Échec du démarrage de la session »**
- Vérifiez que la table est bien disponible
- Vérifiez que le nombre d’abonnés est inférieur ou égal au nombre total de joueurs
- Actualisez la page et réessayez
- Si le problème persiste, contactez l’administrateur

**Le code PIN ne fonctionne pas**
- Vérifiez que le code PIN correspond à celui du tableau de bord
- Vérifiez le numéro de table
- Le code PIN expire à la fin de la session

**Les articles n’apparaissent pas sur l’addition**
- Vérifiez que l’article a bien été ajouté (message de confirmation)
- Attendez environ 10 secondes l’actualisation automatique (vue publique), ou revenez à l’onglet pour actualiser immédiatement
- Actualisez manuellement le tableau de bord

**Les montants affichés sont incorrects**
- Vérifiez le paramètre de devise
- Vérifiez si des règlements ont été appliqués
- Consultez le détail des lignes dans les informations de la session

### Obtenir de l’aide

Si le problème persiste :
1. Notez le numéro de table et l’heure
2. Faites une capture d’écran si possible
3. Contactez l’administrateur système
4. Consultez les journaux Docker (pour les administrateurs)

---

## Foire aux questions

**Q : Puis-je modifier une session après son démarrage ?**

R : Oui, vous pouvez ajouter ou supprimer des articles et ajuster le nombre de joueurs pendant la session.

**Q : Que se passe-t-il si je termine une session par erreur ?**

R : Les sessions terminées ne peuvent pas être rouvertes. Vous devrez démarrer une nouvelle session.

**Q : Les joueurs peuvent-ils ajouter eux-mêmes des articles ?**

R : Non, seul le personnel peut ajouter des articles. Les joueurs peuvent uniquement consulter leur addition.

**Q : Comment gérer les sessions offertes (gratuites) ?**

R : Démarrez une session avec 1 joueur, ajoutez les articles, puis terminez l’encaissement sans facturer.

**Q : Puis-je modifier le tarif horaire en cours de session ?**

R : Non, les changements de tarif ne s’appliquent qu’aux nouvelles sessions. Les sessions en cours conservent le tarif initial.

**Q : Que se passe-t-il en cas de coupure d’Internet ?**

R : Le système nécessite un accès au réseau. Les sessions en cours sont conservées, mais les mises à jour sont suspendues jusqu’au rétablissement de la connexion.

**Q : Puis-je exporter les données des rapports ?**

R : Actuellement, les rapports sont consultables uniquement à l’écran. Utilisez l’impression du navigateur ou l’export PDF pour les conserver.

**Q : Jusqu’à quelle date puis-je consulter les rapports ?**

R : Tant que l’historique des sessions est conservé (jusqu’à son effacement manuel dans Paramètres).

---

## Récapitulatif des fonctionnalités

### Fonctionnalités principales
- Suivi des sessions en temps réel
- Facturation automatique selon la durée
- Prise en charge de plusieurs joueurs avec règlements
- Vues des joueurs protégées par code PIN
- Gestion des boissons et des articles
- Prise en charge des frais personnalisés
- Transfert de tables
- Impression des reçus
- Commande de boissons en libre-service par les joueurs, avec file de commandes en attente signalée par un son
- Codes QR pour accéder aux tables d’un seul geste depuis le téléphone d’un joueur

### Fonctionnalités d’administration
- Gestion des types de tables et de l’inventaire
- Création groupée de tables
- Configuration de la carte des boissons avec taux de TVA
- Gestion des abonnements
- Rapports financiers (plusieurs périodes)
- Rapports de TVA, export CSV et clôtures de période pour la conformité française
- Prise en charge de plusieurs devises
- Système de remise pour les abonnés
- Gestion de l’historique des sessions
- URL publique de base configurable pour les codes QR
- Informations fiscales/légales de l’entreprise

### Fonctionnalités côté joueur
- Consultation de l’addition en temps réel
- Affichage actualisé automatiquement
- Interface adaptée aux mobiles
- Accès protégé par code PIN
- Commande de boissons en libre-service par code QR

---

## Assistance

Pour obtenir une assistance technique ou demander une fonctionnalité, contactez l’administrateur système.

---

**Version :** 1.0  
**Dernière mise à jour :** Décembre 2025

---

Merci d’utiliser Pool Tables Manager ! Nous espérons que ce guide vous aidera à profiter pleinement de l’application. Pour la documentation technique, les développeurs peuvent consulter `DEVELOPER_README.md`.
