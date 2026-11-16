import React, { ReactNode } from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Press } from './Press';

export interface RowProps {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  last?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Row({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  last = false,
  style,
}: RowProps): React.JSX.Element {
  const { colors, space, type, hit } = useTheme();

  const content = (
    <View
      style={[
        styles.row,
        {
          minHeight: hit.min,
          paddingVertical: space.md,
          gap: space.md,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: colors.hairline,
        },
        style,
      ]}
    >
      {leading}
      <View style={styles.textContainer}>
        <Text
          style={[type.heading, { color: colors.text }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[type.caption, { color: colors.textSecondary, marginTop: space.xxs }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );

  if (onPress) {
    return (
      <Press onPress={onPress} scaleTo={0.99}>
        {content}
      </Press>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});
