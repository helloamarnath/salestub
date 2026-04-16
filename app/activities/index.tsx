import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Calendar as BigCalendar } from 'react-native-big-calendar';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { getActivities, getCalendarActivities, completeActivity, cancelActivity } from '@/lib/api/activities';
import type {
  Activity,
  ActivityType,
  ActivityStatus,
  ActivityFilters,
} from '@/types/activity';
import {
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_ICONS,
  ACTIVITY_TYPE_COLORS,
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_COLORS,
  formatActivityDate,
} from '@/types/activity';

// Filter tabs for activities
interface FilterTab {
  id: string;
  label: string;
  status?: ActivityStatus | 'ALL';
  color: string;
}

const FILTER_TABS: FilterTab[] = [
  { id: 'all', label: 'All', status: 'ALL', color: '#6b7280' },
  { id: 'pending', label: 'Pending', status: 'PENDING', color: '#f59e0b' },
  { id: 'in_progress', label: 'In Progress', status: 'IN_PROGRESS', color: '#3b82f6' },
  { id: 'completed', label: 'Completed', status: 'COMPLETED', color: '#22c55e' },
];

// Activity type filter tabs
const TYPE_TABS: { id: ActivityType | 'ALL'; label: string; color: string }[] = [
  { id: 'ALL', label: 'All Types', color: '#6b7280' },
  { id: 'TASK', label: 'Tasks', color: ACTIVITY_TYPE_COLORS.TASK },
  { id: 'CALL', label: 'Calls', color: ACTIVITY_TYPE_COLORS.CALL },
  { id: 'MEETING', label: 'Meetings', color: ACTIVITY_TYPE_COLORS.MEETING },
  { id: 'EMAIL', label: 'Emails', color: ACTIVITY_TYPE_COLORS.EMAIL },
  { id: 'NOTE', label: 'Notes', color: ACTIVITY_TYPE_COLORS.NOTE },
];

// Activity card component
function ActivityCard({
  activity,
  onPress,
  onComplete,
  onCancel,
  isDark,
  colors,
}: {
  activity: Activity;
  onPress: () => void;
  onComplete: () => void;
  onCancel: () => void;
  isDark: boolean;
  colors: typeof Colors.light;
}) {
  const typeColor = ACTIVITY_TYPE_COLORS[activity.type];
  const statusColor = ACTIVITY_STATUS_COLORS[activity.status];
  const icon = ACTIVITY_TYPE_ICONS[activity.type] as keyof typeof Ionicons.glyphMap;
  const isOverdue =
    activity.dueDate &&
    new Date(activity.dueDate) < new Date() &&
    activity.status !== 'COMPLETED' &&
    activity.status !== 'CANCELLED';

  // Get related entity name
  const relatedName =
    activity.contact
      ? `${activity.contact.firstName || ''} ${activity.contact.lastName || ''}`.trim()
      : activity.company?.name ||
        activity.deal?.title ||
        activity.lead?.title ||
        null;

  return (
    <TouchableOpacity
      style={[
        styles.activityCard,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Left indicator */}
      <View
        style={[
          styles.activityIndicator,
          { backgroundColor: isOverdue ? '#ef4444' : typeColor },
        ]}
      />

      {/* Icon */}
      <View style={[styles.activityIcon, { backgroundColor: `${typeColor}15` }]}>
        <Ionicons name={icon} size={20} color={typeColor} />
      </View>

      {/* Content */}
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Text
            style={[styles.activityTitle, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {activity.title}
          </Text>
          <View
            style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {ACTIVITY_STATUS_LABELS[activity.status]}
            </Text>
          </View>
        </View>

        <View style={styles.activityMeta}>
          <View style={styles.typeBadge}>
            <Text style={[styles.typeText, { color: typeColor }]}>
              {ACTIVITY_TYPE_LABELS[activity.type]}
            </Text>
          </View>

          {relatedName && (
            <Text
              style={[
                styles.relatedText,
                { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' },
              ]}
              numberOfLines={1}
            >
              {relatedName}
            </Text>
          )}
        </View>

        {activity.dueDate && (
          <View style={styles.dueDateRow}>
            <Ionicons
              name="time-outline"
              size={12}
              color={isOverdue ? '#ef4444' : isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}
            />
            <Text
              style={[
                styles.dueDate,
                {
                  color: isOverdue
                    ? '#ef4444'
                    : isDark
                    ? 'rgba(255,255,255,0.5)'
                    : 'rgba(0,0,0,0.5)',
                },
              ]}
            >
              {formatActivityDate(activity.dueDate)}
            </Text>
            {isOverdue && (
              <Text style={styles.overdueText}>Overdue</Text>
            )}
          </View>
        )}
      </View>

      {/* Quick actions */}
      {activity.status !== 'COMPLETED' && activity.status !== 'CANCELLED' && (
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#22c55e15' }]}
            onPress={(e) => {
              e.stopPropagation();
              onComplete();
            }}
          >
            <Ionicons name="checkmark" size={16} color="#22c55e" />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ActivitiesScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('all');
  const [activeTypeFilter, setActiveTypeFilter] = useState<ActivityType | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState<'month' | 'week' | 'day'>('week');
  const [calendarActivities, setCalendarActivities] = useState<Activity[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];

  const fetchActivities = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      if (!accessToken) return;

      if (pageNum === 1) {
        isRefresh ? setRefreshing(true) : setIsLoading(true);
      }

      try {
        const statusFilter = FILTER_TABS.find((t) => t.id === activeStatusFilter);
        const filters: ActivityFilters = {
          page: pageNum,
          limit: 20,
          search: searchQuery || undefined,
          status: statusFilter?.status !== 'ALL' ? statusFilter?.status : undefined,
          type: activeTypeFilter !== 'ALL' ? activeTypeFilter : undefined,
        };

        const response = await getActivities(accessToken, filters);

        if (response.success && response.data) {
          const newActivities = response.data.data;
          if (pageNum === 1) {
            // Deduplicate in case API returns duplicates
            const seen = new Set<string>();
            const uniqueActivities = newActivities.filter((a) => {
              if (seen.has(a.id)) return false;
              seen.add(a.id);
              return true;
            });
            setActivities(uniqueActivities);
          } else {
            // Deduplicate when appending to avoid duplicate keys
            setActivities((prev) => {
              const existingIds = new Set(prev.map((a) => a.id));
              const uniqueNew = newActivities.filter((a) => !existingIds.has(a.id));
              return [...prev, ...uniqueNew];
            });
          }
          setTotalCount(response.data.pagination.total);
          setHasMore(pageNum < response.data.pagination.totalPages);
          setPage(pageNum);
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, activeStatusFilter, activeTypeFilter, searchQuery]
  );

  useEffect(() => {
    fetchActivities(1);
  }, [fetchActivities]);

  // Fetch calendar activities when in calendar mode
  const fetchCalendarData = useCallback(async () => {
    if (!accessToken || viewMode !== 'calendar') return;
    setCalendarLoading(true);
    try {
      const startDate = new Date(calendarDate);
      startDate.setDate(1);
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date(calendarDate);
      endDate.setMonth(endDate.getMonth() + 2);

      const response = await getCalendarActivities(accessToken, startDate, endDate);
      if (response.success && response.data) {
        setCalendarActivities(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch calendar activities:', error);
    } finally {
      setCalendarLoading(false);
    }
  }, [accessToken, calendarDate, viewMode]);

  useEffect(() => {
    if (viewMode === 'calendar') {
      fetchCalendarData();
    }
  }, [fetchCalendarData]);

  // Map activities to calendar events
  const calendarEvents = useMemo(() => {
    return calendarActivities
      .filter(a => a.dueDate)
      .map(a => ({
        title: a.title,
        start: new Date(a.dueDate!),
        end: new Date(new Date(a.dueDate!).getTime() + (a.duration || 30) * 60 * 1000),
        color: ACTIVITY_TYPE_COLORS[a.type] || '#3b82f6',
        activity: a,
      }));
  }, [calendarActivities]);

  const handleRefresh = useCallback(() => {
    fetchActivities(1, true);
    if (viewMode === 'calendar') fetchCalendarData();
  }, [fetchActivities, fetchCalendarData, viewMode]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchActivities(page + 1);
    }
  }, [isLoading, hasMore, page, fetchActivities]);

  const handleComplete = useCallback(
    async (activityId: string) => {
      if (!accessToken) return;

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const response = await completeActivity(accessToken, activityId);
        if (response.success && response.data) {
          setActivities((prev) =>
            prev.map((a) =>
              a.id === activityId ? { ...a, status: 'COMPLETED' } : a
            )
          );
        }
      } catch (error) {
        console.error('Failed to complete activity:', error);
      }
    },
    [accessToken]
  );

  const handleActivityPress = useCallback((activity: Activity) => {
    router.push(`/activities/${activity.id}` as any);
  }, []);

  const handleCreateActivity = useCallback(() => {
    router.push('/activities/create' as any);
  }, []);

  const renderFilterTab = (filter: FilterTab) => {
    const isActive = activeStatusFilter === filter.id;
    const inactiveBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
    const inactiveBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    return (
      <TouchableOpacity
        key={filter.id}
        style={[
          styles.filterTab,
          {
            backgroundColor: isActive ? filter.color : inactiveBg,
            borderColor: isActive ? filter.color : inactiveBorder,
          },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setActiveStatusFilter(filter.id);
        }}
      >
        {!isActive && (
          <View style={[styles.filterDot, { backgroundColor: filter.color }]} />
        )}
        <Text
          style={[
            styles.filterText,
            {
              color: isActive
                ? 'white'
                : isDark
                ? 'rgba(255,255,255,0.7)'
                : 'rgba(0,0,0,0.6)',
            },
          ]}
        >
          {filter.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderTypeTab = (type: typeof TYPE_TABS[number]) => {
    const isActive = activeTypeFilter === type.id;
    const inactiveBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';

    return (
      <TouchableOpacity
        key={type.id}
        style={[
          styles.typeTab,
          {
            backgroundColor: isActive ? `${type.color}15` : inactiveBg,
            borderColor: isActive ? type.color : 'transparent',
          },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setActiveTypeFilter(type.id);
        }}
      >
        <Text
          style={[
            styles.typeTabText,
            {
              color: isActive
                ? type.color
                : isDark
                ? 'rgba(255,255,255,0.5)'
                : 'rgba(0,0,0,0.5)',
            },
          ]}
        >
          {type.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderActivity = ({ item }: { item: Activity }) => (
    <ActivityCard
      activity={item}
      onPress={() => handleActivityPress(item)}
      onComplete={() => handleComplete(item.id)}
      onCancel={() => {}}
      isDark={isDark}
      colors={colors}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="calendar-outline"
        size={64}
        color={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
      />
      <Text
        style={[
          styles.emptyTitle,
          { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' },
        ]}
      >
        No activities found
      </Text>
      <Text
        style={[
          styles.emptySubtitle,
          { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' },
        ]}
      >
        Create your first activity to get started
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={handleCreateActivity}
      >
        <Ionicons name="add" size={20} color="white" />
        <Text style={styles.emptyButtonText}>Create Activity</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Activities
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' },
              ]}
            >
              {totalCount} total
            </Text>
          </View>
          {/* View toggle */}
          <View style={{ flexDirection: 'row', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderRadius: 10, padding: 2 }}>
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setViewMode('list'); }}
              style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: viewMode === 'list' ? (isDark ? 'rgba(255,255,255,0.15)' : '#fff') : 'transparent' }}
            >
              <Ionicons name="list" size={18} color={viewMode === 'list' ? colors.primary : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)')} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setViewMode('calendar'); }}
              style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: viewMode === 'calendar' ? (isDark ? 'rgba(255,255,255,0.15)' : '#fff') : 'transparent' }}
            >
              <Ionicons name="calendar" size={18} color={viewMode === 'calendar' ? colors.primary : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)')} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={handleCreateActivity}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search bar — only in list mode */}
        {viewMode === 'list' && (
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.03)',
              borderColor: isDark
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search activities..."
            placeholderTextColor={
              isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
            }
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={() => fetchActivities(1)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons
                name="close-circle"
                size={18}
                color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
              />
            </TouchableOpacity>
          )}
        </View>
        )}

        {/* Filters — only show in list mode */}
        {viewMode === 'list' && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScrollView}
              contentContainerStyle={styles.filterContent}
            >
              {FILTER_TABS.map(renderFilterTab)}
            </ScrollView>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.typeScrollView}
              contentContainerStyle={styles.typeContent}
            >
              {TYPE_TABS.map(renderTypeTab)}
            </ScrollView>
          </>
        )}
      </View>

      {/* Content */}
      {viewMode === 'list' ? (
        // List View
        isLoading && activities.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={activities}
            renderItem={renderActivity}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              activities.length === 0 && styles.emptyList,
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        // Calendar View
        <View style={{ flex: 1 }}>
          {/* Calendar Mode Toggle */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', paddingVertical: 8, gap: 4 }}>
            {(['month', 'week', 'day'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCalendarMode(mode); }}
                style={{
                  paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8,
                  backgroundColor: calendarMode === mode
                    ? (isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)')
                    : 'transparent',
                }}
              >
                <Text style={{
                  fontSize: 13, fontWeight: calendarMode === mode ? '700' : '500',
                  color: calendarMode === mode ? colors.primary : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'),
                  textTransform: 'capitalize',
                }}>
                  {mode}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {calendarLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <BigCalendar
              events={calendarEvents}
              height={Dimensions.get('window').height - 220}
              mode={calendarMode === 'month' ? 'month' : calendarMode === 'day' ? 'day' : 'week'}
              date={calendarDate}
              onPressEvent={(event) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const activity = (event as any).activity as Activity;
                if (activity) router.push(`/activities/${activity.id}` as any);
              }}
              onPressCell={(date) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/activities/create' as any);
              }}
              onSwipeEnd={(date) => setCalendarDate(date)}
              swipeEnabled
              showTime
              ampm
              theme={{
                palette: {
                  primary: {
                    main: colors.primary,
                    contrastText: '#fff',
                  },
                  nowIndicator: '#ef4444',
                  gray: {
                    '100': isDark ? '#1e293b' : '#f1f5f9',
                    '200': isDark ? '#334155' : '#e2e8f0',
                    '300': isDark ? '#475569' : '#cbd5e1',
                    '500': isDark ? '#94a3b8' : '#64748b',
                    '800': isDark ? '#f1f5f9' : '#1e293b',
                  },
                },
                typography: {
                  fontFamily: undefined,
                  xs: { fontSize: 10, fontWeight: '500' as const },
                  sm: { fontSize: 12, fontWeight: '500' as const },
                  xl: { fontSize: 18, fontWeight: '700' as const },
                },
              }}
              eventCellStyle={(event) => ({
                backgroundColor: (event as any).color || colors.primary,
                borderRadius: 6,
                borderWidth: 0,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.15,
                shadowRadius: 3,
              })}
              calendarCellStyle={{
                borderColor: isDark ? '#1e293b' : '#e2e8f0',
              }}
              headerContainerStyle={{
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                borderBottomWidth: 1,
                borderBottomColor: isDark ? '#1e293b' : '#e2e8f0',
                overflow: 'visible',
              }}
              dayHeaderHighlightColor={isDark ? '#1e40af' : '#dbeafe'}
              bodyContainerStyle={{
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
              }}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    marginLeft: 8,
  },
  filterScrollView: {
    marginBottom: 8,
  },
  filterContent: {
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  typeScrollView: {
    marginBottom: 8,
  },
  typeContent: {
    gap: 6,
  },
  typeTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeTabText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyList: {
    flex: 1,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  activityIndicator: {
    width: 3,
    height: '100%',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  activityContent: {
    flex: 1,
    gap: 4,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    backgroundColor: 'transparent',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  relatedText: {
    fontSize: 12,
    flex: 1,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dueDate: {
    fontSize: 11,
  },
  overdueText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '600',
    backgroundColor: '#ef444415',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 16,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
});
