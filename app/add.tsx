// app/add.tsx
// Add Entry Modal (S3)
// Amount-first entry flow: segmented kind switch, hero amount, keypad, category chips, note, date chip, instant save.

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Screen,
  Button,
  Chip,
  TextField,
  Keypad,
  SegmentedControl,
  Press,
} from '@/ui/components';
import { useTheme } from '@/ui/theme/useTheme';
import { useUiStore } from '@/ui/theme/uiStore';
import {
  applyKeypadInput,
  parseAmount,
  formatMoney,
} from '@/domain/money';
import { getToday, getYesterday, formatDayLabel } from '@/domain/dates';
import { listCategories } from '@/db/repositories/categories';
import { createTransaction } from '@/db/repositories/transactions';
import { getSetting, setSetting, SETTINGS_KEYS } from '@/db/repositories/settings';
import { DEFAULT_CURRENCY } from '@/data/currencies';
import { Category } from '@/db/schema';

const LAST_KIND_KEY = 'last_selected_kind';
const LARGE_AMOUNT_THRESHOLD_MINOR = 1000000000; // 10,000,000 major units

export default function AddModal(): React.JSX.Element {
  const router = useRouter();
  const { colors, space, type, hit } = useTheme();
  const showToast = useUiStore((state) => state.showToast);

  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [occurredOn, setOccurredOn] = useState(() => getToday());
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load user currency & last remembered kind
  useEffect(() => {
    async function initSettings(): Promise<void> {
      try {
        const savedCurrency = await getSetting(SETTINGS_KEYS.CURRENCY);
        if (savedCurrency) setCurrency(savedCurrency);

        const lastKind = await getSetting(LAST_KIND_KEY);
        if (lastKind === 'expense' || lastKind === 'income') {
          setKind(lastKind);
        }
      } catch (e) {
        console.error('Failed to load add screen settings:', e);
      }
    }
    void initSettings();
  }, []);

  // Load categories for active kind
  const loadCategories = useCallback(async (activeKind: 'expense' | 'income'): Promise<void> => {
    try {
      const cats = await listCategories({ kind: activeKind, includeArchived: false });
      setCategories(cats);
      if (cats.length > 0) {
        setSelectedCategoryId((prev) => {
          const exists = cats.some((c) => c.id === prev);
          return exists ? prev : cats[0].id;
        });
      }
    } catch (e) {
      console.error('Failed to load categories:', e);
    }
  }, []);

  useEffect(() => {
    void loadCategories(kind);
  }, [kind, loadCategories]);

  // Handle kind switch and persist preference
  const handleKindChange = (newKind: 'expense' | 'income'): void => {
    setKind(newKind);
    void setSetting(LAST_KIND_KEY, newKind);
  };

  // Keypad keystrokes
  const handleKeyPress = (key: string): void => {
    setAmountStr((prev) => applyKeypadInput(prev, key));
  };

  const handleKeyClear = (): void => {
    setAmountStr('');
  };

  // Calculate parsed integer minor units
  const parsedMinor = (() => {
    try {
      return parseAmount(amountStr);
    } catch {
      return 0;
    }
  })();

  const canSave = parsedMinor > 0 && !!selectedCategoryId && !isSubmitting;

  const performSave = async (): Promise<void> => {
    if (!canSave || !selectedCategoryId) return;

    setIsSubmitting(true);
    try {
      const res = await createTransaction({
        kind,
        amountMinor: parsedMinor,
        categoryId: selectedCategoryId,
        occurredOn,
        note: note.trim() || null,
      });

      if (!res.ok) {
        Alert.alert('Unable to save', res.error.message);
        setIsSubmitting(false);
        return;
      }

      // Success haptic
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Toast confirmation with 'Add another' action
      showToast({
        message: `${kind === 'expense' ? 'Expense' : 'Income'} of ${formatMoney(parsedMinor, currency)} logged.`,
        actionLabel: 'Add another',
        onAction: () => {
          setAmountStr('');
          setNote('');
        },
      });

      router.back();
    } catch (err) {
      console.error('Save failed:', err);
      Alert.alert('Error', 'An unexpected error occurred while saving.');
      setIsSubmitting(false);
    }
  };

  const handleSavePress = (): void => {
    if (parsedMinor >= LARGE_AMOUNT_THRESHOLD_MINOR) {
      const formatted = formatMoney(parsedMinor, currency);
      Alert.alert(
        "That's a big one",
        `You entered ${formatted}. Is this amount correct?`,
        [
          { text: 'Edit', style: 'cancel' },
          { text: 'Yes, save', style: 'default', onPress: () => void performSave() },
        ]
      );
    } else {
      void performSave();
    }
  };

  return (
    <Screen edges={['top', 'bottom']} style={styles.screen}>
      {/* Header bar */}
      <View style={[styles.header, { paddingVertical: space.sm }]}>
        <Press
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={[styles.closeButton, { minWidth: hit.min, minHeight: hit.min }]}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </Press>
        <Text style={[type.heading, { color: colors.text }]}>
          Log {kind === 'expense' ? 'Expense' : 'Income'}
        </Text>
        <View style={{ width: hit.min }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { gap: space.md, paddingBottom: space.xl }]}
      >
        {/* Kind switch */}
        <SegmentedControl
          value={kind}
          onChange={handleKindChange}
          options={[
            { value: 'expense', label: 'Expense' },
            { value: 'income', label: 'Income' },
          ]}
        />

        {/* Hero Amount Display */}
        <View
          style={[
            styles.amountDisplay,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingVertical: space.lg,
              paddingHorizontal: space.md,
            },
          ]}
        >
          <Text style={[type.label, { color: colors.textSecondary }]}>Amount</Text>
          <View style={styles.amountValueRow}>
            <Text
              style={[
                type.hero,
                {
                  color: kind === 'expense' ? colors.expense : colors.income,
                  fontSize: 38,
                  lineHeight: 44,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {amountStr ? formatMoney(parsedMinor, currency) : formatMoney(0, currency)}
            </Text>
          </View>
        </View>

        {/* Category horizontal chips */}
        <View style={{ gap: space.xs }}>
          <Text style={[type.label, { color: colors.textSecondary }]}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.categoryScroll, { gap: space.sm }]}
          >
            {categories.map((cat) => {
              const isSelected = cat.id === selectedCategoryId;
              return (
                <Chip
                  key={cat.id}
                  label={cat.name}
                  selected={isSelected}
                  onPress={() => setSelectedCategoryId(cat.id)}
                  leading={
                    <View
                      style={[
                        styles.catDot,
                        {
                          backgroundColor:
                            colors.categories[cat.colorKey as keyof typeof colors.categories] ??
                            colors.primary,
                        },
                      ]}
                    />
                  }
                />
              );
            })}
          </ScrollView>
        </View>

        {/* Date chips (Today, Yesterday) */}
        <View style={{ gap: space.xs }}>
          <Text style={[type.label, { color: colors.textSecondary }]}>Date</Text>
          <View style={[styles.dateRow, { gap: space.sm }]}>
            <Chip
              label={formatDayLabel(getToday())}
              selected={occurredOn === getToday()}
              onPress={() => setOccurredOn(getToday())}
            />
            <Chip
              label={formatDayLabel(getYesterday())}
              selected={occurredOn === getYesterday()}
              onPress={() => setOccurredOn(getYesterday())}
            />
          </View>
        </View>

        {/* Optional Note */}
        <TextField
          label="Note (optional)"
          placeholder="e.g. BRT ride to Ikeja, pepper & tomatoes"
          value={note}
          onChangeText={setNote}
          maxLength={280}
        />

        {/* Keypad */}
        <View style={{ marginTop: space.xs }}>
          <Keypad onKeyPress={handleKeyPress} onClear={handleKeyClear} disabled={isSubmitting} />
        </View>

        {/* Save CTA */}
        <View style={{ marginTop: space.sm }}>
          <Button
            label={isSubmitting ? 'Saving...' : 'Save entry'}
            variant="primary"
            disabled={!canSave}
            loading={isSubmitting}
            onPress={handleSavePress}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: 8,
  },
  amountDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 16,
  },
  amountValueRow: {
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryScroll: {
    paddingVertical: 4,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
