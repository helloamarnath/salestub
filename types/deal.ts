// Deal type definitions for SalesTub CRM Mobile App

import { Company } from './company';
import { Contact } from './contact';

export type DealStage =
  | 'PROSPECTING'
  | 'QUALIFICATION'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'CLOSED_WON'
  | 'CLOSED_LOST';

export type DealStatus = 'OPEN' | 'WON' | 'LOST';

export interface DealOwner {
  membershipId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role?: string;
}

export interface Deal {
  id: string;
  title: string;
  description?: string;
  value: number;
  stage: DealStage;
  status: DealStatus;
  expectedCloseDate?: string;
  closedDate?: string;
  // Currency
  currencyId?: string;
  currency?: {
    id: string;
    code: string;
    symbol: string;
    name: string;
  };
  // Pipeline
  pipelineId?: string;
  pipeline?: {
    id: string;
    name: string;
  };
  stageId?: string;
  stageRel?: {
    id: string;
    name: string;
    color?: string;
  };
  // Related entities
  companyId?: string;
  company?: Company;
  contactId: string;
  contact?: Contact;
  // Owner
  ownerMembershipId: string;
  owner?: DealOwner;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface CreateDealDto {
  title: string;
  description?: string;
  value: number;
  stage?: DealStage;
  status?: DealStatus;
  expectedCloseDate?: string;
  currencyId?: string;
  pipelineId?: string;
  stageId?: string;
  companyId?: string;
  contactId: string;
}

export interface UpdateDealDto extends Partial<CreateDealDto> {}

export interface DealFilters {
  page?: number;
  limit?: number;
  search?: string;
  stage?: DealStage;
  status?: DealStatus;
  contactId?: string;
  companyId?: string;
  ownerMembershipId?: string;
  valueMin?: number;
  valueMax?: number;
  expectedCloseDateFrom?: string;
  expectedCloseDateTo?: string;
  createdFrom?: string;
  createdTo?: string;
}

export interface PaginatedDealsResponse {
  data: Deal[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DealStats {
  total: number;
  totalValue: number;
  byStage: Record<DealStage, { count: number; value: number }>;
  byStatus: Record<DealStatus, { count: number; value: number }>;
}

// Deal stage labels for display
export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  PROSPECTING: 'Prospecting',
  QUALIFICATION: 'Qualification',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost',
};

// Deal stage colors
export const DEAL_STAGE_COLORS: Record<DealStage, string> = {
  PROSPECTING: '#3b82f6', // Blue
  QUALIFICATION: '#f59e0b', // Amber
  PROPOSAL: '#8b5cf6', // Purple
  NEGOTIATION: '#06b6d4', // Cyan
  CLOSED_WON: '#22c55e', // Green
  CLOSED_LOST: '#ef4444', // Red
};

// Deal status labels
export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  OPEN: 'Open',
  WON: 'Won',
  LOST: 'Lost',
};

// Deal status colors
export const DEAL_STATUS_COLORS: Record<DealStatus, string> = {
  OPEN: '#3b82f6', // Blue
  WON: '#22c55e', // Green
  LOST: '#ef4444', // Red
};

// Format deal value for display
export const formatDealValue = (value?: number, currency: string = '₹'): string => {
  if (!value && value !== 0) return '';
  if (value >= 10000000) {
    return `${currency}${(value / 10000000).toFixed(1)}Cr`;
  }
  if (value >= 100000) {
    return `${currency}${(value / 100000).toFixed(1)}L`;
  }
  if (value >= 1000) {
    return `${currency}${(value / 1000).toFixed(1)}K`;
  }
  return `${currency}${value.toLocaleString()}`;
};
