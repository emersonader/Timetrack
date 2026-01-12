import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, SubscriptionPackage, PremiumFeature } from '../types';
import { useSubscription } from '../contexts/SubscriptionContext';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

// Feature descriptions for the paywall
const PREMIUM_FEATURES = [
  {
    icon: 'people',
    title: 'Unlimited Clients',
    description: 'Track time for as many clients as you need',
  },
  {
    icon: 'document-text',
    title: 'PDF Invoices',
    description: 'Generate professional PDF invoices',
  },
  {
    icon: 'mail',
    title: 'Email & SMS Invoices',
    description: 'Send invoices directly to clients',
  },
  {
    icon: 'color-palette',
    title: 'Custom Branding',
    description: 'Add your logo and brand colors',
  },
  {
    icon: 'construct',
    title: 'Unlimited Materials',
    description: 'Add unlimited materials per job',
  },
  {
    icon: 'download',
    title: 'Data Export',
    description: 'Export your data anytime',
  },
];

// Map feature to display message
const FEATURE_MESSAGES: Record<PremiumFeature, string> = {
  unlimited_clients: 'Upgrade to add more clients',
  custom_branding: 'Upgrade to customize your branding',
  pdf_export: 'Upgrade to export PDF invoices',
  email_invoices: 'Upgrade to email invoices',
  sms_invoices: 'Upgrade to send SMS invoices',
  unlimited_materials: 'Upgrade for unlimited materials',
  data_export: 'Upgrade to export your data',
};

export function PaywallScreen({ route, navigation }: Props) {
  const { feature } = route.params || {};
  const {
    isLoading,
    packages,
    purchasePackage,
    restorePurchases,
  } = useSubscription();

  const handlePurchase = async (pkg: SubscriptionPackage) => {
    const success = await purchasePackage(pkg);
    if (success) {
      navigation.goBack();
    }
  };

  const handleRestore = async () => {
    const success = await restorePurchases();
    if (success) {
      navigation.goBack();
    }
  };

  const monthlyPackage = packages.find(p => p.period === 'monthly');
  const yearlyPackage = packages.find(p => p.period === 'yearly');

  // Calculate savings for yearly
  const yearlySavings = monthlyPackage && yearlyPackage
    ? Math.round((1 - (yearlyPackage.price / (monthlyPackage.price * 12))) * 100)
    : 40;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="star" size={40} color={COLORS.warning} />
        </View>
        <Text style={styles.title}>Upgrade to Premium</Text>
        {feature && (
          <Text style={styles.featureMessage}>
            {FEATURE_MESSAGES[feature]}
          </Text>
        )}
        <Text style={styles.subtitle}>
          Unlock all features and grow your business
        </Text>
      </View>

      {/* Features List */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Premium Features</Text>
        {PREMIUM_FEATURES.map((item, index) => (
          <View key={index} style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Ionicons
                name={item.icon as any}
                size={24}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureDescription}>{item.description}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
          </View>
        ))}
      </View>

      {/* Pricing Options */}
      <View style={styles.pricingSection}>
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : packages.length > 0 ? (
          <>
            {/* Yearly Option (Best Value) */}
            {yearlyPackage && (
              <TouchableOpacity
                style={[styles.pricingCard, styles.pricingCardFeatured]}
                onPress={() => handlePurchase(yearlyPackage)}
                activeOpacity={0.8}
              >
                <View style={styles.bestValueBadge}>
                  <Text style={styles.bestValueText}>BEST VALUE</Text>
                </View>
                <View style={styles.pricingHeader}>
                  <Text style={styles.pricingPeriod}>Yearly</Text>
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>Save {yearlySavings}%</Text>
                  </View>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLarge}>{yearlyPackage.priceString}</Text>
                  <Text style={styles.pricePeriod}>/year</Text>
                </View>
                <Text style={styles.priceMonthly}>
                  Just {(yearlyPackage.price / 12).toFixed(2)}/month
                </Text>
              </TouchableOpacity>
            )}

            {/* Monthly Option */}
            {monthlyPackage && (
              <TouchableOpacity
                style={styles.pricingCard}
                onPress={() => handlePurchase(monthlyPackage)}
                activeOpacity={0.8}
              >
                <View style={styles.pricingHeader}>
                  <Text style={styles.pricingPeriod}>Monthly</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLarge}>{monthlyPackage.priceString}</Text>
                  <Text style={styles.pricePeriod}>/month</Text>
                </View>
                <Text style={styles.priceMonthly}>Cancel anytime</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          /* Development mode - show placeholder pricing */
          <>
            <TouchableOpacity
              style={[styles.pricingCard, styles.pricingCardFeatured]}
              activeOpacity={0.8}
            >
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>BEST VALUE</Text>
              </View>
              <View style={styles.pricingHeader}>
                <Text style={styles.pricingPeriod}>Yearly</Text>
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>Save 50%</Text>
                </View>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLarge}>$29.99</Text>
                <Text style={styles.pricePeriod}>/year</Text>
              </View>
              <Text style={styles.priceMonthly}>Just $2.50/month</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pricingCard}
              activeOpacity={0.8}
            >
              <View style={styles.pricingHeader}>
                <Text style={styles.pricingPeriod}>Monthly</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLarge}>$4.99</Text>
                <Text style={styles.pricePeriod}>/month</Text>
              </View>
              <Text style={styles.priceMonthly}>Cancel anytime</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Free Trial Note */}
      <View style={styles.trialNote}>
        <Ionicons name="gift-outline" size={20} color={COLORS.success} />
        <Text style={styles.trialText}>15-day free trial included</Text>
      </View>

      {/* Restore Purchases */}
      <TouchableOpacity
        style={styles.restoreButton}
        onPress={handleRestore}
        disabled={isLoading}
      >
        <Text style={styles.restoreText}>Restore Purchases</Text>
      </TouchableOpacity>

      {/* Terms */}
      <Text style={styles.terms}>
        Payment will be charged to your {Platform.OS === 'ios' ? 'Apple ID' : 'Google Play'} account.
        Subscription automatically renews unless canceled at least 24 hours before the end of the current period.
      </Text>
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

  // Header
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  featureMessage: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Features
  featuresSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  featureDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },

  // Pricing
  pricingSection: {
    marginBottom: SPACING.lg,
  },
  pricingCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    ...SHADOWS.md,
  },
  pricingCardFeatured: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  bestValueText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  pricingPeriod: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  savingsBadge: {
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  savingsText: {
    color: COLORS.success,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceLarge: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pricePeriod: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  priceMonthly: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  devModeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.warning,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },

  // Trial Note
  trialNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  trialText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.success,
    fontWeight: '600',
  },

  // Restore
  restoreButton: {
    alignItems: 'center',
    padding: SPACING.md,
  },
  restoreText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },

  // Terms
  terms: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: SPACING.md,
  },
});
