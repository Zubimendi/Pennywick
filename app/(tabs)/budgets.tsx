// app/(tabs)/budgets.tsx
// Budgets Screen (S7, T10) - Neo-Fintech Cost Management UI (inspired by Dribbble Screen 1 & 3).
// Features: Month selector pill dropdown, Hero Gradient Budget Card (LEFT $X of $Y, daily spend rate, progress bar),
// Saving Goal callout card, pastel cards carousel, and grouped category breakdown table.

import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Screen,
  Button,
  MoneyText,
  EmptyState,
  Press,
  BudgetsScreenSkeleton,
  HeroGradientCard,
  PastelBudgetCard,
  ActionCalloutCard,
} from '@/ui/components';
import { useTheme } from '@/ui/theme/useTheme';
import { useBudgetsData, EnrichedBudget } from '@/features/budgets/useBudgetsData';
import { BudgetModal } from '@/features/budgets/BudgetModal';
import { formatMonthLabel } from '@/domain/dates';
import { formatMoney } from '@/domain/money';

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
  const { colors, space } = useTheme();

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
      <Screen centerContent>
        <EmptyState
          title="Couldn't load budgets"
          description={error.message || 'Please try refreshing.'}
          actionLabel="Try again"
          onAction={() => void refetch()}
        />
      </Screen>
    );
  }

  // Loading State with skeleton and centered spinner
  if (isLoading && budgets.length === 0) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <View style={styles.loadingWrapper}>
          <BudgetsScreenSkeleton />
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.spinnerCenter}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          </View>
        </View>
      </Screen>
    );
  }

  // Days pace calculation
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const daysRemaining = Math.max(0, daysInMonth - currentDay);
  const dailyRemainingMinor =
    daysRemaining > 0 && monthSummary.totalRemainingMinor > 0
      ? Math.round(monthSummary.totalRemainingMinor / daysRemaining)
      : 0;

  const sublineText =
    monthSummary.totalRemainingMinor >= 0
      ? `${daysRemaining} more days · ${formatMoney(dailyRemainingMinor, currency)}/day`
      : `Exceeded budget by ${formatMoney(Math.abs(monthSummary.totalRemainingMinor), currency)}`;

  const isOverallOver = monthSummary.totalRemainingMinor < 0;

  return (
    <Screen scrollable>
      {/* Top Header Bar (Dribbble Screen 1) */}
      <View style={[styles.headerBar, { paddingVertical: space.sm }]}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.text }]}>My Budget</Text>
          <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
            {formatMonthLabel(monthKey)}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          {unbudgetedCategories.length > 0 && (
            <Press
              onPress={handleOpenAdd}
              style={[styles.addPillButton, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Add Budget"
            >
              <Ionicons name="add" size={16} color={colors.onPrimary} />
              <Text style={[styles.addPillText, { color: colors.onPrimary }]}>Add</Text>
            </Press>
          )}
        </View>
      </View>

      {/* Hero Budget Gradient Card (Dribbble Screen 1) */}
      <View style={{ marginTop: space.xs }}>
        <HeroGradientCard
          primaryLabel={isOverallOver ? 'OVER' : 'LEFT'}
          primaryAmountMinor={Math.abs(monthSummary.totalRemainingMinor)}
          currency={currency}
          secondaryLabel="OF"
          secondaryAmountMinor={monthSummary.totalBudgetedMinor}
          subline={sublineText}
          badgeText="Budget"
          actionText={unbudgetedCategories.length > 0 ? '+ New' : undefined}
          onActionPress={unbudgetedCategories.length > 0 ? handleOpenAdd : undefined}
          progressPercent={monthSummary.overallPercentage}
          progressColor={isOverallOver ? '#F87171' : '#60A5FA'}
        />
      </View>

      {/* "Create a saving goal" Callout Card (Dribbble Screen 1) */}
      <View style={{ marginTop: space.lg }}>
        <ActionCalloutCard
          title="Create a saving goal"
          description="Plan ahead your expenses. Use each category to save even more."
          iconName="sparkles"
          onPress={unbudgetedCategories.length > 0 ? handleOpenAdd : () => {}}
        />
      </View>

      {/* "Your Budgets" Pastel Cards Carousel (Dribbble Screen 3) */}
      {budgets.length > 0 && (
        <View style={{ marginTop: space.lg }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Budgets</Text>
            <Text style={[styles.categoryCountBadge, { color: colors.textSecondary }]}>
              {budgets.length} active
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.pastelScroll, { gap: space.sm }]}
          >
            {budgets.map((b, idx) => (
              <PastelBudgetCard
                key={b.id}
                compact
                categoryName={b.categoryName}
                categoryIcon={b.categoryIcon}
                amountMinor={Math.abs(b.remainingMinor)}
                currency={currency}
                amountLabel={b.status === 'over' ? 'over' : 'left'}
                progressPercent={Math.round(b.percentageUsed * 100)}
                colorIndex={idx}
                onPress={() => handleOpenEdit(b)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Grouped Category Breakdown Table (Dribbble Screen 1 Bottom) */}
      <View style={{ marginTop: space.lg }}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>
          Category Breakdown
        </Text>

        {budgets.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <EmptyState
              title="No budgets set yet"
              description="Set spending limits for your categories to start tracking monthly targets."
              actionLabel="Create First Budget"
              onAction={handleOpenAdd}
            />
          </View>
        ) : (
          <View
            style={[
              styles.tableContainer,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {/* Table Header Row */}
            <View
              style={[
                styles.tableHeaderRow,
                { borderBottomColor: colors.hairline, borderBottomWidth: 1 },
              ]}
            >
              <Text style={[styles.tableColHeader, { flex: 2, color: colors.textSecondary }]}>
                CATEGORY
              </Text>
              <Text
                style={[
                  styles.tableColHeader,
                  { flex: 1.2, textAlign: 'right', color: colors.textSecondary },
                ]}
              >
                BUDGETED
              </Text>
              <Text
                style={[
                  styles.tableColHeader,
                  { flex: 1.2, textAlign: 'right', color: colors.textSecondary },
                ]}
              >
                AVAILABLE
              </Text>
            </View>

            {/* Table Rows */}
            {budgets.map((b, idx) => {
              const isOver = b.status === 'over';
              return (
                <Press
                  key={b.id}
                  onPress={() => handleOpenEdit(b)}
                  style={[
                    styles.tableRow,
                    {
                      borderBottomWidth: idx < budgets.length - 1 ? StyleSheet.hairlineWidth : 0,
                      borderBottomColor: colors.hairline,
                    },
                  ]}
                >
                  {/* Category Info with Icon */}
                  <View style={styles.tableCategoryCol}>
                    <View
                      style={[
                        styles.tableIconBox,
                        {
                          backgroundColor: colors.surfaceMuted,
                        },
                      ]}
                    >
                      <Ionicons
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        name={(b.categoryIcon || 'wallet-outline') as any}
                        size={16}
                        color={colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tableCatName, { color: colors.text }]} numberOfLines={1}>
                        {b.categoryName}
                      </Text>
                      <Text style={[styles.tableCatSub, { color: colors.textSecondary }]}>
                        {Math.round(b.percentageUsed * 100)}% used
                      </Text>
                    </View>
                  </View>

                  {/* Budgeted Column */}
                  <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                    <MoneyText
                      amountMinor={b.limitMinor}
                      currency={currency}
                      role="body"
                      style={styles.tableAmountText}
                    />
                  </View>

                  {/* Available Column */}
                  <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                    <MoneyText
                      amountMinor={Math.abs(b.remainingMinor)}
                      currency={currency}
                      kind={isOver ? 'expense' : 'income'}
                      showSign={isOver}
                      role="body"
                      style={[
                        styles.tableAmountText,
                        { color: isOver ? colors.danger : colors.primary },
                      ]}
                    />
                  </View>
                </Press>
              );
            })}
          </View>
        )}
      </View>

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
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  screenSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 1,
  },
  addPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 4,
  },
  addPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  categoryCountBadge: {
    fontSize: 13,
    fontWeight: '500',
  },
  pastelScroll: {
    paddingVertical: 4,
  },
  emptyCard: {
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
  },
  tableContainer: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  tableColHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  tableCategoryCol: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tableIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCatName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  tableCatSub: {
    fontSize: 11,
    fontWeight: '400',
  },
  tableAmountText: {
    fontSize: 14,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingWrapper: {
    flex: 1,
  },
  spinnerCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
