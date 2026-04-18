import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { TodaysAgendaItem } from '@/types/dashboard';

interface TodaysAgendaProps {
  items: TodaysAgendaItem[];
  isLoading?: boolean;
  onItemPress: (item: TodaysAgendaItem) => void;
  onComplete: (item: TodaysAgendaItem) => Promise<void> | void;
}

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  TASK: 'checkbox-outline',
  CALL: 'call-outline',
  MEETING: 'briefcase-outline',
  EMAIL: 'mail-outline',
  NOTE: 'document-text-outline',
};

const TYPE_COLORS: Record<string, string> = {
  TASK: '#f59e0b',
  CALL: '#3b82f6',
  MEETING: '#8b5cf6',
  EMAIL: '#22c55e',
  NOTE: '#64748b',
};

function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function TodaysAgenda({
  items,
  isLoading,
  onItemPress,
  onComplete,
}: TodaysAgendaProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];
  const [completingId, setCompletingId] = useState<string | null>(null);

  const displayItems = items.slice(0, 10);

  const handleComplete = async (item: TodaysAgendaItem) => {
    setCompletingId(item.id);
    try {
      await onComplete(item);
    } finally {
      setCompletingId(null);
    }
  };

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
          <Ionicons name="today-outline" size={18} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>
            Today&apos;s Agenda
          </Text>
          {displayItems.length > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{items.length}</Text>
            </View>
          )}
        </View>

        {isLoading ? (
          <View style={styles.skeletonContainer}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.skeletonRow,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(0,0,0,0.04)',
                  },
                ]}
              />
            ))}
          </View>
        ) : displayItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="calendar-outline"
              size={36}
              color={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
            />
            <Text
              style={[
                styles.emptyText,
                {
                  color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                },
              ]}
            >
              No agenda for today
            </Text>
          </View>
        ) : (
          <View style={styles.itemsContainer}>
            {displayItems.map((item) => {
              const icon = TYPE_ICONS[item.type] || 'ellipse-outline';
              const typeColor = TYPE_COLORS[item.type] || colors.primary;
              const time = formatTime(item.dueDate);
              const isCompleting = completingId === item.id;

              return (
                <View key={item.id} style={styles.itemRow}>
                  <TouchableOpacity
                    style={styles.itemMain}
                    onPress={() => onItemPress(item)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.itemIcon,
                        { backgroundColor: `${typeColor}20` },
                      ]}
                    >
                      <Ionicons name={icon} size={16} color={typeColor} />
                    </View>
                    <View style={styles.itemContent}>
                      <Text
                        style={[styles.itemTitle, { color: colors.foreground }]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <View style={styles.itemMeta}>
                        {time ? (
                          <Text
                            style={[styles.itemTime, { color: typeColor }]}
                          >
                            {time}
                          </Text>
                        ) : null}
                        {item.leadTitle ? (
                          <Text
                            style={[
                              styles.itemLead,
                              {
                                color: isDark
                                  ? 'rgba(255,255,255,0.5)'
                                  : 'rgba(0,0,0,0.5)',
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {time ? ' · ' : ''}
                            {item.leadTitle}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.completeButton,
                      {
                        backgroundColor: isDark
                          ? 'rgba(34,197,94,0.15)'
                          : 'rgba(34,197,94,0.12)',
                      },
                    ]}
                    onPress={() => handleComplete(item)}
                    disabled={isCompleting}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, left: 6, right: 6, bottom: 6 }}
                  >
                    {isCompleting ? (
                      <ActivityIndicator size="small" color="#22c55e" />
                    ) : (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color="#22c55e"
                      />
                    )}
                  </TouchableOpacity>
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
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  itemsContainer: {
    gap: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTime: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemLead: {
    fontSize: 11,
    flex: 1,
  },
  completeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
  },
  skeletonContainer: {
    gap: 8,
    paddingVertical: 4,
  },
  skeletonRow: {
    height: 44,
    borderRadius: 10,
  },
});

export default TodaysAgenda;
