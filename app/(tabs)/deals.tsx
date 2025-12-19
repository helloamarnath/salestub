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
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

// Deal card component
function DealCard({
  title,
  company,
  value,
  stage,
  probability,
  daysInStage,
  isDark,
}: {
  title: string;
  company: string;
  value: string;
  stage: string;
  probability: number;
  daysInStage: number;
  isDark: boolean;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const mutedColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const bgColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)';

  return (
    <TouchableOpacity activeOpacity={0.7} style={[styles.dealCard, { borderColor }]}>
      <BlurView intensity={15} tint={isDark ? 'dark' : 'light'} style={[styles.dealCardBlur, { backgroundColor: bgColor }]}>
        <View style={styles.dealCardContent}>
          <Text style={[styles.dealTitle, { color: textColor }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.dealCompany, { color: subtitleColor }]}>{company}</Text>
          <Text style={[styles.dealValue, { color: textColor }]}>{value}</Text>
          <View style={styles.dealMeta}>
            <View style={styles.dealMetaItem}>
              <Ionicons name="time-outline" size={14} color={mutedColor} />
              <Text style={[styles.dealMetaText, { color: mutedColor }]}>{daysInStage}d</Text>
            </View>
            <Text style={[styles.dealProbability, { color: subtitleColor }]}>{probability}%</Text>
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
  isDark,
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
  isDark: boolean;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const headerBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const countBg = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={styles.stageContainer}>
      {/* Stage header */}
      <View style={[styles.stageHeader, { borderLeftColor: color, backgroundColor: headerBg }]}>
        <View style={styles.stageHeaderTop}>
          <Text style={[styles.stageTitle, { color: textColor }]}>{title}</Text>
          <View style={[styles.countBadge, { backgroundColor: countBg }]}>
            <Text style={[styles.countText, { color: textColor }]}>{count}</Text>
          </View>
        </View>
        <Text style={[styles.stageTotal, { color: subtitleColor }]}>{total}</Text>
      </View>

      {/* Deals */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {deals.map((deal, index) => (
          <DealCard key={index} {...deal} stage={title} isDark={isDark} />
        ))}
      </ScrollView>
    </View>
  );
}

export default function DealsScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  // Theme-aware colors
  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];

  const headerBorderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? 'white' : colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const iconButtonBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

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
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: headerBorderColor }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <Text style={[styles.title, { color: textColor }]}>Pipeline</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity style={[styles.iconButton, { backgroundColor: iconButtonBg }]}>
                <Ionicons name="filter-outline" size={20} color={textColor} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton}>
                <Ionicons name="add" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Summary */}
          <View style={styles.summary}>
            <View>
              <Text style={[styles.summaryLabel, { color: subtitleColor }]}>Total Value</Text>
              <Text style={[styles.summaryValue, { color: textColor }]}>$248,500</Text>
            </View>
            <View style={styles.summaryRight}>
              <Text style={[styles.summaryLabel, { color: subtitleColor }]}>9 Deals</Text>
              <Text style={styles.summaryTrend}>+12% this month</Text>
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
            tintColor={colors.primary}
          />
        }
      >
        {stages.map((stage, index) => (
          <PipelineStage key={index} {...stage} isDark={isDark} />
        ))}
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  summaryTrend: {
    color: '#22c55e',
    fontSize: 14,
  },
  stageContainer: {
    width: width * 0.75,
    marginRight: 12,
    marginTop: 16,
  },
  stageHeader: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
  },
  stageHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stageTitle: {
    fontWeight: '600',
    fontSize: 14,
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '500',
  },
  stageTotal: {
    fontSize: 12,
    marginTop: 4,
  },
  dealCard: {
    marginBottom: 10,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  dealCardBlur: {},
  dealCardContent: {
    padding: 16,
  },
  dealTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
  dealCompany: {
    fontSize: 14,
    marginTop: 4,
  },
  dealValue: {
    fontWeight: 'bold',
    fontSize: 18,
    marginTop: 12,
  },
  dealMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  dealMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dealMetaText: {
    fontSize: 12,
    marginLeft: 4,
  },
  dealProbability: {
    fontSize: 12,
  },
});
