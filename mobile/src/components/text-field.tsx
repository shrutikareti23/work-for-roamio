import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { MIN_TOUCH, radius, spacing, useTheme } from '@/theme';

import { AppText } from './app-text';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Shown under the field in red, and read out by screen readers. */
  error?: string | null;
  /** Adds a Show/Hide button for passwords. */
  password?: boolean;
};

/** Labelled, accessible text input with an optional error message. */
export function TextField({ label, error, password, ...rest }: Props) {
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.wrap}>
      <AppText variant="label">{label}</AppText>
      <View
        style={[
          styles.box,
          { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border },
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error ?? undefined}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={password && hidden}
          autoCapitalize={password ? 'none' : rest.autoCapitalize}
          style={[styles.input, { color: colors.text }]}
          {...rest}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((h) => !h)}
            style={styles.toggle}
            hitSlop={8}
          >
            <AppText variant="caption" color="primary">
              {hidden ? 'Show' : 'Hide'}
            </AppText>
          </Pressable>
        )}
      </View>
      {error ? (
        <AppText variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.sm,
    minHeight: MIN_TOUCH,
  },
  input: { flex: 1, fontSize: 16, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  toggle: { paddingHorizontal: spacing.md, minHeight: MIN_TOUCH, justifyContent: 'center' },
});
