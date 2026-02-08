import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CURRENCIES, CurrencyInfo, getCurrencyInfo } from '../utils/currency';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';

interface CurrencyPickerProps {
  value: string;
  onChange: (currencyCode: string) => void;
  label?: string;
  disabled?: boolean;
}

export function CurrencyPicker({ value, onChange, label, disabled }: CurrencyPickerProps) {
  const [visible, setVisible] = useState(false);
  const selected = getCurrencyInfo(value);

  const handleSelect = (currency: CurrencyInfo) => {
    onChange(currency.code);
    setVisible(false);
  };

  const renderItem = ({ item }: { item: CurrencyInfo }) => {
    const isSelected = item.code === value;
    return (
      <TouchableOpacity
        style={[styles.option, isSelected && styles.optionSelected]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        <Text style={styles.flag}>{item.flag}</Text>
        <View style={styles.optionInfo}>
          <Text style={[styles.optionCode, isSelected && styles.optionTextSelected]}>
            {item.code}
          </Text>
          <Text style={styles.optionName}>{item.name}</Text>
        </View>
        <Text style={styles.optionSymbol}>{item.symbol}</Text>
        {isSelected && (
          <Ionicons name="checkmark" size={20} color={COLORS.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.picker, disabled && styles.pickerDisabled]}
        onPress={() => !disabled && setVisible(true)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={styles.flag}>{selected.flag}</Text>
        <Text style={styles.pickerText}>{selected.code} — {selected.name}</Text>
        {!disabled && (
          <Ionicons name="chevron-down" size={18} color={COLORS.gray400} />
        )}
        {disabled && (
          <Ionicons name="lock-closed" size={16} color={COLORS.gray400} />
        )}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray500} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={CURRENCIES}
              renderItem={renderItem}
              keyExtractor={(item) => item.code}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  pickerDisabled: {
    opacity: 0.5,
  },
  pickerText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  flag: {
    fontSize: 20,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '60%',
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  optionSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  optionInfo: {
    flex: 1,
  },
  optionCode: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  optionTextSelected: {
    color: COLORS.primary,
  },
  optionName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },
  optionSymbol: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray500,
    marginRight: SPACING.sm,
  },
});
