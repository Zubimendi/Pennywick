// src/ui/components/SyncChip.tsx
// Persistent save-state indicator shown in screen headers when signed in.

import React from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Press } from './Press';
import { useTheme } from '../theme/useTheme';
import { getSyncChipInfo, type SyncStatusType } from '../../sync/status';

export interface SyncChipProps {
  status: SyncStatusType;
  pendingCount?: number;
  onPress: () => void;
}

export function SyncChip({
  status,
  pendingCount = 0,
  onPress,
}: SyncChipProps): React.JSX.Element | null {
  const { colors, space, radius, type } = useTheme();
  const info = getSyncChipInfo(status, pendingCount);

  if (!info) {
    return null;
  }

  const getTextColor = (): string => {
    switch (info.colorKey) {
      case 'income':
        return colors.income;
      case 'warning':
        return colors.warning;
      case 'danger':
        return colors.danger;
      default:
        return colors.textSecondary;
    }
  };

  const textColor = getTextColor();

  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={`Sync status: ${info.label}. Tap to open sync center.`}
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
          borderRadius: radius.pill,
          paddingHorizontal: space.sm + 2,
          paddingVertical: 4,
          gap: space.xs,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        {status === 'syncing' ? (
          <ActivityIndicator size={12} color={textColor} />
        ) : (
          <Ionicons
            name={info.icon as unknown as keyof typeof Ionicons.glyphMap}
            size={14}
            color={textColor}
          />
        )}
      </View>
      <Text style={[type.caption, { color: textColor, fontWeight: '600' }]}>{info.label}</Text>
    </Press>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
