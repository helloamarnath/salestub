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
  TextInput,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
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
  valueMin?: number;
  valueMax?: number;
  expectedCloseDateFrom?: string;
  expectedCloseDateTo?: string;
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

  // Value inputs as strings for TextInput
  const [valueMinInput, setValueMinInput] = useState(currentFilters.valueMin?.toString() || '');
  const [valueMaxInput, setValueMaxInput] = useState(currentFilters.valueMax?.toString() || '');

  // Date picker state
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

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
      setValueMinInput(currentFilters.valueMin?.toString() || '');
      setValueMaxInput(currentFilters.valueMax?.toString() || '');
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
    // Parse value inputs to numbers
    const finalFilters = {
      ...filters,
      valueMin: valueMinInput ? parseFloat(valueMinInput) : undefined,
      valueMax: valueMaxInput ? parseFloat(valueMaxInput) : undefined,
    };
    onApply(finalFilters);
    onClose();
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters({});
    setValueMinInput('');
    setValueMaxInput('');
  };

  // Format date for display
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Handle date changes
  const handleFromDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // Android closes automatically, iOS stays open until Done is pressed
    if (Platform.OS === 'android') {
      setShowFromDatePicker(false);
    }
    if (selectedDate) {
      setFilters({
        ...filters,
        expectedCloseDateFrom: selectedDate.toISOString().split('T')[0],
      });
    }
  };

  const handleToDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // Android closes automatically, iOS stays open until Done is pressed
    if (Platform.OS === 'android') {
      setShowToDatePicker(false);
    }
    if (selectedDate) {
      setFilters({
        ...filters,
        expectedCloseDateTo: selectedDate.toISOString().split('T')[0],
      });
    }
  };

  const clearDateFilter = (field: 'from' | 'to') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (field === 'from') {
      setFilters({ ...filters, expectedCloseDateFrom: undefined });
    } else {
      setFilters({ ...filters, expectedCloseDateTo: undefined });
    }
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

  const hasActiveFilters = Object.values(filters).some(Boolean) || valueMinInput || valueMaxInput;

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

          {/* Value Range Filter */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Deal Value Range</Text>
            <View style={styles.rangeInputContainer}>
              <View style={styles.rangeInputWrapper}>
                <Text style={[styles.rangeLabel, { color: subtitleColor }]}>Min</Text>
                <TextInput
                  style={[
                    styles.rangeInput,
                    {
                      backgroundColor: chipBg,
                      borderColor,
                      color: textColor,
                    },
                  ]}
                  value={valueMinInput}
                  onChangeText={setValueMinInput}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={subtitleColor}
                />
              </View>
              <Text style={[styles.rangeSeparator, { color: subtitleColor }]}>to</Text>
              <View style={styles.rangeInputWrapper}>
                <Text style={[styles.rangeLabel, { color: subtitleColor }]}>Max</Text>
                <TextInput
                  style={[
                    styles.rangeInput,
                    {
                      backgroundColor: chipBg,
                      borderColor,
                      color: textColor,
                    },
                  ]}
                  value={valueMaxInput}
                  onChangeText={setValueMaxInput}
                  keyboardType="numeric"
                  placeholder="Any"
                  placeholderTextColor={subtitleColor}
                />
              </View>
            </View>
          </View>

          {/* Expected Close Date Range Filter */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Expected Close Date</Text>
            <View style={styles.dateRangeContainer}>
              <View style={styles.dateInputWrapper}>
                <Text style={[styles.rangeLabel, { color: subtitleColor }]}>From</Text>
                <TouchableOpacity
                  style={[
                    styles.dateInput,
                    {
                      backgroundColor: chipBg,
                      borderColor,
                    },
                  ]}
                  onPress={() => setShowFromDatePicker(true)}
                >
                  <Text style={[styles.dateInputText, { color: filters.expectedCloseDateFrom ? textColor : subtitleColor }]}>
                    {filters.expectedCloseDateFrom ? formatDate(filters.expectedCloseDateFrom) : 'Select date'}
                  </Text>
                  {filters.expectedCloseDateFrom ? (
                    <TouchableOpacity onPress={() => clearDateFilter('from')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close-circle" size={18} color={subtitleColor} />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="calendar-outline" size={18} color={subtitleColor} />
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.dateInputWrapper}>
                <Text style={[styles.rangeLabel, { color: subtitleColor }]}>To</Text>
                <TouchableOpacity
                  style={[
                    styles.dateInput,
                    {
                      backgroundColor: chipBg,
                      borderColor,
                    },
                  ]}
                  onPress={() => setShowToDatePicker(true)}
                >
                  <Text style={[styles.dateInputText, { color: filters.expectedCloseDateTo ? textColor : subtitleColor }]}>
                    {filters.expectedCloseDateTo ? formatDate(filters.expectedCloseDateTo) : 'Select date'}
                  </Text>
                  {filters.expectedCloseDateTo ? (
                    <TouchableOpacity onPress={() => clearDateFilter('to')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close-circle" size={18} color={subtitleColor} />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="calendar-outline" size={18} color={subtitleColor} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Date Pickers - iOS: with Done button */}
            {showFromDatePicker && Platform.OS === 'ios' && (
              <View style={[styles.iosPickerContainer, { backgroundColor: chipBg, borderColor }]}>
                <View style={[styles.iosPickerHeader, { borderBottomColor: borderColor }]}>
                  <TouchableOpacity onPress={() => setShowFromDatePicker(false)}>
                    <Text style={[styles.iosPickerCancel, { color: subtitleColor }]}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={[styles.iosPickerTitle, { color: textColor }]}>From Date</Text>
                  <TouchableOpacity onPress={() => setShowFromDatePicker(false)}>
                    <Text style={styles.iosPickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={filters.expectedCloseDateFrom ? new Date(filters.expectedCloseDateFrom) : new Date()}
                  mode="date"
                  display="spinner"
                  onChange={handleFromDateChange}
                  themeVariant={isDark ? 'dark' : 'light'}
                  style={styles.iosPicker}
                />
              </View>
            )}
            {showFromDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={filters.expectedCloseDateFrom ? new Date(filters.expectedCloseDateFrom) : new Date()}
                mode="date"
                display="default"
                onChange={handleFromDateChange}
              />
            )}
            {showToDatePicker && Platform.OS === 'ios' && (
              <View style={[styles.iosPickerContainer, { backgroundColor: chipBg, borderColor }]}>
                <View style={[styles.iosPickerHeader, { borderBottomColor: borderColor }]}>
                  <TouchableOpacity onPress={() => setShowToDatePicker(false)}>
                    <Text style={[styles.iosPickerCancel, { color: subtitleColor }]}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={[styles.iosPickerTitle, { color: textColor }]}>To Date</Text>
                  <TouchableOpacity onPress={() => setShowToDatePicker(false)}>
                    <Text style={styles.iosPickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={filters.expectedCloseDateTo ? new Date(filters.expectedCloseDateTo) : new Date()}
                  mode="date"
                  display="spinner"
                  onChange={handleToDateChange}
                  themeVariant={isDark ? 'dark' : 'light'}
                  style={styles.iosPicker}
                />
              </View>
            )}
            {showToDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={filters.expectedCloseDateTo ? new Date(filters.expectedCloseDateTo) : new Date()}
                mode="date"
                display="default"
                onChange={handleToDateChange}
              />
            )}
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
  // Value range styles
  rangeInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  rangeInputWrapper: {
    flex: 1,
  },
  rangeLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  rangeInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  rangeSeparator: {
    fontSize: 14,
    fontWeight: '500',
    paddingBottom: 14,
  },
  // Date range styles
  dateRangeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInputWrapper: {
    flex: 1,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  dateInputText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  // iOS picker styles
  iosPickerContainer: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iosPickerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  iosPickerCancel: {
    fontSize: 16,
  },
  iosPickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  iosPicker: {
    height: 180,
  },
});
