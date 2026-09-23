/**
 * Downloads the model file: resumable (an interrupted download continues
 * where it stopped, even after the app was closed), retried on network
 * hiccups, written under a temporary name and renamed once its size and
 * header are right.
 */

import { DownloadTask, File, Paths } from 'expo-file-system';

import {
  deleteIfExists,
  DISK_MARGIN_BYTES,
  ensureModelsDirectory,
  looksLikeModel,
  MODEL_FILE_NAME,
  MODEL_SIZE_BYTES,
  MODEL_URL,
  partialModelFile,
} from './model-files';
import { formatBytes } from './model-format';

/** Attempts in a row without progress before giving up. */
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

export class DownloadCancelledError extends Error {
  constructor() {
    super('Téléchargement annulé.');
    this.name = 'DownloadCancelledError';
  }
}

export type ModelDownload = {
  promise: Promise<void>;
  cancel(): void;
};

/** Bytes still to fetch, or throws a French message when the phone lacks space. */
export function checkDiskSpace(alreadyDownloaded: number) {
  const remaining = MODEL_SIZE_BYTES - alreadyDownloaded;
  let available: number;
  try {
    available = Paths.availableDiskSpace;
  } catch {
    return; // Unknown: let the download try, it fails cleanly if the disk fills up.
  }
  if (available < remaining + DISK_MARGIN_BYTES) {
    throw new Error(
      `Il faut ${formatBytes(remaining + DISK_MARGIN_BYTES)} d’espace libre, il en reste ${formatBytes(available)}. Libère de la place sur le téléphone et réessaie.`,
    );
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Native download errors turned into something the user can act on. */
function downloadErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  const http = /HTTP (\d{3})/.exec(text);
  if (http) {
    return `Le serveur du modèle a répondu par une erreur (HTTP ${http[1]}). Réessaie plus tard.`;
  }
  if (/ENOSPC|no space/i.test(text)) {
    return 'Plus assez d’espace sur le téléphone. Libère de la place et réessaie.';
  }
  return 'Le téléchargement a été interrompu. Vérifie ta connexion et réessaie : il reprendra où il s’est arrêté.';
}

/**
 * Starts (or resumes) the download. `onProgress` receives the bytes on disk,
 * several times per second. The promise rejects with `DownloadCancelledError`
 * after `cancel()`, which also deletes the partial file.
 */
export function startModelDownload(onProgress: (bytes: number) => void): ModelDownload {
  let task: DownloadTask | null = null;
  let cancelled = false;

  const run = async () => {
    ensureModelsDirectory();
    const part = partialModelFile();
    let attempts = 0;

    for (;;) {
      if (cancelled) throw new DownloadCancelledError();

      let offset = part.exists ? part.size : 0;
      if (offset > MODEL_SIZE_BYTES) {
        deleteIfExists(part);
        offset = 0;
      }
      if (offset === MODEL_SIZE_BYTES) break;
      onProgress(offset);

      const options = { onProgress: ({ bytesWritten }: { bytesWritten: number }) => onProgress(bytesWritten) };
      const current =
        offset > 0
          ? DownloadTask.fromSavable(
              { url: MODEL_URL, fileUri: part.uri, isDirectory: false, resumeData: String(offset) },
              options,
            )
          : File.createDownloadTask(MODEL_URL, part, options);
      task = current;

      try {
        const result = offset > 0 ? await current.resumeAsync() : await current.downloadAsync();
        if (result) break;
        // `null` means paused, which only cancel() can cause here: loop to find out.
      } catch (error) {
        if (cancelled) throw new DownloadCancelledError();
        const now = part.exists ? part.size : 0;
        // A retry that moved forward resets the count: only stalls give up.
        attempts = now > offset ? 1 : attempts + 1;
        if (attempts >= MAX_ATTEMPTS) throw new Error(downloadErrorMessage(error));
        await delay(RETRY_DELAY_MS * attempts);
      } finally {
        task = null;
        current.release();
      }
    }

    if (!looksLikeModel(part)) {
      deleteIfExists(part);
      throw new Error('Le fichier téléchargé est incomplet ou abîmé. Réessaie le téléchargement.');
    }
    // An old copy would block the rename.
    deleteIfExists(new File(part.parentDirectory, MODEL_FILE_NAME));
    part.rename(MODEL_FILE_NAME);
  };

  const promise = run().catch((error: unknown) => {
    if (cancelled || error instanceof DownloadCancelledError) {
      deleteIfExists(partialModelFile());
      throw new DownloadCancelledError();
    }
    throw error;
  });

  return {
    promise,
    cancel() {
      if (cancelled) return;
      cancelled = true;
      task?.cancel();
    },
  };
}
