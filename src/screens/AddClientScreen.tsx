import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, CreateClientInput, ValidationErrors } from '../types';
import { useClientMutations } from '../hooks/useClients';
import { validateClientInput, hasErrors, sanitizeString } from '../utils/validation';
import { COLORS, SPACING, FONT_SIZES } from '../utils/constants';
import { Input, CurrencyInput } from '../components/Input';
import { Button } from '../components/Button';
import { LoadingOverlay } from '../components/LoadingSpinner';

type Props = NativeStackScreenProps<RootStackParamList, 'AddClient'>;

export function AddClientScreen({ navigation }: Props) {
  const { createClient, isLoading } = useClientMutations();

  const [formData, setFormData] = useState<Partial<CreateClientInput>>({
    first_name: '',
    last_name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip_code: '',
    email: '',
    hourly_rate: 0,
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const updateField = (field: keyof CreateClientInput, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleBlur = (field: keyof CreateClientInput) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Validate single field
    const validationResult = validateClientInput({
      ...formData,
      [field]: formData[field],
    });

    if (validationResult[field]) {
      setErrors((prev) => ({ ...prev, [field]: validationResult[field] }));
    }
  };

  const handleSave = async () => {
    // Validate all fields
    const validationResult = validateClientInput(formData);
    setErrors(validationResult);

    // Mark all fields as touched
    setTouched({
      first_name: true,
      last_name: true,
      phone: true,
      email: true,
      hourly_rate: true,
      street: true,
      city: true,
      state: true,
      zip_code: true,
    });

    if (hasErrors(validationResult)) {
      return;
    }

    try {
      const client = await createClient({
        first_name: sanitizeString(formData.first_name),
        last_name: sanitizeString(formData.last_name),
        phone: sanitizeString(formData.phone),
        street: sanitizeString(formData.street),
        city: sanitizeString(formData.city),
        state: sanitizeString(formData.state),
        zip_code: sanitizeString(formData.zip_code),
        email: sanitizeString(formData.email),
        hourly_rate: formData.hourly_rate ?? 0,
      });

      // Navigate to the new client's details
      navigation.replace('ClientDetails', { clientId: client.id });
    } catch (error) {
      Alert.alert('Error', 'Failed to create client. Please try again.');
    }
  };

  const handleCancel = () => {
    const hasChanges = Object.values(formData).some(
      (value) => value !== '' && value !== 0
    );

    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LoadingOverlay visible={isLoading} message="Creating client..." />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label="First Name"
          placeholder="Enter first name"
          value={formData.first_name}
          onChangeText={(text) => updateField('first_name', text)}
          onBlur={() => handleBlur('first_name')}
          error={touched.first_name ? errors.first_name : undefined}
          required
          autoCapitalize="words"
          autoFocus
        />

        <Input
          label="Last Name"
          placeholder="Enter last name"
          value={formData.last_name}
          onChangeText={(text) => updateField('last_name', text)}
          onBlur={() => handleBlur('last_name')}
          error={touched.last_name ? errors.last_name : undefined}
          required
          autoCapitalize="words"
        />

        <Input
          label="Phone Number"
          placeholder="Enter phone number"
          value={formData.phone}
          onChangeText={(text) => updateField('phone', text)}
          onBlur={() => handleBlur('phone')}
          error={touched.phone ? errors.phone : undefined}
          required
          keyboardType="phone-pad"
        />

        <Input
          label="Email"
          placeholder="Enter email address"
          value={formData.email}
          onChangeText={(text) => updateField('email', text)}
          onBlur={() => handleBlur('email')}
          error={touched.email ? errors.email : undefined}
          required
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.sectionTitle}>Address</Text>

        <Input
          label="Street"
          placeholder="Street address"
          value={formData.street}
          onChangeText={(text) => updateField('street', text)}
          onBlur={() => handleBlur('street')}
          error={touched.street ? errors.street : undefined}
          required
          autoCapitalize="words"
        />

        <Input
          label="City"
          placeholder="City"
          value={formData.city}
          onChangeText={(text) => updateField('city', text)}
          onBlur={() => handleBlur('city')}
          error={touched.city ? errors.city : undefined}
          required
          autoCapitalize="words"
        />

        <View style={styles.row}>
          <View style={styles.stateField}>
            <Input
              label="State"
              placeholder="NY"
              value={formData.state}
              onChangeText={(text) => updateField('state', text.toUpperCase())}
              onBlur={() => handleBlur('state')}
              error={touched.state ? errors.state : undefined}
              required
              autoCapitalize="characters"
              maxLength={2}
            />
          </View>
          <View style={styles.zipField}>
            <Input
              label="ZIP Code"
              placeholder="12345"
              value={formData.zip_code}
              onChangeText={(text) => updateField('zip_code', text)}
              onBlur={() => handleBlur('zip_code')}
              error={touched.zip_code ? errors.zip_code : undefined}
              required
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
        </View>

        <CurrencyInput
          label="Hourly Rate"
          placeholder="0.00"
          value={formData.hourly_rate ?? 0}
          onChangeValue={(value) => updateField('hourly_rate', value)}
          error={touched.hourly_rate ? errors.hourly_rate : undefined}
          required
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Cancel"
          onPress={handleCancel}
          variant="outline"
          style={styles.footerButton}
        />
        <Button
          title="Save Client"
          onPress={handleSave}
          variant="primary"
          loading={isLoading}
          style={styles.footerButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  stateField: {
    flex: 1,
  },
  zipField: {
    flex: 1.5,
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  footerButton: {
    flex: 1,
  },
});
