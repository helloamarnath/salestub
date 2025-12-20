import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
  FlatList,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { Colors } from '@/constants/theme';
import { getDeals, getDealCounts } from '@/lib/api/deals';
import { getRoleInfo, isSuperAdmin } from '@/lib/api/organization';
import { DealFilterModal, type DealFilterState } from '@/components/filters';
import type { Deal, DealFilters, DealStats } from '@/types/deal';
import {
  DEAL_STAGE_LABELS,
  DEAL_STAGE_COLORS,
  DEAL_STATUS_LABELS,
  DEAL_STATUS_COLORS,
  formatDealValue,
} from '@/types/deal';
import { getContactFullName } from '@/types/contact';

// Deal Item Component
function DealItem({
  deal,
  isDark,
  onPress,
}: {
  deal: Deal;
  isDark: boolean;
  onPress: () => void;
}) {
  const stageColor = DEAL_STAGE_COLORS[deal.stage] || '#3b82f6';
  const statusColor = DEAL_STATUS_COLORS[deal.status] || '#3b82f6';
  const currencySymbol = deal.currency?.symbol || '₹';
  const contactName = deal.contact ? getContactFullName(deal.contact) : '';
  const companyName = deal.company?.name || '';

  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const actionBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'white';

  // Format expected close date
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.dealCard, { backgroundColor: cardBg, borderColor }]}>
        {/* Stage indicator */}
        <View style={[styles.stageIndicator, { backgroundColor: stageColor }]} />

        <View style={styles.dealContent}>
          {/* Header row */}
          <View style={styles.dealHeader}>
            <Text style={[styles.dealTitle, { color: textColor }]} numberOfLines={1}>
              {deal.title}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {DEAL_STATUS_LABELS[deal.status]}
              </Text>
            </View>
          </View>

          {/* Value */}
          <Text style={[styles.dealValue, { color: textColor }]}>
            {formatDealValue(deal.value, currencySymbol)}
          </Text>

          {/* Contact & Company */}
          <View style={styles.dealMeta}>
            {contactName && (
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={14} color={subtitleColor} />
                <Text style={[styles.metaText, { color: subtitleColor }]} numberOfLines={1}>
                  {contactName}
                </Text>
              </View>
            )}
            {companyName && (
              <View style={styles.metaItem}>
                <Ionicons name="business-outline" size={14} color={subtitleColor} />
                <Text style={[styles.metaText, { color: subtitleColor }]} numberOfLines={1}>
                  {companyName}
                </Text>
              </View>
            )}
          </View>

          {/* Footer row */}
          <View style={styles.dealFooter}>
            <View style={[styles.stageBadge, { backgroundColor: `${stageColor}20` }]}>
              <Text style={[styles.stageText, { color: stageColor }]}>
                {DEAL_STAGE_LABELS[deal.stage]}
              </Text>
            </View>
            {deal.expectedCloseDate && (
              <View style={styles.dateContainer}>
                <Ionicons name="calendar-outline" size={14} color={subtitleColor} />
                <Text style={[styles.dateText, { color: subtitleColor }]}>
                  {formatDate(deal.expectedCloseDate)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.dealActions}>
          {deal.contact?.phone && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: actionBg }]}
              onPress={(e) => {
                e.stopPropagation();
                Linking.openURL(`tel:${deal.contact!.phone}`);
              }}
            >
              <Ionicons name="call-outline" size={18} color="#22c55e" />
            </TouchableOpacity>
          )}
          {deal.contact?.email && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: actionBg }]}
              onPress={(e) => {
                e.stopPropagation();
                Linking.openURL(`mailto:${deal.contact!.email}`);
              }}
            >
              <Ionicons name="mail-outline" size={18} color="#3b82f6" />
            </TouchableOpacity>
          )}
          <Ionicons name="chevron-forward" size={20} color={subtitleColor} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Empty State Component
function EmptyState({
  isDark,
  onAdd,
  hasFilters,
}: {
  isDark: boolean;
  onAdd: () => void;
  hasFilters: boolean;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';

  return (
    <View style={styles.emptyState}>
      <Ionicons name="briefcase-outline" size={64} color={subtitleColor} />
      <Text style={[styles.emptyTitle, { color: textColor }]}>
        {hasFilters ? 'No Deals Found' : 'No Deals Yet'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: subtitleColor }]}>
        {hasFilters
          ? 'Try adjusting your filters or search'
          : 'Create your first deal to get started'}
      </Text>
      {!hasFilters && (
        <TouchableOpacity style={styles.emptyButton} onPress={onAdd}>
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.emptyButtonText}>Create Deal</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Stats Summary Component
function StatsSummary({
  stats,
  isDark,
}: {
  stats: DealStats | null;
  isDark: boolean;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

  if (!stats) return null;

  const openDeals = stats.byStatus?.OPEN?.count || 0;
  const openValue = stats.byStatus?.OPEN?.value || 0;
  const wonDeals = stats.byStatus?.WON?.count || 0;
  const wonValue = stats.byStatus?.WON?.value || 0;

  return (
    <View style={[styles.statsContainer, { backgroundColor: cardBg }]}>
      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: textColor }]}>
          {formatDealValue(openValue)}
        </Text>
        <Text style={[styles.statLabel, { color: subtitleColor }]}>
          {openDeals} Open
        </Text>
      </View>
      <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: '#22c55e' }]}>
          {formatDealValue(wonValue)}
        </Text>
        <Text style={[styles.statLabel, { color: subtitleColor }]}>
          {wonDeals} Won
        </Text>
      </View>
    </View>
  );
}

export default function DealsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Filter modal state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<DealFilterState>({});
  const [userRoleKey, setUserRoleKey] = useState<string | undefined>();

  // Get current filter count
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // Deals state
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState<DealStats | null>(null);

  // Theme-aware colors
  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];
  const headerBorderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? 'white' : colors.foreground;
  const searchBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const searchBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const placeholderColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

  // Fetch user role info
  const fetchUserRoleInfo = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await getRoleInfo(accessToken);
      if (response.success && response.data) {
        setUserRoleKey(response.data.role?.key);
      }
    } catch (error) {
      console.error('Failed to fetch role info:', error);
    }
  }, [accessToken]);

  // Fetch deals
  const fetchDeals = useCallback(async (pageNum: number = 1, search: string = '') => {
    if (pageNum === 1) setLoading(true);

    try {
      const params: DealFilters = {
        page: pageNum,
        limit: 20,
        search: search || undefined,
        stage: filters.stage,
        status: filters.status,
        ownerMembershipId: filters.ownerMembershipId,
      };

      const response = await getDeals(accessToken, params);

      if (response.success && response.data) {
        const { data, meta } = response.data;
        if (pageNum === 1) {
          setDeals(data || []);
        } else {
          setDeals(prev => [...prev, ...(data || [])]);
        }
        if (meta) {
          setHasMore(meta.page < meta.totalPages);
          setPage(meta.page);
        } else {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
    }

    setLoading(false);
  }, [accessToken, filters]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await getDealCounts(accessToken);
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching deal stats:', error);
    }
  }, [accessToken]);

  // Initial load
  useEffect(() => {
    fetchUserRoleInfo();
    fetchDeals(1, '');
    fetchStats();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    fetchDeals(1, searchQuery);
  }, [filters]);

  // Handle applying filters
  const handleApplyFilters = (newFilters: DealFilterState) => {
    setFilters(newFilters);
  };

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDeals(1, searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchDeals]);

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDeals(1, searchQuery),
      fetchStats(),
    ]);
    setRefreshing(false);
  };

  // Load more
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchDeals(page + 1, searchQuery);
    }
  };

  // Navigation handlers
  const handleAddNew = () => {
    router.push('/(tabs)/deals/create' as any);
  };

  const handleDealPress = (deal: Deal) => {
    router.push(`/(tabs)/deals/${deal.id}` as any);
  };

  // Render loading skeleton
  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5].map((item) => (
        <View key={item} style={styles.skeletonCard}>
          <View style={[styles.skeletonIndicator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
          <View style={styles.skeletonContent}>
            <View style={[styles.skeletonTitle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
            <View style={[styles.skeletonValue, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />
            <View style={[styles.skeletonMeta, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} />
          </View>
        </View>
      ))}
    </View>
  );

  // Render list footer
  const renderFooter = () => {
    if (!loading || deals.length === 0) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const hasFilters = activeFilterCount > 0 || searchQuery.length > 0;

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: headerBorderColor }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <Text style={[styles.title, { color: textColor }]}>Deals</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Stats Summary */}
          <StatsSummary stats={stats} isDark={isDark} />

          {/* Search bar with filter */}
          <View style={styles.searchRow}>
            <View style={[styles.searchContainer, { backgroundColor: searchBg, borderColor: searchBorder, flex: 1 }]}>
              <Ionicons name="search-outline" size={20} color={placeholderColor} />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                placeholder="Search deals..."
                placeholderTextColor={placeholderColor}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={placeholderColor} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: searchBg, borderColor: searchBorder },
                activeFilterCount > 0 && styles.filterButtonActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilterModalVisible(true);
              }}
            >
              <Ionicons
                name="options-outline"
                size={20}
                color={activeFilterCount > 0 ? 'white' : placeholderColor}
              />
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Content */}
      {loading && deals.length === 0 ? (
        renderSkeleton()
      ) : deals.length === 0 ? (
        <EmptyState isDark={isDark} onAdd={handleAddNew} hasFilters={hasFilters} />
      ) : (
        <FlatList
          data={deals}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DealItem
              deal={item}
              isDark={isDark}
              onPress={() => handleDealPress(item)}
            />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16, paddingTop: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Filter Modal */}
      <DealFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
        currentFilters={filters}
        showOwnerFilter={isSuperAdmin(userRoleKey)}
        userRoleKey={userRoleKey}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: '100%',
    marginHorizontal: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  dealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stageIndicator: {
    width: 4,
    height: '100%',
  },
  dealContent: {
    flex: 1,
    padding: 16,
  },
  dealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dealTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dealValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  dealMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    maxWidth: 120,
  },
  dealFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stageText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
  },
  dealActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  skeletonContainer: {
    padding: 16,
  },
  skeletonCard: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  skeletonIndicator: {
    width: 4,
    height: 120,
  },
  skeletonContent: {
    flex: 1,
    padding: 16,
  },
  skeletonTitle: {
    height: 18,
    borderRadius: 4,
    width: '60%',
    marginBottom: 12,
  },
  skeletonValue: {
    height: 24,
    borderRadius: 4,
    width: '40%',
    marginBottom: 12,
  },
  skeletonMeta: {
    height: 14,
    borderRadius: 4,
    width: '80%',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
