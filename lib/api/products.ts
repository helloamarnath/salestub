// Products API functions for SalesTub CRM Mobile App

import { api, ApiResponse, uploadFile } from './client';
import type {
  Product,
  ProductFilters,
  PaginatedProductsResponse,
  CreateProductDto,
  UpdateProductDto,
  ProductCategory,
  ProductImage,
} from '@/types/product';

const PRODUCTS_BASE = '/api/v1/products';
const CATEGORIES_BASE = '/api/v1/product-categories';

/**
 * Get paginated list of products with filters
 */
export async function getProducts(
  token: string | null,
  filters: ProductFilters = {}
): Promise<ApiResponse<PaginatedProductsResponse>> {
  const params: Record<string, string | number | undefined> = {
    page: filters.page || 1,
    limit: filters.limit || 20,
    search: filters.search,
    category: filters.category,
    isActive: filters.isActive?.toString(),
  };

  return api.get<PaginatedProductsResponse>(PRODUCTS_BASE, token, params);
}

/**
 * Get single product by ID
 */
export async function getProduct(
  token: string | null,
  id: string
): Promise<ApiResponse<Product>> {
  return api.get<Product>(`${PRODUCTS_BASE}/${id}`, token);
}

/**
 * Create a new product
 */
export async function createProduct(
  token: string | null,
  data: CreateProductDto
): Promise<ApiResponse<Product>> {
  return api.post<Product>(PRODUCTS_BASE, token, data);
}

/**
 * Update an existing product
 */
export async function updateProduct(
  token: string | null,
  id: string,
  data: UpdateProductDto
): Promise<ApiResponse<Product>> {
  return api.patch<Product>(`${PRODUCTS_BASE}/${id}`, token, data);
}

/**
 * Delete a product
 */
export async function deleteProduct(
  token: string | null,
  id: string
): Promise<ApiResponse<void>> {
  return api.delete<void>(`${PRODUCTS_BASE}/${id}`, token);
}

/**
 * Get product categories
 */
export async function getProductCategories(
  token: string | null
): Promise<ApiResponse<ProductCategory[]>> {
  return api.get<ProductCategory[]>(CATEGORIES_BASE, token);
}

// ========================================
// Product Image Functions
// ========================================

/**
 * Get product images
 */
export async function getProductImages(
  token: string | null,
  productId: string
): Promise<ApiResponse<ProductImage[]>> {
  return api.get<ProductImage[]>(`${PRODUCTS_BASE}/${productId}/images`, token);
}

/**
 * Upload product image
 */
export async function uploadProductImage(
  token: string | null,
  productId: string,
  file: { uri: string; name: string; type: string },
  options?: { altText?: string; isPrimary?: boolean }
): Promise<ApiResponse<ProductImage>> {
  const additionalFields: Record<string, string> = {};
  if (options?.altText) {
    additionalFields.altText = options.altText;
  }
  if (options?.isPrimary !== undefined) {
    additionalFields.isPrimary = options.isPrimary.toString();
  }

  return uploadFile(
    `${PRODUCTS_BASE}/${productId}/images`,
    token,
    file,
    Object.keys(additionalFields).length > 0 ? additionalFields : undefined
  ) as Promise<ApiResponse<ProductImage>>;
}

/**
 * Delete product image
 */
export async function deleteProductImage(
  token: string | null,
  productId: string,
  imageId: string
): Promise<ApiResponse<void>> {
  return api.delete<void>(`${PRODUCTS_BASE}/${productId}/images/${imageId}`, token);
}

/**
 * Set image as primary
 */
export async function setProductImagePrimary(
  token: string | null,
  productId: string,
  imageId: string
): Promise<ApiResponse<ProductImage>> {
  return api.patch<ProductImage>(`${PRODUCTS_BASE}/${productId}/images/${imageId}/primary`, token);
}

// Export filter interface
export interface ProductExportFilters {
  category?: string;
  isActive?: boolean;
}

/**
 * Export products to CSV
 */
export async function exportProductsToCSV(
  token: string | null,
  filters?: ProductExportFilters
): Promise<{ success: boolean; csv?: string; filename?: string; error?: string }> {
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.salestub.com';

  const url = new URL(`${API_URL}${PRODUCTS_BASE}/export`);
  if (filters?.category) url.searchParams.append('category', filters.category);
  if (filters?.isActive !== undefined) url.searchParams.append('isActive', String(filters.isActive));

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `Export failed with status ${response.status}`,
      };
    }

    // Get filename from Content-Disposition header if available
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'products-export.csv';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match) filename = match[1];
    }

    const csv = await response.text();
    return { success: true, csv, filename };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}

// ============ CSV Import ============

export interface ProductImportResultRow {
  row: number;
  name: string;
  status: 'imported' | 'updated' | 'skipped' | 'failed';
  reason?: string;
}

export interface ProductImportResult {
  totalRows: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  details: ProductImportResultRow[];
}

/**
 * Download a CSV import template (blank, with column headers).
 * Backend serves text/csv with a Content-Disposition filename.
 */
export async function downloadProductImportTemplate(
  token: string | null,
): Promise<{ success: boolean; csv?: string; filename?: string; error?: string }> {
  try {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || '';
    const res = await fetch(`${baseUrl}${PRODUCTS_BASE}/import/template`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      return { success: false, error: `Template download failed (${res.status})` };
    }
    const cd = res.headers.get('Content-Disposition');
    let filename = 'products-import-template.csv';
    if (cd) {
      const m = cd.match(/filename="?([^"]+)"?/);
      if (m) filename = m[1];
    }
    const csv = await res.text();
    return { success: true, csv, filename };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Template download failed',
    };
  }
}

/**
 * Upload a CSV file to bulk-import products. Multipart upload — uses fetch directly.
 * Returns a per-row breakdown so callers can show what succeeded vs. failed.
 */
export async function importProductsFromCsv(
  token: string | null,
  file: { uri: string; name: string; type: string },
): Promise<{ success: boolean; data?: ProductImportResult; error?: string }> {
  if (!token) return { success: false, error: 'Not authenticated' };
  try {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || '';
    const form = new FormData();
    // React Native FormData wants the file as a { uri, name, type } object.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as any);

    const res = await fetch(`${baseUrl}${PRODUCTS_BASE}/import/csv`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errBody.message || `Import failed (${res.status})`,
      };
    }
    const data = (await res.json()) as ProductImportResult;
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Import failed',
    };
  }
}

// ============ Categories CRUD ============

export interface CreateProductCategoryDto {
  name: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateProductCategoryDto = Partial<CreateProductCategoryDto>;

export interface ProductCategoryDetail {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  productCount?: number;
}

export async function listAllProductCategories(
  token: string | null,
): Promise<ApiResponse<ProductCategoryDetail[]>> {
  return api.get<ProductCategoryDetail[]>(CATEGORIES_BASE, token);
}

export async function createProductCategory(
  token: string | null,
  data: CreateProductCategoryDto,
): Promise<ApiResponse<ProductCategoryDetail>> {
  return api.post<ProductCategoryDetail>(CATEGORIES_BASE, token, data);
}

export async function updateProductCategory(
  token: string | null,
  id: string,
  data: UpdateProductCategoryDto,
): Promise<ApiResponse<ProductCategoryDetail>> {
  return api.put<ProductCategoryDetail>(`${CATEGORIES_BASE}/${id}`, token, data);
}

export async function deleteProductCategory(
  token: string | null,
  id: string,
): Promise<ApiResponse<void>> {
  return api.delete<void>(`${CATEGORIES_BASE}/${id}`, token);
}

export async function seedDefaultCategories(
  token: string | null,
): Promise<ApiResponse<{ created: number }>> {
  return api.post(`${CATEGORIES_BASE}/seed`, token, {});
}
