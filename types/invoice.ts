// Invoice type definitions for SalesTub CRM Mobile App
import { Palette } from '@/constants/theme';

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';

export interface InvoiceItem {
  id?: string;
  productId?: string;
  product?: { id: string; name: string; sku?: string };
  name: string;
  sku?: string;
  description?: string;
  quantity: number | string;
  unitPrice: number | string;
  taxRate: number | string;
  discount: number | string;
  subtotal: number | string;
  taxAmount: number | string;
  total: number | string;
  sortOrder?: number;
  unit?: string;
  hsnCode?: string;
  taxType?: 'INTRA' | 'INTER' | null;
  cgstRate?: number | string;
  sgstRate?: number | string;
  igstRate?: number | string;
  cgstAmount?: number | string;
  sgstAmount?: number | string;
  igstAmount?: number | string;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number | string;
  currency: number | string;
  status: string;
  paymentMethod?: string;
  gatewayType: string;
  gatewayPaymentId?: string;
  paidAt?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  accessToken: string;
  status: InvoiceStatus;
  invoiceDate: string;
  dueDate: string;
  sentAt?: string;
  viewedAt?: string;
  paidDate?: string;

  subtotal: number | string;
  taxAmount: number | string;
  discountAmount: number | string;
  total: number | string;
  amountPaid: number | string;
  amountDue: number | string;

  discountType?: 'AMOUNT' | 'PERCENTAGE';
  discountPercent?: number | string;
  cgstTotal?: number | string;
  sgstTotal?: number | string;
  igstTotal?: number | string;

  subject?: string;
  notes?: string;
  termsAndConditions?: string;
  paymentTerms?: string;

  isRecurring?: boolean;
  recurringFrequency?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

  leadId?: string;
  lead?: { id: string; title: string; displayId?: string };
  quoteId?: string;
  quote?: { id: string; quoteNumber: string; status: string };
  contactId: string;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    companyName?: string;
  };
  companyId?: string;
  company?: { id: string; name: string };
  currencyId: string;
  currency?: { id: string; code: string; symbol: string; name: string };
  owner?: { id: string; user: { firstName?: string; lastName?: string; email?: string } };

  viewCount: number;
  reminderCount: number;
  lastReminderAt?: string;

  items: InvoiceItem[];
  payments?: InvoicePayment[];
  _count?: { items: number; payments: number };

  createdAt: string;
  updatedAt: string;
}

export interface InvoiceFilters {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  contactId?: string;
  leadId?: string;
  search?: string;
  isRecurring?: boolean;
}

export interface PaginatedInvoicesResponse {
  data: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateInvoiceItemDto {
  productId?: string;
  name: string;
  description?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
  sortOrder?: number;
  unit?: string;
  hsnCode?: string;
}

export interface CreateInvoiceDto {
  contactId: string;
  currencyId: string;
  dueDate: string;
  invoiceDate?: string;
  leadId?: string;
  quoteId?: string;
  companyId?: string;
  subject?: string;
  notes?: string;
  termsAndConditions?: string;
  paymentTerms?: string;
  discountAmount?: number;
  discountPercent?: number;
  discountType?: 'AMOUNT' | 'PERCENTAGE';
  items: CreateInvoiceItemDto[];
}

// Status colors for UI
export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: '#6b7280',
  SENT: Palette.blue,
  VIEWED: Palette.purple,
  PARTIALLY_PAID: Palette.amber,
  PAID: Palette.emerald,
  OVERDUE: Palette.red,
  CANCELLED: '#6b7280',
  REFUNDED: Palette.cyan,
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  VIEWED: 'Viewed',
  PARTIALLY_PAID: 'Partial',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};
