// Contact type definitions for SalesTub CRM Mobile App

export interface Company {
  id: string;
  name: string;
  website?: string;
  industry?: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  company?: Company;
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactDto {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  companyId?: string;
}

export interface ContactFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedContactsResponse {
  data: Contact[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Helper to get full name
export const getContactFullName = (contact: Contact | { firstName: string; lastName: string }): string => {
  return `${contact.firstName} ${contact.lastName}`.trim();
};

// Helper to get initials
export const getContactInitials = (contact: Contact | { firstName: string; lastName?: string }): string => {
  const first = contact.firstName?.charAt(0) || '';
  const last = contact.lastName?.charAt(0) || '';
  return `${first}${last}`.toUpperCase();
};

// Avatar colors based on name
export const getAvatarColor = (name: string): string => {
  const colors = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'];
  const charCode = name.charCodeAt(0) || 0;
  return colors[charCode % colors.length];
};
