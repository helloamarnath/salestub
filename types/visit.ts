// Visit type definitions for SalesTub CRM Mobile App

export type VisitStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type VisitPurpose =
  | 'PRODUCT_DEMO'
  | 'FOLLOW_UP'
  | 'PAYMENT_COLLECTION'
  | 'SUPPORT'
  | 'DELIVERY'
  | 'NEGOTIATION'
  | 'RELATIONSHIP'
  | 'OTHER';

export const VISIT_PURPOSE_LABELS: Record<VisitPurpose, string> = {
  PRODUCT_DEMO: 'Product Demo',
  FOLLOW_UP: 'Follow-up',
  PAYMENT_COLLECTION: 'Payment Collection',
  SUPPORT: 'Support',
  DELIVERY: 'Delivery',
  NEGOTIATION: 'Negotiation',
  RELATIONSHIP: 'Relationship Building',
  OTHER: 'Other',
};

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export interface VisitPhoto {
  id: string;
  url: string;
  caption?: string;
  lat: number;
  lng: number;
  accuracy?: number;
  altitude?: number;
  address?: string;
  capturedAt: string;
  createdAt: string;
}

export interface Visit {
  id: string;
  displayId: string;
  status: VisitStatus;
  purpose: VisitPurpose;
  notes?: string;
  startedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  startLat: number;
  startLng: number;
  startAddress?: string;
  endLat?: number;
  endLng?: number;
  endAddress?: string;
  distanceKm?: number;
  durationMins?: number;
  firebasePathId?: string;
  lead: {
    id: string;
    displayId: string;
    title: string;
  };
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  photos: VisitPhoto[];
  createdAt: string;
  updatedAt: string;
}

// API Request DTOs

export interface StartVisitDto {
  leadId: string;
  purpose: VisitPurpose;
  startLat: number;
  startLng: number;
  contactId?: string;
  startAddress?: string;
  notes?: string;
}

export interface CompleteVisitDto {
  endLat: number;
  endLng: number;
  endAddress?: string;
  notes?: string;
  distanceKm?: number;
}

export interface CancelVisitDto {
  notes?: string;
}

// Filter and Pagination

export interface VisitFilters {
  page?: number;
  limit?: number;
  status?: VisitStatus;
  purpose?: VisitPurpose;
  leadId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedVisits {
  data: Visit[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Summary Types

export interface EmployeeVisitSummary {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  totalVisits: number;
  completedVisits: number;
  activeVisit: Visit | null;
  totalDurationMins: number;
  totalDistanceKm: number;
  visits: Visit[];
}

export interface DailyVisitsSummary {
  date: string;
  totalVisits: number;
  activeVisits: number;
  completedVisits: number;
  cancelledVisits: number;
  avgDurationMins: number;
  totalDistanceKm: number;
  employees: EmployeeVisitSummary[];
}
