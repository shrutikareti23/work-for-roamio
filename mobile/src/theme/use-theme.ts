import { useColorScheme } from 'react-native';

import { palette, type ColorScheme, type ThemeColors } from './colors';

/**
 * A React "hook": a function components call to read shared state.
 * This one returns the colors for the phone's current light/dark setting,
 * and the component re-renders automatically when the user switches modes.
 */
export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, colors: palette[scheme] };
}
