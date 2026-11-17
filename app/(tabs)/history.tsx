// app/(tabs)/history.tsx
// History Screen (S4)
// Precision Utility layout: FlashList, day groups with subtotals, search, filters, entry sheet, delete with undo.

import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import {
  Screen,
  TextField,
  Chip,
  EmptyState,
  Button,
} from '@/ui/components';
import { useTheme } from '@/ui/theme/useTheme';
import { useHistoryData } from '@/features/history/useHistoryData';
import { HistoryListItem, TransactionWithCategory } from '@/features/history/historyTypes';
import { HistoryDayHeader } from '@/features/history/HistoryDayHeader';
import { HistoryRow } from '@/features/history/HistoryRow';
import { EntrySheetModal } from '@/features/history/EntrySheetModal';

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
      <Text style={[type.title, { color: colors.danger }]}>History Error</Text>
      <Text style={[type.body, { color: colors.textSecondary }]}>
        {error.message || 'Pennywick encountered a problem loading history.'}
      </Text>
      <Button label="Retry" onPress={retry} variant="primary" />
    </View>
  );
}

export default function HistoryScreen(): React.JSX.Element {
  const router = useRouter();
  const { colors, space, type } = useTheme();

  const {
    isLoading,
    error,
    currency,
    allCategories,
    filters,
    setSearchQuery,
    setKindFilter,
    setCategoryFilter,
    setDateFilter,
    resetFilters,
    filteredItems,
    totalRawCount,
    totalFilteredCount,
    deleteEntry,
    updateEntry,
    refetch,
  } = useHistoryData();

  const [selectedTx, setSelectedTx] = useState<TransactionWithCategory | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const handleOpenSheet = useCallback((tx: TransactionWithCategory) => {
    setSelectedTx(tx);
    setSheetVisible(true);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSheetVisible(false);
    setSelectedTx(null);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: HistoryListItem }): React.JSX.Element => {
      if (item.type === 'header') {
        return <HistoryDayHeader header={item} currency={currency} />;
      }
      return (
        <HistoryRow
          transaction={item.transaction}
          currency={currency}
          onPress={() => handleOpenSheet(item.transaction)}
          onDelete={() => void deleteEntry(item.transaction.id)}
        />
      );
    },
    [currency, handleOpenSheet, deleteEntry]
  );

  // Error state
  if (error) {
    return (
      <Screen style={styles.centerContainer}>
        <EmptyState
          title="Couldn't load history"
          description={error.message || 'Please try refreshing.'}
          actionLabel="Try again"
          onAction={() => void refetch()}
        />
      </Screen>
    );
  }

  // Loading skeleton state
  if (isLoading && totalRawCount === 0) {
    return (
      <Screen style={styles.centerContainer}>
        <Text style={[type.body, { color: colors.textSecondary }]}>Loading history...</Text>
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      {/* Title Bar */}
      <View
        style={[
          styles.headerBar,
          {
            paddingHorizontal: space.lg,
            paddingTop: space.md,
            paddingBottom: space.sm,
          },
        ]}
      >
        <Text style={[type.title, { color: colors.text }]}>History</Text>
        {totalRawCount > 0 && (
          <Text style={[type.caption, { color: colors.textSecondary }]}>
            {totalFilteredCount} {totalFilteredCount === 1 ? 'entry' : 'entries'}
          </Text>
        )}
      </View>

      {/* Search Bar */}
      <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
        <TextField
          label="Search"
          value={filters.searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by note or category..."
        />
      </View>

      {/* Filter Chips Bar */}
      <View style={{ paddingBottom: space.sm }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filtersScroll, { paddingHorizontal: space.lg, gap: space.sm }]}
        >
          {/* Kind filters */}
          <Chip
            label="All"
            selected={filters.kind === 'all'}
            onPress={() => setKindFilter('all')}
          />
          <Chip
            label="Expenses"
            selected={filters.kind === 'expense'}
            onPress={() => setKindFilter('expense')}
          />
          <Chip
            label="Income"
            selected={filters.kind === 'income'}
            onPress={() => setKindFilter('income')}
          />

          {/* Date range filters */}
          <Chip
            label="This Month"
            selected={filters.dateFilter === 'this_month'}
            onPress={() =>
              setDateFilter(filters.dateFilter === 'this_month' ? 'all' : 'this_month')
            }
          />
          <Chip
            label="Last Month"
            selected={filters.dateFilter === 'last_month'}
            onPress={() =>
              setDateFilter(filters.dateFilter === 'last_month' ? 'all' : 'last_month')
            }
          />
          <Chip
            label="Last 90 Days"
            selected={filters.dateFilter === 'last_90_days'}
            onPress={() =>
              setDateFilter(filters.dateFilter === 'last_90_days' ? 'all' : 'last_90_days')
            }
          />

          {/* Category filters */}
          {allCategories.map((cat) => (
            <Chip
              key={cat.id}
              label={cat.name}
              leading={
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <Ionicons name={cat.icon as any} size={16} color={filters.categoryId === cat.id ? colors.onPrimary : colors.primary} />
              }
              selected={filters.categoryId === cat.id}
              onPress={() =>
                setCategoryFilter(filters.categoryId === cat.id ? 'all' : cat.id)
              }
            />
          ))}
        </ScrollView>
      </View>

      {/* Content: List or Empty State */}
      {totalRawCount === 0 ? (
        <View style={styles.centerContainer}>
          <EmptyState
            title="No transactions yet"
            description="Tap the + button to record your first expense or income."
            actionLabel="Add Entry"
            onAction={() => router.push('/add')}
          />
        </View>
      ) : totalFilteredCount === 0 ? (
        <View style={styles.centerContainer}>
          <EmptyState
            title="No matching entries"
            description="No transactions match your search or filter criteria."
            actionLabel="Clear Filters"
            onAction={resetFilters}
          />
        </View>
      ) : (
        <View style={styles.listContainer}>
          <FlashList
            data={filteredItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: space.xxl }}
          />
        </View>
      )}

      {/* Entry Sheet Modal */}
      <EntrySheetModal
        visible={sheetVisible}
        transaction={selectedTx}
        categories={allCategories}
        currency={currency}
        onClose={handleCloseSheet}
        onSave={updateEntry}
        onDelete={deleteEntry}
      />
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
    alignItems: 'baseline',
  },
  filtersScroll: {
    flexDirection: 'row',
  },
  listContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
