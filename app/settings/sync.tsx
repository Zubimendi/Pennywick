// app/settings/sync.tsx
// Backup and Sync Screen route placeholder (T19).

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Press } from '@/ui/components';
import { useTheme } from '@/ui/theme/useTheme';

export default function SyncScreen(): React.JSX.Element {
  const router = useRouter();
  const { colors, space, type, hit } = useTheme();

  return (
    <Screen style={styles.container}>
      <View
        style={[
          styles.headerBar,
          {
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            borderBottomColor: colors.hairline,
            borderBottomWidth: 1,
          },
        ]}
      >
        <Press
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={[styles.backButton, { minHeight: hit.min, minWidth: hit.min }]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Press>
        <Text style={[type.heading, { color: colors.text }]}>Backup & Sync</Text>
        <View style={{ width: hit.min }} />
      </View>

      <View style={styles.centerContainer}>
        <Text style={[type.title, { color: colors.text }]}>Sync Center</Text>
        <Text style={[type.body, { color: colors.textSecondary }]}>
          PocketBase sync setup will appear here.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
});
