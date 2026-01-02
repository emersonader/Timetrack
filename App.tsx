import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TimerProvider } from './src/context/TimerContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { getDatabase } from './src/db/database';
import { requestNotificationPermissions } from './src/services/notificationService';
import { COLORS, FONT_SIZES, SPACING } from './src/utils/constants';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initialize() {
      try {
        // Initialize database
        await getDatabase();

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

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Job Time Tracker</Text>
        <Text style={styles.loadingSubtext}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SubscriptionProvider>
          <TimerProvider>
            <AppNavigator />
            <StatusBar style="light" />
          </TimerProvider>
        </SubscriptionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
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
