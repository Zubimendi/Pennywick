// app/(tabs)/budgets.tsx
// Budgets Screen (S7, T10)
// Precision Utility layout: month summary, progress bars with "N left" / "N over", status tiers (onTrack, watch, over).

import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import {
  Screen,
  Button,
  MoneyText,
  EmptyState,
} from '@/ui/components';
import { useTheme } from '@/ui/theme/useTheme';
import { useBudgetsData, EnrichedBudget } from '@/features/budgets/useBudgetsData';
import { BudgetCard } from '@/features/budgets/BudgetCard';
import { BudgetModal } from '@/features/budgets/BudgetModal';
import { formatMonthLabel } from '@/domain/dates';

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
      <Text style={[type.title, { color: colors.danger }]}>Budgets Error</Text>
      <Text style={[type.body, { color: colors.textSecondary }]}>
        {error.message || 'Pennywick encountered a problem loading budgets.'}
      </Text>
      <Button label="Retry" onPress={retry} variant="primary" />
    </View>
  );
}

export default function BudgetsScreen(): React.JSX.Element {
  const { colors, space, radius, type } = useTheme();

  const {
    isLoading,
    error,
    currency,
    monthKey,
    budgets,
    unbudgetedCategories,
    monthSummary,
    saveBudget,
    removeBudget,
    refetch,
  } = useBudgetsData();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<EnrichedBudget | null>(null);

  const handleOpenAdd = (): void => {
    setSelectedBudget(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (b: EnrichedBudget): void => {
    setSelectedBudget(b);
    setModalVisible(true);
  };

  // Error State
  if (error) {
    return (
      <Screen style={styles.centerContainer}>
        <EmptyState
          title="Couldn't load budgets"
          description={error.message || 'Please try refreshing.'}
          actionLabel="Try again"
          onAction={() => void refetch()}
        />
      </Screen>
    );
  }

  // Loading State
  if (isLoading && budgets.length === 0) {
    return (
      <Screen style={styles.centerContainer}>
        <Text style={[type.body, { color: colors.textSecondary }]}>Loading budgets...</Text>
      </Screen>
    );
  }

  const isOverallOver = monthSummary.totalRemainingMinor < 0;
  const overallFillPercent = `${Math.min(100, monthSummary.overallPercentage)}%` as `${number}%`;

  return (
    <Screen style={styles.container}>
      {/* Header Bar */}
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
        <View>
          <Text style={[type.title, { color: colors.text }]}>Budgets</Text>
          <Text style={[type.caption, { color: colors.textSecondary }]}>
            {formatMonthLabel(monthKey)}
          </Text>
        </View>
        {unbudgetedCategories.length > 0 && (
          <Button
            label="Add Budget"
            variant="primary"
            onPress={handleOpenAdd}
          />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { padding: space.lg, gap: space.lg }]}
      >
        {/* Month Summary Card (if any budgets exist) */}
        {budgets.length > 0 && (
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                padding: space.lg,
                gap: space.md,
                borderWidth: 1,
                borderColor: colors.hairline,
              },
            ]}
          >
            <View style={styles.summaryTopRow}>
              <View>
                <Text style={[type.caption, { color: colors.textSecondary }]}>
                  {isOverallOver ? 'Total Over Budget' : 'Total Remaining'}
                </Text>
                <MoneyText
                  amountMinor={Math.abs(monthSummary.totalRemainingMinor)}
                  currency={currency}
                  role="title"
                  kind={isOverallOver ? 'expense' : 'neutral'}
                />
              </View>
              <View style={styles.summaryMeta}>
                <Text style={[type.caption, { color: colors.textSecondary }]}>
                  {monthSummary.overallPercentage}% used
                </Text>
              </View>
            </View>

            {/* Overall Progress Bar */}
            <View
              style={[
                styles.summaryTrack,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radius.pill,
                },
              ]}
            >
              <View
                style={[
                  styles.summaryFill,
                  {
                    width: overallFillPercent,
                    backgroundColor: isOverallOver
                      ? colors.danger
                      : monthSummary.overallPercentage >= 80
                        ? colors.warning
                        : colors.primary,
                    borderRadius: radius.pill,
                  },
                ]}
              />
            </View>

            {/* Total Budgeted vs Spent Breakdown */}
            <View style={styles.summaryBreakdown}>
              <View>
                <Text style={[type.caption, { color: colors.textSecondary }]}>Spent</Text>
                <MoneyText
                  amountMinor={monthSummary.totalSpentMinor}
                  currency={currency}
                  role="heading"
                />
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[type.caption, { color: colors.textSecondary }]}>Budgeted</Text>
                <MoneyText
                  amountMinor={monthSummary.totalBudgetedMinor}
                  currency={currency}
                  role="heading"
                />
              </View>
            </View>
          </View>
        )}

        {/* Budgets List or Empty State */}
        {budgets.length === 0 ? (
          <EmptyState
            title="No budgets set"
            description="Set spending limits for your categories to track monthly goals."
            actionLabel="Create Budget"
            onAction={handleOpenAdd}
          />
        ) : (
          <View style={{ gap: space.md }}>
            <Text style={[type.label, { color: colors.textSecondary }]}>
              Category Limits ({budgets.length})
            </Text>
            {budgets.map((b) => (
              <BudgetCard
                key={b.id}
                budget={b}
                currency={currency}
                onPress={() => handleOpenEdit(b)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Set / Edit Budget Modal */}
      <BudgetModal
        visible={modalVisible}
        budget={selectedBudget}
        unbudgetedCategories={unbudgetedCategories}
        currency={currency}
        onClose={() => setModalVisible(false)}
        onSave={saveBudget}
        onDelete={removeBudget}
      />
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
  scroll: {
    flex: 1,
  },
  content: {},
  summaryCard: {},
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  summaryMeta: {
    alignItems: 'flex-end',
  },
  summaryTrack: {
    height: 8,
    width: '100%',
    overflow: 'hidden',
  },
  summaryFill: {
    height: '100%',
  },
  summaryBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
