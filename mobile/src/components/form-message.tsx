import { StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { AppText } from './app-text';

/** A box for form-level errors or confirmations, announced to screen readers. */
export function FormMessage({
  text,
  kind = 'error',
}: {
  text: string | null;
  kind?: 'error' | 'info';
}) {
  const { colors } = useTheme();
  if (!text) return null;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={[
        styles.box,
        {
          borderColor: kind === 'error' ? colors.danger : colors.primary,
          backgroundColor: colors.surfaceMuted,
        },
      ]}
    >
      <AppText color={kind === 'error' ? 'danger' : 'text'}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: radius.sm, padding: spacing.md },
});
