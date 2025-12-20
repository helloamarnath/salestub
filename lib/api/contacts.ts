// Contacts API functions for SalesTub CRM Mobile App

import { api, ApiResponse } from './client';
import type {
  Contact,
  ContactFilters,
  PaginatedContactsResponse,
  CreateContactDto,
  UpdateContactDto,
  ContactStats,
} from '@/types/contact';

const CONTACTS_BASE = '/api/v1/contacts';

/**
 * Get paginated list of contacts with filters
 */
export async function getContacts(
  token: string | null,
  filters: ContactFilters = {}
): Promise<ApiResponse<PaginatedContactsResponse>> {
  const params: Record<string, string | number | undefined> = {
    page: filters.page || 1,
    limit: filters.limit || 20,
    search: filters.search,
    status: filters.status,
    companyId: filters.companyId,
    ownerMembershipId: filters.ownerMembershipId,
  };

  return api.get<PaginatedContactsResponse>(CONTACTS_BASE, token, params);
}

/**
 * Search contacts (for contact picker)
 */
export async function searchContacts(
  token: string | null,
  query: string,
  limit: number = 10
): Promise<ApiResponse<Contact[]>> {
  const response = await api.get<PaginatedContactsResponse>(
    CONTACTS_BASE,
    token,
    { search: query, limit }
  );

  if (response.success && response.data) {
    return { success: true, data: response.data.data };
  }

  return { success: false, error: response.error };
}

/**
 * Get single contact by ID
 */
export async function getContact(
  token: string | null,
  id: string
): Promise<ApiResponse<Contact>> {
  return api.get<Contact>(`${CONTACTS_BASE}/${id}`, token);
}

/**
 * Create a new contact
 */
export async function createContact(
  token: string | null,
  data: CreateContactDto
): Promise<ApiResponse<Contact>> {
  return api.post<Contact>(CONTACTS_BASE, token, data);
}

/**
 * Update an existing contact
 */
export async function updateContact(
  token: string | null,
  id: string,
  data: UpdateContactDto
): Promise<ApiResponse<Contact>> {
  return api.patch<Contact>(`${CONTACTS_BASE}/${id}`, token, data);
}

/**
 * Delete a contact
 */
export async function deleteContact(
  token: string | null,
  id: string
): Promise<ApiResponse<void>> {
  return api.delete<void>(`${CONTACTS_BASE}/${id}`, token);
}

/**
 * Get contact statistics
 */
export async function getContactStats(
  token: string | null
): Promise<ApiResponse<ContactStats>> {
  return api.get<ContactStats>(`${CONTACTS_BASE}/stats/counts`, token);
}

/**
 * Bulk delete contacts
 */
export async function bulkDeleteContacts(
  token: string | null,
  ids: string[]
): Promise<ApiResponse<{ success: boolean; deleted: number }>> {
  return api.post<{ success: boolean; deleted: number }>(
    `${CONTACTS_BASE}/bulk-delete`,
    token,
    { ids }
  );
}

/**
 * Get contact with full relations (leads, deals, activities)
 */
export async function getContactFull(
  token: string | null,
  id: string
): Promise<ApiResponse<Contact & {
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
    createdAt: string;
  }>;
  deals?: Array<{
    id: string;
    title: string;
    value: number;
    stage: string;
    status: string;
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
  return api.get(`${CONTACTS_BASE}/${id}/full`, token);
}
