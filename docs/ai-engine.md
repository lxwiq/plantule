# Moteur IA sur le téléphone

Décision du 23/09/2026 pour la phase 2 (scan). Code : `src/ai/engine.ts` et `src/ai/model-*.ts`, derrière le contrat `src/ai/types.ts`.

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
- Téléchargement : `DownloadTask` d'expo-file-system (SDK 57) avec progression, annulation et reprise (en-tête `Range`), même après un redémarrage de l'app. Écrit en `.part`, vérifié (taille et en-tête `LITERTLM`) puis renommé. Espace disque vérifié avant (+300 Mo de marge). Refus hors Wi-Fi sauf accord explicite (expo-network).

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

Temps de chargement, temps d'une identification avec photo, RAM, repli CPU/GPU, justesse sur nos plantes (et comparaison avec Pl@ntNet).
