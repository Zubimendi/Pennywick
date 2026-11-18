// src/ui/components/HeroGradientCard.tsx
// Neo-fintech Hero Gradient Card inspired by modern mobile cost management UI (Dribbble).
// Features curved gradients, pill badges, dual amounts, and days-remaining subline.

import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { MoneyText } from './MoneyText';
import { Press } from './Press';

export interface HeroGradientCardProps {
  primaryLabel: string;
  primaryAmountMinor: number;
  currency: string;
  secondaryLabel?: string;
  secondaryAmountMinor?: number;
  subline?: string;
  badgeText?: string;
  onBadgePress?: () => void;
  actionText?: string;
  onActionPress?: () => void;
  progressPercent?: number; // 0 to 100
  progressColor?: string;
  style?: StyleProp<ViewStyle>;
  gradientColors?: [string, string]; // Default royal blue / indigo
}

export function HeroGradientCard({
  primaryLabel,
  primaryAmountMinor,
  currency,
  secondaryLabel,
  secondaryAmountMinor,
  subline,
  badgeText,
  onBadgePress,
  actionText,
  onActionPress,
  progressPercent,
  progressColor = '#60A5FA',
  style,
  gradientColors,
}: HeroGradientCardProps): React.JSX.Element {
  const { isDark } = useTheme();

  const colors = gradientColors ?? (isDark ? ['#1E293B', '#0F172A'] : ['#2563EB', '#1D4ED8']);

  return (
    <View style={[styles.cardContainer, style]}>
      {/* Background Gradient */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="heroCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors[0]} stopOpacity="1" />
              <Stop offset="100%" stopColor={colors[1]} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" rx={24} fill="url(#heroCardGrad)" />
        </Svg>
      </View>

      {/* Decorative subtle circles in background */}
      <View style={styles.decorativeCircleTop} pointerEvents="none" />
      <View style={styles.decorativeCircleBottom} pointerEvents="none" />

      {/* Top Action / Badge Bar */}
      <View style={styles.topRow}>
        {badgeText ? (
          <Press
            onPress={onBadgePress}
            disabled={!onBadgePress}
            style={styles.pillBadge}
            accessibilityRole={onBadgePress ? 'button' : 'text'}
            accessibilityLabel={badgeText}
          >
            <Text style={styles.pillBadgeText}>{badgeText}</Text>
            {onBadgePress ? (
              <Ionicons name="chevron-down" size={14} color="#FFFFFF" style={{ marginLeft: 2 }} />
            ) : null}
          </Press>
        ) : (
          <View />
        )}

        {actionText ? (
          <Press
            onPress={onActionPress}
            disabled={!onActionPress}
            style={styles.actionPill}
            accessibilityRole="button"
            accessibilityLabel={actionText}
          >
            <Text style={styles.actionPillText}>{actionText}</Text>
            <Ionicons name="chevron-forward" size={14} color="#FFFFFF" style={{ marginLeft: 2 }} />
          </Press>
        ) : null}
      </View>

      {/* Primary & Secondary Figures */}
      <View style={styles.amountSection}>
        <View style={styles.primaryColumn}>
          <Text style={styles.primaryLabel}>{primaryLabel}</Text>
          <MoneyText
            amountMinor={primaryAmountMinor}
            currency={currency}
            role="hero"
            style={styles.heroAmount}
          />
        </View>

        {secondaryLabel && secondaryAmountMinor !== undefined ? (
          <View style={styles.secondaryColumn}>
            <Text style={styles.secondaryLabel}>{secondaryLabel}</Text>
            <MoneyText
              amountMinor={secondaryAmountMinor}
              currency={currency}
              role="figure"
              style={styles.secondaryAmount}
            />
          </View>
        ) : null}
      </View>

      {/* Progress Bar (if provided) */}
      {progressPercent !== undefined ? (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                backgroundColor: progressColor,
              },
            ]}
          />
        </View>
      ) : null}

      {/* Bottom Subline */}
      {subline ? (
        <View style={styles.sublineRow}>
          <Text style={styles.sublineText} numberOfLines={1}>
            {subline}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  decorativeCircleTop: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorativeCircleBottom: {
    position: 'absolute',
    bottom: -50,
    left: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  actionPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  amountSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  primaryColumn: {
    flex: 1,
  },
  primaryLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
  },
  secondaryColumn: {
    alignItems: 'flex-end',
    paddingBottom: 4,
  },
  secondaryLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  secondaryAmount: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  sublineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sublineText: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 13,
    fontWeight: '500',
  },
});
