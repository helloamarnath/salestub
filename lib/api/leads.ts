// Leads API functions for SalesTub CRM Mobile App

import { api, uploadFile, ApiResponse } from './client';
import type {
  Lead,
  LeadFilters,
  PaginatedResponse,
  CreateLeadDto,
  UpdateLeadDto,
  KanbanViewResponse,
  LeadActivity,
  CreateActivityDto,
  LeadTag,
  LeadProduct,
  LeadDocument,
  LeadSourceConfig,
  LeadSourcesResponse,
} from '@/types/lead';

const LEADS_BASE = '/api/v1/leads';

// ============ Lead Sources ============

/**
 * Get all lead sources from the backend (single source of truth)
 */
export async function getLeadSources(
  token: string | null
): Promise<ApiResponse<LeadSourcesResponse>> {
  return api.get<LeadSourcesResponse>(`${LEADS_BASE}/sources`, token);
}

// ============ CRUD Operations ============

/**
 * Get paginated list of leads with filters
 */
export async function getLeads(
  token: string | null,
  filters: LeadFilters = {}
): Promise<ApiResponse<PaginatedResponse<Lead>>> {
  const params: Record<string, string | number | undefined> = {
    page: filters.page || 1,
    limit: filters.limit || 20,
    search: filters.search,
    stageId: filters.stageId,
    source: filters.source,
    ownerMembershipId: filters.ownerMembershipId,
  };

  return api.get<PaginatedResponse<Lead>>(LEADS_BASE, token, params);
}

/**
 * Get single lead by ID
 */
export async function getLead(
  token: string | null,
  id: string
): Promise<ApiResponse<Lead>> {
  return api.get<Lead>(`${LEADS_BASE}/${id}`, token);
}

/**
 * Create a new lead
 */
export async function createLead(
  token: string | null,
  data: CreateLeadDto
): Promise<ApiResponse<Lead>> {
  return api.post<Lead>(LEADS_BASE, token, data);
}

/**
 * Update an existing lead
 */
export async function updateLead(
  token: string | null,
  id: string,
  data: UpdateLeadDto
): Promise<ApiResponse<Lead>> {
  return api.patch<Lead>(`${LEADS_BASE}/${id}`, token, data);
}

/**
 * Delete a lead
 */
export async function deleteLead(
  token: string | null,
  id: string
): Promise<ApiResponse<void>> {
  return api.delete<void>(`${LEADS_BASE}/${id}`, token);
}

// ============ Kanban View ============

/**
 * Get leads organized by pipeline stages for Kanban view
 */
export async function getKanbanView(
  token: string | null,
  options: {
    pipelineId?: string;
    limit?: number;
    search?: string;
    source?: string;
    stageId?: string;
    ownerMembershipId?: string;
  } = {}
): Promise<ApiResponse<KanbanViewResponse>> {
  const params: Record<string, string | number | undefined> = {
    pipelineId: options.pipelineId,
    limit: options.limit || 20,
    search: options.search,
    source: options.source,
    stageId: options.stageId,
    ownerMembershipId: options.ownerMembershipId,
  };

  return api.get<KanbanViewResponse>(`${LEADS_BASE}/kanban`, token, params);
}

// ============ Activities ============

/**
 * Get activity timeline for a lead
 */
export async function getLeadActivities(
  token: string | null,
  leadId: string,
  filters?: { type?: string; status?: string }
): Promise<ApiResponse<LeadActivity[]>> {
  return api.get<LeadActivity[]>(
    `${LEADS_BASE}/${leadId}/activities`,
    token,
    filters as Record<string, string | undefined>
  );
}

/**
 * Add a new activity to a lead
 */
export async function addLeadActivity(
  token: string | null,
  leadId: string,
  data: CreateActivityDto
): Promise<ApiResponse<LeadActivity>> {
  return api.post<LeadActivity>(`${LEADS_BASE}/${leadId}/activities`, token, data);
}

// ============ Tags ============

/**
 * Get all organization tags
 */
export async function getAllTags(
  token: string | null
): Promise<ApiResponse<LeadTag[]>> {
  return api.get<LeadTag[]>(`${LEADS_BASE}/tags/all`, token);
}

/**
 * Get tags for a specific lead
 */
export async function getLeadTags(
  token: string | null,
  leadId: string
): Promise<ApiResponse<LeadTag[]>> {
  return api.get<LeadTag[]>(`${LEADS_BASE}/${leadId}/tags`, token);
}

/**
 * Add tags to a lead
 */
export async function addLeadTags(
  token: string | null,
  leadId: string,
  tagIds: string[]
): Promise<ApiResponse<void>> {
  return api.post<void>(`${LEADS_BASE}/${leadId}/tags`, token, { tagIds });
}

/**
 * Remove tags from a lead
 */
export async function removeLeadTags(
  token: string | null,
  leadId: string,
  tagIds: string[]
): Promise<ApiResponse<void>> {
  return api.delete<void>(`${LEADS_BASE}/${leadId}/tags`, token);
}

/**
 * Create a new tag
 */
export async function createTag(
  token: string | null,
  data: { name: string; color: string }
): Promise<ApiResponse<LeadTag>> {
  return api.post<LeadTag>(`${LEADS_BASE}/tags`, token, data);
}

// ============ Products ============

/**
 * Get products linked to a lead
 */
export async function getLeadProducts(
  token: string | null,
  leadId: string
): Promise<ApiResponse<LeadProduct[]>> {
  return api.get<LeadProduct[]>(`${LEADS_BASE}/${leadId}/products`, token);
}

/**
 * Link a product to a lead
 */
export async function addLeadProduct(
  token: string | null,
  leadId: string,
  data: { productId: string; quantity: number; unitPrice?: number; notes?: string }
): Promise<ApiResponse<LeadProduct>> {
  return api.post<LeadProduct>(`${LEADS_BASE}/${leadId}/products`, token, data);
}

/**
 * Update a linked product
 */
export async function updateLeadProduct(
  token: string | null,
  leadId: string,
  productId: string,
  data: { quantity?: number; unitPrice?: number; notes?: string }
): Promise<ApiResponse<LeadProduct>> {
  return api.patch<LeadProduct>(
    `${LEADS_BASE}/${leadId}/products/${productId}`,
    token,
    data
  );
}

/**
 * Remove a product from a lead
 */
export async function removeLeadProduct(
  token: string | null,
  leadId: string,
  productId: string
): Promise<ApiResponse<void>> {
  return api.delete<void>(`${LEADS_BASE}/${leadId}/products/${productId}`, token);
}

// ============ Documents ============

/**
 * Get documents for a lead
 */
export async function getLeadDocuments(
  token: string | null,
  leadId: string
): Promise<ApiResponse<LeadDocument[]>> {
  return api.get<LeadDocument[]>(`${LEADS_BASE}/${leadId}/documents`, token);
}

/**
 * Upload a document to a lead
 */
export async function uploadLeadDocument(
  token: string | null,
  leadId: string,
  file: { uri: string; name: string; type: string }
): Promise<ApiResponse<LeadDocument>> {
  return uploadFile(
    `${LEADS_BASE}/${leadId}/documents`,
    token,
    file
  ) as Promise<ApiResponse<LeadDocument>>;
}

/**
 * Delete a document
 */
export async function deleteLeadDocument(
  token: string | null,
  leadId: string,
  documentId: string
): Promise<ApiResponse<void>> {
  return api.delete<void>(
    `${LEADS_BASE}/${leadId}/documents/${documentId}`,
    token
  );
}

// ============ Notes (via Activities) ============

/**
 * Get notes for a lead (filtered activities)
 */
export async function getLeadNotes(
  token: string | null,
  leadId: string
): Promise<ApiResponse<LeadActivity[]>> {
  return api.get<LeadActivity[]>(
    `${LEADS_BASE}/${leadId}/activities`,
    token,
    { type: 'NOTE' }
  );
}

/**
 * Add a note to a lead
 */
export async function addLeadNote(
  token: string | null,
  leadId: string,
  data: { title: string; description?: string }
): Promise<ApiResponse<LeadActivity>> {
  return api.post<LeadActivity>(`${LEADS_BASE}/${leadId}/activities`, token, {
    type: 'NOTE',
    title: data.title,
    description: data.description,
    status: 'COMPLETED',
  });
}

// ============ Bulk Operations ============

/**
 * Bulk delete leads
 */
export async function bulkDeleteLeads(
  token: string | null,
  ids: string[]
): Promise<ApiResponse<{ success: boolean; deleted: number }>> {
  return api.post<{ success: boolean; deleted: number }>(
    `${LEADS_BASE}/bulk/delete`,
    token,
    { ids }
  );
}

/**
 * Bulk update lead stages
 */
export async function bulkUpdateStage(
  token: string | null,
  ids: string[],
  stageId: string
): Promise<ApiResponse<{ success: boolean; updated: number }>> {
  return api.patch<{ success: boolean; updated: number }>(
    `${LEADS_BASE}/bulk/stage`,
    token,
    { ids, stageId }
  );
}

// ============ Lead Status Operations ============

/**
 * Mark lead as qualified
 */
export async function qualifyLead(
  token: string | null,
  leadId: string
): Promise<ApiResponse<Lead>> {
  return api.patch<Lead>(`${LEADS_BASE}/${leadId}/qualify`, token, {});
}

/**
 * Mark lead as lost
 */
export async function markLeadLost(
  token: string | null,
  leadId: string,
  reason?: string
): Promise<ApiResponse<Lead>> {
  return api.patch<Lead>(`${LEADS_BASE}/${leadId}/lost`, token, { reason });
}

/**
 * Convert lead to contact and optionally deal
 */
export async function convertLead(
  token: string | null,
  leadId: string,
  data: {
    accountName: string;
    accountWebsite?: string;
    accountIndustry?: string;
    createDeal?: boolean;
    dealTitle?: string;
    dealValue?: number;
  }
): Promise<ApiResponse<{ contact: unknown; deal?: unknown }>> {
  return api.post<{ contact: unknown; deal?: unknown }>(
    `${LEADS_BASE}/${leadId}/convert`,
    token,
    data
  );
}

// ============ Export ============

/**
 * Export leads to CSV
 * Returns raw CSV string (not JSON wrapped)
 */
export async function exportLeadsToCSV(
  token: string | null,
  filters?: { stageId?: string; source?: string }
): Promise<{ success: boolean; csv?: string; filename?: string; error?: string }> {
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.salestub.com';

  const url = new URL(`${API_URL}${LEADS_BASE}/export`);
  if (filters?.stageId) url.searchParams.append('stageId', filters.stageId);
  if (filters?.source) url.searchParams.append('source', filters.source);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `Export failed with status ${response.status}`,
      };
    }

    // Get filename from Content-Disposition header if available
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'leads-export.csv';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match) filename = match[1];
    }

    const csv = await response.text();
    return { success: true, csv, filename };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}
