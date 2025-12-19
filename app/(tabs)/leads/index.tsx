import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/auth-context';
import { getLeads, getKanbanView } from '@/lib/api/leads';
import { LeadCard } from '@/components/leads/LeadCard';
import type { Lead, LeadFilters, KanbanStage } from '@/types/lead';

// Filter tab definition
interface FilterTab {
  id: string;
  label: string;
  type: 'category' | 'stage';
  stageType?: 'OPEN' | 'CLOSED_WON' | 'CLOSED_LOST';
  stageName?: string;
  stageId?: string;
  special?: 'untouched';
  color?: string;
}

// Category filter colors
const CATEGORY_COLORS = {
  all: '#6b7280',       // Gray
  open: '#3b82f6',      // Blue
  closed: '#8b5cf6',    // Purple
  untouched: '#f59e0b', // Amber/Orange
};

// Base category filters (always shown)
const BASE_FILTER_TABS: FilterTab[] = [
  { id: 'all', label: 'All Leads', type: 'category', color: CATEGORY_COLORS.all },
  { id: 'open', label: 'Open Leads', type: 'category', stageType: 'OPEN', color: CATEGORY_COLORS.open },
  { id: 'closed', label: 'Closed Leads', type: 'category', color: CATEGORY_COLORS.closed },
  { id: 'untouched', label: 'Untouched', type: 'category', special: 'untouched', color: CATEGORY_COLORS.untouched },
];

// Filter tab component with count and color
function FilterTabButton({
  filter,
  count,
  active,
  onPress,
}: {
  filter: FilterTab;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  const tabColor = filter.color || '#6b7280';

  return (
    <TouchableOpacity
      style={[
        styles.filterTab,
        active && styles.filterTabActive,
        active && { backgroundColor: tabColor, borderColor: tabColor },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.7}
    >
      {/* Color indicator dot */}
      {!active && (
        <View style={[styles.filterTabDot, { backgroundColor: tabColor }]} />
      )}
      <Text style={[styles.filterTabLabel, active && styles.filterTabLabelActive]}>
        {filter.label}
      </Text>
      <View style={[styles.filterTabCount, active && styles.filterTabCountActive]}>
        <Text style={[styles.filterTabCountText, active && styles.filterTabCountTextActive]}>
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// Loading skeleton
function LeadSkeleton() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View style={[styles.skeleton, { opacity }]}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
      </View>
    </Animated.View>
  );
}

// Empty state component
function EmptyState({ searchQuery, filterLabel }: { searchQuery: string; filterLabel: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons
        name={searchQuery ? 'search-outline' : 'people-outline'}
        size={64}
        color="rgba(255,255,255,0.2)"
      />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No leads found' : `No ${filterLabel.toLowerCase()}`}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? 'Try adjusting your search or filters'
          : 'Create your first lead to get started'}
      </Text>
      {!searchQuery && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => router.push('/(tabs)/leads/create')}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.emptyButtonText}>Add Lead</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Error state component
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorState}>
      <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Ionicons name="refresh" size={18} color="white" />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function LeadsScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();

  // State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipelineStages, setPipelineStages] = useState<KanbanStage[]>([]);
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Debounce search
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Default stage colors by type
  const getStageColor = (stage: KanbanStage): string => {
    if (stage.color) return stage.color;
    // Fallback colors based on stage type
    switch (stage.type) {
      case 'OPEN':
        return '#3b82f6'; // Blue
      case 'CLOSED_WON':
        return '#22c55e'; // Green
      case 'CLOSED_LOST':
        return '#ef4444'; // Red
      default:
        return '#6b7280'; // Gray
    }
  };

  // Dynamically generate filter tabs based on pipeline stages from API
  const filterTabs = useMemo(() => {
    // Create stage filter tabs from pipeline stages (sorted by displayOrder from API)
    const stageTabs: FilterTab[] = pipelineStages.map((stage) => ({
      id: `stage-${stage.id}`,
      label: stage.name,
      type: 'stage' as const,
      stageId: stage.id,
      stageName: stage.name,
      stageType: stage.type as 'OPEN' | 'CLOSED_WON' | 'CLOSED_LOST',
      color: getStageColor(stage),
    }));

    // Combine base filters with dynamic stage tabs
    return [...BASE_FILTER_TABS, ...stageTabs];
  }, [pipelineStages]);

  // Calculate counts for each filter using server-side data
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    // Calculate totals from pipeline stages
    let openTotal = 0;
    let closedTotal = 0;
    let untouchedTotal = 0;

    pipelineStages.forEach((stage) => {
      if (stage.type === 'OPEN') {
        openTotal += stage.totalCount;
      } else if (stage.type === 'CLOSED_WON' || stage.type === 'CLOSED_LOST') {
        closedTotal += stage.totalCount;
      }
    });

    // Untouched count - leads with no activities (client-side for loaded leads, estimate for total)
    const loadedUntouched = leads.filter((lead) => !lead.activities || lead.activities.length === 0).length;
    // Estimate untouched based on ratio of loaded leads
    if (leads.length > 0 && totalLeadsCount > 0) {
      untouchedTotal = Math.round((loadedUntouched / leads.length) * totalLeadsCount);
    } else {
      untouchedTotal = loadedUntouched;
    }

    filterTabs.forEach((filter) => {
      if (filter.id === 'all') {
        counts[filter.id] = totalLeadsCount;
      } else if (filter.special === 'untouched') {
        counts[filter.id] = untouchedTotal;
      } else if (filter.type === 'category') {
        if (filter.id === 'closed') {
          counts[filter.id] = closedTotal;
        } else if (filter.id === 'open') {
          counts[filter.id] = openTotal;
        } else {
          counts[filter.id] = 0;
        }
      } else if (filter.type === 'stage') {
        // Get count from pipeline stages
        const stage = pipelineStages.find((s) => s.id === filter.stageId);
        counts[filter.id] = stage?.totalCount || 0;
      } else {
        counts[filter.id] = 0;
      }
    });

    return counts;
  }, [leads, filterTabs, pipelineStages, totalLeadsCount]);

  // Filter leads based on active filter
  const filteredLeads = useMemo(() => {
    const filter = filterTabs.find((f) => f.id === activeFilter);
    if (!filter || filter.id === 'all') return leads;

    if (filter.special === 'untouched') {
      return leads.filter((lead) => !lead.activities || lead.activities.length === 0);
    }

    if (filter.type === 'category') {
      if (filter.id === 'closed') {
        return leads.filter(
          (lead) => lead.stage?.type === 'CLOSED_WON' || lead.stage?.type === 'CLOSED_LOST'
        );
      }
      if (filter.stageType) {
        return leads.filter((lead) => lead.stage?.type === filter.stageType);
      }
    }

    if (filter.type === 'stage') {
      // Match by stage ID for accuracy
      if (filter.stageId) {
        return leads.filter((lead) => lead.stage?.id === filter.stageId);
      }
      if (filter.stageName) {
        return leads.filter(
          (lead) => lead.stage?.name?.toLowerCase() === filter.stageName?.toLowerCase()
        );
      }
    }

    return leads;
  }, [leads, activeFilter, filterTabs]);

  // Get current filter label
  const currentFilterLabel = useMemo(() => {
    const filter = filterTabs.find((f) => f.id === activeFilter);
    return filter?.label || 'leads';
  }, [activeFilter, filterTabs]);

  // Fetch pipeline stages with counts from kanban API
  const fetchStages = useCallback(async () => {
    if (!accessToken) return;

    const response = await getKanbanView(accessToken, { limit: 1 }); // Minimal leads, just need stage counts

    if (response.success && response.data) {
      setPipelineStages(response.data.stages);
      setTotalLeadsCount(response.data.totalLeads);
    }
  }, [accessToken]);

  // Fetch leads
  const fetchLeads = useCallback(
    async (pageNum: number = 1, isRefresh: boolean = false) => {
      if (!accessToken) return;

      if (pageNum === 1) {
        if (!isRefresh) setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const filterParams: LeadFilters = {
        page: pageNum,
        limit: 20,
        search: searchQuery || undefined,
      };

      const response = await getLeads(accessToken, filterParams);

      if (response.success && response.data) {
        // Handle both paginated response and direct array response
        const newLeads = Array.isArray(response.data)
          ? response.data
          : (response.data.data || []);
        const meta = Array.isArray(response.data)
          ? null
          : response.data.meta;

        if (pageNum === 1) {
          setLeads(newLeads);
        } else {
          setLeads((prev) => [...prev, ...newLeads]);
        }

        // Handle pagination metadata if available
        if (meta) {
          setHasMore(meta.page < meta.totalPages);
          setPage(meta.page);
          // Update total count from meta if available
          if (meta.total) {
            setTotalLeadsCount(meta.total);
          }
        } else {
          // If no meta, assume no more pages if we got fewer than requested
          setHasMore(newLeads.length >= 20);
          setPage(pageNum);
        }
      } else {
        setError(response.error?.message || 'Failed to load leads');
      }

      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    },
    [accessToken, searchQuery]
  );

  // Initial load - fetch both stages and leads
  useEffect(() => {
    fetchStages();
    fetchLeads(1);
  }, []);

  // Search effect with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      fetchLeads(1);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchStages(); // Refresh stage counts
    fetchLeads(1, true);
  }, [fetchLeads, fetchStages]);

  // Load more
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      fetchLeads(page + 1);
    }
  }, [loadingMore, hasMore, loading, page, fetchLeads]);

  // Navigate to kanban
  const handleKanbanPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/leads/kanban');
  };

  // Navigate to create
  const handleCreatePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)/leads/create');
  };

  // Render lead item
  const renderLead = useCallback(
    ({ item }: { item: Lead }) => <LeadCard lead={item} />,
    []
  );

  // List footer
  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.loadingMore}>
          <ActivityIndicator size="small" color="#3b82f6" />
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#0f172a']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerContent}>
          {/* Title Row */}
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>Leads</Text>
              {!loading && (
                <Text style={styles.subtitle}>
                  {activeFilter === 'all'
                    ? `${totalLeadsCount} lead${totalLeadsCount !== 1 ? 's' : ''}`
                    : `${filteredLeads.length} of ${totalLeadsCount} lead${totalLeadsCount !== 1 ? 's' : ''}`
                  }
                </Text>
              )}
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleKanbanPress}
              >
                <Ionicons name="grid-outline" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleCreatePress}
              >
                <Ionicons name="add" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search bar */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={20}
              color="rgba(255,255,255,0.4)"
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search leads..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color="rgba(255,255,255,0.4)"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter tabs - Horizontal scrollable */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsContainer}
          style={styles.filterTabsScroll}
        >
          {filterTabs.map((filter) => (
            <FilterTabButton
              key={filter.id}
              filter={filter}
              count={filterCounts[filter.id] || 0}
              active={activeFilter === filter.id}
              onPress={() => setActiveFilter(filter.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4, 5].map((i) => (
            <LeadSkeleton key={i} />
          ))}
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchLeads(1)} />
      ) : filteredLeads.length === 0 ? (
        <EmptyState searchQuery={searchQuery} filterLabel={currentFilterLabel} />
      ) : (
        <FlatList
          data={filteredLeads}
          renderItem={renderLead}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#3b82f6"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: 'white',
  },
  filterTabsScroll: {
    marginTop: 12,
  },
  filterTabsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 8,
  },
  filterTabActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterTabLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  filterTabLabelActive: {
    color: 'white',
  },
  filterTabCount: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  filterTabCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterTabCountText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTabCountTextActive: {
    color: 'white',
  },
  filterTabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    padding: 20,
    gap: 10,
  },
  skeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
    gap: 8,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
  },
  skeletonLineShort: {
    width: '60%',
    height: 10,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
  },
  errorMessage: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
