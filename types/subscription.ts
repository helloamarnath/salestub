// Subscription type definitions for SalesTub CRM Mobile App

/**
 * Subscription Plan from backend
 */
export interface SubscriptionPlan {
  id: string;
  name: string; // Internal name: "STARTER", "PROFESSIONAL"
  displayName: string; // Display name: "Starter Plan"
  description: string;

  // Pricing
  pricePerUserMonthlyINR: number; // e.g., 1000 (₹1,000/user/month)
  pricePerUserMonthlyUSD: number; // e.g., 12 ($12/user/month)
  pricePerUserAnnualINR: number; // e.g., 10000 (₹10,000/user/year)
  pricePerUserAnnualUSD: number; // e.g., 100 ($100/user/year)

  // Setup fees (monthly only)
  setupFeeINR?: number; // e.g., 2000 (₹2,000 one-time)
  setupFeeUSD?: number; // e.g., 25 ($25 one-time)

  // Features
  features: string[]; // ["Unlimited Leads", "Email Support", ...]

  // Limits
  minUsers: number;
  maxUsers?: number; // null = unlimited
  trialDays: number;

  // Status
  isActive: boolean;
}

/**
 * Active subscription for an organization
 */
export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  userCount: number;
  billingCycle: BillingCycle;

  // Dates
  currentPeriodStart: string; // ISO date
  currentPeriodEnd: string; // ISO date
  trialStart?: string;
  trialEnd?: string;

  // Cancellation
  cancelAtPeriodEnd: boolean;

  // Payment info
  paymentGateway?: 'razorpay' | 'stripe';
  lastBillingAmount?: number;
}

export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'EXPIRED';

export type BillingCycle = 'MONTHLY' | 'ANNUAL';

/**
 * Request to create checkout session
 */
export interface CreateCheckoutDto {
  planId: string;
  orgId: string;
  userCount: number;
  billingCycle: BillingCycle;
}

/**
 * Response from checkout session creation
 */
export interface CheckoutSessionResponse {
  // Internal tracking
  subscriptionId: string; // Our DB subscription ID

  // Razorpay specific
  razorpayKeyId: string; // Public key for SDK
  razorpaySubscriptionId: string; // Razorpay subscription ID

  // Payment details
  amount: number; // In paise (e.g., 100000 = ₹1,000)
  currency: string; // "INR"

  // Prefill data for checkout form
  prefill: {
    name?: string;
    email?: string;
    contact?: string;
  };

  // Metadata
  notes: Record<string, string>;
}

/**
 * Razorpay SDK success response
 */
export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

/**
 * Razorpay SDK error response
 */
export interface RazorpayErrorResponse {
  code: number;
  description: string;
  source: string;
  step: string;
  reason: string;
  metadata: {
    order_id?: string;
    payment_id?: string;
  };
}

/**
 * Payment verification request
 */
export interface VerifyPaymentDto {
  razorpayPaymentId: string;
  razorpaySubscriptionId: string;
  razorpaySignature: string;
}

/**
 * Payment verification response
 */
export interface VerifyPaymentResponse {
  success: boolean;
  subscription: Subscription;
  message?: string;
}

// UI Constants
export const SUBSCRIPTION_STATUS_COLORS: Record<SubscriptionStatus, string> = {
  TRIAL: '#f59e0b', // Amber
  ACTIVE: '#22c55e', // Green
  PAST_DUE: '#ef4444', // Red
  CANCELED: '#6b7280', // Gray
  EXPIRED: '#dc2626', // Red
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIAL: 'Trial',
  ACTIVE: 'Active',
  PAST_DUE: 'Past Due',
  CANCELED: 'Canceled',
  EXPIRED: 'Expired',
};

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  MONTHLY: 'Monthly',
  ANNUAL: 'Annual',
};
