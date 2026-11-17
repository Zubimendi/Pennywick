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
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
}: SegmentedControlProps<T>): React.JSX.Element {
  const { colors, space, radius, type, hit } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceMuted,
          borderRadius: radius.md,
          padding: space.xxs,
          minHeight: hit.min,
        },
      ]}
      accessibilityRole="radiogroup"
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;

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
                borderRadius: radius.sm,
                backgroundColor: isSelected ? colors.surface : 'transparent',
                borderColor: isSelected ? colors.border : 'transparent',
                borderWidth: isSelected ? 1 : 0,
              },
            ]}
          >
            <Text
              style={[
                type.label,
                {
                  color: isSelected ? colors.text : colors.textSecondary,
                  fontWeight: isSelected ? '700' : '500',
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
