import { Pressable, StyleSheet } from 'react-native';

import { MIN_TOUCH, radius, spacing, useTheme } from '@/theme';

import { AppText } from './app-text';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  /** Extra context for screen readers, e.g. "Available after you sign in". */
  accessibilityHint?: string;
};

/** Accessible button: at least 48pt tall, announced as a button, shows a pressed state. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  accessibilityHint,
}: Props) {
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary
          ? { backgroundColor: colors.primary }
          : { backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderWidth: 1 },
        (pressed || disabled) && { opacity: disabled ? 0.5 : 0.8 },
      ]}
    >
      <AppText variant="label" color={isPrimary ? 'onPrimary' : 'text'}>
        {label}
      </AppText>
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
