// src/features/history/EntrySheetModal.tsx
// S5 Entry Sheet Modal for editing and deleting existing transactions.

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
  SegmentedControl,
  Press,
} from '../../ui/components';
import { useTheme } from '../../ui/theme/useTheme';
import { TransactionWithCategory } from './historyTypes';
import { Category } from '../../db/schema';
import { UpdateTransactionInput } from '../../db/repositories/transactions';
import { parseAmount, formatMoney } from '../../domain/money';
import { getToday, getYesterday, formatDayLabel, isValidLocalDate } from '../../domain/dates';

interface EntrySheetModalProps {
  visible: boolean;
  transaction: TransactionWithCategory | null;
  categories: Category[];
  currency: string;
  onClose: () => void;
  onSave: (id: string, updates: UpdateTransactionInput) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
}

export function EntrySheetModal({
  visible,
  transaction,
  categories,
  currency,
  onClose,
  onSave,
  onDelete,
}: EntrySheetModalProps): React.JSX.Element | null {
  const { colors, space, radius, type, hit } = useTheme();

  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [occurredOn, setOccurredOn] = useState(getToday());
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [dateError, setDateError] = useState('');

  // Sync state when transaction changes
  useEffect(() => {
    if (transaction) {
      setKind(transaction.kind);
      // Format amount in major decimal units (e.g. 150000 minor -> "1500")
      const majorUnits = (transaction.amountMinor / 100).toFixed(2);
      setAmountStr(majorUnits.endsWith('.00') ? majorUnits.slice(0, -3) : majorUnits);
      setCategoryId(transaction.categoryId);
      setOccurredOn(transaction.occurredOn);
      setNote(transaction.note ?? '');
      setDateError('');
    }
  }, [transaction]);

  if (!transaction) {
    return null;
  }

  const availableCategories = categories.filter((c) => c.kind === kind);

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
      return;
    }
    if (!isValidLocalDate(occurredOn)) {
      setDateError('Please enter a valid date in YYYY-MM-DD format');
      return;
    }

    try {
      setIsSaving(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const ok = await onSave(transaction.id, {
        kind,
        amountMinor: parsedAmount,
        categoryId,
        occurredOn,
        note: note.trim() ? note.trim() : null,
      });

      if (ok) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    await onDelete(transaction.id);
  };

  const addedDate = new Date(transaction.createdAt);
  const addedLabel = `Added ${formatDayLabel(transaction.occurredOn)} • ${addedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

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
        {/* Header bar */}
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
          <View style={styles.headerTitleContainer}>
            <Text style={[type.heading, { color: colors.text }]}>Edit Entry</Text>
            <Text style={[type.caption, { color: colors.textSecondary }]}>{addedLabel}</Text>
          </View>
          <Press
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close sheet"
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
          {/* Recurring badge if applicable */}
          {transaction.recurringRuleId && (
            <View
              style={[
                styles.recurringBadge,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radius.sm,
                  paddingHorizontal: space.md,
                  paddingVertical: space.sm,
                },
              ]}
            >
              <Ionicons name="repeat" size={16} color={colors.primary} />
              <Text style={[type.caption, { color: colors.primary, fontWeight: '600' }]}>
                Generated by Recurring Rule
              </Text>
            </View>
          )}

          {/* Kind selector */}
          <SegmentedControl
            options={[
              { label: 'Expense', value: 'expense' },
              { label: 'Income', value: 'income' },
            ]}
            value={kind}
            onChange={(val) => {
              const newKind = val as 'expense' | 'income';
              setKind(newKind);
              const validForKind = categories.filter((c) => c.kind === newKind);
              if (validForKind.length > 0 && !validForKind.some((c) => c.id === categoryId)) {
                setCategoryId(validForKind[0].id);
              }
            }}
          />

          {/* Amount input */}
          <View style={{ gap: space.xs }}>
            <TextField
              label={`Amount (${currency})`}
              value={amountStr}
              onChangeText={setAmountStr}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
            {isAmountValid && (
              <Text style={[type.caption, { color: colors.textSecondary, alignSelf: 'flex-end' }]}>
                {formatMoney(parsedAmount, currency)}
              </Text>
            )}
          </View>

          {/* Category selection */}
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

          {/* Date selection */}
          <View style={{ gap: space.sm }}>
            <Text style={[type.label, { color: colors.textSecondary }]}>Date</Text>
            <View style={styles.dateRow}>
              <Chip
                label="Today"
                selected={occurredOn === getToday()}
                onPress={() => {
                  setOccurredOn(getToday());
                  setDateError('');
                }}
              />
              <Chip
                label="Yesterday"
                selected={occurredOn === getYesterday()}
                onPress={() => {
                  setOccurredOn(getYesterday());
                  setDateError('');
                }}
              />
            </View>
            <TextField
              label="Custom Date (YYYY-MM-DD)"
              value={occurredOn}
              onChangeText={(text) => {
                setOccurredOn(text);
                setDateError('');
              }}
              placeholder="YYYY-MM-DD"
              error={dateError || undefined}
            />
          </View>

          {/* Note input */}
          <TextField
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="Add note or description"
          />

          {/* Actions */}
          <View style={[styles.actions, { marginTop: space.md, gap: space.md }]}>
            <Button
              label={isSaving ? 'Saving...' : 'Save Changes'}
              onPress={handleSave}
              disabled={!isAmountValid || isSaving}
              variant="primary"
            />
            <Button
              label="Delete Entry"
              onPress={handleDelete}
              variant="secondary"
              accessibilityLabel="Delete this transaction"
            />
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
  headerTitleContainer: {
    flex: 1,
  },
  closeButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {},
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actions: {},
});
