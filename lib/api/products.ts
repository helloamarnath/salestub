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
