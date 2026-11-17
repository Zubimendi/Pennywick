// src/ui/charts/DonutChart.tsx
// Custom SVG Donut chart with accessible text alternative.
// Follows docs/DESIGN.MD: only renders when needed, text alternative for screen readers.

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { G, Circle } from 'react-native-svg';
import { CategoryShareItem } from '../../domain/insights';
import { MoneyText } from '../components/MoneyText';
import { useTheme } from '../theme/useTheme';

interface DonutChartProps {
  slices: CategoryShareItem[];
  totalMinor: number;
  currency: string;
  size?: number;
  strokeWidth?: number;
}

export const DonutChart = React.memo(function DonutChart({
  slices,
  totalMinor,
  currency,
  size = 200,
  strokeWidth = 24,
}: DonutChartProps): React.JSX.Element {
  const { colors, type } = useTheme();

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Text summary for accessibility
  const topSlice = slices[0];
  const accessibilityText =
    slices.length === 0
      ? 'No spending in this period.'
      : `Spending donut chart. Total spent: ${totalMinor / 100} ${currency}. Top category: ${topSlice.name} at ${topSlice.percentage} percent.`;

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityText}
    >
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Background circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.surfaceMuted}
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Slices */}
          {slices.map((slice) => {
            const strokeDash = (slice.sweepAngle / 360) * circumference;
            const strokeDashoffset = -((slice.startAngle / 360) * circumference);

            return (
              <Circle
                key={slice.id}
                cx={center}
                cy={center}
                r={radius}
                stroke={slice.colorHex}
                strokeWidth={strokeWidth}
                strokeDasharray={`${strokeDash} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="butt"
                fill="transparent"
              />
            );
          })}
        </G>
      </Svg>

      {/* Center Text */}
      <View style={styles.centerTextContainer}>
        <Text style={[type.caption, { color: colors.textSecondary }]}>Total</Text>
        <MoneyText
          amountMinor={totalMinor}
          currency={currency}
          role="heading"
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  centerTextContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
