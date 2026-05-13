// Subscription type definitions for SalesTub CRM Mobile App
import { Palette } from '@/constants/theme';

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
  paymentGateway?: string;
  lastBillingAmount?: number;
}

export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'EXPIRED'
  | 'PENDING_PAYMENT';

export type BillingCycle = 'MONTHLY' | 'ANNUAL';

/**
 * Razorpay SDK success response for one-time order payments
 * (manual-billing Pay Now flow).
 */
export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
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

// UI Constants
export const SUBSCRIPTION_STATUS_COLORS: Record<SubscriptionStatus, string> = {
  TRIAL: Palette.amber,
  ACTIVE: Palette.emerald,
  PAST_DUE: Palette.red,
  CANCELED: '#6b7280',
  EXPIRED: Palette.redMuted,
  PENDING_PAYMENT: Palette.amber,
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIAL: 'Trial',
  ACTIVE: 'Active',
  PAST_DUE: 'Past Due',
  CANCELED: 'Canceled',
  EXPIRED: 'Expired',
  PENDING_PAYMENT: 'Pending Payment',
};

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  MONTHLY: 'Monthly',
  ANNUAL: 'Annual',
};
