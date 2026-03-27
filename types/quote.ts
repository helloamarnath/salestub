// Quote type definitions for SalesTub CRM Mobile App

export type QuoteStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

export interface QuoteItem {
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

export interface Quote {
  id: string;
  quoteNumber: string;
  accessToken: string;
  status: QuoteStatus;
  validUntil: string;
  quoteDate?: string;
  sentAt?: string;
  viewedAt?: string;
  respondedAt?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  quoteLevelDiscount?: number | string;
  customerReference?: string;
  revisionNumber?: number;
  parentQuoteId?: string;

  subtotal: number | string;
  taxAmount: number | string;
  discountAmount: number | string;
  total: number | string;
  cgstTotal?: number | string;
  sgstTotal?: number | string;
  igstTotal?: number | string;

  dealId: string;
  deal?: { id: string; title: string; status: string; lead?: { id: string; title: string; displayId?: string } };
  contactId: string;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    companyName?: string;
  };
  currencyId: string;
  currency?: { id: string; code: string; symbol: string; name: string };
  owner?: { id: string; user: { firstName?: string; lastName?: string; email?: string } };

  subject?: string;
  notes?: string;
  termsAndConditions?: string;
  customerNotes?: string;
  rejectionReason?: string;

  viewCount: number;
  items: QuoteItem[];
  _count?: { items: number };

  createdAt: string;
  updatedAt: string;
}

export interface QuoteFilters {
  page?: number;
  limit?: number;
  status?: QuoteStatus;
  dealId?: string;
  contactId?: string;
  leadId?: string;
}

export interface PaginatedQuotesResponse {
  data: Quote[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateQuoteItemDto {
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

export interface CreateQuoteDto {
  dealId: string;
  contactId?: string;
  currencyId: string;
  validUntil: string;
  quoteDate?: string;
  subject?: string;
  notes?: string;
  termsAndConditions?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  quoteLevelDiscount?: number;
  customerReference?: string;
  items: CreateQuoteItemDto[];
}

// Status colors for UI
export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  DRAFT: '#6b7280',
  SENT: '#3b82f6',
  VIEWED: '#8b5cf6',
  APPROVED: '#22c55e',
  REJECTED: '#ef4444',
  EXPIRED: '#f59e0b',
  CANCELLED: '#6b7280',
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  VIEWED: 'Viewed',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};
