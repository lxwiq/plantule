import { Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useModelStatus } from '@/ai';
import { askPlant, isAbortError, modelIsWarm, type ChatTurn } from '@/ai/plant-ai';
import { ModelCard } from '@/components/ai-model-card';
import { ChatBubble, PendingAnswer } from '@/components/chat-view';
import { Scene } from '@/components/scene';
import { Banner, Chip, EmptyState, IconButton, icons, Screen, Text } from '@/components/ui';
import { useChatMessages, usePlant } from '@/db/hooks';
import { addChatMessage, clearChatMessages } from '@/db/repo';
import type { ChatMessage, Plant } from '@/db/types';
import { closeScreen } from '@/lib/navigation';
import { radius, spacing, touchTarget, typography, useTheme } from '@/theme';

const SUGGESTIONS = ['Pourquoi ses feuilles jaunissent ?', 'Quand la rempoter ?', 'Où la placer ?'];

/** Messages handed back to the model with a question (it keeps what fits). */
const HISTORY_SIZE = 10;

const MAX_QUESTION_LENGTH = 500;

/** Within this distance of the bottom, the list follows the answer as it is written. */
const FOLLOW_THRESHOLD = 80;

type Failure = { kind: 'error'; message: string } | { kind: 'stopped' };

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Une erreur est survenue.';
}

const toTurns = (messages: ChatMessage[]): ChatTurn[] =>
  messages.slice(-HISTORY_SIZE).map(({ role, text }) => ({ role, text }));

/** Questions about one plant, answered by the on-device model knowing that plant. */
export default function AskScreen() {
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
  return <Conversation plant={plant} />;
}

/** Whether the software keyboard is up, to drop the bottom inset it covers. */
function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const ios = process.env.EXPO_OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

function Conversation({ plant }: { plant: Plant }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const keyboardVisible = useKeyboardVisible();
  const status = useModelStatus();
  const ready = status.state === 'ready';
  const messages = useChatMessages(plant.id);
  const [draft, setDraft] = useState('');
  // The answer being written, if any.
  const [pending, setPending] = useState<{ text: string; warm: boolean } | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const controller = useRef<AbortController | null>(null);
  const scroll = useRef<ScrollView>(null);
  const follow = useRef(true);
  const laidOut = useRef(false);

  // Leaving the screen drops the answer being written: only whole answers are kept.
  useEffect(() => () => controller.current?.abort(), []);

  const ask = (question: string, history: ChatTurn[]) => {
    const current = new AbortController();
    controller.current = current;
    follow.current = true;
    setFailure(null);
    setPending({ text: '', warm: modelIsWarm() });
    const done = () => {
      controller.current = null;
      setPending(null);
    };
    askPlant(plant.id, history, question, {
      signal: current.signal,
      onText: (text) => {
        if (!current.signal.aborted) setPending((p) => (p ? { ...p, text } : p));
      },
    }).then(
      (answer) => {
        // Stopped, cleared or left meanwhile: nothing to keep.
        if (current.signal.aborted) return;
        done();
        if (answer.trim()) addChatMessage(plant.id, 'assistant', answer);
        else setFailure({ kind: 'error', message: 'Plantule n’a pas su quoi répondre. Reformule ta question ?' });
      },
      (error) => {
        if (current.signal.aborted) return;
        done();
        setFailure(
          isAbortError(error) ? { kind: 'stopped' } : { kind: 'error', message: errorText(error) },
        );
      },
    );
  };

  /** Stores the question right away, then asks it. */
  const send = (text: string) => {
    const question = text.trim();
    if (!question || pending || !ready) return;
    const history = toTurns(messages);
    addChatMessage(plant.id, 'user', question);
    setDraft('');
    ask(question, history);
  };

  const last = messages.at(-1);
  // Only while the question is the last message: once the answer is stored, it shows instead.
  const writing = pending && last?.role === 'user' ? pending : null;
  // A question left without an answer (error, stopped, or the screen was left): ask it again.
  const unanswered = !pending && last?.role === 'user' ? last : null;
  const retry = () => {
    if (unanswered) ask(unanswered.text, toTurns(messages.slice(0, -1)));
  };

  const stop = () => {
    // The engine finishes the answer natively anyway: it is not asked again on its own.
    controller.current?.abort();
    controller.current = null;
    setPending(null);
    setFailure({ kind: 'stopped' });
  };

  const confirmClear = () =>
    Alert.alert('Effacer la conversation ?', `Tes échanges avec Plantule sur ${plant.nickname} seront supprimés.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Effacer',
        style: 'destructive',
        onPress: () => {
          controller.current?.abort();
          controller.current = null;
          setPending(null);
          setFailure(null);
          clearChatMessages(plant.id);
        },
      },
    ]);

  const onScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
    follow.current = contentSize.height - layoutMeasurement.height - contentOffset.y < FOLLOW_THRESHOLD;
  };

  const onContentSizeChange = () => {
    if (!follow.current) return;
    // The first time, jump to the latest messages without scrolling through them.
    scroll.current?.scrollToEnd({ animated: laidOut.current });
    laidOut.current = true;
  };

  const canSend = ready && !pending && draft.trim().length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () =>
            messages.length > 0 ? (
              <IconButton icon={icons.delete} label="Effacer la conversation" onPress={confirmClear} />
            ) : null,
        }}
      />
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={headerHeight}
        style={{ flex: 1, backgroundColor: theme.background }}>
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onScroll={onScroll}
          scrollEventThrottle={100}
          onContentSizeChange={onContentSizeChange}
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            gap: spacing.md,
            padding: spacing.lg,
            paddingBottom: ready ? spacing.lg : insets.bottom + spacing.xxxl,
            width: '100%',
            maxWidth: 640,
            alignSelf: 'center',
          }}>
          {messages.length === 0 && !pending && (
            <Intro plant={plant} onSuggestion={ready ? send : undefined} />
          )}

          {messages.map((message) => (
            <ChatBubble key={message.id} role={message.role} text={message.text} />
          ))}

          {writing && <PendingAnswer text={writing.text} warm={writing.warm} onStop={stop} />}

          {unanswered && ready && (
            <Banner
              tone={failure?.kind === 'error' ? 'error' : 'info'}
              title={failure?.kind === 'error' ? 'Pas de réponse' : undefined}
              action={{ label: 'Réessayer', onPress: retry }}>
              {failure?.kind === 'error'
                ? failure.message
                : failure?.kind === 'stopped'
                  ? 'Réponse arrêtée.'
                  : 'Cette question est restée sans réponse.'}
            </Banner>
          )}

          {!ready && (
            <View style={{ gap: spacing.md, marginTop: messages.length > 0 ? spacing.lg : 0 }}>
              {status.state !== 'unsupported' && (
                <Text variant="body" tone="secondary">
                  Plantule répond grâce à un modèle d’IA qui tourne sur ton téléphone, sans connexion ni compte. Il
                  faut d’abord le télécharger, une seule fois.
                </Text>
              )}
              <ModelCard unsupportedTitle="Questions indisponibles" />
            </View>
          )}
        </ScrollView>

        {ready && (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.outlineVariant,
              backgroundColor: theme.background,
              paddingTop: spacing.sm,
              paddingBottom: (keyboardVisible ? 0 : insets.bottom) + spacing.sm,
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: spacing.sm,
                paddingHorizontal: spacing.lg,
                width: '100%',
                maxWidth: 640,
                alignSelf: 'center',
              }}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={`Ta question sur ${plant.nickname}…`}
                accessibilityLabel="Ta question"
                multiline
                maxLength={MAX_QUESTION_LENGTH}
                placeholderTextColor={theme.textTertiary}
                cursorColor={theme.primary}
                selectionColor={theme.primary}
                style={[
                  typography.body,
                  {
                    flex: 1,
                    minHeight: touchTarget,
                    maxHeight: 128,
                    paddingHorizontal: spacing.lg,
                    paddingTop: spacing.md,
                    paddingBottom: spacing.md,
                    borderRadius: radius.xl,
                    borderCurve: 'continuous',
                    color: theme.text,
                    backgroundColor: theme.surfaceContainerHigh,
                  },
                ]}
              />
              <IconButton
                icon={icons.send}
                label="Envoyer"
                variant="filled"
                disabled={!canSend}
                onPress={() => send(draft)}
              />
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

/** An empty conversation: what Plantule knows, and questions to start with. */
function Intro({ plant, onSuggestion }: { plant: Plant; onSuggestion?: (question: string) => void }) {
  return (
    <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}>
      <Scene id="chatting" />
      <Text variant="title" style={{ textAlign: 'center' }}>
        {`Une question sur ${plant.nickname} ?`}
      </Text>
      <Text variant="body" tone="secondary" style={{ textAlign: 'center', maxWidth: 420 }}>
        Plantule connaît son espèce, sa fiche, ses derniers soins et sa pièce. Ses réponses sont des conseils, écrits
        sur ton téléphone.
      </Text>
      {onSuggestion && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: spacing.sm,
            marginTop: spacing.sm,
          }}>
          {SUGGESTIONS.map((question) => (
            <Chip key={question} label={question} onPress={() => onSuggestion(question)} />
          ))}
        </View>
      )}
    </View>
  );
}
