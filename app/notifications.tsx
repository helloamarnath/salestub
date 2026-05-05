import { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useNotifications } from '@/contexts/notification-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors, Palette } from '@/constants/theme';
import { AppNotification, NotificationType } from '@/lib/notification-service';

const READ_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
] as const;

type ReadFilter = (typeof READ_FILTERS)[number]['id'];

// Group raw types into the picker menu — same set the web shows in its dropdown,
// labelled for human eyes.
const TYPE_OPTIONS: { value: NotificationType | 'all'; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'LEAD_CREATED', label: 'Lead created' },
  { value: 'LEAD_ASSIGNED', label: 'Lead assigned' },
  { value: 'LEAD_STAGE_CHANGED', label: 'Lead stage changed' },
  { value: 'LEAD_CONVERTED', label: 'Lead converted' },
  { value: 'LEAD_WON', label: 'Lead won' },
  { value: 'LEAD_LOST', label: 'Lead lost' },
  { value: 'CONTACT_CREATED', label: 'Contact created' },
  { value: 'CONTACT_ASSIGNED', label: 'Contact assigned' },
  { value: 'ACTIVITY_REMINDER', label: 'Activity reminder' },
  { value: 'ACTIVITY_ASSIGNED', label: 'Activity assigned' },
  { value: 'ACTIVITY_COMPLETED', label: 'Activity completed' },
  { value: 'ACTIVITY_OVERDUE', label: 'Activity overdue' },
  { value: 'TASK_ASSIGNED', label: 'Task assigned' },
  { value: 'TASK_DUE_SOON', label: 'Task due soon' },
  { value: 'TASK_OVERDUE', label: 'Task overdue' },
  { value: 'SYSTEM_ANNOUNCEMENT', label: 'System announcement' },
  { value: 'WELCOME', label: 'Welcome' },
  { value: 'SUBSCRIPTION_EXPIRING', label: 'Subscription expiring' },
  { value: 'STORAGE_WARNING', label: 'Storage warning' },
];

const notificationIcons: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  LEAD_CREATED: 'person-add',
  LEAD_ASSIGNED: 'person',
  LEAD_STAGE_CHANGED: 'swap-horizontal',
  LEAD_CONVERTED: 'checkmark-circle',
  LEAD_WON: 'trophy',
  LEAD_LOST: 'close-circle',
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
  LEAD_CREATED: Palette.indigo,
  LEAD_ASSIGNED: Palette.purple,
  LEAD_STAGE_CHANGED: Palette.cyan,
  LEAD_CONVERTED: Palette.emerald,
  LEAD_WON: Palette.emerald,
  LEAD_LOST: Palette.red,
  CONTACT_CREATED: Palette.indigo,
  CONTACT_ASSIGNED: Palette.purple,
  ACTIVITY_REMINDER: Palette.amber,
  ACTIVITY_ASSIGNED: Palette.indigo,
  ACTIVITY_COMPLETED: Palette.emerald,
  ACTIVITY_OVERDUE: Palette.red,
  TASK_ASSIGNED: Palette.indigo,
  TASK_DUE_SOON: Palette.amber,
  TASK_OVERDUE: Palette.red,
  SYSTEM_ANNOUNCEMENT: Palette.purple,
  WELCOME: Palette.emerald,
  SUBSCRIPTION_EXPIRING: Palette.amber,
  STORAGE_WARNING: Palette.amber,
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
  const colors = Colors[isDark ? 'dark' : 'light'];
  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const bgColor = notification.isRead
    ? 'transparent'
    : isDark
    ? 'rgba(59, 130, 246, 0.1)'
    : 'rgba(59, 130, 246, 0.05)';

  const icon = notificationIcons[notification.type] || 'notifications';
  const color = notificationColors[notification.type] || colors.primary;

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

  const gradientColors: [string, string, string] = [colors.background, colors.card, colors.background] as [string, string, string];

  const textColor = isDark ? 'white' : colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const bgColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)';

  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');
  const [typeSheetOpen, setTypeSheetOpen] = useState(false);

  const fetchParams = useMemo(
    () => ({
      unreadOnly: readFilter === 'unread' ? true : undefined,
      type: typeFilter === 'all' ? undefined : (typeFilter as NotificationType),
    }),
    [readFilter, typeFilter],
  );

  // Refetch whenever filters change
  useEffect(() => {
    fetchNotifications(fetchParams);
  }, [fetchNotifications, fetchParams]);

  const handleRefresh = useCallback(async () => {
    await fetchNotifications(fetchParams);
  }, [fetchNotifications, fetchParams]);

  const activeTypeLabel = useMemo(
    () => TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label ?? 'All types',
    [typeFilter],
  );

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

      {/* Filter row — All/Unread tabs + Type picker */}
      <View style={[styles.filterRow, { borderBottomColor: borderColor }]}>
        <View style={[styles.tabSegment, { backgroundColor: bgColor }]}>
          {READ_FILTERS.map((f) => {
            const active = readFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.tabSegmentItem,
                  active && { backgroundColor: colors.primary },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setReadFilter(f.id);
                }}
              >
                <Text
                  style={{
                    color: active ? colors.primaryForeground : textColor,
                    fontSize: 13,
                    fontWeight: '600',
                  }}
                >
                  {f.label}
                </Text>
                {f.id === 'unread' && unreadCount > 0 && (
                  <View
                    style={[
                      styles.tabBadge,
                      {
                        backgroundColor: active
                          ? `${colors.primaryForeground}30`
                          : Palette.red,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? colors.primaryForeground : 'white',
                        fontSize: 10,
                        fontWeight: '700',
                      }}
                    >
                      {unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.typeButton, { backgroundColor: bgColor, borderColor }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setTypeSheetOpen(true);
          }}
        >
          <Ionicons name="funnel-outline" size={14} color={textColor} />
          <Text style={[styles.typeButtonText, { color: textColor }]} numberOfLines={1}>
            {activeTypeLabel}
          </Text>
          <Ionicons name="chevron-down" size={14} color={subtitleColor} />
        </TouchableOpacity>
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

      {/* Type picker sheet */}
      <Modal
        visible={typeSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTypeSheetOpen(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setTypeSheetOpen(false)}
        >
          <Pressable
            style={[styles.sheetContent, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.sheetHeader, { borderBottomColor: borderColor }]}>
              <Text style={[styles.sheetTitle, { color: textColor }]}>Filter by type</Text>
              <TouchableOpacity onPress={() => setTypeSheetOpen(false)}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 480 }}>
              {TYPE_OPTIONS.map((opt) => {
                const active = typeFilter === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.sheetOption,
                      { borderBottomColor: borderColor },
                      active && { backgroundColor: `${colors.primary}15` },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setTypeFilter(opt.value);
                      setTypeSheetOpen(false);
                    }}
                  >
                    <Text style={[styles.sheetOptionLabel, { color: textColor }]}>
                      {opt.label}
                    </Text>
                    {active && (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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

  /* Filter row */
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tabSegment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    gap: 3,
  },
  tabSegmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  typeButtonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },

  /* Type sheet */
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 18, fontWeight: '600' },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sheetOptionLabel: { fontSize: 15, fontWeight: '500' },
});
