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
| Fiche espèce | nom commun et latin, lumière, arrosage, humidité, température, toxicité pour les chats et les chiens, rythme d'engrais, de brumisation et de rempotage, conseils de rempotage, substrat et pot conseillés, problèmes fréquents, bouturage, conseils. Générée par Gemma et partagée par les plantes de la même espèce |
| Tâche d'entretien | plante, type, intervalle en jours, ajustement hiver, dernière fois faite (peut être indiquée à l'ajout de la plante), prochaine échéance |
| Journal | plante, type d'action, date, note |
| Photo | plante, date, fichier |
| Diagnostic (phase 3) | plante, date, photo, état (saine, à surveiller, à soigner), problèmes probables avec leur confiance, conseils, changement d'entretien proposé |
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

**Prochain lot : l'IA experte des plantes**

- [ ] **Base de référence** : les plantes courantes (au moins 150) avec des données vérifiées : noms français et latins, lumière, arrosage, humidité, températures, toxicité pour les chats et les chiens, engrais, rempotage. Embarquée dans l'app. Gemma s'appuie dessus au lieu d'inventer les chiffres : la fiche d'une plante connue va plus vite et elle est plus juste. Source libre de droits à trouver, sinon base constituée et recoupée par nous
- [ ] **Assistant « expert Plantule »** : un seul expert pour le scan, la fiche, le diagnostic et les questions, qui reçoit le contexte de la plante (espèce, fiche, derniers soins, pièce, saison)
- [ ] **« Demande à Plantule »** : poser ses questions sur une plante, avec la réponse qui s'affiche au fil de l'écriture. La conversation est gardée pour chaque plante
- [ ] **Diagnostic santé par photo, avec Gemma 4**
  - Bouton « Diagnostiquer » sur la page d'une plante : photo rapprochée de ce qui inquiète (feuille, tige, dessous des feuilles)
  - Réponse : état (saine, à surveiller, à soigner), jusqu'à 3 problèmes probables avec leur confiance (maladie, parasite, erreur d'entretien), quoi faire maintenant
  - Le modèle reçoit le contexte que l'app connaît : espèce et sa fiche, derniers arrosages, « terreau encore humide », lumière de la pièce, saison. C'est ce qui aide à distinguer trop d'eau et pas assez
  - Si la cause vient de l'arrosage, proposer de changer l'intervalle en un clic
  - Chaque diagnostic est gardé avec sa photo, pour suivre l'évolution
  - Présenté comme des pistes, pas comme un verdict : le modèle ne voit ni les racines ni les parasites trop petits pour la photo

#### Plan de la prochaine session (2 agents)

À lire avant de commencer : `AGENTS.md`, `README.md`, [ai-engine.md](ai-engine.md), puis le code de `src/ai/`, `src/lib/care-sheet.ts`, `src/lib/identification.ts`, `src/db/`, `src/app/scan/` et `src/app/plant/[id]/index.tsx`.

**Déroulé.** La session principale pose d'abord le contrat ci-dessous (types et fonctions vides qui compilent), puis lance les deux agents en parallèle, chacun sur ses fichiers. À la fin, elle vérifie l'ensemble, coche la roadmap et demande avant de pousser sur `main`.

**Règles communes aux deux agents**

- Pas de serveur, pas de compte, pas d'EAS : tout reste sur le téléphone. Aucune nouvelle dépendance native sans le signaler.
- Interface en français, en tutoyant, avec l'apostrophe ’. Commentaires du code en anglais. Design system `src/components/ui` et tokens de `src/theme`, jamais de couleur en dur.
- Pas de `git checkout`, `stash`, `reset` ou `clean`, pas de commit. Ne pas toucher aux fichiers de l'autre agent. Des erreurs de typecheck dans ses fichiers sont du travail en cours.
- Vérifier avant de rendre : `npx tsc --noEmit`, `npx expo lint`, `npm test`. Pour voir les écrans, le navigateur avec `EXPO_PUBLIC_FAKE_AI=1` (voir le README pour les en-têtes COEP/COOP que demande expo-sqlite).

**Limites du moteur, à respecter partout**

- Ne jamais passer de `temperature` : la changer recharge le modèle.
- Une seule génération à la fois. Annuler rejette tout de suite, mais le calcul natif continue jusqu'au bout : pas de relance automatique après une annulation.
- Contexte de 4 096 jetons au total : instructions, contexte, image (environ 280 jetons) et réponse. Le contexte de la plante doit tenir dans environ 600 jetons.
- Schémas JSON simples, sans `anyOf` ni `oneOf` : utiliser `0` ou `""` pour « rien ». Garder l'extraction et la validation indulgentes (`src/ai/plant-ai.ts`, `src/lib/validate.ts`).
- La première génération après l'ouverture de l'app charge le modèle et peut prendre une minute.
- La génération au fil de l'eau existe : `execute(parts, onToken, options)` de react-native-litert-lm. Aujourd'hui `src/ai/model-runtime.ts` passe `undefined` à la place de `onToken`.

**Contrat posé par la session principale**

1. `src/ai/types.ts` : ajouter `onText?: (text: string) => void` à `GenerateRequest`. Il reçoit le texte déjà écrit à chaque nouveau morceau.
2. `src/lib/plant-reference.ts` :
   - un type `ReferencePlant` avec :
     - `id`, `scientific_name`, `synonyms: string[]`, `common_names: string[]` en français ;
     - `light`, `watering: { interval_days, winter_factor }`, `humidity`, `temperature: { min_c, max_c }` ;
     - `toxicity: { cats, dogs }` ;
     - `fertilizing_interval_days`, `misting_interval_days` (0 si aucune), `repotting_interval_days` ;
     - `sources: string[]` ;
   - `findReference(name: string): ReferencePlant | null`, qui ignore la casse et les accents, et cherche dans le nom latin, les synonymes et les noms communs ;
   - `referenceFacts(plant): string`, le résumé en français donné au modèle.
3. `src/lib/care-sheet.ts` : `CareSheet.reference_id: string | null`, qui vaut `null` à la relecture des anciennes fiches. Il indique que les chiffres viennent de la base.
4. `src/ai/plant-context.ts` :
   - `EXPERT_SYSTEM`, les instructions communes de l'expert ;
   - le type `PlantContext` : espèce, fiche, entrée de la base, pièce (nom, exposition, intérieur ou extérieur), mois, derniers soins et « terreau encore humide » (8 au plus), tâche d'arrosage (intervalle, suite de terreau humide), notes ;
   - `buildPlantContext(plantId: string): PlantContext | null` ;
   - `contextText(context: PlantContext): string`, un texte compact.
5. `src/lib/diagnosis.ts` :
   - le type `Diagnosis`, avec :
     - `status` : `healthy`, `watch` ou `treat` ;
     - `summary` ;
     - `problems` : 3 au plus, chacun `{ name, kind, confidence, signs, actions: string[] }`, où `kind` vaut `disease`, `pest`, `care` ou `environment` ;
     - `watering_change` : `less`, `more` ou `none` ;
     - `light_change` : `more`, `less` ou `none` ;
   - `DIAGNOSIS_SCHEMA` et `validateDiagnosis(value, { strict? })` ;
   - `suggestedWateringInterval(intervalDays, change): number | null`, par exemple ×1,3 pour « moins » et ×0,75 pour « plus », borné de 1 à 730.
6. Fonctions de `src/ai/plant-ai.ts`, vides au départ :
   - `diagnosePlant(photoUri, plantId, { signal })`, qui renvoie une `Diagnosis` ;
   - `askPlant(plantId, history: { role: 'user' | 'assistant'; text: string }[], question, { signal, onText })`, qui renvoie le texte de la réponse.
7. Types du stockage (`src/db/types.ts`) :
   - `DiagnosisRecord` : `id`, `plant_id`, `photo_id`, `status`, `data`, `created_at` ;
   - `ChatMessage` : `id`, `plant_id`, `role`, `text`, `created_at` ;
   - `SpeciesSheetSource` passe à `'ai' | 'reference'`.

**Agent A : « IA experte »**

Ses fichiers :
- `src/ai/**` : plant-ai, plant-context, fake-engine, et model-runtime pour `onText` ;
- `src/lib/plant-reference.ts`, `src/lib/diagnosis.ts`, `src/lib/care-sheet.ts`, `src/lib/identification.ts`, `src/lib/validate.ts` et leurs tests ;
- `src/data/**` ;
- `docs/ai-engine.md`.

Sa mission :

1. **Base de référence**, dans `src/data/plants.ts` :
   - Chercher d'abord une source libre de droits : Wikidata (CC0) pour les noms et la classification, la liste ASPCA pour la toxicité (des faits, à reformuler), d'autres sources ouvertes s'il en trouve.
   - À défaut, constituer la base en recoupant les sources, citées dans `sources`.
   - Au moins 150 plantes : les plantes d'intérieur courantes, plus les plantes de balcon et d'aromatique les plus fréquentes.
   - Des tests de cohérence : intervalles de 1 à 730, noms uniques, synonymes sans doublon, températures min < max.
   - Noter dans `docs/ai-engine.md` d'où viennent les données et sous quelle licence.
2. **Utiliser la base :**
   - Après l'identification, relier chaque candidat à la base.
   - Pour la fiche : si l'espèce est dans la base, les chiffres (lumière, arrosage, humidité, températures, toxicité, engrais, brumisation, rempotage) viennent de la base. Gemma n'écrit que les textes (conseils, substrat, pot, problèmes, bouturage), avec les faits de la base dans le prompt et la consigne de ne pas inventer d'autres chiffres. La réponse est plus courte, donc plus rapide. `reference_id` est rempli.
   - Si l'espèce n'est pas dans la base, la génération complète actuelle reste en place.
3. **Expert commun :**
   - `EXPERT_SYSTEM` : jardinier prudent qui conseille des particuliers en France, phrases courtes, tutoiement.
   - Il dit quand il ne sait pas. Pour une plante toxique mangée par un animal : conseiller le vétérinaire.
   - Utilisé par l'identification, la fiche, le diagnostic et les questions.
   - `buildPlantContext` et `contextText`, qui lisent les données avec `src/db/repo.ts` en lecture seule. Si une fonction de lecture manque, la demander à l'agent B via la session principale.
4. **`diagnosePlant` :**
   - la photo et le contexte de la plante vont dans le même appel ;
   - le prompt insiste sur trop d'eau ou pas assez en s'appuyant sur les derniers arrosages et les « terreau encore humide » ;
   - validation stricte avec nouvelles tentatives, comme pour la fiche.
5. **`askPlant` :**
   - contexte de la plante, puis les 6 derniers messages, raccourcis pour tenir dans le contexte, puis la question ;
   - réponse en texte libre, courte, envoyée au fil de l'eau avec `onText`.
6. **Moteur et faux moteur :**
   - `onText` dans `model-runtime.ts`, avec le texte cumulé et au plus une dizaine de mises à jour par seconde ;
   - dans `fake-engine.ts` : un diagnostic factice, des réponses de conversation écrites mot à mot, et une fiche d'espèce connue remplie depuis la base.
7. **Tests :**
   - recherche dans la base : accents, synonymes, nom commun ;
   - fiche construite depuis la base ;
   - validation du diagnostic en mode strict et indulgent ;
   - `suggestedWateringInterval` ;
   - `contextText` : longueur et contenu ;
   - `askPlant` : historique tronqué et `onText`.

**Agent B : « Écrans et données »**

Ses fichiers : `src/db/**`, `src/app/**` et `src/components/**`.

Sa mission :

1. **Migration 3**, ajoutée à la fin de `MIGRATIONS` sans toucher aux précédentes :
   - table `diagnoses` : `id`, `plant_id` (suppression en cascade), `photo_id` (mis à null si la photo est supprimée), `status`, `data` en JSON, `created_at`, avec un index sur `(plant_id, created_at)` ;
   - table `chat_messages` : `id`, `plant_id` (suppression en cascade), `role`, `text`, `created_at`, avec un index sur `(plant_id, created_at)` ;
   - ajouter les deux tables à `live.ts`, avec les fonctions du repo et les hooks ;
   - supprimer une plante supprime ses diagnostics et sa conversation.
2. **Diagnostic** :
   - Sur la page de la plante, un bouton « Diagnostiquer », seulement si le modèle est prêt (`useModelStatus()`).
   - Il ouvre `src/app/plant/[id]/diagnose.tsx` : appareil photo ou galerie, avec le conseil « de près, à la lumière du jour, montre ce qui t'inquiète ».
   - Puis l'analyse, avec `AiProgress` et « Annuler ».
   - Puis le résultat :
     - un badge d'état ;
     - le résumé ;
     - les problèmes avec leur confiance, leurs signes et les actions à faire ;
     - la mention « Pistes à vérifier, pas un verdict » ;
     - « Enregistrer », qui garde la photo avec `addPhoto` et le diagnostic.
   - Si `watering_change` n'est pas `none`, proposer « Passer l'arrosage à N jours » en un clic (`updateTask`).
   - Sur la page de la plante, une section « Santé » avec la liste des diagnostics (date, état, miniature). Elle ouvre `src/app/diagnosis/[id].tsx`, avec la possibilité de supprimer.
3. **« Demande à Plantule »**, dans `src/app/plant/[id]/ask.tsx`, ouvert depuis un bouton sur la page de la plante :
   - la liste des messages et la réponse qui s'écrit au fil de l'eau ;
   - le bouton d'envoi est désactivé tant qu'une réponse s'écrit ;
   - des suggestions de questions : « Pourquoi ses feuilles jaunissent ? », « Quand la rempoter ? », « Où la placer ? » ;
   - la conversation est gardée dans la base, avec « Effacer la conversation » ;
   - si le modèle n'est pas prêt, afficher `<ModelCard />`.
4. **Fiche vérifiée** : quand `sheet.data.reference_id` est rempli, afficher « Données vérifiées » sur la fiche (`care-sheet-view.tsx`). La fiche est enregistrée avec la source `reference`.
5. **Routes** : ajouter les nouvelles routes dans `src/app/_layout.tsx`.

**À la fin de la session**

- Vérifier l'ensemble et cocher les cases de ce lot.
- Mettre à jour le README (fonctionnalités) et [ai-engine.md](ai-engine.md).
- Demander avant de pousser sur `main` : le push construit l'APK `preview`.
- Sur le téléphone, vérifier :
  - le temps d'un diagnostic ;
  - la génération au fil de l'eau ;
  - la justesse sur des plantes vraiment malades ;
  - qu'une fiche d'espèce connue est plus rapide qu'avant.

**Ensuite**

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
- **Notifications sans ouvrir l'app** : les résumés sont programmés pour 30 jours. Au-delà sans ouvrir l'app, il n'y en a plus.
