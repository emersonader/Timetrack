import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../utils/constants';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  required = false,
  containerStyle,
  style,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error && styles.inputError,
          props.multiline && styles.inputMultiline,
          style,
        ]}
        placeholderTextColor={COLORS.gray400}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

interface CurrencyInputProps extends Omit<InputProps, 'value' | 'onChangeText'> {
  value: number | string;
  onChangeValue: (value: number) => void;
}

export function CurrencyInput({
  value,
  onChangeValue,
  ...props
}: CurrencyInputProps) {
  // Show empty string when value is 0 or not set
  const getInitialDisplay = () => {
    if (value === 0 || value === '' || value === undefined || value === null) {
      return '';
    }
    return typeof value === 'number' ? value.toString() : value;
  };

  const [displayValue, setDisplayValue] = useState(getInitialDisplay());

  const handleChange = (text: string) => {
    // Remove non-numeric characters except decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');

    // Ensure only one decimal point
    const parts = cleaned.split('.');
    const formatted =
      parts.length > 2
        ? `${parts[0]}.${parts.slice(1).join('')}`
        : cleaned;

    setDisplayValue(formatted);

    const numValue = parseFloat(formatted);
    if (!isNaN(numValue)) {
      onChangeValue(numValue);
    } else if (formatted === '' || formatted === '.') {
      onChangeValue(0);
    }
  };

  return (
    <View style={styles.currencyContainer}>
      <Text style={styles.currencySymbol}>$</Text>
      <Input
        {...props}
        value={displayValue}
        onChangeText={handleChange}
        keyboardType="decimal-pad"
        style={[styles.currencyInput, props.style]}
      />
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
    color: COLORS.gray700,
    marginBottom: SPACING.xs,
  },
  required: {
    color: COLORS.error,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  error: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  currencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.gray500,
    marginRight: SPACING.xs,
    marginTop: SPACING.lg,
  },
  currencyInput: {
    flex: 1,
  },
});
