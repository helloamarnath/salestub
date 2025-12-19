import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { useState } from 'react';

const { width } = Dimensions.get('window');

// Stat card component
function StatCard({
  title,
  value,
  icon,
  color,
  trend,
  trendUp,
  isDark,
}: {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  trend?: string;
  trendUp?: boolean;
  isDark: boolean;
}) {
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const bgColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)';
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';

  return (
    <View style={[styles.statCard, { borderColor }]}>
      <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={[styles.statCardBlur, { backgroundColor: bgColor }]}>
        <View style={styles.statCardContent}>
          <View style={styles.statCardHeader}>
            <View
              style={[styles.iconContainer, { backgroundColor: `${color}20` }]}
            >
              <Ionicons name={icon} size={20} color={color} />
            </View>
            {trend && (
              <View style={styles.trendContainer}>
                <Ionicons
                  name={trendUp ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={trendUp ? '#22c55e' : '#ef4444'}
                />
                <Text
                  style={[styles.trendText, { color: trendUp ? '#22c55e' : '#ef4444' }]}
                >
                  {trend}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
          <Text style={[styles.statTitle, { color: subtitleColor }]}>{title}</Text>
        </View>
      </BlurView>
    </View>
  );
}

// Quick action button component
function QuickAction({
  title,
  icon,
  color,
  onPress,
  isDark,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress?: () => void;
  isDark: boolean;
}) {
  const textColor = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.quickAction}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.quickActionText, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
  );
}

// Activity item component
function ActivityItem({
  title,
  description,
  time,
  icon,
  color,
  isDark,
}: {
  title: string;
  description: string;
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  isDark: boolean;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const timeColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  return (
    <View style={[styles.activityItem, { borderBottomColor: borderColor }]}>
      <View
        style={[styles.activityIcon, { backgroundColor: `${color}20` }]}
      >
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={styles.activityContent}>
        <Text style={[styles.activityTitle, { color: textColor }]}>{title}</Text>
        <Text style={[styles.activityDescription, { color: subtitleColor }]}>{description}</Text>
      </View>
      <Text style={[styles.activityTime, { color: timeColor }]}>{time}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1500);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.firstName || 'User';

  // Background gradient colors
  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];

  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const bgColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)';
  const headerBorderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? 'white' : colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const mutedColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {/* Header */}
        <View
          style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: headerBorderColor }]}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={[styles.greeting, { color: subtitleColor }]}>{getGreeting()}</Text>
              <Text style={[styles.userName, { color: textColor }]}>{firstName}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.notificationButton}>
                <View style={styles.notificationBadge}>
                  <Ionicons name="notifications-outline" size={24} color={textColor} />
                  <View style={styles.badge} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={logout}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {firstName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Stats Grid */}
          <View style={styles.statsSection}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Overview</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Leads"
                value="124"
                icon="people-outline"
                color="#3b82f6"
                trend="+12%"
                trendUp
                isDark={isDark}
              />
              <StatCard
                title="Active Deals"
                value="38"
                icon="briefcase-outline"
                color="#8b5cf6"
                trend="+5%"
                trendUp
                isDark={isDark}
              />
              <StatCard
                title="Contacts"
                value="892"
                icon="person-outline"
                color="#22c55e"
                isDark={isDark}
              />
              <StatCard
                title="Tasks Due"
                value="7"
                icon="checkbox-outline"
                color="#f59e0b"
                isDark={isDark}
              />
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActionsSection}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Quick Actions</Text>
            <View style={[styles.quickActionsContainer, { borderColor }]}>
              <BlurView intensity={15} tint={isDark ? 'dark' : 'light'} style={[styles.quickActionsBlur, { backgroundColor: bgColor }]}>
                <View style={styles.quickActionsRow}>
                  <QuickAction
                    title="Add Lead"
                    icon="person-add-outline"
                    color="#3b82f6"
                    isDark={isDark}
                  />
                  <QuickAction
                    title="New Deal"
                    icon="add-circle-outline"
                    color="#8b5cf6"
                    isDark={isDark}
                  />
                  <QuickAction
                    title="Schedule"
                    icon="calendar-outline"
                    color="#22c55e"
                    isDark={isDark}
                  />
                  <QuickAction
                    title="Call"
                    icon="call-outline"
                    color="#f59e0b"
                    isDark={isDark}
                  />
                </View>
              </BlurView>
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.activitySection}>
            <View style={styles.activityHeader}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Recent Activity</Text>
              <TouchableOpacity>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.activityContainer, { borderColor }]}>
              <BlurView intensity={15} tint={isDark ? 'dark' : 'light'} style={[styles.activityBlur, { backgroundColor: bgColor }]}>
                <View style={styles.activityList}>
                  <ActivityItem
                    title="New lead added"
                    description="John Smith from Acme Corp"
                    time="2m ago"
                    icon="person-add"
                    color="#3b82f6"
                    isDark={isDark}
                  />
                  <ActivityItem
                    title="Deal stage updated"
                    description="Enterprise Plan moved to Negotiation"
                    time="1h ago"
                    icon="briefcase"
                    color="#8b5cf6"
                    isDark={isDark}
                  />
                  <ActivityItem
                    title="Task completed"
                    description="Follow up call with Sarah"
                    time="2h ago"
                    icon="checkmark-circle"
                    color="#22c55e"
                    isDark={isDark}
                  />
                  <ActivityItem
                    title="Email sent"
                    description="Proposal sent to TechStart Inc"
                    time="3h ago"
                    icon="mail"
                    color="#f59e0b"
                    isDark={isDark}
                  />
                  <ActivityItem
                    title="Meeting scheduled"
                    description="Demo with Global Solutions"
                    time="5h ago"
                    icon="calendar"
                    color="#ec4899"
                    isDark={isDark}
                  />
                </View>
              </BlurView>
            </View>
          </View>

          {/* Pipeline Overview */}
          <View style={styles.pipelineSection}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Pipeline Overview</Text>
            <View style={[styles.pipelineContainer, { borderColor }]}>
              <BlurView intensity={15} tint={isDark ? 'dark' : 'light'} style={[styles.pipelineBlur, { backgroundColor: bgColor }]}>
                <View style={styles.pipelineContent}>
                  <View style={styles.pipelineHeader}>
                    <Text style={[styles.pipelineLabel, { color: subtitleColor }]}>Total Value</Text>
                    <Text style={[styles.pipelineValue, { color: textColor }]}>$248,500</Text>
                  </View>

                  {/* Pipeline stages */}
                  <View style={styles.pipelineStage}>
                    <View style={styles.pipelineStageHeader}>
                      <Text style={[styles.pipelineStageName, { color: mutedColor }]}>Qualification</Text>
                      <Text style={[styles.pipelineStageValue, { color: mutedColor }]}>$45,000</Text>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                      <View style={[styles.progressFill, { width: '18%', backgroundColor: '#3b82f6' }]} />
                    </View>
                  </View>

                  <View style={styles.pipelineStage}>
                    <View style={styles.pipelineStageHeader}>
                      <Text style={[styles.pipelineStageName, { color: mutedColor }]}>Proposal</Text>
                      <Text style={[styles.pipelineStageValue, { color: mutedColor }]}>$82,500</Text>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                      <View style={[styles.progressFill, { width: '33%', backgroundColor: '#8b5cf6' }]} />
                    </View>
                  </View>

                  <View style={styles.pipelineStage}>
                    <View style={styles.pipelineStageHeader}>
                      <Text style={[styles.pipelineStageName, { color: mutedColor }]}>Negotiation</Text>
                      <Text style={[styles.pipelineStageValue, { color: mutedColor }]}>$121,000</Text>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                      <View style={[styles.progressFill, { width: '49%', backgroundColor: '#22c55e' }]} />
                    </View>
                  </View>
                </View>
              </BlurView>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 14,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    marginRight: 16,
  },
  notificationBadge: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1,
    borderColor: '#0f172a',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statsSection: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 18,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 50) / 2,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  statCardBlur: {},
  statCardContent: {
    padding: 16,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 12,
    marginLeft: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  quickActionsContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  quickActionsBlur: {},
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  quickAction: {
    alignItems: 'center',
    width: 70,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  activitySection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
  },
  activityContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  activityBlur: {},
  activityList: {
    paddingHorizontal: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontWeight: '500',
    fontSize: 14,
  },
  activityDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
  },
  pipelineSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  pipelineContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  pipelineBlur: {},
  pipelineContent: {
    padding: 16,
  },
  pipelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pipelineLabel: {
    fontSize: 14,
  },
  pipelineValue: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  pipelineStage: {
    marginBottom: 12,
  },
  pipelineStageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pipelineStageName: {
    fontSize: 14,
  },
  pipelineStageValue: {
    fontSize: 14,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
