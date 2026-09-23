# Plantule — Roadmap

Application Android de gestion des plantes. Usage perso : moi et mes proches, chacun sur son téléphone.

**Boucle principale** (celle qui doit marcher parfaitement avant tout le reste) :

> J'ouvre l'app → je vois ce qu'il faut faire aujourd'hui → je coche → c'est replanifié.

## Décisions

| Sujet | Choix |
|---|---|
| Plateformes | Android d'abord, iOS plus tard |
| Public | Moi et mes proches, pas de monétisation |
| Données | **Tout en local** : SQLite sur le téléphone (`expo-sqlite`), photos dans le dossier de l'app |
| Backend, connexion | Aucun (décision du 23/09/2026). L'API Rust déjà écrite est gardée sur la branche `backend-rust` |
| Partage | Pas de partage entre téléphones. Plusieurs **lieux** possibles sur un même téléphone (appart, maison de campagne…) |
| Notifications | Locales uniquement, un résumé par jour |
| Réseau | Seulement pour télécharger le modèle, les mises à jour de l'app et pour la météo (Open-Meteo, gratuit, sans compte : seules les coordonnées arrondies d'une ville sont envoyées) |
| IA | Gemma 4 dans sa version mobile (E2B/E4B), qui tourne sur le téléphone : gratuit, sans serveur, comprend les images |
| Scan IA | Phase 2 |
| Livraison | APK construit par GitHub Actions (pas EAS) |
| Mises à jour | L'APK cherche lui-même la nouvelle version sur GitHub Releases : canal Test (`preview`, chaque push sur main) ou Stable (tags `v*`), fixé au build. L'installateur d'Android demande toujours de confirmer |

## Architecture

```
┌──────────────────────── Téléphone (Expo) ─────────────────────────┐
│ Expo Router · écrans                                               │
│ SQLite (lieux, pièces, plantes, soins, journal, boutures, envies)  │
│ Photos dans le dossier de l'app · notifications locales            │
│ Gemma 4 E2B embarqué (LiteRT-LM), téléchargé au premier usage      │
│ Widget d'accueil · agenda « Plantule » · pluie via Open-Meteo      │
└────────────────────────────────────────────────────────────────────┘
```

- Le code est organisé en `src/app` (écrans), `src/db` (schéma, migrations, requêtes, hooks réactifs), `src/lib` (règles de récurrence, dates), `src/components/ui` (design system) et `src/theme`.

## Modèle de données

| Objet | Contenu |
|---|---|
| Lieu | nom, ville facultative (nom, latitude, longitude) pour la météo |
| Pièce / zone | lieu, nom, exposition, intérieur ou extérieur |
| Plante | lieu, surnom, espèce, fiche espèce, pièce, date d'arrivée, pot et substrat, notes, photo principale |
| Fiche espèce | nom commun et latin, lumière, arrosage, humidité, température, toxicité pour les chats et les chiens, rythme d'engrais, de brumisation et de rempotage, conseils de rempotage, substrat et pot conseillés, problèmes fréquents, bouturage, conseils. Partagée par les plantes de la même espèce. Pour une espèce de la base de référence, les chiffres viennent de la base et Gemma écrit les conseils ; sinon Gemma écrit tout |
| Tâche d'entretien | plante, type, intervalle en jours, ajustement hiver, dernière fois faite (peut être indiquée à l'ajout de la plante), prochaine échéance |
| Journal | plante, type d'action, date, note, pluie tombée (mm) quand c'est la pluie qui a arrosé |
| Photo | plante, date de prise (lue dans la photo quand elle vient de la galerie, modifiable), date d'ajout, fichier |
| Diagnostic | plante, date, photo, état (saine, à surveiller, à soigner), problèmes probables avec leur confiance, conseils, changement d'entretien proposé |
| Conversation | plante, rôle (moi ou Plantule), texte, date |
| Bouture | lieu, plante mère (facultative), espèce, date de début, méthode (eau, terreau, sphaigne…), statut (en cours, racines, rempotée, ratée), notes, photo, plante qu'elle est devenue |
| Envie | espèce, note, date d'ajout. Commune à tous les lieux |
| Météo | cache par lieu : pluie heure par heure (14 jours passés, 2 à venir), date du relevé, dernière pluie qui a arrosé. Hors des sauvegardes |
| Réglages | lieu affiché, résumé quotidien activé, heure du résumé, date de la dernière sauvegarde, agenda du téléphone activé et son identifiant |

## Règles métier

- **Récurrence glissante** : la prochaine échéance part de la dernière fois où la tâche a été faite, pas d'un calendrier fixe. Si j'arrose avec 2 jours de retard, tout le cycle se décale.
- **Ajustement saisonnier** : de novembre à février, l'intervalle est multiplié par un coefficient (moins d'arrosage).
- **« Terreau encore humide »** : reporte l'arrosage de 2 jours. Si ça arrive deux fois de suite, l'app propose d'allonger l'intervalle.
- **Premier rappel** : à l'ajout d'une plante, on peut dire quand elle a été arrosée pour la dernière fois. Le premier arrosage tombe un intervalle plus tard, jamais en retard. Sans date, c'est aujourd'hui.
- **Rempotage conseillé par la photo** : si le scan voit qu'il faut rempoter, la tâche tombe tout de suite de mars à août, sinon au 1er mars suivant.
- **Résumé quotidien** : une notif locale à l'heure choisie (« 3 plantes à arroser »). Elle est recalculée à chaque changement, pour les 30 jours suivants.
- **Calendrier** : à partir d'aujourd'hui, il projette chaque soin depuis sa prochaine échéance (aujourd'hui s'il est en retard), puis un intervalle plus tard à chaque fois, hiver compris, comme si chaque soin était fait le jour prévu. Les jours passés ne montrent que le journal.
- **Arrosage par la pluie** : l'arrosage d'une plante dans une pièce en extérieur, dû aujourd'hui ou en retard, compte comme fait s'il est tombé au moins 5 mm en une même journée depuis le dernier arrosage (ou depuis la création de la tâche). Le seuil est par jour : une bruine sur plusieurs jours ne s'additionne pas. C'est le jour de pluie le plus récent qui compte : le journal note « Arrosé par la pluie (X mm) » ce jour-là et la récurrence glissante en repart ; si le prochain arrosage compté depuis cette pluie tombe aujourd'hui ou avant, rien ne change. Seule la pluie tombée compte : une prévision d'au moins 5 mm dans la journée n'affiche qu'un conseil d'attendre. Jamais pour les autres soins, ni pour les plantes d'intérieur ou sans pièce. La météo est relevée à l'ouverture et au retour dans l'app, au plus toutes les 3 h par lieu.
- **Agenda du téléphone** : un agenda local « Plantule », jamais lié à un compte, avec un événement « journée entière » par jour de soins sur 30 jours, projeté comme le calendrier du mois. Seuls les jours qui changent sont réécrits ; les jours passés restent. L'agenda est reconnu par son compte local et son nom, jamais par son seul identifiant.
- **Import d'une sauvegarde** : il remplace toutes les données du téléphone, après confirmation. Le fichier est vérifié avant, et tout se fait en une transaction : en cas d'erreur, rien ne change. Une sauvegarde d'une version plus récente de l'app est refusée ; une plus ancienne s'importe.

## Navigation

Onglets : **Aujourd'hui · Plantes · Scan · Maison**. L'onglet Plantes a trois vues : Plantes, Boutures (du lieu affiché) et Envies (communes à tous les lieux). L'onglet Maison contient le lieu affiché (avec sa ville pour la météo), ses pièces, les autres lieux et les réglages (dont la sauvegarde et l'agenda). Le calendrier du mois s'ouvre depuis l'en-tête d'Aujourd'hui, la galerie de photos depuis la page d'une plante.

## Phases

### Phase 0 — Fondations

- [x] Structure du repo
- [x] Stockage local : SQLite avec migrations, requêtes réactives
- [x] App : navigation par onglets
- [x] Design system de base : couleurs, typographie (Fraunces pour les titres), composants, thème clair et sombre
- [x] CI : typecheck, lint et tests avant le build APK existant
- [x] Tests unitaires des règles (récurrence, hiver, dates, résumé)

### Phase 1 — MVP

**Lieux**
- [x] Créer un lieu, le renommer, le supprimer
- [x] Pièces et zones : créer, modifier, supprimer, exposition, intérieur ou extérieur
- [x] Avoir plusieurs lieux et passer de l'un à l'autre

**Plantes**
- [x] Ajouter une plante à la main : surnom, espèce en texte libre, pièce, photo, rappel d'arrosage
- [x] Liste des plantes par pièce, fiche détail, modification, suppression
- [x] Ajout de photo depuis l'appareil photo ou la galerie, photo principale

**Tâches et rappels**
- [x] Créer des tâches d'entretien par plante (type + intervalle)
- [x] Écran « Aujourd'hui » : en retard, aujourd'hui, fait aujourd'hui, à venir
- [x] Actions rapides : fait, reporter, terreau encore humide
- [x] Récurrence glissante et ajustement hiver
- [x] Résumé quotidien en notif locale, heure réglable
- [x] Journal : historique de ce qui a été fait et quand, par plante
- [x] Tester sur un vrai téléphone Android (APK `preview`)

### Phase 2 — Scan IA sur le téléphone

- [x] Choisir la bibliothèque : `react-native-litert-lm` (LiteRT-LM de Google), Gemma 4 E2B avec image en un seul fichier de 2,6 Go. Détails et options écartées dans [ai-engine.md](ai-engine.md)
- [ ] Mesurer sur un vrai téléphone : temps de chargement et d'analyse, RAM, GPU ou CPU, précision sur nos propres plantes. Comparer avec l'API gratuite de Pl@ntNet. Premiers essais concluants le 23/09/2026, sans mesures chiffrées
- [x] Intégrer le moteur d'inférence (module natif, inclus dans l'APK construit par GitHub Actions)
- [x] Télécharger le modèle au premier usage, en Wi-Fi, avec la progression affichée, l'annulation et la reprise. Il ne va pas dans l'APK.
- [x] Écran de scan : photo → espèce, niveau de confiance et alternatives → confirmation
- [x] Fiche d'entretien générée par Gemma, en JSON validé contre un schéma, enregistrée sur le téléphone
- [x] Créer une plante depuis le scan, avec un planning d'entretien pré-rempli
- [x] Générer la fiche d'une plante déjà enregistrée, à partir de son espèce
- [x] Dire quand la plante a été arrosée pour la dernière fois à son ajout : le premier rappel s'adapte

**Scan « couteau suisse »**
- [x] Lire sur la photo le pot (matériau, diamètre approximatif) et pré-remplir le champ Pot
- [x] Voir sur la photo s'il faut rempoter (racines qui sortent, plante trop grande), avec la raison, et programmer le rempotage en conséquence
- [x] Noter ce qui se voit sur la photo (feuilles jaunies, taches…) et le pré-remplir dans les notes
- [x] Fiche plus complète : conseils de rempotage, substrat et pot conseillés, problèmes fréquents (symptôme, cause, solution), bouturage
- [x] « Compléter la fiche » pour les fiches créées avant ces ajouts
- [x] Aide au placement : la lumière qu'aime la plante et les pièces du lieu qui l'offrent

### Phase 3 — Enrichissement

**Lot livré le 23/09/2026 : l'IA experte des plantes** (APK `preview` du 23/09/2026)

- [x] **Base de référence** : les plantes courantes (au moins 150) avec des données vérifiées : noms français et latins, lumière, arrosage, humidité, températures, toxicité pour les chats et les chiens, engrais, rempotage. Embarquée dans l'app. Gemma s'appuie dessus au lieu d'inventer les chiffres : la fiche d'une plante connue va plus vite et elle est plus juste. 170 plantes : noms vérifiés sur Wikidata (CC0), toxicité d’après les listes de l’ASPCA, chiffres d’entretien écrits par nous faute de source libre (détails dans [ai-engine.md](ai-engine.md))
- [x] **Assistant « expert Plantule »** : un seul expert pour le scan, la fiche, le diagnostic et les questions, qui reçoit le contexte de la plante (espèce, fiche, derniers soins, pièce, saison)
- [x] **« Demande à Plantule »** : poser ses questions sur une plante, avec la réponse qui s'affiche au fil de l'écriture. La conversation est gardée pour chaque plante, et peut être effacée. Accès : la ligne « Demande à Plantule » sous le nom de la plante, avec des suggestions de questions pour commencer
- [x] **Diagnostic santé par photo, avec Gemma 4**
  - Bouton « Diagnostiquer » sur la page d'une plante : photo rapprochée de ce qui inquiète (feuille, tige, dessous des feuilles)
  - Réponse : état (saine, à surveiller, à soigner), jusqu'à 3 problèmes probables avec leur confiance (maladie, parasite, erreur d'entretien), quoi faire maintenant
  - Le modèle reçoit le contexte que l'app connaît : espèce et sa fiche, derniers arrosages, « terreau encore humide », lumière de la pièce, saison. C'est ce qui aide à distinguer trop d'eau et pas assez
  - Si la cause vient de l'arrosage, proposer de changer l'intervalle en un clic
  - Chaque diagnostic est gardé avec sa photo, pour suivre l'évolution
  - Présenté comme des pistes, pas comme un verdict : le modèle ne voit ni les racines ni les parasites trop petits pour la photo

**À vérifier sur le téléphone** (le lot n’a été essayé qu’avec le faux modèle, dans le navigateur) :

- le temps d’un diagnostic, premier chargement du modèle compris ;
- que LiteRT-LM accepte les nouveaux schémas JSON (diagnostic, textes de la fiche) ;
- la génération au fil de l’eau : fluide, et plus rien ne s’affiche après « Arrêter » ;
- la justesse sur des plantes vraiment malades, surtout trop d’eau ou pas assez ;
- qu’une fiche d’espèce connue est plus rapide qu’avant, et que Gemma n’y invente pas d’autres chiffres ;
- que l’identification reste aussi bonne avec les instructions de l’expert commun ;
- le clavier de « Demande à Plantule » et les confirmations de suppression.

**Lot livré le 23/09/2026 : sauvegarde, galerie et calendrier**

- [x] **Sauvegarde** : exporter et réimporter ses données (fichier), pour changer de téléphone. Dans Réglages, « Exporter mes données » crée un fichier `.zip` avec les lieux, plantes, soins, journal, photos, fiches et réglages, et l'envoie par le menu de partage (Drive, e-mail, Quick Share…). « Importer une sauvegarde » vérifie le fichier, montre ce qu'il contient, puis remplace tout ce qui est sur le téléphone ; en cas d'erreur, rien ne change. La date de la dernière sauvegarde s'affiche
- [x] **Galerie de croissance** : photos datées de chaque plante. Chaque photo garde sa date de prise, lue dans la photo quand elle vient de la galerie, et modifiable. La galerie range les photos par mois et compare la plus ancienne à la plus récente (« 8 mois plus tard »), sans les gros plans des diagnostics. On les regarde en plein écran en glissant de l'une à l'autre, avec le temps écoulé depuis l'arrivée de la plante
- [x] **Vue calendrier du mois** : une grille qui commence le lundi, ouverte depuis Aujourd'hui, avec des points pour les soins de chaque jour. À partir d'aujourd'hui, les soins prévus (hiver compris) et les retards ; pour les jours passés, ce que dit le journal

**À vérifier sur le téléphone** (essayé dans le navigateur pour la galerie et le calendrier, pas du tout pour la sauvegarde, qui n'existe pas sur le web) :

- l'export vers Drive, Gmail et Quick Share, et le choix du fichier depuis Drive ou Téléchargements à l'import ;
- une vraie migration : exporter sur un téléphone, importer sur un autre, et retrouver les photos ;
- le temps et la mémoire d'un export et d'un import avec beaucoup de photos ;
- les messages de refus avec un mauvais fichier ;
- la date lue dans les photos choisies dans la galerie Android ;
- « Changer la date » d'une photo, le glissement dans la visionneuse et son compteur « 3 / 7 », la confirmation de suppression ;
- l'en-tête et la barre d'état sombres de la visionneuse.

### Phase 4 — Bonus

**Lot livré le 23/09/2026 : widget, agenda, météo, boutures et envies**

- [x] **Widget Android « Soins du jour »** : sur l'écran d'accueil, les plantes à soigner aujourd'hui dans le lieu affiché, retards compris, les arrosages d'abord, « +2 autres » s'il manque de place, « Rien à faire aujourd'hui » sinon. Il suit le thème clair ou sombre, se met à jour dès qu'un soin change et au moins toutes les heures, même app fermée. Le toucher ouvre Aujourd'hui. Pas de bouton « Fait » : la bibliothèque (`react-native-android-widget`) perd les clics des widgets à plusieurs zones après un rafraîchissement
- [x] **Export vers l'agenda du téléphone** : dans Réglages, « Ajouter les soins à mon agenda » crée un agenda local « Plantule » avec un événement par jour de soins sur 30 jours. Il se réécrit tout seul quand les soins changent et disparaît quand on désactive (`expo-calendar`)
- [x] **Météo pour les plantes d'extérieur** : un lieu peut avoir une ville (recherche Open-Meteo). Une journée d'au moins 5 mm de pluie compte comme arrosage pour les plantes des pièces en extérieur : journal « Arrosé par la pluie », cycle qui repart du jour de pluie, bandeau sur Aujourd'hui, et conseil d'attendre quand il va pleuvoir
- [x] **Boutures et liste d'envies** : dans l'onglet Plantes. Les boutures ont plante mère, méthode, statut, notes et photo, et « En faire une plante » crée la plante pré-remplie en gardant le lien. Les envies ont des suggestions de la base de référence, affichent lumière, arrosage et toxicité, et « Je l'ai ! » crée la plante. Les deux sont dans la sauvegarde
- [x] **Mises à jour dans l'app** : l'APK trouve tout seul la nouvelle version sur GitHub (au lancement et au retour dans l'app, au plus toutes les 4 h), l'annonce par un bandeau sur Aujourd'hui et dans Réglages, la télécharge avec la progression et en vérifie la taille et l'empreinte, puis la passe à l'installateur d'Android. Chaque build publie un `update.json` à côté de l'APK, avec les commits depuis le build précédent. L'AAB pour Google Play n'a ni la vérification ni la permission d'installer (règles du Play Store)
- [x] En plus : une nouvelle plante d'une espèce connue de la base de référence, sans fiche, reçoit le rythme d'arrosage, le coefficient d'hiver et la lumière de la base
- [ ] Version iOS

**À vérifier sur le téléphone** (widget et agenda essayés sur un émulateur Android, météo, boutures et envies dans le navigateur avec une pluie simulée) :

- que le widget se met à jour le matin quand le téléphone sort de veille (jusqu'à une heure de retard après minuit), et que le toucher marche encore après plusieurs jours ;
- la taille du widget et son nombre de lignes sur le lanceur du téléphone, puis après redimensionnement ; son aperçu dans le sélecteur ;
- le temps et la batterie de la mise à jour horaire du widget ;
- l'agenda « Plantule » dans Google Agenda, avec les événements au bon jour ; deux refus de la permission puis « Ouvrir les réglages » ; une sauvegarde importée avec l'agenda activé ;
- la recherche de ville et la vraie réponse d'Open-Meteo, sans réseau puis au retour du réseau ;
- l'arrosage par la pluie au retour dans l'app, et le résumé quotidien recalculé ;
- la photo d'une bouture, puis sa reprise comme première photo de la plante ; un export puis un import avec des boutures qui ont une photo ;
- les mises à jour : le bandeau après un nouveau push (ou « Rechercher une mise à jour »), la progression et « Annuler », l'autorisation « Installer des applis inconnues » la première fois, puis l'installation, avec les données intactes ; rien ne doit s'afficher hors ligne ni pendant la minute où la release `preview` est recréée ; le message sur données mobiles ; au premier tag `v*`, l'APK en canal Stable et l'AAB sans la permission ;
- le défilement des puces « Plante mère » avec beaucoup de plantes, et le retour arrière après « Je l'ai ! » et « En faire une plante ».

**Lot livré le 23/09/2026 : Pépin et les illustrations**

- [x] **Un dessin pour chaque plante**, dans le style du logo : 26 familles (monstera, pothos, sansevieria, fougère, cactus, orchidée, fleurs, citronnier, tomate…) couvrent les 170 plantes de la base de référence, avec la couleur de leurs fleurs ou de leurs fruits. Une espèce hors de la base est reconnue par son genre ou par un mot (« cactus », « basilic »…), sinon c'est la pousse du logo. Le dessin remplace la photo tant qu'il n'y en a pas : liste des plantes, soins, page de la plante, calendrier, boutures, envies, résultats du scan
- [x] **Le visage du pot suit la plante** : assoiffé quand un arrosage est en retard, inquiet après un diagnostic « à soigner » de moins de 30 jours, ravi quand un soin a été fait aujourd'hui, content sinon
- [x] **Pépin, la mascotte** : le pot du logo, qui accueille sur Aujourd'hui avec un mot selon l'heure et les soins du jour (« 2 plantes ont soif, on s'en occupe ? »). Il respire doucement (sauf si les animations sont réduites) et ouvre son vestiaire au toucher
- [x] **Le vestiaire de Pépin** (Maison, ou en touchant Pépin) : son nom, la plante qui pousse dans son pot (une des 26 familles), 10 couleurs de pot et 35 habits et accessoires : motifs (pull tricoté, vichy, marinière…), chapeaux (bonnet à pompon, chapeau de paille…), lunettes, écharpe ou col, et un objet à tenir (tasse de thé, arrosoir, livre…). « Au hasard » et « Tenue d'origine ». La tenue est dans la sauvegarde
- [x] **Scènes cocooning** avec Pépin dans sa tenue, pour les moments calmes : rien à faire aujourd'hui (endormi sous un plaid avec un chocolat chaud), pas encore de plante, pas de rappel, pas de bouture, liste d'envies vide, conversation vide, scan, plante introuvable
- [x] Les dessins sont du SVG construit par du code (`src/art`), affiché avec `react-native-svg`. `node scripts/art-preview.mjs` en fait une planche PNG pour les regarder

**À vérifier sur le téléphone** (essayé dans le navigateur, sans plante à cause du bug d'expo-sqlite sur le web) :

- les dessins sur Android : dégradés (surtout ceux qui suivent une feuille : succulente, broméliacée, fleur de lune), motifs du pot découpés à sa forme ;
- la fluidité de la liste des plantes et du vestiaire avec beaucoup de dessins ;
- la respiration de Pépin, la vibration au toucher, et l'option « Supprimer les animations » d'Android ;
- les visages assoiffé et inquiet sur de vraies plantes, et les couleurs de fleurs de quelques espèces.

## Risques et points ouverts

- **Données seulement sur le téléphone** : perdre ou changer de téléphone, ou désinstaller l'app, efface tout. La sauvegarde par fichier existe depuis la phase 3, mais elle est manuelle : sans export récent, un téléphone perdu emporte tout. La date de la dernière sauvegarde est affichée dans Réglages.
- **Pas de partage** : si plusieurs personnes s'occupent des mêmes plantes, chacune a sa propre liste. Si ça devient gênant, la branche `backend-rust` contient une API de synchronisation prête à reprendre.
- **Précision de l'identification** : Gemma 4 est un modèle généraliste de 2 à 4 milliards de paramètres. Il peut se tromper d'espèce tout en ayant l'air sûr de lui. L'utilisateur confirme donc toujours, et on compare avec Pl@ntNet pendant le prototype. Si la précision ne suffit pas, Pl@ntNet sert à l'identification et Gemma garde la fiche et le diagnostic.
- **Poids et matériel** : le modèle pèse 2,6 Go à télécharger et demande un téléphone avec au moins 6 Go de RAM. Le scan doit rester optionnel : l'ajout à la main marche partout.
- **Sortie structurée** : un petit modèle produit parfois un JSON invalide. On le valide et on relance si besoin.
- **Longueur des réponses** : plus on demande de choses au modèle (pot, rempotage, fiche complète), plus il met de temps à répondre sur le téléphone. Une fiche n'est écrite qu'une fois par espèce, mais l'analyse de la photo se refait à chaque scan.
- **Estimations sur photo** : le diamètre du pot et le besoin de rempotage sont des estimations, toujours modifiables avant d'enregistrer.
- **Diagnostic santé** : les conseils restent indicatifs, à présenter comme des pistes et non comme un verdict.
- **Chiffres de la base de référence** : les noms (Wikidata) et la toxicité (ASPCA) sont vérifiés, mais les chiffres d’entretien ont été écrits par nous faute de source libre. Ce sont des points de départ, à corriger dans `src/data/plants.ts` quand l’usage montre qu’ils sont faux. Le badge « Données vérifiées » en dit donc un peu plus qu’il ne faudrait.
- **Questions et diagnostic sans le modèle** : « Demande à Plantule » et le diagnostic ont besoin de Gemma, donc d’un téléphone de 6 Go de RAM et du modèle téléchargé. Ailleurs, la ligne « Demande à Plantule » est masquée.
- **Pluie et balcon abrité** : une pièce marquée « en extérieur » est considérée comme arrosée par la pluie. Un balcon abrité doit donc être marqué en intérieur, sinon ses plantes seront oubliées.
- **Pluie et notifications** : les résumés sont programmés à l'avance. La pluie n'est prise en compte qu'à l'ouverture de l'app : sans l'ouvrir, le rappel d'arrosage part quand même.
- **Premier APK avec les mises à jour** : les APK installés avant n'ont pas le système de mise à jour. Le premier qui l'a s'installe à la main, une dernière fois, depuis le lien `preview`.
- **Notifications sans ouvrir l'app** : les résumés sont programmés pour 30 jours. Au-delà sans ouvrir l'app, il n'y en a plus.
- **Version web de développement** : expo-sqlite sur le web coupe les résultats de requête de plus de 255 octets (`web/WorkerChannel.ts`), ce qui casse l'app dans le navigateur avec de vraies données. Pour tester sur le web, il faut corriger ce fichier en local, sans le committer.
