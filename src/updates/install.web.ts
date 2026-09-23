/**
 * The browser build is for development only: it never updates itself (it has
 * no update channel). Same exports as install.ts.
 */

import type { UpdateManifest } from '@/lib/app-update';

import type { ApkDownload } from './install';

export type { ApkDownload };

export const installAvailable = false;

export class UpdateCancelledError extends Error {}

const unavailable = () => Promise.reject(new Error('Les mises à jour se font dans l’app Android.'));

export function cleanUpdateFiles(_keepVersionCode: number | null) {}

export function downloadApk(_manifest: UpdateManifest, _onProgress: (fraction: number) => void): ApkDownload {
  const promise = unavailable();
  promise.catch(() => undefined);
  return { promise, cancel: () => undefined };
}

export const installApk = (_manifest: UpdateManifest): Promise<void> => unavailable();

export const openInstallPermissionSettings = (): Promise<void> => unavailable();
