import { useState, useEffect, useCallback } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { getLead, deleteLead, getLeadActivities, updateLead, getKanbanView, addLeadActivity, getLeadSources, getAllTags, getLeadTags, addLeadTags, removeLeadTags, createTag, getLeadDocuments, uploadLeadDocument, deleteLeadDocument, convertLead } from '@/lib/api/leads';
import { searchCompanies, createCompany } from '@/lib/api/companies';
import type { Company, CreateCompanyDto } from '@/types/company';
import { getOrganizationMembers, getMemberDisplayName, type OrgMember } from '@/lib/api/organization';
import { LeadStatusBadge, ScoreIndicator, SourceBadge } from '@/components/leads/LeadStatusBadge';
import type { Lead, LeadActivity, KanbanStage, UpdateLeadDto, CreateActivityDto, LeadTag, LeadDocument } from '@/types/lead';
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
  { type: 'EMAIL', label: 'Log Email', icon: 'mail-outline', color: '#3b82f6' },
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
  const textColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const activeTextColor = isDark ? 'white' : Colors.light.foreground;

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

// Activity item component
function ActivityItem({ activity, isDark }: { activity: LeadActivity; isDark: boolean }) {
  const color = ACTIVITY_TYPE_COLORS[activity.type];
  const iconName = ACTIVITY_TYPE_ICONS[activity.type] as keyof typeof Ionicons.glyphMap;
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const mutedColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';

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

  return (
    <View style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={iconName} size={16} color={color} />
      </View>
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Text style={[styles.activityTitle, { color: textColor }]}>{activity.title}</Text>
          {activity.status === 'COMPLETED' ? (
            <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
          ) : (
            <Ionicons name="ellipse-outline" size={16} color="#f59e0b" />
          )}
        </View>
        {activity.description && (
          <Text style={[styles.activityDescription, { color: subtitleColor }]} numberOfLines={2}>
            {activity.description}
          </Text>
        )}
        <Text style={[styles.activityDate, { color: mutedColor }]}>{formatDate(activity.createdAt)}</Text>
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
  const bgColor = isDark ? '#1e293b' : 'white';
  const textColor = isDark ? 'white' : Colors.light.foreground;
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
                  <Ionicons name="checkmark" size={20} color="#3b82f6" />
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
  const [inputValue, setInputValue] = useState(value);
  const bgColor = isDark ? '#1e293b' : 'white';
  const textColor = isDark ? 'white' : Colors.light.foreground;
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
              style={styles.modalSaveButton}
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
  const bgColor = isDark ? '#1e293b' : 'white';
  const textColor = isDark ? 'white' : Colors.light.foreground;
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [duration, setDuration] = useState('30');
  const [reminder, setReminder] = useState('1hour');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);

  const bgColor = isDark ? '#1e293b' : 'white';
  const textColor = isDark ? 'white' : Colors.light.foreground;
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
      setReminder('1hour');
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
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

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
              <Text style={[styles.formLabel, { color: subtitleColor }]}>Title *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: inputBg, color: textColor, borderColor }]}
                value={title}
                onChangeText={setTitle}
                placeholder={`Enter ${activityOption?.label.toLowerCase()} title...`}
                placeholderTextColor={placeholderColor}
              />
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
                  onChangeText={setDuration}
                  placeholder="30"
                  placeholderTextColor={placeholderColor}
                  keyboardType="numeric"
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
              style={[styles.formSubmitButton, saving && styles.formSubmitButtonDisabled]}
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

        {/* Date Picker */}
        {showDatePicker && (
          <Modal transparent animationType="fade">
            <Pressable style={[styles.datePickerOverlay, { backgroundColor: overlayColor }]} onPress={() => setShowDatePicker(false)}>
              <View style={[styles.datePickerContainer, { backgroundColor: bgColor }]}>
                <DateTimePicker
                  value={dueDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, date) => {
                    if (date) setDueDate(date);
                  }}
                  textColor={textColor}
                />
                <TouchableOpacity
                  style={styles.datePickerDone}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Modal>
        )}

        {/* Time Picker */}
        {showTimePicker && (
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
                  style={styles.datePickerDone}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Modal>
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
                      <Ionicons name="checkmark" size={20} color="#3b82f6" />
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
  const [showStagePicker, setShowStagePicker] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showValueInput, setShowValueInput] = useState(false);
  const [showScoreInput, setShowScoreInput] = useState(false);
  const [showOwnerPicker, setShowOwnerPicker] = useState(false);

  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const sectionTitleColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  const contactName = lead.contact ? getContactFullName(lead.contact) : null;
  const initials = lead.contact
    ? getContactInitials(lead.contact)
    : lead.title.substring(0, 2).toUpperCase();
  const avatarColor = getAvatarColor(contactName || lead.title);

  const formatValue = (value?: number): string => {
    if (!value) return 'Not set';
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
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Status Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>Status</Text>
          <View style={styles.statusGrid}>
            <EditableStatusItem label="Stage" onPress={() => setShowStagePicker(true)} isDark={isDark}>
              <LeadStatusBadge stage={lead.stage} size="medium" />
            </EditableStatusItem>
            <EditableStatusItem label="Source" onPress={() => setShowSourcePicker(true)} isDark={isDark}>
              <SourceBadge source={lead.source} size="medium" />
            </EditableStatusItem>
            <EditableStatusItem label="Value" onPress={() => setShowValueInput(true)} isDark={isDark}>
              <Text style={[styles.statusValue, { color: textColor }]}>{formatValue(lead.value)}</Text>
            </EditableStatusItem>
            <EditableStatusItem label="Score" onPress={() => setShowScoreInput(true)} isDark={isDark}>
              <View style={styles.scoreContainer}>
                <ScoreIndicator score={lead.score} size={10} />
                <Text style={[styles.scoreText, { color: textColor }]}>{lead.score || 0}</Text>
              </View>
            </EditableStatusItem>
          </View>
          {updating && (
            <View style={styles.updatingIndicator}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={[styles.updatingText, { color: subtitleColor }]}>Saving...</Text>
            </View>
          )}
        </View>

        {/* Owner Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>Owner</Text>
          <TouchableOpacity
            style={[styles.ownerCard, { backgroundColor: cardBg }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowOwnerPicker(true);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.ownerAvatar, { backgroundColor: '#8b5cf6' }]}>
              <Text style={styles.ownerAvatarText}>
                {lead.owner.userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.ownerInfo}>
              <Text style={[styles.ownerName, { color: textColor }]}>{lead.owner.userName}</Text>
              <Text style={[styles.ownerEmail, { color: subtitleColor }]}>{lead.owner.userEmail}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={subtitleColor} />
          </TouchableOpacity>
        </View>

        {/* Contact Section */}
        {lead.contact && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>Contact</Text>
            <View style={[styles.contactCard, { backgroundColor: cardBg }]}>
              <View style={[styles.contactAvatar, { backgroundColor: avatarColor }]}>
                <Text style={styles.contactAvatarText}>{initials}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: textColor }]}>{contactName}</Text>
                {lead.contact.title && (
                  <Text style={[styles.contactTitle, { color: subtitleColor }]}>{lead.contact.title}</Text>
                )}
                {lead.contact.email && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`mailto:${lead.contact!.email}`)}
                  >
                    <Text style={styles.contactEmail}>{lead.contact.email}</Text>
                  </TouchableOpacity>
                )}
                {lead.contact.phone && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${lead.contact!.phone}`)}
                  >
                    <Text style={styles.contactPhone}>{lead.contact.phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Description */}
        {lead.description && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>Description</Text>
            <Text style={[styles.description, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }]}>{lead.description}</Text>
          </View>
        )}

        {/* Timestamps */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>Info</Text>
          <View style={[styles.infoRow, { borderBottomColor: borderColor }]}>
            <Text style={[styles.infoLabel, { color: subtitleColor }]}>Created</Text>
            <Text style={[styles.infoValue, { color: textColor }]}>{formatDate(lead.createdAt)}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: borderColor }]}>
            <Text style={[styles.infoLabel, { color: subtitleColor }]}>Updated</Text>
            <Text style={[styles.infoValue, { color: textColor }]}>{formatDate(lead.updatedAt)}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

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
    </>
  );
}

// Timeline tab content
function TimelineTab({
  activities,
  loading,
  isDark,
}: {
  activities: LeadActivity[];
  loading: boolean;
  isDark: boolean;
}) {
  const emptyIconColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  const emptyTextColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

  if (loading) {
    return (
      <View style={styles.loadingTab}>
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  }

  const activityList = activities || [];

  if (activityList.length === 0) {
    return (
      <View style={styles.emptyTab}>
        <Ionicons name="time-outline" size={48} color={emptyIconColor} />
        <Text style={[styles.emptyTabText, { color: emptyTextColor }]}>No activities yet</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {activityList.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} isDark={isDark} />
      ))}
      <View style={{ height: 100 }} />
    </ScrollView>
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
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');

  const bgColor = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'white';
  const textColor = isDark ? 'white' : Colors.light.foreground;
  const subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'white';
  const overlayColor = isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)';
  const placeholderColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';

  const TAG_COLORS = [
    { color: '#3b82f6', name: 'Blue' },
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
    setNewTagColor('#3b82f6');
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
            colors={['#3b82f6', '#6366f1']}
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
              <ActivityIndicator size="small" color="#3b82f6" />
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
                    <Ionicons name="add" size={20} color="#3b82f6" />
                  </View>
                  <Text style={styles.tagPickerCreateBtnText}>Create New Tag</Text>
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
                      colors={newTagName.trim() ? ['#3b82f6', '#2563eb'] : ['#94a3b8', '#94a3b8']}
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
  const [allTags, setAllTags] = useState<LeadTag[]>([]);
  const [leadTags, setLeadTags] = useState<LeadTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [updating, setUpdating] = useState(false);

  const textColor = isDark ? 'white' : Colors.light.foreground;
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

  if (loading) {
    return (
      <View style={styles.loadingTab}>
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  }

  const selectedTagIds = new Set(leadTags.map(t => t.id));

  return (
    <View style={styles.tagsTabContainer}>
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={[styles.tagsTabHeader, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.tagsTabHeaderIcon}>
            <LinearGradient
              colors={['rgba(59,130,246,0.15)', 'rgba(99,102,241,0.15)']}
              style={styles.tagsTabIconGradient}
            >
              <Ionicons name="pricetags" size={20} color="#3b82f6" />
            </LinearGradient>
          </View>
          <View style={styles.tagsTabHeaderInfo}>
            <Text style={[styles.tagsTabHeaderTitle, { color: textColor }]}>Lead Tags</Text>
            <Text style={[styles.tagsTabHeaderSubtitle, { color: subtitleColor }]}>
              {leadTags.length === 0
                ? 'No tags assigned'
                : `${leadTags.length} tag${leadTags.length > 1 ? 's' : ''} assigned`}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.tagsTabManageBtn, { borderColor }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowPicker(true);
            }}
          >
            <Ionicons name="settings-outline" size={16} color="#3b82f6" />
            <Text style={styles.tagsTabManageBtnText}>Manage</Text>
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
                colors={['#3b82f6', '#2563eb']}
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
              <Ionicons name="add-circle-outline" size={18} color="#3b82f6" />
              <Text style={styles.tagsTabAddMoreText}>Add more tags</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

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
  onDownload,
  onDelete,
}: {
  doc: LeadDocument;
  isDark: boolean;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const textColor = isDark ? 'white' : Colors.light.foreground;
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
    if (fileType.includes('word') || fileType.includes('document')) return '#3b82f6';
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
          style={[styles.docItemActionBtn, { backgroundColor: 'rgba(59,130,246,0.1)' }]}
          onPress={onDownload}
        >
          <Ionicons name="download-outline" size={18} color="#3b82f6" />
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
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);

  const subtitleColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const emptyIconColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  const emptyTextColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const bgColor = isDark ? '#1e293b' : 'white';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const overlayColor = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)';
  const textColor = isDark ? 'white' : Colors.light.foreground;

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

  const handleDownload = async (doc: LeadDocument) => {
    // For now, show an alert. In production, you'd download the file using the API
    Alert.alert('Download', `Download "${doc.fileName}" feature coming soon`);
    // TODO: Implement actual download using FileSystem and Sharing
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

  if (loading) {
    return (
      <View style={styles.loadingTab}>
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.docsTabContainer}>
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={[styles.docsTabHeader, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.docsTabHeaderIcon}>
            <LinearGradient
              colors={['rgba(139,92,246,0.15)', 'rgba(168,85,247,0.15)']}
              style={styles.docsTabIconGradient}
            >
              <Ionicons name="folder-open" size={20} color="#8b5cf6" />
            </LinearGradient>
          </View>
          <View style={styles.docsTabHeaderInfo}>
            <Text style={[styles.docsTabHeaderTitle, { color: textColor }]}>Documents</Text>
            <Text style={[styles.docsTabHeaderSubtitle, { color: subtitleColor }]}>
              {documents.length === 0
                ? 'No files uploaded'
                : `${documents.length} file${documents.length > 1 ? 's' : ''} uploaded`}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.docsTabUploadBtn, { borderColor }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowUploadOptions(true);
            }}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#8b5cf6" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={16} color="#8b5cf6" />
                <Text style={styles.docsTabUploadBtnText}>Upload</Text>
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
      </ScrollView>

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
                  <Ionicons name="document-text" size={24} color="#3b82f6" />
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

  const bgColor = isDark ? '#1e293b' : '#f8fafc';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'white';
  const textColor = isDark ? 'white' : Colors.light.foreground;
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
                  <Ionicons name="business-outline" size={18} color="#3b82f6" />
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
                      <View style={[styles.convertCompanyAvatar, { backgroundColor: '#3b82f6' }]}>
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
                                <View style={[styles.convertCompanyAvatar, { backgroundColor: '#3b82f6' }]}>
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

export default function LeadDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Theme colors
  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];
  const textColor = isDark ? 'white' : Colors.light.foreground;
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
  const [activeTab, setActiveTab] = useState('details');
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Follow-up state
  const [showFollowUpSheet, setShowFollowUpSheet] = useState(false);
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

  // Load activities when tab changes
  useEffect(() => {
    if (activeTab === 'timeline' && activities.length === 0) {
      fetchActivities();
    }
  }, [activeTab]);

  // Refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLead();
    if (activeTab === 'timeline') {
      fetchActivities();
    }
  }, [fetchLead, fetchActivities, activeTab]);

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

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
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
          <TouchableOpacity style={styles.retryButton} onPress={fetchLead}>
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

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: headerBorderColor }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: buttonBg }]} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: 'rgba(34,197,94,0.15)' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowConvertModal(true);
              }}
            >
              <Ionicons name="swap-horizontal" size={20} color="#22c55e" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.headerButton, { backgroundColor: buttonBg }]} onPress={handleEdit}>
              <Ionicons name="pencil" size={20} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerButton, styles.deleteButton]}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Lead Info */}
        <View style={styles.leadInfo}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.leadDetails}>
            <Text style={[styles.displayId, { color: mutedColor }]}>{lead.displayId}</Text>
            <Text style={[styles.leadTitle, { color: textColor }]}>{lead.title}</Text>
            {contactName && (
              <Text style={[styles.contactNameSmall, { color: subtitleColor }]}>{contactName}</Text>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <View style={styles.quickActions}>
            {lead.contact?.phone && (
              <TouchableOpacity style={[styles.quickActionIcon, { backgroundColor: quickActionBg }]} onPress={handleCall}>
                <Ionicons name="call" size={20} color="#22c55e" />
              </TouchableOpacity>
            )}
            {lead.contact?.phone && (
              <TouchableOpacity style={[styles.quickActionIcon, { backgroundColor: quickActionBg }]} onPress={handleWhatsApp}>
                <Ionicons name="logo-whatsapp" size={20} color="#25d366" />
              </TouchableOpacity>
            )}
            {lead.contact?.email && (
              <TouchableOpacity style={[styles.quickActionIcon, { backgroundColor: quickActionBg }]} onPress={handleEmail}>
                <Ionicons name="mail" size={20} color="#3b82f6" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.followUpButton} onPress={handleFollowUpPress}>
            <Ionicons name="add-circle" size={18} color="white" />
            <Text style={styles.followUpButtonText}>Add Follow Up</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <Tab label="Details" active={activeTab === 'details'} onPress={() => setActiveTab('details')} isDark={isDark} />
          <Tab label="Timeline" active={activeTab === 'timeline'} onPress={() => setActiveTab('timeline')} isDark={isDark} />
          <Tab label="Tags" active={activeTab === 'tags'} onPress={() => setActiveTab('tags')} isDark={isDark} />
          <Tab label="Docs" active={activeTab === 'docs'} onPress={() => setActiveTab('docs')} isDark={isDark} />
        </View>
      </View>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <DetailsTab
          lead={lead}
          isDark={isDark}
          stages={stages}
          members={members}
          leadSources={leadSources}
          onUpdateField={handleUpdateField}
          updating={updating}
        />
      )}
      {activeTab === 'timeline' && (
        <TimelineTab activities={activities} loading={activitiesLoading} isDark={isDark} />
      )}
      {activeTab === 'tags' && (
        <TagsTab leadId={id} accessToken={accessToken} isDark={isDark} />
      )}
      {activeTab === 'docs' && (
        <DocsTab leadId={id} accessToken={accessToken} isDark={isDark} />
      )}

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
    color: 'white',
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
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    gap: 6,
  },
  followUpButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
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
    color: 'white',
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
    color: 'white',
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
    color: '#3b82f6',
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
    marginBottom: 16,
  },
  activityIcon: {
    width: 36,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTabText: {
    fontSize: 14,
    marginTop: 12,
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
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  retryButtonText: {
    color: 'white',
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
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // FAB styles
  fab: {
    position: 'absolute',
    right: 20,
    borderRadius: 28,
    shadowColor: '#3b82f6',
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
    color: 'white',
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
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  formSubmitButtonDisabled: {
    opacity: 0.6,
  },
  formSubmitButtonText: {
    color: 'white',
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
    borderRadius: 16,
    padding: 20,
    width: '85%',
  },
  datePickerDone: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  datePickerDoneText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Reminder Picker styles
  reminderPickerContainer: {
    borderRadius: 16,
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
    color: 'white',
    marginBottom: 4,
  },
  tagPickerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  tagPickerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    color: '#3b82f6',
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
    color: 'white',
  },
  // Tags Tab styles
  tagsTabContainer: {
    flex: 1,
    padding: 16,
  },
  tagsTabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
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
    color: '#3b82f6',
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
    color: 'white',
  },
  tagsTabGrid: {
    padding: 16,
    borderRadius: 16,
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
    color: '#3b82f6',
  },
  // Documents Tab styles
  docsTabContainer: {
    flex: 1,
    padding: 16,
  },
  docsTabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
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
    color: 'white',
  },
  docsTabList: {
    padding: 16,
    borderRadius: 16,
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
    color: 'white',
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
    color: 'white',
  },
  uploadModalSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
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
    borderRadius: 16,
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
    color: 'white',
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
    color: 'white',
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
});
