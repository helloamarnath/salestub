// Invoices API functions for SalesTub CRM Mobile App

import { api, ApiResponse } from './client';
import type {
  Invoice,
  InvoiceFilters,
  PaginatedInvoicesResponse,
  CreateInvoiceDto,
} from '@/types/invoice';

const INVOICES_BASE = '/api/v1/invoices';

/**
 * Get paginated list of invoices with filters
 */
export async function getInvoices(
  token: string | null,
  filters: InvoiceFilters = {}
): Promise<ApiResponse<PaginatedInvoicesResponse>> {
  const params: Record<string, string | number | undefined> = {
    page: filters.page || 1,
    limit: filters.limit || 50,
    status: filters.status,
    contactId: filters.contactId,
    leadId: filters.leadId,
    search: filters.search,
    isRecurring: filters.isRecurring !== undefined ? String(filters.isRecurring) : undefined,
  };

  return api.get<PaginatedInvoicesResponse>(INVOICES_BASE, token, params);
}

/**
 * Get single invoice by ID
 */
export async function getInvoice(
  token: string | null,
  id: string
): Promise<ApiResponse<Invoice>> {
  return api.get<Invoice>(`${INVOICES_BASE}/${id}`, token);
}

/**
 * Create a new invoice
 */
export async function createInvoice(
  token: string | null,
  data: CreateInvoiceDto
): Promise<ApiResponse<Invoice>> {
  return api.post<Invoice>(INVOICES_BASE, token, data);
}

/**
 * Create invoice from an approved quote
 */
export async function createInvoiceFromQuote(
  token: string | null,
  quoteId: string
): Promise<ApiResponse<Invoice>> {
  return api.post<Invoice>(`${INVOICES_BASE}/from-quote/${quoteId}`, token, {});
}

/**
 * Create invoice from a lead
 */
export async function createInvoiceFromLead(
  token: string | null,
  leadId: string
): Promise<ApiResponse<Invoice>> {
  return api.post<Invoice>(`${INVOICES_BASE}/from-lead/${leadId}`, token, {});
}

/**
 * Update an invoice (draft only)
 */
export async function updateInvoice(
  token: string | null,
  id: string,
  data: Partial<Omit<CreateInvoiceDto, 'contactId'>>
): Promise<ApiResponse<Invoice>> {
  return api.patch<Invoice>(`${INVOICES_BASE}/${id}`, token, data);
}

/**
 * Delete an invoice (draft only)
 */
export async function deleteInvoice(
  token: string | null,
  id: string
): Promise<ApiResponse<void>> {
  return api.delete<void>(`${INVOICES_BASE}/${id}`, token);
}

/**
 * Send invoice to customer
 */
export async function sendInvoice(
  token: string | null,
  id: string,
  data?: { to?: string; subject?: string; message?: string }
): Promise<ApiResponse<{ message: string; sentTo: string }>> {
  return api.post<{ message: string; sentTo: string }>(`${INVOICES_BASE}/${id}/send`, token, data || {});
}

/**
 * Mark invoice as sent (without emailing)
 */
export async function markInvoiceSent(
  token: string | null,
  id: string
): Promise<ApiResponse<{ message: string; invoice: Invoice }>> {
  return api.post<{ message: string; invoice: Invoice }>(`${INVOICES_BASE}/${id}/mark-sent`, token, {});
}

/**
 * Cancel an invoice
 */
export async function cancelInvoice(
  token: string | null,
  id: string
): Promise<ApiResponse<Invoice>> {
  return api.post<Invoice>(`${INVOICES_BASE}/${id}/cancel`, token, {});
}

/**
 * Mark invoice as paid
 */
export async function markInvoicePaid(
  token: string | null,
  id: string,
  data: { amount: number; paymentMethod?: string; reference?: string; notes?: string }
): Promise<ApiResponse<Invoice>> {
  return api.post<Invoice>(`${INVOICES_BASE}/${id}/mark-paid`, token, data);
}

/**
 * Send payment reminder
 */
export async function sendInvoiceReminder(
  token: string | null,
  id: string
): Promise<ApiResponse<{ message: string; sentTo: string }>> {
  return api.post<{ message: string; sentTo: string }>(`${INVOICES_BASE}/${id}/remind`, token, {});
}

/**
 * Duplicate an invoice as a new draft
 */
export async function duplicateInvoice(
  token: string | null,
  id: string
): Promise<ApiResponse<Invoice>> {
  return api.post<Invoice>(`${INVOICES_BASE}/${id}/duplicate`, token, {});
}
