// src/ui/charts/DailyBarChart.tsx
// Custom SVG Daily spending bar chart with accessible text alternative.

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { DailyBarItem } from '../../domain/insights';
import { useTheme } from '../theme/useTheme';
import { formatMoney } from '../../domain/money';

interface DailyBarChartProps {
  bars: DailyBarItem[];
  maxDailyMinor: number;
  currency: string;
  height?: number;
  width?: number;
}

export const DailyBarChart = React.memo(function DailyBarChart({
  bars,
  maxDailyMinor,
  currency,
  height = 140,
  width = 320,
}: DailyBarChartProps): React.JSX.Element {
  const { colors, type } = useTheme();

  const numBars = bars.length;
  if (numBars === 0) {
    return <View />;
  }

  const chartHeight = height - 24; // Leave 24px for day labels
  const barSpacing = 2;
  const availableWidth = width - (numBars - 1) * barSpacing;
  const barWidth = Math.max(3, Math.floor(availableWidth / numBars));

  // Accessibility summary
  const nonZeroDays = bars.filter((b) => b.totalMinor > 0);
  const accessibilityLabel = `Daily spending bar chart for ${numBars} days. Active spending on ${nonZeroDays.length} days. Highest day: ${formatMoney(maxDailyMinor, currency)}.`;

  return (
    <View
      style={[styles.container, { width }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Svg width={width} height={height}>
        {/* Baseline hairline */}
        <Line
          x1={0}
          y1={chartHeight}
          x2={width}
          y2={chartHeight}
          stroke={colors.hairline}
          strokeWidth={1}
        />

        {/* Bars */}
        {bars.map((bar, idx) => {
          const x = idx * (barWidth + barSpacing);
          const barHeight = Math.max(
            bar.totalMinor > 0 ? 3 : 0,
            bar.heightRatio * chartHeight
          );
          const y = chartHeight - barHeight;

          return (
            <Rect
              key={bar.dateStr}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={bar.heightRatio >= 0.8 ? colors.warning : colors.primary}
              rx={1}
            />
          );
        })}
      </Svg>

      {/* Axis day labels (1, 10, 20, end of month) */}
      <View style={[styles.labelsRow, { width }]}>
        <Text style={[type.caption, { color: colors.textSecondary }]}>1</Text>
        <Text style={[type.caption, { color: colors.textSecondary }]}>10</Text>
        <Text style={[type.caption, { color: colors.textSecondary }]}>20</Text>
        <Text style={[type.caption, { color: colors.textSecondary }]}>{numBars}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    marginVertical: 8,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
});
