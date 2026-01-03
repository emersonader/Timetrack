import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList, FREE_TIER_LIMITS } from '../types';
import { useSettings } from '../hooks/useSettings';
import { useTheme, COLOR_PRESETS } from '../context/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
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
  const { isPremium, tier, restorePurchases, checkFeatureAccess } = useSubscription();
  const canCustomizeBranding = checkFeatureAccess('custom_branding');

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

  // Payment method state
  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [paypalUsername, setPaypalUsername] = useState('');
  const [venmoEnabled, setVenmoEnabled] = useState(false);
  const [venmoUsername, setVenmoUsername] = useState('');
  const [zelleEnabled, setZelleEnabled] = useState(false);
  const [zelleId, setZelleId] = useState('');
  const [cashappEnabled, setCashappEnabled] = useState(false);
  const [cashappTag, setCashappTag] = useState('');
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [stripePaymentLink, setStripePaymentLink] = useState('');

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
      // Payment methods
      setPaypalEnabled(settings.paypal_enabled || false);
      setPaypalUsername(settings.paypal_username || '');
      setVenmoEnabled(settings.venmo_enabled || false);
      setVenmoUsername(settings.venmo_username || '');
      setZelleEnabled(settings.zelle_enabled || false);
      setZelleId(settings.zelle_id || '');
      setCashappEnabled(settings.cashapp_enabled || false);
      setCashappTag(settings.cashapp_tag || '');
      setStripeEnabled(settings.stripe_enabled || false);
      setStripePaymentLink(settings.stripe_payment_link || '');
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
        // Payment methods
        paypal_enabled: paypalEnabled,
        paypal_username: paypalUsername || null,
        venmo_enabled: venmoEnabled,
        venmo_username: venmoUsername || null,
        zelle_enabled: zelleEnabled,
        zelle_id: zelleId || null,
        cashapp_enabled: cashappEnabled,
        cashapp_tag: cashappTag || null,
        stripe_enabled: stripeEnabled,
        stripe_payment_link: stripePaymentLink || null,
      });
      await refreshTheme();
      Alert.alert('Success', 'Settings saved successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Main') }
      ]);
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
      {/* Subscription Section */}
      <TouchableOpacity
        style={[
          styles.subscriptionCard,
          isPremium ? styles.subscriptionPremium : styles.subscriptionFree,
        ]}
        onPress={() => !isPremium && navigation.navigate('Paywall', {})}
        activeOpacity={isPremium ? 1 : 0.7}
      >
        <View style={styles.subscriptionIcon}>
          <Ionicons
            name={isPremium ? 'star' : 'star-outline'}
            size={28}
            color={isPremium ? COLORS.warning : COLORS.gray500}
          />
        </View>
        <View style={styles.subscriptionContent}>
          <Text style={styles.subscriptionTitle}>
            {isPremium ? 'Premium' : 'Free Plan'}
          </Text>
          <Text style={styles.subscriptionDescription}>
            {isPremium
              ? 'You have access to all features'
              : `Limited to ${FREE_TIER_LIMITS.maxClients} clients`}
          </Text>
        </View>
        {!isPremium && (
          <View style={styles.upgradeButton}>
            <Text style={styles.upgradeButtonText}>Upgrade</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.white} />
          </View>
        )}
      </TouchableOpacity>

      {/* Restore Purchases */}
      {!isPremium && (
        <TouchableOpacity
          style={styles.restoreLink}
          onPress={restorePurchases}
        >
          <Text style={styles.restoreLinkText}>Restore Purchases</Text>
        </TouchableOpacity>
      )}

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
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Business Logo</Text>
            <Text style={styles.sectionSubtitle}>
              Add your logo to appear on invoices
            </Text>
          </View>
          {!canCustomizeBranding && (
            <TouchableOpacity
              style={styles.premiumBadge}
              onPress={() => navigation.navigate('Paywall', { feature: 'custom_branding' })}
            >
              <Ionicons name="star" size={14} color={COLORS.warning} />
              <Text style={styles.premiumBadgeText}>Premium</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.logoContainer, !canCustomizeBranding && styles.disabledSection]}>
          {logoUri ? (
            <View style={styles.logoPreview}>
              <Image source={{ uri: logoUri }} style={styles.logoImage} />
              {canCustomizeBranding && (
                <TouchableOpacity
                  style={styles.removeLogoButton}
                  onPress={handleRemoveLogo}
                >
                  <Ionicons name="close-circle" size={24} color={COLORS.error} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.logoPlaceholder}>
              <Ionicons name="image-outline" size={48} color={COLORS.gray300} />
              <Text style={styles.logoPlaceholderText}>No logo set</Text>
            </View>
          )}

          <Button
            title={canCustomizeBranding ? (logoUri ? 'Change Logo' : 'Choose Logo') : 'Upgrade to Add Logo'}
            onPress={canCustomizeBranding ? handlePickLogo : () => navigation.navigate('Paywall', { feature: 'custom_branding' })}
            variant="outline"
            icon={<Ionicons name={canCustomizeBranding ? "camera-outline" : "lock-closed"} size={20} color={primaryColor} />}
            style={styles.logoButton}
          />
        </View>
      </View>

      {/* Colors Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>App Colors</Text>
            <Text style={styles.sectionSubtitle}>
              Customize the app and invoice colors
            </Text>
          </View>
          {!canCustomizeBranding && (
            <TouchableOpacity
              style={styles.premiumBadge}
              onPress={() => navigation.navigate('Paywall', { feature: 'custom_branding' })}
            >
              <Ionicons name="star" size={14} color={COLORS.warning} />
              <Text style={styles.premiumBadgeText}>Premium</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={!canCustomizeBranding ? styles.disabledSection : undefined}>
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
                onPress={() => canCustomizeBranding && setPrimaryColor(color.value)}
                disabled={!canCustomizeBranding}
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
                onPress={() => canCustomizeBranding && setAccentColor(color.value)}
                disabled={!canCustomizeBranding}
              >
                {accentColor === color.value && (
                  <Ionicons name="checkmark" size={20} color={COLORS.white} />
                )}
              </TouchableOpacity>
            ))}
          </View>
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

      {/* Payment Methods Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        <Text style={styles.sectionSubtitle}>
          Add payment links to your invoices so clients can pay easily
        </Text>

        {/* PayPal */}
        <View style={styles.paymentMethod}>
          <View style={styles.paymentHeader}>
            <View style={[styles.paymentIcon, { backgroundColor: '#003087' }]}>
              <Text style={styles.paymentIconText}>P</Text>
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentName}>PayPal</Text>
              <Text style={styles.paymentDescription}>paypal.me/username</Text>
            </View>
            <Switch
              value={paypalEnabled}
              onValueChange={setPaypalEnabled}
              trackColor={{ false: COLORS.gray300, true: primaryColor + '80' }}
              thumbColor={paypalEnabled ? primaryColor : COLORS.gray100}
            />
          </View>
          {paypalEnabled && (
            <Input
              label="PayPal.me Username"
              placeholder="yourname"
              value={paypalUsername}
              onChangeText={setPaypalUsername}
              autoCapitalize="none"
            />
          )}
        </View>

        {/* Venmo */}
        <View style={styles.paymentMethod}>
          <View style={styles.paymentHeader}>
            <View style={[styles.paymentIcon, { backgroundColor: '#3D95CE' }]}>
              <Text style={styles.paymentIconText}>V</Text>
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentName}>Venmo</Text>
              <Text style={styles.paymentDescription}>venmo.com/username</Text>
            </View>
            <Switch
              value={venmoEnabled}
              onValueChange={setVenmoEnabled}
              trackColor={{ false: COLORS.gray300, true: primaryColor + '80' }}
              thumbColor={venmoEnabled ? primaryColor : COLORS.gray100}
            />
          </View>
          {venmoEnabled && (
            <Input
              label="Venmo Username"
              placeholder="yourname"
              value={venmoUsername}
              onChangeText={setVenmoUsername}
              autoCapitalize="none"
            />
          )}
        </View>

        {/* Zelle */}
        <View style={styles.paymentMethod}>
          <View style={styles.paymentHeader}>
            <View style={[styles.paymentIcon, { backgroundColor: '#6D1ED4' }]}>
              <Text style={styles.paymentIconText}>Z</Text>
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentName}>Zelle</Text>
              <Text style={styles.paymentDescription}>Email or phone number</Text>
            </View>
            <Switch
              value={zelleEnabled}
              onValueChange={setZelleEnabled}
              trackColor={{ false: COLORS.gray300, true: primaryColor + '80' }}
              thumbColor={zelleEnabled ? primaryColor : COLORS.gray100}
            />
          </View>
          {zelleEnabled && (
            <Input
              label="Zelle Email or Phone"
              placeholder="email@example.com or phone"
              value={zelleId}
              onChangeText={setZelleId}
              autoCapitalize="none"
            />
          )}
        </View>

        {/* Cash App */}
        <View style={styles.paymentMethod}>
          <View style={styles.paymentHeader}>
            <View style={[styles.paymentIcon, { backgroundColor: '#00D632' }]}>
              <Text style={styles.paymentIconText}>$</Text>
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentName}>Cash App</Text>
              <Text style={styles.paymentDescription}>cash.app/$cashtag</Text>
            </View>
            <Switch
              value={cashappEnabled}
              onValueChange={setCashappEnabled}
              trackColor={{ false: COLORS.gray300, true: primaryColor + '80' }}
              thumbColor={cashappEnabled ? primaryColor : COLORS.gray100}
            />
          </View>
          {cashappEnabled && (
            <Input
              label="Cash App $Cashtag"
              placeholder="yourcashtag (without $)"
              value={cashappTag}
              onChangeText={setCashappTag}
              autoCapitalize="none"
            />
          )}
        </View>

        {/* Stripe */}
        <View style={styles.paymentMethod}>
          <View style={styles.paymentHeader}>
            <View style={[styles.paymentIcon, { backgroundColor: '#635BFF' }]}>
              <Text style={styles.paymentIconText}>S</Text>
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentName}>Card / Apple Pay / Google Pay</Text>
              <Text style={styles.paymentDescription}>Stripe Payment Link</Text>
            </View>
            <Switch
              value={stripeEnabled}
              onValueChange={setStripeEnabled}
              trackColor={{ false: COLORS.gray300, true: primaryColor + '80' }}
              thumbColor={stripeEnabled ? primaryColor : COLORS.gray100}
            />
          </View>
          {stripeEnabled && (
            <Input
              label="Stripe Payment Link"
              placeholder="https://buy.stripe.com/..."
              value={stripePaymentLink}
              onChangeText={setStripePaymentLink}
              autoCapitalize="none"
              keyboardType="url"
            />
          )}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
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
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: 4,
  },
  premiumBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.warning,
  },
  disabledSection: {
    opacity: 0.5,
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

  // Subscription
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.md,
  },
  subscriptionFree: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.gray200,
  },
  subscriptionPremium: {
    backgroundColor: COLORS.warning + '15',
    borderWidth: 2,
    borderColor: COLORS.warning,
  },
  subscriptionIcon: {
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  subscriptionContent: {
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  subscriptionDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  upgradeButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONT_SIZES.sm,
  },
  restoreLink: {
    alignItems: 'center',
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  restoreLinkText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
  },

  // Payment Methods
  paymentMethod: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  paymentIconText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: FONT_SIZES.lg,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  paymentDescription: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
  },
});
