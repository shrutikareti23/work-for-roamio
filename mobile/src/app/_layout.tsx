import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { StatusBar } from 'expo-status-bar';

import { palette, useTheme } from '@/theme';

/**
 * Root layout: wraps every screen. Expo Router turns each file in src/app/ into a
 * route (like Flask routes, but chosen by file name), and this file puts them in tabs.
 */
export default function RootLayout() {
  const { scheme, colors } = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <NativeTabs
        backgroundColor={colors.surface}
        indicatorColor={palette[scheme].surfaceMuted}
        tintColor={colors.primary}
        labelStyle={{ selected: { color: colors.primary } }}
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="sparkles" md="travel_explore" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="trips">
          <NativeTabs.Trigger.Label>Trips</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="suitcase" md="luggage" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="account">
          <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  );
}
