import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user_core',
  TOKEN_EXPIRY: 'tokenExpiry',
} as const;

// SecureStore has a 2048 byte limit per item
// For larger values (like JWT tokens), we chunk them
const CHUNK_SIZE = 2000; // Leave some margin
const CHUNK_COUNT_SUFFIX = '_chunk_count';

// Secure storage wrapper with chunking for large values and web fallback
export const secureStorage = {
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }

    // Check if value needs chunking
    if (value.length <= CHUNK_SIZE) {
      // Small enough - store directly and clean up any old chunks
      await SecureStore.setItemAsync(key, value);
      // Delete chunk count key if it exists
      try {
        await SecureStore.deleteItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`);
      } catch {
        // Ignore if doesn't exist
      }
      return;
    }

    // Value needs chunking
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }

    // Store chunk count first
    await SecureStore.setItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`, String(chunks.length));

    // Store each chunk
    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(`${key}_${index}`, chunk)
      )
    );

    // Clean up old single value if it exists
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignore
    }
  },

  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }

    // First check if it's chunked
    const chunkCountStr = await SecureStore.getItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`);

    if (chunkCountStr) {
      // It's chunked - reassemble
      const chunkCount = parseInt(chunkCountStr, 10);
      const chunks: string[] = [];

      for (let i = 0; i < chunkCount; i++) {
        const chunk = await SecureStore.getItemAsync(`${key}_${i}`);
        if (!chunk) {
          // Chunk missing - data is corrupt
          console.error(`Missing chunk ${i} for key ${key}`);
          return null;
        }
        chunks.push(chunk);
      }

      return chunks.join('');
    }

    // Not chunked - try to get directly
    return SecureStore.getItemAsync(key);
  },

  deleteItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }

    // Check if it's chunked
    const chunkCountStr = await SecureStore.getItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`);

    if (chunkCountStr) {
      const chunkCount = parseInt(chunkCountStr, 10);

      // Delete all chunks
      await Promise.all([
        SecureStore.deleteItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`),
        ...Array.from({ length: chunkCount }, (_, i) =>
          SecureStore.deleteItemAsync(`${key}_${i}`)
        ),
      ]);
    }

    // Also try to delete the main key (in case it was stored directly before)
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignore if doesn't exist
    }
  },

  clearAll: async (): Promise<void> => {
    if (Platform.OS === 'web') {
      Object.values(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });
      return;
    }

    // Delete all known keys
    await Promise.all(
      Object.values(STORAGE_KEYS).map((key) => secureStorage.deleteItem(key))
    );
  },
};

// JWT utilities
export interface DecodedToken {
  exp: number;
  iat: number;
  sub: string;
  email: string;
  orgId?: string;
  membershipId?: string;
}

/**
 * Decode a JWT token without verification (client-side only)
 * Note: This is just for reading expiry time, not for security validation
 */
export function decodeJWT(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    // Handle base64url encoding
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if a token is expired or will expire within the buffer time
 * @param token JWT token string
 * @param bufferSeconds Seconds before actual expiry to consider token "expired" (default: 60)
 */
export function isTokenExpired(token: string, bufferSeconds: number = 60): boolean {
  const decoded = decodeJWT(token);
  if (!decoded) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const expiryTime = decoded.exp;

  // Token is expired if current time + buffer is past expiry
  return currentTime + bufferSeconds >= expiryTime;
}

/**
 * Get time until token expires in seconds
 * Returns negative if already expired
 */
export function getTokenTimeRemaining(token: string): number {
  const decoded = decodeJWT(token);
  if (!decoded) {
    return -1;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp - currentTime;
}

/**
 * Get token expiry as Date object
 */
export function getTokenExpiryDate(token: string): Date | null {
  const decoded = decodeJWT(token);
  if (!decoded) {
    return null;
  }

  return new Date(decoded.exp * 1000);
}
