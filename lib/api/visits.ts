// Visits API functions for SalesTub CRM Mobile App

import { api, uploadFile, ApiResponse } from './client';
import type {
  Visit,
  StartVisitDto,
  CompleteVisitDto,
  CancelVisitDto,
  VisitFilters,
  PaginatedVisits,
  VisitPhoto,
} from '@/types/visit';

const VISITS_BASE = '/api/v1/visits';

// ============ Visit Lifecycle ============

/**
 * Start a new field visit
 */
export async function startVisit(
  token: string | null,
  data: StartVisitDto
): Promise<ApiResponse<Visit>> {
  return api.post<Visit>(`${VISITS_BASE}/start`, token, data);
}

/**
 * Complete an in-progress visit
 */
export async function completeVisit(
  token: string | null,
  visitId: string,
  data: CompleteVisitDto
): Promise<ApiResponse<Visit>> {
  return api.patch<Visit>(`${VISITS_BASE}/${visitId}/complete`, token, data);
}

/**
 * Cancel an in-progress visit
 */
export async function cancelVisit(
  token: string | null,
  visitId: string,
  data?: CancelVisitDto
): Promise<ApiResponse<Visit>> {
  return api.patch<Visit>(`${VISITS_BASE}/${visitId}/cancel`, token, data ?? {});
}

// ============ Query Operations ============

/**
 * Get current user's active visit
 */
export async function getActiveVisit(
  token: string | null
): Promise<ApiResponse<Visit | null>> {
  return api.get<Visit | null>(`${VISITS_BASE}/active`, token);
}

/**
 * Get paginated list of visits with filters
 */
export async function getVisits(
  token: string | null,
  filters: VisitFilters = {}
): Promise<ApiResponse<PaginatedVisits>> {
  const params: Record<string, string | number | undefined> = {
    page: filters.page || 1,
    limit: filters.limit || 20,
    status: filters.status,
    purpose: filters.purpose,
    leadId: filters.leadId,
    startDate: filters.startDate,
    endDate: filters.endDate,
  };

  return api.get<PaginatedVisits>(VISITS_BASE, token, params);
}

/**
 * Get single visit by ID
 */
export async function getVisit(
  token: string | null,
  visitId: string
): Promise<ApiResponse<Visit>> {
  return api.get<Visit>(`${VISITS_BASE}/${visitId}`, token);
}

/**
 * Get visit history for a lead
 */
export async function getLeadVisits(
  token: string | null,
  leadId: string
): Promise<ApiResponse<Visit[]>> {
  return api.get<Visit[]>(`${VISITS_BASE}/lead/${leadId}`, token);
}

// ============ Photos ============

/**
 * Upload a photo to a visit (multipart form data)
 */
export async function uploadVisitPhoto(
  token: string | null,
  visitId: string,
  photo: {
    uri: string;
    fileName: string;
    mimeType: string;
  },
  location: {
    lat: number;
    lng: number;
    accuracy?: number;
    altitude?: number;
    capturedAt: string;
  },
  caption?: string
): Promise<ApiResponse<VisitPhoto>> {
  const additionalFields: Record<string, string> = {
    lat: String(location.lat),
    lng: String(location.lng),
    capturedAt: location.capturedAt,
  };

  if (location.accuracy) additionalFields.accuracy = String(location.accuracy);
  if (location.altitude) additionalFields.altitude = String(location.altitude);
  if (caption) additionalFields.caption = caption;

  return uploadFile(
    `${VISITS_BASE}/${visitId}/photos`,
    token,
    { uri: photo.uri, name: photo.fileName, type: photo.mimeType },
    additionalFields
  ) as Promise<ApiResponse<VisitPhoto>>;
}

/**
 * Delete a visit photo
 */
export async function deleteVisitPhoto(
  token: string | null,
  visitId: string,
  photoId: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  return api.delete<{ deleted: boolean }>(
    `${VISITS_BASE}/${visitId}/photos/${photoId}`,
    token
  );
}

// ============ Live Location ============

/**
 * Update live location during an active visit
 */
export async function updateVisitLocation(
  token: string | null,
  visitId: string,
  location: {
    lat: number;
    lng: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
  }
): Promise<ApiResponse<{ success: boolean }>> {
  return api.post<{ success: boolean }>(
    `${VISITS_BASE}/${visitId}/location`,
    token,
    location
  );
}
