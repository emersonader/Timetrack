import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, CatalogItem } from '../types';
import { useInventory } from '../hooks/useInventory';
import { useSubscription } from '../contexts/SubscriptionContext';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import { LoadingSpinner } from '../components/LoadingSpinner';

const UNIT_OPTIONS = ['each', 'ft', 'lb', 'gal', 'box', 'roll', 'bag', 'set'];

type Props = NativeStackScreenProps<RootStackParamList, 'Inventory'>;

export function InventoryScreen({ navigation }: Props) {
  const { isPremium } = useSubscription();
  const {
    items,
    lowStockItems,
    isLoading,
    searchQuery,
    setSearchQuery,
    addItem,
    editItem,
    removeItem,
    adjustStock,
  } = useInventory();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Add form state
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [unit, setUnit] = useState('each');
  const [quantity, setQuantity] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [barcode, setBarcode] = useState('');

  // Pro gate
  if (!isPremium) {
    navigation.replace('Paywall', { feature: 'inventory' });
    return null;
  }

  const resetForm = () => {
    setName('');
    setCost('');
    setUnit('each');
    setQuantity('');
    setReorderLevel('');
    setSupplierName('');
    setBarcode('');
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Required', 'Please enter a material name.');
      return;
    }

    const parsedCost = parseFloat(cost) || 0;
    const parsedQty = parseInt(quantity, 10) || 0;
    const parsedReorder = parseInt(reorderLevel, 10) || 0;

    try {
      if (editingId) {
        await editItem(editingId, {
          name: trimmedName,
          default_cost: parsedCost,
          unit,
          current_quantity: parsedQty,
          reorder_level: parsedReorder,
          supplier_name: supplierName.trim() || null,
          barcode: barcode.trim() || null,
        });
      } else {
        await addItem({
          name: trimmedName,
          default_cost: parsedCost,
          unit,
          current_quantity: parsedQty,
          reorder_level: parsedReorder,
          supplier_name: supplierName.trim() || undefined,
          barcode: barcode.trim() || undefined,
        });
      }
      resetForm();
    } catch (error) {
      Alert.alert('Error', 'Failed to save item.');
    }
  };

  const handleEdit = (item: CatalogItem) => {
    setEditingId(item.id);
    setName(item.name);
    setCost(String(item.default_cost));
    setUnit(item.unit);
    setQuantity(String(item.current_quantity));
    setReorderLevel(String(item.reorder_level));
    setSupplierName(item.supplier_name || '');
    setBarcode(item.barcode || '');
    setShowAddForm(true);
  };

  const handleDelete = (item: CatalogItem) => {
    Alert.alert(
      'Delete Item',
      `Remove "${item.name}" from your inventory catalog?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeItem(item.id),
        },
      ]
    );
  };

  const handleAdjustStock = (item: CatalogItem, delta: number) => {
    adjustStock(item.id, delta);
  };

  const isLowStock = (item: CatalogItem) =>
    item.reorder_level > 0 && item.current_quantity <= item.reorder_level;

  const renderItem = ({ item }: { item: CatalogItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemMeta}>
            {formatCurrency(item.default_cost)}/{item.unit}
            {item.supplier_name ? ` · ${item.supplier_name}` : ''}
          </Text>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconBtn}>
            <Ionicons name="create-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stock row */}
      <View style={styles.stockRow}>
        <TouchableOpacity
          style={styles.stockBtn}
          onPress={() => handleAdjustStock(item, -1)}
          disabled={item.current_quantity <= 0}
        >
          <Ionicons name="remove" size={16} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.stockInfo}>
          <Text style={[
            styles.stockQty,
            isLowStock(item) && styles.stockLow,
          ]}>
            {item.current_quantity}
          </Text>
          <Text style={styles.stockUnit}>{item.unit}</Text>
          {isLowStock(item) && (
            <View style={styles.lowBadge}>
              <Ionicons name="warning" size={10} color={COLORS.warning} />
              <Text style={styles.lowBadgeText}>Low</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.stockBtn}
          onPress={() => handleAdjustStock(item, 1)}
        >
          <Ionicons name="add" size={16} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {item.barcode ? (
        <Text style={styles.barcodeText}>Barcode: {item.barcode}</Text>
      ) : null}
    </View>
  );

  const renderHeader = () => (
    <>
      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search-outline" size={18} color={COLORS.gray400} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search materials..."
            placeholderTextColor={COLORS.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.gray400} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Low stock alerts */}
      {lowStockItems.length > 0 && !searchQuery && (
        <View style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <Ionicons name="warning-outline" size={20} color={COLORS.warning} />
            <Text style={styles.alertTitle}>Low Stock ({lowStockItems.length})</Text>
          </View>
          {lowStockItems.map((item) => (
            <Text key={item.id} style={styles.alertItem}>
              {item.name}: {item.current_quantity} {item.unit} (reorder at {item.reorder_level})
            </Text>
          ))}
        </View>
      )}

      {/* Add form */}
      {showAddForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {editingId ? 'Edit Item' : 'Add to Catalog'}
          </Text>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Material name *"
            placeholderTextColor={COLORS.textMuted}
          />

          <View style={styles.formRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={cost}
              onChangeText={setCost}
              placeholder="Cost"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad"
            />
            <View style={styles.unitPicker}>
              {UNIT_OPTIONS.slice(0, 4).map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.unitBtnText, unit === u && styles.unitBtnTextActive]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formRow}>
            {UNIT_OPTIONS.slice(4).map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
                onPress={() => setUnit(u)}
              >
                <Text style={[styles.unitBtnText, unit === u && styles.unitBtnTextActive]}>
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.formRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="Qty on hand"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={reorderLevel}
              onChangeText={setReorderLevel}
              placeholder="Reorder at"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
            />
          </View>

          <TextInput
            style={styles.input}
            value={supplierName}
            onChangeText={setSupplierName}
            placeholder="Supplier name"
            placeholderTextColor={COLORS.textMuted}
          />

          <TextInput
            style={styles.input}
            value={barcode}
            onChangeText={setBarcode}
            placeholder="Barcode / SKU"
            placeholderTextColor={COLORS.textMuted}
          />

          <View style={styles.formBtnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Ionicons name="checkmark" size={18} color={COLORS.white} />
              <Text style={styles.saveBtnText}>
                {editingId ? 'Update' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <LoadingSpinner size="large" message="Loading inventory..." />
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      enableOnAndroid={true}
      extraScrollHeight={20}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={48} color={COLORS.gray300} />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No matches found' : 'No items in catalog'}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'Try a different search term'
                  : 'Tap + to add materials to your inventory catalog'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          maxToRenderPerBatch={10}
          windowSize={5}
        />

        {/* FAB */}
        {!showAddForm && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setShowAddForm(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={28} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },

  // Search
  searchRow: {
    marginBottom: SPACING.md,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },

  // Alert
  alertCard: {
    backgroundColor: COLORS.warning + '10',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  alertTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.warning,
  },
  alertItem: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    paddingLeft: SPACING.lg,
    marginBottom: 2,
  },

  // Item card
  itemCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  itemMeta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  iconBtn: {
    padding: 4,
  },

  // Stock row
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  stockBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  stockQty: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  stockLow: {
    color: COLORS.warning,
  },
  stockUnit: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },
  lowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BORDER_RADIUS.full,
  },
  lowBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.warning,
  },
  barcodeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray400,
    marginTop: SPACING.xs,
  },

  // Form
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  formTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  formRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    flexWrap: 'wrap',
  },
  unitPicker: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  unitBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  unitBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  unitBtnText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    fontWeight: '500',
  },
  unitBtnTextActive: {
    color: COLORS.white,
  },
  formBtnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray500,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  saveBtnText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
});
