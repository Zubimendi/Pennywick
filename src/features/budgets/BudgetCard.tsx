// src/features/budgets/BudgetCard.tsx
// Budget item card showing category, progress bar, "N left" / "N over", and status text.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Press, MoneyText } from '../../ui/components';
import { useTheme } from '../../ui/theme/useTheme';
import { EnrichedBudget } from './useBudgetsData';
import { formatMoney } from '../../domain/money';

interface BudgetCardProps {
  budget: EnrichedBudget;
  currency: string;
  onPress: () => void;
}

export const BudgetCard = React.memo(function BudgetCard({
  budget,
  currency,
  onPress,
}: BudgetCardProps): React.JSX.Element {
  const { colors, space, radius, type, hit } = useTheme();

  // Progress calculation
  const fillWidthPercent = `${Math.min(100, Math.round(budget.percentageUsed * 100))}%` as `${number}%`;

  let barColor = colors.primary;
  let statusText = 'On track';
  let statusTextColor = colors.primary;

  if (budget.status === 'over') {
    barColor = colors.danger;
    statusText = 'Over budget';
    statusTextColor = colors.danger;
  } else if (budget.status === 'watch') {
    barColor = colors.warning;
    statusText = `Watch • ${Math.round(budget.percentageUsed * 100)}%`;
    statusTextColor = colors.warning;
  }

  const isOver = budget.remainingMinor < 0;

  return (
    <Press
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: space.lg,
          gap: space.sm,
          minHeight: hit.min,
          borderWidth: 1,
          borderColor: colors.hairline,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Budget for ${budget.categoryName}: ${budget.status}, ${formatMoney(Math.abs(budget.remainingMinor), currency)} ${isOver ? 'over' : 'remaining'}`}
    >
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.categoryInfo}>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: colors.surfaceMuted,
                borderRadius: radius.sm,
              },
            ]}
          >
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Ionicons name={budget.categoryIcon as any} size={18} color={colors.primary} />
          </View>
          <Text style={[type.heading, { color: colors.text }]}>{budget.categoryName}</Text>
        </View>

        {/* Status text */}
        <Text style={[type.caption, { color: statusTextColor, fontWeight: '600' }]}>
          {statusText}
        </Text>
      </View>

      {/* Progress Bar Track */}
      <View
        style={[
          styles.track,
          {
            backgroundColor: colors.surfaceMuted,
            borderRadius: radius.pill,
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: fillWidthPercent,
              backgroundColor: barColor,
              borderRadius: radius.pill,
            },
          ]}
        />
      </View>

      {/* Bottom Row: Remaining and Spent / Limit */}
      <View style={styles.bottomRow}>
        <View style={styles.remainingInfo}>
          <MoneyText
            amountMinor={Math.abs(budget.remainingMinor)}
            currency={currency}
            role="heading"
            kind={isOver ? 'expense' : 'neutral'}
          />
          <Text style={[type.caption, { color: isOver ? colors.danger : colors.textSecondary }]}>
            {isOver ? 'over limit' : 'left'}
          </Text>
        </View>

        <Text style={[type.caption, { color: colors.textSecondary }]}>
          {formatMoney(budget.spentMinor, currency, { showDecimals: false })} of{' '}
          {formatMoney(budget.limitMinor, currency, { showDecimals: false })}
        </Text>
      </View>
    </Press>
  );
});

const styles = StyleSheet.create({
  card: {},
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  track: {
    height: 8,
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  remainingInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
});
