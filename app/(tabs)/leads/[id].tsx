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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { getLead, deleteLead, getLeadActivities, updateLead, getKanbanView, addLeadActivity } from '@/lib/api/leads';
import { getOrganizationMembers, getMemberDisplayName, type OrgMember } from '@/lib/api/organization';
import { LeadStatusBadge, ScoreIndicator, SourceBadge } from '@/components/leads/LeadStatusBadge';
import type { Lead, LeadActivity, KanbanStage, UpdateLeadDto, CreateActivityDto } from '@/types/lead';
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
  onUpdateField,
  updating,
}: {
  lead: Lead;
  isDark: boolean;
  stages: KanbanStage[];
  members: OrgMember[];
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

  const sourceOptions = SOURCES.map((s) => ({
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
          onUpdateField={handleUpdateField}
          updating={updating}
        />
      )}
      {activeTab === 'timeline' && (
        <TimelineTab activities={activities} loading={activitiesLoading} isDark={isDark} />
      )}
      {activeTab === 'tags' && (
        <View style={styles.emptyTab}>
          <Ionicons name="pricetags-outline" size={48} color={emptyIconColor} />
          <Text style={[styles.emptyTabText, { color: emptyTextColor }]}>Tags coming soon</Text>
        </View>
      )}
      {activeTab === 'docs' && (
        <View style={styles.emptyTab}>
          <Ionicons name="document-outline" size={48} color={emptyIconColor} />
          <Text style={[styles.emptyTabText, { color: emptyTextColor }]}>Documents coming soon</Text>
        </View>
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
});
