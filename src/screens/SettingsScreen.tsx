import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../types';
import { useSettings } from '../hooks/useSettings';
import { useTheme, COLOR_PRESETS } from '../context/ThemeContext';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { LoadingSpinner } from '../components/LoadingSpinner';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { settings, isLoading, updateSettings, refresh } = useSettings();
  const { refreshTheme } = useTheme();

  // Local state for form fields
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessStreet, setBusinessStreet] = useState('');
  const [businessCity, setBusinessCity] = useState('');
  const [businessState, setBusinessState] = useState('');
  const [businessZip, setBusinessZip] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState(COLORS.primary);
  const [accentColor, setAccentColor] = useState(COLORS.primary);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form with settings
  useEffect(() => {
    if (settings) {
      setBusinessName(settings.business_name || '');
      setBusinessPhone(settings.business_phone || '');
      setBusinessEmail(settings.business_email || '');
      setBusinessStreet(settings.business_street || '');
      setBusinessCity(settings.business_city || '');
      setBusinessState(settings.business_state || '');
      setBusinessZip(settings.business_zip || '');
      setLogoUri(settings.logo_uri);
      setPrimaryColor(settings.primary_color);
      setAccentColor(settings.accent_color);
    }
  }, [settings]);

  const handlePickLogo = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to select a logo.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUri(null);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateSettings({
        business_name: businessName || null,
        business_phone: businessPhone || null,
        business_email: businessEmail || null,
        business_street: businessStreet || null,
        business_city: businessCity || null,
        business_state: businessState || null,
        business_zip: businessZip || null,
        logo_uri: logoUri,
        primary_color: primaryColor,
        accent_color: accentColor,
      });
      await refreshTheme();
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading settings..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Business Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Information</Text>
        <Text style={styles.sectionSubtitle}>
          This information will appear on your invoices
        </Text>

        <Input
          label="Business Name"
          placeholder="Your Business Name"
          value={businessName}
          onChangeText={setBusinessName}
        />

        <Input
          label="Phone"
          placeholder="(555) 555-5555"
          value={businessPhone}
          onChangeText={setBusinessPhone}
          keyboardType="phone-pad"
        />

        <Input
          label="Email"
          placeholder="email@business.com"
          value={businessEmail}
          onChangeText={setBusinessEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="Street Address"
          placeholder="123 Main St"
          value={businessStreet}
          onChangeText={setBusinessStreet}
        />

        <View style={styles.row}>
          <Input
            label="City"
            placeholder="City"
            value={businessCity}
            onChangeText={setBusinessCity}
            containerStyle={styles.cityInput}
          />
          <Input
            label="State"
            placeholder="ST"
            value={businessState}
            onChangeText={setBusinessState}
            containerStyle={styles.stateInput}
            maxLength={2}
            autoCapitalize="characters"
          />
        </View>

        <Input
          label="ZIP Code"
          placeholder="12345"
          value={businessZip}
          onChangeText={setBusinessZip}
          keyboardType="number-pad"
          maxLength={10}
          containerStyle={styles.zipInput}
        />
      </View>

      {/* Logo Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Logo</Text>
        <Text style={styles.sectionSubtitle}>
          Add your logo to appear on invoices
        </Text>

        <View style={styles.logoContainer}>
          {logoUri ? (
            <View style={styles.logoPreview}>
              <Image source={{ uri: logoUri }} style={styles.logoImage} />
              <TouchableOpacity
                style={styles.removeLogoButton}
                onPress={handleRemoveLogo}
              >
                <Ionicons name="close-circle" size={24} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.logoPlaceholder}>
              <Ionicons name="image-outline" size={48} color={COLORS.gray300} />
              <Text style={styles.logoPlaceholderText}>No logo set</Text>
            </View>
          )}

          <Button
            title={logoUri ? 'Change Logo' : 'Choose Logo'}
            onPress={handlePickLogo}
            variant="outline"
            icon={<Ionicons name="camera-outline" size={20} color={primaryColor} />}
            style={styles.logoButton}
          />
        </View>
      </View>

      {/* Colors Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Colors</Text>
        <Text style={styles.sectionSubtitle}>
          Customize the app and invoice colors
        </Text>

        <Text style={styles.colorLabel}>Primary Color</Text>
        <Text style={styles.colorDescription}>
          Main color used throughout the app
        </Text>
        <View style={styles.colorGrid}>
          {COLOR_PRESETS.map((color) => (
            <TouchableOpacity
              key={`primary-${color.value}`}
              style={[
                styles.colorOption,
                { backgroundColor: color.value },
                primaryColor === color.value && styles.colorOptionSelected,
              ]}
              onPress={() => setPrimaryColor(color.value)}
            >
              {primaryColor === color.value && (
                <Ionicons name="checkmark" size={20} color={COLORS.white} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.colorLabel, { marginTop: SPACING.lg }]}>
          Invoice Accent Color
        </Text>
        <Text style={styles.colorDescription}>
          Color used for invoice headers and highlights
        </Text>
        <View style={styles.colorGrid}>
          {COLOR_PRESETS.map((color) => (
            <TouchableOpacity
              key={`accent-${color.value}`}
              style={[
                styles.colorOption,
                { backgroundColor: color.value },
                accentColor === color.value && styles.colorOptionSelected,
              ]}
              onPress={() => setAccentColor(color.value)}
            >
              {accentColor === color.value && (
                <Ionicons name="checkmark" size={20} color={COLORS.white} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Color Preview */}
        <View style={styles.colorPreview}>
          <Text style={styles.colorPreviewLabel}>Preview</Text>
          <View style={styles.previewBox}>
            <View
              style={[styles.previewHeader, { backgroundColor: primaryColor }]}
            >
              <Text style={styles.previewHeaderText}>App Header</Text>
            </View>
            <View style={styles.previewContent}>
              <View
                style={[styles.previewAccent, { backgroundColor: accentColor }]}
              />
              <Text style={styles.previewAccentLabel}>Invoice Accent</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Save Button */}
      <Button
        title="Save Settings"
        onPress={handleSave}
        variant="primary"
        fullWidth
        loading={isSaving}
        style={styles.saveButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },

  // Sections
  section: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    marginBottom: SPACING.md,
  },

  // Form
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  cityInput: {
    flex: 2,
  },
  stateInput: {
    flex: 1,
  },
  zipInput: {
    width: '50%',
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
  },
  logoPreview: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.gray100,
  },
  removeLogoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.full,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    borderStyle: 'dashed',
  },
  logoPlaceholderText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray400,
    marginTop: SPACING.xs,
  },
  logoButton: {
    marginTop: SPACING.sm,
  },

  // Colors
  colorLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  colorDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
    marginBottom: SPACING.sm,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  // Color Preview
  colorPreview: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  colorPreviewLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.gray500,
    marginBottom: SPACING.sm,
  },
  previewBox: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  previewHeader: {
    padding: SPACING.sm,
    alignItems: 'center',
  },
  previewHeaderText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONT_SIZES.sm,
  },
  previewContent: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  previewAccent: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  previewAccentLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
  },

  // Save Button
  saveButton: {
    marginTop: SPACING.md,
  },
});
