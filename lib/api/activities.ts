// Activities API functions for SalesTub CRM Mobile App

import { api, ApiResponse } from './client';
import type {
  Activity,
  ActivityFilters,
  PaginatedActivitiesResponse,
  CreateActivityDto,
  UpdateActivityDto,
  ActivityStats,
} from '@/types/activity';

const ACTIVITIES_BASE = '/api/v1/activities';

/**
 * Get paginated list of activities with filters
 */
export async function getActivities(
  token: string | null,
  filters: ActivityFilters = {}
): Promise<ApiResponse<PaginatedActivitiesResponse>> {
  const params: Record<string, string | number | undefined> = {
    page: filters.page || 1,
    limit: filters.limit || 20,
    search: filters.search,
    type: filters.type,
    status: filters.status,
    assignedTo: filters.assignedTo,
  };

  return api.get<PaginatedActivitiesResponse>(ACTIVITIES_BASE, token, params);
}

/**
 * Get activities for a specific entity (contact, deal, company)
 */
export async function getEntityActivities(
  token: string | null,
  entityType: 'contact' | 'deal' | 'company',
  entityId: string
): Promise<ApiResponse<Activity[]>> {
  return api.get<Activity[]>(
    `${ACTIVITIES_BASE}/entity/${entityType}/${entityId}`,
    token
  );
}

/**
 * Get activities for a contact
 */
export async function getContactActivities(
  token: string | null,
  contactId: string
): Promise<ApiResponse<Activity[]>> {
  return getEntityActivities(token, 'contact', contactId);
}

/**
 * Get activities for a deal
 */
export async function getDealActivities(
  token: string | null,
  dealId: string
): Promise<ApiResponse<Activity[]>> {
  return getEntityActivities(token, 'deal', dealId);
}

/**
 * Get activities for a company
 */
export async function getCompanyActivities(
  token: string | null,
  companyId: string
): Promise<ApiResponse<Activity[]>> {
  return getEntityActivities(token, 'company', companyId);
}

/**
 * Get activities for a lead
 * Note: Leads have their own activities endpoint, not the generic entity endpoint
 */
export async function getLeadActivities(
  token: string | null,
  leadId: string
): Promise<ApiResponse<Activity[]>> {
  return api.get<Activity[]>(`/api/v1/leads/${leadId}/activities`, token);
}

/**
 * Get calendar activities for a date range
 */
export async function getCalendarActivities(
  token: string | null,
  startDate: Date,
  endDate: Date,
  options?: {
    type?: string;
    status?: string;
    ownership?: 'my' | 'all';
  }
): Promise<ApiResponse<Activity[]>> {
  return api.get<Activity[]>(
    `${ACTIVITIES_BASE}/calendar`,
    token,
    {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      type: options?.type,
      status: options?.status,
      ownership: options?.ownership,
    }
  );
}

/**
 * Get single activity by ID
 */
export async function getActivity(
  token: string | null,
  id: string
): Promise<ApiResponse<Activity>> {
  return api.get<Activity>(`${ACTIVITIES_BASE}/${id}`, token);
}

/**
 * Create a new activity
 */
export async function createActivity(
  token: string | null,
  data: CreateActivityDto
): Promise<ApiResponse<Activity>> {
  return api.post<Activity>(ACTIVITIES_BASE, token, data);
}

/**
 * Update an existing activity
 */
export async function updateActivity(
  token: string | null,
  id: string,
  data: UpdateActivityDto
): Promise<ApiResponse<Activity>> {
  return api.patch<Activity>(`${ACTIVITIES_BASE}/${id}`, token, data);
}

/**
 * Delete an activity
 */
export async function deleteActivity(
  token: string | null,
  id: string
): Promise<ApiResponse<void>> {
  return api.delete<void>(`${ACTIVITIES_BASE}/${id}`, token);
}

/**
 * Mark activity as completed
 */
export async function completeActivity(
  token: string | null,
  id: string
): Promise<ApiResponse<Activity>> {
  return api.patch<Activity>(`${ACTIVITIES_BASE}/${id}/complete`, token, {});
}

/**
 * Cancel an activity
 */
export async function cancelActivity(
  token: string | null,
  id: string
): Promise<ApiResponse<Activity>> {
  return api.patch<Activity>(`${ACTIVITIES_BASE}/${id}/cancel`, token, {});
}

/**
 * Get activity statistics
 */
export async function getActivityStats(
  token: string | null
): Promise<ApiResponse<ActivityStats>> {
  return api.get<ActivityStats>(`${ACTIVITIES_BASE}/stats/overview`, token);
}

/**
 * Get user's dashboard activities
 */
export async function getMyActivities(
  token: string | null
): Promise<ApiResponse<Activity[]>> {
  return api.get<Activity[]>(`${ACTIVITIES_BASE}/dashboard/my-activities`, token);
}

// Export filter interface
export interface ActivityExportFilters {
  type?: string;
  status?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}

/**
 * Export activities to CSV
 */
export async function exportActivitiesToCSV(
  token: string | null,
  filters?: ActivityExportFilters
): Promise<{ success: boolean; csv?: string; filename?: string; error?: string }> {
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.salestub.com';

  const url = new URL(`${API_URL}${ACTIVITIES_BASE}/export`);
  if (filters?.type) url.searchParams.append('type', filters.type);
  if (filters?.status) url.searchParams.append('status', filters.status);
  if (filters?.dueDateFrom) url.searchParams.append('dueDateFrom', filters.dueDateFrom);
  if (filters?.dueDateTo) url.searchParams.append('dueDateTo', filters.dueDateTo);

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
    let filename = 'activities-export.csv';
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
