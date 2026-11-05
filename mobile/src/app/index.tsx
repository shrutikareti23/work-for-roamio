import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';

/** "Plan" tab. The chat planner replaces this placeholder in Phase 5. */
export default function PlanScreen() {
  return (
    <Screen>
      <AppText variant="title">Where to next?</AppText>
      <AppText color="textSecondary">
        Tell Roamio where you&apos;re going, who&apos;s coming and what you love. We&apos;ll build a
        day-by-day plan with places that are actually open.
      </AppText>
      <Card>
        <AppText variant="heading">Plan a trip</AppText>
        <AppText color="textSecondary">The trip planner chat is coming soon.</AppText>
        <Button label="Start planning" disabled accessibilityHint="Not available yet" />
      </Card>
    </Screen>
  );
}
