// Subscription API module for SalesTub CRM Mobile App
// Handles all subscription and payment related API calls

import { api, ApiResponse } from './client';
import type {
  SubscriptionPlan,
  Subscription,
  CreateCheckoutDto,
  CheckoutSessionResponse,
  VerifyPaymentDto,
  VerifyPaymentResponse,
} from '@/types/subscription';

const BASE_URL = '/api/v1/subscriptions';

/**
 * Get all available subscription plans
 */
export async function getPlans(
  token: string | null
): Promise<ApiResponse<SubscriptionPlan[]>> {
  return api.get<SubscriptionPlan[]>(`${BASE_URL}/plans`, token);
}

/**
 * Get current subscription for an organization
 */
export async function getOrganizationSubscription(
  token: string | null,
  orgId: string
): Promise<ApiResponse<Subscription | null>> {
  return api.get<Subscription | null>(
    `${BASE_URL}/organization/${orgId}`,
    token
  );
}

/**
 * Create a checkout session for subscription
 * Returns data needed for Razorpay SDK
 */
export async function createCheckoutSession(
  token: string | null,
  data: CreateCheckoutDto
): Promise<ApiResponse<CheckoutSessionResponse>> {
  return api.post<CheckoutSessionResponse>(`${BASE_URL}/checkout`, token, data);
}

/**
 * Verify Razorpay payment after successful checkout
 * Should be called after Razorpay SDK returns success
 * Uses the mobile-specific endpoint for signature verification
 */
export async function verifyPayment(
  token: string | null,
  data: VerifyPaymentDto
): Promise<ApiResponse<VerifyPaymentResponse>> {
  return api.post<VerifyPaymentResponse>(
    `${BASE_URL}/verify-mobile-payment`,
    token,
    data
  );
}

/**
 * Cancel subscription at period end
 * User will have access until current period ends
 */
export async function cancelSubscription(
  token: string | null,
  orgId: string
): Promise<ApiResponse<Subscription>> {
  return api.post<Subscription>(
    `${BASE_URL}/organization/${orgId}/cancel`,
    token
  );
}

/**
 * Reactivate a canceled subscription
 * Only works if subscription is still in CANCELED status and period hasn't ended
 */
export async function reactivateSubscription(
  token: string | null,
  orgId: string
): Promise<ApiResponse<Subscription>> {
  return api.post<Subscription>(
    `${BASE_URL}/organization/${orgId}/reactivate`,
    token
  );
}

/**
 * Update subscription user count
 * May trigger prorated charges
 */
export async function updateUserCount(
  token: string | null,
  orgId: string,
  userCount: number
): Promise<ApiResponse<Subscription>> {
  return api.patch<Subscription>(
    `${BASE_URL}/organization/${orgId}/users`,
    token,
    { userCount }
  );
}

/**
 * Change subscription plan
 * May trigger prorated charges or credit
 */
export async function changePlan(
  token: string | null,
  orgId: string,
  planId: string
): Promise<ApiResponse<CheckoutSessionResponse>> {
  return api.post<CheckoutSessionResponse>(
    `${BASE_URL}/organization/${orgId}/change-plan`,
    token,
    { planId }
  );
}

/**
 * Get billing history for organization
 */
export interface BillingHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  invoiceUrl?: string;
  paidAt?: string;
  createdAt: string;
  description: string;
}

export async function getBillingHistory(
  token: string | null,
  orgId: string
): Promise<ApiResponse<BillingHistoryItem[]>> {
  return api.get<BillingHistoryItem[]>(
    `${BASE_URL}/organization/${orgId}/billing-history`,
    token
  );
}
