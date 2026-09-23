import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { generateCareSheet, isAbortError, modelIsWarm } from '@/ai/plant-ai';
import { AiProgress } from '@/components/ai-progress';
import { CareSheetSections, SHEET_DISCLAIMER, SpeciesNames } from '@/components/care-sheet-view';
import { Banner, Button, EmptyState, icons, Screen } from '@/components/ui';
import { usePlant, useSpeciesSheet } from '@/db/hooks';
import { findSpeciesSheet, saveSpeciesSheet, setPlantSpeciesSheet } from '@/db/repo';
import { closeScreen } from '@/lib/navigation';
import { radius, spacing, useTheme } from '@/theme';

type Params = {
  /** The confirmed scientific name, or what the user typed when there is no `commonName`. */
  species?: string;
  commonName?: string;
  /** Scan: the photo, passed on to the new plant. */
  photoUri?: string;
  /** From a plant's screen: the plant to link the sheet to, instead of creating one. */
  plantId?: string;
};

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Une erreur est survenue.';
}

/**
 * The care sheet of a confirmed species: the stored one if the phone already
 * has it, otherwise written by the model and stored. Then create the plant,
 * or link the sheet to an existing one.
 */
export default function SpeciesSheetScreen() {
  const { species, commonName, photoUri, plantId } = useLocalSearchParams<Params>();
  if (!species) {
    return (
      <Screen>
        <EmptyState
          title="Espèce inconnue"
          message="Choisis d’abord une espèce."
          action={{ label: 'Retour', onPress: closeScreen }}
        />
      </Screen>
    );
  }
  return (
    <SheetFlow species={species} commonName={commonName || null} photoUri={photoUri} plantId={plantId} />
  );
}

type SheetFlowProps = {
  species: string;
  commonName: string | null;
  photoUri?: string;
  plantId?: string;
};

function SheetFlow({ species, commonName, photoUri, plantId }: SheetFlowProps) {
  const theme = useTheme();
  const plant = usePlant(plantId ?? '');
  const [sheetId, setSheetId] = useState(() => findSpeciesSheet(species)?.id ?? null);
  const sheet = useSpeciesSheet(sheetId);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const [warm] = useState(modelIsWarm);

  useEffect(() => {
    if (sheetId) return;
    // Cancelled when leaving the screen.
    const controller = new AbortController();
    generateCareSheet({ scientificName: species, commonName }, { signal: controller.signal })
      .then((generated) => saveSpeciesSheet(generated, 'ai').id)
      .then(setSheetId, (e) => {
        // Cancelled on purpose: nothing to say.
        if (controller.signal.aborted) return;
        setError(isAbortError(e) ? 'La rédaction a été interrompue.' : errorText(e));
      });
    return () => controller.abort();
  }, [sheetId, species, commonName, run]);

  const retry = () => {
    setError(null);
    setRun((n) => n + 1);
  };

  const createPlant = (sheetIdToUse: string | null) =>
    router.push({
      pathname: '/plant/new',
      params: sheetIdToUse
        ? { sheetId: sheetIdToUse, photoUri }
        : { species, nickname: commonName ?? undefined, photoUri },
    });

  const linkToPlant = (id: string) => {
    if (plantId) setPlantSpeciesSheet(plantId, id);
    closeScreen();
  };

  const photo = photoUri ? (
    <Image
      source={{ uri: photoUri }}
      contentFit="cover"
      accessibilityLabel="Photo de la plante"
      style={{ width: 72, height: 72, borderRadius: radius.lg, backgroundColor: theme.surfaceContainerHigh }}
    />
  ) : null;

  if (!sheet) {
    return (
      <Screen>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          {photo}
          <View style={{ flex: 1 }}>
            <SpeciesNames sheet={{ common_name: commonName ?? species, scientific_name: species }} />
          </View>
        </View>

        {error ? (
          <>
            <Banner tone="error" title="Pas de fiche pour l’instant" action={{ label: 'Réessayer', onPress: retry }}>
              {error}
            </Banner>
            {plantId ? (
              <Button title="Retour" variant="text" onPress={closeScreen} />
            ) : (
              <Button title="Continuer sans fiche" variant="tonal" onPress={() => createPlant(null)} />
            )}
          </>
        ) : (
          <AiProgress
            title="Rédaction de la fiche d’entretien…"
            detail="Lumière, arrosage, toxicité : le modèle écrit les conseils sur ton téléphone."
            slowTitle={warm ? 'Encore un peu de patience…' : 'Préparation du modèle…'}
            slowDetail={
              warm
                ? 'Le modèle écrit la fiche mot à mot : ça peut prendre une à deux minutes. Garde l’app ouverte.'
                : 'Le modèle se charge en mémoire avant d’écrire la fiche : ça peut prendre plus d’une minute. Garde l’app ouverte.'
            }
            onCancel={closeScreen}
          />
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        {photo}
        <View style={{ flex: 1 }}>
          <SpeciesNames sheet={sheet} />
        </View>
      </View>

      <Banner icon={icons.sparkles}>{SHEET_DISCLAIMER}</Banner>

      {plantId ? (
        <Button
          title={plant ? `Ajouter à ${plant.nickname}` : 'Ajouter à la plante'}
          icon={icons.check}
          onPress={() => linkToPlant(sheet.id)}
        />
      ) : (
        <Button title="Créer la plante" icon={icons.add} onPress={() => createPlant(sheet.id)} />
      )}

      <CareSheetSections sheet={sheet.data} />
    </Screen>
  );
}
