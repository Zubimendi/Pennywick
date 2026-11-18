// app/(tabs)/index.tsx
// Home Screen (S2) - Neo-Fintech Cost Management UI (inspired by modern Dribbble design).
// Features: top bar with month dropdown pill, timeframe segmented pills, Hero Gradient Card with working balance & days remaining,
// smooth Spline Curve trend chart, horizontal Pastel Budget Cards, Saving Goal callout card, and recent transactions.

import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Screen,
  MoneyText,
  Button,
  EmptyState,
  Press,
  SyncChip,
  HomeScreenSkeleton,
  HeroGradientCard,
  PastelBudgetCard,
  ActionCalloutCard,
  SegmentedControl,
} from '@/ui/components';
import { CurvedSplineChart } from '@/ui/charts';
import { useTheme } from '@/ui/theme/useTheme';
import { useUiStore } from '@/ui/theme/uiStore';
import { useHomeData } from '@/features/home/useHomeData';
import { formatMonthLabel } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { syncEngine, type SyncEngineState } from '@/sync/engine';

export default function HomeScreen(): React.JSX.Element {
  const router = useRouter();
  const { colors, space, type, isDark } = useTheme();
  const privacyEnabled = useUiStore((state) => state.privacyEnabled);
  const togglePrivacy = useUiStore((state) => state.togglePrivacy);
  const [syncState, setSyncState] = useState<SyncEngineState>(syncEngine.getState());
  const [timeframe, setTimeframe] = useState<'day' | 'month' | 'year'>('month');

  React.useEffect(() => {
    return syncEngine.subscribe(setSyncState);
  }, []);

  const {
    isLoading,
    error,
    currency,
    monthKey,
    spentThisMonthMinor,
    incomeThisMonthMinor,
    leftMinor,
    isEmpty,
    urgentBudgets,
    recentEntries,
    trendPoints,
    refetch,
  } = useHomeData();

  // Calculate days remaining in month and daily spend pace
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const daysRemaining = Math.max(0, daysInMonth - currentDay);
  const dailySpendMinor = currentDay > 0 ? Math.round(spentThisMonthMinor / currentDay) : 0;
  const daysRemainingStr = `${daysRemaining} more days · ${formatMoney(dailySpendMinor, currency)}/day`;

  // Spent ratio for progress bar
  const spentRatio =
    incomeThisMonthMinor > 0
      ? Math.min(100, Math.round((spentThisMonthMinor / incomeThisMonthMinor) * 100))
      : Math.min(100, Math.round((spentThisMonthMinor / 100000) * 10));

  // 1. Error State
  if (error) {
    return (
      <Screen centerContent>
        <EmptyState
          title="Couldn't load spending summary"
          description={error.message || 'Please try refreshing.'}
          actionLabel="Retry"
          onAction={refetch}
        />
      </Screen>
    );
  }

  // 2. Loading State: Centered loading spinner with skeleton outline
  if (isLoading) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <View style={styles.loadingWrapper}>
          <HomeScreenSkeleton />
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.spinnerCenter}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          </View>
        </View>
      </Screen>
    );
  }

  // 3. Top Header Bar (Unified for empty and populated states)
  const renderHeader = () => (
    <View style={[styles.header, { paddingVertical: space.sm }]}>
      {/* Left: 4-dot menu icon + Sync pill */}
      <View style={styles.headerLeft}>
        <Press
          onPress={() => router.push('/settings/sync')}
          hitSlop={space.sm}
          accessibilityRole="button"
          accessibilityLabel="Sync and menu"
          style={[styles.iconButton, { backgroundColor: colors.surfaceMuted, borderRadius: 12, width: 38, height: 38 }]}
        >
          <Ionicons name="grid-outline" size={18} color={colors.text} />
        </Press>
        <SyncChip
          status={syncState.status}
          pendingCount={syncState.pendingCount}
          onPress={() => router.push('/settings/sync')}
        />
      </View>

      {/* Center: Month Selector Dropdown Pill */}
      <Press
        onPress={() => router.push('/(tabs)/insights')}
        style={[styles.monthPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
        accessibilityRole="button"
        accessibilityLabel={`Selected month: ${formatMonthLabel(monthKey)}`}
      >
        <Text style={[styles.monthPillText, { color: colors.text }]}>
          {formatMonthLabel(monthKey)}
        </Text>
        <Ionicons name="chevron-down" size={13} color={colors.textSecondary} style={{ marginLeft: 3 }} />
      </Press>

      {/* Right: Privacy & Settings */}
      <View style={[styles.headerIcons, { gap: space.xs }]}>
        <Press
          onPress={togglePrivacy}
          hitSlop={space.sm}
          accessibilityRole="button"
          accessibilityLabel={privacyEnabled ? 'Show amounts' : 'Hide amounts'}
          style={[styles.iconButton, { width: 38, height: 38, backgroundColor: colors.surfaceMuted, borderRadius: 12 }]}
        >
          <Ionicons
            name={privacyEnabled ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={colors.textSecondary}
          />
        </Press>
        <Press
          onPress={() => router.push('/settings')}
          hitSlop={space.sm}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={[styles.iconButton, { width: 38, height: 38, backgroundColor: colors.surfaceMuted, borderRadius: 12 }]}
        >
          <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
        </Press>
      </View>
    </View>
  );

  // 4. Empty State (no transactions logged yet)
  if (isEmpty) {
    return (
      <Screen scrollable>
        {renderHeader()}

        {/* Timeframe pill control */}
        <View style={{ marginVertical: space.xs }}>
          <SegmentedControl
            variant="pill"
            value={timeframe}
            onChange={setTimeframe}
            options={[
              { value: 'day', label: 'Day' },
              { value: 'month', label: 'Month' },
              { value: 'year', label: 'Yearly' },
            ]}
          />
        </View>

        {/* Hero Card with clean zero state */}
        <View style={{ marginTop: space.sm }}>
          <HeroGradientCard
            primaryLabel="Working Balance"
            primaryAmountMinor={0}
            currency={currency}
            secondaryLabel="Spent"
            secondaryAmountMinor={0}
            subline="0 expenses logged this month"
            badgeText="Budget"
            actionText="Quick Add +"
            onActionPress={() => router.push('/add')}
          />
        </View>

        {/* Action Callout Card */}
        <View style={{ marginTop: space.lg }}>
          <ActionCalloutCard
            title="Create a saving goal"
            description="Plan ahead your expenses. Use each category to save even more."
            iconName="sparkles"
            onPress={() => router.push('/(tabs)/budgets')}
          />
        </View>

        {/* Empty State Banner */}
        <View style={[styles.emptyWrapper, { marginTop: space.xl, paddingBottom: space.xl }]}>
          <EmptyState
            title="Nothing logged yet"
            description="Start tracking your expenses in seconds. All data stays private on this phone."
            icon={
              <Ionicons name="wallet-outline" size={52} color={colors.primary} />
            }
            actionLabel="Add your first expense"
            onAction={() => router.push('/add')}
          />
        </View>
      </Screen>
    );
  }

  // 5. Populated State
  return (
    <Screen scrollable>
      {renderHeader()}

      {/* Timeframe pill control (Dribbble Screen 3) */}
      <View style={{ marginVertical: space.xs }}>
        <SegmentedControl
          variant="pill"
          value={timeframe}
          onChange={setTimeframe}
          options={[
            { value: 'day', label: 'Day' },
            { value: 'month', label: 'Month' },
            { value: 'year', label: 'Yearly' },
          ]}
        />
      </View>

      {/* Hero Gradient Card (Dribbble Screen 1 & 3) */}
      <View style={{ marginTop: space.xs }}>
        <HeroGradientCard
          primaryLabel="Working Balance"
          primaryAmountMinor={leftMinor}
          currency={currency}
          secondaryLabel="Spent"
          secondaryAmountMinor={spentThisMonthMinor}
          subline={daysRemainingStr}
          badgeText="Budget"
          onBadgePress={() => router.push('/(tabs)/budgets')}
          actionText="Details ›"
          onActionPress={() => router.push('/(tabs)/budgets')}
          progressPercent={spentRatio}
        />
      </View>

      {/* Spending Trend Curve Section (Dribbble Screen 3) */}
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
        <View style={styles.chartHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending Trend</Text>
          <View style={[styles.chartBadge, { backgroundColor: colors.surfaceMuted }]}>
            <Text style={[styles.chartBadgeText, { color: colors.primary }]}>
              {formatMonthLabel(monthKey)}
            </Text>
          </View>
        </View>

        <CurvedSplineChart
          data={
            trendPoints.length > 0
              ? trendPoints
              : [
                  { xLabel: 'W1', value: 0 },
                  { xLabel: 'W2', value: 0 },
                  { xLabel: 'W3', value: 0 },
                  { xLabel: 'W4', value: 0 },
                  { xLabel: 'W5', value: 0 },
                ]
          }
          currency={currency}
          height={140}
          width={330}
          lineColor={isDark ? '#60A5FA' : '#3B82F6'}
        />
      </View>

      {/* "Your Budgets" Section with Pastel Cards (Dribbble Screen 3) */}
      <View style={{ marginTop: space.lg }}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Budgets</Text>
          <Press
            onPress={() => router.push('/(tabs)/budgets')}
            accessibilityRole="button"
            accessibilityLabel="View all budgets"
          >
            <Text style={[styles.seeAllText, { color: colors.primary }]}>View all ›</Text>
          </Press>
        </View>

        {urgentBudgets.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.horizontalCardScroll, { gap: space.sm }]}
          >
            {urgentBudgets.map((b, idx) => (
              <PastelBudgetCard
                key={b.id}
                compact
                categoryName={b.categoryName}
                categoryIcon="wallet-outline"
                amountMinor={Math.abs(b.remainingMinor)}
                currency={currency}
                amountLabel={b.status === 'over' ? 'over' : 'left'}
                progressPercent={Math.round(b.percentageUsed * 100)}
                colorIndex={idx}
                onPress={() => router.push('/(tabs)/budgets')}
              />
            ))}
          </ScrollView>
        ) : (
          <View
            style={[
              styles.emptyBudgetsCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[type.body, { color: colors.textSecondary }]}>
              No monthly budget set yet.
            </Text>
            <Press onPress={() => router.push('/(tabs)/budgets')}>
              <Text style={[styles.seeAllText, { color: colors.primary, marginTop: 4 }]}>
                + Set up budget
              </Text>
            </Press>
          </View>
        )}
      </View>

      {/* "Create a saving goal" Callout Card (Dribbble Screen 1) */}
      <View style={{ marginTop: space.md }}>
        <ActionCalloutCard
          title="Create a saving goal"
          description="Plan ahead your expenses. Use each category to save even more."
          iconName="sparkles"
          onPress={() => router.push('/(tabs)/budgets')}
        />
      </View>

      {/* "Recent Transactions" Section (Dribbble clean list) */}
      <View style={{ marginTop: space.lg }}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
          <Press
            onPress={() => router.push('/(tabs)/history')}
            accessibilityRole="button"
            accessibilityLabel="See all transactions"
          >
            <Text style={[styles.seeAllText, { color: colors.primary }]}>See all ›</Text>
          </Press>
        </View>

        <View
          style={[
            styles.txCardContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {recentEntries.map((tx, idx) => (
            <View
              key={tx.id}
              style={[
                styles.txRow,
                {
                  borderBottomWidth: idx < recentEntries.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: colors.hairline,
                },
              ]}
            >
              {/* Pastel icon container */}
              <View
                style={[
                  styles.txIconBox,
                  {
                    backgroundColor: colors.surfaceMuted,
                  },
                ]}
              >
                <Ionicons
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  name={(tx.categoryIcon || 'card-outline') as any}
                  size={18}
                  color={colors.primary}
                />
              </View>

              {/* Title & subtitle */}
              <View style={styles.txInfo}>
                <Text style={[styles.txTitle, { color: colors.text }]} numberOfLines={1}>
                  {tx.note || tx.categoryName}
                </Text>
                <Text style={[styles.txSubtitle, { color: colors.textSecondary }]}>
                  {tx.occurredOn} · {tx.categoryName}
                </Text>
              </View>

              {/* Amount */}
              <MoneyText
                amountMinor={tx.amountMinor}
                currency={currency}
                kind={tx.kind}
                showSign
                role="figure"
                style={styles.txAmount}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Quick Add Floating / Bottom CTA */}
      <View style={{ marginTop: space.xl, marginBottom: space.md }}>
        <Button
          label="Log new entry"
          variant="primary"
          leading={<Ionicons name="add" size={20} color={colors.onPrimary} />}
          onPress={() => router.push('/add')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  monthPillText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
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
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chartCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chartBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chartBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  horizontalCardScroll: {
    paddingVertical: 4,
  },
  emptyBudgetsCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
  },
  txCardContainer: {
    borderRadius: 22,
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  txIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: {
    flex: 1,
    gap: 2,
  },
  txTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  txSubtitle: {
    fontSize: 12,
    fontWeight: '400',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
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
