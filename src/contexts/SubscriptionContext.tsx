import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesError,
} from 'react-native-purchases';
import {
  SubscriptionState,
  SubscriptionPackage,
  SubscriptionTier,
  PremiumFeature,
  FREE_TIER_LIMITS,
} from '../types';
import { isWithinTrialPeriod, getTrialDaysRemaining } from '../db/settingsRepository';

// RevenueCat API Keys - Replace with your actual keys from RevenueCat dashboard
const REVENUECAT_API_KEY_IOS = 'your_ios_api_key_here';
const REVENUECAT_API_KEY_ANDROID = 'your_android_api_key_here';

// Entitlement ID - This should match your entitlement in RevenueCat
const PREMIUM_ENTITLEMENT_ID = 'premium';

interface SubscriptionContextType extends SubscriptionState {
  purchasePackage: (pkg: SubscriptionPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  checkFeatureAccess: (feature: PremiumFeature) => boolean;
  refreshSubscriptionStatus: () => Promise<void>;
  canAddMoreClients: (currentCount: number) => boolean;
  canAddMoreMaterials: (currentCount: number) => boolean;
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

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [state, setState] = useState<SubscriptionState>(defaultState);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInTrial, setIsInTrial] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);

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

  // Initialize RevenueCat
  useEffect(() => {
    const initializePurchases = async () => {
      try {
        // Check trial status first
        const inTrial = await checkTrialStatus();


        // Configure RevenueCat with the appropriate API key
        const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

        // Only configure if we have a valid API key
        if (apiKey && !apiKey.includes('your_')) {
          await Purchases.configure({ apiKey });
          setIsInitialized(true);

          // Fetch initial subscription status
          await refreshSubscriptionStatus();
        } else {
          // Development mode - use trial status
          console.log('RevenueCat not configured - running in development mode');
          setState(prev => ({
            ...prev,
            isLoading: false,
            isPremium: inTrial, // Premium during trial
            tier: inTrial ? 'premium' : 'free',
          }));
        }
      } catch (error) {
        console.error('Failed to initialize RevenueCat:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initializePurchases();
  }, [checkTrialStatus]);

  // Listen for customer info updates
  useEffect(() => {
    if (!isInitialized) return;

    const customerInfoUpdated = (info: CustomerInfo) => {
      updateSubscriptionState(info);
    };

    Purchases.addCustomerInfoUpdateListener(customerInfoUpdated);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(customerInfoUpdated);
    };
  }, [isInitialized]);

  // Update subscription state from CustomerInfo
  const updateSubscriptionState = useCallback(async (customerInfo: CustomerInfo) => {
    const premiumEntitlement = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID];
    const hasPaidSubscription = !!premiumEntitlement;

    // Check if in trial
    const inTrial = await isWithinTrialPeriod();
    const daysRemaining = await getTrialDaysRemaining();
    setIsInTrial(inTrial);
    setTrialDaysRemaining(daysRemaining);

    // User has premium if they paid OR if they're in trial
    const isPremium = hasPaidSubscription || inTrial;

    setState(prev => ({
      ...prev,
      isLoading: false,
      isPremium,
      tier: isPremium ? 'premium' : 'free',
      expirationDate: premiumEntitlement?.expirationDate
        ? new Date(premiumEntitlement.expirationDate)
        : null,
    }));
  }, []);

  // Refresh subscription status
  const refreshSubscriptionStatus = useCallback(async () => {
    if (!isInitialized) return;

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // Get customer info
      const customerInfo = await Purchases.getCustomerInfo();
      updateSubscriptionState(customerInfo);

      // Get available packages
      const offerings = await Purchases.getOfferings();
      if (offerings.current?.availablePackages) {
        const packages: SubscriptionPackage[] = offerings.current.availablePackages.map(
          (pkg: PurchasesPackage) => ({
            identifier: pkg.identifier,
            title: pkg.product.title,
            description: pkg.product.description,
            priceString: pkg.product.priceString,
            price: pkg.product.price,
            currency: pkg.product.currencyCode,
            period: pkg.packageType === 'MONTHLY' ? 'monthly' : 'yearly',
          })
        );
        setState(prev => ({ ...prev, packages }));
      }
    } catch (error) {
      console.error('Failed to refresh subscription status:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [isInitialized, updateSubscriptionState]);

  // Purchase a package
  const purchasePackage = useCallback(async (pkg: SubscriptionPackage): Promise<boolean> => {
    if (!isInitialized) {
      Alert.alert('Not Available', 'Purchases are not available in development mode.');
      return false;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // Find the actual RevenueCat package
      const offerings = await Purchases.getOfferings();
      const rcPackage = offerings.current?.availablePackages.find(
        (p: PurchasesPackage) => p.identifier === pkg.identifier
      );

      if (!rcPackage) {
        throw new Error('Package not found');
      }

      // Make the purchase
      const { customerInfo } = await Purchases.purchasePackage(rcPackage);
      updateSubscriptionState(customerInfo);

      return customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
    } catch (error) {
      const purchaseError = error as PurchasesError;

      // User cancelled - not an error
      if (purchaseError.userCancelled) {
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      console.error('Purchase failed:', error);
      Alert.alert('Purchase Failed', 'Unable to complete purchase. Please try again.');
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [isInitialized, updateSubscriptionState]);

  // Restore purchases
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!isInitialized) {
      Alert.alert('Not Available', 'Restore is not available in development mode.');
      return false;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const customerInfo = await Purchases.restorePurchases();
      updateSubscriptionState(customerInfo);

      const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;

      if (isPremium) {
        Alert.alert('Success', 'Your subscription has been restored!');
      } else {
        Alert.alert('No Subscription Found', 'No active subscription was found for this account.');
      }

      return isPremium;
    } catch (error) {
      console.error('Restore failed:', error);
      Alert.alert('Restore Failed', 'Unable to restore purchases. Please try again.');
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [isInitialized, updateSubscriptionState]);

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

  const value: SubscriptionContextType = {
    ...state,
    purchasePackage,
    restorePurchases,
    checkFeatureAccess,
    refreshSubscriptionStatus,
    canAddMoreClients,
    canAddMoreMaterials,
    isInTrial,
    trialDaysRemaining,
  };

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
