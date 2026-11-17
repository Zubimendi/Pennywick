// src/features/history/HistoryRow.tsx
// History list row component with category icon, note/category name, tabular amount, recurring badge, and swipe-to-delete.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Press, MoneyText } from '../../ui/components';
import { useTheme } from '../../ui/theme/useTheme';
import { TransactionWithCategory } from './historyTypes';

interface HistoryRowProps {
  transaction: TransactionWithCategory;
  currency: string;
  onPress: () => void;
  onDelete: () => void;
}

export const HistoryRow = React.memo(function HistoryRow({
  transaction,
  currency,
  onPress,
  onDelete,
}: HistoryRowProps): React.JSX.Element {
  const { colors, space, radius, type, hit } = useTheme();

  const isExpense = transaction.kind === 'expense';
  const displayTitle = transaction.note ? transaction.note : transaction.categoryName;
  const displaySubtitle = transaction.note ? transaction.categoryName : undefined;

  const renderRightActions = (): React.JSX.Element => {
    return (
      <View
        style={[
          styles.deleteActionContainer,
          {
            backgroundColor: colors.danger,
            paddingHorizontal: space.lg,
          },
        ]}
      >
        <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
        <Text style={[type.caption, { color: '#FFFFFF', fontWeight: '600' }]}>Delete</Text>
      </View>
    );
  };

  return (
    <Swipeable
      friction={2}
      rightThreshold={40}
      renderRightActions={renderRightActions}
      onSwipeableOpen={(direction) => {
        if (direction === 'right') {
          onDelete();
        }
      }}
    >
      <Press
        onPress={onPress}
        style={[
          styles.row,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.hairline,
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            minHeight: hit.min,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${transaction.kind} ${transaction.amountMinor / 100} ${currency}, ${displayTitle}`}
      >
        {/* Category Icon */}
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: colors.surfaceMuted,
              borderRadius: radius.md,
            },
          ]}
        >
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Ionicons name={transaction.categoryIcon as any} size={20} color={colors.primary} />
        </View>

        {/* Title and subtitle */}
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text
              style={[type.heading, { color: colors.text }]}
              numberOfLines={1}
            >
              {displayTitle}
            </Text>
            {transaction.recurringRuleId && (
              <Ionicons
                name="repeat"
                size={14}
                color={colors.primary}
                style={styles.recurringIcon}
              />
            )}
          </View>
          {displaySubtitle && (
            <Text style={[type.caption, { color: colors.textSecondary }]} numberOfLines={1}>
              {displaySubtitle}
            </Text>
          )}
        </View>

        {/* Amount */}
        <View style={styles.amountContainer}>
          <MoneyText
            amountMinor={transaction.amountMinor}
            currency={currency}
            role="heading"
            showSign
            kind={isExpense ? 'expense' : 'income'}
          />
        </View>
      </Press>
    </Swipeable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recurringIcon: {
    marginLeft: 4,
  },
  amountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 12,
  },
  deleteActionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
});
