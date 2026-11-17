// app/settings/index.tsx
// Settings Screen (S8, T13)
// Precision Utility layout: currency selector, theme switcher, privacy default, manage rows, CSV export.

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Screen,
  Button,
  SegmentedControl,
  Press,
  Row,
} from '@/ui/components';
import { useTheme } from '@/ui/theme/useTheme';
import { useUiStore, ThemeMode } from '@/ui/theme/uiStore';
import { getSetting, setSetting, SETTINGS_KEYS } from '@/db/repositories/settings';
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from '@/data/currencies';
import { exportAndShareTransactionsCsv } from '@/features/settings/exportCsv';

export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}): React.JSX.Element {
  const { colors, space, type } = useTheme();

  return (
    <View
      style={[
        styles.centerContainer,
        { backgroundColor: colors.bg, padding: space.xl, gap: space.md },
      ]}
    >
      <Text style={[type.title, { color: colors.danger }]}>Settings Error</Text>
      <Text style={[type.body, { color: colors.textSecondary }]}>
        {error.message || 'Pennywick encountered a problem loading settings.'}
      </Text>
      <Button label="Retry" onPress={retry} variant="primary" />
    </View>
  );
}

export default function SettingsScreen(): React.JSX.Element {
  const router = useRouter();
  const { colors, space, radius, type, hit } = useTheme();

  const themeMode = useUiStore((state) => state.themeMode);
  const setThemeMode = useUiStore((state) => state.setThemeMode);
  const privacyEnabled = useUiStore((state) => state.privacyEnabled);
  const setPrivacyEnabled = useUiStore((state) => state.setPrivacyEnabled);
  const showToast = useUiStore((state) => state.showToast);

  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [appLockEnabled, setAppLockEnabled] = useState(false);

  const loadSettings = useCallback(async (): Promise<void> => {
    const savedCurrency = await getSetting(SETTINGS_KEYS.CURRENCY);
    if (savedCurrency) setCurrency(savedCurrency);

    const savedTheme = await getSetting(SETTINGS_KEYS.THEME);
    if (savedTheme === 'system' || savedTheme === 'light' || savedTheme === 'dark') {
      setThemeMode(savedTheme);
    }

    const savedPrivacy = await getSetting(SETTINGS_KEYS.PRIVACY);
    if (savedPrivacy !== null) {
      setPrivacyEnabled(savedPrivacy === 'true');
    }

    const savedAppLock = await getSetting(SETTINGS_KEYS.APP_LOCK);
    if (savedAppLock !== null) {
      setAppLockEnabled(savedAppLock === 'true');
    }
  }, [setThemeMode, setPrivacyEnabled]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSelectCurrency = async (newCode: string): Promise<void> => {
    if (newCode === currency) {
      setCurrencyModalOpen(false);
      return;
    }

    Alert.alert(
      'Change Currency',
      'Existing amounts are stored in minor units and are not converted to the new currency. Switch currency symbol anyway?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: async () => {
            await setSetting(SETTINGS_KEYS.CURRENCY, newCode);
            setCurrency(newCode);
            setCurrencyModalOpen(false);
            showToast({ message: `Currency set to ${newCode}` });
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleThemeChange = async (mode: ThemeMode): Promise<void> => {
    setThemeMode(mode);
    await setSetting(SETTINGS_KEYS.THEME, mode);
    await Haptics.selectionAsync();
  };

  const handleTogglePrivacy = async (): Promise<void> => {
    const next = !privacyEnabled;
    setPrivacyEnabled(next);
    await setSetting(SETTINGS_KEYS.PRIVACY, String(next));
    await Haptics.selectionAsync();
  };

  const handleExportCsv = async (): Promise<void> => {
    if (isExporting) return;
    try {
      setIsExporting(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await exportAndShareTransactionsCsv();
      if (!res.ok) {
        showToast({ message: 'Could not export CSV file' });
      }
    } catch (e) {
      console.error('Export error:', e);
      showToast({ message: 'Export failed' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleToggleAppLock = async (): Promise<void> => {
    const nextVal = !appLockEnabled;
    setAppLockEnabled(nextVal);
    await setSetting(SETTINGS_KEYS.APP_LOCK, String(nextVal));
    showToast({
      message: nextVal ? 'App lock enabled (locks after 60s in background)' : 'App lock disabled',
    });
  };

  const currentCurrencyObj =
    SUPPORTED_CURRENCIES.find((c) => c.code === currency) ?? SUPPORTED_CURRENCIES[0];

  return (
    <Screen style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.headerBar,
          {
            paddingHorizontal: space.lg,
            paddingTop: space.md,
            paddingBottom: space.sm,
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
        <Text style={[type.title, { color: colors.text }]}>Settings</Text>
        <View style={{ width: hit.min }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { padding: space.lg, gap: space.xl }]}
      >
        {/* Section: Preferences */}
        <View style={{ gap: space.sm }}>
          <Text style={[type.label, { color: colors.textSecondary }]}>PREFERENCES</Text>

          <Row
            title="Currency"
            subtitle={`${currentCurrencyObj.name} (${currentCurrencyObj.symbol})`}
            onPress={() => setCurrencyModalOpen(true)}
            trailing={
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            }
          />

          <View style={[styles.themeBox, { backgroundColor: colors.surface, padding: space.md, borderRadius: radius.md, gap: space.sm, borderWidth: 1, borderColor: colors.hairline }]}>
            <Text style={[type.heading, { color: colors.text }]}>Appearance</Text>
            <SegmentedControl
              options={[
                { label: 'System', value: 'system' },
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
              ]}
              value={themeMode}
              onChange={(val) => void handleThemeChange(val as ThemeMode)}
            />
          </View>

          <Row
            title="Privacy Mode"
            subtitle="Mask amounts across all screens"
            trailing={
              <Ionicons
                name={privacyEnabled ? 'checkbox' : 'square-outline'}
                size={22}
                color={colors.primary}
              />
            }
            onPress={() => void handleTogglePrivacy()}
          />

          <Row
            title="App Lock"
            subtitle="Lock app after 60 seconds in background"
            trailing={
              <Ionicons
                name={appLockEnabled ? 'checkbox' : 'square-outline'}
                size={22}
                color={colors.primary}
              />
            }
            onPress={() => void handleToggleAppLock()}
          />
        </View>

        {/* Section: Management */}
        <View style={{ gap: space.sm }}>
          <Text style={[type.label, { color: colors.textSecondary }]}>MANAGE</Text>

          <Row
            title="Categories"
            subtitle="Manage expense & income categories"
            leading={
              <View style={[styles.iconBox, { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm }]}>
                <Ionicons name="pricetags-outline" size={18} color={colors.primary} />
              </View>
            }
            trailing={
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            }
            onPress={() => router.push('/settings/categories')}
          />

          <Row
            title="Recurring Rules"
            subtitle="Automated weekly and monthly entries"
            leading={
              <View style={[styles.iconBox, { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm }]}>
                <Ionicons name="repeat-outline" size={18} color={colors.primary} />
              </View>
            }
            trailing={
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            }
            onPress={() => router.push('/settings/recurring')}
          />

          <Row
            title="Backup & Sync"
            subtitle="Optional PocketBase cloud synchronization"
            leading={
              <View style={[styles.iconBox, { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm }]}>
                <Ionicons name="cloud-outline" size={18} color={colors.primary} />
              </View>
            }
            trailing={
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            }
            onPress={() => router.push('/settings/sync')}
          />
        </View>

        {/* Section: Data Export */}
        <View style={{ gap: space.sm }}>
          <Text style={[type.label, { color: colors.textSecondary }]}>DATA</Text>

          <Row
            title="Export to CSV"
            subtitle={isExporting ? 'Exporting...' : 'Spreadsheet-safe format with formula defense'}
            leading={
              <View style={[styles.iconBox, { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm }]}>
                <Ionicons name="download-outline" size={18} color={colors.primary} />
              </View>
            }
            trailing={
              <Ionicons name="share-outline" size={18} color={colors.primary} />
            }
            onPress={() => void handleExportCsv()}
          />
        </View>

        {/* Section: Developer (dev mode only) */}
        {typeof __DEV__ !== 'undefined' && __DEV__ ? (
          <View style={{ gap: space.sm }}>
            <Text style={[type.label, { color: colors.textSecondary }]}>DEVELOPER</Text>
            <Row
              title="Load Demo Data"
              subtitle="Creates ~3 months of realistic entries, budgets & recurring rules"
              leading={
                <View style={[styles.iconBox, { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm }]}>
                  <Ionicons name="flask-outline" size={18} color={colors.primary} />
                </View>
              }
              onPress={async () => {
                try {
                  const { loadDemoData } = await import('@/dev/demoData');
                  const res = await loadDemoData();
                  showToast({ message: `Loaded ${res.transactionsCreated} demo entries.` });
                } catch {
                  showToast({ message: 'Failed to load demo data.' });
                }
              }}
            />
          </View>
        ) : null}

        {/* Section: About */}
        <View style={[styles.aboutBox, { gap: space.xs }]}>
          <Text style={[type.caption, { color: colors.textSecondary }]}>
            Pennywick v1.0.0
          </Text>
          <Text style={[type.caption, { color: colors.textFaint }]}>
            Local-first, private personal finance. Zero trackers, zero ads.
          </Text>
        </View>
      </ScrollView>

      {/* Currency Picker Modal */}
      <Modal
        visible={currencyModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCurrencyModalOpen(false)}
      >
        <Screen style={styles.modalRoot}>
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
            <Text style={[type.heading, { color: colors.text }]}>Select Currency</Text>
            <Press
              onPress={() => setCurrencyModalOpen(false)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Press>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.content, { padding: space.lg, gap: space.sm }]}
          >
            <Text style={[type.caption, { color: colors.textSecondary, marginBottom: space.sm }]}>
              Note: Changing currency will update symbols and formatting. It does not convert numerical amounts of existing entries.
            </Text>

            {SUPPORTED_CURRENCIES.map((curr) => {
              const isSelected = curr.code === currency;
              return (
                <Row
                  key={curr.code}
                  title={`${curr.name} (${curr.symbol})`}
                  subtitle={curr.code}
                  onPress={() => void handleSelectCurrency(curr.code)}
                  trailing={
                    isSelected ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    ) : null
                  }
                />
              );
            })}
          </ScrollView>
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalRoot: {
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
  scroll: {
    flex: 1,
  },
  content: {},
  themeBox: {},
  iconBox: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aboutBox: {
    paddingVertical: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
