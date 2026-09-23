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
| IA | Gemma 4 dans sa version mobile (E2B/E4B), qui tourne sur le téléphone : gratuit, sans serveur, comprend les images |
| Scan IA | Phase 2 |
| Livraison | APK construit par GitHub Actions (pas EAS) |

## Architecture

```
┌──────────────────────── Téléphone (Expo) ─────────────────────────┐
│ Expo Router · écrans                                               │
│ SQLite (lieux, pièces, plantes, soins, journal, réglages)          │
│ Photos dans le dossier de l'app · notifications locales            │
│ Gemma 4 E2B embarqué (LiteRT-LM), téléchargé au premier usage      │
└────────────────────────────────────────────────────────────────────┘
```

- Le code est organisé en `src/app` (écrans), `src/db` (schéma, migrations, requêtes, hooks réactifs), `src/lib` (règles de récurrence, dates), `src/components/ui` (design system) et `src/theme`.

## Modèle de données

| Objet | Contenu |
|---|---|
| Lieu | nom |
| Pièce / zone | lieu, nom, exposition, intérieur ou extérieur |
| Plante | lieu, surnom, espèce, fiche espèce, pièce, date d'arrivée, pot et substrat, notes, photo principale |
| Fiche espèce | nom commun et latin, lumière, arrosage, humidité, température, toxicité pour les chats et les chiens, rythme d'engrais, de brumisation et de rempotage, conseils de rempotage, substrat et pot conseillés, problèmes fréquents, bouturage, conseils. Partagée par les plantes de la même espèce. Pour une espèce de la base de référence, les chiffres viennent de la base et Gemma écrit les conseils ; sinon Gemma écrit tout |
| Tâche d'entretien | plante, type, intervalle en jours, ajustement hiver, dernière fois faite (peut être indiquée à l'ajout de la plante), prochaine échéance |
| Journal | plante, type d'action, date, note |
| Photo | plante, date, fichier |
| Diagnostic | plante, date, photo, état (saine, à surveiller, à soigner), problèmes probables avec leur confiance, conseils, changement d'entretien proposé |
| Conversation | plante, rôle (moi ou Plantule), texte, date |
| Réglages | lieu affiché, résumé quotidien activé, heure du résumé |

## Règles métier

- **Récurrence glissante** : la prochaine échéance part de la dernière fois où la tâche a été faite, pas d'un calendrier fixe. Si j'arrose avec 2 jours de retard, tout le cycle se décale.
- **Ajustement saisonnier** : de novembre à février, l'intervalle est multiplié par un coefficient (moins d'arrosage).
- **« Terreau encore humide »** : reporte l'arrosage de 2 jours. Si ça arrive deux fois de suite, l'app propose d'allonger l'intervalle.
- **Premier rappel** : à l'ajout d'une plante, on peut dire quand elle a été arrosée pour la dernière fois. Le premier arrosage tombe un intervalle plus tard, jamais en retard. Sans date, c'est aujourd'hui.
- **Rempotage conseillé par la photo** : si le scan voit qu'il faut rempoter, la tâche tombe tout de suite de mars à août, sinon au 1er mars suivant.
- **Résumé quotidien** : une notif locale à l'heure choisie (« 3 plantes à arroser »). Elle est recalculée à chaque changement, pour les 30 jours suivants.

## Navigation

Onglets : **Aujourd'hui · Plantes · Scan · Maison**. L'onglet Maison contient le lieu affiché, ses pièces, les autres lieux et les réglages.

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

**Prochain lot**

- [ ] Sauvegarde : exporter et réimporter ses données (fichier), pour changer de téléphone
- [ ] Galerie de croissance : photos datées de chaque plante
- [ ] Vue calendrier du mois

### Phase 4 — Bonus

- [ ] Widget Android « à arroser aujourd'hui »
- [ ] Météo pour les plantes d'extérieur (Open-Meteo) : pas de rappel s'il a plu
- [ ] Export des tâches vers le calendrier du téléphone
- [ ] Boutures et liste d'envies
- [ ] Version iOS

## Risques et points ouverts

- **Données seulement sur le téléphone** : perdre ou changer de téléphone, ou désinstaller l'app, efface tout. D'où la sauvegarde par fichier en phase 3.
- **Pas de partage** : si plusieurs personnes s'occupent des mêmes plantes, chacune a sa propre liste. Si ça devient gênant, la branche `backend-rust` contient une API de synchronisation prête à reprendre.
- **Précision de l'identification** : Gemma 4 est un modèle généraliste de 2 à 4 milliards de paramètres. Il peut se tromper d'espèce tout en ayant l'air sûr de lui. L'utilisateur confirme donc toujours, et on compare avec Pl@ntNet pendant le prototype. Si la précision ne suffit pas, Pl@ntNet sert à l'identification et Gemma garde la fiche et le diagnostic.
- **Poids et matériel** : le modèle pèse 2,6 Go à télécharger et demande un téléphone avec au moins 6 Go de RAM. Le scan doit rester optionnel : l'ajout à la main marche partout.
- **Sortie structurée** : un petit modèle produit parfois un JSON invalide. On le valide et on relance si besoin.
- **Longueur des réponses** : plus on demande de choses au modèle (pot, rempotage, fiche complète), plus il met de temps à répondre sur le téléphone. Une fiche n'est écrite qu'une fois par espèce, mais l'analyse de la photo se refait à chaque scan.
- **Estimations sur photo** : le diamètre du pot et le besoin de rempotage sont des estimations, toujours modifiables avant d'enregistrer.
- **Diagnostic santé** : les conseils restent indicatifs, à présenter comme des pistes et non comme un verdict.
- **Chiffres de la base de référence** : les noms (Wikidata) et la toxicité (ASPCA) sont vérifiés, mais les chiffres d’entretien ont été écrits par nous faute de source libre. Ce sont des points de départ, à corriger dans `src/data/plants.ts` quand l’usage montre qu’ils sont faux. Le badge « Données vérifiées » en dit donc un peu plus qu’il ne faudrait.
- **Questions et diagnostic sans le modèle** : « Demande à Plantule » et le diagnostic ont besoin de Gemma, donc d’un téléphone de 6 Go de RAM et du modèle téléchargé. Ailleurs, la ligne « Demande à Plantule » est masquée.
- **Notifications sans ouvrir l'app** : les résumés sont programmés pour 30 jours. Au-delà sans ouvrir l'app, il n'y en a plus.
