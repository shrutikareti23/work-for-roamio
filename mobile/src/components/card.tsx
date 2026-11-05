import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

/** A rounded, bordered box used for every card in the app. */
export function Card({ children, style, ...rest }: ViewProps & { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
