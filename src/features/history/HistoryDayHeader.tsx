// src/features/history/HistoryDayHeader.tsx
// Day header component with date label and daily subtotal.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MoneyText } from '../../ui/components';
import { useTheme } from '../../ui/theme/useTheme';
import { HistoryHeaderItem } from './historyTypes';

interface HistoryDayHeaderProps {
  header: HistoryHeaderItem;
  currency: string;
}

export const HistoryDayHeader = React.memo(function HistoryDayHeader({
  header,
  currency,
}: HistoryDayHeaderProps): React.JSX.Element {
  const { colors, space, type } = useTheme();

  const isNetIncome = header.subtotalMinor > 0;
  const isZero = header.subtotalMinor === 0;

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.bg,
          paddingHorizontal: space.lg,
          paddingTop: space.md,
          paddingBottom: space.xs,
        },
      ]}
    >
      <Text style={[type.label, { color: colors.textSecondary }]}>
        {header.displayDate}
      </Text>
      <View style={styles.subtotalContainer}>
        <MoneyText
          amountMinor={Math.abs(header.subtotalMinor)}
          currency={currency}
          role="label"
          showSign={!isZero}
          kind={isZero ? 'neutral' : isNetIncome ? 'income' : 'expense'}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtotalContainer: {
    alignItems: 'flex-end',
  },
});
