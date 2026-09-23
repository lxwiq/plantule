import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { typography, useTheme, type Palette, type TypographyVariant } from '@/theme';

type Tone = 'default' | 'secondary' | 'tertiary' | 'primary' | 'error' | 'warning';

const toneColor: Record<Tone, keyof Palette> = {
  default: 'text',
  secondary: 'textSecondary',
  tertiary: 'textTertiary',
  primary: 'primary',
  error: 'error',
  warning: 'warning',
};

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  tone?: Tone;
  /** Overrides the tone, e.g. text on a colored container. */
  color?: string;
};

export function Text({ variant = 'body', tone = 'default', color, style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      style={[typography[variant], { color: color ?? theme[toneColor[tone]] }, style]}
      {...rest}
    />
  );
}
