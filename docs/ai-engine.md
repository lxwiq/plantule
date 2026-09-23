# Moteur IA sur le téléphone

Décision du 23/09/2026 pour la phase 2 (scan). Code : `src/ai/engine.ts` et `src/ai/model-*.ts`, derrière le contrat `src/ai/types.ts`. Ce qu’on demande au modèle (scan, fiche, diagnostic, questions) est dans `src/ai/plant-ai.ts` ; la base de référence dans `src/data/plants.ts` (voir plus bas).

## Choix

**Gemma 4 E2B** au format LiteRT-LM (`.litertlm`), exécuté par **[react-native-litert-lm](https://github.com/hung-yueh/react-native-litert-lm) 0.7.0**, qui embarque le moteur officiel de Google **LiteRT-LM 0.15.0** (module Nitro, config plugin Expo).

Pourquoi :

- c'est le moteur et le fichier que Google utilise dans son app de démo Google AI Edge Gallery pour Gemma 4 avec **image** (tâche « Ask Image ») : l'entrée image est un chemin officiel, pas un bricolage ;
- un seul fichier de 2,6 Go contient le texte, la vision et l'audio (chargés à la demande) ;
- accélération GPU (OpenCL, compilée dans la lib) avec repli automatique sur le CPU ;
- sortie contrainte par **JSON Schema** (LLGuidance) : le JSON ne peut pas être malformé ;
- compile avec RN 0.86, New Architecture et `expo prebuild` (vérifié en local avec le JDK 17 de la CI).

## Options comparées

| | react-native-litert-lm | llama.rn | react-native-executorch |
|---|---|---|---|
| Moteur | LiteRT-LM (Google) | llama.cpp | ExecuTorch (Meta) |
| Gemma 4 E2B + image | Oui, un seul fichier | Oui, GGUF + projecteur `mmproj` | **Non** : les `.pte` Gemma 4 publiés sont texte seul |
| À télécharger | 2,59 Go | Q4_0 2,84 Go + mmproj Q8_0 0,56 Go = 3,4 Go | 2,4 à 2,6 Go |
| GPU / NPU Android | GPU OpenCL (+ fichiers NPU pour quelques puces) | OpenCL Adreno seulement, NPU Hexagon expérimental | Vulkan |
| JSON contraint | JSON Schema | JSON Schema → grammaire | non |
| Arrêter une génération | non (voir limites) | oui | oui |
| Maintenance | 1 mainteneur, actif (0.7.0 du 31/08) | très actif | très actif (Software Mansion) |

Écartés aussi : MediaPipe LLM Inference (en maintenance selon Google), et Gemini Nano via AICore / ML Kit (seulement sur quelques téléphones haut de gamme, modèle imposé).

## Modèle

- URL (miroir public `litert-community`, sans compte ni jeton, vérifiée : 200, et 206 pour la reprise) :
  `https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/6e5c4f1e395deb959c494953478fa5cec4b8008f/gemma-4-E2B-it.litertlm`
- Épinglée sur un commit : le fichier ne peut pas changer sous nos pieds.
- Taille : 2 588 147 712 octets (2,6 Go). SHA-256 : `181938105e0eefd105961417e8da75903eacda102c4fce9ce90f50b97139a63c`.
- Stocké dans `Documents/models/` de l'app, pas dans le cache (Android ne l'efface pas tout seul).

## Mémoire

Mesures de Google (Galaxy S26 Ultra, contexte 2048) : ~1,7 Go de RAM sur CPU, ~0,7 Go sur GPU (plus la mémoire GPU). Les poids sont projetés en mémoire depuis le fichier.
L'app exige **6 Go de RAM** (seuil technique : `Device.totalMemory` ≥ 5 Go, un téléphone de 6 Go en déclare ~5,5). En dessous, le scan est « indisponible » avec la raison. Google AI Edge Gallery demande 8 Go, mais pour un contexte de 32 000 jetons ; on en utilise 4096. Le seuil est dans `MIN_TOTAL_MEMORY_BYTES` (`src/ai/model-files.ts`) : à baisser pour essayer un téléphone de 4 Go.

## Réglages

- Chargement au premier `generate()`, sur GPU. Si l'app meurt pendant un chargement GPU, les suivants se font sur CPU (fichier témoin `gpu-load.pending`).
- Libéré après 3 minutes sans demande, et dans `deleteModel()`. Une seule génération à la fois (file d'attente).
- Contexte 4096 jetons (une image en coûte ~280), réponse 1024 jetons par défaut, 2048 au plus.
- Température 0,3 par défaut, topK 64, topP 0,95, « thinking » désactivé.
- Photo redimensionnée à 1024 px de côté au plus, en JPEG.
- `jsonSchema` passé à LLGuidance. Si le moteur refuse le schéma, la demande est relancée sans contrainte (la réponse est de toute façon validée par l'appelant).
- Réponse au fil de l’eau : avec `onText`, le moteur écrit la réponse morceau par morceau (`execute(parts, onToken, options)`) et `onText` reçoit tout le texte déjà écrit, au plus toutes les 100 ms, puis le texte final (`src/ai/text-stream.ts`). Plus rien n’est envoyé après une annulation.
- Téléchargement : `DownloadTask` d'expo-file-system (SDK 57) avec progression, annulation et reprise (en-tête `Range`), même après un redémarrage de l'app. Écrit en `.part`, vérifié (taille et en-tête `LITERTLM`) puis renommé. Espace disque vérifié avant (+300 Mo de marge). Refus hors Wi-Fi sauf accord explicite (expo-network).

## L’expert Plantule

Toutes les demandes partagent les mêmes instructions, `EXPERT_SYSTEM` (`src/ai/plant-context.ts`) : un jardinier prudent qui conseille des particuliers en France, en phrases courtes et en tutoyant ; il dit quand il ne sait pas, s’appuie sur les données vérifiées sans inventer d’autres chiffres, et conseille le vétérinaire si un animal a mangé une plante toxique. Les tâches en JSON (identification, fiche, diagnostic) y ajoutent « réponds uniquement avec un objet JSON » ; les questions répondent en texte libre.

Pour le diagnostic et les questions, le modèle reçoit ce que l’app sait de la plante (`buildPlantContext`, `contextText`) : espèce, chiffres de la base (ou de la fiche), problèmes fréquents de la fiche, pièce (nom, intérieur ou dehors, lumière), pot et substrat, mois et saison, rappel d’arrosage (intervalle, retard, « terreau encore humide » de suite), les 8 derniers soins (l’arrosage d’abord) et les notes. Le tout tient en 2 000 caractères au plus, environ 600 jetons : les textes libres sont raccourcis et les soins les plus anciens sautent d’abord.

| Demande | Instructions + contexte | Image | Réponse (max) |
|---|---|---|---|
| Identification | ~650 jetons | ~280 | 600 |
| Fiche d’une espèce de la base | ~650 | — | 1 000 |
| Fiche complète (espèce inconnue) | ~850 | — | 1 400 |
| Diagnostic | ~1 350 | ~280 | 900 |
| Question | ~1 700 (dont 6 messages) | — | 400 |

Une nouvelle tentative ajoute la réponse précédente (1 500 caractères au plus) et les erreurs : le diagnostic reste vers 3 000 jetons sur 4 096.

## Base de référence

`src/data/plants.ts` : **170 plantes** (109 d’intérieur, 42 de balcon et de terrasse, 19 aromatiques), avec noms latins et français, lumière, arrosage (intervalle et facteur d’hiver), humidité, températures supportées, toxicité pour les chats et les chiens, engrais, brumisation et rempotage. Recherche (`findReference`) sans tenir compte de la casse, des accents, du signe d’hybride, d’un cultivar entre guillemets, de « spp. », d’un article ou d’un pluriel ; jamais sur un genre seul (« Ficus alii » n’est pas le Ficus benjamina).

Utilisation :

- **Identification** : chaque candidat est relié à la base (`reference_id`), par son nom latin, ou par son nom commun si le genre concorde. Il prend alors le nom latin de la base, et son premier nom commun si celui du modèle n’y figure pas.
- **Fiche** : pour une espèce de la base, les chiffres viennent de la base et Gemma n’écrit que les textes (conseils d’arrosage et de rempotage, substrat, pot, bouturage, problèmes, astuces), avec les faits de la base dans la demande et la consigne de ne pas écrire d’autres chiffres. La fiche a `reference_id` et est enregistrée avec la source `reference`. Sinon, Gemma écrit toute la fiche, comme avant.
- **Diagnostic et questions** : les chiffres de la base font partie du contexte de la plante.

D’où viennent les données, et sous quelle licence :

- **Noms** : chaque nom latin vérifié sur **Wikidata** (licence CC0, domaine public), dont l’identifiant est dans `sources`. Wikidata a aussi fourni une partie des noms français. Pour quelques plantes vendues sous un ancien nom (Echinocactus grusonii, Osteospermum, Schefflera, Dracaena marginata), c’est ce nom qui est gardé et le nom accepté va dans les synonymes.
- **Toxicité** : les listes de l’**ASPCA** (Animal Poison Control Center) pour les chats et les chiens, vérifiées par script pour chaque plante (espèce, ou genre quand l’espèce n’y est pas), avec le lien dans `sources`. On n’en garde que le fait (toxique ou non), pas le texte. Une plante absente des listes est « inconnue », sauf quatre plantes irritantes gardées « toxiques » par prudence (Rhaphidophora, Zamioculcas, croton, agave), commentées dans le fichier.
- **Chiffres d’entretien** (lumière, arrosage, humidité, températures, engrais, brumisation, rempotage) : écrits par nous pour la culture en pot en France, à partir des conseils horticoles courants, et marqués `Plantule` dans `sources`. Aucune source ouverte trouvée pour ces chiffres : FloraDB (échantillon en CC BY-NC), Open Plantbook (compte obligatoire, plages de capteurs plutôt que des rythmes), OpenPlantDB (CC0 mais cultures potagères des États-Unis). Ce sont des repères de départ : chaque plante les ajuste ensuite (« terreau encore humide », diagnostic).

Les tests (`src/lib/plant-reference.test.ts`) vérifient au moins 150 plantes, des identifiants et des noms uniques, qu’aucun nom ne désigne deux plantes, des intervalles entre 1 et 730 jours, un facteur d’hiver parmi 1, 1,5, 2 et 3, un minimum de température inférieur au maximum, et une source pour chaque toxicité connue.

## Diagnostic et questions

- **Diagnostic** (`diagnosePlant`) : la photo et le contexte de la plante dans le même appel. Le modèle liste d’abord jusqu’à 3 problèmes (nom, type, confiance, signes, actions), puis l’état, le résumé et les changements d’arrosage et de lumière. La demande insiste sur trop d’eau ou pas assez, d’après les derniers arrosages et les « terreau encore humide », et sur ce que la photo ne montre pas (racines, petits parasites). Validation stricte (`validateDiagnosis`) avec 2 nouvelles tentatives ; à la relecture d’un diagnostic enregistré, la validation est indulgente. `suggestedWateringInterval` propose ×1,3 pour « moins d’eau » et ×0,75 pour « plus », d’au moins un jour, entre 1 et 730.
- **Questions** (`askPlant`) : contexte de la plante, les 6 derniers messages raccourcis à 400 caractères, puis la question. Réponse courte en texte libre, envoyée au fil de l’eau par `onText`, sans nouvelle tentative.

## Limites connues

- **Pas d'arrêt en cours de génération** : la 0.7.0 n'expose pas `cancelProcess()` (corrigé sur la branche principale de la lib, pas encore publié). `signal` rejette tout de suite, mais le calcul continue en arrière-plan jusqu'à la fin de la réponse et la demande suivante attend.
- **Température fixée au chargement** : une demande avec une autre température recharge le modèle (quelques secondes). Garder une température constante.
- GPU : il faut OpenCL, absent de certains téléphones. Le repli CPU marche mais le traitement de l'image est ~7 fois plus lent.
- Premier chargement GPU plus long (compilation mise en cache).
- iOS non géré ici (la lib le supporte, mais un modèle de plus de 2 Go demande un entitlement Apple payant).
- APK arm64 : 70 Mo, dont ~25 Mo pour le moteur (`liblitertlm_jni.so` fait 21 Mo). Le modèle n'est pas dans l'APK.
- Le config plugin de la lib force Kotlin 2.3.0 et `minSdkVersion` 26.
- Build local : le JDK 25 livré avec Android Studio fait échouer la configuration CMake de plusieurs libs natives. Utiliser un JDK 17 (comme la CI).

## À mesurer sur un vrai téléphone

Temps de chargement, temps d'une identification avec photo, RAM, repli CPU/GPU, justesse sur nos plantes (et comparaison avec Pl@ntNet). Et depuis la phase 3 : le temps d’un diagnostic, le rythme de la réponse au fil de l’eau, la justesse du diagnostic sur des plantes vraiment malades, et le temps d’une fiche d’espèce connue (texte seul) comparé à une fiche complète.
