import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { RevenueMetric } from '@/types/dashboard';

interface RevenueChartProps {
  data: RevenueMetric[];
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 64; // Account for padding
  const chartHeight = 160;
  const barWidth = (chartWidth - 40) / Math.max(data.length, 1) - 8;
  const maxValue = Math.max(...data.map((d) => d.revenue), 1);

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const currentMonth = data[data.length - 1];
  const previousMonth = data[data.length - 2];
  const change =
    previousMonth && previousMonth.revenue > 0
      ? Math.round(
          ((currentMonth?.revenue - previousMonth.revenue) /
            previousMonth.revenue) *
            100
        )
      : 0;

  return (
    <View style={styles.container}>
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
          <View style={styles.headerLeft}>
            <Ionicons
              name="trending-up-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.title, { color: colors.foreground }]}>
              Revenue Trend
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>
              Total
            </Text>
            <Text style={[styles.totalValue, { color: colors.foreground }]}>
              {formatCurrency(totalRevenue)}
            </Text>
          </View>
        </View>

        {data.length === 0 || totalRevenue === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="bar-chart-outline"
              size={40}
              color={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
            />
            <Text
              style={[
                styles.emptyText,
                { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' },
              ]}
            >
              No revenue data yet
            </Text>
          </View>
        ) : (
          <View style={styles.chartContainer}>
            <Svg width={chartWidth} height={chartHeight}>
              {/* Grid lines */}
              {[0.25, 0.5, 0.75, 1].map((ratio, i) => (
                <Line
                  key={i}
                  x1={0}
                  y1={chartHeight - 30 - (chartHeight - 50) * ratio}
                  x2={chartWidth}
                  y2={chartHeight - 30 - (chartHeight - 50) * ratio}
                  stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
              ))}

              {/* Bars */}
              {data.map((item, index) => {
                const barHeight =
                  maxValue > 0
                    ? ((item.revenue / maxValue) * (chartHeight - 50))
                    : 0;
                const x = 20 + index * (barWidth + 8);
                const y = chartHeight - 30 - barHeight;
                const isCurrentMonth = index === data.length - 1;

                return (
                  <React.Fragment key={item.month}>
                    <Rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barHeight, 2)}
                      rx={4}
                      fill={isCurrentMonth ? colors.primary : `${colors.primary}60`}
                    />
                    <SvgText
                      x={x + barWidth / 2}
                      y={chartHeight - 10}
                      fontSize={10}
                      fill={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}
                      textAnchor="middle"
                    >
                      {item.month.split(' ')[0].slice(0, 3)}
                    </SvgText>
                  </React.Fragment>
                );
              })}
            </Svg>
          </View>
        )}

        {change !== 0 && totalRevenue > 0 && (
          <View
            style={[
              styles.changeIndicator,
              {
                backgroundColor:
                  change >= 0
                    ? 'rgba(34, 197, 94, 0.1)'
                    : 'rgba(239, 68, 68, 0.1)',
              },
            ]}
          >
            <Ionicons
              name={change >= 0 ? 'arrow-up' : 'arrow-down'}
              size={14}
              color={change >= 0 ? '#22c55e' : '#ef4444'}
            />
            <Text
              style={[
                styles.changeText,
                { color: change >= 0 ? '#22c55e' : '#ef4444' },
              ]}
            >
              {Math.abs(change)}% vs last month
            </Text>
          </View>
        )}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  chartContainer: {
    marginTop: 8,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default RevenueChart;
