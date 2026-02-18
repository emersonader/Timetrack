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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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

export function PaywallScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
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
  const [showRedeemCode, setShowRedeemCode] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [redeemEmail, setRedeemEmail] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Feature descriptions for the paywall
  const PREMIUM_FEATURES = [
    {
      icon: 'people',
      title: t('paywall.unlimitedClients'),
      description: t('paywall.unlimitedClientsDesc'),
      free: t('paywall.upToThree'),
      pro: t('paywall.unlimited'),
    },
    {
      icon: 'receipt',
      title: t('paywall.unlimitedInvoices'),
      description: t('paywall.unlimitedInvoicesDesc'),
      free: t('paywall.tenPerMonth'),
      pro: t('paywall.unlimited'),
    },
    {
      icon: 'calendar',
      title: t('paywall.fullReportHistory'),
      description: t('paywall.fullReportHistoryDesc'),
      free: t('paywall.thirtyDays'),
      pro: t('paywall.unlimited'),
    },
    {
      icon: 'document-text',
      title: t('paywall.pdfInvoices'),
      description: t('paywall.pdfInvoicesDesc'),
      free: '—',
      pro: '✓',
    },
    {
      icon: 'mail',
      title: t('paywall.emailSmsInvoices'),
      description: t('paywall.emailSmsInvoicesDesc'),
      free: '—',
      pro: '✓',
    },
    {
      icon: 'color-palette',
      title: t('paywall.customBranding'),
      description: t('paywall.customBrandingDesc'),
      free: '—',
      pro: '✓',
    },
    {
      icon: 'construct',
      title: t('paywall.unlimitedMaterials'),
      description: t('paywall.unlimitedMaterialsDesc'),
      free: t('paywall.upToFive'),
      pro: t('paywall.unlimited'),
    },
    {
      icon: 'download',
      title: t('paywall.dataExport'),
      description: t('paywall.dataExportDesc'),
      free: '—',
      pro: '✓',
    },
  ];

  // Map feature to display message
  const getFeatureMessage = (feature: PremiumFeature): string => {
    const messages = {
      unlimited_clients: t('paywall.upgradeAddClients'),
      custom_branding: t('paywall.upgradeBranding'),
      pdf_export: t('paywall.upgradePdfExport'),
      email_invoices: t('paywall.upgradeEmailInvoices'),
      sms_invoices: t('paywall.upgradeSmsInvoices'),
      unlimited_materials: t('paywall.upgradeUnlimitedMaterials'),
      data_export: t('paywall.upgradeDataExport'),
      unlimited_invoices: t('paywall.upgradeUnlimitedInvoices'),
      unlimited_history: t('paywall.upgradeUnlimitedHistory'),
      recurring_jobs: t('paywall.upgradeRecurringJobs'),
      voice_notes: t('paywall.upgradeVoiceNotes'),
      project_templates: t('paywall.upgradeProjectTemplates'),
      analytics: t('paywall.upgradeAnalytics'),
      insights: t('paywall.upgradeInsights'),
      inventory: t('paywall.upgradeInventory'),
      fleet: t('paywall.upgradeFleet'),
      qr_codes: t('paywall.upgradeQrCodes'),
      receipt_scanning: t('paywall.upgradeReceiptScanning'),
      integrations: t('paywall.upgradeIntegrations'),
      client_portal: t('paywall.upgradeClientPortal'),
      geofencing: t('paywall.upgradeGeofencing'),
    };
    return messages[feature];
  };

  const handleSubscribe = async () => {
    try {
      await Linking.openURL(SUBSCRIBE_URL);
    } catch {
      Alert.alert(t('common.error'), t('paywall.unableToOpenBrowser'));
    }
  };

  const handleVerifyEmail = async () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert(t('paywall.invalidEmail'), t('paywall.invalidEmailMessage'));
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
      Alert.alert(t('common.error'), t('paywall.unableToVerify'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRedeemCode = async () => {
    const trimmedCode = promoCode.trim();
    const trimmedEmail = (user?.email || redeemEmail).trim().toLowerCase();

    if (!trimmedCode) {
      Alert.alert(t('paywall.missingCode'), t('paywall.missingCodeMessage'));
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      Alert.alert(t('paywall.missingEmail'), t('paywall.invalidEmailMessage'));
      return;
    }

    setIsRedeeming(true);
    try {
      const response = await fetch('https://gramertech.com/api/redeem-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmedCode, email: trimmedEmail }),
      });
      const data = await response.json();

      if (!response.ok) {
        Alert.alert(t('common.error'), data.error || t('paywall.failedToRedeem'));
        return;
      }

      // Sign in with the email if not already authenticated
      if (!isAuthenticated) {
        await signIn(trimmedEmail);
      }

      // Refresh subscription status
      await restorePurchases();

      Alert.alert(t('paywall.success'), t('paywall.codeRedeemed'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert(t('common.error'), t('paywall.unableToRedeem'));
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleRestore = async () => {
    if (!isAuthenticated) {
      setShowEmailInput(true);
      Alert.alert(
        t('paywall.emailRequired'),
        t('paywall.emailRequiredMessage'),
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
    <KeyboardAwareScrollView
      innerRef={(ref: any) => { scrollRef.current = ref; }}
      style={styles.container}
      contentContainerStyle={styles.content}
      enableOnAndroid={true}
      extraScrollHeight={20}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="star" size={40} color={COLORS.warning} />
        </View>
        <Text style={styles.title}>{t('paywall.upgradeToPremium')}</Text>
        {feature && (
          <Text style={styles.featureMessage}>
            {getFeatureMessage(feature)}
          </Text>
        )}
        <Text style={styles.subtitle}>
          {t('paywall.unlockAllFeatures')}
        </Text>
      </View>

      {/* Trial Info */}
      {isInTrial && (
        <View style={styles.trialBanner}>
          <Ionicons name="gift-outline" size={20} color={COLORS.success} />
          <Text style={styles.trialBannerText}>
            {t('paywall.trialDaysLeft', { count: trialDaysRemaining })}
          </Text>
        </View>
      )}

      {/* Free vs Pro Comparison */}
      <View style={styles.comparisonSection}>
        <View style={styles.comparisonHeader}>
          <Text style={[styles.comparisonHeaderText, { flex: 1 }]}>{t('paywall.feature')}</Text>
          <Text style={[styles.comparisonHeaderText, styles.comparisonColHeader]}>{t('paywall.free')}</Text>
          <Text style={[styles.comparisonHeaderText, styles.comparisonColHeader, { color: COLORS.primary }]}>{t('paywall.pro')}</Text>
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
        <Text style={styles.subscribeButtonText}>{t('paywall.subscribeAt')}</Text>
      </TouchableOpacity>

      {/* Redeem Code Section */}
      <View style={styles.redeemSection}>
        {!showRedeemCode ? (
          <TouchableOpacity
            style={styles.redeemToggle}
            onPress={() => {
              setShowRedeemCode(true);
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
            }}
          >
            <Ionicons name="gift-outline" size={18} color={COLORS.primary} />
            <Text style={styles.redeemToggleText}>{t('paywall.havePromoCode')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.redeemInputContainer}>
            <Text style={styles.redeemLabel}>{t('paywall.enterPromoCode')}</Text>
            <TextInput
              style={styles.redeemInput}
              value={promoCode}
              onChangeText={setPromoCode}
              placeholder={t('paywall.promoCodePlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isRedeeming}
            />
            {!isAuthenticated && (
              <>
                <Text style={[styles.redeemLabel, { marginTop: SPACING.sm }]}>{t('paywall.yourEmail')}</Text>
                <TextInput
                  style={styles.redeemInput}
                  value={redeemEmail}
                  onChangeText={setRedeemEmail}
                  placeholder={t('paywall.emailPlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isRedeeming}
                />
              </>
            )}
            <TouchableOpacity
              style={[styles.redeemButton, isRedeeming && styles.verifyButtonDisabled]}
              onPress={handleRedeemCode}
              disabled={isRedeeming}
              activeOpacity={0.8}
            >
              {isRedeeming ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.redeemButtonText}>{t('paywall.redeemCode')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Already subscribed / Email verification */}
      {!isAuthenticated && (
        <View style={styles.verifySection}>
          {!showEmailInput ? (
            <TouchableOpacity
              style={styles.verifyToggle}
              onPress={() => setShowEmailInput(true)}
            >
              <Text style={styles.verifyToggleText}>{t('paywall.alreadySubscribed')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.emailInputContainer}>
              <Text style={styles.emailLabel}>{t('paywall.enterEmailUsedToSubscribe')}</Text>
              <TextInput
                style={styles.emailInput}
                value={emailInput}
                onChangeText={setEmailInput}
                placeholder={t('paywall.emailPlaceholder')}
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
                  <Text style={styles.verifyButtonText}>{t('paywall.verifySubscription')}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {isAuthenticated && (
        <View style={styles.signedInInfo}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
          <Text style={styles.signedInText}>{t('paywall.signedInAs', { email: user?.email })}</Text>
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
            {isAuthenticated ? t('paywall.refreshSubscription') : t('paywall.restoreSubscription')}
          </Text>
        )}
      </TouchableOpacity>

      {/* Trial Note */}
      <View style={styles.trialNote}>
        <Ionicons name="gift-outline" size={20} color={COLORS.success} />
        <Text style={styles.trialText}>{t('paywall.freeTrialIncluded')}</Text>
      </View>

      {/* Terms */}
      <Text style={styles.terms}>
        {t('paywall.subscriptionTerms')}
      </Text>
    </KeyboardAwareScrollView>
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

  // Redeem Code Section
  redeemSection: {
    marginBottom: SPACING.lg,
  },
  redeemToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  redeemToggleText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
  redeemInputContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  redeemLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  redeemInput: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  redeemButton: {
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  redeemButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
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
