import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { identifyPlant, isAbortError, modelIsWarm } from '@/ai/plant-ai';
import { AiProgress } from '@/components/ai-progress';
import {
  Banner,
  Button,
  EmptyState,
  Icon,
  icons,
  ListSection,
  Screen,
  Text,
  TextField,
} from '@/components/ui';
import { confidenceLevel, confidenceText, type Identification, type SpeciesCandidate } from '@/lib/identification';
import { closeScreen } from '@/lib/navigation';
import { radius, spacing, touchTarget, useTheme } from '@/theme';

type Step =
  | { kind: 'analyzing' }
  | { kind: 'results'; identification: Identification }
  | { kind: 'not_plant' }
  | { kind: 'error'; message: string };

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Une erreur est survenue.';
}

/** Photo → the species it may be → the user confirms one, or types it. */
export default function IdentifyScreen() {
  const { photoUri } = useLocalSearchParams<{ photoUri?: string }>();
  if (!photoUri) {
    return (
      <Screen>
        <EmptyState
          icon={icons.scan}
          title="Pas de photo"
          message="Prends ou choisis une photo depuis l’onglet Scan."
          action={{ label: 'Retour', onPress: closeScreen }}
        />
      </Screen>
    );
  }
  return <Identify photoUri={photoUri} />;
}

function Identify({ photoUri }: { photoUri: string }) {
  const theme = useTheme();
  const [run, setRun] = useState(0);
  const [step, setStep] = useState<Step>({ kind: 'analyzing' });
  const [selected, setSelected] = useState(0);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const [warm] = useState(modelIsWarm);

  useEffect(() => {
    // Cancelled when leaving the screen, or when retrying.
    const controller = new AbortController();
    identifyPlant(photoUri, { signal: controller.signal }).then(
      (identification) => {
        setSelected(0);
        setStep(identification.is_plant ? { kind: 'results', identification } : { kind: 'not_plant' });
      },
      (error) => {
        // Cancelled on purpose: nothing to say.
        if (controller.signal.aborted) return;
        const message = isAbortError(error) ? 'L’analyse a été interrompue.' : errorText(error);
        setStep({ kind: 'error', message });
      },
    );
    return () => controller.abort();
  }, [photoUri, run]);

  const retry = () => {
    setStep({ kind: 'analyzing' });
    setRun((n) => n + 1);
  };

  const confirm = (candidate: SpeciesCandidate) =>
    router.push({
      pathname: '/scan/sheet',
      params: { photoUri, species: candidate.scientific_name, commonName: candidate.common_name },
    });

  const confirmTyped = () => {
    const species = typed.trim();
    if (species) router.push({ pathname: '/scan/sheet', params: { photoUri, species } });
  };

  const candidates = step.kind === 'results' ? step.identification.candidates : [];
  const [best, ...others] = candidates;

  return (
    <Screen>
      <Image
        source={{ uri: photoUri }}
        contentFit="cover"
        accessibilityLabel="Photo à analyser"
        style={{
          width: '100%',
          aspectRatio: 4 / 3,
          borderRadius: radius.xl,
          backgroundColor: theme.surfaceContainerHigh,
        }}
      />

      {step.kind === 'analyzing' && (
        <AiProgress
          title="Analyse de la photo…"
          detail="Tout se passe sur ton téléphone."
          slowTitle={warm ? 'Encore un peu de patience…' : 'Préparation du modèle…'}
          slowDetail={
            warm
              ? 'Le modèle regarde la photo en détail. Garde l’app ouverte.'
              : 'La première analyse après l’ouverture de l’app charge le modèle en mémoire : ça peut prendre une minute. Garde l’app ouverte.'
          }
          onCancel={closeScreen}
        />
      )}

      {step.kind === 'results' && best && !typing && (
        <>
          <ListSection title="Meilleure correspondance">
            <CandidateRow candidate={best} selected={selected === 0} onPress={() => setSelected(0)} />
          </ListSection>
          {others.length > 0 && (
            <ListSection title="Autres possibilités">
              {others.map((candidate, index) => (
                <CandidateRow
                  key={candidate.scientific_name}
                  candidate={candidate}
                  selected={selected === index + 1}
                  onPress={() => setSelected(index + 1)}
                />
              ))}
            </ListSection>
          )}
          <Text variant="caption" tone="secondary" style={{ paddingHorizontal: spacing.xs }}>
            Le modèle peut se tromper, même quand il a l’air sûr de lui. Vérifie avant de confirmer.
          </Text>
          <View style={{ gap: spacing.sm }}>
            <Button
              title="Confirmer cette espèce"
              icon={icons.check}
              onPress={() => confirm(candidates[selected] ?? best)}
            />
            <Button title="Aucune de celles-ci" variant="text" onPress={() => setTyping(true)} />
          </View>
        </>
      )}

      {step.kind === 'not_plant' && !typing && (
        <>
          <Banner tone="warning" title="Pas de plante sur cette photo">
            Le modèle n’a pas reconnu de plante. Reprends-la de plus près, avec la plante bien visible et
            à la lumière du jour.
          </Banner>
          <View style={{ gap: spacing.sm }}>
            <Button title="Reprendre une photo" icon={icons.camera} onPress={closeScreen} />
            <Button title="Saisir l’espèce à la main" variant="text" onPress={() => setTyping(true)} />
          </View>
        </>
      )}

      {step.kind === 'error' && !typing && (
        <>
          <Banner
            tone="error"
            title="L’analyse n’a pas abouti"
            action={{ label: 'Réessayer', onPress: retry }}>
            {step.message}
          </Banner>
          <Button title="Saisir l’espèce à la main" variant="text" onPress={() => setTyping(true)} />
        </>
      )}

      {typing && (
        <View style={{ gap: spacing.lg }}>
          <TextField
            label="Espèce"
            placeholder="Monstera deliciosa, pothos…"
            hint="Le nom commun ou le nom scientifique."
            value={typed}
            onChangeText={setTyped}
            onSubmitEditing={confirmTyped}
            returnKeyType="next"
            autoCapitalize="sentences"
            autoFocus
            maxLength={120}
          />
          <View style={{ gap: spacing.sm }}>
            <Button title="Continuer" disabled={!typed.trim()} onPress={confirmTyped} />
            {step.kind === 'results' && (
              <Button title="Revoir les propositions" variant="text" onPress={() => setTyping(false)} />
            )}
          </View>
        </View>
      )}
    </Screen>
  );
}

type CandidateRowProps = {
  candidate: SpeciesCandidate;
  selected: boolean;
  onPress: () => void;
};

function CandidateRow({ candidate, selected, onPress }: CandidateRowProps) {
  const theme = useTheme();
  const level = confidenceLevel(candidate.confidence);
  const pill = {
    high: { background: theme.primaryContainer, content: theme.onPrimaryContainer },
    medium: { background: theme.secondaryContainer, content: theme.onSecondaryContainer },
    low: { background: theme.surfaceContainerHighest, content: theme.textSecondary },
  }[level];
  const confidence = confidenceText(candidate.confidence);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${candidate.common_name}, ${candidate.scientific_name}. ${confidence}`}
      onPress={onPress}
      android_ripple={{ color: theme.outlineVariant }}
      style={({ pressed }) => ({
        minHeight: touchTarget + 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor:
          process.env.EXPO_OS !== 'android' && pressed ? theme.surfaceContainerHigh : undefined,
      })}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: selected ? theme.primary : theme.outline,
          backgroundColor: selected ? theme.primary : 'transparent',
        }}>
        {selected && <Icon name={icons.check} size={16} color={theme.onPrimary} />}
      </View>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {candidate.common_name}
        </Text>
        <Text variant="subhead" tone="secondary" style={{ fontStyle: 'italic' }} numberOfLines={1}>
          {candidate.scientific_name}
        </Text>
        <View
          style={{
            alignSelf: 'flex-start',
            marginTop: spacing.xs,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xxs,
            borderRadius: radius.sm,
            backgroundColor: pill.background,
          }}>
          <Text variant="caption" color={pill.content}>
            {confidence}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
