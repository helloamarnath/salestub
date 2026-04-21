import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/theme-context';
import { Colors, Palette } from '@/constants/theme';

export type LifecycleAccent = 'red' | 'green' | 'blue' | 'muted' | 'purple' | 'amber';

interface LifecycleCardProps {
  title: string;
  count: number;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: LifecycleAccent;
  alert?: boolean;
  onPress?: () => void;
  formatCurrency: (value: number) => string;
}

const ACCENT_COLORS: Record<LifecycleAccent, string> = {
  red: Palette.red,
  green: Palette.emerald,
  blue: Palette.blue,
  muted: '#64748b',
  purple: Palette.purple,
  amber: Palette.amber,
};

export function LifecycleCard({
  title,
  count,
  value,
  icon,
  accent = 'blue',
  alert,
  onPress,
  formatCurrency,
}: LifecycleCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];
  const accentColor = ACCENT_COLORS[accent];

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
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
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${accentColor}20` },
            ]}
          >
            <Ionicons name={icon} size={16} color={accentColor} />
          </View>
          {alert && <View style={styles.alertDot} />}
        </View>

        <Text
          style={[
            styles.title,
            { color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' },
          ]}
        >
          {title}
        </Text>

        <Text style={[styles.count, { color: colors.foreground }]}>
          {count.toLocaleString()}
        </Text>

        <Text
          style={[
            styles.value,
            { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' },
          ]}
          numberOfLines={1}
        >
          {formatCurrency(value)}
        </Text>
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: '47%',
  },
  card: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.red,
    marginTop: 4,
    marginRight: 2,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  count: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
  },
  value: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default LifecycleCard;
