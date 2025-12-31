// Organization API functions for SalesTub CRM Mobile App

import { api, ApiResponse } from './client';

const ORGANIZATION_BASE = '/api/v1/public/organization';

export interface OrgMember {
  id: string;
  membershipId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  role?: {
    id: string;
    name: string;
    key: string;
  };
  profile?: {
    id: string;
    name: string;
    key: string;
  };
  createdAt: string;
  lastLogin?: string;
}

export interface PaginatedMembersResponse {
  data: OrgMember[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UserRoleInfo {
  role: {
    id: string;
    name: string;
    key: string;
    canView: string;
    canEdit: string;
    parentRole?: {
      id: string;
      name: string;
    };
  };
  profile: {
    id: string;
    name: string;
    key: string;
  };
  permissions: string[];
}

/**
 * Get organization members for filter dropdown
 */
export async function getOrganizationMembers(
  token: string | null,
  options: { page?: number; limit?: number; search?: string; status?: string } = {}
): Promise<ApiResponse<PaginatedMembersResponse>> {
  const params: Record<string, string | number | undefined> = {
    page: options.page || 1,
    limit: options.limit || 50,
    search: options.search,
    status: options.status || 'ACTIVE',
  };

  return api.get<PaginatedMembersResponse>(`${ORGANIZATION_BASE}/users`, token, params);
}

/**
 * Get current user's role information
 */
export async function getRoleInfo(
  token: string | null
): Promise<ApiResponse<UserRoleInfo>> {
  // Use /public/user/role-info endpoint for current user's role
  return api.get<UserRoleInfo>('/api/v1/public/user/role-info', token);
}

/**
 * Check if user is organization super admin
 */
export function isSuperAdmin(roleKey?: string): boolean {
  return roleKey === 'ORG_SUPER_ADMIN';
}

/**
 * Check if user is admin (ORG_SUPER_ADMIN or ORG_ADMIN)
 */
export function isAdmin(roleKey?: string): boolean {
  return roleKey === 'ORG_SUPER_ADMIN' || roleKey === 'ORG_ADMIN';
}

/**
 * Get member display name
 */
export function getMemberDisplayName(member: OrgMember): string {
  if (member.firstName && member.lastName) {
    return `${member.firstName} ${member.lastName}`;
  }
  if (member.firstName) {
    return member.firstName;
  }
  return member.email;
}

// Currency types
export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

// Organization settings types
export interface OrganizationSettings {
  id: string;
  name: string;
  slug: string;
  industry?: string;
  size?: string;
  website?: string;
  phone?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  country: string;
  currencyId?: string;
  currency?: Currency;
}

/**
 * Get organization settings
 */
export async function getOrganizationSettings(
  token: string | null
): Promise<ApiResponse<OrganizationSettings>> {
  return api.get<OrganizationSettings>(`${ORGANIZATION_BASE}/settings`, token);
}

/**
 * Update organization settings
 */
export async function updateOrganizationSettings(
  token: string | null,
  data: { currencyId?: string; name?: string; industry?: string }
): Promise<ApiResponse<OrganizationSettings>> {
  return api.put<OrganizationSettings>(`${ORGANIZATION_BASE}/settings`, token, data);
}

/**
 * Get available currencies
 */
export async function getCurrencies(
  token: string | null
): Promise<ApiResponse<Currency[]>> {
  return api.get<Currency[]>('/api/v1/currencies', token);
}
