// Gallery / OrgFile API — wraps the backend's `/public/org-files/*` endpoints.

import { api, ApiResponse } from './client';
import type {
  GalleryListFilters,
  GalleryStats,
  OrgFile,
  OrgFilesListResponse,
} from '@/types/gallery';

const BASE = '/api/v1/public/org-files';

/**
 * Paginated gallery list. Supports search, file-type filter (MIME substring),
 * date range, and sort.
 */
export async function listGalleryFiles(
  token: string | null,
  filters: GalleryListFilters = {},
): Promise<ApiResponse<OrgFilesListResponse>> {
  const params: Record<string, string | number | undefined> = {
    page: filters.page ?? 1,
    limit: filters.limit ?? 30,
    search: filters.search,
    fileType: filters.fileType,
    uploadedById: filters.uploadedById,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };
  return api.get<OrgFilesListResponse>(BASE, token, params);
}

/**
 * Storage usage stats — used in gallery header.
 */
export async function getGalleryStats(
  token: string | null,
): Promise<ApiResponse<GalleryStats>> {
  return api.get<GalleryStats>(`${BASE}/stats`, token);
}

/**
 * Get a 15-minute signed preview URL for a file.
 * Use right before opening the URL — don't cache.
 */
export async function getGalleryPreviewUrl(
  token: string | null,
  fileId: string,
): Promise<
  ApiResponse<{
    url: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }>
> {
  return api.get(`${BASE}/${fileId}/preview`, token);
}

/**
 * Delete a single file. Cascade-deletes every entity attachment that
 * references it (lead docs, product images, etc.).
 */
export async function deleteGalleryFile(
  token: string | null,
  fileId: string,
): Promise<ApiResponse<{ message: string; bytesFreed: number }>> {
  return api.delete(`${BASE}/${fileId}`, token);
}

/**
 * Bulk delete (up to 50 IDs per call — backend enforces).
 */
export async function bulkDeleteGalleryFiles(
  token: string | null,
  orgFileIds: string[],
): Promise<ApiResponse<{ deleted: number; skipped: number; totalSize: number }>> {
  return api.delete(BASE, token, { orgFileIds });
}

/**
 * Standalone upload — file lands in the gallery as "unattached" until someone
 * picks it from a lead/product/quote upload UI. Multipart, so we use fetch
 * directly. Backend caps at 50 MB hard, plus per-org quota.
 */
export async function uploadGalleryFile(
  token: string | null,
  file: { uri: string; name: string; type: string },
): Promise<ApiResponse<OrgFile>> {
  if (!token) {
    return { success: false, error: { message: 'Not authenticated', statusCode: 401 } };
  }
  try {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || '';
    const form = new FormData();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
    const res = await fetch(`${baseUrl}${BASE}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        success: false,
        error: {
          message: errBody.message || `Upload failed (${res.status})`,
          statusCode: res.status,
        },
      };
    }
    const data = (await res.json()) as OrgFile;
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: {
        message: e instanceof Error ? e.message : 'Upload failed',
        statusCode: 0,
      },
    };
  }
}
