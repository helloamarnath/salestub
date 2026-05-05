import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors, Palette } from '@/constants/theme';
import {
  getConversation,
  sendMessage,
  sendMedia,
  retryMessage,
  updateConversation,
  listTemplates,
} from '@/lib/api/whatsapp';
import type {
  WaConversationDetail,
  WaMessage,
  WhatsappTemplate,
  WaConvStatus,
} from '@/types/whatsapp';
import {
  getCustomerInitials,
  getCustomerDisplayName,
  isSessionExpired,
  getSessionTimeRemainingMs,
} from '@/types/whatsapp';
import { getAvatarColor } from '@/types/contact';
import { MessageBubble, DateSeparator } from '@/components/whatsapp/MessageBubble';
import { Composer, type PickedMedia } from '@/components/whatsapp/Composer';

const POLL_INTERVAL_MS = 8_000;

const STATUS_BADGE_COLOR: Record<WaConvStatus, string> = {
  OPEN: Palette.emerald,
  SNOOZED: Palette.amber,
  CLOSED: '#9ca3af',
};

type FlatListItem =
  | { kind: 'separator'; iso: string; key: string }
  | { kind: 'message'; message: WaMessage; key: string };

function buildItems(messages: WaMessage[]): FlatListItem[] {
  if (messages.length === 0) return [];
  const items: FlatListItem[] = [];
  let lastDate = '';
  // Sort ascending by createdAt — backend may return either order; normalize.
  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  for (const msg of sorted) {
    const date = new Date(msg.createdAt).toDateString();
    if (date !== lastDate) {
      items.push({ kind: 'separator', iso: msg.createdAt, key: `sep-${date}` });
      lastDate = date;
    }
    items.push({ kind: 'message', message: msg, key: msg.id });
  }
  return items;
}

function SessionBanner({
  windowExpiresAt,
  isDark,
}: {
  windowExpiresAt: string | null | undefined;
  isDark: boolean;
}) {
  if (!windowExpiresAt) return null;
  const expired = isSessionExpired(windowExpiresAt);
  const remainingMs = getSessionTimeRemainingMs(windowExpiresAt);
  const remainingHours = remainingMs / 3_600_000;

  if (expired) {
    return (
      <View style={[bannerStyles.bar, { backgroundColor: 'rgba(239,68,68,0.10)' }]}>
        <Ionicons name="lock-closed-outline" size={14} color={Palette.red} />
        <Text style={[bannerStyles.text, { color: Palette.red }]}>
          24-hour session expired — only template messages can be sent.
        </Text>
      </View>
    );
  }
  // Only warn when <6h remaining (matches web)
  if (remainingHours < 6) {
    return (
      <View style={[bannerStyles.bar, { backgroundColor: 'rgba(245,158,11,0.10)' }]}>
        <Ionicons name="time-outline" size={14} color={Palette.amber} />
        <Text style={[bannerStyles.text, { color: Palette.amber }]}>
          Session window closes in {Math.max(1, Math.round(remainingHours))}h
        </Text>
      </View>
    );
  }
  return null;
}

const bannerStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  text: { fontSize: 12, flex: 1 },
});

// ---------- Status / actions menu ----------

function StatusActionsSheet({
  visible,
  current,
  isDark,
  busy,
  onClose,
  onSetStatus,
  onSnooze,
}: {
  visible: boolean;
  current: WaConvStatus;
  isDark: boolean;
  busy: boolean;
  onClose: () => void;
  onSetStatus: (next: WaConvStatus) => void;
  onSnooze: (untilIso: string) => void;
}) {
  const colors = Colors[isDark ? 'dark' : 'light'];
  const overlayColor = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const snoozeOption = (label: string, ms: number) => {
    return (
      <TouchableOpacity
        key={label}
        style={[styles.actionRow, { borderBottomColor: borderColor }]}
        disabled={busy}
        onPress={() => onSnooze(new Date(Date.now() + ms).toISOString())}
      >
        <Ionicons name="moon-outline" size={18} color={Palette.amber} />
        <Text style={[styles.actionLabel, { color: colors.foreground }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const tomorrowAt9 = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  })();
  const nextMonAt9 = (() => {
    const d = new Date();
    const day = d.getDay(); // 0=Sun
    const diff = day === 1 ? 7 : (8 - day) % 7 || 7;
    d.setDate(d.getDate() + diff);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  })();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.modalOverlay, { backgroundColor: overlayColor }]} onPress={onClose}>
        <Pressable
          style={[styles.modalSheet, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Conversation actions</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {current !== 'OPEN' && (
            <TouchableOpacity
              style={[styles.actionRow, { borderBottomColor: borderColor }]}
              disabled={busy}
              onPress={() => onSetStatus('OPEN')}
            >
              <Ionicons name="lock-open-outline" size={18} color={Palette.emerald} />
              <Text style={[styles.actionLabel, { color: colors.foreground }]}>Reopen</Text>
            </TouchableOpacity>
          )}

          {current !== 'CLOSED' && (
            <TouchableOpacity
              style={[styles.actionRow, { borderBottomColor: borderColor }]}
              disabled={busy}
              onPress={() => onSetStatus('CLOSED')}
            >
              <Ionicons name="checkmark-done-circle-outline" size={18} color="#9ca3af" />
              <Text style={[styles.actionLabel, { color: colors.foreground }]}>Close conversation</Text>
            </TouchableOpacity>
          )}

          {current === 'OPEN' && (
            <>
              <Text style={[styles.actionGroupHeader, { color: colors.mutedForeground }]}>Snooze until</Text>
              {snoozeOption('1 hour', 60 * 60 * 1000)}
              {snoozeOption('4 hours', 4 * 60 * 60 * 1000)}
              <TouchableOpacity
                style={[styles.actionRow, { borderBottomColor: borderColor }]}
                disabled={busy}
                onPress={() => onSnooze(tomorrowAt9)}
              >
                <Ionicons name="moon-outline" size={18} color={Palette.amber} />
                <Text style={[styles.actionLabel, { color: colors.foreground }]}>
                  Tomorrow 9:00 AM
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionRow, { borderBottomColor: borderColor }]}
                disabled={busy}
                onPress={() => onSnooze(nextMonAt9)}
              >
                <Ionicons name="calendar-outline" size={18} color={Palette.amber} />
                <Text style={[styles.actionLabel, { color: colors.foreground }]}>
                  Next Monday 9:00 AM
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------- Page ----------

export default function ConversationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();

  const [conversation, setConversation] = useState<WaConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [retryingMsgId, setRetryingMsgId] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const listRef = useRef<FlatList<FlatListItem>>(null);

  const fetchConversation = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!accessToken || !id) return;
      if (!opts.silent) setLoading(true);
      const res = await getConversation(accessToken, id);
      if (res.success && res.data) {
        setConversation(res.data);
        setError(null);
      } else if (!opts.silent) {
        setError(res.error?.message || 'Failed to load conversation');
      }
      if (!opts.silent) setLoading(false);
    },
    [accessToken, id],
  );

  const fetchTemplates = useCallback(async () => {
    if (!accessToken) return;
    setTemplatesLoading(true);
    const res = await listTemplates(accessToken);
    if (res.success && res.data) setTemplates(res.data);
    setTemplatesLoading(false);
  }, [accessToken]);

  useEffect(() => {
    fetchConversation();
    fetchTemplates();
  }, [fetchConversation, fetchTemplates]);

  // Poll for new messages every 8s while screen is mounted (silent)
  useEffect(() => {
    const t = setInterval(() => fetchConversation({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [fetchConversation]);

  const handleSend = async (body: string) => {
    if (!accessToken || !conversation) return;
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const res = await sendMessage(accessToken, conversation.id, { body });
    if (res.success && res.data) {
      // Optimistic-ish: append the returned message
      setConversation((prev) =>
        prev ? { ...prev, messages: [...prev.messages, res.data!] } : prev,
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Send failed', res.error?.message || 'Could not send message.');
    }
    setSending(false);
  };

  const handleSendMedia = async (file: PickedMedia, caption?: string) => {
    if (!accessToken || !conversation) return;
    setUploading(true);
    const res = await sendMedia(accessToken, conversation.id, file, caption);
    if (res.success && res.data) {
      setConversation((prev) =>
        prev ? { ...prev, messages: [...prev.messages, res.data!] } : prev,
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Upload failed', res.error?.message || 'Could not send file.');
    }
    setUploading(false);
  };

  const handleRetry = async (messageId: string) => {
    if (!accessToken || !conversation) return;
    setRetryingMsgId(messageId);
    const res = await retryMessage(accessToken, conversation.id, messageId);
    if (res.success && res.data) {
      // Replace the message in place
      setConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.map((m) => (m.id === messageId ? res.data! : m)),
            }
          : prev,
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert('Retry failed', res.error?.message || 'Could not retry message.');
    }
    setRetryingMsgId(null);
  };

  const handleSetStatus = async (next: WaConvStatus) => {
    if (!accessToken || !conversation) return;
    setStatusBusy(true);
    const res = await updateConversation(accessToken, conversation.id, {
      status: next,
      // Reopen wipes any existing snooze
      snoozedUntil: next === 'OPEN' ? null : undefined,
    });
    if (res.success && res.data) {
      setConversation((prev) =>
        prev ? { ...prev, status: res.data!.status, snoozedUntil: res.data!.snoozedUntil } : prev,
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowActions(false);
    } else {
      Alert.alert('Update failed', res.error?.message || 'Could not update conversation.');
    }
    setStatusBusy(false);
  };

  const handleSnooze = async (untilIso: string) => {
    if (!accessToken || !conversation) return;
    setStatusBusy(true);
    const res = await updateConversation(accessToken, conversation.id, {
      status: 'SNOOZED',
      snoozedUntil: untilIso,
    });
    if (res.success && res.data) {
      setConversation((prev) =>
        prev ? { ...prev, status: res.data!.status, snoozedUntil: res.data!.snoozedUntil } : prev,
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowActions(false);
    } else {
      Alert.alert('Snooze failed', res.error?.message || 'Could not snooze.');
    }
    setStatusBusy(false);
  };

  if (loading && !conversation) {
    return (
      <View style={[styles.container, styles.center]}>
        <LinearGradient
          colors={[colors.background, colors.card, colors.background]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && !conversation) {
    return (
      <View style={[styles.container, styles.center]}>
        <LinearGradient
          colors={[colors.background, colors.card, colors.background]}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name="alert-circle-outline" size={48} color={Palette.red} />
        <Text style={{ color: colors.foreground, marginTop: 8, textAlign: 'center', paddingHorizontal: 24 }}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary, marginTop: 16 }]}
          onPress={() => fetchConversation()}
        >
          <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!conversation) return null;

  const name = getCustomerDisplayName(conversation);
  const initials = getCustomerInitials(conversation);
  const avatarColor = getAvatarColor(name);
  const items = buildItems(conversation.messages);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <LinearGradient
        colors={[colors.background, colors.card, colors.background]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.headerIconButton, { backgroundColor: colors.secondary }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerInfoTap}
          onPress={() => router.push(`/whatsapp/details/${conversation.id}` as never)}
          activeOpacity={0.7}
        >
          <View style={[styles.headerAvatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.headerAvatarText}>{initials}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>
              {name}
            </Text>
            <View style={styles.headerSubRow}>
              <Text style={[styles.headerSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                {conversation.customerNumber}
              </Text>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: `${STATUS_BADGE_COLOR[conversation.status]}20` },
                ]}
              >
                <View
                  style={[
                    styles.statusPillDot,
                    { backgroundColor: STATUS_BADGE_COLOR[conversation.status] },
                  ]}
                />
                <Text
                  style={[styles.statusPillText, { color: STATUS_BADGE_COLOR[conversation.status] }]}
                >
                  {conversation.status}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.headerIconButton, { backgroundColor: colors.secondary }]}
          onPress={() => setShowActions(true)}
          disabled={statusBusy}
        >
          {statusBusy ? (
            <ActivityIndicator size="small" color={colors.foreground} />
          ) : (
            <Ionicons name="ellipsis-vertical" size={20} color={colors.foreground} />
          )}
        </TouchableOpacity>
      </View>

      <SessionBanner windowExpiresAt={conversation.windowExpiresAt} isDark={isDark} />

      {/* Thread */}
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(it) => it.key}
        renderItem={({ item }) => {
          if (item.kind === 'separator') {
            return <DateSeparator iso={item.iso} isDark={isDark} />;
          }
          return (
            <MessageBubble
              message={item.message}
              isDark={isDark}
              retrying={retryingMsgId === item.message.id}
              onRetry={handleRetry}
            />
          );
        }}
        contentContainerStyle={{ paddingVertical: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      <Composer
        windowExpiresAt={conversation.windowExpiresAt}
        templates={templates}
        templatesLoading={templatesLoading}
        sending={sending}
        uploading={uploading}
        isDark={isDark}
        onSend={handleSend}
        onSendMedia={handleSendMedia}
      />

      <StatusActionsSheet
        visible={showActions}
        current={conversation.status}
        isDark={isDark}
        busy={statusBusy}
        onClose={() => setShowActions(false)}
        onSetStatus={handleSetStatus}
        onSnooze={handleSnooze}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  retryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfoTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: { color: 'white', fontWeight: '700', fontSize: 14 },
  headerName: { fontSize: 16, fontWeight: '700' },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  headerSub: { fontSize: 12, flexShrink: 1 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: '700' },

  /* Status sheet */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  actionLabel: { fontSize: 15, fontWeight: '500' },
  actionGroupHeader: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
});
