import { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useNotifications } from '@/contexts/notification-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { AppNotification, NotificationType } from '@/lib/notification-service';

const notificationIcons: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  LEAD_CREATED: 'person-add',
  LEAD_ASSIGNED: 'person',
  LEAD_STAGE_CHANGED: 'swap-horizontal',
  LEAD_CONVERTED: 'checkmark-circle',
  DEAL_CREATED: 'briefcase',
  DEAL_STAGE_CHANGED: 'swap-horizontal',
  DEAL_WON: 'trophy',
  DEAL_LOST: 'close-circle',
  DEAL_ASSIGNED: 'briefcase',
  CONTACT_CREATED: 'person-add',
  CONTACT_ASSIGNED: 'person',
  ACTIVITY_REMINDER: 'alarm',
  ACTIVITY_ASSIGNED: 'calendar',
  ACTIVITY_COMPLETED: 'checkmark-done',
  ACTIVITY_OVERDUE: 'warning',
  TASK_ASSIGNED: 'checkbox',
  TASK_DUE_SOON: 'time',
  TASK_OVERDUE: 'alert-circle',
  SYSTEM_ANNOUNCEMENT: 'megaphone',
  WELCOME: 'hand-right',
  SUBSCRIPTION_EXPIRING: 'card',
  STORAGE_WARNING: 'cloud',
};

const notificationColors: Record<NotificationType, string> = {
  LEAD_CREATED: '#3b82f6',
  LEAD_ASSIGNED: '#8b5cf6',
  LEAD_STAGE_CHANGED: '#06b6d4',
  LEAD_CONVERTED: '#22c55e',
  DEAL_CREATED: '#8b5cf6',
  DEAL_STAGE_CHANGED: '#06b6d4',
  DEAL_WON: '#22c55e',
  DEAL_LOST: '#ef4444',
  DEAL_ASSIGNED: '#8b5cf6',
  CONTACT_CREATED: '#3b82f6',
  CONTACT_ASSIGNED: '#8b5cf6',
  ACTIVITY_REMINDER: '#f59e0b',
  ACTIVITY_ASSIGNED: '#3b82f6',
  ACTIVITY_COMPLETED: '#22c55e',
  ACTIVITY_OVERDUE: '#ef4444',
  TASK_ASSIGNED: '#3b82f6',
  TASK_DUE_SOON: '#f59e0b',
  TASK_OVERDUE: '#ef4444',
  SYSTEM_ANNOUNCEMENT: '#8b5cf6',
  WELCOME: '#22c55e',
  SUBSCRIPTION_EXPIRING: '#f59e0b',
  STORAGE_WARNING: '#f59e0b',
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function NotificationItem({
  notification,
  onPress,
  onMarkRead,
  onDelete,
  isDark,
}: {
  notification: AppNotification;
  onPress: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
  isDark: boolean;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const bgColor = notification.isRead
    ? 'transparent'
    : isDark
    ? 'rgba(59, 130, 246, 0.1)'
    : 'rgba(59, 130, 246, 0.05)';

  const icon = notificationIcons[notification.type] || 'notifications';
  const color = notificationColors[notification.type] || '#3b82f6';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.notificationItem,
        { borderBottomColor: borderColor, backgroundColor: bgColor },
      ]}
    >
      <View style={[styles.notificationIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text
            style={[
              styles.notificationTitle,
              { color: textColor, fontWeight: notification.isRead ? '500' : '600' },
            ]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          <Text style={[styles.notificationTime, { color: subtitleColor }]}>
            {formatTimeAgo(notification.createdAt)}
          </Text>
        </View>
        <Text
          style={[styles.notificationBody, { color: subtitleColor }]}
          numberOfLines={2}
        >
          {notification.body}
        </Text>
      </View>
      <View style={styles.notificationActions}>
        {!notification.isRead && (
          <TouchableOpacity
            onPress={onMarkRead}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.actionButton}
          >
            <Ionicons name="checkmark" size={18} color={subtitleColor} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.actionButton}
        >
          <Ionicons name="trash-outline" size={18} color={subtitleColor} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useTheme();
  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    fetchNotifications,
    fetchMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];

  const textColor = isDark ? 'white' : colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const bgColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)';

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationPress = (notification: AppNotification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // Navigate based on entity type
    if (notification.actionUrl) {
      // For now, just go back to tabs
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 10, borderBottomColor: borderColor },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
            <Text style={[styles.markAllText, { color: colors.primary }]}>
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && notifications.length === 0}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Unread count badge */}
        {unreadCount > 0 && (
          <View style={styles.unreadBanner}>
            <BlurView
              intensity={15}
              tint={isDark ? 'dark' : 'light'}
              style={[styles.unreadBannerBlur, { backgroundColor: bgColor }]}
            >
              <Text style={[styles.unreadText, { color: subtitleColor }]}>
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </Text>
            </BlurView>
          </View>
        )}

        {/* Notifications list */}
        <View style={[styles.notificationsContainer, { borderColor }]}>
          <BlurView
            intensity={15}
            tint={isDark ? 'dark' : 'light'}
            style={[styles.notificationsBlur, { backgroundColor: bgColor }]}
          >
            {isLoading && notifications.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIcon, { backgroundColor: bgColor }]}>
                  <Ionicons name="notifications-off-outline" size={48} color={subtitleColor} />
                </View>
                <Text style={[styles.emptyTitle, { color: textColor }]}>No notifications</Text>
                <Text style={[styles.emptySubtitle, { color: subtitleColor }]}>
                  You don't have any notifications yet
                </Text>
              </View>
            ) : (
              <View style={styles.notificationsList}>
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onPress={() => handleNotificationPress(notification)}
                    onMarkRead={() => markAsRead(notification.id)}
                    onDelete={() => deleteNotification(notification.id)}
                    isDark={isDark}
                  />
                ))}
              </View>
            )}

            {/* Load more button */}
            {hasMore && notifications.length > 0 && (
              <TouchableOpacity
                onPress={fetchMore}
                disabled={isLoading}
                style={[styles.loadMoreButton, { borderTopColor: borderColor }]}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                    Load more
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </BlurView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  markAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  unreadBanner: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  unreadBannerBlur: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  unreadText: {
    fontSize: 14,
    textAlign: 'center',
  },
  notificationsContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  notificationsBlur: {},
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  notificationsList: {},
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  notificationTime: {
    fontSize: 12,
  },
  notificationBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
  loadMoreButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
