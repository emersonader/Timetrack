import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import {
  SubscriptionState,
  SubscriptionPackage,
  SubscriptionTier,
  PremiumFeature,
  FREE_TIER_LIMITS,
} from '../types';
import { isWithinTrialPeriod, getTrialDaysRemaining } from '../db/settingsRepository';
import { getMonthlyInvoiceCount } from '../db/invoiceRepository';
import { getDatabase } from '../db/database';
import { useAuth } from './AuthContext';

// How often to re-check subscription (6 hours in ms)
const RECHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

const SUBSCRIPTION_API_URL = 'https://gramertech.com/api/check-subscription';

interface SubscriptionApiResponse {
  subscribed: boolean;
  status: 'active' | 'past_due' | 'inactive' | 'none';
  plan: string;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
}

interface SubscriptionCacheRow {
  email: string;
  subscribed: number;
  status: string;
  checked_at: string;
  current_period_end: string;
}

interface SubscriptionContextType extends SubscriptionState {
  purchasePackage: (pkg: SubscriptionPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  checkFeatureAccess: (feature: PremiumFeature) => boolean;
  refreshSubscriptionStatus: () => Promise<void>;
  canAddMoreClients: (currentCount: number) => boolean;
  canAddMoreMaterials: (currentCount: number) => boolean;
  canCreateMoreInvoices: () => Promise<boolean>;
  isInTrial: boolean;
  trialDaysRemaining: number;
}

const defaultState: SubscriptionState = {
  isLoading: true,
  isPremium: false,
  tier: 'free',
  expirationDate: null,
  packages: [],
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

/**
 * Ensure the subscription_cache table exists
 */
async function ensureCacheTable(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS subscription_cache (
      email TEXT PRIMARY KEY,
      subscribed INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'none',
      checked_at TEXT NOT NULL,
      current_period_end TEXT
    );
  `);
}

/**
 * Read cached subscription for an email
 */
async function getCachedSubscription(email: string): Promise<SubscriptionCacheRow | null> {
  await ensureCacheTable();
  const db = await getDatabase();
  return db.getFirstAsync<SubscriptionCacheRow>(
    'SELECT * FROM subscription_cache WHERE email = ?',
    [email]
  );
}

/**
 * Write subscription to cache
 */
async function setCachedSubscription(
  email: string,
  subscribed: boolean,
  status: string,
  currentPeriodEnd: string | null
): Promise<void> {
  await ensureCacheTable();
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO subscription_cache (email, subscribed, status, checked_at, current_period_end)
     VALUES (?, ?, ?, ?, ?)`,
    [email, subscribed ? 1 : 0, status, new Date().toISOString(), currentPeriodEnd ?? '']
  );
}

/**
 * Fetch subscription status from API
 */
async function fetchSubscriptionFromApi(email: string): Promise<SubscriptionApiResponse | null> {
  try {
    const response = await fetch(
      `${SUBSCRIPTION_API_URL}?email=${encodeURIComponent(email)}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    if (!response.ok) {
      console.error('Subscription API returned status:', response.status);
      return null;
    }
    const data: SubscriptionApiResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch subscription from API:', error);
    return null;
  }
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>(defaultState);
  const [isInTrial, setIsInTrial] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);
  const lastCheckRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check trial status
  const checkTrialStatus = useCallback(async () => {
    try {
      const inTrial = await isWithinTrialPeriod();
      const daysRemaining = await getTrialDaysRemaining();
      setIsInTrial(inTrial);
      setTrialDaysRemaining(daysRemaining);
      return inTrial;
    } catch (error) {
      console.error('Failed to check trial status:', error);
      return false;
    }
  }, []);

  // Core check: fetch from API, fall back to cache, combine with trial
  const checkSubscription = useCallback(async () => {
    const inTrial = await checkTrialStatus();
    const email = user?.email;

    if (!email) {
      // Not signed in → trial logic only
      setState(prev => ({
        ...prev,
        isLoading: false,
        isPremium: inTrial,
        tier: inTrial ? 'premium' : 'free',
        expirationDate: null,
        packages: [],
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    // Try API first
    const apiResult = await fetchSubscriptionFromApi(email);

    if (apiResult) {
      // Cache the result
      const periodEnd = apiResult.currentPeriodEnd
        ? new Date(apiResult.currentPeriodEnd * 1000).toISOString()
        : null;
      await setCachedSubscription(email, apiResult.subscribed, apiResult.status, periodEnd);
      lastCheckRef.current = Date.now();

      const hasActiveSubscription = apiResult.subscribed && (apiResult.status === 'active' || apiResult.status === 'past_due');
      const isPremium = hasActiveSubscription || inTrial;

      setState(prev => ({
        ...prev,
        isLoading: false,
        isPremium,
        tier: isPremium ? 'premium' : 'free',
        expirationDate: periodEnd ? new Date(periodEnd) : null,
        packages: [],
      }));
      return;
    }

    // API failed → fall back to cache
    const cached = await getCachedSubscription(email);
    if (cached) {
      const hasActiveSubscription = Boolean(cached.subscribed) && (cached.status === 'active' || cached.status === 'past_due');
      const isPremium = hasActiveSubscription || inTrial;

      setState(prev => ({
        ...prev,
        isLoading: false,
        isPremium,
        tier: isPremium ? 'premium' : 'free',
        expirationDate: cached.current_period_end ? new Date(cached.current_period_end) : null,
        packages: [],
      }));
      return;
    }

    // No cache either → trial only
    setState(prev => ({
      ...prev,
      isLoading: false,
      isPremium: inTrial,
      tier: inTrial ? 'premium' : 'free',
      expirationDate: null,
      packages: [],
    }));
  }, [user?.email, checkTrialStatus]);

  // Initial check and when user changes
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Re-check every 6 hours
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      checkSubscription();
    }, RECHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkSubscription]);

  // Re-check when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const now = Date.now();
        // Only re-check if it's been at least 5 minutes since last check
        if (now - lastCheckRef.current > 5 * 60 * 1000) {
          checkSubscription();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [checkSubscription]);

  // Refresh subscription status (public)
  const refreshSubscriptionStatus = useCallback(async () => {
    await checkSubscription();
  }, [checkSubscription]);

  // purchasePackage is no longer used with Stripe web flow,
  // but we keep the interface to avoid breaking consumers
  const purchasePackage = useCallback(async (_pkg: SubscriptionPackage): Promise<boolean> => {
    Alert.alert(
      'Subscribe Online',
      'Please visit gramertech.com/hourflow to subscribe, then enter your email to verify.',
    );
    return false;
  }, []);

  // Restore = re-check API
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!user?.email) {
      Alert.alert('Sign In Required', 'Please enter your email first to verify your subscription.');
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));
    const apiResult = await fetchSubscriptionFromApi(user.email);

    if (apiResult) {
      const periodEnd = apiResult.currentPeriodEnd
        ? new Date(apiResult.currentPeriodEnd * 1000).toISOString()
        : null;
      await setCachedSubscription(user.email, apiResult.subscribed, apiResult.status, periodEnd);

      const inTrial = await checkTrialStatus();
      const hasActiveSubscription = apiResult.subscribed && (apiResult.status === 'active' || apiResult.status === 'past_due');
      const isPremium = hasActiveSubscription || inTrial;

      setState(prev => ({
        ...prev,
        isLoading: false,
        isPremium,
        tier: isPremium ? 'premium' : 'free',
        expirationDate: periodEnd ? new Date(periodEnd) : null,
        packages: [],
      }));

      if (hasActiveSubscription) {
        Alert.alert('Success', 'Your subscription has been verified!');
        return true;
      } else {
        Alert.alert('No Subscription Found', 'No active subscription was found for this email.');
        return false;
      }
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
      Alert.alert('Connection Error', 'Unable to verify subscription. Please check your internet connection and try again.');
      return false;
    }
  }, [user?.email, checkTrialStatus]);

  // Check if user has access to a specific feature
  const checkFeatureAccess = useCallback((feature: PremiumFeature): boolean => {
    if (state.isPremium) return true;

    // Free tier access rules
    switch (feature) {
      case 'unlimited_clients':
        return false;
      case 'custom_branding':
        return FREE_TIER_LIMITS.canCustomizeBranding;
      case 'pdf_export':
        return FREE_TIER_LIMITS.canExportPdf;
      case 'email_invoices':
        return FREE_TIER_LIMITS.canEmailInvoices;
      case 'sms_invoices':
        return FREE_TIER_LIMITS.canSmsInvoices;
      case 'unlimited_materials':
        return false;
      case 'data_export':
        return FREE_TIER_LIMITS.canExportData;
      case 'recurring_jobs':
        return false;
      case 'voice_notes':
        return false;
      case 'project_templates':
        return false;
      case 'analytics':
        return false;
      case 'insights':
        return false;
      case 'inventory':
        return false;
      case 'fleet':
        return false;
      case 'qr_codes':
        return false;
      case 'receipt_scanning':
        return false;
      case 'integrations':
        return false;
      case 'client_portal':
        return false;
      case 'geofencing':
        return false;
      case 'unlimited_invoices':
        return false;
      case 'unlimited_history':
        return false;
      default:
        return false;
    }
  }, [state.isPremium]);

  // Check if user can add more clients
  const canAddMoreClients = useCallback((currentCount: number): boolean => {
    if (state.isPremium) return true;
    return currentCount < FREE_TIER_LIMITS.maxClients;
  }, [state.isPremium]);

  // Check if user can add more materials for a client
  const canAddMoreMaterials = useCallback((currentCount: number): boolean => {
    if (state.isPremium) return true;
    return currentCount < FREE_TIER_LIMITS.maxMaterialsPerClient;
  }, [state.isPremium]);

  // Check if user can create more invoices this month
  const canCreateMoreInvoices = useCallback(async (): Promise<boolean> => {
    if (state.isPremium) return true;
    const count = await getMonthlyInvoiceCount();
    return count < FREE_TIER_LIMITS.maxInvoicesPerMonth;
  }, [state.isPremium]);

  const value: SubscriptionContextType = useMemo(() => ({
    ...state,
    purchasePackage,
    restorePurchases,
    checkFeatureAccess,
    refreshSubscriptionStatus,
    canAddMoreClients,
    canAddMoreMaterials,
    canCreateMoreInvoices,
    isInTrial,
    trialDaysRemaining,
  }), [state, purchasePackage, restorePurchases, checkFeatureAccess, refreshSubscriptionStatus, canAddMoreClients, canAddMoreMaterials, canCreateMoreInvoices, isInTrial, trialDaysRemaining]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// Hook to use subscription context
export function useSubscription(): SubscriptionContextType {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

// Hook to check premium status
export function useIsPremium(): boolean {
  const { isPremium } = useSubscription();
  return isPremium;
}

// Hook to check feature access
export function useFeatureAccess(feature: PremiumFeature): boolean {
  const { checkFeatureAccess } = useSubscription();
  return checkFeatureAccess(feature);
}
