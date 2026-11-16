import React, { ReactNode } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Press } from './Press';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function Chip({
  label,
  selected = false,
  onPress,
  leading,
  trailing,
  style,
  disabled = false,
  accessibilityLabel,
}: ChipProps): React.JSX.Element {
  const { colors, space, radius, type, hit } = useTheme();

  const containerStyle: ViewStyle = {
    minHeight: hit.min,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: selected ? colors.primary : colors.surface,
    borderColor: selected ? colors.primary : colors.border,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    opacity: disabled ? 0.5 : 1,
  };

  const textStyle: TextStyle = {
    ...type.label,
    color: selected ? colors.onPrimary : colors.text,
  };

  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      style={[containerStyle, style]}
      accessibilityRole="checkbox"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {leading ? <View style={styles.icon}>{leading}</View> : null}
      <Text style={textStyle}>{label}</Text>
      {trailing ? <View style={styles.icon}>{trailing}</View> : null}
    </Press>
  );
}

const styles = StyleSheet.create({
  icon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
