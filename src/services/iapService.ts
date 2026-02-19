import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  getAvailablePurchases,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  type ProductOrSubscription,
  type Purchase,
  type PurchaseError,
} from 'react-native-iap';

const PRODUCT_ID = 'com.jobtimetracker.app.premium.monthly';

let purchaseUpdateSubscription: ReturnType<typeof purchaseUpdatedListener> | null = null;
let purchaseErrorSubscription: ReturnType<typeof purchaseErrorListener> | null = null;
let isInitialized = false;

// Callbacks
let onPurchaseSuccess: ((purchase: Purchase) => void) | null = null;
let onPurchaseError: ((error: PurchaseError) => void) | null = null;

export function setOnPurchaseSuccess(cb: typeof onPurchaseSuccess) {
  onPurchaseSuccess = cb;
}

export function setOnPurchaseError(cb: typeof onPurchaseError) {
  onPurchaseError = cb;
}

/**
 * Initialize IAP connection and set up listeners.
 */
export async function initIAP(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  if (isInitialized) return true;

  try {
    await initConnection();
    isInitialized = true;

    purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase) => {
      try {
        await finishTransaction({ purchase, isConsumable: false });
        onPurchaseSuccess?.(purchase);
      } catch (err) {
        console.error('[IAP] Failed to finish transaction:', err);
      }
    });

    purchaseErrorSubscription = purchaseErrorListener((error) => {
      console.error('[IAP] Purchase error:', error);
      onPurchaseError?.(error);
    });

    return true;
  } catch (error) {
    console.warn('[IAP] Failed to initialize:', error);
    isInitialized = false;
    return false;
  }
}

/**
 * Get subscription product info.
 */
export async function getSubscriptionProduct(): Promise<ProductOrSubscription | null> {
  if (!isInitialized) return null;

  try {
    const products = await fetchProducts({ skus: [PRODUCT_ID], type: 'subs' });
    if (!products) return null;
    return products.find((p) => p.id === PRODUCT_ID) ?? null;
  } catch (error) {
    console.error('[IAP] Failed to fetch products:', error);
    return null;
  }
}

/**
 * Request a subscription purchase (triggers StoreKit payment sheet).
 */
export async function purchaseSubscription(): Promise<void> {
  if (!isInitialized) {
    throw new Error('IAP not initialized');
  }

  try {
    await requestPurchase({
      request: { apple: { sku: PRODUCT_ID } },
      type: 'subs',
    });
    // Result comes via purchaseUpdatedListener
  } catch (error) {
    console.error('[IAP] Failed to request subscription:', error);
    throw error;
  }
}

/**
 * Check if user has an active IAP subscription.
 */
export async function checkActiveSubscription(): Promise<boolean> {
  if (!isInitialized) return false;

  try {
    const purchases = await getAvailablePurchases();
    return purchases.some((p) => p.id === PRODUCT_ID || (p as any).productId === PRODUCT_ID);
  } catch (error) {
    console.error('[IAP] Failed to check active subscription:', error);
    return false;
  }
}

/**
 * End IAP connection and remove listeners.
 */
export async function endIAP(): Promise<void> {
  if (purchaseUpdateSubscription) {
    purchaseUpdateSubscription.remove();
    purchaseUpdateSubscription = null;
  }
  if (purchaseErrorSubscription) {
    purchaseErrorSubscription.remove();
    purchaseErrorSubscription = null;
  }

  if (isInitialized) {
    try {
      await endConnection();
    } catch (error) {
      console.error('[IAP] Failed to end connection:', error);
    }
    isInitialized = false;
  }
}

export function getIsInitialized(): boolean {
  return isInitialized;
}
