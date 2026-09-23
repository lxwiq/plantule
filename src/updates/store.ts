/**
 * Looks for a newer build of the app on GitHub Releases, when the app opens
 * and when it comes back to the foreground (at most every few hours), then
 * downloads and installs it when asked. Automatic checks say nothing when
 * they fail: offline, GitHub down, or the preview release being published
 * again (its files are missing for a minute).
 *
 * What the app remembers (last check, last manifest, banner closed) stays on
 * this phone, apart from the database: it is not part of a backup.
 */

import Storage from 'expo-sqlite/kv-store';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import {
  bannerVisible,
  isNewer,
  manifestUrl,
  parseManifest,
  parseVersionCode,
  shouldCheck,
  type UpdateManifest,
} from '@/lib/app-update';

import { installedVersion, updateChannel } from './channel';
import { cleanUpdateFiles, downloadApk, installApk, UpdateCancelledError, type ApkDownload } from './install';

const STORAGE_KEY = 'plantule.app-update';
const TIMEOUT_MS = 15_000;

export type UpdateDownload =
  | { state: 'idle' }
  | { state: 'downloading'; progress: number }
  /** Android's installer is open. */
  | { state: 'installing' }
  /** Back from the installer without installing: the APK is ready for another try. */
  | { state: 'ready' }
  | { state: 'error'; message: string };

export type UpdateState = {
  /** A newer build of this channel, or null. */
  available: UpdateManifest | null;
  /** The banner on the Today screen. */
  bannerVisible: boolean;
  checking: boolean;
  /** Last check that got an answer (ISO). */
  lastCheckedAt: string | null;
  /** Outcome of the last check asked in the settings, until the next one. */
  manualCheck: 'up_to_date' | 'failed' | null;
  download: UpdateDownload;
};

type Saved = {
  lastCheckedAt: string | null;
  lastAttemptAt: string | null;
  latest: UpdateManifest | null;
  dismissedVersionCode: number | null;
};

const emptySaved: Saved = { lastCheckedAt: null, lastAttemptAt: null, latest: null, dismissedVersionCode: null };

let saved: Saved | null = null;
let checking = false;
let manualCheck: UpdateState['manualCheck'] = null;
let download: UpdateDownload = { state: 'idle' };
let activeDownload: { cancel(): void } | null = null;
/** The update whose APK was downloaded last, for another try at the installer. */
let downloaded: UpdateManifest | null = null;
let snapshot: UpdateState | null = null;
const listeners = new Set<() => void>();

function loadSaved(): Saved {
  if (saved) return saved;
  saved = { ...emptySaved };
  if (!updateChannel) return saved;
  try {
    const value: unknown = JSON.parse(Storage.getItemSync(STORAGE_KEY) ?? 'null');
    if (typeof value === 'object' && value !== null) {
      const record = value as Record<string, unknown>;
      const text = (key: string) => (typeof record[key] === 'string' ? (record[key] as string) : null);
      saved = {
        lastCheckedAt: text('lastCheckedAt'),
        lastAttemptAt: text('lastAttemptAt'),
        latest: parseManifest(record.latest, updateChannel),
        dismissedVersionCode: parseVersionCode(record.dismissedVersionCode),
      };
    }
  } catch {
    // Unreadable: start again, the next check fills it.
  }
  return saved;
}

function save(changes: Partial<Saved>) {
  saved = { ...loadSaved(), ...changes };
  try {
    Storage.setItemSync(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Kept in memory: the next launch simply checks again.
  }
  emit();
}

function available(): UpdateManifest | null {
  const latest = loadSaved().latest;
  return latest && isNewer(latest, installedVersion.code) ? latest : null;
}

function emit() {
  snapshot = null;
  for (const listener of listeners) listener();
}

function getSnapshot(): UpdateState {
  if (!snapshot) {
    const update = available();
    snapshot = {
      available: update,
      bannerVisible: bannerVisible(update, loadSaved().dismissedVersionCode),
      checking,
      lastCheckedAt: loadSaved().lastCheckedAt,
      manualCheck,
      download,
    };
  }
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setDownload(next: UpdateDownload) {
  download = next;
  emit();
}

/**
 * Fails on a network error, a timeout, `signal` aborting, an HTTP error (404
 * while the preview release is published again) or a bad manifest.
 */
async function fetchManifest(signal?: AbortSignal): Promise<UpdateManifest> {
  if (!updateChannel) throw new Error('No update channel');
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, TIMEOUT_MS);
  signal?.addEventListener('abort', abort);
  try {
    const response = await fetch(manifestUrl(updateChannel), {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
    });
    if (!response.ok) throw new Error(`GitHub: HTTP ${response.status}`);
    const manifest = parseManifest(await response.json(), updateChannel);
    if (!manifest) throw new Error('GitHub: unexpected update manifest');
    return manifest;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

/**
 * Reads the channel's manifest. Automatic checks (`manual: false`) wait a few
 * hours between two answers; checks asked by the user always run and report
 * their outcome in `manualCheck`. Never fails.
 */
export async function checkForUpdate({ manual = false } = {}): Promise<void> {
  if (!updateChannel || checking) return;
  const now = Date.now();
  if (!manual && !shouldCheck(loadSaved(), now)) return;

  checking = true;
  manualCheck = null;
  save({ lastAttemptAt: new Date(now).toISOString() });
  try {
    const latest = await fetchManifest();
    save({ latest, lastCheckedAt: new Date().toISOString() });
    if (manual && !available()) manualCheck = 'up_to_date';
  } catch {
    if (manual) manualCheck = 'failed';
  } finally {
    checking = false;
    emit();
  }
}

/** Hides the Today banner until the next version. */
export function dismissUpdateBanner() {
  const update = available();
  if (update) save({ dismissedVersionCode: update.versionCode });
}

async function openInstaller(manifest: UpdateManifest) {
  downloaded = manifest;
  setDownload({ state: 'installing' });
  try {
    await installApk(manifest);
    // Back without installing (after an install, Android restarts the app).
    setDownload({ state: 'ready' });
  } catch (error) {
    setDownload({ state: 'error', message: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Downloads the available update (with progress), then opens Android's
 * installer on it. The manifest is read again first: the preview APK is
 * replaced at each build, and the checks of the download must match it.
 */
export function startUpdate() {
  if (!available() || activeDownload || download.state === 'installing') return;

  let cancelled = false;
  let apk: ApkDownload | null = null;
  const controller = new AbortController();
  activeDownload = {
    cancel() {
      cancelled = true;
      controller.abort();
      apk?.cancel();
    },
  };
  setDownload({ state: 'downloading', progress: 0 });

  const run = async (): Promise<UpdateManifest | null> => {
    try {
      save({ latest: await fetchManifest(controller.signal), lastCheckedAt: new Date().toISOString() });
    } catch {
      // Keep the manifest already known: the download says what is wrong, if anything.
    }
    if (cancelled) throw new UpdateCancelledError();
    const manifest = available();
    if (!manifest) return null;

    let percent = -1;
    apk = downloadApk(manifest, (progress) => {
      // One update per percent is plenty for a progress bar.
      const next = Math.floor(progress * 100);
      if (cancelled || next === percent) return;
      percent = next;
      setDownload({ state: 'downloading', progress });
    });
    await apk.promise;
    return manifest;
  };

  run().then(
    (manifest) => {
      activeDownload = null;
      if (manifest) void openInstaller(manifest);
      else setDownload({ state: 'idle' });
    },
    (error: unknown) => {
      activeDownload = null;
      if (cancelled || error instanceof UpdateCancelledError) {
        setDownload({ state: 'idle' });
      } else {
        setDownload({ state: 'error', message: error instanceof Error ? error.message : String(error) });
      }
    },
  );
}

/** Stops the download and deletes what was downloaded. */
export function cancelUpdate() {
  activeDownload?.cancel();
}

/** Opens the installer again on the downloaded APK (after allowing installs from Plantule). */
export function installAgain() {
  if (downloaded && download.state === 'ready') void openInstaller(downloaded);
}

export function useAppUpdate(): UpdateState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * Checks when the app opens and each time it comes back to the foreground,
 * and clears the APKs left by earlier updates. Does nothing without a channel.
 */
export function useUpdateChecks() {
  useEffect(() => {
    if (!updateChannel) return;
    // The APK of the update still to install is kept; the others are done with.
    cleanUpdateFiles(available()?.versionCode ?? null);
    void checkForUpdate();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkForUpdate();
    });
    return () => subscription.remove();
  }, []);
}
