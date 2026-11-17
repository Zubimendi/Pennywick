// app/(tabs)/insights.tsx
// Insights Screen (S6, T11)
// Precision Utility layout: month picker, custom SVG donut and daily bars, previous month comparison.

import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Screen,
  Button,
  MoneyText,
  EmptyState,
  Press,
} from '@/ui/components';
import { useTheme } from '@/ui/theme/useTheme';
import { useInsightsData } from '@/features/insights/useInsightsData';
import { DonutChart } from '@/ui/charts/DonutChart';
import { DailyBarChart } from '@/ui/charts/DailyBarChart';
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
      <Text style={[type.title, { color: colors.danger }]}>Insights Error</Text>
      <Text style={[type.body, { color: colors.textSecondary }]}>
        {error.message || 'Pennywick encountered a problem loading insights.'}
      </Text>
      <Button label="Retry" onPress={retry} variant="primary" />
    </View>
  );
}

export default function InsightsScreen(): React.JSX.Element {
  const router = useRouter();
  const { colors, space, radius, type, hit } = useTheme();

  const {
    isLoading,
    error,
    currency,
    monthKey,
    totalExpenseMinor,
    comparison,
    categoryShares,
    dailyBars,
    maxDailyMinor,
    goToPreviousMonth,
    goToNextMonth,
    refetch,
  } = useInsightsData();

  if (error) {
    return (
      <Screen style={styles.centerContainer}>
        <EmptyState
          title="Couldn't load insights"
          description={error.message || 'Please try refreshing.'}
          actionLabel="Try again"
          onAction={() => void refetch()}
        />
      </Screen>
    );
  }

  if (isLoading && totalExpenseMinor === 0 && categoryShares.length === 0) {
    return (
      <Screen style={styles.centerContainer}>
        <Text style={[type.body, { color: colors.textSecondary }]}>Loading insights...</Text>
      </Screen>
    );
  }

  const monthLabel = formatMonthLabel(monthKey);

  return (
    <Screen style={styles.container}>
      {/* Month Navigation Header */}
      <View
        style={[
          styles.monthHeader,
          {
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            borderBottomColor: colors.hairline,
            borderBottomWidth: 1,
          },
        ]}
      >
        <Press
          onPress={goToPreviousMonth}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={[styles.arrowButton, { minHeight: hit.min, minWidth: hit.min }]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Press>

        <Text style={[type.heading, { color: colors.text }]}>{monthLabel}</Text>

        <Press
          onPress={goToNextMonth}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          style={[styles.arrowButton, { minHeight: hit.min, minWidth: hit.min }]}
        >
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </Press>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { padding: space.lg, gap: space.xl }]}
      >
        {/* Hero Spending & Comparison Card */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: space.lg,
              gap: space.sm,
              borderWidth: 1,
              borderColor: colors.hairline,
            },
          ]}
        >
          <Text style={[type.caption, { color: colors.textSecondary }]}>
            Total Spent in {monthLabel}
          </Text>
          <MoneyText
            amountMinor={totalExpenseMinor}
            currency={currency}
            role="hero"
          />

          {/* Comparison Delta */}
          <View style={styles.comparisonRow}>
            {comparison.percentageChange > 0 && (
              <Ionicons
                name={comparison.isIncrease ? 'trending-up' : 'trending-down'}
                size={16}
                color={comparison.isIncrease ? colors.danger : colors.primary}
              />
            )}
            <Text
              style={[
                type.caption,
                {
                  color:
                    comparison.percentageChange > 0
                      ? comparison.isIncrease
                        ? colors.danger
                        : colors.primary
                      : colors.textSecondary,
                  fontWeight: '600',
                },
              ]}
            >
              {comparison.label}
            </Text>
          </View>
        </View>

        {/* Empty Month Handling */}
        {totalExpenseMinor === 0 ? (
          <EmptyState
            title={`No spending recorded in ${monthLabel}`}
            description="Log expenses to see distribution and daily activity."
            actionLabel="Add Entry"
            onAction={() => router.push('/add')}
          />
        ) : (
          <>
            {/* Daily Spending Bar Chart */}
            <View
              style={[
                styles.chartSection,
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
              <Text style={[type.label, { color: colors.textSecondary }]}>
                Daily Spending Activity
              </Text>
              <DailyBarChart
                bars={dailyBars}
                maxDailyMinor={maxDailyMinor}
                currency={currency}
                height={130}
              />
            </View>

            {/* Category Breakdown & Donut Chart */}
            <View
              style={[
                styles.chartSection,
                {
                  backgroundColor: colors.surface,
                  borderRadius: radius.md,
                  padding: space.lg,
                  gap: space.lg,
                  borderWidth: 1,
                  borderColor: colors.hairline,
                },
              ]}
            >
              <Text style={[type.label, { color: colors.textSecondary }]}>
                Spending by Category
              </Text>

              {/* Custom SVG Donut */}
              <DonutChart
                slices={categoryShares}
                totalMinor={totalExpenseMinor}
                currency={currency}
                size={190}
                strokeWidth={22}
              />

              {/* Category Breakdown Table */}
              <View style={{ gap: space.sm }}>
                {categoryShares.map((slice) => (
                  <View
                    key={slice.id}
                    style={[
                      styles.sliceRow,
                      {
                        borderBottomColor: colors.hairline,
                        paddingVertical: space.xs,
                      },
                    ]}
                  >
                    <View style={styles.sliceInfo}>
                      <View
                        style={[
                          styles.colorDot,
                          {
                            backgroundColor: slice.colorHex,
                            borderRadius: radius.pill,
                          },
                        ]}
                      />
                      <Text style={[type.body, { color: colors.text }]}>{slice.name}</Text>
                      <Text style={[type.caption, { color: colors.textSecondary }]}>
                        {slice.percentage}%
                      </Text>
                    </View>

                    <MoneyText
                      amountMinor={slice.totalMinor}
                      currency={currency}
                      role="body"
                    />
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  arrowButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {},
  heroCard: {},
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  chartSection: {},
  sliceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sliceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
