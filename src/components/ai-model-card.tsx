import * as Network from 'expo-network';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { ai, useModelStatus, type ModelStatus } from '@/ai';
import { formatBytes } from '@/ai/model-format';
import { Banner, Button, Icon, icons, Text } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';

/** On Wi-Fi, or when the network cannot be read: download without asking. */
async function onUnmeteredNetwork() {
  try {
    const state = await Network.getNetworkStateAsync();
    return (
      state.type === Network.NetworkStateType.WIFI ||
      state.type === Network.NetworkStateType.ETHERNET ||
      state.isConnected === false // The engine reports the missing connection itself.
    );
  } catch {
    return true;
  }
}

function sizeText(bytes: number) {
  return bytes > 0 ? formatBytes(bytes) : null;
}

function describe(status: ModelStatus, size: string | null): string {
  switch (status.state) {
    case 'not_downloaded':
      return size ? `${size} à télécharger une fois, en Wi-Fi de préférence.` : 'À télécharger une fois.';
    case 'downloading':
      return 'Téléchargement en cours. S’il est interrompu, il reprendra où il s’est arrêté.';
    case 'ready':
      return size ? `Prêt · ${size} sur le téléphone` : 'Prêt';
    case 'error':
      return 'Le téléchargement n’a pas abouti.';
    case 'unsupported':
      return status.reason;
  }
}

function ProgressBar({ progress }: { progress: number }) {
  const theme = useTheme();
  const percent = Math.round(progress * 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Téléchargement du modèle"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={{
        height: 6,
        borderRadius: radius.full,
        backgroundColor: theme.surfaceContainerHighest,
        overflow: 'hidden',
      }}>
      <View
        style={{
          width: `${Math.max(progress * 100, 1)}%`,
          height: '100%',
          borderRadius: radius.full,
          backgroundColor: theme.primary,
        }}
      />
    </View>
  );
}

/**
 * The model's state with what can be done about it: download (with progress),
 * cancel, retry, delete. Used in the settings and on the scan screen.
 */
export function ModelCard() {
  const theme = useTheme();
  const status = useModelStatus();
  const [starting, setStarting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (status.state === 'unsupported') {
    return (
      <Banner icon={icons.info} title="Scan indisponible">
        {status.reason}
      </Banner>
    );
  }

  const bytes = status.state === 'error' ? ai.info.sizeBytes : status.sizeBytes || ai.info.sizeBytes;
  const size = sizeText(bytes);

  const startDownload = (allowCellular: boolean) => {
    // Failures show up in the status, with a retry button.
    ai.download({ allowCellular }).catch(() => undefined);
  };

  const download = async () => {
    setStarting(true);
    const unmetered = await onUnmeteredNetwork();
    setStarting(false);
    if (unmetered) {
      startDownload(false);
      return;
    }
    Alert.alert(
      'Tu n’es pas en Wi-Fi',
      `Le modèle pèse ${size ?? 'plusieurs Go'}. Le télécharger avec tes données mobiles peut entamer ton forfait.`,
      [
        { text: 'Attendre le Wi-Fi', style: 'cancel' },
        { text: 'Télécharger quand même', onPress: () => startDownload(true) },
      ],
    );
  };

  const cancelDownload = () => {
    if (status.state !== 'downloading' || status.progress < 0.05) {
      ai.cancelDownload();
      return;
    }
    Alert.alert('Arrêter le téléchargement ?', 'Ce qui est déjà téléchargé sera effacé.', [
      { text: 'Continuer', style: 'cancel' },
      { text: 'Arrêter', style: 'destructive', onPress: () => ai.cancelDownload() },
    ]);
  };

  const remove = () => {
    setDeleting(true);
    ai.deleteModel()
      .catch((error: unknown) =>
        Alert.alert('Suppression impossible', error instanceof Error ? error.message : String(error)),
      )
      .finally(() => setDeleting(false));
  };

  const confirmDelete = () =>
    Alert.alert(
      'Supprimer le modèle ?',
      `Tu libères ${size ?? 'de la place'}. Il faudra le retélécharger pour scanner une plante.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: remove },
      ],
    );

  return (
    <View
      style={{
        gap: spacing.lg,
        padding: spacing.lg,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        backgroundColor: theme.surfaceContainerLow,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: status.state === 'error' ? theme.errorContainer : theme.primaryContainer,
          }}>
          <Icon
            name={status.state === 'error' ? icons.error : icons.sparkles}
            size={22}
            color={status.state === 'error' ? theme.onErrorContainer : theme.onPrimaryContainer}
          />
        </View>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="bodyStrong">{ai.info.name}</Text>
          <Text variant="subhead" tone="secondary">
            {describe(status, size)}
          </Text>
        </View>
      </View>

      {status.state === 'downloading' && (
        <View style={{ gap: spacing.sm }}>
          <ProgressBar progress={status.progress} />
          <Text variant="caption" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
            {`${Math.floor(status.progress * 100)} %`}
            {size ? ` · ${formatBytes(status.progress * bytes)} sur ${size}` : ''}
          </Text>
        </View>
      )}

      {status.state === 'error' && (
        <Text variant="subhead" tone="error" selectable>
          {status.message}
        </Text>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {status.state === 'not_downloaded' && (
          <Button title="Télécharger" icon={icons.download} loading={starting} onPress={() => void download()} />
        )}
        {status.state === 'downloading' && (
          <Button title="Annuler" variant="outlined" icon={icons.close} onPress={cancelDownload} />
        )}
        {status.state === 'error' && (
          <>
            <Button title="Réessayer" icon={icons.retry} loading={starting} onPress={() => void download()} />
            <Button
              title="Abandonner"
              variant="text"
              loading={deleting}
              accessibilityHint="Efface la partie déjà téléchargée"
              onPress={remove}
            />
          </>
        )}
        {status.state === 'ready' && (
          <Button
            title="Supprimer le modèle"
            variant="danger"
            size="sm"
            icon={icons.delete}
            loading={deleting}
            onPress={confirmDelete}
          />
        )}
      </View>
    </View>
  );
}
