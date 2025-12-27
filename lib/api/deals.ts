// Deals API functions for SalesTub CRM Mobile App

import { api, ApiResponse } from './client';
import type {
  Deal,
  DealFilters,
  PaginatedDealsResponse,
  CreateDealDto,
  UpdateDealDto,
  DealStats,
} from '@/types/deal';

const DEALS_BASE = '/api/v1/deals';

/**
 * Get paginated list of deals with filters
 */
export async function getDeals(
  token: string | null,
  filters: DealFilters = {}
): Promise<ApiResponse<PaginatedDealsResponse>> {
  const params: Record<string, string | number | undefined> = {
    page: filters.page || 1,
    limit: filters.limit || 20,
    search: filters.search,
    stage: filters.stage,
    status: filters.status,
    contactId: filters.contactId,
    companyId: filters.companyId,
    ownerMembershipId: filters.ownerMembershipId,
    valueMin: filters.valueMin?.toString(),
    valueMax: filters.valueMax?.toString(),
    expectedCloseDateFrom: filters.expectedCloseDateFrom,
    expectedCloseDateTo: filters.expectedCloseDateTo,
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
  };

  return api.get<PaginatedDealsResponse>(DEALS_BASE, token, params);
}

/**
 * Get deals by contact ID
 */
export async function getDealsByContact(
  token: string | null,
  contactId: string,
  limit: number = 20
): Promise<ApiResponse<Deal[]>> {
  const response = await api.get<PaginatedDealsResponse>(
    DEALS_BASE,
    token,
    { contactId, limit }
  );

  if (response.success && response.data) {
    return { success: true, data: response.data.data };
  }

  return { success: false, error: response.error };
}

/**
 * Get deals by company ID
 */
export async function getDealsByCompany(
  token: string | null,
  companyId: string,
  limit: number = 20
): Promise<ApiResponse<Deal[]>> {
  const response = await api.get<PaginatedDealsResponse>(
    DEALS_BASE,
    token,
    { companyId, limit }
  );

  if (response.success && response.data) {
    return { success: true, data: response.data.data };
  }

  return { success: false, error: response.error };
}

/**
 * Get single deal by ID
 */
export async function getDeal(
  token: string | null,
  id: string
): Promise<ApiResponse<Deal>> {
  return api.get<Deal>(`${DEALS_BASE}/${id}`, token);
}

/**
 * Create a new deal
 */
export async function createDeal(
  token: string | null,
  data: CreateDealDto
): Promise<ApiResponse<Deal>> {
  return api.post<Deal>(DEALS_BASE, token, data);
}

/**
 * Update an existing deal
 */
export async function updateDeal(
  token: string | null,
  id: string,
  data: UpdateDealDto
): Promise<ApiResponse<Deal>> {
  return api.patch<Deal>(`${DEALS_BASE}/${id}`, token, data);
}

/**
 * Delete a deal
 */
export async function deleteDeal(
  token: string | null,
  id: string
): Promise<ApiResponse<void>> {
  return api.delete<void>(`${DEALS_BASE}/${id}`, token);
}

/**
 * Advance deal to next stage
 */
export async function advanceDealStage(
  token: string | null,
  id: string
): Promise<ApiResponse<Deal>> {
  return api.patch<Deal>(`${DEALS_BASE}/${id}/advance-stage`, token, {});
}

/**
 * Close deal as won
 */
export async function closeDealWon(
  token: string | null,
  id: string
): Promise<ApiResponse<Deal>> {
  return api.patch<Deal>(`${DEALS_BASE}/${id}/close-won`, token, {});
}

/**
 * Close deal as lost
 */
export async function closeDealLost(
  token: string | null,
  id: string
): Promise<ApiResponse<Deal>> {
  return api.patch<Deal>(`${DEALS_BASE}/${id}/close-lost`, token, {});
}

/**
 * Get deal counts for quick filters
 */
export async function getDealCounts(
  token: string | null
): Promise<ApiResponse<DealStats>> {
  return api.get<DealStats>(`${DEALS_BASE}/stats/counts`, token);
}

/**
 * Get deal pipeline statistics
 */
export async function getDealPipelineStats(
  token: string | null
): Promise<ApiResponse<DealStats>> {
  return api.get<DealStats>(`${DEALS_BASE}/stats/pipeline`, token);
}

/**
 * Bulk delete deals
 */
export async function bulkDeleteDeals(
  token: string | null,
  ids: string[]
): Promise<ApiResponse<{ deleted: number }>> {
  return api.post<{ deleted: number }>(
    `${DEALS_BASE}/bulk-delete`,
    token,
    { ids }
  );
}

/**
 * Search deals (for pickers)
 */
export async function searchDeals(
  token: string | null,
  query: string,
  limit: number = 10
): Promise<ApiResponse<Deal[]>> {
  const response = await api.get<PaginatedDealsResponse>(
    DEALS_BASE,
    token,
    { search: query, limit }
  );

  if (response.success && response.data) {
    return { success: true, data: response.data.data };
  }

  return { success: false, error: response.error };
}
