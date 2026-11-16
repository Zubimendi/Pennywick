// app/(onboarding)/welcome.tsx
// Onboarding Screen (S1)
// Short pitch, currency picker (default NGN), 'Start tracking'. No forced account.

import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Button, Chip } from '@/ui/components';
import { useTheme } from '@/ui/theme/useTheme';
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from '@/data/currencies';
import { setSetting, SETTINGS_KEYS } from '@/db/repositories/settings';
import { seedCategoriesIfEmpty } from '@/db/init';

export default function WelcomeScreen(): React.JSX.Element {
  const router = useRouter();
  const { colors, space, type } = useTheme();
  const [selectedCurrency, setSelectedCurrency] = useState(DEFAULT_CURRENCY);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartTracking = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      // 1. Save selected currency
      await setSetting(SETTINGS_KEYS.CURRENCY, selectedCurrency);
      // 2. Mark onboarding completed
      await setSetting(SETTINGS_KEYS.ONBOARDING_COMPLETED, 'true');
      // 3. Ensure categories are seeded
      await seedCategoriesIfEmpty();
      // 4. Navigate to Home
      router.replace('/(tabs)');
    } catch (e) {
      console.error('Failed to complete onboarding:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen style={styles.container}>
      <View style={[styles.content, { gap: space.xl, paddingVertical: space.xl }]}>
        <View style={{ gap: space.sm }}>
          <Text style={[type.caption, { color: colors.primary, textTransform: 'uppercase' }]}>
            Local-First Expense Tracker
          </Text>
          <Text style={[type.title, { color: colors.text }]}>
            Where did your money go?
          </Text>
          <Text style={[type.body, { color: colors.textSecondary }]}>
            Pennywick works completely offline with no account, no signal, and no spreadsheet.
            Every entry is stored directly on this phone.
          </Text>
        </View>

        <View style={{ gap: space.md }}>
          <Text style={[type.label, { color: colors.text }]}>
            Select your currency
          </Text>
          <View style={[styles.currencyGrid, { gap: space.sm }]}>
            {SUPPORTED_CURRENCIES.map((c) => (
              <Chip
                key={c.code}
                label={`${c.symbol} ${c.code}`}
                selected={selectedCurrency === c.code}
                onPress={() => setSelectedCurrency(c.code)}
              />
            ))}
          </View>
          <Text style={[type.caption, { color: colors.textFaint }]}>
            You can change this later in Settings. Changing currency does not convert existing amounts.
          </Text>
        </View>

        <View style={[styles.actionWrapper, { marginTop: space.lg }]}>
          <Button
            label="Start tracking"
            variant="primary"
            loading={isSubmitting}
            onPress={handleStartTracking}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  content: {
    justifyContent: 'center',
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionWrapper: {
    width: '100%',
  },
});
