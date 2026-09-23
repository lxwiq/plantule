import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useModelStatus } from '@/ai';
import { generateCareSheet, isAbortError, modelIsWarm } from '@/ai/plant-ai';
import { AiProgress } from '@/components/ai-progress';
import {
  CareSheetSections,
  SHEET_DISCLAIMER,
  SHEET_INCOMPLETE,
  SpeciesNames,
} from '@/components/care-sheet-view';
import { PlantThumb } from '@/components/plant-thumb';
import { Scene } from '@/components/scene';
import { Banner, Button, EmptyState, icons, Screen } from '@/components/ui';
import { usePlant, useSpeciesSheet } from '@/db/hooks';
import { findSpeciesSheet, saveSpeciesSheet, setPlantSpeciesSheet } from '@/db/repo';
import { isSheetComplete } from '@/lib/care-sheet';
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
  /** Scan: what the photo shows besides the species (`serializeFindings`), passed on to the new plant. */
  findings?: string;
  /** "1": write the sheet again even when the phone has one, and replace it. */
  refresh?: string;
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
  const { species, commonName, photoUri, plantId, findings, refresh } = useLocalSearchParams<Params>();
  if (!species) {
    return (
      <Screen>
        <EmptyState
          art={<Scene id="searching" />}
          title="Espèce inconnue"
          message="Choisis d’abord une espèce."
          action={{ label: 'Retour', onPress: closeScreen }}
        />
      </Screen>
    );
  }
  return (
    <SheetFlow
      species={species}
      commonName={commonName || null}
      photoUri={photoUri}
      plantId={plantId}
      findings={findings}
      refresh={refresh === '1'}
    />
  );
}

type SheetFlowProps = {
  species: string;
  commonName: string | null;
  photoUri?: string;
  plantId?: string;
  findings?: string;
  refresh: boolean;
};

function SheetFlow({ species, commonName, photoUri, plantId, findings, refresh }: SheetFlowProps) {
  const theme = useTheme();
  const status = useModelStatus();
  const plant = usePlant(plantId ?? '');
  // The sheet already on the phone: shown as is, or kept while a new one is written.
  const [stored] = useState(() => findSpeciesSheet(species));
  const storedId = stored?.id ?? null;
  // Null while the model writes one (saved over the stored one).
  const [sheetId, setSheetId] = useState(refresh ? null : storedId);
  // Written again under the stored names: what was typed may only be a common name.
  const scientificName = stored?.scientific_name ?? species;
  const name = stored?.common_name ?? commonName;
  const sheet = useSpeciesSheet(sheetId);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const [warm] = useState(modelIsWarm);

  useEffect(() => {
    if (sheetId) return;
    // Cancelled when leaving the screen.
    const controller = new AbortController();
    generateCareSheet({ scientificName, commonName: name }, { signal: controller.signal })
      .then((generated) => saveSpeciesSheet(generated, generated.reference_id ? 'reference' : 'ai').id)
      .then(setSheetId, (e) => {
        // Cancelled on purpose: nothing to say.
        if (controller.signal.aborted) return;
        setError(isAbortError(e) ? 'La rédaction a été interrompue.' : errorText(e));
      });
    return () => controller.abort();
  }, [sheetId, scientificName, name, run]);

  const retry = () => {
    setError(null);
    setRun((n) => n + 1);
  };

  // An older sheet without substrate, pot, problems…: the model writes it again.
  const complete = () => {
    setError(null);
    setSheetId(null);
  };

  // Back to the stored sheet when the new one is cancelled or fails. Scan only: from a
  // plant's screen, leaving is enough (the plant keeps its sheet).
  const keepStored =
    storedId && !plantId
      ? () => {
          setError(null);
          setSheetId(storedId);
        }
      : null;

  const createPlant = (sheetIdToUse: string | null) =>
    router.push({
      pathname: '/plant/new',
      params: sheetIdToUse
        ? { sheetId: sheetIdToUse, photoUri, findings }
        : { species, nickname: commonName ?? undefined, photoUri, findings },
    });

  const linkToPlant = (id: string) => {
    if (plantId) setPlantSpeciesSheet(plantId, id);
    closeScreen();
  };

  // The scan's photo, or the drawing of the species from a plant's screen.
  const photo = photoUri ? (
    <Image
      source={{ uri: photoUri }}
      contentFit="cover"
      accessibilityLabel="Photo de la plante"
      style={{ width: 72, height: 72, borderRadius: radius.lg, backgroundColor: theme.surfaceContainerHigh }}
    />
  ) : (
    <PlantThumb species={scientificName} size={72} />
  );

  if (!sheet) {
    return (
      <Screen>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          {photo}
          <View style={{ flex: 1 }}>
            <SpeciesNames sheet={{ common_name: name ?? scientificName, scientific_name: scientificName }} />
          </View>
        </View>

        {error ? (
          <>
            <Banner tone="error" title="Pas de fiche pour l’instant" action={{ label: 'Réessayer', onPress: retry }}>
              {error}
            </Banner>
            {plantId ? (
              <Button title="Retour" variant="text" onPress={closeScreen} />
            ) : keepStored ? (
              <Button title="Garder l’ancienne fiche" variant="tonal" onPress={keepStored} />
            ) : (
              <Button title="Continuer sans fiche" variant="tonal" onPress={() => createPlant(null)} />
            )}
          </>
        ) : (
          <AiProgress
            title="Rédaction de la fiche d’entretien…"
            detail="Lumière, arrosage, rempotage, problèmes fréquents : le modèle écrit les conseils sur ton téléphone."
            slowTitle={warm ? 'Encore un peu de patience…' : 'Préparation du modèle…'}
            slowDetail={
              warm
                ? 'Le modèle écrit la fiche mot à mot : ça peut prendre quelques minutes. Garde l’app ouverte.'
                : 'Le modèle se charge en mémoire avant d’écrire la fiche : ça peut prendre quelques minutes. Garde l’app ouverte.'
            }
            onCancel={keepStored ?? closeScreen}
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

      {!isSheetComplete(sheet.data) && status.state === 'ready' && (
        <Banner
          icon={icons.sparkles}
          title="Fiche à compléter"
          action={{ label: 'Compléter la fiche', onPress: complete }}>
          {SHEET_INCOMPLETE}
        </Banner>
      )}

      {plantId ? (
        <Button
          title={
            plant?.species_sheet_id === sheet.id
              ? 'Terminé'
              : plant
                ? `Ajouter à ${plant.nickname}`
                : 'Ajouter à la plante'
          }
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
