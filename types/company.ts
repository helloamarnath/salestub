// Company (Organization) type definitions for SalesTub CRM Mobile App

export type CompanyType = 'PROSPECT' | 'CUSTOMER' | 'PARTNER' | 'COMPETITOR' | 'RESELLER';

export interface CompanyOwner {
  membershipId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role?: string;
}

export interface Company {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  type: CompanyType;
  description?: string;
  // Address
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  // Business info
  annualRevenue?: number;
  numberOfEmployees?: number;
  // Counts
  contactsCount?: number;
  dealsCount?: number;
  // Custom fields
  customFieldValues?: Record<string, unknown>;
  // Owner
  owner?: CompanyOwner;
  ownerMembershipId?: string;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyDto {
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  type?: CompanyType;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  annualRevenue?: number;
  numberOfEmployees?: number;
}

export interface UpdateCompanyDto extends Partial<CreateCompanyDto> {}

export interface CompanyFilters {
  page?: number;
  limit?: number;
  search?: string;
  industry?: string;
  type?: CompanyType;
  ownerMembershipId?: string;
  revenueMin?: number;
  revenueMax?: number;
  employeesMin?: number;
  employeesMax?: number;
}

export interface PaginatedCompaniesResponse {
  data: Company[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CompanyStats {
  total: number;
  byType: {
    PROSPECT: number;
    CUSTOMER: number;
    PARTNER: number;
    COMPETITOR: number;
    RESELLER: number;
  };
}

// Company type labels for display
export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  PROSPECT: 'Prospect',
  CUSTOMER: 'Customer',
  PARTNER: 'Partner',
  COMPETITOR: 'Competitor',
  RESELLER: 'Reseller',
};

// Company type colors for badges
export const COMPANY_TYPE_COLORS: Record<CompanyType, string> = {
  PROSPECT: '#f59e0b', // Amber
  CUSTOMER: '#22c55e', // Green
  PARTNER: '#3b82f6', // Blue
  COMPETITOR: '#ef4444', // Red
  RESELLER: '#8b5cf6', // Purple
};

// Helper to get company initials
export const getCompanyInitials = (company: Company | { name: string }): string => {
  const words = company.name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
};

// Format revenue for display
export const formatRevenue = (revenue?: number, currency: string = '₹'): string => {
  if (!revenue) return '';
  if (revenue >= 10000000) {
    return `${currency}${(revenue / 10000000).toFixed(1)}Cr`;
  }
  if (revenue >= 100000) {
    return `${currency}${(revenue / 100000).toFixed(1)}L`;
  }
  if (revenue >= 1000) {
    return `${currency}${(revenue / 1000).toFixed(1)}K`;
  }
  return `${currency}${revenue.toLocaleString()}`;
};

// Format employee count
export const formatEmployees = (count?: number): string => {
  if (!count) return '';
  if (count >= 10000) {
    return `${(count / 1000).toFixed(0)}K+`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};
