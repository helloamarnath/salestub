// Subscription API module for SalesTub CRM Mobile App
// Handles all subscription and payment related API calls

import { api, ApiResponse } from './client';
import type { SubscriptionPlan, Subscription } from '@/types/subscription';

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
 * Manual-billing: start a subscription in PENDING_PAYMENT and generate the
 * first unpaid SubscriptionInvoice. User then opens the billing screen and
 * taps Pay Now to pay via Razorpay one-time order.
 */
export interface StartSubscriptionResponse {
  subscriptionId: string;
  subscriptionStatus: 'PENDING_PAYMENT' | 'TRIAL';
  isTrialConversion: boolean;
  invoice: {
    id: string;
    invoiceNumber: string;
    accessToken: string;
    amount: string;
    currency: string;
    dueDate: string;
  };
  redirectTo: string;
}

export async function startSubscription(
  token: string | null,
  data: {
    planId: string;
    orgId?: string;
    userCount?: number;
    billingCycle?: 'MONTHLY' | 'ANNUAL';
  }
): Promise<ApiResponse<StartSubscriptionResponse>> {
  return api.post<StartSubscriptionResponse>(`${BASE_URL}/start`, token, data);
}

// ============ Subscription invoices (manual-billing Pay Now) ============

export interface SubscriptionInvoiceListItem {
  id: string;
  invoiceNumber: string;
  planName: string;
  currency: string;
  amount: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'VOID';
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  paidAt: string | null;
  isAutoRenewed: boolean;
  accessToken: string;
  markedPaidManually: boolean;
  manualPaymentNote: string | null;
}

export async function getSubscriptionInvoices(
  token: string | null
): Promise<ApiResponse<SubscriptionInvoiceListItem[]>> {
  return api.get<SubscriptionInvoiceListItem[]>('/api/v1/subscription-invoices', token);
}

export interface CreateInvoicePaymentOrderResponse {
  gateway: 'razorpay';
  orderId: string;
  amount: number;
  currency: string;
  razorpayKeyId: string;
  invoiceNumber: string;
  invoiceId: string;
}

export async function createInvoicePaymentOrder(
  token: string | null,
  invoiceId: string,
  gateway: 'razorpay' = 'razorpay'
): Promise<ApiResponse<CreateInvoicePaymentOrderResponse>> {
  return api.post<CreateInvoicePaymentOrderResponse>(
    `/api/v1/subscription-invoices/${invoiceId}/create-payment-order`,
    token,
    { gateway }
  );
}

export interface VerifyInvoicePaymentResponse {
  success: true;
  subscriptionStatus:
    | 'TRIAL'
    | 'ACTIVE'
    | 'PAST_DUE'
    | 'CANCELED'
    | 'EXPIRED'
    | 'PENDING_PAYMENT';
}

export async function verifyInvoicePayment(
  token: string | null,
  invoiceId: string,
  payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }
): Promise<ApiResponse<VerifyInvoicePaymentResponse>> {
  return api.post<VerifyInvoicePaymentResponse>(
    `/api/v1/subscription-invoices/${invoiceId}/verify-payment`,
    token,
    payload
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

// ============ Plan features ============

/**
 * Plan-feature flags for the current org. Mirrors the web's
 * GET /subscriptions/me/plan-features response. Used to gate plan-locked
 * surfaces (WhatsApp CRM, Automation, etc.) behind an upsell card.
 */
export interface PlanFeatures {
  planName: string | null;
  planDisplayName: string | null;
  hasApiAccess: boolean;
  hasAutomation: boolean;
  hasIntegrations: boolean;
  hasSSO: boolean;
  hasWhatsAppNotifications: boolean;
  hasWhatsappCrm: boolean;
}

export async function getPlanFeatures(
  token: string | null,
): Promise<ApiResponse<PlanFeatures>> {
  return api.get<PlanFeatures>(`${BASE_URL}/me/plan-features`, token);
}
