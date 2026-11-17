// app/settings/recurring.tsx
// Recurring Rules List Screen (T12)
// Precision Utility layout: lists active and paused recurring rules, triggers manual catch-up, navigates to rule editor.

import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Screen,
  Button,
  Press,
  Row,
  MoneyText,
  EmptyState,
} from '@/ui/components';
import { useTheme } from '@/ui/theme/useTheme';
import { useUiStore } from '@/ui/theme/uiStore';
import {
  listRecurringRules,
  updateRecurringRule,
} from '@/db/repositories/recurring';
import { listCategories } from '@/db/repositories/categories';
import { getSetting, SETTINGS_KEYS } from '@/db/repositories/settings';
import { DEFAULT_CURRENCY } from '@/data/currencies';
import { runRecurrenceCatchUp } from '@/features/recurring/recurrenceEngine';
import { RecurringRule, Category } from '@/db/schema';

export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}): React.JSX.Element {
  const { colors, space, type } = useTheme();

  return (
    <View
      style={[
        styles.centerContainer,
        { backgroundColor: colors.bg, padding: space.xl, gap: space.md },
      ]}
    >
      <Text style={[type.title, { color: colors.danger }]}>Recurring Rules Error</Text>
      <Text style={[type.body, { color: colors.textSecondary }]}>
        {error.message || 'Pennywick encountered a problem loading recurring rules.'}
      </Text>
      <Button label="Retry" onPress={retry} variant="primary" />
    </View>
  );
}

export default function RecurringScreen(): React.JSX.Element {
  const router = useRouter();
  const { colors, space, radius, type, hit } = useTheme();
  const showToast = useUiStore((state) => state.showToast);

  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [categoriesMap, setCategoriesMap] = useState<Map<string, Category>>(new Map());
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);

      const savedCurrency = await getSetting(SETTINGS_KEYS.CURRENCY);
      if (savedCurrency) setCurrency(savedCurrency);

      const allCats = await listCategories({ includeArchived: true });
      const catMap = new Map<string, Category>();
      for (const cat of allCats) {
        catMap.set(cat.id, cat);
      }
      setCategoriesMap(catMap);

      const ruleList = await listRecurringRules(false);
      setRules(ruleList);
    } catch (err) {
      console.error('Failed to load recurring rules:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleToggleActive = async (rule: RecurringRule): Promise<void> => {
    await Haptics.selectionAsync();
    const res = await updateRecurringRule(rule.id, {
      active: !rule.active,
    });
    if (res.ok) {
      showToast({
        message: !rule.active ? 'Rule activated' : 'Rule paused',
      });
      await loadData();
    }
  };

  const handleCatchUpNow = async (): Promise<void> => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const summary = await runRecurrenceCatchUp();
    showToast({
      message: `Catch-up complete: ${summary.transactionsCreated} entries created.`,
    });
    await loadData();
  };

  const WEEKDAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Screen style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.headerBar,
          {
            paddingHorizontal: space.lg,
            paddingTop: space.md,
            paddingBottom: space.sm,
            borderBottomColor: colors.hairline,
            borderBottomWidth: 1,
          },
        ]}
      >
        <Press
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={[styles.backButton, { minHeight: hit.min, minWidth: hit.min }]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Press>
        <Text style={[type.heading, { color: colors.text }]}>Recurring Rules</Text>
        <Button
          label="New Rule"
          variant="primary"
          onPress={() => router.push('/settings/recurring-edit')}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { padding: space.lg, gap: space.md }]}
      >
        {rules.length > 0 && (
          <View style={styles.topActionsRow}>
            <Text style={[type.caption, { color: colors.textSecondary }]}>
              {rules.length} {rules.length === 1 ? 'rule configured' : 'rules configured'}
            </Text>
            <Button
              label="Run Catch-up"
              variant="secondary"
              onPress={handleCatchUpNow}
            />
          </View>
        )}

        {rules.length === 0 && !isLoading ? (
          <EmptyState
            title="No recurring rules"
            description="Automate repeat expenses and income like rent, gym, or subscriptions."
            actionLabel="Add Recurring Rule"
            onAction={() => router.push('/settings/recurring-edit')}
          />
        ) : (
          rules.map((rule) => {
            const cat = categoriesMap.get(rule.categoryId);
            const frequencyLabel =
              rule.frequency === 'weekly'
                ? `Every ${WEEKDAY_NAMES[rule.day] ?? 'week'}`
                : `Every month on day ${rule.day}`;

            return (
              <Row
                key={rule.id}
                onPress={() =>
                  router.push({
                    pathname: '/settings/recurring-edit',
                    params: { id: rule.id },
                  })
                }
                leading={
                  <View
                    style={[
                      styles.iconBox,
                      {
                        backgroundColor: colors.surfaceMuted,
                        borderRadius: radius.md,
                      },
                    ]}
                  >
                    <Ionicons
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      name={(cat?.icon ?? 'repeat') as any}
                      size={20}
                      color={rule.active ? colors.primary : colors.textSecondary}
                    />
                  </View>
                }
                title={rule.note ? rule.note : cat?.name ?? 'Recurring Entry'}
                subtitle={`${frequencyLabel} • ${rule.active ? 'Active' : 'Paused'}`}
                trailing={
                  <View style={styles.trailingContainer}>
                    <MoneyText
                      amountMinor={rule.amountMinor}
                      currency={currency}
                      role="heading"
                      kind={rule.kind === 'expense' ? 'expense' : 'income'}
                      showSign
                    />
                    <Press
                      onPress={() => void handleToggleActive(rule)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={rule.active ? 'Pause rule' : 'Activate rule'}
                    >
                      <Ionicons
                        name={rule.active ? 'pause-circle-outline' : 'play-circle-outline'}
                        size={22}
                        color={rule.active ? colors.textSecondary : colors.primary}
                      />
                    </Press>
                  </View>
                }
              />
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {},
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconBox: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trailingContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
