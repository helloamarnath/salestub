import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { setAuthCallbacks } from '@/lib/api/client';

// API URL - use environment variable or default
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.salestub.com';

// Storage keys
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user_core'; // Store only essential user data

// Types
interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isInternal: boolean;
  roles: string[];
  permissions: string[];
  orgId?: string;
  membershipId?: string;
  mfaEnabled: boolean;
}

// Minimal user data for storage (under 2KB limit)
interface StoredUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  orgId?: string;
  membershipId?: string;
}

// Extract minimal user data for secure storage
function getStorableUser(user: User): StoredUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    orgId: user.orgId,
    membershipId: user.membershipId,
  };
}

// Restore full user from stored data (with defaults for missing fields)
function restoreUser(stored: StoredUser): User {
  return {
    ...stored,
    isInternal: false,
    roles: [],
    permissions: [],
    mfaEnabled: false,
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface LoginParams {
  email: string;
  password: string;
  mfaCode?: string;
  deviceId?: string;
  deviceName?: string;
}

interface LoginResult {
  success: boolean;
  requiresMfa?: boolean;
  tempToken?: string;
  error?: string;
}

interface AuthContextType extends AuthState {
  login: (params: LoginParams) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Secure storage helpers (with web fallback)
async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Load stored auth state on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [accessToken, refreshToken, userStr] = await Promise.all([
        getSecureItem(ACCESS_TOKEN_KEY),
        getSecureItem(REFRESH_TOKEN_KEY),
        getSecureItem(USER_KEY),
      ]);

      if (accessToken && refreshToken && userStr) {
        const storedUser = JSON.parse(userStr) as StoredUser;
        const user = restoreUser(storedUser);
        setState({
          user,
          accessToken,
          refreshToken,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const login = useCallback(
    async (params: LoginParams): Promise<LoginResult> => {
      try {
        const response = await fetch(`${API_URL}/api/v1/auth/mobile/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: params.email,
            password: params.password,
            mfaCode: params.mfaCode,
            deviceId: params.deviceId,
            deviceName: params.deviceName,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            error: data.message || 'Login failed',
          };
        }

        // Check if MFA is required
        if (data.requiresMfa) {
          return {
            success: false,
            requiresMfa: true,
            tempToken: data.tempToken,
          };
        }

        // Store tokens and minimal user data securely (avoid 2KB limit)
        const storableUser = getStorableUser(data.user);
        await Promise.all([
          setSecureItem(ACCESS_TOKEN_KEY, data.accessToken),
          setSecureItem(REFRESH_TOKEN_KEY, data.refreshToken),
          setSecureItem(USER_KEY, JSON.stringify(storableUser)),
        ]);

        setState({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isLoading: false,
          isAuthenticated: true,
        });

        return { success: true };
      } catch (error) {
        console.error('Login error:', error);
        return {
          success: false,
          error: 'Network error. Please check your connection.',
        };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      // Clear stored tokens
      await Promise.all([
        deleteSecureItem(ACCESS_TOKEN_KEY),
        deleteSecureItem(REFRESH_TOKEN_KEY),
        deleteSecureItem(USER_KEY),
      ]);

      setState({
        user: null,
        accessToken: null,
        refreshToken: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  const refreshTokens = useCallback(async (): Promise<boolean> => {
    try {
      const currentRefreshToken = await getSecureItem(REFRESH_TOKEN_KEY);

      if (!currentRefreshToken) {
        return false;
      }

      const response = await fetch(`${API_URL}/api/v1/auth/mobile/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: currentRefreshToken,
        }),
      });

      if (!response.ok) {
        // Refresh token is invalid - log out
        await logout();
        return false;
      }

      const data = await response.json();

      // Store new tokens
      await Promise.all([
        setSecureItem(ACCESS_TOKEN_KEY, data.accessToken),
        setSecureItem(REFRESH_TOKEN_KEY, data.refreshToken),
      ]);

      setState((prev) => ({
        ...prev,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      }));

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }, [logout]);

  // Create a wrapper that returns the new access token for the API client
  const refreshTokensForApi = useCallback(async (): Promise<string | null> => {
    const success = await refreshTokens();
    if (success) {
      // Get the new access token from storage
      return getSecureItem(ACCESS_TOKEN_KEY);
    }
    return null;
  }, [refreshTokens]);

  // Register auth callbacks with API client for automatic token refresh on 401
  useEffect(() => {
    setAuthCallbacks(refreshTokensForApi, logout);
  }, [refreshTokensForApi, logout]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshTokens,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
