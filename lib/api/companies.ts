// Companies (Organizations) API functions for SalesTub CRM Mobile App

import { api, ApiResponse } from './client';
import type {
  Company,
  CompanyFilters,
  PaginatedCompaniesResponse,
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyStats,
  CompanyStatsOverview,
} from '@/types/company';
import type { Contact, PaginatedContactsResponse } from '@/types/contact';

const COMPANIES_BASE = '/api/v1/companies';

// ============ CRUD Operations ============

/**
 * Get paginated list of companies with filters
 */
export async function getCompanies(
  token: string | null,
  filters: CompanyFilters = {}
): Promise<ApiResponse<PaginatedCompaniesResponse>> {
  const params: Record<string, string | number | undefined> = {
    page: filters.page || 1,
    limit: filters.limit || 20,
    search: filters.search,
    industry: filters.industry,
    type: filters.type,
    ownerMembershipId: filters.ownerMembershipId,
    revenueMin: filters.revenueMin,
    revenueMax: filters.revenueMax,
    employeesMin: filters.employeesMin,
    employeesMax: filters.employeesMax,
  };

  return api.get<PaginatedCompaniesResponse>(COMPANIES_BASE, token, params);
}

/**
 * Search companies (for pickers)
 */
export async function searchCompanies(
  token: string | null,
  query: string,
  limit: number = 10
): Promise<ApiResponse<Company[]>> {
  const response = await api.get<PaginatedCompaniesResponse>(
    COMPANIES_BASE,
    token,
    { search: query, limit }
  );

  if (response.success && response.data) {
    return { success: true, data: response.data.data };
  }

  return { success: false, error: response.error };
}

/**
 * Get single company by ID
 */
export async function getCompany(
  token: string | null,
  id: string
): Promise<ApiResponse<Company>> {
  return api.get<Company>(`${COMPANIES_BASE}/${id}`, token);
}

/**
 * Create a new company
 */
export async function createCompany(
  token: string | null,
  data: CreateCompanyDto
): Promise<ApiResponse<Company>> {
  return api.post<Company>(COMPANIES_BASE, token, data);
}

/**
 * Update an existing company
 */
export async function updateCompany(
  token: string | null,
  id: string,
  data: UpdateCompanyDto
): Promise<ApiResponse<Company>> {
  return api.patch<Company>(`${COMPANIES_BASE}/${id}`, token, data);
}

/**
 * Delete a company
 */
export async function deleteCompany(
  token: string | null,
  id: string
): Promise<ApiResponse<void>> {
  return api.delete<void>(`${COMPANIES_BASE}/${id}`, token);
}

// ============ Related Data ============

/**
 * Get contacts for a company
 */
export async function getCompanyContacts(
  token: string | null,
  companyId: string,
  filters: { page?: number; limit?: number } = {}
): Promise<ApiResponse<PaginatedContactsResponse>> {
  const params: Record<string, string | number | undefined> = {
    page: filters.page || 1,
    limit: filters.limit || 20,
  };

  return api.get<PaginatedContactsResponse>(
    `${COMPANIES_BASE}/${companyId}/contacts`,
    token,
    params
  );
}

// ============ Statistics ============

/**
 * Get company counts by type (used for filter tabs)
 */
export async function getCompanyStats(
  token: string | null
): Promise<ApiResponse<CompanyStats>> {
  return api.get<CompanyStats>(`${COMPANIES_BASE}/stats/counts`, token);
}

/**
 * Get company analytics overview — totals + per-industry / per-type / per-owner breakdowns with revenue
 */
export async function getCompanyStatsOverview(
  token: string | null
): Promise<ApiResponse<CompanyStatsOverview>> {
  return api.get<CompanyStatsOverview>(`${COMPANIES_BASE}/stats/overview`, token);
}

// ============ Full Company Data ============

/**
 * Get company with full relations (contacts, leads, activities)
 */
export async function getCompanyFull(
  token: string | null,
  id: string
): Promise<ApiResponse<Company & {
  contacts?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    title?: string;
  }>;
  leads?: Array<{
    id: string;
    displayId: string;
    title: string;
    value?: number;
    score?: number;
    source?: string;
    stage?: {
      id: string;
      name: string;
      type: string;
      color?: string;
    };
    expectedCloseDate?: string;
    createdAt: string;
  }>;
  activities?: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    dueDate?: string;
    completedDate?: string;
    createdAt: string;
  }>;
}>> {
  return api.get(`${COMPANIES_BASE}/${id}/full`, token);
}

// ============ Bulk Operations ============

/**
 * Bulk delete companies
 */
export async function bulkDeleteCompanies(
  token: string | null,
  ids: string[]
): Promise<ApiResponse<{ success: boolean; deleted: number }>> {
  return api.post<{ success: boolean; deleted: number }>(
    `${COMPANIES_BASE}/bulk-delete`,
    token,
    { ids }
  );
}

// ============ CSV Export ============

export interface CompanyExportFilters {
  search?: string;
  type?: string;
  industry?: string;
}

/**
 * Export companies to CSV. Backend serves text/csv with a Content-Disposition
 * filename. We return the raw CSV string so the caller can write it to a file
 * and hand it off to Sharing.shareAsync (matching the existing pattern in
 * other modules' export functions).
 */
export async function exportCompaniesToCSV(
  token: string | null,
  filters: CompanyExportFilters = {},
): Promise<{ success: boolean; csv?: string; filename?: string; error?: string }> {
  try {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || '';
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.type) params.set('type', filters.type);
    if (filters.industry) params.set('industry', filters.industry);
    const qs = params.toString();
    const url = `${baseUrl}${COMPANIES_BASE}/export${qs ? `?${qs}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errBody.message || `Export failed with status ${response.status}`,
      };
    }
    const cd = response.headers.get('Content-Disposition');
    let filename = 'companies-export.csv';
    if (cd) {
      const m = cd.match(/filename="?([^"]+)"?/);
      if (m) filename = m[1];
    }
    const csv = await response.text();
    return { success: true, csv, filename };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Export failed',
    };
  }
}
