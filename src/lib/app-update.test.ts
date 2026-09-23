import { describe, expect, it } from '@jest/globals';

import {
  apkFileName,
  apkVersionCode,
  bannerVisible,
  channelLabel,
  describeVersion,
  downloadMatches,
  isNewer,
  manifestUrl,
  MAX_NOTES,
  parseChannel,
  parseManifest,
  parseVersionCode,
  shouldCheck,
  staleUpdateFiles,
} from './app-update';

const PREVIEW_APK = 'https://github.com/lxwiq/plantule/releases/download/preview/plantule-preview.apk';

const manifest = {
  channel: 'preview',
  versionCode: 57,
  versionName: '1.0.0',
  sha: 'f8604ce0f8604ce0f8604ce0f8604ce0f8604ce0',
  date: '2026-09-23T10:00:00Z',
  apkUrl: PREVIEW_APK,
  apkSize: 83_456_789,
  apkMd5: '0123456789ABCDEF0123456789abcdef',
  notes: ['Add cuttings and a wishlist', 'Skip watering outdoor plants after rain'],
};

describe('channels', () => {
  it('knows only the two channels', () => {
    expect(parseChannel('preview')).toBe('preview');
    expect(parseChannel('stable')).toBe('stable');
    expect(parseChannel('')).toBeNull();
    expect(parseChannel(undefined)).toBeNull();
    expect(parseChannel('Preview')).toBeNull();
  });

  it('reads each channel from a download address, not the API', () => {
    expect(manifestUrl('preview')).toBe('https://github.com/lxwiq/plantule/releases/download/preview/update.json');
    expect(manifestUrl('stable')).toBe('https://github.com/lxwiq/plantule/releases/latest/download/update.json');
  });

  it('names the channels in French', () => {
    expect(channelLabel('preview')).toBe('Test');
    expect(channelLabel('stable')).toBe('Stable');
  });
});

describe('versions', () => {
  it('reads the build number Android reports', () => {
    expect(parseVersionCode('57')).toBe(57);
    expect(parseVersionCode(57)).toBe(57);
    expect(parseVersionCode(' 12 ')).toBe(12);
    expect(parseVersionCode(null)).toBeNull();
    expect(parseVersionCode('')).toBeNull();
    expect(parseVersionCode('1.0')).toBeNull();
    expect(parseVersionCode(0)).toBeNull();
    expect(parseVersionCode(-3)).toBeNull();
    expect(parseVersionCode(2.5)).toBeNull();
  });

  it('describes a version with its build', () => {
    expect(describeVersion('1.2.0', 57)).toBe('1.2.0 (build 57)');
    expect(describeVersion('1.2.0', null)).toBe('1.2.0');
    expect(describeVersion(null, null)).toBe('?');
  });

  it('only calls a higher build an update', () => {
    expect(isNewer({ versionCode: 58 }, 57)).toBe(true);
    expect(isNewer({ versionCode: 57 }, 57)).toBe(false);
    expect(isNewer({ versionCode: 40 }, 57)).toBe(false);
    expect(isNewer({ versionCode: 58 }, null)).toBe(false);
  });
});

describe('parseManifest', () => {
  it('reads a manifest written by the CI', () => {
    expect(parseManifest(manifest, 'preview')).toEqual({
      ...manifest,
      apkMd5: '0123456789abcdef0123456789abcdef',
    });
  });

  it('refuses the manifest of another channel', () => {
    expect(parseManifest(manifest, 'stable')).toBeNull();
    expect(parseManifest({ ...manifest, channel: undefined }, 'preview')).toBeNull();
  });

  it('refuses a manifest without a build number or a version', () => {
    expect(parseManifest({ ...manifest, versionCode: '57' }, 'preview')?.versionCode).toBe(57);
    expect(parseManifest({ ...manifest, versionCode: 0 }, 'preview')).toBeNull();
    expect(parseManifest({ ...manifest, versionCode: 'latest' }, 'preview')).toBeNull();
    expect(parseManifest({ ...manifest, versionName: ' ' }, 'preview')).toBeNull();
  });

  it('only downloads APKs from the repository releases', () => {
    const stable = {
      ...manifest,
      channel: 'stable',
      apkUrl: 'https://github.com/lxwiq/plantule/releases/download/v1.2.0/plantule-v1.2.0.apk',
    };
    expect(parseManifest(stable, 'stable')?.apkUrl).toBe(stable.apkUrl);
    for (const apkUrl of [
      'http://github.com/lxwiq/plantule/releases/download/preview/plantule-preview.apk',
      'https://github.com/someone/plantule/releases/download/preview/plantule-preview.apk',
      'https://example.com/plantule.apk',
      'https://github.com/lxwiq/plantule/releases/download/preview/../../x/plantule.apk',
      'https://github.com/lxwiq/plantule/releases/download/preview/update.json',
    ]) {
      expect(parseManifest({ ...manifest, apkUrl }, 'preview')).toBeNull();
    }
  });

  it('drops unusable checks instead of refusing the update', () => {
    const parsed = parseManifest({ ...manifest, apkSize: -1, apkMd5: 'abc', date: 'soon', sha: 3 }, 'preview');
    expect(parsed).toMatchObject({ apkSize: null, apkMd5: null, date: '', sha: '' });
  });

  it('reads the notes as lines, from a list or a text', () => {
    expect(parseManifest({ ...manifest, notes: '- Add cuttings\n\n* Fix the calendar\n' }, 'preview')?.notes).toEqual([
      'Add cuttings',
      'Fix the calendar',
    ]);
    expect(parseManifest({ ...manifest, notes: ['One', 2, ' ', 'Two'] }, 'preview')?.notes).toEqual(['One', 'Two']);
    expect(parseManifest({ ...manifest, notes: undefined }, 'preview')?.notes).toEqual([]);
    const many = Array.from({ length: 40 }, (_, i) => `Change ${i}`);
    expect(parseManifest({ ...manifest, notes: many }, 'preview')?.notes).toHaveLength(MAX_NOTES);
  });

  it('refuses what is not a manifest', () => {
    expect(parseManifest(null, 'preview')).toBeNull();
    expect(parseManifest('update', 'preview')).toBeNull();
    expect(parseManifest([manifest], 'preview')).toBeNull();
  });
});

describe('shouldCheck', () => {
  const now = Date.parse('2026-09-23T12:00:00Z');
  const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

  it('checks at the first launch', () => {
    expect(shouldCheck({ lastCheckedAt: null, lastAttemptAt: null }, now)).toBe(true);
  });

  it('waits a few hours after a check that worked', () => {
    expect(shouldCheck({ lastCheckedAt: ago(60), lastAttemptAt: ago(60) }, now)).toBe(false);
    expect(shouldCheck({ lastCheckedAt: ago(4 * 60), lastAttemptAt: ago(4 * 60) }, now)).toBe(true);
  });

  it('tries again a little later after a failure', () => {
    expect(shouldCheck({ lastCheckedAt: ago(10 * 60), lastAttemptAt: ago(5) }, now)).toBe(false);
    expect(shouldCheck({ lastCheckedAt: null, lastAttemptAt: ago(15) }, now)).toBe(true);
  });

  it('counts a date in the future as old', () => {
    expect(shouldCheck({ lastCheckedAt: ago(-600), lastAttemptAt: ago(-600) }, now)).toBe(true);
    expect(shouldCheck({ lastCheckedAt: 'never', lastAttemptAt: null }, now)).toBe(true);
  });
});

describe('bannerVisible', () => {
  it('shows the banner for an update until it is closed', () => {
    expect(bannerVisible(null, null)).toBe(false);
    expect(bannerVisible({ versionCode: 58 }, null)).toBe(true);
    expect(bannerVisible({ versionCode: 58 }, 58)).toBe(false);
  });

  it('shows it again for the next version', () => {
    expect(bannerVisible({ versionCode: 60 }, 58)).toBe(true);
  });
});

describe('downloaded files', () => {
  it('names the APK after its build', () => {
    expect(apkFileName(58)).toBe('plantule-58.apk');
    expect(apkVersionCode('plantule-58.apk')).toBe(58);
    expect(apkVersionCode('plantule-58.apk.part')).toBe(58);
    expect(apkVersionCode('notes.txt')).toBeNull();
  });

  it('keeps only the complete APK of the update to install', () => {
    const files = ['plantule-55.apk', 'plantule-58.apk', 'plantule-58.apk.part', 'plantule-59.apk.part', 'other'];
    expect(staleUpdateFiles(files, 58)).toEqual(['plantule-55.apk', 'plantule-58.apk.part', 'plantule-59.apk.part', 'other']);
    expect(staleUpdateFiles(files, null)).toEqual(files);
  });

  it('checks a download against the manifest', () => {
    const expected = { apkSize: 100, apkMd5: 'abcdefabcdefabcdefabcdefabcdefab' };
    expect(downloadMatches(expected, { size: 100, md5: 'ABCDEFABCDEFABCDEFABCDEFABCDEFAB' })).toBe(true);
    expect(downloadMatches(expected, { size: 99, md5: 'abcdefabcdefabcdefabcdefabcdefab' })).toBe(false);
    expect(downloadMatches(expected, { size: 100, md5: '00000000000000000000000000000000' })).toBe(false);
    expect(downloadMatches(expected, { size: 100, md5: null })).toBe(false);
    expect(downloadMatches({ apkSize: null, apkMd5: null }, { size: 100, md5: null })).toBe(true);
    expect(downloadMatches({ apkSize: null, apkMd5: null }, { size: 0, md5: null })).toBe(false);
  });
});
