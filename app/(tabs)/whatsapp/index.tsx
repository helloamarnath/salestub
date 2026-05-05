import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors, Palette } from '@/constants/theme';
import { listConversations, getAnalytics } from '@/lib/api/whatsapp';
import type {
  WaConversation,
  WaListFilter,
  WaConvStatus,
  WaAnalytics,
} from '@/types/whatsapp';
import { ConversationCard } from '@/components/whatsapp/ConversationCard';
import { usePlanFeatures } from '@/hooks/use-plan-features';
import { UpgradeCard } from '@/components/UpgradeCard';

type Module = 'inbox' | 'analytics';

const FILTER_TABS: { id: WaListFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'assigned', label: 'Mine' },
  { id: 'lead_candidates', label: 'No lead' },
];

const STATUS_TABS: { id: WaConvStatus | 'ALL'; label: string }[] = [
  { id: 'OPEN', label: 'Open' },
  { id: 'SNOOZED', label: 'Snoozed' },
  { id: 'CLOSED', label: 'Closed' },
];

const POLL_INTERVAL_MS = 15_000;

// ============ Analytics tab ============

function AnalyticsView({ isDark }: { isDark: boolean }) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const { accessToken } = useAuth();
  const [data, setData] = useState<WaAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await getAnalytics(accessToken);
      if (res.success && res.data) setData(res.data);
      else setError(res.error?.message || 'Failed to load analytics');
      setLoading(false);
      setRefreshing(false);
    },
    [accessToken],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const total = data?.totalConversations ?? data?.conversations ?? 0;
  const open = data?.openConversations ?? 0;
  const closedWon = data?.closedWon ?? 0;
  const others = Math.max(0, total - open - closedWon);
  const replyRate = data?.replyRate ?? 0;
  const slaBreachRate = data?.slaBreachRate ?? 0;

  const avgRespMinutes =
    data?.avgResponseMinutes != null
      ? data.avgResponseMinutes
      : data?.avgResponseTime != null
        ? Math.round(data.avgResponseTime / 60)
        : null;
  const avgRespLabel =
    avgRespMinutes == null
      ? '—'
      : avgRespMinutes < 60
        ? `${avgRespMinutes}m`
        : `${(avgRespMinutes / 60).toFixed(1)}h`;

  if (loading && !data) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (error && !data) {
    return (
      <View style={styles.centerFill}>
        <Ionicons name="alert-circle-outline" size={36} color={Palette.red} />
        <Text style={[styles.errorText, { color: colors.foreground }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => fetchData()}
        >
          <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchData(true)}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {total === 0 ? (
        <View style={[styles.emptyAnalytics, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="logo-whatsapp" size={36} color="#25D366" />
          <Text style={[styles.emptyAnalyticsTitle, { color: colors.foreground }]}>
            No conversations in the last 30 days
          </Text>
          <Text style={[styles.emptyAnalyticsBody, { color: colors.mutedForeground }]}>
            Connect MSG91 in the web settings and start receiving messages here.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.kpiGrid}>
            <KpiCard
              label="Conversations"
              value={String(total)}
              accent={colors.primary}
              icon="chatbubbles-outline"
              isDark={isDark}
              hint="Last 30 days"
            />
            <KpiCard
              label="Open"
              value={String(open)}
              accent={Palette.emerald}
              icon="lock-open-outline"
              isDark={isDark}
              hint="Currently open"
            />
            <KpiCard
              label="Closed-won"
              value={String(closedWon)}
              accent={Palette.emerald}
              icon="trophy-outline"
              isDark={isDark}
              hint="Linked to Won deals"
            />
            <KpiCard
              label="Avg first reply"
              value={avgRespLabel}
              accent={Palette.amber}
              icon="time-outline"
              isDark={isDark}
              hint="First response"
            />
            <KpiCard
              label="SLA breach"
              value={`${slaBreachRate}%`}
              accent={slaBreachRate > 0 ? Palette.red : Palette.emerald}
              icon="warning-outline"
              isDark={isDark}
              hint="First reply > 4h"
            />
            <KpiCard
              label="Reply rate"
              value={`${replyRate}%`}
              accent={Palette.purple}
              icon="arrow-undo-outline"
              isDark={isDark}
              hint="Of inbound conversations"
            />
          </View>

          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>Funnel</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FunnelRow label="Open" count={open} total={total} accent={colors.primary} isDark={isDark} />
            <View style={{ height: 12 }} />
            <FunnelRow
              label="Closed-won"
              count={closedWon}
              total={total}
              accent={Palette.emerald}
              isDark={isDark}
            />
            {others > 0 && (
              <>
                <View style={{ height: 12 }} />
                <FunnelRow label="Other" count={others} total={total} accent="#9ca3af" isDark={isDark} />
              </>
            )}
          </View>

          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>Reply rate</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FunnelRow
              label="Reply rate"
              count={replyRate}
              total={100}
              accent={Palette.purple}
              isDark={isDark}
              suffix="%"
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

function KpiCard({
  label,
  value,
  accent,
  icon,
  hint,
  isDark,
}: {
  label: string;
  value: string;
  accent: string;
  icon: keyof typeof Ionicons.glyphMap;
  hint?: string;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  return (
    <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.kpiHeader}>
        <View style={[styles.kpiIconWrap, { backgroundColor: `${accent}20` }]}>
          <Ionicons name={icon} size={14} color={accent} />
        </View>
        <Text style={[styles.kpiLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.kpiValue, { color: accent }]} numberOfLines={1}>
        {value}
      </Text>
      {hint && (
        <Text style={[styles.kpiHint, { color: colors.mutedForeground }]} numberOfLines={1}>
          {hint}
        </Text>
      )}
    </View>
  );
}

function FunnelRow({
  label,
  count,
  total,
  accent,
  suffix,
  isDark,
}: {
  label: string;
  count: number;
  total: number;
  accent: string;
  suffix?: string;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const widthPct = suffix === '%' ? Math.max(2, count) : Math.max(count > 0 ? 4 : 0, pct);
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.funnelLabelRow}>
        <Text style={[styles.funnelLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.funnelMeta, { color: colors.mutedForeground }]}>
          {count}
          {suffix || (total > 0 ? ` · ${pct}%` : '')}
        </Text>
      </View>
      <View
        style={[
          styles.barTrack,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
        ]}
      >
        <View style={[styles.barFill, { width: `${widthPct}%`, backgroundColor: accent }]} />
      </View>
    </View>
  );
}

// ============ Inbox tab ============

function InboxView({
  isDark,
  search,
  setSearch,
}: {
  isDark: boolean;
  search: string;
  setSearch: (s: string) => void;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const { accessToken } = useAuth();
  const [filter, setFilter] = useState<WaListFilter>('all');
  const [statusFilter, setStatusFilter] = useState<WaConvStatus>('OPEN');
  const [conversations, setConversations] = useState<WaConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search 250ms — matches web cadence
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const fetchPage = useCallback(
    async (pageNum: number, opts: { silent?: boolean } = {}) => {
      if (!accessToken) return;
      if (!opts.silent) {
        if (pageNum === 1) setLoading(true);
      }
      const res = await listConversations(accessToken, {
        filter,
        status: statusFilter,
        search: debouncedSearch || undefined,
        page: pageNum,
        limit: 30,
      });
      if (res.success && res.data) {
        const items = res.data.data || [];
        setConversations((prev) => (pageNum === 1 ? items : [...prev, ...items]));
        setHasMore(items.length === 30 && pageNum * 30 < res.data.total);
        setError(null);
      } else if (!opts.silent) {
        setError(res.error?.message || 'Failed to load conversations');
      }
      setLoading(false);
      setRefreshing(false);
    },
    [accessToken, filter, statusFilter, debouncedSearch],
  );

  // Reset page when filters / search change
  useEffect(() => {
    setPage(1);
    fetchPage(1);
  }, [filter, statusFilter, debouncedSearch, fetchPage]);

  // 15s polling — silent refresh of page 1
  useEffect(() => {
    const id = setInterval(() => {
      fetchPage(1, { silent: true });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchPage]);

  const handleLoadMore = () => {
    if (!hasMore || loading || refreshing) return;
    const next = page + 1;
    setPage(next);
    fetchPage(next);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchPage(1);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 }}>
        <View
          style={[
            styles.searchWrap,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, number, message…"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterTabsScroll}
        contentContainerStyle={styles.filterTabs}
      >
        {FILTER_TABS.map((t) => {
          const active = filter === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.filterPill,
                {
                  backgroundColor: active ? colors.primary : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  borderColor: active ? colors.primary : 'transparent',
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilter(t.id);
              }}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: active ? colors.primaryForeground : colors.foreground },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Status sub-tabs */}
      <View style={[styles.statusBar, { borderBottomColor: colors.border }]}>
        {STATUS_TABS.map((s) => {
          const active = statusFilter === s.id;
          return (
            <TouchableOpacity
              key={s.id}
              style={[styles.statusTab, active && { borderBottomColor: colors.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setStatusFilter(s.id as WaConvStatus);
              }}
            >
              <Text
                style={[
                  styles.statusTabText,
                  { color: active ? colors.primary : colors.mutedForeground, fontWeight: active ? '600' : '500' },
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {loading && conversations.length === 0 ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && conversations.length === 0 ? (
        <View style={styles.centerFill}>
          <Ionicons name="alert-circle-outline" size={36} color={Palette.red} />
          <Text style={[styles.errorText, { color: colors.foreground }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => fetchPage(1)}
          >
            <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.centerFill}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No conversations</Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
            {debouncedSearch ? 'Try a different search.' : 'New conversations will appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <ConversationCard
              conversation={item}
              isDark={isDark}
              onPress={() => router.push(`/whatsapp/${item.id}` as never)}
            />
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            hasMore && conversations.length > 0 ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

// ============ Page ============

export default function WhatsappPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];
  const insets = useSafeAreaInsets();
  const [module, setModule] = useState<Module>('inbox');
  const [search, setSearch] = useState('');

  // Plan-feature gate — mirrors web. Backend's FeatureFlagGuard also enforces,
  // but checking here lets us show a clean upsell instead of a broken inbox.
  const { hasWhatsappCrm, planDisplayName, loading: planLoading } = usePlanFeatures();

  if (planLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <LinearGradient
          colors={[colors.background, colors.card, colors.background]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!hasWhatsappCrm) {
    return (
      <UpgradeCard
        featureName="WhatsApp CRM"
        description="Manage every WhatsApp conversation in one shared inbox, with templates, assignments, and lead tracking."
        bullets={[
          'Shared inbox across your team',
          'Pre-approved templates with one-click sends',
          'Auto-link chats to leads & contacts',
          '24-hour session tracking & analytics',
        ]}
        currentPlanDisplayName={planDisplayName}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[colors.background, colors.card, colors.background]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header — no back button: this is a root tab */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>WhatsApp</Text>
            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
              {module === 'inbox' ? 'Inbox' : 'Analytics'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.secondary }]}
            onPress={() => router.push('/whatsapp/templates' as never)}
          >
            <Ionicons name="grid-outline" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.secondary }]}
            onPress={() => router.push('/whatsapp/settings' as never)}
          >
            <Ionicons name="settings-outline" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Module switcher */}
        <View
          style={[
            styles.moduleTabs,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.moduleTab,
              module === 'inbox' && { backgroundColor: colors.background },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setModule('inbox');
            }}
          >
            <Ionicons
              name={module === 'inbox' ? 'chatbubbles' : 'chatbubbles-outline'}
              size={16}
              color={module === 'inbox' ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={[
                styles.moduleTabText,
                {
                  color: module === 'inbox' ? colors.primary : colors.mutedForeground,
                  fontWeight: module === 'inbox' ? '700' : '500',
                },
              ]}
            >
              Inbox
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.moduleTab,
              module === 'analytics' && { backgroundColor: colors.background },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setModule('analytics');
            }}
          >
            <Ionicons
              name={module === 'analytics' ? 'stats-chart' : 'stats-chart-outline'}
              size={16}
              color={module === 'analytics' ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={[
                styles.moduleTabText,
                {
                  color: module === 'analytics' ? colors.primary : colors.mutedForeground,
                  fontWeight: module === 'analytics' ? '700' : '500',
                },
              ]}
            >
              Analytics
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Body */}
      {module === 'inbox' ? (
        <InboxView isDark={isDark} search={search} setSearch={setSearch} />
      ) : (
        <AnalyticsView isDark={isDark} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },

  /* Module switcher */
  moduleTabs: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
  },
  moduleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  moduleTabText: { fontSize: 13 },

  /* Search */
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },

  /* Filter tabs */
  filterTabsScroll: { flexGrow: 0, flexShrink: 0 },
  filterTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'center',
  },
  filterPillText: { fontSize: 13, fontWeight: '600' },

  /* Status tabs */
  statusBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  statusTab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  statusTabText: { fontSize: 13 },

  /* Center states */
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  errorText: { fontSize: 14, textAlign: 'center' },
  retryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  retryText: { fontSize: 14, fontWeight: '600' },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  emptyBody: { fontSize: 13, textAlign: 'center' },

  /* KPI grid */
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  kpiIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValue: { fontSize: 22, fontWeight: '700' },
  kpiHint: { fontSize: 11, marginTop: 4 },

  /* Sections */
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  funnelLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  funnelLabel: { fontSize: 14, fontWeight: '600' },
  funnelMeta: { fontSize: 12, fontWeight: '500' },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },

  emptyAnalytics: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyAnalyticsTitle: { fontSize: 15, fontWeight: '600' },
  emptyAnalyticsBody: { fontSize: 13, textAlign: 'center' },
});
