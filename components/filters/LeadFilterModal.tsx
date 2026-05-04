import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { LEAD_SOURCES, SOURCE_COLORS, type LeadSourceConfig } from '@/types/lead';
import { getLeadSources } from '@/lib/api/leads';
import {
  getOrganizationMembers,
  getMemberDisplayName,
  type OrgMember,
} from '@/lib/api/organization';

export interface LeadFilterState {
  sources?: string[];
  stageIds?: string[];
  ownerMembershipIds?: string[];
  // Server-side filters (added 2026-05-04 — backend now accepts on /leads)
  createdFrom?: string; // YYYY-MM-DD
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  scoreMin?: number; // 0-100
  scoreMax?: number;
}

type DateField = 'createdFrom' | 'createdTo' | 'updatedFrom' | 'updatedTo';

function DateButton({
  label,
  value,
  formatDate,
  textColor,
  subtitleColor,
  chipBg,
  borderColor,
  onPress,
  onClear,
}: {
  label: string;
  value?: string;
  formatDate: (iso?: string) => string;
  textColor: string;
  subtitleColor: string;
  chipBg: string;
  borderColor: string;
  onPress: () => void;
  onClear: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.dateButton, { backgroundColor: chipBg, borderColor }]}
      onPress={onPress}
    >
      <View style={styles.dateButtonInner}>
        <Text style={[styles.dateButtonLabel, { color: subtitleColor }]}>{label}</Text>
        <Text
          style={[styles.dateButtonValue, { color: value ? textColor : subtitleColor }]}
          numberOfLines={1}
        >
          {formatDate(value)}
        </Text>
      </View>
      {value && (
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={18} color={subtitleColor} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
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
  const colors = Colors[resolvedTheme];

  const [filters, setFilters] = useState<LeadFilterState>(currentFilters);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [leadSources, setLeadSources] = useState<string[]>([...LEAD_SOURCES]);
  const [loadingSources, setLoadingSources] = useState(false);

  // Date picker state — one picker shared across the four date fields
  const [datePickerField, setDatePickerField] = useState<DateField | null>(null);
  const [tempPickerDate, setTempPickerDate] = useState<Date>(new Date());

  // Score range — keep as strings so users can clear / type freely; coerce on apply
  const [scoreMinStr, setScoreMinStr] = useState<string>(
    currentFilters.scoreMin != null ? String(currentFilters.scoreMin) : '',
  );
  const [scoreMaxStr, setScoreMaxStr] = useState<string>(
    currentFilters.scoreMax != null ? String(currentFilters.scoreMax) : '',
  );

  // Theme colors
  const bgColor = colors.card;
  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const chipBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const chipActiveBg = colors.primary;

  // Fetch members when modal opens
  useEffect(() => {
    if (visible && showOwnerFilter && members.length === 0) {
      fetchMembers();
    }
  }, [visible, showOwnerFilter]);

  // Fetch lead sources when modal opens
  useEffect(() => {
    if (visible && leadSources.length === LEAD_SOURCES.length) {
      fetchLeadSources();
    }
  }, [visible]);

  const fetchLeadSources = async () => {
    setLoadingSources(true);
    try {
      const response = await getLeadSources(accessToken);
      if (response.success && response.data?.labels) {
        setLeadSources(response.data.labels);
      }
    } catch (error) {
      console.error('Failed to fetch lead sources:', error);
      // Keep fallback LEAD_SOURCES on error
    }
    setLoadingSources(false);
  };

  // Reset filters when modal opens
  useEffect(() => {
    if (visible) {
      setFilters(currentFilters);
      setScoreMinStr(currentFilters.scoreMin != null ? String(currentFilters.scoreMin) : '');
      setScoreMaxStr(currentFilters.scoreMax != null ? String(currentFilters.scoreMax) : '');
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

  // Coerce score input strings to clamped numbers; return undefined for empty / invalid.
  const parseScore = (s: string): number | undefined => {
    if (!s.trim()) return undefined;
    const n = Number(s);
    if (Number.isNaN(n)) return undefined;
    return Math.min(100, Math.max(0, Math.round(n)));
  };

  const handleApply = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    if (filters.createdFrom) cleanedFilters.createdFrom = filters.createdFrom;
    if (filters.createdTo) cleanedFilters.createdTo = filters.createdTo;
    if (filters.updatedFrom) cleanedFilters.updatedFrom = filters.updatedFrom;
    if (filters.updatedTo) cleanedFilters.updatedTo = filters.updatedTo;

    const sMin = parseScore(scoreMinStr);
    const sMax = parseScore(scoreMaxStr);
    if (sMin !== undefined) cleanedFilters.scoreMin = sMin;
    if (sMax !== undefined) cleanedFilters.scoreMax = sMax;
    // If user inverted the range, swap so the server gets a sane window.
    if (
      cleanedFilters.scoreMin !== undefined &&
      cleanedFilters.scoreMax !== undefined &&
      cleanedFilters.scoreMin > cleanedFilters.scoreMax
    ) {
      const t = cleanedFilters.scoreMin;
      cleanedFilters.scoreMin = cleanedFilters.scoreMax;
      cleanedFilters.scoreMax = t;
    }

    onApply(cleanedFilters);
    onClose();
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters({});
    setScoreMinStr('');
    setScoreMaxStr('');
  };

  // Count active filters — includes date and score range
  const activeFilterCount =
    (filters.sources?.length || 0) +
    (filters.stageIds?.length || 0) +
    (filters.ownerMembershipIds?.length || 0) +
    (filters.createdFrom ? 1 : 0) +
    (filters.createdTo ? 1 : 0) +
    (filters.updatedFrom ? 1 : 0) +
    (filters.updatedTo ? 1 : 0) +
    (parseScore(scoreMinStr) !== undefined ? 1 : 0) +
    (parseScore(scoreMaxStr) !== undefined ? 1 : 0);

  const openDatePicker = (field: DateField) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const existing = filters[field];
    setTempPickerDate(existing ? new Date(existing) : new Date());
    setDatePickerField(field);
  };

  const formatDate = (iso?: string): string => {
    if (!iso) return 'Pick a date';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const clearDate = (field: DateField) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters((prev) => ({ ...prev, [field]: undefined }));
  };

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
              {loadingSources ? (
                <ActivityIndicator size="small" color={Colors[resolvedTheme].primary} style={styles.loader} />
              ) : (
                <View style={styles.chipContainer}>
                  {leadSources.map((source) => {
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
              )}
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

            {/* Score Range Filter */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Score range</Text>
                {(parseScore(scoreMinStr) !== undefined || parseScore(scoreMaxStr) !== undefined) && (
                  <Text style={[styles.selectedCount, { color: chipActiveBg }]}>
                    {parseScore(scoreMinStr) ?? 0}–{parseScore(scoreMaxStr) ?? 100}
                  </Text>
                )}
              </View>
              <View style={styles.scoreRow}>
                <View style={[styles.scoreInputWrap, { backgroundColor: chipBg, borderColor }]}>
                  <Text style={[styles.scoreInputLabel, { color: subtitleColor }]}>Min</Text>
                  <TextInput
                    style={[styles.scoreInput, { color: textColor }]}
                    value={scoreMinStr}
                    onChangeText={setScoreMinStr}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={subtitleColor}
                    maxLength={3}
                  />
                </View>
                <Text style={[styles.scoreDash, { color: subtitleColor }]}>–</Text>
                <View style={[styles.scoreInputWrap, { backgroundColor: chipBg, borderColor }]}>
                  <Text style={[styles.scoreInputLabel, { color: subtitleColor }]}>Max</Text>
                  <TextInput
                    style={[styles.scoreInput, { color: textColor }]}
                    value={scoreMaxStr}
                    onChangeText={setScoreMaxStr}
                    keyboardType="number-pad"
                    placeholder="100"
                    placeholderTextColor={subtitleColor}
                    maxLength={3}
                  />
                </View>
              </View>
            </View>

            {/* Created Date Range */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Created</Text>
                {(filters.createdFrom || filters.createdTo) && (
                  <Text style={[styles.selectedCount, { color: chipActiveBg }]}>
                    {(filters.createdFrom ? 1 : 0) + (filters.createdTo ? 1 : 0)} active
                  </Text>
                )}
              </View>
              <View style={styles.dateRow}>
                <DateButton
                  label="From"
                  value={filters.createdFrom}
                  formatDate={formatDate}
                  textColor={textColor}
                  subtitleColor={subtitleColor}
                  chipBg={chipBg}
                  borderColor={borderColor}
                  onPress={() => openDatePicker('createdFrom')}
                  onClear={() => clearDate('createdFrom')}
                />
                <DateButton
                  label="To"
                  value={filters.createdTo}
                  formatDate={formatDate}
                  textColor={textColor}
                  subtitleColor={subtitleColor}
                  chipBg={chipBg}
                  borderColor={borderColor}
                  onPress={() => openDatePicker('createdTo')}
                  onClear={() => clearDate('createdTo')}
                />
              </View>
            </View>

            {/* Updated Date Range */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Last updated</Text>
                {(filters.updatedFrom || filters.updatedTo) && (
                  <Text style={[styles.selectedCount, { color: chipActiveBg }]}>
                    {(filters.updatedFrom ? 1 : 0) + (filters.updatedTo ? 1 : 0)} active
                  </Text>
                )}
              </View>
              <View style={styles.dateRow}>
                <DateButton
                  label="From"
                  value={filters.updatedFrom}
                  formatDate={formatDate}
                  textColor={textColor}
                  subtitleColor={subtitleColor}
                  chipBg={chipBg}
                  borderColor={borderColor}
                  onPress={() => openDatePicker('updatedFrom')}
                  onClear={() => clearDate('updatedFrom')}
                />
                <DateButton
                  label="To"
                  value={filters.updatedTo}
                  formatDate={formatDate}
                  textColor={textColor}
                  subtitleColor={subtitleColor}
                  chipBg={chipBg}
                  borderColor={borderColor}
                  onPress={() => openDatePicker('updatedTo')}
                  onClear={() => clearDate('updatedTo')}
                />
              </View>
            </View>
          </ScrollView>

          {/* Date Picker — single picker instance reused for all four date fields */}
          {datePickerField && (
            <DateTimePicker
              value={tempPickerDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                if (Platform.OS === 'android') {
                  // Android closes the picker automatically; commit on 'set'.
                  if (event.type === 'set' && selectedDate) {
                    setFilters((prev) => ({
                      ...prev,
                      [datePickerField]: selectedDate.toISOString().split('T')[0],
                    }));
                  }
                  setDatePickerField(null);
                } else if (selectedDate) {
                  // iOS spinner updates live; commit on each change.
                  setTempPickerDate(selectedDate);
                  setFilters((prev) => ({
                    ...prev,
                    [datePickerField]: selectedDate.toISOString().split('T')[0],
                  }));
                }
              }}
            />
          )}
          {Platform.OS === 'ios' && datePickerField && (
            <View style={[styles.iosPickerActions, { borderTopColor: borderColor }]}>
              <TouchableOpacity onPress={() => setDatePickerField(null)}>
                <Text style={[styles.iosPickerDone, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: borderColor }]}>
            <TouchableOpacity
              style={[styles.clearButton, { borderColor }]}
              onPress={handleClear}
            >
              <Text style={[styles.clearButtonText, { color: textColor }]}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: colors.primary }]}
              onPress={handleApply}
            >
              <Text style={[styles.applyButtonText, { color: colors.primaryForeground }]}>
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
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  /* Score range */
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreInputWrap: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  scoreInputLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreInput: {
    fontSize: 17,
    fontWeight: '600',
    paddingVertical: 2,
  },
  scoreDash: {
    fontSize: 18,
    fontWeight: '600',
  },
  /* Date range */
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  dateButtonInner: { flex: 1 },
  dateButtonLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateButtonValue: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  iosPickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  iosPickerDone: {
    fontSize: 16,
    fontWeight: '600',
  },
});
