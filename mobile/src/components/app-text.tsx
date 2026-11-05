import { StyleSheet, Text, type TextProps } from 'react-native';

import { useTheme, type ThemeColors } from '@/theme';

type Variant = 'title' | 'heading' | 'body' | 'caption' | 'label';

export type AppTextProps = TextProps & {
  variant?: Variant;
  color?: keyof ThemeColors;
};

/**
 * The only text component screens should use. It picks the right color for
 * light/dark mode and respects the user's system font size setting.
 */
export function AppText({ variant = 'body', color = 'text', style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  const isHeading = variant === 'title' || variant === 'heading';
  return (
    <Text
      accessibilityRole={isHeading ? 'header' : undefined}
      // Large titles may grow, but not so much that they break small screens.
      maxFontSizeMultiplier={isHeading ? 1.6 : 2}
      style={[styles[variant], { color: colors[color] }, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 23 },
  caption: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
});
