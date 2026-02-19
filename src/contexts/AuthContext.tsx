import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppState, AppStateStatus } from 'react-native';
import { getDatabase } from '../db/database';

interface AuthUser {
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  signIn: (email: string) => Promise<void>;
  signOut: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  // Biometric
  isBiometricSupported: boolean;
  isBiometricEnabled: boolean;
  biometricType: 'faceid' | 'fingerprint' | 'none';
  isLocked: boolean;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Ensure auth tables exist in the database
 */
async function ensureAuthTables(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_auth (
      email TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS auth_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

async function getSetting(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM auth_settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO auth_settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

async function deleteSetting(key: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM auth_settings WHERE key = ?', [key]);
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<'faceid' | 'fingerprint' | 'none'>('none');
  const [isLocked, setIsLocked] = useState(false);

  // Check biometric hardware support
  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setIsBiometricSupported(compatible && enrolled);

        if (compatible && enrolled) {
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType('faceid');
          } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setBiometricType('fingerprint');
          }
        }
      } catch (error) {
        console.error('Failed to check biometric support:', error);
      }
    };
    checkBiometrics();
  }, []);

  // Load stored user and biometric setting on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        await ensureAuthTables();
        const db = await getDatabase();
        const row = await db.getFirstAsync<{ email: string }>(
          'SELECT email FROM user_auth LIMIT 1'
        );
        if (row) {
          setUser({ email: row.email });
        }

        // Check if biometric is enabled
        const bioEnabled = await getSetting('biometric_enabled');
        if (bioEnabled === 'true' && row) {
          setIsBiometricEnabled(true);
          // Lock the app on initial load — user must authenticate
          setIsLocked(true);
        }
      } catch (error) {
        console.error('Failed to load auth user:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  // Lock the app when it comes back from background
  useEffect(() => {
    let lastBackground: number | null = null;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        lastBackground = Date.now();
      } else if (nextState === 'active' && isBiometricEnabled && user) {
        // Lock if app was in background for more than 30 seconds
        if (lastBackground && Date.now() - lastBackground > 30000) {
          setIsLocked(true);
        }
        lastBackground = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isBiometricEnabled, user]);

  const signIn = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      throw new Error('Email is required');
    }
    try {
      await ensureAuthTables();
      const db = await getDatabase();
      await db.runAsync('DELETE FROM user_auth');
      await db.runAsync(
        'INSERT INTO user_auth (email, created_at) VALUES (?, ?)',
        [trimmed, new Date().toISOString()]
      );
      setUser({ email: trimmed });
      setIsLocked(false);
    } catch (error) {
      console.error('Failed to sign in:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await ensureAuthTables();
      const db = await getDatabase();
      await db.runAsync('DELETE FROM user_auth');
      await db.runAsync('DELETE FROM auth_settings');
      setUser(null);
      setIsBiometricEnabled(false);
      setIsLocked(false);
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  }, []);

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    try {
      // Verify user can authenticate first
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity to enable biometric login',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        await ensureAuthTables();
        await setSetting('biometric_enabled', 'true');
        setIsBiometricEnabled(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to enable biometric:', error);
      return false;
    }
  }, []);

  const disableBiometric = useCallback(async () => {
    try {
      await ensureAuthTables();
      await deleteSetting('biometric_enabled');
      setIsBiometricEnabled(false);
      setIsLocked(false);
    } catch (error) {
      console.error('Failed to disable biometric:', error);
    }
  }, []);

  const deleteAccount = useCallback(async (): Promise<void> => {
    try {
      const email = user?.email;

      // Cancel Stripe subscription via server API
      if (email) {
        try {
          await fetch('https://gramertech.com/api/delete-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
        } catch (apiError) {
          console.warn('Failed to call delete-account API:', apiError);
          // Continue with local deletion even if API fails
        }
      }

      // Delete all local data
      await ensureAuthTables();
      const db = await getDatabase();
      const tables = [
        'active_timer', 'calendar_sync', 'client_geofences', 'clients',
        'fuel_entries', 'invoices', 'material_catalog', 'materials',
        'mileage_entries', 'photos', 'project_templates', 'qr_codes',
        'receipts', 'recurring_job_occurrences', 'recurring_jobs',
        'session_tags', 'session_weather', 'tags', 'template_materials',
        'time_sessions', 'user_settings', 'vehicles', 'voice_notes',
        'user_auth', 'auth_settings',
      ];
      for (const table of tables) {
        try {
          await db.runAsync(`DELETE FROM ${table}`);
        } catch (e) {
          console.warn(`Failed to clear table ${table}:`, e);
        }
      }

      // Reset all state
      setUser(null);
      setIsBiometricEnabled(false);
      setIsLocked(false);
    } catch (error) {
      console.error('Failed to delete account:', error);
      throw error;
    }
  }, [user]);

  const authenticateWithBiometric = useCallback(async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: biometricType === 'faceid'
          ? 'Unlock HourFlow with Face ID'
          : 'Unlock HourFlow with your fingerprint',
        disableDeviceFallback: false,
        cancelLabel: 'Use passcode',
      });

      if (result.success) {
        setIsLocked(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }, [biometricType]);

  const value: AuthContextType = {
    user,
    signIn,
    signOut,
    isAuthenticated: user !== null,
    isLoading,
    isBiometricSupported,
    isBiometricEnabled,
    biometricType,
    isLocked,
    enableBiometric,
    disableBiometric,
    authenticateWithBiometric,
    deleteAccount,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
