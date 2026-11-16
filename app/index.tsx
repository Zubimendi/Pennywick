import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { getSetting, SETTINGS_KEYS } from '@/db/repositories/settings';
import { useTheme } from '@/ui/theme/useTheme';

export default function Index(): React.JSX.Element {
  const { colors } = useTheme();
  const [targetRoute, setTargetRoute] = useState<string | null>(null);

  useEffect(() => {
    async function checkOnboarding(): Promise<void> {
      try {
        const completed = await getSetting(SETTINGS_KEYS.ONBOARDING_COMPLETED);
        if (completed === 'true') {
          setTargetRoute('/(tabs)');
        } else {
          setTargetRoute('/(onboarding)/welcome');
        }
      } catch (e) {
        console.error('Error checking onboarding status:', e);
        setTargetRoute('/(onboarding)/welcome');
      }
    }
    void checkOnboarding();
  }, []);

  if (!targetRoute) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return <Redirect href={targetRoute === '/(tabs)' ? '/(tabs)' : '/(onboarding)/welcome'} />;
}
