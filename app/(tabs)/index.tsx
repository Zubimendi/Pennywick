import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, MoneyText, Button } from '@/ui/components';
import { useTheme } from '@/ui/theme/useTheme';
import { useUiStore } from '@/ui/theme/uiStore';

export default function HomeScreen(): React.JSX.Element {
  const { colors, space, type } = useTheme();
  const togglePrivacy = useUiStore((state) => state.togglePrivacy);
  const showToast = useUiStore((state) => state.showToast);

  return (
    <Screen style={styles.container}>
      <View style={[styles.header, { gap: space.xs }]}>
        <Text style={[type.title, { color: colors.text }]}>November</Text>
        <Text style={[type.label, { color: colors.textSecondary }]}>
          Spent this month
        </Text>
      </View>

      <View style={[styles.heroCard, { gap: space.sm, paddingVertical: space.xl }]}>
        <MoneyText amountMinor={18450000} role="hero" kind="expense" />
        <View style={[styles.summaryRow, { gap: space.md }]}>
          <Text style={[type.body, { color: colors.textSecondary }]}>
            Income: <MoneyText amountMinor={25000000} kind="income" />
          </Text>
          <Text style={[type.body, { color: colors.textSecondary }]}>
            Left: <MoneyText amountMinor={6550000} kind="income" />
          </Text>
        </View>
      </View>

      <View style={[styles.actions, { gap: space.md }]}>
        <Button
          label="Toggle Privacy"
          variant="secondary"
          onPress={togglePrivacy}
        />
        <Button
          label="Show Test Toast"
          variant="ghost"
          onPress={() =>
            showToast({
              message: 'Entry removed. Undo',
              actionLabel: 'Undo',
              onAction: () => console.log('Undo triggered'),
            })
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
  },
  heroCard: {
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
  },
  actions: {
    width: '100%',
  },
});
