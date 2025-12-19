import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// Deal card component
function DealCard({
  title,
  company,
  value,
  stage,
  probability,
  daysInStage,
}: {
  title: string;
  company: string;
  value: string;
  stage: string;
  probability: number;
  daysInStage: number;
}) {
  return (
    <TouchableOpacity activeOpacity={0.7} style={styles.dealCard}>
      <BlurView intensity={15} tint="dark" style={styles.dealCardBlur}>
        <View className="p-4">
          <Text className="text-white font-semibold text-base" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-white/50 text-sm mt-1">{company}</Text>
          <Text className="text-white font-bold text-lg mt-3">{value}</Text>
          <View className="flex-row items-center justify-between mt-3">
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.4)" />
              <Text className="text-white/40 text-xs ml-1">{daysInStage}d</Text>
            </View>
            <Text className="text-white/50 text-xs">{probability}%</Text>
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}

// Pipeline stage component
function PipelineStage({
  title,
  count,
  total,
  color,
  deals,
}: {
  title: string;
  count: number;
  total: string;
  color: string;
  deals: Array<{
    title: string;
    company: string;
    value: string;
    probability: number;
    daysInStage: number;
  }>;
}) {
  return (
    <View style={styles.stageContainer}>
      {/* Stage header */}
      <View style={[styles.stageHeader, { borderLeftColor: color }]}>
        <View className="flex-row items-center">
          <Text className="text-white font-semibold text-sm">{title}</Text>
          <View style={styles.countBadge}>
            <Text className="text-white text-xs font-medium">{count}</Text>
          </View>
        </View>
        <Text className="text-white/50 text-xs mt-1">{total}</Text>
      </View>

      {/* Deals */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {deals.map((deal, index) => (
          <DealCard key={index} {...deal} stage={title} />
        ))}
      </ScrollView>
    </View>
  );
}

export default function DealsScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  // Sample pipeline data
  const stages = [
    {
      title: 'Qualification',
      count: 4,
      total: '$45,000',
      color: '#3b82f6',
      deals: [
        { title: 'Enterprise License', company: 'Acme Corp', value: '$15,000', probability: 20, daysInStage: 3 },
        { title: 'Annual Plan', company: 'TechStart', value: '$8,500', probability: 30, daysInStage: 5 },
        { title: 'Startup Package', company: 'NewCo', value: '$12,000', probability: 25, daysInStage: 2 },
        { title: 'Team License', company: 'Digital Inc', value: '$9,500', probability: 15, daysInStage: 7 },
      ],
    },
    {
      title: 'Proposal',
      count: 3,
      total: '$82,500',
      color: '#8b5cf6',
      deals: [
        { title: 'Enterprise Suite', company: 'Global Solutions', value: '$45,000', probability: 50, daysInStage: 8 },
        { title: 'Pro Plan', company: 'Innovate Ltd', value: '$22,500', probability: 60, daysInStage: 4 },
        { title: 'Business Package', company: 'Scale Up', value: '$15,000', probability: 45, daysInStage: 6 },
      ],
    },
    {
      title: 'Negotiation',
      count: 2,
      total: '$121,000',
      color: '#22c55e',
      deals: [
        { title: 'Corporate Deal', company: 'Enterprise Co', value: '$75,000', probability: 80, daysInStage: 12 },
        { title: 'Annual Contract', company: 'BigCorp', value: '$46,000', probability: 75, daysInStage: 9 },
      ],
    },
  ];

  return (
    <View className="flex-1">
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#0f172a']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View className="px-5 pb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-white text-2xl font-bold">Pipeline</Text>
            <View className="flex-row items-center">
              <TouchableOpacity style={styles.iconButton} className="mr-2">
                <Ionicons name="filter-outline" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton}>
                <Ionicons name="add" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Summary */}
          <View className="flex-row items-center justify-between mt-2">
            <View>
              <Text className="text-white/50 text-sm">Total Value</Text>
              <Text className="text-white font-bold text-xl">$248,500</Text>
            </View>
            <View className="items-end">
              <Text className="text-white/50 text-sm">9 Deals</Text>
              <Text className="text-green-500 text-sm">+12% this month</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Pipeline stages */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
          />
        }
      >
        {stages.map((stage, index) => (
          <PipelineStage key={index} {...stage} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageContainer: {
    width: width * 0.75,
    marginRight: 12,
    marginTop: 16,
  },
  stageHeader: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  dealCard: {
    marginBottom: 10,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dealCardBlur: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});
