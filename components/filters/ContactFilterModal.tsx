import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { COMPANY_TYPE_LABELS, COMPANY_TYPE_COLORS, type CompanyType } from '@/types/company';
import {
  getOrganizationMembers,
  getMemberDisplayName,
  isSuperAdmin,
  type OrgMember,
} from '@/lib/api/organization';

// Customer filter state
export interface CustomerFilterState {
  status?: 'Active' | 'Inactive';
  ownerMembershipId?: string;
}

// Organization filter state
export interface OrganizationFilterState {
  type?: CompanyType;
  industry?: string;
  ownerMembershipId?: string;
}

type TabType = 'customers' | 'organizations';

interface ContactFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: CustomerFilterState | OrganizationFilterState) => void;
  currentFilters: CustomerFilterState | OrganizationFilterState;
  tabType: TabType;
  showOwnerFilter?: boolean;
  userRoleKey?: string;
}

// Common industries for organization filter
const INDUSTRIES = [
  'Technology',
  'Manufacturing',
  'Healthcare',
  'Finance',
  'Retail',
  'Education',
  'Construction',
  'Real Estate',
  'Consulting',
  'Logistics',
  'Other',
];

const STATUS_OPTIONS: Array<{ value: 'Active' | 'Inactive'; color: string }> = [
  { value: 'Active', color: '#22c55e' },
  { value: 'Inactive', color: '#ef4444' },
];

export function ContactFilterModal({
  visible,
  onClose,
  onApply,
  currentFilters,
  tabType,
  showOwnerFilter = false,
  userRoleKey,
}: ContactFilterModalProps) {
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [filters, setFilters] = useState<CustomerFilterState | OrganizationFilterState>(currentFilters);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Theme colors
  const bgColor = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const chipBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const chipActiveBg = '#3b82f6';

  // Check if user can see owner filter
  const canSeeOwnerFilter = showOwnerFilter || isSuperAdmin(userRoleKey);

  // Fetch members when modal opens and owner filter is enabled
  useEffect(() => {
    if (visible && canSeeOwnerFilter && members.length === 0) {
      fetchMembers();
    }
  }, [visible, canSeeOwnerFilter]);

  // Reset filters when modal opens
  useEffect(() => {
    if (visible) {
      setFilters(currentFilters);
    }
  }, [visible, currentFilters]);

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const response = await getOrganizationMembers(accessToken, { limit: 100 });
      if (response.success && response.data) {
        setMembers(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
    setLoadingMembers(false);
  };

  const handleApply = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onApply(filters);
    onClose();
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters({});
  };

  const toggleStatus = (status: 'Active' | 'Inactive') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentFilters = filters as CustomerFilterState;
    setFilters({
      ...currentFilters,
      status: currentFilters.status === status ? undefined : status,
    });
  };

  const toggleType = (type: CompanyType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentFilters = filters as OrganizationFilterState;
    setFilters({
      ...currentFilters,
      type: currentFilters.type === type ? undefined : type,
    });
  };

  const toggleIndustry = (industry: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentFilters = filters as OrganizationFilterState;
    setFilters({
      ...currentFilters,
      industry: currentFilters.industry === industry ? undefined : industry,
    });
  };

  const selectOwner = (membershipId: string | undefined) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters((prev) => ({
      ...prev,
      ownerMembershipId: prev.ownerMembershipId === membershipId ? undefined : membershipId,
    }));
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.container, { backgroundColor: bgColor }]} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <Text style={[styles.title, { color: textColor }]}>
              Filter {tabType === 'customers' ? 'Customers' : 'Organizations'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={subtitleColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Customer-specific filters */}
            {tabType === 'customers' && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Status</Text>
                <View style={styles.chipContainer}>
                  {STATUS_OPTIONS.map((option) => {
                    const currentFilters = filters as CustomerFilterState;
                    const isActive = currentFilters.status === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.chip,
                          { backgroundColor: isActive ? option.color : chipBg },
                        ]}
                        onPress={() => toggleStatus(option.value)}
                      >
                        {!isActive && (
                          <View style={[styles.chipDot, { backgroundColor: option.color }]} />
                        )}
                        <Text
                          style={[
                            styles.chipText,
                            { color: isActive ? 'white' : textColor },
                          ]}
                        >
                          {option.value}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Organization-specific filters */}
            {tabType === 'organizations' && (
              <>
                {/* Type Filter */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: textColor }]}>Type</Text>
                  <View style={styles.chipContainer}>
                    {(Object.keys(COMPANY_TYPE_LABELS) as CompanyType[]).map((type) => {
                      const currentFilters = filters as OrganizationFilterState;
                      const isActive = currentFilters.type === type;
                      const typeColor = COMPANY_TYPE_COLORS[type];
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.chip,
                            { backgroundColor: isActive ? typeColor : chipBg },
                          ]}
                          onPress={() => toggleType(type)}
                        >
                          {!isActive && (
                            <View style={[styles.chipDot, { backgroundColor: typeColor }]} />
                          )}
                          <Text
                            style={[
                              styles.chipText,
                              { color: isActive ? 'white' : textColor },
                            ]}
                          >
                            {COMPANY_TYPE_LABELS[type]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Industry Filter */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: textColor }]}>Industry</Text>
                  <View style={styles.chipContainer}>
                    {INDUSTRIES.map((industry) => {
                      const currentFilters = filters as OrganizationFilterState;
                      const isActive = currentFilters.industry === industry;
                      return (
                        <TouchableOpacity
                          key={industry}
                          style={[
                            styles.chip,
                            { backgroundColor: isActive ? chipActiveBg : chipBg },
                          ]}
                          onPress={() => toggleIndustry(industry)}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: isActive ? 'white' : textColor },
                            ]}
                          >
                            {industry}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            {/* Owner Filter - Only for super admins */}
            {canSeeOwnerFilter && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Owner</Text>
                {loadingMembers ? (
                  <ActivityIndicator size="small" color={Colors[resolvedTheme].primary} style={styles.loader} />
                ) : (
                  <View style={styles.chipContainer}>
                    <TouchableOpacity
                      style={[
                        styles.chip,
                        { backgroundColor: !filters.ownerMembershipId ? chipActiveBg : chipBg },
                      ]}
                      onPress={() => selectOwner(undefined)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: !filters.ownerMembershipId ? 'white' : textColor },
                        ]}
                      >
                        All Owners
                      </Text>
                    </TouchableOpacity>
                    {members.map((member) => {
                      const isActive = filters.ownerMembershipId === member.membershipId;
                      return (
                        <TouchableOpacity
                          key={member.membershipId}
                          style={[
                            styles.chip,
                            { backgroundColor: isActive ? chipActiveBg : chipBg },
                          ]}
                          onPress={() => selectOwner(member.membershipId)}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: isActive ? 'white' : textColor },
                            ]}
                          >
                            {getMemberDisplayName(member)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: borderColor }]}>
            <TouchableOpacity
              style={[styles.clearButton, { borderColor }]}
              onPress={handleClear}
            >
              <Text style={[styles.clearButtonText, { color: textColor }]}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
            >
              <Text style={styles.applyButtonText}>
                Apply {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loader: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
