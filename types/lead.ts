// Lead type definitions for SalesTub CRM Mobile App

export interface LeadContact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  company?: {
    id: string;
    name: string;
  };
}

export interface LeadStage {
  id: string;
  name: string;
  type: 'OPEN' | 'CLOSED_WON' | 'CLOSED_LOST';
  displayOrder: number;
  color?: string;
}

export interface LeadOwner {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role?: string;
}

export interface LeadCurrency {
  id: string;
  code: string;
  symbol: string;
  name: string;
}

export interface LeadTag {
  id: string;
  name: string;
  color: string;
}

export interface LeadProduct {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface LeadDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface LeadActivity {
  id: string;
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'TASK' | 'NOTE';
  title: string;
  description?: string;
  status: 'COMPLETED' | 'PENDING';
  dueDate?: string;
  duration?: number;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  };
}

export interface Lead {
  id: string;
  displayId: string;
  title: string;
  description?: string;
  source?: string;
  value?: number;
  score?: number;

  // Relationships
  contact?: LeadContact;
  contactId?: string;
  stage?: LeadStage;
  stageId?: string;
  owner: LeadOwner;
  ownerMembershipId: string;
  currency?: LeadCurrency;
  currencyId?: string;

  // Collections (loaded separately)
  tags?: LeadTag[];
  products?: LeadProduct[];
  documents?: LeadDocument[];
  activities?: LeadActivity[];

  // Metadata
  customFieldValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// API Request DTOs
export interface CreateLeadDto {
  title: string;
  description?: string;
  source?: string;
  value?: number;
  score?: number;
  currencyId?: string;
  stageId?: string;
  contactId?: string;
  createContact?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    title?: string;
    companyId?: string;
  };
  customFieldValues?: Record<string, unknown>;
}

export interface UpdateLeadDto {
  title?: string;
  description?: string;
  source?: string;
  value?: number;
  score?: number;
  currencyId?: string;
  stageId?: string;
  contactId?: string;
  ownerMembershipId?: string;
  customFieldValues?: Record<string, unknown>;
}

export interface CreateActivityDto {
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'TASK' | 'NOTE';
  title: string;
  description?: string;
  status?: 'COMPLETED' | 'PENDING';
  dueDate?: string;
  duration?: number;
}

// Filter and Pagination
export interface LeadFilters {
  page?: number;
  limit?: number;
  search?: string;
  stageId?: string;
  source?: string;
  ownerMembershipId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Kanban View Types
export interface KanbanStage {
  id: string;
  name: string;
  type: 'OPEN' | 'CLOSED_WON' | 'CLOSED_LOST';
  displayOrder: number;
  color?: string;
  totalCount: number;
  totalValue: number;
  hasMore: boolean;
  leads: KanbanLead[];
}

export interface KanbanLead {
  id: string;
  displayId: string;
  title: string;
  value?: number;
  score?: number;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  currency?: {
    code: string;
    symbol: string;
  };
  owner: {
    id: string;
    userName: string;
    userEmail: string;
  };
  createdAt: string;
}

export interface KanbanViewResponse {
  pipelineId: string;
  pipelineName: string;
  totalLeads: number;
  totalValue: number;
  stages: KanbanStage[];
}

// Lead Sources
export const LEAD_SOURCES = [
  'Website',
  'Referral',
  'Cold Call',
  'LinkedIn',
  'Email Campaign',
  'Trade Show',
  'IndiaMART',
  'JustDial',
  'Other',
] as const;

export type LeadSource = typeof LEAD_SOURCES[number];

// Status colors for UI
export const STAGE_TYPE_COLORS = {
  OPEN: '#3b82f6',      // Blue
  CLOSED_WON: '#22c55e', // Green
  CLOSED_LOST: '#ef4444', // Red
} as const;

export const SOURCE_COLORS: Record<string, string> = {
  Website: '#3b82f6',
  Referral: '#8b5cf6',
  'Cold Call': '#f59e0b',
  LinkedIn: '#0077b5',
  'Email Campaign': '#ec4899',
  'Trade Show': '#06b6d4',
  IndiaMART: '#ff6600',
  JustDial: '#00a651',
  Other: '#6b7280',
};

export const ACTIVITY_TYPE_COLORS = {
  CALL: '#22c55e',
  EMAIL: '#3b82f6',
  MEETING: '#8b5cf6',
  TASK: '#f59e0b',
  NOTE: '#6b7280',
} as const;

export const ACTIVITY_TYPE_ICONS = {
  CALL: 'call-outline',
  EMAIL: 'mail-outline',
  MEETING: 'calendar-outline',
  TASK: 'checkbox-outline',
  NOTE: 'document-text-outline',
} as const;
