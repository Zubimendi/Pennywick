// app/settings/categories.tsx
// Categories Management Screen (T9)
// Add, rename, recolor, reorder, archive categories. Enforces rule: Cannot delete a used category.

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
  TextField,
  SegmentedControl,
  Press,
  Row,
  EmptyState,
} from '@/ui/components';
import { useTheme } from '@/ui/theme/useTheme';
import { useUiStore } from '@/ui/theme/uiStore';
import {
  listCategories,
  createCategory,
  updateCategory,
  archiveCategory,
  unarchiveCategory,
  deleteCategory,
  reorderCategories,
} from '@/db/repositories/categories';
import { Category } from '@/db/schema';

const AVAILABLE_ICONS = [
  'fast-food-outline',
  'car-outline',
  'home-outline',
  'cart-outline',
  'film-outline',
  'medkit-outline',
  'school-outline',
  'airplane-outline',
  'briefcase-outline',
  'fitness-outline',
  'gift-outline',
  'wallet-outline',
  'bulb-outline',
  'pricetag-outline',
  'receipt-outline',
  'bus-outline',
  'cafe-outline',
  'construct-outline',
  'trending-up-outline',
  'cash-outline',
] as const;

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
      <Text style={[type.title, { color: colors.danger }]}>Categories Error</Text>
      <Text style={[type.body, { color: colors.textSecondary }]}>
        {error.message || 'Pennywick encountered a problem loading categories.'}
      </Text>
      <Button label="Retry" onPress={retry} variant="primary" />
    </View>
  );
}

export default function CategoriesScreen(): React.JSX.Element {
  const router = useRouter();
  const { colors, space, radius, type, hit } = useTheme();
  const showToast = useUiStore((state) => state.showToast);

  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [showArchived, setShowArchived] = useState(false);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit / Create modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('fast-food-outline');
  const [formColorKey, setFormColorKey] = useState('cat1');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const items = await listCategories({
        kind,
        includeArchived: showArchived,
      });
      setCategoriesList(items);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setIsLoading(false);
    }
  }, [kind, showArchived]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleOpenAdd = (): void => {
    setEditingCategory(null);
    setFormName('');
    setFormIcon(kind === 'expense' ? 'cart-outline' : 'cash-outline');
    setFormColorKey('cat1');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: Category): void => {
    setEditingCategory(category);
    setFormName(category.name);
    setFormIcon(category.icon);
    setFormColorKey(category.colorKey);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (): Promise<void> => {
    if (!formName.trim()) {
      setErrorMsg('Category name cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      if (editingCategory) {
        const res = await updateCategory(editingCategory.id, {
          name: formName.trim(),
          icon: formIcon,
          colorKey: formColorKey,
        });
        if (res.ok) {
          showToast({ message: 'Category updated' });
          setIsModalOpen(false);
          await loadData();
        } else {
          setErrorMsg(res.error.message);
        }
      } else {
        const res = await createCategory({
          name: formName.trim(),
          kind,
          icon: formIcon,
          colorKey: formColorKey,
          sortOrder: categoriesList.length,
        });
        if (res.ok) {
          showToast({ message: 'Category added' });
          setIsModalOpen(false);
          await loadData();
        } else {
          setErrorMsg(res.error.message);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleArchive = async (cat: Category): Promise<void> => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (cat.archived) {
      const res = await unarchiveCategory(cat.id);
      if (res.ok) {
        showToast({ message: `${cat.name} unarchived` });
        setIsModalOpen(false);
        await loadData();
      }
    } else {
      const res = await archiveCategory(cat.id);
      if (res.ok) {
        showToast({ message: `${cat.name} archived` });
        setIsModalOpen(false);
        await loadData();
      }
    }
  };

  const handleDelete = async (cat: Category): Promise<void> => {
    const res = await deleteCategory(cat.id);
    if (!res.ok) {
      // Non-negotiable acceptance rule: Cannot delete a used category; archive instead.
      Alert.alert(
        'Cannot Delete Category',
        res.error.message,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Archive Instead',
            onPress: () => {
              void handleToggleArchive(cat);
            },
          },
        ]
      );
      return;
    }

    showToast({ message: `${cat.name} deleted` });
    setIsModalOpen(false);
    await loadData();
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down'): Promise<void> => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categoriesList.length) {
      return;
    }

    const reordered = [...categoriesList];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setCategoriesList(reordered);
    await reorderCategories(reordered.map((c) => c.id));
    await Haptics.selectionAsync();
  };

  const colorEntries = Object.entries(colors.categories) as Array<[string, string]>;

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
        <Text style={[type.heading, { color: colors.text }]}>Manage Categories</Text>
        <Button
          label="Add"
          variant="primary"
          onPress={handleOpenAdd}
        />
      </View>

      {/* Segmented Switch & Archived Toggle */}
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, gap: space.sm }}>
        <SegmentedControl
          options={[
            { label: 'Expenses', value: 'expense' },
            { label: 'Income', value: 'income' },
          ]}
          value={kind}
          onChange={(val) => setKind(val as 'expense' | 'income')}
        />
        <View style={styles.toggleRow}>
          <Press
            onPress={() => setShowArchived((prev) => !prev)}
            style={styles.archivedPress}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: showArchived }}
            accessibilityLabel="Show archived categories"
          >
            <Ionicons
              name={showArchived ? 'checkbox' : 'square-outline'}
              size={20}
              color={colors.primary}
            />
            <Text style={[type.label, { color: colors.textSecondary }]}>
              Show Archived
            </Text>
          </Press>
        </View>
      </View>

      {/* Category List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { padding: space.lg, gap: space.sm }]}
      >
        {categoriesList.length === 0 && !isLoading ? (
          <EmptyState
            title="No categories found"
            description="Tap Add to create a custom category."
            actionLabel="Add Category"
            onAction={handleOpenAdd}
          />
        ) : (
          categoriesList.map((cat, idx) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const catColor = (colors.categories as any)[cat.colorKey] ?? colors.primary;
            return (
              <Row
                key={cat.id}
                onPress={() => handleOpenEdit(cat)}
                leading={
                  <View
                    style={[
                      styles.iconBox,
                      {
                        backgroundColor: catColor + '20',
                        borderRadius: radius.md,
                      },
                    ]}
                  >
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Ionicons name={cat.icon as any} size={20} color={catColor} />
                  </View>
                }
                title={cat.name}
                subtitle={cat.archived ? 'Archived' : undefined}
                trailing={
                  <View style={styles.reorderButtons}>
                    <Press
                      onPress={() => void handleMoveOrder(idx, 'up')}
                      disabled={idx === 0}
                      hitSlop={4}
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${cat.name} up`}
                      style={{ opacity: idx === 0 ? 0.3 : 1 }}
                    >
                      <Ionicons name="chevron-up" size={20} color={colors.textSecondary} />
                    </Press>
                    <Press
                      onPress={() => void handleMoveOrder(idx, 'down')}
                      disabled={idx === categoriesList.length - 1}
                      hitSlop={4}
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${cat.name} down`}
                      style={{ opacity: idx === categoriesList.length - 1 ? 0.3 : 1 }}
                    >
                      <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                    </Press>
                  </View>
                }
              />
            );
          })
        )}
      </ScrollView>

      {/* Edit / Add Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <Screen style={styles.modalRoot}>
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
            <Text style={[type.heading, { color: colors.text }]}>
              {editingCategory ? 'Edit Category' : 'New Category'}
            </Text>
            <Press
              onPress={() => setIsModalOpen(false)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Press>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.content, { padding: space.lg, gap: space.lg }]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Name input */}
            <TextField
              label="Category Name"
              value={formName}
              onChangeText={(text) => {
                setFormName(text);
                setErrorMsg('');
              }}
              placeholder="e.g. Groceries"
              error={errorMsg || undefined}
            />

            {/* Icon Picker */}
            <View style={{ gap: space.xs }}>
              <Text style={[type.label, { color: colors.textSecondary }]}>Pick Icon</Text>
              <View style={styles.iconGrid}>
                {AVAILABLE_ICONS.map((iconName) => {
                  const isSelected = formIcon === iconName;
                  return (
                    <Press
                      key={iconName}
                      onPress={() => setFormIcon(iconName)}
                      style={[
                        styles.iconChoice,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surfaceMuted,
                          borderRadius: radius.md,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Select icon ${iconName}`}
                    >
                      <Ionicons
                        name={iconName}
                        size={22}
                        color={isSelected ? colors.onPrimary : colors.text}
                      />
                    </Press>
                  );
                })}
              </View>
            </View>

            {/* Color Picker */}
            <View style={{ gap: space.xs }}>
              <Text style={[type.label, { color: colors.textSecondary }]}>Pick Color</Text>
              <View style={styles.colorGrid}>
                {colorEntries.map(([key, hex]) => {
                  const isSelected = formColorKey === key;
                  return (
                    <Press
                      key={key}
                      onPress={() => setFormColorKey(key)}
                      style={[
                        styles.colorChoice,
                        {
                          backgroundColor: hex,
                          borderColor: isSelected ? colors.text : 'transparent',
                          borderWidth: isSelected ? 3 : 0,
                          borderRadius: radius.pill,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Select color ${key}`}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </Press>
                  );
                })}
              </View>
            </View>

            {/* Actions */}
            <View style={{ gap: space.md, marginTop: space.sm }}>
              <Button
                label={isSaving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                onPress={handleSave}
                disabled={isSaving}
                variant="primary"
              />

              {editingCategory && (
                <>
                  <Button
                    label={editingCategory.archived ? 'Unarchive Category' : 'Archive Category'}
                    onPress={() => void handleToggleArchive(editingCategory)}
                    variant="secondary"
                  />
                  <Button
                    label="Delete Category"
                    onPress={() => void handleDelete(editingCategory)}
                    variant="secondary"
                    accessibilityLabel="Delete this category"
                  />
                </>
              )}
            </View>
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  archivedPress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scroll: {
    flex: 1,
  },
  content: {},
  iconBox: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconChoice: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorChoice: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
