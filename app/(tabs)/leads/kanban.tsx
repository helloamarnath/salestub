import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/auth-context';
import { getKanbanView } from '@/lib/api/leads';
import { LeadKanbanCard } from '@/components/leads/LeadCard';
import type { KanbanViewResponse, KanbanStage, KanbanLead } from '@/types/lead';
import { STAGE_TYPE_COLORS } from '@/types/lead';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = SCREEN_WIDTH * 0.8;

// Kanban column component
function KanbanColumn({
  stage,
  onLoadMore,
  loadingMore,
}: {
  stage: KanbanStage;
  onLoadMore: () => void;
  loadingMore: boolean;
}) {
  const stageColor = STAGE_TYPE_COLORS[stage.type] || '#3b82f6';

  const formatValue = (value: number): string => {
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    }
    if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)}K`;
    }
    return `₹${value.toLocaleString()}`;
  };

  const renderLead = useCallback(
    ({ item }: { item: KanbanLead }) => (
      <LeadKanbanCard
        lead={{
          id: item.id,
          displayId: item.displayId,
          title: item.title,
          value: item.value,
          score: item.score,
          contact: item.contact,
          currency: item.currency ? { id: '', name: '', ...item.currency } : undefined,
          owner: {
            id: item.owner.id,
            userId: '',
            userName: item.owner.userName,
            userEmail: item.owner.userEmail,
          },
          ownerMembershipId: item.owner.id,
          createdAt: item.createdAt,
          updatedAt: item.createdAt,
        }}
      />
    ),
    []
  );

  return (
    <View style={styles.column}>
      {/* Column Header */}
      <View style={[styles.columnHeader, { borderLeftColor: stageColor }]}>
        <View style={styles.columnHeaderTop}>
          <Text style={styles.columnTitle}>{stage.name}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{stage.totalCount}</Text>
          </View>
        </View>
        <Text style={styles.columnValue}>{formatValue(stage.totalValue)}</Text>
      </View>

      {/* Leads List */}
      <FlatList
        data={stage.leads}
        renderItem={renderLead}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.columnContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyColumn}>
            <Text style={styles.emptyColumnText}>No leads</Text>
          </View>
        }
        ListFooterComponent={
          <>
            {stage.hasMore && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={onLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color="#3b82f6" />
                ) : (
                  <Text style={styles.loadMoreText}>Load more</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        }
      />
    </View>
  );
}

export default function KanbanScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();

  const [kanbanData, setKanbanData] = useState<KanbanViewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingStages, setLoadingStages] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Fetch kanban data
  const fetchKanban = useCallback(
    async (isRefresh: boolean = false) => {
      if (!accessToken) return;

      if (!isRefresh) setLoading(true);
      setError(null);

      const response = await getKanbanView(accessToken);

      if (response.success && response.data) {
        setKanbanData(response.data);
      } else {
        setError(response.error?.message || 'Failed to load pipeline');
      }

      setLoading(false);
      setRefreshing(false);
    },
    [accessToken]
  );

  // Initial load
  useEffect(() => {
    fetchKanban();
  }, []);

  // Refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchKanban(true);
  }, [fetchKanban]);

  // Load more for a stage (placeholder for now)
  const handleLoadMore = useCallback((stageId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoadingStages((prev) => ({ ...prev, [stageId]: true }));

    // Simulate loading
    setTimeout(() => {
      setLoadingStages((prev) => ({ ...prev, [stageId]: false }));
    }, 1000);
  }, []);

  // Back navigation
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const formatTotalValue = (value: number): string => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`;
    }
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    }
    return `₹${value.toLocaleString()}`;
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
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.title}>Pipeline</Text>
              {kanbanData && (
                <Text style={styles.pipelineName}>{kanbanData.pipelineName}</Text>
              )}
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Summary */}
          {kanbanData && (
            <View style={styles.summary}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Leads</Text>
                <Text style={styles.summaryValue}>{kanbanData.totalLeads}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Value</Text>
                <Text style={styles.summaryValue}>
                  {formatTotalValue(kanbanData.totalValue)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading pipeline...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchKanban()}
          >
            <Ionicons name="refresh" size={18} color="white" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : kanbanData ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled={false}
          decelerationRate="fast"
          snapToInterval={COLUMN_WIDTH + 12}
          contentContainerStyle={styles.kanbanContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#3b82f6"
            />
          }
        >
          {kanbanData.stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              onLoadMore={() => handleLoadMore(stage.id)}
              loadingMore={loadingStages[stage.id] || false}
            />
          ))}
        </ScrollView>
      ) : null}
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
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  pipelineName: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginTop: 4,
  },
  kanbanContainer: {
    paddingHorizontal: 15,
    paddingTop: 16,
    paddingBottom: 100,
  },
  column: {
    width: COLUMN_WIDTH,
    marginRight: 12,
  },
  columnHeader: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
  },
  columnHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  columnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
  },
  columnValue: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  columnContent: {
    flexGrow: 1,
  },
  emptyColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyColumnText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
  },
  loadMoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  loadMoreText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 16,
  },
  errorContainer: {
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
