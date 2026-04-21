import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/theme-context';
import { Colors, Palette } from '@/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  onAddTask?: () => void;
  onAddContact?: () => void;
  onLogVisit?: () => void;
  onCreateQuote?: () => void;
  onCreateInvoice?: () => void;
  onImportLeads?: () => void;
  onSendWhatsApp?: () => void;
  onNewWorkflow?: () => void;
}

const primaryActions = (props: QuickActionsProps): QuickAction[] => [
  {
    id: 'lead',
    label: 'Lead',
    icon: 'person-add-outline',
    color: Palette.purple,
    onPress: props.onAddLead || (() => {}),
  },
  {
    id: 'task',
    label: 'Task',
    icon: 'checkbox-outline',
    color: Palette.amber,
    onPress: props.onAddTask || (() => {}),
  },
  {
    id: 'contact',
    label: 'Contact',
    icon: 'people-outline',
    color: Palette.blue,
    onPress: props.onAddContact || (() => {}),
  },
  {
    id: 'visit',
    label: 'Visit',
    icon: 'location-outline',
    color: Palette.emerald,
    onPress: props.onLogVisit || (() => {}),
  },
];

const secondaryActions = (props: QuickActionsProps): QuickAction[] => [
  {
    id: 'quote',
    label: 'Quote',
    icon: 'document-text-outline',
    color: Palette.cyan,
    onPress: props.onCreateQuote || (() => {}),
  },
  {
    id: 'invoice',
    label: 'Invoice',
    icon: 'receipt-outline',
    color: Palette.indigo,
    onPress: props.onCreateInvoice || (() => {}),
  },
  {
    id: 'import',
    label: 'Import',
    icon: 'cloud-upload-outline',
    color: Palette.pink,
    onPress: props.onImportLeads || (() => {}),
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: 'logo-whatsapp',
    color: '#25d366',
    onPress: props.onSendWhatsApp || (() => {}),
  },
  {
    id: 'workflow',
    label: 'Workflow',
    icon: 'git-branch-outline',
    color: '#f43f5e',
    onPress: props.onNewWorkflow || (() => {}),
  },
];

export function QuickActions(props: QuickActionsProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const [expanded, setExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const actions = props.actions || primaryActions(props);
  const extraActions = secondaryActions(props);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
    setExpanded(!expanded);
  };

  const chevronRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const renderAction = (action: QuickAction) => (
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
        numberOfLines={1}
      >
        {action.label}
      </Text>
    </TouchableOpacity>
  );

  const chunk = (arr: QuickAction[], size: number): QuickAction[][] => {
    const out: QuickAction[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      out.push(arr.slice(i, i + size));
    }
    return out;
  };

  const extraRows = chunk(extraActions, 4);

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
          {actions.map(renderAction)}
        </View>

        {expanded &&
          extraRows.map((row, idx) => (
            <View
              key={`row-${idx}`}
              style={[styles.actionsGrid, styles.secondaryRow]}
            >
              {row.map(renderAction)}
              {row.length < 4 &&
                Array.from({ length: 4 - row.length }).map((_, i) => (
                  <View key={`ph-${i}`} style={styles.actionButton} />
                ))}
            </View>
          ))}

        <TouchableOpacity
          style={styles.toggleButton}
          onPress={toggleExpanded}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.toggleText,
              {
                color: isDark
                  ? 'rgba(255,255,255,0.6)'
                  : 'rgba(0,0,0,0.6)',
              },
            ]}
          >
            {expanded ? 'Show less' : 'Show more'}
          </Text>
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <Ionicons
              name="chevron-down"
              size={14}
              color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'}
            />
          </Animated.View>
        </TouchableOpacity>
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
  secondaryRow: {
    marginTop: 16,
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
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 14,
    paddingVertical: 6,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default QuickActions;
