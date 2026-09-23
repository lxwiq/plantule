// Signs Android release builds with the upload key when its Gradle properties are
// set (~/.gradle/gradle.properties locally, ORG_GRADLE_PROJECT_* env vars in CI).
// Without them, release builds keep the template's debug signing.
const { withAppBuildGradle } = require('expo/config-plugins');

const STORE_FILE_PROPERTY = 'PLANTULE_UPLOAD_STORE_FILE';

const releaseSigningConfig = `
        release {
            if (findProperty('${STORE_FILE_PROPERTY}')) {
                storeFile file(findProperty('${STORE_FILE_PROPERTY}'))
                storePassword findProperty('PLANTULE_UPLOAD_STORE_PASSWORD')
                keyAlias findProperty('PLANTULE_UPLOAD_KEY_ALIAS')
                keyPassword findProperty('PLANTULE_UPLOAD_KEY_PASSWORD')
            }
        }`;

function addReleaseSigning(buildGradle) {
  if (buildGradle.includes(STORE_FILE_PROPERTY)) {
    return buildGradle;
  }

  const debugSigningConfig = /(signingConfigs \{\s*debug \{[^}]*\})/;
  const releaseBuildTypeSigning = /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/;
  if (!debugSigningConfig.test(buildGradle) || !releaseBuildTypeSigning.test(buildGradle)) {
    throw new Error('with-android-release-signing: unexpected android/app/build.gradle layout');
  }

  return buildGradle
    .replace(debugSigningConfig, `$1${releaseSigningConfig}`)
    .replace(
      releaseBuildTypeSigning,
      `$1signingConfig findProperty('${STORE_FILE_PROPERTY}') ? signingConfigs.release : signingConfigs.debug`
    );
}

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    config.modResults.contents = addReleaseSigning(config.modResults.contents);
    return config;
  });
};
