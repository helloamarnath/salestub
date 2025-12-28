// Calendar Sync API functions for SalesTub CRM Mobile App
// Provides calendar integration with Google, Microsoft, and Zoho calendars

import { api, ApiResponse, API_URL } from './client';

// Types
export type CalendarProviderType = 'GOOGLE';
export type CalendarSyncDirection = 'CRM_TO_CALENDAR' | 'CALENDAR_TO_CRM' | 'BIDIRECTIONAL';
export type CalendarEventSyncStatus = 'SYNCED' | 'PENDING_TO_CALENDAR' | 'PENDING_TO_CRM' | 'CONFLICT' | 'ERROR';

export interface CalendarProvider {
  provider: CalendarProviderType;
  name: string;
  enabled: boolean;
  configured: boolean;
  description?: string;
}

export interface CalendarConnectionStatus {
  provider: CalendarProviderType;
  email: string;
  calendarId?: string;
  isActive: boolean;
  connectionStatus: string;
  syncDirection: CalendarSyncDirection;
  lastSyncAt?: string;
  nextSyncAt?: string;
  consecutiveErrors: number;
  lastError?: string;
}

export interface CalendarSyncStats {
  eventsCreatedInCalendar: number;
  eventsUpdatedInCalendar: number;
  eventsDeletedInCalendar: number;
  activitiesCreatedInCrm: number;
  activitiesUpdatedInCrm: number;
  activitiesDeletedInCrm: number;
  conflictsDetected: number;
  errors: number;
}

export interface CalendarSyncLog {
  id: string;
  syncType: string;
  direction: string;
  success: boolean;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  conflictsFound: number;
  errorMessage?: string;
  durationMs: number;
  startedAt: string;
  createdAt: string;
}

export interface CalendarConflict {
  mappingId: string;
  activityId: string;
  externalEventId: string;
  crmVersion: {
    title: string;
    description?: string;
    start: string;
    end: string;
    location?: string;
    updatedAt: string;
  };
  calendarVersion: {
    summary: string;
    description?: string;
    start: string;
    end: string;
    location?: string;
    updated: string;
  };
  detectedAt: string;
}

export interface UpdateCalendarSettingsDto {
  syncDirection?: CalendarSyncDirection;
  syncIntervalMinutes?: number;
  isActive?: boolean;
}

export interface TriggerSyncDto {
  syncType: 'full' | 'incremental';
}

const CALENDAR_BASE = '/api/v1/calendar';

/**
 * Get available calendar providers
 */
export async function getCalendarProviders(
  token: string | null
): Promise<ApiResponse<CalendarProvider[]>> {
  return api.get<CalendarProvider[]>(`${CALENDAR_BASE}/providers`, token);
}

/**
 * Get calendar connection status for current user
 */
export async function getCalendarStatus(
  token: string | null
): Promise<ApiResponse<CalendarConnectionStatus[]>> {
  return api.get<CalendarConnectionStatus[]>(`${CALENDAR_BASE}/status`, token);
}

/**
 * Get OAuth authorization URL for a provider
 * This returns a URL that should be opened in a browser for OAuth consent
 */
export async function getCalendarAuthUrl(
  token: string | null,
  provider: CalendarProviderType,
  options?: {
    syncDirection?: CalendarSyncDirection;
    redirectUrl?: string;
  }
): Promise<ApiResponse<{ authUrl: string }>> {
  const params: Record<string, string | undefined> = {
    syncDirection: options?.syncDirection,
    redirectUrl: options?.redirectUrl,
  };

  return api.get<{ authUrl: string }>(
    `${CALENDAR_BASE}/auth/${provider}`,
    token,
    params
  );
}

/**
 * Build OAuth URL for mobile deep linking
 * Returns the full OAuth URL that can be opened in a browser
 */
export async function getCalendarOAuthUrl(
  token: string | null,
  provider: CalendarProviderType,
  syncDirection: CalendarSyncDirection = 'BIDIRECTIONAL'
): Promise<{ url: string | null; error?: string }> {
  const result = await getCalendarAuthUrl(token, provider, {
    syncDirection,
    // Mobile app should handle the callback via deep linking
    redirectUrl: 'salestub://calendar/callback',
  });

  if (result.success && result.data?.authUrl) {
    return { url: result.data.authUrl };
  }

  return {
    url: null,
    error: result.error?.message || 'Failed to get authorization URL',
  };
}

/**
 * Disconnect a calendar provider
 */
export async function disconnectCalendar(
  token: string | null,
  provider: CalendarProviderType
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return api.delete<{ success: boolean; message: string }>(
    `${CALENDAR_BASE}/disconnect/${provider}`,
    token
  );
}

/**
 * Update calendar sync settings
 */
export async function updateCalendarSettings(
  token: string | null,
  provider: CalendarProviderType,
  settings: UpdateCalendarSettingsDto
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return api.put<{ success: boolean; message: string }>(
    `${CALENDAR_BASE}/settings/${provider}`,
    token,
    settings
  );
}

/**
 * Trigger manual calendar sync
 */
export async function triggerCalendarSync(
  token: string | null,
  provider: CalendarProviderType,
  syncType: 'full' | 'incremental' = 'incremental'
): Promise<ApiResponse<{ success: boolean; message: string; stats: CalendarSyncStats }>> {
  return api.post<{ success: boolean; message: string; stats: CalendarSyncStats }>(
    `${CALENDAR_BASE}/sync/${provider}`,
    token,
    { syncType }
  );
}

/**
 * Get sync history for a provider
 */
export async function getCalendarSyncHistory(
  token: string | null,
  provider: CalendarProviderType,
  limit: number = 10
): Promise<ApiResponse<{ history: CalendarSyncLog[] }>> {
  return api.get<{ history: CalendarSyncLog[] }>(
    `${CALENDAR_BASE}/sync/${provider}/history`,
    token,
    { limit }
  );
}

/**
 * Get pending sync conflicts
 */
export async function getCalendarConflicts(
  token: string | null
): Promise<ApiResponse<{ conflicts: CalendarConflict[] }>> {
  return api.get<{ conflicts: CalendarConflict[] }>(
    `${CALENDAR_BASE}/conflicts`,
    token
  );
}

/**
 * Resolve a sync conflict
 */
export async function resolveCalendarConflict(
  token: string | null,
  mappingId: string,
  resolution: 'CRM_WINS' | 'CALENDAR_WINS'
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return api.post<{ success: boolean; message: string }>(
    `${CALENDAR_BASE}/conflicts/${mappingId}/resolve`,
    token,
    { resolution }
  );
}

/**
 * Check if any calendar is connected
 */
export async function hasCalendarConnection(
  token: string | null
): Promise<{ connected: boolean; provider?: CalendarProviderType; email?: string }> {
  const result = await getCalendarStatus(token);

  if (result.success && result.data) {
    const connected = result.data.find((c) => c.connectionStatus === 'CONNECTED');
    if (connected) {
      return {
        connected: true,
        provider: connected.provider,
        email: connected.email,
      };
    }
  }

  return { connected: false };
}

/**
 * Get provider display info
 */
export function getProviderDisplayInfo(provider: CalendarProviderType): {
  name: string;
  color: string;
  icon: 'google';
} {
  // Only Google Calendar is supported
  return { name: 'Google Calendar', color: '#4285F4', icon: 'google' };
}

/**
 * Get sync direction display info
 */
export function getSyncDirectionInfo(direction: CalendarSyncDirection): {
  label: string;
  description: string;
} {
  switch (direction) {
    case 'BIDIRECTIONAL':
      return {
        label: 'Two-Way Sync',
        description: 'Changes sync both ways between CRM and Calendar',
      };
    case 'CRM_TO_CALENDAR':
      return {
        label: 'CRM to Calendar',
        description: 'Only push CRM meetings to your calendar',
      };
    case 'CALENDAR_TO_CRM':
      return {
        label: 'Calendar to CRM',
        description: 'Only import calendar events to CRM',
      };
  }
}
