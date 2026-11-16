// app/(tabs)/index.tsx
// Home Screen (S2)
// Precision Utility layout: hero amount, budget strip, top categories, recent entries.
// Four states: loading, empty, populated, error.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Screen,
  MoneyText,
  Button,
  EmptyState,
  Press,
  Row,
} from '@/ui/components';
import { useTheme } from '@/ui/theme/useTheme';
import { useUiStore } from '@/ui/theme/uiStore';
import { useHomeData } from '@/features/home/useHomeData';
import { formatMonthLabel } from '@/domain/dates';

export default function HomeScreen(): React.JSX.Element {
  const router = useRouter();
  const { colors, space, type, hit } = useTheme();
  const privacyEnabled = useUiStore((state) => state.privacyEnabled);
  const togglePrivacy = useUiStore((state) => state.togglePrivacy);

  const {
    isLoading,
    error,
    currency,
    monthKey,
    spentThisMonthMinor,
    incomeThisMonthMinor,
    leftMinor,
    isEmpty,
    topCategories,
    urgentBudgets,
    recentEntries,
    refetch,
  } = useHomeData();

  // 1. Error State
  if (error) {
    return (
      <Screen style={styles.centerContainer}>
        <EmptyState
          title="Couldn't load spending summary"
          description={error.message || 'Please try refreshing.'}
          actionLabel="Retry"
          onAction={refetch}
        />
      </Screen>
    );
  }

  // 2. Loading State
  if (isLoading) {
    return (
      <Screen style={styles.centerContainer}>
        <View style={{ gap: space.md, alignItems: 'center' }}>
          <Text style={[type.body, { color: colors.textSecondary }]}>Loading summary...</Text>
        </View>
      </Screen>
    );
  }

  // 3. Empty State (no transactions logged yet)
  if (isEmpty) {
    return (
      <Screen>
        {/* Top Header */}
        <View style={[styles.header, { paddingVertical: space.md }]}>
          <Text style={[type.title, { color: colors.text }]}>
            {formatMonthLabel(monthKey)}
          </Text>
          <View style={[styles.headerIcons, { gap: space.sm }]}>
            <Press
              onPress={togglePrivacy}
              hitSlop={space.sm}
              accessibilityRole="button"
              accessibilityLabel={privacyEnabled ? 'Show amounts' : 'Hide amounts'}
              style={[styles.iconButton, { minWidth: hit.min, minHeight: hit.min }]}
            >
              <Ionicons
                name={privacyEnabled ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={colors.textSecondary}
              />
            </Press>
            <Press
              onPress={() => router.push('/settings')}
              hitSlop={space.sm}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={[styles.iconButton, { minWidth: hit.min, minHeight: hit.min }]}
            >
              <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
            </Press>
          </View>
        </View>

        <View style={[styles.emptyWrapper, { marginTop: space.xxl }]}>
          <EmptyState
            title="Nothing logged yet"
            description="Start tracking your expenses in seconds. All data stays private on this phone."
            icon={
              <Ionicons name="wallet-outline" size={56} color={colors.primary} />
            }
            actionLabel="Add your first expense"
            onAction={() => router.push('/add')}
          />
        </View>
      </Screen>
    );
  }

  // 4. Populated State
  return (
    <Screen scrollable>
      {/* Header */}
      <View style={[styles.header, { paddingVertical: space.sm }]}>
        <Text style={[type.title, { color: colors.text }]}>
          {formatMonthLabel(monthKey)}
        </Text>
        <View style={[styles.headerIcons, { gap: space.sm }]}>
          <Press
            onPress={togglePrivacy}
            hitSlop={space.sm}
            accessibilityRole="button"
            accessibilityLabel={privacyEnabled ? 'Show amounts' : 'Hide amounts'}
            style={[styles.iconButton, { minWidth: hit.min, minHeight: hit.min }]}
          >
            <Ionicons
              name={privacyEnabled ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.textSecondary}
            />
          </Press>
          <Press
            onPress={() => router.push('/settings')}
            hitSlop={space.sm}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={[styles.iconButton, { minWidth: hit.min, minHeight: hit.min }]}
          >
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
          </Press>
        </View>
      </View>

      {/* Hero Section */}
      <View
        style={[
          styles.heroBlock,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            padding: space.lg,
            gap: space.xs,
          },
        ]}
      >
        <Text style={[type.label, { color: colors.textSecondary }]}>
          Spent this month
        </Text>
        <MoneyText
          amountMinor={spentThisMonthMinor}
          currency={currency}
          kind="expense"
          role="hero"
        />
        <View style={[styles.heroSubline, { gap: space.lg, marginTop: space.xs }]}>
          <Text style={[type.body, { color: colors.textSecondary }]}>
            Income:{' '}
            <MoneyText
              amountMinor={incomeThisMonthMinor}
              currency={currency}
              kind="income"
            />
          </Text>
          <Text style={[type.body, { color: colors.textSecondary }]}>
            Left:{' '}
            <MoneyText
              amountMinor={leftMinor}
              currency={currency}
              kind={leftMinor >= 0 ? 'income' : 'expense'}
            />
          </Text>
        </View>
      </View>

      {/* Budget Strip (if any active budgets) */}
      {urgentBudgets.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <View style={styles.sectionHeader}>
            <Text style={[type.label, { color: colors.textSecondary }]}>
              BUDGET WATCH
            </Text>
            <Press onPress={() => router.push('/(tabs)/budgets')}>
              <Text style={[type.caption, { color: colors.primary }]}>View all</Text>
            </Press>
          </View>
          <View
            style={[
              styles.budgetList,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                padding: space.md,
                gap: space.md,
              },
            ]}
          >
            {urgentBudgets.map((b) => {
              const barColor =
                b.status === 'over'
                  ? colors.danger
                  : b.status === 'watch'
                    ? colors.warning
                    : colors.primary;

              const progressWidth = Math.min(100, Math.round(b.percentageUsed * 100));

              return (
                <View key={b.id} style={{ gap: space.xs }}>
                  <View style={styles.budgetRow}>
                    <Text style={[type.heading, { color: colors.text }]}>
                      {b.categoryName}
                    </Text>
                    <Text
                      style={[
                        type.caption,
                        { color: b.status === 'over' ? colors.danger : colors.textSecondary },
                      ]}
                    >
                      {b.status === 'over' ? (
                        <>
                          <MoneyText
                            amountMinor={Math.abs(b.remainingMinor)}
                            currency={currency}
                            kind="expense"
                          />{' '}
                          over
                        </>
                      ) : (
                        <>
                          <MoneyText
                            amountMinor={b.remainingMinor}
                            currency={currency}
                          />{' '}
                          left
                        </>
                      )}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.progressBarTrack,
                      { backgroundColor: colors.surfaceMuted },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${progressWidth}%`,
                          backgroundColor: barColor,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Top Categories */}
      {topCategories.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <Text style={[type.label, { color: colors.textSecondary }]}>
            TOP SPENDING
          </Text>
          <View
            style={[
              styles.cardContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                paddingHorizontal: space.md,
              },
            ]}
          >
            {topCategories.map((cat, idx) => (
              <Row
                key={cat.id}
                title={cat.name}
                subtitle={`${cat.sharePercentage}% of month's expenses`}
                leading={
                  <View
                    style={[
                      styles.categoryBadge,
                      {
                        backgroundColor: colors.categories[cat.colorKey as keyof typeof colors.categories] ?? colors.primary,
                      },
                    ]}
                  />
                }
                trailing={
                  <MoneyText
                    amountMinor={cat.totalMinor}
                    currency={currency}
                    kind="expense"
                    role="figure"
                  />
                }
                last={idx === topCategories.length - 1}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* Recent Entries */}
      <View style={{ gap: space.sm }}>
        <View style={styles.sectionHeader}>
          <Text style={[type.label, { color: colors.textSecondary }]}>
            RECENT ENTRIES
          </Text>
          <Press onPress={() => router.push('/(tabs)/history')}>
            <Text style={[type.caption, { color: colors.primary }]}>See all</Text>
          </Press>
        </View>
        <View
          style={[
            styles.cardContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingHorizontal: space.md,
            },
          ]}
        >
          {recentEntries.map((tx, idx) => (
            <Row
              key={tx.id}
              title={tx.note || tx.categoryName}
              subtitle={tx.occurredOn}
              leading={
                <View
                  style={[
                    styles.txIconWrapper,
                    { backgroundColor: colors.surfaceMuted },
                  ]}
                >
                  <Ionicons
                    name={tx.categoryIcon as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={colors.primary}
                  />
                </View>
              }
              trailing={
                <MoneyText
                  amountMinor={tx.amountMinor}
                  currency={currency}
                  kind={tx.kind}
                  showSign
                  role="figure"
                />
              }
              last={idx === recentEntries.length - 1}
            />
          ))}
        </View>
      </View>

      {/* Quick Add Button */}
      <View style={{ marginTop: space.md }}>
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
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  heroBlock: {
    borderWidth: 1,
    borderRadius: 12,
  },
  heroSubline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetList: {
    borderWidth: 1,
    borderRadius: 12,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  cardContainer: {
    borderWidth: 1,
    borderRadius: 12,
  },
  categoryBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  txIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
