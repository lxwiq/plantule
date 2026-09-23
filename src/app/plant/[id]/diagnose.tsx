import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { useModelStatus } from '@/ai';
import { diagnosePlant, isAbortError, modelIsWarm } from '@/ai/plant-ai';
import { ModelCard } from '@/components/ai-model-card';
import { AiProgress } from '@/components/ai-progress';
import { DiagnosisSections } from '@/components/diagnosis-view';
import { Scene } from '@/components/scene';
import { Banner, Button, EmptyState, Icon, icons, Screen, Text } from '@/components/ui';
import { usePlant, usePlantTasks } from '@/db/hooks';
import { saveDiagnosis, updateTask } from '@/db/repo';
import type { Plant, Task } from '@/db/types';
import { suggestedWateringInterval, type Diagnosis, type WateringChange } from '@/lib/diagnosis';
import { TASK_KINDS } from '@/lib/labels';
import { closeScreen } from '@/lib/navigation';
import { pickPhoto, type PhotoSource } from '@/lib/pick-photo';
import { radius, spacing, useTheme } from '@/theme';

type Step =
  | { kind: 'pick' }
  | { kind: 'analyzing'; photoUri: string; warm: boolean }
  | { kind: 'result'; photoUri: string; diagnosis: Diagnosis }
  | { kind: 'error'; photoUri: string; message: string };

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Une erreur est survenue.';
}

/** A close-up photo → how the plant looks, likely problems, what to do → kept in its health history. */
export default function DiagnoseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plant = usePlant(id);
  if (!plant) {
    return (
      <Screen>
        <EmptyState
          art={<Scene id="searching" />}
          title="Plante introuvable"
          message="Elle a peut-être été supprimée."
          action={{ label: 'Retour', onPress: closeScreen }}
        />
      </Screen>
    );
  }
  return <Diagnose plant={plant} />;
}

function Diagnose({ plant }: { plant: Plant }) {
  const theme = useTheme();
  const [step, setStep] = useState<Step>({ kind: 'pick' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const analyzing = step.kind === 'analyzing' ? step.photoUri : null;

  useEffect(() => {
    if (!analyzing) return;
    // Cancelled when leaving the screen, or with "Annuler".
    const controller = new AbortController();
    diagnosePlant(analyzing, plant.id, { signal: controller.signal }).then(
      (diagnosis) => setStep({ kind: 'result', photoUri: analyzing, diagnosis }),
      (error) => {
        // Cancelled on purpose: nothing to say.
        if (controller.signal.aborted) return;
        const message = isAbortError(error) ? 'L’analyse a été interrompue.' : errorText(error);
        setStep({ kind: 'error', photoUri: analyzing, message });
      },
    );
    return () => controller.abort();
  }, [analyzing, plant.id]);

  const analyze = (photoUri: string) => {
    setSaved(false);
    setStep({ kind: 'analyzing', photoUri, warm: modelIsWarm() });
  };

  const save = (photoUri: string, diagnosis: Diagnosis) => {
    setSaving(true);
    saveDiagnosis(plant.id, photoUri, diagnosis)
      .then(() => setSaved(true))
      .catch((e) => Alert.alert('Enregistrement impossible', errorText(e)))
      .finally(() => setSaving(false));
  };

  if (step.kind === 'pick') {
    return <PhotoStep plant={plant} onPhoto={analyze} />;
  }

  return (
    <Screen>
      <Image
        source={{ uri: step.photoUri }}
        contentFit="cover"
        accessibilityLabel="Photo à examiner"
        style={{
          width: '100%',
          aspectRatio: 4 / 3,
          borderRadius: radius.xl,
          backgroundColor: theme.surfaceContainerHigh,
        }}
      />

      {step.kind === 'analyzing' && (
        <AiProgress
          title="Examen de la photo…"
          detail={`Le modèle compare ce qu’il voit avec ce que l’app sait de ${plant.nickname} : arrosages, pièce, saison.`}
          slowTitle={step.warm ? 'Encore un peu de patience…' : 'Préparation du modèle…'}
          slowDetail={
            step.warm
              ? 'Le modèle regarde la photo en détail. Garde l’app ouverte.'
              : 'La première analyse après l’ouverture de l’app charge le modèle en mémoire : ça peut prendre une minute. Garde l’app ouverte.'
          }
          onCancel={() => setStep({ kind: 'pick' })}
        />
      )}

      {step.kind === 'error' && (
        <>
          <Banner
            tone="error"
            title="Le diagnostic n’a pas abouti"
            action={{ label: 'Réessayer', onPress: () => analyze(step.photoUri) }}>
            {step.message}
          </Banner>
          <Button
            title="Prendre une autre photo"
            icon={icons.camera}
            variant="text"
            onPress={() => setStep({ kind: 'pick' })}
          />
        </>
      )}

      {step.kind === 'result' && (
        <>
          <DiagnosisSections
            diagnosis={step.diagnosis}
            careAction={<WateringOffer plantId={plant.id} change={step.diagnosis.watering_change} />}
          />
          {saved ? (
            <View style={{ gap: spacing.sm }}>
              <Banner tone="success" icon={icons.check}>
                {`Diagnostic enregistré avec sa photo, dans la santé de ${plant.nickname}.`}
              </Banner>
              <Button title="Terminé" icon={icons.check} onPress={closeScreen} />
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              <Button
                title="Enregistrer"
                icon={icons.check}
                loading={saving}
                accessibilityHint="Garde ce diagnostic et sa photo, pour suivre l’évolution de la plante"
                onPress={() => save(step.photoUri, step.diagnosis)}
              />
              <Button
                title="Prendre une autre photo"
                icon={icons.camera}
                variant="text"
                disabled={saving}
                onPress={() => setStep({ kind: 'pick' })}
              />
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

/** Where the photo comes from, with how to take it. */
function PhotoStep({ plant, onPhoto }: { plant: Plant; onPhoto: (uri: string) => void }) {
  const theme = useTheme();
  const status = useModelStatus();
  const [picking, setPicking] = useState<PhotoSource | null>(null);

  const pick = (source: PhotoSource) => {
    setPicking(source);
    pickPhoto(source)
      .then((uri) => {
        if (uri) onPhoto(uri);
      })
      .catch((e) => Alert.alert('Photo', errorText(e)))
      .finally(() => setPicking(null));
  };

  return (
    <Screen>
      <View
        style={{
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.xl,
          borderRadius: radius.xl,
          borderCurve: 'continuous',
          backgroundColor: theme.primaryContainer,
        }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.primary,
          }}>
          <Icon name={icons.diagnose} size={36} color={theme.onPrimary} />
        </View>
        <Text variant="title" color={theme.onPrimaryContainer} style={{ textAlign: 'center' }}>
          Montre ce qui t’inquiète
        </Text>
        <Text variant="body" color={theme.onPrimaryContainer} style={{ textAlign: 'center', maxWidth: 420 }}>
          Photographie de près, à la lumière du jour : une feuille, une tige, le dessous des feuilles.
        </Text>
      </View>

      {status.state === 'ready' ? (
        <>
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
            {`Le modèle tient compte de ce que l’app sait de ${plant.nickname} : espèce, derniers arrosages, pièce, saison. L’analyse se fait sur ton téléphone : la photo n’est envoyée nulle part.`}
          </Text>
        </>
      ) : (
        <ModelCard unsupportedTitle="Diagnostic indisponible" />
      )}
    </Screen>
  );
}

/**
 * When the diagnosis says to water less or more: the new interval of the
 * plant's watering, in one tap, and a way back.
 */
function WateringOffer({ plantId, change }: { plantId: string; change: WateringChange }) {
  const tasks = usePlantTasks(plantId);
  const task = tasks.find((t) => t.kind === 'water');
  // The interval when the diagnosis came: the offer is not made again from the new one.
  const [base] = useState(() => task?.interval_days ?? null);
  const [applied, setApplied] = useState<{ from: number; to: number } | null>(null);

  if (!task || base === null) return null;

  const changeInterval = (target: Task, days: number) =>
    updateTask(target.id, {
      kind: target.kind,
      label: target.label,
      interval_days: days,
      winter_factor: target.winter_factor,
    });

  if (applied) {
    return (
      <Banner
        tone="success"
        icon={TASK_KINDS.water.icon}
        action={{
          label: 'Annuler',
          onPress: () => {
            changeInterval(task, applied.from);
            setApplied(null);
          },
        }}>
        {`Arrosage tous les ${applied.to} jours (au lieu de ${applied.from}).`}
      </Banner>
    );
  }

  const suggested = suggestedWateringInterval(base, change);
  if (suggested === null || suggested === task.interval_days) return null;
  return (
    <Banner
      icon={TASK_KINDS.water.icon}
      title={change === 'less' ? 'Espacer les arrosages ?' : 'Rapprocher les arrosages ?'}
      action={{
        label: `Passer l’arrosage à ${suggested} jours`,
        onPress: () => {
          changeInterval(task, suggested);
          setApplied({ from: task.interval_days, to: suggested });
        },
      }}>
      {`Tu l’arroses tous les ${task.interval_days} jours aujourd’hui.`}
    </Banner>
  );
}
