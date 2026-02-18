import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { updateSettings } from '../db/settingsRepository';
import { markOnboardingCompleted } from '../db/settingsRepository';
import { COLORS, FONTS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../utils/constants';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

export function OnboardingScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [businessName, setBusinessName] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');

  const handleGetStarted = () => setPage(1);
  const handleSkip = () => setPage(2);
  const handleContinue = () => setPage(2);

  const handleFinish = async () => {
    try {
      // Save business info if provided
      const updates: Record<string, any> = {};
      if (businessName.trim()) {
        updates.business_name = businessName.trim();
      }
      if (Object.keys(updates).length > 0) {
        await updateSettings(updates);
      }

      // Mark onboarding as completed
      await markOnboardingCompleted();

      // Navigate to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (err) {
      console.error('Error completing onboarding:', err);
      Alert.alert(
        t('onboarding.setupIssue'),
        t('onboarding.setupIssueMessage'),
        [{
          text: t('onboarding.continue'),
          onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Main' }] }),
        }]
      );
    }
  };

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[styles.dot, i === page && styles.dotActive]}
        />
      ))}
    </View>
  );

  const renderWelcome = () => (
    <View style={styles.pageContent}>
      <View style={styles.centerContent}>
        <Text style={styles.logo}>HourFlow</Text>
        <Text style={styles.tagline}>{t('onboarding.tagline')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.subtitle')}</Text>
      </View>
      <View style={styles.bottomContent}>
        {renderDots()}
        <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted}>
          <Text style={styles.primaryButtonText}>{t('onboarding.getStarted')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAboutYou = () => (
    <KeyboardAwareScrollView
      style={styles.pageContent}
      contentContainerStyle={styles.scrollContent}
      enableOnAndroid={true}
      extraScrollHeight={20}
      keyboardShouldPersistTaps="handled"
    >
        <View style={styles.centerContent}>
          <Text style={styles.pageHeader}>{t('onboarding.tellUsAboutBusiness')}</Text>
          <Text style={styles.pageSubheader}>{t('onboarding.businessInfoDescription')}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('onboarding.businessName')}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={t('onboarding.businessNamePlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              value={businessName}
              onChangeText={setBusinessName}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('onboarding.yourHourlyRate')}</Text>
            <View style={styles.rateInputContainer}>
              <Text style={styles.ratePrefix}>$</Text>
              <TextInput
                style={styles.rateInput}
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
                value={hourlyRate}
                onChangeText={setHourlyRate}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
          </View>
        </View>
      <View style={styles.bottomContent}>
        {renderDots()}
        <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
          <Text style={styles.primaryButtonText}>{t('onboarding.continue')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );

  const renderAllSet = () => (
    <View style={styles.pageContent}>
      <View style={styles.centerContent}>
        <Text style={styles.celebrationIcon}>✅</Text>
        <Text style={styles.allSetHeading}>{t('onboarding.youreAllSet')}</Text>
        <Text style={styles.allSetSubtext}>
          {t('onboarding.allSetSubtext')}
        </Text>

        <View style={styles.featuresContainer}>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>⏱️</Text>
            <Text style={styles.featureText}>{t('onboarding.featureTimer')}</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>📄</Text>
            <Text style={styles.featureText}>{t('onboarding.featureInvoices')}</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>💰</Text>
            <Text style={styles.featureText}>{t('onboarding.featurePayments')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomContent}>
        {renderDots()}
        <TouchableOpacity style={styles.primaryButton} onPress={handleFinish}>
          <Text style={styles.primaryButtonText}>{t('onboarding.startUsingHourFlow')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {page === 0 && renderWelcome()}
      {page === 1 && renderAboutYou()}
      {page === 2 && renderAllSet()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  pageContent: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  scrollContent: {
    flexGrow: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomContent: {
    paddingBottom: SPACING.xl,
    alignItems: 'center',
  },

  // Welcome page
  logo: {
    fontSize: 48,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginBottom: SPACING.lg,
  },
  tagline: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // About You page
  pageHeader: {
    fontSize: FONT_SIZES.xxl,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  pageSubheader: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  inputGroup: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  textInput: {
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
  },
  ratePrefix: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.xs,
  },
  rateInput: {
    flex: 1,
    height: '100%',
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    paddingRight: SPACING.md,
  },

  // All Set page
  celebrationIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  allSetHeading: {
    fontSize: FONT_SIZES.xxl,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  allSetSubtext: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  featuresContainer: {
    width: '100%',
    gap: SPACING.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  featureText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
    flex: 1,
  },

  // Dots
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray200,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
  },

  // Buttons
  primaryButton: {
    width: '100%',
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
  skipButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  skipButtonText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
});
