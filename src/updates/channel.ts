/**
 * What this build is: its version, and the update channel it follows.
 *
 * The channel is set by GitHub Actions when it builds an APK
 * (EXPO_PUBLIC_UPDATE_CHANNEL, inlined in the JS bundle by the Gradle build,
 * see .github/workflows/android.yml): "preview" for the builds of main,
 * "stable" for the versioned releases. Development builds, the Google Play
 * bundle, iOS and the web have none, and never look for updates. To see the
 * updater in an Android development build, start Expo with
 * EXPO_PUBLIC_UPDATE_CHANNEL=preview (the install itself fails there: the APK
 * is signed with another key).
 */

import * as Application from 'expo-application';
import Constants from 'expo-constants';

import { parseChannel, parseVersionCode, type UpdateChannel } from '@/lib/app-update';

export const updateChannel: UpdateChannel | null =
  process.env.EXPO_OS === 'android' ? parseChannel(process.env.EXPO_PUBLIC_UPDATE_CHANNEL) : null;

export const installedVersion = {
  /** app.json version, e.g. "1.2.0" (from the app config on the web). */
  name: Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? null,
  /** Android versionCode: the GitHub Actions run number of the build. */
  code: parseVersionCode(Application.nativeBuildVersion),
};
