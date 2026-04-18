import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';

interface PerformanceTileProps {
  winRate: number;
  avgTimeToCloseDays: number;
  avgDealValue: number;
  formatCurrency: (value: number) => string;
  onPress?: () => void;
}

export function PerformanceTile({
  winRate,
  avgTimeToCloseDays,
  avgDealValue,
  formatCurrency,
  onPress,
}: PerformanceTileProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const isEmpty = winRate === 0 && avgTimeToCloseDays === 0 && avgDealValue === 0;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
  const dividerColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >
      <BlurView
        intensity={15}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.card,
          {
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(0,0,0,0.03)',
            borderColor: isDark
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(0,0,0,0.1)',
          },
        ]}
      >
        <View style={styles.header}>
          <Ionicons name="trophy-outline" size={18} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>
            Performance
          </Text>
        </View>

        {isEmpty ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: subtitleColor }]}>
              Close your first lead to see win rate.
            </Text>
          </View>
        ) : (
          <View style={styles.row}>
            <View style={styles.metric}>
              <Text style={[styles.metricValuePrimary, { color: colors.primary }]}>
                {Math.round(winRate)}%
              </Text>
              <Text style={[styles.metricLabel, { color: subtitleColor }]}>
                Win rate
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: dividerColor }]} />

            <View style={styles.metric}>
              <Text style={[styles.metricValue, { color: colors.foreground }]}>
                {Math.round(avgTimeToCloseDays)}
                <Text style={[styles.metricUnit, { color: subtitleColor }]}> d</Text>
              </Text>
              <Text style={[styles.metricLabel, { color: subtitleColor }]}>
                Avg close
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: dividerColor }]} />

            <View style={styles.metric}>
              <Text
                style={[styles.metricValue, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {formatCurrency(avgDealValue)}
              </Text>
              <Text style={[styles.metricLabel, { color: subtitleColor }]}>
                Avg deal
              </Text>
            </View>
          </View>
        )}
      </BlurView>
    </TouchableOpacity>
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
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricValuePrimary: {
    fontSize: 26,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  metricUnit: {
    fontSize: 13,
    fontWeight: '500',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  divider: {
    width: 1,
    height: 36,
    marginHorizontal: 4,
  },
  emptyState: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default PerformanceTile;
