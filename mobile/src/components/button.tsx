import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { MIN_TOUCH, radius, spacing, useTheme } from '@/theme';

import { AppText } from './app-text';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  /** Shows a spinner and blocks taps while something is happening. */
  loading?: boolean;
  /** Extra context for screen readers, e.g. "Available after you sign in". */
  accessibilityHint?: string;
};

/** Accessible button: at least 48pt tall, announced as a button, shows a pressed state. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  accessibilityHint,
}: Props) {
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const blocked = !!disabled || !!loading;
  const textColor = isPrimary ? 'onPrimary' : isDanger ? 'danger' : 'text';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: blocked, busy: !!loading }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary
          ? { backgroundColor: colors.primary }
          : {
              backgroundColor: colors.surfaceMuted,
              borderColor: isDanger ? colors.danger : colors.border,
              borderWidth: 1,
            },
        (pressed || blocked) && { opacity: disabled ? 0.5 : 0.8 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors[textColor]} accessibilityLabel="Loading" />
      ) : (
        <AppText variant="label" color={textColor}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
