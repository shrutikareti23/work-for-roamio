import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/theme';

/** The three bottom tabs. */
export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <NativeTabs
      backgroundColor={colors.surface}
      indicatorColor={colors.surfaceMuted}
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
  );
}
