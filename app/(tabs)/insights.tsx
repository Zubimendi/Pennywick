// app/(tabs)/insights.tsx
// Insights Screen (S6, T11) - Neo-Fintech Cost Management UI (inspired by modern Dribbble design).
// Features: Month traversal pill, Hero Spending with percentage delta pill, Smooth Spline Wave & Daily Activity charts,
// and Donut chart with pastel category indicators.

import React, { useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Screen,
  Button,
  MoneyText,
  EmptyState,
  Press,
  InsightsScreenSkeleton,
  SegmentedControl,
} from '@/ui/components';
import { useTheme } from '@/ui/theme/useTheme';
import { useInsightsData } from '@/features/insights/useInsightsData';
import { DonutChart } from '@/ui/charts/DonutChart';
import { DailyBarChart } from '@/ui/charts/DailyBarChart';
import { CurvedSplineChart, SplinePoint } from '@/ui/charts/CurvedSplineChart';
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
  const { colors, space, type, isDark } = useTheme();
  const [chartMode, setChartMode] = useState<'wave' | 'bars'>('wave');

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
      <Screen centerContent>
        <EmptyState
          title="Couldn't load insights"
          description={error.message || 'Please try refreshing.'}
          actionLabel="Try again"
          onAction={() => void refetch()}
        />
      </Screen>
    );
  }

  // Loading state with skeleton and centered spinner
  if (isLoading && totalExpenseMinor === 0 && categoryShares.length === 0) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <View style={styles.loadingWrapper}>
          <InsightsScreenSkeleton />
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.spinnerCenter}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          </View>
        </View>
      </Screen>
    );
  }

  const monthLabel = formatMonthLabel(monthKey);

  // Convert daily bars into spline milestone points
  const splineData: SplinePoint[] = [
    {
      xLabel: 'W1',
      value: dailyBars.slice(0, 7).reduce((acc, b) => acc + b.totalMinor, 0),
    },
    {
      xLabel: 'W2',
      value: dailyBars.slice(7, 14).reduce((acc, b) => acc + b.totalMinor, 0),
    },
    {
      xLabel: 'W3',
      value: dailyBars.slice(14, 21).reduce((acc, b) => acc + b.totalMinor, 0),
    },
    {
      xLabel: 'W4',
      value: dailyBars.slice(21, 28).reduce((acc, b) => acc + b.totalMinor, 0),
    },
    {
      xLabel: 'W5',
      value: dailyBars.slice(28).reduce((acc, b) => acc + b.totalMinor, 0),
    },
  ];

  return (
    <Screen scrollable>
      {/* Month Navigation Header Bar */}
      <View style={[styles.monthHeader, { paddingVertical: space.sm }]}>
        <Press
          onPress={goToPreviousMonth}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={[styles.arrowButton, { backgroundColor: colors.surfaceMuted }]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Press>

        <View style={[styles.monthPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={15} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.monthPillText, { color: colors.text }]}>{monthLabel}</Text>
        </View>

        <Press
          onPress={goToNextMonth}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          style={[styles.arrowButton, { backgroundColor: colors.surfaceMuted }]}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Press>
      </View>

      {/* Hero Spending Summary Card */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            marginTop: space.xs,
          },
        ]}
      >
        <Text style={[styles.heroCardLabel, { color: colors.textSecondary }]}>
          TOTAL SPENT IN {monthLabel.toUpperCase()}
        </Text>

        <MoneyText
          amountMinor={totalExpenseMinor}
          currency={currency}
          role="hero"
          style={styles.heroAmountText}
        />

        {/* Delta Comparison Pill */}
        {comparison.percentageChange > 0 ? (
          <View
            style={[
              styles.comparisonPill,
              {
                backgroundColor: comparison.isIncrease
                  ? isDark
                    ? 'rgba(239, 68, 68, 0.2)'
                    : '#FEE2E2'
                  : isDark
                    ? 'rgba(16, 185, 129, 0.2)'
                    : '#DCFCE7',
              },
            ]}
          >
            <Ionicons
              name={comparison.isIncrease ? 'trending-up' : 'trending-down'}
              size={14}
              color={comparison.isIncrease ? colors.danger : colors.primary}
            />
            <Text
              style={[
                styles.comparisonText,
                {
                  color: comparison.isIncrease ? colors.danger : colors.primary,
                },
              ]}
            >
              {comparison.label}
            </Text>
          </View>
        ) : (
          <Text style={[type.caption, { color: colors.textSecondary, marginTop: 4 }]}>
            {comparison.label}
          </Text>
        )}
      </View>

      {/* Empty Month Handling */}
      {totalExpenseMinor === 0 ? (
        <View style={{ marginTop: space.xl, paddingBottom: space.xl }}>
          <EmptyState
            title={`No spending in ${monthLabel}`}
            description="Log expenses for this month to see trends, charts, and category breakdown."
            actionLabel="Add Entry"
            onAction={() => router.push('/add')}
          />
        </View>
      ) : (
        <>
          {/* Spending Activity Section (Wave vs Daily Bar Toggle) */}
          <View
            style={[
              styles.chartCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                marginTop: space.lg,
              },
            ]}
          >
            <View style={styles.chartHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending Trajectory</Text>
              <View style={{ width: 130 }}>
                <SegmentedControl
                  variant="pill"
                  value={chartMode}
                  onChange={setChartMode}
                  options={[
                    { value: 'wave', label: 'Curve' },
                    { value: 'bars', label: 'Daily' },
                  ]}
                />
              </View>
            </View>

            {chartMode === 'wave' ? (
              <CurvedSplineChart
                data={splineData}
                currency={currency}
                height={140}
                width={330}
                lineColor={isDark ? '#60A5FA' : '#4F46E5'}
              />
            ) : (
              <DailyBarChart
                bars={dailyBars}
                maxDailyMinor={maxDailyMinor}
                currency={currency}
                height={130}
              />
            )}
          </View>

          {/* Category Breakdown & Donut Chart */}
          <View
            style={[
              styles.chartCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                marginTop: space.lg,
                marginBottom: space.xl,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>
              Spending by Category
            </Text>

            {/* Custom SVG Donut */}
            <DonutChart
              slices={categoryShares}
              totalMinor={totalExpenseMinor}
              currency={currency}
            />

            {/* Category Slices List */}
            <View style={{ marginTop: space.md, gap: space.sm }}>
              {categoryShares.map((slice, idx) => (
                <View
                  key={slice.id}
                  style={[
                    styles.sliceRow,
                    {
                      borderBottomColor: colors.hairline,
                      borderBottomWidth: idx < categoryShares.length - 1 ? StyleSheet.hairlineWidth : 0,
                      paddingVertical: 10,
                    },
                  ]}
                >
                  <View style={styles.sliceInfo}>
                    <View style={[styles.colorDot, { backgroundColor: slice.colorHex }]} />
                    <Text style={[styles.sliceName, { color: colors.text }]}>
                      {slice.name}
                    </Text>
                    <Text style={[styles.slicePercent, { color: colors.textSecondary }]}>
                      {slice.percentage}%
                    </Text>
                  </View>
                  <MoneyText
                    amountMinor={slice.totalMinor}
                    currency={currency}
                    kind="expense"
                    role="figure"
                    style={styles.sliceAmount}
                  />
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  arrowButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  monthPillText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  heroCard: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
    gap: 6,
  },
  heroCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  heroAmountText: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
  },
  comparisonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
    marginTop: 4,
  },
  comparisonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chartCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sliceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sliceName: {
    fontSize: 14,
    fontWeight: '600',
  },
  slicePercent: {
    fontSize: 12,
    fontWeight: '500',
  },
  sliceAmount: {
    fontSize: 14,
    fontWeight: '700',
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
