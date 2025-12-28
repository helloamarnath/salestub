import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { setAuthCallbacks } from '@/lib/api/client';
import {
  secureStorage,
  STORAGE_KEYS,
  isTokenExpired,
  getTokenTimeRemaining,
} from '@/lib/storage';

// API URL - use environment variable or default
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.salestub.com';

// Refresh buffer - refresh token 2 minutes before expiry
const REFRESH_BUFFER_SECONDS = 120;

// Minimum time between refresh attempts (prevent rapid retries)
const MIN_REFRESH_INTERVAL_MS = 10000;

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

// User data for storage (includes roles and permissions for RBAC)
interface StoredUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  orgId?: string;
  membershipId?: string;
  isInternal?: boolean;
  roles?: string[];
  permissions?: string[];
}

// Extract user data for secure storage (including roles and permissions)
function getStorableUser(user: User): StoredUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    orgId: user.orgId,
    membershipId: user.membershipId,
    isInternal: user.isInternal,
    roles: user.roles,
    permissions: user.permissions,
  };
}

// Restore full user from stored data
function restoreUser(stored: StoredUser): User {
  return {
    id: stored.id,
    email: stored.email,
    firstName: stored.firstName,
    lastName: stored.lastName,
    orgId: stored.orgId,
    membershipId: stored.membershipId,
    isInternal: stored.isInternal || false,
    roles: stored.roles || [],
    permissions: stored.permissions || [],
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

  // Refs for proactive refresh
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefreshAttemptRef = useRef<number>(0);
  const isRefreshingRef = useRef<boolean>(false);

  // Load stored auth state on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // App state listener for session validation
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground - validate session
        validateSession();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  // Cleanup refresh timer on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [accessToken, refreshToken, userStr] = await Promise.all([
        secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
        secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
        secureStorage.getItem(STORAGE_KEYS.USER),
      ]);

      if (accessToken && refreshToken && userStr) {
        const storedUser = JSON.parse(userStr) as StoredUser;
        const user = restoreUser(storedUser);

        // Check if access token is expired
        if (isTokenExpired(accessToken, 0)) {
          // Token is expired - try to refresh immediately
          setState({
            user,
            accessToken,
            refreshToken,
            isLoading: true, // Keep loading while we refresh
            isAuthenticated: false,
          });
          // Attempt refresh
          performTokenRefresh(refreshToken);
        } else {
          setState({
            user,
            accessToken,
            refreshToken,
            isLoading: false,
            isAuthenticated: true,
          });
          // Schedule proactive refresh
          scheduleTokenRefresh(accessToken);
        }
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const validateSession = async () => {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
        secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
      ]);

      if (!accessToken || !refreshToken) {
        // No tokens - not authenticated
        if (state.isAuthenticated) {
          await clearAuthState();
        }
        return;
      }

      // Check if access token is expired or about to expire
      if (isTokenExpired(accessToken, REFRESH_BUFFER_SECONDS)) {
        // Token expired or expiring soon - refresh
        performTokenRefresh(refreshToken);
      } else {
        // Token is valid - reschedule refresh
        scheduleTokenRefresh(accessToken);
      }
    } catch (error) {
      console.error('Error validating session:', error);
    }
  };

  const scheduleTokenRefresh = (accessToken: string) => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    const timeRemaining = getTokenTimeRemaining(accessToken);

    // Schedule refresh 2 minutes before expiry
    const refreshIn = Math.max(
      (timeRemaining - REFRESH_BUFFER_SECONDS) * 1000,
      MIN_REFRESH_INTERVAL_MS
    );

    console.log(`Token expires in ${timeRemaining}s, scheduling refresh in ${refreshIn / 1000}s`);

    refreshTimerRef.current = setTimeout(async () => {
      const currentRefreshToken = await secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (currentRefreshToken) {
        performTokenRefresh(currentRefreshToken);
      }
    }, refreshIn);
  };

  const performTokenRefresh = async (currentRefreshToken: string): Promise<boolean> => {
    // Prevent concurrent refresh attempts
    if (isRefreshingRef.current) {
      console.log('Token refresh already in progress, skipping');
      return false;
    }

    // Rate limit refresh attempts
    const now = Date.now();
    if (now - lastRefreshAttemptRef.current < MIN_REFRESH_INTERVAL_MS) {
      console.log('Token refresh attempted too recently, skipping');
      return false;
    }

    isRefreshingRef.current = true;
    lastRefreshAttemptRef.current = now;

    try {
      console.log('Performing token refresh...');

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
        console.log('Refresh token invalid, logging out');
        await clearAuthState();
        return false;
      }

      const data = await response.json();

      // Store new tokens
      await Promise.all([
        secureStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken),
        secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken),
      ]);

      setState((prev) => ({
        ...prev,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        isLoading: false,
        isAuthenticated: true,
      }));

      // Schedule next refresh
      scheduleTokenRefresh(data.accessToken);

      console.log('Token refresh successful');
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      // On network error, don't log out - user might be offline
      // Just set loading to false
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isAuthenticated: prev.accessToken !== null,
      }));
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  };

  const clearAuthState = async () => {
    // Clear timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    // Clear storage
    await Promise.all([
      secureStorage.deleteItem(STORAGE_KEYS.ACCESS_TOKEN),
      secureStorage.deleteItem(STORAGE_KEYS.REFRESH_TOKEN),
      secureStorage.deleteItem(STORAGE_KEYS.USER),
    ]);

    setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,
    });
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

        // Store tokens and minimal user data
        const storableUser = getStorableUser(data.user);
        await Promise.all([
          secureStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken),
          secureStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken),
          secureStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(storableUser)),
        ]);

        setState({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isLoading: false,
          isAuthenticated: true,
        });

        // Schedule proactive refresh
        scheduleTokenRefresh(data.accessToken);

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
      await clearAuthState();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  const refreshTokens = useCallback(async (): Promise<boolean> => {
    const currentRefreshToken = await secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!currentRefreshToken) {
      return false;
    }
    return performTokenRefresh(currentRefreshToken);
  }, []);

  // Create a wrapper that returns the new access token for the API client
  const refreshTokensForApi = useCallback(async (): Promise<string | null> => {
    const success = await refreshTokens();
    if (success) {
      return secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
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
