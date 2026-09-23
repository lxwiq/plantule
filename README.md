# Plantule

App Android pour s'occuper de ses plantes : ce qu'il faut faire aujourd'hui, un rappel chaque matin, et l'historique de chaque plante.

Tout reste sur le téléphone : pas de compte, pas de serveur. Les données sont dans une base SQLite locale, et les photos dans le dossier de l'app.

## Fonctionnalités

- **Lieux et pièces** : plusieurs lieux (appartement, maison de campagne…), chacun avec ses pièces et zones (exposition, intérieur ou extérieur).
- **Plantes** : surnom, espèce, pièce, date d'arrivée, pot, substrat, notes et photos (appareil photo ou galerie).
- **Soins** : arrosage, engrais, brumisation, rempotage… avec un intervalle en jours et un ajustement d'hiver.
- **Aujourd'hui** : les soins en retard, ceux du jour, ceux déjà faits et la semaine à venir. On coche « fait », on reporte, ou on signale « terreau encore humide ».
- **Récurrence glissante** : la prochaine échéance part du jour où le soin a été fait. En hiver (novembre à février), l'intervalle est multiplié par le coefficient du soin. Après deux « terreau encore humide » de suite, l'app propose d'allonger l'intervalle.
- **Journal** : tout ce qui a été fait ou reporté, par plante.
- **Résumé quotidien** : une notification locale par jour, à l'heure choisie.
- **Scan** : on photographie une plante, Gemma 4 E2B propose l'espèce, puis rédige sa fiche d'entretien et les soins à programmer. Le modèle tourne sur le téléphone : il se télécharge une fois (2,6 Go, en Wi-Fi) et aucune photo ne sort du téléphone. Il faut un téléphone Android avec 6 Go de RAM. Voir [docs/ai-engine.md](docs/ai-engine.md).

## Développer

```bash
npm install
npx expo start      # puis « a » pour Android (Expo Go ou émulateur)
npm test            # tests unitaires (règles de récurrence, dates, résumé)
npx tsc --noEmit    # typecheck
npx expo lint       # lint
```

Le scan a besoin du module natif de l'APK : il ne marche ni dans Expo Go ni dans le navigateur. Pour essayer ses écrans quand même, lance `EXPO_PUBLIC_FAKE_AI=1 npx expo start` : un faux modèle répond à la place de Gemma.

Structure :

```
src/app/            écrans (Expo Router)
src/ai/             modèle sur le téléphone (téléchargement, exécution) et questions du scan
src/components/     composants, dont le design system dans components/ui
src/db/             base SQLite : schéma et migrations, requêtes, hooks réactifs
src/lib/            règles de récurrence, dates, libellés, fiche espèce et sa validation
src/notifications/  résumé quotidien
src/theme/          couleurs, typographie, espacements (clair et sombre)
```

Le schéma de la base est dans `src/db/database.ts`. Pour le faire évoluer, ajoute une migration à la fin de `MIGRATIONS` et ne modifie jamais une migration déjà publiée.

### Dans un navigateur

Le web ne sert qu'au développement. `expo-sqlite` y a besoin des en-têtes `Cross-Origin-Embedder-Policy: credentialless` et `Cross-Origin-Opener-Policy: same-origin` sur la page. Le serveur de dev d'Expo ne les ajoute pas à la page HTML : il faut passer par un petit proxy local qui les ajoute. De plus, `expo-sqlite` 57.0.3 a un bug sur le web avec les requêtes synchrones dont le résultat dépasse 255 octets. Android n'est pas concerné.

## Livrer

Les APK sont construits par GitHub Actions, pas par EAS (voir `.github/workflows/android.yml`) :

- chaque push sur `main` publie un APK de test dans la release `preview` ;
- un tag `vX.Y.Z` (égal à `expo.version` dans `app.json`) publie un APK et un AAB versionnés.

Le build vérifie d'abord le typecheck, le lint et les tests.

## Serveur (mis de côté)

Une première version synchronisait les données entre les membres d'une maison via une API Rust (Axum, Postgres). Elle est conservée sur la branche `backend-rust`.
