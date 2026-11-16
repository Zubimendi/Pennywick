import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { useUiStore } from '../theme/uiStore';
import { formatMoney, amountToWords } from '@/domain/money';

export { formatMoney, amountToWords };

export interface MoneyTextProps {
  amountMinor: number;
  currency?: string;
  kind?: 'expense' | 'income' | 'neutral';
  role?: 'hero' | 'title' | 'heading' | 'body' | 'label' | 'figure';
  showSign?: boolean;
  style?: StyleProp<TextStyle>;
  forceShow?: boolean;
}

export function MoneyText({
  amountMinor,
  currency = 'NGN',
  kind = 'neutral',
  role = 'body',
  showSign = false,
  style,
  forceShow = false,
}: MoneyTextProps): React.JSX.Element {
  const { colors, type } = useTheme();
  const privacyEnabled = useUiStore((state) => state.privacyEnabled);

  const isMasked = privacyEnabled && !forceShow;

  let textColor = colors.text;
  if (kind === 'expense') {
    textColor = colors.expense;
  } else if (kind === 'income') {
    textColor = colors.income;
  }

  const sign = showSign
    ? kind === 'income'
      ? '+ '
      : kind === 'expense'
        ? '- '
        : ''
    : '';

  const displayString = isMasked
    ? '••••••'
    : `${sign}${formatMoney(amountMinor, currency)}`;

  const accessibilityWords = isMasked
    ? 'amount hidden by privacy mode'
    : `${sign ? (kind === 'income' ? 'plus ' : 'minus ') : ''}${amountToWords(amountMinor, currency)}`;

  return (
    <Text
      style={[
        type[role],
        {
          color: textColor,
          fontVariant: ['tabular-nums'],
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityWords}
      numberOfLines={1}
      adjustsFontSizeToFit={role === 'hero'}
    >
      {displayString}
    </Text>
  );
}
