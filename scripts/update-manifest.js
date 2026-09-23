// Prints update.json, the manifest the app reads to find its updates
// (src/lib/app-update.ts), for an APK built by .github/workflows/android.yml.
//
//   CHANNEL=preview|stable APK=<file> APK_URL=<download url> node scripts/update-manifest.js > update.json
//
// The notes are the subjects of the commits since the previous build of the
// channel (the `preview` tag, or the previous v* tag), without the commits
// that only change Markdown. They need the full history (fetch-depth: 0);
// without it, they fall back to the last commits.
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const MAX_NOTES = 15;

function git(...args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

/** The commit of the previous build of this channel, if it is an ancestor of HEAD. */
function previousBuild(channel) {
  const ref =
    channel === 'preview'
      ? git('rev-parse', '--verify', '--quiet', 'refs/tags/preview^{commit}')
      : git('describe', '--tags', '--abbrev=0', '--match', 'v*', 'HEAD^');
  if (!ref) return null;
  return git('merge-base', '--is-ancestor', ref, 'HEAD') === null ? null : ref;
}

function notes(channel) {
  const since = previousBuild(channel);
  const range = since ? [`${since}..HEAD`] : ['-n', '10'];
  const log = git('log', '--no-merges', '--format=%s', ...range, '--', '.', ':(exclude)*.md');
  return (log ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_NOTES);
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`update-manifest: missing ${name}`);
  return value;
}

function main() {
  const channel = required('CHANNEL');
  if (channel !== 'preview' && channel !== 'stable') throw new Error(`update-manifest: unknown channel ${channel}`);
  const apk = fs.readFileSync(required('APK'));
  const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app.json'), 'utf8'));
  const versionCode = appJson.expo.android?.versionCode;
  if (!Number.isSafeInteger(versionCode) || versionCode <= 0) {
    throw new Error('update-manifest: app.json has no android.versionCode');
  }

  const manifest = {
    channel,
    versionCode,
    versionName: appJson.expo.version,
    sha: process.env.GITHUB_SHA || git('rev-parse', 'HEAD') || '',
    date: new Date().toISOString(),
    apkUrl: required('APK_URL'),
    apkSize: apk.length,
    apkMd5: crypto.createHash('md5').update(apk).digest('hex'),
    notes: notes(channel),
  };
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

main();
