import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useNotifications } from '@/contexts/notification-context';
import { Colors } from '@/constants/theme';
import { getDashboardData } from '@/lib/api/dashboard';
import { DashboardStats, DashboardActivities, DashboardActivity } from '@/types/dashboard';
import {
  StatCard,
  PipelineProgress,
  ActivityFeed,
  QuickActions,
  RevenueChart,
} from '@/components/dashboard';

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const { unreadCount } = useNotifications();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<DashboardActivities | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const fetchDashboardData = useCallback(async () => {
    if (!accessToken) return;

    try {
      const { stats: statsResponse, activities: activitiesResponse } =
        await getDashboardData(accessToken);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      } else if (statsResponse.error) {
        console.error('Failed to fetch stats:', statsResponse.error.message);
      }

      if (activitiesResponse.success && activitiesResponse.data) {
        setActivities(activitiesResponse.data);
      } else if (activitiesResponse.error) {
        console.error('Failed to fetch activities:', activitiesResponse.error.message);
      }

      setError(null);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (!isLoading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.firstName || 'User';

  // Background gradient colors
  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];

  const headerBorderColor = isDark
    ? 'rgba(255,255,255,0.05)'
    : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? 'white' : colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';

  // Navigation handlers
  const handleAddLead = () => router.push('/leads/create' as any);
  const handleAddDeal = () => router.push('/deals/create' as any);
  const handleAddTask = () => router.push('/activities/create' as any);
  const handleAddContact = () => router.push('/contacts/create' as any);
  const handleViewAllActivities = () => router.push('/activities' as any);
  const handleActivityPress = (activity: DashboardActivity) => router.push(`/activities/${activity.id}` as any);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: subtitleColor }]}>
            Loading dashboard...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + 10, borderBottomColor: headerBorderColor },
          ]}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={[styles.greeting, { color: subtitleColor }]}>
                {getGreeting()}
              </Text>
              <Text style={[styles.userName, { color: textColor }]}>
                {firstName}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => router.push('/notifications' as any)}
              >
                <View style={styles.notificationBadge}>
                  <Ionicons
                    name="notifications-outline"
                    size={24}
                    color={textColor}
                  />
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/profile' as any)}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {firstName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
              <Text style={[styles.errorText, { color: textColor }]}>
                {error}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchDashboardData}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Stats Grid */}
              <View style={styles.statsSection}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Overview
                </Text>
                <View style={styles.statsGrid}>
                  <StatCard
                    title="Total Leads"
                    value={stats?.totalLeads || 0}
                    changePercent={stats?.contactsCreated?.changePercent}
                    icon="people-outline"
                    iconColor="#3b82f6"
                    onPress={() => router.push('/leads' as any)}
                  />
                  <StatCard
                    title="Open Deals"
                    value={stats?.totalOpenDeals || 0}
                    changePercent={stats?.dealsWon?.changePercent}
                    icon="briefcase-outline"
                    iconColor="#8b5cf6"
                    onPress={() => router.push('/deals' as any)}
                  />
                  <StatCard
                    title="Contacts"
                    value={stats?.totalContacts || 0}
                    changePercent={stats?.contactsCreated?.changePercent}
                    icon="person-outline"
                    iconColor="#22c55e"
                    onPress={() => router.push('/contacts' as any)}
                  />
                  <StatCard
                    title="Pipeline Value"
                    value={formatCurrency(stats?.totalPipelineValue || 0)}
                    icon="cash-outline"
                    iconColor="#f59e0b"
                    onPress={() => router.push('/deals' as any)}
                  />
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.section}>
                <QuickActions
                  onAddLead={handleAddLead}
                  onAddDeal={handleAddDeal}
                  onAddTask={handleAddTask}
                  onAddContact={handleAddContact}
                />
              </View>

              {/* Activity Feed */}
              {activities && (
                <View style={styles.section}>
                  <ActivityFeed
                    activities={activities}
                    onActivityPress={handleActivityPress}
                    onViewAllPress={handleViewAllActivities}
                  />
                </View>
              )}

              {/* Pipeline Overview */}
              {stats && stats.openDealsByStage.length > 0 && (
                <View style={styles.section}>
                  <PipelineProgress
                    stages={stats.openDealsByStage}
                    totalValue={stats.totalPipelineValue}
                  />
                </View>
              )}

              {/* Revenue Chart */}
              {stats && stats.revenueWonByMonth.length > 0 && (
                <View style={styles.section}>
                  <RevenueChart data={stats.revenueWonByMonth} />
                </View>
              )}

              {/* Top Companies */}
              {stats && stats.topCompanies.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.topCompaniesCard}>
                    <View style={styles.topCompaniesHeader}>
                      <Ionicons
                        name="business-outline"
                        size={18}
                        color={colors.primary}
                      />
                      <Text style={[styles.sectionTitle, { color: textColor, marginBottom: 0 }]}>
                        Top Companies
                      </Text>
                    </View>
                    {stats.topCompanies.map((company, index) => (
                      <View key={company.id} style={styles.companyItem}>
                        <View style={styles.companyRank}>
                          <Text style={styles.companyRankText}>{index + 1}</Text>
                        </View>
                        <Text
                          style={[styles.companyName, { color: textColor }]}
                          numberOfLines={1}
                        >
                          {company.name}
                        </Text>
                        <View style={styles.dealBadge}>
                          <Text style={styles.dealBadgeText}>
                            {company.dealCount} deals
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  header: {
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 14,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    marginRight: 16,
  },
  notificationBadge: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statsSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 18,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
  topCompaniesCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  topCompaniesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  companyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  companyRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyRankText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
  },
  companyName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  dealBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dealBadgeText: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '500',
  },
});
