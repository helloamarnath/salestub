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
  ToastAndroid,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useNotifications } from '@/contexts/notification-context';
import { Colors, Palette } from '@/constants/theme';
import { getDashboardData } from '@/lib/api/dashboard';
import { completeActivity } from '@/lib/api/activities';
import { getOrganizationSettings } from '@/lib/api/organization';
import {
  DashboardStats,
  DashboardActivities,
  DashboardActivity,
  TodaysAgendaItem,
} from '@/types/dashboard';
import {
  PipelineProgress,
  ActivityFeed,
  QuickActions,
  RevenueChart,
  LifecycleCard,
  OverdueBanner,
  TodaysAgenda,
  PerformanceTile,
} from '@/components/dashboard';

function formatCurrency(value: number, symbol: string): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (absValue >= 10000000) {
    return `${sign}${symbol}${(absValue / 10000000).toFixed(1)}Cr`;
  }
  if (absValue >= 100000) {
    return `${sign}${symbol}${(absValue / 100000).toFixed(1)}L`;
  }
  if (absValue >= 1000) {
    return `${sign}${symbol}${(absValue / 1000).toFixed(1)}K`;
  }
  return `${sign}${symbol}${absValue.toFixed(0)}`;
}

function todayKey(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `dashboard_overdue_dismissed_${yyyy}-${mm}-${dd}`;
}

function showToast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('', msg);
  }
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
  const [overdueDismissed, setOverdueDismissed] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const fetchDashboardData = useCallback(async () => {
    if (!accessToken) return;

    try {
      const [{ stats: statsResponse, activities: activitiesResponse }, orgResponse] =
        await Promise.all([
          getDashboardData(accessToken),
          getOrganizationSettings(accessToken),
        ]);

      if (orgResponse.success && orgResponse.data?.currency?.symbol) {
        setCurrencySymbol(orgResponse.data.currency.symbol);
      }

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
    (async () => {
      try {
        if (Platform.OS === 'web') {
          const dismissed = typeof window !== 'undefined'
            ? window.localStorage?.getItem(todayKey())
            : null;
          setOverdueDismissed(dismissed === '1');
        } else {
          const dismissed = await SecureStore.getItemAsync(todayKey());
          setOverdueDismissed(dismissed === '1');
        }
      } catch {
        setOverdueDismissed(false);
      }
    })();
  }, []);

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

  const fmtCurrency = useCallback(
    (value: number) => formatCurrency(value, currencySymbol),
    [currencySymbol]
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.firstName || 'User';

  const gradientColors: [string, string, string] = [
    colors.background,
    colors.card,
    colors.background,
  ];

  const headerBorderColor = isDark
    ? 'rgba(255,255,255,0.05)'
    : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? 'white' : colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';

  // Navigation handlers
  const handleAddLead = () => router.push('/(tabs)/leads/create' as any);
  const handleAddTask = () => router.push('/activities/create' as any);
  const handleAddContact = () =>
    router.push('/(tabs)/contacts/customer/create' as any);
  const handleLogVisit = () => showToast('Visits coming soon');
  const handleCreateQuote = () => router.push('/(tabs)/quotes/create' as any);
  const handleCreateInvoice = () => router.push('/invoices/create' as any);
  const handleImportLeads = () => router.push('/export-import' as any);
  const handleSendWhatsApp = () => showToast('WhatsApp coming soon');
  const handleNewWorkflow = () => showToast('Workflows coming soon');

  const handleViewAllActivities = () => router.push('/activities' as any);
  const handleActivityPress = (activity: DashboardActivity) =>
    router.push(`/activities/${activity.id}` as any);

  const handleAgendaPress = (item: TodaysAgendaItem) =>
    router.push(`/activities/${item.id}` as any);

  const handleAgendaComplete = async (item: TodaysAgendaItem) => {
    if (!accessToken) return;
    try {
      const res = await completeActivity(accessToken, item.id);
      if (res.success) {
        showToast('Marked as complete');
        setStats((prev) =>
          prev
            ? {
                ...prev,
                todaysAgenda: prev.todaysAgenda.filter((a) => a.id !== item.id),
              }
            : prev
        );
        fetchDashboardData();
      } else {
        showToast(res.error?.message || 'Failed to complete');
      }
    } catch (e) {
      showToast('Failed to complete');
    }
  };

  const handleDismissOverdue = async () => {
    setOverdueDismissed(true);
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.localStorage?.setItem(todayKey(), '1');
        }
      } else {
        await SecureStore.setItemAsync(todayKey(), '1');
      }
    } catch {}
  };

  const handleOverduePress = () =>
    router.push('/activities?filter=overdue' as any);

  const overdueCount = stats?.overdueActivitiesCount ?? 0;
  const showOverdueBanner = overdueCount > 0 && !overdueDismissed;

  const wonCountAllTime = stats?.wonCountAllTime ?? 0;
  const wonValue = stats?.leadsWonValue ?? 0;
  const avgDealValue = wonCountAllTime > 0 ? wonValue / wonCountAllTime : 0;

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
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
                    {firstName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 160 }}
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
              <Ionicons name="alert-circle-outline" size={48} color={Palette.red} />
              <Text style={[styles.errorText, { color: textColor }]}>
                {error}
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                onPress={fetchDashboardData}
              >
                <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Overdue banner */}
              {showOverdueBanner && (
                <OverdueBanner
                  count={overdueCount}
                  onPress={handleOverduePress}
                  onDismiss={handleDismissOverdue}
                />
              )}

              {/* Lifecycle grid */}
              <View style={styles.statsSection}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Leads Overview
                </Text>
                <View style={styles.statsGrid}>
                  <LifecycleCard
                    title="Total Leads"
                    count={stats?.totalLeads ?? 0}
                    value={stats?.totalLeadsValue ?? 0}
                    icon="people-outline"
                    accent="blue"
                    formatCurrency={fmtCurrency}
                    onPress={() => router.push('/(tabs)/leads' as any)}
                  />
                  <LifecycleCard
                    title="Untouched"
                    count={stats?.untouchedLeads ?? 0}
                    value={stats?.untouchedLeadsValue ?? 0}
                    icon="time-outline"
                    accent="red"
                    alert={(stats?.untouchedLeads ?? 0) > 0}
                    formatCurrency={fmtCurrency}
                    onPress={() =>
                      router.push('/(tabs)/leads?status=untouched' as any)
                    }
                  />
                  <LifecycleCard
                    title="Contacted"
                    count={stats?.contactedLeads ?? 0}
                    value={stats?.contactedLeadsValue ?? 0}
                    icon="chatbubbles-outline"
                    accent="purple"
                    formatCurrency={fmtCurrency}
                    onPress={() =>
                      router.push('/(tabs)/leads?status=contacted' as any)
                    }
                  />
                  <LifecycleCard
                    title="Won"
                    count={stats?.wonCountAllTime ?? 0}
                    value={stats?.leadsWonValue ?? 0}
                    icon="trophy-outline"
                    accent="green"
                    formatCurrency={fmtCurrency}
                    onPress={() =>
                      router.push('/(tabs)/leads?stageType=CLOSED_WON' as any)
                    }
                  />
                  <LifecycleCard
                    title="Lost"
                    count={stats?.lostCountAllTime ?? 0}
                    value={stats?.leadsLostValue ?? 0}
                    icon="close-circle-outline"
                    accent="muted"
                    formatCurrency={fmtCurrency}
                    onPress={() =>
                      router.push('/(tabs)/leads?stageType=CLOSED_LOST' as any)
                    }
                  />
                </View>
              </View>

              {/* Performance tile */}
              <View style={styles.section}>
                <PerformanceTile
                  winRate={stats?.winRate ?? 0}
                  avgTimeToCloseDays={stats?.avgTimeToCloseDays ?? 0}
                  avgDealValue={avgDealValue}
                  formatCurrency={fmtCurrency}
                  onPress={() => showToast('Analytics coming soon')}
                />
              </View>

              {/* Quick Actions */}
              <View style={styles.section}>
                <QuickActions
                  onAddLead={handleAddLead}
                  onAddTask={handleAddTask}
                  onAddContact={handleAddContact}
                  onLogVisit={handleLogVisit}
                  onCreateQuote={handleCreateQuote}
                  onCreateInvoice={handleCreateInvoice}
                  onImportLeads={handleImportLeads}
                  onSendWhatsApp={handleSendWhatsApp}
                  onNewWorkflow={handleNewWorkflow}
                />
              </View>

              {/* Today's Agenda */}
              <View style={styles.section}>
                <TodaysAgenda
                  items={stats?.todaysAgenda ?? []}
                  isLoading={isLoading}
                  onItemPress={handleAgendaPress}
                  onComplete={handleAgendaComplete}
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
              {stats && stats.openLeadsByStage.length > 0 && (
                <View style={styles.section}>
                  <PipelineProgress
                    stages={stats.openLeadsByStage}
                    totalValue={stats.totalPipelineValue}
                    currencySymbol={currencySymbol}
                  />
                </View>
              )}

              {/* Revenue Chart */}
              {stats && stats.revenueWonByMonth.length > 0 && (
                <View style={styles.section}>
                  <RevenueChart data={stats.revenueWonByMonth} currencySymbol={currencySymbol} />
                </View>
              )}

              {/* Top Companies */}
              {stats && stats.topCompanies.length > 0 && (
                <View style={styles.section}>
                  <View style={[styles.topCompaniesCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                    <View style={styles.topCompaniesHeader}>
                      <Ionicons
                        name="business-outline"
                        size={18}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.sectionTitle,
                          { color: textColor, marginBottom: 0 },
                        ]}
                      >
                        Top Companies
                      </Text>
                    </View>
                    {stats.topCompanies.map((company, index) => (
                      <View key={company.id} style={styles.companyItem}>
                        <View style={styles.companyRank}>
                          <Text
                            style={[
                              styles.companyRankText,
                              { color: colors.primary },
                            ]}
                          >
                            {index + 1}
                          </Text>
                        </View>
                        <Text
                          style={[styles.companyName, { color: textColor }]}
                          numberOfLines={1}
                        >
                          {company.name}
                        </Text>
                        <View style={styles.dealBadge}>
                          <Text style={styles.dealBadgeText}>
                            {company.leadCount} leads
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
    backgroundColor: Palette.red,
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
  topCompaniesCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
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
    backgroundColor: 'rgba(59, 130, 246, 0.2)', // Palette.blue at 20% opacity
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyRankText: {
    fontSize: 12,
    fontWeight: '600',
  },
  companyName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  dealBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)', // Palette.emerald at 15% opacity
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dealBadgeText: {
    color: Palette.emerald,
    fontSize: 11,
    fontWeight: '500',
  },
});
