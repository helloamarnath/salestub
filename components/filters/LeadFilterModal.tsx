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
import { LEAD_SOURCES, SOURCE_COLORS } from '@/types/lead';
import {
  getOrganizationMembers,
  getMemberDisplayName,
  type OrgMember,
} from '@/lib/api/organization';

export interface LeadFilterState {
  sources?: string[];
  stageIds?: string[];
  ownerMembershipIds?: string[];
}

interface PipelineStage {
  id: string;
  name: string;
  color?: string;
  order: number;
}

interface LeadFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: LeadFilterState) => void;
  currentFilters: LeadFilterState;
  stages?: PipelineStage[];
  showOwnerFilter?: boolean;
  userRoleKey?: string;
}

export function LeadFilterModal({
  visible,
  onClose,
  onApply,
  currentFilters,
  stages = [],
  showOwnerFilter = true,
  userRoleKey,
}: LeadFilterModalProps) {
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [filters, setFilters] = useState<LeadFilterState>(currentFilters);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Theme colors
  const bgColor = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const chipBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const chipActiveBg = '#3b82f6';

  // Fetch members when modal opens
  useEffect(() => {
    if (visible && showOwnerFilter && members.length === 0) {
      fetchMembers();
    }
  }, [visible, showOwnerFilter]);

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

  // Multi-select toggle for sources
  const toggleSource = (source: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters((prev) => {
      const currentSources = prev.sources || [];
      const isSelected = currentSources.includes(source);
      return {
        ...prev,
        sources: isSelected
          ? currentSources.filter((s) => s !== source)
          : [...currentSources, source],
      };
    });
  };

  // Multi-select toggle for stages
  const toggleStage = (stageId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters((prev) => {
      const currentStages = prev.stageIds || [];
      const isSelected = currentStages.includes(stageId);
      return {
        ...prev,
        stageIds: isSelected
          ? currentStages.filter((s) => s !== stageId)
          : [...currentStages, stageId],
      };
    });
  };

  // Multi-select toggle for owners
  const toggleOwner = (membershipId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters((prev) => {
      const currentOwners = prev.ownerMembershipIds || [];
      const isSelected = currentOwners.includes(membershipId);
      return {
        ...prev,
        ownerMembershipIds: isSelected
          ? currentOwners.filter((o) => o !== membershipId)
          : [...currentOwners, membershipId],
      };
    });
  };

  const handleApply = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Clean up empty arrays
    const cleanedFilters: LeadFilterState = {};
    if (filters.sources && filters.sources.length > 0) {
      cleanedFilters.sources = filters.sources;
    }
    if (filters.stageIds && filters.stageIds.length > 0) {
      cleanedFilters.stageIds = filters.stageIds;
    }
    if (filters.ownerMembershipIds && filters.ownerMembershipIds.length > 0) {
      cleanedFilters.ownerMembershipIds = filters.ownerMembershipIds;
    }
    onApply(cleanedFilters);
    onClose();
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters({});
  };

  // Count active filters
  const activeFilterCount =
    (filters.sources?.length || 0) +
    (filters.stageIds?.length || 0) +
    (filters.ownerMembershipIds?.length || 0);

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
            <Text style={[styles.title, { color: textColor }]}>Filter Leads</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={subtitleColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Source Filter - Multi-select */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Source</Text>
                {(filters.sources?.length || 0) > 0 && (
                  <Text style={[styles.selectedCount, { color: chipActiveBg }]}>
                    {filters.sources?.length} selected
                  </Text>
                )}
              </View>
              <View style={styles.chipContainer}>
                {LEAD_SOURCES.map((source) => {
                  const isActive = filters.sources?.includes(source) || false;
                  const sourceColor = SOURCE_COLORS[source] || '#6b7280';
                  return (
                    <TouchableOpacity
                      key={source}
                      style={[
                        styles.chip,
                        { backgroundColor: isActive ? sourceColor : chipBg },
                      ]}
                      onPress={() => toggleSource(source)}
                    >
                      {isActive && (
                        <Ionicons name="checkmark" size={14} color="white" />
                      )}
                      {!isActive && (
                        <View style={[styles.chipDot, { backgroundColor: sourceColor }]} />
                      )}
                      <Text
                        style={[
                          styles.chipText,
                          { color: isActive ? 'white' : textColor },
                        ]}
                      >
                        {source}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Stage Filter - Multi-select */}
            {stages.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: textColor }]}>Stage</Text>
                  {(filters.stageIds?.length || 0) > 0 && (
                    <Text style={[styles.selectedCount, { color: chipActiveBg }]}>
                      {filters.stageIds?.length} selected
                    </Text>
                  )}
                </View>
                <View style={styles.chipContainer}>
                  {stages.map((stage) => {
                    const isActive = filters.stageIds?.includes(stage.id) || false;
                    const stageColor = stage.color || '#6b7280';
                    return (
                      <TouchableOpacity
                        key={stage.id}
                        style={[
                          styles.chip,
                          { backgroundColor: isActive ? stageColor : chipBg },
                        ]}
                        onPress={() => toggleStage(stage.id)}
                      >
                        {isActive && (
                          <Ionicons name="checkmark" size={14} color="white" />
                        )}
                        {!isActive && (
                          <View style={[styles.chipDot, { backgroundColor: stageColor }]} />
                        )}
                        <Text
                          style={[
                            styles.chipText,
                            { color: isActive ? 'white' : textColor },
                          ]}
                        >
                          {stage.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Owner Filter - Multi-select - Always shown */}
            {showOwnerFilter && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: textColor }]}>Owner</Text>
                  {(filters.ownerMembershipIds?.length || 0) > 0 && (
                    <Text style={[styles.selectedCount, { color: chipActiveBg }]}>
                      {filters.ownerMembershipIds?.length} selected
                    </Text>
                  )}
                </View>
                {loadingMembers ? (
                  <ActivityIndicator size="small" color={Colors[resolvedTheme].primary} style={styles.loader} />
                ) : members.length === 0 ? (
                  <Text style={[styles.emptyText, { color: subtitleColor }]}>
                    No team members found
                  </Text>
                ) : (
                  <View style={styles.chipContainer}>
                    {members.map((member) => {
                      const isActive = filters.ownerMembershipIds?.includes(member.membershipId) || false;
                      return (
                        <TouchableOpacity
                          key={member.membershipId}
                          style={[
                            styles.chip,
                            { backgroundColor: isActive ? chipActiveBg : chipBg },
                          ]}
                          onPress={() => toggleOwner(member.membershipId)}
                        >
                          {isActive && (
                            <Ionicons name="checkmark" size={14} color="white" />
                          )}
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  selectedCount: {
    fontSize: 13,
    fontWeight: '500',
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
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
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
