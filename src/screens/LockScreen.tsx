import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, FONTS, FONT_SIZES, SPACING, BORDER_RADIUS } from '../utils/constants';

export default function LockScreen() {
  const { t } = useTranslation();
  const { authenticateWithBiometric, biometricType } = useAuth();

  // Auto-prompt biometric on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      authenticateWithBiometric();
    }, 300);
    return () => clearTimeout(timer);
  }, [authenticateWithBiometric]);

  const iconName = biometricType === 'faceid' ? 'scan' : 'finger-print';
  const authLabel = biometricType === 'faceid' ? t('auth.faceId') : t('lockScreen.fingerprint');

  return (
    <View style={styles.container}>
      {/* Logo area */}
      <View style={styles.logoContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="time" size={48} color={COLORS.white} />
        </View>
        <Text style={styles.appName}>HourFlow</Text>
        <Text style={styles.lockMessage}>{t('lockScreen.appIsLocked')}</Text>
      </View>

      {/* Unlock button */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.unlockButton}
          onPress={authenticateWithBiometric}
          activeOpacity={0.8}
        >
          <Ionicons name={iconName} size={32} color={COLORS.primary} />
          <Text style={styles.unlockText}>{t('lockScreen.unlockWith', { type: authLabel })}</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          {t('lockScreen.tapToAuthenticate')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xxl * 2,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  appName: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.xxxl,
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  lockMessage: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.md,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  actionContainer: {
    alignItems: 'center',
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.md,
  },
  unlockText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.primary,
  },
  hint: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
