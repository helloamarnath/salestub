import { useState, useEffect, useCallback } from 'react';
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
import { getContactStats, getContactStatsOverview } from '@/lib/api/contacts';
import type { ContactStats, ContactStatsOverview, ContactOwnerStat } from '@/types/contact';

function formatNumber(value: number): string {
  if (value == null) return '—';
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

function StatusDistributionRow({
  label,
  count,
  total,
  accent,
  isDark,
}: {
  label: string;
  count: number;
  total: number;
  accent: string;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <View style={styles.distRow}>
      <View style={styles.distLabelRow}>
        <Text style={[styles.distLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.distMeta, { color: colors.mutedForeground }]}>
          {formatNumber(count)} · {pct}%
        </Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
        <View style={[styles.barFill, { width: `${Math.max(count > 0 ? 4 : 0, pct)}%`, backgroundColor: accent }]} />
      </View>
    </View>
  );
}

function OwnerRow({
  owner,
  maxCount,
  isDark,
}: {
  owner: ContactOwnerStat;
  maxCount: number;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const fillPct = maxCount > 0 ? (owner.count / maxCount) * 100 : 0;
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
      </View>
      <Text style={[styles.ownerCount, { color: colors.foreground }]}>
        {formatNumber(owner.count)}
      </Text>
    </View>
  );
}

export default function ContactAnalyticsScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const rbac = useRBAC();

  const [counts, setCounts] = useState<ContactStats | null>(null);
  const [overview, setOverview] = useState<ContactStatsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [countsRes, overviewRes] = await Promise.all([
        getContactStats(accessToken),
        getContactStatsOverview(accessToken),
      ]);

      if (countsRes.success && countsRes.data) setCounts(countsRes.data);
      if (overviewRes.success && overviewRes.data) setOverview(overviewRes.data);

      if (!countsRes.success && !overviewRes.success) {
        setError(
          countsRes.error?.message || overviewRes.error?.message || 'Failed to load analytics',
        );
      }

      setLoading(false);
      setRefreshing(false);
    },
    [accessToken],
  );

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (!rbac.canRead('contacts')) {
    return <AccessDenied />;
  }

  const sortedOwners = overview
    ? [...overview.byOwner].sort((a, b) => b.count - a.count)
    : [];
  const topOwner = sortedOwners[0] ?? null;
  const maxOwnerCount = Math.max(1, ...sortedOwners.map((o) => o.count));
  const total = counts?.total ?? overview?.total ?? 0;

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
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Contact Analytics</Text>
            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
              {counts || overview
                ? `${formatNumber(total)} contact${total !== 1 ? 's' : ''}`
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
      {loading && !counts && !overview ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && !counts && !overview ? (
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
      ) : (
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
              icon="people-outline"
              isDark={isDark}
            />
            <KpiCard
              label="Active"
              value={formatNumber(counts?.active ?? 0)}
              accent={Palette.emerald}
              icon="checkmark-circle-outline"
              isDark={isDark}
            />
            <KpiCard
              label="Inactive"
              value={formatNumber(counts?.inactive ?? 0)}
              accent={Palette.amber}
              icon="close-circle-outline"
              isDark={isDark}
            />
            <KpiCard
              label="Top Owner"
              value={topOwner ? topOwner.ownerName.split(' ')[0] : '—'}
              subValue={topOwner ? `${formatNumber(topOwner.count)} contacts` : undefined}
              accent={Palette.purple}
              icon="trophy-outline"
              isDark={isDark}
            />
          </View>

          {/* Status distribution */}
          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
            Status Distribution
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <StatusDistributionRow
              label="Active"
              count={counts?.active ?? 0}
              total={total}
              accent={Palette.emerald}
              isDark={isDark}
            />
            <View style={{ height: 12 }} />
            <StatusDistributionRow
              label="Inactive"
              count={counts?.inactive ?? 0}
              total={total}
              accent={Palette.amber}
              isDark={isDark}
            />
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
      )}
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

  /* Distribution */
  distRow: { gap: 6 },
  distLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distLabel: { fontSize: 14, fontWeight: '600' },
  distMeta: { fontSize: 12, fontWeight: '500' },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },

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
  ownerCount: { fontSize: 16, fontWeight: '700' },
});
