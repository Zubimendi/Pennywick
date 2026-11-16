import React, { ReactNode } from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps): React.JSX.Element {
  const { colors, space, type } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          padding: space.xl,
          gap: space.md,
        },
        style,
      ]}
      accessibilityRole="text"
    >
      {icon ? <View style={[styles.iconContainer, { marginBottom: space.sm }]}>{icon}</View> : null}
      <Text style={[type.heading, { color: colors.text, textAlign: 'center' }]}>
        {title}
      </Text>
      <Text style={[type.body, { color: colors.textSecondary, textAlign: 'center' }]}>
        {description}
      </Text>
      {actionLabel && onAction ? (
        <View style={{ marginTop: space.sm }}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
