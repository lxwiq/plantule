import { router } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, Pressable, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { Pepin } from '@/components/art';
import { Text } from '@/components/ui';
import type { Task } from '@/db/types';
import { useMascot } from '@/hooks/use-mascot';
import { useToday } from '@/hooks/use-today';
import { careToday, greeting } from '@/lib/greeting';
import { radius, spacing, useTheme } from '@/theme';

/** The hour of the day, which changes on the hour and when the app comes back. */
function useHour(): number {
  const [hour, setHour] = useState(() => new Date().getHours());

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setHour(new Date().getHours());
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const next = new Date();
    next.setHours(next.getHours() + 1, 0, 1, 0);
    const timer = setTimeout(() => setHour(new Date().getHours()), next.getTime() - Date.now());
    return () => clearTimeout(timer);
  }, [hour]);

  return hour;
}

/** A slow breath: Pépin stretches up a little and settles back, from its base. */
const BREATHE = {
  from: { transform: [{ scaleX: 1 }, { scaleY: 1 }] },
  to: { transform: [{ scaleX: 0.985 }, { scaleY: 1.03 }] },
};

/** Pépin breathing gently, unless the phone asks for reduced motion. */
function Breathing({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View
      style={[
        { transformOrigin: 'bottom' },
        !reduceMotion && {
          animationName: BREATHE,
          animationDuration: '2400ms',
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
          animationDirection: 'alternate',
        },
      ]}>
      {children}
    </Animated.View>
  );
}

type PepinGreetingProps = {
  /** The place's care tasks. */
  tasks: Task[];
  plantCount: number;
};

/**
 * Pépin at the top of the Today screen, in its outfit, saying hello and a word
 * on the day's care. Tapping it opens its wardrobe.
 */
export function PepinGreeting({ tasks, plantCount }: PepinGreetingProps) {
  const theme = useTheme();
  const { name, outfit } = useMascot();
  const day = useToday();
  const hour = useHour();
  const care = useMemo(() => careToday(tasks, day), [tasks, day]);
  const { mood, hello, message } = greeting({ hour, day, name, plantCount, care });
  const [pressed, setPressed] = useState(false);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingLeft: spacing.sm,
        paddingRight: spacing.lg,
        borderRadius: radius.xl,
        borderCurve: 'continuous',
        backgroundColor: theme.primaryContainer,
      }}>
      <Pressable
        onPress={() => router.push('/pepin')}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ta mascotte`}
        accessibilityHint="Ouvre son vestiaire">
        <Animated.View
          style={{
            transform: [{ scale: pressed ? 0.95 : 1 }],
            transitionProperty: 'transform',
            transitionDuration: 120,
            transitionTimingFunction: 'ease-out',
          }}>
          <Breathing>
            <Pepin mood={mood} size={104} outfit={outfit} />
          </Breathing>
        </Animated.View>
      </Pressable>

      {/* The speech bubble, its tail pointing at Pépin. */}
      <View style={{ flex: 1 }}>
        <View
          style={{
            position: 'absolute',
            left: -7,
            top: '50%',
            width: 16,
            height: 16,
            marginTop: -8,
            borderRadius: 3,
            transform: [{ rotate: '45deg' }],
            backgroundColor: theme.surface,
          }}
        />
        <View
          style={{
            gap: spacing.xxs,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
            backgroundColor: theme.surface,
          }}>
          <Text variant="bodyStrong">{hello}</Text>
          <Text variant="subhead" tone="secondary">
            {message}
          </Text>
        </View>
      </View>
    </View>
  );
}
