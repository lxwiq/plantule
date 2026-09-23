/**
 * Updates of the app itself, from GitHub Releases. Everything here is pure:
 * the requests, the download and the installer are in src/updates/.
 *
 * Each APK built by GitHub Actions comes with an `update.json` manifest,
 * written by scripts/update-manifest.js. A build knows its channel (set at
 * build time, see src/updates/channel.ts) and reads the manifest of that
 * channel at a stable address:
 * - "preview", the rolling pre-release rebuilt on each push to main;
 * - "stable", the newest versioned release (GitHub sends `latest` there).
 * An update is a manifest with a higher versionCode than the installed one:
 * the build number, which only grows across both channels.
 */

export const REPOSITORY = 'lxwiq/plantule';

export type UpdateChannel = 'preview' | 'stable';

export type UpdateManifest = {
  channel: UpdateChannel;
  /** Android versionCode of the APK: the GitHub Actions run number. */
  versionCode: number;
  /** app.json version, e.g. "1.2.0". */
  versionName: string;
  /** Commit the APK was built from. */
  sha: string;
  /** When the APK was built (ISO). */
  date: string;
  apkUrl: string;
  /** Size of the APK in bytes, to check the download (null when unknown). */
  apkSize: number | null;
  /** MD5 of the APK, to check the download (null when unknown). */
  apkMd5: string | null;
  /** What changed, one line each (commit subjects). */
  notes: string[];
};

/** Hours between two automatic checks that worked. */
export const CHECK_INTERVAL_HOURS = 4;
/** Minutes before trying again after a check that failed (offline, release being published). */
export const RETRY_AFTER_MINUTES = 15;
/** Notes shown at most, the newest first. */
export const MAX_NOTES = 15;

const HOUR = 3_600_000;
const MINUTE = 60_000;

const RELEASES_URL = `https://github.com/${REPOSITORY}/releases`;

export function parseChannel(value: unknown): UpdateChannel | null {
  return value === 'preview' || value === 'stable' ? value : null;
}

/** Where a channel's manifest lives: plain downloads, without GitHub's rate-limited API. */
export function manifestUrl(channel: UpdateChannel): string {
  return channel === 'preview'
    ? `${RELEASES_URL}/download/preview/update.json`
    : `${RELEASES_URL}/latest/download/update.json`;
}

export function channelLabel(channel: UpdateChannel): string {
  return channel === 'preview' ? 'Test' : 'Stable';
}

/** "1.2.0 (build 57)". */
export function describeVersion(versionName: string | null, versionCode: number | null): string {
  const name = versionName || '?';
  return versionCode === null ? name : `${name} (build ${versionCode})`;
}

/** The build number Android reports ("57"), or null when unknown. */
export function parseVersionCode(value: unknown): number | null {
  const number = typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : value;
  return typeof number === 'number' && Number.isSafeInteger(number) && number > 0 ? number : null;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

/** Only APKs from this repository's releases, over HTTPS. */
function isReleaseAsset(url: string): boolean {
  return url.startsWith(`${RELEASES_URL}/download/`) && url.endsWith('.apk') && !/\s|\.\./.test(url);
}

function parseNotes(value: unknown): string[] {
  const lines = Array.isArray(value) ? value : typeof value === 'string' ? value.split('\n') : [];
  return lines
    .map((line) => (typeof line === 'string' ? line.replace(/^\s*[-*•]\s*/, '').trim() : ''))
    .filter((line) => line.length > 0)
    .map((line) => line.slice(0, 200))
    .slice(0, MAX_NOTES);
}

/**
 * The manifest of `channel`, or null when it is not one: another channel,
 * a missing build number or an APK outside this repository's releases.
 */
export function parseManifest(json: unknown, channel: UpdateChannel): UpdateManifest | null {
  if (!isObject(json) || json.channel !== channel) return null;
  const versionCode = parseVersionCode(json.versionCode);
  const versionName = text(json.versionName, 40);
  const apkUrl = text(json.apkUrl, 500);
  if (versionCode === null || !versionName || !apkUrl || !isReleaseAsset(apkUrl)) return null;
  const size = json.apkSize;
  const md5 = typeof json.apkMd5 === 'string' ? json.apkMd5.trim().toLowerCase() : '';
  const date = text(json.date, 40);
  return {
    channel,
    versionCode,
    versionName,
    sha: text(json.sha, 64) ?? '',
    date: date && !Number.isNaN(Date.parse(date)) ? date : '',
    apkUrl,
    apkSize: typeof size === 'number' && Number.isSafeInteger(size) && size > 0 ? size : null,
    apkMd5: /^[0-9a-f]{32}$/.test(md5) ? md5 : null,
    notes: parseNotes(json.notes),
  };
}

/** An update is a newer build. Without the installed build number, nothing is. */
export function isNewer(manifest: Pick<UpdateManifest, 'versionCode'>, installedVersionCode: number | null): boolean {
  return installedVersionCode !== null && manifest.versionCode > installedVersionCode;
}

export type CheckTimes = {
  /** Last check that got an answer (ISO). */
  lastCheckedAt: string | null;
  /** Last check, answered or not (ISO). */
  lastAttemptAt: string | null;
};

const age = (iso: string | null, now: number) => {
  const time = iso ? Date.parse(iso) : Number.NaN;
  // A date in the future (clock changed) counts as old.
  return Number.isNaN(time) || time > now ? Number.POSITIVE_INFINITY : now - time;
};

/** Automatic checks: every few hours, and not again right after a failure. */
export function shouldCheck({ lastCheckedAt, lastAttemptAt }: CheckTimes, now: number): boolean {
  return age(lastCheckedAt, now) >= CHECK_INTERVAL_HOURS * HOUR && age(lastAttemptAt, now) >= RETRY_AFTER_MINUTES * MINUTE;
}

/** The Today banner stays hidden for the version it was closed on, and comes back with the next one. */
export function bannerVisible(available: Pick<UpdateManifest, 'versionCode'> | null, dismissedVersionCode: number | null) {
  return available !== null && (dismissedVersionCode === null || available.versionCode > dismissedVersionCode);
}

/** Name of the downloaded APK in the app cache. */
export function apkFileName(versionCode: number): string {
  return `plantule-${versionCode}.apk`;
}

/** Build number of a downloaded APK (or of its partial download), null for other files. */
export function apkVersionCode(fileName: string): number | null {
  const match = /^plantule-(\d+)\.apk(\.part)?$/.exec(fileName);
  return match ? parseVersionCode(match[1]) : null;
}

/** Files of the update folder to delete: everything but the complete APK of `keepVersionCode`. */
export function staleUpdateFiles(fileNames: readonly string[], keepVersionCode: number | null): string[] {
  const keep = keepVersionCode === null ? null : apkFileName(keepVersionCode);
  return fileNames.filter((name) => name !== keep);
}

/** A downloaded APK is complete when its size and MD5 match the manifest (when it gives them). */
export function downloadMatches(
  manifest: Pick<UpdateManifest, 'apkSize' | 'apkMd5'>,
  file: { size: number | null; md5: string | null },
): boolean {
  if (!file.size) return false;
  if (manifest.apkSize !== null && file.size !== manifest.apkSize) return false;
  if (manifest.apkMd5 !== null && file.md5?.toLowerCase() !== manifest.apkMd5) return false;
  return true;
}
