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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { useRBAC } from '@/hooks/use-rbac';
import { Colors } from '@/constants/theme';
import { AccessDenied } from '@/components/AccessDenied';
import { getContacts } from '@/lib/api/contacts';
import { getCompanies } from '@/lib/api/companies';
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
}: {
  contact: Contact;
  isDark: boolean;
  onPress: () => void;
}) {
  const fullName = getContactFullName(contact);
  const initials = getContactInitials(contact);
  const avatarColor = getAvatarColor(fullName);

  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const actionBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.listItem, { borderBottomColor: borderColor }]}>
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
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
        <View style={styles.itemActions}>
          {contact.phone && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: actionBg }]}
              onPress={(e) => {
                e.stopPropagation();
                Linking.openURL(`tel:${contact.phone}`);
              }}
            >
              <Ionicons name="call-outline" size={18} color="#22c55e" />
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
              <Ionicons name="mail-outline" size={18} color="#3b82f6" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Organization Item Component
function OrganizationItem({
  company,
  isDark,
  onPress,
}: {
  company: Company;
  isDark: boolean;
  onPress: () => void;
}) {
  const initials = getCompanyInitials(company);
  const typeColor = COMPANY_TYPE_COLORS[company.type] || '#3b82f6';
  const typeLabel = COMPANY_TYPE_LABELS[company.type] || company.type;

  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const actionBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.listItem, { borderBottomColor: borderColor }]}>
        <View style={[styles.avatar, { backgroundColor: typeColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
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
        <View style={styles.itemActions}>
          {company.phone && (
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: actionBg }]}>
              <Ionicons name="call-outline" size={18} color="#22c55e" />
            </TouchableOpacity>
          )}
          {company.website && (
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: actionBg }]}>
              <Ionicons name="globe-outline" size={18} color="#3b82f6" />
            </TouchableOpacity>
          )}
        </View>
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
  const textColor = isDark ? 'white' : Colors.light.foreground;
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
        <TouchableOpacity style={styles.emptyButton} onPress={onAdd}>
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.emptyButtonText}>
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

  // Theme-aware colors
  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];
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
      router.push('/(tabs)/contacts/customer/create' as any);
    } else {
      router.push('/(tabs)/contacts/organization/create' as any);
    }
  };

  const handleCustomerPress = (contact: Contact) => {
    router.push(`/(tabs)/contacts/customer/${contact.id}` as any);
  };

  const handleOrganizationPress = (company: Company) => {
    router.push(`/(tabs)/contacts/organization/${company.id}` as any);
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

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: headerBorderColor }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <Text style={[styles.title, { color: textColor }]}>Contacts</Text>
            {rbac.canCreate('contacts') && (
              <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
                <Ionicons name="add" size={24} color="white" />
              </TouchableOpacity>
            )}
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
                activeFilterCount > 0 && styles.filterButtonActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilterModalVisible(true);
              }}
            >
              <Ionicons
                name="options-outline"
                size={20}
                color={activeFilterCount > 0 ? 'white' : placeholderColor}
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
              onPress={() => handleCustomerPress(item)}
            />
          )}
          onEndReached={loadMoreCustomers}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => renderFooter(customersLoading && customers.length > 0)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
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
              onPress={() => handleOrganizationPress(item)}
            />
          )}
          onEndReached={loadMoreOrganizations}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => renderFooter(organizationsLoading && organizations.length > 0)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
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
    backgroundColor: '#3b82f6',
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
  filterButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
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
    paddingBottom: 100,
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
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: 'white',
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
});
