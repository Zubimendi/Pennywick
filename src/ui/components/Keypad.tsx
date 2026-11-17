// src/ui/components/Keypad.tsx
// Amount-first numeric keypad with 64x56 minimum key targets, haptics, and backspace long-press clear.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { Press } from './Press';

export interface KeypadProps {
  onKeyPress: (key: string) => void;
  onClear?: () => void;
  disabled?: boolean;
}

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'backspace'],
];

export function Keypad({ onKeyPress, onClear, disabled = false }: KeypadProps): React.JSX.Element {
  const { colors, space, radius, type, hit } = useTheme();

  return (
    <View style={[styles.grid, { gap: space.sm }]}>
      {KEYS.map((row, rowIdx) => (
        <View key={rowIdx} style={[styles.row, { gap: space.sm }]}>
          {row.map((k) => {
            const isBackspace = k === 'backspace';

            return (
              <Press
                key={k}
                onPress={() => onKeyPress(k)}
                onLongPress={() => {
                  if (isBackspace && onClear) {
                    onClear();
                  }
                }}
                disabled={disabled}
                scaleTo={0.94}
                accessibilityRole="button"
                accessibilityLabel={
                  isBackspace ? 'Delete digit, hold to clear' : k === '.' ? 'Decimal point' : k
                }
                style={[
                  styles.key,
                  {
                    minWidth: hit.keypadWidth,
                    minHeight: hit.keypadHeight,
                    backgroundColor: colors.surface,
                    borderColor: colors.hairline,
                    borderRadius: radius.md,
                  },
                ]}
              >
                {isBackspace ? (
                  <Ionicons name="backspace-outline" size={24} color={colors.text} />
                ) : (
                  <Text style={[type.title, { color: colors.text, fontSize: 24, lineHeight: 28 }]}>
                    {k}
                  </Text>
                )}
              </Press>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  key: {
    flex: 1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
