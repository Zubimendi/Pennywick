import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  Text,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Press } from './Press';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leading,
  trailing,
  style,
  accessibilityLabel,
}: ButtonProps): React.JSX.Element {
  const { colors, space, radius, type, hit } = useTheme();

  const getContainerStyle = (): ViewStyle => {
    let backgroundColor: string;
    let borderColor: string | undefined;
    let borderWidth: number | undefined;

    switch (variant) {
      case 'primary':
        backgroundColor = disabled ? colors.surfaceMuted : colors.primary;
        break;
      case 'secondary':
        backgroundColor = colors.surfaceMuted;
        break;
      case 'danger':
        backgroundColor = disabled ? colors.surfaceMuted : colors.danger;
        break;
      case 'ghost':
        backgroundColor = 'transparent';
        borderColor = colors.border;
        borderWidth = 1;
        break;
    }

    const minHeight = size === 'sm' ? hit.min : size === 'lg' ? 56 : 52;
    const paddingHorizontal = size === 'sm' ? space.md : space.lg;

    return {
      minHeight,
      paddingHorizontal,
      backgroundColor,
      borderColor,
      borderWidth,
      borderRadius: radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.sm,
      opacity: disabled && variant !== 'primary' ? 0.5 : 1,
    };
  };

  const getTextStyle = (): TextStyle => {
    let color: string;

    switch (variant) {
      case 'primary':
        color = disabled ? colors.textFaint : colors.onPrimary;
        break;
      case 'secondary':
        color = disabled ? colors.textFaint : colors.text;
        break;
      case 'danger':
        color = disabled ? colors.textFaint : colors.onPrimary;
        break;
      case 'ghost':
        color = disabled ? colors.textFaint : colors.text;
        break;
    }

    return {
      ...type.label,
      color,
      textAlign: 'center',
    };
  };

  const spinnerColor =
    variant === 'primary' || variant === 'danger'
      ? colors.onPrimary
      : colors.text;

  return (
    <Press
      onPress={onPress}
      disabled={disabled || loading}
      style={[getContainerStyle(), style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {leading}
          <Text style={getTextStyle()}>{label}</Text>
          {trailing}
        </>
      )}
    </Press>
  );
}
