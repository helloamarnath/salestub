// Razorpay checkout hook for SalesTub CRM Mobile App
// Provides clean interface for native Razorpay SDK

import { useState, useCallback } from 'react';
import { Palette } from '@/constants/theme';
import { Alert } from 'react-native';
import type {
  RazorpaySuccessResponse,
  RazorpayErrorResponse,
} from '@/types/subscription';

// Razorpay SDK types — manual billing model uses one-time orders only.
interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
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
  /**
   * Open Razorpay checkout for a one-time order (manual-billing Pay Now).
   * Use this with the response from createInvoicePaymentOrder().
   */
  openOrderCheckout: (
    order: {
      razorpayKeyId: string;
      orderId: string;
      amount: number;
      currency: string;
      invoiceNumber: string;
    },
    prefill?: { name?: string; email?: string; contact?: string },
    options?: {
      onSuccess?: (response: RazorpaySuccessResponse) => void;
      onError?: (error: RazorpayErrorResponse) => void;
    }
  ) => Promise<RazorpaySuccessResponse | null>;
}

/**
 * Hook to interact with Razorpay native SDK for one-time order payments.
 */
export function useRazorpay(): UseRazorpayReturn {
  const [isLoading, setIsLoading] = useState(false);
  const isAvailable = RazorpayCheckout !== null;

  const openOrderCheckout = useCallback(
    async (
      order: {
        razorpayKeyId: string;
        orderId: string;
        amount: number;
        currency: string;
        invoiceNumber: string;
      },
      prefill?: { name?: string; email?: string; contact?: string },
      options?: {
        onSuccess?: (response: RazorpaySuccessResponse) => void;
        onError?: (error: RazorpayErrorResponse) => void;
      }
    ): Promise<RazorpaySuccessResponse | null> => {
      if (!RazorpayCheckout) {
        Alert.alert(
          'Development Build Required',
          'Razorpay payments require a development build. Please use EAS build or run locally.',
          [{ text: 'OK' }]
        );
        return null;
      }

      const razorpayOptions: RazorpayOptions = {
        key: order.razorpayKeyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'SalesTub',
        description: `Subscription invoice ${order.invoiceNumber}`,
        prefill,
        theme: { color: Palette.indigo },
      };

      setIsLoading(true);

      try {
        const response = await RazorpayCheckout.open(razorpayOptions);
        if (options?.onSuccess) options.onSuccess(response);
        return response;
      } catch (error) {
        const razorpayError = error as RazorpayErrorResponse;

        if (razorpayError.code === 0 || razorpayError.description?.includes('cancelled')) {
          console.log('Payment cancelled by user');
          return null;
        }

        if (options?.onError) options.onError(razorpayError);

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

  return { isAvailable, isLoading, openOrderCheckout };
}

/**
 * Check if running in Expo Go (for showing appropriate warnings)
 */
export function isExpoGo(): boolean {
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
