import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button, icons, Text } from '@/components/ui';
import type { ChatRole } from '@/db/types';
import { radius, spacing, useTheme } from '@/theme';

/** After this, the wait for the first words gets its own explanation. */
const SLOW_AFTER_MS = 8000;

/** Answers may carry light Markdown (bold, bullets, titles): shown as plain text. */
export function plainAnswer(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/^(\s*)[-*+]\s+/gm, '$1• ')
    .trim();
}

/** A message of the conversation: the user's on the right, Plantule's on the left. */
export function ChatBubble({ role, text }: { role: ChatRole; text: string }) {
  const theme = useTheme();
  const mine = role === 'user';
  const shown = mine ? text : plainAnswer(text);
  return (
    <View
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: mine ? '85%' : '92%',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        borderBottomRightRadius: mine ? radius.sm : radius.lg,
        borderTopLeftRadius: mine ? radius.lg : radius.sm,
        backgroundColor: mine ? theme.primaryContainer : theme.surfaceContainerHigh,
      }}>
      <Text
        variant="body"
        color={mine ? theme.onPrimaryContainer : theme.text}
        accessibilityLabel={`${mine ? 'Toi' : 'Plantule'} : ${shown}`}
        selectable>
        {shown}
      </Text>
    </View>
  );
}

type PendingAnswerProps = {
  /** The answer so far; empty until the first words. */
  text: string;
  /** Whether the model was already loaded when the question was sent. */
  warm: boolean;
  onStop: () => void;
};

/** The answer being written, live, with a way to stop it. */
export function PendingAnswer({ text, warm, onStop }: PendingAnswerProps) {
  const theme = useTheme();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
      {text ? (
        <ChatBubble role="assistant" text={text} />
      ) : (
        <View
          accessibilityLiveRegion="polite"
          style={{
            maxWidth: '92%',
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderRadius: radius.lg,
            borderTopLeftRadius: radius.sm,
            borderCurve: 'continuous',
            backgroundColor: theme.surfaceContainerHigh,
          }}>
          <ActivityIndicator color={theme.primary} />
          <View style={{ flexShrink: 1, gap: spacing.xxs }}>
            <Text variant="body">
              {slow ? (warm ? 'Encore un peu de patience…' : 'Préparation du modèle…') : 'Plantule réfléchit…'}
            </Text>
            {slow && (
              <Text variant="subhead" tone="secondary">
                {warm
                  ? 'Le modèle relit ce qu’il sait de ta plante. Garde l’app ouverte.'
                  : 'La première réponse après l’ouverture de l’app charge le modèle en mémoire : ça peut prendre une minute. Garde l’app ouverte.'}
              </Text>
            )}
          </View>
        </View>
      )}
      <Button title="Arrêter" icon={icons.stop} variant="outlined" size="sm" onPress={onStop} />
    </View>
  );
}
