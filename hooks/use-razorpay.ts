// Razorpay checkout hook for SalesTub CRM Mobile App
// Provides clean interface for native Razorpay SDK

import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import type {
  CheckoutSessionResponse,
  RazorpaySuccessResponse,
  RazorpayErrorResponse,
} from '@/types/subscription';

// Razorpay SDK types
interface RazorpayOptions {
  key: string;
  subscription_id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  name: string;
  description?: string;
  image?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
}

// Dynamic import for Razorpay (will fail in Expo Go)
let RazorpayCheckout: {
  open: (options: RazorpayOptions) => Promise<RazorpaySuccessResponse>;
} | null = null;

// Try to load Razorpay SDK
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RazorpayCheckout = require('react-native-razorpay').default;
} catch (error) {
  console.warn('Razorpay SDK not available. Using development build is required.');
}

export interface UseRazorpayReturn {
  /** Whether Razorpay SDK is available */
  isAvailable: boolean;
  /** Whether payment is in progress */
  isLoading: boolean;
  /** Open Razorpay checkout */
  openCheckout: (
    session: CheckoutSessionResponse,
    options?: { onSuccess?: (response: RazorpaySuccessResponse) => void; onError?: (error: RazorpayErrorResponse) => void }
  ) => Promise<RazorpaySuccessResponse | null>;
}

/**
 * Hook to interact with Razorpay native SDK
 *
 * Usage:
 * ```tsx
 * const { openCheckout, isLoading, isAvailable } = useRazorpay();
 *
 * const handlePayment = async () => {
 *   const session = await createCheckoutSession(...);
 *   const result = await openCheckout(session.data);
 *   if (result) {
 *     // Payment successful, verify with backend
 *     await verifyPayment({ razorpayPaymentId: result.razorpay_payment_id, ... });
 *   }
 * };
 * ```
 */
export function useRazorpay(): UseRazorpayReturn {
  const [isLoading, setIsLoading] = useState(false);

  const isAvailable = RazorpayCheckout !== null;

  const openCheckout = useCallback(
    async (
      session: CheckoutSessionResponse,
      options?: {
        onSuccess?: (response: RazorpaySuccessResponse) => void;
        onError?: (error: RazorpayErrorResponse) => void;
      }
    ): Promise<RazorpaySuccessResponse | null> => {
      // Check if SDK is available
      if (!RazorpayCheckout) {
        Alert.alert(
          'Development Build Required',
          'Razorpay payments require a development build. Please use EAS build or run locally.',
          [{ text: 'OK' }]
        );
        return null;
      }

      // Build Razorpay options
      const razorpayOptions: RazorpayOptions = {
        key: session.razorpayKeyId,
        subscription_id: session.razorpaySubscriptionId,
        name: 'SalesTub',
        description: 'Subscription Payment',
        prefill: session.prefill,
        notes: session.notes,
        theme: {
          color: '#6366f1', // Primary indigo color
        },
      };

      setIsLoading(true);

      try {
        const response = await RazorpayCheckout.open(razorpayOptions);

        // Success callback
        if (options?.onSuccess) {
          options.onSuccess(response);
        }

        return response;
      } catch (error) {
        const razorpayError = error as RazorpayErrorResponse;

        // User cancelled payment
        if (razorpayError.code === 0 || razorpayError.description?.includes('cancelled')) {
          // Silently handle cancellation - user closed the checkout
          console.log('Payment cancelled by user');
          return null;
        }

        // Error callback
        if (options?.onError) {
          options.onError(razorpayError);
        }

        // Show error alert
        Alert.alert(
          'Payment Failed',
          razorpayError.description || 'Payment could not be processed. Please try again.',
          [{ text: 'OK' }]
        );

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    isAvailable,
    isLoading,
    openCheckout,
  };
}

/**
 * Check if running in Expo Go (for showing appropriate warnings)
 */
export function isExpoGo(): boolean {
  // In Expo Go, Constants.executionEnvironment is 'storeClient'
  // In development builds, it's 'standalone'
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants').default;
    return Constants.executionEnvironment === 'storeClient';
  } catch {
    return false;
  }
}

/**
 * Format amount from paise to rupees for display
 */
export function formatAmountFromPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

/**
 * Format amount in INR
 */
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
