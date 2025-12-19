// Contacts API functions for SalesTub CRM Mobile App

import { api, ApiResponse } from './client';
import type {
  Contact,
  ContactFilters,
  PaginatedContactsResponse,
  CreateContactDto,
} from '@/types/contact';

const CONTACTS_BASE = '/api/v1/contacts';

/**
 * Get paginated list of contacts with search
 */
export async function getContacts(
  token: string | null,
  filters: ContactFilters = {}
): Promise<ApiResponse<PaginatedContactsResponse>> {
  const params: Record<string, string | number | undefined> = {
    page: filters.page || 1,
    limit: filters.limit || 20,
    search: filters.search,
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
  data: Partial<CreateContactDto>
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
