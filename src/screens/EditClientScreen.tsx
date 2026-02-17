import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList, UpdateClientInput, ValidationErrors } from '../types';
import { useClient, useClientMutations } from '../hooks/useClients';
import { useSubscription } from '../contexts/SubscriptionContext';
import { validateClientInput, hasErrors, sanitizeString } from '../utils/validation';
import { COLORS, SPACING, FONT_SIZES } from '../utils/constants';
import { Input, CurrencyInput } from '../components/Input';
import { CurrencyPicker } from '../components/CurrencyPicker';
import { Button } from '../components/Button';
import { LoadingSpinner, LoadingOverlay } from '../components/LoadingSpinner';

type Props = NativeStackScreenProps<RootStackParamList, 'EditClient'>;

export function EditClientScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { clientId } = route.params;
  const { client, isLoading: isLoadingClient } = useClient(clientId);
  const { updateClient, deleteClient, isLoading: isMutating } = useClientMutations();
  const { checkFeatureAccess } = useSubscription();
  const isPro = checkFeatureAccess('unlimited_clients');

  const [formData, setFormData] = useState<Partial<UpdateClientInput>>({});
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data when client loads
  useEffect(() => {
    if (client) {
      setFormData({
        first_name: client.first_name,
        last_name: client.last_name,
        phone: client.phone,
        street: client.street,
        city: client.city,
        state: client.state,
        zip_code: client.zip_code,
        email: client.email,
        hourly_rate: client.hourly_rate,
        currency: client.currency || 'USD',
      });
    }
  }, [client]);

  const updateField = (field: keyof UpdateClientInput, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleBlur = (field: keyof UpdateClientInput) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Validate single field
    const validationResult = validateClientInput({
      first_name: formData.first_name ?? '',
      last_name: formData.last_name ?? '',
      phone: formData.phone ?? '',
      email: formData.email ?? '',
      street: formData.street ?? '',
      city: formData.city ?? '',
      state: formData.state ?? '',
      zip_code: formData.zip_code ?? '',
      hourly_rate: formData.hourly_rate ?? 0,
    });

    if (validationResult[field]) {
      setErrors((prev) => ({ ...prev, [field]: validationResult[field] }));
    }
  };

  const handleSave = async () => {
    // Validate all fields
    const validationResult = validateClientInput({
      first_name: formData.first_name ?? '',
      last_name: formData.last_name ?? '',
      phone: formData.phone ?? '',
      email: formData.email ?? '',
      street: formData.street ?? '',
      city: formData.city ?? '',
      state: formData.state ?? '',
      zip_code: formData.zip_code ?? '',
      hourly_rate: formData.hourly_rate ?? 0,
    });
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
      await updateClient(clientId, {
        first_name: sanitizeString(formData.first_name),
        last_name: sanitizeString(formData.last_name),
        phone: sanitizeString(formData.phone),
        street: sanitizeString(formData.street),
        city: sanitizeString(formData.city),
        state: sanitizeString(formData.state),
        zip_code: sanitizeString(formData.zip_code),
        email: sanitizeString(formData.email),
        hourly_rate: formData.hourly_rate,
        currency: formData.currency,
      });

      navigation.goBack();
    } catch (error) {
      Alert.alert(t('common.error'), t('editClient.failedToUpdate'));
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('editClient.deleteClient'),
      t('editClient.deleteClientConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClient(clientId);
              navigation.popToTop();
            } catch (error) {
              Alert.alert(t('common.error'), t('editClient.failedToDelete'));
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        t('editClient.discardChanges'),
        t('editClient.unsavedChanges'),
        [
          { text: t('editClient.keepEditing'), style: 'cancel' },
          {
            text: t('editClient.discard'),
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  if (isLoadingClient) {
    return <LoadingSpinner fullScreen message={t('editClient.loadingClient')} />;
  }

  if (!client) {
    return (
      <View style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl }}>
          <Text style={{ fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.sm }}>
            {t('editClient.clientNotFound')}
          </Text>
          <Text style={{ fontSize: FONT_SIZES.sm, color: COLORS.gray500, textAlign: 'center' }}>
            {t('editClient.clientMayBeDeleted')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      enableOnAndroid={true}
      extraScrollHeight={20}
      keyboardShouldPersistTaps="handled"
    >
      <LoadingOverlay visible={isMutating} message={t('editClient.savingChanges')} />
        <Input
          label={t('editClient.firstName')}
          placeholder={t('editClient.enterFirstName')}
          value={formData.first_name ?? ''}
          onChangeText={(text) => updateField('first_name', text)}
          onBlur={() => handleBlur('first_name')}
          error={touched.first_name ? errors.first_name : undefined}
          required
          autoCapitalize="words"
        />

        <Input
          label={t('editClient.lastName')}
          placeholder={t('editClient.enterLastName')}
          value={formData.last_name ?? ''}
          onChangeText={(text) => updateField('last_name', text)}
          onBlur={() => handleBlur('last_name')}
          error={touched.last_name ? errors.last_name : undefined}
          required
          autoCapitalize="words"
        />

        <Input
          label={t('editClient.phoneNumber')}
          placeholder={t('editClient.enterPhoneNumber')}
          value={formData.phone ?? ''}
          onChangeText={(text) => updateField('phone', text)}
          onBlur={() => handleBlur('phone')}
          error={touched.phone ? errors.phone : undefined}
          required
          keyboardType="phone-pad"
        />

        <Input
          label={t('editClient.email')}
          placeholder={t('editClient.enterEmailAddress')}
          value={formData.email ?? ''}
          onChangeText={(text) => updateField('email', text)}
          onBlur={() => handleBlur('email')}
          error={touched.email ? errors.email : undefined}
          required
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.sectionTitle}>{t('editClient.address')}</Text>

        <Input
          label={t('editClient.street')}
          placeholder={t('editClient.streetAddress')}
          value={formData.street ?? ''}
          onChangeText={(text) => updateField('street', text)}
          onBlur={() => handleBlur('street')}
          error={touched.street ? errors.street : undefined}
          required
          autoCapitalize="words"
        />

        <Input
          label={t('editClient.city')}
          placeholder={t('editClient.city')}
          value={formData.city ?? ''}
          onChangeText={(text) => updateField('city', text)}
          onBlur={() => handleBlur('city')}
          error={touched.city ? errors.city : undefined}
          required
          autoCapitalize="words"
        />

        <View style={styles.row}>
          <View style={styles.stateField}>
            <Input
              label={t('editClient.state')}
              placeholder={t('editClient.statePlaceholder')}
              value={formData.state ?? ''}
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
              label={t('editClient.zipCode')}
              placeholder={t('editClient.zipPlaceholder')}
              value={formData.zip_code ?? ''}
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
          label={t('editClient.hourlyRate')}
          placeholder={t('editClient.ratePlaceholder')}
          value={formData.hourly_rate ?? 0}
          onChangeValue={(value) => updateField('hourly_rate', value)}
          error={touched.hourly_rate ? errors.hourly_rate : undefined}
          required
        />

        <CurrencyPicker
          label={t('editClient.currency')}
          value={formData.currency || 'USD'}
          onChange={(code) => {
            if (code !== 'USD' && !isPro) {
              navigation.navigate('Paywall', { feature: 'unlimited_clients' });
              return;
            }
            updateField('currency', code);
          }}
          disabled={!isPro && (formData.currency || 'USD') === 'USD'}
        />

        <Button
          title={t('editClient.deleteClient')}
          onPress={handleDelete}
          variant="danger"
          style={styles.deleteButton}
        />
      <View style={styles.footer}>
        <Button
          title={t('common.cancel')}
          onPress={handleCancel}
          variant="outline"
          style={styles.footerButton}
        />
        <Button
          title={t('editClient.saveChanges')}
          onPress={handleSave}
          variant="primary"
          loading={isMutating}
          disabled={!hasChanges}
          style={styles.footerButton}
        />
      </View>
    </KeyboardAwareScrollView>
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
  deleteButton: {
    marginTop: SPACING.xl,
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.md,
    paddingBottom: Platform.OS === 'android' ? 64 : SPACING.md,
    gap: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  footerButton: {
    flex: 1,
  },
});
