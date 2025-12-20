// Product type definitions for SalesTub CRM Mobile App

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  storageKey: string;
  thumbnailKey?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  isPrimary: boolean;
  sortOrder: number;
  altText?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  createdAt: string;
}

export interface ProductOwner {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string | null;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  categoryId?: string;
  category?: ProductCategory;
  price?: number;
  description?: string;
  isActive: boolean;
  currencyId?: string;
  currency?: {
    id: string;
    code: string;
    symbol: string;
    name: string;
  };
  customFieldValues?: Record<string, any>;
  images?: ProductImage[];
  primaryImage?: ProductImage;
  owner: ProductOwner;
  activitiesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  name: string;
  sku?: string;
  categoryId?: string;
  price?: number;
  description?: string;
  isActive?: boolean;
  currencyId?: string;
  customFieldValues?: Record<string, any>;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isActive?: boolean;
}

export interface PaginatedProductsResponse {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Format product price for display
export const formatProductPrice = (price?: number, currencySymbol: string = '₹'): string => {
  if (!price && price !== 0) return '';
  // Price is stored in cents/paise, convert to main unit
  const mainPrice = price / 100;
  if (mainPrice >= 10000000) {
    return `${currencySymbol}${(mainPrice / 10000000).toFixed(1)}Cr`;
  }
  if (mainPrice >= 100000) {
    return `${currencySymbol}${(mainPrice / 100000).toFixed(1)}L`;
  }
  if (mainPrice >= 1000) {
    return `${currencySymbol}${(mainPrice / 1000).toFixed(1)}K`;
  }
  return `${currencySymbol}${mainPrice.toLocaleString()}`;
};

// Format price for input (raw number without formatting)
export const formatPriceForInput = (price?: number): string => {
  if (!price && price !== 0) return '';
  return (price / 100).toString();
};

// Parse price from input (convert to cents/paise)
export const parsePriceFromInput = (value: string): number => {
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
};
