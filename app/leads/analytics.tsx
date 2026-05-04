import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useRBAC } from '@/hooks/use-rbac';
import { Colors, Palette } from '@/constants/theme';
import { AccessDenied } from '@/components/AccessDenied';
import {
  getLeadAnalytics,
  type LeadAnalyticsDateRange,
  type LeadAnalyticsResponse,
} from '@/lib/api/leads';

const DATE_RANGES: { value: LeadAnalyticsDateRange; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '1y', label: '1y' },
  { value: 'all', label: 'All' },
];

// Map backend Tailwind class names to hex (we don't run Tailwind on RN).
const SCORE_BUCKET_COLORS: Record<string, string> = {
  'bg-red-500': Palette.red,
  'bg-orange-500': '#f97316',
  'bg-yellow-500': '#eab308',
  'bg-green-500': Palette.emerald,
  'bg-brand-500': '#3b82f6',
};

function formatCurrency(value: number): string {
  if (!value) return '—';
  if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString('en-IN');
}

function formatNumber(value: number): string {
  if (value == null) return '—';
  return value.toLocaleString('en-IN');
}

function KpiCard({
  label,
  value,
  suffix,
  accent,
  isDark,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent: string;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  return (
    <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.kpiLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.kpiValueRow}>
        <Text style={[styles.kpiValue, { color: colors.foreground }]} numberOfLines={1}>
          {value}
        </Text>
        {suffix && (
          <Text style={[styles.kpiSuffix, { color: colors.mutedForeground }]}>{suffix}</Text>
        )}
      </View>
      <View style={[styles.kpiAccent, { backgroundColor: accent }]} />
    </View>
  );
}

function FunnelRow({
  stage,
  isDark,
}: {
  stage: LeadAnalyticsResponse['funnel'][number];
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const accent =
    stage.type === 'CLOSED_WON'
      ? Palette.emerald
      : stage.type === 'CLOSED_LOST'
        ? Palette.red
        : colors.primary;
  return (
    <View style={styles.funnelRow}>
      <View style={styles.funnelLabelRow}>
        <Text style={[styles.funnelName, { color: colors.foreground }]} numberOfLines={1}>
          {stage.name}
        </Text>
        <Text style={[styles.funnelMeta, { color: colors.mutedForeground }]}>
          {formatNumber(stage.count)} · {stage.percentage}%
        </Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
        <View style={[styles.barFill, { width: `${Math.max(2, stage.percentage)}%`, backgroundColor: accent }]} />
      </View>
      {stage.value > 0 && (
        <Text style={[styles.funnelValue, { color: colors.mutedForeground }]}>
          ₹{formatCurrency(stage.value)}
        </Text>
      )}
    </View>
  );
}

function ScoreRow({
  bucket,
  maxCount,
  isDark,
}: {
  bucket: LeadAnalyticsResponse['scoreDistribution'][number];
  maxCount: number;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const fillPct = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
  const accent = SCORE_BUCKET_COLORS[bucket.color] || colors.primary;
  return (
    <View style={styles.scoreRow}>
      <Text style={[styles.scoreRange, { color: colors.foreground }]}>{bucket.range}</Text>
      <View style={[styles.scoreBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
        <View style={[styles.barFill, { width: `${Math.max(bucket.count > 0 ? 4 : 0, fillPct)}%`, backgroundColor: accent }]} />
      </View>
      <Text style={[styles.scoreCount, { color: colors.mutedForeground }]}>
        {formatNumber(bucket.count)}
      </Text>
    </View>
  );
}

function SourceRow({
  source,
  isDark,
}: {
  source: LeadAnalyticsResponse['sourcePerformance'][number];
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  return (
    <View style={[styles.sourceRow, { borderBottomColor: colors.border }]}>
      <View style={styles.sourceMain}>
        <Text style={[styles.sourceName, { color: colors.foreground }]} numberOfLines={1}>
          {source.name}
        </Text>
        <Text style={[styles.sourceMeta, { color: colors.mutedForeground }]}>
          {formatNumber(source.count)} leads · ₹{formatCurrency(source.value)}
        </Text>
      </View>
      <View style={styles.sourceStats}>
        <Text style={[styles.sourceStatValue, { color: colors.foreground }]}>
          {source.conversionRate}%
        </Text>
        <Text style={[styles.sourceStatLabel, { color: colors.mutedForeground }]}>conv.</Text>
      </View>
    </View>
  );
}

export default function LeadAnalyticsScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const rbac = useRBAC();

  const [dateRange, setDateRange] = useState<LeadAnalyticsDateRange>('30d');
  const [data, setData] = useState<LeadAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(
    async (range: LeadAnalyticsDateRange, isRefresh = false) => {
      if (!accessToken) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await getLeadAnalytics(accessToken, range);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error?.message || 'Failed to load analytics');
      }

      setLoading(false);
      setRefreshing(false);
    },
    [accessToken],
  );

  useEffect(() => {
    fetchAnalytics(dateRange);
  }, [dateRange, fetchAnalytics]);

  if (!rbac.canRead('leads')) {
    return <AccessDenied />;
  }

  const maxScoreCount = data
    ? Math.max(1, ...data.scoreDistribution.map((b) => b.count))
    : 1;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.card, colors.background]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.secondary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Analytics</Text>
            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
              {data
                ? `${formatNumber(data.stats.total)} lead${data.stats.total !== 1 ? 's' : ''} in window`
                : 'Loading…'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.secondary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              fetchAnalytics(dateRange, true);
            }}
            disabled={loading || refreshing}
          >
            <Ionicons
              name="refresh"
              size={20}
              color={colors.foreground}
              style={refreshing ? styles.spinning : undefined}
            />
          </TouchableOpacity>
        </View>

        {/* Date range pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rangeRow}
        >
          {DATE_RANGES.map((r) => {
            const active = r.value === dateRange;
            return (
              <TouchableOpacity
                key={r.value}
                style={[
                  styles.rangePill,
                  {
                    backgroundColor: active ? colors.primary : colors.secondary,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDateRange(r.value);
                }}
              >
                <Text
                  style={[
                    styles.rangePillText,
                    { color: active ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Body */}
      {loading && !data ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && !data ? (
        <View style={styles.centerFill}>
          <Ionicons name="alert-circle-outline" size={36} color={Palette.red} />
          <Text style={[styles.errorText, { color: colors.foreground }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => fetchAnalytics(dateRange)}
          >
            <Text style={[styles.retryButtonText, { color: colors.primaryForeground }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : data ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAnalytics(dateRange, true)}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* KPI Grid */}
          <View style={styles.kpiGrid}>
            <KpiCard
              label="Total Leads"
              value={formatNumber(data.stats.total)}
              accent={colors.primary}
              isDark={isDark}
            />
            <KpiCard
              label="Conversion"
              value={`${data.stats.conversionRate}`}
              suffix="%"
              accent={Palette.emerald}
              isDark={isDark}
            />
            <KpiCard
              label="Avg Deal Value"
              value={`₹${formatCurrency(data.stats.avgDealSize)}`}
              accent={Palette.amber}
              isDark={isDark}
            />
            <KpiCard
              label="Avg Cycle Time"
              value={`${data.stats.avgCycleTime}`}
              suffix={data.stats.avgCycleTime === 1 ? 'day' : 'days'}
              accent={Palette.purple}
              isDark={isDark}
            />
          </View>

          {/* Quality strip */}
          <View style={[styles.qualityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.qualityRow}>
              <View style={styles.qualityLabelWrap}>
                <Text style={[styles.qualityLabel, { color: colors.mutedForeground }]}>
                  High-quality leads (score &gt; 60)
                </Text>
                <Text style={[styles.qualityValue, { color: colors.foreground }]}>
                  {formatNumber(data.stats.highQualityLeads)}
                  <Text style={[styles.qualityValueSuffix, { color: colors.mutedForeground }]}>
                    {' '}/ {formatNumber(data.stats.total)}
                  </Text>
                </Text>
              </View>
              <View style={[styles.qualityBadge, { backgroundColor: Palette.emerald }]}>
                <Text style={styles.qualityBadgeText}>{data.stats.highQualityPercentage}%</Text>
              </View>
            </View>
            <Text style={[styles.qualityHint, { color: colors.mutedForeground }]}>
              Avg score across all leads: {data.stats.avgScore}
            </Text>
          </View>

          {/* Conversion Funnel */}
          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
            Conversion Funnel
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {data.funnel.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No stage data for this range.
              </Text>
            ) : (
              data.funnel.map((stage, idx) => (
                <View key={`${stage.name}-${idx}`}>
                  <FunnelRow stage={stage} isDark={isDark} />
                  {idx < data.funnel.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              ))
            )}
          </View>

          {/* Score Distribution */}
          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
            Score Distribution
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {data.scoreDistribution.map((bucket) => (
              <ScoreRow
                key={bucket.range}
                bucket={bucket}
                maxCount={maxScoreCount}
                isDark={isDark}
              />
            ))}
          </View>

          {/* Source Performance */}
          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
            Source Performance
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {data.sourcePerformance.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No source data for this range.
              </Text>
            ) : (
              data.sourcePerformance.map((source, idx) => (
                <SourceRow key={`${source.name}-${idx}`} source={source} isDark={isDark} />
              ))
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  rangePill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  rangePillText: { fontSize: 13, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  errorText: { fontSize: 14, textAlign: 'center' },
  retryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: { fontSize: 14, fontWeight: '600' },
  spinning: { transform: [{ rotate: Platform.OS === 'ios' ? '0deg' : '0deg' }] },

  /* KPIs */
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 8,
  },
  kpiCard: {
    width: '50%',
    paddingHorizontal: 6,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  kpiValue: { fontSize: 24, fontWeight: '700' },
  kpiSuffix: { fontSize: 13, fontWeight: '500' },
  kpiAccent: {
    height: 3,
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 16,
    width: 32,
  },

  /* Quality strip */
  qualityCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  qualityLabelWrap: { flex: 1, paddingRight: 12 },
  qualityLabel: { fontSize: 12, marginBottom: 4 },
  qualityValue: { fontSize: 22, fontWeight: '700' },
  qualityValueSuffix: { fontSize: 14, fontWeight: '500' },
  qualityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  qualityBadgeText: { color: 'white', fontSize: 13, fontWeight: '700' },
  qualityHint: { fontSize: 12 },

  /* Section common */
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  divider: { height: 1, marginVertical: 12 },

  /* Funnel */
  funnelRow: { gap: 6 },
  funnelLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  funnelName: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 12 },
  funnelMeta: { fontSize: 12, fontWeight: '500' },
  funnelValue: { fontSize: 11 },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },

  /* Score */
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  scoreRange: { fontSize: 12, width: 60, fontWeight: '600' },
  scoreBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreCount: { fontSize: 12, width: 44, textAlign: 'right' },

  /* Source */
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sourceMain: { flex: 1, paddingRight: 12 },
  sourceName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  sourceMeta: { fontSize: 12 },
  sourceStats: { alignItems: 'flex-end' },
  sourceStatValue: { fontSize: 16, fontWeight: '700' },
  sourceStatLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
});
