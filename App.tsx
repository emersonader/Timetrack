import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { TimerProvider } from './src/context/TimerContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import LockScreen from './src/screens/LockScreen';
import SignInScreen from './src/screens/SignInScreen';
import { getDatabase } from './src/db/database';
import { getSettings } from './src/db/settingsRepository';
import { requestNotificationPermissions } from './src/services/notificationService';
import { COLORS, FONT_SIZES, SPACING } from './src/utils/constants';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    async function initialize() {
      try {
        // Initialize database
        await getDatabase();

        // Check onboarding status
        const settings = await getSettings();
        setOnboardingCompleted(settings.onboarding_completed);

        // Request notification permissions
        await requestNotificationPermissions();

        setIsReady(true);
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize app. Please restart.');
      }
    }

    initialize();
  }, []);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!isReady || !fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>HourFlow</Text>
        <Text style={styles.loadingSubtext}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppGate onboardingCompleted={onboardingCompleted} />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppGate({ onboardingCompleted }: { onboardingCompleted: boolean }) {
  const { isLocked, isAuthenticated, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return null;
  }

  // Must sign in first
  if (!isAuthenticated) {
    return (
      <>
        <SignInScreen />
        <StatusBar style="light" />
      </>
    );
  }

  // Biometric lock
  if (isLocked) {
    return (
      <>
        <LockScreen />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <SubscriptionProvider>
      <TimerProvider>
        <ErrorBoundary>
          <AppNavigator onboardingCompleted={onboardingCompleted} />
        </ErrorBoundary>
        <StatusBar style="light" />
      </TimerProvider>
    </SubscriptionProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  loadingSubtext: {
    fontSize: FONT_SIZES.md,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.white,
    textAlign: 'center',
  },
});
