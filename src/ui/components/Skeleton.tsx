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
