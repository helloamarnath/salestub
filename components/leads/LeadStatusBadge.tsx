import { View, Text, StyleSheet } from 'react-native';
import type { LeadStage } from '@/types/lead';
import { STAGE_TYPE_COLORS, SOURCE_COLORS } from '@/types/lead';

interface LeadStatusBadgeProps {
  stage?: LeadStage;
  stageName?: string;
  stageType?: 'OPEN' | 'CLOSED_WON' | 'CLOSED_LOST';
  size?: 'small' | 'medium' | 'large';
  isDark?: boolean;
}

export function LeadStatusBadge({
  stage,
  stageName,
  stageType,
  size = 'medium',
  isDark = true,
}: LeadStatusBadgeProps) {
  const name = stage?.name || stageName || 'Unknown';
  const type = stage?.type || stageType || 'OPEN';
  const color = STAGE_TYPE_COLORS[type];

  const sizeStyles = {
    small: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontSize: 10,
      borderRadius: 4,
    },
    medium: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      fontSize: 11,
      borderRadius: 8,
    },
    large: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      fontSize: 13,
      borderRadius: 10,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: `${color}20`,
          paddingHorizontal: currentSize.paddingHorizontal,
          paddingVertical: currentSize.paddingVertical,
          borderRadius: currentSize.borderRadius,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color, fontSize: currentSize.fontSize },
        ]}
      >
        {name}
      </Text>
    </View>
  );
}

// Score indicator dot
interface ScoreIndicatorProps {
  score?: number;
  size?: number;
}

export function ScoreIndicator({ score = 0, size = 8 }: ScoreIndicatorProps) {
  const getScoreColor = (s: number): string => {
    if (s >= 80) return '#3b82f6'; // High - Blue
    if (s >= 60) return '#22c55e'; // Medium-High - Green
    if (s >= 40) return '#f59e0b'; // Medium - Amber
    return '#ef4444'; // Low - Red
  };

  return (
    <View
      style={[
        styles.scoreDot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: getScoreColor(score),
        },
      ]}
    />
  );
}

// Source badge component
interface SourceBadgeProps {
  source?: string;
  size?: 'small' | 'medium';
}

export function SourceBadge({ source, size = 'medium' }: SourceBadgeProps) {
  if (!source) return null;

  const color = SOURCE_COLORS[source] || SOURCE_COLORS['Other'] || '#6b7280';

  const sizeStyles = {
    small: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontSize: 9,
    },
    medium: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      fontSize: 10,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <View
      style={[
        styles.sourceBadge,
        {
          borderColor: `${color}40`,
          paddingHorizontal: currentSize.paddingHorizontal,
          paddingVertical: currentSize.paddingVertical,
        },
      ]}
    >
      <Text style={[styles.sourceText, { color, fontSize: currentSize.fontSize }]}>
        {source}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
  scoreDot: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 6,
  },
  sourceText: {
    fontWeight: '500',
  },
});
