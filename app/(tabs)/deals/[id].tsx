import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
  RefreshControl,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { Colors } from '@/constants/theme';
import {
  getDeal,
  updateDeal,
  deleteDeal,
  advanceDealStage,
  closeDealWon,
  closeDealLost,
} from '@/lib/api/deals';
import { getDealActivities } from '@/lib/api/activities';
import type { Deal, DealStage, DealStatus } from '@/types/deal';
import type { Activity } from '@/types/activity';
import {
  DEAL_STAGE_LABELS,
  DEAL_STAGE_COLORS,
  DEAL_STATUS_LABELS,
  DEAL_STATUS_COLORS,
  formatDealValue,
} from '@/types/deal';
import { getContactFullName, getContactInitials, getAvatarColor } from '@/types/contact';
import { getCompanyInitials, COMPANY_TYPE_LABELS, COMPANY_TYPE_COLORS } from '@/types/company';
import {
  ACTIVITY_TYPE_ICONS,
  ACTIVITY_TYPE_COLORS,
  ACTIVITY_STATUS_COLORS,
  getRelativeTime,
} from '@/types/activity';

type TabKey = 'details' | 'contact' | 'company' | 'activities';

interface Tab {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TABS: Tab[] = [
  { key: 'details', label: 'Details', icon: 'document-text-outline' },
  { key: 'contact', label: 'Contact', icon: 'person-outline' },
  { key: 'company', label: 'Company', icon: 'business-outline' },
  { key: 'activities', label: 'Activities', icon: 'time-outline' },
];

// Info Row Component
function InfoRow({
  icon,
  label,
  value,
  isDark,
  onPress,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isDark: boolean;
  onPress?: () => void;
  valueColor?: string;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';

  const content = (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={20} color={subtitleColor} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: subtitleColor }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: valueColor || textColor }]}>{value}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={18} color={subtitleColor} />}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

// Section Card Component
function SectionCard({
  title,
  children,
  isDark,
}: {
  title?: string;
  children: React.ReactNode;
  isDark: boolean;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'white';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor }]}>
      {title && <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>}
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

// Empty State Component
function EmptyState({
  icon,
  title,
  subtitle,
  isDark,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  isDark: boolean;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';

  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={48} color={subtitleColor} />
      <Text style={[styles.emptyTitle, { color: textColor }]}>{title}</Text>
      <Text style={[styles.emptySubtitle, { color: subtitleColor }]}>{subtitle}</Text>
    </View>
  );
}

// Activity Card Component
function ActivityCard({
  activity,
  isDark,
}: {
  activity: Activity;
  isDark: boolean;
}) {
  const typeIcon = ACTIVITY_TYPE_ICONS[activity.type] || 'ellipse-outline';
  const typeColor = ACTIVITY_TYPE_COLORS[activity.type] || '#64748b';
  const statusColor = ACTIVITY_STATUS_COLORS[activity.status] || '#64748b';
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

  return (
    <View style={[styles.activityCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={[styles.activityIcon, { backgroundColor: `${typeColor}20` }]}>
        <Ionicons name={typeIcon as any} size={20} color={typeColor} />
      </View>
      <View style={styles.activityContent}>
        <Text style={[styles.activityTitle, { color: textColor }]} numberOfLines={1}>
          {activity.title}
        </Text>
        <Text style={[styles.activityMeta, { color: subtitleColor }]}>
          {getRelativeTime(activity.dueDate || activity.createdAt)}
        </Text>
      </View>
      <View style={[styles.activityStatus, { backgroundColor: `${statusColor}20` }]}>
        <Text style={[styles.activityStatusText, { color: statusColor }]}>
          {activity.status}
        </Text>
      </View>
    </View>
  );
}

export default function DealDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const [deal, setDeal] = useState<Deal | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const scrollViewRef = useRef<ScrollView>(null);

  // Theme-aware colors
  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];
  const textColor = isDark ? 'white' : colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'white';
  const tabBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const activeTabBg = isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)';

  const fetchData = useCallback(async () => {
    try {
      // Fetch deal
      const dealResponse = await getDeal(accessToken, id!);
      if (dealResponse.success && dealResponse.data) {
        setDeal(dealResponse.data);
      }

      // Fetch activities
      try {
        const activitiesResponse = await getDealActivities(accessToken, id!);
        if (activitiesResponse.success && activitiesResponse.data && Array.isArray(activitiesResponse.data)) {
          setActivities(activitiesResponse.data);
        }
      } catch (activityError) {
        console.log('Activities endpoint not available');
      }
    } catch (error) {
      console.error('Error fetching deal data:', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleCall = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleWhatsApp = (phone?: string) => {
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9+]/g, '').replace(/^\+/, '');
      Linking.openURL(`https://wa.me/${cleanPhone}`);
    }
  };

  const handleEmail = (email?: string) => {
    if (email) {
      Linking.openURL(`mailto:${email}`);
    }
  };

  const handleEdit = () => {
    router.push(`/(tabs)/deals/create?id=${id}` as any);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Deal',
      'Are you sure you want to delete this deal? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteDeal(accessToken, id!);
              if (response.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.back();
              } else {
                Alert.alert('Error', response.error?.message || 'Failed to delete deal');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete deal');
            }
          },
        },
      ]
    );
  };

  const handleAdvanceStage = async () => {
    try {
      const response = await advanceDealStage(accessToken, id!);
      if (response.success && response.data) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setDeal(response.data);
      } else {
        Alert.alert('Error', response.error?.message || 'Failed to advance stage');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to advance stage');
    }
  };

  const handleCloseDeal = (won: boolean) => {
    Alert.alert(
      won ? 'Close as Won' : 'Close as Lost',
      `Are you sure you want to mark this deal as ${won ? 'won' : 'lost'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const response = won
                ? await closeDealWon(accessToken, id!)
                : await closeDealLost(accessToken, id!);
              if (response.success && response.data) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setDeal(response.data);
              } else {
                Alert.alert('Error', response.error?.message || 'Failed to close deal');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to close deal');
            }
          },
        },
      ]
    );
  };

  const handleContactPress = () => {
    if (deal?.contact?.id) {
      router.push(`/(tabs)/contacts/customer/${deal.contact.id}` as any);
    }
  };

  const handleCompanyPress = () => {
    if (deal?.company?.id) {
      router.push(`/(tabs)/contacts/organization/${deal.company.id}` as any);
    }
  };

  // Get badge count for tabs
  const getTabBadge = (tab: TabKey): number | undefined => {
    switch (tab) {
      case 'activities':
        return activities.length || undefined;
      default:
        return undefined;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!deal) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <Text style={[styles.errorText, { color: textColor }]}>Deal not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stageColor = DEAL_STAGE_COLORS[deal.stage] || '#3b82f6';
  const statusColor = DEAL_STATUS_COLORS[deal.status] || '#3b82f6';
  const currencySymbol = deal.currency?.symbol || '₹';
  const contactName = deal.contact ? getContactFullName(deal.contact) : null;
  const contactInitials = deal.contact ? getContactInitials(deal.contact) : '';
  const contactAvatarColor = contactName ? getAvatarColor(contactName) : '#3b82f6';
  const companyInitials = deal.company ? getCompanyInitials(deal.company) : '';
  const companyTypeColor = deal.company?.type ? COMPANY_TYPE_COLORS[deal.company.type] : '#3b82f6';

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderDetailsTab = () => (
    <>
      {/* Value Card */}
      <SectionCard isDark={isDark}>
        <View style={styles.valueContainer}>
          <Text style={[styles.valueLabel, { color: subtitleColor }]}>Deal Value</Text>
          <Text style={[styles.valueAmount, { color: textColor }]}>
            {formatDealValue(deal.value, currencySymbol)}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <View style={[styles.stageBadge, { backgroundColor: `${stageColor}20` }]}>
            <Text style={[styles.stageText, { color: stageColor }]}>
              {DEAL_STAGE_LABELS[deal.stage]}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {DEAL_STATUS_LABELS[deal.status]}
            </Text>
          </View>
        </View>
      </SectionCard>

      {/* Deal Actions */}
      {deal.status === 'OPEN' && (
        <SectionCard title="Actions" isDark={isDark}>
          <View style={styles.actionsRow}>
            {deal.stage !== 'CLOSED_WON' && deal.stage !== 'CLOSED_LOST' && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#3b82f620' }]}
                onPress={handleAdvanceStage}
              >
                <Ionicons name="arrow-forward" size={20} color="#3b82f6" />
                <Text style={[styles.actionBtnText, { color: '#3b82f6' }]}>Advance Stage</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#22c55e20' }]}
              onPress={() => handleCloseDeal(true)}
            >
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              <Text style={[styles.actionBtnText, { color: '#22c55e' }]}>Won</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#ef444420' }]}
              onPress={() => handleCloseDeal(false)}
            >
              <Ionicons name="close-circle" size={20} color="#ef4444" />
              <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Lost</Text>
            </TouchableOpacity>
          </View>
        </SectionCard>
      )}

      {/* Deal Info */}
      <SectionCard title="Information" isDark={isDark}>
        {deal.expectedCloseDate && (
          <InfoRow
            icon="calendar-outline"
            label="Expected Close"
            value={formatDate(deal.expectedCloseDate) || ''}
            isDark={isDark}
          />
        )}
        {deal.closedDate && (
          <InfoRow
            icon="checkmark-circle-outline"
            label="Closed Date"
            value={formatDate(deal.closedDate) || ''}
            isDark={isDark}
          />
        )}
        {deal.pipeline?.name && (
          <InfoRow
            icon="git-branch-outline"
            label="Pipeline"
            value={deal.pipeline.name}
            isDark={isDark}
          />
        )}
        {deal.owner && (
          <InfoRow
            icon="person-circle-outline"
            label="Owner"
            value={deal.owner.userName || deal.owner.userEmail}
            isDark={isDark}
          />
        )}
        <InfoRow
          icon="time-outline"
          label="Created"
          value={formatDate(deal.createdAt) || ''}
          isDark={isDark}
        />
      </SectionCard>

      {/* Description */}
      {deal.description && (
        <SectionCard title="Description" isDark={isDark}>
          <Text style={[styles.description, { color: textColor }]}>{deal.description}</Text>
        </SectionCard>
      )}
    </>
  );

  const renderContactTab = () => {
    if (!deal.contact) {
      return (
        <EmptyState
          icon="person-outline"
          title="No Contact"
          subtitle="No contact associated with this deal"
          isDark={isDark}
        />
      );
    }

    return (
      <SectionCard isDark={isDark}>
        <TouchableOpacity style={styles.entityCard} onPress={handleContactPress}>
          <View style={[styles.entityAvatar, { backgroundColor: contactAvatarColor }]}>
            <Text style={styles.entityAvatarText}>{contactInitials}</Text>
          </View>
          <View style={styles.entityInfo}>
            <Text style={[styles.entityName, { color: textColor }]}>{contactName}</Text>
            {deal.contact.title && (
              <Text style={[styles.entitySubtitle, { color: subtitleColor }]}>
                {deal.contact.title}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={subtitleColor} />
        </TouchableOpacity>

        {/* Contact Actions */}
        <View style={styles.contactActions}>
          {deal.contact.phone && (
            <>
              <TouchableOpacity
                style={[styles.contactActionBtn, { backgroundColor: '#22c55e20' }]}
                onPress={() => handleCall(deal.contact!.phone)}
              >
                <Ionicons name="call" size={20} color="#22c55e" />
                <Text style={[styles.contactActionText, { color: '#22c55e' }]}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactActionBtn, { backgroundColor: '#25D36620' }]}
                onPress={() => handleWhatsApp(deal.contact!.phone)}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                <Text style={[styles.contactActionText, { color: '#25D366' }]}>WhatsApp</Text>
              </TouchableOpacity>
            </>
          )}
          {deal.contact.email && (
            <TouchableOpacity
              style={[styles.contactActionBtn, { backgroundColor: '#3b82f620' }]}
              onPress={() => handleEmail(deal.contact!.email)}
            >
              <Ionicons name="mail" size={20} color="#3b82f6" />
              <Text style={[styles.contactActionText, { color: '#3b82f6' }]}>Email</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Contact Details */}
        {deal.contact.email && (
          <InfoRow
            icon="mail-outline"
            label="Email"
            value={deal.contact.email}
            isDark={isDark}
          />
        )}
        {deal.contact.phone && (
          <InfoRow
            icon="call-outline"
            label="Phone"
            value={deal.contact.phone}
            isDark={isDark}
          />
        )}
      </SectionCard>
    );
  };

  const renderCompanyTab = () => {
    if (!deal.company) {
      return (
        <EmptyState
          icon="business-outline"
          title="No Company"
          subtitle="No company associated with this deal"
          isDark={isDark}
        />
      );
    }

    return (
      <SectionCard isDark={isDark}>
        <TouchableOpacity style={styles.entityCard} onPress={handleCompanyPress}>
          <View style={[styles.entityAvatar, { backgroundColor: companyTypeColor }]}>
            <Text style={styles.entityAvatarText}>{companyInitials}</Text>
          </View>
          <View style={styles.entityInfo}>
            <Text style={[styles.entityName, { color: textColor }]}>{deal.company.name}</Text>
            {deal.company.type && (
              <View style={[styles.typeBadge, { backgroundColor: `${companyTypeColor}20` }]}>
                <Text style={[styles.typeBadgeText, { color: companyTypeColor }]}>
                  {COMPANY_TYPE_LABELS[deal.company.type]}
                </Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={subtitleColor} />
        </TouchableOpacity>

        {deal.company.industry && (
          <InfoRow
            icon="briefcase-outline"
            label="Industry"
            value={deal.company.industry}
            isDark={isDark}
          />
        )}
        {deal.company.email && (
          <InfoRow
            icon="mail-outline"
            label="Email"
            value={deal.company.email}
            isDark={isDark}
          />
        )}
        {deal.company.phone && (
          <InfoRow
            icon="call-outline"
            label="Phone"
            value={deal.company.phone}
            isDark={isDark}
          />
        )}
        {deal.company.website && (
          <InfoRow
            icon="globe-outline"
            label="Website"
            value={deal.company.website}
            isDark={isDark}
            onPress={() => {
              const url = deal.company!.website!.startsWith('http')
                ? deal.company!.website!
                : `https://${deal.company!.website}`;
              Linking.openURL(url);
            }}
            valueColor="#3b82f6"
          />
        )}
      </SectionCard>
    );
  };

  const renderActivitiesTab = () => {
    const activityList = activities || [];

    if (activityList.length === 0) {
      return (
        <EmptyState
          icon="time-outline"
          title="No Activities"
          subtitle="No activities logged for this deal yet"
          isDark={isDark}
        />
      );
    }

    return (
      <View style={styles.activitiesList}>
        {activityList.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} isDark={isDark} />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
            {deal.title}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleEdit} style={styles.headerButton}>
            <Ionicons name="create-outline" size={22} color={textColor} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
            <Ionicons name="trash-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: borderColor }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabContainer}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const badge = getTabBadge(tab.key);
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  { backgroundColor: isActive ? activeTabBg : tabBg },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab(tab.key);
                }}
              >
                <Ionicons
                  name={tab.icon}
                  size={18}
                  color={isActive ? '#3b82f6' : subtitleColor}
                />
                <Text
                  style={[
                    styles.tabText,
                    { color: isActive ? '#3b82f6' : subtitleColor },
                  ]}
                >
                  {tab.label}
                </Text>
                {badge !== undefined && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {activeTab === 'details' && renderDetailsTab()}
        {activeTab === 'contact' && renderContactTab()}
        {activeTab === 'company' && renderCompanyTab()}
        {activeTab === 'activities' && renderActivitiesTab()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
  },
  backLink: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  tabContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {},
  valueContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  valueLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  valueAmount: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  stageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stageText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoIcon: {
    width: 32,
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: 8,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  entityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
  },
  entityAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entityAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  entityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  entityName: {
    fontSize: 17,
    fontWeight: '600',
  },
  entitySubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  contactActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  contactActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  contactActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activitiesList: {
    gap: 12,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  activityMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  activityStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activityStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
