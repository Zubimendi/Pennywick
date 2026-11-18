// src/ui/components/SegmentedControl.tsx
// Segmented control switch for 'Expense' and 'Income' kinds.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
  activeBg?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  variant = 'default',
  activeBg,
}: SegmentedControlProps<T>): React.JSX.Element {
  const { colors, space, radius, type, hit } = useTheme();
  const isPill = variant === 'pill';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isPill ? (colors.surfaceMuted) : colors.surfaceMuted,
          borderRadius: isPill ? radius.pill : radius.md,
          padding: isPill ? 4 : space.xxs,
          minHeight: isPill ? 40 : hit.min,
        },
      ]}
      accessibilityRole="radiogroup"
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        const selectedBg = activeBg ?? (isPill ? colors.primary : colors.surface);
        const selectedTextColor = isPill ? '#FFFFFF' : colors.text;

        return (
          <Press
            key={opt.value}
            onPress={() => onChange(opt.value)}
            disabled={disabled}
            scaleTo={0.98}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            style={[
              styles.segment,
              {
                borderRadius: isPill ? radius.pill : radius.sm,
                backgroundColor: isSelected ? selectedBg : 'transparent',
                borderColor: isSelected && !isPill ? colors.border : 'transparent',
                borderWidth: isSelected && !isPill ? 1 : 0,
                paddingVertical: isPill ? 7 : 10,
                shadowColor: isPill && isSelected ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isPill && isSelected ? 0.08 : 0,
                shadowRadius: 4,
                elevation: isPill && isSelected ? 2 : 0,
              },
            ]}
          >
            <Text
              style={[
                type.label,
                {
                  color: isSelected ? selectedTextColor : colors.textSecondary,
                  fontWeight: isSelected ? '700' : '500',
                  fontSize: isPill ? 13 : 14,
                },
              ]}
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
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  segment: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
});
