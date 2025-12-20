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
import {
  DEAL_STAGE_LABELS,
  DEAL_STAGE_COLORS,
  DEAL_STATUS_LABELS,
  DEAL_STATUS_COLORS,
  type DealStage,
  type DealStatus,
} from '@/types/deal';
import {
  getOrganizationMembers,
  getMemberDisplayName,
  isSuperAdmin,
  type OrgMember,
} from '@/lib/api/organization';

// Deal filter state
export interface DealFilterState {
  stage?: DealStage;
  status?: DealStatus;
  ownerMembershipId?: string;
}

interface DealFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: DealFilterState) => void;
  currentFilters: DealFilterState;
  showOwnerFilter?: boolean;
  userRoleKey?: string;
}

const STAGES: DealStage[] = [
  'PROSPECTING',
  'QUALIFICATION',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
];

const STATUSES: DealStatus[] = ['OPEN', 'WON', 'LOST'];

export function DealFilterModal({
  visible,
  onClose,
  onApply,
  currentFilters,
  showOwnerFilter = false,
  userRoleKey,
}: DealFilterModalProps) {
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [filters, setFilters] = useState<DealFilterState>(currentFilters);
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

  const toggleStage = (stage: DealStage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters({
      ...filters,
      stage: filters.stage === stage ? undefined : stage,
    });
  };

  const toggleStatus = (status: DealStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters({
      ...filters,
      status: filters.status === status ? undefined : status,
    });
  };

  const toggleOwner = (membershipId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters({
      ...filters,
      ownerMembershipId: filters.ownerMembershipId === membershipId ? undefined : membershipId,
    });
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Filter Deals</Text>
          <TouchableOpacity onPress={handleClear} disabled={!hasActiveFilters}>
            <Text
              style={[
                styles.clearText,
                { color: hasActiveFilters ? '#3b82f6' : subtitleColor },
              ]}
            >
              Clear
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Stage Filter */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Stage</Text>
            <View style={styles.chipContainer}>
              {STAGES.map((stage) => {
                const isActive = filters.stage === stage;
                const stageColor = DEAL_STAGE_COLORS[stage];
                return (
                  <Pressable
                    key={stage}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isActive ? stageColor : chipBg,
                        borderColor: isActive ? stageColor : borderColor,
                      },
                    ]}
                    onPress={() => toggleStage(stage)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isActive ? 'white' : textColor },
                      ]}
                    >
                      {DEAL_STAGE_LABELS[stage]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Status Filter */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Status</Text>
            <View style={styles.chipContainer}>
              {STATUSES.map((status) => {
                const isActive = filters.status === status;
                const statusColor = DEAL_STATUS_COLORS[status];
                return (
                  <Pressable
                    key={status}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isActive ? statusColor : chipBg,
                        borderColor: isActive ? statusColor : borderColor,
                      },
                    ]}
                    onPress={() => toggleStatus(status)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isActive ? 'white' : textColor },
                      ]}
                    >
                      {DEAL_STATUS_LABELS[status]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Owner Filter (for admins only) */}
          {canSeeOwnerFilter && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Owner</Text>
              {loadingMembers ? (
                <ActivityIndicator size="small" color="#3b82f6" style={{ marginTop: 12 }} />
              ) : (
                <View style={styles.chipContainer}>
                  {members.map((member) => {
                    const isActive = filters.ownerMembershipId === member.membershipId;
                    return (
                      <Pressable
                        key={member.membershipId}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isActive ? chipActiveBg : chipBg,
                            borderColor: isActive ? chipActiveBg : borderColor,
                          },
                        ]}
                        onPress={() => toggleOwner(member.membershipId)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: isActive ? 'white' : textColor },
                          ]}
                        >
                          {getMemberDisplayName(member)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Apply Button */}
        <View style={[styles.footer, { borderTopColor: borderColor }]}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  clearText: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
  },
  applyButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
