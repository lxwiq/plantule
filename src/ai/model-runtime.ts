/**
 * Runs Gemma on the phone through LiteRT-LM (react-native-litert-lm): loads the
 * model on first use, keeps it in memory for a few minutes, runs one request
 * at a time and frees the memory when idle.
 */

import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';
import { TurboModuleRegistry } from 'react-native';
import type { LiteRTLMInstance, LLMConfig, MultimodalPart } from 'react-native-litert-lm';

import {
  deleteIfExists,
  gpuLoadMarker,
  MIN_TOTAL_MEMORY_BYTES,
  modelFile,
  nativePath,
} from './model-files';
import { formatBytes } from './model-format';
import type { GenerateRequest } from './types';

type LiteRTModule = typeof import('react-native-litert-lm');
type ExecuteOptions = NonNullable<Parameters<LiteRTLMInstance['execute']>[2]>;

/** Prompt + image + answer. An image costs about 280 tokens. */
const MAX_CONTEXT_TOKENS = 4096;
const MAX_OUTPUT_TOKENS = 2048;
const DEFAULT_OUTPUT_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.3;
/** Longest side of the photo given to the model; its vision encoder works below this. */
const MAX_IMAGE_SIDE = 1024;
/** The model is freed after this long without a request. */
const IDLE_UNLOAD_MS = 3 * 60 * 1000;

// ---------------------------------------------------------------------------
// Native module
// ---------------------------------------------------------------------------

let litert: LiteRTModule | null | undefined;

/**
 * The library creates native objects as soon as it is imported, which throws
 * where the module is missing (Expo Go): it is only required once we know
 * Nitro is there, and inside a try.
 */
function liteRT(): LiteRTModule | null {
  if (litert !== undefined) return litert;
  litert = null;
  try {
    if (TurboModuleRegistry.get('NitroModules') != null) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      litert = require('react-native-litert-lm') as LiteRTModule;
    }
  } catch (error) {
    console.warn('[ai] LiteRT-LM unavailable', error);
  }
  return litert;
}

/** Why this phone or build cannot run the model, or null if it can. */
export function unsupportedReason(): string | null {
  if (process.env.EXPO_OS !== 'android') {
    return 'Le scan IA n’est disponible que sur Android pour l’instant.';
  }
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return 'Le scan IA ne marche pas dans Expo Go : installe l’APK de Plantule.';
  }
  const architectures = Device.supportedCpuArchitectures;
  if (architectures && !architectures.includes('arm64-v8a')) {
    return 'Le scan IA a besoin d’un téléphone avec un processeur 64 bits (ARM).';
  }
  const memory = Device.totalMemory;
  if (memory != null && memory < MIN_TOTAL_MEMORY_BYTES) {
    return `Ce téléphone a ${formatBytes(memory)} de mémoire vive, il en faut au moins 6 Go pour faire tourner le modèle.`;
  }
  if (!liteRT()) {
    return 'Cette version de l’app n’inclut pas le moteur IA.';
  }
  return null;
}

// ---------------------------------------------------------------------------
// One request at a time
// ---------------------------------------------------------------------------

let tail: Promise<unknown> = Promise.resolve();
let busy = 0;

/** An error whose message is already written for the user. */
class AiError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'AiError';
  }
}

function abortError() {
  const error = new Error('Analyse annulée.');
  error.name = 'AbortError';
  return error;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError();
}

/**
 * Runs `job` after the previous ones. An abort rejects right away, but the
 * next job still waits for the native work to finish: LiteRT-LM cannot stop a
 * generation midway, and two at once would not fit in memory.
 */
function exclusive<T>(job: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });

    const run = async () => {
      if (signal?.aborted) return; // Aborted while waiting: skip it.
      busy += 1;
      clearIdleTimer();
      try {
        resolve(await job());
      } catch (error) {
        reject(error);
      } finally {
        busy -= 1;
        signal?.removeEventListener('abort', onAbort);
        scheduleIdleUnload();
      }
    };
    tail = tail.then(run, run);
  });
}

// ---------------------------------------------------------------------------
// Loading and unloading
// ---------------------------------------------------------------------------

let llm: LiteRTLMInstance | null = null;
let loadedTemperature: number | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

function clearIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;
}

function scheduleIdleUnload() {
  clearIdleTimer();
  if (busy > 0 || loadedTemperature === null) return;
  idleTimer = setTimeout(() => {
    idleTimer = null;
    void exclusive(unloadNow).catch(() => undefined);
  }, IDLE_UNLOAD_MS);
}

async function unloadNow() {
  loadedTemperature = null;
  if (llm?.isReady()) await llm.unload();
}

/**
 * Frees the model's memory once the current request, if any, is done, then
 * runs `andThen` (e.g. deleting the file) before any later request starts.
 */
export function unloadModel(andThen?: () => void): Promise<void> {
  clearIdleTimer();
  return exclusive(async () => {
    try {
      await unloadNow();
    } finally {
      andThen?.();
    }
  });
}

async function ensureLoaded(temperature: number | undefined): Promise<LiteRTLMInstance> {
  const lib = liteRT();
  if (!lib) throw new AiError('Le moteur IA n’est pas disponible sur ce téléphone.');
  llm ??= lib.createLLM();

  const wanted = temperature ?? loadedTemperature ?? DEFAULT_TEMPERATURE;
  // Android may free the engine under memory pressure: isReady() tells.
  if (llm.isReady() && loadedTemperature !== null && Math.abs(loadedTemperature - wanted) < 1e-3) {
    return llm;
  }

  const model = modelFile();
  if (!model.exists) throw new AiError('Le modèle n’est pas téléchargé.');

  // The sampling temperature is fixed when the model loads.
  const marker = gpuLoadMarker();
  const useGpu = !marker.exists;
  const config: LLMConfig = {
    backend: useGpu ? 'gpu' : 'cpu',
    multimodal: true,
    maxContextTokens: MAX_CONTEXT_TOKENS,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    temperature: wanted,
    topK: 64,
    topP: 0.95,
    enableStructuredOutput: true,
    thinking: { enabled: false },
    // The library's memory estimate ignores that weights are memory-mapped and
    // refuses phones that run the model fine; RAM is checked up front instead.
    forceLoad: true,
  };

  loadedTemperature = null;
  if (useGpu) {
    try {
      marker.create({ overwrite: true });
    } catch {
      // Without the marker we just lose the crash fallback.
    }
  }
  try {
    await llm.loadModel(nativePath(model), config);
  } catch (error) {
    console.warn('[ai] loadModel failed', error);
    throw new AiError('Impossible de charger le modèle sur ce téléphone. Ferme d’autres apps et réessaie.', error);
  } finally {
    if (useGpu) deleteIfExists(marker);
  }
  loadedTemperature = wanted;
  return llm;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

function release(ref: { release(): void } | null | undefined) {
  try {
    ref?.release();
  } catch {
    // Already released.
  }
}

/** A JPEG copy of the photo, at most MAX_IMAGE_SIDE pixels on its longest side. */
async function prepareImage(uri: string): Promise<File> {
  let original: ImageRef | null = null;
  let resized: ImageRef | null = null;
  const loadContext = ImageManipulator.manipulate(uri);
  try {
    original = await loadContext.renderAsync();
    const { width, height } = original;
    const resizeContext = ImageManipulator.manipulate(original);
    try {
      if (Math.max(width, height) > MAX_IMAGE_SIDE) {
        resizeContext.resize(
          width >= height ? { width: MAX_IMAGE_SIDE, height: null } : { width: null, height: MAX_IMAGE_SIDE },
        );
      }
      resized = await resizeContext.renderAsync();
      const saved = await resized.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
      return new File(saved.uri);
    } finally {
      release(resizeContext);
    }
  } catch (error) {
    throw new AiError('Impossible de lire la photo.', error);
  } finally {
    release(resized);
    release(original);
    release(loadContext);
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** The constraint engine rejects some schemas; the answer is then validated by the caller. */
function isSchemaError(error: unknown) {
  const text = error instanceof Error ? `${error.message} ${String(error.cause ?? '')}` : String(error);
  return /schema|grammar|guidance|constrain|response ?format/i.test(text);
}

export function generate(request: GenerateRequest): Promise<string> {
  const { signal } = request;
  return exclusive(async () => {
    const image = request.imageUri ? await prepareImage(request.imageUri) : null;
    try {
      throwIfAborted(signal);
      const temperature = request.temperature === undefined ? undefined : clamp(request.temperature, 0, 2);
      const model = await ensureLoaded(temperature);
      throwIfAborted(signal);

      // Gemma reads the image first, then the question.
      const parts: MultimodalPart[] = [];
      if (image) parts.push({ type: 'image', path: nativePath(image) });
      parts.push({ type: 'text', text: request.prompt });

      const options: ExecuteOptions = {
        maxOutputTokens: Math.round(clamp(request.maxTokens ?? DEFAULT_OUTPUT_TOKENS, 1, MAX_OUTPUT_TOKENS)),
      };
      const schema = request.jsonSchema ? JSON.stringify(request.jsonSchema) : undefined;

      const run = (responseSchema?: string) => {
        // Each request starts from an empty conversation with its own instructions.
        model.resetConversation(undefined, request.system);
        return model.execute(parts, undefined, responseSchema ? { ...options, responseSchema } : options);
      };

      try {
        return await run(schema);
      } catch (error) {
        if (schema && !signal?.aborted && isSchemaError(error)) {
          console.warn('[ai] schema rejected, retrying without it', error);
          return await run();
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof AiError || (error instanceof Error && error.name === 'AbortError')) throw error;
      console.warn('[ai] generate failed', error);
      throw new AiError('Le modèle n’a pas pu analyser la demande. Réessaie.', error);
    } finally {
      if (image) deleteIfExists(image);
    }
  }, signal);
}
