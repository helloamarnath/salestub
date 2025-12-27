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
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { LEAD_SOURCES, SOURCE_COLORS } from '@/types/lead';
import { getLeadSources } from '@/lib/api/leads';
import { getPipelines, type Pipeline } from '@/lib/api/pipelines';

// Export filter types
export type ExportDataType = 'leads' | 'contacts' | 'deals' | 'activities' | 'products';

export interface ExportFilters {
  // Date range (for leads, contacts, deals, activities)
  dateFrom?: string;
  dateTo?: string;

  // Leads specific
  sources?: string[];
  stageIds?: string[];

  // Contacts specific
  status?: 'active' | 'inactive';

  // Deals specific
  dealStage?: string;
  dealStatus?: 'OPEN' | 'WON' | 'LOST';

  // Activities specific
  activityType?: string;
  activityStatus?: string;

  // Products specific
  category?: string;
  isActive?: boolean;
}

interface ExportFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: ExportFilters) => void;
  dataType: ExportDataType;
}

// Activity types and statuses
const ACTIVITY_TYPES = ['CALL', 'EMAIL', 'MEETING', 'TASK', 'NOTE'];
const ACTIVITY_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  CALL: '#10b981',
  EMAIL: '#3b82f6',
  MEETING: '#8b5cf6',
  TASK: '#f59e0b',
  NOTE: '#6b7280',
};

const ACTIVITY_STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  IN_PROGRESS: '#3b82f6',
  COMPLETED: '#10b981',
  CANCELLED: '#ef4444',
};

// Deal statuses
const DEAL_STATUSES = ['OPEN', 'WON', 'LOST'];
const DEAL_STATUS_COLORS: Record<string, string> = {
  OPEN: '#3b82f6',
  WON: '#10b981',
  LOST: '#ef4444',
};

export function ExportFilterModal({
  visible,
  onClose,
  onApply,
  dataType,
}: ExportFilterModalProps) {
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [filters, setFilters] = useState<ExportFilters>({});

  // Date picker state
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  // Temp date values for iOS picker (confirm on Done)
  const [tempFromDate, setTempFromDate] = useState<Date>(new Date());
  const [tempToDate, setTempToDate] = useState<Date>(new Date());

  // Dynamic data
  const [leadSources, setLeadSources] = useState<string[]>([...LEAD_SOURCES]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loadingPipelines, setLoadingPipelines] = useState(false);

  // Theme colors
  const bgColor = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const chipBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const chipActiveBg = '#3b82f6';

  // Reset filters when modal opens or data type changes
  useEffect(() => {
    if (visible) {
      setFilters({});
    }
  }, [visible, dataType]);

  // Fetch lead sources for leads export
  useEffect(() => {
    if (visible && dataType === 'leads') {
      fetchLeadSources();
      fetchPipelines();
    }
  }, [visible, dataType]);

  // Fetch pipelines for deals export
  useEffect(() => {
    if (visible && dataType === 'deals') {
      fetchPipelines();
    }
  }, [visible, dataType]);

  const fetchLeadSources = async () => {
    setLoadingSources(true);
    try {
      const response = await getLeadSources(accessToken);
      if (response.success && response.data?.labels) {
        setLeadSources(response.data.labels);
      }
    } catch (error) {
      console.error('Failed to fetch lead sources:', error);
    }
    setLoadingSources(false);
  };

  const fetchPipelines = async () => {
    setLoadingPipelines(true);
    try {
      const response = await getPipelines(accessToken);
      if (response.success && response.data) {
        setPipelines(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch pipelines:', error);
    }
    setLoadingPipelines(false);
  };

  // Get pipeline stages for leads/deals
  const getPipelineStages = () => {
    const pipeline = pipelines.find(p =>
      dataType === 'leads' ? p.type === 'LEAD' : p.type === 'DEAL'
    );
    return pipeline?.stages || [];
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

  // Format date for display
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Handle date changes
  const handleFromDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      // Android: Close picker immediately, apply if 'set'
      setShowFromDatePicker(false);
      if (event.type === 'set' && selectedDate) {
        setFilters({
          ...filters,
          dateFrom: selectedDate.toISOString().split('T')[0],
        });
      }
    } else {
      // iOS: Just update temp value, wait for Done button
      if (selectedDate) {
        setTempFromDate(selectedDate);
      }
    }
  };

  const handleToDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      // Android: Close picker immediately, apply if 'set'
      setShowToDatePicker(false);
      if (event.type === 'set' && selectedDate) {
        setFilters({
          ...filters,
          dateTo: selectedDate.toISOString().split('T')[0],
        });
      }
    } else {
      // iOS: Just update temp value, wait for Done button
      if (selectedDate) {
        setTempToDate(selectedDate);
      }
    }
  };

  // iOS Done button handlers
  const handleFromDateDone = () => {
    setFilters({
      ...filters,
      dateFrom: tempFromDate.toISOString().split('T')[0],
    });
    setShowFromDatePicker(false);
  };

  const handleToDateDone = () => {
    setFilters({
      ...filters,
      dateTo: tempToDate.toISOString().split('T')[0],
    });
    setShowToDatePicker(false);
  };

  // Open date picker with current value
  const openFromDatePicker = () => {
    setTempFromDate(filters.dateFrom ? new Date(filters.dateFrom) : new Date());
    setShowFromDatePicker(true);
  };

  const openToDatePicker = () => {
    setTempToDate(filters.dateTo ? new Date(filters.dateTo) : new Date());
    setShowToDatePicker(true);
  };

  const clearDateFilter = (field: 'from' | 'to') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (field === 'from') {
      setFilters({ ...filters, dateFrom: undefined });
    } else {
      setFilters({ ...filters, dateTo: undefined });
    }
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

  // Single select for contact status
  const toggleContactStatus = (status: 'active' | 'inactive') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters(prev => ({
      ...prev,
      status: prev.status === status ? undefined : status,
    }));
  };

  // Single select for deal stage
  const toggleDealStage = (stageId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters(prev => ({
      ...prev,
      dealStage: prev.dealStage === stageId ? undefined : stageId,
    }));
  };

  // Single select for deal status
  const toggleDealStatus = (status: 'OPEN' | 'WON' | 'LOST') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters(prev => ({
      ...prev,
      dealStatus: prev.dealStatus === status ? undefined : status,
    }));
  };

  // Single select for activity type
  const toggleActivityType = (type: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters(prev => ({
      ...prev,
      activityType: prev.activityType === type ? undefined : type,
    }));
  };

  // Single select for activity status
  const toggleActivityStatus = (status: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters(prev => ({
      ...prev,
      activityStatus: prev.activityStatus === status ? undefined : status,
    }));
  };

  // Toggle product active status
  const toggleProductActive = (active: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters(prev => ({
      ...prev,
      isActive: prev.isActive === active ? undefined : active,
    }));
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return Object.values(filters).some(v =>
      v !== undefined &&
      (Array.isArray(v) ? v.length > 0 : true)
    );
  };

  // Get title based on data type
  const getTitle = () => {
    const titles: Record<ExportDataType, string> = {
      leads: 'Export Leads',
      contacts: 'Export Contacts',
      deals: 'Export Deals',
      activities: 'Export Activities',
      products: 'Export Products',
    };
    return titles[dataType];
  };

  // Get date label based on data type
  const getDateLabel = () => {
    if (dataType === 'activities') return 'Due Date Range';
    return 'Created Date Range';
  };

  // Render date range filter (for leads, contacts, deals, activities)
  const renderDateRangeFilter = () => {
    if (dataType === 'products') return null;

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>{getDateLabel()}</Text>
        <View style={styles.dateRangeContainer}>
          <View style={styles.dateInputWrapper}>
            <Text style={[styles.rangeLabel, { color: subtitleColor }]}>From</Text>
            <TouchableOpacity
              style={[styles.dateInput, { backgroundColor: chipBg, borderColor }]}
              onPress={openFromDatePicker}
            >
              <Text style={[styles.dateInputText, { color: filters.dateFrom ? textColor : subtitleColor }]}>
                {filters.dateFrom ? formatDate(filters.dateFrom) : 'Select date'}
              </Text>
              {filters.dateFrom ? (
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
              style={[styles.dateInput, { backgroundColor: chipBg, borderColor }]}
              onPress={openToDatePicker}
            >
              <Text style={[styles.dateInputText, { color: filters.dateTo ? textColor : subtitleColor }]}>
                {filters.dateTo ? formatDate(filters.dateTo) : 'Select date'}
              </Text>
              {filters.dateTo ? (
                <TouchableOpacity onPress={() => clearDateFilter('to')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={18} color={subtitleColor} />
                </TouchableOpacity>
              ) : (
                <Ionicons name="calendar-outline" size={18} color={subtitleColor} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* iOS: Inline picker with Done button */}
        {Platform.OS === 'ios' && showFromDatePicker && (
          <View style={[styles.iosPickerContainer, { backgroundColor: chipBg, borderColor }]}>
            <View style={[styles.iosPickerHeader, { borderBottomColor: borderColor }]}>
              <TouchableOpacity onPress={() => setShowFromDatePicker(false)}>
                <Text style={[styles.iosPickerCancel, { color: subtitleColor }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.iosPickerTitle, { color: textColor }]}>From Date</Text>
              <TouchableOpacity onPress={handleFromDateDone}>
                <Text style={styles.iosPickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempFromDate}
              mode="date"
              display="spinner"
              onChange={handleFromDateChange}
              themeVariant={isDark ? 'dark' : 'light'}
              style={styles.iosPicker}
            />
          </View>
        )}

        {Platform.OS === 'ios' && showToDatePicker && (
          <View style={[styles.iosPickerContainer, { backgroundColor: chipBg, borderColor }]}>
            <View style={[styles.iosPickerHeader, { borderBottomColor: borderColor }]}>
              <TouchableOpacity onPress={() => setShowToDatePicker(false)}>
                <Text style={[styles.iosPickerCancel, { color: subtitleColor }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.iosPickerTitle, { color: textColor }]}>To Date</Text>
              <TouchableOpacity onPress={handleToDateDone}>
                <Text style={styles.iosPickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempToDate}
              mode="date"
              display="spinner"
              onChange={handleToDateChange}
              themeVariant={isDark ? 'dark' : 'light'}
              style={styles.iosPicker}
            />
          </View>
        )}

        {/* Android: Default dialog */}
        {Platform.OS === 'android' && showFromDatePicker && (
          <DateTimePicker
            value={tempFromDate}
            mode="date"
            display="default"
            onChange={handleFromDateChange}
          />
        )}
        {Platform.OS === 'android' && showToDatePicker && (
          <DateTimePicker
            value={tempToDate}
            mode="date"
            display="default"
            onChange={handleToDateChange}
          />
        )}
      </View>
    );
  };

  // Render leads-specific filters
  const renderLeadsFilters = () => {
    if (dataType !== 'leads') return null;
    const stages = getPipelineStages();

    return (
      <>
        {/* Source Filter */}
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
            <ActivityIndicator size="small" color={chipActiveBg} style={styles.loader} />
          ) : (
            <View style={styles.chipContainer}>
              {leadSources.map((source) => {
                const isActive = filters.sources?.includes(source) || false;
                const sourceColor = SOURCE_COLORS[source] || '#6b7280';
                return (
                  <TouchableOpacity
                    key={source}
                    style={[styles.chip, { backgroundColor: isActive ? sourceColor : chipBg }]}
                    onPress={() => toggleSource(source)}
                  >
                    {isActive && <Ionicons name="checkmark" size={14} color="white" />}
                    {!isActive && <View style={[styles.chipDot, { backgroundColor: sourceColor }]} />}
                    <Text style={[styles.chipText, { color: isActive ? 'white' : textColor }]}>
                      {source}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Stage Filter */}
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
            {loadingPipelines ? (
              <ActivityIndicator size="small" color={chipActiveBg} style={styles.loader} />
            ) : (
              <View style={styles.chipContainer}>
                {stages.map((stage) => {
                  const isActive = filters.stageIds?.includes(stage.id) || false;
                  const stageColor = stage.color || '#6b7280';
                  return (
                    <TouchableOpacity
                      key={stage.id}
                      style={[styles.chip, { backgroundColor: isActive ? stageColor : chipBg }]}
                      onPress={() => toggleStage(stage.id)}
                    >
                      {isActive && <Ionicons name="checkmark" size={14} color="white" />}
                      {!isActive && <View style={[styles.chipDot, { backgroundColor: stageColor }]} />}
                      <Text style={[styles.chipText, { color: isActive ? 'white' : textColor }]}>
                        {stage.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </>
    );
  };

  // Render contacts-specific filters
  const renderContactsFilters = () => {
    if (dataType !== 'contacts') return null;

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Status</Text>
        <View style={styles.chipContainer}>
          {(['active', 'inactive'] as const).map((status) => {
            const isActive = filters.status === status;
            const statusColor = status === 'active' ? '#10b981' : '#6b7280';
            return (
              <TouchableOpacity
                key={status}
                style={[styles.chip, { backgroundColor: isActive ? statusColor : chipBg }]}
                onPress={() => toggleContactStatus(status)}
              >
                {isActive && <Ionicons name="checkmark" size={14} color="white" />}
                {!isActive && <View style={[styles.chipDot, { backgroundColor: statusColor }]} />}
                <Text style={[styles.chipText, { color: isActive ? 'white' : textColor }]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // Render deals-specific filters
  const renderDealsFilters = () => {
    if (dataType !== 'deals') return null;
    const stages = getPipelineStages();

    return (
      <>
        {/* Stage Filter */}
        {stages.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Stage</Text>
            {loadingPipelines ? (
              <ActivityIndicator size="small" color={chipActiveBg} style={styles.loader} />
            ) : (
              <View style={styles.chipContainer}>
                {stages.map((stage) => {
                  const isActive = filters.dealStage === stage.id;
                  const stageColor = stage.color || '#6b7280';
                  return (
                    <TouchableOpacity
                      key={stage.id}
                      style={[styles.chip, { backgroundColor: isActive ? stageColor : chipBg }]}
                      onPress={() => toggleDealStage(stage.id)}
                    >
                      {isActive && <Ionicons name="checkmark" size={14} color="white" />}
                      {!isActive && <View style={[styles.chipDot, { backgroundColor: stageColor }]} />}
                      <Text style={[styles.chipText, { color: isActive ? 'white' : textColor }]}>
                        {stage.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Status Filter */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Status</Text>
          <View style={styles.chipContainer}>
            {DEAL_STATUSES.map((status) => {
              const isActive = filters.dealStatus === status;
              const statusColor = DEAL_STATUS_COLORS[status];
              return (
                <TouchableOpacity
                  key={status}
                  style={[styles.chip, { backgroundColor: isActive ? statusColor : chipBg }]}
                  onPress={() => toggleDealStatus(status as 'OPEN' | 'WON' | 'LOST')}
                >
                  {isActive && <Ionicons name="checkmark" size={14} color="white" />}
                  {!isActive && <View style={[styles.chipDot, { backgroundColor: statusColor }]} />}
                  <Text style={[styles.chipText, { color: isActive ? 'white' : textColor }]}>
                    {status}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </>
    );
  };

  // Render activities-specific filters
  const renderActivitiesFilters = () => {
    if (dataType !== 'activities') return null;

    return (
      <>
        {/* Type Filter */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Type</Text>
          <View style={styles.chipContainer}>
            {ACTIVITY_TYPES.map((type) => {
              const isActive = filters.activityType === type;
              const typeColor = ACTIVITY_TYPE_COLORS[type];
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, { backgroundColor: isActive ? typeColor : chipBg }]}
                  onPress={() => toggleActivityType(type)}
                >
                  {isActive && <Ionicons name="checkmark" size={14} color="white" />}
                  {!isActive && <View style={[styles.chipDot, { backgroundColor: typeColor }]} />}
                  <Text style={[styles.chipText, { color: isActive ? 'white' : textColor }]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Status Filter */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Status</Text>
          <View style={styles.chipContainer}>
            {ACTIVITY_STATUSES.map((status) => {
              const isActive = filters.activityStatus === status;
              const statusColor = ACTIVITY_STATUS_COLORS[status];
              return (
                <TouchableOpacity
                  key={status}
                  style={[styles.chip, { backgroundColor: isActive ? statusColor : chipBg }]}
                  onPress={() => toggleActivityStatus(status)}
                >
                  {isActive && <Ionicons name="checkmark" size={14} color="white" />}
                  {!isActive && <View style={[styles.chipDot, { backgroundColor: statusColor }]} />}
                  <Text style={[styles.chipText, { color: isActive ? 'white' : textColor }]}>
                    {status.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </>
    );
  };

  // Render products-specific filters
  const renderProductsFilters = () => {
    if (dataType !== 'products') return null;

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Active Status</Text>
        <View style={styles.chipContainer}>
          <TouchableOpacity
            style={[styles.chip, { backgroundColor: filters.isActive === true ? '#10b981' : chipBg }]}
            onPress={() => toggleProductActive(true)}
          >
            {filters.isActive === true && <Ionicons name="checkmark" size={14} color="white" />}
            {filters.isActive !== true && <View style={[styles.chipDot, { backgroundColor: '#10b981' }]} />}
            <Text style={[styles.chipText, { color: filters.isActive === true ? 'white' : textColor }]}>
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, { backgroundColor: filters.isActive === false ? '#6b7280' : chipBg }]}
            onPress={() => toggleProductActive(false)}
          >
            {filters.isActive === false && <Ionicons name="checkmark" size={14} color="white" />}
            {filters.isActive !== false && <View style={[styles.chipDot, { backgroundColor: '#6b7280' }]} />}
            <Text style={[styles.chipText, { color: filters.isActive === false ? 'white' : textColor }]}>
              Inactive
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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
            <Text style={[styles.title, { color: textColor }]}>{getTitle()}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={subtitleColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {renderDateRangeFilter()}
            {renderLeadsFilters()}
            {renderContactsFilters()}
            {renderDealsFilters()}
            {renderActivitiesFilters()}
            {renderProductsFilters()}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: borderColor }]}>
            <TouchableOpacity
              style={[styles.clearButton, { borderColor }]}
              onPress={handleClear}
              disabled={!hasActiveFilters()}
            >
              <Text style={[styles.clearButtonText, { color: hasActiveFilters() ? textColor : subtitleColor }]}>
                Clear All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
            >
              <Ionicons name="download-outline" size={18} color="white" style={{ marginRight: 6 }} />
              <Text style={styles.applyButtonText}>Export</Text>
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
    maxHeight: '85%',
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
    paddingTop: 8,
  },
  section: {
    marginTop: 20,
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
    marginBottom: 12,
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
  // Date range styles
  dateRangeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInputWrapper: {
    flex: 1,
  },
  rangeLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
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
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingBottom: 34,
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
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // iOS Date Picker styles
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
  iosPickerCancel: {
    fontSize: 16,
    fontWeight: '500',
  },
  iosPickerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  iosPickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  iosPicker: {
    height: 200,
  },
});
