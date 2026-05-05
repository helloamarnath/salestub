import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
  FlatList,
  ActivityIndicator,
  Pressable,
  Linking,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { useRBAC } from '@/hooks/use-rbac';
import { Colors, Palette } from '@/constants/theme';
import { AccessDenied } from '@/components/AccessDenied';
import { getContacts, bulkDeleteContacts } from '@/lib/api/contacts';
import { getCompanies, bulkDeleteCompanies } from '@/lib/api/companies';
import { getRoleInfo, isSuperAdmin } from '@/lib/api/organization';
import {
  ContactFilterModal,
  type CustomerFilterState,
  type OrganizationFilterState,
} from '@/components/filters';
import type { Contact, ContactFilters } from '@/types/contact';
import type { Company, CompanyFilters } from '@/types/company';
import { getContactFullName, getContactInitials, getAvatarColor } from '@/types/contact';
import { getCompanyInitials, COMPANY_TYPE_LABELS, COMPANY_TYPE_COLORS, formatRevenue } from '@/types/company';

type TabType = 'customers' | 'organizations';

// Customer Item Component
function CustomerItem({
  contact,
  isDark,
  onPress,
  onLongPress,
  selectionMode,
  isSelected,
}: {
  contact: Contact;
  isDark: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const fullName = getContactFullName(contact);
  const initials = getContactInitials(contact);
  const avatarColor = getAvatarColor(fullName);

  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const actionBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} onLongPress={onLongPress}>
      <View
        style={[
          styles.listItem,
          { borderBottomColor: borderColor },
          isSelected && {
            backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
          },
        ]}
      >
        {selectionMode ? (
          <View
            style={[
              styles.selectCheckbox,
              {
                backgroundColor: isSelected ? colors.primary : 'transparent',
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={18} color={colors.primaryForeground} />
            )}
          </View>
        ) : (
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={[styles.itemTitle, { color: textColor }]}>{fullName}</Text>
          {contact.companyName && (
            <Text style={[styles.itemSubtitle, { color: subtitleColor }]}>
              {contact.title ? `${contact.title} at ` : ''}{contact.companyName}
            </Text>
          )}
          {contact.email && !contact.companyName && (
            <Text style={[styles.itemSubtitle, { color: subtitleColor }]}>{contact.email}</Text>
          )}
        </View>
        {!selectionMode && (
          <View style={styles.itemActions}>
            {contact.phone && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: actionBg }]}
                onPress={(e) => {
                  e.stopPropagation();
                  Linking.openURL(`tel:${contact.phone}`);
                }}
              >
                <Ionicons name="call-outline" size={18} color={Palette.emerald} />
              </TouchableOpacity>
            )}
            {contact.phone && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: actionBg }]}
                onPress={(e) => {
                  e.stopPropagation();
                  const cleanPhone = contact.phone!.replace(/[^0-9+]/g, '').replace(/^\+/, '');
                  Linking.openURL(`https://wa.me/${cleanPhone}`);
                }}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              </TouchableOpacity>
            )}
            {contact.email && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: actionBg }]}
                onPress={(e) => {
                  e.stopPropagation();
                  Linking.openURL(`mailto:${contact.email}`);
                }}
              >
                <Ionicons name="mail-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// Organization Item Component
function OrganizationItem({
  company,
  isDark,
  onPress,
  onLongPress,
  selectionMode,
  isSelected,
}: {
  company: Company;
  isDark: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const initials = getCompanyInitials(company);
  const typeColor = COMPANY_TYPE_COLORS[company.type] || colors.primary;
  const typeLabel = COMPANY_TYPE_LABELS[company.type] || company.type;

  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} onLongPress={onLongPress}>
      <View
        style={[
          styles.listItem,
          { borderBottomColor: borderColor },
          isSelected && {
            backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
          },
        ]}
      >
        {selectionMode ? (
          <View
            style={[
              styles.selectCheckbox,
              {
                backgroundColor: isSelected ? colors.primary : 'transparent',
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={18} color={colors.primaryForeground} />
            )}
          </View>
        ) : (
          <View style={[styles.avatar, { backgroundColor: typeColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <View style={styles.itemInfo}>
          <View style={styles.titleRow}>
            <Text style={[styles.itemTitle, { color: textColor, flex: 1 }]} numberOfLines={1}>
              {company.name}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: `${typeColor}20` }]}>
              <Text style={[styles.typeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            {company.industry && (
              <Text style={[styles.itemSubtitle, { color: subtitleColor }]}>
                {company.industry}
              </Text>
            )}
            {company.annualRevenue && (
              <Text style={[styles.itemSubtitle, { color: subtitleColor }]}>
                {company.industry ? ' • ' : ''}{formatRevenue(company.annualRevenue)}
              </Text>
            )}
          </View>
          {company.contactsCount !== undefined && company.contactsCount > 0 && (
            <Text style={[styles.countText, { color: subtitleColor }]}>
              {company.contactsCount} contact{company.contactsCount !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
        {!selectionMode && (
          <View style={styles.itemActions}>
            {company.phone && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' },
                ]}
              >
                <Ionicons name="call-outline" size={18} color={Palette.emerald} />
              </TouchableOpacity>
            )}
            {company.website && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' },
                ]}
              >
                <Ionicons name="globe-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// Empty State Component
function EmptyState({
  type,
  isDark,
  onAdd,
  canCreate,
}: {
  type: TabType;
  isDark: boolean;
  onAdd: () => void;
  canCreate: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';

  return (
    <View style={styles.emptyState}>
      <Ionicons
        name={type === 'customers' ? 'people-outline' : 'business-outline'}
        size={64}
        color={subtitleColor}
      />
      <Text style={[styles.emptyTitle, { color: textColor }]}>
        No {type === 'customers' ? 'Customers' : 'Organizations'} Yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: subtitleColor }]}>
        {canCreate
          ? type === 'customers'
            ? 'Add your first customer contact to get started'
            : 'Add your first organization to get started'
          : 'No contacts available'}
      </Text>
      {canCreate && (
        <TouchableOpacity style={[styles.emptyButton, { backgroundColor: colors.primary }]} onPress={onAdd}>
          <Ionicons name="add" size={20} color={colors.primaryForeground} />
          <Text style={[styles.emptyButtonText, { color: colors.primaryForeground }]}>
            Add {type === 'customers' ? 'Customer' : 'Organization'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ContactsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const rbac = useRBAC();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  // Check if user has permission to view contacts
  if (rbac.isLoaded && !rbac.canRead('contacts')) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You don't have permission to view contacts. Please contact your administrator."
        showHomeButton={true}
      />
    );
  }

  const [activeTab, setActiveTab] = useState<TabType>('customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Filter modal state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [customerFilters, setCustomerFilters] = useState<CustomerFilterState>({});
  const [organizationFilters, setOrganizationFilters] = useState<OrganizationFilterState>({});
  const [userRoleKey, setUserRoleKey] = useState<string | undefined>();

  // Get current filter count based on active tab
  const activeFilterCount = activeTab === 'customers'
    ? Object.values(customerFilters).filter(Boolean).length
    : Object.values(organizationFilters).filter(Boolean).length;

  // Customer state
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersPage, setCustomersPage] = useState(1);
  const [customersHasMore, setCustomersHasMore] = useState(true);

  // Organization state
  const [organizations, setOrganizations] = useState<Company[]>([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(true);
  const [organizationsPage, setOrganizationsPage] = useState(1);
  const [organizationsHasMore, setOrganizationsHasMore] = useState(true);

  // Bulk selection state — scoped per active tab; switching tabs exits selection mode.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Theme-aware colors
  const gradientColors: [string, string, string] = [colors.background, colors.card, colors.background] as [string, string, string];
  const headerBorderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? 'white' : colors.foreground;
  const searchBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const searchBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const placeholderColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const tabBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const activeTabBg = isDark ? 'rgba(255,255,255,0.15)' : 'white';

  // Fetch user role info
  const fetchUserRoleInfo = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await getRoleInfo(accessToken);
      if (response.success && response.data) {
        setUserRoleKey(response.data.role?.key);
      }
    } catch (error) {
      console.error('Failed to fetch role info:', error);
    }
  }, [accessToken]);

  // Fetch customers
  const fetchCustomers = useCallback(async (page: number = 1, search: string = '') => {
    if (page === 1) setCustomersLoading(true);

    try {
      const params: ContactFilters = {
        page,
        limit: 20,
        search: search || undefined,
        status: customerFilters.status,
        ownerMembershipId: customerFilters.ownerMembershipId,
      };

      const response = await getContacts(accessToken, params);

      if (response.success && response.data) {
        const { data, meta } = response.data;
        if (page === 1) {
          setCustomers(data || []);
        } else {
          setCustomers(prev => [...prev, ...(data || [])]);
        }
        if (meta) {
          setCustomersHasMore(meta.page < meta.totalPages);
          setCustomersPage(meta.page);
        } else {
          setCustomersHasMore(false);
        }
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }

    setCustomersLoading(false);
  }, [accessToken, customerFilters]);

  // Fetch organizations
  const fetchOrganizations = useCallback(async (page: number = 1, search: string = '') => {
    if (page === 1) setOrganizationsLoading(true);

    try {
      const params: CompanyFilters = {
        page,
        limit: 20,
        search: search || undefined,
        type: organizationFilters.type,
        industry: organizationFilters.industry,
        ownerMembershipId: organizationFilters.ownerMembershipId,
      };

      const response = await getCompanies(accessToken, params);

      if (response.success && response.data) {
        const { data, meta } = response.data;
        if (page === 1) {
          setOrganizations(data || []);
        } else {
          setOrganizations(prev => [...prev, ...(data || [])]);
        }
        if (meta) {
          setOrganizationsHasMore(meta.page < meta.totalPages);
          setOrganizationsPage(meta.page);
        } else {
          setOrganizationsHasMore(false);
        }
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }

    setOrganizationsLoading(false);
  }, [accessToken, organizationFilters]);

  // Initial load
  useEffect(() => {
    fetchUserRoleInfo();
    fetchCustomers(1, '');
    fetchOrganizations(1, '');
  }, []);

  // Refetch when customer filters change
  useEffect(() => {
    fetchCustomers(1, searchQuery);
  }, [customerFilters]);

  // Refetch when organization filters change
  useEffect(() => {
    fetchOrganizations(1, searchQuery);
  }, [organizationFilters]);

  // Handle applying filters
  const handleApplyFilters = (filters: CustomerFilterState | OrganizationFilterState) => {
    if (activeTab === 'customers') {
      setCustomerFilters(filters as CustomerFilterState);
    } else {
      setOrganizationFilters(filters as OrganizationFilterState);
    }
  };

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'customers') {
        fetchCustomers(1, searchQuery);
      } else {
        fetchOrganizations(1, searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, fetchCustomers, fetchOrganizations]);

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchCustomers(1, searchQuery),
      fetchOrganizations(1, searchQuery),
    ]);
    setRefreshing(false);
  };

  // Load more
  const loadMoreCustomers = () => {
    if (!customersLoading && customersHasMore) {
      fetchCustomers(customersPage + 1, searchQuery);
    }
  };

  const loadMoreOrganizations = () => {
    if (!organizationsLoading && organizationsHasMore) {
      fetchOrganizations(organizationsPage + 1, searchQuery);
    }
  };

  // Navigation handlers
  const handleAddNew = () => {
    if (activeTab === 'customers') {
      router.push('/contacts/customer/create' as any);
    } else {
      router.push('/contacts/organization/create' as any);
    }
  };

  const handleCustomerPress = (contact: Contact) => {
    router.push(`/contacts/customer/${contact.id}` as any);
  };

  const handleOrganizationPress = (company: Company) => {
    router.push(`/contacts/organization/${company.id}` as any);
  };

  // Render loading skeleton
  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5].map((item) => (
        <View key={item} style={styles.skeletonItem}>
          <View style={[styles.skeletonAvatar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
          <View style={styles.skeletonContent}>
            <View style={[styles.skeletonTitle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
            <View style={[styles.skeletonSubtitle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} />
          </View>
        </View>
      ))}
    </View>
  );

  // Render list footer
  const renderFooter = (loading: boolean) => {
    if (!loading) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const isLoading = activeTab === 'customers' ? customersLoading : organizationsLoading;
  const data = activeTab === 'customers' ? customers : organizations;

  // ---------- Bulk selection helpers ----------
  const enterSelectionMode = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  const exitSelectionMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelected = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ids = activeTab === 'customers'
      ? customers.map((c) => c.id)
      : organizations.map((o) => o.id);
    setSelectedIds(new Set(ids));
  }, [activeTab, customers, organizations]);

  // Switching tabs while selecting is confusing — clear selection.
  useEffect(() => {
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedIds(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0 || !accessToken) return;
    const tabLabel = activeTab === 'customers' ? 'customer' : 'organization';
    const count = selectedIds.size;
    Alert.alert(
      `Delete ${count} ${tabLabel}${count !== 1 ? 's' : ''}?`,
      'This cannot be undone. Linked leads, deals, and activities are not deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBulkDeleting(true);
            const ids = Array.from(selectedIds);
            const res =
              activeTab === 'customers'
                ? await bulkDeleteContacts(accessToken, ids)
                : await bulkDeleteCompanies(accessToken, ids);
            setBulkDeleting(false);
            if (res.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              if (activeTab === 'customers') {
                setCustomers((prev) => prev.filter((c) => !ids.includes(c.id)));
              } else {
                setOrganizations((prev) => prev.filter((o) => !ids.includes(o.id)));
              }
              setSelectionMode(false);
              setSelectedIds(new Set());
            } else {
              Alert.alert('Delete failed', res.error?.message || 'Could not delete records.');
            }
          },
        },
      ],
    );
  }, [accessToken, activeTab, selectedIds]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: headerBorderColor }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <Text style={[styles.title, { color: textColor }]}>Contacts</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.iconActionButton, { backgroundColor: tabBg, borderColor: headerBorderColor }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(
                    (activeTab === 'customers'
                      ? '/contacts/analytics'
                      : '/contacts/organization-analytics') as any,
                  );
                }}
              >
                <Ionicons name="stats-chart-outline" size={20} color={textColor} />
              </TouchableOpacity>
              {rbac.canCreate('contacts') && (
                <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={handleAddNew}>
                  <Ionicons name="add" size={24} color={colors.primaryForeground} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Tab Switcher */}
          <View style={[styles.tabContainer, { backgroundColor: tabBg }]}>
            <Pressable
              style={[
                styles.tab,
                activeTab === 'customers' && [styles.activeTab, { backgroundColor: activeTabBg }],
              ]}
              onPress={() => setActiveTab('customers')}
            >
              <Ionicons
                name={activeTab === 'customers' ? 'people' : 'people-outline'}
                size={18}
                color={activeTab === 'customers' ? colors.primary : placeholderColor}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'customers' ? textColor : placeholderColor },
                ]}
              >
                Customers
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.tab,
                activeTab === 'organizations' && [styles.activeTab, { backgroundColor: activeTabBg }],
              ]}
              onPress={() => setActiveTab('organizations')}
            >
              <Ionicons
                name={activeTab === 'organizations' ? 'business' : 'business-outline'}
                size={18}
                color={activeTab === 'organizations' ? colors.primary : placeholderColor}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'organizations' ? textColor : placeholderColor },
                ]}
              >
                Organizations
              </Text>
            </Pressable>
          </View>

          {/* Search bar with filter */}
          <View style={styles.searchRow}>
            <View style={[styles.searchContainer, { backgroundColor: searchBg, borderColor: searchBorder, flex: 1 }]}>
              <Ionicons name="search-outline" size={20} color={placeholderColor} />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                placeholder={`Search ${activeTab === 'customers' ? 'customers' : 'organizations'}...`}
                placeholderTextColor={placeholderColor}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={placeholderColor} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: searchBg, borderColor: searchBorder },
                activeFilterCount > 0 && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilterModalVisible(true);
              }}
            >
              <Ionicons
                name="options-outline"
                size={20}
                color={activeFilterCount > 0 ? colors.primaryForeground : placeholderColor}
              />
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Content */}
      {isLoading && data.length === 0 ? (
        renderSkeleton()
      ) : data.length === 0 ? (
        <EmptyState type={activeTab} isDark={isDark} onAdd={handleAddNew} canCreate={rbac.canCreate('contacts')} />
      ) : activeTab === 'customers' ? (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CustomerItem
              contact={item}
              isDark={isDark}
              onPress={() => {
                if (selectionMode) toggleSelected(item.id);
                else handleCustomerPress(item);
              }}
              onLongPress={() => {
                if (!selectionMode) enterSelectionMode(item.id);
              }}
              selectionMode={selectionMode}
              isSelected={selectedIds.has(item.id)}
            />
          )}
          onEndReached={loadMoreCustomers}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => renderFooter(customersLoading && customers.length > 0)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: selectionMode ? 220 : 160 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      ) : (
        <FlatList
          data={organizations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrganizationItem
              company={item}
              isDark={isDark}
              onPress={() => {
                if (selectionMode) toggleSelected(item.id);
                else handleOrganizationPress(item);
              }}
              onLongPress={() => {
                if (!selectionMode) enterSelectionMode(item.id);
              }}
              selectionMode={selectionMode}
              isSelected={selectedIds.has(item.id)}
            />
          )}
          onEndReached={loadMoreOrganizations}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => renderFooter(organizationsLoading && organizations.length > 0)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: selectionMode ? 220 : 160 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Bulk Action Bar */}
      {selectionMode && (
        <View
          style={[
            styles.bulkActionBar,
            {
              paddingBottom: insets.bottom + 10,
              backgroundColor: colors.card,
              borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            },
          ]}
        >
          <View style={styles.bulkBarRow}>
            <TouchableOpacity onPress={exitSelectionMode} style={styles.bulkCloseButton}>
              <Ionicons name="close" size={24} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.bulkSelectedCount, { color: textColor }]}>
              {selectedIds.size} selected
            </Text>
            <TouchableOpacity
              onPress={selectAll}
              style={[
                styles.bulkSelectAllButton,
                { borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' },
              ]}
            >
              <Text style={[styles.bulkSelectAllText, { color: textColor }]}>
                {selectedIds.size === data.length ? 'Clear' : 'Select all'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.bulkActionsRow}>
            {rbac.canDelete('contacts') && (
              <TouchableOpacity
                style={[styles.bulkActionButton, { backgroundColor: Palette.red }]}
                onPress={handleBulkDelete}
                disabled={bulkDeleting || selectedIds.size === 0}
              >
                {bulkDeleting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color="white" />
                    <Text style={styles.bulkActionButtonText}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Filter Modal */}
      <ContactFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
        currentFilters={activeTab === 'customers' ? customerFilters : organizationFilters}
        tabType={activeTab}
        showOwnerFilter={isSuperAdmin(userRoleKey)}
        userRoleKey={userRoleKey}
      />
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
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  filterButtonActive: {},
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Palette.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
  itemSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  countText: {
    fontSize: 12,
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 160,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  skeletonContainer: {
    padding: 20,
  },
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
  },
  skeletonTitle: {
    height: 16,
    borderRadius: 4,
    width: '60%',
    marginBottom: 8,
  },
  skeletonSubtitle: {
    height: 12,
    borderRadius: 4,
    width: '40%',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  /* Selection mode */
  selectCheckbox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  /* Bulk Action Bar */
  bulkActionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  bulkBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  bulkCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkSelectedCount: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  bulkSelectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  bulkSelectAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bulkActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bulkActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bulkActionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
