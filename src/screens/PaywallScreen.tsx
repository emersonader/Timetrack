import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, PremiumFeature } from '../types';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
} from '../utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

const SUBSCRIBE_URL = 'https://gramertech.com/hourflow/pricing';

// Feature descriptions for the paywall
const PREMIUM_FEATURES = [
  {
    icon: 'people',
    title: 'Unlimited Clients',
    description: 'Track time for as many clients as you need',
    free: 'Up to 3',
    pro: 'Unlimited',
  },
  {
    icon: 'document-text',
    title: 'PDF Invoices',
    description: 'Generate professional PDF invoices',
    free: '—',
    pro: '✓',
  },
  {
    icon: 'mail',
    title: 'Email & SMS Invoices',
    description: 'Send invoices directly to clients',
    free: '—',
    pro: '✓',
  },
  {
    icon: 'color-palette',
    title: 'Custom Branding',
    description: 'Add your logo and brand colors',
    free: '—',
    pro: '✓',
  },
  {
    icon: 'construct',
    title: 'Unlimited Materials',
    description: 'Add unlimited materials per job',
    free: 'Up to 5',
    pro: 'Unlimited',
  },
  {
    icon: 'download',
    title: 'Data Export',
    description: 'Export your data anytime',
    free: '—',
    pro: '✓',
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
    restorePurchases,
    isInTrial,
    trialDaysRemaining,
  } = useSubscription();
  const { user, signIn, signOut, isAuthenticated } = useAuth();

  const [emailInput, setEmailInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleSubscribe = async () => {
    try {
      await Linking.openURL(SUBSCRIBE_URL);
    } catch {
      Alert.alert('Error', 'Unable to open browser. Please visit gramertech.com/hourflow manually.');
    }
  };

  const handleVerifyEmail = async () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsVerifying(true);
    try {
      // Sign in with the email (stores locally)
      await signIn(trimmed);
      // Then verify subscription via API (restorePurchases re-checks)
      const success = await restorePurchases();
      if (success) {
        navigation.goBack();
      } else {
        // No subscription found — sign them back out so they don't stay
        // signed in with a non-subscribed email
        signOut();
        setEmailInput('');
      }
    } catch (error) {
      signOut();
      Alert.alert('Error', 'Unable to verify subscription. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRestore = async () => {
    if (!isAuthenticated) {
      setShowEmailInput(true);
      Alert.alert(
        'Email Required',
        'Please enter the email you used to subscribe, then tap "Verify Subscription".',
      );
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 300);
      return;
    }
    const success = await restorePurchases();
    if (success) {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
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

      {/* Trial Info */}
      {isInTrial && (
        <View style={styles.trialBanner}>
          <Ionicons name="gift-outline" size={20} color={COLORS.success} />
          <Text style={styles.trialBannerText}>
            {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} left in your free trial
          </Text>
        </View>
      )}

      {/* Free vs Pro Comparison */}
      <View style={styles.comparisonSection}>
        <View style={styles.comparisonHeader}>
          <Text style={[styles.comparisonHeaderText, { flex: 1 }]}>Feature</Text>
          <Text style={[styles.comparisonHeaderText, styles.comparisonColHeader]}>Free</Text>
          <Text style={[styles.comparisonHeaderText, styles.comparisonColHeader, { color: COLORS.primary }]}>Pro</Text>
        </View>
        {PREMIUM_FEATURES.map((item, index) => (
          <View key={index} style={styles.comparisonRow}>
            <View style={styles.comparisonFeature}>
              <Ionicons
                name={item.icon as any}
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.comparisonFeatureText}>{item.title}</Text>
            </View>
            <Text style={styles.comparisonFree}>{item.free}</Text>
            <Text style={styles.comparisonPro}>{item.pro}</Text>
          </View>
        ))}
      </View>

      {/* Subscribe Button */}
      <TouchableOpacity
        style={styles.subscribeButton}
        onPress={handleSubscribe}
        activeOpacity={0.8}
      >
        <Ionicons name="open-outline" size={20} color={COLORS.white} />
        <Text style={styles.subscribeButtonText}>Subscribe at gramertech.com/hourflow</Text>
      </TouchableOpacity>

      {/* Already subscribed / Email verification */}
      {!isAuthenticated && (
        <View style={styles.verifySection}>
          {!showEmailInput ? (
            <TouchableOpacity
              style={styles.verifyToggle}
              onPress={() => setShowEmailInput(true)}
            >
              <Text style={styles.verifyToggleText}>Already subscribed? Enter your email</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.emailInputContainer}>
              <Text style={styles.emailLabel}>Enter the email used to subscribe:</Text>
              <TextInput
                style={styles.emailInput}
                value={emailInput}
                onChangeText={setEmailInput}
                placeholder="your@email.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isVerifying}
                onFocus={() => {
                  setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  }, 300);
                }}
              />
              <TouchableOpacity
                style={[styles.verifyButton, isVerifying && styles.verifyButtonDisabled]}
                onPress={handleVerifyEmail}
                disabled={isVerifying}
                activeOpacity={0.8}
              >
                {isVerifying ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify Subscription</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {isAuthenticated && (
        <View style={styles.signedInInfo}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
          <Text style={styles.signedInText}>Signed in as {user?.email}</Text>
        </View>
      )}

      {/* Restore */}
      <TouchableOpacity
        style={styles.restoreButton}
        onPress={handleRestore}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Text style={styles.restoreText}>
            {isAuthenticated ? 'Refresh Subscription Status' : 'Restore Subscription'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Trial Note */}
      <View style={styles.trialNote}>
        <Ionicons name="gift-outline" size={20} color={COLORS.success} />
        <Text style={styles.trialText}>15-day free trial included for new users</Text>
      </View>

      {/* Terms */}
      <Text style={styles.terms}>
        Subscriptions are managed through Stripe at gramertech.com/hourflow.
        You can cancel anytime from your account dashboard on the website.
      </Text>
    </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: SPACING.lg,
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

  // Trial Banner
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.success + '15',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
  },
  trialBannerText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.success,
    fontWeight: '600',
  },

  // Comparison
  comparisonSection: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    marginBottom: SPACING.sm,
  },
  comparisonHeaderText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  comparisonColHeader: {
    width: 64,
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray200,
  },
  comparisonFeature: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  comparisonFeatureText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  comparisonFree: {
    width: 64,
    textAlign: 'center',
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  comparisonPro: {
    width: 64,
    textAlign: 'center',
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.success,
  },

  // Subscribe Button
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  subscribeButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Verify Section
  verifySection: {
    marginBottom: SPACING.lg,
  },
  verifyToggle: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  verifyToggleText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
  emailInputContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  emailLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  verifyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Signed in info
  signedInInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  signedInText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
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

  // Terms
  terms: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: SPACING.md,
  },
});
