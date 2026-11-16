import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/useTheme';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

export function TextField({
  label,
  error,
  helperText,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps): React.JSX.Element {
  const { colors, space, radius, type, hit } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]): void => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]): void => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const borderColor = error
    ? colors.danger
    : isFocused
      ? colors.primary
      : colors.border;

  return (
    <View style={[styles.container, { gap: space.xs }, containerStyle]}>
      <Text style={[type.label, { color: colors.textSecondary }]}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          {
            minHeight: hit.min,
            borderRadius: radius.md,
            borderColor,
            backgroundColor: colors.surface,
            paddingHorizontal: space.md,
          },
          style,
        ]}
      >
        <TextInput
          placeholderTextColor={colors.textFaint}
          style={[
            styles.input,
            type.body,
            {
              color: colors.text,
            },
          ]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />
      </View>
      {error ? (
        <Text style={[type.caption, { color: colors.danger }]}>{error}</Text>
      ) : helperText ? (
        <Text style={[type.caption, { color: colors.textFaint }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    borderWidth: 1,
    justifyContent: 'center',
  },
  input: {
    paddingVertical: 12,
  },
});
