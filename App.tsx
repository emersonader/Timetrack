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
import './src/i18n'; // Initialize i18n
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
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
import { requestNotificationPermissions, showGeofenceNotification } from './src/services/notificationService';
import { processRecurringJobs } from './src/services/recurringJobService';
import { getGeofenceTaskName, startGeofenceMonitoring } from './src/services/geofenceService';
import { getActiveGeofences } from './src/db/geofenceRepository';
import { getActiveTimer } from './src/db/sessionRepository';
import { getClientById } from './src/db/clientRepository';
import { startSession, stopSession } from './src/db/sessionRepository';
import { COLORS, FONT_SIZES, SPACING } from './src/utils/constants';
import { formatFullName } from './src/utils/formatters';

// Register geofence background task (must be at module scope)
TaskManager.defineTask(getGeofenceTaskName(), async ({ data, error }: any) => {
  if (error) {
    console.error('Geofence task error:', error);
    return;
  }

  if (!data?.eventType || !data?.region) return;

  const { eventType, region } = data;
  const clientIdStr = (region.identifier as string).replace('client_', '');
  const clientId = parseInt(clientIdStr, 10);
  if (isNaN(clientId)) return;

  try {
    const client = await getClientById(clientId);
    if (!client) return;
    const clientName = formatFullName(client.first_name, client.last_name);

    if (eventType === Location.GeofencingEventType.Enter) {
      // Check if timer is already running
      const activeTimer = await getActiveTimer();
      if (activeTimer && activeTimer.is_running) return; // Already tracking

      // Auto-start timer
      await startSession(clientId);
      await showGeofenceNotification(
        'Timer Started',
        `Arrived at ${clientName}'s location — timer started automatically.`
      );
    } else if (eventType === Location.GeofencingEventType.Exit) {
      // Check if timer is running for this client
      const activeTimer = await getActiveTimer();
      if (!activeTimer || !activeTimer.is_running || activeTimer.client_id !== clientId) return;
      if (!activeTimer.session_id) return;

      // Auto-stop timer
      await stopSession(activeTimer.session_id, 'Auto-stopped by GPS');
      await showGeofenceNotification(
        'Timer Stopped',
        `Left ${clientName}'s location — timer stopped automatically.`
      );
    }
  } catch (err) {
    console.error('Geofence event handler error:', err);
  }
});

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

        // Process recurring jobs (non-fatal)
        try {
          await processRecurringJobs();
        } catch (e) {
          console.warn('Recurring jobs processing failed:', e);
        }

        // Start geofence monitoring if any are configured (non-fatal)
        try {
          const geofences = await getActiveGeofences();
          if (geofences.length > 0) {
            await startGeofenceMonitoring();
          }
        } catch (e) {
          console.warn('Geofence monitoring start failed:', e);
        }

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
