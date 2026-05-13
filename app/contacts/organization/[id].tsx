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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenLoader } from '@/components/ui/ScreenLoader';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { Colors, Palette } from '@/constants/theme';
import { getCompany, getCompanyContacts, deleteCompany, updateCompany } from '@/lib/api/companies';
import { getCompanyActivities } from '@/lib/api/activities';
import type { Company, CompanyType } from '@/types/company';
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
type TabKey = 'details' | 'contacts' | 'leads' | 'activities' | 'address';

interface Tab {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TABS: Tab[] = [
  { key: 'details', label: 'Details', icon: 'business-outline' },
  { key: 'contacts', label: 'Contacts', icon: 'people-outline' },
  { key: 'leads', label: 'Leads', icon: 'flash-outline' },
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

// Info Row Component
function InfoRow({
  icon,
  label,
  value,
  isDark,
  onPress,
  onEdit,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  isDark: boolean;
  onPress?: () => void;
  onEdit?: () => void;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const textColor = colors.foreground;
  const labelColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const iconColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const displayValue = value || '-';

  const content = (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={iconColor} style={styles.infoIcon} />
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: labelColor }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: onPress && value ? colors.primary : value ? textColor : labelColor }]}>
          {displayValue}
        </Text>
      </View>
      {onEdit && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.editIconButton}
        >
          <Ionicons name="pencil" size={14} color={iconColor} />
        </TouchableOpacity>
      )}
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

// Inline-edit modal — text/numeric input
function ValueInputModal({
  visible,
  title,
  initialValue,
  onSave,
  onClose,
  isDark,
  keyboardType = 'default',
  multiline = false,
  placeholder,
}: {
  visible: boolean;
  title: string;
  initialValue: string;
  onSave: (next: string) => Promise<void> | void;
  onClose: () => void;
  isDark: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric' | 'url';
  multiline?: boolean;
  placeholder?: string;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const overlayColor = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const placeholderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(value.trim());
    setSaving(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: overlayColor }]}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.modalContent, { backgroundColor: colors.card }]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: inputBg, color: colors.foreground, borderColor },
                  multiline && styles.modalInputMultiline,
                ]}
                value={value}
                onChangeText={setValue}
                keyboardType={keyboardType as 'default'}
                placeholder={placeholder}
                placeholderTextColor={placeholderColor}
                multiline={multiline}
                autoCapitalize={keyboardType === 'email-address' || keyboardType === 'url' ? 'none' : 'sentences'}
                autoFocus
              />
              <TouchableOpacity
                style={[
                  styles.modalSaveButton,
                  { backgroundColor: colors.primary },
                  saving && { opacity: 0.6 },
                ]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.modalSaveText, { color: colors.primaryForeground }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Type picker modal — single-select for CompanyType
function TypePickerModal({
  visible,
  current,
  onSelect,
  onClose,
  isDark,
}: {
  visible: boolean;
  current: CompanyType;
  onSelect: (next: CompanyType) => Promise<void> | void;
  onClose: () => void;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const overlayColor = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const types: CompanyType[] = ['PROSPECT', 'CUSTOMER', 'PARTNER', 'COMPETITOR', 'RESELLER'];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={[styles.modalOverlay, { backgroundColor: overlayColor }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Type</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <View style={{ paddingVertical: 4 }}>
            {types.map((t) => {
              const active = current === t;
              const accent = COMPANY_TYPE_COLORS[t] || colors.primary;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeOption, { borderBottomColor: borderColor }]}
                  onPress={async () => {
                    await onSelect(t);
                    onClose();
                  }}
                >
                  <View style={[styles.typeDot, { backgroundColor: accent }]} />
                  <Text style={[styles.typeOptionLabel, { color: colors.foreground }]}>
                    {COMPANY_TYPE_LABELS[t]}
                  </Text>
                  {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
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
  const colors = Colors[isDark ? 'dark' : 'light'];
  const textColor = colors.foreground;
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
  const colors = Colors[isDark ? 'dark' : 'light'];
  const textColor = colors.foreground;
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
  const colors = Colors[isDark ? 'dark' : 'light'];
  const fullName = `${contact.firstName} ${contact.lastName}`.trim();
  const initials = `${contact.firstName?.charAt(0) || ''}${contact.lastName?.charAt(0) || ''}`.toUpperCase();
  const avatarColor = getAvatarColor(fullName);
  const textColor = colors.foreground;
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
  const colors = Colors[isDark ? 'dark' : 'light'];
  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'white';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const stageColor = lead.stage?.color || colors.primary;

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
            {`₹${(lead.value || 0).toLocaleString('en-IN')}`}
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
            <Ionicons name="star" size={12} color={Palette.amber} />
            <Text style={[styles.scoreText, { color: subtitleColor }]}>{lead.score}</Text>
          </View>
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
  const colors = Colors[isDark ? 'dark' : 'light'];
  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'white';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const typeColor = ACTIVITY_TYPE_COLORS[activity.type] || colors.primary;
  const statusColor = ACTIVITY_STATUS_COLORS[activity.status] || colors.primary;
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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('details');

  // Inline edit state
  type EditField = {
    key: keyof Company;
    label: string;
    keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric' | 'url';
    multiline?: boolean;
  };
  const [editingField, setEditingField] = useState<EditField | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const updateField = useCallback(
    async (field: keyof Company, nextValueRaw: string | number | null) => {
      if (!accessToken || !id || !company) return;
      const nextValue =
        typeof nextValueRaw === 'string' ? (nextValueRaw.trim() || null) : nextValueRaw;
      // Optimistic update
      setCompany((prev) => (prev ? { ...prev, [field]: nextValue ?? undefined } : prev));
      const res = await updateCompany(accessToken, id as string, {
        [field]: nextValue,
      } as Partial<Company> as never);
      if (res.success && res.data) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCompany(res.data);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Update failed', res.error?.message || `Could not update ${field}.`);
        // Refetch to revert
        const fresh = await getCompany(accessToken, id as string);
        if (fresh.success && fresh.data) setCompany(fresh.data);
      }
    },
    [accessToken, id, company],
  );

  const updateNumericField = useCallback(
    async (field: keyof Company, raw: string) => {
      const trimmed = raw.trim();
      if (trimmed === '') {
        await updateField(field, null);
        return;
      }
      const n = Number(trimmed.replace(/,/g, ''));
      if (Number.isNaN(n)) {
        Alert.alert('Invalid number', `${String(field)} must be a number.`);
        return;
      }
      await updateField(field, n);
    },
    [updateField],
  );

  const gradientColors: [string, string, string] = [colors.background, colors.card, colors.background] as [string, string, string];
  const textColor = isDark ? 'white' : colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const headerBg = isDark ? 'rgba(255,255,255,0.05)' : 'white';
  const tabBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const activeTabBg = isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)';

  const fetchData = useCallback(async () => {
    try {
      // Fetch company data
      const companyResponse = await getCompany(accessToken, id!);
      if (companyResponse.success && companyResponse.data) {
        setCompany(companyResponse.data);
      }

      // Fetch contacts separately
      try {
        const contactsResponse = await getCompanyContacts(accessToken, id!, { limit: 50 });
        if (contactsResponse.success && contactsResponse.data && Array.isArray(contactsResponse.data.data)) {
          setContacts(contactsResponse.data.data as CompanyContact[]);
        }
      } catch (contactsError) {
        console.log('Contacts endpoint not available');
      }

      // Fetch activities separately
      try {
        const activitiesResponse = await getCompanyActivities(accessToken, id!);
        if (activitiesResponse.success && activitiesResponse.data && Array.isArray(activitiesResponse.data)) {
          setActivities(activitiesResponse.data);
        }
      } catch (activityError) {
        console.log('Activities endpoint not available');
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
              <InfoRow
                icon="business-outline"
                label="Company Name"
                value={company.name}
                isDark={isDark}
                onEdit={() => setEditingField({ key: 'name', label: 'Company Name' })}
              />
              <InfoRow
                icon="layers-outline"
                label="Industry"
                value={company.industry}
                isDark={isDark}
                onEdit={() => setEditingField({ key: 'industry', label: 'Industry' })}
              />
              {company.type && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowTypePicker(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.statusRow}>
                    <View style={styles.infoRow}>
                      <Ionicons
                        name="flag-outline"
                        size={20}
                        color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                        style={styles.infoIcon}
                      />
                      <View style={styles.infoContent}>
                        <Text style={[styles.infoLabel, { color: subtitleColor }]}>Type (tap to change)</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: `${COMPANY_TYPE_COLORS[company.type]}20` },
                          ]}
                        >
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: COMPANY_TYPE_COLORS[company.type] },
                            ]}
                          />
                          <Text
                            style={[styles.statusText, { color: COMPANY_TYPE_COLORS[company.type] }]}
                          >
                            {COMPANY_TYPE_LABELS[company.type]}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
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
                onEdit={() =>
                  setEditingField({ key: 'email', label: 'Email', keyboardType: 'email-address' })
                }
              />
              <InfoRow
                icon="call-outline"
                label="Phone"
                value={company.phone}
                isDark={isDark}
                onPress={company.phone ? () => handleCall(company.phone) : undefined}
                onEdit={() =>
                  setEditingField({ key: 'phone', label: 'Phone', keyboardType: 'phone-pad' })
                }
              />
              <InfoRow
                icon="globe-outline"
                label="Website"
                value={company.website}
                isDark={isDark}
                onPress={company.website ? () => handleWebsite(company.website) : undefined}
                onEdit={() =>
                  setEditingField({ key: 'website', label: 'Website', keyboardType: 'url' })
                }
              />
            </SectionCard>

            {/* Business Information */}
            <SectionCard title="Business Information" isDark={isDark}>
              <InfoRow
                icon="cash-outline"
                label="Annual Revenue"
                value={company.annualRevenue ? formatRevenue(company.annualRevenue) : undefined}
                isDark={isDark}
                onEdit={() =>
                  setEditingField({
                    key: 'annualRevenue',
                    label: 'Annual Revenue',
                    keyboardType: 'numeric',
                  })
                }
              />
              <InfoRow
                icon="people-outline"
                label="Employees"
                value={
                  company.numberOfEmployees
                    ? formatEmployees(company.numberOfEmployees)
                    : undefined
                }
                isDark={isDark}
                onEdit={() =>
                  setEditingField({
                    key: 'numberOfEmployees',
                    label: 'Employees',
                    keyboardType: 'numeric',
                  })
                }
              />
            </SectionCard>

            {/* Description */}
            <SectionCard title="Description" isDark={isDark}>
              <InfoRow
                icon="document-text-outline"
                label="Description"
                value={company.description}
                isDark={isDark}
                onEdit={() =>
                  setEditingField({ key: 'description', label: 'Description', multiline: true })
                }
              />
            </SectionCard>

            {/* (Description card no longer hidden when empty — shows placeholder + edit pencil) */}

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
                    onPress={() => router.push(`/contacts/customer/${contact.id}` as any)}
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
              <InfoRow
                icon="home-outline"
                label="Street"
                value={company.address}
                isDark={isDark}
                onEdit={() => setEditingField({ key: 'address', label: 'Street' })}
              />
              <InfoRow
                icon="business-outline"
                label="City"
                value={company.city}
                isDark={isDark}
                onEdit={() => setEditingField({ key: 'city', label: 'City' })}
              />
              <InfoRow
                icon="map-outline"
                label="State"
                value={company.state}
                isDark={isDark}
                onEdit={() => setEditingField({ key: 'state', label: 'State' })}
              />
              <InfoRow
                icon="globe-outline"
                label="Country"
                value={company.country}
                isDark={isDark}
                onEdit={() => setEditingField({ key: 'country', label: 'Country' })}
              />
              <InfoRow
                icon="document-text-outline"
                label="Postal Code"
                value={company.postalCode}
                isDark={isDark}
                onEdit={() => setEditingField({ key: 'postalCode', label: 'Postal Code' })}
              />
            </SectionCard>
            {(company.address || company.city) && (
              <TouchableOpacity style={[styles.mapButton, { backgroundColor: colors.primary }]} onPress={handleMaps}>
                <Ionicons name="navigate-outline" size={18} color={colors.primaryForeground} />
                <Text style={[styles.mapButtonText, { color: colors.primaryForeground }]}>Open in Maps</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <ScreenLoader />;
  }

  if (!company) {
    return (
      <View style={[styles.container, styles.centered]}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <Ionicons name="alert-circle-outline" size={64} color={subtitleColor} />
        <Text style={[styles.errorText, { color: textColor }]}>Organization not found</Text>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={[styles.backButtonText, { color: colors.primaryForeground }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initials = getCompanyInitials(company);
  const typeColor = COMPANY_TYPE_COLORS[company.type] || colors.primary;
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
                <ActivityIndicator size="small" color={Palette.red} />
              ) : (
                <Ionicons name="trash-outline" size={22} color={Palette.red} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
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
                  <Ionicons name="call" size={22} color={Palette.emerald} />
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
                <View style={[styles.quickActionIcon, { backgroundColor: '#34343420' }]}>
                  <Ionicons name="mail" size={22} color={colors.primary} />
                </View>
                <Text style={[styles.quickActionLabel, { color: subtitleColor }]}>Email</Text>
              </TouchableOpacity>
            )}
            {company.website && (
              <TouchableOpacity style={styles.quickAction} onPress={() => handleWebsite(company.website)}>
                <View style={[styles.quickActionIcon, { backgroundColor: '#8b5cf620' }]}>
                  <Ionicons name="globe" size={22} color={Palette.purple} />
                </View>
                <Text style={[styles.quickActionLabel, { color: subtitleColor }]}>Website</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Stats Summary */}
          <View style={[styles.statsRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border }]}>
            <View style={styles.statItem}>
              <Ionicons name="people" size={16} color={colors.primary} />
              <Text style={[styles.statValue, { color: textColor }]}>{(contacts || []).length}</Text>
              <Text style={[styles.statLabel, { color: subtitleColor }]}>Contacts</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
            <View style={styles.statItem}>
              <Ionicons name="flash" size={16} color={Palette.amber} />
              <Text style={[styles.statValue, { color: textColor }]}>{(leads || []).length}</Text>
              <Text style={[styles.statLabel, { color: subtitleColor }]}>Leads</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
            <View style={styles.statItem}>
              <Ionicons name="time" size={16} color={Palette.purple} />
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
                  color={isActive ? colors.primary : subtitleColor}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isActive ? colors.primary : subtitleColor },
                    isActive && styles.activeTabLabel,
                  ]}
                >
                  {tab.label}
                </Text>
                {count !== undefined && count > 0 && (
                  <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, { color: textColor }]}>{count}</Text>
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

      {/* Inline edit text modal */}
      {editingField && company && (
        <ValueInputModal
          visible={!!editingField}
          title={editingField.label}
          initialValue={
            editingField.keyboardType === 'numeric'
              ? (company[editingField.key] != null ? String(company[editingField.key]) : '')
              : ((company[editingField.key] as string | undefined) ?? '')
          }
          keyboardType={editingField.keyboardType}
          multiline={editingField.multiline}
          isDark={isDark}
          onSave={async (next) => {
            if (editingField.keyboardType === 'numeric') {
              await updateNumericField(editingField.key, next);
            } else {
              await updateField(editingField.key, next);
            }
          }}
          onClose={() => setEditingField(null)}
        />
      )}

      {/* Type picker */}
      {company && (
        <TypePickerModal
          visible={showTypePicker}
          current={company.type}
          isDark={isDark}
          onSelect={async (next) => {
            await updateField('type', next);
          }}
          onClose={() => setShowTypePicker(false)}
        />
      )}
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
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  mapButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  errorText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  /* Inline edit pencil */
  editIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* ValueInputModal */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalInputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalSaveButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  /* TypePickerModal */
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  typeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  typeOptionLabel: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
});
