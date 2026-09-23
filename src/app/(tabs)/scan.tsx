import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { useModelStatus } from '@/ai';
import { ModelCard } from '@/components/ai-model-card';
import { Scene } from '@/components/scene';
import { Button, icons, Screen, ScreenTitle, Text } from '@/components/ui';
import { pickPhoto, type PhotoSource } from '@/lib/pick-photo';
import { radius, spacing, useTheme } from '@/theme';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Une erreur est survenue.';
}

/** Recognize a plant from a photo, when the model is on the phone. Adding by hand always works. */
export default function Scan() {
  const status = useModelStatus();
  const ready = status.state === 'ready';

  return (
    <Screen topInset>
      <ScreenTitle title="Scan" subtitle="Reconnaître une plante en photo" />
      {ready ? <PhotoChoice /> : <ModelNeeded unsupported={status.state === 'unsupported'} />}
      <Button
        title="Ajouter à la main"
        icon={icons.edit}
        variant={ready ? 'text' : 'tonal'}
        style={{ alignSelf: ready ? 'center' : 'stretch' }}
        onPress={() => router.push('/plant/new')}
      />
    </Screen>
  );
}

function PhotoChoice() {
  const theme = useTheme();
  const [picking, setPicking] = useState<PhotoSource | null>(null);

  const pick = (source: PhotoSource) => {
    setPicking(source);
    pickPhoto(source)
      .then((uri) => {
        if (uri) router.push({ pathname: '/scan/identify', params: { photoUri: uri } });
      })
      .catch((e) => Alert.alert('Photo', errorText(e)))
      .finally(() => setPicking(null));
  };

  return (
    <>
      <View
        style={{
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.xl,
          borderRadius: radius.xl,
          borderCurve: 'continuous',
          backgroundColor: theme.primaryContainer,
        }}>
        <Scene id="searching" width={200} backdrop={false} />
        <Text variant="title" color={theme.onPrimaryContainer} style={{ textAlign: 'center' }}>
          Quelle est cette plante ?
        </Text>
        <Text variant="body" color={theme.onPrimaryContainer} style={{ textAlign: 'center', maxWidth: 420 }}>
          Photographie-la en entier, ou une feuille de près, à la lumière du jour. Tu confirmeras l’espèce
          avant de l’ajouter.
        </Text>
      </View>

      <View style={{ gap: spacing.md }}>
        {process.env.EXPO_OS !== 'web' && (
          <Button
            title="Prendre une photo"
            icon={icons.camera}
            loading={picking === 'camera'}
            disabled={picking !== null}
            onPress={() => pick('camera')}
          />
        )}
        <Button
          title="Choisir dans la galerie"
          icon={icons.gallery}
          variant="tonal"
          loading={picking === 'library'}
          disabled={picking !== null}
          onPress={() => pick('library')}
        />
      </View>

      <Text variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
        L’analyse se fait sur ton téléphone : la photo n’est envoyée nulle part.
      </Text>
    </>
  );
}

function ModelNeeded({ unsupported }: { unsupported: boolean }) {
  return (
    <>
      <Scene id="searching" style={{ alignSelf: 'center' }} />
      {!unsupported && (
        <Text variant="body" tone="secondary">
          Le scan reconnaît tes plantes grâce à un modèle d’IA qui tourne sur ton téléphone, sans connexion
          ni compte. Il faut d’abord le télécharger, une seule fois.
        </Text>
      )}
      <ModelCard />
      <Text variant="body" tone="secondary">
        {unsupported
          ? 'Tu peux toujours ajouter tes plantes à la main.'
          : 'Le scan est facultatif : tu peux aussi ajouter tes plantes à la main.'}
      </Text>
    </>
  );
}
