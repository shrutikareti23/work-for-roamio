/**
 * Roamio color palette, one set for light mode and one for dark mode.
 * Every text/background pair here is checked for readable contrast in
 * src/__tests__/colors.test.ts (WCAG AA: at least 4.5 : 1).
 */
export const palette = {
  light: {
    background: '#F6F7F9',
    surface: '#FFFFFF',
    surfaceMuted: '#ECEFF3',
    border: '#D5DAE1',
    text: '#11181C',
    textSecondary: '#535E68',
    primary: '#0B6E6D',
    onPrimary: '#FFFFFF',
    accent: '#B4471F',
    danger: '#B42318',
    success: '#1E7A3C',
  },
  dark: {
    background: '#0B0F12',
    surface: '#161B20',
    surfaceMuted: '#20272E',
    border: '#2E3740',
    text: '#ECEFF1',
    textSecondary: '#A3ADB5',
    primary: '#5ED3C8',
    onPrimary: '#04201E',
    accent: '#F29A72',
    danger: '#F97066',
    success: '#6CD08F',
  },
} as const;

export type ColorScheme = keyof typeof palette;
export type ThemeColors = { [K in keyof typeof palette.light]: string };
