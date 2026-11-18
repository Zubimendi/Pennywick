// src/ui/charts/CurvedSplineChart.tsx
// Smooth curved spline area chart inspired by modern Dribbble cost-management UI.
// Features cubic bezier curves, gradient fill, vertical indicator, tooltip bubble, and month/milestone axis.

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
  Line,
  G,
} from 'react-native-svg';
import { useTheme } from '../theme/useTheme';
import { formatMoney } from '../../domain/money';

export interface SplinePoint {
  xLabel: string;
  value: number; // e.g. minor units or major units
}

export interface CurvedSplineChartProps {
  data: SplinePoint[];
  currency?: string;
  height?: number;
  width?: number;
  lineColor?: string;
  activePointIndex?: number;
}

/**
 * Builds a smooth SVG cubic bezier path string from an array of 2D points.
 */
function createSplinePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[0];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}

export function CurvedSplineChart({
  data,
  currency = 'USD',
  height = 160,
  width = 330,
  lineColor = '#4F46E5',
  activePointIndex,
}: CurvedSplineChartProps): React.JSX.Element {
  const { colors, isDark } = useTheme();

  if (!data || data.length === 0) {
    return <View style={{ height }} />;
  }

  const paddingLeft = 32;
  const paddingRight = 16;
  const paddingTop = 36; // space for tooltip bubble
  const paddingBottom = 26; // space for x-axis labels

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const values = data.map((d) => d.value);
  const maxVal = Math.max(...values, 100);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;

  // Convert data to pixel coordinates
  const points = data.map((item, idx) => {
    const x = paddingLeft + (idx / (data.length - 1 || 1)) * chartW;
    const norm = (item.value - minVal) / range;
    const y = paddingTop + chartH - norm * chartH;
    return { x, y, value: item.value, label: item.xLabel };
  });

  const splineD = createSplinePath(points);

  // Close the area for gradient fill
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const areaD = `${splineD} L ${lastPoint.x} ${paddingTop + chartH} L ${firstPoint.x} ${paddingTop + chartH} Z`;

  // Default active point is the point with peak value or specified index
  const activeIdx =
    activePointIndex !== undefined && activePointIndex >= 0 && activePointIndex < points.length
      ? activePointIndex
      : points.reduce((maxI, p, i, arr) => (p.value > arr[maxI].value ? i : maxI), Math.floor(points.length / 2));

  const activeP = points[activeIdx];
  const tooltipText = formatMoney(activeP.value, currency);

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="splineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={lineColor} stopOpacity={isDark ? 0.35 : 0.22} />
            <Stop offset="100%" stopColor={lineColor} stopOpacity={0.0} />
          </LinearGradient>
        </Defs>

        {/* Horizontal grid lines */}
        {[0, 0.5, 1].map((ratio) => {
          const y = paddingTop + chartH * ratio;
          return (
            <Line
              key={ratio}
              x1={paddingLeft}
              y1={y}
              x2={width - paddingRight}
              y2={y}
              stroke={colors.hairline}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Gradient fill area */}
        <Path d={areaD} fill="url(#splineGradient)" />

        {/* Spline curve stroke */}
        <Path
          d={splineD}
          fill="none"
          stroke={lineColor}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Active point vertical indicator guide line */}
        {activeP ? (
          <G>
            <Line
              x1={activeP.x}
              y1={activeP.y}
              x2={activeP.x}
              y2={paddingTop + chartH}
              stroke={lineColor}
              strokeWidth={1.5}
              strokeDasharray="3 3"
              strokeOpacity={0.6}
            />

            {/* Glowing outer dot */}
            <Circle
              cx={activeP.x}
              cy={activeP.y}
              r={7}
              fill={lineColor}
              fillOpacity={0.25}
            />
            {/* Center solid dot */}
            <Circle
              cx={activeP.x}
              cy={activeP.y}
              r={4}
              fill={lineColor}
            />
            <Circle
              cx={activeP.x}
              cy={activeP.y}
              r={2}
              fill="#FFFFFF"
            />
          </G>
        ) : null}
      </Svg>

      {/* Floating Tooltip Pill */}
      {activeP ? (
        <View
          style={[
            styles.tooltipBubble,
            {
              left: Math.max(8, Math.min(width - 80, activeP.x - 40)),
              top: Math.max(4, activeP.y - 30),
              backgroundColor: isDark ? '#1E293B' : '#0F172A',
            },
          ]}
        >
          <Text style={styles.tooltipText}>{tooltipText}</Text>
        </View>
      ) : null}

      {/* X-Axis Milestone Labels */}
      <View style={[styles.xAxisRow, { left: paddingLeft, width: chartW }]}>
        {data.map((item, idx) => {
          const isSelected = idx === activeIdx;
          return (
            <Text
              key={idx}
              style={[
                styles.axisLabel,
                {
                  color: isSelected ? lineColor : colors.textSecondary,
                  fontWeight: isSelected ? '700' : '500',
                },
              ]}
            >
              {item.xLabel}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'center',
    marginVertical: 4,
  },
  tooltipBubble: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  xAxisRow: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
});
