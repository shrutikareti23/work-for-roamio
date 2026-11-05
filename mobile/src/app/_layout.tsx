import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/lib/session';
import { useTheme } from '@/theme';

/**
 * Root layout: wraps every screen. The tabs live in the (tabs) folder; the sign-in
 * screens in auth/ slide up over them as a modal.
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
    <AuthProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/sign-in" options={{ presentation: 'modal', title: 'Sign in' }} />
          <Stack.Screen
            name="auth/sign-up"
            options={{ presentation: 'modal', title: 'Create account' }}
          />
          <Stack.Screen
            name="auth/verify"
            options={{ presentation: 'modal', title: 'Enter code' }}
          />
          <Stack.Screen
            name="auth/forgot-password"
            options={{ presentation: 'modal', title: 'Reset password' }}
          />
          <Stack.Screen
            name="auth/new-password"
            options={{ presentation: 'modal', title: 'New password', gestureEnabled: false }}
          />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
