// app/settings/recurring-edit.tsx
// Recurring Rule Editor Screen (T12)
// Create or edit recurring rules with weekly / monthly scheduling.

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Screen,
  Button,
  Chip,
  TextField,
  SegmentedControl,
  Press,
} from '@/ui/components';
import { useTheme } from '@/ui/theme/useTheme';
import { useUiStore } from '@/ui/theme/uiStore';
import {
  createRecurringRule,
  updateRecurringRule,
  deleteRecurringRule,
  getRecurringRuleById,
} from '@/db/repositories/recurring';
import { listCategories } from '@/db/repositories/categories';
import { getSetting, SETTINGS_KEYS } from '@/db/repositories/settings';
import { DEFAULT_CURRENCY } from '@/data/currencies';
import { getToday, isValidLocalDate } from '@/domain/dates';
import { parseAmount, formatMoney } from '@/domain/money';
import { Category } from '@/db/schema';

const WEEKDAYS = [
  { label: 'Mon', day: 1 },
  { label: 'Tue', day: 2 },
  { label: 'Wed', day: 3 },
  { label: 'Thu', day: 4 },
  { label: 'Fri', day: 5 },
  { label: 'Sat', day: 6 },
  { label: 'Sun', day: 7 },
];

export default function RecurringEditScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const ruleId = params.id;

  const { colors, space, radius, type, hit } = useTheme();
  const showToast = useUiStore((state) => state.showToast);

  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [day, setDay] = useState(1);
  const [startOn, setStartOn] = useState(() => getToday());
  const [note, setNote] = useState('');
  const [active, setActive] = useState(true);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = useCallback(async (): Promise<void> => {
    try {
      const savedCurrency = await getSetting(SETTINGS_KEYS.CURRENCY);
      if (savedCurrency) setCurrency(savedCurrency);

      const allCats = await listCategories({ includeArchived: false });
      setCategories(allCats);

      if (ruleId) {
        const existing = await getRecurringRuleById(ruleId);
        if (existing) {
          setKind(existing.kind);
          const major = (existing.amountMinor / 100).toFixed(2);
          setAmountStr(major.endsWith('.00') ? major.slice(0, -3) : major);
          setCategoryId(existing.categoryId);
          setFrequency(existing.frequency);
          setDay(existing.day);
          setStartOn(existing.startOn);
          setNote(existing.note ?? '');
          setActive(existing.active);
          return;
        }
      }

      // Default category if new
      const defaultCats = allCats.filter((c) => c.kind === kind);
      if (defaultCats.length > 0) {
        setCategoryId(defaultCats[0].id);
      }
    } catch (e) {
      console.error('Failed to load recurring rule data:', e);
    }
  }, [ruleId, kind]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  let parsedAmount = 0;
  let isAmountValid = false;
  try {
    parsedAmount = parseAmount(amountStr);
    isAmountValid = parsedAmount > 0;
  } catch {
    isAmountValid = false;
  }

  const handleSave = async (): Promise<void> => {
    if (!isAmountValid) {
      setErrorMsg('Please enter a valid amount greater than zero');
      return;
    }
    if (!categoryId) {
      setErrorMsg('Please select a category');
      return;
    }
    if (!isValidLocalDate(startOn)) {
      setErrorMsg('Please enter a valid start date (YYYY-MM-DD)');
      return;
    }

    try {
      setIsSaving(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (ruleId) {
        const res = await updateRecurringRule(ruleId, {
          kind,
          amountMinor: parsedAmount,
          categoryId,
          frequency,
          day,
          note: note.trim() || null,
          active,
        });
        if (res.ok) {
          showToast({ message: 'Recurring rule updated' });
          router.back();
        } else {
          setErrorMsg(res.error.message);
        }
      } else {
        const res = await createRecurringRule({
          kind,
          amountMinor: parsedAmount,
          categoryId,
          frequency,
          day,
          startOn,
          note: note.trim() || null,
          active,
        });
        if (res.ok) {
          showToast({ message: 'Recurring rule created' });
          router.back();
        } else {
          setErrorMsg(res.error.message);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!ruleId) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const res = await deleteRecurringRule(ruleId);
    if (res.ok) {
      showToast({ message: 'Recurring rule deleted' });
      router.back();
    }
  };

  const availableCategories = categories.filter((c) => c.kind === kind);

  return (
    <Screen style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
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
          <Text style={[type.heading, { color: colors.text }]}>
            {ruleId ? 'Edit Recurring Rule' : 'New Recurring Rule'}
          </Text>
          <View style={{ width: hit.min }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { padding: space.lg, gap: space.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Kind Switch */}
          <SegmentedControl
            options={[
              { label: 'Expense', value: 'expense' },
              { label: 'Income', value: 'income' },
            ]}
            value={kind}
            onChange={(val) => {
              const newKind = val as 'expense' | 'income';
              setKind(newKind);
              const validCats = categories.filter((c) => c.kind === newKind);
              if (validCats.length > 0 && !validCats.some((c) => c.id === categoryId)) {
                setCategoryId(validCats[0].id);
              }
            }}
          />

          {/* Amount */}
          <View style={{ gap: space.xs }}>
            <TextField
              label={`Amount (${currency})`}
              value={amountStr}
              onChangeText={(text) => {
                setAmountStr(text);
                setErrorMsg('');
              }}
              keyboardType="decimal-pad"
              placeholder="0.00"
              error={errorMsg || undefined}
            />
            {isAmountValid && (
              <Text style={[type.caption, { color: colors.textSecondary, alignSelf: 'flex-end' }]}>
                {formatMoney(parsedAmount, currency)}
              </Text>
            )}
          </View>

          {/* Category Chips */}
          <View style={{ gap: space.sm }}>
            <Text style={[type.label, { color: colors.textSecondary }]}>Category</Text>
            <View style={styles.chipWrap}>
              {availableCategories.map((cat) => {
                const isSelected = cat.id === categoryId;
                return (
                  <Chip
                    key={cat.id}
                    label={cat.name}
                    leading={
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      <Ionicons name={cat.icon as any} size={16} color={isSelected ? colors.onPrimary : colors.primary} />
                    }
                    selected={isSelected}
                    onPress={() => setCategoryId(cat.id)}
                  />
                );
              })}
            </View>
          </View>

          {/* Frequency Switch */}
          <View style={{ gap: space.sm }}>
            <Text style={[type.label, { color: colors.textSecondary }]}>Frequency</Text>
            <SegmentedControl
              options={[
                { label: 'Monthly', value: 'monthly' },
                { label: 'Weekly', value: 'weekly' },
              ]}
              value={frequency}
              onChange={(val) => {
                const f = val as 'weekly' | 'monthly';
                setFrequency(f);
                setDay(1);
              }}
            />
          </View>

          {/* Day selection */}
          {frequency === 'weekly' ? (
            <View style={{ gap: space.sm }}>
              <Text style={[type.label, { color: colors.textSecondary }]}>Repeat Every</Text>
              <View style={styles.weekdayRow}>
                {WEEKDAYS.map((w) => (
                  <Press
                    key={w.day}
                    onPress={() => setDay(w.day)}
                    style={[
                      styles.dayButton,
                      {
                        backgroundColor: day === w.day ? colors.primary : colors.surfaceMuted,
                        borderRadius: radius.pill,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={w.label}
                  >
                    <Text
                      style={[
                        type.caption,
                        {
                          color: day === w.day ? colors.onPrimary : colors.text,
                          fontWeight: '600',
                        },
                      ]}
                    >
                      {w.label}
                    </Text>
                  </Press>
                ))}
              </View>
            </View>
          ) : (
            <View style={{ gap: space.sm }}>
              <Text style={[type.label, { color: colors.textSecondary }]}>
                Day of Month (1 - 31)
              </Text>
              <View style={styles.presetDaysRow}>
                {[1, 5, 10, 15, 20, 25, 28, 31].map((d) => (
                  <Press
                    key={d}
                    onPress={() => setDay(d)}
                    style={[
                      styles.dayButton,
                      {
                        backgroundColor: day === d ? colors.primary : colors.surfaceMuted,
                        borderRadius: radius.pill,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Day ${d}`}
                  >
                    <Text
                      style={[
                        type.caption,
                        {
                          color: day === d ? colors.onPrimary : colors.text,
                          fontWeight: '600',
                        },
                      ]}
                    >
                      {d}
                    </Text>
                  </Press>
                ))}
              </View>
              <TextField
                label="Custom Day (1-31)"
                value={day.toString()}
                onChangeText={(text) => {
                  const val = parseInt(text, 10);
                  if (!isNaN(val) && val >= 1 && val <= 31) {
                    setDay(val);
                  }
                }}
                keyboardType="number-pad"
              />
            </View>
          )}

          {/* Start Date */}
          {!ruleId && (
            <TextField
              label="Start Date (YYYY-MM-DD)"
              value={startOn}
              onChangeText={setStartOn}
              placeholder="YYYY-MM-DD"
            />
          )}

          {/* Note / Label */}
          <TextField
            label="Note or Description"
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Apartment Rent, Spotify, Salary"
          />

          {/* Active status */}
          <View style={styles.activeRow}>
            <Text style={[type.body, { color: colors.text }]}>Rule is Active</Text>
            <Press
              onPress={() => setActive((prev) => !prev)}
              hitSlop={8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              accessibilityLabel="Rule active toggle"
            >
              <Ionicons
                name={active ? 'checkbox' : 'square-outline'}
                size={24}
                color={colors.primary}
              />
            </Press>
          </View>

          {/* Actions */}
          <View style={{ gap: space.md, marginTop: space.md }}>
            <Button
              label={isSaving ? 'Saving...' : ruleId ? 'Save Changes' : 'Create Recurring Rule'}
              onPress={handleSave}
              disabled={!isAmountValid || isSaving}
              variant="primary"
            />
            {ruleId && (
              <Button
                label="Delete Rule"
                onPress={handleDelete}
                variant="secondary"
                accessibilityLabel="Delete this recurring rule"
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
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
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  presetDaysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
});
