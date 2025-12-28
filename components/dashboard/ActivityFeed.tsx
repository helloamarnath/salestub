import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { DashboardActivities, DashboardActivity } from '@/types/dashboard';

interface ActivityFeedProps {
  activities: DashboardActivities;
  onActivityPress?: (activity: DashboardActivity) => void;
  onViewAllPress?: () => void;
}

const ACTIVITY_TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  TASK: 'checkbox-outline',
  CALL: 'call-outline',
  MEETING: 'calendar-outline',
  EMAIL: 'mail-outline',
  NOTE: 'document-text-outline',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  if (diffDays === 1) {
    return 'Tomorrow';
  }
  if (diffDays === -1) {
    return 'Yesterday';
  }
  if (diffDays < -1) {
    return `${Math.abs(diffDays)} days ago`;
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getRelatedName(activity: DashboardActivity): string | null {
  if (activity.contact) {
    return `${activity.contact.firstName || ''} ${activity.contact.lastName || ''}`.trim();
  }
  if (activity.company?.name) {
    return activity.company.name;
  }
  if (activity.deal?.title) {
    return activity.deal.title;
  }
  if (activity.lead?.title) {
    return activity.lead.title;
  }
  return null;
}

interface ActivityItemProps {
  activity: DashboardActivity;
  status: 'overdue' | 'today' | 'upcoming' | 'completed';
  isDark: boolean;
  colors: typeof Colors.light;
  onPress?: (activity: DashboardActivity) => void;
}

function ActivityItem({
  activity,
  status,
  isDark,
  colors,
  onPress,
}: ActivityItemProps) {
  const statusColors = {
    overdue: '#ef4444',
    today: '#f59e0b',
    upcoming: '#3b82f6',
    completed: '#22c55e',
  };

  const icon = ACTIVITY_TYPE_ICONS[activity.type] || 'ellipse-outline';
  const relatedName = getRelatedName(activity);
  const statusColor = statusColors[status];

  return (
    <TouchableOpacity
      style={styles.activityItem}
      onPress={() => onPress?.(activity)}
      activeOpacity={0.7}
    >
      <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
      <View
        style={[
          styles.activityIcon,
          { backgroundColor: `${statusColor}15` },
        ]}
      >
        <Ionicons name={icon} size={16} color={statusColor} />
      </View>
      <View style={styles.activityContent}>
        <Text
          style={[styles.activityTitle, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {activity.title}
        </Text>
        <View style={styles.activityMeta}>
          {relatedName && (
            <Text
              style={[
                styles.activityRelated,
                {
                  color: isDark
                    ? 'rgba(255,255,255,0.5)'
                    : 'rgba(0,0,0,0.5)',
                },
              ]}
              numberOfLines={1}
            >
              {relatedName}
            </Text>
          )}
          {activity.dueDate && (
            <Text
              style={[
                styles.activityTime,
                { color: status === 'overdue' ? '#ef4444' : statusColor },
              ]}
            >
              {formatDate(activity.dueDate)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function ActivityFeed({
  activities,
  onActivityPress,
  onViewAllPress,
}: ActivityFeedProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const totalPending =
    activities.counts.overdue +
    activities.counts.dueToday +
    activities.counts.upcoming;

  // Combine and limit activities to show
  const displayActivities: Array<{
    activity: DashboardActivity;
    status: 'overdue' | 'today' | 'upcoming' | 'completed';
  }> = [];

  activities.overdue.slice(0, 3).forEach((a) =>
    displayActivities.push({ activity: a, status: 'overdue' })
  );
  activities.dueToday.slice(0, 3).forEach((a) =>
    displayActivities.push({ activity: a, status: 'today' })
  );
  activities.upcoming.slice(0, 2).forEach((a) =>
    displayActivities.push({ activity: a, status: 'upcoming' })
  );

  return (
    <View style={styles.container}>
      <BlurView
        intensity={15}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.card,
          {
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(0,0,0,0.03)',
            borderColor: isDark
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(0,0,0,0.1)',
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="list-outline" size={18} color={colors.primary} />
            <Text style={[styles.title, { color: colors.foreground }]}>
              Activities
            </Text>
            {totalPending > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{totalPending}</Text>
              </View>
            )}
          </View>
          {onViewAllPress && (
            <TouchableOpacity onPress={onViewAllPress}>
              <Text style={[styles.viewAll, { color: colors.primary }]}>
                View All
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {displayActivities.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="checkmark-circle-outline"
              size={40}
              color={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
            />
            <Text
              style={[
                styles.emptyText,
                { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' },
              ]}
            >
              All caught up!
            </Text>
          </View>
        ) : (
          <View style={styles.activitiesContainer}>
            {displayActivities.map(({ activity, status }) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                status={status}
                isDark={isDark}
                colors={colors}
                onPress={onActivityPress}
              />
            ))}
          </View>
        )}

        {activities.counts.overdue > 0 && (
          <View
            style={[
              styles.overdueWarning,
              { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
            ]}
          >
            <Ionicons name="warning-outline" size={14} color="#ef4444" />
            <Text style={styles.overdueText}>
              {activities.counts.overdue} overdue{' '}
              {activities.counts.overdue === 1 ? 'task' : 'tasks'}
            </Text>
          </View>
        )}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '500',
  },
  activitiesContainer: {
    gap: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  statusIndicator: {
    width: 3,
    height: 32,
    borderRadius: 2,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityRelated: {
    fontSize: 12,
    flex: 1,
  },
  activityTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
  overdueWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
  },
  overdueText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default ActivityFeed;
