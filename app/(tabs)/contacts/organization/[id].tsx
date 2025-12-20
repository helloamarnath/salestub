import { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { Colors } from '@/constants/theme';
import { getCompanyFull, getCompanyContacts, deleteCompany } from '@/lib/api/companies';
import { getCompanyActivities } from '@/lib/api/activities';
import type { Company } from '@/types/company';
import type { Contact } from '@/types/contact';
import type { Activity } from '@/types/activity';
import {
  getCompanyInitials,
  COMPANY_TYPE_LABELS,
  COMPANY_TYPE_COLORS,
  formatRevenue,
  formatEmployees,
} from '@/types/company';
import { getContactFullName, getContactInitials, getAvatarColor } from '@/types/contact';
import {
  ACTIVITY_TYPE_ICONS,
  ACTIVITY_TYPE_COLORS,
  ACTIVITY_STATUS_COLORS,
  getRelativeTime,
} from '@/types/activity';
import {
  DEAL_STAGE_COLORS,
  DEAL_STATUS_COLORS,
  formatDealValue,
} from '@/types/deal';

type TabKey = 'details' | 'contacts' | 'leads' | 'deals' | 'activities' | 'address';

interface Tab {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TABS: Tab[] = [
  { key: 'details', label: 'Details', icon: 'business-outline' },
  { key: 'contacts', label: 'Contacts', icon: 'people-outline' },
  { key: 'leads', label: 'Leads', icon: 'flash-outline' },
  { key: 'deals', label: 'Deals', icon: 'briefcase-outline' },
  { key: 'activities', label: 'Activities', icon: 'time-outline' },
  { key: 'address', label: 'Address', icon: 'location-outline' },
];

// Contact type from company response
interface CompanyContact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
}

// Lead type from company response
interface CompanyLead {
  id: string;
  displayId: string;
  title: string;
  value?: number;
  score?: number;
  source?: string;
  stage?: {
    id: string;
    name: string;
    type: string;
    color?: string;
  };
  createdAt: string;
}

// Deal type from company response
interface CompanyDeal {
  id: string;
  title: string;
  value: number;
  stage: string;
  status: string;
  expectedCloseDate?: string;
  createdAt: string;
}

// Info Row Component
function InfoRow({
  icon,
  label,
  value,
  isDark,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  isDark: boolean;
  onPress?: () => void;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const labelColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const iconColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const displayValue = value || '-';

  const content = (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={iconColor} style={styles.infoIcon} />
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: labelColor }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: onPress && value ? '#3b82f6' : value ? textColor : labelColor }]}>
          {displayValue}
        </Text>
      </View>
    </View>
  );

  if (onPress && value) {
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

// Contact Card Component
function ContactCard({
  contact,
  isDark,
  onPress,
}: {
  contact: CompanyContact;
  isDark: boolean;
  onPress: () => void;
}) {
  const fullName = `${contact.firstName} ${contact.lastName}`.trim();
  const initials = `${contact.firstName?.charAt(0) || ''}${contact.lastName?.charAt(0) || ''}`.toUpperCase();
  const avatarColor = getAvatarColor(fullName);
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'white';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <TouchableOpacity
      style={[styles.contactCard, { backgroundColor: cardBg, borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.contactAvatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.contactAvatarText}>{initials}</Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={[styles.contactName, { color: textColor }]} numberOfLines={1}>
          {fullName}
        </Text>
        {contact.title && (
          <Text style={[styles.contactTitle, { color: subtitleColor }]} numberOfLines={1}>
            {contact.title}
          </Text>
        )}
        {contact.email && (
          <Text style={[styles.contactEmail, { color: subtitleColor }]} numberOfLines={1}>
            {contact.email}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={subtitleColor} />
    </TouchableOpacity>
  );
}

// Lead Card Component
function LeadCard({
  lead,
  isDark,
  onPress,
}: {
  lead: CompanyLead;
  isDark: boolean;
  onPress: () => void;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'white';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const stageColor = lead.stage?.color || '#3b82f6';

  return (
    <TouchableOpacity
      style={[styles.itemCard, { backgroundColor: cardBg, borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.itemCardHeader}>
        <View style={styles.itemCardLeft}>
          <Text style={[styles.itemCardId, { color: subtitleColor }]}>#{lead.displayId}</Text>
          <Text style={[styles.itemCardTitle, { color: textColor }]} numberOfLines={1}>
            {lead.title}
          </Text>
        </View>
        {lead.value !== undefined && lead.value > 0 && (
          <Text style={[styles.itemCardValue, { color: textColor }]}>
            {formatDealValue(lead.value)}
          </Text>
        )}
      </View>
      <View style={styles.itemCardFooter}>
        {lead.stage && (
          <View style={[styles.stageBadge, { backgroundColor: `${stageColor}20` }]}>
            <View style={[styles.stageDot, { backgroundColor: stageColor }]} />
            <Text style={[styles.stageText, { color: stageColor }]}>{lead.stage.name}</Text>
          </View>
        )}
        {lead.source && (
          <Text style={[styles.itemCardSource, { color: subtitleColor }]}>{lead.source}</Text>
        )}
        {lead.score !== undefined && (
          <View style={styles.scoreContainer}>
            <Ionicons name="star" size={12} color="#f59e0b" />
            <Text style={[styles.scoreText, { color: subtitleColor }]}>{lead.score}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// Deal Card Component
function DealCard({
  deal,
  isDark,
  onPress,
}: {
  deal: CompanyDeal;
  isDark: boolean;
  onPress: () => void;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'white';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const stageColor = DEAL_STAGE_COLORS[deal.stage as keyof typeof DEAL_STAGE_COLORS] || '#3b82f6';
  const statusColor = DEAL_STATUS_COLORS[deal.status as keyof typeof DEAL_STATUS_COLORS] || '#3b82f6';

  const formatStage = (stage: string) => {
    return stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).toLowerCase()
      .split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <TouchableOpacity
      style={[styles.itemCard, { backgroundColor: cardBg, borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.itemCardHeader}>
        <Text style={[styles.itemCardTitle, { color: textColor, flex: 1 }]} numberOfLines={1}>
          {deal.title}
        </Text>
        <Text style={[styles.itemCardValue, { color: textColor }]}>
          {formatDealValue(deal.value)}
        </Text>
      </View>
      <View style={styles.itemCardFooter}>
        <View style={[styles.stageBadge, { backgroundColor: `${stageColor}20` }]}>
          <View style={[styles.stageDot, { backgroundColor: stageColor }]} />
          <Text style={[styles.stageText, { color: stageColor }]}>{formatStage(deal.stage)}</Text>
        </View>
        <View style={[styles.statusBadgeSmall, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.statusTextSmall, { color: statusColor }]}>{deal.status}</Text>
        </View>
        {deal.expectedCloseDate && (
          <Text style={[styles.itemCardDate, { color: subtitleColor }]}>
            Closes: {new Date(deal.expectedCloseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// Activity Card Component
function ActivityCard({
  activity,
  isDark,
  onPress,
}: {
  activity: Activity;
  isDark: boolean;
  onPress: () => void;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'white';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const typeColor = ACTIVITY_TYPE_COLORS[activity.type] || '#3b82f6';
  const statusColor = ACTIVITY_STATUS_COLORS[activity.status] || '#3b82f6';
  const typeIcon = ACTIVITY_TYPE_ICONS[activity.type] || 'ellipse-outline';

  return (
    <TouchableOpacity
      style={[styles.activityCard, { backgroundColor: cardBg, borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.activityIcon, { backgroundColor: `${typeColor}20` }]}>
        <Ionicons name={typeIcon as any} size={20} color={typeColor} />
      </View>
      <View style={styles.activityContent}>
        <Text style={[styles.activityTitle, { color: textColor }]} numberOfLines={1}>
          {activity.title}
        </Text>
        <View style={styles.activityMeta}>
          <View style={[styles.activityTypeBadge, { backgroundColor: `${typeColor}15` }]}>
            <Text style={[styles.activityTypeText, { color: typeColor }]}>{activity.type}</Text>
          </View>
          <View style={[styles.activityStatusBadge, { backgroundColor: `${statusColor}15` }]}>
            <Text style={[styles.activityStatusText, { color: statusColor }]}>{activity.status}</Text>
          </View>
        </View>
        {activity.dueDate && (
          <Text style={[styles.activityDate, { color: subtitleColor }]}>
            {getRelativeTime(activity.dueDate)}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={subtitleColor} />
    </TouchableOpacity>
  );
}

export default function OrganizationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const [company, setCompany] = useState<Company | null>(null);
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [leads, setLeads] = useState<CompanyLead[]>([]);
  const [deals, setDeals] = useState<CompanyDeal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('details');

  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];
  const textColor = isDark ? 'white' : colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const headerBg = isDark ? 'rgba(255,255,255,0.05)' : 'white';
  const tabBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const activeTabBg = isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)';

  const fetchData = useCallback(async () => {
    try {
      // Fetch company with full relations
      const companyResponse = await getCompanyFull(accessToken, id!);
      if (companyResponse.success && companyResponse.data) {
        setCompany(companyResponse.data);
        setContacts(companyResponse.data.contacts || []);
        setLeads(companyResponse.data.leads || []);
        setDeals(companyResponse.data.deals || []);
        // Use activities from full response if available
        if (companyResponse.data.activities) {
          setActivities(companyResponse.data.activities as Activity[]);
        }
      }

      // Try to fetch contacts separately for more complete data
      try {
        const contactsResponse = await getCompanyContacts(accessToken, id!, { limit: 50 });
        if (contactsResponse.success && contactsResponse.data && Array.isArray(contactsResponse.data.data)) {
          setContacts(contactsResponse.data.data as CompanyContact[]);
        }
      } catch (contactsError) {
        console.log('Contacts endpoint not available, using data from company full response');
      }

      // Try to fetch activities separately for more complete data
      try {
        const activitiesResponse = await getCompanyActivities(accessToken, id!);
        if (activitiesResponse.success && activitiesResponse.data && Array.isArray(activitiesResponse.data)) {
          setActivities(activitiesResponse.data);
        }
      } catch (activityError) {
        console.log('Activities endpoint not available, using data from company full response');
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
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

  const handleWebsite = (url?: string) => {
    if (url) {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      Linking.openURL(fullUrl);
    }
  };

  const handleMaps = () => {
    const address = [
      company?.address,
      company?.city,
      company?.state,
      company?.country,
    ].filter(Boolean).join(', ');
    if (address) {
      Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`);
    }
  };

  const handleEdit = () => {
    router.push({
      pathname: '/(tabs)/contacts/organization/create',
      params: { id: company?.id },
    } as any);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Organization',
      `Are you sure you want to delete ${company?.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const response = await deleteCompany(accessToken, id!);
            if (response.success) {
              router.back();
            } else {
              Alert.alert('Error', response.error?.message || 'Failed to delete organization');
            }
            setDeleting(false);
          },
        },
      ]
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return undefined;
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Render tab content
  const renderTabContent = () => {
    if (!company) return null;

    switch (activeTab) {
      case 'details':
        return (
          <View style={styles.tabContentInner}>
            {/* Basic Information */}
            <SectionCard title="Basic Information" isDark={isDark}>
              <InfoRow icon="business-outline" label="Company Name" value={company.name} isDark={isDark} />
              <InfoRow icon="layers-outline" label="Industry" value={company.industry} isDark={isDark} />
              {company.type && (
                <View style={styles.statusRow}>
                  <View style={styles.infoRow}>
                    <Ionicons name="flag-outline" size={20} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} style={styles.infoIcon} />
                    <View style={styles.infoContent}>
                      <Text style={[styles.infoLabel, { color: subtitleColor }]}>Type</Text>
                      <View style={[styles.statusBadge, { backgroundColor: `${COMPANY_TYPE_COLORS[company.type]}20` }]}>
                        <View style={[styles.statusDot, { backgroundColor: COMPANY_TYPE_COLORS[company.type] }]} />
                        <Text style={[styles.statusText, { color: COMPANY_TYPE_COLORS[company.type] }]}>
                          {COMPANY_TYPE_LABELS[company.type]}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </SectionCard>

            {/* Contact Information */}
            <SectionCard title="Contact Information" isDark={isDark}>
              <InfoRow
                icon="mail-outline"
                label="Email"
                value={company.email}
                isDark={isDark}
                onPress={company.email ? () => handleEmail(company.email) : undefined}
              />
              <InfoRow
                icon="call-outline"
                label="Phone"
                value={company.phone}
                isDark={isDark}
                onPress={company.phone ? () => handleCall(company.phone) : undefined}
              />
              <InfoRow
                icon="globe-outline"
                label="Website"
                value={company.website}
                isDark={isDark}
                onPress={company.website ? () => handleWebsite(company.website) : undefined}
              />
            </SectionCard>

            {/* Business Information */}
            <SectionCard title="Business Information" isDark={isDark}>
              <InfoRow icon="cash-outline" label="Annual Revenue" value={company.annualRevenue ? formatRevenue(company.annualRevenue) : undefined} isDark={isDark} />
              <InfoRow icon="people-outline" label="Employees" value={company.numberOfEmployees ? formatEmployees(company.numberOfEmployees) : undefined} isDark={isDark} />
            </SectionCard>

            {/* Description */}
            {company.description && (
              <SectionCard title="Description" isDark={isDark}>
                <View style={styles.notesContainer}>
                  <Text style={[styles.notesText, { color: textColor }]}>{company.description}</Text>
                </View>
              </SectionCard>
            )}

            {/* Owner & Record Info */}
            <SectionCard title="Record Information" isDark={isDark}>
              {company.owner && (
                <>
                  <InfoRow icon="person-circle-outline" label="Owner" value={company.owner.userName} isDark={isDark} />
                  <InfoRow
                    icon="mail-outline"
                    label="Owner Email"
                    value={company.owner.userEmail}
                    isDark={isDark}
                    onPress={() => handleEmail(company.owner!.userEmail)}
                  />
                </>
              )}
              <InfoRow icon="time-outline" label="Created" value={formatDate(company.createdAt)} isDark={isDark} />
              <InfoRow icon="refresh-outline" label="Updated" value={formatDate(company.updatedAt)} isDark={isDark} />
            </SectionCard>
          </View>
        );

      case 'contacts':
        const contactList = contacts || [];
        return (
          <View style={styles.tabContentInner}>
            {contactList.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No Contacts"
                subtitle="Contacts in this organization will appear here"
                isDark={isDark}
              />
            ) : (
              <>
                <View style={styles.tabHeader}>
                  <Text style={[styles.tabHeaderTitle, { color: textColor }]}>
                    {contactList.length} Contact{contactList.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                {contactList.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    isDark={isDark}
                    onPress={() => router.push(`/(tabs)/contacts/customer/${contact.id}` as any)}
                  />
                ))}
              </>
            )}
          </View>
        );

      case 'leads':
        const leadList = leads || [];
        return (
          <View style={styles.tabContentInner}>
            {leadList.length === 0 ? (
              <EmptyState
                icon="flash-outline"
                title="No Leads"
                subtitle="Leads associated with this organization will appear here"
                isDark={isDark}
              />
            ) : (
              <>
                <View style={styles.tabHeader}>
                  <Text style={[styles.tabHeaderTitle, { color: textColor }]}>
                    {leadList.length} Lead{leadList.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                {leadList.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    isDark={isDark}
                    onPress={() => router.push(`/(tabs)/leads/${lead.id}` as any)}
                  />
                ))}
              </>
            )}
          </View>
        );

      case 'deals':
        const dealList = deals || [];
        return (
          <View style={styles.tabContentInner}>
            {dealList.length === 0 ? (
              <EmptyState
                icon="briefcase-outline"
                title="No Deals"
                subtitle="Deals associated with this organization will appear here"
                isDark={isDark}
              />
            ) : (
              <>
                <View style={styles.tabHeader}>
                  <Text style={[styles.tabHeaderTitle, { color: textColor }]}>
                    {dealList.length} Deal{dealList.length !== 1 ? 's' : ''}
                  </Text>
                  <Text style={[styles.tabHeaderSubtitle, { color: subtitleColor }]}>
                    Total: {formatDealValue(dealList.reduce((sum, d) => sum + (d.value || 0), 0))}
                  </Text>
                </View>
                {dealList.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    isDark={isDark}
                    onPress={() => router.push(`/(tabs)/deals/${deal.id}` as any)}
                  />
                ))}
              </>
            )}
          </View>
        );

      case 'activities':
        const activityList = activities || [];
        return (
          <View style={styles.tabContentInner}>
            {activityList.length === 0 ? (
              <EmptyState
                icon="time-outline"
                title="No Activities"
                subtitle="Activities like calls, emails, and meetings will appear here"
                isDark={isDark}
              />
            ) : (
              <>
                <View style={styles.tabHeader}>
                  <Text style={[styles.tabHeaderTitle, { color: textColor }]}>
                    {activityList.length} Activit{activityList.length !== 1 ? 'ies' : 'y'}
                  </Text>
                </View>
                {activityList.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    isDark={isDark}
                    onPress={() => {/* Activity detail view */}}
                  />
                ))}
              </>
            )}
          </View>
        );

      case 'address':
        return (
          <View style={styles.tabContentInner}>
            <SectionCard title="Address" isDark={isDark}>
              <InfoRow icon="home-outline" label="Street" value={company.address} isDark={isDark} />
              <InfoRow icon="business-outline" label="City" value={company.city} isDark={isDark} />
              <InfoRow icon="map-outline" label="State" value={company.state} isDark={isDark} />
              <InfoRow icon="globe-outline" label="Country" value={company.country} isDark={isDark} />
              <InfoRow icon="document-text-outline" label="Postal Code" value={company.postalCode} isDark={isDark} />
            </SectionCard>
            {(company.address || company.city) && (
              <TouchableOpacity style={styles.mapButton} onPress={handleMaps}>
                <Ionicons name="navigate-outline" size={18} color="white" />
                <Text style={styles.mapButtonText}>Open in Maps</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!company) {
    return (
      <View style={[styles.container, styles.centered]}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <Ionicons name="alert-circle-outline" size={64} color={subtitleColor} />
        <Text style={[styles.errorText, { color: textColor }]}>Organization not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initials = getCompanyInitials(company);
  const typeColor = COMPANY_TYPE_COLORS[company.type] || '#3b82f6';
  const typeLabel = COMPANY_TYPE_LABELS[company.type] || company.type;

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={textColor} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleEdit} style={styles.navButton}>
              <Ionicons name="create-outline" size={22} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.navButton} disabled={deleting}>
              {deleting ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Ionicons name="trash-outline" size={22} color="#ef4444" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: headerBg }]}>
          <View style={[styles.largeAvatar, { backgroundColor: typeColor }]}>
            <Text style={styles.largeAvatarText}>{initials}</Text>
          </View>
          <Text style={[styles.profileName, { color: textColor }]}>{company.name}</Text>
          {company.industry && (
            <Text style={[styles.profileTitle, { color: subtitleColor }]}>
              {company.industry}
            </Text>
          )}
          <View style={[styles.typeBadge, { backgroundColor: `${typeColor}20` }]}>
            <Text style={[styles.typeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            {company.phone && (
              <TouchableOpacity style={styles.quickAction} onPress={() => handleCall(company.phone)}>
                <View style={[styles.quickActionIcon, { backgroundColor: '#22c55e20' }]}>
                  <Ionicons name="call" size={22} color="#22c55e" />
                </View>
                <Text style={[styles.quickActionLabel, { color: subtitleColor }]}>Call</Text>
              </TouchableOpacity>
            )}
            {company.phone && (
              <TouchableOpacity style={styles.quickAction} onPress={() => handleWhatsApp(company.phone)}>
                <View style={[styles.quickActionIcon, { backgroundColor: '#25D36620' }]}>
                  <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                </View>
                <Text style={[styles.quickActionLabel, { color: subtitleColor }]}>WhatsApp</Text>
              </TouchableOpacity>
            )}
            {company.email && (
              <TouchableOpacity style={styles.quickAction} onPress={() => handleEmail(company.email)}>
                <View style={[styles.quickActionIcon, { backgroundColor: '#3b82f620' }]}>
                  <Ionicons name="mail" size={22} color="#3b82f6" />
                </View>
                <Text style={[styles.quickActionLabel, { color: subtitleColor }]}>Email</Text>
              </TouchableOpacity>
            )}
            {company.website && (
              <TouchableOpacity style={styles.quickAction} onPress={() => handleWebsite(company.website)}>
                <View style={[styles.quickActionIcon, { backgroundColor: '#8b5cf620' }]}>
                  <Ionicons name="globe" size={22} color="#8b5cf6" />
                </View>
                <Text style={[styles.quickActionLabel, { color: subtitleColor }]}>Website</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Stats Summary */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="people" size={16} color="#3b82f6" />
              <Text style={[styles.statValue, { color: textColor }]}>{(contacts || []).length}</Text>
              <Text style={[styles.statLabel, { color: subtitleColor }]}>Contacts</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
            <View style={styles.statItem}>
              <Ionicons name="flash" size={16} color="#f59e0b" />
              <Text style={[styles.statValue, { color: textColor }]}>{(leads || []).length}</Text>
              <Text style={[styles.statLabel, { color: subtitleColor }]}>Leads</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
            <View style={styles.statItem}>
              <Ionicons name="briefcase" size={16} color="#22c55e" />
              <Text style={[styles.statValue, { color: textColor }]}>{(deals || []).length}</Text>
              <Text style={[styles.statLabel, { color: subtitleColor }]}>Deals</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
            <View style={styles.statItem}>
              <Ionicons name="time" size={16} color="#8b5cf6" />
              <Text style={[styles.statValue, { color: textColor }]}>{(activities || []).length}</Text>
              <Text style={[styles.statLabel, { color: subtitleColor }]}>Activities</Text>
            </View>
          </View>
        </View>

        {/* Tab Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
          style={[styles.tabBar, { backgroundColor: tabBg }]}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            // Get count for tab badge
            let count: number | undefined;
            if (tab.key === 'contacts') count = (contacts || []).length;
            if (tab.key === 'leads') count = (leads || []).length;
            if (tab.key === 'deals') count = (deals || []).length;
            if (tab.key === 'activities') count = (activities || []).length;

            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  isActive && [styles.activeTab, { backgroundColor: activeTabBg }],
                ]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isActive ? (tab.icon.replace('-outline', '') as any) : tab.icon}
                  size={20}
                  color={isActive ? '#3b82f6' : subtitleColor}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isActive ? '#3b82f6' : subtitleColor },
                    isActive && styles.activeTabLabel,
                  ]}
                >
                  {tab.label}
                </Text>
                {count !== undefined && count > 0 && (
                  <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                    <Text style={styles.tabBadgeText}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {renderTabContent()}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    padding: 12,
  },
  headerActions: {
    flexDirection: 'row',
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
  },
  largeAvatar: {
    width: 88,
    height: 88,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  largeAvatarText: {
    color: 'white',
    fontSize: 32,
    fontWeight: '600',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  profileTitle: {
    fontSize: 15,
    marginBottom: 12,
    textAlign: 'center',
  },
  typeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  typeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    width: '100%',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  tabBar: {
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  tabBarContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {},
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  activeTabLabel: {
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(59,130,246,0.3)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  tabContent: {
    paddingHorizontal: 16,
  },
  tabContentInner: {
    gap: 12,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tabHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabHeaderSubtitle: {
    fontSize: 14,
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionContent: {
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoIcon: {
    marginRight: 12,
    width: 24,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
  },
  statusRow: {},
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  notesContainer: {
    paddingVertical: 4,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
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
    paddingHorizontal: 32,
  },
  // Contact card
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
  },
  contactTitle: {
    fontSize: 13,
    marginTop: 2,
  },
  contactEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  // Item cards (leads, deals)
  itemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  itemCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  itemCardId: {
    fontSize: 12,
    marginBottom: 2,
  },
  itemCardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemCardValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  stageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stageText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusTextSmall: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemCardSource: {
    fontSize: 12,
  },
  itemCardDate: {
    fontSize: 12,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Activity card
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 12,
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
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityMeta: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 2,
  },
  activityTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activityTypeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  activityStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activityStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  activityDate: {
    fontSize: 12,
    marginTop: 2,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  mapButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  errorText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
