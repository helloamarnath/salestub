import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { StageMetric } from '@/types/dashboard';

interface PipelineProgressProps {
  stages: StageMetric[];
  totalValue: number;
}

// Stage colors for visual differentiation
const STAGE_COLORS: Record<string, string> = {
  PROSPECTING: '#8b5cf6',
  QUALIFICATION: '#3b82f6',
  PROPOSAL: '#06b6d4',
  NEGOTIATION: '#f59e0b',
  CLOSED_WON: '#22c55e',
  CLOSED_LOST: '#ef4444',
};

const STAGE_LABELS: Record<string, string> = {
  PROSPECTING: 'Prospecting',
  QUALIFICATION: 'Qualification',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Won',
  CLOSED_LOST: 'Lost',
};

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function PipelineProgress({ stages, totalValue }: PipelineProgressProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  // Filter out closed stages for pipeline view
  const activeStages = stages.filter(
    (s) => s.stage !== 'CLOSED_WON' && s.stage !== 'CLOSED_LOST'
  );

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
            <Ionicons name="analytics-outline" size={18} color={colors.primary} />
            <Text style={[styles.title, { color: colors.foreground }]}>
              Pipeline Overview
            </Text>
          </View>
          <Text style={[styles.totalValue, { color: colors.primary }]}>
            {formatCurrency(totalValue)}
          </Text>
        </View>

        {activeStages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text
              style={[
                styles.emptyText,
                { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' },
              ]}
            >
              No active deals in pipeline
            </Text>
          </View>
        ) : (
          <View style={styles.stagesContainer}>
            {activeStages.map((stage, index) => {
              const percentage =
                totalValue > 0
                  ? Math.round((stage.value / totalValue) * 100)
                  : 0;
              const stageColor = STAGE_COLORS[stage.stage] || '#6b7280';
              const stageLabel = STAGE_LABELS[stage.stage] || stage.stage;

              return (
                <View key={stage.stage} style={styles.stageRow}>
                  <View style={styles.stageInfo}>
                    <View
                      style={[
                        styles.stageDot,
                        { backgroundColor: stageColor },
                      ]}
                    />
                    <Text
                      style={[
                        styles.stageLabel,
                        {
                          color: isDark
                            ? 'rgba(255,255,255,0.7)'
                            : 'rgba(0,0,0,0.7)',
                        },
                      ]}
                    >
                      {stageLabel}
                    </Text>
                    <Text
                      style={[
                        styles.stageCount,
                        {
                          color: isDark
                            ? 'rgba(255,255,255,0.4)'
                            : 'rgba(0,0,0,0.4)',
                        },
                      ]}
                    >
                      ({stage.count})
                    </Text>
                  </View>

                  <View style={styles.progressContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          backgroundColor: isDark
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(0,0,0,0.1)',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: stageColor,
                            width: `${Math.max(percentage, 2)}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.stageValue,
                        { color: colors.foreground },
                      ]}
                    >
                      {formatCurrency(stage.value)}
                    </Text>
                  </View>
                </View>
              );
            })}
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
    alignItems: 'center',
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
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  stagesContainer: {
    gap: 14,
  },
  stageRow: {
    gap: 8,
  },
  stageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stageLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  stageCount: {
    fontSize: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  stageValue: {
    fontSize: 13,
    fontWeight: '600',
    width: 60,
    textAlign: 'right',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});

export default PipelineProgress;
