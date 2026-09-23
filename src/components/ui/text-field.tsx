import { useState, type Ref } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { radius, spacing, touchTarget, typography, useTheme } from '@/theme';

import { Text } from './text';

export type TextFieldProps = TextInputProps & {
  label: string;
  /** Shown under the field, replaced by the error when there is one. */
  hint?: string;
  error?: string | null;
  ref?: Ref<TextInput>;
};

export function TextField({ label, hint, error, style, ref, onFocus, onBlur, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? theme.error : focused ? theme.primary : theme.outline;

  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="label" tone={error ? 'error' : focused ? 'primary' : 'secondary'}>
        {label}
      </Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={theme.textTertiary}
        cursorColor={theme.primary}
        selectionColor={theme.primary}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          typography.body,
          {
            minHeight: touchTarget + 4,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderRadius: radius.sm,
            borderWidth: focused || error ? 2 : 1,
            borderColor,
            color: theme.text,
            backgroundColor: theme.surface,
          },
          rest.multiline && { minHeight: 96, textAlignVertical: 'top' },
          style,
        ]}
        {...rest}
      />
      {(error || hint) && (
        <Text variant="caption" tone={error ? 'error' : 'secondary'} selectable={!!error}>
          {error ?? hint}
        </Text>
      )}
    </View>
  );
}
