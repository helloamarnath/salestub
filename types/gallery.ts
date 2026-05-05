// Gallery / OrgFile types — mirror the backend's `org-files` controller shapes.

export type OrgFileEntityType =
  | 'LEAD'
  | 'PRODUCT_IMAGE'
  | 'PRODUCT_DOCUMENT'
  | 'QUOTE'
  | 'INVOICE'
  | 'VISIT';

export interface OrgFileUsage {
  entityType: OrgFileEntityType;
  entityId: string;
  displayId?: string;
  title?: string;
}

export interface OrgFileUploader {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface OrgFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  description?: string;
  thumbnailUrl?: string;
  createdAt: string;
  uploadedBy: OrgFileUploader;
  usage?: OrgFileUsage[];
}

export interface OrgFilesListResponse {
  data: OrgFile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GalleryStats {
  storageUsedBytes: number;
  storageQuotaBytes: number;
  percentageUsed: number;
  fileCount?: number;
  documentCount?: number;
  formattedUsed: string;
  formattedQuota: string;
  formattedAvailable: string;
  maxFileSizeBytes: number;
  formattedMaxFileSize: string;
}

export interface GalleryListFilters {
  page?: number;
  limit?: number;
  search?: string;
  /** MIME-type substring — e.g. "pdf", "image", "spreadsheet". */
  fileType?: string;
  uploadedById?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: 'createdAt' | 'fileSize' | 'fileName';
  sortOrder?: 'asc' | 'desc';
}

// ---------- helpers ----------

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function getFileIcon(mimeType: string):
  | 'image-outline'
  | 'document-text-outline'
  | 'document-outline'
  | 'film-outline'
  | 'musical-notes-outline'
  | 'folder-outline' {
  if (mimeType.startsWith('image/')) return 'image-outline';
  if (mimeType.startsWith('video/')) return 'film-outline';
  if (mimeType.startsWith('audio/')) return 'musical-notes-outline';
  if (mimeType.includes('pdf')) return 'document-text-outline';
  if (
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    mimeType.includes('sheet') ||
    mimeType.includes('excel') ||
    mimeType.includes('csv') ||
    mimeType.includes('text/')
  ) {
    return 'document-outline';
  }
  return 'folder-outline';
}

const ENTITY_LABEL: Record<OrgFileEntityType, string> = {
  LEAD: 'Lead',
  PRODUCT_IMAGE: 'Product image',
  PRODUCT_DOCUMENT: 'Product doc',
  QUOTE: 'Quote',
  INVOICE: 'Invoice',
  VISIT: 'Visit',
};

export function summarizeUsage(usage: OrgFileUsage[] | undefined): string {
  if (!usage || usage.length === 0) return 'Unattached';
  const counts: Partial<Record<OrgFileEntityType, number>> = {};
  for (const u of usage) {
    counts[u.entityType] = (counts[u.entityType] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([type, count]) => `${count} ${ENTITY_LABEL[type as OrgFileEntityType]}${count! > 1 ? 's' : ''}`)
    .join(' · ');
}
