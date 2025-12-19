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
}: {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <View style={styles.statCard}>
      <BlurView intensity={20} tint="dark" style={styles.statCardBlur}>
        <View className="p-4">
          <View className="flex-row items-center justify-between mb-2">
            <View
              style={[styles.iconContainer, { backgroundColor: `${color}20` }]}
            >
              <Ionicons name={icon} size={20} color={color} />
            </View>
            {trend && (
              <View className="flex-row items-center">
                <Ionicons
                  name={trendUp ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={trendUp ? '#22c55e' : '#ef4444'}
                />
                <Text
                  className={`text-xs ml-1 ${trendUp ? 'text-green-500' : 'text-red-500'}`}
                >
                  {trend}
                </Text>
              </View>
            )}
          </View>
          <Text className="text-2xl font-bold text-white mb-1">{value}</Text>
          <Text className="text-sm text-white/60">{title}</Text>
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
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.quickAction}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text className="text-white/80 text-xs mt-2 text-center">{title}</Text>
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
}: {
  title: string;
  description: string;
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View className="flex-row items-start py-3 border-b border-white/5">
      <View
        style={[styles.activityIcon, { backgroundColor: `${color}20` }]}
      >
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-white font-medium text-sm">{title}</Text>
        <Text className="text-white/50 text-xs mt-0.5">{description}</Text>
      </View>
      <Text className="text-white/40 text-xs">{time}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  return (
    <View className="flex-1 bg-slate-900">
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#0f172a']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {/* Header */}
        <View
          style={[styles.header, { paddingTop: insets.top + 10 }]}
        >
          <View className="flex-row items-center justify-between px-5 pb-4">
            <View>
              <Text className="text-white/60 text-sm">{getGreeting()}</Text>
              <Text className="text-white text-xl font-bold">{firstName}</Text>
            </View>
            <View className="flex-row items-center">
              <TouchableOpacity className="mr-4">
                <View style={styles.notificationBadge}>
                  <Ionicons name="notifications-outline" size={24} color="white" />
                  <View style={styles.badge} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={logout}>
                <View style={styles.avatar}>
                  <Text className="text-white font-bold text-base">
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
              tintColor="#3b82f6"
            />
          }
        >
          {/* Stats Grid */}
          <View className="px-5 mt-4">
            <Text className="text-white font-semibold text-lg mb-3">Overview</Text>
            <View className="flex-row flex-wrap justify-between">
              <StatCard
                title="Total Leads"
                value="124"
                icon="people-outline"
                color="#3b82f6"
                trend="+12%"
                trendUp
              />
              <StatCard
                title="Active Deals"
                value="38"
                icon="briefcase-outline"
                color="#8b5cf6"
                trend="+5%"
                trendUp
              />
              <StatCard
                title="Contacts"
                value="892"
                icon="person-outline"
                color="#22c55e"
              />
              <StatCard
                title="Tasks Due"
                value="7"
                icon="checkbox-outline"
                color="#f59e0b"
              />
            </View>
          </View>

          {/* Quick Actions */}
          <View className="px-5 mt-6">
            <Text className="text-white font-semibold text-lg mb-3">Quick Actions</Text>
            <View style={styles.quickActionsContainer}>
              <BlurView intensity={15} tint="dark" style={styles.quickActionsBlur}>
                <View className="flex-row justify-around py-4">
                  <QuickAction
                    title="Add Lead"
                    icon="person-add-outline"
                    color="#3b82f6"
                  />
                  <QuickAction
                    title="New Deal"
                    icon="add-circle-outline"
                    color="#8b5cf6"
                  />
                  <QuickAction
                    title="Schedule"
                    icon="calendar-outline"
                    color="#22c55e"
                  />
                  <QuickAction
                    title="Call"
                    icon="call-outline"
                    color="#f59e0b"
                  />
                </View>
              </BlurView>
            </View>
          </View>

          {/* Recent Activity */}
          <View className="px-5 mt-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white font-semibold text-lg">Recent Activity</Text>
              <TouchableOpacity>
                <Text className="text-primary text-sm">See all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.activityContainer}>
              <BlurView intensity={15} tint="dark" style={styles.activityBlur}>
                <View className="px-4">
                  <ActivityItem
                    title="New lead added"
                    description="John Smith from Acme Corp"
                    time="2m ago"
                    icon="person-add"
                    color="#3b82f6"
                  />
                  <ActivityItem
                    title="Deal stage updated"
                    description="Enterprise Plan moved to Negotiation"
                    time="1h ago"
                    icon="briefcase"
                    color="#8b5cf6"
                  />
                  <ActivityItem
                    title="Task completed"
                    description="Follow up call with Sarah"
                    time="2h ago"
                    icon="checkmark-circle"
                    color="#22c55e"
                  />
                  <ActivityItem
                    title="Email sent"
                    description="Proposal sent to TechStart Inc"
                    time="3h ago"
                    icon="mail"
                    color="#f59e0b"
                  />
                  <ActivityItem
                    title="Meeting scheduled"
                    description="Demo with Global Solutions"
                    time="5h ago"
                    icon="calendar"
                    color="#ec4899"
                  />
                </View>
              </BlurView>
            </View>
          </View>

          {/* Pipeline Overview */}
          <View className="px-5 mt-6">
            <Text className="text-white font-semibold text-lg mb-3">Pipeline Overview</Text>
            <View style={styles.pipelineContainer}>
              <BlurView intensity={15} tint="dark" style={styles.pipelineBlur}>
                <View className="p-4">
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-white/60 text-sm">Total Value</Text>
                    <Text className="text-white font-bold text-xl">$248,500</Text>
                  </View>

                  {/* Pipeline stages */}
                  <View className="mb-3">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-white/70 text-sm">Qualification</Text>
                      <Text className="text-white/70 text-sm">$45,000</Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: '18%', backgroundColor: '#3b82f6' }]} />
                    </View>
                  </View>

                  <View className="mb-3">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-white/70 text-sm">Proposal</Text>
                      <Text className="text-white/70 text-sm">$82,500</Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: '33%', backgroundColor: '#8b5cf6' }]} />
                    </View>
                  </View>

                  <View className="mb-3">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-white/70 text-sm">Negotiation</Text>
                      <Text className="text-white/70 text-sm">$121,000</Text>
                    </View>
                    <View style={styles.progressBar}>
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
  header: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
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
  statCard: {
    width: (width - 50) / 2,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statCardBlur: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionsContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickActionsBlur: {
    backgroundColor: 'rgba(255,255,255,0.05)',
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
  activityContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activityBlur: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipelineContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pipelineBlur: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
