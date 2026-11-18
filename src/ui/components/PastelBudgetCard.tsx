// src/ui/components/PastelBudgetCard.tsx
// Pastel category & budget card inspired by modern Dribbble cost-management UI.
// Features soft pastel background, crisp white circular icon container, bold amount, and micro progress bar.

import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { MoneyText } from './MoneyText';
import { Press } from './Press';
import { getPastelTheme } from '../theme/colors';

export interface PastelBudgetCardProps {
  categoryName: string;
  categoryIcon: string;
  amountMinor: number;
  currency: string;
  amountLabel?: string; // e.g. "left" or "spent"
  progressPercent?: number; // 0 to 100
  colorIndex?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export function PastelBudgetCard({
  categoryName,
  categoryIcon,
  amountMinor,
  currency,
  amountLabel,
  progressPercent,
  colorIndex = 0,
  onPress,
  style,
  compact = false,
}: PastelBudgetCardProps): React.JSX.Element {
  const { isDark } = useTheme();
  const theme = getPastelTheme(colorIndex, isDark);

  return (
    <Press
      onPress={onPress}
      disabled={!onPress}
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={`${categoryName}: ${amountMinor}`}
      style={[
        styles.card,
        {
          backgroundColor: theme.bg,
          borderColor: theme.border,
          width: compact ? 150 : undefined,
        },
        style,
      ]}
    >
      {/* Top circular icon container */}
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: theme.iconBg }]}>
          <Ionicons
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            name={(categoryIcon || 'wallet-outline') as any}
            size={20}
            color={theme.accent}
          />
        </View>

        {amountLabel ? (
          <View
            style={[
              styles.labelPill,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.14)'
                  : 'rgba(255, 255, 255, 0.6)',
              },
            ]}
          >
            <Text
              style={[
                styles.labelText,
                { color: isDark ? '#FFFFFF' : theme.accent },
              ]}
            >
              {amountLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Amount Display */}
      <View style={styles.amountContainer}>
        <MoneyText
          amountMinor={amountMinor}
          currency={currency}
          role="figure"
          style={[styles.amountText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}
        />
      </View>

      {/* Category Name */}
      <Text
        style={[styles.categoryName, { color: isDark ? '#FFFFFF' : '#334155' }]}
        numberOfLines={1}
      >
        {categoryName}
      </Text>

      {/* Micro Progress Bar */}
      {progressPercent !== undefined ? (
        <View
          style={[
            styles.progressBarTrack,
            {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.12)'
                : 'rgba(0, 0, 0, 0.06)',
            },
          ]}
        >
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                backgroundColor: theme.accent,
              },
            ]}
          />
        </View>
      ) : null}
    </Press>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  labelPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  amountContainer: {
    marginBottom: 4,
  },
  amountText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
  },
});
