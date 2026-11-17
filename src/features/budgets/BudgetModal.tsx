// src/features/budgets/BudgetModal.tsx
// Modal for setting, editing, or deleting a category budget.

import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Button,
  Chip,
  TextField,
  Press,
} from '../../ui/components';
import { useTheme } from '../../ui/theme/useTheme';
import { EnrichedBudget } from './useBudgetsData';
import { Category } from '../../db/schema';
import { parseAmount, formatMoney } from '../../domain/money';

interface BudgetModalProps {
  visible: boolean;
  budget: EnrichedBudget | null;
  unbudgetedCategories: Category[];
  currency: string;
  onClose: () => void;
  onSave: (categoryId: string, limitMinor: number) => Promise<boolean>;
  onDelete: (budgetId: string) => Promise<boolean>;
}

export function BudgetModal({
  visible,
  budget,
  unbudgetedCategories,
  currency,
  onClose,
  onSave,
  onDelete,
}: BudgetModalProps): React.JSX.Element | null {
  const { colors, space, radius, type, hit } = useTheme();

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [limitStr, setLimitStr] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (budget) {
      setSelectedCategoryId(budget.categoryId);
      const majorUnits = (budget.limitMinor / 100).toFixed(2);
      setLimitStr(majorUnits.endsWith('.00') ? majorUnits.slice(0, -3) : majorUnits);
      setErrorMsg('');
    } else {
      setSelectedCategoryId(unbudgetedCategories[0]?.id ?? '');
      setLimitStr('');
      setErrorMsg('');
    }
  }, [budget, unbudgetedCategories]);

  if (!visible) {
    return null;
  }

  let parsedLimit = 0;
  let isLimitValid = false;
  try {
    parsedLimit = parseAmount(limitStr);
    isLimitValid = parsedLimit > 0;
  } catch {
    isLimitValid = false;
  }

  const handleSave = async (): Promise<void> => {
    if (!selectedCategoryId) {
      setErrorMsg('Please select a category');
      return;
    }
    if (!isLimitValid) {
      setErrorMsg('Please enter a valid amount greater than zero');
      return;
    }

    try {
      setIsSaving(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const ok = await onSave(selectedCategoryId, parsedLimit);
      if (ok) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!budget) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ok = await onDelete(budget.id);
    if (ok) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: colors.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.hairline,
              paddingHorizontal: space.lg,
              paddingVertical: space.md,
            },
          ]}
        >
          <Text style={[type.heading, { color: colors.text }]}>
            {budget ? `Edit ${budget.categoryName} Budget` : 'Set Monthly Budget'}
          </Text>
          <Press
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={[styles.closeButton, { minHeight: hit.min, minWidth: hit.min }]}
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Press>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { padding: space.lg, gap: space.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Category Picker (if new) */}
          {!budget && (
            <View style={{ gap: space.sm }}>
              <Text style={[type.label, { color: colors.textSecondary }]}>Category</Text>
              {unbudgetedCategories.length === 0 ? (
                <Text style={[type.body, { color: colors.textSecondary }]}>
                  All expense categories already have a budget.
                </Text>
              ) : (
                <View style={styles.chipWrap}>
                  {unbudgetedCategories.map((cat) => {
                    const isSelected = cat.id === selectedCategoryId;
                    return (
                      <Chip
                        key={cat.id}
                        label={cat.name}
                        leading={
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          <Ionicons name={cat.icon as any} size={16} color={isSelected ? colors.onPrimary : colors.primary} />
                        }
                        selected={isSelected}
                        onPress={() => {
                          setSelectedCategoryId(cat.id);
                          setErrorMsg('');
                        }}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Monthly Limit Input */}
          <View style={{ gap: space.xs }}>
            <TextField
              label={`Monthly Limit (${currency})`}
              value={limitStr}
              onChangeText={(text) => {
                setLimitStr(text);
                setErrorMsg('');
              }}
              keyboardType="decimal-pad"
              placeholder="e.g. 50000"
              error={errorMsg || undefined}
            />
            {isLimitValid && (
              <Text style={[type.caption, { color: colors.textSecondary, alignSelf: 'flex-end' }]}>
                {formatMoney(parsedLimit, currency)} per month
              </Text>
            )}
          </View>

          {/* Quick preset chips */}
          <View style={{ gap: space.sm }}>
            <Text style={[type.label, { color: colors.textSecondary }]}>Quick Presets</Text>
            <View style={styles.presetRow}>
              {[10000, 25000, 50000, 100000].map((presetMajor) => (
                <Press
                  key={presetMajor}
                  onPress={() => {
                    setLimitStr(presetMajor.toString());
                    setErrorMsg('');
                  }}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderRadius: radius.pill,
                      paddingHorizontal: space.md,
                      paddingVertical: space.sm,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Set preset ${presetMajor}`}
                >
                  <Text style={[type.caption, { color: colors.text, fontWeight: '600' }]}>
                    {formatMoney(presetMajor * 100, currency, { showDecimals: false })}
                  </Text>
                </Press>
              ))}
            </View>
          </View>

          {/* Actions */}
          <View style={[styles.actions, { marginTop: space.md, gap: space.md }]}>
            <Button
              label={isSaving ? 'Saving...' : budget ? 'Save Changes' : 'Set Budget'}
              onPress={handleSave}
              disabled={!isLimitValid || isSaving || (!budget && unbudgetedCategories.length === 0)}
              variant="primary"
            />
            {budget && (
              <Button
                label="Delete Budget"
                onPress={handleDelete}
                variant="secondary"
                accessibilityLabel="Delete this budget"
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  closeButton: {
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
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {},
  actions: {},
});
