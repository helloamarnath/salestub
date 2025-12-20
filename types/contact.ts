// Contact (Customer) type definitions for SalesTub CRM Mobile App

// Re-export Company from company.ts to avoid duplication
import { Company, CompanyType } from './company';
export type { Company, CompanyType };

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  secondaryEmail?: string;
  phone?: string;
  mobilePhone?: string;
  title?: string;
  position?: string;
  department?: string;
  status?: 'Active' | 'Inactive';
  company?: Company;
  companyId?: string;
  companyName?: string;
  // Social profiles
  linkedIn?: string;
  twitter?: string;
  facebook?: string;
  website?: string;
  // Address
  primaryAddress?: string;
  primaryCity?: string;
  primaryState?: string;
  primaryCountry?: string;
  primaryPostalCode?: string;
  // Additional info
  dateOfBirth?: string;
  anniversary?: string;
  tags?: string[];
  source?: string;
  notes?: string;
  // Owner
  owner?: {
    membershipId: string;
    userId: string;
    userName: string;
    userEmail: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactDto {
  firstName: string;
  lastName: string;
  email?: string;
  secondaryEmail?: string;
  phone?: string;
  mobilePhone?: string;
  title?: string;
  position?: string;
  department?: string;
  companyId?: string;
  companyName?: string;
  linkedIn?: string;
  twitter?: string;
  facebook?: string;
  website?: string;
  primaryAddress?: string;
  primaryCity?: string;
  primaryState?: string;
  primaryCountry?: string;
  primaryPostalCode?: string;
  dateOfBirth?: string;
  anniversary?: string;
  tags?: string[];
  source?: string;
  notes?: string;
}

export interface UpdateContactDto extends Partial<CreateContactDto> {
  status?: 'Active' | 'Inactive';
}

export interface ContactFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'Active' | 'Inactive';
  companyId?: string;
  ownerMembershipId?: string;
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

export interface ContactStats {
  total: number;
  active: number;
  inactive: number;
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
