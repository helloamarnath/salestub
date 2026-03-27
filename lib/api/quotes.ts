// Quotes API functions for SalesTub CRM Mobile App

import { api, ApiResponse } from './client';
import type {
  Quote,
  QuoteFilters,
  PaginatedQuotesResponse,
  CreateQuoteDto,
} from '@/types/quote';

const QUOTES_BASE = '/api/v1/quotes';

/**
 * Get paginated list of quotes with filters
 */
export async function getQuotes(
  token: string | null,
  filters: QuoteFilters = {}
): Promise<ApiResponse<PaginatedQuotesResponse>> {
  const params: Record<string, string | number | undefined> = {
    page: filters.page || 1,
    limit: filters.limit || 50,
    status: filters.status,
    dealId: filters.dealId,
    contactId: filters.contactId,
    leadId: filters.leadId,
  };

  return api.get<PaginatedQuotesResponse>(QUOTES_BASE, token, params);
}

/**
 * Get single quote by ID
 */
export async function getQuote(
  token: string | null,
  id: string
): Promise<ApiResponse<Quote>> {
  return api.get<Quote>(`${QUOTES_BASE}/${id}`, token);
}

/**
 * Create a new quote
 */
export async function createQuote(
  token: string | null,
  data: CreateQuoteDto
): Promise<ApiResponse<Quote>> {
  return api.post<Quote>(QUOTES_BASE, token, data);
}

/**
 * Create quote from a deal template
 */
export async function createQuoteFromDeal(
  token: string | null,
  dealId: string
): Promise<ApiResponse<Quote>> {
  return api.post<Quote>(`${QUOTES_BASE}/from-deal/${dealId}`, token, {});
}

/**
 * Update a quote (draft only)
 */
export async function updateQuote(
  token: string | null,
  id: string,
  data: Partial<Omit<CreateQuoteDto, 'dealId'>>
): Promise<ApiResponse<Quote>> {
  return api.patch<Quote>(`${QUOTES_BASE}/${id}`, token, data);
}

/**
 * Delete a quote (draft only)
 */
export async function deleteQuote(
  token: string | null,
  id: string
): Promise<ApiResponse<void>> {
  return api.delete<void>(`${QUOTES_BASE}/${id}`, token);
}

/**
 * Send quote to customer
 */
export async function sendQuote(
  token: string | null,
  id: string,
  data?: { to?: string; subject?: string; message?: string }
): Promise<ApiResponse<{ message: string; sentTo: string }>> {
  return api.post<{ message: string; sentTo: string }>(`${QUOTES_BASE}/${id}/send`, token, data || {});
}

/**
 * Cancel a quote
 */
export async function cancelQuote(
  token: string | null,
  id: string
): Promise<ApiResponse<Quote>> {
  return api.post<Quote>(`${QUOTES_BASE}/${id}/cancel`, token, {});
}
