import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import {
  getActivity,
  updateActivity,
  deleteActivity,
  completeActivity,
  cancelActivity,
} from '@/lib/api/activities';
import type { Activity, ActivityType, ActivityStatus, UpdateActivityDto } from '@/types/activity';
import {
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_ICONS,
  ACTIVITY_TYPE_COLORS,
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_COLORS,
  formatActivityDate,
  formatDuration,
} from '@/types/activity';

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { resolvedTheme } = useTheme();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedOutcome, setEditedOutcome] = useState('');

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const gradientColors: [string, string, string] = isDark
    ? ['#0f172a', '#1e293b', '#0f172a']
    : ['#f8fafc', '#f1f5f9', '#f8fafc'];

  const fetchActivity = useCallback(async () => {
    if (!accessToken || !id) return;

    setIsLoading(true);
    try {
      const response = await getActivity(accessToken, id);
      if (response.success && response.data) {
        setActivity(response.data);
        setEditedTitle(response.data.title);
        setEditedDescription(response.data.description || '');
        setEditedOutcome(response.data.outcome || '');
      }
    } catch (error) {
      console.error('Failed to fetch activity:', error);
      Alert.alert('Error', 'Failed to load activity');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const handleComplete = async () => {
    if (!accessToken || !id) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const response = await completeActivity(accessToken, id);
      if (response.success && response.data) {
        setActivity(response.data);
      }
    } catch (error) {
      console.error('Failed to complete activity:', error);
      Alert.alert('Error', 'Failed to complete activity');
    }
  };

  const handleCancel = async () => {
    if (!accessToken || !id) return;

    Alert.alert(
      'Cancel Activity',
      'Are you sure you want to cancel this activity?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await cancelActivity(accessToken, id);
              if (response.success && response.data) {
                setActivity(response.data);
              }
            } catch (error) {
              console.error('Failed to cancel activity:', error);
              Alert.alert('Error', 'Failed to cancel activity');
            }
          },
        },
      ]
    );
  };

  const handleDelete = async () => {
    if (!accessToken || !id) return;

    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this activity? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await deleteActivity(accessToken, id);
              router.back();
            } catch (error) {
              console.error('Failed to delete activity:', error);
              Alert.alert('Error', 'Failed to delete activity');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!accessToken || !id || !activity) return;

    setIsSaving(true);
    try {
      const updateData: UpdateActivityDto = {
        title: editedTitle.trim(),
        description: editedDescription.trim() || undefined,
        outcome: editedOutcome.trim() || undefined,
      };

      const response = await updateActivity(accessToken, id, updateData);
      if (response.success && response.data) {
        setActivity(response.data);
        setIsEditing(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Failed to update activity:', error);
      Alert.alert('Error', 'Failed to update activity');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (activity) {
      setEditedTitle(activity.title);
      setEditedDescription(activity.description || '');
      setEditedOutcome(activity.outcome || '');
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={[styles.errorText, { color: colors.foreground }]}>
            Activity not found
          </Text>
          <TouchableOpacity
            style={styles.backToListButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToListText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const typeColor = ACTIVITY_TYPE_COLORS[activity.type];
  const statusColor = ACTIVITY_STATUS_COLORS[activity.status];
  const icon = ACTIVITY_TYPE_ICONS[activity.type] as keyof typeof Ionicons.glyphMap;
  const isCompleted = activity.status === 'COMPLETED';
  const isCancelled = activity.status === 'CANCELLED';
  const isOverdue =
    activity.dueDate &&
    new Date(activity.dueDate) < new Date() &&
    !isCompleted &&
    !isCancelled;

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
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={[styles.typeIconSmall, { backgroundColor: `${typeColor}15` }]}>
              <Ionicons name={icon} size={16} color={typeColor} />
            </View>
            <Text
              style={[
                styles.headerTitle,
                { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' },
              ]}
            >
              {ACTIVITY_TYPE_LABELS[activity.type]}
            </Text>
          </View>

          {isEditing ? (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleCancelEdit}
              >
                <Ionicons name="close" size={24} color="#ef4444" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#22c55e" />
                ) : (
                  <Ionicons name="checkmark" size={24} color="#22c55e" />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="create-outline" size={24} color={colors.foreground} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Title Section */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              },
            ]}
          >
            <View style={styles.titleSection}>
              <View style={[styles.typeIcon, { backgroundColor: `${typeColor}15` }]}>
                <Ionicons name={icon} size={28} color={typeColor} />
              </View>

              {isEditing ? (
                <TextInput
                  style={[styles.titleInput, { color: colors.foreground }]}
                  value={editedTitle}
                  onChangeText={setEditedTitle}
                  placeholder="Activity title"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                  multiline
                />
              ) : (
                <Text style={[styles.title, { color: colors.foreground }]}>
                  {activity.title}
                </Text>
              )}
            </View>

            {/* Status Badge */}
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {ACTIVITY_STATUS_LABELS[activity.status]}
                </Text>
              </View>
              {isOverdue && (
                <View style={[styles.overdueBadge]}>
                  <Ionicons name="warning" size={12} color="#ef4444" />
                  <Text style={styles.overdueText}>Overdue</Text>
                </View>
              )}
            </View>
          </View>

          {/* Details Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Details
            </Text>

            {/* Due Date */}
            {activity.dueDate && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' },
                    ]}
                  >
                    Due Date
                  </Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: isOverdue ? '#ef4444' : colors.foreground },
                    ]}
                  >
                    {formatActivityDate(activity.dueDate)}
                  </Text>
                </View>
              </View>
            )}

            {/* Duration */}
            {activity.duration && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' },
                    ]}
                  >
                    Duration
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>
                    {formatDuration(activity.duration)}
                  </Text>
                </View>
              </View>
            )}

            {/* Priority */}
            {activity.priority && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons
                    name="flag-outline"
                    size={18}
                    color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' },
                    ]}
                  >
                    Priority
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>
                    {activity.priority.charAt(0) + activity.priority.slice(1).toLowerCase()}
                  </Text>
                </View>
              </View>
            )}

            {/* Assigned To */}
            {activity.assignedTo && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' },
                    ]}
                  >
                    Assigned To
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>
                    {activity.assignedTo.userName}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Description */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Description
            </Text>
            {isEditing ? (
              <TextInput
                style={[
                  styles.textArea,
                  {
                    color: colors.foreground,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  },
                ]}
                value={editedDescription}
                onChangeText={setEditedDescription}
                placeholder="Add a description..."
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            ) : (
              <Text
                style={[
                  styles.descriptionText,
                  {
                    color: activity.description
                      ? colors.foreground
                      : isDark
                      ? 'rgba(255,255,255,0.4)'
                      : 'rgba(0,0,0,0.4)',
                  },
                ]}
              >
                {activity.description || 'No description'}
              </Text>
            )}
          </View>

          {/* Outcome (for completed activities) */}
          {(isCompleted || isEditing) && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Outcome
              </Text>
              {isEditing ? (
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      color: colors.foreground,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    },
                  ]}
                  value={editedOutcome}
                  onChangeText={setEditedOutcome}
                  placeholder="Add outcome notes..."
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              ) : (
                <Text
                  style={[
                    styles.descriptionText,
                    {
                      color: activity.outcome
                        ? colors.foreground
                        : isDark
                        ? 'rgba(255,255,255,0.4)'
                        : 'rgba(0,0,0,0.4)',
                    },
                  ]}
                >
                  {activity.outcome || 'No outcome recorded'}
                </Text>
              )}
            </View>
          )}

          {/* Related Entities */}
          {(activity.contact || activity.deal || activity.company || activity.lead) && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Related To
              </Text>

              {activity.contact && (
                <TouchableOpacity
                  style={styles.relatedItem}
                  onPress={() => router.push(`/contacts/${activity.contactId}` as any)}
                >
                  <View style={[styles.relatedIcon, { backgroundColor: '#3b82f615' }]}>
                    <Ionicons name="person-outline" size={16} color="#3b82f6" />
                  </View>
                  <Text style={[styles.relatedName, { color: colors.foreground }]}>
                    {`${activity.contact.firstName} ${activity.contact.lastName}`.trim()}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                  />
                </TouchableOpacity>
              )}

              {activity.deal && (
                <TouchableOpacity
                  style={styles.relatedItem}
                  onPress={() => router.push(`/deals/${activity.dealId}` as any)}
                >
                  <View style={[styles.relatedIcon, { backgroundColor: '#8b5cf615' }]}>
                    <Ionicons name="briefcase-outline" size={16} color="#8b5cf6" />
                  </View>
                  <Text style={[styles.relatedName, { color: colors.foreground }]}>
                    {activity.deal.title}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                  />
                </TouchableOpacity>
              )}

              {activity.company && (
                <TouchableOpacity style={styles.relatedItem}>
                  <View style={[styles.relatedIcon, { backgroundColor: '#22c55e15' }]}>
                    <Ionicons name="business-outline" size={16} color="#22c55e" />
                  </View>
                  <Text style={[styles.relatedName, { color: colors.foreground }]}>
                    {activity.company.name}
                  </Text>
                </TouchableOpacity>
              )}

              {activity.lead && (
                <TouchableOpacity
                  style={styles.relatedItem}
                  onPress={() => router.push(`/leads/${activity.leadId}` as any)}
                >
                  <View style={[styles.relatedIcon, { backgroundColor: '#f59e0b15' }]}>
                    <Ionicons name="flash-outline" size={16} color="#f59e0b" />
                  </View>
                  <Text style={[styles.relatedName, { color: colors.foreground }]}>
                    {activity.lead.title}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Timestamps */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              },
            ]}
          >
            <View style={styles.timestampRow}>
              <Text
                style={[
                  styles.timestampLabel,
                  { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' },
                ]}
              >
                Created
              </Text>
              <Text
                style={[
                  styles.timestampValue,
                  { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' },
                ]}
              >
                {new Date(activity.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <View style={styles.timestampRow}>
              <Text
                style={[
                  styles.timestampLabel,
                  { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' },
                ]}
              >
                Updated
              </Text>
              <Text
                style={[
                  styles.timestampValue,
                  { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' },
                ]}
              >
                {new Date(activity.updatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>

          {/* Danger Zone */}
          {!isEditing && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: '#ef444410',
                  borderColor: '#ef444430',
                },
              ]}
            >
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                <Text style={styles.deleteText}>Delete Activity</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Bottom Actions */}
        {!isEditing && !isCompleted && !isCancelled && (
          <View
            style={[
              styles.bottomActions,
              {
                paddingBottom: insets.bottom + 16,
                backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
                borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#64748b' }]}
              onPress={handleCancel}
            >
              <Ionicons name="close-circle-outline" size={20} color="white" />
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={handleComplete}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="white" />
              <Text style={styles.actionButtonText}>Complete</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
  },
  backToListButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  backToListText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  typeIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  titleInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    padding: 0,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ef444415',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  overdueText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  detailIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    lineHeight: 22,
  },
  relatedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  relatedIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  relatedName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  timestampRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  timestampLabel: {
    fontSize: 12,
  },
  timestampValue: {
    fontSize: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  deleteText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  completeButton: {
    backgroundColor: '#22c55e',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});
