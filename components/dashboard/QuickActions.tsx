import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';

interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}

interface QuickActionsProps {
  actions?: QuickAction[];
  onAddLead?: () => void;
  onAddDeal?: () => void;
  onAddTask?: () => void;
  onAddContact?: () => void;
}

const defaultActions = (props: QuickActionsProps): QuickAction[] => [
  {
    id: 'lead',
    label: 'Lead',
    icon: 'person-add-outline',
    color: '#8b5cf6',
    onPress: props.onAddLead || (() => {}),
  },
  {
    id: 'deal',
    label: 'Deal',
    icon: 'briefcase-outline',
    color: '#22c55e',
    onPress: props.onAddDeal || (() => {}),
  },
  {
    id: 'task',
    label: 'Task',
    icon: 'checkbox-outline',
    color: '#f59e0b',
    onPress: props.onAddTask || (() => {}),
  },
  {
    id: 'contact',
    label: 'Contact',
    icon: 'people-outline',
    color: '#3b82f6',
    onPress: props.onAddContact || (() => {}),
  },
];

export function QuickActions(props: QuickActionsProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const actions = props.actions || defaultActions(props);

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
          <Ionicons name="flash-outline" size={18} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>
            Quick Actions
          </Text>
        </View>

        <View style={styles.actionsGrid}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionButton}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: `${action.color}20` },
                ]}
              >
                <Ionicons name={action.icon} size={22} color={action.color} />
              </View>
              <Text
                style={[
                  styles.actionLabel,
                  {
                    color: isDark
                      ? 'rgba(255,255,255,0.7)'
                      : 'rgba(0,0,0,0.7)',
                  },
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default QuickActions;
