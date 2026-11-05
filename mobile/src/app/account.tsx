import Constants from 'expo-constants';
import { useEffect, useState } from 'react';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { checkHealth } from '@/lib/api';

const DATA_SOURCES = [
  'Places © OpenStreetMap contributors (ODbL)',
  'Photos from Wikimedia Commons (credited on each photo)',
  'Weather data by Open-Meteo.com (CC BY 4.0)',
  'Map tiles by OpenFreeMap, © OpenMapTiles, © OpenStreetMap contributors',
];

/** "Account" tab. Sign-in arrives in Phase 3; for now it shows app info and server status. */
export default function AccountScreen() {
  const [serverStatus, setServerStatus] = useState('Checking…');

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

  return (
    <Screen>
      <AppText variant="title">Account</AppText>
      <Card>
        <AppText variant="heading">Sign in</AppText>
        <AppText color="textSecondary">
          Accounts are coming soon, so your trips can sync across devices.
        </AppText>
      </Card>
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
