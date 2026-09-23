import { ActivityIndicator, Alert, View } from 'react-native';

import { formatBytes } from '@/ai/model-format';
import { Banner, Button, Icon, icons, ListRow, ListSection, ProgressBar, Text } from '@/components/ui';
import { channelLabel, describeVersion, type UpdateManifest } from '@/lib/app-update';
import { formatRelativeDay, formatRelativeTime, toDateString } from '@/lib/dates';
import { onUnmeteredNetwork } from '@/lib/network';
import { installedVersion, updateChannel } from '@/updates/channel';
import { openInstallPermissionSettings } from '@/updates/install';
import {
  cancelUpdate,
  checkForUpdate,
  dismissUpdateBanner,
  installAgain,
  startUpdate,
  useAppUpdate,
  type UpdateDownload,
} from '@/updates/store';
import { radius, spacing, useTheme } from '@/theme';

const INSTALL_HELP =
  'Android te demande de confirmer l’installation. La première fois, il faut aussi autoriser Plantule à installer des applis : touche « Paramètres », active « Autoriser cette source », puis reviens en arrière pour terminer. Tes plantes restent sur le téléphone.';

const READY_TEXT =
  'L’installation n’est pas terminée. Si Android l’a bloquée, autorise Plantule à installer des applis, puis touche « Installer ».';

/** Downloads right away on Wi-Fi; on mobile data, asks first. */
async function confirmAndStart(update: UpdateManifest) {
  if (update.apkSize === null || (await onUnmeteredNetwork())) {
    startUpdate();
    return;
  }
  Alert.alert(
    'Tu n’es pas en Wi-Fi',
    `La mise à jour pèse ${formatBytes(update.apkSize)}. La télécharger avec tes données mobiles entame ton forfait.`,
    [
      { text: 'Attendre le Wi-Fi', style: 'cancel' },
      { text: 'Télécharger quand même', onPress: startUpdate },
    ],
  );
}

function openPermissionSettings() {
  openInstallPermissionSettings().catch(() =>
    Alert.alert(
      'Réglage introuvable',
      'Ouvre les réglages du téléphone, puis Applis › Plantule › Installer des applis inconnues.',
    ),
  );
}

function progressText(progress: number, size: number | null) {
  const percent = `${Math.floor(progress * 100)} %`;
  return size ? `${percent} · ${formatBytes(progress * size)} sur ${formatBytes(size)}` : percent;
}

function releaseDetails(update: UpdateManifest) {
  const parts = [`Build ${update.versionCode}`];
  if (update.date) parts.push(`publiée ${formatRelativeDay(toDateString(new Date(update.date)))}`);
  if (update.apkSize) parts.push(formatBytes(update.apkSize));
  return parts.join(' · ');
}

/** On the Today screen: a new version exists. Closed, it comes back with the next one. */
export function UpdateBanner() {
  const { available, bannerVisible, download } = useAppUpdate();
  if (!available || !bannerVisible) return null;

  const content = bannerContent(download, available);
  return (
    <Banner
      tone={download.state === 'error' ? 'error' : 'success'}
      icon={icons.download}
      title="Nouvelle version de Plantule"
      action={content.action}
      onDismiss={download.state === 'downloading' || download.state === 'installing' ? undefined : dismissUpdateBanner}>
      {content.body}
    </Banner>
  );
}

function bannerContent(download: UpdateDownload, update: UpdateManifest) {
  switch (download.state) {
    case 'idle':
      return {
        body: `La version ${update.versionName} est prête à installer.`,
        action: { label: 'Mettre à jour', onPress: () => void confirmAndStart(update) },
      };
    case 'downloading':
      return {
        body: <DownloadProgress progress={download.progress} size={update.apkSize} onContainer />,
        action: { label: 'Annuler', onPress: cancelUpdate },
      };
    case 'installing':
      return { body: 'Confirme l’installation dans la fenêtre d’Android.', action: undefined };
    case 'ready':
      return { body: READY_TEXT, action: { label: 'Installer', onPress: installAgain } };
    case 'error':
      return {
        body: download.message,
        action: { label: 'Réessayer', onPress: () => void confirmAndStart(update) },
      };
  }
}

function DownloadProgress({
  progress,
  size,
  onContainer = false,
}: {
  progress: number;
  size: number | null;
  onContainer?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: spacing.sm, paddingTop: spacing.xs }}>
      <ProgressBar
        progress={progress}
        label="Téléchargement de la mise à jour"
        trackColor={onContainer ? theme.background : undefined}
      />
      <Text
        variant="caption"
        color={onContainer ? theme.onPrimaryContainer : theme.textSecondary}
        style={{ fontVariant: ['tabular-nums'] }}>
        {progressText(progress, size)}
      </Text>
    </View>
  );
}

/** The available version: what changed, and the way to install it. */
function UpdateCard({ update, download }: { update: UpdateManifest; download: UpdateDownload }) {
  const theme = useTheme();
  const failed = download.state === 'error';

  return (
    <View style={{ gap: spacing.lg, padding: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: failed ? theme.errorContainer : theme.primaryContainer,
          }}>
          <Icon
            name={failed ? icons.error : icons.download}
            size={22}
            color={failed ? theme.onErrorContainer : theme.onPrimaryContainer}
          />
        </View>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="bodyStrong">{`Nouvelle version ${update.versionName}`}</Text>
          <Text variant="subhead" tone="secondary">
            {releaseDetails(update)}
          </Text>
        </View>
      </View>

      {update.notes.length > 0 && (
        <View style={{ gap: spacing.xs }}>
          <Text variant="label" tone="secondary">
            Nouveautés
          </Text>
          {update.notes.map((note, index) => (
            <Text key={index} variant="subhead" selectable>
              {`• ${note}`}
            </Text>
          ))}
        </View>
      )}

      {download.state === 'downloading' && <DownloadProgress progress={download.progress} size={update.apkSize} />}
      {download.state === 'installing' && (
        <Text variant="subhead" tone="secondary">
          Confirme l’installation dans la fenêtre d’Android.
        </Text>
      )}
      {download.state === 'ready' && (
        <Text variant="subhead" tone="secondary">
          {READY_TEXT}
        </Text>
      )}
      {failed && (
        <Text variant="subhead" tone="error" selectable>
          {download.message}
        </Text>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {(download.state === 'idle' || failed) && (
          <Button
            title={failed ? 'Réessayer' : 'Mettre à jour'}
            icon={failed ? icons.retry : icons.download}
            onPress={() => void confirmAndStart(update)}
          />
        )}
        {download.state === 'downloading' && (
          <Button title="Annuler" variant="outlined" icon={icons.close} onPress={cancelUpdate} />
        )}
        {download.state === 'installing' && <Button title="Installation…" loading />}
        {download.state === 'ready' && (
          <>
            <Button title="Installer" icon={icons.download} onPress={installAgain} />
            <Button title="Autoriser Plantule" variant="text" onPress={openPermissionSettings} />
          </>
        )}
      </View>
    </View>
  );
}

function checkSubtitle(state: ReturnType<typeof useAppUpdate>): string | null {
  if (state.checking) return 'Recherche en cours…';
  if (state.manualCheck === 'failed') return 'GitHub ne répond pas. Vérifie ta connexion et réessaie.';
  if (state.manualCheck === 'up_to_date') return 'Plantule est à jour.';
  return state.lastCheckedAt ? `Dernière recherche ${formatRelativeTime(state.lastCheckedAt)}` : null;
}

/** In the settings: the installed version, a manual check and the available update. */
export function UpdateSection() {
  const theme = useTheme();
  const state = useAppUpdate();
  const version = describeVersion(installedVersion.name, installedVersion.code);

  if (!updateChannel) {
    return (
      <ListSection
        title="Mises à jour"
        footer="Cette version de Plantule ne se met pas à jour toute seule : seules celles installées depuis GitHub le font.">
        <ListRow leading={icons.info} title={`Plantule ${version}`} />
      </ListSection>
    );
  }

  return (
    <ListSection title="Mises à jour" footer={INSTALL_HELP}>
      {state.available && <UpdateCard update={state.available} download={state.download} />}
      <ListRow
        leading={icons.info}
        title={`Plantule ${installedVersion.name ?? ''}`.trim()}
        subtitle={[
          installedVersion.code !== null ? `Build ${installedVersion.code}` : null,
          `canal ${channelLabel(updateChannel)}`,
        ]
          .filter(Boolean)
          .join(' · ')}
      />
      <ListRow
        leading={icons.retry}
        title="Rechercher une mise à jour"
        subtitle={checkSubtitle(state)}
        trailing={state.checking ? <ActivityIndicator color={theme.primary} /> : undefined}
        onPress={state.checking ? undefined : () => void checkForUpdate({ manual: true })}
      />
    </ListSection>
  );
}
