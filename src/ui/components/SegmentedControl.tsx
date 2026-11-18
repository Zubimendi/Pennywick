// src/ui/components/SegmentedControl.tsx
// Compact, refined segmented control switch for kinds, timeframes, and options.

import React from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Press } from './Press';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  variant?: 'default' | 'pill';
  size?: 'sm' | 'md';
  activeBg?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  variant = 'default',
  size = 'md',
  activeBg,
  containerStyle,
}: SegmentedControlProps<T>): React.JSX.Element {
  const { colors, isDark } = useTheme();
  const isPill = variant === 'pill';
  const isSm = size === 'sm';

  const padVertical = isSm ? 5 : 7;
  const fontSize = isSm ? 12 : 13;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
          borderRadius: isPill ? 999 : 10,
          padding: 3,
        },
        containerStyle,
      ]}
      accessibilityRole="radiogroup"
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        const defaultActiveBg = isPill
          ? colors.primary
          : isDark
            ? '#334155'
            : '#FFFFFF';
        const selectedBg = activeBg ?? defaultActiveBg;

        const defaultSelectedTextColor = isPill
          ? '#FFFFFF'
          : isDark
            ? '#FFFFFF'
            : '#0F172A';

        const unselectedTextColor = isDark ? '#94A3B8' : '#64748B';

        return (
          <Press
            key={opt.value}
            onPress={() => onChange(opt.value)}
            disabled={disabled}
            scaleTo={0.97}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            style={[
              styles.segment,
              {
                borderRadius: isPill ? 999 : 8,
                backgroundColor: isSelected ? selectedBg : 'transparent',
                borderColor:
                  isSelected && !isPill
                    ? isDark
                      ? '#475569'
                      : '#E2E8F0'
                    : 'transparent',
                borderWidth: isSelected && !isPill ? 1 : 0,
                paddingVertical: padVertical,
                shadowColor: isSelected ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isSelected ? (isDark ? 0.25 : 0.08) : 0,
                shadowRadius: 3,
                elevation: isSelected ? 1 : 0,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: isSelected ? defaultSelectedTextColor : unselectedTextColor,
                  fontWeight: isSelected ? '700' : '500',
                  fontSize,
                },
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Press>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  label: {
    letterSpacing: -0.1,
  },
});
