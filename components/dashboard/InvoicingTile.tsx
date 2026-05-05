import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/theme-context';
import { Colors, Palette } from '@/constants/theme';
import type { InvoiceStats } from '@/lib/api/invoices';

interface InvoicingTileProps {
  stats: InvoiceStats | null;
  formatCurrency: (value: number) => string;
  onViewAll?: () => void;
  onViewPending?: () => void;
  onViewOverdue?: () => void;
}

/**
 * Mobile equivalent of the web dashboard's "Invoicing" section.
 * Shows total revenue, pending count, outstanding amount, overdue count.
 */
export function InvoicingTile({
  stats,
  formatCurrency,
  onViewAll,
  onViewPending,
  onViewOverdue,
}: InvoicingTileProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const subtitleColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
  const dividerColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  const totalPaid = stats?.totalPaid ?? 0;
  const outstanding = stats?.totalOutstanding ?? 0;
  const pendingCount = stats?.pendingCount ?? 0;
  const overdueCount = stats?.overdueCount ?? 0;

  const isEmpty = !stats || stats.total === 0;

  return (
    <BlurView
      intensity={15}
      tint={isDark ? 'dark' : 'light'}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        },
      ]}
    >
      <TouchableOpacity
        style={styles.header}
        onPress={onViewAll}
        activeOpacity={onViewAll ? 0.6 : 1}
        disabled={!onViewAll}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="receipt-outline" size={18} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>Invoicing</Text>
        </View>
        {onViewAll && (
          <Ionicons name="chevron-forward" size={16} color={subtitleColor} />
        )}
      </TouchableOpacity>

      {isEmpty ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: subtitleColor }]}>
            Send your first invoice to see revenue.
          </Text>
        </View>
      ) : (
        <>
          {/* Headline: total paid (all-time) */}
          <View style={styles.headlineRow}>
            <View style={styles.headlineLeft}>
              <Text style={[styles.headlineLabel, { color: subtitleColor }]}>
                Total revenue
              </Text>
              <Text
                style={[styles.headlineValue, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {formatCurrency(totalPaid)}
              </Text>
              {stats!.thisMonthRevenue > 0 && (
                <Text style={[styles.headlineSub, { color: subtitleColor }]}>
                  This month: {formatCurrency(stats!.thisMonthRevenue)}
                </Text>
              )}
            </View>
            {outstanding > 0 && (
              <View style={[styles.outstandingChip, { backgroundColor: `${Palette.amber}20` }]}>
                <Text style={[styles.outstandingLabel, { color: Palette.amber }]}>
                  Outstanding
                </Text>
                <Text style={[styles.outstandingValue, { color: Palette.amber }]} numberOfLines={1}>
                  {formatCurrency(outstanding)}
                </Text>
              </View>
            )}
          </View>

          {/* Counts row — tappable to filter the invoice list */}
          <View style={[styles.countsRow, { borderTopColor: dividerColor }]}>
            <TouchableOpacity
              style={styles.countItem}
              onPress={onViewPending}
              disabled={!onViewPending}
              activeOpacity={onViewPending ? 0.6 : 1}
            >
              <Text
                style={[
                  styles.countValue,
                  { color: pendingCount > 0 ? colors.foreground : subtitleColor },
                ]}
              >
                {pendingCount}
              </Text>
              <Text style={[styles.countLabel, { color: subtitleColor }]}>Pending</Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: dividerColor }]} />

            <TouchableOpacity
              style={styles.countItem}
              onPress={onViewOverdue}
              disabled={!onViewOverdue || overdueCount === 0}
              activeOpacity={onViewOverdue ? 0.6 : 1}
            >
              <Text
                style={[
                  styles.countValue,
                  { color: overdueCount > 0 ? Palette.red : subtitleColor },
                ]}
              >
                {overdueCount}
              </Text>
              <Text style={[styles.countLabel, { color: subtitleColor }]}>Overdue</Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: dividerColor }]} />

            <View style={styles.countItem}>
              <Text style={[styles.countValue, { color: colors.foreground }]}>
                {Math.round(stats!.collectionRate)}%
              </Text>
              <Text style={[styles.countLabel, { color: subtitleColor }]}>Collected</Text>
            </View>
          </View>
        </>
      )}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: { fontSize: 16, fontWeight: '600' },
  emptyState: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyText: { fontSize: 13, fontWeight: '500' },

  /* Headline */
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headlineLeft: { flex: 1 },
  headlineLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  headlineValue: { fontSize: 22, fontWeight: '700' },
  headlineSub: { fontSize: 11, marginTop: 2 },
  outstandingChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'flex-end',
    maxWidth: '48%',
  },
  outstandingLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  outstandingValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 1,
  },

  /* Counts row */
  countsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  countItem: { flex: 1, alignItems: 'center', gap: 2 },
  countValue: { fontSize: 18, fontWeight: '700' },
  countLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  divider: { width: 1, height: 28 },
});

export default InvoicingTile;
