/**
 * Downloads the APK of an update into the app cache, checks it against its
 * manifest, and hands it to Android's package installer, which asks the user
 * to confirm (and, the first time, to allow installs from Plantule). Android
 * never lets an app install itself silently.
 */

import * as Application from 'expo-application';
import { Directory, File, Paths, type DownloadTask } from 'expo-file-system';
import { ActivityAction, startActivityAsync } from 'expo-intent-launcher';

import { apkFileName, downloadMatches, staleUpdateFiles, type UpdateManifest } from '@/lib/app-update';

const APK_MIME_TYPE = 'application/vnd.android.package-archive';
/** Intent.FLAG_GRANT_READ_URI_PERMISSION: lets the installer read the APK through its content URI. */
const FLAG_GRANT_READ_URI_PERMISSION = 1;

export const installAvailable = true;

export class UpdateCancelledError extends Error {
  constructor() {
    super('Téléchargement annulé.');
    this.name = 'UpdateCancelledError';
  }
}

export type ApkDownload = {
  promise: Promise<void>;
  cancel(): void;
};

/** In the cache: Android may clear it, and it is never part of a backup. */
function updatesDirectory() {
  return new Directory(Paths.cache, 'updates');
}

function apkFile(versionCode: number) {
  return new File(updatesDirectory(), apkFileName(versionCode));
}

function deleteIfExists(file: File) {
  try {
    if (file.exists) file.delete();
  } catch {
    // Already gone: nothing more to do.
  }
}

/** Size and MD5 as the manifest gives them (the MD5 reads the whole file, once per download). */
function isComplete(manifest: UpdateManifest, file: File): boolean {
  try {
    if (!file.exists) return false;
    return downloadMatches(manifest, { size: file.size, md5: manifest.apkMd5 ? file.md5 : null });
  } catch {
    return false;
  }
}

/**
 * Deletes the downloaded APKs and unfinished downloads, except the complete
 * APK of `keepVersionCode`. Never fails.
 */
export function cleanUpdateFiles(keepVersionCode: number | null) {
  try {
    const directory = updatesDirectory();
    if (!directory.exists) return;
    const entries = directory.list();
    const stale = new Set(staleUpdateFiles(entries.map((entry) => entry.name), keepVersionCode));
    for (const entry of entries) {
      if (stale.has(entry.name)) entry.delete();
    }
  } catch {
    // Left for the next time: the cache is Android's to clear anyway.
  }
}

function downloadErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  if (/ENOSPC|no space/i.test(text)) {
    return 'Plus assez d’espace sur le téléphone. Libère de la place et réessaie.';
  }
  if (/HTTP 404/.test(text)) {
    return 'Cette version n’est plus en ligne : une plus récente est sans doute en cours de publication. Réessaie dans quelques minutes.';
  }
  return 'Le téléchargement a été interrompu. Vérifie ta connexion et réessaie.';
}

/**
 * Downloads the APK of `manifest` (at once if it is already there).
 * `onProgress` receives a fraction between 0 and 1. The promise rejects with
 * `UpdateCancelledError` after `cancel()`, with a French message otherwise.
 */
export function downloadApk(manifest: UpdateManifest, onProgress: (fraction: number) => void): ApkDownload {
  let task: DownloadTask | null = null;
  let cancelled = false;
  const target = apkFile(manifest.versionCode);
  const part = new File(updatesDirectory(), `${apkFileName(manifest.versionCode)}.part`);

  const run = async () => {
    if (isComplete(manifest, target)) {
      cleanUpdateFiles(manifest.versionCode);
      onProgress(1);
      return;
    }
    cleanUpdateFiles(null);
    updatesDirectory().create({ idempotent: true, intermediates: true });
    onProgress(0);

    const current = File.createDownloadTask(manifest.apkUrl, part, {
      onProgress: ({ bytesWritten, totalBytes }) => {
        const total = totalBytes > 0 ? totalBytes : manifest.apkSize;
        if (total) onProgress(Math.min(bytesWritten / total, 1));
      },
    });
    task = current;
    try {
      const file = await current.downloadAsync();
      if (!file) throw new UpdateCancelledError(); // Paused, which only cancel() can cause.
    } catch (error) {
      if (cancelled) throw new UpdateCancelledError();
      throw new Error(downloadErrorMessage(error));
    } finally {
      task = null;
      current.release();
    }
    if (cancelled) throw new UpdateCancelledError();

    if (!isComplete(manifest, part)) {
      throw new Error('Le fichier téléchargé est incomplet ou abîmé. Réessaie.');
    }
    part.rename(apkFileName(manifest.versionCode));
  };

  const promise = run().catch((error: unknown) => {
    deleteIfExists(part);
    throw cancelled ? new UpdateCancelledError() : error;
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

/**
 * Opens Android's installer on the downloaded APK. Resolves when the user
 * comes back without installing (after an install, Android restarts the app).
 */
export async function installApk(manifest: UpdateManifest): Promise<void> {
  const file = apkFile(manifest.versionCode);
  if (!file.exists) throw new Error('Le fichier de la mise à jour a disparu. Télécharge-la à nouveau.');
  try {
    await startActivityAsync('android.intent.action.VIEW', {
      data: file.contentUri,
      type: APK_MIME_TYPE,
      flags: FLAG_GRANT_READ_URI_PERMISSION,
    });
  } catch {
    throw new Error('L’installateur d’Android n’a pas pu s’ouvrir. Réessaie.');
  }
}

/** Android's setting "Installer des applis inconnues", on Plantule's page. */
export async function openInstallPermissionSettings(): Promise<void> {
  const packageName = Application.applicationId;
  await startActivityAsync(
    ActivityAction.MANAGE_UNKNOWN_APP_SOURCES,
    packageName ? { data: `package:${packageName}` } : {},
  );
}
