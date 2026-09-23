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
│ Gemma 4 embarqué (phase 2)                                         │
└────────────────────────────────────────────────────────────────────┘
```

- Le code est organisé en `src/app` (écrans), `src/db` (schéma, migrations, requêtes, hooks réactifs), `src/lib` (règles de récurrence, dates), `src/components/ui` (design system) et `src/theme`.

## Modèle de données

| Objet | Contenu |
|---|---|
| Lieu | nom |
| Pièce / zone | lieu, nom, exposition, intérieur ou extérieur |
| Plante | lieu, surnom, espèce, pièce, date d'arrivée, pot et substrat, notes, photo principale |
| Fiche espèce (phase 2) | nom commun et latin, lumière, arrosage, humidité, température, toxicité pour les animaux |
| Tâche d'entretien | plante, type, intervalle en jours, ajustement hiver, dernière fois faite, prochaine échéance |
| Journal | plante, type d'action, date, note |
| Photo | plante, date, fichier |
| Réglages | lieu affiché, résumé quotidien activé, heure du résumé |

## Règles métier

- **Récurrence glissante** : la prochaine échéance part de la dernière fois où la tâche a été faite, pas d'un calendrier fixe. Si j'arrose avec 2 jours de retard, tout le cycle se décale.
- **Ajustement saisonnier** : de novembre à février, l'intervalle est multiplié par un coefficient (moins d'arrosage).
- **« Terreau encore humide »** : reporte l'arrosage de 2 jours. Si ça arrive deux fois de suite, l'app propose d'allonger l'intervalle.
- **Résumé quotidien** : une notif locale à l'heure choisie (« 3 plantes à arroser »). Elle est recalculée à chaque changement, pour les 30 jours suivants.

## Navigation

Onglets : **Aujourd'hui · Plantes · Scan** (phase 2) **· Maison**. L'onglet Maison contient le lieu affiché, ses pièces, les autres lieux et les réglages.

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
- [ ] Tester sur un vrai téléphone Android (APK `preview`)

### Phase 2 — Scan IA sur le téléphone

- [ ] Prototype : faire tourner Gemma 4 E2B dans l'app et mesurer la vitesse, la RAM et la précision sur nos propres plantes. Bibliothèques à comparer : `react-native-executorch`, `llama.rn`, `react-native-litert-lm`. Vérifier que l'entrée image est bien supportée. Comparer avec l'API gratuite de Pl@ntNet.
- [ ] Intégrer le moteur d'inférence (module natif, donc un development build)
- [ ] Télécharger le modèle au premier usage, en Wi-Fi, avec la progression affichée. Il ne va pas dans l'APK.
- [ ] Écran de scan : photo → espèce, niveau de confiance et alternatives → confirmation
- [ ] Fiche d'entretien générée par Gemma, en JSON validé contre un schéma, enregistrée sur le téléphone
- [ ] Créer une plante depuis le scan, avec un planning d'entretien pré-rempli

### Phase 3 — Enrichissement

- [ ] Sauvegarde : exporter et réimporter ses données (fichier), pour changer de téléphone
- [ ] Galerie de croissance : photos datées de chaque plante
- [ ] Diagnostic santé par photo, avec Gemma 4
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
- **Poids et matériel** : le modèle pèse environ 1,5 à 2,5 Go à télécharger et demande un téléphone récent avec assez de RAM. Le scan doit rester optionnel : l'ajout à la main marche partout.
- **Sortie structurée** : un petit modèle produit parfois un JSON invalide. On le valide et on relance si besoin.
- **Diagnostic santé** : les conseils restent indicatifs, à présenter comme des pistes et non comme un verdict.
- **Notifications sans ouvrir l'app** : les résumés sont programmés pour 30 jours. Au-delà sans ouvrir l'app, il n'y en a plus.
