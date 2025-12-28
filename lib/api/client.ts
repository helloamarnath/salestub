// API Client for SalesTub CRM Mobile App
// Provides authenticated fetch wrapper with token refresh support

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.salestub.com';

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | number | undefined>;
}

// Token refresh callback - will be set by auth context
let tokenRefreshCallback: (() => Promise<string | null>) | null = null;
let logoutCallback: (() => void) | null = null;

export function setAuthCallbacks(
  refreshFn: () => Promise<string | null>,
  logoutFn: () => void
) {
  tokenRefreshCallback = refreshFn;
  logoutCallback = logoutFn;
}

// Build URL with query params
function buildUrl(endpoint: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(`${API_URL}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

// Main API request function
export async function apiRequest<T>(
  endpoint: string,
  accessToken: string | null,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {}, params } = options;

  const url = buildUrl(endpoint, params);

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (accessToken) {
    requestHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Handle 401 Unauthorized - try to refresh token
    if (response.status === 401 && tokenRefreshCallback) {
      const newToken = await tokenRefreshCallback();

      if (newToken) {
        // Retry request with new token
        requestHeaders['Authorization'] = `Bearer ${newToken}`;
        const retryResponse = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
        });

        if (retryResponse.ok) {
          const data = await retryResponse.json();
          return { data, success: true };
        }

        // If retry also fails with 401, logout
        if (retryResponse.status === 401 && logoutCallback) {
          logoutCallback();
        }

        const errorData = await retryResponse.json();
        return {
          success: false,
          error: {
            message: errorData.message || 'Request failed',
            statusCode: retryResponse.status,
            error: errorData.error,
          },
        };
      } else {
        // Token refresh failed - logout
        if (logoutCallback) {
          logoutCallback();
        }
        return {
          success: false,
          error: {
            message: 'Session expired. Please login again.',
            statusCode: 401,
          },
        };
      }
    }

    // Handle other errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: {
          message: errorData.message || `Request failed with status ${response.status}`,
          statusCode: response.status,
          error: errorData.error,
        },
      };
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { data: undefined as T, success: true };
    }

    const data = await response.json();
    return { data, success: true };
  } catch (error) {
    console.error('API request error:', error);
    return {
      success: false,
      error: {
        message: 'Network error. Please check your connection.',
        statusCode: 0,
      },
    };
  }
}

// Convenience methods
export const api = {
  get: <T>(endpoint: string, token: string | null, params?: Record<string, string | number | undefined>) =>
    apiRequest<T>(endpoint, token, { method: 'GET', params }),

  post: <T>(endpoint: string, token: string | null, body?: unknown) =>
    apiRequest<T>(endpoint, token, { method: 'POST', body }),

  put: <T>(endpoint: string, token: string | null, body?: unknown) =>
    apiRequest<T>(endpoint, token, { method: 'PUT', body }),

  patch: <T>(endpoint: string, token: string | null, body?: unknown) =>
    apiRequest<T>(endpoint, token, { method: 'PATCH', body }),

  delete: <T>(endpoint: string, token: string | null, body?: unknown) =>
    apiRequest<T>(endpoint, token, { method: 'DELETE', body }),
};

// Upload file with multipart form data
export async function uploadFile(
  endpoint: string,
  accessToken: string | null,
  file: { uri: string; name: string; type: string },
  additionalFields?: Record<string, string>
): Promise<ApiResponse<unknown>> {
  const url = `${API_URL}${endpoint}`;

  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);

  if (additionalFields) {
    Object.entries(additionalFields).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: {
          message: errorData.message || 'Upload failed',
          statusCode: response.status,
        },
      };
    }

    const data = await response.json();
    return { data, success: true };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: {
        message: 'Upload failed. Please try again.',
        statusCode: 0,
      },
    };
  }
}

export { API_URL };
