/**
 * The on-device model: Gemma 4 E2B run by LiteRT-LM. Holds the model's status
 * (read by useSyncExternalStore), downloads and deletes the file, and hands
 * generation to model-runtime. See docs/ai-engine.md.
 */

import * as Network from 'expo-network';

import { checkDiskSpace, DownloadCancelledError, startModelDownload, type ModelDownload } from './model-download';
import {
  deleteIfExists,
  isModelComplete,
  MODEL_NAME,
  MODEL_SIZE_BYTES,
  modelFile,
  partialBytes,
  partialModelFile,
} from './model-files';
import { generate, unloadModel, unsupportedReason } from './model-runtime';
import type { AiEngine, GenerateRequest, ModelStatus } from './types';

/** Progress is published at most this often. */
const PROGRESS_INTERVAL_MS = 250;

let status: ModelStatus | null = null;
const listeners = new Set<() => void>();
let download: ModelDownload | null = null;
let downloadPromise: Promise<void> | null = null;
/** Cancel pressed before the transfer itself started (during the checks). */
let cancelRequested = false;

/** Worked out on first read, from the files on the phone. */
function initialStatus(): ModelStatus {
  let reason: string | null;
  try {
    reason = unsupportedReason();
  } catch (error) {
    console.warn('[ai] support check failed', error);
    reason = 'Le scan IA n’est pas disponible sur ce téléphone.';
  }
  if (reason) return { state: 'unsupported', reason };
  return isModelComplete()
    ? { state: 'ready', sizeBytes: MODEL_SIZE_BYTES }
    : { state: 'not_downloaded', sizeBytes: MODEL_SIZE_BYTES };
}

function getStatus(): ModelStatus {
  status ??= initialStatus();
  return status;
}

function setStatus(next: ModelStatus) {
  status = next;
  for (const listener of listeners) listener();
}

function fail(message: string): never {
  setStatus({ state: 'error', message });
  throw new Error(message);
}

/** Refuses cellular data unless allowed, and no connection at all. */
async function checkConnection(allowCellular: boolean) {
  let state: Network.NetworkState;
  try {
    state = await Network.getNetworkStateAsync();
  } catch {
    return; // Unknown: let the download try.
  }
  if (state.isConnected === false || state.isInternetReachable === false) {
    fail('Pas de connexion Internet. Connecte-toi au Wi-Fi et réessaie.');
  }
  const unmetered =
    state.type === Network.NetworkStateType.WIFI || state.type === Network.NetworkStateType.ETHERNET;
  if (!unmetered && !allowCellular) {
    fail('Connecte-toi au Wi-Fi pour télécharger le modèle.');
  }
}

async function runDownload(allowCellular: boolean) {
  await checkConnection(allowCellular);
  if (cancelRequested) {
    setStatus({ state: 'not_downloaded', sizeBytes: MODEL_SIZE_BYTES });
    return;
  }
  const already = partialBytes();
  try {
    checkDiskSpace(already);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  let lastPublished = 0;
  let settled = false;
  const publish = (bytes: number, force = false) => {
    if (settled) return; // A late progress event must not undo the final status.
    const now = Date.now();
    if (!force && now - lastPublished < PROGRESS_INTERVAL_MS) return;
    lastPublished = now;
    const progress = Math.min(1, Math.max(0, bytes / MODEL_SIZE_BYTES));
    const current = getStatus();
    if (current.state === 'downloading' && Math.abs(current.progress - progress) < 0.0005) return;
    setStatus({ state: 'downloading', progress, sizeBytes: MODEL_SIZE_BYTES });
  };
  publish(already, true);

  const current = startModelDownload((bytes) => publish(bytes));
  download = current;
  try {
    await current.promise;
    settled = true;
    setStatus({ state: 'ready', sizeBytes: MODEL_SIZE_BYTES });
  } catch (error) {
    settled = true;
    if (error instanceof DownloadCancelledError) {
      setStatus({ state: 'not_downloaded', sizeBytes: MODEL_SIZE_BYTES });
      return;
    }
    console.warn('[ai] download failed', error);
    fail(error instanceof Error ? error.message : 'Le téléchargement a échoué. Réessaie.');
  } finally {
    download = null;
  }
}

export const engine: AiEngine = {
  info: { name: MODEL_NAME, sizeBytes: MODEL_SIZE_BYTES },

  getStatus,

  subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  download(options) {
    const current = getStatus();
    if (current.state === 'unsupported') return Promise.reject(new Error(current.reason));
    if (current.state === 'ready') return Promise.resolve();
    if (downloadPromise) return downloadPromise;
    cancelRequested = false;
    downloadPromise = runDownload(options?.allowCellular ?? false).finally(() => {
      downloadPromise = null;
    });
    return downloadPromise;
  },

  cancelDownload() {
    if (downloadPromise) cancelRequested = true;
    download?.cancel();
  },

  async deleteModel() {
    const current = getStatus();
    if (current.state === 'unsupported') return;
    if (downloadPromise) {
      cancelRequested = true;
      download?.cancel();
      await downloadPromise.catch(() => undefined);
    }
    const removeFiles = () => {
      deleteIfExists(modelFile());
      deleteIfExists(partialModelFile());
      setStatus({ state: 'not_downloaded', sizeBytes: MODEL_SIZE_BYTES });
    };
    // Waits for a running analysis to finish, frees the memory, then deletes.
    await unloadModel(removeFiles).catch((error: unknown) => {
      console.warn('[ai] unload failed', error);
      removeFiles();
    });
  },

  generate(request: GenerateRequest) {
    const current = getStatus();
    if (current.state !== 'ready') {
      return Promise.reject(
        new Error(
          current.state === 'unsupported' ? current.reason : 'Le modèle n’est pas encore téléchargé.',
        ),
      );
    }
    return generate(request);
  },
};
