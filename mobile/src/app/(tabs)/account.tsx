import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { FormMessage } from '@/components/form-message';
import { Screen } from '@/components/screen';
import { checkHealth } from '@/lib/api';
import { deleteAccount, signOut } from '@/lib/auth';
import { useAuth } from '@/lib/session';

const DATA_SOURCES = [
  'Places © OpenStreetMap contributors (ODbL)',
  'Photos from Wikimedia Commons (credited on each photo)',
  'Weather data by Open-Meteo.com (CC BY 4.0)',
  'Map tiles by OpenFreeMap, © OpenMapTiles, © OpenStreetMap contributors',
];

/** Asks twice before deleting, because it can't be undone. Resolves true if confirmed. */
function confirmDelete(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account and all your trips and ratings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Delete everything', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export default function AccountScreen() {
  const { session, loading } = useAuth();
  const [serverStatus, setServerStatus] = useState('Checking…');
  const [message, setMessage] = useState<{ text: string; kind: 'error' | 'info' } | null>(null);
  const [busy, setBusy] = useState<'signout' | 'delete' | null>(null);

  // useEffect runs after the screen first appears (like an "on load" callback).
  useEffect(() => {
    let active = true;
    checkHealth().then((r) => {
      if (active) setServerStatus(r.ok ? `Connected (v${r.data.version})` : r.message);
    });
    return () => {
      active = false;
    };
  }, []);

  async function onSignOut() {
    setMessage(null);
    setBusy('signout');
    const r = await signOut();
    setBusy(null);
    if (!r.ok) setMessage({ text: r.message, kind: 'error' });
  }

  async function onDelete() {
    setMessage(null);
    if (!(await confirmDelete())) return;
    setBusy('delete');
    const r = await deleteAccount();
    setBusy(null);
    setMessage(
      r.ok
        ? { text: 'Your account and all your data have been deleted.', kind: 'info' }
        : { text: r.message, kind: 'error' },
    );
  }

  return (
    <Screen>
      <AppText variant="title">Account</AppText>
      <FormMessage text={message?.text ?? null} kind={message?.kind} />

      {loading ? (
        <ActivityIndicator accessibilityLabel="Loading your account" />
      ) : session ? (
        <>
          <Card>
            <AppText variant="heading">Signed in</AppText>
            <AppText color="textSecondary">{session.user.email}</AppText>
            <Button
              label="Sign out"
              variant="secondary"
              onPress={onSignOut}
              loading={busy === 'signout'}
            />
          </Card>
          <Card>
            <AppText variant="heading">Delete account</AppText>
            <AppText color="textSecondary">
              Permanently delete your account and everything in it: trips, days and ratings.
            </AppText>
            <Button
              label="Delete my account"
              variant="danger"
              onPress={onDelete}
              loading={busy === 'delete'}
            />
          </Card>
        </>
      ) : (
        <Card>
          <AppText variant="heading">Sign in</AppText>
          <AppText color="textSecondary">
            Save your trips and open them on any of your devices.
          </AppText>
          <Button label="Sign in" onPress={() => router.push('/auth/sign-in')} />
          <Button
            label="Create account"
            variant="secondary"
            onPress={() => router.push('/auth/sign-up')}
          />
        </Card>
      )}

      <Card accessible accessibilityLabel={`Server status: ${serverStatus}`}>
        <AppText variant="heading">Server</AppText>
        <AppText color="textSecondary">{serverStatus}</AppText>
      </Card>
      <Card>
        <AppText variant="heading">Data sources</AppText>
        {DATA_SOURCES.map((line) => (
          <AppText key={line} variant="caption" color="textSecondary">
            {line}
          </AppText>
        ))}
      </Card>
      <AppText variant="caption" color="textSecondary">
        Roamio v{Constants.expoConfig?.version ?? '?'}
      </AppText>
    </Screen>
  );
}
