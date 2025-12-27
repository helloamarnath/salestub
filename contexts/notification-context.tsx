import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import {
  notificationService,
  AppNotification,
  NotificationQueryParams,
} from '@/lib/notification-service';
import { useAuth } from './auth-context';

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  fetchNotifications: (params?: NotificationQueryParams) => Promise<void>;
  fetchMore: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  refreshRecent: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

const POLL_INTERVAL = 30000; // 30 seconds

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { accessToken, isAuthenticated } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const appState = useRef(AppState.currentState);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !accessToken) return;
    try {
      const response = await notificationService.getUnreadCount(accessToken);
      if (response.success && response.data) {
        setUnreadCount(response.data.unreadCount);
        await notificationService.setBadgeCount(response.data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, [isAuthenticated, accessToken]);

  const refreshRecent = useCallback(async () => {
    if (!isAuthenticated || !accessToken) return;
    try {
      const response = await notificationService.getRecent(accessToken, 10);
      if (response.success && response.data) {
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unreadCount);
        await notificationService.setBadgeCount(response.data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to fetch recent notifications:', err);
    }
  }, [isAuthenticated, accessToken]);

  const fetchNotifications = useCallback(
    async (params: NotificationQueryParams = {}) => {
      if (!isAuthenticated || !accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await notificationService.getNotifications(accessToken, {
          page: 1,
          limit: 20,
          ...params,
        });
        if (response.success && response.data) {
          setNotifications(response.data.data);
          setPage(response.data.meta.page);
          setHasMore(response.data.meta.page < response.data.meta.totalPages);
        } else {
          setError(response.error?.message || 'Failed to fetch notifications');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, accessToken]
  );

  const fetchMore = useCallback(async () => {
    if (!isAuthenticated || !accessToken || isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const response = await notificationService.getNotifications(accessToken, {
        page: nextPage,
        limit: 20,
      });
      if (response.success && response.data) {
        setNotifications((prev) => [...prev, ...response.data!.data]);
        setPage(response.data.meta.page);
        setHasMore(response.data.meta.page < response.data.meta.totalPages);
      } else {
        setError(response.error?.message || 'Failed to fetch more notifications');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch more notifications');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, accessToken, isLoading, hasMore, page]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!accessToken) return;
      try {
        const response = await notificationService.markAsRead(accessToken, id);
        if (response.success) {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
            )
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
          await notificationService.setBadgeCount(Math.max(0, unreadCount - 1));
        }
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    },
    [accessToken, unreadCount]
  );

  const markAllAsRead = useCallback(async () => {
    if (!accessToken) return;
    try {
      const response = await notificationService.markAllAsRead(accessToken);
      if (response.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
        );
        setUnreadCount(0);
        await notificationService.setBadgeCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, [accessToken]);

  const deleteNotification = useCallback(async (id: string) => {
    if (!accessToken) return;
    try {
      const response = await notificationService.deleteNotification(accessToken, id);
      if (response.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  }, [accessToken]);

  // Setup push notifications when authenticated
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const setupNotifications = async () => {
      await notificationService.setupAndroidChannel();
      await notificationService.subscribeToPushNotifications(accessToken);
      await refreshUnreadCount();
    };

    setupNotifications();

    // Cleanup on logout
    return () => {
      if (accessToken) {
        notificationService.unsubscribeFromPushNotifications(accessToken);
      }
    };
  }, [isAuthenticated, accessToken, refreshUnreadCount]);

  // Listen for incoming notifications
  useEffect(() => {
    if (!isAuthenticated) return;

    // When notification is received while app is in foreground
    notificationListener.current = notificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        refreshUnreadCount();
      }
    );

    // When user taps on notification
    responseListener.current = notificationService.addNotificationResponseListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log('Notification tapped:', data);

        // Navigate based on notification data
        if (data?.actionUrl) {
          // Parse actionUrl and navigate
          const url = data.actionUrl as string;
          if (url.includes('/leads/')) {
            router.push('/(tabs)');
          } else if (url.includes('/deals/')) {
            router.push('/(tabs)');
          }
        } else {
          // Navigate to notifications screen
          router.push('/notifications' as any);
        }

        // Mark as read if we have the notification ID
        if (data?.notificationId) {
          markAsRead(data.notificationId as string);
        }
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated, refreshUnreadCount, router, markAsRead]);

  // Poll for unread count
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(refreshUnreadCount, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshUnreadCount]);

  // Refresh on app foreground
  useEffect(() => {
    if (!isAuthenticated) return;

    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          refreshUnreadCount();
        }
        appState.current = nextAppState;
      }
    );

    return () => subscription.remove();
  }, [isAuthenticated, refreshUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        error,
        hasMore,
        page,
        fetchNotifications,
        fetchMore,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshUnreadCount,
        refreshRecent,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
