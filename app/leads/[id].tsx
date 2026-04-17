import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  FlatList,
  RefreshControl,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { startLocationTracking, stopLocationTracking } from '@/lib/firebase/location-tracker';
import { StartVisitSheet } from '@/components/visits/StartVisitSheet';
import { ActiveVisitBanner } from '@/components/visits/ActiveVisitBanner';
import { VisitCard } from '@/components/visits/VisitCard';
import { VisitPhotoCapture } from '@/components/visits/VisitPhotoCapture';
import { getActiveVisit, startVisit, completeVisit, cancelVisit, getLeadVisits } from '@/lib/api/visits';
import type { Visit, VisitPurpose } from '@/types/visit';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { getLead, deleteLead, getLeadActivities, updateLead, getKanbanView, addLeadActivity, getLeadSources, getAllTags, getLeadTags, addLeadTags, removeLeadTags, createTag, getLeadDocuments, uploadLeadDocument, deleteLeadDocument, getLeadDocumentPreview, convertLead, qualifyLead, markLeadLost, getLeadProducts, addLeadProduct, removeLeadProduct, getLeadNotesEndpoint, addLeadNoteEndpoint, convertLeadToDeal } from '@/lib/api/leads';
import { getProducts, createProduct } from '@/lib/api/products';
import { getQuotes } from '@/lib/api/quotes';
import { getInvoices } from '@/lib/api/invoices';
import type { Product } from '@/types/product';
import type { Quote } from '@/types/quote';
import { QUOTE_STATUS_COLORS, QUOTE_STATUS_LABELS } from '@/types/quote';
import type { Invoice } from '@/types/invoice';
import { INVOICE_STATUS_COLORS, INVOICE_STATUS_LABELS } from '@/types/invoice';
import * as WebBrowser from 'expo-web-browser';
import { searchCompanies, createCompany } from '@/lib/api/companies';
import { getDealsByContact, createDeal, updateDeal, deleteDeal, searchDeals, advanceDealStage, closeDealWon, closeDealLost } from '@/lib/api/deals';
import type { Company, CreateCompanyDto } from '@/types/company';
import type { Deal, CreateDealDto, UpdateDealDto, DealStage } from '@/types/deal';
import { DEAL_STAGE_LABELS, DEAL_STAGE_COLORS, DEAL_STATUS_COLORS, DEAL_STATUS_LABELS, formatDealValue } from '@/types/deal';
import { getOrganizationMembers, getMemberDisplayName, type OrgMember } from '@/lib/api/organization';
import { LeadStatusBadge, ScoreIndicator, SourceBadge } from '@/components/leads/LeadStatusBadge';
import type { Lead, LeadActivity, KanbanStage, UpdateLeadDto, CreateActivityDto, LeadTag, LeadDocument, LeadProduct } from '@/types/lead';
import { LEAD_SOURCES as SOURCES } from '@/types/lead';
import { getContactFullName, getContactInitials, getAvatarColor } from '@/types/contact';
import { ACTIVITY_TYPE_COLORS, ACTIVITY_TYPE_ICONS } from '@/types/lead';

// Activity type definitions
type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'TASK' | 'NOTE';

interface ActivityTypeOption {
  type: ActivityType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const ACTIVITY_OPTIONS: ActivityTypeOption[] = [
  { type: 'CALL', label: 'Log Call', icon: 'call-outline', color: '#22c55e' },
  { type: 'EMAIL', label: 'Log Email', icon: 'mail-outline', color: Colors.light.primary },
  { type: 'MEETING', label: 'Schedule Meeting', icon: 'calendar-outline', color: '#8b5cf6' },
  { type: 'TASK', label: 'Add Task', icon: 'checkbox-outline', color: '#f59e0b' },
  { type: 'NOTE', label: 'Add Note', icon: 'document-text-outline', color: '#6b7280' },
];

// Reminder options
interface ReminderOption {
  value: string;
  label: string;
  minutes: number | null;
}

const REMINDER_OPTIONS: ReminderOption[] = [
  { value: 'none', label: 'No reminder', minutes: null },
  { value: 'at_time', label: 'At time of event', minutes: 0 },
  { value: '5min', label: '5 minutes before', minutes: 5 },
  { value: '10min', label: '10 minutes before', minutes: 10 },
  { value: '15min', label: '15 minutes before', minutes: 15 },
  { value: '30min', label: '30 minutes before', minutes: 30 },
  { value: '1hour', label: '1 hour before', minutes: 60 },
  { value: '1day', label: '1 day before', minutes: 1440 },
];

// Tab component
function Tab({
  label,
  active,
  onPress,
  isDark,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const textColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const activeTextColor = colors.foreground;

  return (
    <TouchableOpacity
      style={[styles.tab, active && styles.tabActive]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <Text style={[styles.tabText, { color: active ? activeTextColor : textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Collapsible Section Header
function SectionHeader({
  title,
  icon,
  collapsed,
  onToggle,
  isDark,
  count,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  collapsed: boolean;
  onToggle: () => void;
  isDark: boolean;
  count?: number;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const textColor = colors.foreground;
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle();
      }}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: borderColor,
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name={icon} size={18} color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'} />
        <Text style={{ fontSize: 14, fontWeight: '600', color: textColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Text>
        {count !== undefined && count > 0 && (
          <View style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1, minWidth: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: 'white' }}>{count}</Text>
          </View>
        )}
      </View>
      <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-down'} size={18} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
    </TouchableOpacity>
  );
}

// Activity item component
function ActivityItem({ activity, isDark }: { activity: LeadActivity; isDark: boolean }) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const color = ACTIVITY_TYPE_COLORS[activity.type] || '#6b7280';
  const iconName = (ACTIVITY_TYPE_ICONS[activity.type] || 'ellipse-outline') as keyof typeof Ionicons.glyphMap;
  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const mutedColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
  const metaBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';

  const meta = activity as any;
  const activityType = meta.metadata?.activityType;
  const isFieldChange = activityType === 'field_update' || activityType === 'stage_change' || activityType === 'owner_change' || activityType === 'lead_created';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Choose icon for system activities
  let displayIcon = iconName;
  let displayColor: string = color;
  if (activityType === 'stage_change') {
    const colors = Colors[isDark ? 'dark' : 'light'];
    displayIcon = 'swap-horizontal-outline';
    displayColor = '#8b5cf6';
  } else if (activityType === 'owner_change') {
    displayIcon = 'person-outline';
    displayColor = '#f59e0b';
  } else if (activityType === 'lead_created') {
    displayIcon = 'add-circle-outline';
    displayColor = '#22c55e';
  } else if (activityType === 'field_update') {
    displayIcon = 'create-outline';
    displayColor = '#06b6d4';
  }

  return (
    <View style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: `${displayColor}20` }]}>
        <Ionicons name={displayIcon as any} size={16} color={displayColor} />
      </View>
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Text style={[styles.activityTitle, { color: textColor }]} numberOfLines={2}>{activity.title}</Text>
          {!isFieldChange && (
            activity.status === 'COMPLETED' ? (
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
            ) : (
              <Ionicons name="ellipse-outline" size={16} color="#f59e0b" />
            )
          )}
        </View>
        {activity.description && (
          <Text style={[styles.activityDescription, { color: subtitleColor }]} numberOfLines={2}>
            {activity.description}
          </Text>
        )}
        {/* Show metadata for field changes */}
        {isFieldChange && meta.metadata?.oldDisplayValue && meta.metadata?.newDisplayValue && (
          <View style={[styles.activityMetaBox, { backgroundColor: metaBg }]}>
            <Text style={[{ fontSize: 12, color: subtitleColor }]}>
              {meta.metadata.fieldLabel || meta.metadata.field || 'Field'}:{' '}
              <Text style={{ textDecorationLine: 'line-through', color: mutedColor }}>{meta.metadata.oldDisplayValue}</Text>
              {' → '}
              <Text style={{ fontWeight: '600', color: textColor }}>{meta.metadata.newDisplayValue}</Text>
            </Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <Text style={[styles.activityDate, { color: mutedColor }]}>{formatDate(activity.createdAt)}</Text>
          {meta.metadata?.performedByName && (
            <Text style={[{ fontSize: 11, color: mutedColor }]}>· {meta.metadata.performedByName}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

// Picker Modal Component
function PickerModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  isDark,
}: {
  visible: boolean;
  title: string;
  options: { label: string; value: string; color?: string }[];
  selectedValue: string | undefined;
  onSelect: (value: string | undefined) => void;
  onClose: () => void;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const bgColor = colors.card;
  const textColor = colors.foreground;
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const overlayColor = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: overlayColor }]} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: bgColor }]}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={textColor} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  { borderBottomColor: borderColor },
                  selectedValue === option.value && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelect(option.value);
                  onClose();
                }}
              >
                {option.color && (
                  <View style={[styles.optionColorDot, { backgroundColor: option.color }]} />
                )}
                <Text style={[styles.modalOptionText, { color: textColor }]}>{option.label}</Text>
                {selectedValue === option.value && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// Value Input Modal Component
function ValueInputModal({
  visible,
  title,
  value,
  onSave,
  onClose,
  isDark,
  keyboardType = 'numeric',
  placeholder,
}: {
  visible: boolean;
  title: string;
  value: string;
  onSave: (value: string) => void;
  onClose: () => void;
  isDark: boolean;
  keyboardType?: 'numeric' | 'decimal-pad';
  placeholder?: string;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [inputValue, setInputValue] = useState(value);
  const bgColor = colors.card;
  const textColor = colors.foreground;
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const overlayColor = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)';
  const placeholderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';

  useEffect(() => {
    setInputValue(value);
  }, [value, visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modalContent, { backgroundColor: bgColor }]}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={textColor} />
            </TouchableOpacity>
          </View>
          <View style={styles.inputModalBody}>
            <TextInput
              style={[styles.modalInput, { backgroundColor: inputBg, color: textColor, borderColor }]}
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType={keyboardType}
              placeholder={placeholder}
              placeholderTextColor={placeholderColor}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.modalSaveButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onSave(inputValue);
                onClose();
              }}
            >
              <Text style={styles.modalSaveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Follow-up Action Sheet
function FollowUpActionSheet({
  visible,
  onSelect,
  onClose,
  isDark,
}: {
  visible: boolean;
  onSelect: (type: ActivityType) => void;
  onClose: () => void;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const bgColor = colors.card;
  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const overlayColor = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.modalOverlay, { backgroundColor: overlayColor }]} onPress={onClose}>
        <Pressable style={[styles.actionSheetContent, { backgroundColor: bgColor }]}>
          <View style={[styles.actionSheetHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }]} />
          <Text style={[styles.actionSheetTitle, { color: textColor }]}>Add Follow-up</Text>
          <Text style={[styles.actionSheetSubtitle, { color: subtitleColor }]}>
            Choose an activity type
          </Text>
          <View style={styles.actionSheetOptions}>
            {ACTIVITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.type}
                style={[styles.actionSheetOption, { borderBottomColor: borderColor }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelect(option.type);
                }}
              >
                <View style={[styles.actionSheetIconContainer, { backgroundColor: `${option.color}15` }]}>
                  <Ionicons name={option.icon} size={22} color={option.color} />
                </View>
                <Text style={[styles.actionSheetOptionText, { color: textColor }]}>{option.label}</Text>
                <Ionicons name="chevron-forward" size={20} color={subtitleColor} />
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.actionSheetCancelButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
            onPress={onClose}
          >
            <Text style={[styles.actionSheetCancelText, { color: textColor }]}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Activity Form Modal
function ActivityFormModal({
  visible,
  activityType,
  onSave,
  onClose,
  isDark,
  saving,
}: {
  visible: boolean;
  activityType: ActivityType | null;
  onSave: (data: CreateActivityDto & { reminder?: string }) => void;
  onClose: () => void;
  isDark: boolean;
  saving: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [duration, setDuration] = useState('30');
  const [reminder, setReminder] = useState('none');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [formErrors, setFormErrors] = useState<{ title?: string }>({});

  const bgColor = colors.card;
  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const overlayColor = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)';
  const placeholderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';

  // Reset form when opening
  useEffect(() => {
    if (visible) {
      setTitle('');
      setDescription('');
      setDueDate(new Date());
      setDuration('30');
      setReminder('none');
      setFormErrors({});
    }
  }, [visible]);

  const activityOption = ACTIVITY_OPTIONS.find(o => o.type === activityType);
  const needsScheduling = activityType === 'MEETING' || activityType === 'TASK';
  const needsDuration = activityType === 'CALL' || activityType === 'MEETING';
  const selectedReminder = REMINDER_OPTIONS.find(r => r.value === reminder);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSubmit = () => {
    // Validate required fields
    const errors: { title?: string } = {};
    if (!title.trim()) {
      errors.title = 'Title is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    const data: CreateActivityDto & { reminder?: string } = {
      type: activityType!,
      title: title.trim(),
      description: description.trim() || undefined,
      status: activityType === 'NOTE' ? 'COMPLETED' : 'PENDING',
    };

    if (needsScheduling) {
      data.dueDate = dueDate.toISOString();
    }

    if (needsDuration && duration) {
      data.duration = parseInt(duration, 10);
    }

    if (reminder !== 'none') {
      data.reminder = reminder;
    }

    onSave(data);
  };

  if (!activityType) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]} onPress={onClose} />
        <View style={[styles.activityFormContent, { backgroundColor: bgColor }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <View style={styles.activityFormHeaderLeft}>
              <View style={[styles.activityFormIcon, { backgroundColor: `${activityOption?.color}15` }]}>
                <Ionicons name={activityOption?.icon || 'add'} size={20} color={activityOption?.color} />
              </View>
              <Text style={[styles.modalTitle, { color: textColor }]}>{activityOption?.label}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={textColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.activityFormBody} showsVerticalScrollIndicator={false}>
            {/* Title */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: subtitleColor }]}>
                Title <Text style={{ color: '#ef4444' }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  { backgroundColor: inputBg, color: textColor, borderColor: formErrors.title ? '#ef4444' : borderColor }
                ]}
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  if (formErrors.title) setFormErrors({});
                }}
                placeholder={`Enter ${activityOption?.label.toLowerCase()} title...`}
                placeholderTextColor={placeholderColor}
              />
              {formErrors.title && (
                <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{formErrors.title}</Text>
              )}
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: subtitleColor }]}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea, { backgroundColor: inputBg, color: textColor, borderColor }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Add notes or details..."
                placeholderTextColor={placeholderColor}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Date & Time for scheduled activities */}
            {needsScheduling && (
              <>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: subtitleColor }]}>Date</Text>
                  <TouchableOpacity
                    style={[styles.formSelect, { backgroundColor: inputBg, borderColor }]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={subtitleColor} />
                    <Text style={[styles.formSelectText, { color: textColor }]}>{formatDate(dueDate)}</Text>
                    <Ionicons name="chevron-down" size={16} color={subtitleColor} />
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: subtitleColor }]}>Time</Text>
                  <TouchableOpacity
                    style={[styles.formSelect, { backgroundColor: inputBg, borderColor }]}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={20} color={subtitleColor} />
                    <Text style={[styles.formSelectText, { color: textColor }]}>{formatTime(dueDate)}</Text>
                    <Ionicons name="chevron-down" size={16} color={subtitleColor} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Duration for calls/meetings */}
            {needsDuration && (
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: subtitleColor }]}>Duration (minutes)</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: inputBg, color: textColor, borderColor }]}
                  value={duration}
                  onChangeText={(text) => {
                    // Only allow positive numbers (digits only)
                    const filtered = text.replace(/[^0-9]/g, '');
                    // Limit to reasonable max (480 = 8 hours)
                    if (filtered === '' || parseInt(filtered, 10) <= 480) {
                      setDuration(filtered);
                    }
                  }}
                  placeholder="30"
                  placeholderTextColor={placeholderColor}
                  keyboardType="number-pad"
                />
              </View>
            )}

            {/* Reminder - for all activity types */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: subtitleColor }]}>Reminder</Text>
              <TouchableOpacity
                style={[styles.formSelect, { backgroundColor: inputBg, borderColor }]}
                onPress={() => setShowReminderPicker(true)}
              >
                <Ionicons name="notifications-outline" size={20} color={subtitleColor} />
                <Text style={[styles.formSelectText, { color: textColor }]}>{selectedReminder?.label}</Text>
                <Ionicons name="chevron-down" size={16} color={subtitleColor} />
              </TouchableOpacity>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.activityFormFooter}>
            <TouchableOpacity
              style={[styles.formSubmitButton, { backgroundColor: colors.primary }, saving && styles.formSubmitButtonDisabled]}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.formSubmitButtonText}>
                  {activityType === 'NOTE' ? 'Add Note' : activityType === 'CALL' || activityType === 'EMAIL' ? 'Log Activity' : 'Schedule'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Picker - iOS: Modal with spinner, Android: Native dialog */}
        {showDatePicker && Platform.OS === 'ios' && (
          <Modal transparent animationType="fade">
            <Pressable style={[styles.datePickerOverlay, { backgroundColor: overlayColor }]} onPress={() => setShowDatePicker(false)}>
              <View style={[styles.datePickerContainer, { backgroundColor: bgColor }]}>
                <DateTimePicker
                  value={dueDate}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date()}
                  onChange={(event, date) => {
                    if (date) setDueDate(date);
                  }}
                  textColor={textColor}
                />
                <TouchableOpacity
                  style={[styles.datePickerDone, { backgroundColor: colors.primary }]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Modal>
        )}
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={dueDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (event.type === 'set' && date) {
                setDueDate(date);
              }
            }}
          />
        )}

        {/* Time Picker - iOS: Modal with spinner, Android: Native dialog */}
        {showTimePicker && Platform.OS === 'ios' && (
          <Modal transparent animationType="fade">
            <Pressable style={[styles.datePickerOverlay, { backgroundColor: overlayColor }]} onPress={() => setShowTimePicker(false)}>
              <View style={[styles.datePickerContainer, { backgroundColor: bgColor }]}>
                <DateTimePicker
                  value={dueDate}
                  mode="time"
                  display="spinner"
                  onChange={(event, date) => {
                    if (date) setDueDate(date);
                  }}
                  textColor={textColor}
                />
                <TouchableOpacity
                  style={[styles.datePickerDone, { backgroundColor: colors.primary }]}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Modal>
        )}
        {showTimePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={dueDate}
            mode="time"
            display="default"
            onChange={(event, date) => {
              setShowTimePicker(false);
              if (event.type === 'set' && date) {
                setDueDate(date);
              }
            }}
          />
        )}

        {/* Reminder Picker */}
        {showReminderPicker && (
          <Modal transparent animationType="fade">
            <Pressable style={[styles.datePickerOverlay, { backgroundColor: overlayColor }]} onPress={() => setShowReminderPicker(false)}>
              <View style={[styles.reminderPickerContainer, { backgroundColor: bgColor }]}>
                <Text style={[styles.reminderPickerTitle, { color: textColor }]}>Reminder</Text>
                {REMINDER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.reminderOption, { borderBottomColor: borderColor }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setReminder(option.value);
                      setShowReminderPicker(false);
                    }}
                  >
                    <Text style={[styles.reminderOptionText, { color: textColor }]}>{option.label}</Text>
                    {reminder === option.value && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </Pressable>
          </Modal>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Editable Status Item
function EditableStatusItem({
  label,
  children,
  onPress,
  isDark,
}: {
  label: string;
  children: React.ReactNode;
  onPress: () => void;
  isDark: boolean;
}) {
  const labelColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const bgColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const chevronColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';

  return (
    <TouchableOpacity
      style={[styles.statusItem, { backgroundColor: bgColor }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.7}
    >
      <View style={styles.statusItemHeader}>
        <Text style={[styles.statusLabel, { color: labelColor }]}>{label}</Text>
        <Ionicons name="chevron-forward" size={16} color={chevronColor} />
      </View>
      {children}
    </TouchableOpacity>
  );
}

// Details tab content
function DetailsTab({
  lead,
  isDark,
  stages,
  members,
  leadSources,
  onUpdateField,
  updating,
}: {
  lead: Lead;
  isDark: boolean;
  stages: KanbanStage[];
  members: OrgMember[];
  leadSources: string[];
  onUpdateField: (field: keyof UpdateLeadDto, value: unknown) => void;
  updating: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [showStagePicker, setShowStagePicker] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showValueInput, setShowValueInput] = useState(false);
  const [showScoreInput, setShowScoreInput] = useState(false);
  const [showOwnerPicker, setShowOwnerPicker] = useState(false);
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [showDescriptionInput, setShowDescriptionInput] = useState(false);

  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const sectionTitleColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const labelColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  const getScoreBadgeColor = (score: number): string => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return colors.primary;
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  // Inquiry type for IndiaMART leads
  const getInquiryType = (): { label: string; color: string } | null => {
    if (lead.source !== 'INDIAMART' || !lead.metadata) return null;
    const sender = (lead.metadata as any)?.originalSender;
    if (!sender) return null;
    if (typeof sender === 'string' && sender.includes('buyleads@')) {
      return { label: 'BuyLead', color: '#f59e0b' };
    }
    return { label: 'Direct Inquiry', color: '#22c55e' };
  };

  const inquiryType = getInquiryType();

  const contactName = lead.contact ? getContactFullName(lead.contact) : null;
  const initials = lead.contact
    ? getContactInitials(lead.contact)
    : lead.title.substring(0, 2).toUpperCase();
  const avatarColor = getAvatarColor(contactName || lead.title);

  const formatValue = (value?: number): string => {
    if (!value) return '-';
    const symbol = lead.currency?.symbol || '₹';
    return `${symbol}${value.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const stageOptions = stages.map((s) => ({
    label: s.name,
    value: s.id,
    color: s.color,
  }));

  const sourceOptions = leadSources.map((s) => ({
    label: s,
    value: s,
  }));

  const ownerOptions = members.map((m) => ({
    label: getMemberDisplayName(m),
    value: m.membershipId,
  }));

  return (
    <>
      <View style={styles.tabContent}>
        {/* Lead Details Section */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Ionicons name="information-circle-outline" size={15} color={sectionTitleColor} />
            <Text style={[styles.sectionTitle, { color: sectionTitleColor, marginBottom: 0 }]}>Lead Details</Text>
          </View>
          <View style={[styles.detailsGrid, { backgroundColor: cardBg, borderColor }]}>
            {/* Row 1: Title, Score, Stage, Pipeline */}
            <View style={styles.detailsRow}>
              <TouchableOpacity style={styles.detailsCell} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowTitleInput(true); }}>
                <Text style={[styles.detailsCellLabel, { color: labelColor }]}>TITLE</Text>
                <Text style={[styles.detailsCellValue, { color: textColor }]} numberOfLines={2}>{lead.title}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.detailsCell} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowScoreInput(true); }}>
                <Text style={[styles.detailsCellLabel, { color: labelColor }]}>SCORE</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <ScoreIndicator score={lead.score} size={8} />
                  <View style={{ height: 6, width: 48, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${lead.score || 0}%`, backgroundColor: getScoreBadgeColor(lead.score || 0), borderRadius: 3 }} />
                  </View>
                  <Text style={[{ fontSize: 14, fontWeight: '600', color: getScoreBadgeColor(lead.score || 0) }]}>{lead.score || 0}</Text>
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.detailsRow}>
              <TouchableOpacity style={styles.detailsCell} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowStagePicker(true); }}>
                <Text style={[styles.detailsCellLabel, { color: labelColor }]}>STAGE</Text>
                <LeadStatusBadge stage={lead.stage} size="medium" />
              </TouchableOpacity>
              <View style={styles.detailsCell}>
                <Text style={[styles.detailsCellLabel, { color: labelColor }]}>PIPELINE</Text>
                <Text style={[styles.detailsCellValue, { color: textColor }]}>{lead.pipeline?.name || '-'}</Text>
              </View>
            </View>

            {/* Row 2: Source, Inquiry Type, Owner, Value */}
            <View style={styles.detailsRow}>
              <TouchableOpacity style={styles.detailsCell} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowSourcePicker(true); }}>
                <Text style={[styles.detailsCellLabel, { color: labelColor }]}>SOURCE</Text>
                <SourceBadge source={lead.source} size="medium" />
              </TouchableOpacity>
              {inquiryType ? (
                <View style={styles.detailsCell}>
                  <Text style={[styles.detailsCellLabel, { color: labelColor }]}>INQUIRY TYPE</Text>
                  <View style={[styles.inquiryBadge, { backgroundColor: inquiryType.color + '20' }]}>
                    <Text style={[styles.inquiryBadgeText, { color: inquiryType.color }]}>{inquiryType.label}</Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.detailsCell} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowValueInput(true); }}>
                  <Text style={[styles.detailsCellLabel, { color: labelColor }]}>VALUE</Text>
                  <Text style={[styles.detailsCellValue, { color: textColor }]}>{formatValue(lead.value)}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.detailsRow}>
              <TouchableOpacity style={styles.detailsCell} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowOwnerPicker(true); }}>
                <Text style={[styles.detailsCellLabel, { color: labelColor }]}>OWNER</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>{lead.owner.userName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={[{ fontSize: 13, color: textColor }]} numberOfLines={1}>{lead.owner.userName}</Text>
                </View>
              </TouchableOpacity>
              {inquiryType ? (
                <TouchableOpacity style={styles.detailsCell} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowValueInput(true); }}>
                  <Text style={[styles.detailsCellLabel, { color: labelColor }]}>VALUE</Text>
                  <Text style={[styles.detailsCellValue, { color: textColor }]}>{formatValue(lead.value)}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.detailsCell}>
                  <Text style={[styles.detailsCellLabel, { color: labelColor }]}>CURRENCY</Text>
                  <Text style={[styles.detailsCellValue, { color: textColor }]}>{lead.currency?.code || '-'}</Text>
                </View>
              )}
            </View>
            {inquiryType && (
              <View style={styles.detailsRow}>
                <View style={styles.detailsCell}>
                  <Text style={[styles.detailsCellLabel, { color: labelColor }]}>CURRENCY</Text>
                  <Text style={[styles.detailsCellValue, { color: textColor }]}>{lead.currency?.code || '-'}</Text>
                </View>
                <View style={styles.detailsCell} />
              </View>
            )}
          </View>
          {updating && (
            <View style={styles.updatingIndicator}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.updatingText, { color: subtitleColor }]}>Saving...</Text>
            </View>
          )}
        </View>

        {/* Contact Information Section */}
        {lead.contact && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Ionicons name="person-outline" size={15} color={sectionTitleColor} />
              <Text style={[styles.sectionTitle, { color: sectionTitleColor, marginBottom: 0 }]}>Contact Information</Text>
            </View>
            <View style={[styles.detailsGrid, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.detailsRow}>
                <View style={styles.detailsCell}>
                  <Text style={[styles.detailsCellLabel, { color: labelColor }]}>FIRST NAME</Text>
                  <Text style={[styles.detailsCellValue, { color: textColor }]}>{lead.contact.firstName || '-'}</Text>
                </View>
                <View style={styles.detailsCell}>
                  <Text style={[styles.detailsCellLabel, { color: labelColor }]}>LAST NAME</Text>
                  <Text style={[styles.detailsCellValue, { color: textColor }]}>{lead.contact.lastName || '-'}</Text>
                </View>
              </View>
              <View style={styles.detailsRow}>
                <View style={styles.detailsCell}>
                  <Text style={[styles.detailsCellLabel, { color: labelColor }]}>EMAIL</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    {lead.contact.email ? (
                      <>
                        <TouchableOpacity onPress={() => Linking.openURL(`mailto:${lead.contact!.email}`)} style={{ flex: 1 }}>
                          <Text style={[{ fontSize: 13, color: colors.primary }]} numberOfLines={1}>{lead.contact.email}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => Linking.openURL(`mailto:${lead.contact!.email}`)}>
                          <Ionicons name="mail" size={16} color={colors.primary} />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Text style={[styles.detailsCellValue, { color: textColor }]}>-</Text>
                    )}
                  </View>
                </View>
                <View style={styles.detailsCell}>
                  <Text style={[styles.detailsCellLabel, { color: labelColor }]}>PHONE</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    {lead.contact.phone ? (
                      <>
                        <TouchableOpacity onPress={() => Linking.openURL(`tel:${lead.contact!.phone}`)} style={{ flex: 1 }}>
                          <Text style={[{ fontSize: 13, color: '#22c55e' }]} numberOfLines={1}>{lead.contact.phone}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => Linking.openURL(`tel:${lead.contact!.phone}`)}>
                          <Ionicons name="call" size={14} color="#22c55e" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { const p = lead.contact!.phone!.replace(/\D/g, ''); Linking.openURL(`https://wa.me/${p}`); }}>
                          <Ionicons name="logo-whatsapp" size={14} color="#25d366" />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Text style={[styles.detailsCellValue, { color: textColor }]}>-</Text>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.detailsRow}>
                <View style={styles.detailsCell}>
                  <Text style={[styles.detailsCellLabel, { color: labelColor }]}>TITLE/ROLE</Text>
                  <Text style={[styles.detailsCellValue, { color: textColor }]}>{lead.contact.title || '-'}</Text>
                </View>
                <View style={styles.detailsCell}>
                  <Text style={[styles.detailsCellLabel, { color: labelColor }]}>COMPANY</Text>
                  <Text style={[styles.detailsCellValue, { color: textColor }]}>{lead.contact.company?.name || '-'}</Text>
                </View>
              </View>
              {/* Address fields */}
              <View style={styles.detailsRow}>
                <View style={styles.detailsCell}>
                  <Text style={[styles.detailsCellLabel, { color: labelColor }]}>COUNTRY</Text>
                  <Text style={[styles.detailsCellValue, { color: textColor }]}>{(lead.contact as any).country || '-'}</Text>
                </View>
                <View style={styles.detailsCell}>
                  <Text style={[styles.detailsCellLabel, { color: labelColor }]}>STATE</Text>
                  <Text style={[styles.detailsCellValue, { color: textColor }]}>{(lead.contact as any).state || '-'}</Text>
                </View>
              </View>
              <View style={styles.detailsRow}>
                <View style={styles.detailsCell}>
                  <Text style={[styles.detailsCellLabel, { color: labelColor }]}>CITY</Text>
                  <Text style={[styles.detailsCellValue, { color: textColor }]}>{(lead.contact as any).city || '-'}</Text>
                </View>
                <View style={styles.detailsCell}>
                  <Text style={[styles.detailsCellLabel, { color: labelColor }]}>POSTAL CODE</Text>
                  <Text style={[styles.detailsCellValue, { color: textColor }]}>{(lead.contact as any).postalCode || '-'}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Company Section */}
        {lead.contact?.company && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="business" size={16} color={sectionTitleColor} />
                <Text style={[styles.sectionTitle, { color: sectionTitleColor, marginBottom: 0 }]}>Company</Text>
              </View>
            </View>
            <View style={[styles.companyCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={[styles.companyAvatar, { backgroundColor: avatarColor }]}>
                <Text style={{ color: 'white', fontSize: 14, fontWeight: '700' }}>
                  {lead.contact.company.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={[{ fontSize: 15, fontWeight: '600', color: textColor, flex: 1 }]}>{lead.contact.company.name}</Text>
            </View>
          </View>
        )}

        {/* Requirements/Description */}
        {lead.description && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="clipboard-outline" size={15} color={sectionTitleColor} />
                <Text style={[styles.sectionTitle, { color: sectionTitleColor, marginBottom: 0 }]}>Requirements</Text>
              </View>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowDescriptionInput(true); }} style={{ padding: 4 }}>
                <Ionicons name="create-outline" size={16} color={subtitleColor} />
              </TouchableOpacity>
            </View>
            <View style={[styles.requirementsCard, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[{ fontSize: 13.5, color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)', lineHeight: 21 }]}>
                {lead.description}
              </Text>
            </View>
          </View>
        )}

        {/* Custom Fields */}
        {lead.customFieldValues && Object.keys(lead.customFieldValues).length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Ionicons name="layers-outline" size={15} color={sectionTitleColor} />
              <Text style={[styles.sectionTitle, { color: sectionTitleColor, marginBottom: 0 }]}>Additional Information</Text>
            </View>
            <View style={[styles.detailsGrid, { backgroundColor: cardBg, borderColor }]}>
              {Object.entries(lead.customFieldValues).map(([key, value], idx, arr) => {
                if (idx % 2 === 1) return null;
                const nextEntry = arr[idx + 1];
                return (
                  <View key={key} style={styles.detailsRow}>
                    <View style={styles.detailsCell}>
                      <Text style={[styles.detailsCellLabel, { color: labelColor }]}>{key.toUpperCase()}</Text>
                      <Text style={[styles.detailsCellValue, { color: textColor }]}>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '-')}
                      </Text>
                    </View>
                    {nextEntry ? (
                      <View style={styles.detailsCell}>
                        <Text style={[styles.detailsCellLabel, { color: labelColor }]}>{nextEntry[0].toUpperCase()}</Text>
                        <Text style={[styles.detailsCellValue, { color: textColor }]}>
                          {typeof nextEntry[1] === 'object' ? JSON.stringify(nextEntry[1]) : String(nextEntry[1] ?? '-')}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.detailsCell} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Timestamps */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 4, opacity: 0.5 }}>
          <Text style={{ fontSize: 11, color: subtitleColor }}>Created {formatDate(lead.createdAt)}</Text>
          <Text style={{ fontSize: 11, color: subtitleColor }}>Updated {formatDate(lead.updatedAt)}</Text>
        </View>

        <View style={{ height: 100 }} />
      </View>

      {/* Modals */}
      <PickerModal
        visible={showStagePicker}
        title="Select Stage"
        options={stageOptions}
        selectedValue={lead.stageId}
        onSelect={(value) => onUpdateField('stageId', value)}
        onClose={() => setShowStagePicker(false)}
        isDark={isDark}
      />

      <PickerModal
        visible={showSourcePicker}
        title="Select Source"
        options={sourceOptions}
        selectedValue={lead.source}
        onSelect={(value) => onUpdateField('source', value)}
        onClose={() => setShowSourcePicker(false)}
        isDark={isDark}
      />

      <ValueInputModal
        visible={showValueInput}
        title="Lead Value"
        value={lead.value?.toString() || ''}
        onSave={(value) => onUpdateField('value', value ? parseFloat(value) : undefined)}
        onClose={() => setShowValueInput(false)}
        isDark={isDark}
        keyboardType="decimal-pad"
        placeholder="Enter value..."
      />

      <ValueInputModal
        visible={showScoreInput}
        title="Lead Score (0-100)"
        value={lead.score?.toString() || ''}
        onSave={(value) => {
          const score = value ? Math.min(100, Math.max(0, parseInt(value, 10))) : undefined;
          onUpdateField('score', score);
        }}
        onClose={() => setShowScoreInput(false)}
        isDark={isDark}
        keyboardType="numeric"
        placeholder="Enter score (0-100)..."
      />

      <PickerModal
        visible={showOwnerPicker}
        title="Assign Owner"
        options={ownerOptions}
        selectedValue={lead.ownerMembershipId}
        onSelect={(value) => onUpdateField('ownerMembershipId', value)}
        onClose={() => setShowOwnerPicker(false)}
        isDark={isDark}
      />

      <ValueInputModal
        visible={showTitleInput}
        title="Lead Title"
        value={lead.title}
        onSave={(value) => {
          if (value.trim()) onUpdateField('title', value.trim());
        }}
        onClose={() => setShowTitleInput(false)}
        isDark={isDark}
        keyboardType="numeric"
        placeholder="Enter lead title..."
      />

      <ValueInputModal
        visible={showDescriptionInput}
        title="Description"
        value={lead.description || ''}
        onSave={(value) => onUpdateField('description', value.trim() || undefined)}
        onClose={() => setShowDescriptionInput(false)}
        isDark={isDark}
        keyboardType="numeric"
        placeholder="Enter description..."
      />
    </>
  );
}

// Timeline tab content
function TimelineTab({
  activities,
  loading,
  isDark,
  onRefresh,
}: {
  activities: LeadActivity[];
  loading: boolean;
  isDark: boolean;
  onRefresh?: () => Promise<void>;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const emptyIconColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  const emptyTextColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const chipBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const chipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const chipText = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const FILTER_OPTIONS = [
    { key: 'all', label: 'All' },
    { key: 'CALL', label: 'Calls', color: ACTIVITY_TYPE_COLORS.CALL },
    { key: 'EMAIL', label: 'Emails', color: ACTIVITY_TYPE_COLORS.EMAIL },
    { key: 'MEETING', label: 'Meetings', color: ACTIVITY_TYPE_COLORS.MEETING },
    { key: 'TASK', label: 'Tasks', color: ACTIVITY_TYPE_COLORS.TASK },
    { key: 'NOTE', label: 'Notes', color: ACTIVITY_TYPE_COLORS.NOTE },
  ];

  const activityList = (activities || []).filter((a) => {
    if (typeFilter === 'all') return true;
    return a.type === typeFilter;
  });

  if (loading) {
    return (
      <View style={styles.loadingTab}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View>
      {/* Section header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}>
        <Ionicons name="time-outline" size={15} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} />
        <Text style={{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
          Timeline {activityList.length > 0 ? `(${activityList.length})` : ''}
        </Text>
      </View>
      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 44, paddingHorizontal: 16, paddingVertical: 6 }}
        contentContainerStyle={{ gap: 6, alignItems: 'center' }}
      >
        {FILTER_OPTIONS.map((opt) => {
          const isActive = typeFilter === opt.key;
          const activeColor = opt.color || colors.primary;
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTypeFilter(opt.key);
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 14,
                borderWidth: 1,
                backgroundColor: isActive ? `${activeColor}20` : chipBg,
                borderColor: isActive ? activeColor : chipBorder,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: isActive ? '600' : '500', color: isActive ? activeColor : chipText }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {activityList.length === 0 ? (
        <View style={[styles.emptyTab, styles.emptyTabContent]}>
          <Ionicons name="time-outline" size={36} color={emptyIconColor} />
          <Text style={[styles.emptyTabText, { color: emptyTextColor }]}>
            {typeFilter === 'all' ? 'No activities yet' : `No ${typeFilter.toLowerCase()} activities`}
          </Text>
        </View>
      ) : (
        <View style={styles.tabContent}>
          {activityList.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} isDark={isDark} />
          ))}
        </View>
      )}
    </View>
  );
}

// Tag Picker Modal
function TagPickerModal({
  visible,
  allTags,
  selectedTagIds,
  onToggleTag,
  onCreateTag,
  onClose,
  isDark,
  loading,
}: {
  visible: boolean;
  allTags: LeadTag[];
  selectedTagIds: Set<string>;
  onToggleTag: (tagId: string, isSelected: boolean) => void;
  onCreateTag: (name: string, color: string) => void;
  onClose: () => void;
  isDark: boolean;
  loading: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(colors.primary);

  const bgColor = colors.background;
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'white';
  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'white';
  const overlayColor = isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)';
  const placeholderColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';

  const TAG_COLORS = [
    { color: colors.primary, name: 'Blue' },
    { color: '#22c55e', name: 'Green' },
    { color: '#f59e0b', name: 'Amber' },
    { color: '#ef4444', name: 'Red' },
    { color: '#8b5cf6', name: 'Purple' },
    { color: '#ec4899', name: 'Pink' },
    { color: '#06b6d4', name: 'Cyan' },
    { color: '#6b7280', name: 'Gray' },
  ];

  const filteredTags = allTags.filter(tag =>
    tag.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    onCreateTag(newTagName.trim(), newTagColor);
    setNewTagName('');
    setNewTagColor(colors.primary);
    setShowCreateForm(false);
  };

  const selectedCount = selectedTagIds.size;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]} onPress={onClose} />
        <View style={[styles.tagPickerContent, { backgroundColor: bgColor, paddingBottom: insets.bottom + 20 }]}>
          {/* Gradient Header */}
          <LinearGradient
            colors={[colors.primary, '#6366f1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tagPickerHeader}
          >
            <View style={styles.tagPickerHeaderContent}>
              <View>
                <Text style={styles.tagPickerTitle}>Manage Tags</Text>
                <Text style={styles.tagPickerSubtitle}>
                  {selectedCount > 0 ? `${selectedCount} tag${selectedCount > 1 ? 's' : ''} selected` : 'Select tags for this lead'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.tagPickerCloseBtn}
                onPress={onClose}
              >
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Search Input */}
          <View style={styles.tagPickerSearchWrapper}>
            <View style={[styles.tagPickerSearchInput, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.tagPickerSearchIconWrapper}>
                <Ionicons name="search" size={18} color={subtitleColor} />
              </View>
              <TextInput
                style={[styles.tagPickerSearchText, { color: textColor }]}
                value={search}
                onChangeText={setSearch}
                placeholder="Search tags..."
                placeholderTextColor={placeholderColor}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} style={styles.tagPickerSearchClear}>
                  <Ionicons name="close-circle" size={18} color={subtitleColor} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Tags List */}
          {loading ? (
            <View style={styles.tagLoadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.tagLoadingText, { color: subtitleColor }]}>Loading tags...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.tagPickerList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              {filteredTags.length > 0 && (
                <Text style={[styles.tagPickerSectionLabel, { color: subtitleColor }]}>
                  {search ? `Results (${filteredTags.length})` : `All Tags (${allTags.length})`}
                </Text>
              )}

              {filteredTags.map((tag) => {
                const isSelected = selectedTagIds.has(tag.id);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.tagPickerItem,
                      { backgroundColor: cardBg, borderColor },
                      isSelected && styles.tagPickerItemSelected,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onToggleTag(tag.id, isSelected);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.tagPickerItemColor, { backgroundColor: tag.color }]}>
                      {isSelected && (
                        <Ionicons name="checkmark" size={12} color="white" />
                      )}
                    </View>
                    <View style={styles.tagPickerItemInfo}>
                      <Text style={[styles.tagPickerItemName, { color: textColor }]}>{tag.name}</Text>
                    </View>
                    <View style={[
                      styles.tagPickerItemCheckbox,
                      { borderColor: isSelected ? '#22c55e' : borderColor },
                      isSelected && styles.tagPickerItemCheckboxSelected,
                    ]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {filteredTags.length === 0 && (
                <View style={styles.tagPickerEmpty}>
                  <View style={[styles.tagPickerEmptyIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(59,130,246,0.08)' }]}>
                    <Ionicons name="pricetags-outline" size={32} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(59,130,246,0.5)'} />
                  </View>
                  <Text style={[styles.tagPickerEmptyTitle, { color: textColor }]}>
                    {search ? 'No tags found' : 'No tags yet'}
                  </Text>
                  <Text style={[styles.tagPickerEmptyText, { color: subtitleColor }]}>
                    {search ? `No tags matching "${search}"` : 'Create your first tag below'}
                  </Text>
                </View>
              )}

              <View style={{ height: 16 }} />
            </ScrollView>
          )}

          {/* Create New Tag Section */}
          <View style={[styles.tagPickerFooter, { backgroundColor: cardBg, borderTopColor: borderColor }]}>
            {!showCreateForm ? (
              <TouchableOpacity
                style={styles.tagPickerCreateBtn}
                onPress={() => setShowCreateForm(true)}
              >
                <LinearGradient
                  colors={['rgba(59,130,246,0.15)', 'rgba(99,102,241,0.15)']}
                  style={styles.tagPickerCreateBtnGradient}
                >
                  <View style={styles.tagPickerCreateBtnIcon}>
                    <Ionicons name="add" size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.tagPickerCreateBtnText, { color: colors.primary }]}>Create New Tag</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.tagPickerCreateForm}>
                <View style={styles.tagPickerCreateFormHeader}>
                  <Text style={[styles.tagPickerCreateFormTitle, { color: textColor }]}>New Tag</Text>
                  <TouchableOpacity onPress={() => { setShowCreateForm(false); setNewTagName(''); }}>
                    <Ionicons name="close" size={20} color={subtitleColor} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.tagPickerCreateInput, { backgroundColor: inputBg, borderColor }]}>
                  <View style={[styles.tagPickerCreateInputPreview, { backgroundColor: newTagColor }]} />
                  <TextInput
                    style={[styles.tagPickerCreateInputText, { color: textColor }]}
                    value={newTagName}
                    onChangeText={setNewTagName}
                    placeholder="Enter tag name..."
                    placeholderTextColor={placeholderColor}
                    autoFocus
                  />
                </View>

                <Text style={[styles.tagPickerColorLabel, { color: subtitleColor }]}>Select Color</Text>
                <View style={styles.tagPickerColorGrid}>
                  {TAG_COLORS.map((item) => (
                    <TouchableOpacity
                      key={item.color}
                      style={[
                        styles.tagPickerColorOption,
                        { backgroundColor: `${item.color}20` },
                        newTagColor === item.color && styles.tagPickerColorOptionSelected,
                      ]}
                      onPress={() => setNewTagColor(item.color)}
                    >
                      <View style={[
                        styles.tagPickerColorDot,
                        { backgroundColor: item.color },
                        newTagColor === item.color && styles.tagPickerColorDotSelected,
                      ]}>
                        {newTagColor === item.color && (
                          <Ionicons name="checkmark" size={12} color="white" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.tagPickerCreateActions}>
                  <TouchableOpacity
                    style={[styles.tagPickerCancelBtn, { borderColor }]}
                    onPress={() => { setShowCreateForm(false); setNewTagName(''); }}
                  >
                    <Text style={[styles.tagPickerCancelBtnText, { color: subtitleColor }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.tagPickerSaveBtn,
                      !newTagName.trim() && styles.tagPickerSaveBtnDisabled,
                    ]}
                    onPress={handleCreateTag}
                    disabled={!newTagName.trim()}
                  >
                    <LinearGradient
                      colors={newTagName.trim() ? [colors.primary, colors.primary] : [colors.ring, colors.ring]}
                      style={styles.tagPickerSaveBtnGradient}
                    >
                      <Ionicons name="add" size={18} color="white" />
                      <Text style={styles.tagPickerSaveBtnText}>Create Tag</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Tags tab content
function TagsTab({
  leadId,
  accessToken,
  isDark,
}: {
  leadId: string;
  accessToken: string | null;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [allTags, setAllTags] = useState<LeadTag[]>([]);
  const [leadTags, setLeadTags] = useState<LeadTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [updating, setUpdating] = useState(false);

  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const emptyIconColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  const emptyTextColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

  const fetchTags = useCallback(async () => {
    if (!accessToken || !leadId) return;
    setLoading(true);

    const [allResponse, leadResponse] = await Promise.all([
      getAllTags(accessToken),
      getLeadTags(accessToken, leadId),
    ]);

    if (allResponse.success && allResponse.data) {
      setAllTags(allResponse.data);
    }
    if (leadResponse.success && leadResponse.data) {
      setLeadTags(leadResponse.data);
    }

    setLoading(false);
  }, [accessToken, leadId]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTags();
    setRefreshing(false);
  }, [fetchTags]);

  const handleToggleTag = async (tagId: string, isSelected: boolean) => {
    if (!accessToken || !leadId) return;
    setUpdating(true);

    if (isSelected) {
      // Remove tag
      const response = await removeLeadTags(accessToken, leadId, [tagId]);
      if (response.success) {
        setLeadTags(prev => prev.filter(t => t.id !== tagId));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Error', response.error?.message || 'Failed to remove tag');
      }
    } else {
      // Add tag
      const response = await addLeadTags(accessToken, leadId, [tagId]);
      if (response.success) {
        const tag = allTags.find(t => t.id === tagId);
        if (tag) setLeadTags(prev => [...prev, tag]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Error', response.error?.message || 'Failed to add tag');
      }
    }

    setUpdating(false);
  };

  const handleCreateTag = async (name: string, color: string) => {
    if (!accessToken) return;
    setUpdating(true);

    const response = await createTag(accessToken, { name, color });
    if (response.success && response.data) {
      setAllTags(prev => [...prev, response.data!]);
      // Also add to lead
      await handleToggleTag(response.data.id, false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert('Error', response.error?.message || 'Failed to create tag');
    }

    setUpdating(false);
  };

  const handleRemoveTag = (tagId: string) => {
    Alert.alert(
      'Remove Tag',
      'Remove this tag from the lead?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => handleToggleTag(tagId, true),
        },
      ]
    );
  };

  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'white';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const sectionTitleColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

  if (loading) {
    return (
      <View style={styles.loadingTab}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const selectedTagIds = new Set(leadTags.map(t => t.id));

  return (
    <View style={styles.tagsTabContainer}>
      <View style={styles.tabContent}>
        {/* Header Section */}
        <View style={[styles.sectionHeaderRow, { marginBottom: 10 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="pricetags-outline" size={15} color={sectionTitleColor} />
            <Text style={[styles.sectionTitle, { color: sectionTitleColor, marginBottom: 0 }]}>
              Tags {leadTags.length > 0 ? `(${leadTags.length})` : ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowPicker(true);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}
          >
            <Ionicons name="settings-outline" size={14} color="white" />
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Manage</Text>
          </TouchableOpacity>
        </View>

        {/* Tags Content */}
        {leadTags.length === 0 ? (
          <View style={styles.tagsTabEmptyContainer}>
            <View style={[styles.tagsTabEmptyIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(59,130,246,0.08)' }]}>
              <Ionicons name="pricetags-outline" size={40} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(59,130,246,0.5)'} />
            </View>
            <Text style={[styles.tagsTabEmptyTitle, { color: textColor }]}>No tags yet</Text>
            <Text style={[styles.tagsTabEmptyText, { color: subtitleColor }]}>
              Add tags to organize and categorize this lead for better filtering and searchability
            </Text>
            <TouchableOpacity
              style={styles.tagsTabAddBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowPicker(true);
              }}
            >
              <LinearGradient
                colors={[colors.primary, colors.primary]}
                style={styles.tagsTabAddBtnGradient}
              >
                <Ionicons name="add" size={18} color="white" />
                <Text style={styles.tagsTabAddBtnText}>Add Tags</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.tagsTabGrid, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.tagsTabGridLabel, { color: subtitleColor }]}>Assigned Tags</Text>
            <View style={styles.tagsTabChipContainer}>
              {leadTags.map((tag) => (
                <TouchableOpacity
                  key={tag.id}
                  style={[styles.tagsTabChip, { backgroundColor: `${tag.color}15`, borderColor: `${tag.color}30` }]}
                  onPress={() => handleRemoveTag(tag.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.tagsTabChipDot, { backgroundColor: tag.color }]} />
                  <Text style={[styles.tagsTabChipText, { color: isDark ? 'white' : tag.color }]}>{tag.name}</Text>
                  <View style={[styles.tagsTabChipClose, { backgroundColor: `${tag.color}20` }]}>
                    <Ionicons name="close" size={10} color={tag.color} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.tagsTabAddMoreBtn, { borderColor }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowPicker(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.tagsTabAddMoreText, { color: colors.primary }]}>Add more tags</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </View>

      {/* Tag Picker Modal */}
      <TagPickerModal
        visible={showPicker}
        allTags={allTags}
        selectedTagIds={selectedTagIds}
        onToggleTag={handleToggleTag}
        onCreateTag={handleCreateTag}
        onClose={() => setShowPicker(false)}
        isDark={isDark}
        loading={updating}
      />
    </View>
  );
}

// Document Item Component
function DocumentItem({
  doc,
  isDark,
  onPreview,
  onDownload,
  onDelete,
}: {
  doc: LeadDocument;
  isDark: boolean;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'white';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const getFileIcon = (fileType: string): keyof typeof Ionicons.glyphMap => {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.includes('pdf')) return 'document-text';
    if (fileType.includes('word') || fileType.includes('document')) return 'document';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'grid';
    return 'document';
  };

  const getFileIconColor = (fileType: string): string => {
    if (fileType.startsWith('image/')) return '#8b5cf6';
    if (fileType.includes('pdf')) return '#ef4444';
    if (fileType.includes('word') || fileType.includes('document')) return colors.primary;
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '#22c55e';
    return '#6b7280';
  };

  const getFileTypeBadge = (fileType: string): string => {
    if (fileType.startsWith('image/')) return 'IMAGE';
    if (fileType.includes('pdf')) return 'PDF';
    if (fileType.includes('word') || fileType.includes('document')) return 'DOC';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'XLS';
    return 'FILE';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  };

  const iconName = getFileIcon(doc.fileType);
  const iconColor = getFileIconColor(doc.fileType);
  const typeBadge = getFileTypeBadge(doc.fileType);

  return (
    <View style={[styles.docItemCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={[styles.docItemIconWrapper, { backgroundColor: `${iconColor}12` }]}>
        <Ionicons name={iconName} size={22} color={iconColor} />
        <View style={[styles.docItemTypeBadge, { backgroundColor: iconColor }]}>
          <Text style={styles.docItemTypeBadgeText}>{typeBadge}</Text>
        </View>
      </View>
      <View style={styles.docItemContent}>
        <Text style={[styles.docItemName, { color: textColor }]} numberOfLines={1}>
          {doc.fileName}
        </Text>
        <View style={styles.docItemMeta}>
          <Text style={[styles.docItemMetaText, { color: subtitleColor }]}>
            {formatFileSize(doc.fileSize)}
          </Text>
          <View style={[styles.docItemMetaDot, { backgroundColor: subtitleColor }]} />
          <Text style={[styles.docItemMetaText, { color: subtitleColor }]}>
            {formatDate(doc.uploadedAt)}
          </Text>
        </View>
      </View>
      <View style={styles.docItemActions}>
        <TouchableOpacity
          style={[styles.docItemActionBtn, { backgroundColor: 'rgba(139,92,246,0.1)' }]}
          onPress={onPreview}
        >
          <Ionicons name="eye-outline" size={18} color="#8b5cf6" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.docItemActionBtn, { backgroundColor: 'rgba(59,130,246,0.1)' }]}
          onPress={onDownload}
        >
          <Ionicons name="download-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.docItemActionBtn, { backgroundColor: 'rgba(239,68,68,0.1)' }]}
          onPress={onDelete}
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Documents tab content
function DocsTab({
  leadId,
  accessToken,
  isDark,
}: {
  leadId: string;
  accessToken: string | null;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);

  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const emptyIconColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  const emptyTextColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const bgColor = colors.card;
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const overlayColor = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)';
  const textColor = colors.foreground;

  const fetchDocuments = useCallback(async () => {
    if (!accessToken || !leadId) return;
    setLoading(true);

    const response = await getLeadDocuments(accessToken, leadId);
    if (response.success && response.data) {
      setDocuments(response.data);
    }

    setLoading(false);
  }, [accessToken, leadId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDocuments();
    setRefreshing(false);
  }, [fetchDocuments]);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];

        // Check file size (2MB limit)
        if (file.size && file.size > 2 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select a file smaller than 2MB');
          return;
        }

        await uploadDocument({
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
        });
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
    setShowUploadOptions(false);
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access to upload images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        const image = result.assets[0];

        // Check file size (2MB limit)
        if (image.fileSize && image.fileSize > 2 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select an image smaller than 2MB');
          return;
        }

        const fileName = image.fileName || `image-${Date.now()}.jpg`;
        await uploadDocument({
          uri: image.uri,
          name: fileName,
          type: image.mimeType || 'image/jpeg',
        });
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
    setShowUploadOptions(false);
  };

  const uploadDocument = async (file: { uri: string; name: string; type: string }) => {
    if (!accessToken || !leadId) return;

    setUploading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const response = await uploadLeadDocument(accessToken, leadId, file);

    if (response.success && response.data) {
      setDocuments(prev => [response.data!, ...prev]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Document uploaded successfully');
    } else {
      Alert.alert('Error', response.error?.message || 'Failed to upload document');
    }

    setUploading(false);
  };

  const handlePreview = async (doc: LeadDocument) => {
    if (!accessToken || !leadId) return;
    try {
      const response = await getLeadDocumentPreview(accessToken, leadId, doc.id);
      if (response.success && response.data?.url) {
        await WebBrowser.openBrowserAsync(response.data.url);
      } else {
        Alert.alert('Error', 'Could not generate preview URL');
      }
    } catch {
      Alert.alert('Error', 'Failed to open document preview');
    }
  };

  const handleDownload = async (doc: LeadDocument) => {
    // Use preview URL to open in browser for now
    await handlePreview(doc);
  };

  const handleDelete = async (doc: LeadDocument) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${doc.fileName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken || !leadId) return;

            const response = await deleteLeadDocument(accessToken, leadId, doc.id);
            if (response.success) {
              setDocuments(prev => prev.filter(d => d.id !== doc.id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              Alert.alert('Error', response.error?.message || 'Failed to delete document');
            }
          },
        },
      ]
    );
  };

  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'white';
  const sectionTitleColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

  if (loading) {
    return (
      <View style={styles.loadingTab}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.docsTabContainer}>
      <View style={styles.tabContent}>
        {/* Header Section */}
        <View style={[styles.sectionHeaderRow, { marginBottom: 10 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="document-attach-outline" size={15} color={sectionTitleColor} />
            <Text style={[styles.sectionTitle, { color: sectionTitleColor, marginBottom: 0 }]}>
              Documents {documents.length > 0 ? `(${documents.length})` : ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowUploadOptions(true);
            }}
            disabled={uploading}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#8b5cf6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={14} color="white" />
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Upload</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Documents Content */}
        {documents.length === 0 ? (
          <View style={styles.docsTabEmptyContainer}>
            <View style={[styles.docsTabEmptyIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(139,92,246,0.08)' }]}>
              <Ionicons name="document-attach-outline" size={40} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(139,92,246,0.5)'} />
            </View>
            <Text style={[styles.docsTabEmptyTitle, { color: textColor }]}>No documents yet</Text>
            <Text style={[styles.docsTabEmptyText, { color: subtitleColor }]}>
              Upload documents, images, PDFs, or any files related to this lead (max 2MB per file)
            </Text>
            <TouchableOpacity
              style={styles.docsTabAddBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowUploadOptions(true);
              }}
            >
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed']}
                style={styles.docsTabAddBtnGradient}
              >
                <Ionicons name="cloud-upload" size={18} color="white" />
                <Text style={styles.docsTabAddBtnText}>Upload File</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.docsTabList, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.docsTabListLabel, { color: subtitleColor }]}>Uploaded Files</Text>
            <View style={styles.docsTabListItems}>
              {documents.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  doc={doc}
                  isDark={isDark}
                  onPreview={() => handlePreview(doc)}
                  onDownload={() => handleDownload(doc)}
                  onDelete={() => handleDelete(doc)}
                />
              ))}
            </View>
            <TouchableOpacity
              style={[styles.docsTabAddMoreBtn, { borderColor }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowUploadOptions(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={18} color="#8b5cf6" />
              <Text style={styles.docsTabAddMoreText}>Upload more files</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </View>

      {/* Upload Options Modal */}
      <Modal visible={showUploadOptions} transparent animationType="slide" onRequestClose={() => setShowUploadOptions(false)}>
        <Pressable style={[styles.modalOverlay, { backgroundColor: overlayColor }]} onPress={() => setShowUploadOptions(false)}>
          <Pressable style={[styles.uploadModalContent, { backgroundColor: bgColor }]}>
            {/* Modal Header */}
            <LinearGradient
              colors={['#8b5cf6', '#7c3aed']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.uploadModalHeader}
            >
              <View style={styles.uploadModalHeaderContent}>
                <View style={styles.uploadModalHeaderIcon}>
                  <Ionicons name="cloud-upload" size={24} color="white" />
                </View>
                <View>
                  <Text style={styles.uploadModalTitle}>Upload Document</Text>
                  <Text style={styles.uploadModalSubtitle}>Max file size: 2MB</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.uploadModalOptions}>
              <TouchableOpacity
                style={[styles.uploadModalOption, { backgroundColor: cardBg, borderColor }]}
                onPress={handlePickDocument}
              >
                <View style={[styles.uploadModalOptionIcon, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
                  <Ionicons name="document-text" size={24} color={colors.primary} />
                </View>
                <View style={styles.uploadModalOptionInfo}>
                  <Text style={[styles.uploadModalOptionTitle, { color: textColor }]}>Choose File</Text>
                  <Text style={[styles.uploadModalOptionDesc, { color: subtitleColor }]}>PDF, Word, Excel, etc.</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={subtitleColor} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.uploadModalOption, { backgroundColor: cardBg, borderColor }]}
                onPress={handlePickImage}
              >
                <View style={[styles.uploadModalOptionIcon, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                  <Ionicons name="image" size={24} color="#8b5cf6" />
                </View>
                <View style={styles.uploadModalOptionInfo}>
                  <Text style={[styles.uploadModalOptionTitle, { color: textColor }]}>Choose Photo</Text>
                  <Text style={[styles.uploadModalOptionDesc, { color: subtitleColor }]}>From photo library</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={subtitleColor} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.uploadModalCancelBtn, { borderColor }]}
              onPress={() => setShowUploadOptions(false)}
            >
              <Text style={[styles.uploadModalCancelText, { color: subtitleColor }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// Deal Item Component
function DealItem({
  deal,
  isDark,
  onPress,
  onDelete,
}: {
  deal: Deal;
  isDark: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'white';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const stageColor = DEAL_STAGE_COLORS[deal.stage] || '#6b7280';
  const statusColor = DEAL_STATUS_COLORS[deal.status] || '#6b7280';
  const currencySymbol = deal.currency?.symbol || '₹';

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <TouchableOpacity
      style={[styles.dealItem, { backgroundColor: cardBg, borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Stage indicator */}
      <View style={[styles.dealStageIndicator, { backgroundColor: stageColor }]} />

      <View style={styles.dealItemContent}>
        <View style={styles.dealItemHeader}>
          <View style={styles.dealItemInfo}>
            <Text style={[styles.dealItemTitle, { color: textColor }]} numberOfLines={1}>
              {deal.title}
            </Text>
            <View style={styles.dealItemBadges}>
              <View style={[styles.dealStageBadge, { backgroundColor: `${stageColor}15` }]}>
                <View style={[styles.dealStageDot, { backgroundColor: stageColor }]} />
                <Text style={[styles.dealStageBadgeText, { color: stageColor }]}>
                  {DEAL_STAGE_LABELS[deal.stage] || deal.stage}
                </Text>
              </View>
              <View style={[styles.dealStatusBadge, { backgroundColor: `${statusColor}15` }]}>
                <Text style={[styles.dealStatusBadgeText, { color: statusColor }]}>
                  {deal.status}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.dealItemValue}>
            <Text style={[styles.dealValueText, { color: textColor }]}>
              {formatDealValue(Number(deal.value), currencySymbol)}
            </Text>
          </View>
        </View>

        <View style={styles.dealItemMeta}>
          {deal.expectedCloseDate && (
            <View style={styles.dealMetaItem}>
              <Ionicons name="calendar-outline" size={12} color={subtitleColor} />
              <Text style={[styles.dealMetaText, { color: subtitleColor }]}>
                Expected: {formatDate(deal.expectedCloseDate)}
              </Text>
            </View>
          )}
          {deal.contact && (
            <View style={styles.dealMetaItem}>
              <Ionicons name="person-outline" size={12} color={subtitleColor} />
              <Text style={[styles.dealMetaText, { color: subtitleColor }]} numberOfLines={1}>
                {deal.contact.firstName} {deal.contact.lastName}
              </Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.dealDeleteBtn}
        onPress={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={18} color="#ef4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// Create Deal Modal
function CreateDealModal({
  visible,
  leadId,
  contactId,
  contactName,
  onSave,
  onClose,
  isDark,
  saving,
  defaultValue,
  currencySymbol,
}: {
  visible: boolean;
  leadId: string;
  contactId: string;
  contactName: string;
  onSave: (data: CreateDealDto) => void;
  onClose: () => void;
  isDark: boolean;
  saving: boolean;
  defaultValue?: number;
  currencySymbol?: string;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState(defaultValue?.toString() || '');
  const [expectedCloseDate, setExpectedCloseDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const bgColor = colors.card;
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'white';
  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'white';
  const placeholderColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';

  useEffect(() => {
    if (visible) {
      setTitle('');
      setDescription('');
      setValue(defaultValue?.toString() || '');
      setExpectedCloseDate(null);
    }
  }, [visible, defaultValue]);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a deal title');
      return;
    }
    if (!value.trim() || isNaN(Number(value))) {
      Alert.alert('Error', 'Please enter a valid deal value');
      return;
    }

    const data: CreateDealDto = {
      title: title.trim(),
      description: description.trim() || undefined,
      value: Number(value),
      contactId,
      expectedCloseDate: expectedCloseDate?.toISOString(),
    };

    onSave(data);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.createDealOverlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.createDealKeyboardView}
        >
          <Pressable
            style={[styles.createDealContent, { backgroundColor: bgColor }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <LinearGradient
              colors={['#22c55e', '#16a34a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.createDealHeader}
            >
              <View style={styles.createDealHeaderContent}>
                <View>
                  <Text style={styles.createDealTitle}>Create New Deal</Text>
                  <Text style={styles.createDealSubtitle}>
                    Linked to {contactName}
                  </Text>
                </View>
                <TouchableOpacity style={styles.createDealCloseBtn} onPress={onClose}>
                  <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <ScrollView
              style={styles.createDealForm}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            >
              {/* Title */}
              <View style={styles.createDealField}>
                <Text style={[styles.createDealLabel, { color: textColor }]}>Deal Title *</Text>
                <TextInput
                  style={[styles.createDealInput, { backgroundColor: inputBg, borderColor, color: textColor }]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Enter deal title"
                  placeholderTextColor={placeholderColor}
                />
              </View>

              {/* Value */}
              <View style={styles.createDealField}>
                <Text style={[styles.createDealLabel, { color: textColor }]}>Deal Value *</Text>
                <View style={[styles.createDealValueInput, { backgroundColor: inputBg, borderColor }]}>
                  <Text style={[styles.createDealCurrency, { color: subtitleColor }]}>
                    {currencySymbol || '₹'}
                  </Text>
                  <TextInput
                    style={[styles.createDealValueText, { color: textColor }]}
                    value={value}
                    onChangeText={setValue}
                    placeholder="0"
                    placeholderTextColor={placeholderColor}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Expected Close Date */}
              <View style={styles.createDealField}>
                <Text style={[styles.createDealLabel, { color: textColor }]}>Expected Close Date</Text>
                <TouchableOpacity
                  style={[styles.createDealDateBtn, { backgroundColor: inputBg, borderColor }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={subtitleColor} />
                  <Text style={[styles.createDealDateText, { color: expectedCloseDate ? textColor : placeholderColor }]}>
                    {formatDate(expectedCloseDate)}
                  </Text>
                </TouchableOpacity>
                {/* iOS: Modal with Done button */}
                {showDatePicker && Platform.OS === 'ios' && (
                  <Modal transparent animationType="fade">
                    <Pressable
                      style={[styles.datePickerOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <View style={[styles.datePickerContainer, { backgroundColor: inputBg }]}>
                        <DateTimePicker
                          value={expectedCloseDate || new Date()}
                          mode="date"
                          display="spinner"
                          onChange={(event, date) => {
                            if (date) setExpectedCloseDate(date);
                          }}
                          minimumDate={new Date()}
                          textColor={textColor}
                        />
                        <TouchableOpacity
                          style={[styles.datePickerDone, { backgroundColor: colors.primary }]}
                          onPress={() => setShowDatePicker(false)}
                        >
                          <Text style={styles.datePickerDoneText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                    </Pressable>
                  </Modal>
                )}
                {/* Android: Native dialog */}
                {showDatePicker && Platform.OS === 'android' && (
                  <DateTimePicker
                    value={expectedCloseDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (event.type === 'set' && date) {
                        setExpectedCloseDate(date);
                      }
                    }}
                    minimumDate={new Date()}
                  />
                )}
              </View>

              {/* Description */}
              <View style={styles.createDealField}>
                <Text style={[styles.createDealLabel, { color: textColor }]}>Description</Text>
                <TextInput
                  style={[styles.createDealTextarea, { backgroundColor: inputBg, borderColor, color: textColor }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Optional description..."
                  placeholderTextColor={placeholderColor}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.createDealSaveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <LinearGradient
                  colors={['#22c55e', '#16a34a']}
                  style={styles.createDealSaveBtnGradient}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="add-circle" size={20} color="white" />
                      <Text style={styles.createDealSaveBtnText}>Create Deal</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// Deals Tab Component
function DealsTab({
  lead,
  accessToken,
  isDark,
  onDealCreated,
}: {
  lead: Lead | null;
  accessToken: string | null;
  isDark: boolean;
  onDealCreated?: () => void;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'white';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const hasContact = !!lead?.contactId;
  const contactName = lead?.contact
    ? `${lead.contact.firstName} ${lead.contact.lastName}`.trim()
    : 'Unknown Contact';
  const currencySymbol = lead?.currency?.symbol || '₹';

  const fetchDeals = useCallback(async () => {
    if (!accessToken || !lead?.contactId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const response = await getDealsByContact(accessToken, lead.contactId);
    if (response.success && response.data) {
      setDeals(response.data);
    }
    setLoading(false);
  }, [accessToken, lead?.contactId]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDeals();
    setRefreshing(false);
  }, [fetchDeals]);

  const handleCreateDeal = async (data: CreateDealDto) => {
    if (!accessToken || !lead?.id) return;
    setSaving(true);

    const response = await createDeal(accessToken, data);
    if (response.success && response.data) {
      setDeals(prev => [response.data!, ...prev]);
      setShowCreateModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Add timeline activity for deal creation
      const dealValue = formatDealValue(Number(response.data.value), currencySymbol);
      await addLeadActivity(accessToken, lead.id, {
        type: 'NOTE',
        title: `Deal Created: ${response.data.title}`,
        description: `New deal created with value ${dealValue}`,
        status: 'COMPLETED',
      });

      // Notify parent to refresh timeline
      onDealCreated?.();
    } else {
      Alert.alert('Error', response.error?.message || 'Failed to create deal');
    }
    setSaving(false);
  };

  const handleDeleteDeal = (dealId: string) => {
    Alert.alert(
      'Delete Deal',
      'Are you sure you want to delete this deal? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken) return;
            const response = await deleteDeal(accessToken, dealId);
            if (response.success) {
              setDeals(prev => prev.filter(d => d.id !== dealId));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              Alert.alert('Error', response.error?.message || 'Failed to delete deal');
            }
          },
        },
      ]
    );
  };

  const handleDealStageChange = async (deal: Deal, newStage: DealStage) => {
    if (!accessToken) return;

    const response = await updateDeal(accessToken, deal.id, { stage: newStage });
    if (response.success && response.data) {
      setDeals(prev => prev.map(d => d.id === deal.id ? response.data! : d));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Log activity for stage change
      if (lead?.id) {
        await addLeadActivity(accessToken, lead.id, {
          type: 'NOTE',
          title: `Deal Stage Changed: ${deal.title}`,
          description: `Stage updated from ${DEAL_STAGE_LABELS[deal.stage]} to ${DEAL_STAGE_LABELS[newStage]}`,
          status: 'COMPLETED',
        });
        onDealCreated?.();
      }
    } else {
      Alert.alert('Error', response.error?.message || 'Failed to update deal stage');
    }
  };

  const handleMarkDealWon = async (deal: Deal) => {
    if (!accessToken) return;

    Alert.alert(
      'Mark as Won',
      `Are you sure you want to mark "${deal.title}" as won?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Won',
          onPress: async () => {
            const response = await closeDealWon(accessToken, deal.id);
            if (response.success && response.data) {
              setDeals(prev => prev.map(d => d.id === deal.id ? response.data! : d));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              // Log activity
              if (lead?.id) {
                const dealValue = formatDealValue(Number(deal.value), currencySymbol);
                await addLeadActivity(accessToken, lead.id, {
                  type: 'NOTE',
                  title: `🎉 Deal Won: ${deal.title}`,
                  description: `Deal closed as won with value ${dealValue}`,
                  status: 'COMPLETED',
                });
                onDealCreated?.();
              }
            } else {
              Alert.alert('Error', response.error?.message || 'Failed to close deal');
            }
          },
        },
      ]
    );
  };

  const handleMarkDealLost = async (deal: Deal) => {
    if (!accessToken) return;

    Alert.alert(
      'Mark as Lost',
      `Are you sure you want to mark "${deal.title}" as lost?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Lost',
          style: 'destructive',
          onPress: async () => {
            const response = await closeDealLost(accessToken, deal.id);
            if (response.success && response.data) {
              setDeals(prev => prev.map(d => d.id === deal.id ? response.data! : d));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              // Log activity
              if (lead?.id) {
                const dealValue = formatDealValue(Number(deal.value), currencySymbol);
                await addLeadActivity(accessToken, lead.id, {
                  type: 'NOTE',
                  title: `Deal Lost: ${deal.title}`,
                  description: `Deal closed as lost with value ${dealValue}`,
                  status: 'COMPLETED',
                });
                onDealCreated?.();
              }
            } else {
              Alert.alert('Error', response.error?.message || 'Failed to close deal');
            }
          },
        },
      ]
    );
  };

  const showStagePickerAlert = (deal: Deal) => {
    const stages: DealStage[] = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION'];

    Alert.alert(
      'Change Stage',
      'Select a new stage for this deal',
      [
        ...stages.map(stage => ({
          text: `${deal.stage === stage ? '✓ ' : ''}${DEAL_STAGE_LABELS[stage]}`,
          onPress: () => {
            if (deal.stage !== stage) {
              handleDealStageChange(deal, stage);
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  const handleDealPress = (deal: Deal) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const isClosed = deal.status === 'WON' || deal.status === 'LOST';

    // Build action options based on deal status
    const actions: Array<{text: string; onPress?: () => void; style?: 'cancel' | 'destructive'}> = [];

    if (!isClosed) {
      actions.push({
        text: '📊 Change Stage',
        onPress: () => showStagePickerAlert(deal),
      });
      actions.push({
        text: '✅ Mark as Won',
        onPress: () => handleMarkDealWon(deal),
      });
      actions.push({
        text: '❌ Mark as Lost',
        onPress: () => handleMarkDealLost(deal),
      });
    }

    actions.push({
      text: '🗑️ Delete Deal',
      style: 'destructive',
      onPress: () => handleDeleteDeal(deal.id),
    });

    actions.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(
      deal.title,
      `Value: ${formatDealValue(Number(deal.value), currencySymbol)}\nStage: ${DEAL_STAGE_LABELS[deal.stage]}\nStatus: ${DEAL_STATUS_LABELS[deal.status]}${isClosed ? '\n\n(Deal is closed - stage changes not available)' : ''}`,
      actions
    );
  };

  // Calculate total deal value
  const totalValue = deals.reduce((sum, deal) => sum + Number(deal.value), 0);
  const openDeals = deals.filter(d => d.status === 'OPEN').length;
  const sectionTitleColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

  if (loading) {
    return (
      <View style={styles.loadingTab}>
        <ActivityIndicator size="small" color="#22c55e" />
      </View>
    );
  }

  // No contact linked - show empty state
  if (!hasContact) {
    return (
      <View style={styles.dealsTabContainer}>
        <View style={styles.tabContent}>
          <View style={styles.dealsNoContactContainer}>
            <View style={[styles.dealsNoContactIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(234,179,8,0.1)' }]}>
              <Ionicons name="link-outline" size={40} color="#eab308" />
            </View>
            <Text style={[styles.dealsNoContactTitle, { color: textColor }]}>No Contact Linked</Text>
            <Text style={[styles.dealsNoContactText, { color: subtitleColor }]}>
              Deals are linked to contacts. Please add a contact to this lead first, or convert this lead to create a contact and deal.
            </Text>
            <View style={[styles.dealsNoContactHint, { backgroundColor: isDark ? 'rgba(234,179,8,0.1)' : 'rgba(234,179,8,0.1)', borderColor: 'rgba(234,179,8,0.3)' }]}>
              <Ionicons name="bulb-outline" size={16} color="#eab308" />
              <Text style={[styles.dealsNoContactHintText, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }]}>
                Tip: Use the "Convert to Deal" option from the header menu to convert this lead into a contact and optionally create a deal.
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.dealsTabContainer}>
      <View style={styles.tabContent}>
        {/* Header Section */}
        <View style={[styles.sectionHeaderRow, { marginBottom: 10 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="briefcase-outline" size={15} color={sectionTitleColor} />
            <Text style={[styles.sectionTitle, { color: sectionTitleColor, marginBottom: 0 }]}>
              Deals {deals.length > 0 ? `(${deals.length})` : ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowCreateModal(true);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22c55e', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}
          >
            <Ionicons name="add" size={16} color="white" />
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Card */}
        {deals.length > 0 && (
          <View style={[styles.dealsStatsCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.dealsStatItem}>
              <Text style={[styles.dealsStatValue, { color: '#22c55e' }]}>
                {formatDealValue(totalValue, currencySymbol)}
              </Text>
              <Text style={[styles.dealsStatLabel, { color: subtitleColor }]}>Total Value</Text>
            </View>
            <View style={[styles.dealsStatDivider, { backgroundColor: borderColor }]} />
            <View style={styles.dealsStatItem}>
              <Text style={[styles.dealsStatValue, { color: textColor }]}>{deals.length}</Text>
              <Text style={[styles.dealsStatLabel, { color: subtitleColor }]}>Total Deals</Text>
            </View>
            <View style={[styles.dealsStatDivider, { backgroundColor: borderColor }]} />
            <View style={styles.dealsStatItem}>
              <Text style={[styles.dealsStatValue, { color: colors.primary }]}>{openDeals}</Text>
              <Text style={[styles.dealsStatLabel, { color: subtitleColor }]}>Open</Text>
            </View>
          </View>
        )}

        {/* Deals List */}
        {deals.length === 0 ? (
          <View style={styles.dealsEmptyContainer}>
            <View style={[styles.dealsEmptyIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(34,197,94,0.08)' }]}>
              <Ionicons name="briefcase-outline" size={40} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(34,197,94,0.5)'} />
            </View>
            <Text style={[styles.dealsEmptyTitle, { color: textColor }]}>No deals yet</Text>
            <Text style={[styles.dealsEmptyText, { color: subtitleColor }]}>
              Create a deal to track revenue opportunities for this lead's contact
            </Text>
            <TouchableOpacity
              style={styles.dealsCreateBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowCreateModal(true);
              }}
            >
              <LinearGradient
                colors={['#22c55e', '#16a34a']}
                style={styles.dealsCreateBtnGradient}
              >
                <Ionicons name="add" size={18} color="white" />
                <Text style={styles.dealsCreateBtnText}>Create First Deal</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.dealsList}>
            {deals.map((deal) => (
              <DealItem
                key={deal.id}
                deal={deal}
                isDark={isDark}
                onPress={() => handleDealPress(deal)}
                onDelete={() => handleDeleteDeal(deal.id)}
              />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </View>

      {/* Create Deal Modal */}
      <CreateDealModal
        visible={showCreateModal}
        leadId={lead?.id || ''}
        contactId={lead?.contactId || ''}
        contactName={contactName}
        onSave={handleCreateDeal}
        onClose={() => setShowCreateModal(false)}
        isDark={isDark}
        saving={saving}
        defaultValue={lead?.value}
        currencySymbol={currencySymbol}
      />
    </View>
  );
}

// Convert Lead Modal
function ConvertLeadModal({
  visible,
  lead,
  onConvert,
  onClose,
  isDark,
  converting,
  token,
}: {
  visible: boolean;
  lead: Lead | null;
  onConvert: (data: {
    accountName: string;
    accountWebsite?: string;
    accountIndustry?: string;
    createDeal?: boolean;
    dealTitle?: string;
    dealValue?: number;
    existingCompanyId?: string;
  }) => void;
  onClose: () => void;
  isDark: boolean;
  converting: boolean;
  token: string | null;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const [accountName, setAccountName] = useState('');
  const [accountWebsite, setAccountWebsite] = useState('');
  const [accountIndustry, setAccountIndustry] = useState('');
  const [createDeal, setCreateDeal] = useState(true);
  const [dealTitle, setDealTitle] = useState('');
  const [dealValue, setDealValue] = useState('');

  // Company search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [searching, setSearching] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const bgColor = colors.card;
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'white';
  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'white';
  const overlayColor = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)';
  const placeholderColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';

  // Search companies debounced
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await searchCompanies(token, searchQuery, 10);
        if (response.success && response.data) {
          setSearchResults(response.data);
        }
      } catch (err) {
        console.error('Error searching companies:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, token]);

  // Pre-fill from lead data
  useEffect(() => {
    if (visible && lead) {
      if (lead.contact?.company) {
        // If lead has an existing company, pre-select it
        setSelectedCompany({
          id: lead.contact.company.id,
          name: lead.contact.company.name,
          type: 'PROSPECT',
          createdAt: '',
          updatedAt: '',
        } as Company);
        setIsCreatingNew(false);
      } else {
        setSelectedCompany(null);
        setIsCreatingNew(true);
      }
      setAccountName(lead.contact?.company?.name || '');
      setDealTitle(lead.title);
      setDealValue(lead.value?.toString() || '');
    }
  }, [visible, lead]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSearchResults([]);
      setShowCompanyPicker(false);
    }
  }, [visible]);

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    setAccountName(company.name);
    setAccountWebsite(company.website || '');
    setAccountIndustry(company.industry || '');
    setIsCreatingNew(false);
    setShowCompanyPicker(false);
    setSearchQuery('');
    setSearchResults([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCreateNew = () => {
    setSelectedCompany(null);
    setIsCreatingNew(true);
    setAccountName(searchQuery);
    setShowCompanyPicker(false);
    setSearchQuery('');
    setSearchResults([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = () => {
    if (!accountName.trim() && !selectedCompany) {
      Alert.alert('Error', 'Please select an existing account or enter a new account name');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConvert({
      accountName: accountName.trim(),
      accountWebsite: accountWebsite.trim() || undefined,
      accountIndustry: accountIndustry.trim() || undefined,
      createDeal,
      dealTitle: createDeal ? dealTitle.trim() || lead?.title : undefined,
      dealValue: createDeal && dealValue ? parseFloat(dealValue) : undefined,
      existingCompanyId: selectedCompany?.id,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]} onPress={onClose} />
        <View style={[styles.convertModalContent, { backgroundColor: bgColor }]}>
          {/* Header */}
          <View style={[styles.convertModalHeader, { borderBottomColor: borderColor }]}>
            <View style={styles.convertModalHeaderLeft}>
              <View style={styles.convertModalIconWrapper}>
                <LinearGradient
                  colors={['#22c55e', '#16a34a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.convertModalIconGradient}
                >
                  <Ionicons name="swap-horizontal" size={22} color="white" />
                </LinearGradient>
              </View>
              <View>
                <Text style={[styles.convertModalTitle, { color: textColor }]}>Convert Lead</Text>
                <Text style={[styles.convertModalSubtitle, { color: subtitleColor }]}>
                  Create account & deal
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.convertCloseButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
            >
              <Ionicons name="close" size={20} color={subtitleColor} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.convertModalBody}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Account Section Card */}
            <View style={[styles.convertSectionCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.convertSectionHeader}>
                <View style={[styles.convertSectionIcon, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
                  <Ionicons name="business-outline" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.convertSectionTitle, { color: textColor }]}>Account Details</Text>
              </View>

              <View style={styles.convertFormGroup}>
                <Text style={[styles.convertFormLabel, { color: subtitleColor }]}>
                  Account <Text style={{ color: '#ef4444' }}>*</Text>
                </Text>

                {/* Selected Company Display or Search Trigger */}
                {selectedCompany && !showCompanyPicker ? (
                  <TouchableOpacity
                    style={[styles.convertSelectedCompany, { backgroundColor: inputBg, borderColor }]}
                    onPress={() => setShowCompanyPicker(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.convertSelectedCompanyInfo}>
                      <View style={[styles.convertCompanyAvatar, { backgroundColor: colors.primary }]}>
                        <Text style={styles.convertCompanyAvatarText}>
                          {selectedCompany.name.substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.convertSelectedCompanyDetails}>
                        <Text style={[styles.convertSelectedCompanyName, { color: textColor }]} numberOfLines={1}>
                          {selectedCompany.name}
                        </Text>
                        {selectedCompany.industry && (
                          <Text style={[styles.convertSelectedCompanyMeta, { color: subtitleColor }]} numberOfLines={1}>
                            {selectedCompany.industry}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.convertSelectedCompanyActions}>
                      <View style={[styles.convertSelectedCompanyBadge, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
                        <Text style={{ color: '#22c55e', fontSize: 11, fontWeight: '600' }}>Selected</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedCompany(null);
                          setIsCreatingNew(true);
                          setAccountName('');
                          setAccountWebsite('');
                          setAccountIndustry('');
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={[styles.convertClearButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                      >
                        <Ionicons name="close" size={14} color={subtitleColor} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ) : isCreatingNew && accountName && !showCompanyPicker ? (
                  <TouchableOpacity
                    style={[styles.convertSelectedCompany, { backgroundColor: inputBg, borderColor }]}
                    onPress={() => setShowCompanyPicker(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.convertSelectedCompanyInfo}>
                      <View style={[styles.convertCompanyAvatar, { backgroundColor: '#f59e0b' }]}>
                        <Ionicons name="add" size={18} color="white" />
                      </View>
                      <View style={styles.convertSelectedCompanyDetails}>
                        <Text style={[styles.convertSelectedCompanyName, { color: textColor }]} numberOfLines={1}>
                          {accountName}
                        </Text>
                        <Text style={[styles.convertSelectedCompanyMeta, { color: subtitleColor }]}>
                          New account will be created
                        </Text>
                      </View>
                    </View>
                    <View style={styles.convertSelectedCompanyActions}>
                      <View style={[styles.convertSelectedCompanyBadge, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
                        <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '600' }}>New</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setAccountName('');
                          setShowCompanyPicker(true);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={[styles.convertClearButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                      >
                        <Ionicons name="pencil" size={14} color={subtitleColor} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View>
                    {/* Search Input */}
                    <View style={[styles.convertInputWrapper, { backgroundColor: inputBg, borderColor }]}>
                      <Ionicons name="search" size={18} color={subtitleColor} style={styles.convertInputIcon} />
                      <TextInput
                        style={[styles.convertFormInput, { color: textColor }]}
                        value={searchQuery}
                        onChangeText={(text) => {
                          setSearchQuery(text);
                          setShowCompanyPicker(true);
                        }}
                        placeholder="Search or create account..."
                        placeholderTextColor={placeholderColor}
                        autoFocus={showCompanyPicker}
                      />
                      {searching && (
                        <ActivityIndicator size="small" color={subtitleColor} style={{ marginRight: 8 }} />
                      )}
                    </View>

                    {/* Search Results Dropdown */}
                    {showCompanyPicker && (searchResults.length > 0 || searchQuery.length >= 2) && (
                      <View style={[styles.convertCompanyDropdown, { backgroundColor: cardBg, borderColor }]}>
                        {searchResults.length > 0 && (
                          <>
                            <Text style={[styles.convertDropdownLabel, { color: subtitleColor }]}>
                              Existing Accounts
                            </Text>
                            {searchResults.map((company) => (
                              <TouchableOpacity
                                key={company.id}
                                style={[styles.convertCompanyItem, { borderBottomColor: borderColor }]}
                                onPress={() => handleSelectCompany(company)}
                                activeOpacity={0.7}
                              >
                                <View style={[styles.convertCompanyAvatar, { backgroundColor: colors.primary }]}>
                                  <Text style={styles.convertCompanyAvatarText}>
                                    {company.name.substring(0, 2).toUpperCase()}
                                  </Text>
                                </View>
                                <View style={styles.convertCompanyItemInfo}>
                                  <Text style={[styles.convertCompanyItemName, { color: textColor }]} numberOfLines={1}>
                                    {company.name}
                                  </Text>
                                  {company.industry && (
                                    <Text style={[styles.convertCompanyItemMeta, { color: subtitleColor }]} numberOfLines={1}>
                                      {company.industry}
                                    </Text>
                                  )}
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={subtitleColor} />
                              </TouchableOpacity>
                            ))}
                          </>
                        )}

                        {/* Create New Option */}
                        {searchQuery.length >= 2 && (
                          <>
                            {searchResults.length > 0 && (
                              <View style={[styles.convertDropdownDivider, { backgroundColor: borderColor }]} />
                            )}
                            <TouchableOpacity
                              style={styles.convertCreateNewItem}
                              onPress={handleCreateNew}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.convertCompanyAvatar, { backgroundColor: '#22c55e' }]}>
                                <Ionicons name="add" size={18} color="white" />
                              </View>
                              <View style={styles.convertCompanyItemInfo}>
                                <Text style={[styles.convertCompanyItemName, { color: '#22c55e' }]}>
                                  Create "{searchQuery}"
                                </Text>
                                <Text style={[styles.convertCompanyItemMeta, { color: subtitleColor }]}>
                                  Add as new account
                                </Text>
                              </View>
                            </TouchableOpacity>
                          </>
                        )}

                        {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                          <View style={styles.convertNoResults}>
                            <Ionicons name="business-outline" size={24} color={subtitleColor} />
                            <Text style={[styles.convertNoResultsText, { color: subtitleColor }]}>
                              No accounts found
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Show website and industry fields only for new accounts */}
              {isCreatingNew && accountName && !showCompanyPicker && (
                <>
                  <View style={styles.convertFormGroup}>
                    <Text style={[styles.convertFormLabel, { color: subtitleColor }]}>Website</Text>
                    <View style={[styles.convertInputWrapper, { backgroundColor: inputBg, borderColor }]}>
                      <Ionicons name="globe-outline" size={18} color={subtitleColor} style={styles.convertInputIcon} />
                      <TextInput
                        style={[styles.convertFormInput, { color: textColor }]}
                        value={accountWebsite}
                        onChangeText={setAccountWebsite}
                        placeholder="https://example.com"
                        placeholderTextColor={placeholderColor}
                        keyboardType="url"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <View style={[styles.convertFormGroup, { marginBottom: 0 }]}>
                    <Text style={[styles.convertFormLabel, { color: subtitleColor }]}>Industry</Text>
                    <View style={[styles.convertInputWrapper, { backgroundColor: inputBg, borderColor }]}>
                      <Ionicons name="layers-outline" size={18} color={subtitleColor} style={styles.convertInputIcon} />
                      <TextInput
                        style={[styles.convertFormInput, { color: textColor }]}
                        value={accountIndustry}
                        onChangeText={setAccountIndustry}
                        placeholder="e.g., Technology, Healthcare"
                        placeholderTextColor={placeholderColor}
                      />
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Deal Section Card */}
            <View style={[styles.convertSectionCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.convertSectionHeader}>
                <View style={[styles.convertSectionIcon, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
                  <Ionicons name="briefcase-outline" size={18} color="#22c55e" />
                </View>
                <Text style={[styles.convertSectionTitle, { color: textColor }]}>Deal Creation</Text>
              </View>

              {/* Toggle Switch */}
              <TouchableOpacity
                style={[styles.convertToggleRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCreateDeal(!createDeal);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.convertToggleInfo}>
                  <Text style={[styles.convertToggleText, { color: textColor }]}>Create Deal</Text>
                  <Text style={[styles.convertToggleHint, { color: subtitleColor }]}>
                    Also create a deal from this lead
                  </Text>
                </View>
                <View style={[styles.convertSwitch, createDeal && styles.convertSwitchActive]}>
                  <View style={[styles.convertSwitchThumb, createDeal && styles.convertSwitchThumbActive]} />
                </View>
              </TouchableOpacity>

              {createDeal && (
                <View style={styles.convertDealFields}>
                  <View style={styles.convertFormGroup}>
                    <Text style={[styles.convertFormLabel, { color: subtitleColor }]}>Deal Title</Text>
                    <View style={[styles.convertInputWrapper, { backgroundColor: inputBg, borderColor }]}>
                      <Ionicons name="document-text-outline" size={18} color={subtitleColor} style={styles.convertInputIcon} />
                      <TextInput
                        style={[styles.convertFormInput, { color: textColor }]}
                        value={dealTitle}
                        onChangeText={setDealTitle}
                        placeholder="Deal title"
                        placeholderTextColor={placeholderColor}
                      />
                    </View>
                  </View>

                  <View style={[styles.convertFormGroup, { marginBottom: 0 }]}>
                    <Text style={[styles.convertFormLabel, { color: subtitleColor }]}>Deal Value</Text>
                    <View style={[styles.convertInputWrapper, { backgroundColor: inputBg, borderColor }]}>
                      <Ionicons name="cash-outline" size={18} color={subtitleColor} style={styles.convertInputIcon} />
                      <TextInput
                        style={[styles.convertFormInput, { color: textColor }]}
                        value={dealValue}
                        onChangeText={setDealValue}
                        placeholder="0.00"
                        placeholderTextColor={placeholderColor}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.convertModalFooter, { borderTopColor: borderColor, paddingBottom: Math.max(insets.bottom, 20) }]}>
            <TouchableOpacity
              style={[styles.convertCancelButton, { borderColor }]}
              onPress={onClose}
              disabled={converting}
            >
              <Text style={[styles.convertCancelButtonText, { color: subtitleColor }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.convertSubmitButton, converting && styles.convertButtonDisabled, (!accountName.trim() && !selectedCompany) && styles.convertButtonDisabled]}
              onPress={handleSubmit}
              disabled={converting || (!accountName.trim() && !selectedCompany)}
            >
              <LinearGradient
                colors={['#22c55e', '#16a34a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.convertSubmitGradient}
              >
                {converting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <Text style={styles.convertSubmitText}>Convert Lead</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Products tab content
function ProductsTab({
  leadId,
  accessToken,
  isDark,
}: {
  leadId: string;
  accessToken: string | null;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [products, setProducts] = useState<LeadProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addQuantity, setAddQuantity] = useState('1');
  const [addPrice, setAddPrice] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickProductName, setQuickProductName] = useState('');
  const [quickProductPrice, setQuickProductPrice] = useState('');
  const [quickProductSku, setQuickProductSku] = useState('');
  const [creatingProduct, setCreatingProduct] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const sectionTitleColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const emptyIconColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  const emptyTextColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const placeholderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';

  const fetchProducts = useCallback(async () => {
    if (!accessToken || !leadId) return;
    setLoading(true);
    const response = await getLeadProducts(accessToken, leadId);
    if (response.success && response.data) {
      setProducts(response.data);
    }
    setLoading(false);
  }, [accessToken, leadId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Search products with debounce
  useEffect(() => {
    if (!productSearch.trim() || !accessToken) {
      setSearchResults([]);
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      const response = await getProducts(accessToken, { search: productSearch, limit: 10, isActive: true });
      if (response.success && response.data) {
        const linked = new Set(products.map((p) => p.productId));
        setSearchResults((response.data.data || []).filter((p: Product) => !linked.has(p.id)));
      }
      setSearching(false);
    }, 300);
  }, [productSearch, accessToken, products]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductSearch('');
    setSearchResults([]);
    setAddPrice(product.price ? (product.price / 100).toString() : '');
  };

  const handleAddProduct = async () => {
    if (!selectedProduct || !accessToken || !leadId) return;
    const qty = parseInt(addQuantity, 10);
    if (!qty || qty < 1) {
      Alert.alert('Error', 'Quantity must be at least 1');
      return;
    }
    setAdding(true);
    const priceInCents = addPrice ? Math.round(parseFloat(addPrice) * 100) : undefined;
    const response = await addLeadProduct(accessToken, leadId, {
      productId: selectedProduct.id,
      quantity: qty,
      unitPrice: priceInCents,
      notes: addNotes.trim() || undefined,
    });
    if (response.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedProduct(null);
      setAddQuantity('1');
      setAddPrice('');
      setAddNotes('');
      setShowAddProduct(false);
      fetchProducts();
    } else {
      Alert.alert('Error', response.error?.message || 'Failed to add product');
    }
    setAdding(false);
  };

  const handleRemoveProduct = (productId: string, productName: string) => {
    Alert.alert(
      'Remove Product',
      `Remove "${productName}" from this lead?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const response = await removeLeadProduct(accessToken, leadId, productId);
            if (response.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setProducts((prev) => prev.filter((p) => p.id !== productId));
            } else {
              Alert.alert('Error', response.error?.message || 'Failed to remove product');
            }
          },
        },
      ]
    );
  };

  const formatPrice = (value: number, symbol?: string) => {
    return `${symbol || '₹'}${(value / 100).toLocaleString('en-IN')}`;
  };

  const totalValue = products.reduce((sum, p) => {
    const price = p.unitPrice ?? (p as any).product?.price ?? 0;
    return sum + price * p.quantity;
  }, 0);

  if (loading) {
    return (
      <View style={styles.tabContent}>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <View style={[styles.sectionHeaderRow, { marginBottom: 10 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="cube-outline" size={15} color={sectionTitleColor} />
            <Text style={[styles.sectionTitle, { color: sectionTitleColor, marginBottom: 0 }]}>
              Products {products.length > 0 ? `(${products.length})` : ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAddProduct(!showAddProduct);
              setSelectedProduct(null);
              setProductSearch('');
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: showAddProduct ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)') : '#f59e0b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}
          >
            <Ionicons name={showAddProduct ? 'close' : 'add'} size={16} color={showAddProduct ? subtitleColor : 'white'} />
            <Text style={{ color: showAddProduct ? subtitleColor : 'white', fontSize: 12, fontWeight: '600' }}>{showAddProduct ? 'Close' : 'Add'}</Text>
          </TouchableOpacity>
        </View>

        {/* Add Product Form */}
        {showAddProduct && (
          <View style={[styles.addNoteForm, { backgroundColor: cardBg, borderColor }]}>
            {!selectedProduct ? (
              <>
                <TextInput
                  style={[styles.formInput, { backgroundColor: inputBg, color: textColor, borderColor }]}
                  value={productSearch}
                  onChangeText={setProductSearch}
                  placeholder="Search products..."
                  placeholderTextColor={placeholderColor}
                />
                {searching && <ActivityIndicator size="small" color={colors.primary} />}
                {searchResults.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={[styles.productSearchResult, { borderBottomColor: borderColor }]}
                    onPress={() => handleSelectProduct(product)}
                  >
                    <View style={styles.productSearchInfo}>
                      <Text style={[styles.productName, { color: textColor }]}>{product.name}</Text>
                      {product.sku && (
                        <Text style={[{ fontSize: 12, color: subtitleColor }]}>SKU: {product.sku}</Text>
                      )}
                    </View>
                    <Text style={[{ fontSize: 13, fontWeight: '600', color: textColor }]}>
                      {formatPrice(product.price || 0)}
                    </Text>
                  </TouchableOpacity>
                ))}
                {productSearch.trim() && !searching && searchResults.length === 0 && (
                  <View style={{ paddingVertical: 8, gap: 8 }}>
                    <Text style={[{ fontSize: 13, color: subtitleColor, textAlign: 'center' }]}>
                      No products found for "{productSearch}"
                    </Text>
                    {!showQuickCreate ? (
                      <TouchableOpacity
                        onPress={() => {
                          setShowQuickCreate(true);
                          setQuickProductName(productSearch.trim());
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6 }}
                      >
                        <Ionicons name="add-circle" size={18} color={colors.primary} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>Create Quick Product</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[{ padding: 12, borderRadius: 8, borderWidth: 1, gap: 8, backgroundColor: inputBg, borderColor }]}>
                        <Text style={[styles.formLabel, { color: subtitleColor }]}>Product Name *</Text>
                        <TextInput
                          style={[styles.formInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'white', color: textColor, borderColor }]}
                          value={quickProductName}
                          onChangeText={setQuickProductName}
                          placeholder="Product name"
                          placeholderTextColor={placeholderColor}
                          autoFocus
                        />
                        <View style={styles.productFormRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.formLabel, { color: subtitleColor }]}>Price</Text>
                            <TextInput
                              style={[styles.formInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'white', color: textColor, borderColor }]}
                              value={quickProductPrice}
                              onChangeText={setQuickProductPrice}
                              placeholder="0"
                              placeholderTextColor={placeholderColor}
                              keyboardType="decimal-pad"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.formLabel, { color: subtitleColor }]}>SKU</Text>
                            <TextInput
                              style={[styles.formInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'white', color: textColor, borderColor }]}
                              value={quickProductSku}
                              onChangeText={setQuickProductSku}
                              placeholder="Optional"
                              placeholderTextColor={placeholderColor}
                            />
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                            onPress={() => {
                              setShowQuickCreate(false);
                              setQuickProductName('');
                              setQuickProductPrice('');
                              setQuickProductSku('');
                            }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '500', color: textColor }}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.addNoteButton, { backgroundColor: colors.primary }, { flex: 1 }, (!quickProductName.trim() || creatingProduct) && { opacity: 0.5 }]}
                            onPress={async () => {
                              if (!quickProductName.trim() || !accessToken) return;
                              setCreatingProduct(true);
                              const priceInCents = quickProductPrice ? Math.round(parseFloat(quickProductPrice) * 100) : 0;
                              const createResp = await createProduct(accessToken, {
                                name: quickProductName.trim(),
                                price: priceInCents,
                                sku: quickProductSku.trim() || undefined,
                                isActive: true,
                              });
                              if (createResp.success && createResp.data) {
                                // Auto-select the newly created product
                                handleSelectProduct(createResp.data);
                                setShowQuickCreate(false);
                                setQuickProductName('');
                                setQuickProductPrice('');
                                setQuickProductSku('');
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                              } else {
                                Alert.alert('Error', createResp.error?.message || 'Failed to create product');
                              }
                              setCreatingProduct(false);
                            }}
                            disabled={!quickProductName.trim() || creatingProduct}
                          >
                            {creatingProduct ? (
                              <ActivityIndicator size="small" color="white" />
                            ) : (
                              <Text style={styles.addNoteButtonText}>Create & Select</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={[styles.selectedProductBanner, { backgroundColor: '#34343410', borderColor: '#34343430' }]}>
                  <Ionicons name="cube" size={18} color={colors.primary} />
                  <Text style={[{ flex: 1, fontSize: 14, fontWeight: '600', color: textColor }]}>{selectedProduct.name}</Text>
                  <TouchableOpacity onPress={() => setSelectedProduct(null)}>
                    <Ionicons name="close" size={18} color={subtitleColor} />
                  </TouchableOpacity>
                </View>
                <View style={styles.productFormRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel, { color: subtitleColor }]}>Quantity</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: inputBg, color: textColor, borderColor }]}
                      value={addQuantity}
                      onChangeText={(t) => setAddQuantity(t.replace(/[^0-9]/g, ''))}
                      keyboardType="number-pad"
                      placeholder="1"
                      placeholderTextColor={placeholderColor}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel, { color: subtitleColor }]}>Price (optional)</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: inputBg, color: textColor, borderColor }]}
                      value={addPrice}
                      onChangeText={setAddPrice}
                      keyboardType="decimal-pad"
                      placeholder={selectedProduct.price ? (selectedProduct.price / 100).toString() : '0'}
                      placeholderTextColor={placeholderColor}
                    />
                  </View>
                </View>
                <TextInput
                  style={[styles.formInput, { backgroundColor: inputBg, color: textColor, borderColor }]}
                  value={addNotes}
                  onChangeText={setAddNotes}
                  placeholder="Notes (optional)"
                  placeholderTextColor={placeholderColor}
                />
                <TouchableOpacity
                  style={[styles.addNoteButton, { backgroundColor: colors.primary }, adding && { opacity: 0.5 }]}
                  onPress={handleAddProduct}
                  disabled={adding}
                >
                  {adding ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.addNoteButtonText}>Add Product</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {products.length === 0 && !showAddProduct ? (
          <View style={styles.emptyTabContent}>
            <Ionicons name="cube-outline" size={48} color={emptyIconColor} />
            <Text style={[styles.emptyTabText, { color: emptyTextColor }]}>No products linked</Text>
            <Text style={[styles.emptyTabText, { color: emptyTextColor }]}>
              Tap + to add a product
            </Text>
          </View>
        ) : (
          <>
            {products.map((lp) => (
              <View key={lp.id} style={[styles.productItem, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, { color: textColor }]}>
                    {lp.productName || (lp as any).product?.name || 'Product'}
                  </Text>
                  <View style={styles.productMeta}>
                    <Text style={[styles.productQty, { color: subtitleColor }]}>
                      Qty: {lp.quantity}
                    </Text>
                    <Text style={[styles.productPrice, { color: subtitleColor }]}>
                      @ {formatPrice(lp.unitPrice || (lp as any).product?.price || 0)}
                    </Text>
                  </View>
                  {lp.notes && (
                    <Text style={[styles.productNotes, { color: subtitleColor }]} numberOfLines={1}>
                      {lp.notes}
                    </Text>
                  )}
                </View>
                <View style={styles.productRight}>
                  <Text style={[styles.productTotal, { color: textColor }]}>
                    {formatPrice((lp.unitPrice || (lp as any).product?.price || 0) * lp.quantity)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveProduct(lp.id, lp.productName || (lp as any).product?.name || 'Product')}
                    style={styles.productRemove}
                  >
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {products.length > 0 && (
              <View style={[styles.productTotalRow, { borderTopColor: borderColor }]}>
                <Text style={[styles.productTotalLabel, { color: subtitleColor }]}>Total</Text>
                <Text style={[styles.productTotalValue, { color: textColor }]}>
                  {formatPrice(totalValue)}
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      <View style={{ height: 100 }} />
    </View>
  );
}

// Notes tab content
function NotesTab({
  leadId,
  accessToken,
  isDark,
}: {
  leadId: string;
  accessToken: string | null;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [notes, setNotes] = useState<{ id: string; content: string; type: string; createdBy: string; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [saving, setSaving] = useState(false);

  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const sectionTitleColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const emptyIconColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  const emptyTextColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const placeholderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';

  const fetchNotes = useCallback(async () => {
    if (!accessToken || !leadId) return;
    setLoading(true);
    const response = await getLeadNotesEndpoint(accessToken, leadId);
    if (response.success && response.data) {
      setNotes(response.data);
    }
    setLoading(false);
  }, [accessToken, leadId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleAddNote = async () => {
    if (!noteContent.trim() || !accessToken || !leadId) return;
    setSaving(true);
    const response = await addLeadNoteEndpoint(accessToken, leadId, {
      content: noteContent.trim(),
      type: 'GENERAL',
    });
    if (response.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNoteContent('');
      setShowAddNote(false);
      fetchNotes();
    } else {
      Alert.alert('Error', response.error?.message || 'Failed to add note');
    }
    setSaving(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.tabContent}>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <View style={[styles.sectionHeaderRow, { marginBottom: 10 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="chatbox-ellipses-outline" size={15} color={sectionTitleColor} />
            <Text style={[styles.sectionTitle, { color: sectionTitleColor, marginBottom: 0 }]}>
              Notes {notes.length > 0 ? `(${notes.length})` : ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAddNote(!showAddNote);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: showAddNote ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)') : '#8b5cf6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}
          >
            <Ionicons name={showAddNote ? 'close' : 'add'} size={16} color={showAddNote ? subtitleColor : 'white'} />
            <Text style={{ color: showAddNote ? subtitleColor : 'white', fontSize: 12, fontWeight: '600' }}>{showAddNote ? 'Close' : 'Add'}</Text>
          </TouchableOpacity>
        </View>

        {/* Add Note Form */}
        {showAddNote && (
          <View style={[styles.addNoteForm, { backgroundColor: cardBg, borderColor }]}>
            <TextInput
              style={[styles.noteInput, { backgroundColor: inputBg, color: textColor, borderColor }]}
              value={noteContent}
              onChangeText={setNoteContent}
              placeholder="Write a note..."
              placeholderTextColor={placeholderColor}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.addNoteButton, { backgroundColor: colors.primary }, !noteContent.trim() && { opacity: 0.5 }]}
              onPress={handleAddNote}
              disabled={!noteContent.trim() || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.addNoteButtonText}>Add Note</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Notes List */}
        {notes.length === 0 && !showAddNote ? (
          <View style={styles.emptyTabContent}>
            <Ionicons name="document-text-outline" size={48} color={emptyIconColor} />
            <Text style={[styles.emptyTabText, { color: emptyTextColor }]}>No notes yet</Text>
            <Text style={[styles.emptyTabText, { color: emptyTextColor }]}>
              Tap + to add a note
            </Text>
          </View>
        ) : (
          notes.map((note) => (
            <View key={note.id} style={[styles.noteItem, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.noteContent, { color: textColor }]}>{note.content}</Text>
              <View style={styles.noteFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  {note.createdBy && (
                    <Text style={[{ fontSize: 12, fontWeight: '500', color: subtitleColor }]} numberOfLines={1}>
                      {note.createdBy}
                    </Text>
                  )}
                  <Text style={[styles.noteDate, { color: subtitleColor }]}>
                    {note.createdBy ? '· ' : ''}{formatDate(note.createdAt)}
                  </Text>
                </View>
                {note.type && note.type !== 'GENERAL' && (
                  <View style={[styles.noteTypeBadge, { backgroundColor: '#34343420' }]}>
                    <Text style={[styles.noteTypeText, { color: colors.primary }]}>{note.type}</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 100 }} />
    </View>
  );
}

// Metadata tab content
function MetadataTab({
  lead,
  isDark,
}: {
  lead: Lead;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const sectionTitleColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const codeBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const emptyIconColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  const emptyTextColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

  const hasCustomFields = lead.customFieldValues && Object.keys(lead.customFieldValues).length > 0;
  const hasMetadata = lead.metadata && Object.keys(lead.metadata).length > 0;

  if (!hasCustomFields && !hasMetadata) {
    return (
      <View style={styles.tabContent}>
        <View style={styles.emptyTabContent}>
          <Ionicons name="code-slash-outline" size={48} color={emptyIconColor} />
          <Text style={[styles.emptyTabText, { color: emptyTextColor }]}>No metadata</Text>
          <Text style={[styles.emptyTabText, { color: emptyTextColor }]}>
            Metadata is captured from external sources like IndiaMART
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {/* Custom Fields */}
      {hasCustomFields && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>Custom Fields</Text>
          {Object.entries(lead.customFieldValues!).map(([key, value]) => (
            <View key={key} style={[styles.metadataRow, { borderBottomColor: borderColor }]}>
              <Text style={[styles.metadataKey, { color: subtitleColor }]}>{key}</Text>
              <Text style={[styles.metadataValue, { color: textColor }]}>
                {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '-')}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Raw Metadata */}
      {hasMetadata && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>Source Metadata</Text>
          <View style={[styles.codeBlock, { backgroundColor: codeBg }]}>
            <Text style={[styles.codeText, { color: textColor }]}>
              {JSON.stringify(lead.metadata, null, 2)}
            </Text>
          </View>
        </View>
      )}

      <View style={{ height: 100 }} />
    </View>
  );
}

// Quotes tab content
function QuotesTab({
  leadId,
  accessToken,
  isDark,
}: {
  leadId: string;
  accessToken: string | null;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const sectionTitleColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const emptyIconColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  const emptyTextColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

  useEffect(() => {
    const fetchQuotes = async () => {
      if (!accessToken || !leadId) return;
      setLoading(true);
      const response = await getQuotes(accessToken, { leadId, limit: 50 });
      if (response.success && response.data) {
        setQuotes(response.data.data || []);
      }
      setLoading(false);
    };
    fetchQuotes();
  }, [accessToken, leadId]);

  const formatAmount = (amount: number | string, symbol?: string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${symbol || '₹'}${(num / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.tabContent}>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <View style={[styles.sectionHeaderRow, { marginBottom: 10 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="document-text-outline" size={15} color={sectionTitleColor} />
            <Text style={[styles.sectionTitle, { color: sectionTitleColor, marginBottom: 0 }]}>
              Quotes {quotes.length > 0 ? `(${quotes.length})` : ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(tabs)/quotes/create' as any, params: { leadId } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}
          >
            <Ionicons name="add" size={16} color="white" />
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>New</Text>
          </TouchableOpacity>
        </View>

        {quotes.length === 0 ? (
          <View style={styles.emptyTabContent}>
            <Ionicons name="document-text-outline" size={36} color={emptyIconColor} />
            <Text style={[styles.emptyTabText, { color: emptyTextColor }]}>No quotes yet</Text>
          </View>
        ) : (
          quotes.map((quote) => {
            const statusColor = QUOTE_STATUS_COLORS[quote.status] || '#6b7280';
            return (
              <View key={quote.id} style={[styles.recordCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.recordCardHeader}>
                  <Text style={[styles.recordCardNumber, { color: colors.primary }]}>#{quote.quoteNumber}</Text>
                  <View style={[styles.recordStatusBadge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.recordStatusText, { color: statusColor }]}>
                      {QUOTE_STATUS_LABELS[quote.status]}
                    </Text>
                  </View>
                </View>
                {quote.subject && (
                  <Text style={[{ fontSize: 13, color: textColor, marginTop: 4 }]} numberOfLines={1}>{quote.subject}</Text>
                )}
                <View style={styles.recordCardFooter}>
                  <Text style={[styles.recordCardDate, { color: subtitleColor }]}>
                    {formatDate(quote.createdAt)}
                  </Text>
                  <Text style={[styles.recordCardAmount, { color: textColor }]}>
                    {formatAmount(quote.total, quote.currency?.symbol)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
      <View style={{ height: 100 }} />
    </View>
  );
}

// Invoices tab content
function InvoicesTab({
  leadId,
  accessToken,
  isDark,
}: {
  leadId: string;
  accessToken: string | null;
  isDark: boolean;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const sectionTitleColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const emptyIconColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  const emptyTextColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!accessToken || !leadId) return;
      setLoading(true);
      const response = await getInvoices(accessToken, { leadId, limit: 50 });
      if (response.success && response.data) {
        setInvoices(response.data.data || []);
      }
      setLoading(false);
    };
    fetchInvoices();
  }, [accessToken, leadId]);

  const formatAmount = (amount: number | string, symbol?: string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${symbol || '₹'}${(num / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.tabContent}>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <View style={[styles.sectionHeaderRow, { marginBottom: 10 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="receipt-outline" size={15} color={sectionTitleColor} />
            <Text style={[styles.sectionTitle, { color: sectionTitleColor, marginBottom: 0 }]}>
              Invoices {invoices.length > 0 ? `(${invoices.length})` : ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/invoices/create' as any, params: { leadId } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}
          >
            <Ionicons name="add" size={16} color="white" />
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>New</Text>
          </TouchableOpacity>
        </View>

        {invoices.length === 0 ? (
          <View style={styles.emptyTabContent}>
            <Ionicons name="receipt-outline" size={36} color={emptyIconColor} />
            <Text style={[styles.emptyTabText, { color: emptyTextColor }]}>No invoices yet</Text>
          </View>
        ) : (
          invoices.map((invoice) => {
            const statusColor = INVOICE_STATUS_COLORS[invoice.status] || '#6b7280';
            const amountDue = typeof invoice.amountDue === 'string' ? parseFloat(invoice.amountDue) : (invoice.amountDue || 0);
            const total = typeof invoice.total === 'string' ? parseFloat(invoice.total) : (invoice.total || 0);
            const showAmountDue = amountDue > 0 && amountDue !== total;

            return (
              <View key={invoice.id} style={[styles.recordCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.recordCardHeader}>
                  <Text style={[styles.recordCardNumber, { color: colors.primary }]}>#{invoice.invoiceNumber}</Text>
                  <View style={[styles.recordStatusBadge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.recordStatusText, { color: statusColor }]}>
                      {INVOICE_STATUS_LABELS[invoice.status]}
                    </Text>
                  </View>
                </View>
                {invoice.subject && (
                  <Text style={[{ fontSize: 13, color: textColor, marginTop: 4 }]} numberOfLines={1}>{invoice.subject}</Text>
                )}
                <View style={styles.recordCardFooter}>
                  <Text style={[styles.recordCardDate, { color: subtitleColor }]}>
                    Due: {formatDate(invoice.dueDate)}
                  </Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.recordCardAmount, { color: textColor }]}>
                      {formatAmount(invoice.total, invoice.currency?.symbol)}
                    </Text>
                    {showAmountDue && (
                      <Text style={[{ fontSize: 11, color: '#ef4444', fontWeight: '500' }]}>
                        Due: {formatAmount(invoice.amountDue, invoice.currency?.symbol)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>
      <View style={{ height: 100 }} />
    </View>
  );
}

export default function LeadDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken, user } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  // Theme colors
  const gradientColors: [string, string, string] = [colors.background, colors.card, colors.background] as [string, string, string];
  const textColor = colors.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const mutedColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const headerBorderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const buttonBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const quickActionBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const emptyIconColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  const emptyTextColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [stages, setStages] = useState<KanbanStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details'); // kept for compatibility
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Follow-up state
  const [showFollowUpSheet, setShowFollowUpSheet] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [selectedActivityType, setSelectedActivityType] = useState<ActivityType | null>(null);
  const [savingActivity, setSavingActivity] = useState(false);

  // Organization members for owner assignment
  const [members, setMembers] = useState<OrgMember[]>([]);

  // Lead sources
  const [leadSources, setLeadSources] = useState<string[]>([...SOURCES]);

  // Convert lead state
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [converting, setConverting] = useState(false);

  // More actions state
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showMarkLostModal, setShowMarkLostModal] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [qualifyingOrMarking, setQualifyingOrMarking] = useState(false);

  // Visit state
  const [showStartVisitSheet, setShowStartVisitSheet] = useState(false);
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
  const [leadVisits, setLeadVisits] = useState<Visit[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitActionLoading, setVisitActionLoading] = useState(false);

  // Fetch lead sources
  useEffect(() => {
    const fetchSources = async () => {
      if (!accessToken) return;
      try {
        const response = await getLeadSources(accessToken);
        if (response.success && response.data?.labels) {
          setLeadSources(response.data.labels);
        }
      } catch (error) {
        console.error('Failed to fetch lead sources:', error);
      }
    };
    fetchSources();
  }, [accessToken]);

  // Fetch lead
  const fetchLead = useCallback(async () => {
    if (!accessToken || !id) return;

    setLoading(true);
    setError(null);

    const response = await getLead(accessToken, id);

    if (response.success && response.data) {
      setLead(response.data);
    } else {
      setError(response.error?.message || 'Failed to load lead');
    }

    setLoading(false);
    setRefreshing(false);
  }, [accessToken, id]);

  // Fetch stages
  const fetchStages = useCallback(async () => {
    if (!accessToken) return;

    const response = await getKanbanView(accessToken, { limit: 1 });
    if (response.success && response.data) {
      setStages(response.data.stages);
    }
  }, [accessToken]);

  // Fetch organization members for owner assignment
  const fetchMembers = useCallback(async () => {
    if (!accessToken) return;

    const response = await getOrganizationMembers(accessToken, { status: 'ACTIVE', limit: 100 });
    if (response.success && response.data) {
      setMembers(response.data.data || []);
    }
  }, [accessToken]);

  // Fetch activities
  const fetchActivities = useCallback(async () => {
    if (!accessToken || !id) return;

    setActivitiesLoading(true);

    const response = await getLeadActivities(accessToken, id);

    if (response.success && response.data) {
      const activitiesData = Array.isArray(response.data)
        ? response.data
        : (response.data as unknown as { data?: LeadActivity[] }).data || [];
      setActivities(activitiesData);
    }

    setActivitiesLoading(false);
  }, [accessToken, id]);

  // Update lead field
  const handleUpdateField = async (field: keyof UpdateLeadDto, value: unknown) => {
    if (!accessToken || !id || !lead) return;

    setUpdating(true);
    const updateData: UpdateLeadDto = { [field]: value };
    const response = await updateLead(accessToken, id, updateData);

    if (response.success && response.data) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLead(response.data);
    } else {
      Alert.alert('Error', response.error?.message || 'Failed to update lead');
    }

    setUpdating(false);
  };

  // Initial load
  useEffect(() => {
    fetchLead();
    fetchStages();
    fetchMembers();
  }, []);

  // Load activities and visits on mount (single page — no lazy tab loading)
  useEffect(() => {
    if (activities.length === 0) fetchActivities();
    if (leadVisits.length === 0) fetchLeadVisits();
  }, []);

  // Refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLead();
    fetchActivities();
    fetchLeadVisits();
    fetchActiveVisit();
  }, [fetchLead, fetchActivities, fetchLeadVisits, fetchActiveVisit]);

  // Back navigation
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  // Edit
  const handleEdit = () => {
    if (!lead) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(tabs)/leads/create?editId=${lead.id}`);
  };

  // Delete
  const handleDelete = () => {
    if (!lead) return;

    Alert.alert(
      'Delete Lead',
      `Are you sure you want to delete "${lead.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const response = await deleteLead(accessToken, lead.id);
            if (response.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } else {
              Alert.alert('Error', response.error?.message || 'Failed to delete lead');
            }
            setDeleting(false);
          },
        },
      ]
    );
  };

  // Quick actions
  const handleCall = async () => {
    if (lead?.contact?.phone) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Linking.openURL(`tel:${lead.contact.phone}`);
    }
  };

  const handleEmail = async () => {
    if (lead?.contact?.email) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Linking.openURL(`mailto:${lead.contact.email}`);
    }
  };

  const handleWhatsApp = async () => {
    if (lead?.contact?.phone) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const cleanPhone = lead.contact.phone.replace(/\D/g, '');
      await Linking.openURL(`https://wa.me/${cleanPhone}`);
    }
  };

  // Visit handlers
  const fetchActiveVisit = useCallback(async () => {
    if (!accessToken) return;
    try {
      const result = await getActiveVisit(accessToken);
      if (result.success && result.data && result.data.leadId === id) {
        setActiveVisit(result.data);
      } else {
        setActiveVisit(null);
      }
    } catch (error) {
      console.error('Failed to fetch active visit:', error);
    }
  }, [accessToken, id]);

  const fetchLeadVisits = useCallback(async () => {
    if (!accessToken || !id) return;
    setVisitsLoading(true);
    try {
      const result = await getLeadVisits(accessToken, id);
      if (result.success && result.data) {
        setLeadVisits(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch lead visits:', error);
    } finally {
      setVisitsLoading(false);
    }
  }, [accessToken, id]);

  // Load active visit on mount
  useEffect(() => {
    fetchActiveVisit();
  }, [fetchActiveVisit]);

  // Load visits when visits tab is selected

  const handleStartVisitPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowStartVisitSheet(true);
  };

  const handleStartVisit = async (purpose: VisitPurpose) => {
    if (!accessToken || !id) return;

    // Prominent disclosure before requesting location permission (Google Play requirement)
    const userConsent = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Location Access Required',
        'SalesTub will track your location in real-time during this customer visit to:\n\n' +
        '\u2022 Record your visit route for verification\n' +
        '\u2022 Provide live location updates to your manager\n' +
        '\u2022 Calculate distance traveled\n\n' +
        'Location tracking will run in the background while your visit is active and will stop automatically when you end the visit.\n\n' +
        'By continuing, you agree to share your location data with your organization.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Continue', onPress: () => resolve(true) },
        ],
        { cancelable: false },
      );
    });

    if (!userConsent) return;

    setVisitActionLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to start a visit.');
        setVisitActionLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const result = await startVisit(accessToken, {
        leadId: id,
        purpose,
        startLat: location.coords.latitude,
        startLng: location.coords.longitude,
      });
      if (result.success && result.data) {
        setActiveVisit(result.data);
        setShowStartVisitSheet(false);
        fetchLeadVisits();
        // Start direct Firebase location tracking
        const firebaseToken = result.data?.firebaseToken ?? null;
        startLocationTracking(
          result.data.id,
          user?.orgId ?? '',
          firebaseToken,
        ).catch((err) => console.warn('Failed to start location tracking:', err));
      } else {
        Alert.alert('Error', 'Failed to start visit. Please try again.');
      }
    } catch (error) {
      console.error('Failed to start visit:', error);
      Alert.alert('Error', 'Failed to start visit. Please try again.');
    } finally {
      setVisitActionLoading(false);
    }
  };

  const handleCompleteVisit = async () => {
    if (!accessToken || !activeVisit) return;
    setVisitActionLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to complete a visit.');
        setVisitActionLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const result = await completeVisit(accessToken, activeVisit.id, {
        endLat: location.coords.latitude,
        endLng: location.coords.longitude,
      });
      // Stop Firebase location tracking
      await stopLocationTracking();
      if (result.success) {
        setActiveVisit(null);
        fetchLeadVisits();
      } else {
        Alert.alert('Error', 'Failed to complete visit. Please try again.');
      }
    } catch (error) {
      console.error('Failed to complete visit:', error);
      Alert.alert('Error', 'Failed to complete visit. Please try again.');
    } finally {
      setVisitActionLoading(false);
    }
  };

  const handleCancelVisit = async () => {
    if (!accessToken || !activeVisit) return;
    Alert.alert(
      'Cancel Visit',
      'Are you sure you want to cancel this visit?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setVisitActionLoading(true);
            try {
              // Stop Firebase location tracking
              await stopLocationTracking();
              const result = await cancelVisit(accessToken, activeVisit.id);
              if (result.success) {
                setActiveVisit(null);
                fetchLeadVisits();
              } else {
                Alert.alert('Error', 'Failed to cancel visit.');
              }
            } catch (error) {
              console.error('Failed to cancel visit:', error);
              Alert.alert('Error', 'Failed to cancel visit.');
            } finally {
              setVisitActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Follow-up handlers
  const handleFollowUpPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowFollowUpSheet(true);
  };

  const handleSelectActivityType = (type: ActivityType) => {
    setSelectedActivityType(type);
    setShowFollowUpSheet(false);
    setTimeout(() => setShowActivityForm(true), 300);
  };

  const handleSaveActivity = async (data: CreateActivityDto & { reminder?: string }) => {
    if (!accessToken || !id) return;

    setSavingActivity(true);

    // Map frontend reminder values to backend ReminderType enum
    const reminderMap: Record<string, string> = {
      'none': 'NONE',
      'at_time': 'AT_TIME',
      '5min': 'FIVE_MIN',
      '10min': 'TEN_MIN',
      '15min': 'FIFTEEN_MIN',
      '30min': 'THIRTY_MIN',
      '1hour': 'ONE_HOUR',
      '1day': 'ONE_DAY',
    };

    const activityData = {
      ...data,
      reminder: data.reminder ? reminderMap[data.reminder] || 'NONE' : 'NONE',
    };

    const response = await addLeadActivity(accessToken, id, activityData);

    if (response.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowActivityForm(false);
      setSelectedActivityType(null);
      // Refresh activities if on timeline tab
      if (activeTab === 'timeline') {
        fetchActivities();
      }
      Alert.alert('Success', `${data.type.charAt(0) + data.type.slice(1).toLowerCase()} added successfully`);
    } else {
      Alert.alert('Error', response.error?.message || 'Failed to add activity');
    }

    setSavingActivity(false);
  };

  // Convert lead to deal
  const handleConvertLead = async (data: {
    accountName: string;
    accountWebsite?: string;
    accountIndustry?: string;
    createDeal?: boolean;
    dealTitle?: string;
    dealValue?: number;
    existingCompanyId?: string;
  }) => {
    if (!accessToken || !id) return;

    setConverting(true);

    // Pass existingCompanyId if selecting existing company
    const response = await convertLead(accessToken, id, {
      accountName: data.accountName,
      accountWebsite: data.accountWebsite,
      accountIndustry: data.accountIndustry,
      createDeal: data.createDeal,
      dealTitle: data.dealTitle,
      dealValue: data.dealValue,
      // Note: existingCompanyId would need backend support
      // For now, the backend will create/use company by name
    });

    if (response.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowConvertModal(false);
      Alert.alert(
        'Lead Converted',
        data.createDeal
          ? 'Lead has been converted to a contact and deal.'
          : 'Lead has been converted to a contact.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      Alert.alert('Error', response.error?.message || 'Failed to convert lead');
    }

    setConverting(false);
  };

  // Qualify lead
  const handleQualify = async () => {
    if (!accessToken || !lead) return;
    setQualifyingOrMarking(true);
    setShowMoreActions(false);
    const response = await qualifyLead(accessToken, lead.id);
    if (response.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Lead has been qualified.');
      fetchLead();
    } else {
      Alert.alert('Error', response.error?.message || 'Failed to qualify lead');
    }
    setQualifyingOrMarking(false);
  };

  // Mark lead as lost
  const handleMarkLost = async () => {
    if (!accessToken || !lead) return;
    setQualifyingOrMarking(true);
    const response = await markLeadLost(accessToken, lead.id, lostReason.trim() || undefined);
    if (response.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowMarkLostModal(false);
      setLostReason('');
      Alert.alert('Success', 'Lead has been marked as lost.');
      fetchLead();
    } else {
      Alert.alert('Error', response.error?.message || 'Failed to mark lead as lost');
    }
    setQualifyingOrMarking(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error || !lead) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: buttonBg }]} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={[styles.errorTitle, { color: textColor }]}>Failed to load lead</Text>
          <Text style={[styles.errorMessage, { color: subtitleColor }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={fetchLead}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const contactName = lead.contact ? getContactFullName(lead.contact) : null;
  const initials = lead.contact
    ? getContactInitials(lead.contact)
    : lead.title.substring(0, 2).toUpperCase();
  const avatarColor = getAvatarColor(contactName || lead.title);

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      {/* Header — Compact nav bar */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={handleBack} style={{ padding: 6 }}>
            <Ionicons name="chevron-back" size={26} color={textColor} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TouchableOpacity onPress={handleEdit} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="create-outline" size={20} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowMoreActions(true); }} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="ellipsis-horizontal" size={20} color={textColor} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Lead Info — Compact inline */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        {/* Name row */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            width: 44, height: 44, borderRadius: 14,
            backgroundColor: avatarColor,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>{initials}</Text>
          </View>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '500', color: mutedColor }}>{lead.displayId}</Text>
              {lead.stage && (
                <View style={{ backgroundColor: (lead.stage.color || colors.primary) + '18', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: lead.stage.color || colors.primary, textTransform: 'uppercase' }}>{lead.stage.name}</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 17, fontWeight: '700', color: textColor, marginTop: 1 }} numberOfLines={1}>{lead.title}</Text>
            {contactName && <Text style={{ fontSize: 12, color: subtitleColor }}>{contactName}</Text>}
          </View>
        </View>

        {/* Quick Actions — inline row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {lead.contact?.phone && (
              <TouchableOpacity onPress={handleCall} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="call" size={18} color="#22c55e" />
              </TouchableOpacity>
            )}
            {lead.contact?.phone && (
              <TouchableOpacity onPress={handleWhatsApp} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: isDark ? 'rgba(37,211,102,0.12)' : 'rgba(37,211,102,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="logo-whatsapp" size={18} color="#25d366" />
              </TouchableOpacity>
            )}
            {lead.contact?.email && (
              <TouchableOpacity onPress={handleEmail} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="mail" size={17} color={colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleStartVisitPress} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: isDark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="navigate-outline" size={17} color="#8b5cf6" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleFollowUpPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 }}>
            <Ionicons name="add" size={16} color="white" />
            <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>Follow Up</Text>
          </TouchableOpacity>
        </View>
      </View>

        {/* Active Visit Banner */}
        {activeVisit && (
          <ActiveVisitBanner
            visit={activeVisit}
            onComplete={handleCompleteVisit}
            onCancel={handleCancelVisit}
            loading={visitActionLoading}
          />
        )}

      {/* Single Scrollable Page — All Sections */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Details */}
        <DetailsTab lead={lead} isDark={isDark} stages={stages} members={members} leadSources={leadSources} onUpdateField={handleUpdateField} updating={updating} />

        {/* Timeline */}
        <TimelineTab activities={activities} loading={activitiesLoading} isDark={isDark} onRefresh={fetchActivities} />

        {/* Tags */}
        <TagsTab leadId={id} accessToken={accessToken} isDark={isDark} />

        {/* Documents */}
        <DocsTab leadId={id} accessToken={accessToken} isDark={isDark} />

        {/* Deals */}
        <DealsTab lead={lead} accessToken={accessToken} isDark={isDark} onDealCreated={fetchActivities} />

        {/* Products */}
        <ProductsTab leadId={id} accessToken={accessToken} isDark={isDark} />

        {/* Notes */}
        <NotesTab leadId={id} accessToken={accessToken} isDark={isDark} />

        {/* Visits */}
        {leadVisits.length > 0 && (
          <View style={{ padding: 16 }}>
            {leadVisits.map((visit) => (
              <VisitCard key={visit.id} visit={visit} isDark={isDark} />
            ))}
          </View>
        )}

        {/* Quotes */}
        <QuotesTab leadId={id} accessToken={accessToken} isDark={isDark} />

        {/* Invoices */}
        <InvoicesTab leadId={id} accessToken={accessToken} isDark={isDark} />
      </ScrollView>


      {/* Start Visit Sheet */}
      <StartVisitSheet
        visible={showStartVisitSheet}
        onStart={handleStartVisit}
        onClose={() => setShowStartVisitSheet(false)}
        loading={visitActionLoading}
        isDark={isDark}
      />

      {/* FAB Overlay */}
      {fabOpen && (
        <Pressable
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)',
            zIndex: 998,
          }}
          onPress={() => setFabOpen(false)}
        />
      )}

      {/* FAB Menu Items */}
      {fabOpen && (
        <View style={{
          position: 'absolute',
          bottom: (insets.bottom || 0) + 80,
          right: 20,
          zIndex: 999,
          gap: 12,
        }}>
          {[
            { icon: 'briefcase-outline' as const, label: 'Deal', color: '#22c55e', onPress: () => { setFabOpen(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowConvertModal(true); } },
            { icon: 'document-text-outline' as const, label: 'Quotes', color: colors.primary, onPress: () => { setFabOpen(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('quotes'); } },
            { icon: 'receipt-outline' as const, label: 'Invoices', color: '#ef4444', onPress: () => { setFabOpen(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('invoices'); } },
            { icon: 'location-outline' as const, label: 'Log Visit', color: '#8b5cf6', onPress: () => { setFabOpen(false); handleStartVisitPress(); } },
            { icon: 'cube-outline' as const, label: 'Products', color: '#f59e0b', onPress: () => { setFabOpen(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('products'); } },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={item.onPress}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 12,
              }}
            >
              <View style={{
                backgroundColor: colors.card,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 6,
                elevation: 4,
                minWidth: 90,
                alignItems: 'center',
              }}>
                <Text style={{ color: item.color, fontSize: 14, fontWeight: '600' }}>{item.label}</Text>
              </View>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: item.color,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 6,
              }}>
                <Ionicons name={item.icon} size={22} color="white" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* FAB Button */}
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setFabOpen(!fabOpen);
        }}
        activeOpacity={0.85}
        style={{
          position: 'absolute',
          bottom: (insets.bottom || 0) + 20,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: fabOpen ? '#ef4444' : colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
          zIndex: 999,
        }}
      >
        <Ionicons name={fabOpen ? 'close' : 'add'} size={28} color="white" />
      </TouchableOpacity>

      {/* Follow-up Action Sheet */}
      <FollowUpActionSheet
        visible={showFollowUpSheet}
        onSelect={handleSelectActivityType}
        onClose={() => setShowFollowUpSheet(false)}
        isDark={isDark}
      />

      {/* Activity Form Modal */}
      <ActivityFormModal
        visible={showActivityForm}
        activityType={selectedActivityType}
        onSave={handleSaveActivity}
        onClose={() => {
          setShowActivityForm(false);
          setSelectedActivityType(null);
        }}
        isDark={isDark}
        saving={savingActivity}
      />

      {/* Convert Lead Modal */}
      <ConvertLeadModal
        visible={showConvertModal}
        lead={lead}
        onConvert={handleConvertLead}
        onClose={() => setShowConvertModal(false)}
        isDark={isDark}
        converting={converting}
        token={accessToken}
      />

      {/* More Actions Modal */}
      <Modal visible={showMoreActions} transparent animationType="fade" onRequestClose={() => setShowMoreActions(false)}>
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)' }]}
          onPress={() => setShowMoreActions(false)}
        >
          <Pressable style={[styles.moreActionsContent, { backgroundColor: colors.card }]}>
            <View style={[styles.actionSheetHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }]} />
            <Text style={[styles.actionSheetTitle, { color: textColor }]}>Lead Actions</Text>

            {/* Convert to Deal */}
            <TouchableOpacity
              style={[styles.moreActionItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
              onPress={() => {
                setShowMoreActions(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowConvertModal(true);
              }}
            >
              <View style={[styles.moreActionIcon, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
                <Ionicons name="swap-horizontal" size={20} color="#22c55e" />
              </View>
              <View style={styles.moreActionText}>
                <Text style={[styles.moreActionLabel, { color: textColor }]}>Convert Lead</Text>
                <Text style={[styles.moreActionDesc, { color: subtitleColor }]}>Convert to contact and deal</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={subtitleColor} />
            </TouchableOpacity>

            {/* Qualify Lead */}
            {lead.stage?.type === 'OPEN' && (
              <TouchableOpacity
                style={[styles.moreActionItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                onPress={() => {
                  Alert.alert(
                    'Qualify Lead',
                    `Mark "${lead.title}" as qualified?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Qualify', onPress: handleQualify },
                    ]
                  );
                }}
                disabled={qualifyingOrMarking}
              >
                <View style={[styles.moreActionIcon, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                </View>
                <View style={styles.moreActionText}>
                  <Text style={[styles.moreActionLabel, { color: textColor }]}>Qualify Lead</Text>
                  <Text style={[styles.moreActionDesc, { color: subtitleColor }]}>Move to qualified stage</Text>
                </View>
                {qualifyingOrMarking ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={subtitleColor} />
                )}
              </TouchableOpacity>
            )}

            {/* Mark as Lost */}
            {lead.stage?.type !== 'CLOSED_LOST' && (
              <TouchableOpacity
                style={[styles.moreActionItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                onPress={() => {
                  setShowMoreActions(false);
                  setTimeout(() => setShowMarkLostModal(true), 300);
                }}
              >
                <View style={[styles.moreActionIcon, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </View>
                <View style={styles.moreActionText}>
                  <Text style={[styles.moreActionLabel, { color: textColor }]}>Mark as Lost</Text>
                  <Text style={[styles.moreActionDesc, { color: subtitleColor }]}>Close lead with reason</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={subtitleColor} />
              </TouchableOpacity>
            )}

            {/* Delete */}
            <TouchableOpacity
              style={[styles.moreActionItem, { borderBottomColor: 'transparent' }]}
              onPress={() => {
                setShowMoreActions(false);
                handleDelete();
              }}
              disabled={deleting}
            >
              <View style={[styles.moreActionIcon, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </View>
              <View style={styles.moreActionText}>
                <Text style={[styles.moreActionLabel, { color: '#ef4444' }]}>Delete Lead</Text>
                <Text style={[styles.moreActionDesc, { color: subtitleColor }]}>Permanently remove this lead</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={subtitleColor} />
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              style={[styles.actionSheetCancelButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', marginTop: 12 }]}
              onPress={() => setShowMoreActions(false)}
            >
              <Text style={[styles.actionSheetCancelText, { color: textColor }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Mark Lost Modal */}
      <Modal visible={showMarkLostModal} transparent animationType="slide" onRequestClose={() => setShowMarkLostModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)' }]}
            onPress={() => setShowMarkLostModal(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Mark Lead as Lost</Text>
              <TouchableOpacity onPress={() => setShowMarkLostModal(false)}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            <View style={styles.inputModalBody}>
              <Text style={[{ fontSize: 13, color: subtitleColor, marginBottom: 8 }]}>
                Reason (optional)
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    color: textColor,
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    minHeight: 80,
                    textAlignVertical: 'top',
                  },
                ]}
                value={lostReason}
                onChangeText={setLostReason}
                placeholder="Why was this lead lost?"
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={[styles.modalSaveButton, { backgroundColor: colors.primary }, { backgroundColor: '#ef4444' }, qualifyingOrMarking && { opacity: 0.5 }]}
                onPress={handleMarkLost}
                disabled={qualifyingOrMarking}
              >
                {qualifyingOrMarking ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalSaveButtonText}>Mark as Lost</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 0,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  leadInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#252525',
    fontSize: 20,
    fontWeight: 'bold',
  },
  leadDetails: {
    marginLeft: 16,
    flex: 1,
  },
  displayId: {
    fontSize: 12,
    fontWeight: '500',
  },
  leadTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  contactNameSmall: {
    fontSize: 14,
    marginTop: 2,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    gap: 6,
  },
  followUpButtonText: {
    color: '#252525',
    fontSize: 14,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContent: {
    padding: 16,
    paddingBottom: 0,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
    paddingLeft: 2,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusItem: {
    width: '47%',
    borderRadius: 12,
    padding: 12,
  },
  statusItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusLabel: {
    fontSize: 12,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600',
  },
  updatingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  updatingText: {
    fontSize: 13,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
  },
  ownerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ownerAvatarText: {
    color: '#252525',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 15,
    fontWeight: '600',
  },
  ownerEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  contactCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 14,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  contactAvatarText: {
    color: '#252525',
    fontSize: 18,
    fontWeight: 'bold',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
  },
  contactTitle: {
    fontSize: 13,
    marginTop: 2,
  },
  contactEmail: {
    color: Colors.light.primary,
    fontSize: 13,
    marginTop: 4,
  },
  contactPhone: {
    color: '#22c55e',
    fontSize: 13,
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 14,
    paddingBottom: 14,
  },
  activityIcon: {
    width: 34,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  activityDescription: {
    fontSize: 13,
    marginTop: 4,
  },
  activityDate: {
    fontSize: 11,
    marginTop: 6,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTab: {
  },
  emptyTabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyTabText: {
    fontSize: 13,
    marginTop: 8,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  retryButtonText: {
    color: '#252525',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalList: {
    paddingHorizontal: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  modalOptionText: {
    fontSize: 16,
    flex: 1,
  },
  optionColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  inputModalBody: {
    padding: 20,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  modalSaveButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    color: '#252525',
    fontSize: 16,
    fontWeight: '600',
  },
  // FAB styles
  fab: {
    position: 'absolute',
    right: 20,
    borderRadius: 28,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    gap: 8,
  },
  fabText: {
    color: '#252525',
    fontSize: 16,
    fontWeight: '600',
  },
  // Action Sheet styles
  actionSheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  actionSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  actionSheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionSheetSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  actionSheetOptions: {
    paddingHorizontal: 20,
  },
  actionSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  actionSheetIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionSheetOptionText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  actionSheetCancelButton: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionSheetCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Activity Form styles
  activityFormContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  activityFormHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityFormIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityFormBody: {
    padding: 20,
    maxHeight: 400,
  },
  activityFormFooter: {
    padding: 20,
    paddingTop: 0,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  formTextArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  formSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  formSelectText: {
    fontSize: 16,
    flex: 1,
  },
  formSubmitButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  formSubmitButtonDisabled: {
    opacity: 0.6,
  },
  formSubmitButtonText: {
    color: '#252525',
    fontSize: 16,
    fontWeight: '600',
  },
  // Date/Time Picker styles
  datePickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    borderRadius: 14,
    padding: 20,
    width: '85%',
  },
  datePickerDone: {
    backgroundColor: Colors.light.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  datePickerDoneText: {
    color: '#252525',
    fontSize: 16,
    fontWeight: '600',
  },
  // Reminder Picker styles
  reminderPickerContainer: {
    borderRadius: 14,
    padding: 20,
    width: '85%',
  },
  reminderPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  reminderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  reminderOptionText: {
    fontSize: 16,
  },
  // Tag Picker Modal styles
  tagPickerContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
  },
  tagPickerHeader: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  tagPickerHeaderContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  tagPickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#252525',
    marginBottom: 4,
  },
  tagPickerSubtitle: {
    fontSize: 13,
    color: '#454545',
  },
  tagPickerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagPickerSearchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  tagPickerSearchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  tagPickerSearchIconWrapper: {
    padding: 8,
  },
  tagPickerSearchText: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  tagPickerSearchClear: {
    padding: 8,
  },
  tagLoadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  tagLoadingText: {
    fontSize: 14,
  },
  tagPickerList: {
    maxHeight: 320,
  },
  tagPickerSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 4,
  },
  tagPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  tagPickerItemSelected: {
    borderColor: 'rgba(34,197,94,0.3)',
  },
  tagPickerItemColor: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tagPickerItemInfo: {
    flex: 1,
  },
  tagPickerItemName: {
    fontSize: 15,
    fontWeight: '500',
  },
  tagPickerItemDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  tagPickerItemCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagPickerItemCheckboxSelected: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  tagPickerEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  tagPickerEmptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  tagPickerEmptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  tagPickerEmptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  tagPickerFooter: {
    borderTopWidth: 1,
    padding: 16,
    marginTop: 8,
  },
  tagPickerCreateBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  tagPickerCreateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  tagPickerCreateBtnIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(59,130,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagPickerCreateBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  tagPickerCreateForm: {
    gap: 12,
  },
  tagPickerCreateFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tagPickerCreateFormTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  tagPickerCreateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingRight: 14,
    overflow: 'hidden',
  },
  tagPickerCreateInputPreview: {
    width: 6,
    height: '100%',
  },
  tagPickerCreateInputText: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  tagPickerColorLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  tagPickerColorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tagPickerColorOption: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagPickerColorOptionSelected: {
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  tagPickerColorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagPickerColorDotSelected: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  tagPickerCreateActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  tagPickerCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  tagPickerCancelBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tagPickerSaveBtn: {
    flex: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tagPickerSaveBtnDisabled: {
    opacity: 0.6,
  },
  tagPickerSaveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tagPickerSaveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#252525',
  },
  // Tags Tab styles
  tagsTabContainer: {
    
    padding: 16,
  },
  tagsTabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  tagsTabHeaderIcon: {
    marginRight: 12,
  },
  tagsTabIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsTabHeaderInfo: {
    flex: 1,
  },
  tagsTabHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  tagsTabHeaderSubtitle: {
    fontSize: 13,
  },
  tagsTabManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  tagsTabManageBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.primary,
  },
  tagsTabEmptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  tagsTabEmptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  tagsTabEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  tagsTabEmptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  tagsTabAddBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  tagsTabAddBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
  },
  tagsTabAddBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#252525',
  },
  tagsTabGrid: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  tagsTabGridLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  tagsTabChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  tagsTabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagsTabChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  tagsTabChipText: {
    fontSize: 13,
    fontWeight: '500',
    marginRight: 8,
  },
  tagsTabChipClose: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsTabAddMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  tagsTabAddMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.primary,
  },
  // Documents Tab styles
  docsTabContainer: {
    
    padding: 16,
  },
  docsTabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  docsTabHeaderIcon: {
    marginRight: 12,
  },
  docsTabIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docsTabHeaderInfo: {
    flex: 1,
  },
  docsTabHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  docsTabHeaderSubtitle: {
    fontSize: 13,
  },
  docsTabUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  docsTabUploadBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8b5cf6',
  },
  docsTabEmptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  docsTabEmptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  docsTabEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  docsTabEmptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  docsTabAddBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  docsTabAddBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
  },
  docsTabAddBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#252525',
  },
  docsTabList: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  docsTabListLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  docsTabListItems: {
    gap: 10,
    marginBottom: 16,
  },
  docsTabAddMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  docsTabAddMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8b5cf6',
  },
  // Document Item styles
  docItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  docItemIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  docItemTypeBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  docItemTypeBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#252525',
    letterSpacing: 0.3,
  },
  docItemContent: {
    flex: 1,
  },
  docItemName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  docItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docItemMetaText: {
    fontSize: 12,
  },
  docItemMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 6,
  },
  docItemActions: {
    flexDirection: 'row',
    gap: 6,
  },
  docItemActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Upload Modal styles
  uploadModalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  uploadModalHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  uploadModalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  uploadModalHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#252525',
  },
  uploadModalSubtitle: {
    fontSize: 13,
    color: '#454545',
    marginTop: 2,
  },
  uploadModalOptions: {
    padding: 16,
    gap: 10,
  },
  uploadModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  uploadModalOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  uploadModalOptionInfo: {
    flex: 1,
  },
  uploadModalOptionTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  uploadModalOptionDesc: {
    fontSize: 12,
  },
  uploadModalCancelBtn: {
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  uploadModalCancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
  // Convert Modal styles
  convertModalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  convertModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  convertModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  convertModalIconWrapper: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  convertModalIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convertModalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  convertModalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  convertCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convertModalBody: {
    padding: 16,
  },
  convertSectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  convertSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  convertSectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convertSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  convertFormGroup: {
    marginBottom: 14,
  },
  convertFormLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  convertInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  convertInputIcon: {
    marginRight: 10,
  },
  convertFormInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
  },
  convertToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  convertToggleInfo: {
    flex: 1,
  },
  convertToggleText: {
    fontSize: 15,
    fontWeight: '600',
  },
  convertToggleHint: {
    fontSize: 12,
    marginTop: 2,
  },
  convertSwitch: {
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(120,120,128,0.2)',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  convertSwitchActive: {
    backgroundColor: '#22c55e',
  },
  convertSwitchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  convertSwitchThumbActive: {
    transform: [{ translateX: 22 }],
  },
  convertDealFields: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  convertModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  convertCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convertCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  convertSubmitButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  convertSubmitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  convertSubmitText: {
    color: '#252525',
    fontSize: 15,
    fontWeight: '600',
  },
  convertButtonDisabled: {
    opacity: 0.5,
  },
  // Company search/select styles
  convertSelectedCompany: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  convertSelectedCompanyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  convertCompanyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convertCompanyAvatarText: {
    color: '#252525',
    fontSize: 13,
    fontWeight: '700',
  },
  convertSelectedCompanyDetails: {
    flex: 1,
  },
  convertSelectedCompanyName: {
    fontSize: 15,
    fontWeight: '600',
  },
  convertSelectedCompanyMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  convertSelectedCompanyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  convertSelectedCompanyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  convertClearButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convertCompanyDropdown: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: 280,
  },
  convertDropdownLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  convertCompanyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderBottomWidth: 1,
  },
  convertCompanyItemInfo: {
    flex: 1,
  },
  convertCompanyItemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  convertCompanyItemMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  convertDropdownDivider: {
    height: 1,
    marginHorizontal: 14,
    marginVertical: 4,
  },
  convertCreateNewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  convertNoResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  convertNoResultsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Tabs scroll styles
  tabsScroll: {
    flexGrow: 0,
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
  },
  // Deals Tab styles
  dealsTabContainer: {
    
    padding: 16,
  },
  dealsTabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  dealsTabHeaderIcon: {
    marginRight: 12,
  },
  dealsTabIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealsTabHeaderInfo: {
    flex: 1,
  },
  dealsTabHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  dealsTabHeaderSubtitle: {
    fontSize: 13,
  },
  dealsTabAddBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  dealsTabAddBtnGradient: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealsStatsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  dealsStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  dealsStatValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  dealsStatLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dealsStatDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 8,
  },
  dealsEmptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  dealsEmptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dealsEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  dealsEmptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  dealsCreateBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  dealsCreateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
  },
  dealsCreateBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#252525',
  },
  dealsList: {
    gap: 12,
  },
  dealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dealStageIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  dealItemContent: {
    flex: 1,
    marginLeft: 8,
  },
  dealItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dealItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  dealItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  dealItemBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dealStageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  dealStageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dealStageBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  dealStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dealStatusBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  dealItemValue: {
    alignItems: 'flex-end',
  },
  dealValueText: {
    fontSize: 16,
    fontWeight: '700',
  },
  dealItemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dealMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dealMetaText: {
    fontSize: 12,
  },
  dealDeleteBtn: {
    padding: 8,
    marginLeft: 8,
  },
  // No contact state for deals
  dealsNoContactContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  dealsNoContactIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dealsNoContactTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  dealsNoContactText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  dealsNoContactHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  dealsNoContactHintText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  // Create Deal Modal styles
  createDealOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  createDealKeyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  createDealContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  createDealHeader: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  createDealHeaderContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  createDealTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#252525',
    marginBottom: 4,
  },
  createDealSubtitle: {
    fontSize: 13,
    color: '#454545',
  },
  createDealCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createDealForm: {
    padding: 16,
  },
  createDealField: {
    marginBottom: 16,
  },
  createDealLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  createDealInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  createDealValueInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  createDealCurrency: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  createDealValueText: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  createDealDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  createDealDateText: {
    flex: 1,
    fontSize: 15,
  },
  createDealTextarea: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 80,
  },
  createDealSaveBtn: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createDealSaveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  createDealSaveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#252525',
  },
  // Products tab styles
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
  },
  productMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  productQty: {
    fontSize: 13,
  },
  productPrice: {
    fontSize: 13,
  },
  productNotes: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  productRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  productTotal: {
    fontSize: 15,
    fontWeight: '700',
  },
  productRemove: {
    padding: 2,
  },
  productTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 4,
  },
  productTotalLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  productTotalValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Notes tab styles
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addNoteForm: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
    gap: 10,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
  },
  addNoteButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addNoteButtonText: {
    color: '#252525',
    fontSize: 14,
    fontWeight: '600',
  },
  noteItem: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  noteContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteDate: {
    fontSize: 12,
  },
  noteTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  noteTypeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  // Metadata tab styles
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  metadataKey: {
    fontSize: 13,
    flex: 1,
  },
  metadataValue: {
    fontSize: 13,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  codeBlock: {
    padding: 12,
    borderRadius: 8,
  },
  codeText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  // More actions styles
  moreActionsContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  moreActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 14,
  },
  moreActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreActionText: {
    flex: 1,
    gap: 2,
  },
  moreActionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  moreActionDesc: {
    fontSize: 12,
  },
  // Product search/add styles
  productSearchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  productSearchInfo: {
    flex: 1,
    gap: 2,
  },
  selectedProductBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  productFormRow: {
    flexDirection: 'row',
    gap: 10,
  },
  // Fixed bottom action bar
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  bottomBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  bottomBarButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Details grid layout (2-column)
  detailsGrid: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  detailsRow: {
    flexDirection: 'row',
  },
  detailsCell: {
    flex: 1,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.04)',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(0,0,0,0.04)',
  },
  detailsCellLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  detailsCellValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  inquiryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  inquiryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  companyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  companyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requirementsCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    lineHeight: 22,
  },
  // Score badge style
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  // Contact address
  contactAddressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  // Record cards (quotes, invoices)
  recordCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    gap: 2,
  },
  recordCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordCardNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  recordStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recordStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  recordCardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  recordCardDate: {
    fontSize: 12,
  },
  recordCardAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Activity metadata styles
  activityMetaBox: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
});
