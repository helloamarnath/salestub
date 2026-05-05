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
 * Create quote from a lead template
 */
export async function createQuoteFromLead(
  token: string | null,
  leadId: string
): Promise<ApiResponse<Quote>> {
  return api.post<Quote>(`${QUOTES_BASE}/from-lead/${leadId}`, token, {});
}

/**
 * Update a quote (draft only)
 */
export async function updateQuote(
  token: string | null,
  id: string,
  data: Partial<Omit<CreateQuoteDto, 'leadId'>>
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

// ============ Attachments ============

export interface QuoteAttachment {
  id: string;
  quoteId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  downloadUrl?: string;
  uploadedBy: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
  createdAt: string;
}

/**
 * List all attachments on a quote.
 */
export async function getQuoteAttachments(
  token: string | null,
  quoteId: string,
): Promise<ApiResponse<QuoteAttachment[]>> {
  return api.get<QuoteAttachment[]>(`${QUOTES_BASE}/${quoteId}/attachments`, token);
}

/**
 * Get a fresh (short-lived) signed download URL for an attachment.
 * The list endpoint may already include a `downloadUrl`, but it expires —
 * call this when the user actually taps download.
 */
export async function getQuoteAttachmentDownloadUrl(
  token: string | null,
  quoteId: string,
  attachmentId: string,
): Promise<ApiResponse<{ downloadUrl: string; fileName?: string }>> {
  return api.get(`${QUOTES_BASE}/${quoteId}/attachments/${attachmentId}`, token);
}

/**
 * Upload a file as a quote attachment. Backend caps at 10 MB and accepts:
 * pdf, doc(x), xls(x), png, jpg/jpeg, gif, txt, csv.
 * Multipart upload — uses fetch directly (the standard `api.post` sends JSON).
 */
export async function uploadQuoteAttachment(
  token: string | null,
  quoteId: string,
  file: { uri: string; name: string; type: string },
): Promise<
  ApiResponse<{ id: string; fileName: string; fileSize: number; message: string }>
> {
  if (!token) {
    return { success: false, error: { message: 'Not authenticated', statusCode: 401 } };
  }
  try {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || '';
    const form = new FormData();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
    const res = await fetch(`${baseUrl}${QUOTES_BASE}/${quoteId}/attachments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        success: false,
        error: {
          message: errBody.message || `Upload failed (${res.status})`,
          statusCode: res.status,
        },
      };
    }
    const data = await res.json();
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: {
        message: e instanceof Error ? e.message : 'Upload failed',
        statusCode: 0,
      },
    };
  }
}

/**
 * Delete an attachment from a quote.
 */
export async function deleteQuoteAttachment(
  token: string | null,
  quoteId: string,
  attachmentId: string,
): Promise<ApiResponse<{ message: string }>> {
  return api.delete<{ message: string }>(
    `${QUOTES_BASE}/${quoteId}/attachments/${attachmentId}`,
    token,
  );
}
