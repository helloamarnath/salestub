import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/auth-context';
import { getLead, deleteLead, getLeadActivities } from '@/lib/api/leads';
import { LeadStatusBadge, ScoreIndicator, SourceBadge } from '@/components/leads/LeadStatusBadge';
import type { Lead, LeadActivity } from '@/types/lead';
import { getContactFullName, getContactInitials, getAvatarColor } from '@/types/contact';
import { ACTIVITY_TYPE_COLORS, ACTIVITY_TYPE_ICONS } from '@/types/lead';

// Tab component
function Tab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tab, active && styles.tabActive]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Activity item component
function ActivityItem({ activity }: { activity: LeadActivity }) {
  const color = ACTIVITY_TYPE_COLORS[activity.type];
  const iconName = ACTIVITY_TYPE_ICONS[activity.type] as keyof typeof Ionicons.glyphMap;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={iconName} size={16} color={color} />
      </View>
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Text style={styles.activityTitle}>{activity.title}</Text>
          {activity.status === 'COMPLETED' ? (
            <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
          ) : (
            <Ionicons name="ellipse-outline" size={16} color="#f59e0b" />
          )}
        </View>
        {activity.description && (
          <Text style={styles.activityDescription} numberOfLines={2}>
            {activity.description}
          </Text>
        )}
        <Text style={styles.activityDate}>{formatDate(activity.createdAt)}</Text>
      </View>
    </View>
  );
}

// Details tab content
function DetailsTab({ lead }: { lead: Lead }) {
  const contactName = lead.contact ? getContactFullName(lead.contact) : null;
  const initials = lead.contact
    ? getContactInitials(lead.contact)
    : lead.title.substring(0, 2).toUpperCase();
  const avatarColor = getAvatarColor(contactName || lead.title);

  const formatValue = (value?: number): string => {
    if (!value) return 'Not set';
    const symbol = lead.currency?.symbol || '₹';
    return `${symbol}${value.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.statusGrid}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Stage</Text>
            <LeadStatusBadge stage={lead.stage} size="medium" />
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Source</Text>
            <SourceBadge source={lead.source} size="medium" />
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Value</Text>
            <Text style={styles.statusValue}>{formatValue(lead.value)}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Score</Text>
            <View style={styles.scoreContainer}>
              <ScoreIndicator score={lead.score} size={10} />
              <Text style={styles.scoreText}>{lead.score || 0}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Owner Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Owner</Text>
        <View style={styles.ownerCard}>
          <View style={[styles.ownerAvatar, { backgroundColor: '#8b5cf6' }]}>
            <Text style={styles.ownerAvatarText}>
              {lead.owner.userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.ownerName}>{lead.owner.userName}</Text>
            <Text style={styles.ownerEmail}>{lead.owner.userEmail}</Text>
          </View>
        </View>
      </View>

      {/* Contact Section */}
      {lead.contact && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.contactCard}>
            <View style={[styles.contactAvatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.contactAvatarText}>{initials}</Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{contactName}</Text>
              {lead.contact.title && (
                <Text style={styles.contactTitle}>{lead.contact.title}</Text>
              )}
              {lead.contact.email && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`mailto:${lead.contact!.email}`)}
                >
                  <Text style={styles.contactEmail}>{lead.contact.email}</Text>
                </TouchableOpacity>
              )}
              {lead.contact.phone && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${lead.contact!.phone}`)}
                >
                  <Text style={styles.contactPhone}>{lead.contact.phone}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Description */}
      {lead.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{lead.description}</Text>
        </View>
      )}

      {/* Timestamps */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Info</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Created</Text>
          <Text style={styles.infoValue}>{formatDate(lead.createdAt)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Updated</Text>
          <Text style={styles.infoValue}>{formatDate(lead.updatedAt)}</Text>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// Timeline tab content
function TimelineTab({
  activities,
  loading,
}: {
  activities: LeadActivity[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <View style={styles.loadingTab}>
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  }

  // Handle undefined or empty activities
  const activityList = activities || [];

  if (activityList.length === 0) {
    return (
      <View style={styles.emptyTab}>
        <Ionicons name="time-outline" size={48} color="rgba(255,255,255,0.2)" />
        <Text style={styles.emptyTabText}>No activities yet</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {activityList.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

export default function LeadDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');
  const [deleting, setDeleting] = useState(false);

  // Fetch lead
  const fetchLead = useCallback(async () => {
    if (!accessToken || !id) return;

    setLoading(true);
    setError(null);

    const response = await getLead(accessToken, id);

    if (response.success && response.data) {
      setLead(response.data);
    } else {
      setError(response.error?.message || 'Failed to load lead');
    }

    setLoading(false);
    setRefreshing(false);
  }, [accessToken, id]);

  // Fetch activities
  const fetchActivities = useCallback(async () => {
    if (!accessToken || !id) return;

    setActivitiesLoading(true);

    const response = await getLeadActivities(accessToken, id);

    if (response.success && response.data) {
      // Handle both array and paginated response formats
      const activitiesData = Array.isArray(response.data)
        ? response.data
        : (response.data as unknown as { data?: LeadActivity[] }).data || [];
      setActivities(activitiesData);
    }

    setActivitiesLoading(false);
  }, [accessToken, id]);

  // Initial load
  useEffect(() => {
    fetchLead();
  }, []);

  // Load activities when tab changes
  useEffect(() => {
    if (activeTab === 'timeline' && activities.length === 0) {
      fetchActivities();
    }
  }, [activeTab]);

  // Refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLead();
    if (activeTab === 'timeline') {
      fetchActivities();
    }
  }, [fetchLead, fetchActivities, activeTab]);

  // Back navigation
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  // Edit
  const handleEdit = () => {
    if (!lead) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(tabs)/leads/create?editId=${lead.id}`);
  };

  // Delete
  const handleDelete = () => {
    if (!lead) return;

    Alert.alert(
      'Delete Lead',
      `Are you sure you want to delete "${lead.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const response = await deleteLead(accessToken, lead.id);
            if (response.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } else {
              Alert.alert('Error', response.error?.message || 'Failed to delete lead');
            }
            setDeleting(false);
          },
        },
      ]
    );
  };

  // Quick actions
  const handleCall = async () => {
    if (lead?.contact?.phone) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Linking.openURL(`tel:${lead.contact.phone}`);
    }
  };

  const handleEmail = async () => {
    if (lead?.contact?.email) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Linking.openURL(`mailto:${lead.contact.email}`);
    }
  };

  const handleWhatsApp = async () => {
    if (lead?.contact?.phone) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const cleanPhone = lead.contact.phone.replace(/\D/g, '');
      await Linking.openURL(`https://wa.me/${cleanPhone}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0f172a', '#1e293b', '#0f172a']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </View>
    );
  }

  if (error || !lead) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0f172a', '#1e293b', '#0f172a']}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Failed to load lead</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchLead}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const contactName = lead.contact ? getContactFullName(lead.contact) : null;
  const initials = lead.contact
    ? getContactInitials(lead.contact)
    : lead.title.substring(0, 2).toUpperCase();
  const avatarColor = getAvatarColor(contactName || lead.title);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#0f172a']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={handleEdit}>
              <Ionicons name="pencil" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerButton, styles.deleteButton]}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Lead Info */}
        <View style={styles.leadInfo}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.leadDetails}>
            <Text style={styles.displayId}>{lead.displayId}</Text>
            <Text style={styles.leadTitle}>{lead.title}</Text>
            {contactName && (
              <Text style={styles.contactNameSmall}>{contactName}</Text>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        {lead.contact && (
          <View style={styles.quickActions}>
            {lead.contact.phone && (
              <TouchableOpacity style={styles.quickActionButton} onPress={handleCall}>
                <Ionicons name="call" size={20} color="#22c55e" />
                <Text style={styles.quickActionText}>Call</Text>
              </TouchableOpacity>
            )}
            {lead.contact.phone && (
              <TouchableOpacity style={styles.quickActionButton} onPress={handleWhatsApp}>
                <Ionicons name="logo-whatsapp" size={20} color="#25d366" />
                <Text style={styles.quickActionText}>WhatsApp</Text>
              </TouchableOpacity>
            )}
            {lead.contact.email && (
              <TouchableOpacity style={styles.quickActionButton} onPress={handleEmail}>
                <Ionicons name="mail" size={20} color="#3b82f6" />
                <Text style={styles.quickActionText}>Email</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          <Tab
            label="Details"
            active={activeTab === 'details'}
            onPress={() => setActiveTab('details')}
          />
          <Tab
            label="Timeline"
            active={activeTab === 'timeline'}
            onPress={() => setActiveTab('timeline')}
          />
          <Tab
            label="Tags"
            active={activeTab === 'tags'}
            onPress={() => setActiveTab('tags')}
          />
          <Tab
            label="Docs"
            active={activeTab === 'docs'}
            onPress={() => setActiveTab('docs')}
          />
        </View>
      </View>

      {/* Tab Content */}
      {activeTab === 'details' && <DetailsTab lead={lead} />}
      {activeTab === 'timeline' && (
        <TimelineTab activities={activities} loading={activitiesLoading} />
      )}
      {activeTab === 'tags' && (
        <View style={styles.emptyTab}>
          <Ionicons name="pricetags-outline" size={48} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyTabText}>Tags coming soon</Text>
        </View>
      )}
      {activeTab === 'docs' && (
        <View style={styles.emptyTab}>
          <Ionicons name="document-outline" size={48} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyTabText}>Documents coming soon</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  leadInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  leadDetails: {
    marginLeft: 16,
    flex: 1,
  },
  displayId: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '500',
  },
  leadTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  contactNameSmall: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  quickActionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: 'white',
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusItem: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
  },
  statusLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginBottom: 6,
  },
  statusValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
  },
  ownerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ownerAvatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ownerName: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  ownerEmail: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  contactCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  contactAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  contactTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  contactEmail: {
    color: '#3b82f6',
    fontSize: 13,
    marginTop: 4,
  },
  contactPhone: {
    color: '#22c55e',
    fontSize: 13,
    marginTop: 2,
  },
  description: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  infoValue: {
    color: 'white',
    fontSize: 14,
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  activityDescription: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 4,
  },
  activityDate: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    marginTop: 6,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTabText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
  },
  errorMessage: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
