import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import type { VisitStatus, VisitPurpose } from '@/types/visit';
import { VISIT_STATUS_LABELS, VISIT_PURPOSE_LABELS } from '@/types/visit';
import { Colors } from '@/constants/theme';

interface VisitStatusBadgeProps {
  status: VisitStatus;
  size?: 'small' | 'medium' | 'large';
}

export function VisitStatusBadge({ status, size = 'medium' }: VisitStatusBadgeProps) {
  const scheme = useColorScheme() ?? 'light';
  const themeColors = Colors[scheme];
  const statusColors: Record<VisitStatus, string> = {
    IN_PROGRESS: themeColors.primary,
    COMPLETED: '#22c55e',
    CANCELLED: '#ef4444',
  };
  const label = VISIT_STATUS_LABELS[status] || status;
  const color = statusColors[status] || '#6b7280';

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
        {label}
      </Text>
    </View>
  );
}

// Purpose badge with neutral styling
interface VisitPurposeBadgeProps {
  purpose: VisitPurpose;
  size?: 'small' | 'medium';
}

export function VisitPurposeBadge({ purpose, size = 'medium' }: VisitPurposeBadgeProps) {
  const label = VISIT_PURPOSE_LABELS[purpose] || purpose;
  const color = '#6b7280';

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
        styles.purposeBadge,
        {
          borderColor: `${color}40`,
          paddingHorizontal: currentSize.paddingHorizontal,
          paddingVertical: currentSize.paddingVertical,
        },
      ]}
    >
      <Text style={[styles.purposeText, { color, fontSize: currentSize.fontSize }]}>
        {label}
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
  purposeBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 6,
  },
  purposeText: {
    fontWeight: '500',
  },
});
