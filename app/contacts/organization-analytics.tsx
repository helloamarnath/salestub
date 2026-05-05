import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
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
import { getCompanyStatsOverview } from '@/lib/api/companies';
import type {
  CompanyStatsOverview,
  CompanyOwnerStat,
  CompanyTypeRevenue,
} from '@/types/company';
import { COMPANY_TYPE_LABELS, COMPANY_TYPE_COLORS } from '@/types/company';
import type { CompanyType } from '@/types/company';

function formatNumber(value: number): string {
  if (value == null) return '—';
  return value.toLocaleString('en-IN');
}

function formatRevenueShort(value: number): string {
  if (!value) return '0';
  if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString('en-IN');
}

function KpiCard({
  label,
  value,
  subValue,
  accent,
  icon,
  isDark,
}: {
  label: string;
  value: string;
  subValue?: string;
  accent: string;
  icon: keyof typeof Ionicons.glyphMap;
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
      {subValue && (
        <Text style={[styles.kpiSub, { color: colors.mutedForeground }]} numberOfLines={1}>
          {subValue}
        </Text>
      )}
    </View>
  );
}

function TypeRow({
  type,
  data,
  total,
  isDark,
}: {
  type: CompanyType;
  data: CompanyTypeRevenue;
  total: number;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const accent = COMPANY_TYPE_COLORS[type] || colors.primary;
  const label = COMPANY_TYPE_LABELS[type] || type;
  const pct = total > 0 ? Math.round((data.count / total) * 100) : 0;
  return (
    <View style={styles.distRow}>
      <View style={styles.distLabelRow}>
        <View style={styles.distLabelInner}>
          <View style={[styles.colorDot, { backgroundColor: accent }]} />
          <Text style={[styles.distLabel, { color: colors.foreground }]}>{label}</Text>
        </View>
        <Text style={[styles.distMeta, { color: colors.mutedForeground }]}>
          {formatNumber(data.count)} · {pct}%
        </Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
        <View style={[styles.barFill, { width: `${Math.max(data.count > 0 ? 4 : 0, pct)}%`, backgroundColor: accent }]} />
      </View>
      {data.revenue > 0 && (
        <Text style={[styles.distRevenue, { color: colors.mutedForeground }]}>
          ₹{formatRevenueShort(data.revenue)} revenue
        </Text>
      )}
    </View>
  );
}

function IndustryRow({
  name,
  data,
  maxCount,
  isDark,
}: {
  name: string;
  data: CompanyTypeRevenue;
  maxCount: number;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const fillPct = maxCount > 0 ? (data.count / maxCount) * 100 : 0;
  return (
    <View style={[styles.industryRow, { borderBottomColor: colors.border }]}>
      <View style={styles.industryMain}>
        <Text style={[styles.industryName, { color: colors.foreground }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={[styles.industryBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
          <View style={[styles.barFill, { width: `${Math.max(4, fillPct)}%`, backgroundColor: colors.primary }]} />
        </View>
        {data.revenue > 0 && (
          <Text style={[styles.industryRev, { color: colors.mutedForeground }]}>
            ₹{formatRevenueShort(data.revenue)} revenue
          </Text>
        )}
      </View>
      <Text style={[styles.industryCount, { color: colors.foreground }]}>
        {formatNumber(data.count)}
      </Text>
    </View>
  );
}

function OwnerRow({
  owner,
  maxCount,
  isDark,
}: {
  owner: CompanyOwnerStat;
  maxCount: number;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const fillPct = maxCount > 0 ? (owner.accountsCount / maxCount) * 100 : 0;
  return (
    <View style={[styles.ownerRow, { borderBottomColor: colors.border }]}>
      <View style={styles.ownerMain}>
        <Text style={[styles.ownerName, { color: colors.foreground }]} numberOfLines={1}>
          {owner.ownerName}
        </Text>
        <Text style={[styles.ownerRole, { color: colors.mutedForeground }]} numberOfLines={1}>
          {owner.ownerRole}
        </Text>
        <View style={[styles.ownerBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
          <View style={[styles.barFill, { width: `${Math.max(4, fillPct)}%`, backgroundColor: colors.primary }]} />
        </View>
        {owner.totalRevenue > 0 && (
          <Text style={[styles.ownerRev, { color: colors.mutedForeground }]}>
            ₹{formatRevenueShort(owner.totalRevenue)} revenue
          </Text>
        )}
      </View>
      <Text style={[styles.ownerCount, { color: colors.foreground }]}>
        {formatNumber(owner.accountsCount)}
      </Text>
    </View>
  );
}

export default function OrganizationAnalyticsScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const rbac = useRBAC();

  const [overview, setOverview] = useState<CompanyStatsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await getCompanyStatsOverview(accessToken);
      if (res.success && res.data) {
        setOverview(res.data);
      } else {
        setError(res.error?.message || 'Failed to load analytics');
      }

      setLoading(false);
      setRefreshing(false);
    },
    [accessToken],
  );

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const sortedOwners = useMemo(
    () => (overview ? [...overview.byOwner].sort((a, b) => b.accountsCount - a.accountsCount) : []),
    [overview],
  );

  const sortedIndustries = useMemo(() => {
    if (!overview) return [] as Array<[string, CompanyTypeRevenue]>;
    return Object.entries(overview.byIndustry).sort(([, a], [, b]) => b.count - a.count);
  }, [overview]);

  if (!rbac.canRead('companies')) {
    return <AccessDenied />;
  }

  const total = overview?.total ?? 0;
  const totalRevenue = overview
    ? Object.values(overview.byType).reduce((sum, t) => sum + (t.revenue || 0), 0)
    : 0;
  const topOwner = sortedOwners[0] ?? null;
  const topType = overview
    ? Object.entries(overview.byType).sort(([, a], [, b]) => b.count - a.count)[0]
    : null;
  const maxOwnerCount = Math.max(1, ...sortedOwners.map((o) => o.accountsCount));
  const maxIndustryCount = Math.max(1, ...sortedIndustries.map(([, v]) => v.count));

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
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Organization Analytics
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
              {overview
                ? `${formatNumber(total)} organization${total !== 1 ? 's' : ''}`
                : 'Loading…'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.secondary }]}
            onPress={() => fetchAnalytics(true)}
            disabled={loading || refreshing}
          >
            <Ionicons name="refresh" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Body */}
      {loading && !overview ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && !overview ? (
        <View style={styles.centerFill}>
          <Ionicons name="alert-circle-outline" size={36} color={Palette.red} />
          <Text style={[styles.errorText, { color: colors.foreground }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => fetchAnalytics()}
          >
            <Text style={[styles.retryButtonText, { color: colors.primaryForeground }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : overview ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAnalytics(true)}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* KPI Grid */}
          <View style={styles.kpiGrid}>
            <KpiCard
              label="Total"
              value={formatNumber(total)}
              accent={colors.primary}
              icon="business-outline"
              isDark={isDark}
            />
            <KpiCard
              label="Top Type"
              value={topType ? COMPANY_TYPE_LABELS[topType[0] as CompanyType] || topType[0] : '—'}
              subValue={topType ? `${formatNumber(topType[1].count)} orgs` : undefined}
              accent={topType ? COMPANY_TYPE_COLORS[topType[0] as CompanyType] || colors.primary : colors.primary}
              icon="pricetag-outline"
              isDark={isDark}
            />
            <KpiCard
              label="Total Revenue"
              value={`₹${formatRevenueShort(totalRevenue)}`}
              accent={Palette.emerald}
              icon="trending-up-outline"
              isDark={isDark}
            />
            <KpiCard
              label="Top Owner"
              value={topOwner ? topOwner.ownerName.split(' ')[0] : '—'}
              subValue={topOwner ? `${formatNumber(topOwner.accountsCount)} orgs` : undefined}
              accent={Palette.purple}
              icon="trophy-outline"
              isDark={isDark}
            />
          </View>

          {/* Type distribution */}
          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
            Type Distribution
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {Object.keys(overview.byType).length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No type data yet.
              </Text>
            ) : (
              Object.entries(overview.byType).map(([type, data], idx, arr) => (
                <View key={type}>
                  <TypeRow
                    type={type as CompanyType}
                    data={data}
                    total={total}
                    isDark={isDark}
                  />
                  {idx < arr.length - 1 && <View style={{ height: 12 }} />}
                </View>
              ))
            )}
          </View>

          {/* Top industries */}
          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
            Top Industries
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {sortedIndustries.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No industry data yet.
              </Text>
            ) : (
              sortedIndustries.slice(0, 8).map(([name, data]) => (
                <IndustryRow
                  key={name}
                  name={name}
                  data={data}
                  maxCount={maxIndustryCount}
                  isDark={isDark}
                />
              ))
            )}
          </View>

          {/* Owner performance */}
          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
            Owner Performance
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {sortedOwners.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No owner data available.
              </Text>
            ) : (
              sortedOwners.map((owner) => (
                <OwnerRow
                  key={owner.ownerId}
                  owner={owner}
                  maxCount={maxOwnerCount}
                  isDark={isDark}
                />
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

  /* KPIs */
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
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
  kpiSub: { fontSize: 11, marginTop: 4 },

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
    marginBottom: 24,
  },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 8 },

  /* Type distribution */
  distRow: { gap: 6 },
  distLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distLabelInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  distLabel: { fontSize: 14, fontWeight: '600' },
  distMeta: { fontSize: 12, fontWeight: '500' },
  distRevenue: { fontSize: 11 },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },

  /* Industry */
  industryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  industryMain: { flex: 1, gap: 4 },
  industryName: { fontSize: 14, fontWeight: '600' },
  industryBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 2,
  },
  industryRev: { fontSize: 11 },
  industryCount: { fontSize: 16, fontWeight: '700' },

  /* Owner */
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  ownerMain: { flex: 1, gap: 4 },
  ownerName: { fontSize: 14, fontWeight: '600' },
  ownerRole: { fontSize: 11 },
  ownerBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  ownerRev: { fontSize: 11 },
  ownerCount: { fontSize: 16, fontWeight: '700' },
});
