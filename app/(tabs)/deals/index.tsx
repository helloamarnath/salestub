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
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Paths, File as ExpoFile } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { Colors } from '@/constants/theme';
import { getDeals, getDealCounts, bulkDeleteDeals, bulkUpdateStage, exportDealsToCSV } from '@/lib/api/deals';
import { getRoleInfo, isSuperAdmin } from '@/lib/api/organization';
import { DealFilterModal, type DealFilterState } from '@/components/filters';
import type { Deal, DealFilters, DealStats, DealStage } from '@/types/deal';
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
  onLongPress,
  selectionMode,
  isSelected,
  onToggleSelect,
}: {
  deal: Deal;
  isDark: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
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

  const handlePress = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect();
    } else {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      onLongPress={onLongPress}
      delayLongPress={500}
    >
      <View style={[
        styles.dealCard,
        { backgroundColor: cardBg, borderColor },
        isSelected && styles.dealCardSelected,
      ]}>
        {/* Selection checkbox */}
        {selectionMode && (
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={onToggleSelect}
          >
            <View style={[
              styles.checkbox,
              { borderColor: isSelected ? '#3b82f6' : subtitleColor },
              isSelected && styles.checkboxSelected,
            ]}>
              {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
            </View>
          </TouchableOpacity>
        )}
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

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Theme-aware colors
  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];
  const headerBorderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? 'white' : colors.foreground;
  const searchBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const searchBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const placeholderColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

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
        valueMin: filters.valueMin,
        valueMax: filters.valueMax,
        expectedCloseDateFrom: filters.expectedCloseDateFrom,
        expectedCloseDateTo: filters.expectedCloseDateTo,
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

  // Selection mode handlers
  const enterSelectionMode = (dealId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectionMode(true);
    setSelectedIds(new Set([dealId]));
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (dealId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dealId)) {
        newSet.delete(dealId);
      } else {
        newSet.add(dealId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds(new Set(deals.map(d => d.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Bulk delete handler
  const handleBulkDelete = () => {
    const count = selectedIds.size;
    Alert.alert(
      'Delete Deals',
      `Are you sure you want to delete ${count} deal${count > 1 ? 's' : ''}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBulkActionLoading(true);
            const response = await bulkDeleteDeals(accessToken, Array.from(selectedIds));
            if (response.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setDeals(prev => prev.filter(d => !selectedIds.has(d.id)));
              exitSelectionMode();
              fetchStats();
            } else {
              Alert.alert('Error', response.error?.message || 'Failed to delete deals');
            }
            setBulkActionLoading(false);
          },
        },
      ]
    );
  };

  // Bulk stage update handler
  const handleBulkStageUpdate = () => {
    const stages: DealStage[] = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
    const count = selectedIds.size;

    Alert.alert(
      'Change Stage',
      `Update stage for ${count} deal${count > 1 ? 's' : ''}`,
      [
        ...stages.map(stage => ({
          text: DEAL_STAGE_LABELS[stage],
          onPress: async () => {
            setBulkActionLoading(true);
            const response = await bulkUpdateStage(accessToken, Array.from(selectedIds), stage);
            if (response.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              // Update local state
              setDeals(prev => prev.map(d =>
                selectedIds.has(d.id)
                  ? { ...d, stage, status: stage === 'CLOSED_WON' ? 'WON' : stage === 'CLOSED_LOST' ? 'LOST' : d.status }
                  : d
              ));
              exitSelectionMode();
              fetchStats();
            } else {
              Alert.alert('Error', response.error?.message || 'Failed to update deals');
            }
            setBulkActionLoading(false);
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  // Export handler
  const handleExport = async () => {
    setExporting(true);
    setShowMoreMenu(false);

    try {
      const result = await exportDealsToCSV(accessToken, {
        stage: filters.stage,
        status: filters.status,
        search: searchQuery || undefined,
      });

      if (result.success && result.csv) {
        const file = new ExpoFile(Paths.cache, result.filename || 'deals-export.csv');
        await file.write(result.csv);
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Deals',
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Export Failed', result.error || 'Failed to export deals');
      }
    } catch (error) {
      Alert.alert('Export Failed', 'An unexpected error occurred');
    }

    setExporting(false);
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
          {selectionMode ? (
            // Selection mode header
            <View style={styles.selectionHeader}>
              <TouchableOpacity
                style={styles.selectionCloseBtn}
                onPress={exitSelectionMode}
              >
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
              <Text style={[styles.selectionCount, { color: textColor }]}>
                {selectedIds.size} selected
              </Text>
              <TouchableOpacity
                style={styles.selectAllBtn}
                onPress={selectedIds.size === deals.length ? deselectAll : selectAll}
              >
                <Text style={styles.selectAllText}>
                  {selectedIds.size === deals.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Normal header
            <>
              <View style={styles.headerTop}>
                <Text style={[styles.title, { color: textColor }]}>Deals</Text>
                <View style={styles.headerActions}>
                  <TouchableOpacity
                    style={[styles.moreButton, { backgroundColor: searchBg }]}
                    onPress={() => setShowMoreMenu(!showMoreMenu)}
                  >
                    <Ionicons name="ellipsis-horizontal" size={20} color={textColor} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
                    <Ionicons name="add" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* More menu dropdown */}
              {showMoreMenu && (
                <View style={[styles.moreMenu, { backgroundColor: isDark ? '#1e293b' : 'white', borderColor }]}>
                  <TouchableOpacity
                    style={styles.moreMenuItem}
                    onPress={handleExport}
                    disabled={exporting}
                  >
                    {exporting ? (
                      <ActivityIndicator size="small" color="#3b82f6" />
                    ) : (
                      <Ionicons name="download-outline" size={20} color={textColor} />
                    )}
                    <Text style={[styles.moreMenuText, { color: textColor }]}>
                      {exporting ? 'Exporting...' : 'Export to CSV'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.moreMenuItem}
                    onPress={() => {
                      setShowMoreMenu(false);
                      if (deals.length > 0) {
                        enterSelectionMode(deals[0].id);
                      }
                    }}
                  >
                    <Ionicons name="checkbox-outline" size={20} color={textColor} />
                    <Text style={[styles.moreMenuText, { color: textColor }]}>Select Deals</Text>
                  </TouchableOpacity>
                </View>
              )}

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
            </>
          )}
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
              onLongPress={() => enterSelectionMode(item.id)}
              selectionMode={selectionMode}
              isSelected={selectedIds.has(item.id)}
              onToggleSelect={() => toggleSelect(item.id)}
            />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: selectionMode ? 160 : 100, paddingHorizontal: 16, paddingTop: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Bulk Action Bar */}
      {selectionMode && selectedIds.size > 0 && (
        <View style={[styles.bulkActionBar, { paddingBottom: insets.bottom + 16, backgroundColor: isDark ? '#1e293b' : 'white', borderColor }]}>
          {bulkActionLoading ? (
            <View style={styles.bulkActionLoading}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={[styles.bulkActionLoadingText, { color: textColor }]}>Processing...</Text>
            </View>
          ) : (
            <View style={styles.bulkActionButtons}>
              <TouchableOpacity
                style={[styles.bulkActionBtn, styles.bulkActionStageBtn]}
                onPress={handleBulkStageUpdate}
              >
                <Ionicons name="git-branch-outline" size={20} color="#3b82f6" />
                <Text style={styles.bulkActionStageBtnText}>Change Stage</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkActionBtn, styles.bulkActionDeleteBtn]}
                onPress={handleBulkDelete}
              >
                <Ionicons name="trash-outline" size={20} color="white" />
                <Text style={styles.bulkActionDeleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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
  // Selection mode styles
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  selectionCloseBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCount: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  selectAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectAllText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },
  // Header actions
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // More menu
  moreMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
    minWidth: 180,
  },
  moreMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  moreMenuText: {
    fontSize: 15,
    fontWeight: '500',
  },
  // Checkbox
  checkboxContainer: {
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  dealCardSelected: {
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  // Bulk action bar
  bulkActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  bulkActionLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  bulkActionLoadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  bulkActionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  bulkActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  bulkActionStageBtn: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  bulkActionStageBtnText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 15,
  },
  bulkActionDeleteBtn: {
    backgroundColor: '#ef4444',
  },
  bulkActionDeleteBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
});
