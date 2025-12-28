import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api, ApiResponse } from './api/client';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationType =
  | 'LEAD_CREATED'
  | 'LEAD_ASSIGNED'
  | 'LEAD_STAGE_CHANGED'
  | 'LEAD_CONVERTED'
  | 'DEAL_CREATED'
  | 'DEAL_STAGE_CHANGED'
  | 'DEAL_WON'
  | 'DEAL_LOST'
  | 'DEAL_ASSIGNED'
  | 'CONTACT_CREATED'
  | 'CONTACT_ASSIGNED'
  | 'ACTIVITY_REMINDER'
  | 'ACTIVITY_ASSIGNED'
  | 'ACTIVITY_COMPLETED'
  | 'ACTIVITY_OVERDUE'
  | 'TASK_ASSIGNED'
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE'
  | 'SYSTEM_ANNOUNCEMENT'
  | 'WELCOME'
  | 'SUBSCRIPTION_EXPIRING'
  | 'STORAGE_WARNING';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface AppNotification {
  id: string;
  userId: string;
  orgId: string;
  type: NotificationType;
  title: string;
  body: string;
  priority: NotificationPriority;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  pushSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedNotifications {
  data: AppNotification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
}

class NotificationService {
  private fcmToken: string | null = null;

  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    // Get native FCM token (works with Firebase Admin SDK on backend)
    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      this.fcmToken = tokenData.data;
      console.log('FCM token obtained:', this.fcmToken.substring(0, 20) + '...');
      return this.fcmToken;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  async subscribeToPushNotifications(accessToken: string): Promise<void> {
    const token = await this.registerForPushNotifications();
    if (!token) return;

    try {
      const response = await api.post<{ success: boolean }>(
        '/api/v1/push-notifications/subscribe',
        accessToken,
        {
          fcmToken: token,
          platform: Platform.OS,
          deviceName: Device.deviceName || 'Unknown Device',
        }
      );

      if (response.success) {
        console.log('Push notifications subscribed successfully');
      } else {
        console.error('Failed to subscribe to push notifications:', response.error?.message);
      }
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    }
  }

  async unsubscribeFromPushNotifications(accessToken: string): Promise<void> {
    if (!this.fcmToken) return;

    try {
      const response = await api.delete<{ success: boolean }>(
        '/api/v1/push-notifications/unsubscribe',
        accessToken,
        { fcmToken: this.fcmToken }
      );

      if (response.success) {
        this.fcmToken = null;
        console.log('Push notifications unsubscribed successfully');
      } else {
        console.error('Failed to unsubscribe from push notifications:', response.error?.message);
      }
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
    }
  }

  // Configure Android notification channel
  async setupAndroidChannel(): Promise<void> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3b82f6',
      });
    }
  }

  // API methods for notification history
  async getNotifications(
    accessToken: string,
    params: NotificationQueryParams = {}
  ): Promise<ApiResponse<PaginatedNotifications>> {
    const queryParams: Record<string, string | number | undefined> = {};
    if (params.page) queryParams.page = params.page;
    if (params.limit) queryParams.limit = params.limit;
    if (params.unreadOnly) queryParams.unreadOnly = 'true';
    if (params.type) queryParams.type = params.type;

    return api.get<PaginatedNotifications>(
      '/api/v1/notifications',
      accessToken,
      queryParams
    );
  }

  async getUnreadCount(accessToken: string): Promise<ApiResponse<{ unreadCount: number }>> {
    return api.get<{ unreadCount: number }>(
      '/api/v1/notifications/unread-count',
      accessToken
    );
  }

  async getRecent(
    accessToken: string,
    limit: number = 10
  ): Promise<ApiResponse<{ notifications: AppNotification[]; unreadCount: number }>> {
    return api.get<{ notifications: AppNotification[]; unreadCount: number }>(
      '/api/v1/notifications/recent',
      accessToken,
      { limit }
    );
  }

  async markAsRead(accessToken: string, id: string): Promise<ApiResponse<AppNotification>> {
    return api.patch<AppNotification>(
      `/api/v1/notifications/${id}/read`,
      accessToken
    );
  }

  async markAllAsRead(accessToken: string): Promise<ApiResponse<{ updated: number }>> {
    return api.patch<{ updated: number }>(
      '/api/v1/notifications/read-all',
      accessToken
    );
  }

  async deleteNotification(accessToken: string, id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(
      `/api/v1/notifications/${id}`,
      accessToken
    );
  }

  // Add notification received/response listeners
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Set badge count
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }
}

export const notificationService = new NotificationService();
