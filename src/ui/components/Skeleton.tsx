// src/ui/components/Skeleton.tsx
// Animated skeleton loading placeholder for screen-level loading states.
// Uses a shimmer pulse animation to indicate that content is being loaded.

import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme/useTheme';

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps): React.JSX.Element {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surfaceMuted,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Pre-built skeleton layout matching the Home screen populated state.
 * Shows a hero block, two section rows, and a list of entry placeholders.
 */
export function HomeScreenSkeleton(): React.JSX.Element {
  const { colors, space } = useTheme();

  return (
    <View style={[styles.container, { gap: space.lg }]}>
      {/* Header row */}
      <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <Skeleton width={120} height={24} borderRadius={6} />
        <Skeleton width={60} height={24} borderRadius={12} />
      </View>

      {/* Hero block */}
      <View
        style={[
          styles.heroBlock,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            padding: space.lg,
            gap: space.md,
          },
        ]}
      >
        <Skeleton width={100} height={12} borderRadius={4} />
        <Skeleton width="60%" height={44} borderRadius={8} />
        <View style={[styles.row, { gap: space.lg }]}>
          <Skeleton width={80} height={12} borderRadius={4} />
          <Skeleton width={80} height={12} borderRadius={4} />
        </View>
      </View>

      {/* Budget strip skeleton */}
      <View style={{ gap: space.sm }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Skeleton width={100} height={12} borderRadius={4} />
          <Skeleton width={50} height={12} borderRadius={4} />
        </View>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              padding: space.md,
              gap: space.md,
            },
          ]}
        >
          {[0, 1].map((i) => (
            <View key={i} style={{ gap: space.xs }}>
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Skeleton width={80} height={14} borderRadius={4} />
                <Skeleton width={60} height={12} borderRadius={4} />
              </View>
              <Skeleton width="100%" height={6} borderRadius={999} />
            </View>
          ))}
        </View>
      </View>

      {/* Recent entries skeleton */}
      <View style={{ gap: space.sm }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Skeleton width={110} height={12} borderRadius={4} />
          <Skeleton width={50} height={12} borderRadius={4} />
        </View>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingHorizontal: space.md,
            },
          ]}
        >
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.entryRow,
                {
                  paddingVertical: space.md,
                  borderBottomWidth: i < 3 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: colors.hairline,
                  gap: space.sm,
                },
              ]}
            >
              <Skeleton width={34} height={34} borderRadius={8} />
              <View style={{ flex: 1, gap: space.xs }}>
                <Skeleton width="55%" height={14} borderRadius={4} />
                <Skeleton width="30%" height={10} borderRadius={4} />
              </View>
              <Skeleton width={60} height={14} borderRadius={4} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * Pre-built skeleton layout matching the History screen.
 * Shows title bar, search bar, filter chips, and day groups with transaction rows.
 */
export function HistoryScreenSkeleton(): React.JSX.Element {
  const { colors, space } = useTheme();

  return (
    <View style={[styles.container, { gap: space.md }]}>
      {/* Title Bar */}
      <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'baseline', paddingTop: space.md, paddingBottom: space.sm }]}>
        <Skeleton width={110} height={28} borderRadius={6} />
        <Skeleton width={70} height={16} borderRadius={4} />
      </View>

      {/* Search Bar */}
      <Skeleton width="100%" height={48} borderRadius={10} />

      {/* Filter Chips Bar */}
      <View style={[styles.row, { gap: space.sm, paddingVertical: space.xs }]}>
        <Skeleton width={48} height={32} borderRadius={16} />
        <Skeleton width={76} height={32} borderRadius={16} />
        <Skeleton width={68} height={32} borderRadius={16} />
        <Skeleton width={90} height={32} borderRadius={16} />
        <Skeleton width={80} height={32} borderRadius={16} />
      </View>

      {/* Day Group 1 */}
      <View style={{ gap: space.xs, marginTop: space.sm }}>
        <View style={[styles.row, { justifyContent: 'space-between', paddingVertical: space.xs }]}>
          <Skeleton width={90} height={14} borderRadius={4} />
          <Skeleton width={70} height={14} borderRadius={4} />
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, paddingHorizontal: space.md }]}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.entryRow,
                {
                  paddingVertical: space.md,
                  borderBottomWidth: i < 2 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: colors.hairline,
                  gap: space.sm,
                },
              ]}
            >
              <Skeleton width={36} height={36} borderRadius={8} />
              <View style={{ flex: 1, gap: space.xs }}>
                <Skeleton width="60%" height={14} borderRadius={4} />
                <Skeleton width="35%" height={10} borderRadius={4} />
              </View>
              <Skeleton width={65} height={14} borderRadius={4} />
            </View>
          ))}
        </View>
      </View>

      {/* Day Group 2 */}
      <View style={{ gap: space.xs, marginTop: space.sm }}>
        <View style={[styles.row, { justifyContent: 'space-between', paddingVertical: space.xs }]}>
          <Skeleton width={100} height={14} borderRadius={4} />
          <Skeleton width={60} height={14} borderRadius={4} />
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, paddingHorizontal: space.md }]}>
          {[0, 1].map((i) => (
            <View
              key={i}
              style={[
                styles.entryRow,
                {
                  paddingVertical: space.md,
                  borderBottomWidth: i < 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: colors.hairline,
                  gap: space.sm,
                },
              ]}
            >
              <Skeleton width={36} height={36} borderRadius={8} />
              <View style={{ flex: 1, gap: space.xs }}>
                <Skeleton width="50%" height={14} borderRadius={4} />
                <Skeleton width="30%" height={10} borderRadius={4} />
              </View>
              <Skeleton width={60} height={14} borderRadius={4} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * Pre-built skeleton layout matching the Budgets screen.
 */
export function BudgetsScreenSkeleton(): React.JSX.Element {
  const { colors, space } = useTheme();

  return (
    <View style={[styles.container, { gap: space.md, paddingTop: space.md }]}>
      {/* Header */}
      <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <Skeleton width={120} height={28} borderRadius={6} />
        <Skeleton width={90} height={36} borderRadius={8} />
      </View>

      {/* Month Summary Card */}
      <View
        style={[
          styles.heroBlock,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            padding: space.lg,
            gap: space.md,
          },
        ]}
      >
        <Skeleton width={110} height={12} borderRadius={4} />
        <Skeleton width="50%" height={32} borderRadius={6} />
        <Skeleton width="100%" height={8} borderRadius={999} />
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Skeleton width={80} height={12} borderRadius={4} />
          <Skeleton width={80} height={12} borderRadius={4} />
        </View>
      </View>

      {/* Budget Cards */}
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              padding: space.md,
              gap: space.sm,
            },
          ]}
        >
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Skeleton width={100} height={16} borderRadius={4} />
            <Skeleton width={70} height={14} borderRadius={4} />
          </View>
          <Skeleton width="100%" height={6} borderRadius={999} />
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Skeleton width={60} height={10} borderRadius={4} />
            <Skeleton width={60} height={10} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Pre-built skeleton layout matching the Insights screen.
 */
export function InsightsScreenSkeleton(): React.JSX.Element {
  const { colors, space } = useTheme();

  return (
    <View style={[styles.container, { gap: space.md, paddingTop: space.md }]}>
      {/* Month Picker Header */}
      <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <Skeleton width={36} height={36} borderRadius={8} />
        <Skeleton width={130} height={24} borderRadius={6} />
        <Skeleton width={36} height={36} borderRadius={8} />
      </View>

      {/* Hero Spent Amount */}
      <View
        style={[
          styles.heroBlock,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            padding: space.lg,
            gap: space.sm,
          },
        ]}
      >
        <Skeleton width={90} height={12} borderRadius={4} />
        <Skeleton width="60%" height={40} borderRadius={8} />
        <Skeleton width="45%" height={14} borderRadius={4} />
      </View>

      {/* Category Breakdown Donut Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            padding: space.lg,
            alignItems: 'center',
            gap: space.md,
          },
        ]}
      >
        <Skeleton width={140} height={140} borderRadius={70} />
        <View style={{ width: '100%', gap: space.sm }}>
          <Skeleton width="100%" height={16} borderRadius={4} />
          <Skeleton width="80%" height={16} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroBlock: {
    borderWidth: 1,
    borderRadius: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
