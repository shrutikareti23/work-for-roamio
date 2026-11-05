import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';

/** "Trips" tab. Saved trips (synced + offline) arrive in Phase 8. */
export default function TripsScreen() {
  return (
    <Screen>
      <AppText variant="title">Your trips</AppText>
      <Card>
        <AppText variant="heading">No trips yet</AppText>
        <AppText color="textSecondary">
          Trips you plan will appear here and open even when you&apos;re offline.
        </AppText>
      </Card>
    </Screen>
  );
}
