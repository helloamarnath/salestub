import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { createActivity } from '@/lib/api/activities';
import type { ActivityType, ActivityPriority, ReminderType, CreateActivityDto } from '@/types/activity';
import {
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_ICONS,
  ACTIVITY_TYPE_COLORS,
} from '@/types/activity';

const ACTIVITY_TYPES: ActivityType[] = ['TASK', 'CALL', 'MEETING', 'EMAIL', 'NOTE'];
const PRIORITIES: ActivityPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
const PRIORITY_COLORS: Record<ActivityPriority, string> = {
  LOW: '#64748b',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
};

const REMINDER_OPTIONS: { value: ReminderType; label: string }[] = [
  { value: 'NONE', label: 'No reminder' },
  { value: 'AT_TIME', label: 'At time of event' },
  { value: 'FIVE_MIN', label: '5 minutes before' },
  { value: 'TEN_MIN', label: '10 minutes before' },
  { value: 'FIFTEEN_MIN', label: '15 minutes before' },
  { value: 'THIRTY_MIN', label: '30 minutes before' },
  { value: 'ONE_HOUR', label: '1 hour before' },
  { value: 'ONE_DAY', label: '1 day before' },
];

export default function CreateActivityScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ActivityType>('TASK');
  const [priority, setPriority] = useState<ActivityPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [duration, setDuration] = useState('');
  const [reminder, setReminder] = useState<ReminderType>('NONE');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];

  const handleSubmit = useCallback(async () => {
    if (!accessToken) return;

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for the activity');
      return;
    }

    setIsSubmitting(true);

    try {
      const data: CreateActivityDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        priority,
        dueDate: dueDate?.toISOString(),
        duration: duration ? parseInt(duration, 10) : undefined,
        reminder,
      };

      const response = await createActivity(accessToken, data);

      if (response.success && response.data) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } else {
        Alert.alert('Error', response.error?.message || 'Failed to create activity');
      }
    } catch (error) {
      console.error('Failed to create activity:', error);
      Alert.alert('Error', 'Failed to create activity');
    } finally {
      setIsSubmitting(false);
    }
  }, [accessToken, title, description, type, priority, dueDate, duration, reminder]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = dueDate ? new Date(dueDate) : new Date();
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setDueDate(newDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime && dueDate) {
      const newDate = new Date(dueDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDueDate(newDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            New Activity
          </Text>
          <TouchableOpacity
            style={[
              styles.saveButton,
              { opacity: title.trim() ? 1 : 0.5 },
            ]}
            onPress={handleSubmit}
            disabled={!title.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Activity Type */}
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionLabel,
                { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' },
              ]}
            >
              Activity Type
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.typesContainer}
            >
              {ACTIVITY_TYPES.map((t) => {
                const isSelected = type === t;
                const typeColor = ACTIVITY_TYPE_COLORS[t];
                const icon = ACTIVITY_TYPE_ICONS[t] as keyof typeof Ionicons.glyphMap;

                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeOption,
                      {
                        backgroundColor: isSelected
                          ? typeColor
                          : isDark
                          ? 'rgba(255,255,255,0.05)'
                          : 'rgba(0,0,0,0.03)',
                        borderColor: isSelected
                          ? typeColor
                          : isDark
                          ? 'rgba(255,255,255,0.1)'
                          : 'rgba(0,0,0,0.08)',
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setType(t);
                    }}
                  >
                    <Ionicons
                      name={icon}
                      size={20}
                      color={isSelected ? 'white' : typeColor}
                    />
                    <Text
                      style={[
                        styles.typeLabel,
                        {
                          color: isSelected
                            ? 'white'
                            : isDark
                            ? 'rgba(255,255,255,0.7)'
                            : 'rgba(0,0,0,0.7)',
                        },
                      ]}
                    >
                      {ACTIVITY_TYPE_LABELS[t]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Title */}
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionLabel,
                { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' },
              ]}
            >
              Title *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.02)',
                  borderColor: isDark
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,0,0,0.08)',
                  color: colors.foreground,
                },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter activity title..."
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionLabel,
                { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' },
              ]}
            >
              Description
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.02)',
                  borderColor: isDark
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,0,0,0.08)',
                  color: colors.foreground,
                },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add more details..."
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Priority */}
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionLabel,
                { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' },
              ]}
            >
              Priority
            </Text>
            <View style={styles.priorityContainer}>
              {PRIORITIES.map((p) => {
                const isSelected = priority === p;
                const priorityColor = PRIORITY_COLORS[p];

                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityOption,
                      {
                        backgroundColor: isSelected
                          ? priorityColor
                          : isDark
                          ? 'rgba(255,255,255,0.05)'
                          : 'rgba(0,0,0,0.03)',
                        borderColor: isSelected
                          ? priorityColor
                          : isDark
                          ? 'rgba(255,255,255,0.1)'
                          : 'rgba(0,0,0,0.08)',
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPriority(p);
                    }}
                  >
                    <Ionicons
                      name="flag"
                      size={14}
                      color={isSelected ? 'white' : priorityColor}
                    />
                    <Text
                      style={[
                        styles.priorityLabel,
                        {
                          color: isSelected
                            ? 'white'
                            : isDark
                            ? 'rgba(255,255,255,0.7)'
                            : 'rgba(0,0,0,0.7)',
                        },
                      ]}
                    >
                      {p.charAt(0) + p.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Due Date & Time */}
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionLabel,
                { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' },
              ]}
            >
              Due Date & Time
            </Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={[
                  styles.dateTimeButton,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(0,0,0,0.02)',
                    borderColor: isDark
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.08)',
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={[styles.dateTimeText, { color: colors.foreground }]}>
                  {dueDate ? formatDate(dueDate) : 'Select date'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dateTimeButton,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(0,0,0,0.02)',
                    borderColor: isDark
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.08)',
                    opacity: dueDate ? 1 : 0.5,
                  },
                ]}
                onPress={() => {
                  if (dueDate) setShowTimePicker(true);
                }}
                disabled={!dueDate}
              >
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={[styles.dateTimeText, { color: colors.foreground }]}>
                  {dueDate ? formatTime(dueDate) : 'Time'}
                </Text>
              </TouchableOpacity>
            </View>

            {dueDate && (
              <TouchableOpacity
                style={styles.clearDateButton}
                onPress={() => setDueDate(null)}
              >
                <Ionicons name="close-circle" size={16} color="#ef4444" />
                <Text style={styles.clearDateText}>Clear date</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Duration */}
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionLabel,
                { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' },
              ]}
            >
              Duration (minutes)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.02)',
                  borderColor: isDark
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,0,0,0.08)',
                  color: colors.foreground,
                },
              ]}
              value={duration}
              onChangeText={(text) => setDuration(text.replace(/[^0-9]/g, ''))}
              placeholder="e.g., 30"
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
              keyboardType="number-pad"
            />
          </View>

          {/* Reminder */}
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionLabel,
                { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' },
              ]}
            >
              Reminder
            </Text>
            <TouchableOpacity
              style={[
                styles.reminderButton,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.02)',
                  borderColor: isDark
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,0,0,0.08)',
                },
              ]}
              onPress={() => setShowReminderPicker(!showReminderPicker)}
            >
              <Ionicons
                name="notifications-outline"
                size={18}
                color={colors.primary}
              />
              <Text style={[styles.reminderText, { color: colors.foreground }]}>
                {REMINDER_OPTIONS.find((r) => r.value === reminder)?.label}
              </Text>
              <Ionicons
                name={showReminderPicker ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
              />
            </TouchableOpacity>

            {showReminderPicker && (
              <View
                style={[
                  styles.reminderOptions,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(0,0,0,0.02)',
                    borderColor: isDark
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.08)',
                  },
                ]}
              >
                {REMINDER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.reminderOption,
                      reminder === option.value && {
                        backgroundColor: `${colors.primary}15`,
                      },
                    ]}
                    onPress={() => {
                      setReminder(option.value);
                      setShowReminderPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.reminderOptionText,
                        {
                          color:
                            reminder === option.value
                              ? colors.primary
                              : colors.foreground,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {reminder === option.value && (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={dueDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        <DateTimePicker
          value={dueDate || new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
    </View>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  typesContainer: {
    gap: 10,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    lineHeight: 22,
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  priorityLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateTimeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 4,
  },
  clearDateText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '500',
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  reminderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  reminderOptions: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  reminderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reminderOptionText: {
    fontSize: 14,
  },
});
