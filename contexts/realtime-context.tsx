import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { RealtimeClient } from '@/lib/realtime-client';
import { useAuth } from '@/contexts/auth-context';
import { secureStorage, STORAGE_KEYS } from '@/lib/storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.salestub.com';

interface RealtimeApi {
  subscribe: (event: string, handler: (payload: unknown) => void) => () => void;
  /** Fires when the connection re-opens after a drop (not on first connect). */
  onReconnect: (handler: () => void) => () => void;
}

const RealtimeApiContext = createContext<RealtimeApi | null>(null);
const RealtimeConnectedContext = createContext<boolean>(false);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, refreshTokens } = useAuth();
  const clientRef = useRef<RealtimeClient | null>(null);
  const reconnectListenersRef = useRef<Set<() => void>>(new Set());
  const [connected, setConnected] = useState(false);
  const wasConnectedRef = useRef(false);

  const subscribe = useCallback(
    (event: string, handler: (payload: unknown) => void) => {
      const c = clientRef.current;
      if (!c) return () => {};
      return c.on(event, handler);
    },
    [],
  );

  const onReconnect = useCallback((handler: () => void) => {
    reconnectListenersRef.current.add(handler);
    return () => {
      reconnectListenersRef.current.delete(handler);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      clientRef.current?.disconnect();
      clientRef.current = null;
      setConnected(false);
      wasConnectedRef.current = false;
      return;
    }

    if (!clientRef.current) {
      const client = new RealtimeClient({
        baseUrl: API_URL,
        getToken: async () => {
          try {
            return (await secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)) ?? null;
          } catch {
            return null;
          }
        },
        refresh: async () => {
          try {
            return await refreshTokens();
          } catch {
            return false;
          }
        },
      });
      client.onConnectionChange((isConn) => {
        setConnected(isConn);
        if (isConn) {
          if (wasConnectedRef.current) {
            for (const fn of reconnectListenersRef.current) {
              try {
                fn();
              } catch {
                // ignore
              }
            }
          } else {
            wasConnectedRef.current = true;
          }
        }
      });
      clientRef.current = client;
    }

    void clientRef.current.connect();

    // AppState: only disconnect on full `background`. iOS fires `inactive`
    // for transient interruptions (incoming call, Control Center drag, biometric
    // prompt) where keeping the socket alive is correct.
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        void clientRef.current?.connect();
      } else if (state === 'background') {
        clientRef.current?.disconnect();
        wasConnectedRef.current = false;
      }
    });

    return () => {
      sub.remove();
      clientRef.current?.disconnect();
      clientRef.current = null;
      setConnected(false);
      wasConnectedRef.current = false;
    };
  }, [isAuthenticated, refreshTokens]);

  const api = useMemo<RealtimeApi>(
    () => ({ subscribe, onReconnect }),
    [subscribe, onReconnect],
  );

  return (
    <RealtimeApiContext.Provider value={api}>
      <RealtimeConnectedContext.Provider value={connected}>
        {children}
      </RealtimeConnectedContext.Provider>
    </RealtimeApiContext.Provider>
  );
}

export function useRealtime(): RealtimeApi {
  const ctx = useContext(RealtimeApiContext);
  if (!ctx) {
    throw new Error('useRealtime must be used inside <RealtimeProvider>');
  }
  return ctx;
}

export function useRealtimeConnected(): boolean {
  return useContext(RealtimeConnectedContext);
}
